'use client';

import { useState, useCallback, useRef } from 'react';
import { ChatMessage, AnalysisResult } from '../types';

export function useChat(analysisResult: AnalysisResult | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !analysisResult) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantId = `assistant-${Date.now()}`;
      const loadingMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);
      setError(null);

      const body = JSON.stringify({
        message: content,
        context: analysisResult,
        history: messages.filter((m) => !m.isLoading),
      });

      try {
        // Try streaming first
        const response = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Streaming not available');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(jsonStr);
              if (chunk.error) {
                throw new Error(chunk.error);
              }
              if (!chunk.done && chunk.text) {
                fullText += chunk.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullText, isLoading: false }
                      : m
                  )
                );
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Streaming not available') {
                // Skip parse errors for incomplete chunks
              }
            }
          }
        }

        // Ensure final state is set
        if (fullText) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullText, isLoading: false }
                : m
            )
          );
        } else {
          throw new Error('Empty streaming response');
        }
      } catch (streamError) {
        // If streaming failed (not aborted), fall back to regular endpoint
        if (controller.signal.aborted) return;

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
          });

          const data = await response.json();

          if (response.ok) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: data.response, isLoading: false }
                  : m
              )
            );
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            setError(data.error || 'Antwort konnte nicht generiert werden');
          }
        } catch {
          if (!controller.signal.aborted) {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            setError('Netzwerkfehler beim Senden der Nachricht');
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [analysisResult, messages]
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
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
