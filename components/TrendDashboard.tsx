'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { TrendAnalysisResult, AccountTrend, CostCenterTrend, TrendAlert } from '@/lib/trend-analysis';

interface TrendDashboardProps {
  result: TrendAnalysisResult;
  isLoading?: boolean;
}

type SortBy = 'cagr' | 'volatility' | 'amount' | 'name';
type ViewMode = 'accounts' | 'costcenters';

/**
 * Multi-Period Trend Dashboard
 * Visualizes account and cost center trends with statistical analysis
 */
export function TrendDashboard({ result, isLoading = false }: TrendDashboardProps) {
  const [sortBy, setSortBy] = useState<SortBy>('cagr');
  const [viewMode, setViewMode] = useState<ViewMode>('accounts');
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  // Sort accounts by selected metric
  const sortedAccounts = useMemo(() => {
    const accounts = [...result.accountTrends];

    switch (sortBy) {
      case 'cagr':
        return accounts.sort((a, b) => Math.abs(b.cagr) - Math.abs(a.cagr));
      case 'volatility':
        return accounts.sort((a, b) => b.coefficientOfVariation - a.coefficientOfVariation);
      case 'amount':
        return accounts.sort((a, b) => {
          const aAmount = a.periods[a.periods.length - 1]?.amount || 0;
          const bAmount = b.periods[b.periods.length - 1]?.amount || 0;
          return Math.abs(bAmount) - Math.abs(aAmount);
        });
      case 'name':
        return accounts.sort((a, b) => a.account_name.localeCompare(b.account_name));
      default:
        return accounts;
    }
  }, [result.accountTrends, sortBy]);

  // Sort cost centers
  const sortedCostCenters = useMemo(() => {
    const centers = [...result.costCenterTrends];

    switch (sortBy) {
      case 'cagr':
        return centers.sort((a, b) => Math.abs(b.cagr) - Math.abs(a.cagr));
      case 'volatility':
        // Cost centers don't have CV, use CAGR as fallback
        return centers.sort((a, b) => Math.abs(b.cagr) - Math.abs(a.cagr));
      case 'amount':
        return centers.sort((a, b) => {
          const aAmount = a.periods[a.periods.length - 1]?.amount || 0;
          const bAmount = b.periods[b.periods.length - 1]?.amount || 0;
          return Math.abs(bAmount) - Math.abs(aAmount);
        });
      case 'name':
        return centers.sort((a, b) => a.cost_center.localeCompare(b.cost_center));
      default:
        return centers;
    }
  }, [result.costCenterTrends, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-100">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p>Trend analysis in progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Period Trend Analysis</h1>
        <p className="text-gray-400">
          {result.meta.periodCount} periods analyzed ({result.meta.periodLabels.join(', ')}) with{' '}
          {result.meta.totalBookings.toLocaleString()} bookings
        </p>
        <p className="text-sm text-gray-500 mt-2">Analysis date: {new Date(result.meta.analysisDate).toLocaleString()}</p>
      </div>

      {/* Alerts Section */}
      {result.alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Alerts & Anomalies</h2>
          <div className="space-y-3">
            {result.alerts.slice(0, 5).map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-900 border-red-700 text-red-100'
                    : alert.severity === 'warning'
                      ? 'bg-yellow-900 border-yellow-700 text-yellow-100'
                      : 'bg-blue-900 border-blue-700 text-blue-100'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-current bg-opacity-20">
                      {alert.severity === 'critical' ? '!' : alert.severity === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{alert.type}</h3>
                    <p className="text-sm mt-1">{alert.message}</p>
                    {alert.account && <p className="text-xs mt-1 opacity-75">Account: {alert.account}</p>}
                  </div>
                </div>
              </div>
            ))}
            {result.alerts.length > 5 && (
              <p className="text-sm text-gray-400">
                +{result.alerts.length - 5} more alerts...
              </p>
            )}
          </div>
        </div>
      )}

      {/* P&L Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue & Expense Trend */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4">Revenue & Expense Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={result.pnlTrend.periods}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: number | undefined) => value ? value.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : ''}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Revenue CAGR</p>
              <p className={`text-xl font-bold ${result.pnlTrend.revenueCagr > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(result.pnlTrend.revenueCagr * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Expense CAGR</p>
              <p className={`text-xl font-bold ${result.pnlTrend.expenseCagr < 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(result.pnlTrend.expenseCagr * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Profit Margin Trend */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4">Profit Margin Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={result.pnlTrend.periods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: number | undefined) => value ? (value as number).toFixed(2) + '%' : ''}
              />
              <Legend />
              <Line type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={2} name="Margin %" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <p className="text-sm text-gray-400">Margin Trend</p>
            <p
              className={`text-xl font-bold ${
                result.pnlTrend.marginTrend === 'improving' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {result.pnlTrend.marginTrend === 'improving' ? '↑' : '↓'} {result.pnlTrend.marginTrend}
            </p>
          </div>
        </div>
      </div>

      {/* View Mode & Sort Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('accounts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'accounts'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Accounts ({result.accountTrends.length})
          </button>
          <button
            onClick={() => setViewMode('costcenters')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'costcenters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Cost Centers ({result.costCenterTrends.length})
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 hover:border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="cagr">Sort by CAGR</option>
            <option value="volatility">Sort by Volatility</option>
            <option value="amount">Sort by Current Amount</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Account Trends */}
      {viewMode === 'accounts' && (
        <div className="space-y-6">
          {sortedAccounts.slice(0, 10).map((account) => (
            <AccountTrendCard
              key={`${account.account}-${account.account_name}`}
              account={account}
              isSelected={selectedAccount === account.account}
              onSelect={() => setSelectedAccount(selectedAccount === account.account ? null : account.account)}
            />
          ))}
        </div>
      )}

      {/* Cost Center Trends */}
      {viewMode === 'costcenters' && (
        <div className="space-y-6">
          {sortedCostCenters.slice(0, 10).map((costCenter) => (
            <CostCenterTrendCard key={costCenter.cost_center} costCenter={costCenter} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Account Trend Card Component
 */
function AccountTrendCard({
  account,
  isSelected,
  onSelect,
}: {
  account: AccountTrend;
  isSelected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const lastAmount = account.periods[account.periods.length - 1]?.amount || 0;
  const firstAmount = account.periods[0]?.amount || 0;
  const hasAnomalies = account.anomalies.length > 0;

  return (
    <div
      className={`bg-gray-800 rounded-lg p-6 border transition-colors cursor-pointer ${
        isSelected ? 'border-blue-500 bg-gray-750' : 'border-gray-700 hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Account Info & Stats */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h3 className="font-bold text-lg">{account.account}</h3>
            <p className="text-sm text-gray-400">{account.account_name}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Trend</p>
              <p className="font-semibold">
                <TrendBadge trend={account.trend} />
              </p>
            </div>

            <div>
              <p className="text-gray-400">CAGR</p>
              <p className={`font-semibold ${account.cagr > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(account.cagr * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-gray-400">Volatility (CV)</p>
              <p className={`font-semibold ${account.coefficientOfVariation > 0.5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                {(account.coefficientOfVariation * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-gray-400">Std Dev</p>
              <p className="font-semibold">{account.standardDeviation.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</p>
            </div>

            <div>
              <p className="text-gray-400">Current</p>
              <p className="font-semibold">{lastAmount.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</p>
            </div>

            {hasAnomalies && (
              <div className="pt-2 border-t border-gray-700">
                <p className="text-yellow-400 text-xs font-semibold">⚠ {account.anomalies.length} anomalies</p>
              </div>
            )}
          </div>
        </div>

        {/* Trend Line Chart */}
        <div className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={account.periods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: number | undefined) => value ? value.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : ''}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Forecast */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">
              Forecast (Next Period): <span className="font-semibold text-gray-200">
                {account.forecast.nextPeriod.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
              </span>
              {' '}
              <span className="text-gray-500">({account.forecast.method}, {(account.forecast.confidence * 100).toFixed(0)}% confidence)</span>
            </p>
          </div>

          {/* Anomalies */}
          {hasAnomalies && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-yellow-400 font-semibold mb-2">Anomalies Detected:</p>
              <div className="space-y-1">
                {account.anomalies.map((anom, idx) => (
                  <p key={idx} className="text-xs text-gray-400">
                    {anom.period}: Expected {anom.expected.toLocaleString('de-DE', { maximumFractionDigits: 0 })}, got{' '}
                    {anom.actual.toLocaleString('de-DE', { maximumFractionDigits: 0 })} (Δ{anom.deviation.toLocaleString('de-DE', { maximumFractionDigits: 0 })})
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Cost Center Trend Card Component
 */
function CostCenterTrendCard({
  costCenter,
}: {
  costCenter: CostCenterTrend;
}): React.ReactElement {
  const lastAmount = costCenter.periods[costCenter.periods.length - 1]?.amount || 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cost Center Info & Stats */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h3 className="font-bold text-lg">{costCenter.cost_center}</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Trend</p>
              <p className="font-semibold">
                <TrendBadge trend={costCenter.trend} />
              </p>
            </div>

            <div>
              <p className="text-gray-400">CAGR</p>
              <p className={`font-semibold ${costCenter.cagr > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(costCenter.cagr * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-gray-400">Current</p>
              <p className="font-semibold">{lastAmount.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={costCenter.periods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: number | undefined) => value ? value.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : ''}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/**
 * Trend Badge Component
 */
function TrendBadge({
  trend,
}: {
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
}): React.ReactElement {
  const config = {
    rising: { bg: 'bg-green-900', text: 'text-green-200', label: '↑ Rising' },
    falling: { bg: 'bg-red-900', text: 'text-red-200', label: '↓ Falling' },
    stable: { bg: 'bg-blue-900', text: 'text-blue-200', label: '→ Stable' },
    volatile: { bg: 'bg-yellow-900', text: 'text-yellow-200', label: '⚠ Volatile' },
  };

  const c = config[trend];

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
