'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedAnalysis, AnalysisResult, LabKPIs } from '../types';
import {
  getSavedAnalyses,
  saveAnalysis as saveAnalysisToStorage,
  deleteAnalysis as deleteAnalysisFromStorage,
  updateWorkflowStatus as updateStatusInStorage,
} from '../storage';

export function useSavedAnalyses() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = getSavedAnalyses();
    setAnalyses(saved);
    setIsLoaded(true);
  }, []);

  const saveAnalysis = useCallback(
    (name: string, entity: string, result: AnalysisResult, kpis?: LabKPIs) => {
      const saved = saveAnalysisToStorage(name, entity, result, kpis);
      setAnalyses(prev => [saved, ...prev].slice(0, 50));
      return saved;
    },
    []
  );

  const deleteAnalysis = useCallback((id: string) => {
    const success = deleteAnalysisFromStorage(id);
    if (success) {
      setAnalyses(prev => prev.filter(a => a.id !== id));
    }
    return success;
  }, []);

  const updateWorkflowStatus = useCallback(
    (id: string, status: 'draft' | 'review' | 'approved', approvedBy?: string) => {
      const updated = updateStatusInStorage(id, status, approvedBy);
      if (updated) {
        setAnalyses(prev =>
          prev.map(a => (a.id === id ? updated : a))
        );
      }
      return updated;
    },
    []
  );

  const refresh = useCallback(() => {
    const saved = getSavedAnalyses();
    setAnalyses(saved);
  }, []);

  return {
    analyses,
    isLoaded,
    saveAnalysis,
    deleteAnalysis,
    updateWorkflowStatus,
    refresh,
  };
}
