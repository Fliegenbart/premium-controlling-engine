"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AnimatedGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline animate-gradient bg-gradient-to-r from-[#f472b6] via-[#a855f7] to-[#f472b6] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
        className,
      )}
      style={{ "--bg-size": "300%" } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
