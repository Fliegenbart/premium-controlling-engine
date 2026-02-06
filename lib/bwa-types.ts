export type BWALineType =
  | 'revenue'
  | 'material'
  | 'gross_profit'
  | 'personnel'
  | 'room'
  | 'insurance'
  | 'vehicle'
  | 'advertising'
  | 'travel'
  | 'other_operating'
  | 'operating_result'
  | 'depreciation'
  | 'ebitda'
  | 'interest'
  | 'taxes'
  | 'net_result'
  | 'ebit';

export interface BWAAccountDetail {
  account: number;
  name: string;
  amount: number;
  prevAmount?: number;
}

export interface BWALine {
  type: BWALineType;
  label: string;
  amount: number;
  prevAmount?: number;
  planAmount?: number;
  percentOfRevenue: number;
  delta?: number;
  deltaPct?: number;
  isSubtotal?: boolean;
  children?: BWAAccountDetail[];
}

export interface BWASummary {
  revenue: number;
  materialQuota: number;
  grossMargin: number;
  personnelQuota: number;
  ebitda: number;
  ebitdaMargin: number;
  ebit: number;
  ebitMargin: number;
  netResult: number;
  netMargin: number;
}

export interface BWAResult {
  lines: BWALine[];
  summary: BWASummary;
  insights: string[];
  period: string;
  prevPeriod?: string;
}

export interface BWAStructureItem {
  type: BWALineType;
  label: string;
  accountRanges: { min: number; max: number }[];
  isSubtotal?: boolean;
  subtotalLabel?: string;
}

export const BWA_STRUCTURE: BWAStructureItem[] = [
  {
    type: 'revenue',
    label: 'Umsatzerlöse',
    accountRanges: [{ min: 8000, max: 8799 }],
  },
  {
    type: 'material',
    label: 'Bestandsveränderungen',
    accountRanges: [{ min: 8800, max: 8999 }],
  },
  {
    type: 'material',
    label: 'Materialaufwand',
    accountRanges: [{ min: 3000, max: 3999 }],
  },
  {
    type: 'gross_profit',
    label: 'Rohertrag',
    accountRanges: [],
    isSubtotal: true,
    subtotalLabel: 'Rohertrag',
  },
  {
    type: 'personnel',
    label: 'Personalkosten',
    accountRanges: [{ min: 4000, max: 4199 }],
  },
  {
    type: 'room',
    label: 'Raumkosten',
    accountRanges: [{ min: 4200, max: 4299 }],
  },
  {
    type: 'insurance',
    label: 'Versicherungen',
    accountRanges: [{ min: 4300, max: 4399 }],
  },
  {
    type: 'vehicle',
    label: 'Kfz-Kosten',
    accountRanges: [{ min: 4500, max: 4599 }],
  },
  {
    type: 'advertising',
    label: 'Werbekosten',
    accountRanges: [{ min: 4600, max: 4699 }],
  },
  {
    type: 'travel',
    label: 'Reisekosten',
    accountRanges: [{ min: 4700, max: 4799 }],
  },
  {
    type: 'other_operating',
    label: 'Sonstige betr. Aufwendungen',
    accountRanges: [
      { min: 4800, max: 4999 },
      { min: 6000, max: 6999 },
    ],
  },
  {
    type: 'operating_result',
    label: 'Betriebsergebnis',
    accountRanges: [],
    isSubtotal: true,
    subtotalLabel: 'Betriebsergebnis',
  },
  {
    type: 'depreciation',
    label: 'Abschreibungen',
    accountRanges: [{ min: 7000, max: 7099 }],
  },
  {
    type: 'ebitda',
    label: 'EBITDA',
    accountRanges: [],
    isSubtotal: true,
    subtotalLabel: 'EBITDA',
  },
  {
    type: 'ebit',
    label: 'EBIT',
    accountRanges: [],
    isSubtotal: true,
    subtotalLabel: 'EBIT',
  },
  {
    type: 'interest',
    label: 'Zinsen',
    accountRanges: [{ min: 7300, max: 7399 }],
  },
  {
    type: 'taxes',
    label: 'Steuern',
    accountRanges: [{ min: 7600, max: 7699 }],
  },
  {
    type: 'net_result',
    label: 'Jahresüberschuss/-fehlbetrag',
    accountRanges: [],
    isSubtotal: true,
    subtotalLabel: 'Jahresüberschuss/-fehlbetrag',
  },
];
