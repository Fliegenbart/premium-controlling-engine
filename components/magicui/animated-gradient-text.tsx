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
        "inline animate-gradient bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#007AFF] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
        className,
      )}
      style={{ "--bg-size": "300%" } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
