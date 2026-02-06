'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronRight,
  Sparkles, Lightbulb, BarChart3,
} from 'lucide-react';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { BorderBeam } from '@/components/magicui/border-beam';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Booking } from '@/lib/types';
import { calculateContributionMargin } from '@/lib/contribution-engine';
import {
  ContributionResult, Dimension, DB_LEVELS, DIMENSION_LABELS,
  ContributionRow,
} from '@/lib/contribution-types';

interface Props {
  bookings: Booking[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const formatPct = (v: number) => `${v >= 0 ? '' : ''}${v.toFixed(1)}%`;

export function ContributionDashboard({ bookings }: Props) {
  const [dimension, setDimension] = useState<Dimension>('total');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Berechne DB-Rechnung (rein lokal, kein API-Call nötig)
  const result: ContributionResult = useMemo(() => {
    return calculateContributionMargin(bookings, { dimension });
  }, [bookings, dimension]);

  const hasData = result.totals.revenue > 0;

  const toggleExpand = (idx: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ─── Empty State ───
  if (!hasData) {
    return (
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-10 text-center overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/25"
        >
          <BarChart3 className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-semibold text-white mb-3 tracking-tight">Deckungsbeitragsrechnung</h2>
        <p className="text-gray-300 max-w-lg mx-auto mb-4">
          Laden Sie Buchungsdaten in der Einzelanalyse hoch, um die mehrstufige DB-Rechnung (DB I → DB V) automatisch zu berechnen.
        </p>
        {/* Animated waterfall preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-sm mx-auto">
          <svg viewBox="0 0 300 100" className="w-full h-auto opacity-25">
            {[
              { x: 10, h: 80, fill: '#10b981', label: 'Umsatz' },
              { x: 60, h: -20, fill: '#ef4444', label: '' },
              { x: 110, h: 60, fill: '#0ea5e9', label: 'DB I' },
              { x: 160, h: -15, fill: '#f97316', label: '' },
              { x: 210, h: 45, fill: '#3b82f6', label: 'DB II' },
              { x: 260, h: 30, fill: '#ec4899', label: 'DB V' },
            ].map((bar, i) => (
              <motion.rect
                key={i}
                x={bar.x} y={bar.h > 0 ? 95 - bar.h : 95}
                width="35" height={Math.abs(bar.h)} rx="4"
                fill={bar.fill}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                style={{ transformOrigin: `${bar.x + 17}px 95px` }}
              />
            ))}
          </svg>
        </motion.div>
        <p className="text-gray-500 text-sm mt-4">DB I → DB V aus Ihren DATEV-Buchungen</p>
      </div>
    );
  }

  // ─── DB Level KPI data ───
  const dbCards = [
    { key: 'db1', amount: result.totals.db1, pct: result.percentages.db1_pct },
    { key: 'db2', amount: result.totals.db2, pct: result.percentages.db2_pct },
    { key: 'db3', amount: result.totals.db3, pct: result.percentages.db3_pct },
    { key: 'db4', amount: result.totals.db4, pct: result.percentages.db4_pct },
    { key: 'db5', amount: result.totals.db5, pct: result.percentages.db5_pct },
  ] as const;

  // ─── Waterfall chart data ───
  const waterfallChartData = result.waterfallData.map(item => ({
    name: item.name,
    base: item.isSubtotal ? 0 : item.base,
    value: item.isSubtotal ? item.value : Math.abs(item.value),
    total: item.isSubtotal ? item.value : undefined,
    fill: item.fill,
    isSubtotal: item.isSubtotal,
  }));

  // ─── Dimension comparison data ───
  const comparisonData = result.byDimension
    .filter(d => d.key !== 'total')
    .slice(0, 10)
    .map(d => ({
      name: d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label,
      fullName: d.label,
      'DB I': d.db1_pct,
      'DB II': d.db2_pct,
      'DB III': d.db3_pct,
      'DB V': d.db5_pct,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* ═══ Header + Dimension Selector ═══ */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
        <BorderBeam size={200} duration={20} colorFrom="#14b8a6" colorTo="#10b981" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-400" />
              Mehrstufige Deckungsbeitragsrechnung
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {result.meta.bookingCount.toLocaleString('de-DE')} Buchungen · {result.meta.period}
            </p>
          </div>

          {/* Dimension Pills */}
          <div className="flex bg-white/[0.04] rounded-xl p-1 border border-white/[0.06] gap-0.5">
            {(['total', 'cost_center', 'profit_center', 'customer'] as Dimension[]).map((d) => (
              <button
                key={d}
                onClick={() => setDimension(d)}
                className="relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                {dimension === d && (
                  <motion.div
                    layoutId="activeDimension"
                    className="absolute inset-0 bg-gradient-to-r from-teal-500/80 to-emerald-500/80 rounded-lg shadow-lg shadow-teal-500/20"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className={`relative z-10 ${dimension === d ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>
                  {DIMENSION_LABELS[d]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Revenue Banner ═══ */}
      <BlurFade delay={0.05} inView>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative bg-gradient-to-r from-emerald-500/[0.08] to-teal-500/[0.04] backdrop-blur-xl rounded-xl border border-emerald-500/[0.12] p-5 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-400/70 mb-1">Umsatzerlöse</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                <NumberTicker value={Math.round(result.totals.revenue)} suffix=" €" />
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
        </motion.div>
      </BlurFade>

      {/* ═══ 5 DB KPI Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {dbCards.map((card, idx) => {
          const level = DB_LEVELS[card.key];
          const isNegative = card.amount < 0;
          return (
            <BlurFade key={card.key} delay={0.08 + idx * 0.06} inView>
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4 overflow-hidden hover:border-white/[0.12] transition-colors"
              >
                <BorderBeam size={60} duration={12} delay={idx * 3} colorFrom={level.color} colorTo={level.color + '80'} />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-400">{level.shortLabel}</span>
                  {isNegative ? (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: level.color }} />
                  )}
                </div>
                <p className={`text-lg font-bold tracking-tight ${isNegative ? 'text-red-400' : 'text-white'}`}>
                  <NumberTicker value={Math.abs(Math.round(card.amount))} prefix={isNegative ? '-' : ''} suffix=" €" />
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(5, Math.abs(card.pct)))}%`,
                      backgroundColor: isNegative ? '#ef4444' : level.color,
                      opacity: 0.6,
                    }}
                  />
                  <span className="text-[10px] text-gray-500">{formatPct(card.pct)}</span>
                </div>
              </motion.div>
            </BlurFade>
          );
        })}
      </div>

      {/* ═══ Waterfall Chart ═══ */}
      <BlurFade delay={0.2} inView>
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
          <BorderBeam size={150} duration={18} colorFrom="#14b8a6" colorTo="#8b5cf6" />
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Wasserfall: Umsatz → DB V
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={waterfallChartData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
              />
              {/* Invisible base for waterfall stacking */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              {/* Actual values */}
              <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
                {waterfallChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} opacity={entry.isSubtotal ? 1 : 0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BlurFade>

      {/* ═══ Dimension Comparison (wenn nicht 'total') ═══ */}
      {dimension !== 'total' && comparisonData.length > 0 && (
        <BlurFade delay={0.25} inView>
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 tracking-tight">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              DB-Margen nach {DIMENSION_LABELS[dimension]}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v: unknown) => `${Number(v ?? 0).toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(v: unknown) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{String(v)}</span>}
                />
                <Bar dataKey="DB I" fill={DB_LEVELS.db1.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="DB II" fill={DB_LEVELS.db2.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="DB III" fill={DB_LEVELS.db3.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="DB V" fill={DB_LEVELS.db5.color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BlurFade>
      )}

      {/* ═══ Detail Table ═══ */}
      <BlurFade delay={0.3} inView>
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
          <BorderBeam size={200} duration={25} colorFrom="#14b8a6" colorTo="#22c55e" />
          <h3 className="text-white font-semibold mb-4 tracking-tight">Detaillierte Stufenrechnung</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-3 font-semibold">Posten</th>
                  <th className="pb-3 text-right font-semibold">Betrag</th>
                  <th className="pb-3 text-right font-semibold">% Umsatz</th>
                  <th className="pb-3 text-right font-semibold">Marge</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, idx) => (
                  <TableRow
                    key={idx}
                    row={row}
                    idx={idx}
                    isExpanded={expandedCategories.has(idx)}
                    onToggle={() => toggleExpand(idx)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </BlurFade>

      {/* ═══ KI-Insights ═══ */}
      {result.insights.length > 0 && (
        <BlurFade delay={0.35} inView>
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h3 className="text-white font-semibold tracking-tight">KI-Insights</h3>
            </div>
            <div className="space-y-3">
              {result.insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-300 leading-relaxed">{insight}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </BlurFade>
      )}
    </motion.div>
  );
}

// ─── Table Row Sub-Component ───

function TableRow({
  row, idx, isExpanded, onToggle,
}: {
  row: ContributionRow;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isDB = row.isSubtotal;
  const hasChildren = row.children && row.children.length > 0;
  const levelColor = isDB && row.level !== 'cost_header' && row.level !== 'cost_item'
    ? DB_LEVELS[row.level as keyof typeof DB_LEVELS]?.color
    : undefined;

  return (
    <>
      <tr
        onClick={hasChildren ? onToggle : undefined}
        className={`
          border-b border-white/[0.04] transition-colors
          ${isDB ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
          ${hasChildren ? 'cursor-pointer' : ''}
        `}
      >
        <td className={`py-3 pr-4 ${isDB ? 'font-semibold' : ''}`}>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </motion.div>
            )}
            {!hasChildren && row.isCategory && <span className="w-3.5" />}
            <span style={levelColor ? { color: levelColor } : { color: isDB ? '#fff' : '#d1d5db' }}>
              {row.label}
            </span>
          </div>
        </td>
        <td className={`py-3 text-right tabular-nums ${
          row.amount < 0 ? 'text-red-400' : isDB ? 'text-white font-semibold' : 'text-gray-300'
        }`}>
          {formatCurrency(row.amount)}
        </td>
        <td className="py-3 text-right tabular-nums text-gray-400">
          {row.percentage > 0 ? formatPct(row.percentage) : '—'}
        </td>
        <td className="py-3 text-right tabular-nums">
          {row.isSubtotal ? (
            <span style={{ color: levelColor || '#fff' }}>{formatPct(row.marginPercentage)}</span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
      </tr>

      {/* Expandable children */}
      <AnimatePresence>
        {isExpanded && hasChildren && row.children!.map((child, childIdx) => (
          <motion.tr
            key={`${idx}-${childIdx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/[0.01] border-b border-white/[0.02]"
          >
            <td className="py-2 pl-10 text-xs text-gray-400">{child.label}</td>
            <td className="py-2 text-right text-xs tabular-nums text-gray-400">
              {formatCurrency(child.amount)}
            </td>
            <td className="py-2 text-right text-xs tabular-nums text-gray-500">
              {child.percentage > 0 ? formatPct(child.percentage) : '—'}
            </td>
            <td className="py-2 text-right text-xs text-gray-600">—</td>
          </motion.tr>
        ))}
      </AnimatePresence>
    </>
  );
}
