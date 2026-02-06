import { ClosingWorkflow } from './closing-types';

const CLOSING_STORAGE_KEY = 'patrick_controlling_closings';
const MAX_WORKFLOWS = 24; // 2 Jahre

export function getClosingWorkflows(): ClosingWorkflow[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CLOSING_STORAGE_KEY);
    if (!data) return [];

    const workflows: ClosingWorkflow[] = JSON.parse(data);
    return workflows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  } catch {
    return [];
  }
}

export function saveClosingWorkflow(workflow: ClosingWorkflow): ClosingWorkflow | null {
  if (typeof window === 'undefined') return null;

  try {
    const existing = getClosingWorkflows();
    const updated = [workflow, ...existing];
    const truncated = updated.splice(0, MAX_WORKFLOWS);

    localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(truncated));
    return workflow;
  } catch (error) {
    if ((error as DOMException)?.name === 'QuotaExceededError') {
      try {
        const existing = getClosingWorkflows().slice(0, 12);
        const updated = [workflow, ...existing];
        localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(updated));
        return workflow;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function updateClosingWorkflow(id: string, updates: Partial<ClosingWorkflow>): ClosingWorkflow | null {
  if (typeof window === 'undefined') return null;

  try {
    const workflows = getClosingWorkflows();
    const index = workflows.findIndex(w => w.id === id);

    if (index === -1) return null;

    const updated = { ...workflows[index], ...updates };
    workflows[index] = updated;

    localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(workflows));
    return updated;
  } catch {
    return null;
  }
}

export function deleteClosingWorkflow(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const workflows = getClosingWorkflows();
    const filtered = workflows.filter(w => w.id !== id);

    localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function getClosingWorkflowByMonth(month: string): ClosingWorkflow | null {
  if (typeof window === 'undefined') return null;

  try {
    const workflows = getClosingWorkflows();
    const found = workflows.find(w => w.month === month);
    return found || null;
  } catch {
    return null;
  }
}
