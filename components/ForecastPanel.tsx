'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend
} from 'recharts';

interface ForecastPoint {
  period: string;
  value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

interface ForecastResult {
  historical: Array<{ period: string; value: number }>;
  forecast: ForecastPoint[];
  model: {
    type: string;
    slope: number;
    intercept: number;
    r_squared: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trend_strength: 'strong' | 'moderate' | 'weak';
  };
  statistics: {
    mean: number;
    std_dev: number;
    min: number;
    max: number;
    growth_rate: number;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

export default function ForecastPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [method, setMethod] = useState<'auto' | 'linear' | 'moving_average' | 'exponential'>('auto');
  const [periodsAhead, setPeriodsAhead] = useState(3);

  const runForecast = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'controlling.bookings_curr',
          method,
          periodsAhead,
          metric: 'amount',
          groupBy: 'month'
        })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Forecast fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (!result) return null;
    switch (result.model.trend) {
      case 'increasing':
        return <ArrowUpRight className="w-5 h-5 text-green-400" />;
      case 'decreasing':
        return <ArrowDownRight className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  // Prepare chart data
  const chartData = result ? [
    ...result.historical.map(h => ({
      period: h.period.substring(0, 7),
      historical: h.value,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null
    })),
    ...result.forecast.map(f => ({
      period: f.period,
      historical: null as number | null,
      forecast: f.value,
      lower: f.lower_bound,
      upper: f.upper_bound
    }))
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-[0_18px_60px_-35px_rgba(236,72,153,0.85)]">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Forecast</h2>
            <p className="text-gray-500 text-sm">Lineare Regression & Trendanalyse</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="px-3 py-2 bg-white/5 text-white rounded-lg border border-white/10 text-sm"
          >
            <option value="auto">Automatisch</option>
            <option value="linear">Linear</option>
            <option value="moving_average">Gleitender Durchschnitt</option>
            <option value="exponential">Exponentiell</option>
          </select>

          <select
            value={periodsAhead}
            onChange={(e) => setPeriodsAhead(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/5 text-white rounded-lg border border-white/10 text-sm"
          >
            <option value="3">3 Monate</option>
            <option value="6">6 Monate</option>
            <option value="12">12 Monate</option>
          </select>

          <button
            onClick={runForecast}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-colors bg-gradient-to-br from-pink-500 to-fuchsia-500 hover:from-pink-400 hover:to-fuchsia-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            Forecast erstellen
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Trend</p>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-white font-medium capitalize">
                  {result.model.trend === 'increasing' ? 'Steigend' :
                   result.model.trend === 'decreasing' ? 'Fallend' : 'Stabil'}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {result.model.trend_strength === 'strong' ? 'Stark' :
                 result.model.trend_strength === 'moderate' ? 'Moderat' : 'Schwach'}
              </p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">R² Score</p>
              <p className={`text-xl font-bold ${
                result.model.r_squared > 0.7 ? 'text-green-400' :
                result.model.r_squared > 0.4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(result.model.r_squared * 100).toFixed(1)}%
              </p>
              <p className="text-gray-500 text-xs">Modellgüte</p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Ø Monat</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(result.statistics.mean)}
              </p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Wachstum gesamt</p>
              <p className={`text-xl font-bold ${
                result.statistics.growth_rate > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.statistics.growth_rate > 0 ? '+' : ''}{result.statistics.growth_rate.toFixed(1)}%
              </p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Methode</p>
              <p className="text-white font-medium capitalize">{result.model.type}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-300" />
              Forecast Visualisierung
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #2d2d44',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                  }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="1"
                  stroke="none"
                  fill="#a855f7"
                  fillOpacity={0.1}
                  name="Obergrenze"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="2"
                  stroke="none"
                  fill="#a855f7"
                  fillOpacity={0.1}
                  name="Untergrenze"
                />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                  name="Historisch"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#ec4899"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#ec4899', r: 4 }}
                  name="Forecast"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Values */}
          <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-300" />
              Prognostizierte Werte
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {result.forecast.map((f, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">{f.period}</p>
                  <p className="text-xl font-bold text-pink-300 my-1">
                    {formatCurrency(f.value)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Bereich: {formatCurrency(f.lower_bound)} - {formatCurrency(f.upper_bound)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Konfidenz: {(f.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="bg-[#12121a] rounded-xl border border-white/10 p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Noch kein Forecast erstellt</p>
          <p className="text-gray-500 text-sm">Laden Sie Daten hoch und erstellen Sie einen Forecast</p>
        </div>
      )}
    </div>
  );
}
