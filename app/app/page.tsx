'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  LogOut,
  User,
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
	import { ShimmerButton } from '@/components/magicui/shimmer-button';
	import { BorderBeam } from '@/components/magicui/border-beam';
	import { BlurFade } from '@/components/magicui/blur-fade';
	import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';
	import LoginScreen from '@/components/LoginScreen';


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
type AnalysisMode = 'start' | 'single' | 'multi' | 'triple' | 'docs' | 'trends' | 'errors' | 'scenario' | 'forecast' | 'liquidity' | 'closing' | 'contribution' | 'cashflow' | 'bwa' | 'bab';

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
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'controller' | 'viewer';
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'validate' }),
        });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.ok && data?.valid && data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Non-critical
    }
    setCurrentUser(null);
  };

  const [mode, setMode] = useState<AnalysisMode>('start');
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
    const result = mode === 'multi' ? konzernResult?.consolidated : entities[0]?.result;
    if (!result) return;

    const now = new Date().toISOString().split('T')[0];
    const baseName = mode === 'multi'
      ? `Konzern_Abweichungsanalyse_${now}`
      : `Abweichungsanalyse_${entities[0]?.name || 'Report'}_${now}`;

    setIsGeneratingReport(true);
    try {
      const endpoint = format === 'excel' ? '/api/export/xlsx' : '/api/generate-report';
      const body = format === 'excel'
        ? JSON.stringify({ type: 'variance', data: result, filename: `${baseName}.xlsx` })
        : JSON.stringify(result);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'excel' ? 'xlsx' : 'docx';
        a.download = `${baseName}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const err = await response.json().catch(() => null);
        console.error('Report generation failed:', err);
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

  // Auth gate: keep the application private by default.
  if (authChecking) {
    return (
      <main className="min-h-screen bg-[rgb(var(--background-rgb))] flex items-center justify-center">
        <div className="text-gray-600 text-sm">Session wird geladen...</div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLoggedIn={(user) => {
          setCurrentUser(user);
          setMode('start');
        }}
      />
    );
  }

  // Mode config for sidebar navigation
  interface ModeTab {
    key: AnalysisMode;
    label: string;
    desc: string;
    icon: LucideIcon;
    color: string;
    group: 'home' | 'controlling' | 'analyse' | 'ki';
  }

		  const modeTabs: ModeTab[] = [
		    // ── Start ──
		    { key: 'start',        label: 'Start',          desc: 'Übersicht & nächste Schritte',      icon: Zap,          color: '#0071e3', group: 'home' },
		    // ── Controlling ──
		    { key: 'liquidity',    label: 'Liquidität',     desc: '13-Wochen Cashflow-Prognose',     icon: TrendingUp,   color: '#10b981', group: 'controlling' },
		    { key: 'closing',      label: 'Abschluss',      desc: 'Monatsabschluss mit 12 Checks',   icon: CheckCircle,  color: '#22c55e', group: 'controlling' },
		    { key: 'contribution', label: 'DB-Rechnung',    desc: 'Mehrstufige DB I → DB V',         icon: BarChart3,    color: '#14b8a6', group: 'controlling' },
		    { key: 'cashflow',     label: 'Cashflow',       desc: 'DRS 21 Kapitalflussrechnung',     icon: Wallet,       color: '#5e5ce6', group: 'controlling' },
		    { key: 'bwa',          label: 'BWA',            desc: 'DATEV-BWA mit KI-Analyse',        icon: FileText,     color: '#f97316', group: 'controlling' },
		    { key: 'bab',          label: 'BAB',            desc: 'Kostenstellen & GK-Zuschläge',    icon: Grid3x3,      color: '#ef4444', group: 'controlling' },
		    // ── Analyse ──
		    { key: 'single',       label: 'Einzelanalyse',  desc: 'Abweichungsanalyse je Periode',   icon: Search,       color: '#0071e3', group: 'analyse' },
		    { key: 'triple',       label: 'Plan vs Ist',    desc: 'Dreifach-Vergleich mit VJ',       icon: GitCompare,   color: '#5e5ce6', group: 'analyse' },
		    { key: 'multi',        label: 'Konzern',        desc: 'Multi-Entity Konsolidierung',     icon: Building2,    color: '#0ea5e9', group: 'analyse' },
		    // ── KI-Tools ──
		    { key: 'errors',       label: 'Fehler-Scan',    desc: 'KI-Buchungsfehler-Erkennung',     icon: AlertCircle,  color: '#f97316', group: 'ki' },
		    { key: 'scenario',     label: 'Szenario',       desc: 'What-if Simulation',              icon: Target,       color: '#0071e3', group: 'ki' },
		    { key: 'forecast',     label: 'Forecast',       desc: 'Rollierender 12-Monats-Forecast', icon: TrendingUp,   color: '#5e5ce6', group: 'ki' },
		    { key: 'trends',       label: 'Trends',         desc: 'Multi-Perioden Trendanalyse',     icon: Activity,     color: '#10b981', group: 'ki' },
		    { key: 'docs',         label: 'Dokumente',      desc: 'KI-Reports & Dokumenten-Archiv',  icon: FolderOpen,   color: '#f59e0b', group: 'ki' },
		  ];

  const sidebarGroups = [
    { key: 'home' as const, label: 'Start' },
    { key: 'controlling' as const, label: 'Controlling' },
    { key: 'analyse' as const, label: 'Analyse' },
    { key: 'ki' as const, label: 'KI-Tools' },
  ];

  // Shared sidebar content renderer
  const renderSidebarNav = (onSelect?: () => void) => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
      {sidebarGroups.map((group, gi) => (
        <div key={group.key}>
          {gi > 0 && <div className="my-3 mx-2 h-px bg-black/[0.06]" />}
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
	                    isActive ? 'bg-black/[0.03]' : 'hover:bg-black/[0.02]'
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
                      isActive ? '' : 'bg-black/[0.03]'
                    }`}
                    style={isActive ? { backgroundColor: `${tab.color}18` } : undefined}
                  >
                    <Icon className="w-4 h-4 transition-colors" style={{ color: isActive ? tab.color : '#6b7280' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-tight transition-colors ${
                      isActive ? 'text-gray-900' : 'text-gray-600 group-hover/item:text-gray-900'
                    }`}>
                      {tab.label}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5 truncate">{tab.desc}</p>
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
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))] relative flex">
      {/* Subtle grid overlay (keeps structure without looking "dark") */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      {/* Evidence Modal */}
      {showEvidenceModal && selectedDeviation && (
        <EvidenceModal
          deviation={selectedDeviation}
          onClose={() => setShowEvidenceModal(false)}
        />
      )}

      {/* ═══ Desktop Sidebar ═══ */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-r border-black/[0.10]">
        {/* Sidebar Header / Logo */}
        <div className="px-4 py-4 border-b border-black/[0.08]">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.08] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-gray-900 tracking-[-0.02em]">Controlling Engine</h1>
              <p className="text-[10px] text-gray-500 tracking-wide">Abweichungsanalyse</p>
            </div>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        {renderSidebarNav()}

        {/* Sidebar Footer */}
        <div className="px-4 py-3 border-t border-black/[0.08]">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
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
              className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
		              className="fixed left-0 top-0 bottom-0 w-[270px] z-50 bg-white border-r border-black/[0.10] flex flex-col md:hidden"
            >
              {/* Mobile Sidebar Header */}
              <div className="px-4 py-4 border-b border-black/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0071e3] to-[#5e5ce6] flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(0,113,227,0.35)]">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Navigation</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-black/[0.06] transition-colors"
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
          className="relative bg-white/70 backdrop-blur-2xl border-b border-black/[0.10] sticky top-0 z-30"
        >
          <div className="px-6 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden w-9 h-9 rounded-xl bg-black/[0.03] border border-black/[0.08] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-black/[0.05] transition-colors"
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
                      <h2 className="text-sm font-semibold text-gray-900 tracking-tight leading-none">{activeTab_meta.label}</h2>
                      <p className="text-[11px] text-gray-500 mt-0.5">{activeTab_meta.desc}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Workflow Status */}
                {mode !== 'start' && hasValidData && (
                  <div className="hidden sm:flex items-center gap-1 bg-white/70 rounded-lg p-1 border border-black/[0.08] shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]">
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
                              status === 'draft' ? 'bg-yellow-500/[0.15] border border-yellow-500/20'
                              : status === 'review' ? 'bg-blue-500/[0.12] border border-blue-500/20'
                              : 'bg-green-500/[0.15] border border-green-500/20'
                            }`}
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${
                          workflowStatus === status
                            ? status === 'draft' ? 'text-yellow-700'
                            : status === 'review' ? 'text-blue-700'
                            : 'text-green-700'
                            : 'text-gray-600 hover:text-gray-800'
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

                {/* User / Logout */}
                <div className="flex items-center gap-2 rounded-xl border border-black/[0.10] bg-white/70 px-3 py-2 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]">
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-gray-900 leading-none">{currentUser.name}</p>
                    <p className="mt-0.5 text-[10px] text-gray-500 leading-none">
                      {currentUser.role === 'admin'
                        ? 'Administrator'
                        : currentUser.role === 'controller'
                          ? 'Controller'
                          : 'Leser'}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.08] flex items-center justify-center">
                    <User className="h-4 w-4 text-[#0071e3]" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="h-8 w-8 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] flex items-center justify-center"
                    title="Abmelden"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

	      <div className="px-6 py-8 max-w-[1520px] relative z-10">
        <AnimatePresence mode="wait">
        {/* Start / Landing (after login) */}
        {mode === 'start' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-10"
          >
	            <div className="relative overflow-hidden rounded-[28px] border border-black/[0.10] bg-white/70 backdrop-blur-2xl p-8 md:p-10 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
	              <div className="pointer-events-none absolute inset-0">
	                <motion.div
	                  aria-hidden="true"
	                  className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#0071e3]/12 blur-3xl"
	                  animate={{ y: [0, 18, 0], x: [0, 10, 0], opacity: [0.55, 0.75, 0.55] }}
	                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
	                />
	                <motion.div
	                  aria-hidden="true"
	                  className="absolute -bottom-48 right-0 h-96 w-96 rounded-full bg-[#5e5ce6]/12 blur-3xl"
	                  animate={{ y: [0, -14, 0], x: [0, -10, 0], opacity: [0.45, 0.65, 0.45] }}
	                  transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
	                />
	                <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.028)_1px,transparent_1px)] [background-size:72px_72px]" />
	              </div>

	              <BorderBeam size={180} duration={18} colorFrom="#0071e3" colorTo="#5e5ce6" />

              <div className="relative">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <BlurFade delay={0.02}>
                      <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.10] bg-white/60 px-3 py-1 text-xs text-gray-700 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]">
                        <Shield className="h-3.5 w-3.5 text-[#0071e3]" />
                        Lokal. Prüffähig. Schnell.
                        <span className="mx-1 h-3 w-px bg-black/10" />
                        <span className="text-gray-400">Start</span>
                      </p>
                    </BlurFade>

                    <BlurFade delay={0.06}>
                      <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
                        Willkommen zurück,{' '}
                        <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">
                          {currentUser.name}
                        </span>
                        .
                      </h1>
                    </BlurFade>

                    <BlurFade delay={0.12}>
                      <p className="mt-4 text-base text-gray-700 leading-relaxed">
                        Starte mit einem Import, analysiere die wesentlichen Abweichungen und exportiere einen Report,
                        der direkt ins Review gehen kann.
                      </p>
                    </BlurFade>

                    <BlurFade delay={0.18}>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ShimmerButton
                          onClick={() => setMode('single')}
                          shimmerColor="#bfdbfe"
                          shimmerSize="0.08em"
                          borderRadius="16px"
                          background="linear-gradient(135deg, #0071e3 0%, #5e5ce6 100%)"
                          className="w-full sm:w-auto py-3 px-6 text-sm font-semibold"
                        >
                          <span className="relative z-10 inline-flex items-center gap-2">
                            Neue Analyse starten <ArrowRight className="h-4 w-4" />
                          </span>
                        </ShimmerButton>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setMode('triple')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.10] bg-white/60 px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-white/80 transition-colors shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]"
                          >
                            Plan vs. Ist <GitCompare className="h-4 w-4 text-[#5e5ce6]" />
                          </button>
                          <button
                            onClick={() => setMode('docs')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.10] bg-white/60 px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-white/80 transition-colors shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]"
                          >
                            Dokumente <FolderOpen className="h-4 w-4 text-amber-600" />
                          </button>
                        </div>
                      </div>
                    </BlurFade>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:w-[360px]">
	                    <BlurFade delay={0.08}>
	                      <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-5 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
	                        <p className="text-[11px] uppercase tracking-[0.12em] text-gray-600 font-semibold">Quick tip</p>
	                        <p className="mt-2 text-sm font-semibold text-gray-900 tracking-tight">Magic Upload</p>
	                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
	                          In der Einzelanalyse erkennt der Import Formate automatisch. Perfekt für den schnellen Einstieg.
	                        </p>
	                      </div>
	                    </BlurFade>
	                    <BlurFade delay={0.12}>
	                      <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-5 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
	                        <p className="text-[11px] uppercase tracking-[0.12em] text-gray-600 font-semibold">Sicherheit</p>
	                        <p className="mt-2 text-sm font-semibold text-gray-900 tracking-tight">Session basiert</p>
	                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
	                          Zugriff ist standardmäßig geschützt. Rollen und Logout sind direkt erreichbar.
	                        </p>
	                      </div>
	                    </BlurFade>
	                    <BlurFade delay={0.16}>
	                      <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-5 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
	                        <p className="text-[11px] uppercase tracking-[0.12em] text-gray-600 font-semibold">Output</p>
	                        <p className="mt-2 text-sm font-semibold text-gray-900 tracking-tight">Review-ready</p>
	                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
	                          Export als Word/Excel, inkl. Summary und Workflow-Status (Entwurf, Prüfung, Freigabe).
	                        </p>
	                      </div>
	                    </BlurFade>
                  </div>
                </div>

	                <div className="mt-10">
		                  <BlurFade delay={0.05}>
		                    <div className="flex items-center justify-between">
		                      <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Dein Einstieg</h2>
		                      <p className="text-xs text-gray-500">Workflows & Module</p>
		                    </div>
		                  </BlurFade>

	                  <BlurFade delay={0.10}>
	                    <BentoGrid className="mt-4 md:auto-rows-[18rem]">
	                      <BentoCard
	                        Icon={Upload}
	                        name="Einzelanalyse"
	                        description="Vorjahr vs. Aktuell. Format-Erkennung, Plausibilität, Abweichungen und Evidence."
	                        tag="Empfohlen"
	                        cta="Öffnen"
	                        onClick={() => setMode('single')}
	                        className="md:col-span-2"
		                        background={
		                          <div className="absolute inset-0">
		                            <Upload className="absolute -bottom-10 -right-10 h-52 w-52 text-[#0071e3]/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />

	                      <BentoCard
	                        Icon={GitCompare}
	                        name="Plan vs. Ist"
	                        description="Dreifachvergleich: Plan, Ist und Vorjahr. Ideal für Budget-Reviews und Forecasts."
	                        tag="Plan/Ist/VJ"
	                        cta="Öffnen"
	                        onClick={() => setMode('triple')}
	                        className="md:col-span-1"
		                        background={
		                          <div className="absolute inset-0">
		                            <GitCompare className="absolute -bottom-10 -right-10 h-52 w-52 text-[#5e5ce6]/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />

	                      <BentoCard
	                        Icon={TrendingUp}
	                        name="Liquidität"
	                        description="13-Wochen Cashflow-Prognose mit Plausibilisierung aus geladenen Buchungen."
	                        tag="13 Wochen"
	                        cta="Öffnen"
	                        onClick={() => setMode('liquidity')}
	                        className="md:col-span-1"
		                        background={
		                          <div className="absolute inset-0">
		                            <TrendingUp className="absolute -bottom-10 -right-10 h-52 w-52 text-emerald-700/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />

	                      <BentoCard
	                        Icon={CheckCircle}
	                        name="Abschluss"
	                        description="Monatsabschluss mit 12 Checks, Aufgabenliste und Review-ready Dokumentation."
	                        tag="12 Checks"
	                        cta="Öffnen"
	                        onClick={() => setMode('closing')}
	                        className="md:col-span-1"
		                        background={
		                          <div className="absolute inset-0">
		                            <CheckCircle className="absolute -bottom-10 -right-10 h-52 w-52 text-green-700/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />

	                      <BentoCard
	                        Icon={AlertCircle}
	                        name="Fehler-Scan"
	                        description="KI-Buchungsfehler-Erkennung: Duplikate, fehlende Belege, ungewöhnliche Buchungen."
	                        tag="KI"
	                        cta="Öffnen"
	                        onClick={() => setMode('errors')}
	                        className="md:col-span-1"
		                        background={
		                          <div className="absolute inset-0">
		                            <AlertCircle className="absolute -bottom-10 -right-10 h-52 w-52 text-orange-700/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />

	                      <BentoCard
	                        Icon={FolderOpen}
	                        name="Dokumente"
	                        description="KI-Reports und Dokumenten-Archiv. Optional token-geschützt für Betrieb und Sharing."
	                        tag="Archive"
	                        cta="Öffnen"
	                        onClick={() => setMode('docs')}
	                        className="md:col-span-3"
		                        background={
		                          <div className="absolute inset-0">
		                            <FolderOpen className="absolute -bottom-12 -right-12 h-64 w-64 text-amber-700/10" />
		                            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
		                          </div>
		                        }
		                      />
	                    </BentoGrid>
	                  </BlurFade>
	                </div>

	                <div className="mt-10">
		                  <BlurFade delay={0.12}>
		                    <div className="flex items-center justify-between">
		                      <h2 className="text-sm font-semibold text-gray-900 tracking-tight">In 3 Schritten</h2>
		                      <p className="text-xs text-gray-500">Klarer Prozess statt UI-Rauschen</p>
		                    </div>
		                  </BlurFade>

	                  <BlurFade delay={0.16}>
		                    <div className="bento-glow relative overflow-hidden rounded-3xl border border-black/[0.10] bg-white/70 backdrop-blur-2xl p-6 md:p-8 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
		                      <BorderBeam size={220} duration={20} colorFrom="#0071e3" colorTo="#5e5ce6" />
		                      <div className="grid gap-4 md:grid-cols-3">
		                        <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
		                          <div className="flex items-center justify-between">
		                            <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">01</span>
		                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]">
		                              <Upload className="h-5 w-5 text-[#0071e3]" />
		                            </span>
		                          </div>
		                          <p className="mt-4 text-sm font-semibold text-gray-900 tracking-tight">Daten laden</p>
		                          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
		                            Vorjahr und aktuelles Jahr hochladen. Magic Upload normalisiert Felder automatisch.
		                          </p>
		                        </div>

		                        <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
		                          <div className="flex items-center justify-between">
		                            <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">02</span>
		                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]">
		                              <Search className="h-5 w-5 text-[#5e5ce6]" />
		                            </span>
		                          </div>
		                          <p className="mt-4 text-sm font-semibold text-gray-900 tracking-tight">Abweichungen verstehen</p>
		                          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
		                            Fokus auf Treiber: Konten, Kostenstellen, Root Cause. Evidence zeigt Details.
		                          </p>
		                        </div>

		                        <div className="rounded-2xl border border-black/[0.10] bg-white/60 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.35)]">
		                          <div className="flex items-center justify-between">
		                            <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">03</span>
		                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]">
		                              <Download className="h-5 w-5 text-emerald-700" />
		                            </span>
		                          </div>
		                          <p className="mt-4 text-sm font-semibold text-gray-900 tracking-tight">Report exportieren</p>
		                          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
		                            Summary & Workflow-Status setzen und als Word/Excel exportieren. Fertig fürs Review.
		                          </p>
		                        </div>
		                      </div>

	                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
		                        <ShimmerButton
		                          onClick={() => setMode('single')}
		                          shimmerColor="#bfdbfe"
		                          shimmerSize="0.08em"
		                          borderRadius="16px"
		                          background="linear-gradient(135deg, #0071e3 0%, #5e5ce6 100%)"
		                          className="w-full sm:w-auto py-3 px-6 text-sm font-semibold"
		                        >
	                          <span className="relative z-10 inline-flex items-center gap-2">
	                            Jetzt starten <ArrowRight className="h-4 w-4" />
	                          </span>
	                        </ShimmerButton>

		                        <button
		                          onClick={() => setMode('docs')}
		                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-black/[0.10] bg-white/60 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-white/80 transition-colors shadow-[0_10px_30px_-22px_rgba(0,0,0,0.20)]"
		                        >
		                          Reports ansehen <FolderOpen className="h-4 w-4 text-amber-600" />
		                        </button>
		                      </div>
		                    </div>
	                  </BlurFade>
	                </div>
              </div>
            </div>
          </motion.div>
        )}

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
	            className="bg-white/70 backdrop-blur-2xl rounded-2xl border border-black/[0.10] p-6 mb-8 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]"
	          >
	            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
	              <BarChart3 className="w-5 h-5 text-[#0071e3]" />
	              Plan vs. Ist vs. Vorjahr
	            </h2>
	            <p className="text-gray-600 text-sm mb-6">
	              Vergleiche Plan-Daten mit Ist-Buchungen und Vorjahr. Nur Ist ist Pflicht - ohne VJ/Plan wird automatisch verglichen.
	            </p>
	            <TripleUpload
	              onAnalysisComplete={(result) => setTripleResult(result)}
	            />
	          </motion.div>
        )}

        {/* Upload Section */}
        {mode !== 'start' && mode !== 'triple' && mode !== 'docs' && mode !== 'errors' && mode !== 'scenario' && mode !== 'forecast' && mode !== 'contribution' && mode !== 'cashflow' && mode !== 'bwa' && mode !== 'bab' && (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
        <BlurFade delay={0.05} inView>
	        <div className="relative bg-white/70 backdrop-blur-2xl rounded-2xl border border-black/[0.10] p-6 mb-8 overflow-hidden shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
	          <BorderBeam size={120} duration={18} colorFrom="#0071e3" colorTo="#5e5ce6" />
	          <div className="flex items-center justify-between mb-4">
	            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
	              {useMagicUpload ? (
	                <>
	                  <Sparkles className="w-5 h-5 text-[#5e5ce6]" />
	                  Intelligenter Import
	                </>
	              ) : (
	                <>
	                  <Upload className="w-5 h-5 text-[#0071e3]" />
	                  {mode === 'single' ? 'Buchungsdaten hochladen' : 'Gesellschaften hinzufügen'}
	                </>
	              )}
	            </h2>
	            {mode === 'single' && (
	              <button
	                onClick={() => setUseMagicUpload(!useMagicUpload)}
	                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
	                  useMagicUpload
	                    ? 'bg-[#0071e3]/10 text-[#005bb5] border border-[#0071e3]/20'
	                    : 'bg-black/[0.04] text-gray-700 hover:text-gray-900 border border-black/[0.06]'
	                }`}
	              >
	                {useMagicUpload ? 'Aktiv' : 'Aktivieren'}
	              </button>
	            )}
	          </div>

          {/* Magic Upload Mode */}
          {mode === 'single' && useMagicUpload && (
            <div className="space-y-4">
	              <p className="text-gray-600 text-sm">
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
	              <div key={entity.id} className="bg-white/60 rounded-xl p-4 border border-black/[0.06] shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]">
	                <div className="flex items-center justify-between mb-3">
	                  <div className="flex items-center gap-3">
	                    {mode === 'multi' ? (
	                      <select
	                        value={entity.name}
	                        onChange={e => updateEntity(entity.id, { name: e.target.value })}
	                        className="bg-white/80 border border-black/[0.10] rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[#0071e3]/60 focus:ring-4 focus:ring-[#0071e3]/10"
	                      >
                        <option value="">Gesellschaft wählen...</option>
                        {EXAMPLE_ENTITIES.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
	                    ) : (
	                      <span className="text-gray-900 font-medium">{entity.name || 'Analyse'}</span>
	                    )}
                    {entity.status === 'success' && (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> Analysiert
                      </span>
                    )}
	                    {entity.status === 'analyzing' && (
	                      <span className="flex items-center gap-1 text-blue-700 text-sm">
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
	                      className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0071e3] file:text-white hover:file:bg-[#0077ed] file:cursor-pointer"
	                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Aktuell (CSV)</label>
	                    <input
	                      type="file"
	                      accept=".csv"
	                      onChange={e => updateEntity(entity.id, { currFile: e.target.files?.[0] || null })}
	                      className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0071e3] file:text-white hover:file:bg-[#0077ed] file:cursor-pointer"
	                    />
                  </div>
                </div>
              </div>
            ))}

	            {mode === 'multi' && (
	              <button
	                onClick={addEntity}
	                className="w-full py-3 border-2 border-dashed border-black/[0.10] rounded-xl text-gray-700 hover:border-[#0071e3]/40 hover:text-[#0071e3] transition-all flex items-center justify-center gap-2 bg-white/50"
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
	              shimmerColor="#bfdbfe"
	              shimmerSize="0.08em"
	              background="linear-gradient(135deg, #0071e3 0%, #5e5ce6 100%)"
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
	                  className="bg-white/60 hover:bg-white/80 border border-black/[0.10] hover:border-black/[0.14] text-gray-900 py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
	                >
	                  <FileText className="w-5 h-5 text-[#0071e3] group-hover:scale-110 transition-transform" />
	                  Word
	                </button>
	                <button
	                  onClick={() => downloadReport('excel')}
	                  disabled={isGeneratingReport}
	                  className="bg-white/60 hover:bg-white/80 border border-black/[0.10] hover:border-black/[0.14] text-gray-900 py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
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
	                  className="bg-white/60 hover:bg-white/80 border border-black/[0.10] hover:border-black/[0.14] text-gray-900 py-3 px-5 rounded-xl font-medium transition-all flex items-center gap-2 group shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
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
	              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/70 backdrop-blur-2xl rounded-xl border border-black/[0.10] p-4 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]">
	                <p className="text-sm text-gray-500 mb-1">Plan</p>
	                <p className="text-xl font-bold text-[#5e5ce6]">{formatCurrency(tripleResult.meta.total_plan)}</p>
	              </motion.div>
	              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="bg-white/70 backdrop-blur-2xl rounded-xl border border-black/[0.10] p-4 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]">
	                <p className="text-sm text-gray-500 mb-1">Ist</p>
	                <p className="text-xl font-bold text-gray-900">{formatCurrency(tripleResult.meta.total_ist)}</p>
	              </motion.div>
	              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white/70 backdrop-blur-2xl rounded-xl border border-black/[0.10] p-4 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]">
	                <p className="text-sm text-gray-500 mb-1">Vorjahr</p>
	                <p className="text-xl font-bold text-gray-700">{formatCurrency(tripleResult.meta.total_vj)}</p>
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
              if (mode === 'start') {
                setMode('single');
              }
            }
          }}
          onDelete={deleteSavedAnalysis}
          onRefresh={refreshSavedAnalyses}
        />
        </AnimatePresence>

        {/* Natural Language Query */}
        {mode !== 'start' && mode !== 'triple' && mode !== 'docs' && mode !== 'trends' && hasValidData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <NLQueryBar />
          </motion.div>
        )}

        {/* Results (for single and multi mode) */}
        {mode !== 'start' && mode !== 'triple' && hasValidData && currentResult && (
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
                <BorderBeam size={80} duration={12} colorFrom="#ec4899" colorTo="#a855f7" />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">{mode === 'multi' ? 'Gesellschaften' : 'Buchungen VJ'}</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <NumberTicker value={mode === 'multi' ? (konzernResult?.entities.length ?? 0) : currentResult.meta.bookings_prev} />
                </p>
              </motion.div>
              </BlurFade>
              <BlurFade delay={0.1} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
                <BorderBeam size={80} duration={12} delay={3} colorFrom="#a855f7" colorTo="#ec4899" />
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 mb-1.5">Vorjahr</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  <NumberTicker value={Math.round(currentResult.meta.total_prev)} prefix="" suffix=" €" />
                </p>
              </motion.div>
              </BlurFade>
              <BlurFade delay={0.15} inView>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }} className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
                <BorderBeam size={80} duration={12} delay={6} colorFrom="#ec4899" colorTo="#22c55e" />
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
                <BorderBeam size={80} duration={12} delay={9} colorFrom={currentResult.summary.total_delta > 0 ? '#ef4444' : '#22c55e'} colorTo={currentResult.summary.total_delta > 0 ? '#f97316' : '#a855f7'} />
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
	              <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 200 }} className="relative bg-white/70 backdrop-blur-xl rounded-xl border border-black/[0.10] p-6 overflow-hidden hover:border-black/[0.14] transition-colors shadow-[0_30px_90px_-70px_rgba(0,0,0,0.35)]">
	                <BorderBeam size={100} duration={15} colorFrom="#0071e3" colorTo="#5e5ce6" />
	                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2 tracking-tight">
	                  <BarChart3 className="w-5 h-5 text-[#0071e3]" />
	                  {mode === 'multi' ? 'Gesellschaften' : 'Top Abweichungen'}
	                </h3>
	                <ResponsiveContainer width="100%" height={280}>
	                  <BarChart data={mode === 'multi' ? benchmarkChartData : topDeviationsData} layout="vertical" margin={{ left: 10, right: 10 }}>
	                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
	                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
	                    <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontSize: 11 }} width={100} />
	                    <Tooltip
	                      formatter={(v) => [formatCurrency(v as number), 'Abweichung']}
	                      contentStyle={{
	                        backgroundColor: 'rgba(255,255,255,0.98)',
	                        border: '1px solid rgba(0,0,0,0.12)',
	                        borderRadius: '12px',
	                        boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)',
	                        color: '#111827',
	                      }}
	                      labelStyle={{ color: '#111827', fontWeight: 600 }}
	                      itemStyle={{ color: '#374151' }}
	                    />
                    <Bar dataKey={mode === 'multi' ? 'deviation' : 'value'} radius={[0, 4, 4, 0]}>
                      {(mode === 'multi' ? benchmarkChartData : topDeviationsData).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

	              <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 200 }} className="relative bg-white/70 backdrop-blur-xl rounded-xl border border-black/[0.10] p-6 overflow-hidden hover:border-black/[0.14] transition-colors shadow-[0_30px_90px_-70px_rgba(0,0,0,0.35)]">
	                <BorderBeam size={100} duration={15} delay={7} colorFrom="#0071e3" colorTo="#5e5ce6" />
	                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2 tracking-tight">
	                  <PieChart className="w-5 h-5 text-[#0071e3]" />
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
	                    <Tooltip
	                      formatter={(v) => formatCurrency(v as number)}
	                      contentStyle={{
	                        backgroundColor: 'rgba(255,255,255,0.98)',
	                        border: '1px solid rgba(0,0,0,0.12)',
	                        borderRadius: '12px',
	                        boxShadow: '0 18px 60px -40px rgba(0,0,0,0.45)',
	                        color: '#111827',
	                      }}
	                      labelStyle={{ color: '#111827', fontWeight: 600 }}
	                      itemStyle={{ color: '#374151' }}
	                    />
                    <Legend formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                  </RechartsPie>
                </ResponsiveContainer>
              </motion.div>
            </div>
            </BlurFade>

            {/* Tabs */}
            <BlurFade delay={0.3} inView>
	            <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-black/[0.10] overflow-hidden shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
	              <BorderBeam size={200} duration={25} colorFrom="#0071e3" colorTo="#5e5ce6" />
	              <div className="flex border-b border-black/[0.08]">
	                {(['overview', 'accounts', 'costcenters', 'evidence'] as const).map(tab => (
	                  <button
	                    key={tab}
	                    onClick={() => setActiveTab(tab)}
	                    className={`flex-1 py-3.5 px-4 text-sm font-medium transition-all relative ${
	                      activeTab === tab ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
	                    }`}
	                  >
	                    {activeTab === tab && (
	                      <motion.div
	                        layoutId="activeTab"
	                        className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#0071e3] to-[#5e5ce6]"
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
	                    <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2 tracking-tight">
	                      <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#5e5ce6]" />
	                      Signifikante Abweichungen
	                    </h4>
                    {currentResult.by_account?.slice(0, 10).map((dev, idx) => (
                      <BlurFade key={idx} delay={0.03 * idx} inView>
                      <div className="space-y-2">
	                        <button
	                          onClick={() => { setSelectedDeviation(dev); setShowEvidenceModal(true); }}
	                          className="w-full flex items-center justify-between bg-white/60 hover:bg-white/80 border border-black/[0.06] hover:border-black/[0.10] rounded-xl p-4 transition-all text-left group shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
	                        >
	                          <div>
	                            <div className="flex items-center gap-2">
	                              <p className="text-gray-900 font-medium">{dev.account_name}</p>
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
	                            <Link2 className="w-4 h-4 text-[#0071e3]" />
	                          </div>
	                        </button>
                        <div className="flex gap-2 ml-4">
	                          <button
	                            onClick={() => setRootCauseDeviation(rootCauseDeviation?.account === dev.account ? null : dev)}
		                            className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
		                              rootCauseDeviation?.account === dev.account
		                                ? 'bg-[#0071e3]/10 text-[#005bb5] border border-[#0071e3]/20'
		                                : 'bg-black/[0.04] hover:bg-black/[0.06] text-gray-700 hover:text-gray-900 border border-black/[0.06]'
		                            }`}
		                          >
	                            <Search className="h-3.5 w-3.5" />
	                            Ursache
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
	                          <tr key={idx} className={`border-t border-black/[0.06] hover:bg-black/[0.02] transition-colors ${idx % 2 === 0 ? 'bg-black/[0.01]' : ''}`}>
	                            <td className="py-3.5 text-gray-500 font-mono text-xs">{acc.account}</td>
	                            <td className="py-3.5 text-gray-900">{acc.account_name}</td>
	                            <td className="py-3.5 text-right text-gray-700 tabular-nums">{formatCurrency(acc.amount_prev)}</td>
	                            <td className="py-3.5 text-right text-gray-700 tabular-nums">{formatCurrency(acc.amount_curr)}</td>
	                            <td className={`py-3.5 text-right font-semibold tabular-nums ${acc.delta_abs > 0 ? 'text-red-500' : 'text-green-600'}`}>
	                              {formatCurrency(acc.delta_abs)}
	                            </td>
	                            <td className="py-3.5 text-right">
	                              <button
	                                onClick={() => { setSelectedDeviation(acc); setShowEvidenceModal(true); }}
	                                className="p-1.5 hover:bg-[#0071e3]/10 rounded-lg transition-colors group"
	                              >
	                                <Link2 className="w-4 h-4 text-[#0071e3] group-hover:text-[#005bb5]" />
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
	                          <tr key={idx} className={`border-t border-black/[0.06] hover:bg-black/[0.02] transition-colors ${idx % 2 === 0 ? 'bg-black/[0.01]' : ''}`}>
	                            <td className="py-3.5 text-gray-900 font-medium">{cc.cost_center || '(keine)'}</td>
	                            <td className="py-3.5 text-right text-gray-400 tabular-nums">{formatCurrency(cc.amount_prev)}</td>
	                            <td className="py-3.5 text-right text-gray-700 tabular-nums">{formatCurrency(cc.amount_curr)}</td>
	                            <td className={`py-3.5 text-right font-semibold tabular-nums ${cc.delta_abs > 0 ? 'text-red-500' : 'text-green-600'}`}>
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
	                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0071e3]/16 to-[#5e5ce6]/14 animate-pulse" />
	                      <div className="relative w-full h-full rounded-2xl bg-white/70 border border-black/[0.10] flex items-center justify-center shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]">
	                        <Link2 className="w-10 h-10 text-[#0071e3]" />
	                      </div>
	                    </div>
	                    <h4 className="text-gray-900 font-semibold text-lg mb-3 tracking-tight">Evidence Trail</h4>
	                    <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
	                      Klicke auf eine Abweichung in der Übersicht oder Konten-Tabelle,
	                      um die verknüpften Buchungen bis auf Belegebene nachzuverfolgen.
	                    </p>
	                    <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
	                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500/60" /> Prüfungssicher</div>
	                      <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#0071e3]/70" /> Revisionsfest</div>
	                      <div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-[#0071e3]/70" /> Belegverknüpft</div>
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
