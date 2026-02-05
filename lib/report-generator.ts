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

export async function generateReport(data: AnalysisResult): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
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
                    text: `Abweichungsanalyse ${data.meta.period_prev} vs. ${data.meta.period_curr}`,
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
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('Abweichungsanalyse Buchungsdaten')],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${data.meta.period_prev} vs. ${data.meta.period_curr}`,
                size: 24,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({ children: [] }),

          // Management Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun('Management Summary')],
          }),

          // Summary Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 4500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: 4500, type: WidthType.DXA },
                    shading: { fill: 'E8F4FC', type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Gesamtergebnis', bold: true, size: 20 })],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formatCurrency(data.summary.total_delta),
                            bold: true,
                            size: 32,
                            color: data.summary.total_delta >= 0 ? '007000' : 'C00000',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Veränderung zum Vorjahr',
                            size: 18,
                            color: '666666',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders,
                    width: { size: 4500, type: WidthType.DXA },
                    shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Erlöse: ', size: 20 }),
                          new TextRun({
                            text: formatCurrency(
                              data.summary.erloese_curr - data.summary.erloese_prev
                            ),
                            bold: true,
                            size: 20,
                            color: '007000',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Aufwendungen: ', size: 20 }),
                          new TextRun({
                            text: formatCurrency(
                              data.summary.aufwendungen_curr - data.summary.aufwendungen_prev
                            ),
                            bold: true,
                            size: 20,
                            color: 'C00000',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${data.meta.bookings_curr} Buchungen analysiert`,
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

          // Summary Text
          new Paragraph({
            children: [
              new TextRun({
                text: `Die Analyse von ${data.meta.bookings_curr} Buchungen in ${data.meta.period_curr} im Vergleich zu ${data.meta.bookings_prev} Buchungen in ${data.meta.period_prev} zeigt ein ${data.summary.total_delta >= 0 ? 'verbessertes' : 'verschlechtertes'} Gesamtergebnis um ${formatCurrency(Math.abs(data.summary.total_delta))}. `,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ children: [] }),

          // Materiality note
          new Paragraph({
            children: [
              new TextRun({
                text: `Wesentlichkeitsgrenze: ≥ ${formatCurrency(data.meta.wesentlichkeit_abs)} und ≥ ${data.meta.wesentlichkeit_pct}% Abweichung`,
                size: 18,
                italics: true,
                color: '666666',
              }),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // Account Deviations
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun('Wesentliche Abweichungen nach Konten')],
          }),

          // Account Table
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
                        children: [
                          new TextRun({ text: 'Konto', bold: true, color: 'FFFFFF', size: 20 }),
                        ],
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
                        children: [
                          new TextRun({
                            text: data.meta.period_prev,
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                          }),
                        ],
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
                        children: [
                          new TextRun({
                            text: data.meta.period_curr,
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                          }),
                        ],
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
                        children: [
                          new TextRun({ text: 'Delta', bold: true, color: 'FFFFFF', size: 20 }),
                        ],
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
                        children: [
                          new TextRun({ text: '%', bold: true, color: 'FFFFFF', size: 20 }),
                        ],
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
                          children: [
                            new TextRun({ text: formatCurrency(item.amount_prev), size: 20 }),
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
                          children: [
                            new TextRun({ text: formatCurrency(item.amount_curr), size: 20 }),
                          ],
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

          // Explanations
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun('Erläuterungen zu den wichtigsten Abweichungen')],
          }),

          ...data.by_account.slice(0, 5).flatMap((item) => {
            const isExpense = item.account >= 5000;
            const commentLines = item.comment.split('\n');
            return [
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: `${item.account} ${item.account_name}: `, bold: true, size: 22 }),
                  new TextRun({
                    text: commentLines[0],
                    size: 22,
                    color: getDeviationColor(item.delta_abs, isExpense),
                  }),
                ],
              }),
              ...commentLines.slice(1).filter((line) => line.trim()).map((line) =>
                new Paragraph({
                  numbering: line.trim().startsWith('-')
                    ? undefined
                    : { reference: 'bullets', level: 0 },
                  children: [new TextRun({ text: line.replace(/^\s*-\s*/, ''), size: 20 })],
                })
              ),
              new Paragraph({ children: [] }),
            ];
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // Cost Center Analysis
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun('Abweichungen nach Kostenstellen')],
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
                        children: [
                          new TextRun({
                            text: 'Kostenstelle',
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                          }),
                        ],
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
                        children: [
                          new TextRun({
                            text: data.meta.period_prev,
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                          }),
                        ],
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
                        children: [
                          new TextRun({
                            text: data.meta.period_curr,
                            bold: true,
                            color: 'FFFFFF',
                            size: 20,
                          }),
                        ],
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
                        children: [
                          new TextRun({ text: 'Delta', bold: true, color: 'FFFFFF', size: 20 }),
                        ],
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
                        children: [
                          new TextRun({ text: '%', bold: true, color: 'FFFFFF', size: 20 }),
                        ],
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
                          children: [
                            new TextRun({ text: item.cost_center, bold: true, size: 22 }),
                          ],
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
                          children: [
                            new TextRun({ text: formatCurrency(item.amount_prev), size: 20 }),
                          ],
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
                          children: [
                            new TextRun({ text: formatCurrency(item.amount_curr), size: 20 }),
                          ],
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
          new Paragraph({ children: [] }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `Report generiert am ${new Date().toLocaleDateString('de-DE')} | Wesentlichkeitsgrenze: ${formatCurrency(data.meta.wesentlichkeit_abs)} und ${data.meta.wesentlichkeit_pct}%`,
                size: 16,
                italics: true,
                color: '808080',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
