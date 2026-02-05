'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Sparkles, FileText, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { ChatMessage, AnalysisResult, AccountDeviation } from '@/lib/types';
import { useChat } from '@/lib/hooks/useChat';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

// Generate dynamic questions based on analysis data
function generateSuggestedQuestions(result: AnalysisResult | null): string[] {
  if (!result) return [];

  const questions: string[] = [];
  const topAccount = result.by_account[0];
  const topCostCenter = result.by_cost_center?.[0];

  // Question about biggest deviation
  if (topAccount) {
    const direction = topAccount.delta_abs > 0 ? 'gestiegen' : 'gesunken';
    questions.push(`Warum ist ${topAccount.account_name} um ${Math.abs(topAccount.delta_pct).toFixed(0)}% ${direction}?`);
  }

  // Question about cost centers
  if (topCostCenter) {
    questions.push(`Was ist bei Kostenstelle ${topCostCenter.cost_center} passiert?`);
  }

  // Generic useful questions
  questions.push('Welche Buchungen sollte ich mir genauer anschauen?');
  questions.push('Fasse die 3 wichtigsten Erkenntnisse zusammen.');
  questions.push('Gibt es ungewöhnliche Einzelbuchungen?');

  return questions.slice(0, 5);
}

// Parse message content to highlight document numbers
function formatMessageWithEvidence(content: string, onDocClick?: (docNo: string) => void): React.ReactNode {
  // Match patterns like "Beleg 4711" or "Beleg-Nr. 4711" or "(Beleg: 4711)"
  const docPattern = /(?:Beleg(?:-Nr\.?)?:?\s*)(\d+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(docPattern);
  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Add highlighted document number
    const docNo = match[1];
    parts.push(
      <button
        key={`${docNo}-${match.index}`}
        onClick={() => onDocClick?.(docNo)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/30 hover:bg-blue-500/50 rounded text-blue-300 font-mono text-xs transition-colors"
        title={`Beleg ${docNo} anzeigen`}
      >
        <FileText className="w-3 h-3" />
        {docNo}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

interface ChatInterfaceProps {
  analysisResult: AnalysisResult | null;
  apiKey: string;
  onShowEvidence?: (account: AccountDeviation) => void;
}

export function ChatInterface({ analysisResult, apiKey, onShowEvidence }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, error, sendMessage, clearChat } = useChat(
    analysisResult,
    apiKey
  );

  // Generate dynamic questions based on data
  const suggestedQuestions = useMemo(
    () => generateSuggestedQuestions(analysisResult),
    [analysisResult]
  );

  // Handle clicking on a document number
  const handleDocClick = (docNo: string) => {
    // Find the account that contains this document
    if (analysisResult) {
      for (const account of analysisResult.by_account) {
        const hasDoc = account.top_bookings_curr?.some(b => b.document_no === docNo) ||
                       account.top_bookings?.some(b => b.document_no === docNo);
        if (hasDoc && onShowEvidence) {
          onShowEvidence(account);
          return;
        }
      }
    }
    // If not found, show a message
    sendMessage(`Zeige mir Details zu Beleg ${docNo}`);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleSuggestion = (question: string) => {
    sendMessage(question);
  };

  if (!analysisResult) return null;

  // Calculate some stats for the header
  const totalDeviation = analysisResult.summary.total_delta;
  const deviationCount = analysisResult.by_account.length;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
          isOpen ? 'hidden' : ''
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full text-xs font-bold text-black flex items-center justify-center">
            !
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-end pointer-events-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md h-[80vh] max-h-[600px] bg-[#12121a] rounded-2xl border border-white/10 shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-semibold">Frag deine Zahlen</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {deviationCount} Abweichungen • {formatCurrency(totalDeviation)} gesamt
                </p>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Chat leeren"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-6">
                    Stelle Fragen zu deiner Abweichungsanalyse
                  </p>

                  {!apiKey && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                      <p className="text-yellow-400 text-sm">
                        Bitte API-Key hinzufügen, um die Chat-Funktion zu nutzen
                      </p>
                    </div>
                  )}

                  {apiKey && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 mb-2">Frag mich zum Beispiel:</p>
                      {suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestion(q)}
                          className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors group"
                        >
                          <span className="text-blue-400 mr-2">→</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white/10 text-gray-200 rounded-bl-md'
                        }`}
                      >
                        {msg.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-gray-400">Analysiere...</span>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.role === 'assistant'
                              ? formatMessageWithEvidence(msg.content, handleDocClick)
                              : msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Input */}
            {apiKey && (
              <form
                onSubmit={handleSubmit}
                className="p-4 border-t border-white/10"
              >
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Frage eingeben..."
                    disabled={isLoading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
