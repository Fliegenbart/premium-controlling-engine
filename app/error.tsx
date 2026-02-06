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
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-gray-400 mb-4">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium"
        >
          Neu laden
        </button>
      </div>
    </div>
  );
}
