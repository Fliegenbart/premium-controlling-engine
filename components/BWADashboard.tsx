'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { calculateBWA } from '@/lib/bwa-engine';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { BWALine, BWAResult } from '@/lib/bwa-types';

interface BWADashboardProps {
  bookings: Booking[];
  prevBookings?: Booking[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#06b6d4',
  '#0ea5e9',
  '#8b5cf6',
];

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center py-20"
    >
      <div className="text-center">
        <svg
          className="w-48 h-48 mx-auto mb-6 opacity-20"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="20" y="30" width="160" height="140" fill="none" stroke="currentColor" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <rect x="30" y={50 + i * 20} width="140" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
            </motion.g>
          ))}
        </svg>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">Keine Daten vorhanden</h3>
        <p className="text-sm text-gray-500">
          Laden Sie Buchungsdaten hoch, um die BWA anzusehen.
        </p>
      </div>
    </motion.div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent';
  secondary?: number;
  secondaryLabel?: string;
  color?: 'emerald' | 'blue' | 'indigo' | 'green' | 'red' | 'neutral';
  icon?: React.ReactNode;
}

function KPICard({
  title,
  value,
  format = 'currency',
  secondary,
  secondaryLabel,
  color = 'neutral',
  icon,
}: KPICardProps) {
  const colorClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    indigo: 'border-indigo-500/30 bg-indigo-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    neutral: 'border-white/[0.06] bg-white/[0.03]',
  };

  const accentClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    indigo: 'text-indigo-400',
    green: 'text-green-400',
    red: 'text-red-400',
    neutral: 'text-gray-400',
  };

  const barColor = {
    emerald: 'bg-emerald-500/40',
    blue: 'bg-blue-500/40',
    indigo: 'bg-indigo-500/40',
    green: 'bg-green-500/40',
    red: 'bg-red-500/40',
    neutral: 'bg-gray-500/40',
  };

  const formattedValue =
    format === 'currency' ? formatCurrency(value) : `${value.toFixed(1)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border backdrop-blur-xl p-5 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">{title}</span>
        {icon && <span className={accentClasses[color]}>{icon}</span>}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-white">
            {format === 'currency' && value >= 0 ? (
              <NumberTicker value={Math.abs(value)} />
            ) : (
              formattedValue
            )}
            {format === 'currency' && value < 0 && '-'}
          </div>
          {secondary !== undefined && secondaryLabel && (
            <div className="text-xs text-gray-400 mt-1">
              {secondaryLabel}: {secondary.toFixed(1)}%
            </div>
          )}
        </div>

        {secondary !== undefined && (
          <div className={`w-12 h-8 rounded ${barColor[color]}`}>
            <motion.div
              className={`h-full rounded ${
                color === 'red' ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, secondary))}%`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, secondary))}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ExpandableRowProps {
  line: BWALine;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}

function ExpandableTableRow({
  line,
  isExpanded,
  onToggle,
  index,
}: ExpandableRowProps) {
  const isAlternate = index % 2 === 1;
  const isSubtotal = line.isSubtotal;

  const borderColorMap: Record<string, string> = {
    gross_profit: 'border-l-emerald-500',
    operating_result: 'border-l-blue-500',
    ebitda: 'border-l-indigo-500',
    ebit: 'border-l-indigo-500',
    net_result: 'border-l-green-500',
  };
  const borderColor = borderColorMap[line.type] || 'border-l-transparent';

  const deltaColor = line.deltaPct
    ? line.deltaPct > 0
      ? 'text-red-400'
      : 'text-green-400'
    : 'text-gray-400';

  return (
    <>
      <motion.tr
        className={`border-b border-white/[0.06] ${
          isSubtotal ? 'bg-white/[0.05] font-semibold' : isAlternate ? 'bg-white/[0.02]' : ''
        } ${isSubtotal && `border-l-4 ${borderColor}`}`}
        onClick={() => line.children && line.children.length > 0 && onToggle()}
      >
        <td className="px-4 py-3 text-sm text-gray-300 cursor-pointer">
          <div className="flex items-center gap-2">
            {line.children && line.children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="p-1 hover:bg-white/[0.1] rounded transition-colors"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </motion.div>
              </button>
            )}
            {!line.children || line.children.length === 0 ? (
              <div className="w-6" />
            ) : null}
            {line.label}
          </div>
        </td>

        <td className={`px-4 py-3 text-sm text-right ${isSubtotal ? 'font-bold text-white' : 'text-gray-300'}`}>
          {formatCurrency(line.amount)}
        </td>

        <td className="px-4 py-3 text-sm text-right text-gray-400">
          {line.prevAmount !== undefined
            ? formatCurrency(line.prevAmount)
            : '-'}
        </td>

        <td className={`px-4 py-3 text-sm text-right font-medium ${deltaColor}`}>
          {line.delta !== undefined ? (
            <>
              {line.delta > 0 ? '+' : ''}{formatCurrency(line.delta)}
            </>
          ) : (
            '-'
          )}
        </td>

        <td className={`px-4 py-3 text-sm text-right font-medium ${deltaColor}`}>
          {line.deltaPct !== undefined ? (
            <>
              {line.deltaPct > 0 ? '+' : ''}{line.deltaPct.toFixed(2)}%
            </>
          ) : (
            '-'
          )}
        </td>

        <td className="px-4 py-3 text-sm text-right text-gray-300">
          {line.percentOfRevenue.toFixed(1)}%
        </td>
      </motion.tr>

      <AnimatePresence>
        {isExpanded && line.children && line.children.length > 0 && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <td colSpan={6} className="px-4 py-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                {line.children.map((child, childIdx) => (
                  <motion.div
                    key={`${child.account}-${childIdx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: childIdx * 0.05 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="pl-16 pr-4 py-2 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-gray-300">Kto. {child.account}</div>
                          <div className="text-gray-500">{child.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-300">{formatCurrency(child.amount)}</div>
                          {child.prevAmount !== undefined && (
                            <div className="text-gray-500 text-xs">
                              VJ: {formatCurrency(child.prevAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

interface MarginChartData {
  name: string;
  'Rohertrag-Marge': number;
  'EBITDA-Marge': number;
  'EBIT-Marge': number;
  'Netto-Marge': number;
}

interface CostStructureData {
  name: string;
  value: number;
}

export function BWADashboard({ bookings, prevBookings }: BWADashboardProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'kurz' | 'detail'>('detail');

  const result = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return null;
    }
    return calculateBWA(bookings, prevBookings);
  }, [bookings, prevBookings]);

  const marginChartData = useMemo((): MarginChartData[] => {
    if (!result) return [];

    return [
      {
        name: 'Aktuell',
        'Rohertrag-Marge': ((result.summary.grossMargin / result.summary.revenue) * 100) || 0,
        'EBITDA-Marge': result.summary.ebitdaMargin,
        'EBIT-Marge': result.summary.ebitMargin,
        'Netto-Marge': result.summary.netMargin,
      },
      ...(prevBookings
        ? [
            {
              name: 'Vorjahr',
              'Rohertrag-Marge': 0,
              'EBITDA-Marge': 0,
              'EBIT-Marge': 0,
              'Netto-Marge': 0,
            },
          ]
        : []),
    ];
  }, [result, prevBookings]);

  const costStructureData = useMemo((): CostStructureData[] => {
    if (!result) return [];

    const costs: CostStructureData[] = [];

    const costLines = result.lines.filter(
      (line) =>
        [
          'material',
          'personnel',
          'room',
          'insurance',
          'vehicle',
          'advertising',
          'travel',
          'other_operating',
        ].includes(line.type)
    );

    costLines.forEach((line) => {
      if (line.amount > 0) {
        costs.push({
          name: line.label,
          value: Math.abs(line.amount),
        });
      }
    });

    return costs.sort((a, b) => b.value - a.value);
  }, [result]);

  const displayLines = useMemo(() => {
    if (!result) return [];

    if (viewMode === 'kurz') {
      return result.lines.filter((line) => line.isSubtotal);
    }
    return result.lines;
  }, [result, viewMode]);

  if (!result) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">
            Betriebswirtschaftliche Auswertung (BWA)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Periode: {result.period}
            {result.prevPeriod && ` vs. ${result.prevPeriod}`}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.06] rounded-lg p-1">
          {(['kurz', 'detail'] as const).map((mode) => (
            <motion.button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-white/[0.1] text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              layoutId="viewMode"
            >
              {mode === 'kurz' ? 'Kurzfassung' : 'Detailansicht'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <KPICard
          title="Umsatzerlöse"
          value={result.summary.revenue}
          color="neutral"
        />

        <KPICard
          title="Rohertrag"
          value={result.summary.grossMargin}
          secondary={
            result.summary.revenue > 0
              ? (result.summary.grossMargin / result.summary.revenue) * 100
              : 0
          }
          secondaryLabel="Marge"
          color="emerald"
        />

        <KPICard
          title="EBITDA"
          value={result.summary.ebitda}
          secondary={result.summary.ebitdaMargin}
          secondaryLabel="Marge"
          color="blue"
        />

        <KPICard
          title="EBIT"
          value={result.summary.ebit}
          secondary={result.summary.ebitMargin}
          secondaryLabel="Marge"
          color="indigo"
        />

        <KPICard
          title="Jahresüberschuss"
          value={result.summary.netResult}
          color={result.summary.netResult >= 0 ? 'green' : 'red'}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.05] border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Position
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  Aktuell
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  VJ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  Δ absolut
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  Δ %
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                  % vom Umsatz
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {displayLines.map((line, idx) => (
                  <ExpandableTableRow
                    key={`${line.type}-${idx}`}
                    line={line}
                    isExpanded={expandedRows.has(`${line.type}-${idx}`)}
                    onToggle={() => {
                      const key = `${line.type}-${idx}`;
                      const newSet = new Set(expandedRows);
                      if (newSet.has(key)) {
                        newSet.delete(key);
                      } else {
                        newSet.add(key);
                      }
                      setExpandedRows(newSet);
                    }}
                    index={idx}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Margenentwicklung</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marginChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#e5e7eb' }}
                formatter={(v: unknown) => {
                  if (typeof v === 'number') {
                    return `${v.toFixed(1)}%`;
                  }
                  return String(v ?? '');
                }}
              />
              <Legend />
              <Bar dataKey="Rohertrag-Marge" stackId="a" fill="#10b981" />
              <Bar dataKey="EBITDA-Marge" stackId="a" fill="#3b82f6" />
              <Bar dataKey="EBIT-Marge" stackId="a" fill="#6366f1" />
              <Bar dataKey="Netto-Marge" stackId="a" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Kostenstruktur</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costStructureData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {costStructureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => {
                  if (typeof v === 'number') {
                    return formatCurrency(v);
                  }
                  return String(v ?? '');
                }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 17, 23, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {result.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">KI-Insights</h3>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {result.insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3 p-3 bg-white/[0.05] rounded-lg border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
                >
                  <div className="w-1 h-1 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
