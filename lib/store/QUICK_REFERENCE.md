# Controlling Store - Quick Reference

## Installation Status
✅ Zustand installed via npm
✅ Store created at `/lib/store/controlling-store.ts`
✅ Ready to integrate into page.tsx

## Quick Start

### 1. Import at the top of page.tsx
```typescript
'use client';

import useControllingStore, {
  useUI,
  useEntities,
  useMagicUpload,
  useAnalysis,
  useDeviation,
} from '@/lib/store';
```

### 2. Use in component
```typescript
export default function Home() {
  const { showApp, setShowApp } = useUI();
  const { entities, addEntity } = useEntities();
  // ... more selectors
}
```

## State Coverage

The store replaces all 15 useState calls from page.tsx:

| useState Call | Replaced By | Hook |
|---------------|-------------|------|
| showApp | useUI().showApp | useUI |
| mode | useUI().mode | useUI |
| entities | useEntities().entities | useEntities |
| konzernResult | useAnalysis().konzernResult | useAnalysis |
| tripleResult | useAnalysis().tripleResult | useAnalysis |
| isAnalyzing | useUI().isAnalyzing | useUI |
| isGeneratingReport | useUI().isGeneratingReport | useUI |
| activeTab | useUI().activeTab | useUI |
| workflowStatus | useUI().workflowStatus | useUI |
| selectedDeviation | useDeviation().selectedDeviation | useDeviation |
| showEvidenceModal | useDeviation().showEvidenceModal | useDeviation |
| labKPIs | useAnalysis().labKPIs | useAnalysis |
| useMagicUpload | useMagicUpload().useMagicUpload | useMagicUpload |
| prevBookings | useMagicUpload().prevBookings | useMagicUpload |
| currBookings | useMagicUpload().currBookings | useMagicUpload |
| prevFileName | useMagicUpload().prevFileName | useMagicUpload |
| currFileName | useMagicUpload().currFileName | useMagicUpload |

## Selector Hooks Cheat Sheet

### useUI() - Navigation & Loading
```typescript
const {
  showApp, setShowApp,                    // Hero/App toggle
  mode, setMode,                          // 'single'|'multi'|'triple'|'docs'
  activeTab, setActiveTab,                // Tab navigation
  isAnalyzing, setIsAnalyzing,            // Loading state
  isGeneratingReport, setIsGeneratingReport, // Report generation
  workflowStatus, setWorkflowStatus,      // 'draft'|'review'|'approved'
} = useUI();
```

### useEntities() - File & Entity Management
```typescript
const {
  entities,           // EntityUpload[] array
  addEntity,          // () => void
  removeEntity,       // (id: string) => void
  updateEntity,       // (id: string, updates) => void
  setEntities,        // (entities) => void
} = useEntities();
```

### useMagicUpload() - Booking Data
```typescript
const {
  useMagicUpload,     // boolean - feature toggle
  prevBookings,       // Booking[] - prior year
  currBookings,       // Booking[] - current year
  prevFileName,       // string - for UI display
  currFileName,       // string - for UI display
  setUseMagicUpload,  // (use: boolean) => void
  setMagicPrev,       // (bookings, fileName) => void
  setMagicCurr,       // (bookings, fileName) => void
  clearBookings,      // () => void
} = useMagicUpload();
```

### useAnalysis() - Results & KPIs
```typescript
const {
  entities,           // EntityUpload[]
  konzernResult,      // KonzernResult | null
  tripleResult,       // TripleAnalysisResult | null
  labKPIs,            // LabKPIs | null
  currentResult,      // AnalysisResult | null (COMPUTED)
  hasValidData,       // boolean (COMPUTED)
  setKonzernResult,   // (result) => void
  setTripleResult,    // (result) => void
  setLabKPIs,         // (kpis) => void
  clearAnalysis,      // () => void
} = useAnalysis();
```

### useDeviation() - Evidence Modal
```typescript
const {
  selectedDeviation,      // AccountDeviation | null
  showEvidenceModal,      // boolean
  setSelectedDeviation,   // (deviation) => void
  setShowEvidenceModal,   // (show: boolean) => void
} = useDeviation();
```

### useFilters() - Computed Filtered Data
```typescript
const {
  deviations,     // AccountDeviation[] (COMPUTED)
  costCenters,    // CostCenterDeviation[] (COMPUTED)
} = useFilters();
```

## Direct Store Access (when needed)

For advanced use cases, access the store directly:

```typescript
import useControllingStore from '@/lib/store';

const store = useControllingStore();

// Direct access to any state
const showApp = store.showApp;
const entities = store.entities;

// Direct action calls
store.setShowApp(true);
store.addEntity();

// Computed values
const result = store.getCurrentResult();
const hasData = store.hasValidData();
```

## Useful Patterns

### Pattern 1: Toggle UI Element
```typescript
const { showEvidenceModal, setShowEvidenceModal } = useDeviation();

<button onClick={() => setShowEvidenceModal(!showEvidenceModal)}>
  Toggle Evidence
</button>
```

### Pattern 2: Conditional Rendering
```typescript
const { hasValidData, mode } = useAnalysis();
const { showApp } = useUI();

if (!showApp) return <HeroSection />;
if (!hasValidData) return <UploadSection />;
return <ResultsSection />;
```

### Pattern 3: Handle File Upload
```typescript
const { updateEntity } = useEntities();

const handleFileChange = (entityId: string, file: File, field: 'prev'|'curr') => {
  updateEntity(entityId, {
    [field === 'prev' ? 'prevFile' : 'currFile']: file,
  });
};
```

### Pattern 4: Entity Operations
```typescript
const { entities, addEntity, removeEntity } = useEntities();

<button onClick={addEntity}>Add Entity</button>

{entities.map(entity => (
  <button key={entity.id} onClick={() => removeEntity(entity.id)}>
    Remove
  </button>
))}
```

### Pattern 5: Analysis Workflow
```typescript
const { isAnalyzing, setIsAnalyzing } = useUI();
const { setKonzernResult, setLabKPIs } = useAnalysis();

const handleAnalysis = async () => {
  setIsAnalyzing(true);
  try {
    const result = await fetch('/api/analyze-multi').then(r => r.json());
    setKonzernResult(result);
    // Optional KPIs
    if (result.kpis) setLabKPIs(result.kpis);
  } finally {
    setIsAnalyzing(false);
  }
};
```

## Persistence (Automatic)

These values are automatically saved to localStorage:
- `mode` - Analysis mode preference
- `activeTab` - Current tab selection
- `workflowStatus` - Workflow progress
- `useMagicUpload` - Upload method preference

Persisted data loads automatically on page reload. To clear:
```javascript
localStorage.removeItem('controlling-store');
```

## DevTools (Development Only)

The store integrates with Redux DevTools. To use:
1. Install Redux DevTools browser extension
2. Open DevTools and find the "Redux" tab
3. View all state changes and action history
4. Time-travel debug through actions

Enable/disable in browser console:
```javascript
// View all actions and state
localStorage.setItem('debug', 'zustand:*');
```

## Files Reference

```
lib/store/
├── controlling-store.ts       (Main store implementation - 424 lines)
├── index.ts                   (Re-exports for easy importing)
├── MIGRATION_GUIDE.md         (Detailed refactoring guide)
├── EXAMPLE_REFACTORING.md     (Before/after code examples)
└── QUICK_REFERENCE.md         (This file)
```

## Type Safety

All selectors are fully typed:

```typescript
// TypeScript knows these types
const { mode, setMode } = useUI();
//     ^-- 'single'|'multi'|'triple'|'docs'

// This is a type error:
setMode('invalid'); // ❌ TypeScript error

// This is correct:
setMode('single'); // ✅ OK
```

## Performance Tips

1. **Use granular selectors**: `useUI()` instead of `useControllingStore()`
2. **Avoid inline callbacks**: Use `useCallback` if needed
3. **Check dependencies**: Ensure minimal re-renders
4. **Use computed state**: `getCurrentResult()` is cached by store
5. **Only persist needed data**: Config-like state, not all analysis results

## Common Issues & Solutions

### Issue: "showApp is undefined"
**Solution**: Make sure you imported useUI hook
```typescript
const { showApp } = useUI(); // ✅ Correct
const showApp = useControllingStore().showApp; // Works but verbose
```

### Issue: State not persisting
**Solution**: Check localStorage hasn't been cleared
```javascript
// Clear to reset
localStorage.removeItem('controlling-store');
```

### Issue: Unexpected re-renders
**Solution**: Use more specific selector
```typescript
// ❌ Re-renders on any state change
const store = useControllingStore();

// ✅ Re-renders only if showApp changes
const { showApp } = useUI();
```

### Issue: Type errors with actions
**Solution**: Ensure correct action signature
```typescript
// ❌ Wrong parameter count
updateEntity(id);

// ✅ Correct
updateEntity(id, { status: 'analyzing' });
```

## Integration Checklist

When integrating into page.tsx:

- [ ] Import store selectors at top
- [ ] Replace useState calls with selector hooks
- [ ] Update action calls (e.g., updateEntity)
- [ ] Test navigation between hero and app
- [ ] Test entity upload and analysis
- [ ] Test modal display/close
- [ ] Test localStorage persistence
- [ ] Test in Firefox/Chrome DevTools
- [ ] Test on mobile viewport
- [ ] Verify no console errors

## Support & Resources

- **Zustand Docs**: https://github.com/pmndrs/zustand
- **Migration Guide**: See MIGRATION_GUIDE.md
- **Code Examples**: See EXAMPLE_REFACTORING.md
- **Store Source**: lib/store/controlling-store.ts

---

**Created**: 2026-02-06
**Status**: Ready for integration
**Next Step**: Import and use in page.tsx
