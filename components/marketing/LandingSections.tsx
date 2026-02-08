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
    <section className="mx-auto max-w-7xl px-6 pb-10 pt-14 md:pt-20">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="max-w-xl">
          <BlurFade>
            <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.22)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {hero.badge}
            </p>
          </BlurFade>

          <BlurFade delay={0.06}>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
              {hero.title}
            </h1>
          </BlurFade>

          <BlurFade delay={0.12}>
            <p className="mt-5 text-base leading-relaxed text-gray-700">
              {hero.subtitle}
            </p>
          </BlurFade>

          <BlurFade delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={hero.primaryCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_-28px_rgba(0,0,0,0.45)] hover:bg-gray-800 active:translate-y-px transition"
              >
                {hero.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 active:translate-y-px transition shadow-[0_16px_45px_-28px_rgba(0,0,0,0.22)]"
              >
                {hero.secondaryCta.label}
              </Link>
            </div>
          </BlurFade>
        </div>

        <BlurFade delay={0.10}>
          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_40px_120px_-90px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#0a6cff]/12 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#5e5ce6]/12 blur-3xl" />
            </div>
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
                High level USPs
              </p>
              <ul className="mt-4 space-y-3 text-sm text-gray-800">
                {marketing.usp.slice(0, 5).map((u) => (
                  <li key={u.title} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/[0.04] ring-1 ring-black/[0.08]">
                      <u.icon className="h-4 w-4 text-[#0a6cff]" />
                    </span>
                    <span>
                      <span className="font-semibold text-gray-900">{u.title}</span>
                      <span className="text-gray-600">{" "}{u.description}</span>
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
    <section className="mx-auto max-w-7xl px-6 pb-10">
      <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-4 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
        <Marquee pauseOnHover className="[--duration:28s] [--gap:0.6rem]">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold text-gray-700"
            >
              {c}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export function BentoUSPSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Das Tool in einem Blick
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Klassische Controlling-Fragen, aber mit klarer Nutzerfuehrung und Evidence.
          </p>
        </div>
        <Link
          href="/features"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 transition shadow-[0_16px_45px_-28px_rgba(0,0,0,0.22)]"
        >
          Alle Features <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-transparent to-transparent" />
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
    <section id="workflow" className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Intuitive Nutzendenfuehrung
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Ein klarer Prozess statt UI-Rauschen.
            </p>
          </div>
          <Link
            href="/login?next=%2Fapp"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition"
          >
            App nutzen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20% 0px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-gray-500">
                  {s.step}
                </span>
                <span className="h-9 w-9 rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]" />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-900 tracking-tight">
                {s.title}
              </p>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
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
    <section id="faq" className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">FAQ</h2>
          <p className="mt-2 text-sm text-gray-600">Die haeufigsten Fragen zum Betrieb.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {marketing.faq.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-black/10 bg-white/70 p-5 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.26)]"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
              {f.q}
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-gray-900 p-8 text-white shadow-[0_40px_120px_-90px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-[#0a6cff]/25 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#5e5ce6]/20 blur-3xl" />
        </div>

        <div className="relative">
          <h3 className="text-2xl font-semibold tracking-tight">
            Bereit fuer den ersten Review-fertigen Report?
          </h3>
          <p className="mt-2 text-sm text-white/80 max-w-2xl">
            Wenn du nur einen Einstieg willst: importieren, Top-Abweichungen verstehen, Evidence sichern, exportieren.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?next=%2Fapp"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-white/90 active:translate-y-px transition"
            >
              App nutzen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              Features ansehen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

