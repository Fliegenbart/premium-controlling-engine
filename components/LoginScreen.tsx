'use client';

import { useState } from 'react';
import { Loader2, Lock, Mail } from 'lucide-react';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'controller' | 'viewer';
};

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data?.user) {
        setError(data?.error || 'Login fehlgeschlagen');
        return;
      }

      onLoggedIn(data.user);
      setEmail('');
      setPassword('');
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-black/[0.10] bg-white/70 backdrop-blur-2xl p-6 shadow-[0_30px_100px_-70px_rgba(0,0,0,0.35)]">
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Willkommen zurück</h1>
          <p className="mt-1 text-sm text-gray-600">
            Bitte melde dich an, um Analysen zu erstellen und Reports zu exportieren.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">E-Mail</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-black/[0.10] bg-white/80 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0a6cff]/60 focus:outline-none focus:ring-4 focus:ring-[#0a6cff]/10"
                placeholder="name@firma.de"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Passwort</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-black/[0.10] bg-white/80 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0a6cff]/60 focus:outline-none focus:ring-4 focus:ring-[#0a6cff]/10"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_45px_-28px_rgba(0,0,0,0.45)] hover:bg-gray-800 active:translate-y-px transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
