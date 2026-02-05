/**
 * Excel Export Module
 * Generates XLSX reports from analysis results
 */

import ExcelJS from 'exceljs';
import { AnalysisResult, TripleAnalysisResult, AccountDeviation, TripleAccountDeviation } from './types';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1A5F2A' } // Dark green
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11
};

const CURRENCY_FORMAT = '#,##0.00 €;[Red]-#,##0.00 €';
const PERCENT_FORMAT = '0.0%;[Red]-0.0%';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Export variance analysis to Excel
 */
export async function exportVarianceAnalysis(result: AnalysisResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Premium Controlling Engine';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Zusammenfassung', {
    properties: { tabColor: { argb: 'FF1A5F2A' } }
  });

  summarySheet.columns = [
    { header: 'Kennzahl', key: 'metric', width: 30 },
    { header: 'Vorjahr', key: 'prev', width: 20 },
    { header: 'Aktuell', key: 'curr', width: 20 },
    { header: 'Abweichung', key: 'delta', width: 20 },
    { header: 'Delta %', key: 'delta_pct', width: 15 }
  ];

  // Style headers
  summarySheet.getRow(1).eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  // Add summary data
  const summaryData = [
    {
      metric: 'Gesamtsumme',
      prev: result.meta.total_prev,
      curr: result.meta.total_curr,
      delta: result.summary.total_delta,
      delta_pct: result.meta.total_prev !== 0
        ? (result.summary.total_delta / Math.abs(result.meta.total_prev))
        : 0
    },
    {
      metric: 'Anzahl Buchungen',
      prev: result.meta.bookings_prev,
      curr: result.meta.bookings_curr,
      delta: result.meta.bookings_curr - result.meta.bookings_prev,
      delta_pct: result.meta.bookings_prev !== 0
        ? ((result.meta.bookings_curr - result.meta.bookings_prev) / result.meta.bookings_prev)
        : 0
    },
    {
      metric: 'Anzahl Konten',
      prev: result.by_account.length,
      curr: result.by_account.length,
      delta: 0,
      delta_pct: 0
    }
  ];

  summaryData.forEach((row, idx) => {
    const excelRow = summarySheet.addRow(row);
    if (idx === 0) {
      excelRow.font = { bold: true };
    }
    excelRow.getCell('prev').numFmt = CURRENCY_FORMAT;
    excelRow.getCell('curr').numFmt = CURRENCY_FORMAT;
    excelRow.getCell('delta').numFmt = CURRENCY_FORMAT;
    excelRow.getCell('delta_pct').numFmt = PERCENT_FORMAT;
  });

  // Detail Sheet
  const detailSheet = workbook.addWorksheet('Kontenabweichungen', {
    properties: { tabColor: { argb: 'FF0066CC' } }
  });

  detailSheet.columns = [
    { header: 'Konto', key: 'account', width: 10 },
    { header: 'Kontoname', key: 'account_name', width: 35 },
    { header: 'Vorjahr', key: 'amount_prev', width: 18 },
    { header: 'Aktuell', key: 'amount_curr', width: 18 },
    { header: 'Δ Absolut', key: 'delta_abs', width: 18 },
    { header: 'Δ %', key: 'delta_pct', width: 12 },
    { header: 'Buchungen VJ', key: 'bookings_prev', width: 14 },
    { header: 'Buchungen Akt', key: 'bookings_curr', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Kommentar', key: 'comment', width: 40 }
  ];

  detailSheet.getRow(1).eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  result.by_account.forEach(acc => {
    const row = detailSheet.addRow({
      account: acc.account,
      account_name: acc.account_name,
      amount_prev: acc.amount_prev,
      amount_curr: acc.amount_curr,
      delta_abs: acc.delta_abs,
      delta_pct: acc.delta_pct / 100,
      bookings_prev: acc.bookings_count_prev,
      bookings_curr: acc.bookings_count_curr,
      status: getStatus(acc),
      comment: acc.comment || ''
    });

    row.getCell('amount_prev').numFmt = CURRENCY_FORMAT;
    row.getCell('amount_curr').numFmt = CURRENCY_FORMAT;
    row.getCell('delta_abs').numFmt = CURRENCY_FORMAT;
    row.getCell('delta_pct').numFmt = PERCENT_FORMAT;

    // Color code delta
    const deltaCell = row.getCell('delta_abs');
    if (acc.delta_abs > 0) {
      deltaCell.font = { color: { argb: 'FFCC0000' } };
    } else if (acc.delta_abs < 0) {
      deltaCell.font = { color: { argb: 'FF006600' } };
    }

    // Color code status
    const statusCell = row.getCell('status');
    if (acc.anomalySeverity === 'critical') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6666' } };
    } else if (acc.anomalySeverity === 'warning') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
    }
  });

  // Auto-filter
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: result.by_account.length + 1, column: 10 }
  };

  // Freeze header
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Meta Sheet
  const metaSheet = workbook.addWorksheet('Meta');
  metaSheet.addRow(['Erstellt am', result.meta.analyzed_at]);
  metaSheet.addRow(['Periode Vorjahr', result.meta.period_prev]);
  metaSheet.addRow(['Periode Aktuell', result.meta.period_curr]);
  metaSheet.addRow(['Engine Version', result.meta.engine_version]);
  metaSheet.addRow(['']);
  metaSheet.addRow(['Exportiert von', 'Premium Controlling Engine']);
  metaSheet.addRow(['Export Zeitpunkt', new Date().toISOString()]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Export triple analysis (Plan/Ist/VJ) to Excel
 */
export async function exportTripleAnalysis(result: TripleAnalysisResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Premium Controlling Engine';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Zusammenfassung');
  summarySheet.columns = [
    { header: 'Kennzahl', key: 'metric', width: 25 },
    { header: 'Vorjahr', key: 'vj', width: 18 },
    { header: 'Plan', key: 'plan', width: 18 },
    { header: 'Ist', key: 'ist', width: 18 },
    { header: 'Δ Plan', key: 'delta_plan', width: 18 },
    { header: 'Δ VJ', key: 'delta_vj', width: 18 }
  ];

  summarySheet.getRow(1).eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  summarySheet.addRow({
    metric: 'Gesamtsumme',
    vj: result.meta.total_vj,
    plan: result.meta.total_plan,
    ist: result.meta.total_ist,
    delta_plan: result.summary.total_delta_plan,
    delta_vj: result.summary.total_delta_vj
  });

  summarySheet.addRow({
    metric: 'Planerfüllung',
    vj: '',
    plan: '',
    ist: result.summary.plan_achievement_pct / 100,
    delta_plan: '',
    delta_vj: ''
  });

  summarySheet.addRow({ metric: '', vj: '', plan: '', ist: '', delta_plan: '', delta_vj: '' });
  summarySheet.addRow({
    metric: 'Ampel-Status',
    vj: `Grün: ${result.traffic_light.green}`,
    plan: `Gelb: ${result.traffic_light.yellow}`,
    ist: `Rot: ${result.traffic_light.red}`,
    delta_plan: '',
    delta_vj: ''
  });

  // Format currency cells
  const currencyRow = summarySheet.getRow(2);
  ['vj', 'plan', 'ist', 'delta_plan', 'delta_vj'].forEach(col => {
    currencyRow.getCell(col).numFmt = CURRENCY_FORMAT;
  });

  // Detail Sheet
  const detailSheet = workbook.addWorksheet('Plan-Ist-VJ Vergleich');
  detailSheet.columns = [
    { header: 'Konto', key: 'account', width: 10 },
    { header: 'Kontoname', key: 'account_name', width: 30 },
    { header: 'Vorjahr', key: 'amount_vj', width: 16 },
    { header: 'Plan', key: 'amount_plan', width: 16 },
    { header: 'Ist', key: 'amount_ist', width: 16 },
    { header: 'Δ Plan €', key: 'delta_plan_abs', width: 14 },
    { header: 'Δ Plan %', key: 'delta_plan_pct', width: 12 },
    { header: 'Δ VJ €', key: 'delta_vj_abs', width: 14 },
    { header: 'Δ VJ %', key: 'delta_vj_pct', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Kommentar', key: 'comment', width: 35 }
  ];

  detailSheet.getRow(1).eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  result.by_account.forEach(acc => {
    const row = detailSheet.addRow({
      account: acc.account,
      account_name: acc.account_name,
      amount_vj: acc.amount_vj,
      amount_plan: acc.amount_plan,
      amount_ist: acc.amount_ist,
      delta_plan_abs: acc.delta_plan_abs,
      delta_plan_pct: acc.delta_plan_pct / 100,
      delta_vj_abs: acc.delta_vj_abs,
      delta_vj_pct: acc.delta_vj_pct / 100,
      status: getTripleStatus(acc.status),
      comment: acc.comment || ''
    });

    ['amount_vj', 'amount_plan', 'amount_ist', 'delta_plan_abs', 'delta_vj_abs'].forEach(col => {
      row.getCell(col).numFmt = CURRENCY_FORMAT;
    });
    ['delta_plan_pct', 'delta_vj_pct'].forEach(col => {
      row.getCell(col).numFmt = PERCENT_FORMAT;
    });

    // Status color
    const statusCell = row.getCell('status');
    switch (acc.status) {
      case 'critical':
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6666' } };
        break;
      case 'under_plan':
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
        break;
      case 'on_track':
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
        break;
    }
  });

  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: result.by_account.length + 1, column: 11 }
  };
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function getStatus(acc: AccountDeviation): string {
  if (acc.anomalySeverity === 'critical') return 'Kritisch';
  if (acc.anomalySeverity === 'warning') return 'Prüfen';
  return 'OK';
}

function getTripleStatus(status: string): string {
  switch (status) {
    case 'critical': return 'Kritisch';
    case 'under_plan': return 'Unter Plan';
    case 'over_plan': return 'Über Plan';
    case 'on_track': return 'Im Plan';
    default: return status;
  }
}
