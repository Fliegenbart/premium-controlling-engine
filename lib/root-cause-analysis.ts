/**
 * Advanced Root Cause Analysis Engine
 *
 * Automatically decomposes variances by:
 * - Clustering similar transactions
 * - Analyzing dimensional drivers (vendor, cost_center, month, text patterns)
 * - Identifying new/removed items and volume/price changes
 * - Computing contribution percentages
 * - Generating AI narratives (optional)
 */

import { Booking, TopBooking } from './types';
import { getHybridLLMService } from './llm/hybrid-service';

export interface RootCause {
  id: string;
  account: number;
  account_name: string;
  totalVariance: number;
  // Clustering results
  clusters: BookingCluster[];
  // Dimensional drivers
  drivers: VarianceDriver[];
  // AI-generated narrative
  narrative?: string;
  // Confidence score
  confidence: number;
}

export interface BookingCluster {
  label: string;
  type:
    | 'vendor_change'
    | 'volume_change'
    | 'price_change'
    | 'new_cost'
    | 'removed_cost'
    | 'timing_shift'
    | 'one_time';
  bookings: TopBooking[];
  totalAmount: number;
  contributionPct: number;
  description: string;
}

export interface VarianceDriver {
  dimension: string; // 'vendor', 'cost_center', 'month', 'text_pattern'
  key: string;
  prevAmount: number;
  currAmount: number;
  contribution: number;
  contributionPct: number;
}

interface TextCluster {
  representative: string;
  texts: string[];
  bookings: { prev: Booking[]; curr: Booking[] };
}

interface DimensionAnalysis {
  dimension: string;
  key: string;
  prevAmount: number;
  currAmount: number;
  prevCount: number;
  currCount: number;
  contribution: number;
}

/**
 * Extract text patterns for clustering
 */
function extractTextPattern(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5); // First 5 meaningful words
}

/**
 * Calculate text similarity using simple Jaccard index
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const pattern1 = new Set(extractTextPattern(text1));
  const pattern2 = new Set(extractTextPattern(text2));

  if (pattern1.size === 0 && pattern2.size === 0) return 1;
  if (pattern1.size === 0 || pattern2.size === 0) return 0;

  const pattern1Array = Array.from(pattern1);
  const pattern2Array = Array.from(pattern2);
  const intersection = pattern1Array.filter((x) => pattern2.has(x)).length;
  const union = new Set([...pattern1Array, ...pattern2Array]).size;

  return intersection / union;
}

/**
 * Cluster bookings by text similarity
 */
function clusterBookingsByText(bookings: Booking[]): TextCluster[] {
  const clusters: TextCluster[] = [];
  const clustered = new Set<string>();

  for (const booking of bookings) {
    if (clustered.has(booking.document_no)) continue;

    const cluster: TextCluster = {
      representative: booking.text,
      texts: [booking.text],
      bookings: { prev: [], curr: [] },
    };

    // Find similar bookings
    for (const other of bookings) {
      if (other.document_no === booking.document_no) {
        cluster.bookings.curr.push(other);
        continue;
      }

      if (clustered.has(other.document_no)) continue;

      const similarity = calculateTextSimilarity(booking.text, other.text);
      if (similarity > 0.5) {
        cluster.texts.push(other.text);
        cluster.bookings.curr.push(other);
        clustered.add(other.document_no);
      }
    }

    clusters.push(cluster);
    clustered.add(booking.document_no);
  }

  return clusters;
}

/**
 * Analyze variance along a single dimension
 */
function analyzeDimension(
  prevBookings: Booking[],
  currBookings: Booking[],
  account: number,
  dimension: string
): DimensionAnalysis[] {
  const accountPrev = prevBookings.filter((b) => b.account === account);
  const accountCurr = currBookings.filter((b) => b.account === account);

  // Create maps for aggregation
  const prevMap = new Map<string, { amount: number; count: number }>();
  const currMap = new Map<string, { amount: number; count: number }>();

  // Handle special dimensions
  if (dimension === 'month') {
    // Group by month
    for (const b of accountPrev) {
      const month = b.posting_date.substring(0, 7); // YYYY-MM
      const entry = prevMap.get(month) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      prevMap.set(month, entry);
    }

    for (const b of accountCurr) {
      const month = b.posting_date.substring(0, 7);
      const entry = currMap.get(month) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      currMap.set(month, entry);
    }
  } else if (dimension === 'text_pattern') {
    // Group by first 3 words of text
    for (const b of accountPrev) {
      const pattern = extractTextPattern(b.text).slice(0, 3).join(' ') || '(leer)';
      const entry = prevMap.get(pattern) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      prevMap.set(pattern, entry);
    }

    for (const b of accountCurr) {
      const pattern = extractTextPattern(b.text).slice(0, 3).join(' ') || '(leer)';
      const entry = currMap.get(pattern) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      currMap.set(pattern, entry);
    }
  } else {
    // Standard dimension (vendor, cost_center, etc.)
    const getKey = (b: Booking) => {
      const value = (b as unknown as Record<string, unknown>)[dimension];
      return String(value || '(leer)');
    };

    for (const b of accountPrev) {
      const key = getKey(b);
      const entry = prevMap.get(key) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      prevMap.set(key, entry);
    }

    for (const b of accountCurr) {
      const key = getKey(b);
      const entry = currMap.get(key) || { amount: 0, count: 0 };
      entry.amount += b.amount;
      entry.count += 1;
      currMap.set(key, entry);
    }
  }

  // Calculate contributions for all keys
  const prevKeysArray = Array.from(prevMap.keys());
  const currKeysArray = Array.from(currMap.keys());
  const allKeysArray = Array.from(new Set([...prevKeysArray, ...currKeysArray]));
  const results: DimensionAnalysis[] = [];

  for (const key of allKeysArray) {
    const prevEntry = prevMap.get(key) || { amount: 0, count: 0 };
    const currEntry = currMap.get(key) || { amount: 0, count: 0 };
    const contribution = currEntry.amount - prevEntry.amount;

    results.push({
      dimension,
      key,
      prevAmount: prevEntry.amount,
      currAmount: currEntry.amount,
      prevCount: prevEntry.count,
      currCount: currEntry.count,
      contribution,
    });
  }

  // Sort by absolute contribution
  results.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return results;
}

/**
 * Identify cluster types and generate descriptions
 */
function classifyCluster(
  clusterResults: DimensionAnalysis[],
  totalVariance: number
): { type: string; description: string } {
  if (clusterResults.length === 0) {
    return { type: 'other', description: 'Sonstige' };
  }

  const mainDriver = clusterResults[0];
  const contribution = Math.abs(mainDriver.contribution);
  const contributionPct = totalVariance !== 0 ? (contribution / Math.abs(totalVariance)) * 100 : 0;

  // New item: only in current
  if (mainDriver.prevAmount === 0 && mainDriver.currAmount !== 0) {
    return {
      type: 'new_cost',
      description: `Neue ${mainDriver.dimension}: ${mainDriver.key}`,
    };
  }

  // Removed item: only in previous
  if (mainDriver.prevAmount !== 0 && mainDriver.currAmount === 0) {
    return {
      type: 'removed_cost',
      description: `Wegfall ${mainDriver.dimension}: ${mainDriver.key}`,
    };
  }

  // Volume change: significantly different counts
  const countChange =
    Math.abs(mainDriver.currCount - mainDriver.prevCount) / Math.max(1, mainDriver.prevCount);
  if (countChange > 0.2) {
    return {
      type: 'volume_change',
      description: `Mengenänderung in ${mainDriver.dimension}: ${mainDriver.key}`,
    };
  }

  // Price change: same count but different amount
  if (mainDriver.currCount === mainDriver.prevCount && mainDriver.prevCount > 0) {
    const avgPrevPrice = mainDriver.prevAmount / mainDriver.prevCount;
    const avgCurrPrice = mainDriver.currAmount / mainDriver.currCount;
    const priceChangePct = Math.abs((avgCurrPrice - avgPrevPrice) / avgPrevPrice);
    if (priceChangePct > 0.05) {
      return {
        type: 'price_change',
        description: `Preisänderung in ${mainDriver.dimension}: ${mainDriver.key}`,
      };
    }
  }

  // Generic vendor/dimension change
  if (mainDriver.dimension === 'vendor' || mainDriver.dimension === 'cost_center') {
    return {
      type: 'vendor_change',
      description: `Änderung in ${mainDriver.dimension}: ${mainDriver.key}`,
    };
  }

  // Timing shift
  if (mainDriver.dimension === 'month') {
    return {
      type: 'timing_shift',
      description: `Zeitliche Verschiebung im ${mainDriver.key}`,
    };
  }

  return {
    type: 'one_time',
    description: `Einmalige Transaktion: ${mainDriver.key}`,
  };
}

/**
 * Generate AI narrative if Ollama is available
 */
async function generateNarrative(
  rootCause: RootCause,
  options?: { includeLLMNarrative?: boolean }
): Promise<string | undefined> {
  if (!options?.includeLLMNarrative) return undefined;

  try {
    const llmService = getHybridLLMService();
    const status = await llmService.getStatus();

    if (!status.ollamaAvailable) {
      return undefined;
    }

    const clusterSummary = rootCause.clusters
      .slice(0, 3)
      .map((c) => `- ${c.description} (${c.contributionPct.toFixed(1)}% der Varianz)`)
      .join('\n');

    const topDrivers = rootCause.drivers
      .slice(0, 3)
      .map((d) => `- ${d.dimension}/${d.key}: ${d.contribution.toFixed(0)} EUR`)
      .join('\n');

    const prompt = `Erstelle eine prägnante Geschäftsbeschreibung (1-2 Sätze) der folgenden Varianzanalyse:

Konto: ${rootCause.account_name} (${rootCause.account})
Gesamte Varianz: ${rootCause.totalVariance.toFixed(0)} EUR
Konfidenz: ${rootCause.confidence.toFixed(0)}%

Hauptcluster:
${clusterSummary}

Wesentliche Treiber:
${topDrivers}

Schreibe eine klare, geschäftsorientierte Erklärung für die Stakeholder.`;

    const response = await llmService.generate(prompt, {
      systemPrompt:
        'Du bist ein Finanzanalyst. Erkläre die Ursachen von Abweichungen klar und präzise.',
      temperature: 0.7,
      maxTokens: 150,
    });

    return response.text;
  } catch (error) {
    console.error('Error generating narrative:', error);
    return undefined;
  }
}

/**
 * Main function: Analyze root causes for a variance
 */
export async function analyzeRootCauses(
  prevBookings: Booking[],
  currBookings: Booking[],
  account: number,
  options?: { includeLLMNarrative?: boolean }
): Promise<RootCause> {
  const id = `rca-${account}-${Date.now()}`;

  // Filter bookings for target account
  const accountPrev = prevBookings.filter((b) => b.account === account);
  const accountCurr = currBookings.filter((b) => b.account === account);

  // Get account name
  const account_name =
    accountCurr[0]?.account_name || accountPrev[0]?.account_name || `Account ${account}`;

  // Calculate total variance
  const totalPrev = accountPrev.reduce((sum, b) => sum + b.amount, 0);
  const totalCurr = accountCurr.reduce((sum, b) => sum + b.amount, 0);
  const totalVariance = totalCurr - totalPrev;

  // Analyze dimensions
  const dimensions = ['vendor', 'cost_center', 'month', 'text_pattern'];
  const dimensionResults = new Map<string, DimensionAnalysis[]>();

  for (const dim of dimensions) {
    const results = analyzeDimension(prevBookings, currBookings, account, dim);
    dimensionResults.set(dim, results);
  }

  // Create clusters from top dimension drivers
  const clusters: BookingCluster[] = [];
  const processedKeysSet = new Set<string>();
  const processedKeysArray: string[] = [];

  // Get top 5 drivers across all dimensions (by contribution)
  const allDrivers: DimensionAnalysis[] = [];
  const dimensionResultsArray = Array.from(dimensionResults.values());
  for (const results of dimensionResultsArray) {
    allDrivers.push(...results.slice(0, 3)); // Top 3 per dimension
  }
  allDrivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  for (const driver of allDrivers.slice(0, 7)) {
    // Top 7 clusters
    const key = `${driver.dimension}:${driver.key}`;
    if (processedKeysArray.includes(key)) continue;
    processedKeysArray.push(key);
    processedKeysSet.add(key);

    // Get bookings for this cluster
    const getClusterKey = (b: Booking): string => {
      if (driver.dimension === 'month') {
        return b.posting_date.substring(0, 7);
      } else if (driver.dimension === 'text_pattern') {
        return extractTextPattern(b.text).slice(0, 3).join(' ') || '(leer)';
      }
      if (driver.dimension === 'vendor') {
        return String(b.vendor || '(leer)');
      }
      if (driver.dimension === 'cost_center') {
        return String(b.cost_center || '(leer)');
      }
      return '(leer)';
    };

    const clusterBookings = accountCurr
      .filter((b) => getClusterKey(b) === driver.key)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5)
      .map((b) => ({
        date: b.posting_date,
        amount: b.amount,
        text: b.text,
        vendor: b.vendor,
        customer: b.customer,
        document_no: b.document_no,
      }));

    const { type, description } = classifyCluster([driver], totalVariance);

    const contributionPct =
      totalVariance !== 0 ? (driver.contribution / totalVariance) * 100 : 0;

    clusters.push({
      label: driver.key,
      type: type as BookingCluster['type'],
      bookings: clusterBookings,
      totalAmount: driver.currAmount,
      contributionPct,
      description,
    });
  }

  // Create variance drivers (all top drivers)
  const drivers: VarianceDriver[] = [];
  for (const driver of allDrivers.slice(0, 10)) {
    const contributionPct =
      totalVariance !== 0 ? (driver.contribution / totalVariance) * 100 : 0;

    drivers.push({
      dimension: driver.dimension,
      key: driver.key,
      prevAmount: driver.prevAmount,
      currAmount: driver.currAmount,
      contribution: driver.contribution,
      contributionPct,
    });
  }

  // Calculate confidence score (0-100)
  // Higher when we have clear drivers and good cluster separation
  const clusterExplainedVariance = clusters.reduce((sum, c) => sum + Math.abs(c.contributionPct), 0);
  const confidence = Math.min(
    100,
    50 + (clusterExplainedVariance / 100) * 50 + (clusters.length > 0 ? 5 : 0)
  );

  // Generate narrative if requested
  const narrative = await generateNarrative(
    {
      id,
      account,
      account_name,
      totalVariance,
      clusters,
      drivers,
      confidence,
    },
    options
  );

  return {
    id,
    account,
    account_name,
    totalVariance,
    clusters,
    drivers,
    narrative,
    confidence,
  };
}

/**
 * Batch analyze multiple accounts
 */
export async function analyzeRootCausesBatch(
  prevBookings: Booking[],
  currBookings: Booking[],
  accounts: number[],
  options?: { includeLLMNarrative?: boolean }
): Promise<RootCause[]> {
  const results: RootCause[] = [];

  for (const account of accounts) {
    const result = await analyzeRootCauses(prevBookings, currBookings, account, options);
    results.push(result);
  }

  return results;
}
