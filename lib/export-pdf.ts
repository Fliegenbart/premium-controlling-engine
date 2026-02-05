/**
 * PDF Report Generator
 * Creates Management Summary PDFs using reportlab-style approach
 */

import PDFDocument from 'pdfkit';
import { AnalysisResult, TripleAnalysisResult } from './types';

const COLORS = {
  primary: '#1A5F2A',
  secondary: '#0066CC',
  danger: '#CC0000',
  warning: '#FF9900',
  success: '#006600',
  gray: '#666666',
  lightGray: '#EEEEEE'
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Generate variance analysis PDF report
 */
export async function generateVarianceReport(
  result: AnalysisResult,
  options: { title?: string; company?: string } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: options.title || 'Varianz-Analyse Report',
        Author: 'Premium Controlling Engine',
        Creator: 'Premium Controlling Engine v2.0'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor(COLORS.primary).text('Varianz-Analyse', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(COLORS.gray).text('Management Summary', { align: 'center' });
    doc.moveDown(0.3);
    if (options.company) {
      doc.fontSize(12).text(options.company, { align: 'center' });
    }
    doc.moveDown(1);

    // Period info
    doc.fontSize(10).fillColor(COLORS.gray);
    doc.text(`Vergleichszeitraum: ${result.meta.period_prev} vs. ${result.meta.period_curr}`);
    doc.text(`Erstellt am: ${new Date(result.meta.analyzed_at).toLocaleDateString('de-DE')}`);
    doc.moveDown(1);

    // Summary Box
    drawSummaryBox(doc, result);
    doc.moveDown(1);

    // Key Findings
    doc.fontSize(14).fillColor(COLORS.primary).text('Wesentliche Abweichungen');
    doc.moveDown(0.5);

    const topDeviations = result.by_account
      .sort((a, b) => Math.abs(b.delta_abs) - Math.abs(a.delta_abs))
      .slice(0, 10);

    // Table header
    const tableTop = doc.y;
    const colWidths = [60, 180, 80, 80, 80];
    const headers = ['Konto', 'Bezeichnung', 'Vorjahr', 'Aktuell', 'Abweichung'];

    doc.fontSize(9).fillColor('#FFFFFF');
    doc.rect(50, tableTop, 495, 20).fill(COLORS.primary);

    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i > 1 ? 'right' : 'left' });
      xPos += colWidths[i];
    });

    // Table rows
    let yPos = tableTop + 25;
    doc.fontSize(9).fillColor('#000000');

    topDeviations.forEach((acc, idx) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      // Alternating row colors
      if (idx % 2 === 0) {
        doc.rect(50, yPos - 3, 495, 18).fill(COLORS.lightGray);
      }

      xPos = 55;
      doc.fillColor('#000000');
      doc.text(String(acc.account), xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];

      const name = acc.account_name.length > 30
        ? acc.account_name.substring(0, 28) + '...'
        : acc.account_name;
      doc.text(name, xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];

      doc.text(formatCurrency(acc.amount_prev), xPos, yPos, { width: colWidths[2], align: 'right' });
      xPos += colWidths[2];

      doc.text(formatCurrency(acc.amount_curr), xPos, yPos, { width: colWidths[3], align: 'right' });
      xPos += colWidths[3];

      doc.fillColor(acc.delta_abs > 0 ? COLORS.danger : COLORS.success);
      doc.text(formatCurrency(acc.delta_abs), xPos, yPos, { width: colWidths[4], align: 'right' });

      yPos += 18;
    });

    // Critical items callout
    const criticalItems = result.by_account.filter(a => a.anomalySeverity === 'critical');
    if (criticalItems.length > 0) {
      doc.moveDown(2);
      doc.fontSize(12).fillColor(COLORS.danger).text('⚠ Kritische Abweichungen');
      doc.fontSize(10).fillColor('#000000');
      criticalItems.slice(0, 5).forEach(item => {
        doc.text(`• ${item.account} ${item.account_name}: ${formatCurrency(item.delta_abs)} (${formatPercent(item.delta_pct)})`);
      });
    }

    // Footer
    doc.fontSize(8).fillColor(COLORS.gray);
    const footerY = doc.page.height - 50;
    doc.text('Generiert von Premium Controlling Engine · 100% Datenhoheit', 50, footerY, { align: 'center' });
    doc.text(`Seite 1`, 500, footerY);

    doc.end();
  });
}

/**
 * Generate triple analysis PDF report
 */
export async function generateTripleReport(
  result: TripleAnalysisResult,
  options: { title?: string; company?: string } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: options.title || 'Plan-Ist-VJ Analyse',
        Author: 'Premium Controlling Engine'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor(COLORS.primary).text('Plan vs. Ist vs. Vorjahr', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(COLORS.gray).text('Triple-Analyse Report', { align: 'center' });
    doc.moveDown(1);

    // Traffic Light Summary
    doc.fontSize(12).fillColor(COLORS.primary).text('Ampel-Status');
    doc.moveDown(0.5);

    const tlY = doc.y;
    // Green
    doc.rect(50, tlY, 150, 40).fill('#90EE90');
    doc.fillColor('#000000').fontSize(11).text('Grün', 60, tlY + 5);
    doc.fontSize(20).text(String(result.traffic_light.green), 60, tlY + 18);

    // Yellow
    doc.rect(210, tlY, 150, 40).fill('#FFD700');
    doc.fillColor('#000000').fontSize(11).text('Gelb', 220, tlY + 5);
    doc.fontSize(20).text(String(result.traffic_light.yellow), 220, tlY + 18);

    // Red
    doc.rect(370, tlY, 150, 40).fill('#FF6666');
    doc.fillColor('#000000').fontSize(11).text('Rot', 380, tlY + 5);
    doc.fontSize(20).text(String(result.traffic_light.red), 380, tlY + 18);

    doc.y = tlY + 60;
    doc.moveDown(1);

    // Key Metrics
    doc.fontSize(12).fillColor(COLORS.primary).text('Kennzahlen');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#000000');
    doc.text(`Gesamtsumme Vorjahr: ${formatCurrency(result.meta.total_vj)}`);
    doc.text(`Gesamtsumme Plan: ${formatCurrency(result.meta.total_plan)}`);
    doc.text(`Gesamtsumme Ist: ${formatCurrency(result.meta.total_ist)}`);
    doc.moveDown(0.5);
    doc.text(`Planabweichung: ${formatCurrency(result.summary.total_delta_plan)} (${formatPercent(result.summary.plan_achievement_pct - 100)})`);
    doc.text(`VJ-Abweichung: ${formatCurrency(result.summary.total_delta_vj)}`);
    doc.moveDown(1);

    // Critical/Under Plan items
    const problemItems = result.by_account.filter(a => a.status === 'critical' || a.status === 'under_plan');
    if (problemItems.length > 0) {
      doc.fontSize(12).fillColor(COLORS.danger).text('Handlungsbedarf');
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#000000');
      problemItems.slice(0, 10).forEach(item => {
        const statusLabel = item.status === 'critical' ? '🔴' : '🟡';
        doc.text(`${statusLabel} ${item.account} ${item.account_name}: Plan ${formatCurrency(item.amount_plan)}, Ist ${formatCurrency(item.amount_ist)} (${formatPercent(item.delta_plan_pct)})`);
      });
    }

    // Footer
    doc.fontSize(8).fillColor(COLORS.gray);
    const footerY = doc.page.height - 50;
    doc.text('Generiert von Premium Controlling Engine', 50, footerY, { align: 'center' });

    doc.end();
  });
}

function drawSummaryBox(doc: typeof PDFDocument.prototype, result: AnalysisResult) {
  const boxY = doc.y;
  const boxHeight = 80;

  // Background
  doc.rect(50, boxY, 495, boxHeight).fill(COLORS.lightGray);

  // Metrics
  const metrics = [
    { label: 'Vorjahr', value: formatCurrency(result.meta.total_prev) },
    { label: 'Aktuell', value: formatCurrency(result.meta.total_curr) },
    { label: 'Abweichung', value: formatCurrency(result.summary.total_delta),
      color: result.summary.total_delta > 0 ? COLORS.danger : COLORS.success },
    { label: 'Delta %', value: formatPercent(
      result.meta.total_prev !== 0
        ? (result.summary.total_delta / Math.abs(result.meta.total_prev)) * 100
        : 0
    )}
  ];

  let xPos = 70;
  const colWidth = 120;

  metrics.forEach(m => {
    doc.fontSize(9).fillColor(COLORS.gray).text(m.label, xPos, boxY + 15);
    doc.fontSize(16).fillColor(m.color || '#000000').text(m.value, xPos, boxY + 32);
    xPos += colWidth;
  });

  doc.y = boxY + boxHeight + 10;
}
