'use client';

import { useState } from 'react';
import { FileText, Table, Presentation, Download, Loader2, CheckCircle, X, FileSpreadsheet, Sparkles } from 'lucide-react';
import { AnalysisResult } from '@/lib/types';

interface ReportPanelProps {
  analysisResult: AnalysisResult | null;
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 'word' | 'excel' | 'summary';
type ReportStatus = 'idle' | 'generating' | 'done' | 'error';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export function ReportPanel({ analysisResult, isOpen, onClose }: ReportPanelProps) {
  const [status, setStatus] = useState<Record<ReportType, ReportStatus>>({
    word: 'idle',
    excel: 'idle',
    summary: 'idle',
  });

  if (!isOpen || !analysisResult) return null;

  const generateWordReport = async () => {
    setStatus(s => ({ ...s, word: 'generating' }));
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisResult),
      });

      if (!response.ok) throw new Error('Report generation failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Abweichungsanalyse_${analysisResult.meta.period_prev}_vs_${analysisResult.meta.period_curr}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(s => ({ ...s, word: 'done' }));
      setTimeout(() => setStatus(s => ({ ...s, word: 'idle' })), 3000);
    } catch (error) {
      console.error(error);
      setStatus(s => ({ ...s, word: 'error' }));
      setTimeout(() => setStatus(s => ({ ...s, word: 'idle' })), 3000);
    }
  };

  const generateExcelReport = async () => {
    setStatus(s => ({ ...s, excel: 'generating' }));
    try {
      // Build CSV content
      const headers = ['Konto', 'Kontoname', 'Vorjahr', 'Aktuell', 'Delta', 'Delta %', 'Kommentar'];
      const rows = analysisResult.by_account.map(a => [
        a.account,
        `"${a.account_name}"`,
        a.amount_prev,
        a.amount_curr,
        a.delta_abs,
        a.delta_pct.toFixed(1),
        `"${a.comment.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      ]);

      const csv = [
        headers.join(';'),
        ...rows.map(r => r.join(';')),
      ].join('\n');

      // Add BOM for Excel to recognize UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Abweichungsanalyse_${analysisResult.meta.period_prev}_vs_${analysisResult.meta.period_curr}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus(s => ({ ...s, excel: 'done' }));
      setTimeout(() => setStatus(s => ({ ...s, excel: 'idle' })), 3000);
    } catch (error) {
      console.error(error);
      setStatus(s => ({ ...s, excel: 'error' }));
      setTimeout(() => setStatus(s => ({ ...s, excel: 'idle' })), 3000);
    }
  };

  const generateSummaryReport = async () => {
    setStatus(s => ({ ...s, summary: 'generating' }));
    try {
      // Generate a simple text summary for quick sharing
      const top5 = analysisResult.by_account.slice(0, 5);
      const summary = `📊 ABWEICHUNGSANALYSE
${analysisResult.meta.period_prev} vs. ${analysisResult.meta.period_curr}

💰 GESAMTERGEBNIS: ${formatCurrency(analysisResult.summary.total_delta)}

📈 TOP 5 ABWEICHUNGEN:
${top5.map((a, i) => `${i + 1}. ${a.account_name}: ${formatCurrency(a.delta_abs)} (${a.delta_pct >= 0 ? '+' : ''}${a.delta_pct.toFixed(1)}%)`).join('\n')}

📋 DETAILS:
• Erlöse: ${formatCurrency(analysisResult.summary.erloese_curr - analysisResult.summary.erloese_prev)}
• Aufwendungen: ${formatCurrency(analysisResult.summary.aufwendungen_curr - analysisResult.summary.aufwendungen_prev)}
• Analysierte Buchungen: ${analysisResult.meta.bookings_curr}

Erstellt am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(summary);

      setStatus(s => ({ ...s, summary: 'done' }));
      setTimeout(() => setStatus(s => ({ ...s, summary: 'idle' })), 3000);
    } catch (error) {
      console.error(error);
      setStatus(s => ({ ...s, summary: 'error' }));
      setTimeout(() => setStatus(s => ({ ...s, summary: 'idle' })), 3000);
    }
  };

  const reports = [
    {
      type: 'word' as ReportType,
      title: 'Word-Bericht',
      description: 'Vollständiger Bericht mit Tabellen und Kommentaren',
      icon: FileText,
      color: 'from-blue-600 to-blue-700',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      action: generateWordReport,
      format: '.docx',
    },
    {
      type: 'excel' as ReportType,
      title: 'Excel-Export',
      description: 'Rohdaten zur weiteren Analyse',
      icon: FileSpreadsheet,
      color: 'from-green-600 to-green-700',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      action: generateExcelReport,
      format: '.csv',
    },
    {
      type: 'summary' as ReportType,
      title: 'Quick Summary',
      description: 'Kurzzusammenfassung in Zwischenablage',
      icon: Sparkles,
      color: 'from-purple-600 to-purple-700',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      action: generateSummaryReport,
      format: 'Clipboard',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] rounded-2xl border border-white/10 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-pink-400" />
              One-Click Reports
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Wähle ein Format - der Bericht wird sofort generiert
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Report Options */}
        <div className="p-6 space-y-4">
          {reports.map((report) => {
            const Icon = report.icon;
            const currentStatus = status[report.type];

            return (
              <button
                key={report.type}
                onClick={report.action}
                disabled={currentStatus === 'generating'}
                className={`w-full p-4 rounded-xl border transition-all text-left group ${
                  currentStatus === 'done'
                    ? 'border-green-500/50 bg-green-500/10'
                    : currentStatus === 'error'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${report.iconBg}`}>
                    {currentStatus === 'generating' ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : currentStatus === 'done' ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <Icon className={`w-6 h-6 ${report.iconColor}`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">{report.title}</h4>
                      <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">
                        {report.format}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {currentStatus === 'generating'
                        ? 'Wird generiert...'
                        : currentStatus === 'done'
                        ? report.type === 'summary' ? 'In Zwischenablage kopiert!' : 'Download gestartet!'
                        : currentStatus === 'error'
                        ? 'Fehler bei der Generierung'
                        : report.description}
                    </p>
                  </div>

                  <div className={`p-2 rounded-lg bg-gradient-to-r ${report.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Download className="w-5 h-5 text-white" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div className="px-6 pb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-2">Enthaltene Daten:</p>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-white font-semibold">{analysisResult.by_account.length}</span>
                <span className="text-gray-500 ml-1">Konten</span>
              </div>
              <div>
                <span className="text-white font-semibold">{analysisResult.by_cost_center.length}</span>
                <span className="text-gray-500 ml-1">Kostenstellen</span>
              </div>
              <div>
                <span className="text-white font-semibold">{analysisResult.meta.bookings_curr}</span>
                <span className="text-gray-500 ml-1">Buchungen</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
