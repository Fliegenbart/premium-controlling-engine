import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Shield,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    title: 'Import, der in der Praxis funktioniert',
    desc: 'CSV/XLSX und gängige Exporte. Magic Upload erkennt Formate und normalisiert Felder.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Abweichungen, die du sofort verstehst',
    desc: 'Konten, Kostenstellen und Treiberanalyse. Evidence bis auf Beleg-Ebene.',
    icon: BarChart3,
  },
  {
    title: 'KI-Unterstuetzung, aber lokal',
    desc: 'Kommentare und Zusammenfassungen via Ollama. Optional, ohne Datenabfluss.',
    icon: Sparkles,
  },
  {
    title: 'Produktionstaugliche Sicherheit',
    desc: 'Login, Rollen, Rate Limits, optionaler Dokumenten-Token, SQL-API standardmaessig aus.',
    icon: Shield,
  },
];

const steps = [
  {
    title: '1. Anmelden',
    desc: 'Rollenbasierter Zugriff (Admin/Controller/Viewer). Demo-User in Produktion aus.',
    icon: Lock,
  },
  {
    title: '2. Daten laden',
    desc: 'Vorjahr und aktuelles Jahr (oder Plan/Ist). Sofortige Profilierung und Plausibilitaet.',
    icon: FileSpreadsheet,
  },
  {
    title: '3. Analyse und Report',
    desc: 'Abweichungen, Root-Cause, Trends. Export als PDF/XLSX und Reports fuer das Management.',
    icon: CheckCircle2,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(45%_35%_at_85%_20%,rgba(59,130,246,0.14),transparent_55%),radial-gradient(40%_40%_at_50%_95%,rgba(20,184,166,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1220]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <BarChart3 className="h-5 w-5 text-cyan-300" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              Premium Controlling Engine
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">Workflow</a>
            <a href="#security" className="hover:text-white">Sicherheit</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#041014] hover:bg-cyan-300"
            >
              App oeffnen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
              <Shield className="h-3.5 w-3.5 text-cyan-300" />
              Lokal. Pruefbar. Schnell einsatzbereit.
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Abweichungen verstehen, ohne Excel-Pain.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-300">
              Importiere Buchungen, erkenne wesentliche Treiber und exportiere Reports fuer Review und Management.
              Alle Daten bleiben in deiner Umgebung.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-[#041014] hover:bg-cyan-300"
              >
                Zur App <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                So funktioniert es
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Hinweis: Fuer den ersten Admin setze <span className="font-mono">ADMIN_BOOTSTRAP_EMAIL</span> und{' '}
              <span className="font-mono">ADMIN_BOOTSTRAP_PASSWORD</span> (mind. 12 Zeichen) oder aktiviere Demo-User im Dev.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_120px_-80px_rgba(34,211,238,0.35)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Quickstart Workflow</p>
              <span className="text-xs text-gray-500">3 Schritte</span>
            </div>
            <div className="mt-4 space-y-3">
              {steps.map((s) => (
                <div key={s.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      <s.icon className="h-5 w-5 text-cyan-300" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <p className="mt-0.5 text-sm text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Features, die Controlling wirklich nutzt</h2>
          <p className="mt-2 text-sm text-gray-400">
            Fokus auf Klarheit, Nachvollziehbarkeit und einen Workflow, der auch unter Zeitdruck funktioniert.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.05]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <f.icon className="h-5 w-5 text-cyan-300" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Intuitive Nutzendenfuehrung</h2>
          <p className="mt-2 text-sm text-gray-400">
            Die App ist als klarer Prozess gedacht: importieren, verstehen, dokumentieren.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <s.icon className="h-5 w-5 text-cyan-300" />
                </span>
                <p className="text-sm font-semibold text-white">{s.title}</p>
              </div>
              <p className="mt-3 text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Sicherheit und Betrieb</h2>
            <p className="mt-2 text-sm text-gray-400">
              Default-secure: sensible Endpunkte sind geschuetzt, und fuer Produktion gibt es klare Schalter.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <span className="mt-0.5 text-cyan-300">•</span>
                Demo-User in Produktion deaktiviert (<span className="font-mono">ENABLE_DEMO_USERS=false</span>).
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-cyan-300">•</span>
                Bootstrap-Admin ueber <span className="font-mono">ADMIN_BOOTSTRAP_*</span> wenn User-DB leer ist.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-cyan-300">•</span>
                SQL-API ist aus; optional per <span className="font-mono">QUERY_API_ENABLED</span> + Token.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-cyan-300">•</span>
                Dokumente optional per <span className="font-mono">DOCUMENT_ACCESS_TOKEN</span> schuetzbar.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Premium Controlling Engine</p>
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-gray-300 hover:text-white">App</Link>
            <a href="#security" className="text-gray-300 hover:text-white">Security</a>
            <a href="#features" className="text-gray-300 hover:text-white">Features</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
