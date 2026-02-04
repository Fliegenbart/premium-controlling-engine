/**
 * Universal Data Parsers with Magic Upload
 *
 * Supports:
 * - SAP FBL3N/FAGLL03 exports
 * - DATEV Buchungsliste
 * - Lexware exports
 * - Generic CSV
 * - XLSX files
 *
 * Features:
 * - Automatic format detection with confidence scores
 * - German number/date format handling
 * - Delimiter auto-detection
 */

import Papa from 'papaparse';
import { Booking } from './types';

// File format types
export type FileFormat =
  | 'sap_fbl3n'
  | 'sap_fagll03'
  | 'datev_buchungen'
  | 'lexware'
  | 'generic_csv'
  | 'unknown';

// Format detection result with confidence
export interface FormatDetectionResult {
  format: FileFormat;
  confidence: number; // 0-1
  detectedColumns: string[];
  missingColumns: string[];
  formatLabel: string;
  formatDescription: string;
}

// Column mapping configurations
const COLUMN_MAPPINGS: Record<FileFormat, Record<string, string[]>> = {
  sap_fbl3n: {
    posting_date: ['Buchungsdatum', 'Posting Date', 'Buch.Datum'],
    amount: ['Betrag in Hauswährung', 'Amount in LC', 'Betrag'],
    account: ['Sachkonto', 'G/L Account', 'Konto'],
    account_name: ['Kontobezeichnung', 'G/L Account Name', 'Bezeichnung'],
    cost_center: ['Kostenstelle', 'Cost Center'],
    profit_center: ['Profit Center'],
    vendor: ['Lieferant', 'Vendor'],
    customer: ['Debitor', 'Customer'],
    document_no: ['Belegnummer', 'Document Number', 'Beleg'],
    text: ['Buchungstext', 'Text', 'Belegtext']
  },
  sap_fagll03: {
    posting_date: ['Buchungsdatum', 'Posting Date'],
    amount: ['Betrag in HW', 'Amount in LC', 'Betrag Hauswährung'],
    account: ['Sachkonto', 'G/L Account'],
    account_name: ['Sachkontobezeichnung', 'G/L Account Long Text'],
    cost_center: ['Kostenstelle', 'Cost Center'],
    profit_center: ['Profit-Center', 'Profit Center'],
    vendor: ['Kreditor', 'Vendor'],
    customer: ['Debitor', 'Customer'],
    document_no: ['Belegnummer', 'Document Number'],
    text: ['Positionstext', 'Item Text']
  },
  datev_buchungen: {
    posting_date: ['Belegdatum', 'Datum'],
    amount: ['Umsatz (ohne Soll/Haben-Kz)', 'Betrag'],
    account: ['Konto', 'Kontonummer'],
    account_name: ['Konto-Bezeichnung', 'Kontobezeichnung'],
    cost_center: ['Kost1', 'Kostenstelle 1'],
    profit_center: ['Kost2', 'Kostenstelle 2'],
    vendor: [''],
    customer: [''],
    document_no: ['Belegfeld 1', 'Belegnummer'],
    text: ['Buchungstext', 'Text']
  },
  lexware: {
    posting_date: ['Belegdatum', 'Datum', 'Buchungsdatum'],
    amount: ['Betrag', 'Soll', 'Haben', 'Umsatz'],
    account: ['Konto', 'Kontonummer', 'Sachkonto'],
    account_name: ['Kontobezeichnung', 'Konto-Bezeichnung'],
    cost_center: ['Kostenstelle', 'KST'],
    profit_center: ['Kostenträger'],
    vendor: ['Kreditor'],
    customer: ['Debitor'],
    document_no: ['Belegnummer', 'Beleg-Nr', 'Beleg'],
    text: ['Buchungstext', 'Text', 'Verwendungszweck']
  },
  generic_csv: {
    posting_date: ['posting_date', 'date', 'datum', 'buchungsdatum'],
    amount: ['amount', 'betrag', 'wert', 'summe'],
    account: ['account', 'konto', 'kontonummer', 'sachkonto'],
    account_name: ['account_name', 'kontoname', 'bezeichnung', 'kontobezeichnung'],
    cost_center: ['cost_center', 'kostenstelle', 'kst'],
    profit_center: ['profit_center', 'profitcenter', 'pc'],
    vendor: ['vendor', 'lieferant', 'kreditor'],
    customer: ['customer', 'kunde', 'debitor'],
    document_no: ['document_no', 'beleg', 'belegnummer', 'belegnr'],
    text: ['text', 'buchungstext', 'verwendungszweck']
  },
  unknown: {}
};

// Format metadata for UI
const FORMAT_METADATA: Record<FileFormat, { label: string; description: string }> = {
  sap_fbl3n: {
    label: 'SAP FBL3N',
    description: 'SAP Einzelpostenanzeige Sachkonten'
  },
  sap_fagll03: {
    label: 'SAP FAGLL03',
    description: 'SAP Hauptbuch Einzelpostenanzeige'
  },
  datev_buchungen: {
    label: 'DATEV',
    description: 'DATEV Buchungsstapel Export'
  },
  lexware: {
    label: 'Lexware',
    description: 'Lexware Buchhaltung Export'
  },
  generic_csv: {
    label: 'CSV',
    description: 'Standard CSV mit erkannten Spalten'
  },
  unknown: {
    label: 'Unbekannt',
    description: 'Format nicht erkannt'
  }
};

/**
 * Detect file format from content with confidence scoring
 */
export function detectFormat(content: string, fileName: string): FormatDetectionResult {
  const firstLines = content.split('\n').slice(0, 5).join('\n').toLowerCase();
  const headers = content.split('\n')[0].toLowerCase();

  // SAP FBL3N indicators
  const fbl3nIndicators = ['betrag in hauswährung', 'g/l account', 'amount in lc'];
  const fbl3nMatches = fbl3nIndicators.filter(i => firstLines.includes(i)).length;
  if (fbl3nMatches > 0) {
    return buildResult('sap_fbl3n', 0.85 + (fbl3nMatches * 0.05), headers);
  }

  // SAP FAGLL03 indicators
  const fagll03Indicators = ['sachkontobezeichnung', 'g/l account long text', 'betrag in hw'];
  const fagll03Matches = fagll03Indicators.filter(i => firstLines.includes(i)).length;
  if (fagll03Matches > 0) {
    return buildResult('sap_fagll03', 0.85 + (fagll03Matches * 0.05), headers);
  }

  // DATEV indicators
  const datevIndicators = ['umsatz (ohne soll/haben-kz)', 'kost1', 'belegfeld 1', 'soll/haben'];
  const datevMatches = datevIndicators.filter(i => firstLines.includes(i)).length;
  if (datevMatches >= 2) {
    return buildResult('datev_buchungen', 0.80 + (datevMatches * 0.05), headers);
  }

  // Lexware indicators
  const lexwareIndicators = ['lexware', 'kostenträger', 'beleg-nr'];
  const lexwareMatches = lexwareIndicators.filter(i => firstLines.includes(i)).length;
  if (lexwareMatches > 0 || fileName.toLowerCase().includes('lexware')) {
    return buildResult('lexware', 0.75 + (lexwareMatches * 0.08), headers);
  }

  // Generic CSV fallback - check for common column names
  const genericIndicators = ['konto', 'betrag', 'datum', 'account', 'amount', 'date'];
  const genericMatches = genericIndicators.filter(i => headers.includes(i)).length;
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    return buildResult('generic_csv', 0.5 + (genericMatches * 0.08), headers);
  }

  return buildResult('unknown', 0.1, headers);
}

function buildResult(format: FileFormat, confidence: number, headers: string): FormatDetectionResult {
  const mapping = COLUMN_MAPPINGS[format] || {};
  const headerList = headers.split(/[;,\t]/).map(h => h.trim().toLowerCase());

  const detectedColumns: string[] = [];
  const missingColumns: string[] = [];

  for (const [field, alternatives] of Object.entries(mapping)) {
    const found = alternatives.some(alt =>
      headerList.some(h => h.includes(alt.toLowerCase()))
    );
    if (found) {
      detectedColumns.push(field);
    } else if (['account', 'amount', 'posting_date'].includes(field)) {
      missingColumns.push(field);
    }
  }

  // Adjust confidence based on column matches
  const columnBonus = detectedColumns.length * 0.02;
  const columnPenalty = missingColumns.length * 0.1;

  return {
    format,
    confidence: Math.min(1, Math.max(0, confidence + columnBonus - columnPenalty)),
    detectedColumns,
    missingColumns,
    formatLabel: FORMAT_METADATA[format].label,
    formatDescription: FORMAT_METADATA[format].description
  };
}

/**
 * Simple format detection (backward compatible)
 */
export function detectFormatSimple(content: string, fileName: string): FileFormat {
  return detectFormat(content, fileName).format;
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string, format: FileFormat = 'generic_csv'): Booking[] {
  // Detect delimiter
  const firstLine = content.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : 
                    firstLine.includes(';') ? ';' : ',';
  
  const parsed = Papa.parse(content, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  
  if (parsed.errors.length > 0) {
    console.warn('CSV parse warnings:', parsed.errors.slice(0, 5));
  }
  
  const mapping = COLUMN_MAPPINGS[format] || COLUMN_MAPPINGS.generic_csv;
  const headers = parsed.meta.fields || [];
  
  // Build column index
  const columnIndex: Record<string, string> = {};
  for (const [field, alternatives] of Object.entries(mapping)) {
    for (const alt of alternatives) {
      const found = headers.find(h => 
        h.toLowerCase() === alt.toLowerCase() ||
        h.toLowerCase().includes(alt.toLowerCase())
      );
      if (found) {
        columnIndex[field] = found;
        break;
      }
    }
  }
  
  // Parse rows
  const bookings: Booking[] = [];
  
  for (const row of parsed.data as Record<string, string>[]) {
    try {
      const booking = parseRow(row, columnIndex, format);
      if (booking) {
        bookings.push(booking);
      }
    } catch (e) {
      // Skip invalid rows
      console.warn('Skipping invalid row:', e);
    }
  }
  
  return bookings;
}

/**
 * Parse a single row into a Booking
 */
function parseRow(
  row: Record<string, string>,
  columnIndex: Record<string, string>,
  format: FileFormat
): Booking | null {
  const getValue = (field: string): string => {
    const col = columnIndex[field];
    return col ? (row[col] || '').trim() : '';
  };
  
  // Parse amount
  let amount = parseGermanNumber(getValue('amount'));
  
  // DATEV special: Check Soll/Haben indicator
  if (format === 'datev_buchungen') {
    const shKz = row['Soll/Haben-Kennzeichen'] || row['S/H'] || '';
    if (shKz.toLowerCase() === 's' || shKz.toLowerCase() === 'soll') {
      amount = -Math.abs(amount); // Soll = negative (expense)
    }
  }
  
  // Parse account number
  const accountStr = getValue('account');
  const account = parseInt(accountStr.replace(/\D/g, ''));
  
  if (isNaN(account) || isNaN(amount)) {
    return null;
  }
  
  // Parse date
  const dateStr = getValue('posting_date');
  const posting_date = parseGermanDate(dateStr);
  
  if (!posting_date) {
    return null;
  }
  
  return {
    posting_date,
    amount,
    account,
    account_name: getValue('account_name') || `Konto ${account}`,
    cost_center: getValue('cost_center') || undefined,
    profit_center: getValue('profit_center') || undefined,
    vendor: getValue('vendor') || undefined,
    customer: getValue('customer') || undefined,
    document_no: getValue('document_no') || `DOC-${Date.now()}`,
    text: getValue('text') || ''
  };
}

/**
 * Parse German number format (1.234,56 -> 1234.56)
 */
function parseGermanNumber(str: string): number {
  if (!str) return 0;
  
  // Remove thousand separators and convert decimal comma
  const cleaned = str
    .replace(/[^\d,.\-]/g, '')  // Keep only digits, comma, period, minus
    .replace(/\.(?=.*,)/g, '')   // Remove thousand separators (periods before comma)
    .replace(',', '.');          // Convert decimal comma to period
  
  return parseFloat(cleaned) || 0;
}

/**
 * Parse German date formats
 */
function parseGermanDate(str: string): string | null {
  if (!str) return null;
  
  // Try DD.MM.YYYY
  const german = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (german) {
    const [, day, month, year] = german;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD (ISO)
  const iso = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return str.substring(0, 10);
  }
  
  // Try MM/DD/YYYY (US)
  const us = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const [, month, day, year] = us;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Parse XLSX file
 */
export async function parseXLSX(buffer: Buffer): Promise<Booking[]> {
  // Dynamic import for ExcelJS (large package)
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Keine Arbeitsblätter in der XLSX-Datei gefunden');
  }
  
  // Get headers from first row
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });
  
  // Detect format from headers
  const headerLine = headers.join(';').toLowerCase();
  let format: FileFormat = 'generic_csv';
  
  if (headerLine.includes('betrag in hauswährung')) {
    format = 'sap_fbl3n';
  } else if (headerLine.includes('umsatz (ohne soll/haben-kz)')) {
    format = 'datev_buchungen';
  }
  
  const mapping = COLUMN_MAPPINGS[format];
  
  // Build column index
  const columnIndex: Record<string, string> = {};
  for (const [field, alternatives] of Object.entries(mapping)) {
    for (const alt of alternatives) {
      const found = headers.find(h => 
        h.toLowerCase() === alt.toLowerCase() ||
        h.toLowerCase().includes(alt.toLowerCase())
      );
      if (found) {
        columnIndex[field] = found;
        break;
      }
    }
  }
  
  // Parse rows
  const bookings: Booking[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = String(cell.value || '');
      }
    });
    
    try {
      const booking = parseRow(rowData, columnIndex, format);
      if (booking) {
        bookings.push(booking);
      }
    } catch (e) {
      // Skip invalid rows
    }
  });
  
  return bookings;
}
