'use client';

import { useState } from 'react';
import {
  Upload,
  Database,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Loader2,
  Zap,
  Code,
  Play,
  Terminal,
  Brain,
  Search,
  Lock,
  Link2,
  Target,
  BookOpen,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AnalysisResult, DataProfile, AgentResponse, TripleAnalysisResult } from '@/lib/types';
import MagicUpload from '@/components/MagicUpload';
import TripleComparisonTable from '@/components/TripleComparisonTable';
import DocumentsPanel from '@/components/DocumentsPanel';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

// USP Data
const USPS = [
  {
    icon: Lock,
    title: '100% Datensouveränität',
    highlight: 'On-Premise',
    desc: 'Alle Daten bleiben lokal. Ollama für KI, DuckDB für Analytics.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Link2,
    title: 'Evidence Links',
    highlight: 'Nachvollziehbar',
    desc: 'Jede KI-Aussage mit Beleg. Klickbare Verweise bis zur Buchung.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'Magic Upload',
    highlight: 'Plug & Play',
    desc: 'SAP, DATEV, Lexware, CSV automatisch erkannt und importiert.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Target,
    title: 'Plan vs Ist vs VJ',
    highlight: 'Ampel-Status',
    desc: 'Triple-Vergleich mit Treiber-Analyse und Handlungsempfehlungen.',
    color: 'from-orange-500 to-red-500',
  },
];

const COMPARISON = [
  { feature: 'Datenspeicherung', us: 'Lokal / On-Premise', them: 'Google Cloud' },
  { feature: 'Beleg-Referenzen', us: 'Bis zur Buchung', them: 'Keine' },
  { feature: 'Format-Erkennung', us: 'SAP, DATEV, Lexware', them: 'Manuell' },
  { feature: 'Offline-Betrieb', us: '100% möglich', them: 'Nicht möglich' },
  { feature: 'SQL-Zugriff', us: 'DuckDB Console', them: 'Nicht verfügbar' },
];

type Mode = 'landing' | 'upload' | 'analyze' | 'triple' | 'query' | 'agent' | 'docs';

export default function Home() {
  const [mode, setMode] = useState<Mode>('landing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profilePrev, setProfilePrev] = useState<DataProfile | null>(null);
  const [profileCurr, setProfileCurr] = useState<DataProfile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [tripleResult, setTripleResult] = useState<TripleAnalysisResult | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [sqlQuery, setSqlQuery] = useState(
    'SELECT account, account_name, SUM(amount) as total\nFROM controlling.bookings_curr\nGROUP BY account, account_name\nORDER BY ABS(SUM(amount)) DESC\nLIMIT 10'
  );
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  const [isSqlRunning, setIsSqlRunning] = useState(false);
  const [agentQuestion, setAgentQuestion] = useState('');
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  // Triple upload states
  const [profileVJ, setProfileVJ] = useState<DataProfile | null>(null);
  const [profilePlan, setProfilePlan] = useState<DataProfile | null>(null);
  const [profileIst, setProfileIst] = useState<DataProfile | null>(null);

  // Handlers
  const handleUploadComplete = (profile: DataProfile, period: 'prev' | 'curr') => {
    if (period === 'prev') setProfilePrev(profile);
    else setProfileCurr(profile);
  };

  const runAnalysis = async () => {
    if (!profilePrev || !profileCurr) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeDrivers: true,
          includeAI: !!apiKey,
          apiKey: apiKey || undefined,
        }),
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setAnalysisResult(data);
        setMode('analyze');
      }
    } catch {
      alert('Analyse fehlgeschlagen');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runTripleAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-triple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setTripleResult(data);
      }
    } catch {
      alert('Triple-Analyse fehlgeschlagen');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runSQL = async () => {
    setIsSqlRunning(true);
    setSqlResult(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery }),
      });

      const data = await response.json();
      if (data.success) {
        setSqlResult({ columns: data.columns, rows: data.rows });
      } else {
        alert(`SQL Fehler: ${data.error}`);
      }
    } catch {
      alert('Query fehlgeschlagen');
    } finally {
      setIsSqlRunning(false);
    }
  };

  const askAgent = async () => {
    if (!agentQuestion.trim()) return;
    setIsAgentThinking(true);
    setAgentResponse(null);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: agentQuestion,
          apiKey: apiKey || undefined,
        }),
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setAgentResponse(data);
      }
    } catch {
      alert('Agent-Anfrage fehlgeschlagen');
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Variance chart data
  const deviationChartData =
    analysisResult?.by_account.slice(0, 8).map((d) => ({
      name: d.account_name.length > 15 ? d.account_name.substring(0, 15) + '...' : d.account_name,
      value: d.delta_abs,
      fill: d.delta_abs > 0 ? '#ef4444' : '#22c55e',
    })) || [];

  // Landing Page
  if (mode === 'landing') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
        {/* Hero Header */}
        <header className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Premium Controlling Engine</h1>
                <p className="text-xs text-gray-500">v2.0 · DuckDB · Ollama</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Powered by Local AI
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">100% Offline-fähig</span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-6">
            Das praktischste{' '}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Controlling-Tool
            </span>{' '}
            der Welt
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Varianz-Analyse mit Beweisen. Plan vs. Ist vs. Vorjahr mit Ampel-Status. Dokument-RAG
            mit Evidence Links. Alles lokal auf deinem Server.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setMode('upload')}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold text-lg transition-all flex items-center gap-3"
            >
              <Zap className="w-5 h-5" />
              Jetzt starten
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMode('docs')}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-lg transition-all flex items-center gap-3 border border-white/10"
            >
              <BookOpen className="w-5 h-5" />
              Dokumente
            </button>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <div className="flex justify-center gap-8">
            {['🔒 Daten bleiben lokal', '📊 Jede Zahl belegbar', '⚡ SAP/DATEV ready'].map(
              (badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-2 text-gray-400 bg-white/5 px-4 py-2 rounded-lg"
                >
                  {badge}
                </div>
              )
            )}
          </div>
        </section>

        {/* USP Cards */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USPS.map((usp, i) => (
              <div
                key={i}
                className="group p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:scale-105"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${usp.color} flex items-center justify-center mb-4`}
                >
                  <usp.icon className="w-6 h-6 text-white" />
                </div>
                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white font-medium">
                  {usp.highlight}
                </span>
                <h3 className="text-white font-semibold mt-3 mb-2">{usp.title}</h3>
                <p className="text-gray-500 text-sm">{usp.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Warum nicht Google AgentSpace?
          </h2>
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4 text-left text-gray-400">Feature</th>
                  <th className="p-4 text-center text-green-400">Premium Engine</th>
                  <th className="p-4 text-center text-gray-500">AgentSpace</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-4 text-white">{row.feature}</td>
                    <td className="p-4 text-center text-green-400">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        {row.us}
                      </div>
                    </td>
                    <td className="p-4 text-center text-gray-500">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-20">
          <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              © 2025 Premium Controlling Engine · Made in Germany 🇩🇪
            </p>
            <p className="text-gray-600 text-sm">Ganzimmun Diagnostics · Limbach Gruppe</p>
          </div>
        </footer>
      </main>
    );
  }

  // App Header (for non-landing modes)
  const AppHeader = () => (
    <header className="bg-[#12121a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setMode('landing')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Premium Controlling Engine</h1>
            <p className="text-xs text-gray-500">v2.0 · DuckDB · Ollama</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-white/5 rounded-lg p-1">
          {[
            { id: 'upload', icon: Upload, label: 'Upload' },
            { id: 'analyze', icon: BarChart3, label: 'Analyse' },
            { id: 'triple', icon: Target, label: 'Plan/Ist/VJ' },
            { id: 'query', icon: Terminal, label: 'SQL' },
            { id: 'agent', icon: Brain, label: 'Agent' },
            { id: 'docs', icon: BookOpen, label: 'Dokumente' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as Mode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === tab.id
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* API Key & Status */}
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Cloud API Key (optional)"
            className="w-44 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <span
            className={`px-2 py-1 rounded text-xs ${apiKey ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}
          >
            {apiKey ? 'Cloud' : 'Lokal'}
          </span>
        </div>
      </div>
    </header>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <MagicUpload
                label="Vorjahr"
                period="prev"
                existingProfile={profilePrev}
                onUploadComplete={handleUploadComplete}
              />
              <MagicUpload
                label="Aktuelles Jahr"
                period="curr"
                existingProfile={profileCurr}
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {profilePrev && profileCurr && (
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Analysiere mit DuckDB...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" /> Varianz-Analyse starten
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {mode === 'analyze' && analysisResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-gray-500 text-sm mb-1">Vorjahr</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(analysisResult.meta.total_prev)}
                </p>
                <p className="text-gray-500 text-sm">
                  {analysisResult.meta.bookings_prev} Buchungen
                </p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-gray-500 text-sm mb-1">Aktuell</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(analysisResult.meta.total_curr)}
                </p>
                <p className="text-gray-500 text-sm">
                  {analysisResult.meta.bookings_curr} Buchungen
                </p>
              </div>
              <div
                className={`bg-[#12121a] rounded-xl border p-4 ${analysisResult.summary.total_delta > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}
              >
                <p className="text-gray-500 text-sm mb-1">Abweichung</p>
                <p
                  className={`text-2xl font-bold ${analysisResult.summary.total_delta > 0 ? 'text-red-400' : 'text-green-400'}`}
                >
                  {formatCurrency(analysisResult.summary.total_delta)}
                </p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-gray-500 text-sm mb-1">Konten analysiert</p>
                <p className="text-2xl font-bold text-white">
                  {analysisResult.by_account.length}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-400" />
                Top Abweichungen
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviationChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(v as number)}
                    contentStyle={{
                      backgroundColor: '#1a1a2e',
                      border: '1px solid #2d2d44',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {deviationChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-semibold">Kontenabweichungen</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="p-4">Konto</th>
                      <th className="p-4 text-right">Vorjahr</th>
                      <th className="p-4 text-right">Aktuell</th>
                      <th className="p-4 text-right">Δ Absolut</th>
                      <th className="p-4 text-right">Δ %</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.by_account.slice(0, 15).map((dev, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <div className="text-white font-medium">{dev.account_name}</div>
                          <div className="text-gray-500 text-xs">Konto {dev.account}</div>
                        </td>
                        <td className="p-4 text-right text-gray-400 font-mono">
                          {formatCurrency(dev.amount_prev)}
                        </td>
                        <td className="p-4 text-right text-white font-mono">
                          {formatCurrency(dev.amount_curr)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-medium ${dev.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {formatCurrency(dev.delta_abs)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono ${dev.delta_pct > 0 ? 'text-red-400' : 'text-green-400'}`}
                        >
                          {formatPercent(dev.delta_pct)}
                        </td>
                        <td className="p-4">
                          {dev.anomalySeverity === 'critical' && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> Kritisch
                            </span>
                          )}
                          {dev.anomalySeverity === 'warning' && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                              Prüfen
                            </span>
                          )}
                          {!dev.anomalySeverity && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Triple Comparison Mode */}
        {mode === 'triple' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-xl border border-orange-500/30 p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Plan vs. Ist vs. Vorjahr Analyse
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Laden Sie drei Datensätze hoch: Vorjahr (VJ), Plan und Ist. Die Analyse zeigt
                Planabweichungen mit Ampel-Status.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <MagicUpload
                  label="Vorjahr (VJ)"
                  period="prev"
                  existingProfile={profileVJ}
                  onUploadComplete={(p) => setProfileVJ(p)}
                />
                <MagicUpload
                  label="Plan"
                  period="prev"
                  existingProfile={profilePlan}
                  onUploadComplete={(p) => setProfilePlan(p)}
                />
                <MagicUpload
                  label="Ist"
                  period="curr"
                  existingProfile={profileIst}
                  onUploadComplete={(p) => setProfileIst(p)}
                />
              </div>

              {profileVJ && profilePlan && profileIst && (
                <button
                  onClick={runTripleAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-3"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Analysiere...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" /> Triple-Analyse starten
                    </>
                  )}
                </button>
              )}
            </div>

            {tripleResult && <TripleComparisonTable result={tripleResult} />}
          </div>
        )}

        {/* SQL Query Mode */}
        {mode === 'query' && (
          <div className="space-y-6">
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-400" />
                SQL Console (DuckDB)
              </h3>

              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full h-40 bg-black/50 text-green-400 font-mono text-sm p-4 rounded-lg border border-white/10 focus:outline-none focus:border-orange-500"
                placeholder="SELECT * FROM controlling.bookings_curr LIMIT 10"
              />

              <div className="flex justify-between items-center mt-4">
                <p className="text-gray-500 text-sm">
                  Tabellen: <code className="text-orange-400">controlling.bookings_prev</code>,{' '}
                  <code className="text-orange-400">controlling.bookings_curr</code>
                </p>
                <button
                  onClick={runSQL}
                  disabled={isSqlRunning}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  {isSqlRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Ausführen
                </button>
              </div>
            </div>

            {sqlResult && (
              <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <span className="text-white font-medium">
                    Ergebnis: {sqlResult.rows.length} Zeilen
                  </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        {sqlResult.columns.map((col) => (
                          <th key={col} className="p-3 text-left text-gray-400 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                          {sqlResult.columns.map((col) => (
                            <td key={col} className="p-3 text-gray-300 font-mono">
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent Mode */}
        {mode === 'agent' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Controlling Agent
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${apiKey ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}
                >
                  {apiKey ? 'Cloud (Claude)' : 'Lokal (Ollama)'}
                </span>
              </h3>

              <div className="flex gap-4">
                <input
                  value={agentQuestion}
                  onChange={(e) => setAgentQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAgent()}
                  placeholder="Warum sind die Personalkosten gestiegen? Welche Buchungen treiben die Abweichung?"
                  className="flex-1 px-4 py-3 bg-black/30 text-white rounded-lg border border-white/10 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={askAgent}
                  disabled={isAgentThinking}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  {isAgentThinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Analysieren
                </button>
              </div>

              <p className="text-gray-400 text-sm mt-3">
                💡{' '}
                {apiKey
                  ? 'Cloud-Modus aktiv (Anthropic Claude)'
                  : 'Lokal-Modus: Keine Internetverbindung nötig. Starte Ollama mit: ollama serve'}
              </p>
            </div>

            {agentResponse && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      agentResponse.confidence > 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : agentResponse.confidence > 0.5
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    Konfidenz: {(agentResponse.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-gray-500 text-sm">
                    {agentResponse.toolCalls.length} Tool-Aufrufe
                  </span>
                </div>

                <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {agentResponse.answer}
                  </p>
                </div>

                {agentResponse.toolCalls.length > 0 && (
                  <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                    <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Code className="w-4 h-4 text-blue-400" />
                      Tool-Aufrufe (Evidence Trail)
                    </h4>
                    <div className="space-y-3">
                      {agentResponse.toolCalls.map((call, i) => (
                        <div key={i} className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-400 font-mono text-sm">{call.tool}</span>
                            <span className="text-gray-500 text-xs">
                              {call.executionTimeMs}ms
                            </span>
                          </div>
                          <pre className="text-gray-400 text-xs overflow-x-auto">
                            {JSON.stringify(call.input, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Documents Mode */}
        {mode === 'docs' && <DocumentsPanel />}
      </div>
    </main>
  );
}
