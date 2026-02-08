/**
 * AI-Powered Report Narrative Generator
 * Uses Ollama for German-language controlling report sections
 */

import { AnalysisResult } from './types';
import { getOllamaService } from './llm/ollama-service';

export interface AIReportSections {
  executiveSummary: string;
  segmentCommentary: string;
  deviationAnalysis: string;
  riskAssessment: string;
  recommendations: string;
  outlook: string;
  generatedAt: string;
  aiGenerated: boolean;
}

/**
 * Format currency for prompt context
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Generate template-based fallback text when Ollama is unavailable
 */
function generateFallbackSections(data: AnalysisResult): Omit<AIReportSections, 'generatedAt' | 'aiGenerated'> {
  const revenueDelta = data.summary.erloese_curr - data.summary.erloese_prev;
  const expenseDelta = data.summary.aufwendungen_curr - data.summary.aufwendungen_prev;
  const revenueDeltaPct = (revenueDelta / Math.abs(data.summary.erloese_prev)) * 100 || 0;
  const expenseDeltaPct = (expenseDelta / Math.abs(data.summary.aufwendungen_prev)) * 100 || 0;

  const topDeviations = data.by_account.slice(0, 5);
  const riskAccounts = data.by_account
    .filter(a => Math.abs(a.delta_pct) > 15 || Math.abs(a.delta_abs) > 50000)
    .slice(0, 3);

  return {
    executiveSummary: `Im Berichtszeitraum ${data.meta.period_curr} wurde eine Gesamtabweichung von ${formatCurrency(data.summary.total_delta)} gegenüber dem Vorjahr ${data.meta.period_prev} festgestellt. Die Erlöse stiegen um ${formatCurrency(revenueDelta)} (${revenueDeltaPct > 0 ? '+' : ''}${revenueDeltaPct.toFixed(1)}%), während die Aufwendungen um ${formatCurrency(Math.abs(expenseDelta))} ${expenseDelta > 0 ? 'stiegen' : 'sanken'}. Die Analyse umfasst ${data.meta.bookings_curr} Buchungen und identifiziert wesentliche Abweichungen oberhalb der Schwelle von ${formatCurrency(data.meta.wesentlichkeit_abs)}.`,

    segmentCommentary: `Die Erlösseite zeigt ${revenueDelta > 0 ? 'eine positive Entwicklung' : 'eine Rückgang'} mit einer Veränderung von ${revenueDeltaPct.toFixed(1)}% zum Vorjahr. Auf der Aufwandseite wurden Veränderungen in Höhe von ${formatCurrency(Math.abs(expenseDelta))} registriert. Das Kostenmanagement konzentriert sich auf die ${data.by_cost_center.length} analysierten Kostenstellen, wobei die größten Abweichungen in den Bereichen ${data.by_cost_center.slice(0, 2).map(cc => cc.cost_center).join(' und ')} zu beobachten sind.`,

    deviationAnalysis: `Die Analyse der wesentlichen Abweichungen zeigt folgende Schwerpunkte:\n\n${topDeviations.map((dev, idx) => {
      const isRevenue = dev.account < 5000;
      return `${idx + 1}. Konto ${dev.account} (${dev.account_name}): ${isRevenue ? 'Erlöse' : 'Aufwendungen'} von ${formatCurrency(dev.amount_prev)} im Vorjahr zu ${formatCurrency(dev.amount_curr)} im aktuellen Zeitraum. Abweichung: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct > 0 ? '+' : ''}${dev.delta_pct.toFixed(1)}%)`;
    }).join('\n\n')}`,

    riskAssessment: `Kritische Abweichungen, die einer besonderen Aufmerksamkeit bedürfen, finden sich bei folgenden Konten:\n${riskAccounts.map(acc => {
      const severity = Math.abs(acc.delta_pct) > 25 ? 'Kritisch' : 'Erheblich';
      return `• ${severity}: Konto ${acc.account} (${acc.account_name}) mit einer Abweichung von ${formatCurrency(acc.delta_abs)}. Empfohlene Maßnahme: Überprüfung der Transaktionslogik und mögliche Anpassung der Kostenverantwortlichen.`;
    }).join('\n')}`,

    recommendations: `Basierend auf der Analyse werden folgende Handlungsempfehlungen ausgesprochen:\n• Detaillierte Analyse der ${topDeviations.length} Konten mit wesentlichen Abweichungen durchführen\n• Implementierung von monatlichen Prognose-Abstimmungen mit den Fachabteilungen\n• Überprüfung der Kostenstellenbudgets für ${data.by_cost_center.slice(0, 2).map(cc => cc.cost_center).join(' und ')}\n• Etablierung von Frühindikatoren zur zeitnahen Erkennung von Abweichungsmustern`,

    outlook: `Für die kommenden Perioden wird empfohlen, die identifizierten Abweichungstrends kontinuierlich zu überwachen. Sollten sich die Trends aus ${data.meta.period_curr} fortsetzen, ist mit einer Kumulation der Abweichungen zu rechnen. Die Geschäftsleitung sollte proaktive Maßnahmen einleiten, um die geplanten Ziele zu erreichen. Eine Neubewertung der Jahresprognose wird auf Basis dieser Erkenntnisse empfohlen.`,
  };
}

/**
 * Generate Executive Summary with AI
 */
async function generateExecutiveSummary(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const revenueDelta = data.summary.erloese_curr - data.summary.erloese_prev;
  const expenseDelta = data.summary.aufwendungen_curr - data.summary.aufwendungen_prev;

  const prompt = `Du bist ein professioneller Controlling-Analyst. Schreibe eine prägnante Zusammenfassung für die Geschäftsführung basierend auf folgenden Daten:

Berichtszeitraum: ${data.meta.period_curr}
Vergleichszeitraum: ${data.meta.period_prev}
Gesamtabweichung: ${formatCurrency(data.summary.total_delta)}
Erlösveränderung: ${formatCurrency(revenueDelta)}
Aufwendungsveränderung: ${formatCurrency(expenseDelta)}
Anzahl Buchungen: ${data.meta.bookings_curr}
Wesentlichkeitsgrenze: ${formatCurrency(data.meta.wesentlichkeit_abs)}

Schreibe 3-4 prägnante Sätze, die die finanzielle Situation zusammenfassen. Verwende professionelles Deutsch und beziehe dich auf konkrete Zahlen.`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.3,
      maxTokens: 200,
      systemPrompt: 'Du bist ein erfahrener Unternehmensberater und Controlling-Experte. Antworte präzise und auf den Punkt gebracht.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Executive Summary generation failed:', error);
    throw error;
  }
}

/**
 * Generate Segment Commentary with AI
 */
async function generateSegmentCommentary(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const revenueDelta = data.summary.erloese_curr - data.summary.erloese_prev;
  const expenseDelta = data.summary.aufwendungen_curr - data.summary.aufwendungen_prev;
  const topCostCenters = data.by_cost_center.slice(0, 3);

  const prompt = `Analysiere folgende Segmentdaten und schreibe einen Geschäftsbericht:

Erlöseseite:
- Vorjahr: ${formatCurrency(data.summary.erloese_prev)}
- Aktuell: ${formatCurrency(data.summary.erloese_curr)}
- Veränderung: ${formatCurrency(revenueDelta)}

Aufwandseite:
- Vorjahr: ${formatCurrency(data.summary.aufwendungen_prev)}
- Aktuell: ${formatCurrency(data.summary.aufwendungen_curr)}
- Veränderung: ${formatCurrency(expenseDelta)}

Top Kostenstellen: ${topCostCenters.map(cc => `${cc.cost_center} (${formatCurrency(cc.delta_abs)})`).join(', ')}

Schreibe einen 4-5 Sätze umfassenden Geschäftsbericht zur Segmentperformance mit Fokus auf Erlöse, Kosten und Kostenstellenentwicklung.`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.3,
      maxTokens: 300,
      systemPrompt: 'Du bist ein Controlling-Expert. Schreibe sachlich, strukturiert und mit konkreten Bezügen zu den Zahlen.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Segment commentary generation failed:', error);
    throw error;
  }
}

/**
 * Generate Deviation Analysis with AI
 */
async function generateDeviationAnalysis(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const topDeviations = data.by_account.slice(0, 8);

  const deviationSummary = topDeviations
    .map((dev, idx) => {
      const isRevenue = dev.account < 5000;
      return `${idx + 1}. Konto ${dev.account} (${dev.account_name}): ${formatCurrency(dev.amount_prev)} → ${formatCurrency(dev.amount_curr)}, Delta: ${formatCurrency(dev.delta_abs)} (${dev.delta_pct.toFixed(1)}%)`;
    })
    .join('\n');

  const prompt = `Analysiere folgende wesentliche Kontenabweichungen und schreibe einen detaillierten Bericht:

${deviationSummary}

Schreibe einen professionellen Bericht, der:
1. Die Top-Abweichungen zusammenfasst
2. Mögliche Ursachen (z.B. Saisonalität, neue Transaktionen, Mengenveränderungen) erläutert
3. Verbindungen zwischen den Abweichungen aufzeigt
4. Kontrollschlussfolgerungen zieht

Verwende präzises Deutsch und beziehe dich konkret auf die Kontonummern und -namen.`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.3,
      maxTokens: 500,
      systemPrompt: 'Du bist ein analytischer Controlling-Fachmann mit 15 Jahren Erfahrung. Schreibe strukturiert, präzise und mit professionellen Schlussfolgerungen.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Deviation analysis generation failed:', error);
    throw error;
  }
}

/**
 * Generate Risk Assessment with AI
 */
async function generateRiskAssessment(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const riskAccounts = data.by_account
    .filter(a => Math.abs(a.delta_pct) > 15 || Math.abs(a.delta_abs) > 100000)
    .slice(0, 6);

  const riskSummary = riskAccounts
    .map(acc => `- Konto ${acc.account} (${acc.account_name}): ${formatCurrency(acc.delta_abs)} (${acc.delta_pct.toFixed(1)}%), Anomalie: ${acc.anomalyHint || 'unbekannt'}`)
    .join('\n');

  const prompt = `Als Risikomanager bewerte bitte folgende finanzielle Abweichungen auf ihre Risiken:

${riskSummary}

Schreibe einen Risikobericht, der:
1. Die identifizierten Finanzrisiken kategorisiert (kritisch, erheblich, moderat)
2. Potenzielle Auswirkungen auf die Gesamtperformance beschreibt
3. Mögliche Ursachen für systematische Abweichungen identifiziert
4. Kontrollempfehlungen abgibt

Fokus: Welche Risiken gefährden die Geschäftsziele?`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.3,
      maxTokens: 400,
      systemPrompt: 'Du bist ein erfahrener Risk Manager und Compliance Officer. Identifiziere Risiken präzise und gib konkrete Warnsignale.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Risk assessment generation failed:', error);
    throw error;
  }
}

/**
 * Generate Recommendations with AI
 */
async function generateRecommendations(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const topIssues = data.by_account.slice(0, 5);
  const affectedCostCenters = data.by_cost_center.slice(0, 3);

  const prompt = `Basierend auf dieser Controlling-Analyse gib konkrete Handlungsempfehlungen:

Top-Abweichungen:
${topIssues.map(acc => `- ${acc.account_name}: ${formatCurrency(acc.delta_abs)}`).join('\n')}

Kostenstellen mit Abweichungen:
${affectedCostCenters.map(cc => `- ${cc.cost_center}: ${formatCurrency(cc.delta_abs)}`).join('\n')}

Bitte generiere 5-7 konkrete, umsetzbare Handlungsempfehlungen:
1. Fokus auf Management-Maßnahmen
2. Bezug zu spezifischen Konten/Kostenstellen
3. Priorisierung nach Dringlichkeit
4. Realistisches Timeframe

Format: Nummerierte Liste mit je 1-2 Sätzen pro Empfehlung.`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.3,
      maxTokens: 400,
      systemPrompt: 'Du bist ein Unternehmensberater mit Schwerpunkt operatives Controlling. Gib praktische, umsetzbare Empfehlungen.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Recommendations generation failed:', error);
    throw error;
  }
}

/**
 * Generate Outlook with AI
 */
async function generateOutlook(
  ollama: ReturnType<typeof getOllamaService>,
  data: AnalysisResult
): Promise<string> {
  const trend = data.summary.total_delta > 0 ? 'positiv' : 'negativ';
  const growthRate = ((data.summary.erloese_curr - data.summary.erloese_prev) / Math.abs(data.summary.erloese_prev)) * 100 || 0;

  const prompt = `Schreibe einen Ausblick auf die kommenden Perioden basierend auf folgenden Trend-Indikatoren:

Aktueller Trend: ${trend}
Erlöswachstum: ${growthRate.toFixed(1)}%
Anzahl kritischer Konten: ${data.by_account.filter(a => Math.abs(a.delta_pct) > 15).length}
Wesentlichkeitsgrenze überschritten: ${data.by_account.filter(a => Math.abs(a.delta_abs) > data.meta.wesentlichkeit_abs).length} Konten

Schreibe einen 4-5 Sätze umfassenden Ausblick, der:
1. Die Trend-Fortsetzung bewertet
2. Saisonale Effekte berücksichtigt
3. Management-Maßnahmen antizipiert
4. Empfehlungen für die Jahresprognose gibt
5. Chancen und Risiken für Q${new Date().getMonth() + 2} skizziert`;

  try {
    const result = await ollama.generate(prompt, {
      temperature: 0.4,
      maxTokens: 300,
      systemPrompt: 'Du bist ein strategischer Controlling-Analyst. Schreibe vorausschauend, basierend auf Datentrends und Best Practices.',
    });
    return result.trim();
  } catch (error) {
    console.warn('Outlook generation failed:', error);
    throw error;
  }
}

/**
 * Main function: Generate all AI report sections
 */
export async function generateAIReportSections(data: AnalysisResult): Promise<AIReportSections> {
  const ollama = getOllamaService();
  const isAvailable = await ollama.isAvailable();
  const generatedAt = new Date().toISOString();

  // If Ollama is not available, use fallback templates
  if (!isAvailable) {
    console.warn('Ollama service not available, using template-based fallback');
    const fallback = generateFallbackSections(data);
    return {
      ...fallback,
      generatedAt,
      aiGenerated: false,
    };
  }

  try {
    // Generate all sections in parallel for performance
    const [
      executiveSummary,
      segmentCommentary,
      deviationAnalysis,
      riskAssessment,
      recommendations,
      outlook,
    ] = await Promise.all([
      generateExecutiveSummary(ollama, data),
      generateSegmentCommentary(ollama, data),
      generateDeviationAnalysis(ollama, data),
      generateRiskAssessment(ollama, data),
      generateRecommendations(ollama, data),
      generateOutlook(ollama, data),
    ]);

    return {
      executiveSummary,
      segmentCommentary,
      deviationAnalysis,
      riskAssessment,
      recommendations,
      outlook,
      generatedAt,
      aiGenerated: true,
    };
  } catch (error) {
    console.error('AI generation failed, falling back to templates:', error);
    const fallback = generateFallbackSections(data);
    return {
      ...fallback,
      generatedAt,
      aiGenerated: false,
    };
  }
}
