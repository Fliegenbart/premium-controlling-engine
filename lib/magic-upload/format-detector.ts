/**
 * Magic Upload: Automatic File Format Detection
 * Detects SAP, DATEV, and generic CSV formats
 */

export type FileFormat =
  | 'sap_fbl3n'      // SAP FBL3N (G/L Account Line Items)
  | 'sap_fagll03'    // SAP FAGLL03 (New G/L)
  | 'sap_s_alr'      // SAP S_ALR reports
  | 'datev_buchungen' // DATEV Buchungsstapel
  | 'datev_kost'     // DATEV mit Kostenstellen
  | 'lexware'        // Lexware Buchhaltung
  | 'generic_csv'    // Generic CSV with standard columns
  | 'unknown';

export interface FormatDetectionResult {
  format: FileFormat;
  confidence: number;  // 0-100
  detectedColumns: string[];
  mappedColumns: ColumnMapping;
  encoding: 'utf-8' | 'iso-8859-1' | 'windows-1252';
  delimiter: ',' | ';' | '\t';
  decimalSeparator: '.' | ',';
  dateFormat: string;
  sampleRows: string[][];
  warnings: string[];
}

export interface ColumnMapping {
  posting_date?: number;
  amount?: number;
  account?: number;
  account_name?: number;
  cost_center?: number;
  profit_center?: number;
  vendor?: number;
  customer?: number;
  document_no?: number;
  text?: number;
  // Additional SAP fields
  company_code?: number;
  fiscal_year?: number;
  debit_credit?: number;  // S/H indicator
  debit_amount?: number;
  credit_amount?: number;
}

// Known column patterns for each format
const FORMAT_PATTERNS: Record<FileFormat, { headers: RegExp[]; required: number }> = {
  sap_fbl3n: {
    headers: [
      /buchungsdatum|posting.?date|budat/i,
      /sachkonto|g.?l.?account|hkont/i,
      /betrag.*(hauswährung|hc)|amount.*lc|dmbtr|wrbtr/i,
      /belegn(ummer|r)|document.?(no|number)|belnr/i,
    ],
    required: 3,
  },
  sap_fagll03: {
    headers: [
      /buchungsdatum|posting.?date/i,
      /hauptbuch|general.?ledger|racct/i,
      /betrag.*transaktionswährung|tsl|hsl/i,
      /segment|profit.?center|prctr/i,
    ],
    required: 3,
  },
  sap_s_alr: {
    headers: [
      /konto|account/i,
      /bezeichnung|description/i,
      /soll|debit|haben|credit/i,
      /saldo|balance/i,
    ],
    required: 3,
  },
  datev_buchungen: {
    headers: [
      /umsatz|betrag/i,
      /soll.?haben|s.?h/i,
      /konto|gegenkonto/i,
      /belegdatum|datum/i,
      /buchungstext|text/i,
    ],
    required: 4,
  },
  datev_kost: {
    headers: [
      /kost1|kostenstelle/i,
      /kost2|kostenträger/i,
      /umsatz|betrag/i,
      /konto/i,
    ],
    required: 3,
  },
  lexware: {
    headers: [
      /buchungsnummer/i,
      /buchungsdatum/i,
      /sollkonto|habenkonto/i,
      /buchungstext/i,
    ],
    required: 3,
  },
  generic_csv: {
    headers: [
      /konto|account/i,
      /betrag|amount|summe/i,
    ],
    required: 2,
  },
  unknown: {
    headers: [],
    required: 0,
  },
};

// SAP column mappings
const SAP_COLUMN_ALIASES: Record<string, keyof ColumnMapping> = {
  // Date columns
  'buchungsdatum': 'posting_date',
  'posting date': 'posting_date',
  'budat': 'posting_date',
  'belegdatum': 'posting_date',
  'document date': 'posting_date',

  // Account columns
  'sachkonto': 'account',
  'g/l account': 'account',
  'gl account': 'account',
  'hkont': 'account',
  'racct': 'account',
  'konto': 'account',
  'kontonummer': 'account',

  // Account name
  'kontobezeichnung': 'account_name',
  'sachkontobezeichnung': 'account_name',
  'account description': 'account_name',
  'g/l account name': 'account_name',
  'bezeichnung': 'account_name',
  'txt20': 'account_name',

  // Amount columns
  'betrag in hauswährung': 'amount',
  'amount in local currency': 'amount',
  'dmbtr': 'amount',
  'wrbtr': 'amount',
  'hsl': 'amount',
  'tsl': 'amount',
  'betrag': 'amount',
  'umsatz': 'amount',
  'summe': 'amount',

  // Debit/Credit
  'sollbetrag': 'debit_amount',
  'soll': 'debit_amount',
  'debit': 'debit_amount',
  'habenbetrag': 'credit_amount',
  'haben': 'credit_amount',
  'credit': 'credit_amount',
  's/h': 'debit_credit',
  'soll/haben': 'debit_credit',
  'd/c': 'debit_credit',

  // Document
  'belegnummer': 'document_no',
  'belegn': 'document_no',
  'document number': 'document_no',
  'belnr': 'document_no',
  'beleg': 'document_no',

  // Text
  'buchungstext': 'text',
  'text': 'text',
  'sgtxt': 'text',
  'item text': 'text',
  'positionstext': 'text',
  'verwendungszweck': 'text',

  // Cost center
  'kostenstelle': 'cost_center',
  'cost center': 'cost_center',
  'kostl': 'cost_center',
  'rcntr': 'cost_center',
  'kost1': 'cost_center',

  // Profit center
  'profit center': 'profit_center',
  'profitcenter': 'profit_center',
  'prctr': 'profit_center',

  // Vendor/Customer
  'kreditor': 'vendor',
  'vendor': 'vendor',
  'lifnr': 'vendor',
  'debitor': 'customer',
  'customer': 'customer',
  'kunnr': 'customer',

  // Company
  'buchungskreis': 'company_code',
  'company code': 'company_code',
  'bukrs': 'company_code',

  // Fiscal year
  'geschäftsjahr': 'fiscal_year',
  'fiscal year': 'fiscal_year',
  'gjahr': 'fiscal_year',
};

/**
 * Detect file format from CSV content
 */
export function detectFormat(content: string): FormatDetectionResult {
  const warnings: string[] = [];

  // Detect delimiter
  const delimiter = detectDelimiter(content);

  // Detect encoding issues
  const encoding = detectEncoding(content);

  // Parse header row
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return {
      format: 'unknown',
      confidence: 0,
      detectedColumns: [],
      mappedColumns: {},
      encoding,
      delimiter,
      decimalSeparator: delimiter === ';' ? ',' : '.',
      dateFormat: 'DD.MM.YYYY',
      sampleRows: [],
      warnings: ['Datei enthält zu wenig Zeilen'],
    };
  }

  // Get headers
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());

  // Get sample rows
  const sampleRows = lines.slice(1, 6).map(line => parseCSVLine(line, delimiter));

  // Detect decimal separator from sample data
  const decimalSeparator = detectDecimalSeparator(sampleRows, headers);

  // Detect date format
  const dateFormat = detectDateFormat(sampleRows, headers);

  // Try to match format patterns
  let bestFormat: FileFormat = 'unknown';
  let bestConfidence = 0;

  for (const [format, pattern] of Object.entries(FORMAT_PATTERNS)) {
    if (format === 'unknown') continue;

    let matches = 0;
    for (const headerPattern of pattern.headers) {
      if (headers.some(h => headerPattern.test(h))) {
        matches++;
      }
    }

    const confidence = (matches / pattern.headers.length) * 100;
    if (matches >= pattern.required && confidence > bestConfidence) {
      bestFormat = format as FileFormat;
      bestConfidence = confidence;
    }
  }

  // If no specific format detected, try generic
  if (bestFormat === 'unknown') {
    const hasAccount = headers.some(h => /konto|account/i.test(h));
    const hasAmount = headers.some(h => /betrag|amount|summe|umsatz|soll|haben/i.test(h));

    if (hasAccount && hasAmount) {
      bestFormat = 'generic_csv';
      bestConfidence = 60;
    }
  }

  // Map columns
  const mappedColumns = mapColumns(headers);

  // Add warnings for missing important columns
  if (!mappedColumns.account) {
    warnings.push('Keine Kontospalte erkannt');
  }
  if (!mappedColumns.amount && !mappedColumns.debit_amount) {
    warnings.push('Keine Betragsspalte erkannt');
  }
  if (!mappedColumns.posting_date) {
    warnings.push('Keine Datumsspalte erkannt');
  }

  return {
    format: bestFormat,
    confidence: bestConfidence,
    detectedColumns: headers,
    mappedColumns,
    encoding,
    delimiter,
    decimalSeparator,
    dateFormat,
    sampleRows,
    warnings,
  };
}

/**
 * Detect delimiter used in CSV
 */
function detectDelimiter(content: string): ',' | ';' | '\t' {
  const firstLine = content.split(/\r?\n/)[0] || '';

  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (tabs > semicolons && tabs > commas) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/**
 * Detect encoding from content
 */
function detectEncoding(content: string): 'utf-8' | 'iso-8859-1' | 'windows-1252' {
  // Check for common encoding issues
  if (content.includes('Ã¼') || content.includes('Ã¶') || content.includes('Ã¤')) {
    return 'utf-8'; // Likely UTF-8 interpreted as ISO
  }
  if (content.includes('\ufffd')) {
    return 'iso-8859-1'; // Replacement characters indicate encoding issues
  }
  return 'utf-8';
}

/**
 * Detect decimal separator from data
 */
function detectDecimalSeparator(
  rows: string[][],
  headers: string[]
): '.' | ',' {
  // Find potential amount columns
  const amountIndices = headers
    .map((h, i) => (/betrag|amount|summe|umsatz|soll|haben|credit|debit/i.test(h) ? i : -1))
    .filter(i => i >= 0);

  for (const row of rows) {
    for (const idx of amountIndices) {
      const value = row[idx];
      if (!value) continue;

      // Check for German format: 1.234,56
      if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(value.trim())) {
        return ',';
      }
      // Check for US format: 1,234.56
      if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(value.trim())) {
        return '.';
      }
    }
  }

  return ','; // Default to German format
}

/**
 * Detect date format from data
 */
function detectDateFormat(rows: string[][], headers: string[]): string {
  const dateIndices = headers
    .map((h, i) => (/datum|date/i.test(h) ? i : -1))
    .filter(i => i >= 0);

  for (const row of rows) {
    for (const idx of dateIndices) {
      const value = row[idx];
      if (!value) continue;

      // DD.MM.YYYY
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(value.trim())) {
        return 'DD.MM.YYYY';
      }
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return 'YYYY-MM-DD';
      }
      // DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())) {
        return 'DD/MM/YYYY';
      }
      // YYYYMMDD (SAP)
      if (/^\d{8}$/.test(value.trim())) {
        return 'YYYYMMDD';
      }
    }
  }

  return 'DD.MM.YYYY'; // Default German format
}

/**
 * Map detected columns to our schema
 */
function mapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();

    // Check aliases
    for (const [alias, field] of Object.entries(SAP_COLUMN_ALIASES)) {
      if (normalized === alias || normalized.includes(alias)) {
        if (mapping[field] === undefined) {
          mapping[field] = index;
        }
        break;
      }
    }
  });

  return mapping;
}

/**
 * Parse a single CSV line respecting quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Get human-readable format name
 */
export function getFormatDisplayName(format: FileFormat): string {
  const names: Record<FileFormat, string> = {
    sap_fbl3n: 'SAP FBL3N (Sachkontenpositionen)',
    sap_fagll03: 'SAP FAGLL03 (Neues Hauptbuch)',
    sap_s_alr: 'SAP S_ALR Report',
    datev_buchungen: 'DATEV Buchungsstapel',
    datev_kost: 'DATEV mit Kostenstellen',
    lexware: 'Lexware Buchhaltung',
    generic_csv: 'Standard CSV',
    unknown: 'Unbekanntes Format',
  };
  return names[format];
}
