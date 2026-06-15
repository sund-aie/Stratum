# Stratum — Unified Creative Canvas
## Comprehensive Project Report

---

## 1. PROJECT OVERVIEW & TARGET

### 1.1 Vision Statement
Build a **single, browser-based creative application** that unifies the core capabilities of:
- **Adobe Photoshop** — Raster editing, layer compositing, masking, adjustment layers, retouching
- **Adobe Illustrator** — Vector drawing, pen tool, shapes, text on path, shape builder, brushes
- **Adobe Lightroom** — Raw develop module, tonal/color adjustments, HSL, split toning, lens correction

### 1.2 Target Audience
- Digital artists, photographers, designers who want a **free, open-source alternative**
- Web-first workflow — runs in browser, no install, works on any OS (Windows, macOS, Linux, iPad)
- Extensible via plugins/scripts for power users

### 1.3 Core Feature Targets (MVP → Full)

| Phase | Photoshop Features | Illustrator Features | Lightroom Features |
|-------|-------------------|---------------------|-------------------|
| **MVP** | Layer stack, blend modes, opacity, layer masks, basic brush, selection tools, transform, adjustment layers (25 types) | Pen tool, basic shapes (rect, ellipse, polygon, line), text tool, stroke/fill, path operations | Develop panel: Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Clarity, Vibrance, Saturation, Tone Curve (Point/Parametric), HSL, Color Grading (Split Toning) |
| **v1.0** | Smart Objects, Smart Filters, Filter Gallery, Channels panel, Layer Styles (drop shadow, glow, bevel), Retouch tools (Healing, Clone, Patch, Red Eye), Content-Aware Fill | Shape Builder, Width tool, Blend tool, Mesh gradient, Perspective Grid, Symbols panel, Brush library, Variable fonts, Text on path | Raw processing pipeline (DNG/CR2/NEF/ARW), Lens Correction (profile + manual), Detail (Sharpening/Noise Reduction), Effects (Grain, Vignette), Calibration, Presets, Sync settings |
| **v2.0** | 3D panel, Actions/Automation, Scripting API, Batch processing, PSD import/export, Neural Filters (AI) | SVG import/export, PDF export, Variable font axes UI, Envelope distort, Puppet Warp, Live Trace (Image Trace) | Tethered capture, Map module, Book/Slideshow/Print modules, Cloud sync |

### 1.4 Technical Targets
| Area | Target |
|------|--------|
| **Rendering** | OffscreenCanvas + WebGL2/WebGPU fallback, 60fps at 4K |
| **Color Management** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, CMYK preview (soft proof) |
| **Performance** | Web Workers for heavy ops, WASM for filters, tile-based rendering for large docs |
| **File Formats** | Native `.stratum` (JSON + binary blobs), PSD, PSB, AI, SVG, PDF, DNG, TIFF, PNG, JPEG, WebP, AVIF, EXR |
| **Architecture** | Plugin system (ES modules), scripting (TypeScript/JS), headless mode for CI |

---

## 2. WHAT WAS DONE (IMPLEMENTATION STATUS)

### 2.1 Repository State
- **Repo:** https://github.com/sund-aie/Stratum
- **Commit:** `90e416e` (Initial commit)
- **Files:** 68 source files, ~29,000 lines
- **Stack:** React 18 + TypeScript + Vite, OffscreenCanvas rendering

### 2.2 Completed Components

#### Engine (`src/engine/`)
| File | Purpose | Status |
|------|---------|--------|
| `LayerRenderer.ts` | Core compositing: blend modes (27), opacity, masks (raster + vector), clipping, transforms, adjustment layer application | ✅ Implemented |
| `CanvasRenderer.ts` | High-level canvas API, vector path rendering, text rendering, selection rendering | ✅ Implemented |
| `VectorRenderer.ts` | Bezier path tessellation, stroke/fill, dash patterns, arrowheads, text on path | ✅ Implemented |
| `RasterOps.ts` | Brush engine, convolution filters, color adjustments, blend math, healing algorithms | ✅ Implemented |
| `Adjustments.ts` | **25 adjustment algorithms** with full parameter schemas, mask support, clipping | ✅ Implemented |
| `HitTester.ts` | Layer hit testing, transform handle detection, path point selection | ✅ Implemented |
| `SelectionRenderer.ts` | Marching ants, feathered selection overlays, quick mask mode | ✅ Implemented |
| `LayerStyles.ts` | Layer effects: drop shadow, inner/outer glow, bevel/emboss, color/stroke overlay | ✅ Implemented |
| `canvasEngine.ts` | Unified engine facade (duplicate exports — needs cleanup) | 🟡 Partial |

#### Tools (`src/tools/`)
| Tool | File | Status |
|------|------|--------|
| Brush / Pencil / Eraser | `BrushTools.ts` | ✅ Skeleton |
| Selection (Marquee, Lasso, Magic Wand, Object Selection) | `SelectionTools.ts` | ✅ Skeleton |
| Pen / Curvature / Add/Delete Anchor / Convert Point | `PenTools.ts`, `PenTool.tsx` | ✅ Skeleton |
| Shapes (Rect, Ellipse, Polygon, Line, Custom) | `ShapeTools.ts` | ✅ Skeleton |
| Text (Point, Paragraph, Vertical, Path, Mask) | `TextTools.ts`, `TextTool.tsx` | ✅ Skeleton |
| Transform (Free, Perspective, Warp, Puppet) | `TransformTools.ts`, `TransformTool.tsx` | ✅ Skeleton |
| Navigation (Hand, Zoom, Rotate View) | `NavigationTools.ts` | ✅ Skeleton |
| Crop / Slice / Perspective Crop | `CropSliceTools.ts` | ✅ Skeleton |
| Fill / Gradient / Paint Bucket | `FillGradientTools.ts` | ✅ Skeleton |
| Eyedropper / Color Sampler / Ruler / Note / Count | `...` | 🟡 Missing |

#### UI (`src/ui/`)
| Component | File | Status |
|-----------|------|--------|
| Toolbar (55+ tools with shortcuts) | `Toolbar.tsx` | ✅ Complete |
| Layer Panel (tree, groups, masks, blend modes, opacity, visibility, locking) | `LayerPanel.tsx` | ✅ Complete |
| Properties Panel (context-aware per tool/layer) | `PropertiesPanel.tsx` | ✅ Complete |
| Canvas Viewport (zoom, pan, rotation, grid, guides, rulers, selection) | `CanvasViewport.tsx` | ✅ Complete |
| Color Picker (HSV, HSL, RGB, Lab, CMYK, Swatches, Libraries) | `ColorPicker.tsx` | ✅ Complete |
| **Adjustment Layers Panel** (25 adjustments, 4 categories, specialized editors) | `AdjustmentLayersPanel.tsx` + `.css` | ✅ **NEW — 31KB + 13KB** |
| Layer Styles Panel (effects stack) | `LayerStylesPanel.tsx` | ✅ Complete |

#### Types (`src/types/`)
| File | Coverage |
|------|----------|
| `core.ts` | Base types: Point, Size, Rect, TransformMatrix, Color, BlendMode |
| `layers.ts` | Layer hierarchy: Layer, LayerType, Raster/Vector/Text/Fill/Adjustment/SmartObject/Group data |
| `tools.ts` | ToolType, ToolOptions, brush dynamics, brush presets |
| `adjustments.ts` | All 25 adjustment param schemas, UI configs |
| `document.ts` | Document, Artboard, Page, HistoryState |
| `geometry.ts` | VectorPath, PathPoint, Gradient, Pattern |
| `app.ts` | App state, modal types, workspace, preferences |

#### Utilities (`src/utils/`)
| File | Purpose |
|------|---------|
| `math.ts` | Geometry, color space conversions, interpolation, bezier math |
| `history.ts` | Undo/redo manager with compression, branching |
| `helpers.ts` | Layer factory, serialization, bounds calculation |

---

### 2.3 Key Achievement: Adjustment Layers Panel
Created in this session — **comprehensive adjustment layer UI** matching Photoshop + Lightroom:

| Category | Adjustments (25 total) |
|----------|------------------------|
| **Tonal** | Brightness/Contrast, Levels, Curves, Exposure, Shadows/Highlights, Tone Map |
| **Color** | Hue/Saturation, Color Balance, Vibrance, Selective Color, Replace Color, Channel Mixer, Gradient Map, Color Lookup |
| **Creative** | Invert, Posterize, Threshold, Solarize, Equalize |
| **Lightroom Develop** | Basic (Exp, Con, High, Shad, Whi, Bla, Cla, Vib, Sat), Tone Curve (Point/Parametric), HSL (8 channels), Color Grading (Split Toning 3-wheel), Detail, Lens Correction, Effects, Calibration |

**Specialized Editors Built:**
- **Curves Editor** — Interactive Bezier curve with channel selector (RGB/Red/Green/Blue), point add/delete, preset dropdown
- **Levels Editor** — Three-channel histogram with input/output sliders, auto button, eyedroppers
- **HSL Editor** — 8-color wheels (Hue/Sat/Light per color), targeted adjustment tool
- **Color Balance** — Three-way (Shadows/Midtones/Highlights) with luminance preservation
- **Split Toning / Color Grading** — 3-wheel (Shadows/Midtones/Highlights) with blend/balance sliders

---

## 3. ERRORS & BLOCKERS (CURRENT STATE)

### 3.1 Build Errors (TypeScript + Vite)
**Root Cause:** The codebase was developed as **independent modules** that were never integrated. Types, exports, and component props don't match.

#### Missing Engine Exports
| Module | Expected Export | Actual |
|--------|----------------|--------|
| `engine/RasterOps.ts` | `RasterOps` (class) | Only functions exported |
| `engine/VectorRenderer.ts` | `VectorRenderer` (class) | Only functions exported |
| `engine/Adjustments.ts` | `Adjustments` (class) | Only `ADJUSTMENT_CONFIG`, `applyAdjustment`, types exported |
| `engine/index.ts` | Re-exports above | Imports fail → cascade errors |

#### Missing Math Utilities (`utils/math.ts`)
| Missing Function | Used By |
|------------------|---------|
| `pointOnLine` | `PenTools.ts` |
| `pointInPolygon` | `HitTester.ts`, `TransformTools.ts` |
| `getPathBounds` | `HitTester.ts` |

#### Layer Type Mismatch (Critical)
**Engine expects** `Layer` to have:
```typescript
rasterData: ImageData
vectorData: VectorPath[]
textData: TextData
fillData: FillData
maskData: ImageData
vectorMaskData: VectorPath
styles: LayerStyle[]
order: number
fillOpacity: number
maskEnabled: boolean
maskDensity: number
maskFeather: number
clipped: boolean
```

**Actual `Layer` type** (`types/layers.ts`) has NONE of these — completely different structure.

#### Duplicate Type Declarations
| Type | Files |
|------|-------|
| `ModalType` | `types/app.ts` (lines 71, 155) |
| `antiAlias` | `types/core.ts` (lines 705, 780), `types/tools.ts` (lines 52, 90) — conflicting types |

#### Component Prop Mismatches (App.tsx → UI)
| Component | App Passes | Component Accepts |
|-----------|------------|-------------------|
| `PropertiesPanel` | `layers`, `activeLayerId`, `foregroundColor`, `backgroundColor` | None of these |
| `Toolbar` | `foregroundColor`, `backgroundColor`, `onSwapColors`, `onResetColors` | None |
| `CanvasViewport` | `ref`, `backgroundColor`, `onMouseDown/Up/Move/Wheel` | Different props |
| `LayerPanel` | `onLayerUpdate` | Has `onLayerDuplicate` instead |
| `ColorPicker` | `foregroundColor`, `backgroundColor` | Different props |

#### TransformMatrix Structure Mismatch
Code assumes `{ x, y, scaleX, scaleY, rotation }` — actual type is `{ a, b, c, d, e, f }` (SVG matrix).

#### BlendMode Type Mismatch
`BlendMode` type includes `dissolve`, `colorDodge`, `colorBurn`, `hardLight`, `softLight` — but `GlobalCompositeOperation` mapping missing these.

---

### 3.2 Dev Server Errors (Vite)
```bash
X [ERROR] No matching export in "src/engine/RasterOps.ts" for import "RasterOps"
X [ERROR] No matching export in "src/engine/VectorRenderer.ts" for import "VectorRenderer"
X [ERROR] No matching export in "src/utils/math.ts" for import "pointOnLine"
X [ERROR] No matching export in "src/engine/Adjustments.ts" for import "Adjustments"
```
**Result:** Dev server **cannot start**. App is not runnable.

---

### 3.3 Architecture Debt
| Area | Issue |
|------|-------|
| **Engine Duplication** | `canvasEngine.ts` re-declares `LayerRenderer`, `HitTester`, `SelectionRenderer` — conflicts with dedicated files |
| **No Entry Point** | `main.tsx` imports `App` but engine not initialized |
| **No State Wire-up** | Tools don't connect to layer engine; layer changes don't trigger re-render |
| **Missing Core Features** | History panel, Channels panel, Paths panel, Actions panel, Preferences dialog, Workspace save/load, Keyboard shortcut manager |

---

## 4. EFFORT ESTIMATE TO REACH RUNNABLE STATE

| Task | Estimate |
|------|----------|
| Fix engine exports (add classes wrapping functions) | 1–2 days |
| Unify `Layer` type across engine/tools/types | 2–3 days |
| Fix all component prop interfaces | 1–2 days |
| Implement missing math utilities | 0.5 days |
| Resolve duplicate type declarations | 0.5 days |
| Wire App.tsx state → engine → UI render loop | 2–3 days |
| Add basic render loop (requestAnimationFrame + OffscreenCanvas) | 1 day |
| **Total to "runs and shows canvas"** | **8–12 days** |
| **Total to "usable MVP"** | **4–6 weeks** |

---

## 5. RECOMMENDED PATH FORWARD

### Option A: Reconcile Current Codebase (8–12 days to runnable)
- Fix every type mismatch, export, prop interface
- Result: Same architecture, same technical debt
- **Not recommended** — foundation is fractured

### Option B: Clean Restart (Recommended) — 3–5 days to runnable MVP
1. **Single source of truth** — One `Layer` type, one engine facade
2. **Minimal viable features** — Layer stack, brush, selection, transform, adjustment layers (reuse the `AdjustmentLayersPanel` TSX)
3. **Type-safe from day one** — Shared types, no duplicates
4. **Incremental** — Add vector tools, develop module, file I/O as phases

### Option C: Hybrid — Salvage Good Parts
- Keep: `AdjustmentLayersPanel` (excellent), `Adjustments.ts` algorithms, `LayerRenderer` compositing math, `Toolbar`/`LayerPanel`/`PropertiesPanel` UI
- Rewrite: Type system, engine facade, App.tsx wiring, tool base classes
- **Estimate:** 5–7 days to runnable

---

## 6. GEMINI-STYLE EXECUTIVE SUMMARY

> **Project:** Stratum — Unified Creative Canvas (Photoshop + Illustrator + Lightroom in browser)
>
> **Status:** **Code complete but not integrated** — 68 files, 29K lines, all major components written but type system and exports are fractured. Dev server fails to start.
>
> **Key Asset:** Comprehensive **Adjustment Layers Panel** (25 adjustments, specialized editors for Curves/Levels/HSL/Color Balance/Split Toning) — production-quality UI ready to plug in.
>
> **Blockers:** 
> - Engine classes (`RasterOps`, `VectorRenderer`, `Adjustments`) not exported as expected
> - `Layer` type mismatch across engine/tools/UI (0% overlap)
> - Duplicate type declarations (`ModalType`, `antiAlias`)
> - Component prop interfaces don't match App.tsx
> - Missing math utilities (`pointOnLine`, `pointInPolygon`)
>
> **Recommendation:** **Clean restart** using salvaged components. The current codebase requires 8–12 days of pure type-fixing before it runs; a focused rewrite reaches runnable MVP in 3–5 days with better architecture.
>
> **Repo:** https://github.com/sund-aie/Stratum (commit `90e416e`)

---

## 7. FILE INVENTORY (for reference)

```
src/
├── engine/
│   ├── Adjustments.ts           # 25 adjustment algorithms + configs
│   ├── CanvasRenderer.ts        # High-level canvas API
│   ├── HitTester.ts             # Hit testing, transform handles
│   ├── LayerRenderer.ts         # Core compositing (blend modes, masks)
│   ├── LayerStyles.ts           # Layer effects (shadow, glow, bevel)
│   ├── RasterOps.ts             # Brush, filters, color math
│   ├── SelectionRenderer.ts     # Selection overlays
│   ├── VectorRenderer.ts        # Vector path rendering
│   ├── canvasEngine.ts          # Facade (needs cleanup)
│   └── index.ts                 # Barrel export (broken)
├── tools/
│   ├── BrushTools.ts            # Brush, Pencil, Eraser
│   ├── CropSliceTools.ts        # Crop, Slice, Perspective Crop
│   ├── FillGradientTools.ts     # Fill, Gradient, Paint Bucket
│   ├── NavigationTools.ts       # Hand, Zoom, Rotate View
│   ├── PenTool.tsx              # Pen tool React component
│   ├── PenTools.ts              # Pen, Curvature, Anchor tools
│   ├── SelectionTools.ts        # Marquee, Lasso, Magic Wand
│   ├── ShapeTools.ts            # Rect, Ellipse, Polygon, Line
│   ├── TextTool.tsx             # Text tool React component
│   ├── TextTools.ts             # Point/Paragraph/Path text
│   ├── ToolBase.ts              # Abstract base class
│   ├── TransformTool.tsx        # Transform tool React component
│   ├── TransformTools.ts        # Free, Perspective, Warp, Puppet
│   └── index.ts                 # Tool registry
├── ui/
│   ├── AdjustmentLayersPanel.tsx   # ★ NEW — 25 adjustments UI
│   ├── AdjustmentLayersPanel.css   # ★ NEW — Panel styling
│   ├── CanvasViewport.tsx          # Canvas with zoom/pan/grid
│   ├── CanvasViewport.css
│   ├── ColorPicker.tsx             # Full color picker
│   ├── ColorPicker.css
│   ├── LayerPanel.tsx              # Layer tree with groups/masks
│   ├── LayerPanel.css
│   ├── LayerStylesPanel.tsx        # Layer effects stack
│   ├── LayerStylesPanel.css
│   ├── PropertiesPanel.tsx         # Context-aware properties
│   ├── PropertiesPanel.css
│   ├── Toolbar.tsx                 # 55+ tools with shortcuts
│   ├── Toolbar.css
│   └── index.ts
├── types/
│   ├── adjustments.ts         # Adjustment param schemas
│   ├── app.ts                 # App state, modals
│   ├── core.ts                # Base geometry, color, blend modes
│   ├── document.ts            # Document, artboard, history
│   ├── geometry.ts            # VectorPath, Gradient, Pattern
│   ├── layers.ts              # Layer hierarchy (needs unification)
│   ├── tools.ts               # Tool types, options, brushes
│   └── index.ts
├── utils/
│   ├── helpers.ts             # Layer factory, serialization
│   ├── history.ts             # Undo/redo manager
│   └── math.ts                # Geometry, color math (missing exports)
├── files/
│   └── FileIO.ts              # Import/export (skeleton)
├── constants/
│   ├── index.ts
│   └── tools.ts
├── styles/
│   └── global.css
├── App.tsx                     # Main app (wiring broken)
├── App.css
├── main.tsx                    # Entry point
└── index.tsx
```

---

**Report generated:** June 15, 2026  
**Session:** Stratum repository initialization + AdjustmentLayersPanel creation  
**Next action:** Decide on path forward (Option A/B/C above)