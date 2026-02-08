import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Link2,
  Sparkles,
  FileText,
  Wallet,
  CheckCircle2,
} from "lucide-react";

export type MarketingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const marketing = {
  productName: "Premium Controlling Engine",
  tagline: "Abweichungen verstehen. Evidence sichern. Reports exportieren.",
  hero: {
    badge: "Lokal betrieben. Review-ready.",
    title: "Controlling, das schneller zu einer belastbaren Aussage kommt.",
    subtitle:
      "Importiere Buchungen, finde die Treiber, prüfe bis auf Beleg-Ebene und exportiere Management-Reports. Ohne Datenabfluss.",
    primaryCta: { label: "App nutzen", href: "/login?next=%2Fapp" },
    secondaryCta: { label: "Features ansehen", href: "/features" },
  },
  usp: [
    { title: "Schneller Import", description: "DATEV/SAP/CSV/XLSX. Plausibilisierung und Profiling inklusive.", icon: FileSpreadsheet },
    { title: "Treiberanalyse", description: "Konten, Kostenstellen, Root Cause und Trends in einem Flow.", icon: BarChart3 },
    { title: "Evidence Trail", description: "Vom KPI bis zur Einzelbuchung und Dokumentnummer.", icon: Link2 },
    { title: "Review-ready Output", description: "Word/Excel-Export, Summary, Workflow-Status und Audit-Log.", icon: FileText },
    { title: "Sicherheit by default", description: "Login/Rollen, Rate Limits, optionale Token für Dokumente & APIs.", icon: ShieldCheck },
    { title: "KI optional", description: "Kommentare und Zusammenfassungen lokal via Ollama, wenn gewünscht.", icon: Sparkles },
  ] satisfies MarketingFeature[],
  modules: [
    { title: "Einzelanalyse", description: "Vorjahr vs. Aktuell, Abweichungen und Evidence.", icon: BarChart3 },
    { title: "Plan vs. Ist", description: "Dreifachvergleich Plan/Ist/VJ inklusive Export.", icon: FileSpreadsheet },
    { title: "Liquidität", description: "13-Wochen Forecast und Plausibilisierung aus Buchungen.", icon: Wallet },
    { title: "Abschluss", description: "Monatsabschluss-Checks, Aufgaben und Dokumentation.", icon: CheckCircle2 },
  ] satisfies MarketingFeature[],
  faq: [
    {
      q: "Welche Daten verlassen meine Umgebung?",
      a: "Standardmäßig keine. Die Anwendung läuft lokal auf deinem Server. KI-Funktionen sind optional und können lokal via Ollama betrieben werden.",
    },
    {
      q: "Welche Formate werden unterstützt?",
      a: "CSV ist der kleinste gemeinsame Nenner. Zusätzlich sind typische ERP/FiBu-Exporte (z.B. DATEV/SAP) über Import-Routinen abbildbar.",
    },
    {
      q: "Wie läuft der Review ab?",
      a: "Workflow-Status (Entwurf/Prüfung/Freigabe), Evidence-Verknüpfungen und Export (Word/Excel) sind auf Review-Workflows ausgelegt.",
    },
  ],
};

