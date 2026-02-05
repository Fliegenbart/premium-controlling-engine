'use client';

import { useState } from 'react';
import { Lock, Mail, User, Loader2, LogOut, Shield } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'controller' | 'viewer';
}

interface LoginPanelProps {
  onLogin: (user: User, token: string) => void;
  onLogout: () => void;
  currentUser: User | null;
  token: string | null;
}

export default function LoginPanel({ onLogin, onLogout, currentUser, token }: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user, data.token);
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Login fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', token })
      });
    }
    onLogout();
  };

  // Show logged in state
  if (currentUser) {
    return (
      <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{currentUser.name}</p>
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {currentUser.role === 'admin' ? 'Administrator' :
               currentUser.role === 'controller' ? 'Controller' : 'Leser'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Abmelden"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Show login form
  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
        <Lock className="w-4 h-4" />
        <span className="text-sm">Anmelden</span>
      </button>

      {/* Dropdown Login Form */}
      <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1a2e] border border-white/10 rounded-xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-green-400" />
          Anmelden
        </h3>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail"
              className="w-full pl-10 pr-4 py-2 bg-black/30 text-white rounded-lg border border-white/10 focus:outline-none focus:border-green-500 text-sm"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full pl-10 pr-4 py-2 bg-black/30 text-white rounded-lg border border-white/10 focus:outline-none focus:border-green-500 text-sm"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        <p className="text-gray-500 text-xs mt-3 text-center">
          Demo: admin@controlling.local / demo123
        </p>
      </div>
    </div>
  );
}
