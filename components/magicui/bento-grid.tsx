"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[22rem]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type BentoCardProps = {
  name: string;
  description: string;
  Icon: LucideIcon;
  tag?: string;
  cta?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  background?: ReactNode;
};

export function BentoCard({
  name,
  description,
  Icon,
  tag,
  cta,
  href,
  onClick,
  className,
  background,
}: BentoCardProps) {
  const base = cn(
    "bento-glow group relative h-full overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.05] shadow-[0_20px_60px_-45px_rgba(0,0,0,0.85)]",
    "transition-colors duration-300 hover:bg-white/[0.07] hover:border-white/[0.18]",
    "transform-gpu transition-transform duration-300 hover:-translate-y-0.5",
    className,
  );

  const Content = (
    <>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-pink-500/[0.12] blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
      </div>

      {/* Custom background */}
      {background ? <div className="pointer-events-none absolute inset-0">{background}</div> : null}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Icon className="h-5 w-5 text-pink-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2" />
          </div>

          {tag ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold text-gray-300 sm:inline-flex">
              {tag}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="text-lg font-semibold tracking-tight text-white">{name}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
        </div>

        {cta ? (
          <div className="mt-auto pt-6">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors group-hover:text-white">
              {cta}
              <span className="text-gray-500 transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Subtle highlight */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(236,72,153,0.18),transparent_50%)]" />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, "w-full text-left")}>
        {Content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={cn(base, "block")}>
        {Content}
      </Link>
    );
  }

  return <div className={base}>{Content}</div>;
}
