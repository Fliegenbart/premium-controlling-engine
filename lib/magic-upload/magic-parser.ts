/**
 * Magic Parser: Universal CSV to Booking converter
 * Uses format detection to intelligently parse any accounting CSV
 */

import { Booking } from '@/lib/types';
import {
  detectFormat,
  FormatDetectionResult,
  ColumnMapping,
  getFormatDisplayName,
} from './format-detector';

export interface ParseResult {
  success: boolean;
  bookings: Booking[];
  detection: FormatDetectionResult;
  stats: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    totalAmount: number;
  };
  errors: string[];
}

/**
 * Parse any accounting CSV file into Bookings
 */
export function magicParse(content: string): ParseResult {
  const detection = detectFormat(content);
  const errors: string[] = [...detection.warnings];

  if (detection.format === 'unknown' && detection.confidence < 30) {
    return {
      success: false,
      bookings: [],
      detection,
      stats: { totalRows: 0, parsedRows: 0, skippedRows: 0, totalAmount: 0 },
      errors: ['Dateiformat konnte nicht erkannt werden. Bitte prüfen Sie das Format.'],
    };
  }

  // Parse lines
  const lines = content.trim().split(/\r?\n/);
  const dataLines = lines.slice(1); // Skip header

  const bookings: Booking[] = [];
  let skippedRows = 0;
  let totalAmount = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) {
      skippedRows++;
      continue;
    }

    try {
      const booking = parseLine(line, detection);
      if (booking && booking.account > 0) {
        bookings.push(booking);
        totalAmount += booking.amount;
      } else {
        skippedRows++;
      }
    } catch (error) {
      skippedRows++;
      if (errors.length < 5) {
        errors.push(`Zeile ${i + 2}: ${(error as Error).message}`);
      }
    }
  }

  return {
    success: bookings.length > 0,
    bookings,
    detection,
    stats: {
      totalRows: dataLines.length,
      parsedRows: bookings.length,
      skippedRows,
      totalAmount,
    },
    errors,
  };
}

/**
 * Parse a single CSV line into a Booking
 */
function parseLine(line: string, detection: FormatDetectionResult): Booking | null {
  const values = parseCSVLine(line, detection.delimiter);
  const mapping = detection.mappedColumns;

  // Get account number
  let account = 0;
  if (mapping.account !== undefined) {
    account = parseInt(String(values[mapping.account]).replace(/\D/g, ''));
  }

  if (!account || isNaN(account)) {
    return null;
  }

  // Get amount
  let amount = 0;
  if (mapping.amount !== undefined) {
    amount = parseAmount(values[mapping.amount], detection.decimalSeparator);
  } else if (mapping.debit_amount !== undefined || mapping.credit_amount !== undefined) {
    // Handle separate debit/credit columns
    const debit = mapping.debit_amount !== undefined
      ? parseAmount(values[mapping.debit_amount], detection.decimalSeparator)
      : 0;
    const credit = mapping.credit_amount !== undefined
      ? parseAmount(values[mapping.credit_amount], detection.decimalSeparator)
      : 0;

    // Check for S/H indicator
    if (mapping.debit_credit !== undefined) {
      const indicator = String(values[mapping.debit_credit]).toUpperCase().trim();
      if (indicator === 'S' || indicator === 'D') {
        amount = Math.abs(debit || credit);
      } else {
        amount = -Math.abs(debit || credit);
      }
    } else {
      amount = debit - credit;
    }
  }

  // Handle DATEV style where S/H indicator determines sign
  if (detection.format === 'datev_buchungen' || detection.format === 'datev_kost') {
    if (mapping.debit_credit !== undefined) {
      const indicator = String(values[mapping.debit_credit]).toUpperCase().trim();
      // In DATEV: S = Soll (Debit/positive for expenses), H = Haben (Credit/negative for expenses)
      if (indicator === 'H') {
        amount = -Math.abs(amount);
      } else {
        amount = Math.abs(amount);
      }
    }
  }

  // Get account name
  let accountName = `Konto ${account}`;
  if (mapping.account_name !== undefined && values[mapping.account_name]) {
    accountName = String(values[mapping.account_name]).trim();
  }

  // Get posting date
  let postingDate = new Date().toISOString().split('T')[0];
  if (mapping.posting_date !== undefined && values[mapping.posting_date]) {
    postingDate = parseDate(values[mapping.posting_date], detection.dateFormat);
  }

  // Get document number
  let documentNo = '';
  if (mapping.document_no !== undefined && values[mapping.document_no]) {
    documentNo = String(values[mapping.document_no]).trim();
  } else {
    // Generate a placeholder
    documentNo = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  // Get text/description
  let text = '';
  if (mapping.text !== undefined && values[mapping.text]) {
    text = String(values[mapping.text]).trim();
  }

  // Get cost center
  let costCenter = '';
  if (mapping.cost_center !== undefined && values[mapping.cost_center]) {
    costCenter = String(values[mapping.cost_center]).trim();
  }

  // Get profit center
  let profitCenter = '';
  if (mapping.profit_center !== undefined && values[mapping.profit_center]) {
    profitCenter = String(values[mapping.profit_center]).trim();
  }

  // Get vendor
  let vendor: string | null = null;
  if (mapping.vendor !== undefined && values[mapping.vendor]) {
    const v = String(values[mapping.vendor]).trim();
    if (v && v !== '0') vendor = v;
  }

  // Get customer
  let customer: string | null = null;
  if (mapping.customer !== undefined && values[mapping.customer]) {
    const c = String(values[mapping.customer]).trim();
    if (c && c !== '0') customer = c;
  }

  return {
    posting_date: postingDate,
    amount,
    account,
    account_name: accountName,
    cost_center: costCenter,
    profit_center: profitCenter,
    vendor,
    customer,
    document_no: documentNo,
    text,
  };
}

/**
 * Parse amount string to number
 */
function parseAmount(value: string | undefined, decimalSeparator: '.' | ','): number {
  if (!value) return 0;

  let str = String(value).trim();

  // Remove currency symbols and spaces
  str = str.replace(/[€$£\s]/g, '');

  // Handle negative indicators
  const isNegative = str.includes('-') || str.includes('(') || str.endsWith('-');
  str = str.replace(/[-()]/g, '');

  if (decimalSeparator === ',') {
    // German format: 1.234,56 -> 1234.56
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> 1234.56
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  return isNegative ? -num : num;
}

/**
 * Parse date string to ISO format
 */
function parseDate(value: string | undefined, format: string): string {
  if (!value) return new Date().toISOString().split('T')[0];

  const str = String(value).trim();

  try {
    let day: string, month: string, year: string;

    switch (format) {
      case 'DD.MM.YYYY':
        [day, month, year] = str.split('.');
        break;
      case 'DD/MM/YYYY':
        [day, month, year] = str.split('/');
        break;
      case 'YYYY-MM-DD':
        [year, month, day] = str.split('-');
        break;
      case 'YYYYMMDD':
        year = str.substring(0, 4);
        month = str.substring(4, 6);
        day = str.substring(6, 8);
        break;
      default:
        return str;
    }

    // Validate and format
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);

    if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch {
    // Fall through to default
  }

  return new Date().toISOString().split('T')[0];
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
 * Get summary of what was detected and parsed
 */
export function getParseResultSummary(result: ParseResult): string {
  const { detection, stats } = result;

  const lines = [
    `📁 Format: ${getFormatDisplayName(detection.format)}`,
    `📊 Konfidenz: ${detection.confidence.toFixed(0)}%`,
    `📝 ${stats.parsedRows} von ${stats.totalRows} Zeilen geparst`,
  ];

  if (stats.skippedRows > 0) {
    lines.push(`⚠️ ${stats.skippedRows} Zeilen übersprungen`);
  }

  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(stats.totalAmount);

  lines.push(`💰 Gesamtbetrag: ${formattedAmount}`);

  return lines.join('\n');
}
