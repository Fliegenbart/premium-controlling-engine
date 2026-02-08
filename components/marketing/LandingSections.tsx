"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import Marquee from "@/components/magicui/marquee";
import { BlurFade } from "@/components/magicui/blur-fade";

import { marketing } from "./site-config";

export function HeroSection() {
  const { hero } = marketing;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:pt-24">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div className="max-w-xl">
          <BlurFade>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#007AFF]/[0.08] px-3 py-1 text-xs font-medium text-[#007AFF]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {hero.badge}
            </p>
          </BlurFade>

          <BlurFade delay={0.06}>
            <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.1] tracking-tight text-gray-900 md:text-[3.25rem]">
              {hero.title}
            </h1>
          </BlurFade>

          <BlurFade delay={0.12}>
            <p className="mt-5 text-lg leading-relaxed text-gray-500">
              {hero.subtitle}
            </p>
          </BlurFade>

          <BlurFade delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={hero.primaryCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#007AFF] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#0068DD] active:scale-[0.98] transition-all"
              >
                {hero.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/80 backdrop-blur-xl px-6 py-3 text-[15px] font-semibold text-gray-900 hover:bg-white active:scale-[0.98] transition-all shadow-apple-sm"
              >
                {hero.secondaryCta.label}
              </Link>
            </div>
          </BlurFade>
        </div>

        <BlurFade delay={0.10}>
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-2xl p-7 shadow-apple-lg">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#007AFF]/[0.06] blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[#5856D6]/[0.06] blur-3xl" />
            </div>
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.12em] text-gray-400 uppercase">
                Kernvorteile
              </p>
              <ul className="mt-5 space-y-4 text-[15px] text-gray-800">
                {marketing.usp.slice(0, 3).map((u) => (
                  <li key={u.title} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#007AFF]/[0.08]">
                      <u.icon className="h-4 w-4 text-[#007AFF]" />
                    </span>
                    <span>
                      <span className="font-semibold text-gray-900">{u.title}</span>
                      <span className="text-gray-500">{" "}{u.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

export function LogoMarquee() {
  const chips = [
    "DATEV",
    "SAP",
    "Lexware",
    "CSV",
    "XLSX",
    "BWA",
    "Konten",
    "Kostenstellen",
    "Plan/Ist",
    "Vorjahr",
    "Evidence",
    "Word/Excel",
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur-xl p-4 shadow-apple-sm">
        <Marquee pauseOnHover className="[--duration:28s] [--gap:0.6rem]">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-black/[0.06] bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-500"
            >
              {c}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export function HighLevelUSPSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 pt-2">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Warum dieses Tool
          </h2>
          <p className="mt-2 text-[15px] text-gray-500">
            Kurz und klar: warum das Tool den Review beschleunigt.
          </p>
        </div>
        <Link
          href="/features"
          className="hidden sm:inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2 text-[13px] font-semibold text-gray-900 hover:bg-white transition-all shadow-apple-sm"
        >
          Details ansehen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {marketing.usp.slice(0, 3).map((u) => (
          <div
            key={u.title}
            className="rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-2xl p-6 shadow-apple-sm hover:shadow-apple-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#007AFF]/[0.08]">
                <u.icon className="h-5 w-5 text-[#007AFF]" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-gray-900 tracking-tight">
                  {u.title}
                </p>
                <p className="mt-1 text-[14px] text-gray-500 leading-relaxed">
                  {u.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 sm:hidden">
        <Link
          href="/features"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-gray-900 hover:bg-white transition-all shadow-apple-sm"
        >
          Details ansehen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

export function BentoUSPSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Das Tool in einem Blick
          </h2>
          <p className="mt-2 text-[15px] text-gray-500">
            Klassische Controlling-Fragen, aber mit klarer Nutzerfuehrung und Evidence.
          </p>
        </div>
        <Link
          href="/features"
          className="hidden sm:inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2 text-[13px] font-semibold text-gray-900 hover:bg-white transition-all shadow-apple-sm"
        >
          Alle Features <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-8">
        <BentoGrid>
          {marketing.usp.map((u, idx) => (
            <BentoCard
              key={u.title}
              Icon={u.icon}
              name={u.title}
              description={u.description}
              tag={idx === 0 ? "Empfohlen" : undefined}
              cta="Mehr"
              href="/features"
              className={idx === 0 ? "md:col-span-2" : undefined}
              background={
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                </div>
              }
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Importieren",
      desc: "Buchungen hochladen. Profiling und Plausibilitaet starten automatisch.",
    },
    {
      step: "02",
      title: "Verstehen",
      desc: "Treiberanalyse ueber Konten, Kostenstellen, Root Cause und Trends.",
    },
    {
      step: "03",
      title: "Dokumentieren",
      desc: "Evidence verknuepfen, Workflow-Status setzen und Reports exportieren.",
    },
  ];

  return (
    <section id="workflow" className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-2xl p-8 shadow-apple-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Intuitive Nutzerfuehrung
            </h2>
            <p className="mt-2 text-[15px] text-gray-500">
              Ein klarer Prozess statt UI-Rauschen.
            </p>
          </div>
          <Link
            href="/login?next=%2Fapp"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0068DD] transition-all"
          >
            App nutzen <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20% 0px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-black/[0.06] bg-[rgb(var(--bg-surface))] p-6 shadow-apple-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.12em] text-gray-400">
                  {s.step}
                </span>
                <span className="h-9 w-9 rounded-xl bg-[#007AFF]/[0.06]" />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-gray-900 tracking-tight">
                {s.title}
              </p>
              <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">FAQ</h2>
          <p className="mt-2 text-[15px] text-gray-500">Die haeufigsten Fragen zum Betrieb.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {marketing.faq.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-black/[0.06] bg-white/80 p-5 shadow-apple-sm"
          >
            <summary className="cursor-pointer list-none text-[15px] font-semibold text-gray-900">
              {f.q}
            </summary>
            <p className="mt-3 text-[14px] text-gray-500 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-8 md:p-10 text-white shadow-apple-xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#007AFF]/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#5856D6]/15 blur-3xl" />
        </div>

        <div className="relative">
          <h3 className="text-2xl font-bold tracking-tight">
            Bereit fuer den ersten Review-fertigen Report?
          </h3>
          <p className="mt-3 text-[15px] text-white/70 max-w-2xl leading-relaxed">
            Wenn du nur einen Einstieg willst: importieren, Top-Abweichungen verstehen, Evidence sichern, exportieren.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?next=%2Fapp"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-gray-900 hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              App nutzen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/15 transition-all"
            >
              Features ansehen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
