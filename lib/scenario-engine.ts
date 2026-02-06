import { AnalysisResult, AccountDeviation } from './types';

export interface ScenarioParameter {
  id: string;
  name: string;
  category: 'revenue' | 'cost' | 'volume' | 'price' | 'headcount' | 'custom';
  baseValue: number;
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: 'EUR' | 'percent' | 'count' | 'factor';
  description: string;
  affectedAccounts: number[]; // Which accounts this parameter affects
}

export interface ScenarioResult {
  name: string;
  parameters: ScenarioParameter[];
  projectedResult: {
    revenue: number;
    expenses: number;
    result: number;
    resultDelta: number; // vs baseline
    resultDeltaPct: number;
    marginPct: number;
  };
  accountImpacts: {
    account: number;
    account_name: string;
    baseline: number;
    projected: number;
    delta: number;
    deltaPct: number;
  }[];
  breakEvenAnalysis?: {
    revenueNeeded: number;
    costReductionNeeded: number;
    currentDistance: number;
  };
  sensitivityRanking: {
    parameterId: string;
    parameterName: string;
    impactPerPercent: number; // How much result changes per 1% parameter change
  }[];
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  parameters: { id: string; value: number }[];
}

/**
 * Create default scenario parameters from AnalysisResult
 */
export function createDefaultParameters(data: AnalysisResult): ScenarioParameter[] {
  if (!data || !data.by_account) {
    return [];
  }

  // Helper to sum accounts by range
  const sumAccountRange = (min: number, max: number, accounts: AccountDeviation[]): number => {
    return accounts
      .filter(a => a.account >= min && a.account <= max)
      .reduce((sum, a) => sum + a.amount_curr, 0);
  };

  // Revenue accounts (8000-8999)
  const revenue = Math.abs(sumAccountRange(8000, 8999, data.by_account));

  // Cost accounts
  const personalkosten = sumAccountRange(5000, 5999, data.by_account);
  const materialkosten = sumAccountRange(3000, 3999, data.by_account);
  const sonstigeAufwendungen = sumAccountRange(6000, 6999, data.by_account);
  const energiekosten = sumAccountRange(4200, 4299, data.by_account);
  const mietkosten = sumAccountRange(4210, 4219, data.by_account);

  const parameters: ScenarioParameter[] = [
    {
      id: 'umsatzentwicklung',
      name: 'Umsatzentwicklung',
      category: 'revenue',
      baseValue: revenue > 0 ? revenue : 1000000,
      currentValue: revenue > 0 ? revenue : 1000000,
      minValue: (revenue > 0 ? revenue : 1000000) * 0.7, // -30%
      maxValue: (revenue > 0 ? revenue : 1000000) * 1.3, // +30%
      step: (revenue > 0 ? revenue : 1000000) * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Projizierte Änderung des Gesamtumsatzes',
      affectedAccounts: Array.from({ length: 1000 }, (_, i) => 8000 + i),
    },
    {
      id: 'personalkosten',
      name: 'Personalkosten',
      category: 'cost',
      baseValue: personalkosten,
      currentValue: personalkosten,
      minValue: personalkosten * 0.8, // -20%
      maxValue: personalkosten * 1.2, // +20%
      step: personalkosten * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Lohn- und Gehaltskosten und Sozialabgaben',
      affectedAccounts: Array.from({ length: 1000 }, (_, i) => 5000 + i),
    },
    {
      id: 'materialkosten',
      name: 'Materialkosten',
      category: 'cost',
      baseValue: materialkosten,
      currentValue: materialkosten,
      minValue: materialkosten * 0.7, // -30%
      maxValue: materialkosten * 1.3, // +30%
      step: materialkosten * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Material-, Rohstoff- und Komponenten kosten',
      affectedAccounts: Array.from({ length: 1000 }, (_, i) => 3000 + i),
    },
    {
      id: 'sonstige_aufwendungen',
      name: 'Sonstige Aufwendungen',
      category: 'cost',
      baseValue: sonstigeAufwendungen,
      currentValue: sonstigeAufwendungen,
      minValue: sonstigeAufwendungen * 0.8, // -20%
      maxValue: sonstigeAufwendungen * 1.2, // +20%
      step: sonstigeAufwendungen * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Sonstige Betriebsausgaben und Verwaltungskosten',
      affectedAccounts: Array.from({ length: 1000 }, (_, i) => 6000 + i),
    },
    {
      id: 'energiekosten',
      name: 'Energiekosten',
      category: 'cost',
      baseValue: energiekosten,
      currentValue: energiekosten,
      minValue: energiekosten * 0.5, // -50%
      maxValue: energiekosten * 2.0, // +100%
      step: energiekosten * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Strom-, Gas- und sonstige Energieausgaben',
      affectedAccounts: Array.from({ length: 100 }, (_, i) => 4200 + i),
    },
    {
      id: 'mietkosten',
      name: 'Mietkosten',
      category: 'cost',
      baseValue: mietkosten,
      currentValue: mietkosten,
      minValue: mietkosten * 0.9, // -10%
      maxValue: mietkosten * 1.1, // +10%
      step: mietkosten * 0.01, // 1% steps
      unit: 'EUR',
      description: 'Miete, Pachten und Nebenkosten für Liegenschaften',
      affectedAccounts: Array.from({ length: 10 }, (_, i) => 4210 + i),
    },
  ];

  return parameters;
}

/**
 * Simulate a scenario with given parameters
 */
export function simulateScenario(
  data: AnalysisResult,
  parameters: ScenarioParameter[],
): ScenarioResult {
  if (!data || !data.by_account) {
    return {
      name: 'Empty Scenario',
      parameters,
      projectedResult: {
        revenue: 0,
        expenses: 0,
        result: 0,
        resultDelta: 0,
        resultDeltaPct: 0,
        marginPct: 0,
      },
      accountImpacts: [],
      sensitivityRanking: [],
    };
  }

  // Calculate baseline
  const baselineRevenue = Math.abs(
    data.by_account
      .filter(a => a.account >= 8000 && a.account <= 8999)
      .reduce((sum, a) => sum + a.amount_curr, 0),
  );

  const baselineExpenses = Math.abs(
    data.by_account
      .filter(a => a.account < 8000 && a.account >= 2000)
      .reduce((sum, a) => sum + a.amount_curr, 0),
  );

  const baselineResult = baselineRevenue - baselineExpenses;

  // Build a map of current account values
  const accountValues: Record<number, number> = {};
  data.by_account.forEach(a => {
    accountValues[a.account] = a.amount_curr;
  });

  // Apply parameter changes
  const projectedAccountValues: Record<number, number> = { ...accountValues };

  parameters.forEach(param => {
    if (param.currentValue === param.baseValue) {
      // No change
      return;
    }

    // Calculate the change ratio
    const changeRatio = param.currentValue / param.baseValue;

    // Apply to affected accounts
    param.affectedAccounts.forEach(accountNum => {
      if (projectedAccountValues[accountNum] !== undefined) {
        projectedAccountValues[accountNum] *= changeRatio;
      }
    });
  });

  // Recalculate projected revenue and expenses
  let projectedRevenue = 0;
  let projectedExpenses = 0;

  data.by_account.forEach(a => {
    const projectedValue = projectedAccountValues[a.account] || a.amount_curr;
    if (a.account >= 8000 && a.account <= 8999) {
      projectedRevenue += Math.abs(projectedValue);
    } else if (a.account >= 2000 && a.account < 8000) {
      projectedExpenses += Math.abs(projectedValue);
    }
  });

  const projectedResultValue = projectedRevenue - projectedExpenses;
  const resultDelta = projectedResultValue - baselineResult;
  const resultDeltaPct = baselineResult !== 0 ? (resultDelta / baselineResult) * 100 : 0;
  const marginPct = projectedRevenue > 0 ? ((projectedRevenue - projectedExpenses) / projectedRevenue) * 100 : 0;

  // Calculate account impacts
  const accountImpacts = data.by_account.map(a => {
    const baseline = a.amount_curr;
    const projected = projectedAccountValues[a.account] || baseline;
    const delta = projected - baseline;
    const deltaPct = baseline !== 0 ? (delta / baseline) * 100 : 0;

    return {
      account: a.account,
      account_name: a.account_name,
      baseline,
      projected,
      delta,
      deltaPct,
    };
  });

  // Calculate sensitivity ranking
  const sensitivityRanking = calculateSensitivity(data, parameters);

  // Calculate break-even analysis
  const breakEvenAnalysis = calculateBreakEven(
    projectedRevenue,
    projectedExpenses,
    baselineResult,
  );

  return {
    name: 'Simulation',
    parameters,
    projectedResult: {
      revenue: projectedRevenue,
      expenses: projectedExpenses,
      result: projectedResultValue,
      resultDelta,
      resultDeltaPct,
      marginPct,
    },
    accountImpacts: accountImpacts
      .filter(a => a.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    breakEvenAnalysis,
    sensitivityRanking,
  };
}

/**
 * Calculate sensitivity: how much does each parameter impact the result per 1% change
 */
export function calculateSensitivity(
  data: AnalysisResult,
  parameters: ScenarioParameter[],
): ScenarioResult['sensitivityRanking'] {
  if (!data || !data.by_account) {
    return [];
  }

  // Calculate baseline
  const baselineResult = calculateBaselineResult(data);

  // For each parameter, calculate impact per 1% change
  const sensitivity = parameters.map(param => {
    // Create a small change (1%)
    const testParams = parameters.map(p => ({
      ...p,
      currentValue: p.id === param.id ? p.baseValue * 1.01 : p.currentValue,
    }));

    const scenarioWithChange = simulateScenario(data, testParams);
    const newResult = scenarioWithChange.projectedResult.result;

    // Impact per 1% change
    const impactPerPercent = newResult - baselineResult;

    return {
      parameterId: param.id,
      parameterName: param.name,
      impactPerPercent,
    };
  });

  // Sort by absolute impact
  return sensitivity
    .sort((a, b) => Math.abs(b.impactPerPercent) - Math.abs(a.impactPerPercent))
    .slice(0, 6); // Top 6
}

/**
 * Get preset scenarios
 */
export function getPresets(data: AnalysisResult): ScenarioPreset[] {
  const params = createDefaultParameters(data);

  // Create a map for easier lookup
  const paramMap: Record<string, ScenarioParameter> = {};
  params.forEach(p => {
    paramMap[p.id] = p;
  });

  return [
    {
      id: 'optimistic',
      name: 'Optimistisch',
      description: 'Umsatzwachstum +10%, Kostensenkung -5%',
      icon: '📈',
      parameters: [
        {
          id: 'umsatzentwicklung',
          value: paramMap.umsatzentwicklung
            ? paramMap.umsatzentwicklung.baseValue * 1.1
            : 0,
        },
        {
          id: 'personalkosten',
          value: paramMap.personalkosten
            ? paramMap.personalkosten.baseValue * 0.95
            : 0,
        },
        {
          id: 'materialkosten',
          value: paramMap.materialkosten
            ? paramMap.materialkosten.baseValue * 0.95
            : 0,
        },
        {
          id: 'sonstige_aufwendungen',
          value: paramMap.sonstige_aufwendungen
            ? paramMap.sonstige_aufwendungen.baseValue * 0.95
            : 0,
        },
      ],
    },
    {
      id: 'pessimistic',
      name: 'Pessimistisch',
      description: 'Umsatzrückgang -15%, Kostensteigerung +10%',
      icon: '📉',
      parameters: [
        {
          id: 'umsatzentwicklung',
          value: paramMap.umsatzentwicklung
            ? paramMap.umsatzentwicklung.baseValue * 0.85
            : 0,
        },
        {
          id: 'personalkosten',
          value: paramMap.personalkosten
            ? paramMap.personalkosten.baseValue * 1.1
            : 0,
        },
        {
          id: 'materialkosten',
          value: paramMap.materialkosten
            ? paramMap.materialkosten.baseValue * 1.1
            : 0,
        },
        {
          id: 'energiekosten',
          value: paramMap.energiekosten
            ? paramMap.energiekosten.baseValue * 1.2
            : 0,
        },
      ],
    },
    {
      id: 'cost_reduction',
      name: 'Kostensenkung',
      description: 'Umsatz stabil, Personalkosten -20%, Material -15%',
      icon: '✂️',
      parameters: [
        {
          id: 'personalkosten',
          value: paramMap.personalkosten
            ? paramMap.personalkosten.baseValue * 0.8
            : 0,
        },
        {
          id: 'materialkosten',
          value: paramMap.materialkosten
            ? paramMap.materialkosten.baseValue * 0.85
            : 0,
        },
        {
          id: 'sonstige_aufwendungen',
          value: paramMap.sonstige_aufwendungen
            ? paramMap.sonstige_aufwendungen.baseValue * 0.9
            : 0,
        },
      ],
    },
    {
      id: 'growth',
      name: 'Wachstum',
      description: 'Umsatz +25%, Personal +10%, Material +15%',
      icon: '🚀',
      parameters: [
        {
          id: 'umsatzentwicklung',
          value: paramMap.umsatzentwicklung
            ? paramMap.umsatzentwicklung.baseValue * 1.25
            : 0,
        },
        {
          id: 'personalkosten',
          value: paramMap.personalkosten
            ? paramMap.personalkosten.baseValue * 1.1
            : 0,
        },
        {
          id: 'materialkosten',
          value: paramMap.materialkosten
            ? paramMap.materialkosten.baseValue * 1.15
            : 0,
        },
      ],
    },
    {
      id: 'recession',
      name: 'Rezession',
      description: 'Umsatz -20%, Kosten +5% (starre Kosten)',
      icon: '⚠️',
      parameters: [
        {
          id: 'umsatzentwicklung',
          value: paramMap.umsatzentwicklung
            ? paramMap.umsatzentwicklung.baseValue * 0.8
            : 0,
        },
        {
          id: 'personalkosten',
          value: paramMap.personalkosten
            ? paramMap.personalkosten.baseValue * 1.05
            : 0,
        },
        {
          id: 'materialkosten',
          value: paramMap.materialkosten
            ? paramMap.materialkosten.baseValue * 1.05
            : 0,
        },
        {
          id: 'energiekosten',
          value: paramMap.energiekosten
            ? paramMap.energiekosten.baseValue * 1.1
            : 0,
        },
      ],
    },
  ];
}

// ============================================
// Helper Functions
// ============================================

function calculateBaselineResult(data: AnalysisResult): number {
  const revenue = Math.abs(
    data.by_account
      .filter(a => a.account >= 8000 && a.account <= 8999)
      .reduce((sum, a) => sum + a.amount_curr, 0),
  );

  const expenses = Math.abs(
    data.by_account
      .filter(a => a.account < 8000 && a.account >= 2000)
      .reduce((sum, a) => sum + a.amount_curr, 0),
  );

  return revenue - expenses;
}

function calculateBreakEven(
  revenue: number,
  expenses: number,
  currentResult: number,
): ScenarioResult['breakEvenAnalysis'] {
  const currentGap = revenue - expenses;

  // If already profitable and would become unprofitable with small increase
  const variableCostRatio = revenue > 0 ? expenses / revenue : 0;
  const fixedCosts = expenses * (1 - variableCostRatio * 0.7); // Assume 70% are variable

  // Revenue needed to break even (assuming 70% variable cost ratio)
  const revenueNeeded = fixedCosts > 0 ? fixedCosts / (1 - variableCostRatio) : revenue;

  // Cost reduction needed to break even at current revenue
  const costReductionNeeded = Math.max(0, expenses - revenue);

  // Distance to break-even
  const currentDistance = revenue - fixedCosts;

  return {
    revenueNeeded: Math.max(0, revenueNeeded - revenue),
    costReductionNeeded,
    currentDistance,
  };
}
