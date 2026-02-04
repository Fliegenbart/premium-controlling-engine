/**
 * Controlling Agent - Tool-Calling Architecture
 * 
 * Implements the "Analyse-Plan" + "Beweis zuerst" pattern:
 * 1. Plan generation before execution
 * 2. Only statements backed by query results or documents
 * 3. Variance decomposition as driver trees
 */

import Anthropic from '@anthropic-ai/sdk';
import * as db from './duckdb-engine';
import { AnalysisPlan, PlanStep, AgentResponse, ToolCall, Source, AccountKnowledge } from './types';
import { getAccountKnowledge } from './knowledge-base';

// Tool definitions for Claude
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'sql_query',
    description: 'Execute a SQL query on the DuckDB database containing booking data. Tables available: controlling.bookings_prev, controlling.bookings_curr. Returns columns and rows.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL query to execute. Use standard SQL syntax.'
        },
        purpose: {
          type: 'string',
          description: 'Why this query is needed for the analysis'
        }
      },
      required: ['sql', 'purpose']
    }
  },
  {
    name: 'variance_decompose',
    description: 'Decompose variance for a specific account into its drivers (by vendor, cost_center, text). Shows what contributed most to the change.',
    input_schema: {
      type: 'object' as const,
      properties: {
        account: {
          type: 'number',
          description: 'The account number to analyze'
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions to decompose by. Default: ["vendor", "cost_center", "text"]'
        }
      },
      required: ['account']
    }
  },
  {
    name: 'get_top_bookings',
    description: 'Get the top bookings for a specific account, sorted by absolute amount.',
    input_schema: {
      type: 'object' as const,
      properties: {
        account: {
          type: 'number',
          description: 'The account number'
        },
        period: {
          type: 'string',
          enum: ['prev', 'curr'],
          description: 'Which period to get bookings from'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of bookings to return. Default: 10'
        }
      },
      required: ['account', 'period']
    }
  },
  {
    name: 'get_account_knowledge',
    description: 'Retrieve domain knowledge about an account: typical behavior, seasonality, benchmarks, related accounts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        account: {
          type: 'number',
          description: 'The account number'
        }
      },
      required: ['account']
    }
  },
  {
    name: 'profile_data',
    description: 'Get data quality profile: row counts, null values, duplicates, outliers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          description: 'Table name to profile'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'time_series',
    description: 'Get time series data for trend analysis and forecasting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          description: 'Table name'
        },
        metric: {
          type: 'string',
          enum: ['amount', 'count'],
          description: 'What to aggregate'
        },
        group_by: {
          type: 'string',
          enum: ['month', 'quarter'],
          description: 'Time grouping'
        }
      },
      required: ['table']
    }
  }
];

// System prompt for the agent
const SYSTEM_PROMPT = `Du bist ein erfahrener Controller-Experte mit Zugriff auf eine DuckDB-Datenbank mit Buchungsdaten.

WICHTIGE REGELN:
1. **Beweis zuerst**: Jede Aussage muss durch Query-Ergebnisse oder Dokumente belegt sein.
2. **Konkrete Zahlen**: Nenne immer konkrete Beträge und Belegnummern.
3. **Treiber-Analyse**: Bei Abweichungen erkläre die Top-Treiber (wer/was/warum).
4. **Deutsch**: Antworte immer auf Deutsch, professionell aber verständlich.

VERFÜGBARE TABELLEN:
- controlling.bookings_prev: Vorjahresbuchungen
- controlling.bookings_curr: Aktuelle Buchungen

SPALTEN:
- posting_date, amount, account, account_name
- cost_center, profit_center, vendor, customer
- document_no, text
- Computed: year, month, quarter, is_expense, is_revenue

ANALYSE-VORGEHEN:
1. Verstehe die Frage
2. Erstelle einen Plan mit 3-6 Schritten
3. Führe Queries aus
4. Erkläre die Ergebnisse mit konkreten Zahlen
5. Gib Handlungsempfehlung

Formatiere Währungen als EUR mit Tausendertrennzeichen.`;

export class ControllingAgent {
  private anthropic: Anthropic;
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.anthropic = new Anthropic({ apiKey });
  }
  
  /**
   * Main entry point: Answer a question with evidence
   */
  async answer(question: string, context?: Record<string, unknown>): Promise<AgentResponse> {
    const toolCalls: ToolCall[] = [];
    const sources: Source[] = [];
    
    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: this.buildPrompt(question, context)
      }
    ];
    
    // Run agentic loop
    let response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });
    
    // Process tool calls iteratively
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      
      for (const toolUse of toolUseBlocks) {
        const result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        
        toolCalls.push({
          tool: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          output: result.output,
          executionTimeMs: result.executionTimeMs,
          error: result.error
        });
        
        // Add source reference
        if (!result.error) {
          sources.push({
            type: 'query',
            reference: `${toolUse.name}(${JSON.stringify(toolUse.input).substring(0, 50)}...)`,
            excerpt: JSON.stringify(result.output).substring(0, 200)
          });
        }
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.error 
            ? `Fehler: ${result.error}` 
            : JSON.stringify(result.output, null, 2)
        });
      }
      
      // Continue conversation with tool results
      messages.push({
        role: 'assistant',
        content: response.content
      });
      messages.push({
        role: 'user',
        content: toolResults
      });
      
      response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages
      });
    }
    
    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const answer = textBlocks.map(b => b.text).join('\n');
    
    // Calculate confidence based on sources
    const confidence = this.calculateConfidence(toolCalls, sources);
    
    return {
      answer,
      confidence,
      sources,
      toolCalls
    };
  }
  
  /**
   * Execute a single tool
   */
  private async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<{ output?: unknown; executionTimeMs: number; error?: string }> {
    const start = Date.now();
    
    try {
      let output: unknown;
      
      switch (toolName) {
        case 'sql_query':
          output = await db.executeSQL(input.sql as string);
          break;
          
        case 'variance_decompose':
          output = await db.decomposeVariance(
            'controlling.bookings_prev',
            'controlling.bookings_curr',
            input.account as number,
            (input.dimensions as string[]) || ['vendor', 'cost_center', 'text']
          );
          break;
          
        case 'get_top_bookings':
          const tableName = input.period === 'prev' 
            ? 'controlling.bookings_prev' 
            : 'controlling.bookings_curr';
          output = await db.getTopBookings(tableName, input.account as number, (input.limit as number) || 10);
          break;
          
        case 'get_account_knowledge':
          output = getAccountKnowledge(input.account as number);
          break;
          
        case 'profile_data':
          output = await db.profileTable(input.table as string);
          break;
          
        case 'time_series':
          output = await db.getTimeSeries(
            input.table as string,
            (input.metric as 'amount' | 'count') || 'amount',
            (input.group_by as 'month' | 'quarter') || 'month'
          );
          break;
          
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
      return {
        output,
        executionTimeMs: Date.now() - start
      };
    } catch (error) {
      return {
        executionTimeMs: Date.now() - start,
        error: (error as Error).message
      };
    }
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
    if (toolCalls.length === 0) return 0.3; // No evidence
    
    const successfulCalls = toolCalls.filter(t => !t.error).length;
    const totalCalls = toolCalls.length;
    
    // Base confidence on successful tool calls
    let confidence = (successfulCalls / totalCalls) * 0.7;
    
    // Bonus for having SQL queries
    if (toolCalls.some(t => t.tool === 'sql_query' && !t.error)) {
      confidence += 0.2;
    }
    
    // Bonus for variance decomposition
    if (toolCalls.some(t => t.tool === 'variance_decompose' && !t.error)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
}

/**
 * Generate an analysis plan (for transparency)
 */
export async function generatePlan(
  question: string,
  anthropic: Anthropic
): Promise<AnalysisPlan> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `Du bist ein Controller-Experte. Erstelle einen Analyseplan für die Frage.
Antworte NUR mit JSON im folgenden Format:
{
  "intent": "variance|drill_down|forecast|anomaly|general",
  "steps": [
    {"step": 1, "action": "Beschreibung", "tool": "tool_name", "rationale": "Warum"}
  ]
}`,
    messages: [{ role: 'user', content: question }]
  });
  
  const text = (response.content[0] as Anthropic.TextBlock).text;
  const json = JSON.parse(text);
  
  return {
    query: question,
    intent: json.intent,
    steps: json.steps.map((s: { step: number; action: string; tool: string; rationale: string }) => ({
      step: s.step,
      action: s.action,
      tool: s.tool,
      rationale: s.rationale
    })),
    estimatedCalls: json.steps.length
  };
}

// Utility
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}
