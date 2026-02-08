import type { ReactNode } from "react";

import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_0%,rgba(0,122,255,0.05),transparent_50%),radial-gradient(800px_circle_at_80%_5%,rgba(88,86,214,0.04),transparent_50%)]" />
      </div>

      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
