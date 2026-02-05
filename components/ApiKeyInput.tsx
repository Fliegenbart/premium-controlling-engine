'use client';

import { useState } from 'react';
import { Eye, EyeOff, Key, Check, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

interface ApiKeyInputProps {
  apiKey: string;
  isValidFormat: boolean;
  onSave: (key: string) => void;
  onClear: () => void;
}

export function ApiKeyInput({ apiKey, isValidFormat, onSave, onClear }: ApiKeyInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  const handleSave = () => {
    onSave(inputValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setInputValue('');
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 10)}${'•'.repeat(Math.min(20, apiKey.length - 10))}`
    : '';

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setInputValue(apiKey);
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isValidFormat
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'
        }`}
      >
        <Key className="w-4 h-4" />
        {isValidFormat ? (
          <>
            <span className="hidden sm:inline">API-Key</span>
            <Check className="w-3 h-3" />
          </>
        ) : (
          <span className="hidden sm:inline">API-Key hinzufügen</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                Anthropic API-Key
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Wird lokal im Browser gespeichert
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Input Field */}
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Validation Status */}
              {inputValue && (
                <div className={`flex items-center gap-2 text-xs ${
                  inputValue.startsWith('sk-ant-') && inputValue.length > 20
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }`}>
                  {inputValue.startsWith('sk-ant-') && inputValue.length > 20 ? (
                    <>
                      <Check className="w-3 h-3" />
                      Gültiges Format
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Key muss mit &quot;sk-ant-&quot; beginnen
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!inputValue.startsWith('sk-ant-') || inputValue.length < 20}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Speichern
                </button>
                {apiKey && (
                  <button
                    onClick={handleClear}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Help Link */}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                API-Key bei Anthropic erstellen
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
