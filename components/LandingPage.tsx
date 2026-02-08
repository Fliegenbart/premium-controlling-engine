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

import { BlurFade } from '@/components/magicui/blur-fade';
import { BorderBeam } from '@/components/magicui/border-beam';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import Marquee from '@/components/magicui/marquee';
import { Particles } from '@/components/magicui/particles';
import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';

const steps = [
  {
    title: '1. Anmelden',
    desc: 'Rollenbasierter Zugriff (Admin/Controller/Viewer). Demo-User in Produktion aus.',
    icon: Lock,
  },
  {
    title: '2. Daten laden',
    desc: 'Vorjahr und aktuelles Jahr (oder Plan/Ist). Sofortige Profilierung und Plausibilität.',
    icon: FileSpreadsheet,
  },
  {
    title: '3. Analyse und Report',
    desc: 'Abweichungen, Root-Cause, Trends. Export als PDF/XLSX und Reports für das Management.',
    icon: CheckCircle2,
  },
];

export default function LandingPage() {
  const chips = [
    'DATEV',
    'SAP',
    'Lexware',
    'CSV',
    'XLSX',
    'Buchungsstapel',
    'Kostenstellen',
    'Kontenrahmen',
    'Plan/Ist',
    'Vorjahr',
    'Evidence',
    'Word/Excel Export',
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-gray-900">
      <div className="pointer-events-none fixed inset-0 -z-10 mesh-gradient noise-overlay" />

      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] ring-1 ring-black/[0.06]">
              <BarChart3 className="h-5 w-5 text-[#0071e3]" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-gray-900">
              Premium Controlling Engine
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#how" className="hover:text-gray-900">Workflow</a>
            <a href="#security" className="hover:text-gray-900">Sicherheit</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(0,113,227,0.35)] hover:bg-[#0077ed] active:translate-y-px transition"
            >
              App öffnen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="max-w-xl">
            <BlurFade>
              <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-gray-700">
                <Shield className="h-3.5 w-3.5 text-[#0071e3]" />
                Lokal. Prüfbar. Schnell einsatzbereit.
              </p>
            </BlurFade>

            <BlurFade delay={0.06}>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-900 md:text-6xl">
                <AnimatedGradientText className="font-semibold">
                  Abweichungen
                </AnimatedGradientText>{' '}
                verstehen, ohne Excel-Pain.
              </h1>
            </BlurFade>

            <BlurFade delay={0.12}>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Importiere Buchungen, erkenne wesentliche Treiber und exportiere Reports für Review und Management.
                Alle Daten bleiben in deiner Umgebung.
              </p>
            </BlurFade>

            <BlurFade delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_-22px_rgba(0,113,227,0.35)] hover:bg-[#0077ed] active:translate-y-px transition"
                >
                  Zur App <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-white transition"
                >
                  So funktioniert es
                </a>
              </div>
            </BlurFade>

            <BlurFade delay={0.24}>
              <p className="mt-5 text-xs text-gray-500">
                Hinweis: Für den ersten Admin setze <span className="font-mono">ADMIN_BOOTSTRAP_EMAIL</span> und{' '}
                <span className="font-mono">ADMIN_BOOTSTRAP_PASSWORD</span> (mind. 12 Zeichen) oder aktiviere Demo-User im Dev.
              </p>
            </BlurFade>
          </div>

          <BlurFade delay={0.08}>
            <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.18)]">
              <Particles className="absolute inset-0 opacity-[0.28]" quantity={70} staticity={55} ease={70} color="#0071e3" />
              <BorderBeam size={160} duration={18} colorFrom="#0071e3" colorTo="#5e5ce6" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 tracking-tight">Quickstart Workflow</p>
                  <span className="text-xs text-gray-500">3 Schritte</span>
                </div>
                <div className="mt-5 space-y-3">
                  {steps.map((s, idx) => (
                    <BlurFade key={s.title} delay={0.06 + idx * 0.04}>
                      <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-black/10">
                            <s.icon className="h-5 w-5 text-[#0071e3]" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
                          </div>
                        </div>
                      </div>
                    </BlurFade>
                  ))}
                </div>
              </div>
            </div>
          </BlurFade>
        </div>

        <div className="mt-10">
          <Marquee pauseOnHover className="[--duration:36s] [--gap:0.75rem]">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {c}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
            Features, die Controlling wirklich nutzt
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Fokus auf Klarheit, Nachvollziehbarkeit und einen Workflow, der auch unter Zeitdruck funktioniert.
          </p>
        </div>

        <BentoGrid>
          <BentoCard
            Icon={FileSpreadsheet}
            name="Import, der in der Praxis funktioniert"
            description="CSV/XLSX und gängige Exporte. Magic Upload erkennt Formate und normalisiert Felder."
            tag="Magic Upload"
            cta="Zur App"
            href="/app"
            className="md:col-span-2"
	            background={
	              <div className="absolute inset-0 opacity-80">
	                <Marquee pauseOnHover className="absolute bottom-6 left-0 right-0 [--duration:28s] [--gap:0.6rem]">
	                  {['DATEV', 'SAP', 'CSV', 'XLSX', 'BWA', 'Konten', 'KST', 'Plan/Ist', 'VJ'].map((c) => (
	                    <span key={c} className="rounded-full border border-black/[0.10] bg-white/70 px-3 py-1 text-[11px] font-semibold text-gray-700 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.22)]">
	                      {c}
	                    </span>
	                  ))}
	                </Marquee>
	                <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
	              </div>
	            }
	          />

          <BentoCard
            Icon={BarChart3}
            name="Abweichungen, die sofort Sinn ergeben"
            description="Konten, Kostenstellen und Treiberanalyse. Evidence bis auf Beleg-Ebene."
            tag="Evidence"
            cta="Analyse starten"
            href="/app"
            className="md:col-span-1"
	            background={
	              <div className="absolute inset-0 opacity-80">
	                <svg viewBox="0 0 300 180" className="absolute -bottom-6 -right-6 h-44 w-72 opacity-70">
	                  <path d="M20 140 L60 120 L100 132 L140 90 L180 96 L220 70 L260 78" fill="none" stroke="rgba(0,113,227,0.55)" strokeWidth="3" strokeLinecap="round" />
	                  <path d="M20 150 L60 142 L100 150 L140 118 L180 120 L220 105 L260 110" fill="none" stroke="rgba(94,92,230,0.40)" strokeWidth="2" strokeLinecap="round" />
	                </svg>
	                <div className="absolute inset-0 bg-gradient-to-br from-[#0071e3]/10 via-transparent to-[#5e5ce6]/10" />
	              </div>
	            }
	          />

          <BentoCard
            Icon={Sparkles}
            name="KI-Unterstützung, aber lokal"
            description="Kommentare, Root-Cause und Zusammenfassungen via Ollama. Optional, ohne Datenabfluss."
            tag="Optional"
            cta="KI-Tools ansehen"
            href="/app"
            className="md:col-span-1"
	            background={
	              <div className="absolute inset-0 opacity-80">
	                <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_20%,rgba(0,113,227,0.14),transparent_55%),radial-gradient(600px_circle_at_80%_30%,rgba(94,92,230,0.12),transparent_55%)]" />
	                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
	              </div>
	            }
	          />

          <BentoCard
            Icon={Shield}
            name="Produktionstaugliche Sicherheit"
            description="Login, Rollen, Rate Limits, optionaler Dokumenten-Token, SQL-API standardmäßig aus."
            tag="Default-secure"
            cta="Betrieb & Security"
            href="#security"
            className="md:col-span-2"
	            background={
	              <div className="absolute inset-0 opacity-80">
	                <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
	                <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full bg-[#5e5ce6]/10 blur-3xl" />
	                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-[#5e5ce6]/10" />
	              </div>
	            }
	          />
        </BentoGrid>
      </section>

	      <section id="how" className="mx-auto max-w-7xl px-6 py-14">
	        <div className="mb-8">
	          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Intuitive Nutzendenführung</h2>
	          <p className="mt-2 text-sm text-gray-600">
	            Die App ist als klarer Prozess gedacht: importieren, verstehen, dokumentieren.
	          </p>
	        </div>

        <div className="grid gap-4 md:grid-cols-3">
	          {steps.map((s) => (
	            <div key={s.title} className="rounded-2xl border border-black/[0.10] bg-white/70 backdrop-blur-xl p-5 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
	              <div className="flex items-center gap-3">
	                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] ring-1 ring-black/[0.08]">
	                  <s.icon className="h-5 w-5 text-[#0071e3]" />
	                </span>
	                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
	              </div>
	              <p className="mt-3 text-sm text-gray-600">{s.desc}</p>
	            </div>
	          ))}
	        </div>
	      </section>

	      <section id="security" className="mx-auto max-w-7xl px-6 py-14">
	        <div className="grid gap-8 md:grid-cols-2 md:items-start">
	          <div>
	            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Sicherheit und Betrieb</h2>
	            <p className="mt-2 text-sm text-gray-600">
	              Default-secure: sensible Endpunkte sind geschützt, und für Produktion gibt es klare Schalter.
	            </p>
	          </div>
	          <div className="rounded-2xl border border-black/[0.10] bg-white/70 backdrop-blur-xl p-5 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
	            <ul className="space-y-3 text-sm text-gray-700">
	              <li className="flex gap-2">
	                <span className="mt-0.5 text-[#0071e3]">•</span>
	                Demo-User in Produktion deaktiviert (<span className="font-mono">ENABLE_DEMO_USERS=false</span>).
	              </li>
	              <li className="flex gap-2">
	                <span className="mt-0.5 text-[#0071e3]">•</span>
	                Bootstrap-Admin über <span className="font-mono">ADMIN_BOOTSTRAP_*</span> wenn User-DB leer ist.
	              </li>
	              <li className="flex gap-2">
	                <span className="mt-0.5 text-[#0071e3]">•</span>
	                SQL-API ist aus; optional per <span className="font-mono">QUERY_API_ENABLED</span> + Token.
	              </li>
	              <li className="flex gap-2">
	                <span className="mt-0.5 text-[#0071e3]">•</span>
	                Dokumente optional per <span className="font-mono">DOCUMENT_ACCESS_TOKEN</span> schützbar.
	              </li>
	            </ul>
	          </div>
	        </div>
	      </section>

	      <footer className="border-t border-black/[0.08] bg-white/50">
	        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
	          <p>© {new Date().getFullYear()} Premium Controlling Engine</p>
	          <div className="flex items-center gap-6">
	            <Link href="/app" className="text-gray-700 hover:text-gray-900">App</Link>
	            <a href="#security" className="text-gray-700 hover:text-gray-900">Security</a>
	            <a href="#features" className="text-gray-700 hover:text-gray-900">Features</a>
	          </div>
	        </div>
	      </footer>
    </main>
  );
}
