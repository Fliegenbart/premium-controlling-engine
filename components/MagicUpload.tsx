'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  FileText,
  Database,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { magicParse, ParseResult, getParseResultSummary } from '@/lib/magic-upload';
import { getFormatDisplayName, FileFormat } from '@/lib/magic-upload/format-detector';
import { Booking } from '@/lib/types';

interface MagicUploadProps {
  onBookingsParsed: (bookings: Booking[], period: 'prev' | 'curr', fileName: string) => void;
  period: 'prev' | 'curr';
  label: string;
  existingFile?: string;
}

const FORMAT_ICONS: Record<FileFormat, string> = {
  sap_fbl3n: '🔷',
  sap_fagll03: '🔷',
  sap_s_alr: '🔷',
  datev_buchungen: '🟢',
  datev_kost: '🟢',
  lexware: '🟡',
  generic_csv: '📄',
  unknown: '❓',
};

const FORMAT_COLORS: Record<FileFormat, string> = {
  sap_fbl3n: 'bg-[#007AFF]/10',
  sap_fagll03: 'bg-[#007AFF]/10',
  sap_s_alr: 'bg-[#007AFF]/10',
  datev_buchungen: 'bg-emerald-500/10',
  datev_kost: 'bg-emerald-500/10',
  lexware: 'bg-amber-500/10',
  generic_csv: 'bg-gray-500/10',
  unknown: 'bg-red-500/10',
};

export function MagicUpload({ onBookingsParsed, period, label, existingFile }: MagicUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>(existingFile || '');
  const [showDetails, setShowDetails] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);
    setResult(null);

    try {
      const content = await file.text();
      const parseResult = magicParse(content);

      setResult(parseResult);

      if (parseResult.success) {
        onBookingsParsed(parseResult.bookings, period, file.name);
      }
    } catch (error) {
      setResult({
        success: false,
        bookings: [],
        detection: {
          format: 'unknown',
          confidence: 0,
          detectedColumns: [],
          mappedColumns: {},
          encoding: 'utf-8',
          delimiter: ';',
          decimalSeparator: ',',
          dateFormat: 'DD.MM.YYYY',
          sampleRows: [],
          warnings: [(error as Error).message],
        },
        stats: { totalRows: 0, parsedRows: 0, skippedRows: 0, totalAmount: 0 },
        errors: ['Fehler beim Lesen der Datei: ' + (error as Error).message],
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onBookingsParsed, period]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const clearFile = () => {
    setResult(null);
    setFileName('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${
          isDragging
            ? 'border-[#007AFF] bg-[#007AFF]/[0.04]'
            : result?.success
            ? 'border-emerald-400/40 bg-emerald-500/[0.03]'
            : result && !result.success
            ? 'border-red-400/40 bg-red-500/[0.03]'
            : 'border-black/[0.08] hover:border-black/[0.15] bg-[rgb(var(--bg-surface))]'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-medium">Analysiere Datei...</p>
              <p className="text-gray-500 text-sm">Format wird automatisch erkannt</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-3">
            {/* Success/Error Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {result.success ? (
                  <div className={`w-10 h-10 rounded-xl ${FORMAT_COLORS[result.detection.format]} flex items-center justify-center`}>
                    <span className="text-lg">{FORMAT_ICONS[result.detection.format]}</span>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
                <div>
                  <p className="text-gray-900 font-medium flex items-center gap-2">
                    {fileName}
                    {result.success && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getFormatDisplayName(result.detection.format)}
                    {result.detection.confidence > 0 && (
                      <span className="ml-2 text-gray-400">
                        ({result.detection.confidence.toFixed(0)}% Konfidenz)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Stats */}
            {result.success && (
              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="bg-[rgb(var(--bg-surface))] rounded-xl px-3 py-2.5 text-center border border-black/[0.04]">
                  <p className="text-lg font-bold text-gray-900">{result.stats.parsedRows}</p>
                  <p className="text-xs text-gray-500">Buchungen</p>
                </div>
                <div className="bg-[rgb(var(--bg-surface))] rounded-xl px-3 py-2.5 text-center border border-black/[0.04]">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(result.stats.totalAmount)}</p>
                  <p className="text-xs text-gray-500">Summe</p>
                </div>
                <div className="bg-[rgb(var(--bg-surface))] rounded-xl px-3 py-2.5 text-center border border-black/[0.04]">
                  <p className="text-lg font-bold text-gray-400">{result.stats.skippedRows}</p>
                  <p className="text-xs text-gray-500">Übersprungen</p>
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.slice(0, 3).map((error, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </p>
                ))}
                {result.errors.length > 3 && (
                  <p className="text-xs text-gray-500">
                    + {result.errors.length - 3} weitere Fehler
                  </p>
                )}
              </div>
            )}

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Erkannte Spalten anzeigen
            </button>

            {/* Column Details */}
            {showDetails && (
              <div className="bg-[rgb(var(--bg-surface))] rounded-xl p-3 text-xs border border-black/[0.04]">
                <p className="text-gray-500 mb-2">Spalten-Mapping:</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(result.detection.mappedColumns).map(([field, index]) => (
                    <div key={field} className="flex items-center gap-1">
                      <span className="text-gray-400">{field}:</span>
                      <span className="text-gray-900">{result.detection.detectedColumns[index as number] || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/[0.08] flex items-center justify-center">
                <Upload className="w-7 h-7 text-[#007AFF]" />
              </div>
              <div className="text-center">
                <p className="text-gray-900 font-medium">{label}</p>
                <p className="text-gray-500 text-sm">
                  SAP, DATEV, CSV – wird automatisch erkannt
                </p>
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Format Badges */}
      {!result && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-[#007AFF]/[0.06] text-[#007AFF] rounded-full font-medium">SAP</span>
          <span className="px-2.5 py-1 bg-emerald-500/[0.06] text-emerald-600 rounded-full font-medium">DATEV</span>
          <span className="px-2.5 py-1 bg-amber-500/[0.06] text-amber-600 rounded-full font-medium">Lexware</span>
          <span className="px-2.5 py-1 bg-gray-500/[0.06] text-gray-500 rounded-full font-medium">CSV</span>
        </div>
      )}
    </div>
  );
}

/**
 * Combined Magic Upload for VJ and Current Period
 */
interface MagicUploadPairProps {
  onPrevParsed: (bookings: Booking[], fileName: string) => void;
  onCurrParsed: (bookings: Booking[], fileName: string) => void;
}

export function MagicUploadPair({ onPrevParsed, onCurrParsed }: MagicUploadPairProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <MagicUpload
          period="prev"
          label="Vorjahr hochladen"
          onBookingsParsed={(bookings, _, fileName) => onPrevParsed(bookings, fileName)}
        />
      </div>
      <div>
        <MagicUpload
          period="curr"
          label="Aktuell hochladen"
          onBookingsParsed={(bookings, _, fileName) => onCurrParsed(bookings, fileName)}
        />
      </div>
    </div>
  );
}
