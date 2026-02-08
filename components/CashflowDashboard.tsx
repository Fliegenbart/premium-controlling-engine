'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  ComposedChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Building2,
  Landmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { calculateCashflowStatement } from '@/lib/cashflow-engine';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { CASHFLOW_CATEGORIES, CashflowCategory, CashflowResult } from '@/lib/cashflow-types';

interface CashflowDashboardProps {
  bookings: Booking[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

// ─── Empty State ───

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <svg viewBox="0 0 300 160" className="w-72 h-40 mb-8" fill="none">
        {/* Animated flow lines */}
        <motion.path
          d="M 40 80 C 80 40, 120 40, 150 80"
          stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />
        <motion.path
          d="M 150 80 C 180 120, 220 120, 260 80"
          stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.path
          d="M 80 130 C 120 90, 180 90, 220 130"
          stroke="#ec4899" strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 1 }}
        />
        {/* Center node */}
        <motion.circle cx="150" cy="80" r="12" fill="#080b16" stroke="#ec4899" strokeWidth="2"
          animate={{ r: [12, 15, 12] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle cx="150" cy="80" r="6" fill="#ec4899" opacity="0.5"
          animate={{ r: [6, 9, 6], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        {/* Labels */}
        <text x="40" y="75" fill="#10b981" fontSize="9" opacity="0.7">Operativ</text>
        <text x="235" y="75" fill="#a855f7" fontSize="9" opacity="0.7">Invest</text>
        <text x="130" y="150" fill="#ec4899" fontSize="9" opacity="0.7">Finanz</text>
      </svg>
      <h3 className="text-xl font-semibold text-white mb-2">Kapitalflussrechnung (DRS 21)</h3>
      <p className="text-gray-400 text-center max-w-md text-sm">
        Laden Sie Buchungsdaten hoch, um eine vollständige Kapitalflussrechnung mit operativem,
        investivem und Finanzierungs-Cashflow zu generieren.
      </p>
    </motion.div>
  );
}

// ─── Category KPI Card ───

function CategoryCard({
  cat,
  summary,
  delay,
}: {
  cat: CashflowCategory;
  summary: { inflows: number; outflows: number; net: number; items: unknown[] };
  delay: number;
}) {
  const meta = CASHFLOW_CATEGORIES[cat];
  const isPositive = summary.net >= 0;
  const icons = { operating: TrendingUp, investing: Building2, financing: Landmark };
  const Icon = icons[cat];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5"
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: meta.color, opacity: 0.12 }}
      />
      <div className="relative flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${meta.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {isPositive ? '+' : ''}{formatCurrency(summary.net)}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-1">{meta.shortLabel}</p>
      <p className="text-2xl font-bold text-white tracking-tight">
        <NumberTicker value={Math.abs(summary.net)} />
        <span className="text-sm text-gray-500 ml-1">€</span>
      </p>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Zufluss {formatCurrency(summary.inflows)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Abfluss {formatCurrency(summary.outflows)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Netto Banner ───

function NettoBanner({ result }: { result: CashflowResult }) {
  const isPos = result.netCashflow >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-xl border p-6 backdrop-blur-xl ${
        isPos
          ? 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] via-teal-500/[0.04] to-transparent'
          : 'border-red-500/20 bg-gradient-to-r from-red-500/[0.08] via-orange-500/[0.04] to-transparent'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Netto-Cashflow</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-white">
              {isPos ? '+' : ''}<NumberTicker value={Math.abs(result.netCashflow)} />
            </span>
            <span className="text-lg text-gray-400">€</span>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Free CF</p>
            <p className={`text-lg font-semibold ${result.freeCashflow >= 0 ? 'text-pink-300' : 'text-orange-400'}`}>
              {formatCurrency(result.freeCashflow)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">CF-Marge</p>
            <p className="text-lg font-semibold text-white">
              {result.operatingCashflowMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Waterfall Chart ───

function WaterfallChart({ data }: { data: CashflowResult['waterfallData'] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5"
    >
      <h3 className="text-sm font-semibold text-white mb-4">Cashflow-Wasserfall</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '12px', boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)', color: '#111827', fontSize: 12 }}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="value" stackId="w" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} opacity={entry.isSubtotal ? 1 : 0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Monthly Trend Chart ───

function MonthlyChart({ monthly }: { monthly: CashflowResult['monthly'] }) {
  if (monthly.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5"
    >
      <h3 className="text-sm font-semibold text-white mb-4">Monatliche Cashflow-Entwicklung</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="monthLabel" tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '12px', boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)', color: '#111827', fontSize: 12 }}
          />
          <Bar dataKey="operating" fill="#10b981" name="Operativ" radius={[3, 3, 0, 0]} opacity={0.7} />
          <Bar dataKey="investing" fill="#a855f7" name="Investition" radius={[3, 3, 0, 0]} opacity={0.7} />
          <Bar dataKey="financing" fill="#ec4899" name="Finanzierung" radius={[3, 3, 0, 0]} opacity={0.7} />
          <Line type="monotone" dataKey="cumulativeCashflow" stroke="#f472b6" strokeWidth={2} name="Kumuliert" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Zu-/Abfluss Chart ───

function FlowChart({ result }: { result: CashflowResult }) {
  const data = [
    { name: 'Operativ', zufluss: result.operating.inflows, abfluss: result.operating.outflows },
    { name: 'Investition', zufluss: result.investing.inflows, abfluss: result.investing.outflows },
    { name: 'Finanzierung', zufluss: result.financing.inflows, abfluss: result.financing.outflows },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5"
    >
      <h3 className="text-sm font-semibold text-white mb-4">Zu- und Abflüsse</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '12px', boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)', color: '#111827', fontSize: 12 }}
          />
          <Bar dataKey="zufluss" fill="#10b981" name="Zuflüsse" radius={[4, 4, 0, 0]} />
          <Bar dataKey="abfluss" fill="#ef4444" name="Abflüsse" radius={[4, 4, 0, 0]} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Detail Table ───

function DetailSection({ result }: { result: CashflowResult }) {
  const [expanded, setExpanded] = useState<CashflowCategory | null>('operating');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-semibold text-white">DRS 21 Detailpositionen</h3>
      {result.categories.map(cat => {
        const isOpen = expanded === cat.category;
        const meta = CASHFLOW_CATEGORIES[cat.category];

        return (
          <div key={cat.category} className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : cat.category)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-sm font-medium text-gray-300">{cat.label}</span>
                <span className="text-[10px] text-gray-600">{cat.items.length} Pos.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${cat.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cat.net >= 0 ? '+' : ''}{formatCurrency(cat.net)}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="border-t border-white/[0.04] overflow-hidden"
                >
                  <div className="px-5 py-3 space-y-1">
                    {cat.items.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1 h-1 rounded-full ${item.direction === 'inflow' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-xs text-gray-400">{item.label}</span>
                          <span className="text-[9px] text-gray-600">({item.bookingCount})</span>
                        </div>
                        <span className={`text-xs font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                        </span>
                      </motion.div>
                    ))}
                    {/* Subtotal */}
                    <div className="flex items-center justify-between py-2 px-3 mt-1 border-t border-white/[0.04]">
                      <span className="text-xs font-semibold text-gray-300">Summe</span>
                      <span className={`text-xs font-bold ${cat.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cat.net >= 0 ? '+' : ''}{formatCurrency(cat.net)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Insights ───

function InsightsPanel({ insights }: { insights: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">KI-Insights</h3>
      </div>
      <div className="grid gap-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.3 + i * 0.08 }}
            className="flex gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.03]"
          >
            <Lightbulb className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">{insight}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ───

export function CashflowDashboard({ bookings }: CashflowDashboardProps) {
  const result = useMemo(() => {
    if (bookings.length === 0) return null;
    return calculateCashflowStatement(bookings);
  }, [bookings]);

  if (!result) return <EmptyState />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-5 pb-12"
    >
      {/* Netto Banner */}
      <NettoBanner result={result} />

      {/* 3 Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryCard cat="operating" summary={result.operating} delay={0.1} />
        <CategoryCard cat="investing" summary={result.investing} delay={0.15} />
        <CategoryCard cat="financing" summary={result.financing} delay={0.2} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WaterfallChart data={result.waterfallData} />
        <FlowChart result={result} />
      </div>

      {/* Monthly Trend */}
      <MonthlyChart monthly={result.monthly} />

      {/* Detail Accordion */}
      <DetailSection result={result} />

      {/* Insights */}
      <InsightsPanel insights={result.insights} />
    </motion.div>
  );
}
