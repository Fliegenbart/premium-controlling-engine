/**
 * Monatsabschluss-Workflow — Geführter Abschlussprozess
 * Types für Checklisten, Prüfungen und Freigabe
 */

// ============================================
// Check Status & Categories
// ============================================

export type CheckStatus = 'pending' | 'running' | 'passed' | 'warning' | 'failed' | 'skipped';

export type CheckCategory = 'abstimmung' | 'abgrenzung' | 'plausibilitaet' | 'vollstaendigkeit' | 'freigabe';

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  abstimmung: 'Abstimmung',
  abgrenzung: 'Abgrenzung',
  plausibilitaet: 'Plausibilität',
  vollstaendigkeit: 'Vollständigkeit',
  freigabe: 'Freigabe',
};

export const CATEGORY_ICONS: Record<CheckCategory, string> = {
  abstimmung: 'Scale',
  abgrenzung: 'Calendar',
  plausibilitaet: 'SearchCheck',
  vollstaendigkeit: 'ListChecks',
  freigabe: 'ShieldCheck',
};

// ============================================
// Closing Check
// ============================================

export interface CheckResult {
  passed: boolean;
  score: number;              // 0-100
  findings: string[];         // Was wurde gefunden (deutsch)
  details?: Record<string, unknown>;
}

export interface ClosingCheck {
  id: string;
  name: string;               // "Kontenabstimmung"
  description: string;        // Erklärung was geprüft wird
  category: CheckCategory;
  status: CheckStatus;
  severity: 'info' | 'warning' | 'critical';
  isAutomatic: boolean;       // true = Engine prüft, false = manuell
  result?: CheckResult;
  executedAt?: string;
}

// ============================================
// Closing Workflow
// ============================================

export type WorkflowClosingStatus = 'open' | 'in_progress' | 'review' | 'approved';

export interface ClosingWorkflow {
  id: string;
  month: string;              // "2024-12"
  monthLabel: string;         // "Dezember 2024"
  status: WorkflowClosingStatus;
  progress: number;           // 0-100%
  checks: ClosingCheck[];
  startedAt: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes: string;
}

// ============================================
// Default Check Definitions
// ============================================

export const DEFAULT_CHECKS: Omit<ClosingCheck, 'status' | 'result' | 'executedAt'>[] = [
  // Abstimmung
  {
    id: 'bank-reconciliation',
    name: 'Kontenabstimmung',
    description: 'Prüft ob Bankkonten-Salden (1200-1299) plausibel sind und keine negativen Bestände aufweisen.',
    category: 'abstimmung',
    severity: 'critical',
    isAutomatic: true,
  },
  {
    id: 'debtor-reconciliation',
    name: 'Debitoren-Abstimmung',
    description: 'Vergleicht Forderungen (1400-1499) mit Erlösen — stimmen die Verhältnisse?',
    category: 'abstimmung',
    severity: 'warning',
    isAutomatic: true,
  },
  {
    id: 'creditor-reconciliation',
    name: 'Kreditoren-Abstimmung',
    description: 'Vergleicht Verbindlichkeiten (3300-3399) mit Aufwendungen — Ratio-Check.',
    category: 'abstimmung',
    severity: 'warning',
    isAutomatic: true,
  },
  // Abgrenzung
  {
    id: 'provisions-booked',
    name: 'Rückstellungen gebucht?',
    description: 'Prüft ob Rückstellungskonten (3000-3099) Buchungen haben und vergleicht mit Vorperiode.',
    category: 'abgrenzung',
    severity: 'critical',
    isAutomatic: true,
  },
  {
    id: 'period-accruals',
    name: 'Periodenabgrenzung',
    description: 'Erkennt Buchungen mit Datumsbezug außerhalb der aktuellen Periode (Cross-Period).',
    category: 'abgrenzung',
    severity: 'warning',
    isAutomatic: true,
  },
  {
    id: 'recurring-costs-complete',
    name: 'Wiederkehrende Kosten vollständig',
    description: 'Prüft ob Miete, Gehälter, Versicherungen etc. in beiden Perioden gebucht sind.',
    category: 'abgrenzung',
    severity: 'critical',
    isAutomatic: true,
  },
  // Plausibilität
  {
    id: 'error-scan',
    name: 'Buchungsfehler-Scan',
    description: 'Automatische Erkennung von Dubletten, falscher Kontierung und Auffälligkeiten.',
    category: 'plausibilitaet',
    severity: 'critical',
    isAutomatic: true,
  },
  {
    id: 'unusual-bookings',
    name: 'Ungewöhnliche Einzelbuchungen',
    description: 'Findet Buchungen die >3x Standardabweichung vom Konto-Durchschnitt abweichen.',
    category: 'plausibilitaet',
    severity: 'warning',
    isAutomatic: true,
  },
  {
    id: 'reversal-check',
    name: 'Storno-Check',
    description: 'Prüft auf auffällig viele Stornos, Korrekturen oder Gutschriften.',
    category: 'plausibilitaet',
    severity: 'info',
    isAutomatic: true,
  },
  // Vollständigkeit
  {
    id: 'all-accounts-active',
    name: 'Alle Konten bebucht',
    description: 'Vergleicht mit Vorperiode: fehlen Konten die normalerweise Umsätze haben?',
    category: 'vollstaendigkeit',
    severity: 'warning',
    isAutomatic: true,
  },
  {
    id: 'volume-plausible',
    name: 'Buchungsvolumen plausibel',
    description: 'Ist Anzahl und Summe der Buchungen im erwarteten Rahmen (+/- 30%)?',
    category: 'vollstaendigkeit',
    severity: 'info',
    isAutomatic: true,
  },
  // Freigabe (manuell)
  {
    id: 'manual-approval',
    name: 'Manuelle Freigabe',
    description: 'Controller gibt Notiz ein und bestätigt den Monatsabschluss als geprüft.',
    category: 'freigabe',
    severity: 'critical',
    isAutomatic: false,
  },
];

// ============================================
// Month helpers
// ============================================

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function getMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[monthIdx] || m} ${year}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
