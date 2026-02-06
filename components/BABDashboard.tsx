'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from 'recharts';
import { Sparkles, Grid3x3, TrendingUp } from 'lucide-react';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Booking } from '@/lib/types';
import { calculateBAB } from '@/lib/bab-engine';
import {
  BABResult,
  COST_TYPE_COLORS,
  COST_TYPE_LABELS,
  CostType,
} from '@/lib/bab-types';

interface BABDashboardProps {
  bookings: Booking[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);

const formatPct = (v: number) => `${v.toFixed(1)}%`;

export function BABDashboard({ bookings }: BABDashboardProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'matrix'>('overview');

  const result: BABResult = useMemo(() => {
    return calculateBAB(bookings);
  }, [bookings]);

  const hasData = result.summary.totalCosts > 0;

  if (!hasData) {
    return (
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-10 text-center overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-indigo-500/10 via-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/25"
        >
          <Grid3x3 className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-semibold text-white mb-3 tracking-tight">
          Betriebsabrechnungsbogen
        </h2>
        <p className="text-gray-300 max-w-lg mx-auto mb-6">
          Laden Sie Buchungsdaten hoch, um die Kostenverrechnung zwischen Kostenstellen
          und Kostenkategorien automatisch zu berechnen.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-sm mx-auto"
        >
          <svg viewBox="0 0 300 150" className="w-full h-auto opacity-20">
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 5 }).map((_, col) => (
                <motion.rect
                  key={`${row}-${col}`}
                  x={30 + col * 50}
                  y={30 + row * 30}
                  width="35"
                  height="20"
                  rx="4"
                  fill={
                    ['#6366f1', '#7c3aed', '#f59e0b', '#10b981', '#3b82f6'][
                      col
                    ]
                  }
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.5 + (row * 5 + col) * 0.05,
                  }}
                />
              ))
            )}
          </svg>
        </motion.div>

        <p className="text-gray-500 text-sm mt-6">
          Kostenverteilung nach Kostenstellen und -arten
        </p>
      </div>
    );
  }

  const costTypeOrder: CostType[] = [
    'direct_material',
    'direct_labor',
    'manufacturing_overhead',
    'admin_overhead',
    'sales_overhead',
  ];

  const costCenterComparisonData = result.costCenters.map((cc) => {
    const data: Record<string, string | number> = { name: cc.name };
    costTypeOrder.forEach((costType) => {
      const allocation = result.allocationMatrix.find(
        (a) => a.costCenter === cc.id && a.costType === costType
      );
      data[COST_TYPE_LABELS[costType]] = allocation?.amount || 0;
    });
    return data;
  });

  const costStructureData = [
    {
      name: 'Einzelkosten',
      value: result.summary.totalDirectCosts,
      fill: '#10b981',
    },
    {
      name: 'Gemeinkosten',
      value: result.summary.totalOverheadCosts,
      fill: '#8b5cf6',
    },
  ];

  const costByTypeData = costTypeOrder.map((costType) => {
    const category = result.costCategories.find((c) => c.type === costType);
    return {
      name: COST_TYPE_LABELS[costType],
      value: category?.totalAmount || 0,
      fill: COST_TYPE_COLORS[costType],
    };
  });

  const overheadRateCards = [
    {
      label: 'Materialgemeinkosten-Zuschlag',
      value: result.overheadRates.materialOverheadRate,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Fertigungsgemeinkosten-Zuschlag',
      value: result.overheadRates.productionOverheadRate,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Verwaltungsgemeinkosten-Zuschlag',
      value: result.overheadRates.adminOverheadRate,
      color: 'from-violet-500 to-purple-500',
    },
    {
      label: 'Vertriebsgemeinkosten-Zuschlag',
      value: result.overheadRates.salesOverheadRate,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  const CustomTooltip = (props: unknown) => {
    const data = props as {
      active?: boolean;
      payload?: Array<{ name: string; value: number }>;
    };
    if (!data.active || !data.payload) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">
        {data.payload.map((entry, idx) => (
          <div key={idx} style={{ color: entry.value ? '#fff' : '#999' }}>
            {entry.name}: {formatCurrency(entry.value)}
          </div>
        ))}
      </div>
    );
  };

  const matrixData = result.costCenters.map((cc) => {
    const row: Record<string, unknown> = { costCenter: cc.name };
    costTypeOrder.forEach((costType) => {
      const allocation = result.allocationMatrix.find(
        (a) => a.costCenter === cc.id && a.costType === costType
      );
      row[costType] = allocation?.amount || 0;
    });
    row.total = cc.totalCosts;
    return row;
  });

  const columnWidths: Record<string, number> = {
    costCenter: 150,
    direct_material: 120,
    direct_labor: 120,
    manufacturing_overhead: 140,
    admin_overhead: 140,
    sales_overhead: 120,
    total: 120,
  };

  const totalRow: Record<string, unknown> = {
    costCenter: 'GESAMT',
  };
  costTypeOrder.forEach((costType) => {
    const category = result.costCategories.find((c) => c.type === costType);
    totalRow[costType] = category?.totalAmount || 0;
  });
  totalRow.total = result.summary.totalCosts;

  const maxCellValue = Math.max(
    ...matrixData.flatMap((row) =>
      costTypeOrder.map((ct) => (row[ct] as number) || 0)
    )
  );

  const getCellIntensity = (value: number) => {
    if (value === 0) return 'bg-transparent';
    const ratio = value / maxCellValue;
    if (ratio > 0.7) return 'bg-indigo-600/40';
    if (ratio > 0.4) return 'bg-indigo-500/25';
    if (ratio > 0.1) return 'bg-indigo-400/15';
    return 'bg-indigo-300/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* ═══ Header ═══ */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
        <BorderBeam
          size={200}
          duration={20}
          colorFrom="#6366f1"
          colorTo="#8b5cf6"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40">
              <Grid3x3 className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Betriebsabrechnungsbogen (BAB)
            </h2>
          </div>
          <p className="text-gray-400 text-sm">
            Kostenverrechnung nach {result.costCenters.length} Kostenstellen · {bookings.length.toLocaleString('de-DE')} Buchungen
          </p>
        </div>
      </div>

      {/* ═══ Summary KPI Row ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-gray-400 text-sm font-medium mb-2">
              Gesamtkosten
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                <NumberTicker
                  value={Math.round(result.summary.totalCosts / 1000)}
                  delay={0.5}
                  decimalPlaces={0}
                />
              </span>
              <span className="text-gray-500 text-sm">Tsd. EUR</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-emerald-300 text-sm font-medium mb-2">
              Einzelkosten
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-300">
                <NumberTicker
                  value={Math.round(
                    result.summary.totalDirectCosts / 1000
                  )}
                  delay={0.5}
                  decimalPlaces={0}
                />
              </span>
              <span className="text-emerald-400/60 text-sm">Tsd. EUR</span>
            </div>
            <p className="text-emerald-400/80 text-xs mt-2">
              {formatPct(
                (result.summary.totalDirectCosts /
                  result.summary.totalCosts) *
                100
              )}{' '}
              der Gesamtkosten
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative bg-gradient-to-br from-violet-500/10 to-purple-500/5 backdrop-blur-xl rounded-2xl border border-violet-500/20 p-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-violet-300 text-sm font-medium mb-2">
              Gemeinkosten
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-violet-300">
                <NumberTicker
                  value={Math.round(
                    result.summary.totalOverheadCosts / 1000
                  )}
                  delay={0.5}
                  decimalPlaces={0}
                />
              </span>
              <span className="text-violet-400/60 text-sm">Tsd. EUR</span>
            </div>
            <p className="text-violet-400/80 text-xs mt-2">
              {formatPct(
                (result.summary.totalOverheadCosts /
                  result.summary.totalCosts) *
                100
              )}{' '}
              der Gesamtkosten
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-gradient-to-br from-amber-500/10 to-yellow-500/5 backdrop-blur-xl rounded-2xl border border-amber-500/20 p-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-amber-300 text-sm font-medium mb-2">
              GK-Zuschlagssatz
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-300">
                {formatPct(result.summary.overheadRatio)}
              </span>
            </div>
            <p className="text-amber-400/80 text-xs mt-2">
              Gemeinkosten / Einzelkosten
            </p>
          </div>
        </motion.div>
      </div>

      {/* ═══ Overhead Rate Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overheadRateCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + idx * 0.05 }}
            className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.color}/20 rounded-full blur-2xl`} />
            <div className="relative z-10">
              <p className="text-gray-400 text-xs font-medium mb-3">
                {card.label}
              </p>
              <div className="mb-3">
                <p className="text-2xl font-bold text-white">
                  {card.value.toFixed(1)}%
                </p>
              </div>
              <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${card.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(card.value, 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 + idx * 0.05 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ View Toggle ═══ */}
      <div className="flex justify-center">
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/[0.06] p-1 inline-flex">
          <motion.div
            layout
            layoutId="view-pill"
            className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full opacity-20"
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          />
          <button
            onClick={() => setViewMode('overview')}
            className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'overview'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'matrix'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Detail-Matrix
          </button>
        </div>
      </div>

      {/* ═══ View Content ═══ */}
      <AnimatePresence mode="wait">
        {viewMode === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Cost Center Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden"
            >
              <h3 className="text-lg font-semibold text-white mb-6">
                Kostenvergleich nach Kostenstelle
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={costCenterComparisonData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    iconType="square"
                  />
                  {costTypeOrder.map((costType) => (
                    <Bar
                      key={costType}
                      dataKey={COST_TYPE_LABELS[costType]}
                      stackId="stack"
                      fill={COST_TYPE_COLORS[costType]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Cost Structure Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden"
              >
                <h3 className="text-lg font-semibold text-white mb-6">
                  Einzelkosten vs. Gemeinkosten
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={costStructureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {costStructureData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: unknown) =>
                        formatCurrency(value as number)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden"
              >
                <h3 className="text-lg font-semibold text-white mb-6">
                  Kostenverteilung nach Kostenkategorie
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={costByTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {costByTypeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: unknown) =>
                        formatCurrency(value as number)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
              <h3 className="text-lg font-semibold text-white mb-6">
                BAB-Matrix nach Kostenstelle und Kostenkategorie
              </h3>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th
                          className="text-left px-4 py-3 font-semibold text-gray-300 border-b border-white/[0.06] bg-white/[0.02]"
                          style={{ width: `${columnWidths.costCenter}px` }}
                        >
                          Kostenstelle
                        </th>
                        {costTypeOrder.map((costType) => (
                          <th
                            key={costType}
                            className="text-right px-4 py-3 font-semibold text-gray-300 border-b border-white/[0.06] bg-white/[0.02] whitespace-nowrap"
                            style={{
                              width: `${columnWidths[costType]}px`,
                            }}
                          >
                            <div className="text-xs">
                              {COST_TYPE_LABELS[costType]}
                            </div>
                          </th>
                        ))}
                        <th
                          className="text-right px-4 py-3 font-semibold text-white border-b border-white/[0.06] bg-indigo-500/10"
                          style={{ width: `${columnWidths.total}px` }}
                        >
                          Gesamt
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-white border-b border-white/[0.06] font-medium">
                            {String(row.costCenter)}
                          </td>
                          {costTypeOrder.map((costType) => {
                            const value = (row[costType] as number) || 0;
                            return (
                              <td
                                key={costType}
                                className={`text-right px-4 py-3 border-b border-white/[0.06] text-gray-300 text-sm ${getCellIntensity(
                                  value
                                )}`}
                              >
                                {value > 0
                                  ? new Intl.NumberFormat('de-DE', {
                                      style: 'currency',
                                      currency: 'EUR',
                                      maximumFractionDigits: 0,
                                    }).format(value)
                                  : '-'}
                              </td>
                            );
                          })}
                          <td className="text-right px-4 py-3 border-b border-white/[0.06] text-white font-semibold bg-indigo-500/10">
                            {formatCurrency((row.total as number) || 0)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-500/5">
                        <td className="px-4 py-4 text-white font-bold border-t border-white/[0.1]">
                          {String(totalRow.costCenter)}
                        </td>
                        {costTypeOrder.map((costType) => (
                          <td
                            key={costType}
                            className="text-right px-4 py-4 text-white font-semibold border-t border-white/[0.1]"
                          >
                            {formatCurrency(
                              (totalRow[costType] as number) || 0
                            )}
                          </td>
                        ))}
                        <td className="text-right px-4 py-4 text-white font-bold border-t border-white/[0.1] bg-indigo-600/20">
                          {formatCurrency((totalRow.total as number) || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ KI-Insights Panel ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative bg-gradient-to-br from-indigo-500/10 to-violet-500/5 backdrop-blur-xl rounded-2xl border border-indigo-500/20 p-6 overflow-hidden"
      >
        <BorderBeam
          size={150}
          duration={15}
          colorFrom="#6366f1"
          colorTo="#a78bfa"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">
              Kostenverteilungs-Insights
            </h3>
          </div>
          <div className="space-y-3">
            {result.insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + idx * 0.05 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {insight}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
