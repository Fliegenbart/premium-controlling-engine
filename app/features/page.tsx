'use client';

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import MarketingShell from "@/components/marketing/MarketingShell";
import { marketing } from "@/components/marketing/site-config";
import { BentoUSPSection, CTASection, FAQSection, HowItWorks } from "@/components/marketing/LandingSections";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Features
            </h1>
            <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
              Ein klassischer Controlling-Workflow, end-to-end: Import, Analyse, Evidence, Report. Hier ist der
              Ueberblick ueber die wichtigsten Bausteine.
            </p>
          </div>
          <Link
            href="/login?next=%2Fapp"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0068DD] active:scale-[0.98] transition-all"
          >
            App nutzen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Kern-Module</h2>
          <p className="mt-2 text-[14px] text-gray-500">
            Die Module sind als klare Einstiege gedacht. Du kannst mit einem import starten und dich entlang des
            Workflows bewegen.
          </p>

          <div className="mt-8">
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

        <div className="mt-2" />
        <BentoUSPSection />
        <HowItWorks />
        <FAQSection />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
