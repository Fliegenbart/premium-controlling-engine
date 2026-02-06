'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import {
  BarChart3,
  Shield,
  Zap,
  FileText,
  CheckCircle2,
  ArrowRight,
  Brain,
  Lock,
  TrendingUp,
  AlertTriangle,
  Target,
  ChevronRight,
  AlignJustify,
  XIcon,
} from 'lucide-react';
import TextShimmer from '@/components/magicui/text-shimmer';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Particles } from '@/components/magicui/particles';
import { SphereMask } from '@/components/magicui/sphere-mask';
import Marquee from '@/components/magicui/marquee';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  onStartApp: () => void;
}

/* ───────── Pricing Data ───────── */
type Interval = 'month' | 'year';

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfekt zum Ausprobieren und für kleine Teams',
    features: [
      'Bis zu 5 Analysen/Monat',
      'Einzelentity-Analyse',
      'CSV-Upload',
      'Basis-Reports',
      'Community Support',
    ],
    monthlyPrice: 0,
    yearlyPrice: 0,
    isMostPopular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Für ernsthafte Controlling-Teams im Mittelstand',
    features: [
      'Unbegrenzte Analysen',
      'Multi-Entity & Konzern',
      'KI-Reports (Word)',
      'Szenario-Simulation',
      'Root-Cause Analyse',
      'Email Support',
    ],
    monthlyPrice: 4900,
    yearlyPrice: 49000,
    isMostPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'On-Premise Deployment für große Organisationen',
    features: [
      'Alles aus Professional',
      'Dedizierter Support',
      'Custom Integration',
      'On-Premise Deployment',
      'SLA Garantie',
      'Training & Onboarding',
      'Compliance Features',
    ],
    monthlyPrice: 14900,
    yearlyPrice: 149000,
    isMostPopular: false,
  },
];

const toHumanPrice = (price: number, decimals: number = 0) => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(price / 100);
};

/* ───────── CTA Tiles ───────── */
const tiles = [
  {
    icon: <BarChart3 className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-orange-600 via-rose-600 to-violet-600 opacity-70 blur-[20px] filter"></div>
    ),
  },
  {
    icon: <Shield className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-70 blur-[20px] filter"></div>
    ),
  },
  {
    icon: <Brain className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-green-500 via-teal-500 to-emerald-600 opacity-70 blur-[20px] filter"></div>
    ),
  },
  {
    icon: <Target className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 opacity-70 blur-[20px] filter"></div>
    ),
  },
  {
    icon: <TrendingUp className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 opacity-70 blur-[20px] filter"></div>
    ),
  },
  {
    icon: <Zap className="size-full" />,
    bg: (
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400 opacity-70 blur-[20px] filter"></div>
    ),
  },
];

const shuffleArray = (array: any[]) => {
  const arr = [...array];
  let currentIndex = arr.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
  }
  return arr;
};

/* ───────── CTA Card ───────── */
const CTACard = (card: { icon: JSX.Element; bg: JSX.Element }) => {
  const id = useId();
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        transition: { delay: Math.random() * 2, ease: 'easeOut', duration: 1 },
      });
    }
  }, [controls, inView]);

  return (
    <motion.div
      key={id}
      ref={ref}
      initial={{ opacity: 0 }}
      animate={controls}
      className={cn(
        'relative size-20 cursor-pointer overflow-hidden rounded-2xl border p-4',
        'bg-white/5 [box-shadow:0_0_0_1px_rgba(255,255,255,.05),0_2px_4px_rgba(0,0,0,.2),0_12px_24px_rgba(0,0,0,.2)]',
        'transform-gpu [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]'
      )}
    >
      {card.icon}
      {card.bg}
    </motion.div>
  );
};

/* ───────── Nav Items ───────── */
const menuItems = [
  { id: 1, label: 'Features', href: '#features' },
  { id: 2, label: 'Preise', href: '#pricing' },
  { id: 3, label: 'FAQ', href: '#faq' },
  { id: 4, label: 'Kontakt', href: '#contact' },
];

/* ───────── Footer ───────── */
const footerNavs = [
  {
    label: 'Produkt',
    items: [
      { href: '#features', name: 'Features' },
      { href: '#pricing', name: 'Preise' },
      { href: '#faq', name: 'FAQ' },
    ],
  },
  {
    label: 'Ressourcen',
    items: [
      { href: '#', name: 'Dokumentation' },
      { href: '#', name: 'API Docs' },
      { href: '#', name: 'Support' },
    ],
  },
  {
    label: 'Rechtliches',
    items: [
      { href: '#', name: 'Datenschutz' },
      { href: '#', name: 'Impressum' },
      { href: '#', name: 'AGB' },
    ],
  },
];

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export default function LandingPage({ onStartApp }: LandingPageProps) {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: '-100px' });
  const [hamburgerMenuIsOpen, setHamburgerMenuIsOpen] = useState(false);
  const [interval, setInterval] = useState<Interval>('month');
  const [randomTiles1, setRandomTiles1] = useState<typeof tiles>([]);
  const [randomTiles2, setRandomTiles2] = useState<typeof tiles>([]);
  const [randomTiles3, setRandomTiles3] = useState<typeof tiles>([]);
  const [randomTiles4, setRandomTiles4] = useState<typeof tiles>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRandomTiles1(shuffleArray(tiles));
      setRandomTiles2(shuffleArray(tiles));
      setRandomTiles3(shuffleArray(tiles));
      setRandomTiles4(shuffleArray(tiles));
    }
  }, []);

  useEffect(() => {
    const html = document.querySelector('html');
    if (html) html.classList.toggle('overflow-hidden', hamburgerMenuIsOpen);
  }, [hamburgerMenuIsOpen]);

  useEffect(() => {
    const closeNav = () => setHamburgerMenuIsOpen(false);
    window.addEventListener('orientationchange', closeNav);
    window.addEventListener('resize', closeNav);
    return () => {
      window.removeEventListener('orientationchange', closeNav);
      window.removeEventListener('resize', closeNav);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* ─── Global Particles ─── */}
      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        ease={70}
        size={0.05}
        color="#ffffff"
      />

      {/* ═══════════ HEADER ═══════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="fixed left-0 top-0 z-50 w-full px-4 border-b border-white/10 backdrop-blur-[12px]"
      >
        <div className="max-w-7xl mx-auto flex h-[3.5rem] w-full items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-md flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-one)] to-[var(--color-two)] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            Premium Controlling
          </button>

          {/* Desktop Nav */}
          <div className="ml-auto flex h-full items-center">
            <div className="hidden md:flex items-center gap-6 mr-6">
              {menuItems.map((item) => (
                <a key={item.id} href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
            <button
              onClick={onStartApp}
              className="mr-2 rounded-lg bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              App starten
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="ml-4 md:hidden"
            onClick={() => setHamburgerMenuIsOpen((o) => !o)}
          >
            <span className="sr-only">Toggle menu</span>
            {hamburgerMenuIsOpen ? <XIcon /> : <AlignJustify />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {hamburgerMenuIsOpen && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 top-0 z-50 h-screen w-full bg-[#0a0a0f]/95 backdrop-blur-[12px]"
          >
            <div className="max-w-7xl mx-auto flex h-[3.5rem] items-center justify-between px-4">
              <span className="text-md font-semibold">Premium Controlling</span>
              <button onClick={() => setHamburgerMenuIsOpen(false)}>
                <XIcon />
              </button>
            </div>
            <motion.ul
              className="flex flex-col px-6 pt-4"
              initial="initial"
              animate="open"
              variants={{ open: { transition: { staggerChildren: 0.06 } } }}
            >
              {menuItems.map((item) => (
                <motion.li
                  key={item.id}
                  variants={{
                    initial: { y: '-20px', opacity: 0 },
                    open: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
                  }}
                  className="border-b border-white/10 py-3"
                >
                  <a
                    href={item.href}
                    onClick={() => setHamburgerMenuIsOpen(false)}
                    className="text-xl text-white"
                  >
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section
        id="hero"
        className="relative mx-auto mt-32 max-w-[80rem] px-6 text-center md:px-8"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="backdrop-filter-[12px] inline-flex h-7 items-center justify-between rounded-full border border-white/10 bg-white/10 px-3 text-xs text-white transition-all ease-in hover:cursor-pointer hover:bg-white/20 group gap-1"
        >
          <TextShimmer className="inline-flex items-center justify-center">
            <span>✨ KI-Controlling für den Mittelstand</span>{' '}
            <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </TextShimmer>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="bg-gradient-to-br from-white from-30% to-white/40 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Controlling-KI die
          <br className="hidden md:block" /> Ihre Daten schützt.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mb-12 text-lg tracking-tight text-gray-400 md:text-xl text-balance"
        >
          Automatische Abweichungsanalyse mit KI-Kommentaren – komplett on-premise.
          <br className="hidden md:block" /> Jede Aussage mit Evidence Link zur Buchung.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: [0.21, 0.47, 0.32, 0.98] }}
          onClick={onStartApp}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-all ease-in-out"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Kostenlos starten</span>
          <ArrowRight className="ml-1 size-4" />
        </motion.button>

        {/* Hero Image / Dashboard Mockup */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative mt-[8rem] [perspective:2000px] after:absolute after:inset-0 after:z-50 after:[background:linear-gradient(to_top,#0a0a0f_30%,transparent)]"
        >
          <div
            className={`rounded-xl border border-white/10 bg-white/[0.01] before:absolute before:bottom-1/2 before:left-0 before:top-0 before:h-full before:w-full before:opacity-0 before:[filter:blur(180px)] before:[background-image:linear-gradient(to_bottom,var(--color-one),var(--color-one),transparent_40%)] ${
              heroInView ? 'before:animate-image-glow' : ''
            }`}
          >
            <BorderBeam
              size={200}
              duration={12}
              delay={11}
              colorFrom="var(--color-one)"
              colorTo="var(--color-two)"
            />

            {/* Dashboard Preview */}
            <div className="relative w-full rounded-[inherit] border border-white/5 overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-gray-900/80 to-gray-800/80 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-one)]/20 to-[var(--color-two)]/20 flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-white/60" />
                </div>
                <p className="text-gray-500 text-sm">Dashboard Preview</p>
                <div className="mt-6 grid grid-cols-4 gap-4 w-full max-w-lg">
                  {['Buchungen VJ', 'Aktuell', 'Abweichung', 'Konten'].map((label, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">{label}</div>
                      <div className="text-sm font-mono text-white/60">--</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ CLIENT / TRUST SECTION ═══════════ */}
      <section id="clients" className="text-center mx-auto max-w-[80rem] px-6 md:px-8">
        <div className="py-14">
          <div className="mx-auto max-w-screen-xl px-4 md:px-8">
            <h2 className="text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
              Vertraut von Controlling-Teams im DACH-Raum
            </h2>
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:gap-x-16">
                {[
                  { icon: Shield, label: '100% Lokal' },
                  { icon: Lock, label: 'DSGVO-konform' },
                  { icon: Brain, label: 'On-Premise KI' },
                  { icon: FileText, label: 'Evidence Links' },
                  { icon: Zap, label: 'Real-Time' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-500">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SPHERE MASK ═══════════ */}
      <SphereMask />

      {/* ═══════════ 4 KILLER FEATURE TILES ═══════════ */}
      <section id="features" className="mx-auto max-w-[80rem] px-6 md:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">Features</h2>
          <p className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Vier Killer-Features.
          </p>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
            Jedes einzelne löst ein echtes Problem im Controlling-Alltag.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Tile 1: KI-Monatsberichte ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/10 p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.02] min-h-[340px] flex flex-col"
          >
            <BorderBeam size={180} duration={14} colorFrom="var(--color-one)" colorTo="var(--color-two)" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-one)] to-[var(--color-two)] flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">KI-Monatsberichte</h3>
                <p className="text-xs text-gray-500">Ein Klick → fertig</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Generiert automatisch vollständige Word-Reports mit KI-Analyse aller Abweichungen, Trends und Anomalien.
            </p>
            {/* Mini Demo: Animated document lines */}
            <div className="flex-1 relative bg-white/[0.03] rounded-xl border border-white/5 p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <FileText className="w-4 h-4 text-[var(--color-one)]" />
                <span className="text-xs text-gray-500 font-mono">Monatsbericht_Jan_2025.docx</span>
              </div>
              {[
                { w: '85%', delay: 0.3, color: 'bg-white/10' },
                { w: '92%', delay: 0.5, color: 'bg-white/8' },
                { w: '65%', delay: 0.7, color: 'bg-[var(--color-one)]/20' },
                { w: '78%', delay: 0.9, color: 'bg-white/10' },
                { w: '55%', delay: 1.1, color: 'bg-white/8' },
                { w: '88%', delay: 1.3, color: 'bg-[var(--color-two)]/20' },
                { w: '70%', delay: 1.5, color: 'bg-white/10' },
              ].map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: line.delay, ease: 'easeOut' }}
                  className={`h-2 rounded-full mb-2 ${line.color}`}
                  style={{ width: line.w }}
                />
              ))}
            </div>
          </motion.div>

          {/* ── Tile 2: Buchungsfehler-Erkennung ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/10 p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.02] min-h-[340px] flex flex-col"
          >
            <BorderBeam size={180} duration={14} delay={4} colorFrom="var(--color-two)" colorTo="var(--color-three)" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-two)] to-[var(--color-three)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Buchungsfehler-Erkennung</h3>
                <p className="text-xs text-gray-500">Smart Detection</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Findet Duplikate, Rundlauf-Buchungen, Wochenend-Buchungen und verdächtige Muster automatisch.
            </p>
            {/* Mini Demo: Booking list with error highlight */}
            <div className="flex-1 relative bg-white/[0.03] rounded-xl border border-white/5 p-4 overflow-hidden">
              {[
                { text: '4711 Personalkosten', amount: '12.450,00', ok: true, delay: 0.4 },
                { text: '6300 Reisekosten', amount: '3.200,50', ok: true, delay: 0.6 },
                { text: '4711 Personalkosten', amount: '12.450,00', ok: false, delay: 0.8 },
                { text: '7100 Abschreibungen', amount: '8.900,00', ok: true, delay: 1.0 },
                { text: '6800 Sa/So Buchung', amount: '1.550,00', ok: false, delay: 1.2 },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: row.delay, ease: 'easeOut' }}
                  className={cn(
                    'flex items-center justify-between py-2 px-3 rounded-lg mb-1.5 text-xs font-mono',
                    row.ok
                      ? 'bg-white/[0.02] text-gray-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!row.ok && (
                      <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                      </motion.div>
                    )}
                    <span>{row.text}</span>
                  </div>
                  <span>{row.amount} €</span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.6 }}
                className="mt-2 text-xs text-red-400 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3" />
                2 Fehler erkannt — Duplikat & Wochenend-Buchung
              </motion.div>
            </div>
          </motion.div>

          {/* ── Tile 3: Szenario-Simulation ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/10 p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.02] min-h-[340px] flex flex-col"
          >
            <BorderBeam size={180} duration={14} delay={7} colorFrom="var(--color-three)" colorTo="var(--color-one)" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-three)] to-[var(--color-one)] flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Szenario-Simulation</h3>
                <p className="text-xs text-gray-500">What-if Analyse</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Schieben Sie Regler und sehen Sie sofort die Auswirkungen auf Gewinn, Liquidität und Kosten.
            </p>
            {/* Mini Demo: Animated sliders + bar chart */}
            <div className="flex-1 relative bg-white/[0.03] rounded-xl border border-white/5 p-4 overflow-hidden">
              {[
                { label: 'Umsatz', value: 72, color: 'bg-emerald-500', delay: 0.5 },
                { label: 'Personal', value: 45, color: 'bg-[var(--color-two)]', delay: 0.7 },
                { label: 'Material', value: 58, color: 'bg-[var(--color-one)]', delay: 0.9 },
              ].map((slider, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{slider.label}</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: slider.delay + 0.3 }}
                      className="text-white font-mono"
                    >
                      {slider.value}%
                    </motion.span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${slider.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: slider.delay, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className={`h-full rounded-full ${slider.color}`}
                    />
                  </div>
                </div>
              ))}
              {/* Impact bars */}
              <div className="flex items-end gap-2 mt-4 h-16">
                {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 1.2 + i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="flex-1 rounded-t bg-gradient-to-t from-[var(--color-three)]/40 to-[var(--color-one)]/40"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Tile 4: Rollierender Forecast ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/10 p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.02] min-h-[340px] flex flex-col"
          >
            <BorderBeam size={180} duration={14} delay={10} colorFrom="#06b6d4" colorTo="#3b82f6" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Rollierender Forecast</h3>
                <p className="text-xs text-gray-500">Automatische Prognose</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Automatische Forecasts basierend auf historischen Daten, Saisonalitäten und Trends.
            </p>
            {/* Mini Demo: Animated line chart */}
            <div className="flex-1 relative bg-white/[0.03] rounded-xl border border-white/5 p-4 overflow-hidden">
              <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 rounded inline-block" /> Ist</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 rounded inline-block border border-dashed border-blue-400" /> Forecast</span>
              </div>
              <svg viewBox="0 0 280 100" className="w-full h-auto" fill="none">
                {/* Grid lines */}
                {[25, 50, 75].map((y) => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(255,255,255,0.05)" />
                ))}
                {/* Actual data line */}
                <motion.path
                  d="M 0 70 L 35 55 L 70 60 L 105 40 L 140 45 L 175 30"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                />
                {/* Forecast line (dashed) */}
                <motion.path
                  d="M 175 30 L 210 22 L 245 18 L 280 12"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 2, ease: 'easeOut' }}
                />
                {/* Forecast area */}
                <motion.path
                  d="M 175 30 L 210 22 L 245 18 L 280 12 L 280 100 L 175 100 Z"
                  fill="url(#forecastGrad)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.3 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 2.5 }}
                />
                {/* Data points */}
                {[[0, 70], [35, 55], [70, 60], [105, 40], [140, 45], [175, 30]].map(([x, y], i) => (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#06b6d4"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.25 }}
                  />
                ))}
                <defs>
                  <linearGradient id="forecastGrad" x1="175" y1="12" x2="175" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
                {['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep'].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PRICING SECTION ═══════════ */}
      <section id="pricing" className="mx-auto max-w-screen-xl px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl text-center mb-12">
          <h4 className="text-xl font-bold tracking-tight text-white">
            Preise
          </h4>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mt-2">
            Einfache Preise für jeden.
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            Wählen Sie ein <strong className="text-white">passendes Paket</strong> mit den besten Features für Ihr Controlling-Team.
          </p>
        </div>

        {/* Interval Toggle */}
        <div className="flex w-full items-center justify-center space-x-3 mb-10">
          <button
            onClick={() => setInterval(interval === 'month' ? 'year' : 'month')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              interval === 'year' ? 'bg-white' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#0a0a0f] transition-transform ${
              interval === 'year' ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
          <span className="text-sm text-gray-400">Jährlich</span>
          <span className="inline-block whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase leading-5 tracking-wide text-black">
            2 MONATE GRATIS ✨
          </span>
        </div>

        {/* Cards */}
        <div className="mx-auto grid w-full justify-center sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pricingPlans.map((price, idx) => (
            <div
              key={price.id}
              className={cn(
                'relative flex max-w-[400px] flex-col gap-8 rounded-2xl border p-6 text-white overflow-hidden',
                {
                  'border-2 border-[var(--color-one)]': price.isMostPopular,
                  'border-white/10': !price.isMostPopular,
                }
              )}
            >
              <div className="flex items-center">
                <div className="ml-2">
                  <h2 className="text-base font-semibold leading-7">{price.name}</h2>
                  <p className="h-12 text-sm leading-5 text-gray-400">{price.description}</p>
                </div>
              </div>

              <motion.div
                key={`${price.id}-${interval}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + idx * 0.05,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="flex flex-row gap-1"
              >
                <span className="text-4xl font-bold text-white">
                  {price.monthlyPrice === 0 ? 'Kostenlos' : (
                    <>
                      {toHumanPrice(interval === 'year' ? price.yearlyPrice : price.monthlyPrice)}€
                      <span className="text-xs text-gray-400"> / {interval === 'year' ? 'Jahr' : 'Monat'}</span>
                    </>
                  )}
                </span>
              </motion.div>

              <button
                onClick={onStartApp}
                className={cn(
                  'group relative w-full gap-2 overflow-hidden rounded-lg py-3 text-base font-semibold tracking-tight transition-all duration-300',
                  price.isMostPopular
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                )}
              >
                <span className="absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 transform-gpu bg-white opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-96" />
                {price.monthlyPrice === 0 ? 'Kostenlos starten' : 'Jetzt upgraden'}
              </button>

              <hr className="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-800/0 via-neutral-500/30 to-neutral-800/0" />

              {price.features.length > 0 && (
                <ul className="flex flex-col gap-2 font-normal">
                  {price.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-3 text-xs font-medium text-white">
                      <CheckCircle2 className="h-5 w-5 shrink-0 rounded-full bg-green-500/20 text-green-400 p-[2px]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA SECTION ═══════════ */}
      <section id="cta" className="py-14">
        <div className="flex w-full flex-col items-center justify-center">
          <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
            <Marquee reverse className="-delay-[200ms] [--duration:20s]" repeat={5}>
              {randomTiles1.map((tile, idx) => (
                <CTACard key={idx} {...tile} />
              ))}
            </Marquee>
            <Marquee reverse className="[--duration:30s]" repeat={5}>
              {randomTiles2.map((tile, idx) => (
                <CTACard key={idx} {...tile} />
              ))}
            </Marquee>
            <Marquee reverse className="-delay-[200ms] [--duration:20s]" repeat={5}>
              {randomTiles3.map((tile, idx) => (
                <CTACard key={idx} {...tile} />
              ))}
            </Marquee>
            <Marquee reverse className="[--duration:30s]" repeat={5}>
              {randomTiles4.map((tile, idx) => (
                <CTACard key={idx} {...tile} />
              ))}
            </Marquee>

            {/* Center CTA Overlay */}
            <div className="absolute z-10">
              <div className="mx-auto size-24 rounded-[2rem] border border-white/10 bg-[#0a0a0f]/80 p-3 shadow-2xl backdrop-blur-md lg:size-32">
                <BarChart3 className="mx-auto size-16 text-white lg:size-24" />
              </div>
              <div className="z-10 mt-4 flex flex-col items-center text-center text-white">
                <h1 className="text-3xl font-bold lg:text-4xl">
                  Bereit für smartes Controlling?
                </h1>
                <p className="mt-2 text-gray-400">
                  Starten Sie jetzt kostenlos. Keine Kreditkarte nötig.
                </p>
                <button
                  onClick={onStartApp}
                  className="group mt-4 inline-flex items-center gap-2 rounded-[2rem] border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all"
                >
                  Jetzt starten
                  <ChevronRight className="ml-1 size-4 transition-all duration-300 ease-out group-hover:translate-x-1" />
                </button>
              </div>
              <div className="absolute inset-0 -z-10 rounded-full bg-[#0a0a0f] opacity-40 blur-xl" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent to-[#0a0a0f] to-70%" />
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer id="contact">
        <div className="mx-auto w-full max-w-screen-xl xl:pb-2">
          <div className="md:flex md:justify-between px-8 p-4 py-16 sm:pb-16 gap-4">
            <div className="mb-12 flex-col flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-one)] to-[var(--color-two)] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="text-2xl font-semibold text-white">
                  Premium Controlling
                </span>
              </div>
              <p className="max-w-xs text-gray-400 text-sm">KI-Controlling-Suite für den deutschen Mittelstand</p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:gap-10 sm:grid-cols-3">
              {footerNavs.map((nav) => (
                <div key={nav.label}>
                  <h2 className="mb-6 text-sm tracking-tighter font-medium text-white uppercase">
                    {nav.label}
                  </h2>
                  <ul className="gap-2 grid">
                    {nav.items.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          className="cursor-pointer text-gray-400 hover:text-gray-200 duration-200 font-[450] text-sm"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border-t border-white/10 py-4 px-8 gap-2">
            <span className="text-sm text-gray-500">
              Copyright © {new Date().getFullYear()}{' '}
              <span className="cursor-pointer">Premium Controlling</span>. Alle Rechte vorbehalten.
            </span>
            <span className="text-sm text-gray-500">
              Entwickelt für den deutschen Mittelstand
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
