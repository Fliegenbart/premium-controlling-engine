'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { TripleAnalysisResult, TripleAccountDeviation } from '@/lib/types';

interface TripleComparisonTableProps {
  result: TripleAnalysisResult;
  onShowEvidence?: (deviation: TripleAccountDeviation) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'on_track':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
          <CheckCircle className="w-3 h-3" />
          Im Plan
        </span>
      );
    case 'over_plan':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
          <AlertTriangle className="w-3 h-3" />
          Über Plan
        </span>
      );
    case 'under_plan':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
          <TrendingDown className="w-3 h-3" />
          Unter Plan
        </span>
      );
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
          <AlertCircle className="w-3 h-3" />
          Kritisch
        </span>
      );
    default:
      return null;
  }
}

function DeltaCell({ value, percent, isExpense = false }: { value: number; percent: number; isExpense?: boolean }) {
  // For expenses: positive = bad (over budget), negative = good
  // For revenue: positive = good, negative = bad
  const isGood = isExpense ? value < 0 : value > 0;
  const isBad = isExpense ? value > 0 : value < 0;
  const isNeutral = Math.abs(percent) < 2;

  return (
    <div className={`text-right ${isNeutral ? 'text-gray-400' : isGood ? 'text-green-400' : 'text-red-400'}`}>
      <div className="font-medium flex items-center justify-end gap-1">
        {value > 0 ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {formatCurrency(value)}
      </div>
      <div className="text-xs opacity-70">{formatPercent(percent)}</div>
    </div>
  );
}

export function TripleComparisonTable({ result, onShowEvidence }: TripleComparisonTableProps) {
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'delta_plan' | 'delta_vj' | 'amount'>('delta_plan');
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  // Sort and filter data
  let displayData = [...result.by_account];

  if (showOnlyProblems) {
    displayData = displayData.filter(d => d.status === 'critical' || d.status === 'over_plan');
  }

  displayData.sort((a, b) => {
    switch (sortBy) {
      case 'delta_plan':
        return Math.abs(b.delta_plan_abs) - Math.abs(a.delta_plan_abs);
      case 'delta_vj':
        return Math.abs(b.delta_vj_abs) - Math.abs(a.delta_vj_abs);
      case 'amount':
        return Math.abs(b.amount_ist) - Math.abs(a.amount_ist);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-4">
      {/* Traffic Light Summary */}
      <div className="flex items-center gap-6 p-4 bg-white/5 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full" />
          <span className="text-white font-medium">{result.traffic_light.green}</span>
          <span className="text-gray-400 text-sm">Im Plan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-full" />
          <span className="text-white font-medium">{result.traffic_light.yellow}</span>
          <span className="text-gray-400 text-sm">Abweichung</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full" />
          <span className="text-white font-medium">{result.traffic_light.red}</span>
          <span className="text-gray-400 text-sm">Kritisch</span>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-sm text-gray-400">Planerfüllung</div>
          <div className={`text-xl font-bold ${
            result.summary.plan_achievement_pct >= 95 ? 'text-green-400' :
            result.summary.plan_achievement_pct >= 85 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {result.summary.plan_achievement_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex bg-white/5 rounded-lg p-1">
          {[
            { key: 'delta_plan', label: 'Nach Plan-Δ' },
            { key: 'delta_vj', label: 'Nach VJ-Δ' },
            { key: 'amount', label: 'Nach Betrag' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as typeof sortBy)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                sortBy === key ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyProblems}
            onChange={e => setShowOnlyProblems(e.target.checked)}
            className="rounded bg-white/10 border-white/20"
          />
          Nur Problemfälle
        </label>
      </div>

      {/* Table */}
      <div className="bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="p-4 text-gray-400 text-sm font-medium">Konto</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-right">{result.meta.period_vj}</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-right">{result.meta.period_plan}</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-right">{result.meta.period_ist}</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-right">Δ Plan</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-right">Δ VJ</th>
              <th className="p-4 text-gray-400 text-sm font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((deviation, idx) => {
              const isExpense = deviation.account >= 5000;
              const isExpanded = expandedAccount === deviation.account;

              return (
                <>
                  <tr
                    key={deviation.account}
                    onClick={() => setExpandedAccount(isExpanded ? null : deviation.account)}
                    className={`border-t border-white/5 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-white/10' : 'hover:bg-white/5'
                    } ${deviation.status === 'critical' ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                        <div>
                          <span className="text-gray-500 text-xs mr-2">{deviation.account}</span>
                          <span className="text-white">{deviation.account_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right text-gray-400 font-mono">
                      {formatCurrency(deviation.amount_vj)}
                    </td>
                    <td className="p-4 text-right text-blue-400 font-mono">
                      {formatCurrency(deviation.amount_plan)}
                    </td>
                    <td className="p-4 text-right text-white font-mono font-medium">
                      {formatCurrency(deviation.amount_ist)}
                    </td>
                    <td className="p-4">
                      <DeltaCell
                        value={deviation.delta_plan_abs}
                        percent={deviation.delta_plan_pct}
                        isExpense={isExpense}
                      />
                    </td>
                    <td className="p-4">
                      <DeltaCell
                        value={deviation.delta_vj_abs}
                        percent={deviation.delta_vj_pct}
                        isExpense={isExpense}
                      />
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={deviation.status} />
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-white/5">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Comment */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Analyse</h4>
                            <p className="text-gray-300 text-sm">{deviation.comment}</p>
                          </div>

                          {/* Top Bookings */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-400">Top Buchungen</h4>
                              {onShowEvidence && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowEvidence(deviation);
                                  }}
                                  className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Alle anzeigen
                                </button>
                              )}
                            </div>
                            {deviation.top_bookings_ist && deviation.top_bookings_ist.length > 0 ? (
                              <div className="space-y-1">
                                {deviation.top_bookings_ist.slice(0, 3).map((b, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 truncate max-w-[200px]">
                                      {b.text}
                                    </span>
                                    <span className="text-white font-mono">{formatCurrency(b.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">Keine Buchungen</p>
                            )}
                          </div>
                        </div>

                        {/* Plan vs VJ Info */}
                        <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                          <p className="text-blue-300 text-xs">
                            💡 Plan war {deviation.plan_vs_vj_pct >= 0 ? 'ambitionierter' : 'konservativer'} als VJ:{' '}
                            {formatCurrency(deviation.plan_vs_vj_abs)} ({formatPercent(deviation.plan_vs_vj_pct)})
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {displayData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {showOnlyProblems
              ? 'Keine Problemfälle gefunden - alles im grünen Bereich! 🎉'
              : 'Keine Abweichungen gefunden'}
          </div>
        )}
      </div>
    </div>
  );
}
