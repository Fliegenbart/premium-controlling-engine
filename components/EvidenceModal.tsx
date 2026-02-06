'use client';

import { useState } from 'react';
import { X, Link2, Shield, Download, TrendingUp, TrendingDown, FileText, Plus, Minus, Sparkles, Loader2, AlertTriangle, Server } from 'lucide-react';
import { AccountDeviation, TopBooking } from '@/lib/types';

interface RedFlag {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
}

interface EnhancedDeviation extends AccountDeviation {
  ragContext?: string;
  redFlags?: RedFlag[];
  aiComment?: string;
  aiProvider?: 'ollama';
  aiLatencyMs?: number;
}

interface EvidenceModalProps {
  deviation: EnhancedDeviation;
  onClose: () => void;
  onGenerateComment?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

type EvidenceTab = 'curr' | 'prev' | 'new' | 'missing';

export function EvidenceModal({ deviation, onClose, onGenerateComment }: EvidenceModalProps) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('curr');
  const [aiComment, setAiComment] = useState<string | null>(deviation.aiComment ?? null);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);

  const tabs: { id: EvidenceTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: 'curr',
      label: 'Aktuell',
      count: deviation.top_bookings_curr?.length || deviation.top_bookings?.length || 0,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'prev',
      label: 'Vorjahr',
      count: deviation.top_bookings_prev?.length || 0,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'new',
      label: 'Neu',
      count: deviation.new_bookings?.length || 0,
      icon: <Plus className="w-4 h-4" />,
    },
    {
      id: 'missing',
      label: 'Weggefallen',
      count: deviation.missing_bookings?.length || 0,
      icon: <Minus className="w-4 h-4" />,
    },
  ];

  const getBookingsForTab = (): TopBooking[] => {
    switch (activeTab) {
      case 'curr':
        return deviation.top_bookings_curr || deviation.top_bookings || [];
      case 'prev':
        return deviation.top_bookings_prev || [];
      case 'new':
        return deviation.new_bookings || [];
      case 'missing':
        return deviation.missing_bookings || [];
      default:
        return [];
    }
  };

  const bookings = getBookingsForTab();
  const totalAmount = bookings.reduce((sum, b) => sum + b.amount, 0);

  const generateAIComment = async () => {
    setIsGeneratingComment(true);
    try {
      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviation,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAiComment(data.comment);
      }
    } catch (error) {
      console.error('Failed to generate comment:', error);
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const exportBookings = () => {
    const csv = [
      ['Datum', 'Beleg-Nr.', 'Text', 'Lieferant/Kunde', 'Betrag'].join(','),
      ...bookings.map(b => [
        b.date,
        b.document_no,
        `"${b.text.replace(/"/g, '""')}"`,
        b.vendor || b.customer || '',
        b.amount.toString(),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evidence_${deviation.account}_${deviation.account_name.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] rounded-2xl border border-white/10 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white">Evidence Trail</h3>
              <span className="px-2 py-1 bg-white/10 rounded text-xs text-gray-400">
                Konto {deviation.account}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{deviation.account_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Vorjahr</p>
              <p className="text-xl font-bold text-white">{formatCurrency(deviation.amount_prev)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {deviation.bookings_count_prev || '?'} Buchungen
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Aktuell</p>
              <p className="text-xl font-bold text-white">{formatCurrency(deviation.amount_curr)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {deviation.bookings_count_curr || '?'} Buchungen
              </p>
            </div>
            <div className={`rounded-xl p-4 ${deviation.delta_abs > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <p className="text-sm text-gray-400 mb-1">Abweichung</p>
              <p className={`text-xl font-bold flex items-center gap-1 ${deviation.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {deviation.delta_abs > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatCurrency(deviation.delta_abs)}
              </p>
              <p className={`text-xs mt-1 ${deviation.delta_abs > 0 ? 'text-red-400/70' : 'text-green-400/70'}`}>
                {deviation.delta_pct >= 0 ? '+' : ''}{deviation.delta_pct.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Frequenz</p>
              <p className="text-xl font-bold text-white">
                {deviation.bookings_count_curr && deviation.bookings_count_prev
                  ? `${deviation.bookings_count_curr > deviation.bookings_count_prev ? '+' : ''}${deviation.bookings_count_curr - deviation.bookings_count_prev}`
                  : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Buchungen Δ</p>
            </div>
          </div>

          {/* Red Flags Section */}
          {deviation.redFlags && deviation.redFlags.length > 0 && (
            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-xl border border-amber-500/20 p-4 mb-6">
              <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Automatische Warnsignale
              </h4>
              <div className="space-y-2">
                {deviation.redFlags.map((flag, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      flag.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                      flag.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      flag.severity === 'critical' ? 'bg-red-400' :
                      flag.severity === 'warning' ? 'bg-amber-400' :
                      'bg-blue-400'
                    }`} />
                    {flag.flag}
                    <span className="text-xs opacity-60 ml-auto">{flag.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Comment Section */}
          <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-xl border border-blue-500/20 p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  KI-Analyse
                  {deviation.aiProvider && (
                    <span className="ml-2 px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400 flex items-center gap-1">
                      <><Server className="w-3 h-3" /> Lokal</>
                      {deviation.aiLatencyMs && ` • ${(deviation.aiLatencyMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </h4>
                {!aiComment && (
                  <button
                    onClick={generateAIComment}
                    disabled={isGeneratingComment}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isGeneratingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analysiere...
                      </>
                    ) : (
                      'Kommentar generieren'
                    )}
                  </button>
                )}
              </div>
              {aiComment ? (
                <p className="text-gray-300 text-sm whitespace-pre-line">{aiComment}</p>
              ) : (
                <p className="text-gray-500 text-sm">
                  Klicken Sie auf &quot;Kommentar generieren&quot; für eine KI-gestützte Analyse der Abweichung mit Buchungsreferenzen.
                </p>
              )}
            </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              Buchungen
            </h4>
            <div className="flex-1" />
            <div className="flex bg-white/5 rounded-lg p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={exportBookings}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Als CSV exportieren"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Bookings Table */}
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {bookings.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400">
                    <th className="p-3">Datum</th>
                    <th className="p-3">Beleg-Nr.</th>
                    <th className="p-3">Buchungstext</th>
                    <th className="p-3">Lieferant/Kunde</th>
                    <th className="p-3 text-right">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, idx) => (
                    <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-gray-300">{booking.date}</td>
                      <td className="p-3">
                        <span className="text-blue-400 font-mono text-xs">{booking.document_no}</span>
                      </td>
                      <td className="p-3 text-gray-300 max-w-[250px] truncate" title={booking.text}>
                        {booking.text}
                      </td>
                      <td className="p-3 text-gray-400">
                        {booking.vendor || booking.customer || '-'}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        booking.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(booking.amount)}
                      </td>
                    </tr>
                  ))}
                  {/* Sum row */}
                  <tr className="border-t-2 border-white/10 bg-white/5 font-medium">
                    <td className="p-3 text-white" colSpan={4}>
                      Summe ({bookings.length} Buchungen)
                    </td>
                    <td className={`p-3 text-right ${totalAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Keine Buchungen in dieser Kategorie gefunden.
              </div>
            )}
          </div>

          <p className="text-gray-500 text-xs mt-4 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Lokale Verarbeitung (Ollama)
          </p>
        </div>
      </div>
    </div>
  );
}
