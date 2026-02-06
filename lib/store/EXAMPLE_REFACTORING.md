# Example: Refactoring page.tsx with the Controlling Store

This document shows concrete before/after examples of how to refactor the main page.tsx file to use the new Zustand store.

## Example 1: Component Function Signature

### Before (with useState)
```typescript
export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [entities, setEntities] = useState<EntityUpload[]>([
    { id: '1', name: 'Ganzimmun Diagnostics', prevFile: null, currFile: null, result: null, status: 'pending', expanded: true },
  ]);
  const [konzernResult, setKonzernResult] = useState<KonzernResult | null>(null);
  const [tripleResult, setTripleResult] = useState<TripleAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'costcenters' | 'evidence'>('overview');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('draft');
  const [selectedDeviation, setSelectedDeviation] = useState<AccountDeviation | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [labKPIs, setLabKPIs] = useState<LabKPIs | null>(null);
  const [useMagicUpload, setUseMagicUpload] = useState(true);
  const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
  const [currBookings, setCurrBookings] = useState<Booking[]>([]);
  const [prevFileName, setPrevFileName] = useState('');
  const [currFileName, setCurrFileName] = useState('');

  // ... 50+ lines of helper functions and hooks
}
```

### After (with Store)
```typescript
'use client';

import useControllingStore, {
  useUI,
  useEntities,
  useMagicUpload,
  useAnalysis,
  useDeviation,
} from '@/lib/store';

export default function Home() {
  // UI and navigation
  const {
    showApp, setShowApp,
    mode, setMode,
    activeTab, setActiveTab,
    isAnalyzing, setIsAnalyzing,
    isGeneratingReport, setIsGeneratingReport,
    workflowStatus, setWorkflowStatus
  } = useUI();

  // Entity management
  const { entities, addEntity, removeEntity, updateEntity } = useEntities();

  // Magic upload
  const {
    useMagicUpload, setUseMagicUpload,
    prevBookings, currBookings,
    prevFileName, currFileName,
    setMagicPrev, setMagicCurr, clearBookings
  } = useMagicUpload();

  // Analysis results
  const {
    konzernResult, tripleResult, labKPIs,
    setKonzernResult, setTripleResult, setLabKPIs,
    currentResult, hasValidData
  } = useAnalysis();

  // Evidence modal
  const {
    selectedDeviation, showEvidenceModal,
    setSelectedDeviation, setShowEvidenceModal
  } = useDeviation();

  // ... handler functions remain largely the same
}
```

## Example 2: Magic Upload Handler Functions

### Before
```typescript
const handleMagicPrev = (bookings: Booking[], fileName: string) => {
  setPrevBookings(bookings);
  setPrevFileName(fileName);
};

const handleMagicCurr = (bookings: Booking[], fileName: string) => {
  setCurrBookings(bookings);
  setCurrFileName(fileName);
};

const analyzeMagic = async () => {
  if (prevBookings.length === 0 || currBookings.length === 0) return;

  const entity = entities[0];
  updateEntity(entity.id, { status: 'analyzing' });
  setIsAnalyzing(true);

  try {
    const response = await fetch('/api/analyze-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prevBookings,
        currBookings,
      }),
    });

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

### After
```typescript
const handleMagicPrev = (bookings: Booking[], fileName: string) => {
  setMagicPrev(bookings, fileName);
};

const handleMagicCurr = (bookings: Booking[], fileName: string) => {
  setMagicCurr(bookings, fileName);
};

const analyzeMagic = async () => {
  if (prevBookings.length === 0 || currBookings.length === 0) return;

  const entity = entities[0];
  updateEntity(entity.id, { status: 'analyzing' });
  setIsAnalyzing(true);

  try {
    const response = await fetch('/api/analyze-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prevBookings,
        currBookings,
      }),
    });

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

**Key differences:**
- Less boilerplate with `setMagicPrev` and `setMagicCurr`
- Store methods handle both bookings and filename in one call
- Rest of logic remains identical (handlers are just thin wrappers)

## Example 3: Entity Management

### Before
```typescript
const addEntity = () => {
  const newId = (Math.max(...entities.map(e => parseInt(e.id))) + 1).toString();
  setEntities([...entities, {
    id: newId,
    name: '',
    prevFile: null,
    currFile: null,
    result: null,
    status: 'pending',
    expanded: true,
  }]);
};

const removeEntity = (id: string) => {
  if (entities.length > 1) {
    setEntities(entities.filter(e => e.id !== id));
  }
};

const updateEntity = (id: string, updates: Partial<EntityUpload>) => {
  setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
};
```

### After
```typescript
// These are now store actions - just call them directly!
// No need to reimplement in the component

// In JSX:
<button onClick={addEntity}>Add Entity</button>
<button onClick={() => removeEntity(entityId)}>Remove</button>
```

**Benefits:**
- No need to duplicate logic in every component
- Logic lives in the store, shared across app
- Cleaner component code

## Example 4: Computed State Usage

### Before
```typescript
// Computed on every render (wasteful)
const hasValidData = mode === 'multi'
  ? konzernResult !== null
  : mode === 'triple'
  ? tripleResult !== null
  : entities[0]?.result !== null;

const currentResult = mode === 'multi'
  ? konzernResult?.consolidated
  : entities[0]?.result;

// Used multiple times in JSX:
{hasValidData && (
  <div>
    {/* ... */}
  </div>
)}

// Later in JSX:
{currentResult && currentResult.by_account?.map(...)}
```

### After
```typescript
// Single store call gets both
const { currentResult, hasValidData } = useAnalysis();

// Or use store directly
const store = useControllingStore();
const hasValidData = store.hasValidData();
const currentResult = store.getCurrentResult();

// Used multiple times in JSX - state is pre-computed in store:
{hasValidData && (
  <div>
    {/* ... */}
  </div>
)}

// Later in JSX - same, cleaner reference:
{currentResult && currentResult.by_account?.map(...)}
```

## Example 5: Modal and Evidence Display

### Before
```typescript
const [selectedDeviation, setSelectedDeviation] = useState<AccountDeviation | null>(null);
const [showEvidenceModal, setShowEvidenceModal] = useState(false);

// In JSX header:
{showEvidenceModal && selectedDeviation && (
  <EvidenceModal
    deviation={selectedDeviation}
    onClose={() => setShowEvidenceModal(false)}
  />
)}

// In table row click handler:
<button
  onClick={() => {
    setSelectedDeviation(dev);
    setShowEvidenceModal(true);
  }}
  className="w-full flex items-center justify-between..."
>
  {/* content */}
</button>
```

### After
```typescript
const { selectedDeviation, showEvidenceModal, setSelectedDeviation, setShowEvidenceModal } = useDeviation();

// In JSX header - identical:
{showEvidenceModal && selectedDeviation && (
  <EvidenceModal
    deviation={selectedDeviation}
    onClose={() => setShowEvidenceModal(false)}
  />
)}

// In table row click handler - identical:
<button
  onClick={() => {
    setSelectedDeviation(dev);
    setShowEvidenceModal(true);
  }}
  className="w-full flex items-center justify-between..."
>
  {/* content */}
</button>
```

**No JSX changes needed!** The store is a drop-in replacement for useState.

## Example 6: Multi-Entity Analysis

### Before
```typescript
const analyzeMulti = async () => {
  const validEntities = entities.filter(e => e.prevFile && e.currFile && e.name);
  if (validEntities.length === 0) return;
  setIsAnalyzing(true);
  setKonzernResult(null);
  try {
    const entityInputs = await Promise.all(
      validEntities.map(async e => ({
        name: e.name,
        prevCSV: await readFileAsText(e.prevFile!),
        currCSV: await readFileAsText(e.currFile!),
      }))
    );
    const formData = new FormData();
    formData.append('entities', JSON.stringify(entityInputs));
    const response = await fetch('/api/analyze-multi', { method: 'POST', body: formData });
    const result = await response.json();
    if (response.ok) {
      setKonzernResult(result);
      validEntities.forEach((entity, idx) => {
        const entityResult = result.entities[idx];
        updateEntity(entity.id, {
          result: entityResult?.result || null,
          status: entityResult?.status === 'success' ? 'success' : 'error',
          error: entityResult?.error,
        });
      });
    }
  } catch (error) {
    console.error('Multi-analysis failed:', error);
  } finally {
    setIsAnalyzing(false);
  }
};
```

### After
```typescript
const analyzeMulti = async () => {
  const validEntities = entities.filter(e => e.prevFile && e.currFile && e.name);
  if (validEntities.length === 0) return;
  setIsAnalyzing(true);
  setKonzernResult(null);  // Store action now
  try {
    const entityInputs = await Promise.all(
      validEntities.map(async e => ({
        name: e.name,
        prevCSV: await readFileAsText(e.prevFile!),
        currCSV: await readFileAsText(e.currFile!),
      }))
    );
    const formData = new FormData();
    formData.append('entities', JSON.stringify(entityInputs));
    const response = await fetch('/api/analyze-multi', { method: 'POST', body: formData });
    const result = await response.json();
    if (response.ok) {
      setKonzernResult(result);  // Store action now
      validEntities.forEach((entity, idx) => {
        const entityResult = result.entities[idx];
        updateEntity(entity.id, {
          result: entityResult?.result || null,
          status: entityResult?.status === 'success' ? 'success' : 'error',
          error: entityResult?.error,
        });
      });
    }
  } catch (error) {
    console.error('Multi-analysis failed:', error);
  } finally {
    setIsAnalyzing(false);  // Store action now
  }
};
```

**Main change:**
- `setKonzernResult` and `setIsAnalyzing` are now store actions
- They're passed in via the selector hook at the top of the component
- Business logic remains identical

## Example 7: Refactored Hero/Landing Page Toggle

### Before
```typescript
const [showApp, setShowApp] = useState(false);

// ... later in JSX:
if (!showApp) {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Hero Section */}
      {/* ... lots of JSX ... */}
      <button
        onClick={() => setShowApp(true)}
        className="group px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600..."
      >
        Jetzt starten – kostenlos
      </button>
    </main>
  );
}

// Main App
return (
  <main className="min-h-screen bg-[#0a0a0f]">
    {/* App content */}
  </main>
);
```

### After
```typescript
const { showApp, setShowApp } = useUI();

// ... later in JSX (unchanged):
if (!showApp) {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Hero Section */}
      {/* ... lots of JSX ... */}
      <button
        onClick={() => setShowApp(true)}
        className="group px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600..."
      >
        Jetzt starten – kostenlos
      </button>
    </main>
  );
}

// Main App (unchanged)
return (
  <main className="min-h-screen bg-[#0a0a0f]">
    {/* App content */}
  </main>
);
```

**No JSX changes required!** Just use the store selector at the top.

## Summary of Changes

| Aspect | Before | After | Benefit |
|--------|--------|-------|---------|
| State declarations | 15 useState calls | 1 store hook + selectors | Less code, clearer intent |
| State management | Component-level | Centralized store | Easier to debug, share state |
| Helpers like `addEntity` | Component methods | Store actions | Reusable across app |
| Computed values | Inline calculations | Store computed | Performance, clarity |
| Persistence | None | Automatic | Users' preferences saved |
| DevTools | None | Redux DevTools | Better debugging |
| Testing | Manual mocking | Mock one store | Easier to test |

## Performance Impact

- **Before**: Each useState update could trigger unnecessary re-renders
- **After**: Components only re-render when their selector dependencies change
- **Example**: If only `showApp` changes, components using other selectors won't re-render

## Migration Effort Estimate

- **First selector hook**: ~5 minutes (copy/paste imports)
- **Remaining selectors**: ~1 minute each
- **Update JSX**: 0 minutes (unchanged)
- **Update handlers**: 1-2 minutes per handler
- **Total**: ~30-45 minutes for entire page.tsx

## Rollback

If you need to revert at any point:
1. Save the refactored version
2. Restore from backup
3. Keep the store file - it's self-contained and doesn't break anything

---

For more details, see MIGRATION_GUIDE.md
