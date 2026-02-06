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
  Sparkles,
  ClipboardCheck,
  CheckCircle,
  Clock,
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
    <main className="min-h-screen bg-[#080b16] mesh-gradient noise-overlay text-white overflow-hidden relative">
      {/* ─── Global Particles ─── */}
      <Particles
        className="absolute inset-0 -z-10"
        quantity={15}
        ease={70}
        size={0.4}
        color="#6b7280"
      />

      {/* ─── Animated Gradient Orbs ─── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.07] blur-[120px] animate-float-orb" />
        <div className="absolute top-[60%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.06] blur-[100px] animate-float-orb-2" />
        <div className="absolute top-[30%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-500/[0.05] blur-[80px] animate-float-orb" style={{ animationDelay: '-7s' }} />
      </div>

      {/* ═══════════ HEADER ═══════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="fixed left-0 top-0 z-50 w-full px-4 border-b border-white/[0.04] backdrop-blur-2xl bg-[#080b16]/60"
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
            className="fixed left-0 top-0 z-50 h-screen w-full bg-[#080b16]/95 backdrop-blur-[12px]"
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
          className="bg-gradient-to-br from-white via-gray-200 to-white/40 bg-clip-text py-6 text-5xl font-semibold leading-none tracking-tight text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Controlling-KI die
          <br className="hidden md:block" /> Ihre Daten schützt.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mb-12 text-lg tracking-tight text-gray-300 md:text-xl text-balance"
        >
          DATEV, SAP, BMD, Lexware — egal welches System, wir analysieren es.
          <br className="hidden md:block" /> 13-Wochen Liquiditätsplanung, KI-Abweichungskommentare & 100% on-premise.
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

        {/* Hero Image — Bento Grid Tool Preview */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative mt-[8rem] [perspective:2000px]"
        >
          <div
            className={`relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-1 before:absolute before:bottom-1/2 before:left-0 before:top-0 before:h-full before:w-full before:opacity-0 before:[filter:blur(180px)] before:[background-image:linear-gradient(to_bottom,var(--color-one),var(--color-one),transparent_40%)] ${
              heroInView ? 'before:animate-image-glow' : ''
            }`}
          >
            <BorderBeam
              size={250}
              duration={12}
              delay={11}
              colorFrom="var(--color-one)"
              colorTo="var(--color-two)"
            />

            {/* Bento Grid */}
            <div className="grid grid-cols-6 grid-rows-3 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-[#0c0f1a]/80">

              {/* ── Top-Left: Liquiditäts-Chart (3 cols, 2 rows) ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 1.5 }}
                className="col-span-4 row-span-2 rounded-xl bg-gradient-to-br from-blue-500/[0.08] to-cyan-500/[0.04] border border-blue-500/[0.12] p-3 sm:p-4 overflow-hidden relative"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-white/80">13-Wochen Liquiditätsplanung</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-blue-500/20 text-blue-400 font-medium">LIVE</span>
                </div>
                {/* Animated Area Chart */}
                <svg viewBox="0 0 400 140" className="w-full h-auto" preserveAspectRatio="none">
                  {/* Grid */}
                  {[35, 70, 105].map(y => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" />
                  ))}
                  {/* Confidence band */}
                  <motion.path
                    d="M0,30 C40,28 80,35 120,45 C160,55 200,50 240,65 C280,75 320,72 360,68 L400,65 L400,120 L360,108 L320,112 L280,115 L240,105 L200,90 L160,95 L120,85 L80,75 L40,68 L0,70 Z"
                    fill="url(#heroConfBand)"
                    initial={{ opacity: 0 }}
                    animate={heroInView ? { opacity: 0.4 } : {}}
                    transition={{ duration: 1.5, delay: 2 }}
                  />
                  {/* Inflow bars */}
                  {[20, 70, 120, 170, 220, 270, 320, 370].map((x, i) => (
                    <motion.rect
                      key={`bar-${i}`}
                      x={x}
                      y={125 - [18, 14, 20, 12, 22, 16, 18, 14][i]}
                      width="22"
                      height={[18, 14, 20, 12, 22, 16, 18, 14][i]}
                      rx="3"
                      fill={i < 4 ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.12)'}
                      initial={{ scaleY: 0 }}
                      animate={heroInView ? { scaleY: 1 } : {}}
                      transition={{ duration: 0.5, delay: 1.8 + i * 0.08 }}
                      style={{ transformOrigin: `${x + 11}px 125px` }}
                    />
                  ))}
                  {/* Main balance line */}
                  <motion.path
                    d="M0,50 C40,48 80,55 120,65 C160,72 200,68 240,82 C280,90 320,88 360,85 L400,82"
                    fill="none"
                    stroke="url(#heroLineGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={heroInView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 2, delay: 1.8, ease: 'easeOut' }}
                  />
                  {/* Threshold line */}
                  <line x1="0" y1="95" x2="400" y2="95" stroke="#ef4444" strokeWidth="1" strokeDasharray="8 6" opacity="0.4" />
                  <text x="6" y="92" fill="#ef4444" fontSize="8" opacity="0.5">Schwelle</text>
                  {/* Pulsing alert dot */}
                  <motion.circle
                    cx="280"
                    cy="90"
                    r="5"
                    fill="#ef4444"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={heroInView ? { opacity: [0, 1, 0.5, 1], scale: [0, 1.6, 1, 1.3] } : {}}
                    transition={{ duration: 2.5, delay: 3.2, repeat: Infinity, repeatDelay: 3 }}
                  />
                  <defs>
                    <linearGradient id="heroConfBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#3b82f6" stopOpacity="0.15" />
                      <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="heroLineGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#3b82f6" />
                      <stop offset="0.5" stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex justify-between mt-1 px-1">
                  {['KW 1', 'KW 3', 'KW 5', 'KW 7', 'KW 9', 'KW 11', 'KW 13'].map(kw => (
                    <span key={kw} className="text-[7px] sm:text-[8px] text-gray-600">{kw}</span>
                  ))}
                </div>
              </motion.div>

              {/* ── Top-Right: KPI Cards Stack (2 cols, 2 rows) ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 1.7 }}
                className="col-span-2 row-span-2 flex flex-col gap-1.5 sm:gap-2"
              >
                {[
                  { label: 'Kontostand', value: '847.293 €', color: 'text-white', icon: '💰', bg: 'from-white/[0.04] to-white/[0.02]', border: 'border-white/[0.06]' },
                  { label: 'Burn Rate', value: '-42.100 €/W', color: 'text-red-400', icon: '🔥', bg: 'from-red-500/[0.06] to-red-500/[0.02]', border: 'border-red-500/[0.1]' },
                  { label: 'Reichweite', value: '18 Wochen', color: 'text-emerald-400', icon: '📊', bg: 'from-emerald-500/[0.06] to-emerald-500/[0.02]', border: 'border-emerald-500/[0.1]' },
                  { label: 'Prüfungen', value: '10/12 ✓', color: 'text-green-400', icon: '✅', bg: 'from-green-500/[0.06] to-green-500/[0.02]', border: 'border-green-500/[0.1]' },
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={heroInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 2.0 + i * 0.15 }}
                    className={`flex-1 rounded-lg bg-gradient-to-br ${kpi.bg} border ${kpi.border} p-2 sm:p-2.5 flex items-center gap-2`}
                  >
                    <span className="text-sm sm:text-base">{kpi.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[9px] text-gray-500 truncate">{kpi.label}</div>
                      <div className={`text-[10px] sm:text-xs font-bold font-mono ${kpi.color} truncate`}>{kpi.value}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* ── Bottom-Left: KI-Kommentar (3 cols, 1 row) ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 2.2 }}
                className="col-span-3 rounded-xl bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.03] border border-amber-500/[0.12] p-3 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-amber-400/80">KI-Abweichungskommentar</span>
                </div>
                <motion.p
                  className="text-[8px] sm:text-[10px] text-gray-400 leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={heroInView ? { opacity: 1 } : {}}
                  transition={{ duration: 1, delay: 2.8 }}
                >
                  &quot;Personalkosten +12,3% durch 3 Neueinstellungen IT (Mär-Apr) + Tariferhöhung 3,2%.
                  Größter Einzelposten: Dev-Team 45.200€.&quot;
                </motion.p>
                <div className="flex gap-2 mt-1.5">
                  {['Strukturell', '85% Konfidenz'].map((tag, i) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 3.2 + i * 0.15 }}
                      className="px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] bg-amber-500/10 text-amber-400/70 border border-amber-500/10"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* ── Bottom-Right: Fehler-Scanner (3 cols, 1 row) ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 2.4 }}
                className="col-span-3 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] p-3 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                    <span className="text-[9px] sm:text-[10px] font-semibold text-white/70">Buchungsfehler-Scan</span>
                  </div>
                  <span className="text-[8px] text-green-400">2 gefunden</span>
                </div>
                <div className="space-y-1">
                  {[
                    { text: '4711 Personalkosten — Duplikat', ok: false },
                    { text: '6800 IT-Kosten — Sa/So', ok: false },
                    { text: '3842 Buchungen geprüft', ok: true },
                  ].map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={heroInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.3, delay: 2.8 + i * 0.12 }}
                      className={`flex items-center gap-1.5 text-[8px] sm:text-[9px] px-2 py-1 rounded ${
                        row.ok ? 'text-green-400/70' : 'text-rose-400/80 bg-rose-500/[0.06]'
                      }`}
                    >
                      {row.ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                      <span>{row.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Fade overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#080b16] to-transparent pointer-events-none" />
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

      {/* ═══════════ INTEGRATIONEN / DATENVIELFALT ═══════════ */}
      <section id="integrations" className="mx-auto max-w-[80rem] px-6 md:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center mb-14"
        >
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-[0.08em] mb-3">Integrationen</h4>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            Ihre Daten. Jedes Format.
          </h2>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
            Egal ob DATEV, SAP, BMD oder einfaches CSV — unser Magic-Upload erkennt das Format automatisch und startet die Analyse sofort.
          </p>
        </motion.div>

        {/* Integration Logos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { name: 'DATEV', sub: 'Kanzlei-Rechnungswesen', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/20', text: 'text-green-400' },
            { name: 'SAP', sub: 'FI / CO Export', color: 'from-blue-500/20 to-sky-500/20', border: 'border-blue-500/20', text: 'text-blue-400' },
            { name: 'BMD', sub: 'NTCS Export', color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/20', text: 'text-purple-400' },
            { name: 'Addison', sub: 'Wolters Kluwer', color: 'from-orange-500/20 to-amber-500/20', border: 'border-orange-500/20', text: 'text-orange-400' },
            { name: 'Lexware', sub: 'buchhaltung', color: 'from-cyan-500/20 to-teal-500/20', border: 'border-cyan-500/20', text: 'text-cyan-400' },
            { name: 'Agenda', sub: 'Finanzbuchhaltung', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/20', text: 'text-pink-400' },
            { name: 'CSV', sub: 'Universalformat', color: 'from-gray-400/20 to-gray-500/20', border: 'border-gray-400/20', text: 'text-gray-300' },
            { name: 'Excel', sub: '.xlsx / .xls', color: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/20', text: 'text-emerald-400' },
          ].map((integration, idx) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
              whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
              className={`relative bg-gradient-to-br ${integration.color} rounded-xl border ${integration.border} p-5 text-center backdrop-blur-xl group cursor-default`}
            >
              <div className={`text-2xl font-bold ${integration.text} tracking-tight mb-1`}>{integration.name}</div>
              <div className="text-[11px] text-gray-500 tracking-wide">{integration.sub}</div>
              <div className="absolute inset-0 rounded-xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>

        {/* Auto-detect badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-2.5">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">Magic Upload — Format wird <strong className="text-white">automatisch erkannt</strong></span>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ SPHERE MASK ═══════════ */}
      <SphereMask />

      {/* ═══════════ 4 KILLER FEATURE TILES ═══════════ */}
      <section id="features" className="mx-auto max-w-[80rem] px-6 md:px-8 py-20">
        <div className="text-center mb-16">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-[0.08em] mb-3">KI-Features</h4>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            Was kein anderes Tool kann.
          </h2>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
            Fünf KI-Features die echte Controlling-Probleme lösen — nicht nur Dashboards, sondern Antworten.
          </p>
        </div>

        {/* ── NEW: 13-Wochen Liquiditätsplanung Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent rounded-2xl border border-blue-500/20 p-8 mb-8 overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start gap-8">
            {/* Left: Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-semibold text-white tracking-tight">13-Wochen Liquiditätsplanung</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-semibold uppercase tracking-wider">NEU</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
                Automatische Cashflow-Prognose aus Ihren Buchungsdaten. Wiederkehrende Zahlungen werden erkannt,
                Engpässe vorhergesagt und Konfidenzintervalle berechnet — Woche für Woche, 13 Wochen voraus.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {['Wiederkehrende Muster', 'Konfidenzintervalle', 'Alerts bei Engpass', 'KI-Empfehlungen'].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Mini Chart Animation */}
            <div className="w-full md:w-72 h-36 relative">
              {/* Animated line chart preview */}
              <svg viewBox="0 0 280 120" className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 30, 60, 90].map((y) => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(255,255,255,0.05)" />
                ))}
                {/* Threshold line */}
                <line x1="0" y1="75" x2="280" y2="75" stroke="#ef4444" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
                <text x="4" y="72" fill="#ef4444" fontSize="8" opacity="0.6">Schwelle</text>

                {/* Confidence band */}
                <motion.path
                  d="M0,20 L22,22 L44,25 L66,30 L88,28 L110,35 L132,45 L154,50 L176,55 L198,48 L220,42 L242,38 L264,35 L264,75 L242,68 L220,72 L198,78 L176,85 L154,80 L132,75 L110,65 L88,58 L66,60 L44,55 L22,52 L0,50 Z"
                  fill="rgba(59,130,246,0.08)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />

                {/* Main balance line */}
                <motion.path
                  d="M0,35 L22,37 L44,40 L66,45 L88,43 L110,50 L132,60 L154,65 L176,70 L198,63 L220,57 L242,53 L264,50"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
                />

                {/* Pulsing dot at lowest point */}
                <motion.circle
                  cx="176"
                  cy="70"
                  r="4"
                  fill="#ef4444"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: [0, 1, 0.6, 1], scale: [0, 1.5, 1, 1.2] }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 1.2, repeat: Infinity, repeatDelay: 2 }}
                />
                <text x="160" y="90" fill="#ef4444" fontSize="7" fontWeight="600" opacity="0.8">KW 9: Min</text>

                {/* Inflow bars */}
                {[0, 44, 88, 132, 176, 220].map((x, i) => (
                  <motion.rect
                    key={`in-${i}`}
                    x={x + 4}
                    y={105}
                    width="14"
                    height={[12, 10, 14, 8, 15, 11][i]}
                    rx="2"
                    fill="#10b981"
                    opacity="0.3"
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                    style={{ transformOrigin: `${x + 11}px 117px` }}
                  />
                ))}
              </svg>
              {/* Labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                {['KW 1', 'KW 4', 'KW 7', 'KW 10', 'KW 13'].map((kw) => (
                  <span key={kw} className="text-[8px] text-gray-600">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── NEW: KI-Abweichungskommentare Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
          className="relative rounded-2xl border border-white/[0.06] p-8 md:p-10 overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-glow-md mb-6"
        >
          <BorderBeam size={250} duration={18} colorFrom="#f59e0b" colorTo="#ef4444" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-semibold text-white tracking-tight">KI-Abweichungskommentare</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">NEU</span>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-2xl">
                Statt nur &quot;Personalkosten +12%&quot; sagt die KI: &quot;Anstieg durch 3 Neueinstellungen IT (März-April) + Tariferhöhung 3.2%.
                Größte Einzelbuchung: Entwickler-Team 45.200€.&quot; — <strong className="text-white">Jede Abweichung automatisch erklärt.</strong>
              </p>
            </div>
            {/* Mini demo */}
            <div className="hidden lg:block flex-shrink-0 w-72">
              <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-red-400" />
                  <span className="text-xs text-gray-400">KI-Analyse</span>
                </div>
                {[
                  { label: 'Neueinstellungen IT', w: '75%', color: 'bg-red-400/60' },
                  { label: 'Tariferhöhung', w: '40%', color: 'bg-red-400/40' },
                  { label: 'Wegfall Zeitarbeit', w: '25%', color: 'bg-green-400/50' },
                ].map((factor, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    className="mb-2"
                  >
                    <div className="text-[10px] text-gray-500 mb-0.5">{factor.label}</div>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: factor.w }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className={`h-1.5 rounded-full ${factor.color}`}
                    />
                  </motion.div>
                ))}
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-amber-400/80">
                  <Sparkles className="w-3 h-3" />
                  <span>85% Konfidenz — Strukturelle Änderung</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Tile 1: KI-Monatsberichte ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.03] backdrop-blur-xl shadow-glow-md min-h-[340px] flex flex-col"
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
            className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.03] backdrop-blur-xl shadow-glow-md min-h-[340px] flex flex-col"
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
            className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.03] backdrop-blur-xl shadow-glow-md min-h-[340px] flex flex-col"
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
            className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.03] backdrop-blur-xl shadow-glow-md min-h-[340px] flex flex-col"
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

          {/* ── Tile 5: Monatsabschluss-Workflow ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden group hover:border-white/20 transition-colors bg-white/[0.03] backdrop-blur-xl shadow-glow-md min-h-[340px] flex flex-col md:col-span-2"
          >
            <BorderBeam size={180} duration={14} delay={12} colorFrom="#22c55e" colorTo="#10b981" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Monatsabschluss-Workflow</h3>
                <p className="text-xs text-gray-500">Geführter Abschluss</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              12 automatische Prüfungen — von Kontenabstimmung bis Storno-Check. Mit Fortschrittsanzeige, Findings und digitaler Freigabe.
            </p>
            {/* Mini Demo: Animated checklist */}
            <div className="flex-1 relative bg-white/[0.03] rounded-xl border border-white/5 p-4 overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                {/* Progress ring mini */}
                <svg viewBox="0 0 36 36" className="w-10 h-10">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="97.4"
                    initial={{ strokeDashoffset: 97.4 }}
                    whileInView={{ strokeDashoffset: 14.6 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
                    transform="rotate(-90 18 18)"
                  />
                  <text x="18" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">85%</text>
                </svg>
                <div>
                  <p className="text-xs text-white font-medium">10 von 12 bestanden</p>
                  <p className="text-[10px] text-gray-500">2 Warnungen</p>
                </div>
              </div>
              {[
                { name: 'Kontenabstimmung', status: 'passed', delay: 0.4 },
                { name: 'Rückstellungen', status: 'passed', delay: 0.7 },
                { name: 'Buchungsfehler-Scan', status: 'warning', delay: 1.0 },
                { name: 'Storno-Check', status: 'passed', delay: 1.3 },
                { name: 'Manuelle Freigabe', status: 'pending', delay: 1.6 },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: item.delay }}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  {item.status === 'passed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {item.status === 'pending' && <Clock className="w-4 h-4 text-gray-500" />}
                  <span className={`text-xs ${item.status === 'pending' ? 'text-gray-500' : 'text-gray-300'}`}>{item.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PRICING SECTION ═══════════ */}
      <section id="pricing" className="mx-auto max-w-screen-xl px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl text-center mb-12">
          <h4 className="text-xl font-semibold tracking-tight text-white">
            Preise
          </h4>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-2">
            Einfache Preise für jeden.
          </h2>
          <p className="mt-6 text-lg text-gray-300">
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
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#080b16] transition-transform ${
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
                'relative flex max-w-[400px] flex-col gap-8 rounded-2xl border p-6 text-white overflow-hidden bg-white/[0.03] backdrop-blur-xl',
                {
                  'border-t-2 border-t-blue-500/40 border-white/[0.06]': price.isMostPopular,
                  'border-white/[0.06]': !price.isMostPopular,
                }
              )}
            >
              <div className="flex items-center">
                <div className="ml-2">
                  <h2 className="text-base font-semibold leading-7">{price.name}</h2>
                  <p className="h-12 text-sm leading-5 text-gray-300">{price.description}</p>
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
              <div className="mx-auto size-24 rounded-[2rem] border border-white/10 bg-[#080b16]/80 p-3 shadow-2xl backdrop-blur-md lg:size-32">
                <BarChart3 className="mx-auto size-16 text-white lg:size-24" />
              </div>
              <div className="z-10 mt-4 flex flex-col items-center text-center text-white">
                <h1 className="text-3xl font-semibold lg:text-4xl">
                  Bereit für smartes Controlling?
                </h1>
                <p className="mt-2 text-gray-300">
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
              <div className="absolute inset-0 -z-10 rounded-full bg-[#080b16] opacity-40 blur-xl" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent to-[#080b16] to-70%" />
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer id="contact" className="bg-[#06080f]">
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border-t border-white/[0.06] py-4 px-8 gap-2">
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
