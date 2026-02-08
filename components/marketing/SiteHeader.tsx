"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Menu, X, ArrowRight } from "lucide-react";

import { marketing } from "./site-config";

const nav = [
  { label: "Landing", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Login", href: "/login?next=%2Fapp" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeHref = useMemo(() => {
    if (pathname === "/features") return "/features";
    if (pathname === "/") return "/";
    return "";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl saturate-[180%]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-[#007AFF] to-[#0055D4]">
              <BarChart3 className="h-4 w-4 text-white" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">
              {marketing.productName}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[13px] font-medium md:flex">
            {nav.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  activeHref === item.href ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login?next=%2Fapp"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0068DD] active:scale-[0.98] transition-all"
            >
              App nutzen <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] transition"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed left-4 right-4 top-16 z-50 rounded-2xl border border-black/[0.06] bg-white/95 backdrop-blur-2xl p-2 shadow-apple-xl md:hidden"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex flex-col">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-[15px] font-medium text-gray-800 hover:bg-black/[0.03] transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
