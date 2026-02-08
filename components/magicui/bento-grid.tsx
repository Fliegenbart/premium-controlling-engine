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
    "group relative h-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-xl shadow-apple-sm",
    "transition-all duration-300 hover:border-black/[0.10] hover:shadow-apple-md",
    "transform-gpu hover:-translate-y-0.5",
    className,
  );

  const Content = (
    <>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#007AFF]/[0.04] blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[#5856D6]/[0.04] blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      {/* Custom background */}
      {background ? <div className="pointer-events-none absolute inset-0">{background}</div> : null}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#007AFF]/[0.08]">
            <Icon className="h-5 w-5 text-[#007AFF] transition-transform duration-300 group-hover:scale-110" />
          </div>

          {tag ? (
            <div className="hidden items-center gap-2 rounded-full bg-[#007AFF]/[0.08] px-3 py-1 text-[11px] font-semibold text-[#007AFF] sm:inline-flex">
              {tag}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="text-[17px] font-semibold tracking-tight text-gray-900">{name}</p>
          <p className="bento-desc mt-2 text-[14px] leading-relaxed text-gray-500">
            {description}
          </p>
        </div>

        {cta ? (
          <div className="mt-auto pt-6">
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#007AFF] transition-colors group-hover:text-[#0068DD]">
              {cta}
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Subtle highlight */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_-10%,rgba(0,122,255,0.06),transparent_55%)]" />
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
