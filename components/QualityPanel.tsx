'use client';

import { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileWarning,
  Copy,
  Activity
} from 'lucide-react';

interface QualityIssue {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error';
  description: string;
  affectedRecords: number;
  details: Record<string, unknown>;
  suggestion?: string;
}

interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  message: string;
}

interface QualityReport {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  summary: {
    totalRecords: number;
    duplicates: number;
    gaps: number;
    outliers: number;
    missingValues: number;
    formatErrors: number;
  };
  checks: QualityCheck[];
}

export default function QualityPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);

  const runQualityCheck = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'controlling.bookings_curr' })
      });
      const data = await response.json();
      if (data.success) {
        setReport(data);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Qualitätsprüfung fehlgeschlagen');
    } finally {
      setIsRunning(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400 bg-green-500/20';
      case 'B': return 'text-blue-400 bg-blue-500/20';
      case 'C': return 'text-yellow-400 bg-yellow-500/20';
      case 'D': return 'text-orange-400 bg-orange-500/20';
      case 'F': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Datenqualität</h2>
            <p className="text-gray-500 text-sm">Duplikate, Lücken, Ausreißer erkennen</p>
          </div>
        </div>

        <button
          onClick={runQualityCheck}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          Prüfung starten
        </button>
      </div>

      {/* Results */}
      {report && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4 col-span-1">
              <p className="text-gray-500 text-sm mb-2">Qualitätsscore</p>
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold px-3 py-1 rounded-lg ${getGradeColor(report.grade)}`}>
                  {report.grade}
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{report.score}%</p>
                  <p className="text-gray-500 text-xs">von 100</p>
                </div>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Datensätze</p>
              <p className="text-2xl font-bold text-white">{report.summary.totalRecords.toLocaleString()}</p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Probleme</p>
              <p className="text-2xl font-bold text-yellow-400">{report.issues.length}</p>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <p className="text-gray-500 text-sm mb-1">Duplikate</p>
              <p className="text-2xl font-bold text-red-400">{report.summary.duplicates}</p>
            </div>
          </div>

          {/* Checks */}
          <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Prüfungen ({report.checks.filter(c => c.passed).length}/{report.checks.length} bestanden)
            </h3>
            <div className="space-y-2">
              {report.checks.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    check.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">{check.name}</p>
                      <p className="text-gray-500 text-sm">{check.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${check.score >= 80 ? 'text-green-400' : check.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {check.score}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          {report.issues.length > 0 && (
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-yellow-400" />
                Gefundene Probleme
              </h3>
              <div className="space-y-2">
                {report.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white/5 rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                      onClick={() => toggleIssue(issue.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(issue.severity)}
                        <div>
                          <p className="text-white">{issue.description}</p>
                          <p className="text-gray-500 text-xs">
                            {issue.affectedRecords} betroffene Datensätze
                          </p>
                        </div>
                      </div>
                      {expandedIssues.includes(issue.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>

                    {expandedIssues.includes(issue.id) && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-3">
                        {issue.suggestion && (
                          <p className="text-gray-400 text-sm mb-2">
                            💡 {issue.suggestion}
                          </p>
                        )}
                        <pre className="text-gray-500 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(issue.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!report && !isRunning && (
        <div className="bg-[#12121a] rounded-xl border border-white/10 p-8 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Noch keine Qualitätsprüfung durchgeführt</p>
          <p className="text-gray-500 text-sm">Laden Sie Daten hoch und starten Sie die Prüfung</p>
        </div>
      )}
    </div>
  );
}
