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
      <div className="rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-2xl p-7 shadow-apple-lg">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Willkommen zurück</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Bitte melde dich an, um Analysen zu erstellen und Reports zu exportieren.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-600">E-Mail</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] bg-[rgb(var(--bg-surface))] py-2.5 pl-10 pr-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-[#007AFF]/50 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                placeholder="name@firma.de"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-600">Passwort</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] bg-[rgb(var(--bg-surface))] py-2.5 pl-10 pr-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-[#007AFF]/50 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0068DD] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
