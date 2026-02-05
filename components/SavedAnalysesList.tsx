'use client';

import { useState } from 'react';
import {
  History,
  Trash2,
  Clock,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { SavedAnalysis } from '@/lib/types';
import { exportAnalyses, importAnalyses } from '@/lib/storage';

interface SavedAnalysesListProps {
  analyses: SavedAnalysis[];
  onLoad: (analysis: SavedAnalysis) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function SavedAnalysesList({
  analyses,
  onLoad,
  onDelete,
  onRefresh,
}: SavedAnalysesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const handleExport = () => {
    const json = exportAnalyses();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Controlling_Analysen_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const count = importAnalyses(importText);
    if (count > 0) {
      onRefresh();
      setShowImportModal(false);
      setImportText('');
    }
  };

  const statusConfig = {
    draft: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Entwurf' },
    review: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Prüfung' },
    approved: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Freigegeben' },
  };

  if (analyses.length === 0) return null;

  return (
    <>
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] rounded-2xl border border-white/10 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Analysen importieren</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="JSON-Daten hier einfügen..."
              className="w-full h-48 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
              >
                Importieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Analyses Panel */}
      <div className="bg-[#12121a] rounded-2xl border border-white/10 mb-8 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">Gespeicherte Analysen</span>
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-400">
              {analyses.length}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-white/10">
            {/* Actions */}
            <div className="flex gap-2 p-4 border-b border-white/10">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300"
              >
                <Download className="w-4 h-4" />
                Exportieren
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300"
              >
                <Upload className="w-4 h-4" />
                Importieren
              </button>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
              {analyses.map((analysis) => {
                const status = statusConfig[analysis.workflow_status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onLoad(analysis)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{analysis.name}</p>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{analysis.entity}</span>
                        <span>|</span>
                        <span>{analysis.period_prev} vs {analysis.period_curr}</span>
                        <span>|</span>
                        <span>{formatDate(analysis.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Abweichung: {formatCurrency(analysis.result.summary.total_delta)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Analyse wirklich löschen?')) {
                          onDelete(analysis.id);
                        }
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
