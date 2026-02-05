/**
 * Demo Data Generator
 * Creates realistic controlling demo data for showcasing the platform
 */

import { Booking } from './types';

// SKR03 Account structure for demo
const DEMO_ACCOUNTS = [
  // Revenue (8xxx)
  { account: 8000, name: 'Umsatzerlöse Labor-Diagnostik', category: 'revenue', baseAmount: -450000 },
  { account: 8100, name: 'Umsatzerlöse Spezialdiagnostik', category: 'revenue', baseAmount: -180000 },
  { account: 8200, name: 'Umsatzerlöse Molekulardiagnostik', category: 'revenue', baseAmount: -95000 },
  { account: 8400, name: 'Erlöse aus Nebenleistungen', category: 'revenue', baseAmount: -25000 },

  // Personnel (6xxx)
  { account: 6000, name: 'Löhne und Gehälter', category: 'expense', baseAmount: 180000 },
  { account: 6010, name: 'Gehälter Labor', category: 'expense', baseAmount: 120000 },
  { account: 6020, name: 'Gehälter Verwaltung', category: 'expense', baseAmount: 45000 },
  { account: 6100, name: 'Soziale Abgaben', category: 'expense', baseAmount: 55000 },
  { account: 6200, name: 'Altersvorsorge', category: 'expense', baseAmount: 12000 },

  // Materials (4xxx)
  { account: 4000, name: 'Reagenzien und Verbrauchsmaterial', category: 'expense', baseAmount: 85000 },
  { account: 4100, name: 'Labor-Kits', category: 'expense', baseAmount: 42000 },
  { account: 4200, name: 'Probengefäße und Zubehör', category: 'expense', baseAmount: 18000 },
  { account: 4300, name: 'Schutzausrüstung', category: 'expense', baseAmount: 8000 },

  // Operating (6xxx-7xxx)
  { account: 6300, name: 'Miete und Nebenkosten', category: 'expense', baseAmount: 35000 },
  { account: 6400, name: 'Energie (Strom, Gas)', category: 'expense', baseAmount: 22000 },
  { account: 6500, name: 'Versicherungen', category: 'expense', baseAmount: 8500 },
  { account: 6600, name: 'Wartung Laborgeräte', category: 'expense', baseAmount: 15000 },
  { account: 6700, name: 'IT-Kosten und Software', category: 'expense', baseAmount: 12000 },
  { account: 6800, name: 'Beratungskosten', category: 'expense', baseAmount: 18000 },
  { account: 6900, name: 'Fortbildung', category: 'expense', baseAmount: 6000 },
  { account: 7000, name: 'Reisekosten', category: 'expense', baseAmount: 4500 },
  { account: 7100, name: 'Werbung und Marketing', category: 'expense', baseAmount: 7500 },
  { account: 7200, name: 'Büromaterial', category: 'expense', baseAmount: 3500 },
  { account: 7300, name: 'Telefon und Internet', category: 'expense', baseAmount: 2800 },
  { account: 7400, name: 'Porto und Versand', category: 'expense', baseAmount: 4200 },
  { account: 7500, name: 'Abschreibungen Laborgeräte', category: 'expense', baseAmount: 25000 },
  { account: 7600, name: 'Abschreibungen IT', category: 'expense', baseAmount: 8000 },
  { account: 7700, name: 'Zinsen Bankdarlehen', category: 'expense', baseAmount: 3200 },
];

const COST_CENTERS = [
  'CC-LABOR-HAUPT',
  'CC-LABOR-SPEZIAL',
  'CC-LABOR-MOL',
  'CC-VERWALTUNG',
  'CC-IT',
  'CC-QUALITÄT',
];

const VENDORS = [
  'Roche Diagnostics GmbH',
  'Siemens Healthineers',
  'Abbott Deutschland',
  'Bio-Rad Laboratories',
  'Beckman Coulter',
  'Thermo Fisher Scientific',
  'QIAGEN GmbH',
  'DiaSorin Deutschland',
  'Sysmex Deutschland',
  'Sarstedt AG',
  'Greiner Bio-One',
  'Eppendorf AG',
];

const CUSTOMERS = [
  'AOK Bayern',
  'Techniker Krankenkasse',
  'BARMER',
  'DAK Gesundheit',
  'Praxis Dr. Müller',
  'MVZ Musterstadt',
  'Klinikum Musterstadt',
  'Universitätsklinik',
];

const BOOKING_TEXTS: Record<string, string[]> = {
  revenue: [
    'Laborleistungen %MONTH%',
    'Abrechnung KV %MONTH%',
    'Privatpatienten %MONTH%',
    'Sonderuntersuchungen',
    'Eilbefunde Zuschlag',
  ],
  expense: [
    'Monatliche Lieferung',
    'Wartungsvertrag Q%Q%',
    'Nachbestellung %ITEM%',
    'Jahresrechnung %YEAR%',
    'Einzelbestellung',
  ],
};

/**
 * Generate demo bookings for a period
 */
export function generateDemoBookings(
  year: number,
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  variance: 'low' | 'medium' | 'high' = 'medium'
): Booking[] {
  const bookings: Booking[] = [];
  const varianceFactors = { low: 0.05, medium: 0.15, high: 0.30 };
  const vf = varianceFactors[variance];

  months.forEach(month => {
    DEMO_ACCOUNTS.forEach(acc => {
      // Number of bookings per account per month
      const numBookings = Math.floor(Math.random() * 4) + 1;
      const monthlyTotal = acc.baseAmount / 12;

      for (let i = 0; i < numBookings; i++) {
        // Distribute amount across bookings
        const portion = i === numBookings - 1
          ? monthlyTotal - (monthlyTotal / numBookings) * i
          : (monthlyTotal / numBookings) * (0.8 + Math.random() * 0.4);

        // Apply variance
        const amount = portion * (1 + (Math.random() - 0.5) * 2 * vf);

        // Random day
        const day = Math.floor(Math.random() * 28) + 1;
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Generate text
        const textTemplates = acc.category === 'revenue'
          ? BOOKING_TEXTS.revenue
          : BOOKING_TEXTS.expense;
        let text = textTemplates[Math.floor(Math.random() * textTemplates.length)];
        text = text
          .replace('%MONTH%', new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long' }))
          .replace('%Q%', String(Math.ceil(month / 3)))
          .replace('%YEAR%', String(year))
          .replace('%ITEM%', ['Reagenzien', 'Verbrauchsmaterial', 'Kits'][Math.floor(Math.random() * 3)]);

        const booking: Booking = {
          posting_date: date,
          amount: Math.round(amount * 100) / 100,
          account: acc.account,
          account_name: acc.name,
          cost_center: COST_CENTERS[Math.floor(Math.random() * COST_CENTERS.length)],
          document_no: `${year}${String(month).padStart(2, '0')}${String(bookings.length + 1).padStart(5, '0')}`,
          text,
          vendor: acc.category === 'expense' ? VENDORS[Math.floor(Math.random() * VENDORS.length)] : undefined,
          customer: acc.category === 'revenue' ? CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)] : undefined,
        };

        bookings.push(booking);
      }
    });
  });

  return bookings;
}

/**
 * Generate variance scenario between two periods
 */
export function generateVarianceScenario(
  scenario: 'stable' | 'growth' | 'cost_increase' | 'mixed' = 'mixed'
): { prevYear: Booking[]; currYear: Booking[]; plan: Booking[] } {
  const currentYear = new Date().getFullYear();
  const prevYear = generateDemoBookings(currentYear - 1, undefined, 'low');

  // Adjust current year based on scenario
  let currYear = generateDemoBookings(currentYear, undefined, 'medium');

  switch (scenario) {
    case 'growth':
      // 10% revenue growth, stable costs
      currYear = currYear.map(b => {
        if (b.account >= 8000 && b.account < 9000) {
          return { ...b, amount: b.amount * 1.10 };
        }
        return b;
      });
      break;

    case 'cost_increase':
      // Stable revenue, 15% cost increase (especially energy and personnel)
      currYear = currYear.map(b => {
        if (b.account === 6000 || b.account === 6010) {
          return { ...b, amount: b.amount * 1.08 }; // 8% salary increase
        }
        if (b.account === 6400) {
          return { ...b, amount: b.amount * 1.35 }; // 35% energy increase
        }
        if (b.account >= 4000 && b.account < 5000) {
          return { ...b, amount: b.amount * 1.12 }; // 12% material increase
        }
        return b;
      });
      break;

    case 'mixed':
      // Some positive, some negative
      currYear = currYear.map(b => {
        // Revenue growth in specialty areas
        if (b.account === 8100 || b.account === 8200) {
          return { ...b, amount: b.amount * 1.15 };
        }
        // Cost pressure
        if (b.account === 6400) {
          return { ...b, amount: b.amount * 1.25 };
        }
        if (b.account === 6000) {
          return { ...b, amount: b.amount * 1.05 };
        }
        // Add some outliers
        if (Math.random() < 0.05) {
          return { ...b, amount: b.amount * (1 + (Math.random() - 0.5) * 0.6) };
        }
        return b;
      });
      break;

    case 'stable':
    default:
      // Minor variations only
      break;
  }

  // Generate plan (slightly optimistic)
  const plan = currYear.map(b => ({
    ...b,
    amount: b.account >= 8000
      ? b.amount * 1.05 // 5% more revenue planned
      : b.amount * 0.98, // 2% less cost planned
    document_no: `PLAN-${b.document_no}`
  }));

  return { prevYear, currYear, plan };
}

/**
 * Get demo scenario description
 */
export function getScenarioDescription(scenario: string): string {
  const descriptions: Record<string, string> = {
    stable: 'Stabile Entwicklung mit geringen Schwankungen',
    growth: 'Wachstumsszenario: +10% Umsatz bei stabilen Kosten',
    cost_increase: 'Kostendruck: Energiekosten +35%, Personal +8%',
    mixed: 'Gemischtes Szenario mit Wachstum in Spezialdiagnostik aber steigenden Kosten',
  };
  return descriptions[scenario] || 'Individuelles Szenario';
}

/**
 * Available demo scenarios
 */
export const DEMO_SCENARIOS = [
  { id: 'stable', name: 'Stabil', description: 'Geringe Abweichungen' },
  { id: 'growth', name: 'Wachstum', description: '10% Umsatzwachstum' },
  { id: 'cost_increase', name: 'Kostendruck', description: 'Energie- und Personalkosten steigen' },
  { id: 'mixed', name: 'Gemischt', description: 'Realistisches Szenario mit Chancen und Risiken' },
];
