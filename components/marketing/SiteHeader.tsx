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
      <div className="border-b border-black/10 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] ring-1 ring-black/[0.08]">
              <BarChart3 className="h-5 w-5 text-[#0a6cff]" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-gray-900">
              {marketing.productName}
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            {nav.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  activeHref === item.href ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login?next=%2Fapp"
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:translate-y-px transition"
            >
              App nutzen <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] ring-1 ring-black/[0.08] text-gray-700 hover:bg-black/[0.06] transition"
              aria-label="Menü öffnen"
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
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed left-1/2 top-[72px] z-50 w-[calc(100%-24px)] -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.35)] md:hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex flex-col">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-gray-800 hover:bg-black/[0.04] transition"
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

