'use client';

import { useState, useEffect } from 'react';
import { Loader2, GitBranch, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  volume_change: { label: 'Mengenänderung', color: 'bg-blue-500/20 text-blue-400', icon: '📊' },
  price_change: { label: 'Preisänderung', color: 'bg-orange-500/20 text-orange-400', icon: '💰' },
  vendor_change: { label: 'Lieferantenwechsel', color: 'bg-cyan-500/20 text-cyan-400', icon: '🔄' },
  timing_shift: { label: 'Zeitverschiebung', color: 'bg-yellow-500/20 text-yellow-400', icon: '⏰' },
  one_time: { label: 'Einmaleffekt', color: 'bg-red-500/20 text-red-400', icon: '⚡' },
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [showDrivers, setShowDrivers] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/root-cause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: deviation.account,
            prevBookings,
            currBookings,
            includeLLMNarrative: true,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setRootCause(data);
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
  }, [deviation.account, prevBookings, currBookings]);

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
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <div>
            <h4 className="text-white font-medium">Ursachenanalyse läuft...</h4>
            <p className="text-gray-500 text-sm mt-1">Buchungen werden geclustert und Treiber identifiziert</p>
          </div>
        </div>
      </div>
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

  if (!rootCause) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <div>
            <h4 className="text-white font-medium">Ursachenanalyse</h4>
            <p className="text-gray-500 text-xs mt-0.5">
              Konto {rootCause.account} • {rootCause.clusters.length} Cluster identifiziert •{' '}
              <span className={rootCause.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(rootCause.confidence * 100)}% Konfidenz
              </span>
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

      {/* AI Narrative */}
      {rootCause.narrative && (
        <div className="p-4 border-b border-white/10 bg-white/5">
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
                          <td className="p-2 text-blue-400 font-mono">{b.document_no}</td>
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

      {/* Drivers Toggle */}
      <div className="border-t border-white/10">
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
    </div>
  );
}
