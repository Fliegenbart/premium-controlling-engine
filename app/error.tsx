'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-black/[0.08] rounded-2xl p-6 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.35)]">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-2 px-4 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] active:translate-y-px transition text-white text-sm font-semibold shadow-[0_12px_30px_-18px_rgba(0,113,227,0.35)]"
        >
          Neu laden
        </button>
      </div>
    </div>
  );
}
