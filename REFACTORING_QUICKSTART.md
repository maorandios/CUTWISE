# Refactoring Quick Start Guide

## Current Branch
```bash
refactor/component-optimization
```

## Quick Commands

### Check Current Status
```bash
git status
git branch
```

### Start Refactoring IFCViewer (First Priority)
```bash
cd web/src/components
mkdir -p IFCViewer/hooks IFCViewer/components IFCViewer/utils
```

### Commit Pattern
```bash
git add .
git commit -m "refactor(IFCViewer): extract [component/hook name]"
git push
```

---

## Refactoring Order (Priority)

### 1. IFCViewer.tsx (5,702 lines) - START HERE
**Target:** 5,702 → ~300 lines  
**Impact:** Highest token cost reduction

**First Extractions:**
1. `hooks/useCamera.ts` - Camera controls (~200 lines)
2. `hooks/useIFCLoader.ts` - File loading (~300 lines)
3. `utils/geometryUtils.ts` - Geometry functions (~400 lines)
4. `components/LoadingState.tsx` - Loading UI (~100 lines)

### 2. NestingReport.tsx (3,034 lines)
**Target:** 3,034 → ~400 lines

### 3. NestingReportPDF.tsx (1,636 lines)
**Target:** 1,636 → ~300 lines

### 4. PlateNestingTab.tsx (1,540 lines)
**Target:** 1,540 → ~350 lines

### 5. PreviewModal.tsx (743 lines)
**Target:** 743 → ~200 lines

---

## Testing After Each Extraction

### 1. Build Check
```bash
cd web
npm run build
```

### 2. Type Check
```bash
npm run type-check
# or
npx tsc --noEmit
```

### 3. Run App
```bash
cd ..
.\start-app.ps1
```

### 4. Manual Testing
- Upload an IFC file
- Test the feature you just refactored
- Verify no regressions

---

## File Size Tracking

### Before Refactoring
| File | Lines |
|------|-------|
| IFCViewer.tsx | 5,702 |
| NestingReport.tsx | 3,034 |
| NestingReportPDF.tsx | 1,636 |
| PlateNestingTab.tsx | 1,540 |
| PreviewModal.tsx | 743 |
| **TOTAL** | **12,655** |

### Target After Refactoring
| File | Lines | Reduction |
|------|-------|-----------|
| IFCViewer/index.tsx | ~300 | -94.7% |
| NestingReport/index.tsx | ~400 | -86.8% |
| NestingReportPDF/index.tsx | ~300 | -81.7% |
| PlateNestingTab/index.tsx | ~350 | -77.3% |
| PreviewModal/index.tsx | ~200 | -73.1% |
| **TOTAL** | **~1,550** | **-87.7%** |

**Token Cost Reduction: ~85%** 🎉

---

## Extraction Template

### For Hooks
```typescript
// hooks/useFeature.ts
import { useState, useEffect, useRef } from 'react'

export function useFeature(/* params */) {
  // State
  const [state, setState] = useState(/* initial */)
  
  // Refs
  const ref = useRef(/* initial */)
  
  // Effects
  useEffect(() => {
    // logic
  }, [/* deps */])
  
  // Methods
  const method = () => {
    // logic
  }
  
  return {
    state,
    method,
    // ... exports
  }
}
```

### For Components
```typescript
// components/Feature.tsx
import React from 'react'

interface FeatureProps {
  // props
}

export function Feature({ /* props */ }: FeatureProps) {
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### For Utils
```typescript
// utils/featureUtils.ts

export function utilFunction(/* params */) {
  // pure function logic
  return result
}

export const CONSTANTS = {
  // constants
}
```

---

## Common Patterns to Extract

### 1. State Management → Custom Hook
```typescript
// Before: In component
const [state1, setState1] = useState()
const [state2, setState2] = useState()
useEffect(() => { /* complex logic */ }, [])

// After: Extract to hook
const { state1, state2, method } = useFeature()
```

### 2. Event Handlers → Methods in Hook
```typescript
// Before: In component
const handleClick = () => { /* logic */ }
const handleChange = () => { /* logic */ }

// After: In hook
return { handleClick, handleChange }
```

### 3. UI Sections → Sub-components
```typescript
// Before: In main component
<div>
  <div>{/* 100 lines of UI */}</div>
  <div>{/* 100 lines of UI */}</div>
</div>

// After: Extract components
<div>
  <Section1 />
  <Section2 />
</div>
```

### 4. Utility Functions → Utils File
```typescript
// Before: In component
function calculateSomething() { /* logic */ }
function formatData() { /* logic */ }

// After: In utils file
export { calculateSomething, formatData }
```

---

## Troubleshooting

### Import Errors After Extraction
- Check relative paths
- Verify exports are correct
- Use barrel exports (`index.ts`)

### Type Errors
- Extract types to `types.ts` first
- Import types explicitly
- Use `import type { }` for type-only imports

### Circular Dependencies
- Move shared types to separate file
- Use dependency injection
- Restructure if necessary

### Tests Failing
- Update test imports
- Mock extracted modules
- Verify functionality unchanged

---

## Progress Tracking

Use checkboxes in `REFACTORING_PLAN.md` to track progress:
- [ ] Task not started
- [x] Task completed

---

## Need Help?

Refer to the detailed `REFACTORING_PLAN.md` for:
- Complete extraction plans
- Target file structures
- Implementation guidelines
- Success metrics

---

**Remember:** Test after each extraction! Small, incremental changes are safer.

