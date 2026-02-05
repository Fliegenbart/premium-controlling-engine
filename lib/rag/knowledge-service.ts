import skr03Data from '@/knowledge/accounts/skr03.json';

export interface AccountKnowledge {
  name: string;
  category: string;
  type: 'revenue' | 'expense';
  typical_behavior: string;
  seasonal_pattern?: string;
  red_flags?: string[];
  benchmarks?: {
    percent_of_revenue?: { min: number; max: number; typical: number };
    growth_expectation?: { min: number; max: number; typical: number };
    percent_of_salaries?: { min: number; max: number; typical: number };
  };
  keywords?: string[];
  related_accounts?: string[];
}

export interface RedFlagResult {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
}

export class KnowledgeService {
  private accounts: Record<string, AccountKnowledge>;
  private categories: Record<string, any>;
  private labSpecific: any;

  constructor() {
    this.accounts = skr03Data.accounts as Record<string, AccountKnowledge>;
    this.categories = skr03Data.categories;
    this.labSpecific = skr03Data.lab_specific;
  }

  /**
   * Get knowledge about a specific account
   */
  getAccountKnowledge(accountNumber: number | string): AccountKnowledge | null {
    const key = String(accountNumber);

    // Direct match
    if (this.accounts[key]) {
      return this.accounts[key];
    }

    // Try to find by prefix (e.g., 6010 -> 6000)
    const prefix = key.substring(0, 2) + '00';
    if (this.accounts[prefix]) {
      return this.accounts[prefix];
    }

    return null;
  }

  /**
   * Get category for an account
   */
  getAccountCategory(accountNumber: number): string {
    if (accountNumber >= 4000 && accountNumber < 5000) return 'Erlöse';
    if (accountNumber >= 5000 && accountNumber < 6000) return 'Materialaufwand';
    if (accountNumber >= 6000 && accountNumber < 6200) return 'Personalaufwand';
    if (accountNumber >= 6200 && accountNumber < 6300) return 'Abschreibungen';
    if (accountNumber >= 6300 && accountNumber < 7000) return 'Sonstige betriebliche Aufwendungen';
    if (accountNumber >= 7000 && accountNumber < 7500) return 'Finanzergebnis';
    if (accountNumber >= 7500 && accountNumber < 8000) return 'Steuern';
    return 'Sonstige';
  }

  /**
   * Check for red flags based on variance data
   */
  checkRedFlags(
    accountNumber: number,
    variancePercent: number,
    varianceAbs: number,
    context: {
      percentOfRevenue?: number;
      percentOfSalaries?: number;
      isNewBookingType?: boolean;
      hasMissingBookings?: boolean;
    } = {}
  ): RedFlagResult[] {
    const knowledge = this.getAccountKnowledge(accountNumber);
    if (!knowledge) return [];

    const flags: RedFlagResult[] = [];

    // Check variance against typical behavior
    if (Math.abs(variancePercent) > 30) {
      flags.push({
        flag: `Hohe Abweichung von ${variancePercent.toFixed(1)}% erfordert Prüfung`,
        severity: 'warning',
        source: 'variance_analysis'
      });
    }

    if (Math.abs(variancePercent) > 50) {
      flags.push({
        flag: `Kritische Abweichung von ${variancePercent.toFixed(1)}%`,
        severity: 'critical',
        source: 'variance_analysis'
      });
    }

    // Check benchmarks
    if (knowledge.benchmarks?.percent_of_revenue && context.percentOfRevenue !== undefined) {
      const { min, max } = knowledge.benchmarks.percent_of_revenue;
      if (context.percentOfRevenue < min) {
        flags.push({
          flag: `Unter Branchenbenchmark (${context.percentOfRevenue.toFixed(1)}% vs. min ${min}%)`,
          severity: 'info',
          source: 'benchmark'
        });
      }
      if (context.percentOfRevenue > max) {
        flags.push({
          flag: `Über Branchenbenchmark (${context.percentOfRevenue.toFixed(1)}% vs. max ${max}%)`,
          severity: 'warning',
          source: 'benchmark'
        });
      }
    }

    // Check specific red flags from knowledge base
    knowledge.red_flags?.forEach(redFlag => {
      const flagLower = redFlag.toLowerCase();

      if (flagLower.includes('rückgang') && variancePercent < -20) {
        flags.push({
          flag: redFlag,
          severity: 'warning',
          source: 'knowledge_base'
        });
      }

      if (flagLower.includes('anstieg') && variancePercent > 30) {
        flags.push({
          flag: redFlag,
          severity: 'warning',
          source: 'knowledge_base'
        });
      }

      if (flagLower.includes('neu') && context.isNewBookingType) {
        flags.push({
          flag: redFlag,
          severity: 'info',
          source: 'knowledge_base'
        });
      }
    });

    return flags;
  }

  /**
   * Get seasonal context for the current month
   */
  getSeasonalContext(month: number): string {
    const quarter = Math.ceil(month / 3);
    const quarterKey = `Q${quarter}` as keyof typeof this.labSpecific.seasonal_factors;
    return this.labSpecific.seasonal_factors[quarterKey] || '';
  }

  /**
   * Build a context string for AI prompts
   */
  buildPromptContext(
    accountNumber: number,
    variancePercent: number,
    month?: number
  ): string {
    const knowledge = this.getAccountKnowledge(accountNumber);
    const category = this.getAccountCategory(accountNumber);

    let context = `\n## Controlling-Kontext für Konto ${accountNumber}:\n`;

    if (knowledge) {
      context += `- Kontenart: ${knowledge.type === 'revenue' ? 'Ertragskonto' : 'Aufwandskonto'}\n`;
      context += `- Kategorie: ${category}\n`;
      context += `- Typisches Verhalten: ${knowledge.typical_behavior}\n`;

      if (knowledge.seasonal_pattern) {
        context += `- Saisonales Muster: ${knowledge.seasonal_pattern}\n`;
      }

      if (knowledge.benchmarks?.percent_of_revenue) {
        const { min, max, typical } = knowledge.benchmarks.percent_of_revenue;
        context += `- Branchenbenchmark: ${typical}% des Umsatzes (Spanne: ${min}-${max}%)\n`;
      }

      if (knowledge.red_flags && knowledge.red_flags.length > 0) {
        context += `- Bekannte Risiken:\n`;
        knowledge.red_flags.forEach(flag => {
          context += `  • ${flag}\n`;
        });
      }
    } else {
      context += `- Kategorie: ${category}\n`;
      context += `- Keine spezifischen Informationen im Kontenrahmen hinterlegt\n`;
    }

    if (month) {
      const seasonalContext = this.getSeasonalContext(month);
      if (seasonalContext) {
        context += `\n## Saisonaler Kontext:\n${seasonalContext}\n`;
      }
    }

    return context;
  }

  /**
   * Get lab-specific KPIs for benchmarking
   */
  getLabKPIs() {
    return this.labSpecific.key_kpis;
  }

  /**
   * Get all cost drivers
   */
  getCostDrivers(): string[] {
    return this.labSpecific.cost_drivers;
  }
}

// Singleton instance
let knowledgeServiceInstance: KnowledgeService | null = null;

export function getKnowledgeService(): KnowledgeService {
  if (!knowledgeServiceInstance) {
    knowledgeServiceInstance = new KnowledgeService();
  }
  return knowledgeServiceInstance;
}
