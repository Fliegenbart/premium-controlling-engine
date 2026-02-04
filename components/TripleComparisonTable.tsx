'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { TripleAccountDeviation, TripleAnalysisResult } from '@/lib/types';

interface TripleComparisonTableProps {
  result: TripleAnalysisResult;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

type SortField =
  | 'account'
  | 'amount_ist'
  | 'delta_plan_abs'
  | 'delta_plan_pct'
  | 'delta_vj_abs'
  | 'delta_vj_pct';
type SortDir = 'asc' | 'desc';

export default function TripleComparisonTable({ result }: TripleComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('delta_plan_abs');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const sortedData = useMemo(() => {
    let data = [...result.by_account];

    if (statusFilter) {
      data = data.filter((d) => d.status === statusFilter);
    }

    data.sort((a, b) => {
      const aVal = Math.abs(a[sortField] as number);
      const bVal = Math.abs(b[sortField] as number);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [result.by_account, sortField, sortDir, statusFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Im Plan
          </span>
        );
      case 'over_plan':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Über Plan
          </span>
        );
      case 'under_plan':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Unter Plan
          </span>
        );
      case 'critical':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Kritisch
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Traffic Light Summary */}
      <div className="flex items-center gap-4 p-4 bg-[#12121a] rounded-xl border border-white/10">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">Ampel-Status:</span>
        </div>

        <button
          onClick={() => setStatusFilter(statusFilter === 'on_track' ? null : 'on_track')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            statusFilter === 'on_track'
              ? 'bg-green-500/30 ring-2 ring-green-500'
              : 'bg-green-500/10 hover:bg-green-500/20'
          }`}
        >
          <span className="text-green-400 font-bold">{result.traffic_light.green}</span>
          <span className="text-green-400/70 text-sm">🟢 Grün</span>
        </button>

        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === 'over_plan' || statusFilter === 'under_plan' ? null : 'over_plan'
            )
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            statusFilter === 'over_plan' || statusFilter === 'under_plan'
              ? 'bg-yellow-500/30 ring-2 ring-yellow-500'
              : 'bg-yellow-500/10 hover:bg-yellow-500/20'
          }`}
        >
          <span className="text-yellow-400 font-bold">{result.traffic_light.yellow}</span>
          <span className="text-yellow-400/70 text-sm">🟡 Gelb</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'critical' ? null : 'critical')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            statusFilter === 'critical'
              ? 'bg-red-500/30 ring-2 ring-red-500'
              : 'bg-red-500/10 hover:bg-red-500/20'
          }`}
        >
          <span className="text-red-400 font-bold">{result.traffic_light.red}</span>
          <span className="text-red-400/70 text-sm">🔴 Rot</span>
        </button>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="ml-auto text-gray-400 hover:text-white text-sm"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4 w-8"></th>
                <th
                  className="p-4 cursor-pointer hover:text-white"
                  onClick={() => toggleSort('account')}
                >
                  Konto {sortField === 'account' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="p-4 text-right">Vorjahr</th>
                <th className="p-4 text-right">Plan</th>
                <th
                  className="p-4 text-right cursor-pointer hover:text-white"
                  onClick={() => toggleSort('amount_ist')}
                >
                  Ist {sortField === 'amount_ist' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="p-4 text-right cursor-pointer hover:text-white"
                  onClick={() => toggleSort('delta_plan_abs')}
                >
                  Δ Plan {sortField === 'delta_plan_abs' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="p-4 text-right cursor-pointer hover:text-white"
                  onClick={() => toggleSort('delta_vj_abs')}
                >
                  Δ VJ {sortField === 'delta_vj_abs' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((dev) => (
                <>
                  <tr
                    key={dev.account}
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === dev.account ? null : dev.account)}
                  >
                    <td className="p-4">
                      {expandedRow === dev.account ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{dev.account_name}</div>
                      <div className="text-gray-500 text-xs">Konto {dev.account}</div>
                    </td>
                    <td className="p-4 text-right text-gray-400 font-mono text-sm">
                      {formatCurrency(dev.amount_vj)}
                    </td>
                    <td className="p-4 text-right text-gray-400 font-mono text-sm">
                      {formatCurrency(dev.amount_plan)}
                    </td>
                    <td className="p-4 text-right text-white font-mono font-medium">
                      {formatCurrency(dev.amount_ist)}
                    </td>
                    <td className="p-4 text-right">
                      <div
                        className={`font-mono font-medium ${
                          dev.delta_plan_abs > 0 ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {formatCurrency(dev.delta_plan_abs)}
                      </div>
                      <div
                        className={`text-xs ${
                          dev.delta_plan_pct > 0 ? 'text-red-400/70' : 'text-green-400/70'
                        }`}
                      >
                        {formatPercent(dev.delta_plan_pct)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div
                        className={`font-mono text-sm ${
                          dev.delta_vj_abs > 0 ? 'text-orange-400' : 'text-blue-400'
                        }`}
                      >
                        {formatCurrency(dev.delta_vj_abs)}
                      </div>
                      <div
                        className={`text-xs ${
                          dev.delta_vj_pct > 0 ? 'text-orange-400/70' : 'text-blue-400/70'
                        }`}
                      >
                        {formatPercent(dev.delta_vj_pct)}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(dev.status)}</td>
                  </tr>

                  {/* Expanded Row with Top Bookings */}
                  {expandedRow === dev.account && dev.top_bookings_ist && (
                    <tr className="bg-white/5">
                      <td colSpan={8} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm font-medium">
                            Top {dev.top_bookings_ist.length} Buchungen (Ist)
                          </span>
                          <span className="text-gray-500 text-xs ml-2">{dev.comment}</span>
                        </div>
                        <div className="grid gap-2">
                          {dev.top_bookings_ist.map((b, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-black/20 rounded-lg px-4 py-2 text-sm"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-blue-400 font-mono">{b.document_no}</span>
                                <span className="text-gray-400">{b.date}</span>
                                <span className="text-gray-300">{b.text.substring(0, 50)}</span>
                              </div>
                              <span
                                className={`font-mono font-medium ${
                                  b.amount < 0 ? 'text-red-400' : 'text-green-400'
                                }`}
                              >
                                {formatCurrency(b.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
