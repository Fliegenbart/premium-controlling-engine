'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart3, Loader2, Lock, Mail } from 'lucide-react';

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
    <main className="min-h-screen bg-[#0b1220] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <BarChart3 className="h-4 w-4" />
            <span>Premium Controlling Engine</span>
          </Link>
          <span className="text-xs text-gray-500">Anmeldung</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.7)]">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-white tracking-tight">Willkommen zurück</h1>
            <p className="mt-1 text-sm text-gray-400">
              Bitte melde dich an, um Analysen zu erstellen und Reports zu exportieren.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-400">E-Mail</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="name@firma.de"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-400">Passwort</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2.5 text-sm font-semibold text-[#041014] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Anmelden
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            Demo (wenn aktiviert): <span className="font-mono">admin@controlling.local</span> /{' '}
            <span className="font-mono">demo123</span>
          </p>
        </div>
      </div>
    </main>
  );
}

