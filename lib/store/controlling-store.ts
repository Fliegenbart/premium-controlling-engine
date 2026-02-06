'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  AnalysisResult,
  AccountDeviation,
  CostCenterDeviation,
  TripleAnalysisResult,
  Booking,
  LabKPIs,
  ChatMessage,
  ManagementSummary,
} from '@/lib/types';

/**
 * Entity Upload structure for managing file uploads
 */
export interface EntityUpload {
  id: string;
  name: string;
  prevFile: File | null;
  currFile: File | null;
  result: AnalysisResult | null;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  error?: string;
  expanded: boolean;
}

/**
 * Konzern Result structure for multi-entity analysis
 */
export interface KonzernResult {
  entities: { name: string; result: AnalysisResult; status: string }[];
  consolidated: AnalysisResult;
  benchmarks: {
    entity: string;
    totalPrev: number;
    totalCurr: number;
    deviation: number;
    deviationPercent: number;
    status: string;
  }[];
  managementSummary: string;
}

type AnalysisMode = 'single' | 'multi' | 'triple' | 'docs';
type WorkflowStatus = 'draft' | 'review' | 'approved';
type TabType = 'overview' | 'accounts' | 'costcenters' | 'evidence';

/**
 * Main Controlling Store State Interface
 */
export interface ControllingState {
  // ===== Navigation & UI State =====
  showApp: boolean;
  mode: AnalysisMode;
  activeTab: TabType;
  workflowStatus: WorkflowStatus;

  // ===== Entity & File Management =====
  entities: EntityUpload[];
  useMagicUpload: boolean;
  prevBookings: Booking[];
  currBookings: Booking[];
  prevFileName: string;
  currFileName: string;

  // ===== Analysis Results =====
  konzernResult: KonzernResult | null;
  tripleResult: TripleAnalysisResult | null;
  labKPIs: LabKPIs | null;

  // ===== UI Loading States =====
  isAnalyzing: boolean;
  isGeneratingReport: boolean;

  // ===== Selected Item State =====
  selectedDeviation: AccountDeviation | null;
  showEvidenceModal: boolean;

  // ===== Navigation Actions =====
  setShowApp: (show: boolean) => void;
  setMode: (mode: AnalysisMode) => void;
  setActiveTab: (tab: TabType) => void;
  setWorkflowStatus: (status: WorkflowStatus) => void;

  // ===== Entity Actions =====
  setEntities: (entities: EntityUpload[]) => void;
  addEntity: () => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<EntityUpload>) => void;
  setUseMagicUpload: (use: boolean) => void;

  // ===== Booking Actions =====
  setMagicPrev: (bookings: Booking[], fileName: string) => void;
  setMagicCurr: (bookings: Booking[], fileName: string) => void;
  clearBookings: () => void;

  // ===== Analysis Results Actions =====
  setKonzernResult: (result: KonzernResult | null) => void;
  setTripleResult: (result: TripleAnalysisResult | null) => void;
  setLabKPIs: (kpis: LabKPIs | null) => void;
  clearAnalysis: () => void;

  // ===== Loading State Actions =====
  setIsAnalyzing: (analyzing: boolean) => void;
  setIsGeneratingReport: (generating: boolean) => void;

  // ===== Deviation Actions =====
  setSelectedDeviation: (deviation: AccountDeviation | null) => void;
  setShowEvidenceModal: (show: boolean) => void;

  // ===== Computed/Derived State =====
  getFilteredDeviations: () => AccountDeviation[];
  getFilteredCostCenters: () => CostCenterDeviation[];
  getCurrentResult: () => AnalysisResult | null;
  hasValidData: () => boolean;
}

/**
 * Create the main controlling store with middleware
 */
const useControllingStore = create<ControllingState>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== Initial Navigation & UI State =====
        showApp: false,
        mode: 'single',
        activeTab: 'overview',
        workflowStatus: 'draft',

        // ===== Initial Entity & File Management =====
        entities: [
          {
            id: '1',
            name: '',
            prevFile: null,
            currFile: null,
            result: null,
            status: 'pending',
            expanded: true,
          },
        ],
        useMagicUpload: true,
        prevBookings: [],
        currBookings: [],
        prevFileName: '',
        currFileName: '',

        // ===== Initial Analysis Results =====
        konzernResult: null,
        tripleResult: null,
        labKPIs: null,

        // ===== Initial UI Loading States =====
        isAnalyzing: false,
        isGeneratingReport: false,

        // ===== Initial Selected Item State =====
        selectedDeviation: null,
        showEvidenceModal: false,

        // ===== Navigation Actions =====
        setShowApp: (show: boolean) => set({ showApp: show }),
        setMode: (mode: AnalysisMode) => set({ mode }),
        setActiveTab: (tab: TabType) => set({ activeTab: tab }),
        setWorkflowStatus: (status: WorkflowStatus) =>
          set({ workflowStatus: status }),

        // ===== Entity Actions =====
        setEntities: (entities: EntityUpload[]) => set({ entities }),

        addEntity: () => {
          const state = get();
          const newId = (Math.max(...state.entities.map(e => parseInt(e.id)), 0) + 1).toString();
          set({
            entities: [
              ...state.entities,
              {
                id: newId,
                name: '',
                prevFile: null,
                currFile: null,
                result: null,
                status: 'pending',
                expanded: true,
              },
            ],
          });
        },

        removeEntity: (id: string) => {
          const state = get();
          if (state.entities.length > 1) {
            set({
              entities: state.entities.filter(e => e.id !== id),
            });
          }
        },

        updateEntity: (id: string, updates: Partial<EntityUpload>) => {
          const state = get();
          set({
            entities: state.entities.map(e =>
              e.id === id ? { ...e, ...updates } : e
            ),
          });
        },

        setUseMagicUpload: (use: boolean) => set({ useMagicUpload: use }),

        // ===== Booking Actions =====
        setMagicPrev: (bookings: Booking[], fileName: string) => {
          set({
            prevBookings: bookings,
            prevFileName: fileName,
          });
        },

        setMagicCurr: (bookings: Booking[], fileName: string) => {
          set({
            currBookings: bookings,
            currFileName: fileName,
          });
        },

        clearBookings: () => {
          set({
            prevBookings: [],
            currBookings: [],
            prevFileName: '',
            currFileName: '',
          });
        },

        // ===== Analysis Results Actions =====
        setKonzernResult: (result: KonzernResult | null) => {
          set({ konzernResult: result });
        },

        setTripleResult: (result: TripleAnalysisResult | null) => {
          set({ tripleResult: result });
        },

        setLabKPIs: (kpis: LabKPIs | null) => {
          set({ labKPIs: kpis });
        },

        clearAnalysis: () => {
          set({
            konzernResult: null,
            tripleResult: null,
            labKPIs: null,
            selectedDeviation: null,
            showEvidenceModal: false,
          });
        },

        // ===== Loading State Actions =====
        setIsAnalyzing: (analyzing: boolean) => set({ isAnalyzing: analyzing }),
        setIsGeneratingReport: (generating: boolean) =>
          set({ isGeneratingReport: generating }),

        // ===== Deviation Actions =====
        setSelectedDeviation: (deviation: AccountDeviation | null) =>
          set({ selectedDeviation: deviation }),

        setShowEvidenceModal: (show: boolean) =>
          set({ showEvidenceModal: show }),

        // ===== Computed/Derived State =====
        getCurrentResult: () => {
          const state = get();
          if (state.mode === 'multi' && state.konzernResult) {
            return state.konzernResult.consolidated;
          }
          if (state.entities.length > 0 && state.entities[0].result) {
            return state.entities[0].result;
          }
          return null;
        },

        hasValidData: () => {
          const state = get();
          if (state.mode === 'multi') {
            return state.konzernResult !== null;
          }
          if (state.mode === 'triple') {
            return state.tripleResult !== null;
          }
          return (
            state.entities.length > 0 &&
            state.entities[0].result !== null
          );
        },

        getFilteredDeviations: () => {
          const state = get();
          const result = state.getCurrentResult();
          if (!result || !result.by_account) {
            return [];
          }
          return result.by_account;
        },

        getFilteredCostCenters: () => {
          const state = get();
          const result = state.getCurrentResult();
          if (!result || !result.by_cost_center) {
            return [];
          }
          return result.by_cost_center;
        },
      }),
      {
        name: 'controlling-store',
        // Only persist certain state to localStorage
        partialize: (state) => ({
          useMagicUpload: state.useMagicUpload,
          workflowStatus: state.workflowStatus,
          activeTab: state.activeTab,
          mode: state.mode,
        }),
      }
    ),
    {
      name: 'Controlling Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================
// Selector Hooks for Common Patterns
// ============================================

/**
 * Hook for accessing analysis-related state
 */
export const useAnalysis = () =>
  useControllingStore(state => ({
    entities: state.entities,
    konzernResult: state.konzernResult,
    tripleResult: state.tripleResult,
    labKPIs: state.labKPIs,
    currentResult: state.getCurrentResult(),
    hasValidData: state.hasValidData(),
    setKonzernResult: state.setKonzernResult,
    setTripleResult: state.setTripleResult,
    setLabKPIs: state.setLabKPIs,
    clearAnalysis: state.clearAnalysis,
  }));

/**
 * Hook for accessing UI state
 */
export const useUI = () =>
  useControllingStore(state => ({
    showApp: state.showApp,
    mode: state.mode,
    activeTab: state.activeTab,
    isAnalyzing: state.isAnalyzing,
    isGeneratingReport: state.isGeneratingReport,
    workflowStatus: state.workflowStatus,
    setShowApp: state.setShowApp,
    setMode: state.setMode,
    setActiveTab: state.setActiveTab,
    setIsAnalyzing: state.setIsAnalyzing,
    setIsGeneratingReport: state.setIsGeneratingReport,
    setWorkflowStatus: state.setWorkflowStatus,
  }));

/**
 * Hook for accessing entity management
 */
export const useEntities = () =>
  useControllingStore(state => ({
    entities: state.entities,
    addEntity: state.addEntity,
    removeEntity: state.removeEntity,
    updateEntity: state.updateEntity,
    setEntities: state.setEntities,
  }));

/**
 * Hook for accessing magic upload state
 */
export const useMagicUpload = () =>
  useControllingStore(state => ({
    useMagicUpload: state.useMagicUpload,
    prevBookings: state.prevBookings,
    currBookings: state.currBookings,
    prevFileName: state.prevFileName,
    currFileName: state.currFileName,
    setUseMagicUpload: state.setUseMagicUpload,
    setMagicPrev: state.setMagicPrev,
    setMagicCurr: state.setMagicCurr,
    clearBookings: state.clearBookings,
  }));

/**
 * Hook for accessing deviation/evidence state
 */
export const useDeviation = () =>
  useControllingStore(state => ({
    selectedDeviation: state.selectedDeviation,
    showEvidenceModal: state.showEvidenceModal,
    setSelectedDeviation: state.setSelectedDeviation,
    setShowEvidenceModal: state.setShowEvidenceModal,
  }));

/**
 * Hook for accessing filtered data
 */
export const useFilters = () =>
  useControllingStore(state => ({
    deviations: state.getFilteredDeviations(),
    costCenters: state.getFilteredCostCenters(),
  }));

// Export the main store hook
export default useControllingStore;
