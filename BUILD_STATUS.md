# Stratum - Unified Creative Suite

## Project Status: ✅ MVP BUILD COMPLETE

A unified browser-based creative application combining Photoshop (raster), Illustrator (vector), and Lightroom (photo editing) capabilities.

---

## ✅ What's Been Built

### Core Engine Modules
- **`src/types/index.ts`** - Complete type system for layers, adjustments, vectors, colors, blend modes
- **`src/core/engine/RasterOps.ts`** - 16 blend modes + pixel manipulation algorithms (exposure, contrast, saturation, curves, levels, blur, sharpen, noise reduction)
- **`src/core/engine/VectorRenderer.ts`** - SVG-based vector rendering with path support, gradients, strokes, fills
- **`src/core/engine/Adjustments.ts`** - 25 adjustment types (Lightroom-style sliders: exposure, contrast, highlights, shadows, HSL, curves, split toning, etc.)
- **`src/core/state/store.ts`** - Centralized state management with undo/redo support

### UI Components
- **`src/App.tsx`** - Main application with:
  - Toolbar (8 tools: Move, Select, Lasso, Crop, Brush, Pen, Text, Gradient)
  - Canvas rendering area
  - Properties panel
  - Layers panel with add/toggle visibility
- **`src/main.tsx`** - React entry point

### Build Output
- Production build successful: `dist/` folder ready
- Bundle size: ~150KB (48KB gzipped)

---

## 🏗️ Architecture Highlights

### Flexible Design System
The app is built with design flexibility in mind:
- All UI components use inline styles for easy theming
- State management is decoupled from UI
- Component structure allows easy layout changes
- Type system ensures consistency during refactoring

### Layer System
Supports 5 layer types:
1. **Raster** - Pixel-based images
2. **Vector** - SVG paths with fills/strokes
3. **Adjustment** - Non-destructive edits (25 types)
4. **Mask** - Layer masks (pixel/vector/gradient)
5. **Group** - Nested layer organization

### Adjustment Layers (25 Total)
**Basic (Lightroom-style):**
- Exposure, Contrast, Highlights, Shadows, Whites, Blacks
- Vibrance, Saturation, Temperature, Tint
- Clarity, Dehaze, Texture

**Advanced:**
- Curves (RGB + per-channel)
- Levels (RGB + per-channel)
- Color Balance (shadows/midtones/highlights)
- Split Toning
- HSL (Hue/Sat/Luminance per 8 color ranges)

**Special Effects:**
- Sharpening, Noise Reduction, Vignette
- Invert, Posterize, Threshold, Gradient Map

### Blend Modes (16)
Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge, Color Burn, Hard Light, Soft Light, Difference, Exclusion, Hue, Saturation, Color, Luminosity

---

## 🚀 Getting Started

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## 📁 File Structure

```
src/
├── types/
│   └── index.ts          # Complete type definitions
├── core/
│   ├── engine/
│   │   ├── RasterOps.ts  # Pixel operations & blend modes
│   │   ├── VectorRenderer.ts  # SVG vector rendering
│   │   └── Adjustments.ts     # 25 adjustment algorithms
│   └── state/
│       └── store.ts      # State management with undo/redo
├── ui/
│   ├── components/       # Reusable UI components
│   └── panels/           # Panel components
├── tools/                # Tool implementations
├── utils/                # Helper functions
├── assets/               # Static assets
├── App.tsx               # Main application
└── main.tsx              # Entry point
```

---

## 🎯 Next Steps for Full Feature Parity

### Phase 1: Core Tools (Week 1-2)
- [ ] Implement actual tool behaviors (brush painting, pen tool path creation)
- [ ] Add selection tools with marching ants
- [ ] Implement transform controls (scale, rotate, skew)
- [ ] Add zoom/pan navigation

### Phase 2: Advanced Features (Week 3-4)
- [ ] Layer blending and masking
- [ ] Smart objects
- [ ] Text tool with typography controls
- [ ] Shape tools (rectangle, ellipse, polygon)
- [ ] Gradient editor

### Phase 3: AI Integration (Week 5-6)
- [ ] Generative Fill API integration
- [ ] Select Subject/Sky AI masking
- [ ] Neural Filters
- [ ] Generative Expand

### Phase 4: Polish (Week 7-8)
- [ ] Keyboard shortcuts system
- [ ] Preferences panel
- [ ] Export options (PNG, JPEG, SVG, PSD)
- [ ] Performance optimization with Web Workers
- [ ] GPU acceleration via WebGL

---

## 🔧 Customization Guide

### Changing the UI Layout
Edit `src/App.tsx` - the main layout is a flexbox container:
```tsx
<div style={{ display: 'flex', height: '100vh' }}>
  <Toolbar />      // Left sidebar
  <Canvas />       // Center workspace
  <PropertiesPanel /> // Right panel 1
  <LayerPanel />   // Right panel 2
</div>
```

To rearrange: simply move components around or wrap in additional containers.

### Adding New Tools
1. Add tool definition to `src/types/index.ts`
2. Create tool implementation in `src/tools/YourTool.ts`
3. Add to toolbar in `src/App.tsx`

### Adding New Adjustments
1. Add adjustment type to `AdjustmentType` in `src/types/index.ts`
2. Add settings interface to `AdjustmentSettings`
3. Implement algorithm in `src/core/engine/Adjustments.ts`
4. Add UI controls in adjustment panel

### Theming
All colors are inline styles. To theme:
1. Create a theme object in `src/utils/theme.ts`
2. Replace inline color values with theme references
3. Add theme switcher in preferences

---

## 📊 Performance Notes

- Current bundle: 150KB (48KB gzipped)
- Uses React 18 with hooks
- State updates trigger re-renders (consider useMemo for heavy computations)
- Canvas rendering is synchronous (consider offscreen canvas for large images)
- No WebWorkers yet (recommended for heavy image processing)

---

## 🐛 Known Limitations (MVP)

1. **No actual drawing** - Tools change state but don't paint yet
2. **No file import/export** - Can't load/save images
3. **No undo/redo UI** - State management supports it, no buttons yet
4. **No zoom/pan** - Canvas is fixed size
5. **No layer reordering** - Layers render in order but can't be dragged
6. **No masks** - Type system supports, implementation pending
7. **No vector editing** - VectorRenderer renders but no creation tools

---

## ✅ What Works Now

1. ✅ Application builds and runs
2. ✅ Toolbar with tool selection
3. ✅ Layer panel with add/toggle
4. ✅ Properties panel showing selection state
5. ✅ Canvas rendering artboard
6. ✅ State management with actions
7. ✅ Type-safe layer system
8. ✅ All adjustment algorithms implemented
9. ✅ All blend modes implemented
10. ✅ Vector path rendering

---

**Built with:** React 18, TypeScript, Vite
**Target:** Modern browsers with ES2020+ support
**GPU:** Optional acceleration via Canvas 2D API
