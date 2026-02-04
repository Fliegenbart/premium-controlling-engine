/**
 * Local Controlling Agent - Ollama-based
 * 
 * 100% local, no external API required.
 * Uses prompt engineering for tool-calling simulation.
 */

import { OllamaClient, getOllamaClient, RECOMMENDED_MODELS } from './ollama-client';
import * as db from './duckdb-engine';
import { AgentResponse, ToolCall, Source, VarianceDriver } from './types';
import { getAccountKnowledge, buildPromptContext } from './knowledge-base';

// System prompt for local model
const SYSTEM_PROMPT = `Du bist ein erfahrener Controller-Experte für deutsche Unternehmen (SKR03).
Du analysierst Buchungsdaten und erklärst Abweichungen.

WICHTIGE REGELN:
1. Antworte IMMER auf Deutsch
2. Nenne konkrete Zahlen und Belegnummern
3. Erkläre die Treiber einer Abweichung (wer/was/warum)
4. Formatiere Währungen als EUR mit Punkt als Tausendertrenner

VERFÜGBARE DATEN:
- Buchungstabellen mit: posting_date, amount, account, account_name, cost_center, vendor, document_no, text
- Vorjahr: controlling.bookings_prev
- Aktuell: controlling.bookings_curr`;

// Tool descriptions for the model
const TOOL_DESCRIPTIONS = `
Du kannst folgende Analysen durchführen:

1. SQL_QUERY: Datenbankabfrage ausführen
   Beispiel: SELECT account, SUM(amount) FROM controlling.bookings_curr GROUP BY account

2. VARIANCE: Abweichungsanalyse für ein Konto
   Zeigt Vorjahr vs. Aktuell und die Haupttreiber

3. TOP_BOOKINGS: Größte Buchungen eines Kontos abrufen
   Zeigt die wichtigsten Einzelbuchungen

4. ACCOUNT_INFO: Kontokontext aus SKR03 abrufen
   Zeigt typisches Verhalten, Saisonalität, Benchmarks

Wenn du eine Analyse brauchst, schreibe:
[TOOL: TOOLNAME]
[PARAMS: parameter]
[/TOOL]

Beispiel:
[TOOL: SQL_QUERY]
[PARAMS: SELECT account_name, SUM(amount) as total FROM controlling.bookings_curr WHERE account = 6000 GROUP BY account_name]
[/TOOL]
`;

export class LocalControllingAgent {
  private ollama: OllamaClient;
  private model: string;
  
  constructor(model?: string) {
    this.ollama = getOllamaClient();
    this.model = model || process.env.OLLAMA_MODEL || RECOMMENDED_MODELS.primary;
  }
  
  /**
   * Check if Ollama is ready
   */
  async isReady(): Promise<{ ready: boolean; model: string; error?: string }> {
    const health = await this.ollama.healthCheck();
    
    if (!health.healthy) {
      return { ready: false, model: this.model, error: health.error };
    }
    
    // Check if our model is available
    const hasModel = health.models.some(m => m.startsWith(this.model.split(':')[0]));
    
    if (!hasModel) {
      return { 
        ready: false, 
        model: this.model, 
        error: `Model ${this.model} nicht gefunden. Verfügbar: ${health.models.join(', ')}` 
      };
    }
    
    return { ready: true, model: this.model };
  }
  
  /**
   * Main entry point: Answer a question with evidence
   */
  async answer(question: string, context?: Record<string, unknown>): Promise<AgentResponse> {
    const toolCalls: ToolCall[] = [];
    const sources: Source[] = [];
    
    // Build initial prompt with context
    let prompt = this.buildPrompt(question, context);
    
    // First pass: Let model decide what tools to use
    const planResponse = await this.ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + TOOL_DESCRIPTIONS },
        { role: 'user', content: prompt + '\n\nWelche Analysen brauchst du um diese Frage zu beantworten? Nutze die TOOL-Syntax.' }
      ],
      options: { temperature: 0.3, num_ctx: 8192 }
    });
    
    // Extract and execute tool calls
    const toolResults = await this.executeToolsFromResponse(planResponse, toolCalls, sources);
    
    // Second pass: Generate final answer with tool results
    const finalPrompt = `${prompt}

ANALYSE-ERGEBNISSE:
${toolResults}

Basierend auf diesen Daten, beantworte die Frage. Nenne konkrete Zahlen und Belegnummern.`;

    const finalResponse = await this.ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      options: { temperature: 0.5, num_ctx: 8192, num_predict: 2048 }
    });
    
    // Calculate confidence
    const confidence = this.calculateConfidence(toolCalls, sources);
    
    return {
      answer: finalResponse,
      confidence,
      sources,
      toolCalls
    };
  }
  
  /**
   * Quick answer without tool calling (for simple questions)
   */
  async quickAnswer(question: string): Promise<string> {
    const response = await this.ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question }
      ],
      options: { temperature: 0.7 }
    });
    
    return response;
  }
  
  /**
   * Generate AI comment for an account deviation
   */
  async generateComment(
    account: number,
    accountName: string,
    amountPrev: number,
    amountCurr: number,
    topBookings: Array<{ text: string; amount: number }>
  ): Promise<string> {
    const delta = amountCurr - amountPrev;
    const deltaPct = amountPrev !== 0 ? (delta / Math.abs(amountPrev)) * 100 : 100;
    const direction = delta > 0 ? 'gestiegen' : 'gesunken';
    
    const knowledge = getAccountKnowledge(account);
    const knowledgeContext = knowledge ? buildPromptContext(account, deltaPct) : '';
    
    const prompt = `Erkläre kurz (2-3 Sätze) die Abweichung für:
Konto ${account} ${accountName}
Vorjahr: ${formatCurrency(amountPrev)}
Aktuell: ${formatCurrency(amountCurr)}
Delta: ${formatCurrency(delta)} (${deltaPct.toFixed(1)}%) - ${direction}

Top-Buchungen aktuell:
${topBookings.slice(0, 3).map(b => `- ${b.text}: ${formatCurrency(b.amount)}`).join('\n')}
${knowledgeContext}

Antworte professionell und prägnant auf Deutsch.`;

    const response = await this.ollama.chat({
      model: this.model,
      messages: [
        { role: 'system', content: 'Du bist ein Controller-Experte. Antworte kurz und prägnant auf Deutsch.' },
        { role: 'user', content: prompt }
      ],
      options: { temperature: 0.5, num_predict: 256 }
    });
    
    return response.trim();
  }
  
  /**
   * Parse and execute tools from model response
   */
  private async executeToolsFromResponse(
    response: string,
    toolCalls: ToolCall[],
    sources: Source[]
  ): Promise<string> {
    const results: string[] = [];
    
    // Parse tool calls with regex
    const toolPattern = /\[TOOL:\s*(\w+)\]\s*\[PARAMS:\s*([^\]]+)\]\s*\[\/TOOL\]/gi;
    let match;
    
    while ((match = toolPattern.exec(response)) !== null) {
      const toolName = match[1].toUpperCase();
      const params = match[2].trim();
      
      const start = Date.now();
      let output: unknown;
      let error: string | undefined;
      
      try {
        switch (toolName) {
          case 'SQL_QUERY':
            output = await db.executeSQL(params);
            break;
            
          case 'VARIANCE':
            const account = parseInt(params);
            if (!isNaN(account)) {
              output = await db.decomposeVariance(
                'controlling.bookings_prev',
                'controlling.bookings_curr',
                account
              );
            }
            break;
            
          case 'TOP_BOOKINGS':
            const [accStr, period] = params.split(',').map(s => s.trim());
            const acc = parseInt(accStr);
            const table = period?.toLowerCase() === 'prev' 
              ? 'controlling.bookings_prev' 
              : 'controlling.bookings_curr';
            if (!isNaN(acc)) {
              output = await db.getTopBookings(table, acc, 10);
            }
            break;
            
          case 'ACCOUNT_INFO':
            const accNum = parseInt(params);
            if (!isNaN(accNum)) {
              output = getAccountKnowledge(accNum);
            }
            break;
            
          default:
            error = `Unbekanntes Tool: ${toolName}`;
        }
      } catch (e) {
        error = (e as Error).message;
      }
      
      const executionTimeMs = Date.now() - start;
      
      toolCalls.push({
        tool: toolName,
        input: { params },
        output,
        executionTimeMs,
        error
      });
      
      if (!error && output) {
        sources.push({
          type: 'query',
          reference: `${toolName}: ${params.substring(0, 50)}...`,
          excerpt: JSON.stringify(output).substring(0, 200)
        });
        
        results.push(`=== ${toolName} ===\n${JSON.stringify(output, null, 2)}`);
      } else if (error) {
        results.push(`=== ${toolName} (FEHLER) ===\n${error}`);
      }
    }
    
    // If no tools were called, try a default variance query
    if (results.length === 0) {
      try {
        const variance = await db.analyzeVariance(
          'controlling.bookings_prev',
          'controlling.bookings_curr'
        );
        const top5 = variance.slice(0, 5);
        
        toolCalls.push({
          tool: 'AUTO_VARIANCE',
          input: { auto: true },
          output: top5,
          executionTimeMs: 0
        });
        
        results.push(`=== TOP 5 ABWEICHUNGEN ===\n${JSON.stringify(top5, null, 2)}`);
      } catch (e) {
        // Ignore - no data loaded
      }
    }
    
    return results.join('\n\n');
  }
  
  /**
   * Build the initial prompt with context
   */
  private buildPrompt(question: string, context?: Record<string, unknown>): string {
    let prompt = question;
    
    if (context) {
      prompt += '\n\nKONTEXT:\n';
      if (context.periodPrev) prompt += `- Vorjahr: ${context.periodPrev}\n`;
      if (context.periodCurr) prompt += `- Aktuell: ${context.periodCurr}\n`;
      if (context.totalDeviation) prompt += `- Gesamtabweichung: ${formatCurrency(context.totalDeviation as number)}\n`;
      if (context.topAccounts) {
        prompt += `- Top Abweichungen:\n`;
        for (const acc of context.topAccounts as Array<{ account: number; name: string; delta: number }>) {
          prompt += `  • ${acc.account} ${acc.name}: ${formatCurrency(acc.delta)}\n`;
        }
      }
    }
    
    return prompt;
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(toolCalls: ToolCall[], sources: Source[]): number {
    if (toolCalls.length === 0) return 0.4; // No evidence but local model
    
    const successfulCalls = toolCalls.filter(t => !t.error).length;
    const totalCalls = toolCalls.length;
    
    let confidence = (successfulCalls / totalCalls) * 0.6;
    
    // Bonus for SQL queries
    if (toolCalls.some(t => t.tool === 'SQL_QUERY' && !t.error)) {
      confidence += 0.2;
    }
    
    // Bonus for variance analysis
    if (toolCalls.some(t => (t.tool === 'VARIANCE' || t.tool === 'AUTO_VARIANCE') && !t.error)) {
      confidence += 0.15;
    }
    
    return Math.min(confidence, 0.95); // Cap at 95% for local models
  }
}

// Utility
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

// Export singleton factory
let localAgent: LocalControllingAgent | null = null;

export function getLocalAgent(model?: string): LocalControllingAgent {
  if (!localAgent || model) {
    localAgent = new LocalControllingAgent(model);
  }
  return localAgent;
}
