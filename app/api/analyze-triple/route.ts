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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const vjFile = formData.get('vjFile') as File;
    const planFile = formData.get('planFile') as File;
    const istFile = formData.get('istFile') as File;
    const apiKey = formData.get('apiKey') as string | null;

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
      return NextResponse.json(
        { error: 'Mindestens die Ist-Daten (aktuelle Buchungen) sind erforderlich' },
        { status: 400 }
      );
    }

    // Parse files
    const istText = await istFile.text();
    const istBookings = parseCSV(istText);

    if (istBookings.length === 0) {
      return NextResponse.json(
        { error: 'Ist-Datei konnte nicht gelesen werden oder ist leer' },
        { status: 400 }
      );
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
    if (useAI && (apiKey || process.env.ANTHROPIC_API_KEY)) {
      result = await enhanceWithAIComments(result, apiKey);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Triple analysis error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Analyse: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function enhanceWithAIComments(
  result: TripleAnalysisResult,
  apiKey: string | null
): Promise<TripleAnalysisResult> {
  try {
    const llm = getHybridLLMService({ claudeApiKey: apiKey || undefined });
    const knowledge = getKnowledgeService();

    // Only enhance top 5 deviations
    const topDeviations = result.by_account.slice(0, 5);

    for (let i = 0; i < topDeviations.length; i++) {
      const dev = topDeviations[i];
      const ragContext = knowledge.getAccountKnowledge(dev.account);

      const bookingsContext = dev.top_bookings_ist
        ?.slice(0, 3)
        .map(b => `• ${b.date}: "${b.text}" (Beleg: ${b.document_no}) = ${formatCurrency(b.amount)}`)
        .join('\n') || '';

      const prompt = `Du bist ein Controlling-Experte. Analysiere diese Plan-Ist-VJ-Abweichung:

Konto: ${dev.account} - ${dev.account_name}
${ragContext ? `Kontext: ${ragContext.typical_behavior}` : ''}

VERGLEICH:
• Vorjahr: ${formatCurrency(dev.amount_vj)}
• Plan: ${formatCurrency(dev.amount_plan)}
• Ist: ${formatCurrency(dev.amount_ist)}

ABWEICHUNGEN:
• vs. Plan: ${formatCurrency(dev.delta_plan_abs)} (${dev.delta_plan_pct >= 0 ? '+' : ''}${dev.delta_plan_pct.toFixed(1)}%)
• vs. VJ: ${formatCurrency(dev.delta_vj_abs)} (${dev.delta_vj_pct >= 0 ? '+' : ''}${dev.delta_vj_pct.toFixed(1)}%)

Status: ${dev.status === 'critical' ? '🔴 KRITISCH' : dev.status === 'on_track' ? '🟢 IM PLAN' : '🟡 ABWEICHUNG'}

Top Buchungen:
${bookingsContext}

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
