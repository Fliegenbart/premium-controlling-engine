'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, AnalysisResult } from '../types';

export function useChat(analysisResult: AnalysisResult | null, apiKey: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !analysisResult) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Add loading placeholder for assistant
      const loadingMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };
      setMessages((prev) => [...prev, loadingMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            context: analysisResult,
            history: messages.filter((m) => !m.isLoading),
            apiKey,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Replace loading message with actual response
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMessage.id
                ? { ...m, content: data.response, isLoading: false }
                : m
            )
          );
        } else {
          // Remove loading message and show error
          setMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));
          setError(data.error || 'Antwort konnte nicht generiert werden');
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));
        setError('Netzwerkfehler beim Senden der Nachricht');
      } finally {
        setIsLoading(false);
      }
    },
    [analysisResult, apiKey, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
