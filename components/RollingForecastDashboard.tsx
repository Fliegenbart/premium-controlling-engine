'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Loader2,
  Download,
  Settings,
  BarChart as BarChartIcon,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { RollingForecastResult, ForecastInsight } from '@/lib/rolling-forecast';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);

interface RollingForecastDashboardProps {
  currentBookings: Booking[] | null;
  historicalBookings?: Booking[] | null;
}

export default function RollingForecastDashboard({
  currentBookings,
  historicalBookings,
}: RollingForecastDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RollingForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(12);
  const [method, setMethod] = useState<'auto' | 'seasonal' | 'trend' | 'hybrid'>('hybrid');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (currentBookings && currentBookings.length > 0) {
      generateForecast();
    }
  }, []);

  const generateForecast = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rolling-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'bookings',
          historyTable: 'bookings_history',
          config: {
            forecastHorizon: horizon,
            method,
            seasonalityDetection: true,
            confidenceLevel: 0.95,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Forecast-Generierung fehlgeschlagen');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      console.error('Forecast error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentBookings || currentBookings.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800">Keine Buchungsdaten verfügbar für Forecast</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 Rollierender Forecast</h2>
          <p className="text-sm text-gray-600 mt-1">
            Prognose für Jahresabschluss mit Saisonalitätserkennung
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="Konfiguration"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={generateForecast}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Wird berechnet...' : 'Neu berechnen'}
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prognosehorizont (Monate)
              </label>
              <input
                type="number"
                min="3"
                max="24"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Methode</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="hybrid">Hybrid (Trend + Saisonalität)</option>
                <option value="seasonal">Saisonalität</option>
                <option value="trend">Trend</option>
                <option value="auto">Automatisch</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 mt-2">Forecast wird berechnet...</p>
        </div>
      )}

      {result && !isLoading && (
        <>
          {/* Year-End Projection Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm font-medium text-red-800 mb-1">Pessimistische Prognose</div>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(result.yearEndRange.pessimistic)}
              </div>
              <div className="text-xs text-red-700 mt-2">
                Unteres Konfidenzintervall
              </div>
            </div>

            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Erwartete Prognose</div>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(result.yearEndRange.expected)}
              </div>
              <div className="text-xs text-blue-700 mt-2">
                Punkt-Schätzung
              </div>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800 mb-1">Optimistische Prognose</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(result.yearEndRange.optimistic)}
              </div>
              <div className="text-xs text-green-700 mt-2">
                Oberes Konfidenzintervall
              </div>
            </div>
          </div>

          {/* KPI Summary Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Jahresfortschritt</div>
              <div className="text-2xl font-bold text-gray-900">
                {result.annualProjection.achievementPct}%
              </div>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Umsatz Jahr</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(result.annualProjection.totalRevenue)}
              </div>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Aufwendungen Jahr</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(result.annualProjection.totalExpenses)}
              </div>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Progn. Jahresergebnis</div>
              <div className={`text-2xl font-bold ${result.annualProjection.projectedResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(result.annualProjection.projectedResult)}
              </div>
            </div>
          </div>

          {/* Monthly Timeline Chart */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monatlicher Verlauf</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={result.monthlyTimeline}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value ? formatCurrency(value) : ''}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  fill="url(#colorRevenue)"
                  stroke="#10b981"
                  name="Umsatz"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  fill="url(#colorExpenses)"
                  stroke="#ef4444"
                  name="Aufwendungen"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="result"
                  stroke="#3b82f6"
                  name="Ergebnis"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Cumulative Chart */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kumulativer Verlauf</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={result.monthlyTimeline}>
                <defs>
                  <linearGradient id="cumRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cumExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value ? formatCurrency(value) : ''}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulativeRevenue"
                  fill="url(#cumRevenue)"
                  stroke="#10b981"
                  name="Kum. Umsatz"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeExpenses"
                  fill="url(#cumExpenses)"
                  stroke="#ef4444"
                  name="Kum. Aufwendungen"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Account Forecast Table */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontenprognose</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700 font-semibold">Konto</th>
                    <th className="px-4 py-2 text-left text-gray-700 font-semibold">Kategorie</th>
                    <th className="px-4 py-2 text-right text-gray-700 font-semibold">Ist YTD</th>
                    <th className="px-4 py-2 text-right text-gray-700 font-semibold">Prognose Rest</th>
                    <th className="px-4 py-2 text-right text-gray-700 font-semibold">Jahresprognose</th>
                    <th className="px-4 py-2 text-center text-gray-700 font-semibold">Trend</th>
                    <th className="px-4 py-2 text-right text-gray-700 font-semibold">Konfidenz</th>
                  </tr>
                </thead>
                <tbody>
                  {result.accountForecasts.slice(0, 15).map((forecast) => (
                    <tr key={forecast.account} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{forecast.account}</div>
                        <div className="text-xs text-gray-600">{forecast.account_name}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            forecast.category === 'revenue'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {forecast.category === 'revenue' ? 'Umsatz' : 'Aufwand'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">
                        {formatCurrency(forecast.annualActual)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 font-medium">
                        {formatCurrency(forecast.remainingForecast)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 font-bold">
                        {formatCurrency(forecast.annualProjection)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {forecast.trend === 'increasing' && (
                          <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                        )}
                        {forecast.trend === 'decreasing' && (
                          <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
                        )}
                        {forecast.trend === 'stable' && (
                          <Minus className="w-4 h-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="text-gray-900 font-medium">
                          {formatPercent(forecast.confidence * 100)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Einblicke und Warnungen</h3>
            {result.insights.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Keine speziellen Einblicke verfügbar
              </div>
            ) : (
              <div className="space-y-3">
                {result.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 text-center">
            Forecast generiert: {new Date(result.generatedAt).toLocaleString('de-DE')}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Insight Card Component
 */
function InsightCard({ insight }: { insight: ForecastInsight }) {
  const severityColors = {
    positive: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const iconMap: Record<string, React.ReactNode> = {
    trend: <TrendingUp className="w-4 h-4" />,
    seasonality: <BarChartIcon className="w-4 h-4" />,
    risk: <AlertTriangle className="w-4 h-4" />,
    opportunity: <Lightbulb className="w-4 h-4" />,
  };

  return (
    <div className={`p-4 border rounded-lg flex gap-3 ${severityColors[insight.severity]}`}>
      <div className="flex-shrink-0 mt-0.5">
        {iconMap[insight.type] || <Info className="w-4 h-4" />}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{insight.title}</div>
        <div className="text-sm mt-1">{insight.description}</div>
        {insight.impact !== undefined && (
          <div className="text-xs mt-2 font-medium">
            Auswirkung: {formatCurrency(insight.impact)}
          </div>
        )}
      </div>
    </div>
  );
}
