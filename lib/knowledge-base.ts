/**
 * SKR03 Knowledge Base
 * 
 * Domain knowledge for German accounting (SKR03 Kontenrahmen)
 * Used for contextual analysis and red flag detection
 */

import { AccountKnowledge } from './types';

// SKR03 Account Knowledge Database
const ACCOUNT_KNOWLEDGE: Record<number, AccountKnowledge> = {
  // ============================================
  // ERLÖSKONTEN (4000-4999)
  // ============================================
  4000: {
    account: 4000,
    account_name: 'Umsatzerlöse',
    category: 'revenue',
    typical_behavior: 'Hauptumsatz aus Labordienstleistungen. Sollte mit Testvolumen korrelieren.',
    seasonality: 'Leichter Rückgang in Ferienzeiten (Juli/August, Dezember).',
    benchmarks: {
      absoluteThreshold: 100000
    }
  },
  4400: {
    account: 4400,
    account_name: 'Erlöse Labordiagnostik',
    category: 'revenue',
    typical_behavior: 'Kerngeschäft Laborleistungen. Haupttreiber sind Testvolumen und Testmix.',
    seasonality: 'Q1 oft stärker (Grippesaison), Q3 schwächer.',
    benchmarks: {
      absoluteThreshold: 50000
    },
    related_accounts: [5100, 6000]
  },
  4500: {
    account: 4500,
    account_name: 'Sonstige Erlöse',
    category: 'revenue',
    typical_behavior: 'Nebenerlöse, z.B. aus Vermietung, Schulungen, Beratung.',
  },
  
  // ============================================
  // MATERIALAUFWAND (5000-5999)
  // ============================================
  5000: {
    account: 5000,
    account_name: 'Materialaufwand',
    category: 'expense',
    typical_behavior: 'Allgemeiner Materialeinkauf. Sollte proportional zum Umsatz sein.',
    benchmarks: {
      revenueRatio: { min: 10, max: 20 }
    }
  },
  5100: {
    account: 5100,
    account_name: 'Reagenzien und Labormaterial',
    category: 'expense',
    typical_behavior: 'Kernkosten für Laborverbrauchsmaterial. Direkt mit Testvolumen verknüpft.',
    benchmarks: {
      revenueRatio: { min: 15, max: 25 }
    },
    related_accounts: [4400]
  },
  5900: {
    account: 5900,
    account_name: 'Fremdleistungen Labor',
    category: 'expense',
    typical_behavior: 'Ausgelagerte Laboranalysen. Kann stark schwanken bei Spezialuntersuchungen.',
    benchmarks: {
      revenueRatio: { min: 5, max: 15 }
    }
  },
  
  // ============================================
  // PERSONALKOSTEN (6000-6199)
  // ============================================
  6000: {
    account: 6000,
    account_name: 'Löhne und Gehälter',
    category: 'expense',
    typical_behavior: 'Größter Kostenblock. Steigt mit Tariferhöhungen und Einstellungen.',
    seasonality: 'Höher in Monaten mit Sonderzahlungen (Juni Urlaubsgeld, November Weihnachtsgeld).',
    benchmarks: {
      revenueRatio: { min: 35, max: 50 }
    }
  },
  6010: {
    account: 6010,
    account_name: 'Gehälter Ärzte',
    category: 'expense',
    typical_behavior: 'Ärztliche Leitung und Befundung. Oft mit Leistungsboni.',
  },
  6020: {
    account: 6020,
    account_name: 'Gehälter MTA/BTA',
    category: 'expense',
    typical_behavior: 'Medizinisch-technische Assistenten. Kernbelegschaft.',
  },
  6100: {
    account: 6100,
    account_name: 'Soziale Abgaben',
    category: 'expense',
    typical_behavior: 'AG-Anteile Sozialversicherung. ~20% der Bruttolöhne.',
    benchmarks: {
      revenueRatio: { min: 7, max: 12 }
    },
    related_accounts: [6000]
  },
  6110: {
    account: 6110,
    account_name: 'Berufsgenossenschaft',
    category: 'expense',
    typical_behavior: 'Unfallversicherung. Jahresbeitrag, meist in Q1/Q2 fällig.',
    seasonality: 'Konzentriert auf erstes Halbjahr.'
  },
  
  // ============================================
  // RAUMKOSTEN (6300-6399)
  // ============================================
  6300: {
    account: 6300,
    account_name: 'Miete und Nebenkosten',
    category: 'expense',
    typical_behavior: 'Mietaufwand für Laborräume. Meist stabil, indexiert.',
  },
  6310: {
    account: 6310,
    account_name: 'Nebenkosten (Strom, Wasser, Gas)',
    category: 'expense',
    typical_behavior: 'Energiekosten. Stark gestiegen seit 2022. Klimaanlagen im Sommer.',
    seasonality: 'Höher im Winter (Heizung) und Sommer (Klimatisierung).'
  },
  
  // ============================================
  // VERSICHERUNGEN (6400-6499)
  // ============================================
  6400: {
    account: 6400,
    account_name: 'Versicherungen',
    category: 'expense',
    typical_behavior: 'Betriebshaftpflicht, Berufshaftpflicht, Sachversicherungen.',
    seasonality: 'Oft Jahresprämien in Q1.'
  },
  
  // ============================================
  // INSTANDHALTUNG (6500-6599)
  // ============================================
  6500: {
    account: 6500,
    account_name: 'Reparaturen und Instandhaltung',
    category: 'expense',
    typical_behavior: 'Wartung Laborgeräte, Gebäudeinstandhaltung. Kann stark schwanken.',
  },
  6510: {
    account: 6510,
    account_name: 'Wartungsverträge Laborgeräte',
    category: 'expense',
    typical_behavior: 'Planbare Wartungskosten für Analysegeräte.',
  },
  
  // ============================================
  // ABSCHREIBUNGEN (6200-6299)
  // ============================================
  6200: {
    account: 6200,
    account_name: 'Abschreibungen Sachanlagen',
    category: 'expense',
    typical_behavior: 'Planmäßige AfA. Steigt bei Neuinvestitionen.',
  },
  6220: {
    account: 6220,
    account_name: 'Abschreibungen Laborgeräte',
    category: 'expense',
    typical_behavior: 'AfA auf Analysegeräte. Meist 5-10 Jahre Nutzungsdauer.',
  },
  
  // ============================================
  // REISEKOSTEN (6700-6799)
  // ============================================
  6700: {
    account: 6700,
    account_name: 'Reisekosten',
    category: 'expense',
    typical_behavior: 'Dienstreisen, Fortbildungen, Kongressbesuche.',
    seasonality: 'Höher in Q2/Q4 (Kongresssaison).'
  },
  
  // ============================================
  // EDV (6800-6899)
  // ============================================
  6800: {
    account: 6800,
    account_name: 'EDV-Kosten',
    category: 'expense',
    typical_behavior: 'IT-Infrastruktur, Software, Support.',
  },
  6815: {
    account: 6815,
    account_name: 'Software und Lizenzen',
    category: 'expense',
    typical_behavior: 'LIS (Labor-Informationssystem), Office, Spezialsoftware.',
    seasonality: 'Jahreslizenzen oft in Q1 fällig.'
  },
  6820: {
    account: 6820,
    account_name: 'Beratungskosten',
    category: 'expense',
    typical_behavior: 'IT-Beratung, Prozessoptimierung, QM-Beratung.',
  },
  
  // ============================================
  // ZINSEN (7000-7099)
  // ============================================
  7000: {
    account: 7000,
    account_name: 'Zinsaufwand',
    category: 'expense',
    typical_behavior: 'Finanzierungskosten für Investitionen.',
  }
};

// Account range definitions
const ACCOUNT_RANGES: Array<{
  min: number;
  max: number;
  category: 'revenue' | 'expense' | 'asset' | 'liability';
  name: string;
}> = [
  { min: 4000, max: 4999, category: 'revenue', name: 'Erlöse' },
  { min: 5000, max: 5999, category: 'expense', name: 'Materialaufwand' },
  { min: 6000, max: 6199, category: 'expense', name: 'Personalkosten' },
  { min: 6200, max: 6299, category: 'expense', name: 'Abschreibungen' },
  { min: 6300, max: 6399, category: 'expense', name: 'Raumkosten' },
  { min: 6400, max: 6499, category: 'expense', name: 'Versicherungen' },
  { min: 6500, max: 6599, category: 'expense', name: 'Instandhaltung' },
  { min: 6600, max: 6699, category: 'expense', name: 'Fahrzeugkosten' },
  { min: 6700, max: 6799, category: 'expense', name: 'Reisekosten' },
  { min: 6800, max: 6899, category: 'expense', name: 'EDV/Beratung' },
  { min: 6900, max: 6999, category: 'expense', name: 'Sonstiger Aufwand' },
  { min: 7000, max: 7999, category: 'expense', name: 'Finanzergebnis' }
];

/**
 * Get knowledge for a specific account
 */
export function getAccountKnowledge(account: number): AccountKnowledge | null {
  // Check direct match
  if (ACCOUNT_KNOWLEDGE[account]) {
    return ACCOUNT_KNOWLEDGE[account];
  }
  
  // Find by range and create generic entry
  const range = ACCOUNT_RANGES.find(r => account >= r.min && account <= r.max);
  if (range) {
    return {
      account,
      account_name: `${range.name} (Konto ${account})`,
      category: range.category,
      typical_behavior: `Standardkonto im Bereich ${range.name}.`
    };
  }
  
  return null;
}

/**
 * Get all known accounts for a category
 */
export function getAccountsByCategory(category: 'revenue' | 'expense'): AccountKnowledge[] {
  return Object.values(ACCOUNT_KNOWLEDGE).filter(a => a.category === category);
}

/**
 * Check red flags for an account deviation
 */
export interface RedFlagResult {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
}

export function checkRedFlags(
  account: number,
  deltaPct: number,
  deltaAbs: number,
  context: {
    percentOfRevenue?: number;
    isNewBookingType?: boolean;
    hasMissingBookings?: boolean;
    month?: number;
  }
): RedFlagResult[] {
  const flags: RedFlagResult[] = [];
  const knowledge = getAccountKnowledge(account);
  
  if (!knowledge) return flags;
  
  // Check absolute threshold
  if (knowledge.benchmarks?.absoluteThreshold) {
    if (Math.abs(deltaAbs) > knowledge.benchmarks.absoluteThreshold) {
      flags.push({
        flag: `Abweichung > ${formatCurrency(knowledge.benchmarks.absoluteThreshold)} Schwellenwert`,
        severity: Math.abs(deltaPct) > 50 ? 'critical' : 'warning',
        source: 'SKR03 Benchmark'
      });
    }
  }
  
  // Check revenue ratio
  if (knowledge.benchmarks?.revenueRatio && context.percentOfRevenue !== undefined) {
    const { min, max } = knowledge.benchmarks.revenueRatio;
    if (context.percentOfRevenue < min || context.percentOfRevenue > max) {
      flags.push({
        flag: `Umsatzquote ${context.percentOfRevenue.toFixed(1)}% außerhalb Benchmark (${min}-${max}%)`,
        severity: 'warning',
        source: 'SKR03 Benchmark'
      });
    }
  }
  
  // Seasonality check
  if (knowledge.seasonality && context.month) {
    const seasonalMonths = extractSeasonalMonths(knowledge.seasonality);
    if (seasonalMonths.includes(context.month) && Math.abs(deltaPct) > 20) {
      flags.push({
        flag: `Saisonale Abweichung möglich: ${knowledge.seasonality}`,
        severity: 'info',
        source: 'SKR03 Saisonalität'
      });
    }
  }
  
  // New booking types
  if (context.isNewBookingType) {
    flags.push({
      flag: 'Neue Buchungsarten im Vergleich zum Vorjahr',
      severity: 'warning',
      source: 'Strukturanalyse'
    });
  }
  
  // Missing bookings
  if (context.hasMissingBookings) {
    flags.push({
      flag: 'Buchungsarten aus Vorjahr fehlen',
      severity: 'warning',
      source: 'Strukturanalyse'
    });
  }
  
  // Extreme deviations
  if (Math.abs(deltaPct) > 100) {
    flags.push({
      flag: `Extreme Abweichung > 100%`,
      severity: 'critical',
      source: 'Plausibilität'
    });
  } else if (Math.abs(deltaPct) > 50) {
    flags.push({
      flag: `Hohe Abweichung > 50%`,
      severity: 'warning',
      source: 'Plausibilität'
    });
  }
  
  return flags;
}

/**
 * Build context prompt for AI analysis
 */
export function buildPromptContext(
  account: number,
  deltaPct: number,
  currentMonth?: number
): string {
  const knowledge = getAccountKnowledge(account);
  if (!knowledge) return '';
  
  let context = `\n\n📚 KONTOKONTEXT (SKR03):\n`;
  context += `Konto ${account} - ${knowledge.account_name}\n`;
  context += `Kategorie: ${knowledge.category === 'revenue' ? 'Erlös' : 'Aufwand'}\n`;
  context += `Typisches Verhalten: ${knowledge.typical_behavior}\n`;
  
  if (knowledge.seasonality) {
    context += `Saisonalität: ${knowledge.seasonality}\n`;
  }
  
  if (knowledge.benchmarks?.revenueRatio) {
    context += `Benchmark Umsatzquote: ${knowledge.benchmarks.revenueRatio.min}-${knowledge.benchmarks.revenueRatio.max}%\n`;
  }
  
  if (knowledge.related_accounts && knowledge.related_accounts.length > 0) {
    context += `Verwandte Konten: ${knowledge.related_accounts.join(', ')}\n`;
  }
  
  return context;
}

// Helper functions
function extractSeasonalMonths(seasonality: string): number[] {
  const months: number[] = [];
  const lowerSeason = seasonality.toLowerCase();
  
  if (lowerSeason.includes('q1') || lowerSeason.includes('januar') || lowerSeason.includes('februar') || lowerSeason.includes('märz')) {
    months.push(1, 2, 3);
  }
  if (lowerSeason.includes('q2') || lowerSeason.includes('april') || lowerSeason.includes('mai') || lowerSeason.includes('juni')) {
    months.push(4, 5, 6);
  }
  if (lowerSeason.includes('q3') || lowerSeason.includes('juli') || lowerSeason.includes('august') || lowerSeason.includes('september')) {
    months.push(7, 8, 9);
  }
  if (lowerSeason.includes('q4') || lowerSeason.includes('oktober') || lowerSeason.includes('november') || lowerSeason.includes('dezember')) {
    months.push(10, 11, 12);
  }
  if (lowerSeason.includes('sommer')) {
    months.push(6, 7, 8);
  }
  if (lowerSeason.includes('winter')) {
    months.push(12, 1, 2);
  }
  
  return Array.from(new Set(months));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}
