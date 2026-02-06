'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Shield,
  Zap,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Building2,
  Factory,
  Landmark,
  Brain,
  Lock,
  TrendingUp,
  AlertTriangle,
  Search,
  Target,
  Clock,
  Users,
} from 'lucide-react';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { Particles } from '@/components/magicui/particles';
import { BorderBeam } from '@/components/magicui/border-beam';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Meteors } from '@/components/magicui/meteors';

interface LandingPageProps {
  onStartApp: () => void;
}

const faqs = [
  {
    question: 'Wie sicher sind meine Daten?',
    answer:
      'Alle Daten bleiben 100% lokal auf Ihrem System. Keine Cloud-Synchronisation, keine externen APIs, keine Datenübertragung. Sie behalten vollständige Kontrolle.',
  },
  {
    question: 'Welche Dateiformate werden unterstützt?',
    answer:
      'Wir unterstützen CSV, Excel, SAP-Exporte und DATEV-Formate. Die Magic Upload erkennt das Format automatisch und parst die Buchungen ohne manuelles Mapping.',
  },
  {
    question: 'Brauche ich Ollama oder andere Tools?',
    answer:
      'Nein, Ollama ist optional. Die KI läuft vollständig on-premise im Container. Sie können aber Ollama integrieren, um lokale LLM-Modelle zu nutzen.',
  },
  {
    question: 'Was kostet die Lösung?',
    answer:
      'Starter ist kostenlos mit grundlegenden Features. Professional bietet vollständige KI-Analyse für 49€/Monat. Enterprise-Kunden können maßgeschneiderte Lösungen mit us besprechen.',
  },
  {
    question: 'Kann ich es on-premise installieren?',
    answer:
      'Ja! Die komplette Lösung ist Docker-ready. Sie können sie in Ihrer IT-Infrastruktur, hinter Ihrer Firewall oder auf lokalen Servern deployen.',
  },
  {
    question: 'Gibt es Support und Updates?',
    answer:
      'Ja, regelmäßige Updates und Support sind enthalten. Für Professional und Enterprise Kunden bieten wir dedizierten Support und Customization.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Kostenlos',
    period: 'Für immer',
    description: 'Perfekt zum Ausprobieren',
    features: [
      'Bis zu 5 Analysen/Monat',
      'Einzelentity-Analyse',
      'CSV-Upload',
      'Basis-Reports',
      'Community Support',
    ],
    cta: 'Kostenlos starten',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '49',
    period: '€/Monat',
    description: 'Für ernsthafte Controlling-Teams',
    features: [
      'Unbegrenzte Analysen',
      'Multi-Entity & Konzern',
      'KI-Reports (Word)',
      'Szenario-Simulation',
      'Root-Cause Analyse',
      'Email Support',
      'API-Zugang',
    ],
    cta: 'Jetzt upgraden',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Auf Anfrage',
    description: 'Für große Organisationen',
    features: [
      'Alles aus Professional',
      'Dedizierter Support',
      'Custom Integration',
      'On-Premise Deployment',
      'SLA Garantie',
      'Training & Onboarding',
      'Compliance Features',
    ],
    cta: 'Demo anfragen',
    highlighted: false,
  },
];

export default function LandingPage({ onStartApp }: LandingPageProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Particle Background */}
      <Particles
        className="fixed inset-0"
        quantity={80}
        ease={80}
        color="#22c55e"
        size={0.5}
      />

      {/* Section 1: Header/Navbar */}
      <header className="relative z-10 sticky top-0 backdrop-blur-sm bg-[#0a0a0f]/80 border-b border-white/10">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">Premium Controlling</span>
              <span className="hidden sm:block text-xs text-gray-500">KI-gestützt • 100% Lokal</span>
            </div>
          </div>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Szenario', 'Fehler', 'Forecast', 'Preise'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <ShimmerButton
            onClick={onStartApp}
            shimmerColor="#22c55e"
            shimmerSize="0.1em"
            background="linear-gradient(135deg, #166534 0%, #059669 100%)"
            className="text-sm font-semibold py-2 px-6"
          >
            <span className="flex items-center gap-2">
              Jetzt starten
              <ArrowRight className="w-4 h-4" />
            </span>
          </ShimmerButton>
        </nav>
      </header>

      {/* Section 2: Hero Section */}
      <section className="relative z-10 px-6 pt-32 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <BlurFade delay={0.1} inView>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 mb-8">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">KI-gestützt • 100% lokal</span>
            </div>
          </BlurFade>

          {/* Headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Controlling-KI</span>
              <br />
              <AnimatedGradientText className="text-5xl md:text-7xl font-bold !bg-gradient-to-r !from-green-400 !via-emerald-300 !to-green-400">
                die Ihre Daten schützt
              </AnimatedGradientText>
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.3} inView>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Automatische Abweichungsanalyse mit KI-Kommentaren – komplett on-premise.
              <br />
              <span className="text-white font-medium">Jede Aussage mit Evidence Link zur Buchung.</span>
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <ShimmerButton
                onClick={onStartApp}
                shimmerColor="#22c55e"
                shimmerSize="0.1em"
                background="linear-gradient(135deg, #166534 0%, #059669 100%)"
                className="shadow-lg shadow-green-500/25 text-lg font-semibold py-3 px-8"
              >
                <span className="flex items-center gap-3">
                  Kostenlos starten
                  <ArrowRight className="w-5 h-5" />
                </span>
              </ShimmerButton>
              <button className="px-8 py-3 border border-white/20 rounded-xl font-semibold hover:bg-white/5 transition-colors">
                Demo ansehen
              </button>
            </div>
          </BlurFade>

          {/* Stats */}
          <BlurFade delay={0.5} inView>
            <div className="flex flex-wrap justify-center gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  <NumberTicker value={100} suffix="%" />
                </div>
                <div className="text-sm text-gray-500">100% Lokal</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {'<'}<NumberTicker value={5} /> Min
                </div>
                <div className="text-sm text-gray-500">Setup Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  <NumberTicker value={50} suffix="+" />
                </div>
                <div className="text-sm text-gray-500">Gesellschaften</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">
                  <NumberTicker value={211} />
                </div>
                <div className="text-sm text-gray-500">Tests</div>
              </div>
            </div>
          </BlurFade>

          {/* Hero Image/Mockup */}
          <BlurFade delay={0.6} inView>
            <div className="mt-16 relative mx-auto max-w-3xl">
              <div className="relative rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 overflow-hidden backdrop-blur-sm">
                <BorderBeam size={150} duration={20} colorFrom="#3b82f6" colorTo="#06b6d4" />
                <div className="aspect-video bg-gradient-to-br from-gray-900/50 to-gray-800/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-gray-400">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Section 3: Logos/Trust Section */}
      <section className="relative z-10 px-6 py-16 border-y border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 mb-8">Vertraut von führenden Unternehmen</p>
          <div className="flex justify-center items-center gap-12 flex-wrap">
            {[Building2, Factory, Landmark, Users].map((Icon, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Icon className="w-8 h-8 text-gray-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Problem Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Left: Problem Description */}
          <BlurFade delay={0.1} inView>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <h2 className="text-3xl font-bold">Das Problem</h2>
              </div>
              <p className="text-gray-400 mb-6">
                Controlling in deutschen Mittelständen ist zeitintensiv und fehleranfällig. Excel-Tabellen, manuelle Analysen und keine prüfungssicheren Nachweise.
              </p>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Excel-Hölle: Tausende Zeilen, keine Struktur
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Cloud-Risiko: Fremde Server, Compliance-Probleme
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Manuelle Reports: Tage statt Minuten
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Keine KI-Hilfe: Abweichungen bleiben unerkannt
                </li>
              </ul>
            </div>
          </BlurFade>

          {/* Right: Pain Points */}
          <div className="space-y-4">
            {[
              {
                icon: AlertTriangle,
                title: 'Excel-Hölle',
                desc: 'Tausende unstrukturierte Zeilen',
                color: 'from-red-500/20 to-orange-500/20',
                border: 'border-red-500/20',
              },
              {
                icon: Lock,
                title: 'Cloud-Risiko',
                desc: 'Datensouveränität gefährdet',
                color: 'from-orange-500/20 to-yellow-500/20',
                border: 'border-orange-500/20',
              },
              {
                icon: Clock,
                title: 'Manuelle Reports',
                desc: 'Tage voller Klicks und Formeln',
                color: 'from-yellow-500/20 to-red-500/20',
                border: 'border-yellow-500/20',
              },
              {
                icon: Brain,
                title: 'Keine KI-Hilfe',
                desc: 'Anomalien und Trends bleiben unsichtbar',
                color: 'from-red-500/20 to-pink-500/20',
                border: 'border-red-500/20',
              },
            ].map((card, idx) => (
              <BlurFade key={idx} delay={0.15 + idx * 0.05} inView>
                <div
                  className={`relative p-4 rounded-xl bg-gradient-to-br ${card.color} border ${card.border} overflow-hidden`}
                >
                  <BorderBeam size={80} duration={10} colorFrom="#ef4444" colorTo="#f97316" />
                  <div className="flex items-start gap-4 relative z-10">
                    <card.icon className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">{card.title}</h4>
                      <p className="text-sm text-gray-400">{card.desc}</p>
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Solution Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <AnimatedGradientText className="!bg-gradient-to-r !from-green-400 !via-emerald-300 !to-green-400">
                Die Lösung
              </AnimatedGradientText>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Premium Controlling kombiniert lokale KI mit prüfungssicheren Evidence Links.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Lokale KI',
                desc: 'Alle Daten bleiben auf Ihrem Server. Keine Cloud, keine Abhängigkeiten.',
                color: 'from-green-500/20 to-emerald-500/20',
                borderColor: 'border-green-500/20',
              },
              {
                icon: Zap,
                title: 'Automatische Analyse',
                desc: 'Abweichungen, Trends und Anomalien werden in Sekunden identifiziert.',
                color: 'from-blue-500/20 to-cyan-500/20',
                borderColor: 'border-blue-500/20',
              },
              {
                icon: FileText,
                title: 'Ein-Klick Reports',
                desc: 'Word-Reports mit KI-Kommentaren, sofort exportierbar.',
                color: 'from-purple-500/20 to-pink-500/20',
                borderColor: 'border-purple-500/20',
              },
            ].map((solution, idx) => (
              <BlurFade key={idx} delay={0.1 * idx} inView>
                <div
                  className={`relative p-6 rounded-xl bg-gradient-to-br ${solution.color} border ${solution.borderColor} overflow-hidden group hover:border-white/30 transition-all`}
                >
                  <BorderBeam size={100} duration={12} colorFrom="#22c55e" colorTo="#3b82f6" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <solution.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3 text-white">{solution.title}</h3>
                    <p className="text-gray-400 text-sm">{solution.desc}</p>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: How It Works */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">So funktioniert's</h2>
            <p className="text-gray-400">Drei einfache Schritte zum perfekten Controlling-Report</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                icon: Upload,
                title: 'Daten hochladen',
                desc: 'CSV, DATEV oder SAP – wird automatisch erkannt',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                number: '2',
                icon: Sparkles,
                title: 'KI analysiert',
                desc: 'Abweichungen, Trends und Anomalien werden identifiziert',
                color: 'from-purple-500 to-pink-500',
              },
              {
                number: '3',
                icon: FileText,
                title: 'Report erhalten',
                desc: 'Word-Report mit KI-Kommentaren in Sekunden',
                color: 'from-green-500 to-emerald-500',
              },
            ].map((step, idx) => (
              <BlurFade key={idx} delay={0.1 * idx} inView>
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Features/Bento Grid */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-b from-transparent via-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Alles was Sie brauchen</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Large Feature 1 */}
            <BlurFade delay={0.05} inView>
              <div className="md:col-span-2 relative p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 overflow-hidden group hover:border-blue-500/40 transition-all">
                <BorderBeam size={200} duration={20} colorFrom="#3b82f6" colorTo="#06b6d4" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                    <Brain className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">KI-Monatsberichte</h3>
                  <p className="text-gray-400">Generiert automatisch vollständige Word-Reports mit KI-Analyse aller Abweichungen und Trends.</p>
                </div>
              </div>
            </BlurFade>

            {/* Large Feature 2 */}
            <BlurFade delay={0.1} inView>
              <div className="md:row-span-2 relative p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 overflow-hidden group hover:border-purple-500/40 transition-all">
                <BorderBeam size={200} duration={20} colorFrom="#a855f7" colorTo="#ec4899" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                    <TrendingUp className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">Szenario-Simulation</h3>
                  <p className="text-gray-400 mb-6">What-if Analysen mit Real-Time Ergebnissen. Schieben Sie Regler und sehen Sie sofort die Auswirkungen.</p>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300 font-mono">• Gewinn-Impact</div>
                    <div className="text-sm text-gray-300 font-mono">• Liquidität-Szenarien</div>
                    <div className="text-sm text-gray-300 font-mono">• Kosten-Variationen</div>
                  </div>
                </div>
              </div>
            </BlurFade>

            {/* Small Features Grid */}
            {[
              { icon: AlertTriangle, title: 'Buchungsfehler-Erkennung', desc: 'Smart duplicate & error detection' },
              { icon: Target, title: 'Rollierender Forecast', desc: 'Automatische yearly forecast' },
              { icon: Search, title: 'Natural Language Queries', desc: 'Frage deine Daten auf Deutsch' },
              { icon: Brain, title: 'Root-Cause Analyse', desc: 'Deep-dive warum Abweichungen' },
            ].map((feature, idx) => (
              <BlurFade key={idx} delay={0.15 + idx * 0.05} inView>
                <div className="relative p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 overflow-hidden group hover:border-white/20 transition-all">
                  <BorderBeam size={80} duration={12} colorFrom="#3b82f6" colorTo="#22c55e" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                      <feature.icon className="w-5 h-5 text-gray-300" />
                    </div>
                    <h4 className="font-semibold text-white mb-1 text-sm">{feature.title}</h4>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: Testimonial Highlight */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <BlurFade delay={0.1} inView>
            <div className="relative p-12 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 overflow-hidden">
              <BorderBeam size={200} duration={20} colorFrom="#22c55e" colorTo="#059669" />
              <div className="relative z-10 text-center">
                <div className="mb-8">
                  <svg className="w-12 h-12 text-green-400 mx-auto opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.25-2-7-2s-7 .75-7 2v8c0 7 4 8 7 8z" />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-white mb-6 leading-relaxed">
                  "Premium Controlling hat unsere Abweichungsanalyse von Tagen auf Stunden reduziert. Die Evidence Links sind für unsere Revision Gold wert."
                </p>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                    <span className="text-white font-bold">TM</span>
                  </div>
                  <p className="font-semibold text-white">Dr. Thomas Müller</p>
                  <p className="text-sm text-gray-400">CFO, mittelständisches Unternehmen</p>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Section 9: Stats Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 rounded-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: 5210, suffix: '+', label: 'Lines of Code' },
              { value: 211, suffix: '', label: 'Tests Passing' },
              { value: 5, suffix: ' Min', label: 'Setup Time' },
              { value: 100, suffix: '%', label: 'Data Privacy' },
            ].map((stat, idx) => (
              <BlurFade key={idx} delay={0.1 * idx} inView>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    <NumberTicker value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-gray-400">{stat.label}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 10: Pricing Section */}
      <section className="relative z-10 px-6 py-20" id="Preise">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Einfache Preise</h2>
            <p className="text-gray-400">Für jeden Anspruch das richtige Paket</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <BlurFade key={idx} delay={0.1 * idx} inView>
                <div
                  className={`relative p-8 rounded-2xl overflow-hidden transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 scale-105'
                      : 'bg-white/5 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.highlighted && <BorderBeam size={150} duration={15} colorFrom="#22c55e" colorTo="#059669" />}

                  <div className="relative z-10">
                    {plan.highlighted && (
                      <div className="inline-block px-3 py-1 rounded-full bg-green-500/30 text-green-400 text-xs font-medium mb-4">
                        Beliebt
                      </div>
                    )}

                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                    <div className="mb-6">
                      <span className="text-5xl font-bold text-white">{plan.price}</span>
                      {plan.period && <span className="text-gray-400 ml-2">{plan.period}</span>}
                    </div>

                    <button
                      onClick={onStartApp}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all mb-8 ${
                        plan.highlighted
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                      }`}
                    >
                      {plan.cta}
                    </button>

                    <div className="space-y-3 border-t border-white/10 pt-8">
                      {plan.features.map((feature, fidx) => (
                        <div key={fidx} className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 11: FAQ Section */}
      <section className="relative z-10 px-6 py-20 bg-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Häufige Fragen</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <BlurFade key={idx} delay={0.05 * idx} inView>
                <div className="border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="font-semibold text-white text-left">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="p-5 text-gray-400 bg-white/[0.02]">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Section 12: Final CTA */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto relative rounded-3xl p-12 bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-green-500/20 overflow-hidden">
          <Meteors number={20} />
          <div className="relative z-10 text-center">
            <h2 className="text-4xl font-bold mb-4 text-white">Bereit für smartes Controlling?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Starten Sie jetzt kostenlos. Keine Kreditkarte nötig. Ihre Daten bleiben lokal.
            </p>
            <ShimmerButton
              onClick={onStartApp}
              shimmerColor="#22c55e"
              shimmerSize="0.1em"
              background="linear-gradient(135deg, #166534 0%, #059669 100%)"
              className="shadow-lg shadow-green-500/25 text-lg font-semibold py-3 px-10"
            >
              <span className="flex items-center gap-3">
                Jetzt kostenlos starten
                <ArrowRight className="w-5 h-5" />
              </span>
            </ShimmerButton>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Keine Registrierung
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-500" />
                100% Lokal
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                Open Source
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 13: Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Ressourcen</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Dokumentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Impressum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AGB</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="mailto:info@example.com" className="hover:text-white transition-colors">support@premium-controlling.de</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter/X</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>Copyright 2024 Premium Controlling. Alle Rechte vorbehalten.</p>
            <p className="flex items-center gap-2">
              <span>Entwickelt für den deutschen Mittelstand</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
