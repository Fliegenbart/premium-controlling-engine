'use client';

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Filter,
  Zap,
} from 'lucide-react';
import { BookingError, ErrorDetectionResult } from '@/lib/booking-error-detection';

interface BookingErrorPanelProps {
  errors: ErrorDetectionResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type CategoryFilter = 'all' | string;

export default function BookingErrorPanel({ errors, isLoading, onRefresh }: BookingErrorPanelProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'impact' | 'confidence'>('severity');

  // Filter and sort errors
  const filteredErrors = useMemo(() => {
    if (!errors) return [];

    let filtered = [...errors.errors];

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((e) => e.severity === severityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'severity') {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return (
          severityOrder[a.severity] - severityOrder[b.severity] ||
          b.financialImpact - a.financialImpact
        );
      } else if (sortBy === 'impact') {
        return b.financialImpact - a.financialImpact;
      } else {
        return b.confidence - a.confidence;
      }
    });

    return filtered;
  }, [errors, severityFilter, categoryFilter, sortBy]);

  const toggleError = (id: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedErrors(newExpanded);
  };

  const handleExportCsv = () => {
    if (!errors || errors.errors.length === 0) return;

    // CSV header
    const headers = [
      'Typ',
      'Schweregrad',
      'Beschreibung',
      'Finanzielle Auswirkung',
      'Konfidenz',
      'Kategorie',
      'Empfohlene Korrektur',
    ];

    // CSV rows
    const rows = errors.errors.map((error) => [
      error.type,
      error.severity,
      error.description,
      error.financialImpact.toFixed(2),
      (error.confidence * 100).toFixed(0) + '%',
      error.category,
      error.suggestedFix,
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'buchungsfehler.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!errors) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Klicken Sie auf "Fehler erkennen", um die Analyse zu starten</p>
      </div>
    );
  }

  const categories = Array.from(new Set(errors.errors.map((e) => e.category))).sort();
  const riskScoreColor =
    errors.riskScore < 20
      ? 'text-green-600'
      : errors.riskScore < 50
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6" />
          Buchungsfehler-Analyse
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Risk Score Gauge */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 font-medium mb-2">Risikoscore</div>
            <div className={`text-4xl font-bold ${riskScoreColor}`}>{errors.riskScore}</div>
            <div className="text-xs text-gray-500 mt-1">von 100</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full transition-all ${
                  errors.riskScore < 20
                    ? 'bg-green-500'
                    : errors.riskScore < 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, errors.riskScore)}%` }}
              />
            </div>
          </div>

          {/* Counts */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-600 font-medium mb-2">Kritisch</div>
            <div className="text-3xl font-bold text-red-700">{errors.summary.criticalCount}</div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium mb-2">Warnung</div>
            <div className="text-3xl font-bold text-yellow-700">{errors.summary.warningCount}</div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-2">Info</div>
            <div className="text-3xl font-bold text-blue-700">{errors.summary.infoCount}</div>
          </div>
        </div>

        {/* Financial Impact */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-600 font-medium mb-1">
            Geschätzte finanzielle Auswirkung
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {errors.summary.estimatedFinancialImpact.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </div>
        </div>

        {/* Top Categories */}
        {errors.summary.topCategories.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 font-medium mb-3">Fehler nach Kategorie</div>
            <div className="space-y-2">
              {errors.summary.topCategories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{cat.category}</span>
                    <span className="text-sm text-gray-500 ml-2">({cat.count})</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {cat.impact.toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {errors.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-medium text-blue-900 mb-2">Empfehlungen</div>
          <ul className="space-y-1 text-sm text-blue-800">
            {errors.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Neu analysieren
        </button>

        {filteredErrors.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Alle exportieren (CSV)
          </button>
        )}

        {/* Severity Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-gray-600" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Alle Schweregrade</option>
            <option value="critical">Kritisch</option>
            <option value="warning">Warnung</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Alle Kategorien</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'severity' | 'impact' | 'confidence')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="severity">Nach Schweregrad</option>
          <option value="impact">Nach Auswirkung</option>
          <option value="confidence">Nach Konfidenz</option>
        </select>
      </div>

      {/* Error List */}
      {filteredErrors.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <p className="text-green-800 font-medium">Keine Fehler gefunden</p>
          <p className="text-green-700 text-sm mt-1">
            {severityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Keine Fehler mit den aktuellen Filtern gefunden'
              : 'Die Buchungen sehen plausibel aus!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((error) => (
            <ErrorCard
              key={error.id}
              error={error}
              isExpanded={expandedErrors.has(error.id)}
              onToggle={() => toggleError(error.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ErrorCardProps {
  error: BookingError;
  isExpanded: boolean;
  onToggle: () => void;
}

function ErrorCard({ error, isExpanded, onToggle }: ErrorCardProps) {
  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
      label: 'Kritisch',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800',
      label: 'Warnung',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Info',
    },
  };

  const config = severityConfig[error.severity];
  const Icon = error.severity === 'critical' ? AlertCircle : error.severity === 'warning' ? AlertTriangle : Info;

  const typeLabels: Record<string, string> = {
    duplicate_payment: 'Doppelte Zahlung',
    wrong_account: 'Falsche Kontierung',
    missing_accrual: 'Fehlende Abgrenzung',
    round_number_suspicious: 'Verdächtig runde Zahl',
    weekend_booking: 'Wochenend-Buchung',
    reversed_sign: 'Verkehrtes Vorzeichen',
    unusual_vendor: 'Ungewöhnlicher Lieferant',
    split_booking_suspicious: 'Verdächtige Aufteilung',
    cross_period: 'Perioden-Überschreitung',
    missing_counter_entry: 'Fehlende Gegenbuchung',
  };

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-start gap-3 hover:opacity-75 transition-opacity"
      >
        <Icon className={`w-5 h-5 ${config.icon} mt-0.5 flex-shrink-0`} />

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{typeLabels[error.type]}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.badge}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-600 ml-auto">
              {(error.confidence * 100).toFixed(0)}% Konfidenz
            </span>
          </div>
          <p className="text-sm text-gray-700">{error.description}</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Finanzielle Auswirkung: </span>
              <span className="font-semibold text-gray-900">
                {error.financialImpact.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <span>{error.affectedBookings.length} betroffene Buchung(en)</span>
            </div>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className={`w-5 h-5 ${config.icon} flex-shrink-0`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${config.icon} flex-shrink-0`} />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t-2 border-current border-opacity-20 px-4 py-3 bg-white bg-opacity-50 space-y-4">
          {/* Suggested Fix */}
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Empfohlene Korrektur</div>
            <p className="text-sm text-gray-700">{error.suggestedFix}</p>
          </div>

          {/* Affected Bookings */}
          {error.affectedBookings.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">Betroffene Buchungen</div>
              <div className="bg-white rounded border border-gray-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Belegnr.</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Datum</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Betrag</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Konto</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {error.affectedBookings.map((booking) => (
                      <tr key={`${booking.document_no}-${booking.posting_date}`} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-900">{booking.document_no}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {new Date(booking.posting_date).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          {booking.amount.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{booking.account}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{booking.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confidence Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">Konfidenz-Score</span>
              <span className="text-xs font-semibold text-gray-700">
                {(error.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${error.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
