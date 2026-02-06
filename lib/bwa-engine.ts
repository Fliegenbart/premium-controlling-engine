import { Booking } from '@/lib/types';
import {
  BWALine,
  BWAResult,
  BWASummary,
  BWAAccountDetail,
  BWA_STRUCTURE,
  BWALineType,
} from '@/lib/bwa-types';

function isAccountInRange(account: number, ranges: { min: number; max: number }[]): boolean {
  return ranges.some((range) => account >= range.min && account <= range.max);
}

function groupBookingsByAccount(bookings: Booking[]): Map<number, BWAAccountDetail> {
  const grouped = new Map<number, BWAAccountDetail>();

  for (const booking of bookings) {
    const key = booking.account;
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.amount += booking.amount;
    } else {
      grouped.set(key, {
        account: booking.account,
        name: booking.account_name,
        amount: booking.amount,
      });
    }
  }

  return grouped;
}

function calculateBWALine(
  structureItem: any,
  currentGrouped: Map<number, BWAAccountDetail>,
  prevGrouped?: Map<number, BWAAccountDetail>,
  totalRevenue: number = 1
): BWALine {
  let amount = 0;
  let prevAmount = 0;
  const children: BWAAccountDetail[] = [];

  for (const [account, detail] of currentGrouped.entries()) {
    if (isAccountInRange(account, structureItem.accountRanges)) {
      amount += detail.amount;
      const prevDetail = prevGrouped?.get(account);
      if (prevDetail) {
        prevAmount += prevDetail.amount;
      }
      children.push({
        account: detail.account,
        name: detail.name,
        amount: detail.amount,
        prevAmount: prevDetail?.amount,
      });
    }
  }

  const delta = prevAmount !== 0 ? amount - prevAmount : 0;
  const deltaPct = prevAmount !== 0 ? (delta / Math.abs(prevAmount)) * 100 : 0;

  return {
    type: structureItem.type,
    label: structureItem.label,
    amount,
    prevAmount: prevAmount || undefined,
    percentOfRevenue: totalRevenue !== 0 ? (amount / totalRevenue) * 100 : 0,
    delta: prevAmount !== 0 ? delta : undefined,
    deltaPct: prevAmount !== 0 ? deltaPct : undefined,
    isSubtotal: structureItem.isSubtotal || false,
    children: children.length > 0 ? children : undefined,
  };
}

export function calculateBWA(
  bookings: Booking[],
  prevBookings?: Booking[],
  config?: { period?: string }
): BWAResult {
  const currentGrouped = groupBookingsByAccount(bookings);
  const prevGrouped = prevBookings ? groupBookingsByAccount(prevBookings) : undefined;

  const lines: BWALine[] = [];
  let revenue = 0;
  let grossProfit = 0;
  let operatingResult = 0;
  let ebitda = 0;
  let depreciation = 0;
  let ebit = 0;
  let interest = 0;
  let taxes = 0;
  let netResult = 0;

  const structureItems = BWA_STRUCTURE.filter((item) => !item.isSubtotal);

  for (const item of structureItems) {
    const line = calculateBWALine(item, currentGrouped, prevGrouped, revenue);
    lines.push(line);

    if (item.type === 'revenue') {
      revenue += line.amount;
    } else if (item.type === 'material') {
      revenue -= line.amount;
    }
  }

  const revenueFinal = revenue;

  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].type === 'revenue' ||
      lines[i].type === 'material'
    ) {
      revenue += lines[i].type === 'revenue' ? lines[i].amount : -lines[i].amount;
    }
  }

  revenue = revenueFinal;

  lines.forEach((line) => {
    if (line.type === 'revenue') {
      revenue = Math.max(revenue, line.amount);
    }
  });

  const revenueValue = Array.from(currentGrouped.values())
    .filter((detail) => detail.account >= 8000 && detail.account <= 8799)
    .reduce((sum, detail) => sum + detail.amount, 0);

  const materialValue = Array.from(currentGrouped.values())
    .filter(
      (detail) =>
        (detail.account >= 3000 && detail.account <= 3999) ||
        (detail.account >= 8800 && detail.account <= 8999)
    )
    .reduce((sum, detail) => sum + detail.amount, 0);

  const personnelValue = Array.from(currentGrouped.values())
    .filter((detail) => detail.account >= 4000 && detail.account <= 4199)
    .reduce((sum, detail) => sum + detail.amount, 0);

  const deprecValue = Array.from(currentGrouped.values())
    .filter((detail) => detail.account >= 7000 && detail.account <= 7099)
    .reduce((sum, detail) => sum + detail.amount, 0);

  const interestValue = Array.from(currentGrouped.values())
    .filter((detail) => detail.account >= 7300 && detail.account <= 7399)
    .reduce((sum, detail) => sum + detail.amount, 0);

  const taxesValue = Array.from(currentGrouped.values())
    .filter((detail) => detail.account >= 7600 && detail.account <= 7699)
    .reduce((sum, detail) => sum + detail.amount, 0);

  const grossMargin = revenueValue - materialValue;
  const operatingResultValue = grossMargin - personnelValue - Array.from(currentGrouped.values())
    .filter(
      (detail) =>
        (detail.account >= 4200 && detail.account <= 4999) ||
        (detail.account >= 6000 && detail.account <= 6999)
    )
    .reduce((sum, detail) => sum + detail.amount, 0);

  const ebitdaValue = operatingResultValue + deprecValue;
  const ebitValue = operatingResultValue;
  const netResultValue = ebitValue - interestValue - taxesValue;

  const summary = calculateBWASummary(lines, {
    revenue: revenueValue,
    grossMargin,
    ebitda: ebitdaValue,
    ebit: ebitValue,
    netResult: netResultValue,
  });

  const insights = generateBWAInsights({
    lines,
    summary,
    insights: [],
    period: config?.period || 'Aktuell',
  });

  return {
    lines,
    summary,
    insights,
    period: config?.period || 'Aktuell',
    prevPeriod: prevBookings ? 'Vorjahr' : undefined,
  };
}

export function calculateBWASummary(
  lines: BWALine[],
  overrides?: Partial<BWASummary>
): BWASummary {
  const revenue =
    overrides?.revenue ||
    lines
      .filter((l) => l.type === 'revenue')
      .reduce((sum, line) => sum + line.amount, 0);

  const material =
    lines
      .filter((l) => l.type === 'material')
      .reduce((sum, line) => sum + line.amount, 0) || 0;

  const personnel =
    lines
      .filter((l) => l.type === 'personnel')
      .reduce((sum, line) => sum + line.amount, 0) || 0;

  const depreciation =
    lines
      .filter((l) => l.type === 'depreciation')
      .reduce((sum, line) => sum + line.amount, 0) || 0;

  const interest =
    lines
      .filter((l) => l.type === 'interest')
      .reduce((sum, line) => sum + line.amount, 0) || 0;

  const taxes =
    lines
      .filter((l) => l.type === 'taxes')
      .reduce((sum, line) => sum + line.amount, 0) || 0;

  const grossMargin = overrides?.grossMargin || revenue - material;
  const operatingExpenses = personnel + Array.from(lines)
    .filter((l) =>
      [
        'room',
        'insurance',
        'vehicle',
        'advertising',
        'travel',
        'other_operating',
      ].includes(l.type)
    )
    .reduce((sum, line) => sum + line.amount, 0);

  const operatingResult = grossMargin - operatingExpenses;
  const ebitda = overrides?.ebitda || operatingResult + depreciation;
  const ebit = overrides?.ebit || ebitda - depreciation;
  const netResult = overrides?.netResult || ebit - interest - taxes;

  const materialQuota = revenue !== 0 ? (material / revenue) * 100 : 0;
  const personnelQuota = revenue !== 0 ? (personnel / revenue) * 100 : 0;
  const ebitdaMargin = revenue !== 0 ? (ebitda / revenue) * 100 : 0;
  const ebitMargin = revenue !== 0 ? (ebit / revenue) * 100 : 0;
  const netMargin = revenue !== 0 ? (netResult / revenue) * 100 : 0;

  return {
    revenue,
    materialQuota,
    grossMargin,
    personnelQuota,
    ebitda,
    ebitdaMargin,
    ebit,
    ebitMargin,
    netResult,
    netMargin,
  };
}

export function generateBWAInsights(result: BWAResult): string[] {
  const { summary } = result;
  const insights: string[] = [];

  const materialQuota = summary.materialQuota;
  if (materialQuota > 50) {
    insights.push(
      `Die Materialquote beträgt ${materialQuota.toFixed(1)}% des Umsatzes. Hier könnte Optimierungspotenzial liegen.`
    );
  } else if (materialQuota < 30) {
    insights.push(
      `Mit einer Materialquote von ${materialQuota.toFixed(1)}% haben Sie eine günstige Kostenstruktur beim Materialaufwand.`
    );
  }

  const personnelQuota = summary.personnelQuota;
  if (personnelQuota > 40) {
    insights.push(
      `Die Personalkosten machen ${personnelQuota.toFixed(1)}% des Umsatzes aus. Dies ist ein wesentlicher Kostenfaktor.`
    );
  } else if (personnelQuota < 20) {
    insights.push(
      `Mit einer Personalquote von ${personnelQuota.toFixed(1)}% haben Sie eine effiziente Personalausstattung.`
    );
  }

  const ebitdaMargin = summary.ebitdaMargin;
  if (ebitdaMargin < 10) {
    insights.push(
      `Ihre EBITDA-Marge liegt bei ${ebitdaMargin.toFixed(1)}%. Achten Sie auf die Gesamtkostenstruktur.`
    );
  } else if (ebitdaMargin > 25) {
    insights.push(
      `Mit einer EBITDA-Marge von ${ebitdaMargin.toFixed(1)}% zeigt Ihr Unternehmen starke operative Rentabilität.`
    );
  }

  const netMargin = summary.netMargin;
  if (netMargin > 0) {
    insights.push(
      `Die Netto-Marge beträgt ${netMargin.toFixed(1)}%. Das Unternehmen ist profitabel.`
    );
  } else {
    insights.push(
      `Die Netto-Marge ist negativ (${netMargin.toFixed(1)}%). Überprüfen Sie Ihre Kosten- und Preisstruktur.`
    );
  }

  const grossMarginPct = (summary.grossMargin / summary.revenue) * 100;
  if (grossMarginPct > 0) {
    insights.push(
      `Ihr Rohertrag wird durch Material- und Bestandsveränderungen beeinflusst. Überwachen Sie diese regelmäßig.`
    );
  }

  return insights;
}
