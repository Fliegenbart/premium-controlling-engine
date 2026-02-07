'use client';

import { useState, useEffect } from 'react';
import { Loader2, GitBranch, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Sparkles, ThumbsUp, ThumbsDown, Zap, BarChart3, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountDeviation, Booking } from '@/lib/types';

interface BookingCluster {
  label: string;
  type: string;
  totalAmount: number;
  contributionPct: number;
  description: string;
  bookings: Array<{ date: string; amount: number; text: string; vendor: string | null; customer: string | null; document_no: string }>;
}

interface VarianceDriver {
  dimension: string;
  key: string;
  prevAmount: number;
  currAmount: number;
  contribution: number;
  contributionPct: number;
}

interface RootCause {
  id: string;
  account: number;
  account_name: string;
  totalVariance: number;
  clusters: BookingCluster[];
  drivers: VarianceDriver[];
  narrative?: string;
  confidence: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const clusterTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  new_cost: { label: 'Neue Kosten', color: 'bg-purple-500/20 text-purple-400', icon: '🆕' },
  removed_cost: { label: 'Weggefallen', color: 'bg-gray-500/20 text-gray-400', icon: '🗑️' },
  volume_change: { label: 'Mengenänderung', color: 'bg-fuchsia-500/20 text-fuchsia-300', icon: '📊' },
  price_change: { label: 'Preisänderung', color: 'bg-orange-500/20 text-orange-400', icon: '💰' },
  vendor_change: { label: 'Lieferantenwechsel', color: 'bg-pink-500/20 text-pink-300', icon: '🔄' },
  timing_shift: { label: 'Zeitverschiebung', color: 'bg-yellow-500/20 text-yellow-400', icon: '⏰' },
  one_time: { label: 'Einmaleffekt', color: 'bg-red-500/20 text-red-400', icon: '⚡' },
};

interface ExplanationResponse {
  summary: string;
  factors: Array<{
    label: string;
    impact: number;
    type: 'increase' | 'decrease';
  }>;
  topBookings: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  pattern: 'seasonal' | 'structural' | 'one-time' | 'trend';
  confidence: number;
}

const patternIcons: Record<string, React.ReactNode> = {
  seasonal: <Calendar className="w-4 h-4" />,
  structural: <BarChart3 className="w-4 h-4" />,
  'one-time': <Zap className="w-4 h-4" />,
  trend: <TrendingUp className="w-4 h-4" />,
};

const patternLabels: Record<string, string> = {
  seasonal: 'Saisonales Muster',
  structural: 'Strukturelle Änderung',
  'one-time': 'Einmaleffekt',
  trend: 'Trend',
};

interface RootCausePanelProps {
  deviation: AccountDeviation;
  prevBookings: Booking[];
  currBookings: Booking[];
  onClose: () => void;
  onFeedback?: (positive: boolean) => void;
}

export function RootCausePanel({ deviation, prevBookings, currBookings, onClose, onFeedback }: RootCausePanelProps) {
  const [rootCause, setRootCause] = useState<RootCause | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First try the new explain-deviation API for AI auto-comments
        const explanationResponse = await fetch('/api/explain-deviation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviation,
            prevBookings,
            currBookings,
          }),
        });

        if (explanationResponse.ok) {
          const explanationData = await explanationResponse.json();
          setExplanation(explanationData);
        }

        // Also run traditional root cause analysis for detailed clusters
        const rcResponse = await fetch('/api/root-cause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: deviation.account,
            prevBookings,
            currBookings,
            includeLLMNarrative: false,
          }),
        });

        const data = await rcResponse.json();
        if (rcResponse.ok) {
          setRootCause(data.result || data);
        } else {
          setError(data.error || 'Analyse fehlgeschlagen');
        }
      } catch {
        setError('Netzwerkfehler bei der Ursachenanalyse');
      } finally {
        setIsLoading(false);
      }
    };

    analyze();
  }, [deviation, prevBookings, currBookings]);

  const handleFeedback = async (positive: boolean) => {
    setFeedbackGiven(true);
    onFeedback?.(positive);

    try {
      await fetch('/api/rag/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: deviation.account,
          account_name: deviation.account_name,
          comment: rootCause?.narrative || '',
          correctedComment: positive ? undefined : 'needs_improvement',
          isPositive: positive,
        }),
      });
    } catch {
      // Silently fail on feedback
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <div>
            <h4 className="text-white font-medium">Ursachenanalyse läuft...</h4>
            <p className="text-gray-500 text-sm mt-1">Buchungen werden analysiert und KI-Kommentare generiert</p>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="mt-4 space-y-3">
          <motion.div
            className="h-4 bg-white/10 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="h-4 bg-white/10 rounded-full w-5/6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
          <motion.div
            className="h-4 bg-white/10 rounded-full w-4/6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!explanation && !rootCause) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <div>
            <h4 className="text-white font-semibold">KI-Abweichungskommentare</h4>
            <p className="text-gray-400 text-xs mt-0.5">
              Konto {deviation.account} • {deviation.account_name}
              {explanation && (
                <>
                  {' '}• <span className={explanation.confidence > 0.75 ? 'text-green-400' : explanation.confidence > 0.5 ? 'text-yellow-400' : 'text-orange-400'}>{Math.round(explanation.confidence * 100)}% Konfidenz</span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          Schließen
        </button>
      </div>

      {/* New Explanation Section */}
      {explanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.4 }}
          className="border-b border-white/[0.06] bg-gradient-to-br from-yellow-500/5 to-orange-500/5 overflow-hidden"
        >
          <div className="p-4 space-y-4">
            {/* Summary with gradient accent */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-orange-400 to-transparent rounded-r-full" />
              <p className="text-gray-100 text-sm leading-relaxed pl-3">{explanation.summary}</p>
            </motion.div>

            {/* Factor Bars */}
            {explanation.factors.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hauptfaktoren</p>
                {explanation.factors.map((factor, idx) => {
                  const maxImpact = Math.max(...explanation.factors.map((f) => Math.abs(f.impact)));
                  const percentage = maxImpact > 0 ? (Math.abs(factor.impact) / maxImpact) * 100 : 0;
                  const isIncrease = factor.type === 'increase';

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.25 + idx * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">{factor.label}</span>
                        <span className={`text-xs font-semibold ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
                          {isIncrease ? '+' : '-'}{Math.abs(factor.impact).toLocaleString('de-DE')} EUR
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.35 + idx * 0.05, ease: 'easeOut' }}
                          className={`h-full rounded-full ${isIncrease ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-green-500 to-green-400'}`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Top Bookings */}
            {explanation.topBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="space-y-2 pt-2 border-t border-white/10"
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Größte Buchungen</p>
                <div className="space-y-1">
                  {explanation.topBookings.map((booking, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{booking.description}</p>
                        <p className="text-xs text-gray-500">{booking.date}</p>
                      </div>
                      <span className={`text-xs font-semibold ml-2 shrink-0 ${booking.amount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {Math.abs(booking.amount).toLocaleString('de-DE')} EUR
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pattern Badge and Confidence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="flex items-center justify-between pt-2 border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-500/[0.15] border border-pink-500/25">
                  {patternIcons[explanation.pattern]}
                  <span className="text-xs text-pink-200 font-medium">{patternLabels[explanation.pattern]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Vertrauen:</span>
                <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${explanation.confidence * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      explanation.confidence > 0.75
                        ? 'bg-green-500'
                        : explanation.confidence > 0.5
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* AI Narrative from traditional analysis */}
      {rootCause?.narrative && (
        <div className="p-4 border-b border-white/[0.06] bg-white/5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-gray-300 text-sm leading-relaxed">{rootCause.narrative}</p>
              {!feedbackGiven && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-500">War diese Analyse hilfreich?</span>
                  <button
                    onClick={() => handleFeedback(true)}
                    className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-500 hover:text-green-400" />
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                  </button>
                </div>
              )}
              {feedbackGiven && (
                <p className="text-xs text-gray-500 mt-2">Danke für dein Feedback!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clusters */}
      {rootCause && rootCause.clusters && rootCause.clusters.length > 0 && (
        <div className="p-4 space-y-2">
          {rootCause.clusters.map((cluster, idx) => {
          const typeInfo = clusterTypeLabels[cluster.type] || { label: cluster.type, color: 'bg-gray-500/20 text-gray-400', icon: '📌' };
          const isExpanded = expandedCluster === idx;

          return (
            <div key={idx} className="bg-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCluster(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{typeInfo.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{cluster.label}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{cluster.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${cluster.totalAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(cluster.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">{cluster.contributionPct.toFixed(0)}% der Abweichung</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </button>

              {isExpanded && cluster.bookings.length > 0 && (
                <div className="border-t border-white/5">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5">
                      <tr className="text-gray-500">
                        <th className="p-2 text-left">Datum</th>
                        <th className="p-2 text-left">Beleg</th>
                        <th className="p-2 text-left">Text</th>
                        <th className="p-2 text-right">Betrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.bookings.slice(0, 5).map((b, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="p-2 text-gray-400">{b.date}</td>
                          <td className="p-2 text-pink-300 font-mono">{b.document_no}</td>
                          <td className="p-2 text-gray-300 max-w-[200px] truncate">{b.text}</td>
                          <td className={`p-2 text-right font-medium ${b.amount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {formatCurrency(b.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}

      {/* Drivers Toggle */}
      {rootCause && rootCause.drivers && rootCause.drivers.length > 0 && (
      <div className="border-t border-white/[0.06]">
        <button
          onClick={() => setShowDrivers(!showDrivers)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <span className="text-gray-400 text-sm">Dimensionale Treiber</span>
          {showDrivers ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showDrivers && rootCause.drivers.length > 0 && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {rootCause.drivers.slice(0, 8).map((driver, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{driver.dimension}</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{driver.key}</span>
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${driver.contribution > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(driver.contributionPct))}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-16 text-right ${driver.contribution > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(driver.contribution)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </motion.div>
  );
}
