'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Droplets,
  Banknote,
  TrendingDown,
  Shield,
  AlertTriangle,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Booking } from '@/lib/types';

interface LiquidityForecastResult {
  weeks: {
    calendarWeek: number;
    startDate: string;
    endDate: string;
    inflows: number;
    outflows: number;
    netCashFlow: number;
    closingBalance: number;
    upperBound: number;
    lowerBound: number;
    isActual: boolean;
  }[];
  totalInflows: number;
  totalOutflows: number;
  minimumBalance: number;
  minimumBalanceWeek: number;
  liquidityReachWeeks: number | null;
  averageCashBurnRate: number;
  alerts: {
    level: 'critical' | 'warning' | 'info';
    message: string;
  }[];
  insights: string[];
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
}

interface LiquidityDashboardProps {
  bookings: Booking[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
};

const glassStyle = 'bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06]';

export function LiquidityDashboard({ bookings }: LiquidityDashboardProps) {
  const [result, setResult] = useState<LiquidityForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startBalance, setStartBalance] = useState(500000);
  const [threshold, setThreshold] = useState(50000);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/liquidity-forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookings,
            startBalance,
            threshold,
            weeks: 13,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, [bookings, startBalance, threshold]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <motion.div
          className={`${glassStyle} p-8 h-12`}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className={`${glassStyle} p-6 h-32`}
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          ))}
        </div>
        <motion.div
          className={`${glassStyle} p-8 h-96`}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className={`${glassStyle} p-8 text-red-400`}>
        {error || 'No forecast data available'}
      </div>
    );
  }

  const isLiquidityLow = result.minimumBalance < threshold;
  const reachWeeks = result.liquidityReachWeeks;
  const reachColor =
    reachWeeks === null || reachWeeks > 8
      ? '#10b981'
      : reachWeeks >= 4
        ? '#f59e0b'
        : '#ef4444';

  const chartData = result.weeks.map((week) => ({
    label: `KW ${week.calendarWeek}`,
    inflows: week.inflows,
    outflows: week.outflows,
    closingBalance: week.closingBalance,
    upperBound: week.upperBound,
    lowerBound: week.lowerBound,
  }));

  const mostCriticalAlert = result.alerts.find((a) => a.level === 'critical') ||
    result.alerts.find((a) => a.level === 'warning') || null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        className={`${glassStyle} p-8`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 text-pink-300" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                13-Wochen Liquiditätsplanung
              </h1>
              <p className="text-sm text-gray-400">
                Prognose generiert am {new Date().toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.08] transition"
          >
            Einstellungen
          </button>
        </div>

        {showSettings && (
          <motion.div
            className="mt-6 pt-6 border-t border-white/[0.1] grid grid-cols-2 gap-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div>
              <label className="text-xs uppercase tracking-[0.08em] text-gray-500 block mb-2">
                Anfangssaldo
              </label>
              <input
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(parseFloat(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.08em] text-gray-500 block mb-2">
                Mindestschwelle
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2 text-white"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-4 gap-4">
        {/* Current Balance */}
        <motion.div
          className={`${glassStyle} p-6 relative overflow-hidden`}
          whileHover={{ scale: 1.02 }}
        >
          <BorderBeam />
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.08em] text-gray-500">
              Aktueller Kontostand
            </span>
            <Banknote className="w-5 h-5 text-pink-300" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            <NumberTicker value={startBalance} />
          </div>
          <p className="text-xs text-gray-400 mt-2">EUR</p>
        </motion.div>

        {/* Minimum Balance */}
        <motion.div
          className={`${glassStyle} p-6 relative overflow-hidden`}
          whileHover={{ scale: 1.02 }}
        >
          <BorderBeam />
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.08em] text-gray-500">
              Progn. Minimum
            </span>
            <TrendingDown
              className={`w-5 h-5 ${
                isLiquidityLow ? 'text-red-400' : 'text-gray-400'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-bold tracking-tight tabular-nums ${
              isLiquidityLow ? 'text-red-400' : 'text-white'
            }`}
          >
            <NumberTicker value={result.minimumBalance} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            KW {result.minimumBalanceWeek}
          </p>
        </motion.div>

        {/* Liquidity Reach */}
        <motion.div
          className={`${glassStyle} p-6 relative overflow-hidden`}
          whileHover={{ scale: 1.02 }}
        >
          <BorderBeam />
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.08em] text-gray-500">
              Liquiditätsreichweite
            </span>
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div style={{ color: reachColor }} className="text-2xl font-bold tracking-tight">
            {reachWeeks === null ? '∞' : `${reachWeeks} Wochen`}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {reachWeeks === null || reachWeeks > 8
              ? 'Gesund'
              : reachWeeks >= 4
                ? 'Warnung'
                : 'Kritisch'}
          </p>
        </motion.div>

        {/* Cash Burn Rate */}
        <motion.div
          className={`${glassStyle} p-6 relative overflow-hidden`}
          whileHover={{ scale: 1.02 }}
        >
          <BorderBeam />
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.08em] text-gray-500">
              Cash-Burn-Rate
            </span>
            <TrendingDown className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            <NumberTicker value={Math.abs(result.averageCashBurnRate)} />
          </div>
          <p className="text-xs text-gray-400 mt-2">EUR/Woche</p>
        </motion.div>
      </div>

      {/* Alerts Banner */}
      <AnimatePresence>
        {mostCriticalAlert && (
          <motion.div
            className={`${glassStyle} p-4 flex items-center gap-3 border ${
              mostCriticalAlert.level === 'critical'
                ? 'bg-red-500/[0.1] border-red-500/[0.3]'
                : 'bg-amber-500/[0.1] border-amber-500/[0.3]'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertTriangle
              className={`w-5 h-5 flex-shrink-0 ${
                mostCriticalAlert.level === 'critical'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            />
            <p
              className={`text-sm ${
                mostCriticalAlert.level === 'critical'
                  ? 'text-red-300'
                  : 'text-amber-300'
              }`}
            >
              {mostCriticalAlert.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chart Section */}
      <motion.div
        className={`${glassStyle} p-8`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-white mb-6">
          13-Wochen Cashflow Prognose
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 12,
                boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)',
                color: '#111827',
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              itemStyle={{ color: '#374151' }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeDasharray="8 4"
              label={{
                value: 'Schwelle',
                fill: '#ef4444',
                fontSize: 11,
              }}
            />
            <Area
              dataKey="inflows"
              fill="url(#colorInflow)"
              stroke="#10b981"
              strokeWidth={2}
            />
            <Area
              dataKey="outflows"
              fill="url(#colorOutflow)"
              stroke="#ef4444"
              strokeWidth={2}
            />
            <Area
              dataKey="upperBound"
              fill="url(#colorConfidence)"
              stroke="none"
            />
            <Area
              dataKey="lowerBound"
              fill="url(#colorConfidence)"
              stroke="none"
            />
            <Line
              dataKey="closingBalance"
              stroke="#ec4899"
              strokeWidth={3}
              dot={{ fill: '#ec4899', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Weekly Breakdown & Category Grid */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Weekly Breakdown Table */}
        <motion.div
          className={`${glassStyle} p-8 md:col-span-3`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">
            Wöchentliche Aufschlüsselung
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-left py-3">
                    KW
                  </th>
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-left py-3">
                    Zeitraum
                  </th>
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-right py-3">
                    Eingänge
                  </th>
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-right py-3">
                    Ausgänge
                  </th>
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-right py-3">
                    Netto
                  </th>
                  <th className="text-xs uppercase tracking-[0.08em] text-gray-500 text-right py-3">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.weeks.map((week, idx) => {
                  const netCashFlow = week.inflows - week.outflows;
                  const isBelowThreshold = week.closingBalance < threshold;
                  return (
                    <motion.tr
                      key={idx}
                      className={`border-b border-white/[0.06] hover:bg-white/[0.04] transition ${
                        !week.isActual ? 'text-gray-400' : 'text-gray-300'
                      }`}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <td className="py-3">KW {week.calendarWeek}</td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(week.startDate).toLocaleDateString('de-DE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 text-right text-green-400 tabular-nums">
                        {formatCurrency(week.inflows)}
                      </td>
                      <td className="py-3 text-right text-red-400 tabular-nums">
                        {formatCurrency(week.outflows)}
                      </td>
                      <td
                        className={`py-3 text-right tabular-nums ${
                          netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(netCashFlow)}
                      </td>
                      <td
                        className={`py-3 text-right tabular-nums font-semibold ${
                          isBelowThreshold ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {formatCurrency(week.closingBalance)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          className={`${glassStyle} p-8 md:col-span-2`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">
            Ausgabenkategorien
          </h2>
          {result.categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={result.categoryBreakdown}
                    dataKey="amount"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {result.categoryBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-6">
                {result.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-gray-300">{cat.category}</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Keine Daten verfügbar</p>
          )}
        </motion.div>
      </div>

      {/* AI Insights Section */}
      {result.insights.length > 0 && (
        <motion.div
          className={`${glassStyle} p-8`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">
              KI-Empfehlungen
            </h2>
          </div>
          <div className="space-y-3">
            {result.insights.map((insight, idx) => (
              <motion.div
                key={idx}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
              >
                <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">{insight}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
