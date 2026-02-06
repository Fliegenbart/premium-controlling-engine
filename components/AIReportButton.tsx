'use client';

import { useState } from 'react';
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { AnalysisResult } from '@/lib/types';

interface AIReportButtonProps {
  analysisResult: AnalysisResult | null;
  disabled?: boolean;
}

type LoadingStage = 'analyzing' | 'generating' | 'formatting' | 'complete';

export default function AIReportButton({ analysisResult, disabled }: AIReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeAI, setIncludeAI] = useState(true);

  const progressMessages: Record<LoadingStage, string> = {
    analyzing: 'KI analysiert Daten...',
    generating: 'Erstelle Executive Summary...',
    formatting: 'Formatiere Report...',
    complete: 'Report bereit!',
  };

  const handleGenerateReport = async () => {
    if (!analysisResult) {
      setError('Keine Analysedaten vorhanden');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStage('analyzing');

    try {
      // Stage 1: Analyzing
      setLoadingStage('analyzing');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Generating
      setLoadingStage('generating');
      const response = await fetch('/api/generate-ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: analysisResult,
          includeAI,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Report-Generierung fehlgeschlagen (${response.status})`
        );
      }

      // Stage 3: Formatting
      setLoadingStage('formatting');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monatsbericht_${analysisResult.meta.period_curr}.docx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setLoadingStage('complete');
      setTimeout(() => {
        setIsLoading(false);
        setLoadingStage(null);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      setIsLoading(false);
      setLoadingStage(null);
      console.error('Report generation error:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={disabled || !analysisResult || isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            disabled || !analysisResult || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generiere...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>📊 KI-Monatsbericht generieren</span>
            </>
          )}
        </button>

        {/* AI Toggle */}
        <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          <input
            type="checkbox"
            checked={includeAI}
            onChange={(e) => setIncludeAI(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Mit KI</span>
        </label>
      </div>

      {/* Loading Progress */}
      {isLoading && loadingStage && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          {loadingStage === 'complete' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <span>{progressMessages[loadingStage]}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Fehler</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!isLoading && !error && analysisResult && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          {includeAI
            ? '✓ KI-gestützte Analyse mit Ollama'
            : '✓ Fallback-Template-Generierung'}
        </div>
      )}
    </div>
  );
}
