# Zustand Store Migration Guide

This guide explains how to refactor `app/page.tsx` to use the new Zustand-based controlling store instead of 15+ `useState` calls.

## Overview

The new store consolidates all application state into a single, centralized location with:
- **15 useState hooks** replaced with **1 main store hook** + specialized selector hooks
- **Automatic localStorage persistence** for configuration and UI state
- **Redux DevTools integration** for debugging
- **Type-safe selectors** for accessing state subsets
- **Computed state** for derived values like `getCurrentResult()` and `hasValidData()`

## Store Structure

### Main Store Location
```
lib/store/
  ├── controlling-store.ts  (main store implementation)
  └── index.ts             (re-exports for easy importing)
```

### Store Usage Pattern

Instead of:
```typescript
const [showApp, setShowApp] = useState(false);
const [mode, setMode] = useState<AnalysisMode>('single');
const [entities, setEntities] = useState<EntityUpload[]>([...]);
// ... 12 more useState calls
```

Use:
```typescript
const store = useControllingStore();
// or use specialized selectors:
const { showApp, mode } = useUI();
const { entities, addEntity, removeEntity } = useEntities();
```

## Migration Steps

### Step 1: Import the Store

Replace all useState imports with store imports:

```typescript
// OLD (before)
import { useState } from 'react';

// NEW (after)
'use client';
import useControllingStore, {
  useUI,
  useEntities,
  useMagicUpload,
  useAnalysis,
  useDeviation,
} from '@/lib/store';
```

### Step 2: Replace useState Calls

#### Navigation & UI State

**Before:**
```typescript
const [showApp, setShowApp] = useState(false);
const [mode, setMode] = useState<AnalysisMode>('single');
const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'costcenters' | 'evidence'>('overview');
const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft');
```

**After:**
```typescript
const { showApp, setShowApp, mode, setMode, activeTab, setActiveTab, workflowStatus, setWorkflowStatus } = useUI();
```

#### Entity Management

**Before:**
```typescript
const [entities, setEntities] = useState<EntityUpload[]>([
  { id: '1', name: 'Ganzimmun Diagnostics', ... },
]);
const [useMagicUpload, setUseMagicUpload] = useState(true);
```

**After:**
```typescript
const { entities, addEntity, removeEntity, updateEntity } = useEntities();
const { useMagicUpload, setUseMagicUpload } = useMagicUpload();

// Helper functions now use store actions:
const handleAddEntity = () => addEntity();
const handleRemoveEntity = (id: string) => removeEntity(id);
const handleUpdateEntity = (id: string, updates: Partial<EntityUpload>) => updateEntity(id, updates);
```

#### Magic Upload & Bookings

**Before:**
```typescript
const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
const [currBookings, setCurrBookings] = useState<Booking[]>([]);
const [prevFileName, setPrevFileName] = useState('');
const [currFileName, setCurrFileName] = useState('');

const handleMagicPrev = (bookings: Booking[], fileName: string) => {
  setPrevBookings(bookings);
  setPrevFileName(fileName);
};
```

**After:**
```typescript
const { prevBookings, currBookings, prevFileName, currFileName, setMagicPrev, setMagicCurr } = useMagicUpload();

const handleMagicPrev = (bookings: Booking[], fileName: string) => {
  setMagicPrev(bookings, fileName);
};

const handleMagicCurr = (bookings: Booking[], fileName: string) => {
  setMagicCurr(bookings, fileName);
};
```

#### Analysis Results

**Before:**
```typescript
const [konzernResult, setKonzernResult] = useState<KonzernResult | null>(null);
const [tripleResult, setTripleResult] = useState<TripleAnalysisResult | null>(null);
const [labKPIs, setLabKPIs] = useState<LabKPIs | null>(null);
```

**After:**
```typescript
const { konzernResult, tripleResult, labKPIs, setKonzernResult, setTripleResult, setLabKPIs, clearAnalysis } = useAnalysis();
```

#### Loading States

**Before:**
```typescript
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isGeneratingReport, setIsGeneratingReport] = useState(false);
```

**After:**
```typescript
const { isAnalyzing, setIsAnalyzing, isGeneratingReport, setIsGeneratingReport } = useUI();
```

#### Deviation/Evidence State

**Before:**
```typescript
const [selectedDeviation, setSelectedDeviation] = useState<AccountDeviation | null>(null);
const [showEvidenceModal, setShowEvidenceModal] = useState(false);
```

**After:**
```typescript
const { selectedDeviation, showEvidenceModal, setSelectedDeviation, setShowEvidenceModal } = useDeviation();
```

### Step 3: Update Computed Values

**Before:**
```typescript
const hasValidData = mode === 'multi' ? konzernResult !== null : mode === 'triple' ? tripleResult !== null : entities[0]?.result !== null;
const currentResult = mode === 'multi' ? konzernResult?.consolidated : entities[0]?.result;
```

**After:**
```typescript
const store = useControllingStore();
const hasValidData = store.hasValidData();
const currentResult = store.getCurrentResult();

// Or use the analysis selector:
const { currentResult, hasValidData } = useAnalysis();
```

### Step 4: Update Function Implementation

Functions like `analyzeSingle`, `analyzeMulti`, etc. remain largely the same, but use store actions:

```typescript
const analyzeSingle = async (entity: EntityUpload) => {
  if (!entity.prevFile || !entity.currFile) return;

  // Use store action instead of setState
  updateEntity(entity.id, { status: 'analyzing' });
  setIsAnalyzing(true);

  try {
    const formData = new FormData();
    formData.append('prevFile', entity.prevFile);
    formData.append('currFile', entity.currFile);
    const response = await fetch('/api/analyze', { method: 'POST', body: formData });
    const result = await response.json();

    if (response.ok) {
      updateEntity(entity.id, { result, status: 'success' });
    } else {
      updateEntity(entity.id, { status: 'error', error: result.error });
    }
  } catch (error) {
    updateEntity(entity.id, { status: 'error', error: 'Analyse fehlgeschlagen' });
  } finally {
    setIsAnalyzing(false);
  }
};
```

### Step 5: Simplify useEffect Dependencies

With store selectors, dependencies become clearer:

```typescript
// OLD: Dependency tracking with useState
useEffect(() => {
  // ... logic
}, [showApp, mode, entities]);

// NEW: More granular with selectors
useEffect(() => {
  // ... logic
}, [showApp, mode]);
```

## Selector Hooks Reference

### `useUI()`
```typescript
const {
  showApp,                    // boolean
  mode,                       // 'single' | 'multi' | 'triple' | 'docs'
  activeTab,                  // 'overview' | 'accounts' | 'costcenters' | 'evidence'
  isAnalyzing,                // boolean
  isGeneratingReport,         // boolean
  workflowStatus,             // 'draft' | 'review' | 'approved'
  setShowApp,                 // (show: boolean) => void
  setMode,                    // (mode) => void
  setActiveTab,               // (tab) => void
  setIsAnalyzing,             // (analyzing) => void
  setIsGeneratingReport,      // (generating) => void
  setWorkflowStatus,          // (status) => void
} = useUI();
```

### `useEntities()`
```typescript
const {
  entities,                   // EntityUpload[]
  addEntity,                  // () => void
  removeEntity,               // (id: string) => void
  updateEntity,               // (id: string, updates) => void
  setEntities,                // (entities) => void
} = useEntities();
```

### `useMagicUpload()`
```typescript
const {
  useMagicUpload,             // boolean
  prevBookings,               // Booking[]
  currBookings,               // Booking[]
  prevFileName,               // string
  currFileName,               // string
  setUseMagicUpload,          // (use: boolean) => void
  setMagicPrev,               // (bookings, fileName) => void
  setMagicCurr,               // (bookings, fileName) => void
  clearBookings,              // () => void
} = useMagicUpload();
```

### `useAnalysis()`
```typescript
const {
  entities,                   // EntityUpload[]
  konzernResult,              // KonzernResult | null
  tripleResult,               // TripleAnalysisResult | null
  labKPIs,                    // LabKPIs | null
  currentResult,              // AnalysisResult | null (computed)
  hasValidData,               // boolean (computed)
  setKonzernResult,           // (result) => void
  setTripleResult,            // (result) => void
  setLabKPIs,                 // (kpis) => void
  clearAnalysis,              // () => void
} = useAnalysis();
```

### `useDeviation()`
```typescript
const {
  selectedDeviation,          // AccountDeviation | null
  showEvidenceModal,          // boolean
  setSelectedDeviation,       // (deviation) => void
  setShowEvidenceModal,       // (show) => void
} = useDeviation();
```

### `useFilters()`
```typescript
const {
  deviations,                 // AccountDeviation[] (computed)
  costCenters,                // CostCenterDeviation[] (computed)
} = useFilters();
```

## Persistence

The store automatically persists these properties to localStorage:
- `useMagicUpload` - User preference for upload mode
- `workflowStatus` - Current workflow status
- `activeTab` - Currently selected tab
- `mode` - Current analysis mode

This means users' preferences are preserved across page reloads.

## DevTools Integration

In development mode, the store is integrated with Redux DevTools. You can:
1. Install Redux DevTools browser extension
2. Open DevTools to see state changes
3. Time-travel debug through actions
4. Export/import state snapshots

## Common Patterns

### Pattern 1: Conditional Rendering Based on State

```typescript
// Instead of reading multiple state variables
if (showApp && mode === 'single' && useMagicUpload) {
  // render magic upload
}

// More organized with selector:
const { showApp, mode } = useUI();
const { useMagicUpload } = useMagicUpload();

if (showApp && mode === 'single' && useMagicUpload) {
  // render magic upload
}
```

### Pattern 2: Batch Updates

```typescript
// Multiple updates on same action
const handleAnalysisComplete = (result: AnalysisResult) => {
  updateEntity(entity.id, { result, status: 'success' });
  setIsAnalyzing(false);
  // These are batched efficiently
};
```

### Pattern 3: Derived State

```typescript
// Instead of calculating in render:
const store = useControllingStore();
const hasData = store.hasValidData();  // computed
const result = store.getCurrentResult();  // computed
```

## Benefits of Migration

1. **Reduced Re-renders**: Components only re-render when subscribed state changes
2. **Cleaner Code**: No prop drilling, no useState nesting
3. **Persistence**: Automatic localStorage saving for key state
4. **Debugging**: Redux DevTools integration
5. **Scalability**: Easy to add new state without component refactoring
6. **Type Safety**: Full TypeScript support with inference

## Rollback Strategy

If you need to revert:
1. Keep the old page.tsx backed up
2. The store is self-contained in `lib/store/`
3. Simply remove the store imports and revert to useState calls

## Testing

When testing components that use the store:

```typescript
// Mock the store in tests
jest.mock('@/lib/store', () => ({
  useControllingStore: jest.fn(),
  useUI: jest.fn(),
  // ... other selector mocks
}));

// Set up default mock values
beforeEach(() => {
  useUI.mockReturnValue({
    showApp: true,
    mode: 'single',
    // ... other values
  });
});
```

## Performance Considerations

- **Selector granularity**: Use specific selectors (e.g., `useUI()`) instead of `useControllingStore()` when possible to reduce re-renders
- **Computed state**: `getCurrentResult()` and `hasValidData()` are computed on demand, not cached
- **Persistence**: Only whitelist state that needs persistence to keep localStorage size minimal

## Next Steps

1. Start with the main store import in page.tsx
2. Replace useState calls one section at a time
3. Test thoroughly after each section
4. Use Redux DevTools to verify state changes
5. Clean up old useSavedAnalyses hook if redundant with store

## Troubleshooting

### State not persisting
- Check that property is in the `persist` whitelist
- Clear browser localStorage and reload
- Verify `persist` middleware is configured correctly

### Type errors
- Ensure all types are imported from `@/lib/types` and `@/lib/store`
- Use selector hooks for better type inference

### Unexpected re-renders
- Check that you're using the most granular selector for your needs
- Avoid inline functions as dependencies
- Use `useCallback` if passing handlers to optimized children

---

For questions or issues, refer to the Zustand documentation:
https://github.com/pmndrs/zustand
