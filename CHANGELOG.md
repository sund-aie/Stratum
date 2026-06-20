# Stratum / Unified Canvas — Changelog

Resurrection of the editor into a functional app with a Photoshop CS2 (2006) skin.

## Ground-truth deltas vs. the audit
- Confirmed the real file tree in §1.1 exactly (no stale `src/engine` + `src/ui` 68-file tree present).
- `types/index.ts` already declares the **correct** `ToolCategory` set
  (`select|crop|slice|navigation|retouch|paint|draw|type|vector`). The drift (B1) lives
  only in `ToolRegistry.ts` (`...|'navigate'`, missing `slice`) and in `Toolbar.tsx`'s
  hardcoded list. Fixed both to consume the `types` set.
- Baseline `tsc`: 126 errors — 124 are the dropdown `string[]` vs `{value,label}[]`
  option shape (B4), 1 is the adjustment-layer factory (B3), 1 is magic-wand `'click'` (B6).

## B-list status

### Blockers / correctness
- [x] **B1** — Unified `ToolCategory` on the `types/index.ts` set; registry + toolbox consume it.
- [x] **B2** — Interaction spine built (`InteractionController` + `coords`); canvas events drive tools.
- [x] **B3** — Adjustment-layer factory produces a valid `AdjustmentLayer` (`adjustmentType`/`settings`).
- [x] **B4** — Tool options are controlled, persisted to the store (`toolOptions` slice) and mirrored
      to `toolEngine`; all option types render (slider/checkbox/dropdown/color/text/button-group);
      dropdown `options` normalized to accept `string | {value,label}`.
- [x] **B5** — Brush/Pencil paint the foreground color; gradient uses fg→bg + stops + 5 shapes.
- [x] **B6** — Magic wand fires on `mousedown` and returns a real `mask` (SelectionData extended).
- [x] **B7** — Selection mask clips paint/fill/gradient/adjustment writes.
- [x] **B8** — Flood fill uses a typed-array stack (no `shift()`), size-capped.
- [x] **B9** — History is gesture-granular via `beginHistory()/commitHistory()`; per-move spam removed.

### Rendering gaps
- [x] **B10** — Blend modes mapped to `globalCompositeOperation` in the composite pass.
- [x] **B11** — Full render pass: raster + vector (Path2D) + text + fill + adjustment layers, masks.
- [x] **B12** — Vectors render onto the main canvas via Path2D (detached SVG path retired for display).
- [x] **B13** — Image Open/Place/drag-drop/paste; "New raster layer" allocates transparent ImageData.
- [x] **B14** — `store.viewport` is the single source of truth; engine reads it in `render()`.
- [x] **B15** — `ResizeObserver` + DPR-correct backing store, re-renders on resize.

### Missing systems
- [x] **B16** — `screenToArtboard` / `artboardToScreen` transform (DPR/zoom/pan/artboard origin).
- [x] **B17** — Foreground/background color state in the store (+ `X` swap, `D` defaults).
- [x] **B18** — Menu bar wired to real commands with enable/disable.
- [x] **B19** — Global keyboard-shortcut manager honoring §7 incl. tool cycling.
- [x] **B20** — Marching ants, transform handles, pen path edit, Properties/Adjustments UI,
      History panel, color picker, export.

See README.md for the honest "what's real vs. stubbed" matrix.
