'use client';

import { useState } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, Database, X, Sparkles } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

interface NLQueryResult {
  success: boolean;
  question: string;
  sql: string;
  result: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
  confidence: number;
}

export function NLQueryBar() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Abfrage fehlgeschlagen');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'Zeig alle Konten mit >10% Abweichung',
    'Welche Kostenstelle hat die höchsten Kosten?',
    'Top 5 Lieferanten nach Betrag',
    'Buchungen über 50.000€ im aktuellen Jahr',
  ];

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (Math.abs(value) > 100) return formatCurrency(value);
      return value.toFixed(2);
    }
    return String(value);
  };

  return (
    <div className="mb-6">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-[#0b0614] rounded-xl border border-white/10 focus-within:border-pink-400/60 focus-within:ring-4 focus-within:ring-pink-400/10 transition-colors">
          <Search className="w-5 h-5 text-gray-500 ml-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Frag deine Daten... z.B. 'Welche Konten haben >20% Abweichung?'"
            className="flex-1 bg-transparent text-white px-4 py-3.5 focus:outline-none placeholder-gray-500 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResult(null); setError(null); }}
              className="p-2 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="m-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors flex items-center gap-2 bg-gradient-to-br from-pink-500 to-fuchsia-500 hover:from-pink-400 hover:to-fuchsia-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Abfragen
          </button>
        </div>
      </form>

      {/* Suggestions - only when empty */}
      {!result && !error && !query && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setQuery(s)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-4 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Result Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-pink-300" />
              <span className="text-white text-sm font-medium">
                {result.result.rowCount} Ergebnis{result.result.rowCount !== 1 ? 'se' : ''}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                result.confidence > 0.8 ? 'bg-green-500/20 text-green-400' :
                result.confidence > 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {Math.round(result.confidence * 100)}% Konfidenz
              </span>
            </div>
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="flex items-center gap-1 text-gray-500 hover:text-white text-xs transition-colors"
            >
              SQL {showSQL ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* SQL Query (collapsed) */}
          {showSQL && (
            <div className="p-4 bg-white/5 border-b border-white/10">
              <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">{result.sql}</pre>
            </div>
          )}

          {/* Results Table */}
          {result.result.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    {result.result.columns.map((col, i) => (
                      <th key={i} className="p-3 text-left text-gray-400 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.result.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                      {result.result.columns.map((col, j) => (
                        <td key={j} className="p-3 text-gray-300">
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.result.rowCount > 20 && (
                <p className="p-3 text-xs text-gray-500 text-center border-t border-white/5">
                  Zeige 20 von {result.result.rowCount} Ergebnissen
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
