/**
 * Command layer shared by the menu bar, keyboard shortcuts, and panel buttons.
 * Every command goes through the gesture-granular history so undo/redo stays correct.
 */
import type { Document, Layer, RasterLayer, SelectionData, RGBAColor, AdjustmentLayer } from '../types';
import { getStore } from './state/store';
import { CanvasEngine } from './engine/CanvasEngine';
import { InteractionController } from './interaction/InteractionController';
import {
  newDocument as ioNewDocument,
  documentFromImageData,
  fileToImageData,
  newRasterLayer,
  pickFiles,
  uid,
  transparentImageData,
} from './io/imageIO';
import { exportDocument, saveProject, loadProject } from './io/exporter';
import { rasterizeSelection } from './interaction/selection';
import { RasterOps } from './engine/RasterOps';
import { Adjustments } from './engine/Adjustments';

export interface CommandUI {
  openNewDialog: () => void;
  openExportDialog: () => void;
  openColorPicker: (which: 'fg' | 'bg') => void;
  openCanvasSizeDialog: () => void;
  toast: (msg: string) => void;
}

export interface CommandCtx {
  engine: CanvasEngine;
  controller: InteractionController;
  ui: CommandUI;
}

let lastSelection: SelectionData | null = null;

export function createCommands(ctx: CommandCtx) {
  const store = getStore();
  const { engine, controller, ui } = ctx;

  const doc = () => store.getState().document;
  const activeLayer = (): Layer | undefined => {
    const s = store.getState();
    return s.document?.layers.find((l) => l.id === s.activeLayerId);
  };
  const artboard = () => {
    const d = doc();
    return d ? CanvasEngine.activeArtboard(d) : null;
  };

  const setDoc = (d: Document) => store.dispatch({ type: 'SET_DOCUMENT', payload: d });

  return {
    ui,
    // ---- File ----
    newDocument(width = 800, height = 600, bg: 'white' | 'transparent' | RGBAColor = 'white', name = 'Untitled') {
      const d = ioNewDocument(name, width, height, bg);
      d.activeArtboardId = d.artboards[0].id;
      setDoc(d);
      this.fitToScreen();
    },
    async openImage() {
      const files = await pickFiles('image/*', false);
      if (!files.length) return;
      const data = await fileToImageData(files[0]);
      const name = files[0].name.replace(/\.[^.]+$/, '');
      setDoc(documentFromImageData(data, name));
      this.fitToScreen();
    },
    async placeImage() {
      const d = doc();
      if (!d) return this.openImage();
      const files = await pickFiles('image/*', false);
      if (!files.length) return;
      const data = await fileToImageData(files[0]);
      const ab = CanvasEngine.activeArtboard(d);
      const layer = newRasterLayer(
        files[0].name.replace(/\.[^.]+$/, ''),
        ab.width,
        ab.height,
        d.layers.length,
        placeOnArtboard(data, ab.width, ab.height)
      );
      store.commit('Place', () => store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    },
    async openImageFile(file: Blob, name: string) {
      const data = await fileToImageData(file);
      setDoc(documentFromImageData(data, name));
      this.fitToScreen();
    },
    async placeImageFile(file: Blob, name: string) {
      const d = doc();
      if (!d) return this.openImageFile(file, name);
      const data = await fileToImageData(file);
      const ab = CanvasEngine.activeArtboard(d);
      const layer = newRasterLayer(name, ab.width, ab.height, d.layers.length, placeOnArtboard(data, ab.width, ab.height));
      store.commit('Place', () => store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    },
    exportPng() {
      const d = doc();
      if (d) exportDocument(engine, d, 'png');
    },
    exportAs() {
      ui.openExportDialog();
    },
    saveProject() {
      const d = doc();
      if (d) saveProject(d);
    },
    async openProject() {
      const files = await pickFiles('.stratum,application/json', false);
      if (!files.length) return;
      const d = await loadProject(files[0]);
      setDoc(d);
      this.fitToScreen();
    },

    // ---- Edit ----
    undo() {
      store.undo();
    },
    redo() {
      store.redo();
    },
    fillForeground() {
      this.fill(store.getState().foreground);
    },
    fillBackground() {
      this.fill(store.getState().background);
    },
    fill(color: RGBAColor) {
      const layer = activeLayer();
      const ab = artboard();
      if (!ab || !layer || layer.type !== 'raster' || !(layer as RasterLayer).pixelData) {
        ui.toast('Fill needs a pixel layer');
        return;
      }
      const sel = store.getState().selection;
      const mask = sel ? rasterizeSelection(sel, ab.width, ab.height) : null;
      store.commit('Fill', () => {
        const data = (layer as RasterLayer).pixelData!.data;
        const aa = Math.round(color.a * 255);
        for (let i = 0; i < data.length; i += 4) {
          if (mask && mask[i / 4] === 0) continue;
          data[i] = color.r;
          data[i + 1] = color.g;
          data[i + 2] = color.b;
          data[i + 3] = aa;
        }
        store.dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: {} } });
      });
    },

    // ---- Color ----
    swapColors() {
      store.dispatch({ type: 'SWAP_COLORS' });
    },
    defaultColors() {
      store.dispatch({ type: 'RESET_COLORS' });
    },

    // ---- Select ----
    selectAll() {
      const ab = artboard();
      if (!ab) return;
      const sel: SelectionData = {
        type: 'rect',
        bounds: { x: 0, y: 0, width: ab.width, height: ab.height },
        antiAlias: false,
      };
      store.commit('Select All', () => store.dispatch({ type: 'SET_SELECTION', payload: sel }));
    },
    deselect() {
      const cur = store.getState().selection;
      if (cur) lastSelection = cur;
      store.commit('Deselect', () => store.dispatch({ type: 'SET_SELECTION', payload: null }));
    },
    reselect() {
      if (lastSelection) store.commit('Reselect', () => store.dispatch({ type: 'SET_SELECTION', payload: lastSelection }));
    },
    inverseSelection() {
      const ab = artboard();
      const sel = store.getState().selection;
      if (!ab || !sel) return;
      const m = rasterizeSelection(sel, ab.width, ab.height);
      const inv = new Uint8Array(ab.width * ab.height);
      for (let i = 0; i < inv.length; i++) inv[i] = m[i] ? 0 : 255;
      const next: SelectionData = { type: 'magic', antiAlias: false, mask: inv, maskWidth: ab.width, maskHeight: ab.height };
      store.commit('Inverse', () => store.dispatch({ type: 'SET_SELECTION', payload: next }));
    },

    // ---- Layer ----
    addRasterLayer() {
      const d = doc();
      const ab = artboard();
      if (!d || !ab) return;
      const layer = newRasterLayer(`Layer ${d.layers.length + 1}`, ab.width, ab.height, d.layers.length);
      store.commit('New Layer', () => store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    },
    addAdjustmentLayer(adjustmentType: AdjustmentLayer['adjustmentType'] = 'exposure') {
      const d = doc();
      if (!d) return;
      const layer: AdjustmentLayer = {
        id: uid('layer'),
        name: adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1),
        type: 'adjustment',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        order: d.layers.length,
        adjustmentType,
        settings: defaultSettings(adjustmentType),
      };
      store.commit('Adjustment Layer', () => store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    },
    deleteLayer() {
      const s = store.getState();
      if (!s.activeLayerId) return;
      store.commit('Delete Layer', () => store.dispatch({ type: 'REMOVE_LAYER', payload: s.activeLayerId! }));
    },
    duplicateLayer() {
      const layer = activeLayer();
      const d = doc();
      if (!layer || !d) return;
      const copy: Layer = JSON.parse(JSON.stringify({ ...layer, pixelData: undefined }));
      copy.id = uid('layer');
      copy.name = `${layer.name} copy`;
      copy.order = d.layers.length;
      if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
        const src = (layer as RasterLayer).pixelData!;
        (copy as RasterLayer).pixelData = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
      }
      store.commit('Duplicate Layer', () => store.dispatch({ type: 'ADD_LAYER', payload: copy }));
    },
    mergeDown() {
      const d = doc();
      const s = store.getState();
      if (!d) return;
      const sorted = [...d.layers].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((l) => l.id === s.activeLayerId);
      if (idx <= 0) {
        ui.toast('Nothing below to merge');
        return;
      }
      this.flattenInto([sorted[idx - 1].id, sorted[idx].id], 'Merge Down');
    },
    flatten() {
      const d = doc();
      if (!d) return;
      this.flattenInto(d.layers.map((l) => l.id), 'Flatten Image');
    },
    flattenInto(layerIds: string[], name: string) {
      const d = doc();
      const ab = artboard();
      if (!d || !ab) return;
      // Build a doc with only the selected layers, compose, replace.
      const subset: Document = { ...d, layers: d.layers.filter((l) => layerIds.includes(l.id)) };
      const canvas = engine.composeArtboardCopy(subset, false);
      const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, ab.width, ab.height);
      const minOrder = Math.min(...subset.layers.map((l) => l.order));
      const merged = newRasterLayer(name === 'Flatten Image' ? 'Background' : 'Merged', ab.width, ab.height, minOrder, data);
      store.commit(name, () => {
        const remaining = d.layers.filter((l) => !layerIds.includes(l.id));
        store.dispatch({ type: 'UPDATE_DOCUMENT', payload: { layers: [...remaining, merged] } });
        store.dispatch({ type: 'SET_ACTIVE_LAYER', payload: merged.id });
      });
    },

    // ---- View ----
    zoomIn() {
      this.zoomCentered(store.getState().viewport.zoom * 1.5);
    },
    zoomOut() {
      this.zoomCentered(store.getState().viewport.zoom / 1.5);
    },
    zoomCentered(z: number) {
      const size = engine.getCssSize();
      controller.zoomAt(size.width / 2, size.height / 2, z);
    },
    actualPixels() {
      const size = engine.getCssSize();
      const ab = artboard();
      if (!ab) return;
      store.dispatch({
        type: 'UPDATE_VIEWPORT',
        payload: { zoom: 1, panX: (size.width - ab.width) / 2, panY: (size.height - ab.height) / 2 },
      });
    },
    fitToScreen() {
      const size = engine.getCssSize();
      const ab = artboard();
      if (!ab || size.width === 0) return;
      const z = Math.min((size.width - 60) / ab.width, (size.height - 60) / ab.height, 32);
      const zoom = Math.max(0.01, z);
      store.dispatch({
        type: 'UPDATE_VIEWPORT',
        payload: { zoom, panX: (size.width - ab.width * zoom) / 2, panY: (size.height - ab.height * zoom) / 2 },
      });
    },

    // ---- Quick mask / crop ----
    toggleQuickMask() {
      store.dispatch({ type: 'TOGGLE_QUICK_MASK' });
    },
    applyCrop() {
      controller.applyCrop();
    },
    nudge(dx: number, dy: number) {
      controller.nudge(dx, dy);
    },

    // ---- Filters (destructive, on the active raster layer) ----
    applyFilter(name: 'gaussianBlur' | 'sharpen' | 'invert' | 'desaturate' | 'noiseReduction') {
      const layer = activeLayer();
      if (!layer || layer.type !== 'raster' || !(layer as RasterLayer).pixelData) {
        ui.toast('Filter needs a pixel layer');
        return;
      }
      const rl = layer as RasterLayer;
      store.commit(filterLabel(name), () => {
        const src = rl.pixelData!;
        let out: ImageData;
        switch (name) {
          case 'gaussianBlur':
            out = RasterOps.gaussianBlur(src, 4);
            break;
          case 'sharpen':
            out = RasterOps.sharpen(src, 0.8, 1);
            break;
          case 'noiseReduction':
            out = RasterOps.noiseReduction(src, 30);
            break;
          case 'invert':
            out = Adjustments.apply(src, 'invert', { invert: true });
            break;
          case 'desaturate':
            out = Adjustments.apply(src, 'saturation', { saturationAdjust: -100 });
            break;
          default:
            out = src;
        }
        rl.pixelData = out;
        store.dispatch({ type: 'UPDATE_LAYER', payload: { id: rl.id, changes: {} } });
      });
    },

    imageSize() {
      ui.toast('Image Size dialog: resampling not yet wired (use Crop / Export for now)');
    },
    canvasSize() {
      ui.openCanvasSizeDialog();
    },
    resizeCanvas(w: number, h: number) {
      const d = doc();
      const ab = artboard();
      if (!d || !ab) return;
      store.commit('Canvas Size', () => {
        for (const layer of d.layers) {
          if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
            const rl = layer as RasterLayer;
            rl.pixelData = cropToSize(rl.pixelData!, w, h);
            rl.width = w;
            rl.height = h;
          }
        }
        store.dispatch({
          type: 'UPDATE_DOCUMENT',
          payload: { artboards: d.artboards.map((a) => (a.id === ab.id ? { ...a, width: w, height: h } : a)) },
        });
      });
    },
    createTextLayer(x: number, y: number, text: string, fontSize: number, fontFamily: string, color: RGBAColor) {
      const d = doc();
      if (!d) return;
      const layer = {
        id: uid('layer'),
        name: text.slice(0, 18) || 'Text',
        type: 'text' as const,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal' as const,
        order: d.layers.length,
        text,
        x,
        y,
        fontFamily,
        fontSize,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        color,
        align: 'left' as const,
        leading: fontSize * 1.2,
        tracking: 0,
      };
      store.commit('Type', () => store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    },
  };
}

function cropToSize(src: ImageData, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  for (let y = 0; y < Math.min(h, src.height); y++) {
    for (let x = 0; x < Math.min(w, src.width); x++) {
      const si = (y * src.width + x) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

function filterLabel(name: string): string {
  return ({
    gaussianBlur: 'Gaussian Blur',
    sharpen: 'Sharpen',
    invert: 'Invert',
    desaturate: 'Desaturate',
    noiseReduction: 'Reduce Noise',
  } as Record<string, string>)[name] ?? name;
}

export type Commands = ReturnType<typeof createCommands>;

function placeOnArtboard(data: ImageData, w: number, h: number): ImageData {
  const out = transparentImageData(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const tmp = document.createElement('canvas');
  tmp.width = data.width;
  tmp.height = data.height;
  tmp.getContext('2d')!.putImageData(data, 0, 0);
  // center-fit
  const scale = Math.min(w / data.width, h / data.height, 1);
  const dw = data.width * scale;
  const dh = data.height * scale;
  ctx.drawImage(tmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const got = ctx.getImageData(0, 0, w, h);
  out.data.set(got.data);
  return out;
}

export function defaultSettings(type: AdjustmentLayer['adjustmentType']): AdjustmentLayer['settings'] {
  switch (type) {
    case 'exposure':
      return { exposure: 0 };
    case 'contrast':
      return { contrast: 0 };
    case 'vibrance':
      return { vibrance: 0 };
    case 'saturation':
      return { saturationAdjust: 0 };
    case 'temperature':
      return { temperature: 0 };
    case 'tint':
      return { tint: 0 };
    case 'highlights':
      return { highlights: 0 };
    case 'shadows':
      return { shadows: 0 };
    case 'whites':
      return { whites: 0 };
    case 'blacks':
      return { blacks: 0 };
    case 'clarity':
      return { clarity: 0 };
    case 'dehaze':
      return { dehaze: 0 };
    case 'texture':
      return { texture: 0 };
    case 'invert':
      return { invert: true };
    case 'posterize':
      return { posterize: 4 };
    case 'threshold':
      return { threshold: 128 };
    case 'vignette':
      return { vignette: { amount: 0, midpoint: 50, roundness: 0, feather: 50 } };
    case 'hsl':
      return {};
    default:
      return {};
  }
}
