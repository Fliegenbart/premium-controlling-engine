'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { AnalysisResult } from '@/lib/types';

interface ManagementSummaryProps {
  analysisResult: AnalysisResult;
  entityName?: string;
  workflowStatus: 'draft' | 'review' | 'approved';
}

export function ManagementSummary({
  analysisResult,
  entityName,
  workflowStatus,
}: ManagementSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratedByAI, setIsGeneratedByAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResult,
          entityName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setIsGeneratedByAI(data.generatedByAI);
      } else {
        setError(data.error || 'Generierung fehlgeschlagen');
      }
    } catch (err) {
      setError('Netzwerkfehler bei der Generierung');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on first render if no summary
  if (summary === null && !isLoading && !error) {
    generateSummary();
  }

  return (
    <div className="bg-gradient-to-br from-pink-500/10 via-fuchsia-500/10 to-white/5 rounded-2xl border border-white/[0.08] p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Management Summary
          {isGeneratedByAI && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
              KI-generiert
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              workflowStatus === 'draft'
                ? 'bg-yellow-500/20 text-yellow-400'
                : workflowStatus === 'review'
                ? 'bg-fuchsia-500/20 text-fuchsia-300'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {workflowStatus === 'draft'
              ? 'Entwurf'
              : workflowStatus === 'review'
              ? 'In Prüfung'
              : 'Freigegeben'}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
          <div className="h-4 bg-white/10 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-white/10 rounded animate-pulse w-4/6" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Summary Content */}
      {summary && !isLoading && (
        <p className="text-gray-300 whitespace-pre-line leading-relaxed">{summary}</p>
      )}

      {/* Regenerate Button */}
      {!isLoading && (
      <button
          onClick={generateSummary}
          className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-pink-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Neu generieren
        </button>
      )}
    </div>
  );
}
