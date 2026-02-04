'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  FileText,
  Zap,
} from 'lucide-react';
import { FormatDetectionResult } from '@/lib/parsers';
import { DataProfile } from '@/lib/types';

interface MagicUploadProps {
  onUploadComplete: (profile: DataProfile, period: 'prev' | 'curr') => void;
  period: 'prev' | 'curr';
  label: string;
  existingProfile?: DataProfile | null;
}

export default function MagicUpload({
  onUploadComplete,
  period,
  label,
  existingProfile,
}: MagicUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [detection, setDetection] = useState<FormatDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      setDetection(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('period', period);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setDetection(data.detection);
          onUploadComplete(data.profile, period);
        } else {
          setError(data.error || 'Upload fehlgeschlagen');
        }
      } catch (err) {
        setError('Verbindungsfehler beim Upload');
      } finally {
        setIsUploading(false);
      }
    },
    [period, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 border-green-500/30';
    if (confidence >= 0.6) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-orange-500/20 border-orange-500/30';
  };

  // Already uploaded state
  if (existingProfile) {
    return (
      <div className="relative border-2 border-green-500/50 bg-green-500/5 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">{label}</h3>
            <p className="text-green-400 text-sm mb-3">
              {existingProfile.rowCount.toLocaleString('de-DE')} Buchungen geladen
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Zeitraum</p>
                <p className="text-white">
                  {existingProfile.dateRange.min} – {existingProfile.dateRange.max}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Summe</p>
                <p className="text-white">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(existingProfile.totals.all)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Konten</p>
                <p className="text-white">{existingProfile.uniqueAccounts}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Qualität</p>
                <p
                  className={
                    existingProfile.warnings.length === 0 ? 'text-green-400' : 'text-yellow-400'
                  }
                >
                  {existingProfile.warnings.length === 0
                    ? '✓ Gut'
                    : `${existingProfile.warnings.length} Hinweise`}
                </p>
              </div>
            </div>

            {detection && (
              <div className={`mt-3 p-2 rounded-lg border ${getConfidenceBg(detection.confidence)}`}>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-white">{detection.formatLabel}</span>
                  <span className={`ml-auto ${getConfidenceColor(detection.confidence)}`}>
                    {(detection.confidence * 100).toFixed(0)}% Konfidenz
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Upload state
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
        isDragOver
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-white/20 hover:border-blue-500/50 bg-white/5'
      }`}
    >
      {isUploading ? (
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-white font-medium">Magic Upload analysiert...</p>
          <p className="text-gray-500 text-sm">Format-Erkennung & Import in DuckDB</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-sm text-gray-400 hover:text-white"
          >
            Erneut versuchen
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center cursor-pointer">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="relative mb-4">
            <Upload className="w-12 h-12 text-gray-500" />
            <Zap className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          <p className="text-white font-semibold mb-1">{label}</p>
          <p className="text-gray-500 text-sm text-center">
            CSV, XLSX, SAP, DATEV, Lexware
            <br />
            <span className="text-xs text-purple-400">✨ Automatische Format-Erkennung</span>
          </p>
        </label>
      )}
    </div>
  );
}
