'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { TripleAnalysisResult } from '@/lib/types';

interface TripleUploadProps {
  onAnalysisComplete: (result: TripleAnalysisResult) => void;
  apiKey?: string;
}

interface FileState {
  file: File | null;
  name: string;
  status: 'empty' | 'selected' | 'error';
}

export function TripleUpload({ onAnalysisComplete, apiKey }: TripleUploadProps) {
  const [files, setFiles] = useState<{
    vj: FileState;
    plan: FileState;
    ist: FileState;
  }>({
    vj: { file: null, name: '', status: 'empty' },
    plan: { file: null, name: '', status: 'empty' },
    ist: { file: null, name: '', status: 'empty' },
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config
  const [periodVJ, setPeriodVJ] = useState('2024');
  const [periodPlan, setPeriodPlan] = useState('Plan 2025');
  const [periodIst, setPeriodIst] = useState('Ist 2025');

  const handleFileSelect = (type: 'vj' | 'plan' | 'ist') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [type]: { file, name: file.name, status: 'selected' },
      }));
      setError(null);
    }
  };

  const handleFileDrop = (type: 'vj' | 'plan' | 'ist') => (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setFiles(prev => ({
        ...prev,
        [type]: { file, name: file.name, status: 'selected' },
      }));
      setError(null);
    }
  };

  const removeFile = (type: 'vj' | 'plan' | 'ist') => {
    setFiles(prev => ({
      ...prev,
      [type]: { file: null, name: '', status: 'empty' },
    }));
  };

  const handleAnalyze = async () => {
    if (!files.ist.file) {
      setError('Bitte mindestens die Ist-Daten hochladen');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('istFile', files.ist.file);
      if (files.vj.file) formData.append('vjFile', files.vj.file);
      if (files.plan.file) formData.append('planFile', files.plan.file);
      formData.append('periodVJ', periodVJ);
      formData.append('periodPlan', periodPlan);
      formData.append('periodIst', periodIst);
      if (apiKey) formData.append('apiKey', apiKey);

      const response = await fetch('/api/analyze-triple', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analyse fehlgeschlagen');
      }

      const result: TripleAnalysisResult = await response.json();
      onAnalysisComplete(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const FileDropZone = ({
    type,
    label,
    required = false,
    color,
  }: {
    type: 'vj' | 'plan' | 'ist';
    label: string;
    required?: boolean;
    color: string;
  }) => {
    const state = files[type];

    return (
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
          state.status === 'selected'
            ? `border-${color}-500/50 bg-${color}-500/10`
            : 'border-white/20 hover:border-white/40 bg-white/5'
        }`}
        onDragOver={e => e.preventDefault()}
        onDrop={handleFileDrop(type)}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileSelect(type)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {state.status === 'selected' ? (
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
              <FileSpreadsheet className={`w-5 h-5 text-${color}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{state.name}</p>
              <p className="text-gray-400 text-xs">{label}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(type);
              }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-white font-medium">{label}</p>
            <p className="text-gray-500 text-xs mt-1">
              CSV oder XLSX {required && <span className="text-red-400">*</span>}
            </p>
          </div>
        )}
      </div>
    );
  };

  const canAnalyze = files.ist.file !== null;

  return (
    <div className="space-y-6">
      {/* Period Names */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Vorjahr</label>
          <input
            type="text"
            value={periodVJ}
            onChange={e => setPeriodVJ(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Plan</label>
          <input
            type="text"
            value={periodPlan}
            onChange={e => setPeriodPlan(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ist</label>
          <input
            type="text"
            value={periodIst}
            onChange={e => setPeriodIst(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* File Upload Areas */}
      <div className="grid grid-cols-3 gap-4">
        <FileDropZone type="vj" label="Vorjahr (optional)" color="gray" />
        <FileDropZone type="plan" label="Plan/Budget (optional)" color="blue" />
        <FileDropZone type="ist" label="Ist-Daten" required color="green" />
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-blue-300 text-sm">
          💡 Tipp: Nur Ist-Daten sind Pflicht. Ohne VJ/Plan wird automatisch verglichen.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze || isAnalyzing}
        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
          canAnalyze && !isAnalyzing
            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analysiere Plan vs. Ist vs. VJ...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Dreifach-Vergleich starten
          </>
        )}
      </button>
    </div>
  );
}
