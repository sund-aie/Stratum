# Unified Canvas

A unified **Photoshop + Illustrator + Lightroom** alternative built with React, TypeScript, and Canvas API.

## Features

### Photoshop-like Raster Tools
- **Brush Engine** - Pressure-sensitive brushes with customizable tips, spacing, jitter, smoothing
- **Eraser** - Full brush engine with clear blend mode
- **Selection Tools** - Marquee (rect/ellipse), Lasso (freeform/polygonal), Magic Wand (tolerance-based)
- **Fill & Gradient** - Flood fill with tolerance, linear/radial/angle/reflected/diamond gradients
- **Filters** - Gaussian blur, motion blur, unsharp mask, noise (uniform/gaussian, monochromatic)
- **Adjustment Layers** - Brightness/Contrast, Curves, Levels, HSL, Exposure (non-destructive)

### Illustrator-like Vector Tools
- **Pen Tool** - Bezier curves with handle control, corner/smooth conversion
- **Curvature Pen** - Auto-smooth curve creation
- **Shape Tools** - Rectangle, Ellipse, Polygon, Star, Line
- **Path Editing** - Add/Delete/Convert anchor points, direct selection
- **Text Tool** - Rich text editing, font management, convert to outlines

### Lightroom-like Photo Tools
- **Non-destructive Adjustments** - All adjustments as live layers
- **Histogram** - Real-time RGB/Luminosity histogram
- **Color Grading** - Shadows/Midtones/Highlights color wheels
- **Local Adjustments** - Brush-based dodge/burn, graduated/radial filters

### Unified Workflow
- **Layer System** - Raster, Vector, Text, Fill, Adjustment, Group layers
- **Blend Modes** - 27 blend modes (Normal, Multiply, Screen, Overlay, etc.)
- **Masks** - Layer masks, vector masks, clipping masks
- **Transform** - Free transform with handles, perspective, warp, puppet warp
- **History** - Unlimited undo/redo with branching
- **Import/Export** - PNG, JPEG, WebP, SVG, project files (.ucp)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
cd unified-canvas
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:3000

### Build
```bash
npm run build
npm run preview
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Move/Select tool |
| `B` | Brush tool |
| `E` | Eraser tool |
| `P` | Pen tool |
| `T` | Text tool |
| `U` | Shape tool |
| `M` | Marquee selection |
| `L` | Lasso selection |
| `W` | Magic wand |
| `C` | Crop tool |
| `I` | Eyedropper |
| `G` | Gradient tool |
| `Ctrl+T` | Free Transform |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save project |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+E` | Export |
| `Ctrl+J` | New layer |
| `Ctrl+Shift+J` | Duplicate layer |
| `Ctrl+G` | Group layers |
| `Ctrl+Shift+E` | Merge layers |
| `Ctrl++` / `Ctrl+-` | Zoom in/out |
| `Ctrl+0` | Actual size |
| `Space` (hold) | Hand tool |
| `X` | Swap colors |
| `D` | Default colors |

## Project Structure

```
src/
├── types/           # TypeScript type definitions
├── constants/       # Tool IDs, blend modes, etc.
├── engine/          # Core rendering & computation
│   ├── Renderer.ts         # Multi-layer canvas renderer
│   ├── VectorRenderer.ts   # Vector path rendering
│   ├── RasterOps.ts        # Brush, fill, blur, filters
│   ├── Adjustments.ts      # Non-destructive adjustments
│   ├── HitTester.ts        # Layer/object hit testing
│   └── SelectionRenderer.ts # Selection visualization
├── tools/           # Tool implementations (React hooks)
│   ├── SelectionTool.tsx
│   ├── BrushTool.tsx
│   ├── PenTool.tsx
│   ├── TextTool.tsx
│   └── TransformTool.tsx
├── ui/              # UI components
│   ├── Toolbar.tsx
│   ├── LayerPanel.tsx
│   ├── PropertiesPanel.tsx
│   ├── CanvasViewport.tsx
│   └── ColorPicker.tsx
├── files/           # File I/O
│   └── FileIO.ts
├── utils/           # Utilities
│   └── history.ts
├── styles/          # CSS
├── App.tsx          # Main app component
└── index.tsx        # Entry point
```

## Architecture

### Rendering Pipeline
1. **Document** → Sorted layers by z-index
2. **Layer** → Type-specific renderer (Raster/Vector/Text/Fill)
3. **Adjustment Layers** → Applied as post-processing passes
4. **Masks** → Composited during layer render
5. **Viewport** → Transform (zoom/pan) applied at end

### State Management
- React hooks for local tool state
- Immutable document updates with history tracking
- Centralized document state in App component

### Performance
- OffscreenCanvas for Workers (future)
- Dirty region rendering (future)
- WebGL compute shaders for filters (future)

## Roadmap

### v0.2 - Core Polish
- [ ] WebGL renderer option
- [ ] Layer effects (drop shadow, stroke, glow)
- [ ] Smart objects
- [ ] Better text engine (OpenType features)

### v0.3 - Advanced Features
- [ ] 3D extrude/revolve
- [ ] Perspective grid
- [ ] Symbol/Component system
- [ ] Artboards

### v0.4 - Lightroom Module
- [ ] RAW processing pipeline
- [ ] Lens corrections
- [ ] Noise reduction (AI)
- [ ] Batch export

### v1.0 - Production Ready
- [ ] Plugin API
- [ ] Scripting (JS/TS)
- [ ] Cloud sync
- [ ] Mobile companion

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit PR

## Acknowledgments

Inspired by Adobe Photoshop, Illustrator, and Lightroom.
Built with React, Vite, and the Canvas API.