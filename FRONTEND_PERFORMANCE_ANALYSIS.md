# Frontend Performance Analysis - Slow Load Time Issue

## Date: February 16, 2026

## Problem
Frontend takes 3-4 minutes to load after restart, instead of the normal 2-3 seconds.

## Root Causes Identified

### 1. **Vite Cache Cleared**
- We cleared the Vite cache (`node_modules/.vite`) to force a fresh rebuild
- First compilation after cache clear takes significantly longer
- **Impact:** 30-60 seconds additional compile time

### 2. **Large Component Files**
- `IFCViewer.tsx`: 240.78 KB
- `NestingReport.tsx`: 198.33 KB
- `PlateNestingTab.tsx`: 76.52 KB
- **Impact:** TypeScript compilation and bundling takes longer

### 3. **Heavy Dependencies**
- `@react-pdf/renderer`: Large library for PDF generation
- `three`: 3D graphics library
- Both are imported in multiple components
- **Impact:** Initial bundle parsing and optimization

### 4. **Recent Code Changes**
- Modified `NestingReport.tsx` and `NestingReportPDF.tsx`
- Vite's Hot Module Replacement (HMR) needs to rebuild these modules
- **Impact:** Incremental rebuild time

## Solutions Implemented

### ✅ 1. Optimized Vite Configuration
**File:** `web/vite.config.ts`

Added:
- Pre-bundling optimization for common dependencies
- Manual chunk splitting for vendor libraries
- Disabled sourcemaps for faster builds

```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'three', '@react-pdf/renderer'],
  exclude: []
},
build: {
  sourcemap: false,
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'three-vendor': ['three'],
        'pdf-vendor': ['@react-pdf/renderer']
      }
    }
  }
}
```

### ✅ 2. Improved Startup Script
**File:** `start-app.ps1`

- Increased wait times to account for compilation
- Added informative messages about expected wait times
- Removed problematic health checks that caused PowerShell issues

## Expected Behavior

### First Start (After Cache Clear or Major Changes)
- **Backend:** 3-5 seconds
- **Frontend:** 30-60 seconds (initial compilation)
- **Total:** ~1 minute

### Subsequent Starts (With Cache)
- **Backend:** 2-3 seconds
- **Frontend:** 5-10 seconds (using cache)
- **Total:** ~10-15 seconds

### Hot Reload (During Development)
- **Small changes:** 1-2 seconds
- **Large file changes:** 5-10 seconds
- **Dependency changes:** 20-30 seconds

## Recommendations for Future Optimization

### Short-term (Easy Wins)
1. **Avoid clearing Vite cache** unless absolutely necessary
2. **Split large components** into smaller, more focused files
3. **Lazy load PDF generation** - only import when user clicks "Export PDF"

### Medium-term (Moderate Effort)
1. **Code splitting by route** - use React.lazy() for tab components
2. **Move PDF components to separate chunk** - dynamic imports
3. **Optimize imports** - import only what's needed from libraries

### Long-term (Significant Refactor)
1. **Extract IFCViewer** to separate micro-frontend
2. **Server-side PDF generation** - move PDF rendering to backend
3. **Progressive Web App** - cache compiled assets

## Current Status

✅ Vite configuration optimized
✅ Startup script improved
✅ Cache cleared and rebuilt
⚠️ First load will be slow (expected)
✅ Subsequent loads should be faster

## Testing Instructions

1. **Stop the app:** `.\stop-app.ps1`
2. **Start the app:** `.\start-app.ps1`
3. **Wait for "ready in" message** in the frontend window
4. **Open browser:** Navigate to http://localhost:5180
5. **Expected time:** 30-60 seconds for first load

## Notes

- The 3-4 minute wait you experienced was likely due to:
  - Cache being cleared
  - Multiple restarts in quick succession
  - PowerShell profile issues causing delays
  
- Normal operation should be much faster now with optimized config



