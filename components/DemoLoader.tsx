'use client';

import { useState, useEffect } from 'react';
import { Database, Loader2, Sparkles, CheckCircle, Play, Zap } from 'lucide-react';

interface DemoScenario {
  id: string;
  name: string;
  description: string;
}

interface DemoLoaderProps {
  onDemoLoaded: () => void;
}

export default function DemoLoader({ onDemoLoaded }: DemoLoaderProps) {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('mixed');
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadedInfo, setLoadedInfo] = useState<{
    prevYear: { rowCount: number };
    currYear: { rowCount: number };
    plan: { rowCount: number };
    description: string;
  } | null>(null);

  useEffect(() => {
    // Fetch available scenarios
    fetch('/api/demo')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenarios(data.scenarios);
        }
      })
      .catch(console.error);
  }, []);

  const loadDemo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario })
      });

      const data = await response.json();
      if (data.success) {
        setLoaded(true);
        setLoadedInfo({
          prevYear: data.loaded.prevYear,
          currYear: data.loaded.currYear,
          plan: data.loaded.plan,
          description: data.description
        });
        onDemoLoaded();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Demo-Daten konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Demo-Modus</h3>
          <p className="text-gray-400 text-sm">Realistische Labordaten zum Ausprobieren</p>
        </div>
      </div>

      {!loaded ? (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Szenario wählen</label>
            <div className="grid grid-cols-2 gap-2">
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedScenario === s.id
                      ? 'bg-purple-500/20 border-purple-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Lade Demo-Daten...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Demo starten
              </>
            )}
          </button>

          <p className="text-gray-500 text-xs text-center">
            Generiert ~500 realistische Buchungen nach SKR03
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Demo-Daten geladen!</span>
          </div>

          <p className="text-gray-400 text-sm">{loadedInfo?.description}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Vorjahr</p>
              <p className="text-white font-bold">{loadedInfo?.prevYear.rowCount} Buchungen</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Plan</p>
              <p className="text-white font-bold">{loadedInfo?.plan.rowCount} Buchungen</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Ist</p>
              <p className="text-white font-bold">{loadedInfo?.currYear.rowCount} Buchungen</p>
            </div>
          </div>

          <button
            onClick={() => {
              setLoaded(false);
              setLoadedInfo(null);
            }}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm transition-colors"
          >
            Anderes Szenario laden
          </button>
        </div>
      )}
    </div>
  );
}
