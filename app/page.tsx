'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Clock,
  CheckCircle2,
  Eye,
  X,
  Sparkles,
  Lock,
  ArrowRight,
  Zap,
  Save,
  Target,
  Search,
  GitCompare,
  Activity,
  FolderOpen,
  Wallet,
  Grid3x3,
  Menu,
  type LucideIcon,
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
import { useSavedAnalyses } from '@/lib/hooks/useSavedAnalyses';
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
import { NLQueryBar } from '@/components/NLQueryBar';
import { RootCausePanel } from '@/components/RootCausePanel';
import AIReportButton from '@/components/AIReportButton';
import BookingErrorPanel from '@/components/BookingErrorPanel';
import { ScenarioSimulator } from '@/components/ScenarioSimulator';
import RollingForecastDashboard from '@/components/RollingForecastDashboard';
import { LiquidityDashboard } from '@/components/LiquidityDashboard';
import { MonthlyClosingDashboard } from '@/components/MonthlyClosingDashboard';
import { ContributionDashboard } from '@/components/ContributionDashboard';
import { CashflowDashboard } from '@/components/CashflowDashboard';
import { BWADashboard } from '@/components/BWADashboard';
import { BABDashboard } from '@/components/BABDashboard';
import type { ErrorDetectionResult } from '@/lib/booking-error-detection';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { Particles } from '@/components/magicui/particles';
import { BorderBeam } from '@/components/magicui/border-beam';
import { MagicCard } from '@/components/magicui/magic-card';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Meteors } from '@/components/magicui/meteors';
import LandingPage from '@/components/LandingPage';


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
type AnalysisMode = 'single' | 'multi' | 'triple' | 'docs' | 'trends' | 'errors' | 'scenario' | 'forecast' | 'liquidity' | 'closing' | 'contribution' | 'cashflow' | 'bwa' | 'bab';

// Beispiel-Gesellschaften für Konzernanalyse (vom Nutzer anpassbar)
const EXAMPLE_ENTITIES = [
  'Hauptgesellschaft',
  'Tochter Nord',
  'Tochter Süd',
  'Tochter West',
  'Tochter Ost',
  'Beteiligung A',
  'Beteiligung B',
  'Weitere Gesellschaft',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;


export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [entities, setEntities] = useState<EntityUpload[]>([
    { id: '1', name: '', prevFile: null, currFile: null, result: null, status: 'pending', expanded: true },
  ]);
  const [konzernResult, setKonzernResult] = useState<KonzernResult | null>(null);
  const [tripleResult, setTripleResult] = useState<TripleAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'costcenters' | 'evidence'>('overview');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft');
  const [selectedDeviation, setSelectedDeviation] = useState<AccountDeviation | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [rootCauseDeviation, setRootCauseDeviation] = useState<AccountDeviation | null>(null);

  // Booking error detection state
  const [errorDetectionResult, setErrorDetectionResult] = useState<ErrorDetectionResult | null>(null);
  const [isDetectingErrors, setIsDetectingErrors] = useState(false);

  // Saved analyses management
  const { analyses: savedAnalyses, saveAnalysis, deleteAnalysis: deleteSavedAnalysis, refresh: refreshSavedAnalyses } = useSavedAnalyses();

  // KPIs state
  const [labKPIs, setLabKPIs] = useState<LabKPIs | null>(null);

  // Sidebar state (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Error detection refresh handler
  const refreshErrorDetection = async () => {
    setIsDetectingErrors(true);
    try {
      const response = await fetch('/api/detect-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (response.ok) {
        setErrorDetectionResult(result);
      }
    } catch (error) {
      console.error('Error detection failed:', error);
    } finally {
      setIsDetectingErrors(false);
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
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
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

  // Landing Page
  if (!showApp) {
    return <LandingPage onStartApp={() => setShowApp(true)} />;
  }

  // Mode config for sidebar navigation
  interface ModeTab {
    key: AnalysisMode;
    label: string;
    desc: string;
    icon: LucideIcon;
    color: string;
    group: 'controlling' | 'analyse' | 'ki';
  }

  const modeTabs: ModeTab[] = [
    // ── Controlling ──
    { key: 'liquidity',    label: 'Liquidität',     desc: '13-Wochen Cashflow-Prognose',     icon: TrendingUp,   color: '#3b82f6', group: 'controlling' },
    { key: 'closing',      label: 'Abschluss',      desc: 'Monatsabschluss mit 12 Checks',   icon: CheckCircle,  color: '#22c55e', group: 'controlling' },
    { key: 'contribution', label: 'DB-Rechnung',    desc: 'Mehrstufige DB I → DB V',         icon: BarChart3,    color: '#14b8a6', group: 'controlling' },
    { key: 'cashflow',     label: 'Cashflow',       desc: 'DRS 21 Kapitalflussrechnung',     icon: Wallet,       color: '#06b6d4', group: 'controlling' },
    { key: 'bwa',          label: 'BWA',            desc: 'DATEV-BWA mit KI-Analyse',        icon: FileText,     color: '#f97316', group: 'controlling' },
    { key: 'bab',          label: 'BAB',            desc: 'Kostenstellen & GK-Zuschläge',    icon: Grid3x3,      color: '#f43f5e', group: 'controlling' },
    // ── Analyse ──
    { key: 'single',       label: 'Einzelanalyse',  desc: 'Abweichungsanalyse je Periode',   icon: Search,       color: '#6366f1', group: 'analyse' },
    { key: 'triple',       label: 'Plan vs Ist',    desc: 'Dreifach-Vergleich mit VJ',       icon: GitCompare,   color: '#ec4899', group: 'analyse' },
    { key: 'multi',        label: 'Konzern',        desc: 'Multi-Entity Konsolidierung',     icon: Building2,    color: '#6366f1', group: 'analyse' },
    // ── KI-Tools ──
    { key: 'errors',       label: 'Fehler-Scan',    desc: 'KI-Buchungsfehler-Erkennung',     icon: AlertCircle,  color: '#f43f5e', group: 'ki' },
    { key: 'scenario',     label: 'Szenario',       desc: 'What-if Simulation',              icon: Target,       color: '#8b5cf6', group: 'ki' },
    { key: 'forecast',     label: 'Forecast',       desc: 'Rollierender 12-Monats-Forecast', icon: TrendingUp,   color: '#06b6d4', group: 'ki' },
    { key: 'trends',       label: 'Trends',         desc: 'Multi-Perioden Trendanalyse',     icon: Activity,     color: '#10b981', group: 'ki' },
    { key: 'docs',         label: 'Dokumente',      desc: 'KI-Reports & Dokumenten-Archiv',  icon: FolderOpen,   color: '#f59e0b', group: 'ki' },
  ];

  const sidebarGroups = [
    { key: 'controlling' as const, label: 'Controlling' },
    { key: 'analyse' as const, label: 'Analyse' },
    { key: 'ki' as const, label: 'KI-Tools' },
  ];

  // Shared sidebar content renderer
  const renderSidebarNav = (onSelect?: () => void) => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
      {sidebarGroups.map((group, gi) => (
        <div key={group.key}>
          {gi > 0 && <div className="my-3 mx-2 h-px bg-white/[0.06]" />}
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-600 font-semibold px-3 mb-2">{group.label}</p>
          <div className="space-y-0.5">
            {modeTabs.filter(t => t.group === group.key).map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setMode(tab.key); onSelect?.(); }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all group/item relative ${
                    isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActive"
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                      style={{ backgroundColor: tab.color }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? '' : 'bg-white/[0.04]'
                    }`}
                    style={isActive ? { backgroundColor: `${tab.color}18` } : undefined}
                  >
                    <Icon className="w-4 h-4 transition-colors" style={{ color: isActive ? tab.color : '#6b7280' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-tight transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover/item:text-gray-200'
                    }`}>
                      {tab.label}
                    </p>
                    <p className="text-[11px] text-gray-600 leading-tight mt-0.5 truncate">{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  // Get active tab info for header
  const activeTab_meta = modeTabs.find(t => t.key === mode);

  // Main App
  return (
    <main className="min-h-screen bg-[#0c1222] mesh-gradient noise-overlay relative flex">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={28}
          color="#818cf8"
          staticity={60}
          size={0.5}
        />
        <div className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.12] blur-[150px] animate-float-orb" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.10] blur-[120px] animate-float-orb-2" />
        <div className="absolute top-[40%] right-[25%] w-[350px] h-[350px] rounded-full bg-purple-500/[0.08] blur-[100px] animate-float-orb" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Evidence Modal */}
      {showEvidenceModal && selectedDeviation && (
        <EvidenceModal
          deviation={selectedDeviation}
          onClose={() => setShowEvidenceModal(false)}
        />
      )}

      {/* ═══ Desktop Sidebar ═══ */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 z-40 bg-[#0e1326]/90 backdrop-blur-2xl border-r border-white/[0.06]">
        {/* Sidebar Header / Logo */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <button
            onClick={() => setShowApp(false)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/25">
              <BarChart3 className="w-5 h-5 text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-white tracking-[-0.02em]">Premium Controlling</h1>
              <p className="text-[10px] text-gray-600 tracking-wide">Engine v2.0</p>
            </div>
          </button>
        </div>

        {/* Sidebar Navigation */}
        {renderSidebarNav()}

        {/* Sidebar Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <div className="w-2 h-2 rounded-full bg-green-500/60 animate-pulse" />
            <span>14 Module aktiv</span>
          </div>
        </div>
      </aside>

      {/* ═══ Mobile Sidebar Overlay ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[270px] z-50 bg-[#0e1326] border-r border-white/[0.06] flex flex-col md:hidden"
            >
              {/* Mobile Sidebar Header */}
              <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white">Navigation</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Sidebar Nav */}
              {renderSidebarNav(() => setSidebarOpen(false))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 min-h-screen overflow-y-auto relative">
        {/* Header — simplified (no tabs) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative bg-[#0c1222]/80 backdrop-blur-2xl border-b border-white/[0.06] sticky top-0 z-30"
        >
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <div className="px-6 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Active mode indicator in header */}
                {activeTab_meta && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${activeTab_meta.color}18` }}
                    >
                      <activeTab_meta.icon className="w-4 h-4" style={{ color: activeTab_meta.color }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-tight leading-none">{activeTab_meta.label}</h2>
                      <p className="text-[11px] text-gray-500 mt-0.5">{activeTab_meta.desc}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Workflow Status */}
                {hasValidData && (
                  <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/[0.05]">
                    {(['draft', 'review', 'approved'] as WorkflowStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => setWorkflowStatus(status)}
                        className="relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        {workflowStatus === status && (
                          <motion.div
                            layoutId="activeWorkflow"
                            className={`absolute inset-0 rounded-md ${
                              status === 'draft' ? 'bg-yellow-500/15 border border-yellow-500/20'
                              : status === 'review' ? 'bg-blue-500/15 border border-blue-500/20'
                              : 'bg-green-500/15 border border-green-500/20'
                            }`}
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${
                          workflowStatus === status
                            ? status === 'draft' ? 'text-yellow-400'
                            : status === 'review' ? 'text-blue-400'
                            : 'text-green-400'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}>
                          {status === 'draft' && <Clock className="w-3 h-3" />}
                          {status === 'review' && <Eye className="w-3 h-3" />}
                          {status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'draft' ? 'Entwurf' : status === 'review' ? 'Prüfung' : 'Freigabe'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      <div className="px-6 py-6 max-w-[1400px] relative z-10">
        <AnimatePresence mode="wait">
        {/* Documents Section */}
        {mode === 'docs' && (
          <motion.div
            key="docs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <DocumentsPanel />
          </motion.div>
        )}

        {/* Trends Section */}
        {mode === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-10 text-center overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25"
              >
                <TrendingUp className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-semibold text-white mb-3 tracking-tight"
              >Multi-Perioden Trendanalyse</motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-300 mb-6 max-w-lg mx-auto"
              >
                Laden Sie Buchungsdaten aus mehreren Jahren hoch, um CAGR, Volatilität, Forecasts und Anomalien über 3-5 Perioden zu analysieren.
              </motion.p>
              {/* Animated mini chart placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-md mx-auto"
              >
                <svg viewBox="0 0 300 60" className="w-full h-auto opacity-30">
                  <motion.path
                    d="M0,50 L30,45 L60,48 L90,35 L120,38 L150,25 L180,28 L210,15 L240,18 L270,10 L300,5"
                    fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 0.6, ease: 'easeOut' }}
                  />
                  {[0, 60, 120, 180, 240, 300].map((x, i) => (
                    <motion.circle
                      key={i} cx={x} cy={[50, 48, 35, 25, 15, 5][i]} r="3" fill="#10b981"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 0.5, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.15 }}
                    />
                  ))}
                </svg>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-gray-500 text-sm mt-4"
              >
                Nutzen Sie die Einzelanalyse, um zunächst Daten zu laden.
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Error Detection Section */}
        {mode === 'errors' && (
          <motion.div
            key="errors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <BookingErrorPanel
              errors={errorDetectionResult}
              isLoading={isDetectingErrors}
              onRefresh={refreshErrorDetection}
            />
          </motion.div>
        )}

        {/* Scenario Simulation Section */}
        {mode === 'scenario' && (
          <motion.div
            key="scenario"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <ScenarioSimulator analysisResult={currentResult ?? null} />
          </motion.div>
        )}

        {/* Liquiditätsplanung Section */}
        {mode === 'liquidity' && (
          <motion.div
            key="liquidity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <LiquidityDashboard bookings={currBookings} />
          </motion.div>
        )}

        {/* Monatsabschluss-Workflow Section */}
        {mode === 'closing' && (
          <motion.div
            key="closing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <MonthlyClosingDashboard bookings={currBookings} prevBookings={prevBookings} />
          </motion.div>
        )}

        {/* Deckungsbeitragsrechnung Section */}
        {mode === 'contribution' && (
          <motion.div
            key="contribution"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <ContributionDashboard bookings={currBookings} />
          </motion.div>
        )}

        {/* Kapitalflussrechnung Section */}
        {mode === 'cashflow' && (
          <motion.div
            key="cashflow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <CashflowDashboard bookings={currBookings} />
          </motion.div>
        )}

        {/* BWA Section */}
        {mode === 'bwa' && (
          <motion.div
            key="bwa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <BWADashboard bookings={currBookings} prevBookings={prevBookings} />
          </motion.div>
        )}

        {/* BAB Section */}
        {mode === 'bab' && (
          <motion.div
            key="bab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <BABDashboard bookings={currBookings} />
          </motion.div>
        )}

        {/* Rolling Forecast Section */}
        {mode === 'forecast' && (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            <RollingForecastDashboard
              currentBookings={currBookings.length > 0 ? currBookings : null}
              historicalBookings={prevBookings.length > 0 ? prevBookings : null}
            />
          </motion.div>
        )}

        {/* Triple Upload Section */}
        {mode === 'triple' && (
          <motion.div
            key="triple-upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 tracking-tight">
              <BarChart3 className="w-5 h-5 text-pink-400" />
              Plan vs. Ist vs. Vorjahr
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Vergleiche Plan-Daten mit Ist-Buchungen und Vorjahr. Nur Ist ist Pflicht - ohne VJ/Plan wird automatisch verglichen.
            </p>
            <TripleUpload
              onAnalysisComplete={(result) => setTripleResult(result)}
            />
          </motion.div>
        )}

        {/* Upload Section */}
        {mode !== 'triple' && mode !== 'docs' && mode !== 'errors' && mode !== 'scenario' && mode !== 'forecast' && mode !== 'contribution' && mode !== 'cashflow' && mode !== 'bwa' && mode !== 'bab' && (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
        <BlurFade delay={0.05} inView>
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 mb-8 overflow-hidden">
          <BorderBeam size={150} duration={20} colorFrom="#ec4899" colorTo="#8b5cf6" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 tracking-tight">
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
              <p className="text-gray-300 text-sm">
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
              <div key={entity.id} className="bg-white/[0.015] rounded-xl p-4 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {mode === 'multi' ? (
                      <select
                        value={entity.name}
                        onChange={e => updateEntity(entity.id, { name: e.target.value })}
                        className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Gesellschaft wählen...</option>
                        {EXAMPLE_ENTITIES.map(name => (
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
            <ShimmerButton
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
              shimmerColor="#06b6d4"
              shimmerSize="0.08em"
              background="linear-gradient(135deg, #2563eb 0%, #0891b2 100%)"
              borderRadius="12px"
              className="flex-1 min-w-[200px] py-3 px-6 font-medium disabled:opacity-40"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Analysiere...</span>
              ) : (
                <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Analysieren</span>
              )}
            </ShimmerButton>

            {hasValidData && (
              <>
                <button
                  onClick={() => downloadReport('word')}
                  disabled={isGeneratingReport}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-blue-500/25 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group"
                >
                  <FileText className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  Word
                </button>
                <button
                  onClick={() => downloadReport('excel')}
                  disabled={isGeneratingReport}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-green-500/25 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                  Excel
                </button>
                <AIReportButton analysisResult={currentResult ?? null} />
                <button
                  onClick={() => {
                    if (currentResult) {
                      const name = prompt('Name für die Analyse:', `Analyse ${new Date().toLocaleDateString('de-DE')}`);
                      if (name) {
                        saveAnalysis(name, entities[0]?.name || 'Unbenannt', currentResult, labKPIs || undefined);
                      }
                    }
                  }}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-yellow-500/25 text-white py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group"
                >
                  <Save className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  Speichern
                </button>
              </>
            )}
          </div>
        </div>
        </BlurFade>
        </motion.div>
        )}

        {/* Triple Comparison Results */}
        {mode === 'triple' && tripleResult && (
          <motion.div
            key="triple-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-8"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4">
                <p className="text-sm text-gray-500 mb-1">Plan</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(tripleResult.meta.total_plan)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4">
                <p className="text-sm text-gray-500 mb-1">Ist</p>
                <p className="text-xl font-bold text-white">{formatCurrency(tripleResult.meta.total_ist)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4">
                <p className="text-sm text-gray-500 mb-1">Vorjahr</p>
                <p className="text-xl font-bold text-gray-400">{formatCurrency(tripleResult.meta.total_vj)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className={`rounded-xl border p-4 ${
                tripleResult.summary.total_delta_plan > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <p className="text-sm text-gray-500 mb-1">Δ Plan</p>
                <p className={`text-xl font-bold flex items-center gap-2 ${
                  tripleResult.summary.total_delta_plan > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {tripleResult.summary.total_delta_plan > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {formatCurrency(tripleResult.summary.total_delta_plan)}
                </p>
              </motion.div>
            </div>

            {/* Triple Comparison Table */}
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
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
          </motion.div>
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
        </AnimatePresence>

        {/* Natural Language Query */}
        {mode !== 'triple' && mode !== 'docs' && mode !== 'trends' && hasValidData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <NLQueryBar />
          </motion.div>
        )}

        {/* Results (for single and multi mode) */}
        {mode !== 'triple' && hasValidData && currentResult && (
          <>
            {/* AI-Generated Management Summary */}
            <ManagementSummary
              analysisResult={currentResult}
              entityName={mode === 'single' ? entities[0]?.name : 'Konzern'}
              workflowStatus={workflowStatus}
            />

            {/* Labor KPIs Dashboard */}
            {labKPIs && <LabKPIDashboard kpis={labKPIs} />}

            {/* KPI Cards with NumberTicker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <BlurFade delay={0.05} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
                <BorderBeam size={80} duration={12} colorFrom="#3b82f6" colorTo="#8b5cf6" />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">{mode === 'multi' ? 'Gesellschaften' : 'Buchungen VJ'}</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <NumberTicker value={mode === 'multi' ? (konzernResult?.entities.length ?? 0) : currentResult.meta.bookings_prev} />
                </p>
              </motion.div>
              </BlurFade>
              <BlurFade delay={0.1} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
                <BorderBeam size={80} duration={12} delay={3} colorFrom="#3b82f6" colorTo="#06b6d4" />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">Vorjahr</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <NumberTicker value={Math.round(currentResult.meta.total_prev)} prefix="" suffix=" €" />
                </p>
              </motion.div>
              </BlurFade>
              <BlurFade delay={0.15} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
                <BorderBeam size={80} duration={12} delay={6} colorFrom="#06b6d4" colorTo="#22c55e" />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">Aktuell</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <NumberTicker value={Math.round(currentResult.meta.total_curr)} prefix="" suffix=" €" />
                </p>
              </motion.div>
              </BlurFade>
              <BlurFade delay={0.2} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className={`relative rounded-xl border p-5 overflow-hidden ${
                currentResult.summary.total_delta > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <BorderBeam size={80} duration={12} delay={9} colorFrom={currentResult.summary.total_delta > 0 ? '#ef4444' : '#22c55e'} colorTo={currentResult.summary.total_delta > 0 ? '#f97316' : '#06b6d4'} />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">Abweichung</p>
                <p className={`text-2xl font-bold flex items-center gap-2 tracking-tight ${
                  currentResult.summary.total_delta > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {currentResult.summary.total_delta > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <NumberTicker value={Math.round(Math.abs(currentResult.summary.total_delta))} prefix={currentResult.summary.total_delta > 0 ? '+' : '-'} suffix=" €" />
                </p>
              </motion.div>
              </BlurFade>
            </div>

            {/* Charts */}
            <BlurFade delay={0.25} inView>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 200 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-6 overflow-hidden hover:border-white/[0.12] transition-colors">
                <BorderBeam size={100} duration={15} colorFrom="#3b82f6" colorTo="#06b6d4" />
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2 tracking-tight">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  {mode === 'multi' ? 'Gesellschaften' : 'Top Abweichungen'}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mode === 'multi' ? benchmarkChartData : topDeviationsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 200 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-6 overflow-hidden hover:border-white/[0.12] transition-colors">
                <BorderBeam size={100} duration={15} delay={7} colorFrom="#8b5cf6" colorTo="#ec4899" />
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2 tracking-tight">
                  <PieChart className="w-5 h-5 text-purple-400" />
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
              </motion.div>
            </div>
            </BlurFade>

            {/* Tabs */}
            <BlurFade delay={0.3} inView>
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
              <BorderBeam size={200} duration={25} colorFrom="#3b82f6" colorTo="#22c55e" />
              <div className="flex border-b border-white/[0.06]">
                {(['overview', 'accounts', 'costcenters', 'evidence'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3.5 px-4 text-sm font-medium transition-all relative ${
                      activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />
                    )}
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
                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2 tracking-tight">
                      <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
                      Signifikante Abweichungen
                    </h4>
                    {currentResult.by_account?.slice(0, 10).map((dev, idx) => (
                      <BlurFade key={idx} delay={0.03 * idx} inView>
                      <div className="space-y-2">
                        <button
                          onClick={() => { setSelectedDeviation(dev); setShowEvidenceModal(true); }}
                          className="w-full flex items-center justify-between bg-white/[0.015] hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] rounded-xl p-4 transition-all text-left group"
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
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setRootCauseDeviation(rootCauseDeviation?.account === dev.account ? null : dev)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                              rootCauseDeviation?.account === dev.account
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            🔍 Warum?
                          </button>
                        </div>
                        {rootCauseDeviation?.account === dev.account && (
                          <RootCausePanel
                            deviation={dev}
                            prevBookings={prevBookings}
                            currBookings={currBookings}
                            onClose={() => setRootCauseDeviation(null)}
                          />
                        )}
                      </div>
                      </BlurFade>
                    ))}
                  </div>
                )}

                {activeTab === 'accounts' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="pb-4 font-semibold">Konto</th>
                          <th className="pb-4 font-semibold">Bezeichnung</th>
                          <th className="pb-4 text-right font-semibold">Vorjahr</th>
                          <th className="pb-4 text-right font-semibold">Aktuell</th>
                          <th className="pb-4 text-right font-semibold">Abweichung</th>
                          <th className="pb-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {currentResult.by_account?.slice(0, 15).map((acc, idx) => (
                          <tr key={idx} className={`border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors ${idx % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                            <td className="py-3.5 text-gray-500 font-mono text-xs">{acc.account}</td>
                            <td className="py-3.5 text-white">{acc.account_name}</td>
                            <td className="py-3.5 text-right text-gray-300 tabular-nums">{formatCurrency(acc.amount_prev)}</td>
                            <td className="py-3.5 text-right text-gray-300 tabular-nums">{formatCurrency(acc.amount_curr)}</td>
                            <td className={`py-3.5 text-right font-semibold tabular-nums ${acc.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(acc.delta_abs)}
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => { setSelectedDeviation(acc); setShowEvidenceModal(true); }}
                                className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors group"
                              >
                                <Link2 className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
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
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="pb-4 font-semibold">Kostenstelle</th>
                          <th className="pb-4 text-right font-semibold">Vorjahr</th>
                          <th className="pb-4 text-right font-semibold">Aktuell</th>
                          <th className="pb-4 text-right font-semibold">Abweichung</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {currentResult.by_cost_center?.slice(0, 15).map((cc, idx) => (
                          <tr key={idx} className={`border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors ${idx % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                            <td className="py-3.5 text-white font-medium">{cc.cost_center || '(keine)'}</td>
                            <td className="py-3.5 text-right text-gray-400 tabular-nums">{formatCurrency(cc.amount_prev)}</td>
                            <td className="py-3.5 text-right text-gray-300 tabular-nums">{formatCurrency(cc.amount_curr)}</td>
                            <td className={`py-3.5 text-right font-semibold tabular-nums ${cc.delta_abs > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(cc.delta_abs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div className="text-center py-16">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 animate-pulse" />
                      <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Link2 className="w-10 h-10 text-blue-400" />
                      </div>
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-3 tracking-tight">Evidence Trail</h4>
                    <p className="text-gray-300 max-w-md mx-auto leading-relaxed">
                      Klicke auf eine Abweichung in der Übersicht oder Konten-Tabelle,
                      um die verknüpften Buchungen bis auf Belegebene nachzuverfolgen.
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500/60" /> Prüfungssicher</div>
                      <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500/60" /> Revisionsfest</div>
                      <div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-purple-500/60" /> Belegverknüpft</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </BlurFade>
          </>
        )}
      </div>

      {/* AI Chat Interface */}
      <ChatInterface
        analysisResult={currentResult ?? null}
      />
      </div>{/* end Main Content Area */}
    </main>
  );
}
