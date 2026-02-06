import { Booking } from '@/lib/types';
import {
  CostType,
  CostCenter,
  CostCategory,
  CostAccountDetail,
  OverheadRates,
  AllocationEntry,
  BABResult,
  BABSummary,
  COST_TYPE_LABELS,
} from '@/lib/bab-types';

function classifyAccountByCostType(account: number): CostType | null {
  if (account >= 3000 && account <= 3999) {
    return 'direct_material';
  }
  if (account >= 4000 && account <= 4199) {
    return 'direct_labor';
  }
  if (account >= 4200 && account <= 4999) {
    return 'manufacturing_overhead';
  }
  if (account >= 6000 && account <= 6499) {
    return 'admin_overhead';
  }
  if (account >= 6500 && account <= 6999) {
    return 'sales_overhead';
  }
  return null;
}

function isDirectCost(costType: CostType): boolean {
  return costType === 'direct_material' || costType === 'direct_labor';
}

function groupBookingsByCostType(
  bookings: Booking[]
): Map<CostType, Booking[]> {
  const groups = new Map<CostType, Booking[]>();

  bookings.forEach((booking) => {
    const costType = classifyAccountByCostType(booking.account);
    if (!costType) return;

    if (!groups.has(costType)) {
      groups.set(costType, []);
    }
    groups.get(costType)!.push(booking);
  });

  return groups;
}

function groupBookingsByCostCenter(
  bookings: Booking[]
): Map<string, Booking[]> {
  const groups = new Map<string, Booking[]>();

  bookings.forEach((booking) => {
    const costCenter = booking.cost_center || 'Allgemein';
    if (!groups.has(costCenter)) {
      groups.set(costCenter, []);
    }
    groups.get(costCenter)!.push(booking);
  });

  return groups;
}

function calculateSumByBookings(bookings: Booking[]): number {
  return bookings.reduce((sum, booking) => sum + booking.amount, 0);
}

function buildCostCategories(
  bookingsByType: Map<CostType, Booking[]>
): CostCategory[] {
  const categories: CostCategory[] = [];

  const costTypes: CostType[] = [
    'direct_material',
    'direct_labor',
    'manufacturing_overhead',
    'admin_overhead',
    'sales_overhead',
  ];

  costTypes.forEach((costType) => {
    const bookings = bookingsByType.get(costType) || [];
    const totalAmount = calculateSumByBookings(bookings);
    const isDirect = isDirectCost(costType);
    const directAmount = isDirect ? totalAmount : 0;
    const overheadAmount = !isDirect ? totalAmount : 0;

    const accounts: CostAccountDetail[] = [];
    const accountMap = new Map<
      number,
      { name: string; amount: number; costCenters: Set<string> }
    >();

    bookings.forEach((booking) => {
      if (!accountMap.has(booking.account)) {
        accountMap.set(booking.account, {
          name: booking.account_name,
          amount: 0,
          costCenters: new Set(),
        });
      }
      const entry = accountMap.get(booking.account)!;
      entry.amount += booking.amount;
      if (booking.cost_center) {
        entry.costCenters.add(booking.cost_center);
      }
    });

    accountMap.forEach((entry, account) => {
      accounts.push({
        account,
        name: entry.name,
        amount: entry.amount,
        costCenter: entry.costCenters.size === 1
          ? Array.from(entry.costCenters)[0]
          : undefined,
      });
    });

    accounts.sort((a, b) => b.amount - a.amount);

    categories.push({
      type: costType,
      label: COST_TYPE_LABELS[costType],
      totalAmount,
      directAmount,
      overheadAmount,
      accounts,
    });
  });

  return categories;
}

function calculateOverheadRates(
  categories: CostCategory[]
): OverheadRates {
  const directMaterial =
    categories.find((c) => c.type === 'direct_material')?.totalAmount || 0;
  const directLabor =
    categories.find((c) => c.type === 'direct_labor')?.totalAmount || 0;
  const manufacturing =
    categories.find((c) => c.type === 'manufacturing_overhead')
      ?.totalAmount || 0;
  const admin =
    categories.find((c) => c.type === 'admin_overhead')?.totalAmount || 0;
  const sales =
    categories.find((c) => c.type === 'sales_overhead')?.totalAmount || 0;

  const materialOverheadRate =
    directMaterial > 0 ? (manufacturing / directMaterial) * 100 : 0;
  const productionOverheadRate =
    directLabor > 0 ? (manufacturing / directLabor) * 100 : 0;
  const adminOverheadRate =
    (directMaterial + directLabor) > 0
      ? (admin / (directMaterial + directLabor)) * 100
      : 0;
  const salesOverheadRate =
    (directMaterial + directLabor) > 0
      ? (sales / (directMaterial + directLabor)) * 100
      : 0;

  return {
    materialOverheadRate,
    productionOverheadRate,
    adminOverheadRate,
    salesOverheadRate,
  };
}

function buildAllocationMatrix(
  bookings: Booking[],
  costCenters: CostCenter[]
): AllocationEntry[] {
  const allocations: AllocationEntry[] = [];
  const bookingsByType = groupBookingsByCostType(bookings);

  const costTypes: CostType[] = [
    'direct_material',
    'direct_labor',
    'manufacturing_overhead',
    'admin_overhead',
    'sales_overhead',
  ];

  costTypes.forEach((costType) => {
    const typeBookings = bookingsByType.get(costType) || [];

    costCenters.forEach((costCenter) => {
      const centerBookings = typeBookings.filter(
        (b) => (b.cost_center || 'Allgemein') === costCenter.id
      );
      const amount = calculateSumByBookings(centerBookings);

      if (amount !== 0) {
        allocations.push({
          costCenter: costCenter.id,
          costType,
          amount,
        });
      }
    });
  });

  return allocations;
}

function buildCostCenters(
  bookings: Booking[],
  categories: CostCategory[]
): CostCenter[] {
  const bookingsByCostCenter = groupBookingsByCostCenter(bookings);
  const costCenters: CostCenter[] = [];

  bookingsByCostCenter.forEach((centerBookings, costCenterId) => {
    const directCosts = centerBookings
      .filter((b) => {
        const type = classifyAccountByCostType(b.account);
        return type && isDirectCost(type);
      })
      .reduce((sum, b) => sum + b.amount, 0);

    const costCenter: CostCenter = {
      id: costCenterId,
      name: costCenterId,
      type: costCenterId === 'Allgemein' ? 'auxiliary' : 'main',
      directCosts,
      allocatedCosts: 0,
      totalCosts: directCosts,
    };

    costCenters.push(costCenter);
  });

  costCenters.sort((a, b) =>
    a.id === 'Allgemein' ? 1 : b.id === 'Allgemein' ? -1 : a.id.localeCompare(b.id)
  );

  return costCenters;
}

function generateBABInsights(result: BABResult): string[] {
  const insights: string[] = [];

  const highestOverhead = Object.entries(result.summary.costPerCostCenter).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (highestOverhead) {
    insights.push(
      `Kostenstelle "${highestOverhead[0]}" trägt die höchsten Gesamtkosten mit ${new Intl.NumberFormat(
        'de-DE',
        {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }
      ).format(highestOverhead[1])}.`
    );
  }

  const avgOverheadRate =
    (result.overheadRates.materialOverheadRate +
      result.overheadRates.productionOverheadRate +
      result.overheadRates.adminOverheadRate +
      result.overheadRates.salesOverheadRate) /
    4;
  insights.push(
    `Der durchschnittliche Gemeinkostensatz liegt bei ${avgOverheadRate.toFixed(
      1
    )}%. Fertigungsgemeinkosten betragen ${result.overheadRates.productionOverheadRate.toFixed(
      1
    )}% der Fertigungslöhne.`
  );

  const directCostRatio =
    (result.summary.totalDirectCosts / result.summary.totalCosts) * 100;
  const overheadCostRatio =
    (result.summary.totalOverheadCosts / result.summary.totalCosts) * 100;
  insights.push(
    `Einzelkosten machen ${directCostRatio.toFixed(
      1
    )}% der Gesamtkosten aus, Gemeinkosten ${overheadCostRatio.toFixed(1)}%.`
  );

  const materialCategory = result.costCategories.find(
    (c) => c.type === 'direct_material'
  );
  if (materialCategory && materialCategory.totalAmount > 0) {
    const materialRatio =
      (materialCategory.totalAmount / result.summary.totalDirectCosts) * 100;
    insights.push(
      `Materialeinzelkosten bilden ${materialRatio.toFixed(
        1
      )}% der gesamten Einzelkosten. Der Materialgemeinkostensatz beträgt ${result.overheadRates.materialOverheadRate.toFixed(
        1
      )}%.`
    );
  }

  const laborCategory = result.costCategories.find(
    (c) => c.type === 'direct_labor'
  );
  if (laborCategory && laborCategory.totalAmount > 0) {
    const laborRatio =
      (laborCategory.totalAmount / result.summary.totalDirectCosts) * 100;
    insights.push(
      `Fertigungslöhne betragen ${laborRatio.toFixed(
        1
      )}% der Einzelkosten. Die Fertigungsgemeinkostenquote liegt bei ${result.overheadRates.productionOverheadRate.toFixed(
        1
      )}%.`
    );
  }

  const adminAndSalesRatio =
    ((result.overheadRates.adminOverheadRate +
      result.overheadRates.salesOverheadRate) /
      2) *
    result.summary.totalDirectCosts;
  if (adminAndSalesRatio > 0) {
    insights.push(
      `Verwaltungs- und Vertriebsgemeinkosten zusammen machen ${(
        (adminAndSalesRatio / result.summary.totalCosts) *
        100
      ).toFixed(1)}% aus. Die Verwaltungskostenquote beträgt ${result.overheadRates.adminOverheadRate.toFixed(
        1
      )}%.`
    );
  }

  return insights;
}

export function calculateBAB(bookings: Booking[]): BABResult {
  if (bookings.length === 0) {
    return {
      costCenters: [],
      costCategories: [],
      overheadRates: {
        materialOverheadRate: 0,
        productionOverheadRate: 0,
        adminOverheadRate: 0,
        salesOverheadRate: 0,
      },
      allocationMatrix: [],
      summary: {
        totalDirectCosts: 0,
        totalOverheadCosts: 0,
        totalCosts: 0,
        overheadRatio: 0,
        costPerCostCenter: {},
      },
      insights: [],
    };
  }

  const costCategories = buildCostCategories(groupBookingsByCostType(bookings));
  const costCenters = buildCostCenters(bookings, costCategories);
  const overheadRates = calculateOverheadRates(costCategories);
  const allocationMatrix = buildAllocationMatrix(bookings, costCenters);

  const totalDirectCosts = costCategories
    .filter((c) => isDirectCost(c.type))
    .reduce((sum, c) => sum + c.totalAmount, 0);

  const totalOverheadCosts = costCategories
    .filter((c) => !isDirectCost(c.type))
    .reduce((sum, c) => sum + c.totalAmount, 0);

  const totalCosts = totalDirectCosts + totalOverheadCosts;
  const overheadRatio =
    totalDirectCosts > 0 ? (totalOverheadCosts / totalDirectCosts) * 100 : 0;

  const costPerCostCenter: Record<string, number> = {};
  costCenters.forEach((cc) => {
    const centerAllocations = allocationMatrix.filter(
      (a) => a.costCenter === cc.id
    );
    const centerTotal = centerAllocations.reduce((sum, a) => sum + a.amount, 0);
    costPerCostCenter[cc.id] = centerTotal;
  });

  const summary: BABSummary = {
    totalDirectCosts,
    totalOverheadCosts,
    totalCosts,
    overheadRatio,
    costPerCostCenter,
  };

  const insights = generateBABInsights({
    costCenters,
    costCategories,
    overheadRates,
    allocationMatrix,
    summary,
    insights: [],
  });

  return {
    costCenters,
    costCategories,
    overheadRates,
    allocationMatrix,
    summary,
    insights,
  };
}
