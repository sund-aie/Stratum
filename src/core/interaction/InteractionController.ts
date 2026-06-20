/**
 * InteractionController — the interaction spine (B2).
 *
 * Owns DOM pointer/wheel/key handling on the canvas, coordinate conversion, gesture
 * lifecycle (begin/commit history once per gesture — B9), live-preview vs commit, the
 * transient tool overlay, and RAF-coalesced rendering + marching-ants animation.
 *
 * Pixel algorithms live in ToolEngine / paintOps; this module is the orchestrator.
 */
import type {
  RGBAColor,
  RasterLayer,
  Layer,
  SelectionData,
  VectorLayer,
  Artboard,
} from '../../types';
import { getStore, Store } from '../state/store';
import { CanvasEngine, Overlay } from '../engine/CanvasEngine';
import { toolEngine } from '../tools/ToolEngine';
import { getToolById } from '../tools/ToolRegistry';
import { screenToArtboard, ViewTransform } from './coords';
import { rasterizeSelection } from './selection';
import { uid, transparentImageData } from '../io/imageIO';
import * as paint from './paintOps';

interface Gesture {
  toolId: string;
  startX: number; // artboard
  startY: number;
  lastX: number;
  lastY: number;
  button: number;
  // tool-specific scratch
  originalPixels?: ImageData;
  origPaths?: VectorLayer['paths'];
  origText?: { x: number; y: number };
  lassoPoints?: { x: number; y: number }[];
  selMask?: Uint8Array | null;
  panStartX?: number;
  panStartY?: number;
  cloneOffset?: { dx: number; dy: number } | null;
  shapeLayerId?: string;
  active: boolean;
}

export class InteractionController {
  private store: Store;
  private engine: CanvasEngine;
  private canvas: HTMLCanvasElement;
  private gesture: Gesture | null = null;
  private overlay: Overlay = null;
  private hover: { x: number; y: number } | null = null;
  private antsOffset = 0;
  private rafPending = false;
  private antsTimer: number | null = null;
  private spaceDown = false;
  private cloneSource: { x: number; y: number } | null = null;
  private penPoints: { x: number; y: number }[] = [];
  private desktop = '#5d5d5d';

  // External notifier (e.g. status bar) for pointer coords / hints.
  onStatus: ((s: { x: number; y: number; hint: string } | null) => void) | null = null;
  onColorPick: ((c: RGBAColor, alt: boolean) => void) | null = null;
  onRequestText: ((x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, engine: CanvasEngine) {
    this.canvas = canvas;
    this.engine = engine;
    this.store = getStore();
    this.lastTool = this.store.getState().activeTool;
    this.attach();
    this.store.subscribe(() => this.onStoreChange());
    this.startAnts();
  }

  private lastTool = '';
  private onStoreChange(): void {
    const tool = this.store.getState().activeTool;
    if (tool !== this.lastTool) {
      this.lastTool = tool;
      // clear transient state from the previous tool
      if (this.penPoints.length) this.commitPen(false);
      this.overlay = null;
      this.gesture = null;
    }
    this.requestRender();
  }

  // -------------------------------------------------------------------------

  private attach(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    if (this.antsTimer) window.clearInterval(this.antsTimer);
  }

  setSpace(down: boolean): void {
    this.spaceDown = down;
    this.canvas.style.cursor = down ? 'grab' : '';
  }

  // -------------------------------------------------------------------------
  // View transform / coords
  // -------------------------------------------------------------------------

  private artboard(): Artboard | null {
    const doc = this.store.getState().document;
    if (!doc) return null;
    return CanvasEngine.activeArtboard(doc);
  }

  private viewTransform(): ViewTransform {
    const vp = this.store.getState().viewport;
    const ab = this.artboard();
    return { zoom: vp.zoom, panX: vp.panX, panY: vp.panY, originX: ab?.x ?? 0, originY: ab?.y ?? 0 };
  }

  private toArtboard(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return screenToArtboard(clientX, clientY, rect, this.viewTransform());
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private chrome = '#d4d0c8';
  private textColor = '#000';
  setDesktop(color: string): void {
    this.desktop = color || this.desktop;
  }
  setThemeColors(desktop: string, chrome: string, text: string): void {
    if (desktop) this.desktop = desktop;
    if (chrome) this.chrome = chrome;
    if (text) this.textColor = text;
  }

  requestRender = (): void => {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.renderNow();
    });
  };

  renderNow(): void {
    const s = this.store.getState();
    this.engine.render({
      document: s.document,
      viewport: s.viewport,
      selection: s.selection,
      overlay: this.overlay ?? (this.hover && this.brushCursorOverlay()),
      desktop: this.desktop,
      antsOffset: this.antsOffset,
      activeLayerId: s.activeLayerId,
      chrome: this.chrome,
      textColor: this.textColor,
    });
  }

  private startAnts(): void {
    this.antsTimer = window.setInterval(() => {
      const s = this.store.getState();
      if (s.selection || this.overlay) {
        this.antsOffset = (this.antsOffset + 1) % 8;
        this.requestRender();
      }
    }, 100);
  }

  private brushCursorOverlay(): Overlay {
    const s = this.store.getState();
    if (!this.hover) return null;
    const paintTools = new Set([
      'brush',
      'pencil',
      'eraser',
      'cloneStamp',
      'healingBrush',
      'spotHealing',
      'dodge',
      'burn',
      'sponge',
      'blur',
      'sharpen',
      'smudge',
      'colorReplacement',
      'backgroundEraser',
      'mixerBrush',
    ]);
    if (!paintTools.has(s.activeTool)) return null;
    const size = this.opt(s.activeTool, 'brushSize', this.opt(s.activeTool, 'size', 20)) as number;
    return { kind: 'brushCursor', x: this.hover.x, y: this.hover.y, radius: size / 2 };
  }

  // -------------------------------------------------------------------------
  // Tool options access (store first, registry default fallback)
  // -------------------------------------------------------------------------

  opt(toolId: string, optionId: string, fallback: unknown): unknown {
    const stored = this.store.getState().toolOptions[toolId]?.[optionId];
    if (stored !== undefined) return stored;
    const def = getToolById(toolId)?.options.find((o) => o.id === optionId)?.default;
    return def ?? fallback;
  }

  private num(toolId: string, optionId: string, fallback: number): number {
    const v = this.opt(toolId, optionId, fallback);
    return typeof v === 'number' ? v : Number(v) || fallback;
  }

  private bool(toolId: string, optionId: string, fallback: boolean): boolean {
    const v = this.opt(toolId, optionId, fallback);
    return typeof v === 'boolean' ? v : fallback;
  }

  // -------------------------------------------------------------------------
  // Active layer resolution
  // -------------------------------------------------------------------------

  private activeRaster(): RasterLayer | null {
    const s = this.store.getState();
    if (!s.document) return null;
    const layer = s.document.layers.find((l) => l.id === s.activeLayerId);
    if (layer && layer.type === 'raster') return layer as RasterLayer;
    // fall back to topmost raster
    const rasters = s.document.layers.filter((l) => l.type === 'raster') as RasterLayer[];
    return rasters.length ? rasters[rasters.length - 1] : null;
  }

  private ensureActiveRaster(): RasterLayer | null {
    let r = this.activeRaster();
    if (r && r.pixelData) return r;
    const ab = this.artboard();
    if (!ab) return null;
    if (r && !r.pixelData) {
      r.pixelData = transparentImageData(ab.width, ab.height);
      return r;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Selection mask for gesture clipping
  // -------------------------------------------------------------------------

  private gestureSelMask(): Uint8Array | null {
    const s = this.store.getState();
    const ab = this.artboard();
    if (!s.selection || !ab) return null;
    return rasterizeSelection(s.selection, ab.width, ab.height);
  }

  // -------------------------------------------------------------------------
  // Pointer handlers
  // -------------------------------------------------------------------------

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 1 || this.spaceDown) {
      this.beginPan(e);
      return;
    }
    this.canvas.setPointerCapture?.(e.pointerId);
    const { x, y } = this.toArtboard(e.clientX, e.clientY);
    const toolId = this.store.getState().activeTool;
    this.gesture = {
      toolId,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      button: e.button,
      active: true,
    };
    this.dispatchDown(toolId, x, y, e);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { x, y } = this.toArtboard(e.clientX, e.clientY);
    this.hover = { x, y };
    this.emitStatus(x, y);
    if (this.gesture?.toolId === '__pan') {
      this.doPan(e);
      return;
    }
    if (this.gesture?.active) {
      this.dispatchMove(this.gesture.toolId, x, y, e);
      this.gesture.lastX = x;
      this.gesture.lastY = y;
    } else if (this.store.getState().activeTool === 'pen' && this.penPoints.length) {
      this.setPenHover(x, y);
    } else {
      this.requestRender(); // update brush cursor
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.gesture) return;
    if (this.gesture.toolId === '__pan') {
      this.gesture = null;
      this.canvas.style.cursor = this.spaceDown ? 'grab' : '';
      return;
    }
    const { x, y } = this.toArtboard(e.clientX, e.clientY);
    this.dispatchUp(this.gesture.toolId, x, y, e);
    this.gesture = null;
    this.overlay = null;
    this.requestRender();
  };

  private onDblClick = (e: PointerEvent): void => {
    const toolId = this.store.getState().activeTool;
    if (toolId === 'pen' && this.penPoints.length >= 2) {
      this.commitPen(true);
    } else if (toolId === 'polygonalLasso' && this.gesture?.lassoPoints) {
      this.finishPolyLasso();
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const vp = this.store.getState().viewport;
    if (e.ctrlKey || e.metaKey || true) {
      // zoom to cursor
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      this.zoomAt(cx, cy, vp.zoom * factor);
    }
  };

  zoomAt(cssX: number, cssY: number, targetZoom: number): void {
    const vp = this.store.getState().viewport;
    const z = Math.max(0.01, Math.min(32, targetZoom));
    // keep the point under the cursor stationary
    const ax = (cssX - vp.panX) / vp.zoom;
    const ay = (cssY - vp.panY) / vp.zoom;
    const panX = cssX - ax * z;
    const panY = cssY - ay * z;
    this.store.dispatch({ type: 'UPDATE_VIEWPORT', payload: { zoom: z, panX, panY } });
  }

  // -------------------------------------------------------------------------
  // Pan
  // -------------------------------------------------------------------------

  private beginPan(e: PointerEvent): void {
    this.canvas.setPointerCapture?.(e.pointerId);
    const vp = this.store.getState().viewport;
    this.gesture = {
      toolId: '__pan',
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      button: e.button,
      panStartX: vp.panX,
      panStartY: vp.panY,
      active: true,
    };
    this.canvas.style.cursor = 'grabbing';
  }

  private doPan(e: PointerEvent): void {
    if (!this.gesture) return;
    const dx = e.clientX - this.gesture.startX;
    const dy = e.clientY - this.gesture.startY;
    this.store.dispatch({
      type: 'UPDATE_VIEWPORT',
      payload: { panX: (this.gesture.panStartX ?? 0) + dx, panY: (this.gesture.panStartY ?? 0) + dy },
    });
  }

  // -------------------------------------------------------------------------
  // Dispatch by tool
  // -------------------------------------------------------------------------

  private dispatchDown(toolId: string, x: number, y: number, e: PointerEvent): void {
    switch (toolId) {
      case 'move':
        return this.moveDown(x, y, e);
      case 'rectMarquee':
      case 'ellipseMarquee':
      case 'objectSelection':
        return this.marqueeDown(x, y);
      case 'lasso':
      case 'magneticLasso':
        return this.lassoDown(x, y);
      case 'polygonalLasso':
        return this.polyLassoDown(x, y);
      case 'magicWand':
      case 'quickSelection':
        return this.magicWandClick(x, y, e);
      case 'crop':
      case 'perspectiveCrop':
        return this.cropDown(x, y);
      case 'eyedropper':
      case 'colorSampler':
        return this.eyedropper(x, y, e);
      case 'gradient':
        return this.gradientDown(x, y);
      case 'paintBucket':
        return this.bucketFill(x, y);
      case 'hand':
        return this.beginPan(e);
      case 'zoom':
        return this.zoomToolClick(e);
      case 'rectangle':
      case 'roundedRectangle':
      case 'ellipse':
      case 'polygon':
      case 'triangle':
      case 'line':
      case 'customShape':
        return this.shapeDown(toolId, x, y);
      case 'pen':
        return this.penClick(x, y);
      case 'horizontalType':
      case 'verticalType':
        return this.typeClick(x, y);
      case 'cloneStamp':
      case 'patternStamp':
        return this.cloneDown(x, y, e);
      default:
        if (this.isPaintTool(toolId)) return this.paintDown(toolId, x, y);
        return this.unsupported(toolId);
    }
  }

  private dispatchMove(toolId: string, x: number, y: number, e: PointerEvent): void {
    switch (toolId) {
      case 'move':
        return this.moveDrag(x, y);
      case 'rectMarquee':
      case 'ellipseMarquee':
      case 'objectSelection':
        return this.marqueeDrag(toolId, x, y, e);
      case 'lasso':
      case 'magneticLasso':
        return this.lassoDrag(x, y);
      case 'crop':
      case 'perspectiveCrop':
        return this.cropDrag(x, y, e);
      case 'gradient':
        return this.gradientDrag(x, y, e);
      case 'rectangle':
      case 'roundedRectangle':
      case 'ellipse':
      case 'polygon':
      case 'triangle':
      case 'line':
      case 'customShape':
        return this.shapeDrag(toolId, x, y, e);
      case 'cloneStamp':
        return this.cloneDrag(x, y);
      default:
        if (this.isPaintTool(toolId)) return this.paintDrag(toolId, x, y);
    }
  }

  private dispatchUp(toolId: string, x: number, y: number, e: PointerEvent): void {
    switch (toolId) {
      case 'move':
        return this.moveUp();
      case 'rectMarquee':
      case 'ellipseMarquee':
      case 'objectSelection':
        return this.marqueeUp(toolId, x, y, e);
      case 'lasso':
      case 'magneticLasso':
        return this.lassoUp();
      case 'crop':
      case 'perspectiveCrop':
        return; // crop applied via Enter / overlay button
      case 'gradient':
        return this.gradientUp(x, y, e);
      case 'rectangle':
      case 'roundedRectangle':
      case 'ellipse':
      case 'polygon':
      case 'triangle':
      case 'line':
      case 'customShape':
        return this.shapeUp();
      case 'cloneStamp':
        return this.paintCommit();
      default:
        if (this.isPaintTool(toolId)) return this.paintCommit();
    }
  }

  private isPaintTool(toolId: string): boolean {
    return [
      'brush',
      'pencil',
      'eraser',
      'healingBrush',
      'spotHealing',
      'dodge',
      'burn',
      'sponge',
      'blur',
      'sharpen',
      'smudge',
      'colorReplacement',
      'backgroundEraser',
      'mixerBrush',
    ].includes(toolId);
  }

  private unsupported(toolId: string): void {
    const tool = getToolById(toolId);
    if (this.onStatus)
      this.onStatus({ x: 0, y: 0, hint: `${tool?.name ?? toolId}: not yet implemented in this build` });
  }

  // =========================================================================
  // MOVE
  // =========================================================================
  private moveDown(x: number, y: number, e: PointerEvent): void {
    const s = this.store.getState();
    const layer = s.document?.layers.find((l) => l.id === s.activeLayerId);
    if (!layer) return;
    this.store.beginHistory('Move');
    if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
      this.gesture!.originalPixels = new ImageData(
        new Uint8ClampedArray((layer as RasterLayer).pixelData!.data),
        (layer as RasterLayer).pixelData!.width,
        (layer as RasterLayer).pixelData!.height
      );
    } else if (layer.type === 'vector') {
      this.gesture!.origPaths = JSON.parse(JSON.stringify((layer as VectorLayer).paths));
    } else if (layer.type === 'text') {
      this.gesture!.origText = { x: (layer as any).x, y: (layer as any).y };
    }
  }
  private moveDrag(x: number, y: number): void {
    const g = this.gesture!;
    const dx = Math.round(x - g.startX);
    const dy = Math.round(y - g.startY);
    const s = this.store.getState();
    const layer = s.document?.layers.find((l) => l.id === s.activeLayerId);
    if (!layer) return;
    if (layer.type === 'raster' && g.originalPixels) {
      (layer as RasterLayer).pixelData = paint.translateImageData(g.originalPixels, dx, dy);
    } else if (layer.type === 'vector' && g.origPaths) {
      (layer as VectorLayer).paths = g.origPaths.map((p) => ({
        ...p,
        points: p.points.map((pt) => ({
          ...pt,
          x: pt.x + dx,
          y: pt.y + dy,
          handleIn: pt.handleIn ? { x: pt.handleIn.x + dx, y: pt.handleIn.y + dy } : undefined,
          handleOut: pt.handleOut ? { x: pt.handleOut.x + dx, y: pt.handleOut.y + dy } : undefined,
        })),
      }));
    } else if (layer.type === 'text' && g.origText) {
      (layer as any).x = g.origText.x + dx;
      (layer as any).y = g.origText.y + dy;
    }
    this.requestRender();
  }
  private moveUp(): void {
    const s = this.store.getState();
    const layer = s.document?.layers.find((l) => l.id === s.activeLayerId);
    if (layer) this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: {} } });
    this.store.commitHistory('Move');
  }

  /** Arrow-key nudge for the active layer. */
  nudge(dx: number, dy: number): void {
    const s = this.store.getState();
    const layer = s.document?.layers.find((l) => l.id === s.activeLayerId);
    if (!layer || layer.type !== 'raster' || !(layer as RasterLayer).pixelData) return;
    this.store.commit('Nudge', () => {
      const rl = layer as RasterLayer;
      rl.pixelData = paint.translateImageData(rl.pixelData!, dx, dy);
      this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: {} } });
    });
  }

  // =========================================================================
  // MARQUEE
  // =========================================================================
  private marqueeDown(x: number, y: number): void {
    this.overlay = {
      kind: 'marquee',
      shape: this.store.getState().activeTool === 'ellipseMarquee' ? 'ellipse' : 'rect',
      x,
      y,
      w: 0,
      h: 0,
    };
  }
  private marqueeDrag(toolId: string, x: number, y: number, e: PointerEvent): void {
    const g = this.gesture!;
    let w = x - g.startX;
    let h = y - g.startY;
    if (e.shiftKey) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w) * m;
      h = Math.sign(h) * m;
    }
    let ox = g.startX;
    let oy = g.startY;
    if (e.altKey) {
      ox = g.startX - w;
      oy = g.startY - h;
      w *= 2;
      h *= 2;
    }
    this.overlay = {
      kind: 'marquee',
      shape: toolId === 'ellipseMarquee' ? 'ellipse' : 'rect',
      x: w < 0 ? ox + w : ox,
      y: h < 0 ? oy + h : oy,
      w: Math.abs(w),
      h: Math.abs(h),
    };
    this.requestRender();
  }
  private marqueeUp(toolId: string, x: number, y: number, e: PointerEvent): void {
    const o = this.overlay;
    this.overlay = null;
    if (!o || o.kind !== 'marquee' || o.w < 1 || o.h < 1) return;
    const sel: SelectionData = {
      type: toolId === 'ellipseMarquee' ? 'ellipse' : 'rect',
      bounds: { x: o.x, y: o.y, width: o.w, height: o.h },
      antiAlias: this.bool(toolId, 'antiAlias', true),
      feather: this.num(toolId, 'feather', 0),
    };
    this.store.commit('Marquee', () => this.store.dispatch({ type: 'SET_SELECTION', payload: sel }));
  }

  // =========================================================================
  // LASSO
  // =========================================================================
  private lassoDown(x: number, y: number): void {
    this.gesture!.lassoPoints = [{ x, y }];
    this.overlay = { kind: 'lasso', points: this.gesture!.lassoPoints };
  }
  private lassoDrag(x: number, y: number): void {
    const pts = this.gesture!.lassoPoints!;
    pts.push({ x, y });
    this.overlay = { kind: 'lasso', points: pts };
    this.requestRender();
  }
  private lassoUp(): void {
    const pts = this.gesture!.lassoPoints!;
    this.overlay = null;
    if (pts.length < 3) return;
    const sel: SelectionData = {
      type: 'polygon',
      path: { id: uid('sel'), closed: true, points: pts.map((p) => ({ ...p, cornerType: 'corner' as const })) },
      antiAlias: true,
    };
    this.store.commit('Lasso', () => this.store.dispatch({ type: 'SET_SELECTION', payload: sel }));
  }

  private polyLassoDown(x: number, y: number): void {
    if (!this.gesture!.lassoPoints) this.gesture!.lassoPoints = [];
    // polygonal lasso accumulates across clicks; keep points on the controller
    this.penOrPolyAdd(x, y);
  }
  private penOrPolyAdd(x: number, y: number): void {
    // shared point accumulation list lives in penPoints for poly lasso too
    this.penPoints.push({ x, y });
    this.overlay = { kind: 'lasso', points: this.penPoints.slice() };
    this.requestRender();
  }
  private finishPolyLasso(): void {
    if (this.penPoints.length < 3) {
      this.penPoints = [];
      this.overlay = null;
      return;
    }
    const pts = this.penPoints.slice();
    this.penPoints = [];
    this.overlay = null;
    const sel: SelectionData = {
      type: 'polygon',
      path: { id: uid('sel'), closed: true, points: pts.map((p) => ({ ...p, cornerType: 'corner' as const })) },
      antiAlias: true,
    };
    this.store.commit('Polygonal Lasso', () =>
      this.store.dispatch({ type: 'SET_SELECTION', payload: sel })
    );
  }

  // =========================================================================
  // MAGIC WAND
  // =========================================================================
  private magicWandClick(x: number, y: number, e: PointerEvent): void {
    const raster = this.activeRaster();
    const ab = this.artboard();
    if (!ab) return;
    // sample from the composited artboard so it works even on multi-layer docs
    const comp = this.engine.composeArtboardCopy(this.store.getState().document!, true);
    const data = comp.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, ab.width, ab.height);
    // sync wand options into toolEngine then run
    toolEngine.setToolOption('magicWand', 'tolerance', this.num('magicWand', 'tolerance', 32));
    toolEngine.setToolOption('magicWand', 'contiguous', this.bool('magicWand', 'contiguous', true));
    toolEngine.setToolOption('magicWand', 'antiAlias', this.bool('magicWand', 'antiAlias', true));
    const sel = toolEngine.handleMagicWand(
      { type: 'mousedown', x: 0, y: 0, canvasX: x, canvasY: y, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey },
      data
    );
    if (sel) this.store.commit('Magic Wand', () => this.store.dispatch({ type: 'SET_SELECTION', payload: sel }));
  }

  // =========================================================================
  // CROP
  // =========================================================================
  private cropDown(x: number, y: number): void {
    this.overlay = { kind: 'crop', x, y, w: 0, h: 0 };
  }
  private cropDrag(x: number, y: number, e: PointerEvent): void {
    const g = this.gesture!;
    let w = x - g.startX;
    let h = y - g.startY;
    this.overlay = {
      kind: 'crop',
      x: w < 0 ? x : g.startX,
      y: h < 0 ? y : g.startY,
      w: Math.abs(w),
      h: Math.abs(h),
    };
    this.requestRender();
  }
  /** Apply the current crop overlay (called by Enter or a button). */
  applyCrop(): void {
    const o = this.overlay;
    if (!o || o.kind !== 'crop' || o.w < 2 || o.h < 2) return;
    const s = this.store.getState();
    const doc = s.document;
    if (!doc) return;
    const ab = CanvasEngine.activeArtboard(doc);
    const cx = Math.round(Math.max(0, o.x));
    const cy = Math.round(Math.max(0, o.y));
    const cw = Math.round(Math.min(ab.width - cx, o.w));
    const ch = Math.round(Math.min(ab.height - cy, o.h));
    this.store.commit('Crop', () => {
      for (const layer of doc.layers) {
        if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
          const rl = layer as RasterLayer;
          rl.pixelData = paint.cropImageData(rl.pixelData!, cx, cy, cw, ch);
          rl.width = cw;
          rl.height = ch;
        }
      }
      this.store.dispatch({
        type: 'UPDATE_DOCUMENT',
        payload: {
          artboards: doc.artboards.map((a) =>
            a.id === ab.id ? { ...a, width: cw, height: ch } : a
          ),
        },
      });
      this.store.dispatch({ type: 'SET_SELECTION', payload: null });
    });
    this.overlay = null;
    this.requestRender();
  }

  // =========================================================================
  // EYEDROPPER
  // =========================================================================
  private eyedropper(x: number, y: number, e: PointerEvent): void {
    const ab = this.artboard();
    const doc = this.store.getState().document;
    if (!ab || !doc) return;
    const comp = this.engine.composeArtboardCopy(doc, true);
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= ab.width || py >= ab.height) return;
    const d = comp.getContext('2d', { willReadFrequently: true })!.getImageData(px, py, 1, 1).data;
    const color: RGBAColor = { r: d[0], g: d[1], b: d[2], a: 1 };
    this.onColorPick?.(color, e.altKey);
  }

  // =========================================================================
  // PAINT (brush/pencil/eraser/tone/etc.)
  // =========================================================================
  private paintDown(toolId: string, x: number, y: number): void {
    const raster = this.ensureActiveRaster();
    if (!raster || !raster.pixelData) {
      this.unsupported(toolId);
      return;
    }
    this.store.beginHistory(getToolById(toolId)?.name ?? 'Paint');
    this.gesture!.selMask = this.gestureSelMask();
    this.gesture!.originalPixels = undefined;
    this.stamp(toolId, x, y, x, y);
  }
  private paintDrag(toolId: string, x: number, y: number): void {
    const g = this.gesture!;
    this.stamp(toolId, g.lastX, g.lastY, x, y);
  }
  private paintCommit(): void {
    const r = this.activeRaster();
    if (r) this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id: r.id, changes: {} } });
    this.store.commitHistory();
  }

  private stamp(toolId: string, x0: number, y0: number, x1: number, y1: number): void {
    const raster = this.activeRaster();
    if (!raster || !raster.pixelData) return;
    const s = this.store.getState();
    const size = this.num(toolId, 'brushSize', this.num(toolId, 'size', 20));
    const hardness = this.num(toolId, 'hardness', 50);
    const opacity = this.num(toolId, 'opacity', 100) / 100;
    const flow = this.num(toolId, 'flow', 100) / 100;
    const params: paint.StampParams = {
      size,
      hardness,
      strength: opacity * flow,
      mask: this.gesture?.selMask ?? null,
      color: s.foreground,
    };
    paint.strokeSegment(raster.pixelData, x0, y0, x1, y1, toolId, params, {
      cloneSource: this.cloneSource,
      cloneOffset: this.gesture?.cloneOffset ?? null,
      exposure: this.num(toolId, 'exposure', 50) / 100,
      range: String(this.opt(toolId, 'range', 'Midtones')),
    });
    this.requestRender();
  }

  // =========================================================================
  // CLONE STAMP
  // =========================================================================
  private cloneDown(x: number, y: number, e: PointerEvent): void {
    if (e.altKey) {
      this.cloneSource = { x, y };
      this.gesture = null; // alt-click just sets source
      if (this.onStatus) this.onStatus({ x, y, hint: 'Clone source set' });
      return;
    }
    if (!this.cloneSource) {
      this.unsupported('cloneStamp');
      this.gesture = null;
      return;
    }
    const raster = this.ensureActiveRaster();
    if (!raster) return;
    this.store.beginHistory('Clone Stamp');
    this.gesture!.selMask = this.gestureSelMask();
    this.gesture!.cloneOffset = { dx: this.cloneSource.x - x, dy: this.cloneSource.y - y };
    this.stamp('cloneStamp', x, y, x, y);
  }
  private cloneDrag(x: number, y: number): void {
    const g = this.gesture!;
    this.stamp('cloneStamp', g.lastX, g.lastY, x, y);
  }

  // =========================================================================
  // PAINT BUCKET
  // =========================================================================
  private bucketFill(x: number, y: number): void {
    const raster = this.ensureActiveRaster();
    if (!raster || !raster.pixelData) {
      this.unsupported('paintBucket');
      return;
    }
    const tol = this.num('paintBucket', 'tolerance', 32);
    const mask = this.gestureSelMask();
    this.store.commit('Paint Bucket', () => {
      paint.floodFill(raster.pixelData!, Math.floor(x), Math.floor(y), this.store.getState().foreground, tol, mask);
      this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id: raster.id, changes: {} } });
    });
    this.requestRender();
  }

  // =========================================================================
  // GRADIENT
  // =========================================================================
  private gradientDown(x: number, y: number): void {
    const raster = this.ensureActiveRaster();
    if (!raster) {
      this.unsupported('gradient');
      this.gesture = null;
      return;
    }
    this.overlay = { kind: 'gradient', x1: x, y1: y, x2: x, y2: y };
  }
  private gradientDrag(x: number, y: number, e: PointerEvent): void {
    const g = this.gesture!;
    let ex = x;
    let ey = y;
    if (e.shiftKey) {
      // constrain to 45°
      const dx = x - g.startX;
      const dy = y - g.startY;
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(dx, dy);
      ex = g.startX + Math.cos(ang) * len;
      ey = g.startY + Math.sin(ang) * len;
    }
    this.overlay = { kind: 'gradient', x1: g.startX, y1: g.startY, x2: ex, y2: ey };
    this.requestRender();
  }
  private gradientUp(x: number, y: number, e: PointerEvent): void {
    const o = this.overlay;
    this.overlay = null;
    const raster = this.activeRaster();
    if (!o || o.kind !== 'gradient' || !raster || !raster.pixelData) return;
    const s = this.store.getState();
    const shape = String(this.opt('gradient', 'type', 'Linear'));
    const reverse = this.bool('gradient', 'reverse', false);
    const mask = this.gestureSelMask();
    this.store.commit('Gradient', () => {
      paint.drawGradient(
        raster.pixelData!,
        o.x1,
        o.y1,
        o.x2,
        o.y2,
        s.foreground,
        s.background,
        shape,
        reverse,
        mask
      );
      this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id: raster.id, changes: {} } });
    });
    this.requestRender();
  }

  // =========================================================================
  // SHAPES (vector)
  // =========================================================================
  private shapeDown(toolId: string, x: number, y: number): void {
    const s = this.store.getState();
    const order = s.document ? s.document.layers.length : 0;
    const id = uid('layer');
    this.gesture!.shapeLayerId = id;
    const layer: VectorLayer = {
      id,
      name: getToolById(toolId)?.name ?? 'Shape',
      type: 'vector',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      order,
      paths: [],
      fill: { type: 'solid', color: s.foreground, opacity: 1 },
      stroke: undefined,
    };
    this.store.beginHistory('Shape');
    this.store.dispatch({ type: 'ADD_LAYER', payload: layer });
  }
  private shapeDrag(toolId: string, x: number, y: number, e: PointerEvent): void {
    const g = this.gesture!;
    let w = x - g.startX;
    let h = y - g.startY;
    if (e.shiftKey) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w) * m;
      h = Math.sign(h) * m;
    }
    const x0 = Math.min(g.startX, g.startX + w);
    const y0 = Math.min(g.startY, g.startY + h);
    const aw = Math.abs(w);
    const ah = Math.abs(h);
    const path = paint.makeShapePath(toolId, x0, y0, aw, ah, this.num(toolId, 'sides', 5));
    const id = g.shapeLayerId!;
    const layer = this.store.getState().document?.layers.find((l) => l.id === id);
    if (layer && layer.type === 'vector') {
      (layer as VectorLayer).paths = [path];
      this.requestRender();
    }
    this.overlay = { kind: 'shape', shape: toolId, x: x0, y: y0, w: aw, h: ah };
  }
  private shapeUp(): void {
    const id = this.gesture?.shapeLayerId;
    this.overlay = null;
    if (id) this.store.dispatch({ type: 'UPDATE_LAYER', payload: { id, changes: {} } });
    this.store.commitHistory('Shape');
  }

  // =========================================================================
  // PEN
  // =========================================================================
  private penClick(x: number, y: number): void {
    // close path if clicking near the first point
    if (this.penPoints.length >= 2) {
      const first = this.penPoints[0];
      if (Math.hypot(first.x - x, first.y - y) < 8) {
        this.commitPen(true);
        return;
      }
    }
    this.penPoints.push({ x, y });
    this.overlay = { kind: 'pen', points: this.penPoints.slice(), closed: false };
    this.gesture = null; // pen is click-based, not drag
    this.requestRender();
  }
  setPenHover(x: number, y: number): void {
    if (this.store.getState().activeTool !== 'pen' || this.penPoints.length === 0) return;
    this.overlay = { kind: 'pen', points: this.penPoints.slice(), closed: false, hover: { x, y } };
    this.requestRender();
  }
  private commitPen(closed: boolean): void {
    if (this.penPoints.length < 2) {
      this.penPoints = [];
      this.overlay = null;
      return;
    }
    const s = this.store.getState();
    const pts = this.penPoints.map((p) => ({ ...p, cornerType: 'corner' as const }));
    this.penPoints = [];
    this.overlay = null;
    const order = s.document ? s.document.layers.length : 0;
    const layer: VectorLayer = {
      id: uid('layer'),
      name: 'Path',
      type: 'vector',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      order,
      paths: [{ id: uid('path'), closed, points: pts }],
      fill: closed ? { type: 'solid', color: s.foreground, opacity: 1 } : undefined,
      stroke: { color: s.foreground, width: 1, lineCap: 'round', lineJoin: 'round', miterLimit: 4, opacity: 1 },
    };
    this.store.commit('Pen Path', () => this.store.dispatch({ type: 'ADD_LAYER', payload: layer }));
    this.requestRender();
  }

  // =========================================================================
  // TYPE
  // =========================================================================
  private typeClick(x: number, y: number): void {
    this.gesture = null;
    this.onRequestText?.(x, y);
  }

  // =========================================================================
  // ZOOM TOOL
  // =========================================================================
  private zoomToolClick(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const vp = this.store.getState().viewport;
    const factor = e.altKey ? 1 / 1.5 : 1.5;
    this.zoomAt(cx, cy, vp.zoom * factor);
    this.gesture = null;
  }

  // -------------------------------------------------------------------------

  private emitStatus(x: number, y: number): void {
    if (this.onStatus) {
      const tool = getToolById(this.store.getState().activeTool);
      this.onStatus({ x: Math.round(x), y: Math.round(y), hint: tool?.description ?? '' });
    }
  }
}
