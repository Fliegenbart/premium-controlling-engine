import { Booking, LabKPIs } from './types';

// SKR03/SKR04 account ranges
const REVENUE_ACCOUNTS = { min: 4000, max: 4999 };    // Erlöse
const PERSONNEL_ACCOUNTS = { min: 6000, max: 6999 }; // Personalkosten
const REAGENT_ACCOUNTS = [                            // Reagenzien/Material
  { min: 3000, max: 3999 },  // Wareneinsatz
  { min: 4400, max: 4499 },  // Fremdleistungen
];

function isInRange(account: number, range: { min: number; max: number }): boolean {
  return account >= range.min && account <= range.max;
}

function isReagentAccount(account: number): boolean {
  return REAGENT_ACCOUNTS.some(range => isInRange(account, range));
}

function sumByAccountRange(
  bookings: Booking[],
  ranges: { min: number; max: number }[]
): number {
  return bookings
    .filter(b => ranges.some(range => isInRange(b.account, range)))
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
}

export function calculateLabKPIs(
  prevBookings: Booking[],
  currBookings: Booking[],
  testCountPrev?: number,
  testCountCurr?: number
): LabKPIs {
  // Revenue (positive amounts in revenue accounts)
  const revenuePrev = prevBookings
    .filter(b => isInRange(b.account, REVENUE_ACCOUNTS) && b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
  const revenueCurr = currBookings
    .filter(b => isInRange(b.account, REVENUE_ACCOUNTS) && b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);

  // Total costs (all expense accounts, typically 5000+)
  const totalCostsPrev = prevBookings
    .filter(b => b.account >= 5000 && b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const totalCostsCurr = currBookings
    .filter(b => b.account >= 5000 && b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);

  // Personnel costs
  const personnelPrev = sumByAccountRange(prevBookings.filter(b => b.amount < 0), [PERSONNEL_ACCOUNTS]);
  const personnelCurr = sumByAccountRange(currBookings.filter(b => b.amount < 0), [PERSONNEL_ACCOUNTS]);

  // Reagent costs
  const reagentPrev = prevBookings
    .filter(b => isReagentAccount(b.account) && b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const reagentCurr = currBookings
    .filter(b => isReagentAccount(b.account) && b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);

  // Calculate ratios (avoid division by zero)
  const personnelRatioPrev = revenuePrev > 0 ? (personnelPrev / revenuePrev) * 100 : 0;
  const personnelRatioCurr = revenueCurr > 0 ? (personnelCurr / revenueCurr) * 100 : 0;
  const reagentRatioPrev = revenuePrev > 0 ? (reagentPrev / revenuePrev) * 100 : 0;
  const reagentRatioCurr = revenueCurr > 0 ? (reagentCurr / revenueCurr) * 100 : 0;

  // Cost per test (if test counts provided)
  const costPerTestPrev = testCountPrev && testCountPrev > 0
    ? totalCostsPrev / testCountPrev
    : undefined;
  const costPerTestCurr = testCountCurr && testCountCurr > 0
    ? totalCostsCurr / testCountCurr
    : undefined;

  return {
    revenue_prev: revenuePrev,
    revenue_curr: revenueCurr,
    revenue_delta: revenueCurr - revenuePrev,
    revenue_delta_pct: revenuePrev > 0
      ? ((revenueCurr - revenuePrev) / revenuePrev) * 100
      : 0,
    total_costs_prev: totalCostsPrev,
    total_costs_curr: totalCostsCurr,
    personnel_costs_prev: personnelPrev,
    personnel_costs_curr: personnelCurr,
    personnel_ratio_prev: personnelRatioPrev,
    personnel_ratio_curr: personnelRatioCurr,
    reagent_costs_prev: reagentPrev,
    reagent_costs_curr: reagentCurr,
    reagent_ratio_prev: reagentRatioPrev,
    reagent_ratio_curr: reagentRatioCurr,
    test_count_prev: testCountPrev,
    test_count_curr: testCountCurr,
    cost_per_test_prev: costPerTestPrev,
    cost_per_test_curr: costPerTestCurr,
  };
}

// Format percentage with trend indicator
export function formatKPIChange(current: number, previous: number): {
  value: string;
  trend: 'up' | 'down' | 'neutral';
  isPositive: boolean;
} {
  const delta = current - previous;
  const trend = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'neutral';

  // For cost ratios, down is positive; for revenue, up is positive
  return {
    value: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
    trend,
    isPositive: trend === 'neutral',
  };
}
