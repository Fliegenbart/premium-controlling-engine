"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LoginScreen from "@/components/LoginScreen";
import MarketingShell from "@/components/marketing/MarketingShell";
import { marketing } from "@/components/marketing/site-config";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "controller" | "viewer";
};

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const nextHref = useMemo(() => {
    // Prevent open redirects: only allow relative paths
    if (!nextParam) return "/app";
    if (!nextParam.startsWith("/")) return "/app";
    if (nextParam.startsWith("//")) return "/app";
    return nextParam;
  }, [nextParam]);

  if (!mounted) {
    return null;
  }

  return (
    <MarketingShell>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-12 md:grid-cols-2 md:items-center">
        <div className="order-2 md:order-1">
          <LoginScreen
            onLoggedIn={(user: AuthUser) => {
              // If cookie session is set, the app will validate. Redirect now.
              router.replace(nextHref);
            }}
          />
        </div>
        <div className="order-1 md:order-2">
          <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-gray-500 uppercase">
              {marketing.productName}
            </p>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              Login, dann direkt in den Workflow.
            </h1>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              Nach dem Login landest du im App-Dashboard. Von dort: Import starten, Abweichungen verstehen, Evidence
              sichern und Reports exportieren.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {marketing.usp.slice(0, 4).map((u) => (
                <li key={u.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-black/[0.04] ring-1 ring-black/[0.08]">
                    <u.icon className="h-4 w-4 text-[#0a6cff]" />
                  </span>
                  <span>
                    <span className="font-semibold text-gray-900">{u.title}</span>
                    <span className="text-gray-600">{" "}{u.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </MarketingShell>
  );
}

