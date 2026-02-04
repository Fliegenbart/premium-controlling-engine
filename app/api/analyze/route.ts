/**
 * Analyze API - Full Variance Analysis
 * POST /api/analyze
 * 
 * Combines:
 * - DuckDB-based variance calculation
 * - Driver decomposition
 * - Data profiling
 * - Optional AI comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  initDatabase, 
  analyzeVariance, 
  getTopBookings, 
  decomposeVariance,
  profileTable 
} from '@/lib/duckdb-engine';
import { getAccountKnowledge, checkRedFlags, buildPromptContext } from '@/lib/knowledge-base';
import { ControllingAgent } from '@/lib/agent';
import { getLocalAgent } from '@/lib/local-agent';
import { AnalysisResult, AccountDeviation, TopBooking } from '@/lib/types';

interface AnalyzeRequest {
  wesentlichkeitAbs?: number;
  wesentlichkeitPct?: number;
  maxAccounts?: number;
  includeDrivers?: boolean;
  includeAI?: boolean;
  apiKey?: string;
  periodPrev?: string;
  periodCurr?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResult | { error: string }>> {
  try {
    const body: AnalyzeRequest = await request.json();
    const {
      wesentlichkeitAbs = 5000,
      wesentlichkeitPct = 10,
      maxAccounts = 20,
      includeDrivers = true,
      includeAI = false,
      apiKey,
      periodPrev = 'Vorjahr',
      periodCurr = 'Aktuell'
    } = body;
    
    // Initialize database
    await initDatabase(process.env.DATABASE_PATH);
    
    // Get data profiles
    let profilePrev, profileCurr;
    try {
      profilePrev = await profileTable('controlling.bookings_prev');
      profileCurr = await profileTable('controlling.bookings_curr');
    } catch (e) {
      return NextResponse.json(
        { error: 'Daten nicht gefunden. Bitte erst Dateien hochladen.' },
        { status: 400 }
      );
    }
    
    // Run variance analysis
    const variances = await analyzeVariance(
      'controlling.bookings_prev',
      'controlling.bookings_curr'
    );
    
    // Filter by materiality
    const significantVariances = variances.filter(v => 
      Math.abs(v.deltaAbs) >= wesentlichkeitAbs || 
      Math.abs(v.deltaPct) >= wesentlichkeitPct
    ).slice(0, maxAccounts);
    
    // Enhance each deviation
    const accountDeviations: AccountDeviation[] = [];
    
    for (const v of significantVariances) {
      const account = parseInt(v.key);
      
      // Get top bookings
      const topBookingsCurr = await getTopBookings('controlling.bookings_curr', account, 10);
      const topBookingsPrev = await getTopBookings('controlling.bookings_prev', account, 10);
      
      // Get drivers if requested
      let drivers;
      if (includeDrivers) {
        const decomposed = await decomposeVariance(
          'controlling.bookings_prev',
          'controlling.bookings_curr',
          account
        );
        drivers = decomposed.drivers;
      }
      
      // Get knowledge context
      const knowledge = getAccountKnowledge(account);
      
      // Check red flags
      const totalRevenue = Math.abs(profileCurr.totals.credits);
      const percentOfRevenue = totalRevenue > 0 
        ? (Math.abs(v.amountCurr) / totalRevenue) * 100 
        : 0;
      
      const redFlags = checkRedFlags(account, v.deltaPct, v.deltaAbs, {
        percentOfRevenue,
        isNewBookingType: hasNewBookingTypes(topBookingsCurr, topBookingsPrev),
        hasMissingBookings: hasMissingBookingTypes(topBookingsCurr, topBookingsPrev)
      });
      
      // Generate comment
      let comment = generateRuleBasedComment(v, knowledge);
      let anomalySeverity: 'info' | 'warning' | 'critical' | undefined;
      let anomalyHint: string | undefined;
      
      if (redFlags.length > 0) {
        const criticalFlags = redFlags.filter(f => f.severity === 'critical');
        const warningFlags = redFlags.filter(f => f.severity === 'warning');
        
        if (criticalFlags.length > 0) {
          anomalySeverity = 'critical';
          anomalyHint = criticalFlags[0].flag;
        } else if (warningFlags.length > 0) {
          anomalySeverity = 'warning';
          anomalyHint = warningFlags[0].flag;
        } else {
          anomalySeverity = 'info';
          anomalyHint = redFlags[0].flag;
        }
      }
      
      accountDeviations.push({
        account,
        account_name: v.label,
        amount_prev: v.amountPrev,
        amount_curr: v.amountCurr,
        delta_abs: v.deltaAbs,
        delta_pct: v.deltaPct,
        bookings_count_prev: v.bookingsPrev,
        bookings_count_curr: v.bookingsCurr,
        comment,
        top_bookings_curr: formatBookings(topBookingsCurr),
        top_bookings_prev: formatBookings(topBookingsPrev),
        drivers,
        anomalySeverity,
        anomalyHint
      });
    }
    
    // Add AI comments if requested
    if (includeAI) {
      // Try cloud first, then local
      const useCloud = apiKey || process.env.ANTHROPIC_API_KEY;
      
      // Only enhance top 5 to limit processing time
      for (let i = 0; i < Math.min(5, accountDeviations.length); i++) {
        try {
          const dev = accountDeviations[i];
          
          if (useCloud) {
            // Cloud mode (Anthropic)
            const key = apiKey || process.env.ANTHROPIC_API_KEY!;
            const agent = new ControllingAgent(key);
            const response = await agent.answer(
              `Analysiere kurz die Abweichung für Konto ${dev.account} ${dev.account_name}: ` +
              `Vorjahr ${formatCurrency(dev.amount_prev)}, Aktuell ${formatCurrency(dev.amount_curr)}, ` +
              `Delta ${formatCurrency(dev.delta_abs)} (${dev.delta_pct.toFixed(1)}%). ` +
              `Top-Buchungen: ${dev.top_bookings_curr?.slice(0, 3).map(b => b.text).join(', ')}. ` +
              `Antworte mit 2-3 Sätzen.`
            );
            accountDeviations[i].comment = response.answer;
          } else {
            // Local mode (Ollama)
            const localAgent = getLocalAgent();
            const readyCheck = await localAgent.isReady();
            
            if (readyCheck.ready) {
              const topBookings = dev.top_bookings_curr?.map(b => ({ text: b.text, amount: b.amount })) || [];
              const comment = await localAgent.generateComment(
                dev.account,
                dev.account_name,
                dev.amount_prev,
                dev.amount_curr,
                topBookings
              );
              accountDeviations[i].comment = comment;
            }
          }
        } catch (e) {
          // Keep rule-based comment on error
          console.error('AI comment failed for account', accountDeviations[i].account, e);
        }
      }
    }
    
    // Calculate summary
    const erloesePrev = variances
      .filter(v => parseInt(v.key) < 5000)
      .reduce((sum, v) => sum + v.amountPrev, 0);
    const erloeseCurr = variances
      .filter(v => parseInt(v.key) < 5000)
      .reduce((sum, v) => sum + v.amountCurr, 0);
    const aufwendungenPrev = variances
      .filter(v => parseInt(v.key) >= 5000)
      .reduce((sum, v) => sum + v.amountPrev, 0);
    const aufwendungenCurr = variances
      .filter(v => parseInt(v.key) >= 5000)
      .reduce((sum, v) => sum + v.amountCurr, 0);
    
    const result: AnalysisResult = {
      meta: {
        period_prev: periodPrev,
        period_curr: periodCurr,
        bookings_prev: profilePrev.rowCount,
        bookings_curr: profileCurr.rowCount,
        total_prev: profilePrev.totals.all,
        total_curr: profileCurr.totals.all,
        analyzed_at: new Date().toISOString(),
        engine_version: '2.0.0-duckdb'
      },
      summary: {
        total_delta: profileCurr.totals.all - profilePrev.totals.all,
        erloese_prev: erloesePrev,
        erloese_curr: erloeseCurr,
        aufwendungen_prev: aufwendungenPrev,
        aufwendungen_curr: aufwendungenCurr
      },
      by_account: accountDeviations,
      by_cost_center: [], // TODO: Add cost center analysis
      data_quality: {
        prev: profilePrev,
        curr: profileCurr
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: `Analyse fehlgeschlagen: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Helper functions
function formatBookings(bookings: Array<{
  posting_date: string;
  amount: number;
  document_no: string;
  text: string;
  vendor?: string;
  customer?: string;
}>): TopBooking[] {
  return bookings.map(b => ({
    date: b.posting_date,
    amount: b.amount,
    document_no: b.document_no,
    text: b.text,
    vendor: b.vendor,
    customer: b.customer
  }));
}

function hasNewBookingTypes(curr: Array<{ text: string }>, prev: Array<{ text: string }>): boolean {
  const prevTexts = new Set(prev.map(b => normalizeText(b.text)));
  return curr.some(b => !prevTexts.has(normalizeText(b.text)));
}

function hasMissingBookingTypes(curr: Array<{ text: string }>, prev: Array<{ text: string }>): boolean {
  const currTexts = new Set(curr.map(b => normalizeText(b.text)));
  return prev.some(b => !currTexts.has(normalizeText(b.text)));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[0-9]/g, '').trim().substring(0, 20);
}

function generateRuleBasedComment(
  variance: { deltaAbs: number; deltaPct: number; label: string; amountPrev: number; amountCurr: number },
  knowledge: ReturnType<typeof getAccountKnowledge>
): string {
  const direction = variance.deltaAbs > 0 ? 'gestiegen' : 'gesunken';
  const absFormatted = formatCurrency(Math.abs(variance.deltaAbs));
  const pctFormatted = `${Math.abs(variance.deltaPct).toFixed(1)}%`;
  
  let comment = `${variance.label} ist um ${absFormatted} (${pctFormatted}) ${direction}.`;
  
  if (knowledge) {
    comment += ` ${knowledge.typical_behavior}`;
  }
  
  if (Math.abs(variance.deltaPct) > 50) {
    comment += ' ⚠️ Prüfung empfohlen.';
  }
  
  return comment;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}
