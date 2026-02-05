'use client';

import { useState } from 'react';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  PieChart,
  Shield,
  Link2,
  FileSpreadsheet,
  Presentation,
  Clock,
  CheckCircle2,
  Eye,
  X,
  Sparkles,
  Database,
  Lock,
  Users,
  ArrowRight,
  Zap,
  Save,
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
  PieChart as RechartsPie,
  Pie,
  Legend,
} from 'recharts';
import { AnalysisResult, AccountDeviation, LabKPIs, TripleAnalysisResult, TripleAccountDeviation, Booking } from '@/lib/types';
import { useApiKey } from '@/lib/hooks/useApiKey';
import { useSavedAnalyses } from '@/lib/hooks/useSavedAnalyses';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { ManagementSummary } from '@/components/ManagementSummary';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import { ChatInterface } from '@/components/ChatInterface';
import { EvidenceModal } from '@/components/EvidenceModal';
import { LabKPIDashboard } from '@/components/LabKPIDashboard';
import { SavedAnalysesList } from '@/components/SavedAnalysesList';
import { calculateLabKPIs } from '@/lib/kpi-calculator';
import { TripleUpload } from '@/components/TripleUpload';
import { TripleComparisonTable } from '@/components/TripleComparisonTable';
import { MagicUpload } from '@/components/MagicUpload';
import { DocumentsPanel } from '@/components/DocumentsPanel';

interface EntityUpload {
  id: string;
  name: string;
  prevFile: File | null;
  currFile: File | null;
  result: AnalysisResult | null;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  error?: string;
  expanded: boolean;
}

interface KonzernResult {
  entities: { name: string; result: AnalysisResult; status: string }[];
  consolidated: AnalysisResult;
  benchmarks: {
    entity: string;
    totalPrev: number;
    totalCurr: number;
    deviation: number;
    deviationPercent: number;
    status: string;
  }[];
  managementSummary: string;
}

type WorkflowStatus = 'draft' | 'review' | 'approved';
type AnalysisMode = 'single' | 'multi' | 'triple' | 'docs';

const PREMIUM_ENTITIES = [
  'Ganzimmun Diagnostics',
  'MVZ Labor Frankfurt',
  'MVZ Labor München',
  'MVZ Labor Bonn',
  'Premium Genetics',
  'MVZ Medizinisches Labor Hannover',
  'MVZ Labor Premium Erfurt',
  'MVZ Labor Bremen',
  'MVZ Labor Köln',
  'MVZ Labor Berlin',
  'Andere Gesellschaft',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

// USP cards for hero section - clear differentiators
const USPS = [
  {
    icon: Lock,
    title: '100% Datensouveränität',
    description: 'Alle Daten bleiben auf Ihren Servern. Keine Cloud, keine externen APIs, kein Risiko.',
    highlight: 'On-Premise',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Link2,
    title: 'Evidence Links',
    description: 'Jede KI-Aussage mit Belegnummer verknüpft. Prüfungssicher bis zur Einzelbuchung.',
    highlight: 'Nachvollziehbar',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'Magic Upload',
    description: 'SAP, DATEV, Lexware – wird automatisch erkannt. Kein Mapping, kein Setup.',
    highlight: 'Plug & Play',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: FileSpreadsheet,
    title: 'Report-Ready Output',
    description: 'Word-Berichte, Excel-Exports, Management-Summaries. Nicht nur Dashboards.',
    highlight: 'Sofort nutzbar',
    color: 'from-orange-500 to-amber-500',
  },
];

// Comparison with competitors
const COMPARISON = [
  { feature: 'Datenspeicherung', us: 'Lokal / On-Premise', them: 'Google Cloud' },
  { feature: 'Beleg-Referenzen', us: 'Bis zur Buchung', them: 'Keine' },
  { feature: 'SAP/DATEV Import', us: 'Automatisch', them: 'Manuelles Mapping' },
  { feature: 'Branchenwissen', us: 'Labor/Healthcare KPIs', them: 'Generisch' },
  { feature: 'Kosten', us: 'Einmalig', them: 'Pro Nutzer/Monat' },
];

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [entities, setEntities] = useState<EntityUpload[]>([
    { id: '1', name: 'Ganzimmun Diagnostics', prevFile: null, currFile: null, result: null, status: 'pending', expanded: true },
  ]);
  const [konzernResult, setKonzernResult] = useState<KonzernResult | null>(null);
  const [tripleResult, setTripleResult] = useState<TripleAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'costcenters' | 'evidence'>('overview');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft');
  const [selectedDeviation, setSelectedDeviation] = useState<AccountDeviation | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // API Key management
  const { apiKey, isValidFormat: hasApiKey, saveApiKey, clearApiKey } = useApiKey();

  // Saved analyses management
  const { analyses: savedAnalyses, saveAnalysis, deleteAnalysis: deleteSavedAnalysis, refresh: refreshSavedAnalyses } = useSavedAnalyses();

  // KPIs state
  const [labKPIs, setLabKPIs] = useState<LabKPIs | null>(null);

  // Magic Upload state
  const [useMagicUpload, setUseMagicUpload] = useState(true);
  const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
  const [currBookings, setCurrBookings] = useState<Booking[]>([]);
  const [prevFileName, setPrevFileName] = useState('');
  const [currFileName, setCurrFileName] = useState('');

  // Handle magic-parsed bookings
  const handleMagicPrev = (bookings: Booking[], fileName: string) => {
    setPrevBookings(bookings);
    setPrevFileName(fileName);
  };

  const handleMagicCurr = (bookings: Booking[], fileName: string) => {
    setCurrBookings(bookings);
    setCurrFileName(fileName);
  };

  // Analyze from magic-parsed bookings
  const analyzeMagic = async () => {
    if (prevBookings.length === 0 || currBookings.length === 0) return;

    const entity = entities[0];
    updateEntity(entity.id, { status: 'analyzing' });
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prevBookings,
          currBookings,
          apiKey: apiKey || undefined,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        updateEntity(entity.id, { result, status: 'success' });
      } else {
        updateEntity(entity.id, { status: 'error', error: result.error });
      }
    } catch (error) {
      updateEntity(entity.id, { status: 'error', error: 'Analyse fehlgeschlagen' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ... existing functions
  const addEntity = () => {
    const newId = (Math.max(...entities.map(e => parseInt(e.id))) + 1).toString();
    setEntities([...entities, {
      id: newId,
      name: '',
      prevFile: null,
      currFile: null,
      result: null,
      status: 'pending',
      expanded: true,
    }]);
  };

  const removeEntity = (id: string) => {
    if (entities.length > 1) {
      setEntities(entities.filter(e => e.id !== id));
    }
  };

  const updateEntity = (id: string, updates: Partial<EntityUpload>) => {
    setEntities(entities.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const analyzeSingle = async (entity: EntityUpload) => {
    if (!entity.prevFile || !entity.currFile) return;
    updateEntity(entity.id, { status: 'analyzing' });
    try {
      const formData = new FormData();
      formData.append('prevFile', entity.prevFile);
      formData.append('currFile', entity.currFile);
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok) {
        updateEntity(entity.id, { result, status: 'success' });
      } else {
        updateEntity(entity.id, { status: 'error', error: result.error });
      }
    } catch (error) {
      updateEntity(entity.id, { status: 'error', error: 'Analyse fehlgeschlagen' });
    }
  };

  const analyzeMulti = async () => {
    const validEntities = entities.filter(e => e.prevFile && e.currFile && e.name);
    if (validEntities.length === 0) return;
    setIsAnalyzing(true);
    setKonzernResult(null);
    try {
      const entityInputs = await Promise.all(
        validEntities.map(async e => ({
          name: e.name,
          prevCSV: await readFileAsText(e.prevFile!),
          currCSV: await readFileAsText(e.currFile!),
        }))
      );
      const formData = new FormData();
      formData.append('entities', JSON.stringify(entityInputs));
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }
      const response = await fetch('/api/analyze-multi', { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok) {
        setKonzernResult(result);
        validEntities.forEach((entity, idx) => {
          const entityResult = result.entities[idx];
          updateEntity(entity.id, {
            result: entityResult?.result || null,
            status: entityResult?.status === 'success' ? 'success' : 'error',
            error: entityResult?.error,
          });
        });
      }
    } catch (error) {
      console.error('Multi-analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeAll = async () => {
    if (mode === 'multi') {
      await analyzeMulti();
    } else {
      const entity = entities[0];
      if (entity) await analyzeSingle(entity);
    }
  };

  const downloadReport = async (format: 'word' | 'excel') => {
    const endpoint = mode === 'multi' && konzernResult
      ? '/api/generate-konzern-report'
      : '/api/generate-report';
    const data = mode === 'multi' && konzernResult ? konzernResult : entities[0]?.result;
    if (!data) return;
    setIsGeneratingReport(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, format }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'excel' ? 'xlsx' : 'docx';
        a.download = mode === 'multi'
          ? `Konzern_Abweichungsanalyse_${new Date().toISOString().split('T')[0]}.${ext}`
          : `Abweichungsanalyse_${entities[0]?.name || 'Report'}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const hasValidData = mode === 'multi' ? konzernResult !== null : mode === 'triple' ? tripleResult !== null : entities[0]?.result !== null;
  const currentResult = mode === 'multi' ? konzernResult?.consolidated : entities[0]?.result;

  const benchmarkChartData = konzernResult?.benchmarks.map(b => ({
    name: b.entity.length > 12 ? b.entity.substring(0, 12) + '...' : b.entity,
    fullName: b.entity,
    deviation: b.deviation,
    fill: b.deviation > 5000 ? '#ef4444' : b.deviation < -5000 ? '#22c55e' : '#94a3b8',
  })) || [];

  const topDeviationsData = currentResult?.by_account?.slice(0, 6).map(d => ({
    name: d.account_name.length > 18 ? d.account_name.substring(0, 18) + '...' : d.account_name,
    fullName: d.account_name,
    value: Math.abs(d.delta_abs),
    deviation: d.delta_abs,
    fill: d.delta_abs > 0 ? '#ef4444' : '#22c55e',
  })) || [];

  // Hero/Landing Page
  if (!showApp) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 py-4">
          <nav className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold">Controlling Copilot</span>
                <span className="hidden sm:inline text-sm text-gray-500 ml-2">für Limbach Gruppe</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Powered by Local AI</span>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 px-6 pt-16 pb-24">
          <div className="max-w-5xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-8">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Daten bleiben lokal</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1">
                <Link2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Jede Zahl belegbar</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">SAP/DATEV ready</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                KI-Controlling
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                ohne Cloud-Risiko
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Automatische Abweichungsanalyse mit KI-Kommentaren – komplett on-premise.
              <br />
              <span className="text-white font-medium">Jede Aussage mit Evidence Link zur Buchung.</span>
            </p>

            {/* Key Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              {[
                { value: '100%', label: 'On-Premise', color: 'text-green-400' },
                { value: '<5 Min', label: 'Setup Zeit', color: 'text-blue-400' },
                { value: '50+', label: 'Gesellschaften', color: 'text-purple-400' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowApp(true)}
                className="group px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/25 flex items-center gap-3"
              >
                Jetzt starten – kostenlos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Keine Registrierung nötig
              </div>
            </div>
          </div>
        </section>

        {/* USP Grid */}
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Was uns unterscheidet</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Entwickelt für die Anforderungen deutscher Konzerne – mit Fokus auf
                Datenschutz, Nachvollziehbarkeit und Prüfungssicherheit.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {USPS.map((usp, idx) => (
                <div
                  key={idx}
                  className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all relative overflow-hidden"
                >
                  {/* Highlight Badge */}
                  <div className={`absolute top-4 right-4 px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${usp.color} text-white`}>
                    {usp.highlight}
                  </div>

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${usp.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <usp.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{usp.title}</h3>
                  <p className="text-gray-400 text-sm">{usp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Warum nicht Google AgentSpace?</h2>
              <p className="text-gray-400">
                Enterprise-KI muss nicht in der Cloud laufen.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 border-b border-white/10 text-sm font-medium">
                <div className="text-gray-400">Feature</div>
                <div className="text-green-400 text-center">Controlling Copilot</div>
                <div className="text-gray-500 text-center">Google AgentSpace</div>
              </div>
              {COMPARISON.map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 last:border-0">
                  <div className="text-gray-300">{row.feature}</div>
                  <div className="text-green-400 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {row.us}
                  </div>
                  <div className="text-gray-500 text-center">{row.them}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-3xl font-bold mb-4">So einfach geht's</h2>
            <p className="text-center text-gray-400 mb-12">Von der Buchungsdatei zum fertigen Report in 3 Schritten</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {[
                { icon: Upload, label: 'Upload', desc: 'CSV/Excel hochladen', color: 'from-blue-500 to-cyan-500' },
                { icon: Sparkles, label: 'Analyse', desc: 'KI findet Abweichungen', color: 'from-purple-500 to-pink-500' },
                { icon: FileText, label: 'Report', desc: 'Word/Excel exportieren', color: 'from-green-500 to-emerald-500' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-semibold text-white">{step.label}</span>
                    <span className="text-sm text-gray-400">{step.desc}</span>
                  </div>
                  {idx < 2 && (
                    <ArrowRight className="hidden md:block w-6 h-6 text-gray-600 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 px-6 pb-20">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium mb-6">
              <Lock className="w-4 h-4" />
              Ihre Daten verlassen nie Ihr Netzwerk
            </div>
            <h2 className="text-3xl font-bold mb-4">Bereit für sicheres KI-Controlling?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Laden Sie Ihre erste Buchungsdatei hoch und erleben Sie, wie KI-gestützte
              Abweichungsanalyse funktioniert – ohne Cloud-Risiko.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowApp(true)}
                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Kostenlos starten
              </button>
              <span className="text-sm text-gray-500">Keine Registrierung • Keine Cloud</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-6 py-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Entwickelt für die Limbach Gruppe</span>
            </div>
            <div className="flex items-center gap-6">
              <span>100% Open Source fähig</span>
              <span>•</span>
              <span>Made in Germany 🇩🇪</span>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  // Main App
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Evidence Modal */}
      {showEvidenceModal && selectedDeviation && (
        <EvidenceModal
          deviation={selectedDeviation}
          onClose={() => setShowEvidenceModal(false)}
          apiKey={apiKey}
        />
      )}

      {/* Header */}
      <div className="bg-[#12121a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowApp(false)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Premium Controlling</h1>
                  <p className="text-xs text-gray-500">Automatisierte Abweichungsanalyse</p>
                </div>
              </button>

              {/* Mode Toggle */}
              <div className="hidden md:flex bg-white/5 rounded-lg p-1 ml-8">
                <button
                  onClick={() => setMode('single')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Einzelanalyse
                </button>
                <button
                  onClick={() => setMode('triple')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'triple' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Plan vs Ist
                </button>
                <button
                  onClick={() => setMode('multi')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'multi' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Konzern
                </button>
                <button
                  onClick={() => setMode('docs')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'docs' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📄 Dokumente
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Workflow Status */}
              {hasValidData && (
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                  {(['draft', 'review', 'approved'] as WorkflowStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => setWorkflowStatus(status)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        workflowStatus === status
                          ? status === 'draft' ? 'bg-yellow-500/20 text-yellow-400'
                          : status === 'review' ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-green-500/20 text-green-400'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {status === 'draft' && <Clock className="w-3 h-3" />}
                      {status === 'review' && <Eye className="w-3 h-3" />}
                      {status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {status === 'draft' ? 'Entwurf' : status === 'review' ? 'Prüfung' : 'Freigabe'}
                    </button>
                  ))}
                </div>
              )}

              <ApiKeyInput
                apiKey={apiKey}
                isValidFormat={hasApiKey}
                onSave={saveApiKey}
                onClear={clearApiKey}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Documents Section */}
        {mode === 'docs' && (
          <div className="mb-8">
            <DocumentsPanel apiKey={apiKey} />
          </div>
        )}

        {/* Triple Upload Section */}
        {mode === 'triple' && (
          <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-400" />
              Plan vs. Ist vs. Vorjahr
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Vergleiche Plan-Daten mit Ist-Buchungen und Vorjahr. Nur Ist ist Pflicht - ohne VJ/Plan wird automatisch verglichen.
            </p>
            <TripleUpload
              onAnalysisComplete={(result) => setTripleResult(result)}
              apiKey={apiKey}
            />
          </div>
        )}

        {/* Upload Section */}
        {mode !== 'triple' && mode !== 'docs' && (
        <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {useMagicUpload ? (
                <>
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Magic Upload
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-blue-400" />
                  {mode === 'single' ? 'Buchungsdaten hochladen' : 'Gesellschaften hinzufügen'}
                </>
              )}
            </h2>
            {mode === 'single' && (
              <button
                onClick={() => setUseMagicUpload(!useMagicUpload)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  useMagicUpload
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    : 'bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {useMagicUpload ? '✨ Magic aktiv' : 'Magic aktivieren'}
              </button>
            )}
          </div>

          {/* Magic Upload Mode */}
          {mode === 'single' && useMagicUpload && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Laden Sie Ihre Dateien hoch – SAP, DATEV oder CSV wird automatisch erkannt und geparst.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <MagicUpload
                  period="prev"
                  label="Vorjahr hochladen"
                  onBookingsParsed={(bookings, _, fileName) => handleMagicPrev(bookings, fileName)}
                  existingFile={prevFileName}
                />
                <MagicUpload
                  period="curr"
                  label="Aktuell hochladen"
                  onBookingsParsed={(bookings, _, fileName) => handleMagicCurr(bookings, fileName)}
                  existingFile={currFileName}
                />
              </div>

              {/* Magic Upload Status */}
              {(prevBookings.length > 0 || currBookings.length > 0) && (
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex-1 flex items-center gap-3">
                    {prevBookings.length > 0 && (
                      <span className="text-sm text-gray-400">
                        ✓ VJ: <span className="text-white">{prevBookings.length}</span> Buchungen
                      </span>
                    )}
                    {currBookings.length > 0 && (
                      <span className="text-sm text-gray-400">
                        ✓ Aktuell: <span className="text-white">{currBookings.length}</span> Buchungen
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Classic Upload Mode */}
          {(!useMagicUpload || mode === 'multi') && (
          <div className="space-y-4">
            {entities.map((entity) => (
              <div key={entity.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {mode === 'multi' ? (
                      <select
                        value={entity.name}
                        onChange={e => updateEntity(entity.id, { name: e.target.value })}
                        className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Gesellschaft wählen...</option>
                        {PREMIUM_ENTITIES.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-white font-medium">{entity.name || 'Analyse'}</span>
                    )}
                    {entity.status === 'success' && (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> Analysiert
                      </span>
                    )}
                    {entity.status === 'analyzing' && (
                      <span className="flex items-center gap-1 text-blue-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analysiere...
                      </span>
                    )}
                    {entity.status === 'error' && (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" /> {entity.error}
                      </span>
                    )}
                  </div>
                  {mode === 'multi' && entities.length > 1 && (
                    <button onClick={() => removeEntity(entity.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Vorjahr (CSV)</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={e => updateEntity(entity.id, { prevFile: e.target.files?.[0] || null })}
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Aktuell (CSV)</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={e => updateEntity(entity.id, { currFile: e.target.files?.[0] || null })}
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}

            {mode === 'multi' && (
              <button
                onClick={addEntity}
                className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:border-blue-500/50 hover:text-blue-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Weitere Gesellschaft
              </button>
            )}
          </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (mode === 'single' && useMagicUpload) {
                  analyzeMagic();
                } else {
                  analyzeAll();
                }
              }}
              disabled={isAnalyzing || (
                mode === 'single' && useMagicUpload
                  ? prevBookings.length === 0 || currBookings.length === 0
                  : entities.every(e => !e.prevFile || !e.currFile)
              )}
              className="flex-1 min-w-[200px] bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analysiere...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Analysieren</>
              )}
            </button>

            {hasValidData && (
              <>
                <button
                  onClick={() => downloadReport('word')}
                  disabled={isGeneratingReport}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  <FileText className="w-5 h-5 text-blue-400" />
                  Word
                </button>
                <button
                  onClick={() => downloadReport('excel')}
                  disabled={isGeneratingReport}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5 text-green-400" />
                  Excel
                </button>
                <button
                  onClick={() => {
                    if (currentResult) {
                      const name = prompt('Name für die Analyse:', `Analyse ${new Date().toLocaleDateString('de-DE')}`);
                      if (name) {
                        saveAnalysis(name, entities[0]?.name || 'Unbenannt', currentResult, labKPIs || undefined);
                      }
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5 text-yellow-400" />
                  Speichern
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* Triple Comparison Results */}
        {mode === 'triple' && tripleResult && (
          <div className="mb-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">Plan</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(tripleResult.meta.total_plan)}</p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">Ist</p>
                <p className="text-xl font-bold text-white">{formatCurrency(tripleResult.meta.total_ist)}</p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">Vorjahr</p>
                <p className="text-xl font-bold text-gray-400">{formatCurrency(tripleResult.meta.total_vj)}</p>
              </div>
              <div className={`rounded-xl border p-4 ${
                tripleResult.summary.total_delta_plan > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <p className="text-sm text-gray-500 mb-1">Δ Plan</p>
                <p className={`text-xl font-bold flex items-center gap-2 ${
                  tripleResult.summary.total_delta_plan > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {tripleResult.summary.total_delta_plan > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {formatCurrency(tripleResult.summary.total_delta_plan)}
                </p>
              </div>
            </div>

            {/* Triple Comparison Table */}
            <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6">
              <TripleComparisonTable
                result={tripleResult}
                onShowEvidence={(deviation: TripleAccountDeviation) => {
                  // Convert to standard AccountDeviation for EvidenceModal
                  const standardDeviation: AccountDeviation = {
                    account: deviation.account,
                    account_name: deviation.account_name,
                    amount_prev: deviation.amount_vj,
                    amount_curr: deviation.amount_ist,
                    delta_abs: deviation.delta_plan_abs,
                    delta_pct: deviation.delta_plan_pct,
                    bookings_count_prev: 0,
                    bookings_count_curr: deviation.bookings_count_ist || 0,
                    comment: deviation.comment,
                    top_bookings_curr: deviation.top_bookings_ist,
                  };
                  setSelectedDeviation(standardDeviation);
                  setShowEvidenceModal(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Saved Analyses List */}
        <SavedAnalysesList
          analyses={savedAnalyses}
          onLoad={(analysis) => {
            // Load saved analysis
            const entity = entities[0];
            if (entity) {
              updateEntity(entity.id, {
                name: analysis.entity,
                result: analysis.result,
                status: 'success',
              });
              setWorkflowStatus(analysis.workflow_status);
              if (analysis.kpis) {
                setLabKPIs(analysis.kpis);
              }
            }
          }}
          onDelete={deleteSavedAnalysis}
          onRefresh={refreshSavedAnalyses}
        />

        {/* Results (for single and multi mode) */}
        {mode !== 'triple' && hasValidData && currentResult && (
          <>
            {/* AI-Generated Management Summary */}
            <ManagementSummary
              analysisResult={currentResult}
              apiKey={apiKey}
              entityName={mode === 'single' ? entities[0]?.name : 'Konzern'}
              workflowStatus={workflowStatus}
            />

            {/* Labor KPIs Dashboard */}
            {labKPIs && <LabKPIDashboard kpis={labKPIs} />}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">{mode === 'multi' ? 'Gesellschaften' : 'Buchungen VJ'}</p>
                <p className="text-2xl font-bold text-white">
                  {mode === 'multi' ? konzernResult?.entities.length : currentResult.meta.bookings_prev}
                </p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">Vorjahr</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(currentResult.meta.total_prev)}</p>
              </div>
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
                <p className="text-sm text-gray-500 mb-1">Aktuell</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(currentResult.meta.total_curr)}</p>
              </div>
              <div className={`rounded-xl border p-4 ${
                currentResult.summary.total_delta > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <p className="text-sm text-gray-500 mb-1">Abweichung</p>
                <p className={`text-2xl font-bold flex items-center gap-2 ${
                  currentResult.summary.total_delta > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {currentResult.summary.total_delta > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {formatCurrency(currentResult.summary.total_delta)}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  {mode === 'multi' ? 'Gesellschaften' : 'Top Abweichungen'}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mode === 'multi' ? benchmarkChartData : topDeviationsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                    <Bar dataKey={mode === 'multi' ? 'deviation' : 'value'} radius={[0, 4, 4, 0]}>
                      {(mode === 'multi' ? benchmarkChartData : topDeviationsData).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-400" />
                  Verteilung
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Steigerungen', value: currentResult.by_account?.filter(d => d.delta_abs > 0).reduce((s, d) => s + d.delta_abs, 0) || 0, fill: '#ef4444' },
                        { name: 'Senkungen', value: Math.abs(currentResult.by_account?.filter(d => d.delta_abs < 0).reduce((s, d) => s + d.delta_abs, 0) || 0), fill: '#22c55e' },
                      ]}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value"
                      label={({ name, value }) => value > 0 ? `${name}` : ''}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: '8px' }} />
                    <Legend formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex border-b border-white/10">
                {(['overview', 'accounts', 'costcenters', 'evidence'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === tab ? 'bg-white/5 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {tab === 'overview' && 'Übersicht'}
                    {tab === 'accounts' && 'Konten'}
                    {tab === 'costcenters' && 'Kostenstellen'}
                    {tab === 'evidence' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Link2 className="w-4 h-4" /> Evidence
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium mb-4">Signifikante Abweichungen</h4>
                    {currentResult.by_account?.slice(0, 10).map((dev, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedDeviation(dev); setShowEvidenceModal(true); }}
                        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{dev.account_name}</p>
                            <AnomalyBadge
                              hint={dev.anomalyHint}
                              type={dev.anomalyType}
                              severity={dev.anomalySeverity}
                            />
                          </div>
                          <p className="text-sm text-gray-500">Konto {dev.account}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold ${dev.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(dev.delta_abs)}
                            </p>
                            <p className={`text-sm ${dev.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatPercent(dev.delta_pct)}
                            </p>
                          </div>
                          <Link2 className="w-4 h-4 text-blue-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'accounts' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm">
                          <th className="pb-3">Konto</th>
                          <th className="pb-3">Bezeichnung</th>
                          <th className="pb-3 text-right">Vorjahr</th>
                          <th className="pb-3 text-right">Aktuell</th>
                          <th className="pb-3 text-right">Abweichung</th>
                          <th className="pb-3"></th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {currentResult.by_account?.slice(0, 15).map((acc, idx) => (
                          <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                            <td className="py-3 text-gray-400">{acc.account}</td>
                            <td className="py-3 text-white">{acc.account_name}</td>
                            <td className="py-3 text-right text-gray-400">{formatCurrency(acc.amount_prev)}</td>
                            <td className="py-3 text-right text-gray-400">{formatCurrency(acc.amount_curr)}</td>
                            <td className={`py-3 text-right font-medium ${acc.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(acc.delta_abs)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => { setSelectedDeviation(acc); setShowEvidenceModal(true); }}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <Link2 className="w-4 h-4 text-blue-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'costcenters' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm">
                          <th className="pb-3">Kostenstelle</th>
                          <th className="pb-3 text-right">Vorjahr</th>
                          <th className="pb-3 text-right">Aktuell</th>
                          <th className="pb-3 text-right">Abweichung</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {currentResult.by_cost_center?.slice(0, 15).map((cc, idx) => (
                          <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                            <td className="py-3 text-white">{cc.cost_center || '(keine)'}</td>
                            <td className="py-3 text-right text-gray-400">{formatCurrency(cc.amount_prev)}</td>
                            <td className="py-3 text-right text-gray-400">{formatCurrency(cc.amount_curr)}</td>
                            <td className={`py-3 text-right font-medium ${cc.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(cc.delta_abs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div className="text-center py-12">
                    <Link2 className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h4 className="text-white font-semibold mb-2">Evidence Trail</h4>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Klicke auf eine Abweichung in der Übersicht oder Konten-Tabelle,
                      um die verknüpften Buchungen zu sehen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Chat Interface */}
      <ChatInterface
        analysisResult={currentResult ?? null}
        apiKey={apiKey}
      />
    </main>
  );
}
