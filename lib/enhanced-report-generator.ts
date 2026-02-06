/**
 * Enhanced Report Generator
 * Creates professional Word documents with AI-generated narratives
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
} from 'docx';
import { AnalysisResult } from './types';
import { AIReportSections } from './ai-report-generator';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getDeviationColor(delta: number, isExpense: boolean = false): string {
  if (isExpense) {
    return delta < 0 ? 'C00000' : '007000';
  }
  return delta > 0 ? '007000' : 'C00000';
}

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const darkBorder = { style: BorderStyle.SINGLE, size: 1, color: '1F4E79' };
const darkBorders = { top: darkBorder, bottom: darkBorder, left: darkBorder, right: darkBorder };

/**
 * Create Table of Contents section
 */
function createTableOfContents(): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Inhaltsverzeichnis')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Zusammenfassung für die Geschäftsführung')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Finanzielle Übersicht und Kennzahlen')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Analyse der wesentlichen Abweichungen')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Segmentkommentare')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Kostenstellen-Analyse')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Risikobewertung')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Handlungsempfehlungen')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Ausblick')],
    }),
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun('Anhang: Datenqualität')],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Create executive summary section with AI text
 */
function createExecutiveSummary(aiSections: AIReportSections): (Paragraph)[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Zusammenfassung für die Geschäftsführung')],
    }),
    new Paragraph({
      children: [new TextRun(aiSections.executiveSummary)],
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create KPI overview boxes
 */
function createFinancialOverview(data: AnalysisResult): any[] {
  const revenueDelta = data.summary.erloese_curr - data.summary.erloese_prev;
  const expenseDelta = data.summary.aufwendungen_curr - data.summary.aufwendungen_prev;
  const revenueDeltaPct = (revenueDelta / Math.abs(data.summary.erloese_prev)) * 100 || 0;
  const expenseDeltaPct = (expenseDelta / Math.abs(data.summary.aufwendungen_prev)) * 100 || 0;

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Finanzielle Übersicht und Kennzahlen')],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3000, 3000, 3000],
      rows: [
        new TableRow({
          children: [
            // Revenue KPI
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'E8F4FC', type: ShadingType.CLEAR },
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Erlöse', bold: true, size: 22, color: '1F4E79' })],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatCurrency(revenueDelta),
                      bold: true,
                      size: 36,
                      color: revenueDelta > 0 ? '007000' : 'C00000',
                    }),
                  ],
                  spacing: { before: 120 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `(${formatPercent(revenueDeltaPct)})`,
                      size: 20,
                      color: '666666',
                    }),
                  ],
                }),
              ],
            }),
            // Expenses KPI
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'FCF0E8', type: ShadingType.CLEAR },
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Aufwendungen', bold: true, size: 22, color: '1F4E79' })],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatCurrency(expenseDelta),
                      bold: true,
                      size: 36,
                      color: expenseDelta > 0 ? 'C00000' : '007000',
                    }),
                  ],
                  spacing: { before: 120 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `(${formatPercent(expenseDeltaPct)})`,
                      size: 20,
                      color: '666666',
                    }),
                  ],
                }),
              ],
            }),
            // Result KPI
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'F0FCE8', type: ShadingType.CLEAR },
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Gesamtergebnis', bold: true, size: 22, color: '1F4E79' })],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatCurrency(data.summary.total_delta),
                      bold: true,
                      size: 36,
                      color: data.summary.total_delta >= 0 ? '007000' : 'C00000',
                    }),
                  ],
                  spacing: { before: 120 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Periode: ${data.meta.period_curr}`,
                      size: 18,
                      color: '666666',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create detailed deviation table
 */
function createDeviationTable(data: AnalysisResult): any[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Wesentliche Abweichungen nach Konten')],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3200, 1800, 1800, 1400, 1200],
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders,
              width: { size: 3200, type: WidthType.DXA },
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Konto', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1800, type: WidthType.DXA },
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: data.meta.period_prev, bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1800, type: WidthType.DXA },
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: data.meta.period_curr, bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1400, type: WidthType.DXA },
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'Delta', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1200, type: WidthType.DXA },
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: '%', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
          ],
        }),
        ...data.by_account.map((item, idx) => {
          const isExpense = item.account >= 5000;
          const rowColor = idx % 2 === 0 ? 'FFFFFF' : 'F8F8F8';
          return new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3200, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${item.account} `, size: 18, color: '808080' }),
                      new TextRun({ text: item.account_name, size: 20 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: formatCurrency(item.amount_prev), size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: formatCurrency(item.amount_curr), size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: formatCurrency(item.delta_abs),
                        size: 20,
                        bold: true,
                        color: getDeviationColor(item.delta_abs, isExpense),
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1200, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: formatPercent(item.delta_pct),
                        size: 20,
                        color: getDeviationColor(item.delta_abs, isExpense),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
        }),
      ],
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create AI-generated deviation analysis section
 */
function createDeviationAnalysisSection(aiSections: AIReportSections): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Analyse der wesentlichen Abweichungen')],
    }),
    new Paragraph({
      children: aiSections.deviationAnalysis.split('\n').map((line, idx) =>
        idx > 0
          ? new TextRun({ text: '\n' + line, size: 22 })
          : new TextRun({ text: line, size: 22 })
      ),
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Create segment commentary section
 */
function createSegmentCommentary(aiSections: AIReportSections): (Paragraph)[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Segmentkommentare')],
    }),
    new Paragraph({
      children: [new TextRun(aiSections.segmentCommentary)],
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create cost center analysis table
 */
function createCostCenterAnalysis(data: AnalysisResult): any[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Kostenstellen-Analyse')],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1800, 2200, 2200, 1600, 1200],
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders,
              width: { size: 1800, type: WidthType.DXA },
              shading: { fill: '2E75B6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Kostenstelle', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 2200, type: WidthType.DXA },
              shading: { fill: '2E75B6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: data.meta.period_prev, bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 2200, type: WidthType.DXA },
              shading: { fill: '2E75B6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: data.meta.period_curr, bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1600, type: WidthType.DXA },
              shading: { fill: '2E75B6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'Delta', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
            new TableCell({
              borders,
              width: { size: 1200, type: WidthType.DXA },
              shading: { fill: '2E75B6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: '%', bold: true, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
          ],
        }),
        ...data.by_cost_center.map((item, idx) => {
          const rowColor = idx % 2 === 0 ? 'FFFFFF' : 'F8F8F8';
          return new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: item.cost_center, bold: true, size: 22 })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 2200, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: formatCurrency(item.amount_prev), size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 2200, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: formatCurrency(item.amount_curr), size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1600, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: formatCurrency(item.delta_abs),
                        size: 20,
                        bold: true,
                        color: item.delta_abs >= 0 ? '007000' : 'C00000',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 1200, type: WidthType.DXA },
                shading: { fill: rowColor, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: formatPercent(item.delta_pct),
                        size: 20,
                        color: item.delta_abs >= 0 ? '007000' : 'C00000',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Create risk assessment section
 */
function createRiskAssessment(aiSections: AIReportSections): (Paragraph)[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Risikobewertung')],
    }),
    new Paragraph({
      children: aiSections.riskAssessment.split('\n').map((line, idx) =>
        idx > 0
          ? new TextRun({ text: '\n' + line, size: 22 })
          : new TextRun({ text: line, size: 22 })
      ),
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create recommendations section
 */
function createRecommendations(aiSections: AIReportSections): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Handlungsempfehlungen')],
    }),
    new Paragraph({
      children: aiSections.recommendations.split('\n').map((line, idx) =>
        idx > 0
          ? new TextRun({ text: '\n' + line, size: 22 })
          : new TextRun({ text: line, size: 22 })
      ),
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/**
 * Create outlook section
 */
function createOutlook(aiSections: AIReportSections): (Paragraph)[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Ausblick')],
    }),
    new Paragraph({
      children: [new TextRun(aiSections.outlook)],
      spacing: { line: 360, lineRule: 'auto' },
    }),
    new Paragraph({ children: [] }),
  ];
}

/**
 * Create appendix with data quality information
 */
function createAppendix(data: AnalysisResult, aiSections: AIReportSections): any[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun('Anhang: Datenqualität und Metadaten')],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3000, 6000],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'E8F4FC', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Parameter', bold: true })] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'E8F4FC', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Wert', bold: true })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Analysezeitraum')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(`${data.meta.period_prev} vs. ${data.meta.period_curr}`)] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Anzahl Buchungen (Vorjahr)')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(data.meta.bookings_prev.toString())] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Anzahl Buchungen (Aktuell)')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(data.meta.bookings_curr.toString())] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Wesentlichkeitsgrenze (absolut)')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(formatCurrency(data.meta.wesentlichkeit_abs))] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Wesentlichkeitsgrenze (prozentual)')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(`${data.meta.wesentlichkeit_pct}%`)] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('KI-Generierung')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(aiSections.aiGenerated ? 'Ja (mit Ollama)' : 'Nein (Fallback-Template)')] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 3000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun('Report generiert')] })],
            }),
            new TableCell({
              borders,
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(new Date(aiSections.generatedAt).toLocaleString('de-DE'))] })],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Dieser Report wurde automatisiert generiert. Die Daten unterliegen der Wesentlichkeit und basieren auf eingegebenen Buchungsdaten. Für Fragen zum Report wenden Sie sich bitte an Ihr Controlling-Team.',
          italics: true,
          size: 18,
          color: '666666',
        }),
      ],
    }),
  ];
}

/**
 * Main function: Generate enhanced report with AI sections
 */
export async function generateEnhancedReport(
  data: AnalysisResult,
  aiSections: AIReportSections
): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: '1F4E79' },
          paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: '2E75B6' },
          paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial', color: '404040' },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Monatsbericht ${data.meta.period_curr}`,
                    size: 18,
                    color: '808080',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Seite ', size: 18, color: '808080' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Cover Page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 },
            children: [
              new TextRun({
                text: 'MONATSBERICHT',
                size: 52,
                bold: true,
                color: '1F4E79',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 800 },
            children: [
              new TextRun({
                text: `${data.meta.period_curr}`,
                size: 40,
                color: '2E75B6',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 200 },
            children: [
              new TextRun({
                text: 'Automatischer Monatsbericht-Generator',
                size: 24,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `KI-gestützte Controlling-Analyse`,
                size: 20,
                italics: true,
                color: '808080',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 },
            children: [
              new TextRun({
                text: new Date().toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                size: 18,
                color: '999999',
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // Table of Contents
          ...createTableOfContents(),

          // Main Sections
          ...createExecutiveSummary(aiSections),
          ...createFinancialOverview(data),
          ...createDeviationTable(data),
          ...createDeviationAnalysisSection(aiSections),
          ...createSegmentCommentary(aiSections),
          ...createCostCenterAnalysis(data),
          ...createRiskAssessment(aiSections),
          ...createRecommendations(aiSections),
          ...createOutlook(aiSections),
          ...createAppendix(data, aiSections),
        ] as any[],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
