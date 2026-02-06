'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, ChevronDown, ChevronUp, Play, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Shield, Scale, Calendar, SearchCheck, ListChecks, ShieldCheck, Sparkles, RotateCcw, Lock, MessageSquare } from 'lucide-react';
import { Booking } from '@/lib/types';
import { ClosingCheck, ClosingWorkflow, CheckCategory, CATEGORY_LABELS, getCurrentMonth, getMonthLabel } from '@/lib/closing-types';
import { createClosingWorkflow, runCheck, runAllAutomaticChecks, calculateProgress, generateClosingSummary } from '@/lib/closing-engine';
import { getClosingWorkflowByMonth, saveClosingWorkflow, updateClosingWorkflow } from '@/lib/closing-storage';
import { BorderBeam } from '@/components/magicui/border-beam';

interface MonthlyClosingDashboardProps {
  bookings: Booking[];
  prevBookings: Booking[];
}

const CATEGORY_ICON_MAP: Record<CheckCategory, React.ReactNode> = {
  abstimmung: <Scale className="w-5 h-5" />,
  abgrenzung: <Calendar className="w-5 h-5" />,
  plausibilitaet: <SearchCheck className="w-5 h-5" />,
  vollstaendigkeit: <ListChecks className="w-5 h-5" />,
  freigabe: <ShieldCheck className="w-5 h-5" />,
};

export function MonthlyClosingDashboard({ bookings, prevBookings }: MonthlyClosingDashboardProps) {
  const [workflow, setWorkflow] = useState<ClosingWorkflow | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<CheckCategory | null>('abstimmung');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());

  // Initialize workflow on mount and month change
  useEffect(() => {
    const initializeWorkflow = async () => {
      try {
        const existing = await getClosingWorkflowByMonth(month);
        if (existing) {
          setWorkflow(existing);
        } else {
          const newWorkflow = createClosingWorkflow(month);
          saveClosingWorkflow(newWorkflow);
          setWorkflow(newWorkflow);
        }
      } catch (error) {
        console.error('Error initializing workflow:', error);
      }
    };
    initializeWorkflow();
  }, [month, bookings, prevBookings]);

  // Handle running all automatic checks
  const handleRunAll = useCallback(() => {
    if (!workflow) return;

    setIsRunning(true);
    try {
      const updatedWorkflow = runAllAutomaticChecks(workflow, bookings, prevBookings);
      setWorkflow(updatedWorkflow);
      updateClosingWorkflow(updatedWorkflow.id, { checks: updatedWorkflow.checks, progress: updatedWorkflow.progress, status: updatedWorkflow.status });
    } catch (error) {
      console.error('Error running all checks:', error);
    } finally {
      setIsRunning(false);
    }
  }, [workflow, bookings, prevBookings]);

  // Handle running single check
  const handleRunSingle = useCallback((checkId: string) => {
    if (!workflow) return;

    setRunningCheckId(checkId);
    try {
      const check = workflow.checks.find(c => c.id === checkId);
      if (check) {
        const updatedCheck = runCheck(check, bookings, prevBookings);
        const updatedChecks = workflow.checks.map(c =>
          c.id === checkId ? updatedCheck : c
        );
        const progress = calculateProgress({ ...workflow, checks: updatedChecks });
        const updatedWorkflow: ClosingWorkflow = {
          ...workflow,
          checks: updatedChecks,
          progress,
          status: progress > 0 ? 'in_progress' : workflow.status,
        };
        setWorkflow(updatedWorkflow);
        updateClosingWorkflow(updatedWorkflow.id, { checks: updatedChecks, progress, status: updatedWorkflow.status });
      }
    } catch (error) {
      console.error('Error running single check:', error);
    } finally {
      setRunningCheckId(null);
    }
  }, [workflow, bookings, prevBookings]);

  // Handle approval
  const handleApprove = useCallback(async () => {
    if (!workflow) return;
    
    try {
      const updatedChecks = workflow.checks.map(check =>
        check.id === 'manual-approval'
          ? { ...check, status: 'passed' as const, result: { passed: true, score: 100, findings: approvalNotes ? [approvalNotes] : ['Freigegeben'] }, executedAt: new Date().toISOString() }
          : check
      );
      const updatedWorkflow: ClosingWorkflow = {
        ...workflow,
        checks: updatedChecks,
        status: 'approved',
        progress: 100,
        approvedAt: new Date().toISOString(),
        approvedBy: 'Controller',
        notes: approvalNotes,
      };
      setWorkflow(updatedWorkflow);
      updateClosingWorkflow(updatedWorkflow.id, { checks: updatedChecks, status: 'approved', progress: 100, approvedAt: updatedWorkflow.approvedAt, approvedBy: 'Controller', notes: approvalNotes });
    } catch (error) {
      console.error('Error approving workflow:', error);
    }
  }, [workflow, approvalNotes]);

  // Handle reset
  const handleReset = useCallback(async () => {
    if (!workflow) return;
    
    try {
      const updatedChecks = workflow.checks.map(check => ({
        ...check,
        status: 'pending' as const,
        result: undefined,
        executedAt: undefined,
      }));
      const updatedWorkflow: ClosingWorkflow = {
        ...workflow,
        checks: updatedChecks,
        status: 'open',
        progress: 0,
        approvedAt: undefined,
        approvedBy: undefined,
      };
      setWorkflow(updatedWorkflow);
      setApprovalNotes('');
      updateClosingWorkflow(updatedWorkflow.id, { checks: updatedChecks, status: 'open', progress: 0, approvedAt: undefined, approvedBy: undefined });
    } catch (error) {
      console.error('Error resetting workflow:', error);
    }
  }, [workflow]);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    if (!workflow) return { percentage: 0, checked: 0, passed: 0, warnings: 0, failed: 0, total: 12 };
    const checked = workflow.checks.filter(c => c.status !== 'pending' && c.status !== 'running').length;
    const passed = workflow.checks.filter(c => c.status === 'passed').length;
    const warnings = workflow.checks.filter(c => c.status === 'warning').length;
    const failed = workflow.checks.filter(c => c.status === 'failed').length;
    const total = workflow.checks.length;
    const percentage = Math.round((checked / total) * 100);
    return { percentage, checked, passed, warnings, failed, total };
  }, [workflow]);

  // Generate insights
  const insights = useMemo(() => {
    if (!workflow) return [];
    return generateClosingSummary(workflow);
  }, [workflow]);

  // Group checks by category
  const checksByCategory = useMemo(() => {
    if (!workflow) return { abstimmung: [], abgrenzung: [], plausibilitaet: [], vollstaendigkeit: [], freigabe: [] } as Record<CheckCategory, ClosingCheck[]>;
    const grouped: Record<CheckCategory, ClosingCheck[]> = {
      abstimmung: [],
      abgrenzung: [],
      plausibilitaet: [],
      vollstaendigkeit: [],
      freigabe: [],
    };
    workflow.checks.forEach(check => {
      if (grouped[check.category]) {
        grouped[check.category].push(check);
      }
    });
    return grouped;
  }, [workflow]);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  const statusLabel = workflow.status === 'approved' ? 'Freigegeben' : 
                     progressMetrics.percentage === 100 ? 'Abgeschlossen' : 'In Bearbeitung';
  const canApprove = progressMetrics.percentage >= 80 && progressMetrics.failed === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Monatsabschluss {workflow.monthLabel}</h2>
            <p className="text-gray-500 text-xs mt-0.5">12 Prüfungen • {statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setMonth(month === 'current' ? 'previous' : 'current')}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white transition-colors"
            >
              Vorheriger Monat
            </button>
            <button
              onClick={() => setMonth('current')}
              className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400 font-medium"
            >
              Aktueller Monat
            </button>
          </div>
          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            workflow.status === 'approved'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {statusLabel}
          </div>
          {/* Progress Ring */}
          <svg className="w-20 h-20" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="white" strokeWidth="1" opacity="0.1" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={progressMetrics.percentage < 33 ? '#ef4444' : progressMetrics.percentage < 66 ? '#f59e0b' : '#10b981'}
              strokeWidth="3"
              strokeDasharray={`${(progressMetrics.percentage / 100) * 314} 314`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="65" textAnchor="middle" className="text-lg font-bold fill-white">
              {Math.round(progressMetrics.percentage)}%
            </text>
          </svg>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Geprüft', value: progressMetrics.checked, icon: ClipboardCheck, color: 'blue' },
          { label: 'Bestanden', value: progressMetrics.passed, icon: CheckCircle2, color: 'green' },
          { label: 'Warnungen', value: progressMetrics.warnings, icon: AlertTriangle, color: 'amber' },
          { label: 'Kritisch', value: progressMetrics.failed, icon: XCircle, color: progressMetrics.failed === 0 ? 'green' : 'red' },
        ].map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-[0.08em]">{card.label}</p>
                <p className={`text-2xl font-bold mt-2 ${
                  card.color === 'blue' ? 'text-blue-400' :
                  card.color === 'green' ? 'text-green-400' :
                  card.color === 'amber' ? 'text-amber-400' : 'text-red-400'
                }`}>{card.value}</p>
              </div>
              <card.icon className={`w-8 h-8 ${
                card.color === 'blue' ? 'text-blue-400' :
                card.color === 'green' ? 'text-green-400' :
                card.color === 'amber' ? 'text-amber-400' : 'text-red-400'
              } opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-4">
        <button
          onClick={handleRunAll}
          disabled={isRunning || workflow.status === 'approved'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            isRunning || workflow.status === 'approved'
              ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/50'
          }`}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Alle Prüfungen starten
        </button>
        <button
          onClick={handleReset}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-500/20 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Zurücksetzen
        </button>
        {isRunning && (
          <div className="ml-auto flex items-center gap-2 text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Prüfungen laufen...</span>
          </div>
        )}
      </div>

      {/* Check Categories */}
      <div className="space-y-3">
        {(Object.keys(checksByCategory) as CheckCategory[]).map(category => {
          const checks = checksByCategory[category];
          const categoryPassed = checks.filter(c => c.status === 'passed').length;
          const isExpanded = expandedCategory === category;

          return (
            <motion.div
              key={category}
              className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">{CATEGORY_ICON_MAP[category]}</div>
                  <span className="text-white font-medium">{CATEGORY_LABELS[category]}</span>
                  <span className="text-gray-500 text-xs">{categoryPassed}/{checks.length} bestanden</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/[0.06] divide-y divide-white/[0.04]"
                  >
                    {checks.map(check => (
                      <div key={check.id} className="hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1">
                            {check.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />}
                            {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                            {check.status === 'failed' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                            {check.status === 'pending' && <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                            {check.status === 'running' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />}
                            <div>
                              <p className="text-sm text-white font-medium">{check.name}</p>
                              <p className="text-xs text-gray-500">{check.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {check.result && (
                              <div className="w-24">
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-gray-500">Score</span>
                                  <span className={`font-medium ${
                                    check.result.score >= 80 ? 'text-green-400' :
                                    check.result.score >= 60 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {check.result.score}/100
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${check.result.score}%` }}
                                    transition={{ duration: 0.5 }}
                                    className={`h-full rounded-full ${
                                      check.result.score >= 80 ? 'bg-green-400' :
                                      check.result.score >= 60 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                            {check.status === 'pending' && check.isAutomatic && (
                              <button
                                onClick={() => handleRunSingle(check.id)}
                                disabled={runningCheckId === check.id}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                              >
                                {runningCheckId === check.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                                Prüfen
                              </button>
                            )}
                          </div>
                        </div>
                        {check.result && check.result.findings.length > 0 && (
                          <div className="px-4 pb-3 pl-12">
                            {check.result.findings.map((finding, i) => (
                              <p key={i} className="text-xs text-gray-400 py-0.5">
                                • {finding}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-6 relative overflow-hidden"
        >
          <BorderBeam />
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">KI-Zusammenfassung</h3>
          </div>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-sm text-gray-300 flex items-start gap-3"
              >
                <span className="text-purple-400 mt-0.5">▸</span>
                <span>{insight}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Approval Section */}
      {(progressMetrics.percentage >= 80 || workflow.checks.every(c => !c.isAutomatic || c.status !== 'pending')) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
        >
          {workflow.status === 'approved' ? (
            <div className="flex items-center gap-4">
              <Lock className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-white font-semibold">Freigegeben</p>
                <p className="text-gray-500 text-sm">
                  {workflow.approvedAt && new Date(workflow.approvedAt).toLocaleDateString('de-DE')} von {workflow.approvedBy}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Abschluss freigeben</h3>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Notizen zur Freigabe (optional)..."
                className="w-full p-3 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
                rows={3}
              />
              <button
                onClick={handleApprove}
                disabled={!canApprove}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  canApprove
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                Abschluss freigeben
              </button>
              {!canApprove && (
                <p className="text-xs text-gray-500">
                  {progressMetrics.failed > 0 ? 'Bitte beheben Sie alle kritischen Fehler, bevor Sie freigeben.' : 'Führen Sie mindestens 80% der Prüfungen durch, um freizugeben.'}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
