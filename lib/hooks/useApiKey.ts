'use client';

import { useState, useEffect, useCallback } from 'react';

const API_KEY_STORAGE_KEY = 'anthropic_api_key';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) {
      setApiKey(stored);
    }
    setIsLoaded(true);
  }, []);

  const isValidFormat = apiKey.startsWith('sk-ant-') && apiKey.length > 20;

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    if (key && key.startsWith('sk-ant-')) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
  }, []);

  return {
    apiKey,
    isValidFormat,
    isLoaded,
    saveApiKey,
    clearApiKey,
  };
}
