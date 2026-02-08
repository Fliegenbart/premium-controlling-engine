import type { ReactNode } from "react";

import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7f9] text-gray-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(10,108,255,0.10),transparent_55%),radial-gradient(900px_circle_at_85%_5%,rgba(94,92,230,0.10),transparent_55%),radial-gradient(900px_circle_at_55%_95%,rgba(16,185,129,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.60] [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

