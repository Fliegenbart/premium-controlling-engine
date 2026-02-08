'use client';

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import MarketingShell from "@/components/marketing/MarketingShell";
import { marketing } from "@/components/marketing/site-config";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
              Features
            </h1>
            <p className="mt-3 text-base text-gray-700 leading-relaxed">
              Ein klassischer Controlling-Workflow, end-to-end: Import, Analyse, Evidence, Report. Hier ist der
              Ueberblick ueber die wichtigsten Bausteine.
            </p>
          </div>
          <Link
            href="/login?next=%2Fapp"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_-28px_rgba(0,0,0,0.45)] hover:bg-gray-800 active:translate-y-px transition"
          >
            App nutzen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">Kern-Module</h2>
          <p className="mt-2 text-sm text-gray-600">
            Die Module sind als klare Einstiege gedacht. Du kannst mit einem import starten und dich entlang des
            Workflows bewegen.
          </p>

          <div className="mt-6">
            <BentoGrid>
              {marketing.modules.map((m, idx) => (
                <BentoCard
                  key={m.title}
                  Icon={m.icon}
                  name={m.title}
                  description={m.description}
                  tag={idx === 0 ? "Start" : undefined}
                  cta="Zur App"
                  href="/login?next=%2Fapp"
                  className={idx === 0 ? "md:col-span-2" : undefined}
                />
              ))}
            </BentoGrid>
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold text-gray-900">Alles, was du fuer Review brauchst</h2>
            <p className="mt-2 text-sm text-gray-600">
              Fokus auf Nachvollziehbarkeit, nicht auf buntes Dashboard-Bingo.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {marketing.usp.map((u) => (
                <div
                  key={u.title}
                  className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.30)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.04] ring-1 ring-black/[0.08]">
                      <u.icon className="h-5 w-5 text-[#0a6cff]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.title}</p>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{u.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
