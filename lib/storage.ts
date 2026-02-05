'use client';

import { SavedAnalysis, AnalysisResult, LabKPIs } from './types';

const STORAGE_KEY = 'patrick_controlling_analyses';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all saved analyses
export function getSavedAnalyses(): SavedAnalysis[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const analyses = JSON.parse(stored) as SavedAnalysis[];
    // Sort by created_at descending
    return analyses.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error loading saved analyses:', error);
    return [];
  }
}

// Save a new analysis
export function saveAnalysis(
  name: string,
  entity: string,
  result: AnalysisResult,
  kpis?: LabKPIs
): SavedAnalysis {
  const analysis: SavedAnalysis = {
    id: generateId(),
    name,
    entity,
    period_prev: result.meta.period_prev,
    period_curr: result.meta.period_curr,
    created_at: new Date().toISOString(),
    result,
    kpis,
    workflow_status: 'draft',
  };

  const existing = getSavedAnalyses();
  existing.unshift(analysis);

  // Keep only last 50 analyses to avoid localStorage limits
  const trimmed = existing.slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving analysis:', error);
    // If storage is full, try removing old entries
    if (trimmed.length > 10) {
      const reduced = trimmed.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    }
  }

  return analysis;
}

// Update an existing analysis
export function updateAnalysis(id: string, updates: Partial<SavedAnalysis>): SavedAnalysis | null {
  const analyses = getSavedAnalyses();
  const index = analyses.findIndex(a => a.id === id);

  if (index === -1) return null;

  const updated = { ...analyses[index], ...updates };
  analyses[index] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  } catch (error) {
    console.error('Error updating analysis:', error);
  }

  return updated;
}

// Update workflow status
export function updateWorkflowStatus(
  id: string,
  status: 'draft' | 'review' | 'approved',
  approvedBy?: string
): SavedAnalysis | null {
  const updates: Partial<SavedAnalysis> = { workflow_status: status };

  if (status === 'approved' && approvedBy) {
    updates.approved_by = approvedBy;
    updates.approved_at = new Date().toISOString();
  }

  return updateAnalysis(id, updates);
}

// Delete an analysis
export function deleteAnalysis(id: string): boolean {
  const analyses = getSavedAnalyses();
  const filtered = analyses.filter(a => a.id !== id);

  if (filtered.length === analyses.length) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return false;
  }
}

// Get a single analysis by ID
export function getAnalysisById(id: string): SavedAnalysis | null {
  const analyses = getSavedAnalyses();
  return analyses.find(a => a.id === id) || null;
}

// Export all analyses as JSON
export function exportAnalyses(): string {
  const analyses = getSavedAnalyses();
  return JSON.stringify(analyses, null, 2);
}

// Import analyses from JSON
export function importAnalyses(jsonString: string): number {
  try {
    const imported = JSON.parse(jsonString) as SavedAnalysis[];
    if (!Array.isArray(imported)) throw new Error('Invalid format');

    const existing = getSavedAnalyses();
    const existingIds = new Set(existing.map(a => a.id));

    // Only add analyses that don't already exist
    const newAnalyses = imported.filter(a => !existingIds.has(a.id));
    const merged = [...newAnalyses, ...existing].slice(0, 50);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return newAnalyses.length;
  } catch (error) {
    console.error('Error importing analyses:', error);
    return 0;
  }
}

// Clear all saved analyses
export function clearAllAnalyses(): void {
  localStorage.removeItem(STORAGE_KEY);
}
