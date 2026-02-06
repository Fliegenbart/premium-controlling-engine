/**
 * Triple Analysis API: Plan vs. Ist vs. Vorjahr
 * POST /api/analyze-triple
 *
 * Expects FormData with:
 * - vjFile: CSV with Vorjahr bookings
 * - planFile: CSV with Plan/Budget data
 * - istFile: CSV with Ist (actual) bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/analysis';
import { analyzeTriple, parsePlanCSV } from '@/lib/triple-analysis';
import { getHybridLLMService } from '@/lib/llm/hybrid-service';
import { getKnowledgeService } from '@/lib/rag/knowledge-service';
import { TripleAnalysisResult } from '@/lib/types';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from '@/lib/prompt-utils';
import { enforceRateLimit, getRequestId, jsonError, sanitizeError } from '@/lib/api-helpers';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const rateLimit = enforceRateLimit(request, { limit: 10, windowMs: 60_000 });
    if (rateLimit) return rateLimit;

    const formData = await request.formData();
    const vjFile = formData.get('vjFile') as File;
    const planFile = formData.get('planFile') as File;
    const istFile = formData.get('istFile') as File;

    // Config
    const periodVJ = (formData.get('periodVJ') as string) || 'Vorjahr';
    const periodPlan = (formData.get('periodPlan') as string) || 'Plan';
    const periodIst = (formData.get('periodIst') as string) || 'Ist';
    const wesentlichkeitAbs = parseInt(formData.get('wesentlichkeitAbs') as string) || 5000;
    const wesentlichkeitPct = parseInt(formData.get('wesentlichkeitPct') as string) || 5;
    const thresholdYellow = parseInt(formData.get('thresholdYellow') as string) || 5;
    const thresholdRed = parseInt(formData.get('thresholdRed') as string) || 10;
    const useAI = formData.get('useAI') !== 'false';

    // Validate required files
    if (!istFile) {
      return jsonError('Mindestens die Ist-Daten (aktuelle Buchungen) sind erforderlich', 400, requestId);
    }
    const sizeLimit = 50 * 1024 * 1024;
    const filesToCheck = [istFile, vjFile, planFile].filter(Boolean) as File[];
    if (filesToCheck.some(file => file.size > sizeLimit)) {
      return jsonError('Datei zu groß (max. 50MB)', 400, requestId);
    }

    // Parse files
    const istText = await istFile.text();
    const istBookings = parseCSV(istText);

    if (istBookings.length === 0) {
      return jsonError('Ist-Datei konnte nicht gelesen werden oder ist leer', 400, requestId);
    }

    // Parse VJ (optional - use Ist as fallback)
    let vjBookings = istBookings;
    if (vjFile) {
      const vjText = await vjFile.text();
      const parsed = parseCSV(vjText);
      if (parsed.length > 0) vjBookings = parsed;
    }

    // Parse Plan (optional - use VJ aggregates as fallback)
    let planData;
    if (planFile) {
      const planText = await planFile.text();
      planData = parsePlanCSV(planText);

      // If plan parsing failed, try parsing as regular bookings and aggregate
      if (planData.length === 0) {
        const planBookings = parseCSV(planText);
        if (planBookings.length > 0) {
          // Aggregate plan bookings by account
          const planByAccount = new Map<number, { name: string; amount: number }>();
          for (const b of planBookings) {
            const existing = planByAccount.get(b.account) || { name: b.account_name, amount: 0 };
            existing.amount += b.amount;
            planByAccount.set(b.account, existing);
          }
          planData = Array.from(planByAccount.entries()).map(([account, data]) => ({
            account,
            account_name: data.name,
            amount: data.amount,
          }));
        }
      }
    }

    // If still no plan data, create from VJ
    if (!planData || planData.length === 0) {
      const vjByAccount = new Map<number, { name: string; amount: number }>();
      for (const b of vjBookings) {
        const existing = vjByAccount.get(b.account) || { name: b.account_name, amount: 0 };
        existing.amount += b.amount;
        vjByAccount.set(b.account, existing);
      }
      planData = Array.from(vjByAccount.entries()).map(([account, data]) => ({
        account,
        account_name: data.name,
        amount: data.amount,
      }));
    }

    // Run triple analysis
    let result: TripleAnalysisResult = analyzeTriple(vjBookings, planData, istBookings, {
      period_vj_name: periodVJ,
      period_plan_name: periodPlan,
      period_ist_name: periodIst,
      wesentlichkeit_abs: wesentlichkeitAbs,
      wesentlichkeit_pct: wesentlichkeitPct,
      threshold_yellow_pct: thresholdYellow,
      threshold_red_pct: thresholdRed,
    });

    // Enhance with AI comments if requested
    if (useAI) {
      result = await enhanceWithAIComments(result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Triple analysis error:', requestId, sanitizeError(error));
    return jsonError('Fehler bei der Analyse.', 500, requestId);
  }
}

async function enhanceWithAIComments(
  result: TripleAnalysisResult
): Promise<TripleAnalysisResult> {
  try {
    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      return result;
    }
    const knowledge = getKnowledgeService();

    // Only enhance top 5 deviations
    const topDeviations = result.by_account.slice(0, 5);

    for (let i = 0; i < topDeviations.length; i++) {
      const dev = topDeviations[i];
      const ragContext = knowledge.getAccountKnowledge(dev.account);

      const bookingsContext = dev.top_bookings_ist
        ?.slice(0, 3)
        .map(b => `• ${sanitizeForPrompt(b.date, 20)}: "${sanitizeForPrompt(b.text || '', 120)}" (Beleg: ${sanitizeForPrompt(b.document_no || '', 40)}) = ${formatCurrency(b.amount)}`)
        .join('\n') || '';

      const prompt = `Du bist ein Controlling-Experte. Analysiere diese Plan-Ist-VJ-Abweichung.
${INJECTION_GUARD}

Konto: ${dev.account} - ${sanitizeForPrompt(dev.account_name, 120)}
${ragContext ? `Kontext: ${sanitizeForPrompt(ragContext.typical_behavior, 200)}` : ''}

VERGLEICH:
• Vorjahr: ${formatCurrency(dev.amount_vj)}
• Plan: ${formatCurrency(dev.amount_plan)}
• Ist: ${formatCurrency(dev.amount_ist)}

ABWEICHUNGEN:
• vs. Plan: ${formatCurrency(dev.delta_plan_abs)} (${dev.delta_plan_pct >= 0 ? '+' : ''}${dev.delta_plan_pct.toFixed(1)}%)
• vs. VJ: ${formatCurrency(dev.delta_vj_abs)} (${dev.delta_vj_pct >= 0 ? '+' : ''}${dev.delta_vj_pct.toFixed(1)}%)

Status: ${dev.status === 'critical' ? '🔴 KRITISCH' : dev.status === 'on_track' ? '🟢 IM PLAN' : '🟡 ABWEICHUNG'}

Top Buchungen:
${wrapUntrusted('BUCHUNGEN', bookingsContext, 1200)}

Schreibe einen kurzen Kommentar (2-3 Sätze) der:
1. Die Plan-Abweichung erklärt
2. Den VJ-Trend einordnet
3. Eine Handlungsempfehlung gibt`;

      try {
        const response = await llm.generate(prompt, {
          temperature: 0.3,
          maxTokens: 300,
        });

        result.by_account[i].comment = response.text;
      } catch (error) {
        console.error('AI comment error for account', dev.account, error);
      }
    }

    return result;
  } catch (error) {
    console.error('AI enhancement failed:', error);
    return result;
  }
}
