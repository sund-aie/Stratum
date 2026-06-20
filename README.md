# Stratum — Unified Canvas

A browser image / vector / photo editor (React 18 + TypeScript + Vite) fusing Photoshop
(raster), Illustrator (vector), and Lightroom (develop) concepts, presented in a faithful
**Adobe Photoshop CS2 (2006) "Adobe gray"** interface.

This codebase was resurrected from a non-functional shell: the engine, tools, and state
machinery existed but were disconnected. It now has a real interaction + render spine, real
tools, and a swappable CS2/Modern theme.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build
npm test         # vitest unit tests (color, coords, blend, flood, selection)
```

## Interface

Default theme is **CS2 (2006)** — single-column toolbox with flyout groups, options bar with
the tool-preset well, docked tabbed palettes (Navigator/Color, Properties/Develop, History,
Layers/Channels/Paths), gray document window, and a status bar. Switch to a **Modern** dark
theme via *Window ▸ Theme*. All tool/panel icons are monochrome inline-SVG recreations of the
CS2 glyphs — there are no emoji anywhere in the UI.

## What's real (deterministic, wired)

| Area | Status |
|---|---|
| Open / Place / drag-drop image, New document, project save/load (.stratum), Export PNG/JPEG/WebP | ✅ |
| Viewport: zoom-to-cursor, pan (space/hand), fit / actual pixels, DPR-correct, ResizeObserver | ✅ |
| Compositing: 16 blend modes, per-layer opacity, raster + vector (Path2D) + text + fill + adjustment layers | ✅ |
| Move (raster/vector/text), arrow-nudge | ✅ |
| Marquee (rect/ellipse, shift-constrain, alt-from-center), Lasso, Polygonal Lasso | ✅ |
| Magic Wand (tolerance, contiguous) with real mask + marching ants | ✅ |
| Selections clip paint / fill / gradient; Select All / Deselect / Reselect / Inverse | ✅ |
| Crop (drag + thirds, Enter applies, resizes artboard + layers) | ✅ |
| Brush / Pencil (foreground color, size/hardness/opacity/flow), Eraser, Eyedropper | ✅ |
| Paint Bucket (tolerance flood), Gradient (5 shapes Linear/Radial/Angular/Reflected/Diamond, fg→bg, reverse) | ✅ |
| Clone Stamp (alt-set source), Healing / Spot Healing, Dodge / Burn / Sponge, Blur / Sharpen / Smudge | ✅ |
| Shapes (rect/rounded/ellipse/triangle/polygon/line/custom → editable vector layers) | ✅ |
| Pen (click path, double-click to close → vector layer) | ✅ |
| Type (point text layer, font/size/color) | ✅ |
| Adjustment layers (non-destructive, over composite-beneath): Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Vibrance, Saturation, Temperature, Tint, Clarity, Dehaze, Texture, Curves, Levels, HSL, Color Balance, Split Toning, Vignette, Invert, Posterize, Threshold, Gradient Map | ✅ algorithms wired; live sliders for the basic set |
| Destructive filters: Gaussian Blur, Sharpen, Reduce Noise, Invert, Desaturate | ✅ |
| Layers panel (add/delete/duplicate/visibility/lock/opacity/blend), Merge Down, Flatten | ✅ |
| History panel + gesture-granular undo/redo (one step per gesture) | ✅ |
| Color picker (HSV square + hue + RGB/Hex), Color/Swatches panel | ✅ |
| Foreground/background swatches, X swap, D defaults, Quick Mask toggle | ✅ |
| Menu bar (File/Edit/Image/Layer/Select/Filter/View/Window/Help) with enable/disable | ✅ |
| Global keyboard shortcuts incl. tool cycling for shared letters | ✅ |

## What's partial / honest stubs

- **Quick Mask** toggles state but does not yet enter a paintable red-overlay editing mode.
- **Free Transform (Ctrl+T)**: handles are drawn for crop; full layer free-transform is not yet a
  committed gesture (use Move for translation).
- **Pen editing** (add/delete/convert anchor, Direct Selection) and **Pathfinder** booleans are not wired;
  the Pen creates paths but doesn't yet edit existing anchors.
- **Magnetic Lasso / Quick Selection / Object Selection** fall back to plain lasso/wand behavior.
- **Curves / HSL / Color Balance / Split Toning** adjustment layers apply via the existing algorithms,
  but only single-slider adjustments expose live UI controls in the Properties panel.
- **Channels / Paths** palette tabs are placeholders.

## Not available (honest — never faked)

Per the design rule, AI/generative and out-of-scope features are **disabled and labeled**, never
faked: Generative Fill / Expand / Remove, Neural Filters, AI subject/sky/people masking, Denoise-AI,
Text-to-Vector, RAW demosaicing, PSD/AI/DNG import-export, GPU/WebGL compute, and color management
beyond sRGB. These appear in menus marked *(unavailable)*.

## Architecture

```
src/
  types/index.ts                 single source of truth for the data model
  core/
    state/store.ts               pub/sub store; gesture-granular history (begin/commit)
    color/color.ts               sRGB conversions (rgb/hsv/hsl/hex)
    engine/
      CanvasEngine.ts            pure DPR-correct renderer; one composite pass; blend + overlays
      RasterOps.ts               blend math + pixel adjustments (preserved)
      Adjustments.ts             25 adjustment algorithms (preserved)
      VectorRenderer.ts          SVG export helper (display goes through Path2D in CanvasEngine)
    interaction/
      coords.ts                  screen <-> artboard transform
      selection.ts               mask rasterization + marching-ants edges
      InteractionController.ts   the interaction spine (pointer/key/gesture/history)
      paintOps.ts                brush/fill/gradient/shape pixel ops
    io/                          image decode, document/layer factories, export, project save/load
    tools/                       ToolRegistry (135 tools) + ToolEngine algorithms
    commands.ts                  command layer shared by menus/shortcuts/buttons
  shortcuts/shortcuts.ts         global keyboard manager
  theme/                         tokens.css (cs2 + modern) + chrome.css bevels
  ui/                            CS2 React components (toolbox, options bar, menus, panels, dialogs)
```

Single source of truth for **types** (`types/index.ts`) and for **viewport / colors / selection /
tool options** (the store). One render path through `CanvasEngine.render`. See `CHANGELOG.md` for the
B-list (bug/gap) status.

## Keyboard shortcuts

Tools: `V` move, `M` marquee, `L` lasso, `W` wand, `C` crop, `J` heal, `B` brush, `S` clone,
`Y` history brush, `E` eraser, `G` gradient/bucket, `O` dodge/burn/sponge, `P` pen, `T` type,
`A` path select, `U` shapes, `H` hand, `Z` zoom, `I` eyedropper, `K` slice (press again to cycle a group).
Commands: `Ctrl+N/O/S`, `Ctrl+Shift+E` export, `Ctrl+Z`/`Ctrl+Shift+Z` undo/redo, `Ctrl+A/D`,
`Ctrl+Shift+D/I` reselect/inverse, `Ctrl+J` duplicate, `Ctrl+E` merge down, `Shift+F5` fill,
`Ctrl +/-/0/1` zoom, `[` `]` brush size, `D`/`X` default/swap colors, `Q` quick mask, `Space` pan.
