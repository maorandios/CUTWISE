# Component Refactoring Plan

## Branch: `refactor/component-optimization`

**Created:** 2026-02-17  
**Purpose:** Reduce token costs and improve code maintainability by breaking down large components

---

## Problem Statement

The codebase contains several extremely large component files that cause high token costs in AI-assisted development:

| File | Lines | Status | Priority |
|------|-------|--------|----------|
| `IFCViewer.tsx` | 5,702 | 🔴 Critical | HIGH |
| `NestingReport.tsx` | 3,034 | 🔴 Critical | HIGH |
| `NestingReportPDF.tsx` | 1,636 | 🟡 High | MEDIUM |
| `PlateNestingTab.tsx` | 1,540 | 🟡 High | MEDIUM |
| `PreviewModal.tsx` | 743 | 🟡 Medium | LOW |

**Estimated Token Cost per Context Load:** ~200,000+ tokens  
**Target:** Reduce to <500 lines per file (~10,000 tokens max)

---

## Refactoring Strategy

### Phase 1: IFCViewer.tsx (5,702 lines → ~300 lines)

#### Target Structure:
```
web/src/components/
├── IFCViewer/
│   ├── index.tsx                    (~300 lines) - Main component
│   ├── hooks/
│   │   ├── useIFCScene.ts          - Scene initialization & management
│   │   ├── useIFCLoader.ts         - File loading logic
│   │   ├── useMeasurement.ts       - Measurement tools
│   │   ├── useClipping.ts          - Clipping plane logic
│   │   ├── useCamera.ts            - Camera controls
│   │   └── useFilters.ts           - Filtering logic
│   ├── components/
│   │   ├── ViewerControls.tsx      - UI controls overlay
│   │   ├── MeasurementTools.tsx    - Measurement UI
│   │   ├── ClippingControls.tsx    - Clipping UI
│   │   └── LoadingState.tsx        - Loading indicators
│   ├── utils/
│   │   ├── geometryUtils.ts        - Geometry calculations
│   │   ├── colorUtils.ts           - Color management
│   │   └── transformUtils.ts       - Coordinate transformations
│   └── types.ts                     - TypeScript interfaces
```

#### Extraction Plan:

**Step 1.1: Extract Custom Hooks** (~2,000 lines)
- [ ] `useIFCScene.ts` - Scene setup, renderer, lights
- [ ] `useIFCLoader.ts` - IFC/GLTF loading logic
- [ ] `useMeasurement.ts` - Distance measurement functionality
- [ ] `useClipping.ts` - Clipping plane management
- [ ] `useCamera.ts` - OrbitControls and camera logic
- [ ] `useFilters.ts` - Profile/plate/assembly filtering

**Step 1.2: Extract UI Components** (~1,500 lines)
- [ ] `ViewerControls.tsx` - Toolbar buttons and controls
- [ ] `MeasurementTools.tsx` - Measurement UI and display
- [ ] `ClippingControls.tsx` - Clipping plane UI
- [ ] `LoadingState.tsx` - Loading/error states

**Step 1.3: Extract Utility Functions** (~1,500 lines)
- [ ] `geometryUtils.ts` - Bounding box, intersections, raycasting
- [ ] `colorUtils.ts` - Color calculations and mapping
- [ ] `transformUtils.ts` - Coordinate transformations
- [ ] `materialUtils.ts` - Material creation and management

**Step 1.4: Extract Types** (~200 lines)
- [ ] `types.ts` - All TypeScript interfaces and types

**Expected Result:** Main `IFCViewer/index.tsx` ~300 lines

---

### Phase 2: NestingReport.tsx (3,034 lines → ~400 lines)

#### Target Structure:
```
web/src/components/
├── NestingReport/
│   ├── index.tsx                    (~400 lines) - Main component
│   ├── components/
│   │   ├── NestingTable.tsx        - Main data table
│   │   ├── NestingFilters.tsx      - Filter controls
│   │   ├── NestingStats.tsx        - Statistics display
│   │   ├── NestingVisualization.tsx - 2D visualization
│   │   ├── PlateSelector.tsx       - Plate selection UI
│   │   └── ExportButtons.tsx       - PDF/SVG export controls
│   ├── hooks/
│   │   ├── useNestingData.ts       - Data fetching & processing
│   │   ├── useNestingFilters.ts    - Filter state management
│   │   └── useNestingExport.ts     - Export functionality
│   ├── utils/
│   │   ├── nestingCalculations.ts  - Nesting algorithms
│   │   ├── svgGenerator.ts         - SVG generation
│   │   └── pdfGenerator.ts         - PDF generation
│   └── types.ts                     - TypeScript interfaces
```

#### Extraction Plan:

**Step 2.1: Extract Table Components** (~800 lines)
- [ ] `NestingTable.tsx` - Main table with sorting/pagination
- [ ] `NestingFilters.tsx` - All filter controls
- [ ] `NestingStats.tsx` - Statistics cards

**Step 2.2: Extract Visualization** (~600 lines)
- [ ] `NestingVisualization.tsx` - 2D canvas rendering
- [ ] `PlateSelector.tsx` - Plate selection interface

**Step 2.3: Extract Business Logic** (~1,000 lines)
- [ ] `useNestingData.ts` - Data fetching and processing
- [ ] `useNestingFilters.ts` - Filter logic
- [ ] `nestingCalculations.ts` - Nesting algorithms

**Step 2.4: Extract Export Logic** (~400 lines)
- [ ] `useNestingExport.ts` - Export coordination
- [ ] `svgGenerator.ts` - SVG generation
- [ ] `pdfGenerator.ts` - PDF generation

**Expected Result:** Main `NestingReport/index.tsx` ~400 lines

---

### Phase 3: NestingReportPDF.tsx (1,636 lines → ~300 lines)

#### Target Structure:
```
web/src/components/
├── NestingReportPDF/
│   ├── index.tsx                    (~300 lines) - Main PDF component
│   ├── components/
│   │   ├── PDFHeader.tsx           - Header section
│   │   ├── PDFSummary.tsx          - Summary section
│   │   ├── PDFPlateTable.tsx       - Plate data table
│   │   ├── PDFPartTable.tsx        - Part data table
│   │   └── PDFVisualization.tsx    - Nesting visualization
│   ├── styles/
│   │   └── pdfStyles.ts            - @react-pdf/renderer styles
│   └── utils/
│       └── pdfFormatters.ts        - Data formatting utilities
```

#### Extraction Plan:

**Step 3.1: Extract PDF Sections** (~800 lines)
- [ ] `PDFHeader.tsx` - Title, metadata, project info
- [ ] `PDFSummary.tsx` - Summary statistics
- [ ] `PDFPlateTable.tsx` - Plate information table
- [ ] `PDFPartTable.tsx` - Part details table
- [ ] `PDFVisualization.tsx` - Nesting diagram

**Step 3.2: Extract Styles** (~400 lines)
- [ ] `pdfStyles.ts` - All StyleSheet.create definitions

**Step 3.3: Extract Utilities** (~200 lines)
- [ ] `pdfFormatters.ts` - Number formatting, date formatting

**Expected Result:** Main `NestingReportPDF/index.tsx` ~300 lines

---

### Phase 4: PlateNestingTab.tsx (1,540 lines → ~350 lines)

#### Target Structure:
```
web/src/components/
├── PlateNestingTab/
│   ├── index.tsx                    (~350 lines) - Main component
│   ├── components/
│   │   ├── NestingControls.tsx     - Control panel
│   │   ├── PlateConfiguration.tsx  - Plate settings
│   │   ├── NestingPreview.tsx      - Preview canvas
│   │   └── ResultsDisplay.tsx      - Results table
│   ├── hooks/
│   │   ├── useNestingEngine.ts     - Nesting algorithm
│   │   └── useNestingState.ts      - State management
│   └── utils/
│       ├── nestingAlgorithm.ts     - Core nesting logic
│       └── geometryPacking.ts      - Geometry packing utilities
```

#### Extraction Plan:

**Step 4.1: Extract UI Components** (~500 lines)
- [ ] `NestingControls.tsx` - Settings and controls
- [ ] `PlateConfiguration.tsx` - Plate dimension inputs
- [ ] `NestingPreview.tsx` - Canvas preview
- [ ] `ResultsDisplay.tsx` - Results table

**Step 4.2: Extract Business Logic** (~600 lines)
- [ ] `useNestingEngine.ts` - Nesting coordination
- [ ] `nestingAlgorithm.ts` - Core algorithm
- [ ] `geometryPacking.ts` - Packing logic

**Expected Result:** Main `PlateNestingTab/index.tsx` ~350 lines

---

### Phase 5: PreviewModal.tsx (743 lines → ~200 lines)

#### Target Structure:
```
web/src/components/
├── PreviewModal/
│   ├── index.tsx                    (~200 lines) - Main modal
│   ├── components/
│   │   ├── PreviewCanvas.tsx       - Canvas rendering
│   │   ├── PreviewControls.tsx     - Zoom/pan controls
│   │   └── PreviewToolbar.tsx      - Action buttons
│   └── hooks/
│       └── usePreviewRenderer.ts   - Canvas rendering logic
```

#### Extraction Plan:

**Step 5.1: Extract Components** (~300 lines)
- [ ] `PreviewCanvas.tsx` - Canvas and rendering
- [ ] `PreviewControls.tsx` - Zoom/pan UI
- [ ] `PreviewToolbar.tsx` - Toolbar buttons

**Step 5.2: Extract Logic** (~200 lines)
- [ ] `usePreviewRenderer.ts` - Rendering logic

**Expected Result:** Main `PreviewModal/index.tsx` ~200 lines

---

## Implementation Guidelines

### 1. File Organization
- Create folder for each major component
- Use `index.tsx` as main export
- Group related files in subdirectories (`hooks/`, `components/`, `utils/`)

### 2. Naming Conventions
- Hooks: `use[Feature].ts`
- Components: `[Feature][Type].tsx` (e.g., `NestingTable.tsx`)
- Utils: `[feature][Purpose].ts` (e.g., `geometryUtils.ts`)

### 3. Import/Export Strategy
- Use barrel exports (`index.ts`) for clean imports
- Keep circular dependencies in mind
- Use absolute imports from `@/` alias

### 4. Testing Strategy
- Test each extracted module independently
- Ensure functionality remains unchanged
- Run full integration tests after each phase

### 5. Git Workflow
- One commit per logical extraction
- Clear commit messages: `refactor(IFCViewer): extract useCamera hook`
- Test after each commit

---

## Success Metrics

### Before Refactoring:
- Total lines in 5 files: **12,655 lines**
- Estimated tokens per context: **~200,000+ tokens**
- Maintainability: Low (hard to navigate/understand)

### After Refactoring:
- Total lines in main files: **~1,550 lines** (87% reduction)
- Estimated tokens per context: **~30,000 tokens** (85% reduction)
- Maintainability: High (focused, single-responsibility files)

### Additional Benefits:
- ✅ Easier to test individual components
- ✅ Better code reusability
- ✅ Improved development velocity
- ✅ Reduced AI token costs (85% reduction)
- ✅ Better IDE performance
- ✅ Easier onboarding for new developers

---

## Timeline Estimate

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1: IFCViewer | 2-3 days | HIGH |
| Phase 2: NestingReport | 2-3 days | HIGH |
| Phase 3: NestingReportPDF | 1-2 days | MEDIUM |
| Phase 4: PlateNestingTab | 1-2 days | MEDIUM |
| Phase 5: PreviewModal | 1 day | LOW |
| **Total** | **7-11 days** | - |

---

## Getting Started

### Step 1: Start with IFCViewer (Highest Impact)
```bash
# Already on branch: refactor/component-optimization
cd web/src/components
mkdir -p IFCViewer/{hooks,components,utils}
```

### Step 2: Extract First Hook
Start with the simplest extraction to establish patterns:
- Extract `useCamera.ts` first (camera controls)
- Test thoroughly
- Commit
- Repeat for other hooks

### Step 3: Continue Systematically
Follow the extraction plan for each phase, testing after each extraction.

---

## Notes

- This refactoring is **non-breaking** - functionality remains identical
- Focus on **extraction**, not rewriting logic
- Maintain **backward compatibility** during transition
- Use **TypeScript** to catch issues early
- Keep **commit history clean** for easy review

---

## Questions or Issues?

Document any challenges or decisions in this file as you progress.

---

**Last Updated:** 2026-02-17

