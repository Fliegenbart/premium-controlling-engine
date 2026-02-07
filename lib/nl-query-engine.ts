/**
 * Natural Language to SQL Query Engine
 *
 * Allows controllers to ask questions in German and automatically
 * translates them to DuckDB SQL queries using an LLM.
 */

import { getHybridLLMService } from './llm/hybrid-service';
import { executeSQL } from './duckdb-engine';
import { INJECTION_GUARD, sanitizeForPrompt, wrapUntrusted } from './prompt-utils';

export interface NLQueryResult {
  originalQuestion: string;
  generatedSQL: string;
  explanation: string;
  results: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  confidence: number;
}

/**
 * Example German questions with their SQL translations for few-shot prompting
 */
const EXAMPLE_QUESTIONS = [
  {
    question: 'Zeig mir alle Kostenstellen mit mehr als 10% Abweichung',
    sql: `
SELECT
  cost_center,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM controlling.bookings
WHERE cost_center IS NOT NULL
GROUP BY cost_center
ORDER BY ABS(AVG(amount)) DESC
LIMIT 50
    `.trim(),
    explanation: 'Aggregiert Buchungen nach Kostenstelle und zeigt Durchschnittswerte'
  },
  {
    question: 'Welche Lieferanten haben die höchsten Kosten?',
    sql: `
SELECT
  vendor,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_costs,
  AVG(amount) as avg_amount
FROM controlling.bookings
WHERE vendor IS NOT NULL AND amount < 0
GROUP BY vendor
ORDER BY SUM(ABS(amount)) DESC
LIMIT 20
    `.trim(),
    explanation: 'Listet Lieferanten nach Gesamtkosten (negative Buchungen) auf'
  },
  {
    question: 'Wie haben sich die Personalkosten im Q3 entwickelt?',
    sql: `
SELECT
  DATE_TRUNC('month', posting_date) as month,
  SUM(amount) as monthly_amount,
  COUNT(*) as transaction_count
FROM controlling.bookings
WHERE posting_date >= DATE '2024-07-01'
  AND posting_date <= DATE '2024-09-30'
  AND account_name ILIKE '%personal%'
GROUP BY DATE_TRUNC('month', posting_date)
ORDER BY month
    `.trim(),
    explanation: 'Zeigt monatliche Personalkosten für Q3 (Juli-September)'
  },
  {
    question: 'Vergleiche die Materialkosten nach Kostenstelle',
    sql: `
SELECT
  cost_center,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as material_costs,
  COUNT(*) as transactions,
  COUNT(DISTINCT vendor) as unique_vendors
FROM controlling.bookings
WHERE cost_center IS NOT NULL
  AND amount < 0
  AND (text ILIKE '%material%' OR account_name ILIKE '%material%')
GROUP BY cost_center
ORDER BY material_costs DESC
    `.trim(),
    explanation: 'Zeigt Materialkosten aggregiert nach Kostenstelle'
  }
];

/**
 * Build a system prompt for natural language to SQL translation
 */
function buildSystemPrompt(availableTables: string[]): string {
  const tableSchemas = buildTableSchemas(availableTables);

  // Keep this prompt compact; large prompts slow down local inference significantly.
  return `Du bist ein DuckDB SQL-Experte. Übersetze deutsche Controlling-Fragen in valides DuckDB SQL.

TABELLEN:
${tableSchemas}

controlling.bookings Spalten:
id, posting_date, amount, account, account_name, cost_center, profit_center, vendor, customer, document_no, text

REGELN:
1) Gib NUR das SQL zurück (kein Markdown, keine Erklärungen).
2) Das SQL MUSS mit SELECT beginnen (kein WITH).
3) Verwende immer vollqualifizierte Tabellennamen (schema.table).
4) Negative amount = Ausgaben/Kosten, positive amount = Einnahmen.
5) Nutze ILIKE für Textsuche.
6) Nutze DATE_TRUNC('month'|'quarter'|'year') für zeitliche Aggregation.
7) Keine destruktiven Operationen: DROP, DELETE, INSERT, UPDATE, CREATE, ALTER, TRUNCATE, ...

SICHERHEIT:
${INJECTION_GUARD}`;
}

/**
 * Build table schemas based on available tables
 */
function buildTableSchemas(availableTables: string[]): string {
  const schemas: Record<string, string> = {
    'controlling.bookings': 'Haupttabelle mit Buchungsdaten (id, posting_date, amount, account, account_name, cost_center, profit_center, vendor, customer, document_no, text)',
  };

  return availableTables
    .map(table => `- ${table}: ${schemas[table] || 'Benutzerdefinierte Tabelle'}`)
    .join('\n');
}

/**
 * Extract SQL from LLM response (removes markdown, explanations, etc.)
 */
function extractSQL(text: string): string {
  // Remove markdown code blocks
  let sql = text.replace(/```sql\n?|\n?```/g, '');

  // Remove other markdown code block markers
  sql = sql.replace(/```\n?|\n?```/g, '');

  // Find the first SELECT statement
  const selectMatch = sql.match(/SELECT\s+[\s\S]*?(?=;|$)/i);
  if (selectMatch) {
    sql = selectMatch[0];
  }

  // Remove any remaining markdown or explanations after the SQL
  const lines = sql.split('\n');
  const sqlLines: string[] = [];

  for (const line of lines) {
    // Stop if we hit a non-SQL line (starts with - or * or #)
    if (line.trim().match(/^[-*#]/)) break;
    sqlLines.push(line);
  }

  return sqlLines.join('\n').trim();
}

/**
 * Validate SQL to prevent destructive operations
 */
function validateSQL(sql: string): { valid: boolean; reason?: string } {
  const upperSQL = sql.trim().toUpperCase();

  // Check for destructive keywords
  const destructivePatterns = [
    /\bDROP\b/,
    /\bDELETE\b/,
    /\bTRUNCATE\b/,
    /\bINSERT\b/,
    /\bUPDATE\b/,
    /\bCREATE\b/,
    /\bALTER\b/,
    /\bREPLACE\b/,
    /\bGRANT\b/,
    /\bREVOKE\b/,
  ];

  for (const pattern of destructivePatterns) {
    if (pattern.test(upperSQL)) {
      return {
        valid: false,
        reason: `SQL enthält nicht erlaubte Operation: ${pattern.source}`
      };
    }
  }

  // Check that it's a SELECT statement
  if (!upperSQL.startsWith('SELECT')) {
    return {
      valid: false,
      reason: 'SQL muss ein SELECT-Statement sein'
    };
  }

  // Basic syntax check - balanced parentheses
  let parenCount = 0;
  for (const char of sql) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      return {
        valid: false,
        reason: 'SQL hat unausgeglichene Klammern'
      };
    }
  }
  if (parenCount !== 0) {
    return {
      valid: false,
      reason: 'SQL hat unausgeglichene Klammern'
    };
  }

  return { valid: true };
}

/**
 * Calculate confidence score based on various factors
 */
function calculateConfidence(
  generatedSQL: string,
  results: Record<string, unknown>[]
): number {
  let confidence = 0.7; // Base confidence

  // Has results = higher confidence
  if (results.length > 0) {
    confidence += 0.15;
  }

  // Simple queries are more reliable
  const wordCount = generatedSQL.split(/\s+/).length;
  if (wordCount < 30) {
    confidence += 0.1;
  }

  // Queries with JOINs are slightly less reliable
  if (/\bJOIN\b/i.test(generatedSQL)) {
    confidence -= 0.05;
  }

  // Cap at 0.95 (never 100% confidence)
  return Math.min(0.95, Math.max(0.3, confidence));
}

/**
 * Execute a natural language query
 */
export async function executeNaturalLanguageQuery(
  question: string,
  availableTables: string[] = ['controlling.bookings'],
  options?: { maxRows?: number; explain?: boolean }
): Promise<NLQueryResult> {
  const startTime = Date.now();
  const maxRows = options?.maxRows || 1000;

  // Validate input
  if (question.length > 1000) {
    throw new Error('Frage ist zu lang (max. 1000 Zeichen)');
  }
  const sanitizedQuestion = sanitizeForPrompt(question, 500);
  if (!sanitizedQuestion) {
    throw new Error('Frage ist leer oder ungültig');
  }

  try {
    // Initialize LLM service
    const llm = getHybridLLMService();
    const status = await llm.getStatus();
    if (status.activeProvider === 'none') {
      throw new Error('LLM-Service (Ollama) ist nicht verfügbar. Bitte Ollama starten.');
    }

    // Generate SQL using LLM
    const systemPrompt = buildSystemPrompt(availableTables);
    const userPrompt = `Frage: "${sanitizedQuestion}"

Übersetze diese Frage in valides DuckDB SQL.
Antworte NUR mit dem SQL-Code, keine weiteren Erklärungen.
Nutze die verfügbaren Tabellen und Spalten.`;

	    const response = await llm.generate(userPrompt, {
	      systemPrompt,
	      temperature: 0.0, // Deterministic SQL generation
	      maxTokens: 250,
	    });

    let generatedSQL = extractSQL(response.text);

    // Validate SQL
    const validation = validateSQL(generatedSQL);
    if (!validation.valid) {
      throw new Error(`SQL-Validierung fehlgeschlagen: ${validation.reason}`);
    }

    // Add LIMIT to prevent resource exhaustion
    if (!/\bLIMIT\b/i.test(generatedSQL)) {
      generatedSQL += ` LIMIT ${maxRows}`;
    } else {
      // Ensure LIMIT doesn't exceed max
      generatedSQL = generatedSQL.replace(
        /LIMIT\s+(\d+)/i,
        (match, num) => {
          const limit = parseInt(num);
          return `LIMIT ${Math.min(limit, maxRows)}`;
        }
      );
    }

    // Execute SQL
    const result = await executeSQL(generatedSQL);
    const executionTimeMs = Date.now() - startTime;

    // Calculate confidence
    const confidence = calculateConfidence(generatedSQL, result.rows);

    // Generate explanation
    const explanation = generateExplanation(sanitizedQuestion, generatedSQL, result.rowCount);

    return {
      originalQuestion: sanitizedQuestion,
      generatedSQL,
      explanation,
      results: result.rows,
      columns: result.columns,
      rowCount: result.rowCount,
      executionTimeMs,
      confidence,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    throw new Error(
      `NL-Query-Fehler: ${(error as Error).message || String(error)}`
    );
  }
}

/**
 * Generate a human-readable explanation of what was queried
 */
function generateExplanation(question: string, sql: string, rowCount: number): string {
  const parts: string[] = [];

  // Analyze the SQL to build explanation
  if (/GROUP BY/i.test(sql)) {
    parts.push('Ergebnis ist aggregiert/gruppiert');
  }

  if (/UNION/i.test(sql)) {
    parts.push('Mehrere Datenquellen kombiniert');
  }

  if (/WHERE/i.test(sql)) {
    parts.push('Mit Filtern angewandt');
  }

  if (/ORDER BY/i.test(sql)) {
    parts.push('Sortiert');
  }

  if (/DATE_TRUNC|EXTRACT|DATE/i.test(sql)) {
    parts.push('Zeitliche Analyse');
  }

  if (/SUM|AVG|COUNT|MIN|MAX/i.test(sql)) {
    parts.push('Mit Aggregation');
  }

  const resultText = rowCount === 0
    ? 'Keine Ergebnisse gefunden'
    : `${rowCount} Zeilen gefunden`;

  return `${resultText}. ${parts.join(', ')}.`;
}
