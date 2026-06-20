/**
 * Stratum Canvas Engine — single render path (B10–B16).
 *
 * Pure renderer: it owns no viewport/interaction state. `render()` is called with the
 * live document + viewport + selection + transient overlay. Layers are composited into an
 * artboard-resolution offscreen so blend modes and adjustment-over-composite work
 * correctly, then blitted to the visible canvas under the viewport transform.
 */

import type {
  Document,
  Artboard,
  Layer,
  RasterLayer,
  VectorLayer,
  TextLayer,
  FillLayer,
  AdjustmentLayer,
  VectorPath,
  FillStyle,
  ViewportState,
  SelectionData,
  BlendMode,
  RGBAColor,
} from '../../types';
import { Adjustments } from './Adjustments';
import { rasterizeSelection, maskBoundarySegments } from '../interaction/selection';
import { rgbaToCss } from '../color/color';

export type Overlay =
  | { kind: 'marquee'; shape: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number }
  | { kind: 'lasso'; points: { x: number; y: number }[]; closed?: boolean }
  | { kind: 'crop'; x: number; y: number; w: number; h: number }
  | { kind: 'gradient'; x1: number; y1: number; x2: number; y2: number }
  | {
      kind: 'transform';
      x: number;
      y: number;
      w: number;
      h: number;
      rotation?: number;
    }
  | { kind: 'pen'; points: { x: number; y: number }[]; closed: boolean; hover?: { x: number; y: number } }
  | { kind: 'shape'; shape: string; x: number; y: number; w: number; h: number }
  | { kind: 'brushCursor'; x: number; y: number; radius: number }
  | null;

export interface RenderInput {
  document: Document | null;
  viewport: ViewportState;
  selection: SelectionData | null;
  overlay?: Overlay;
  desktop: string;
  antsOffset: number;
  activeLayerId: string | null;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private cssWidth = 0;
  private cssHeight = 0;

  private comp: HTMLCanvasElement;
  private layerCanvases: Map<string, HTMLCanvasElement> = new Map();

  // Cached marching-ants path for magic masks (rebuilt only when the selection changes).
  private antsCacheSel: SelectionData | null = null;
  private antsCachePath: Path2D | null = null;

  private lastInput: RenderInput | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true, willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.comp = document.createElement('canvas');
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Size the backing store to rect*dpr (B15). Returns true if the size changed. */
  resize(cssWidth: number, cssHeight: number): boolean {
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cssWidth * this.dpr));
    const h = Math.max(1, Math.round(cssHeight * this.dpr));
    if (this.canvas.width === w && this.canvas.height === h) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    return true;
  }

  getCssSize(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  static activeArtboard(doc: Document): Artboard {
    return doc.artboards.find((a) => a.id === doc.activeArtboardId) ?? doc.artboards[0];
  }

  render(input: RenderInput): void {
    this.lastInput = input;
    const { ctx, dpr } = this;
    const vp = input.viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Desktop background fills the whole viewport.
    ctx.fillStyle = input.desktop;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    if (!input.document || input.document.artboards.length === 0) return;
    const doc = input.document;
    const ab = CanvasEngine.activeArtboard(doc);

    ctx.save();
    ctx.translate(vp.panX, vp.panY);
    ctx.scale(vp.zoom, vp.zoom);

    // Drop shadow + border + checkerboard for the artboard.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8 / vp.zoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 / vp.zoom;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
    ctx.restore();

    this.drawCheckerboard(ab, vp.zoom);
    if (ab.backgroundColor) {
      ctx.fillStyle = rgbaToCss(ab.backgroundColor);
      ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
    }

    // Composite all layers into the artboard-resolution offscreen.
    const comp = this.compositeLayers(doc, ab);
    ctx.imageSmoothingEnabled = vp.zoom < 1;
    ctx.drawImage(comp, ab.x, ab.y);

    // Artboard hairline border.
    ctx.lineWidth = 1 / vp.zoom;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(ab.x, ab.y, ab.width, ab.height);

    // Overlays drawn in artboard space so they track the image.
    this.drawSelectionAnts(input.selection, ab, vp.zoom, input.antsOffset);
    this.drawOverlay(input.overlay, ab, vp.zoom);

    ctx.restore();
  }

  rerenderLast(antsOffset: number): void {
    if (this.lastInput) this.render({ ...this.lastInput, antsOffset });
  }

  // -------------------------------------------------------------------------
  // Compositing
  // -------------------------------------------------------------------------

  private compositeLayers(doc: Document, ab: Artboard): HTMLCanvasElement {
    const comp = this.comp;
    if (comp.width !== ab.width || comp.height !== ab.height) {
      comp.width = ab.width;
      comp.height = ab.height;
    }
    const cctx = comp.getContext('2d', { willReadFrequently: true })!;
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, ab.width, ab.height);

    const layers = [...doc.layers].sort((a, b) => a.order - b.order);
    for (const layer of layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      if (layer.type === 'adjustment') {
        this.applyAdjustmentLayer(cctx, layer as AdjustmentLayer, ab);
        continue;
      }

      const lc = this.rasterizeLayer(layer, ab);
      if (!lc) continue;
      cctx.globalAlpha = layer.opacity;
      cctx.globalCompositeOperation = mapBlend(layer.blendMode);
      cctx.drawImage(lc, 0, 0);
      cctx.globalAlpha = 1;
      cctx.globalCompositeOperation = 'source-over';
    }
    return comp;
  }

  private applyAdjustmentLayer(
    cctx: CanvasRenderingContext2D,
    layer: AdjustmentLayer,
    ab: Artboard
  ): void {
    // Snapshot composite-so-far, run the adjustment, blend back within mask + opacity.
    const region = cctx.getImageData(0, 0, ab.width, ab.height);
    const src = new ImageData(new Uint8ClampedArray(region.data), region.width, region.height);
    const adjusted = Adjustments.apply(src, layer.adjustmentType, layer.settings);
    const out = region.data;
    const adj = adjusted.data;
    const op = layer.opacity;
    for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3];
      if (a === 0) continue; // only affect where pixels exist
      out[i] = out[i] + (adj[i] - out[i]) * op;
      out[i + 1] = out[i + 1] + (adj[i + 1] - out[i + 1]) * op;
      out[i + 2] = out[i + 2] + (adj[i + 2] - out[i + 2]) * op;
    }
    cctx.putImageData(region, 0, 0);
  }

  private getLayerCanvas(id: string, w: number, h: number): HTMLCanvasElement {
    let c = this.layerCanvases.get(id);
    if (!c) {
      c = document.createElement('canvas');
      this.layerCanvases.set(id, c);
    }
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    return c;
  }

  private rasterizeLayer(layer: Layer, ab: Artboard): HTMLCanvasElement | null {
    switch (layer.type) {
      case 'raster': {
        const rl = layer as RasterLayer;
        if (!rl.pixelData) return null;
        const c = this.getLayerCanvas(layer.id, rl.pixelData.width, rl.pixelData.height);
        const lc = c.getContext('2d')!;
        lc.putImageData(rl.pixelData, 0, 0);
        return c;
      }
      case 'fill': {
        const fl = layer as FillLayer;
        const c = this.getLayerCanvas(layer.id, ab.width, ab.height);
        const lc = c.getContext('2d')!;
        lc.clearRect(0, 0, ab.width, ab.height);
        this.applyFillStyle(lc, fl.fill, 0, 0, ab.width, ab.height);
        lc.fillRect(0, 0, ab.width, ab.height);
        return c;
      }
      case 'vector': {
        const vl = layer as VectorLayer;
        const c = this.getLayerCanvas(layer.id, ab.width, ab.height);
        const lc = c.getContext('2d')!;
        lc.clearRect(0, 0, ab.width, ab.height);
        this.drawVectorLayer(lc, vl, ab);
        return c;
      }
      case 'text': {
        const tl = layer as TextLayer;
        const c = this.getLayerCanvas(layer.id, ab.width, ab.height);
        const lc = c.getContext('2d')!;
        lc.clearRect(0, 0, ab.width, ab.height);
        this.drawTextLayer(lc, tl);
        return c;
      }
      default:
        return null;
    }
  }

  private applyFillStyle(
    lc: CanvasRenderingContext2D,
    fill: FillStyle,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    if (fill.type === 'gradient' && fill.gradient) {
      const g = fill.gradient;
      const grad =
        g.type === 'radial'
          ? lc.createRadialGradient(g.startX, g.startY, 0, g.startX, g.startY, Math.hypot(g.endX - g.startX, g.endY - g.startY))
          : lc.createLinearGradient(g.startX, g.startY, g.endX, g.endY);
      for (const s of g.stops) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), rgbaToCss(s.color));
      lc.fillStyle = grad;
    } else {
      lc.fillStyle = fill.color ? rgbaToCss(fill.color) : '#000';
    }
    lc.globalAlpha = fill.opacity ?? 1;
  }

  private drawVectorLayer(lc: CanvasRenderingContext2D, vl: VectorLayer, ab: Artboard): void {
    for (const path of vl.paths) {
      const p2d = buildPath2D(path);
      const fill = path.fill ?? vl.fill;
      const stroke = path.stroke ?? vl.stroke;
      if (fill && fill.type !== undefined) {
        lc.save();
        this.applyFillStyle(lc, fill, 0, 0, ab.width, ab.height);
        lc.fill(p2d);
        lc.restore();
      }
      if (stroke && stroke.width > 0) {
        lc.save();
        lc.strokeStyle = rgbaToCss(stroke.color);
        lc.lineWidth = stroke.width;
        lc.lineCap = stroke.lineCap;
        lc.lineJoin = stroke.lineJoin;
        lc.globalAlpha = stroke.opacity ?? 1;
        if (stroke.dashArray) lc.setLineDash(stroke.dashArray);
        lc.stroke(p2d);
        lc.restore();
      }
    }
  }

  private drawTextLayer(lc: CanvasRenderingContext2D, tl: TextLayer): void {
    lc.save();
    lc.fillStyle = rgbaToCss(tl.color);
    lc.textBaseline = 'alphabetic';
    lc.textAlign = tl.align;
    const weight = typeof tl.fontWeight === 'number' ? tl.fontWeight : tl.fontWeight;
    lc.font = `${tl.fontStyle === 'italic' ? 'italic ' : ''}${weight} ${tl.fontSize}px ${tl.fontFamily}`;
    if ('letterSpacing' in lc) {
      try {
        (lc as any).letterSpacing = `${tl.tracking}px`;
      } catch {
        /* unsupported */
      }
    }
    const lines = tl.text.split('\n');
    let y = tl.y + tl.fontSize;
    for (const line of lines) {
      lc.fillText(line, tl.x, y);
      y += tl.leading || tl.fontSize * 1.2;
    }
    lc.restore();
  }

  // -------------------------------------------------------------------------
  // Overlays
  // -------------------------------------------------------------------------

  private drawCheckerboard(ab: Artboard, zoom: number): void {
    const ctx = this.ctx;
    const size = 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ab.x, ab.y, ab.width, ab.height);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
    ctx.fillStyle = '#cccccc';
    const cols = Math.ceil(ab.width / size);
    const rows = Math.ceil(ab.height / size);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) ctx.fillRect(ab.x + c * size, ab.y + r * size, size, size);
      }
    }
    ctx.restore();
  }

  private drawSelectionAnts(
    sel: SelectionData | null,
    ab: Artboard,
    zoom: number,
    antsOffset: number
  ): void {
    if (!sel) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ab.x, ab.y);
    const lw = 1 / zoom;
    const dash = 4 / zoom;

    let path: Path2D | null = null;
    if (sel.type === 'rect' && sel.bounds) {
      path = new Path2D();
      path.rect(sel.bounds.x, sel.bounds.y, sel.bounds.width, sel.bounds.height);
    } else if (sel.type === 'ellipse' && sel.bounds) {
      path = new Path2D();
      const b = sel.bounds;
      path.ellipse(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, b.height / 2, 0, 0, Math.PI * 2);
    } else if ((sel.type === 'polygon' || sel.type === 'path') && sel.path) {
      path = new Path2D();
      const pts = sel.path.points;
      pts.forEach((p, i) => (i === 0 ? path!.moveTo(p.x, p.y) : path!.lineTo(p.x, p.y)));
      path.closePath();
    } else if (sel.type === 'magic' && sel.mask) {
      if (this.antsCacheSel !== sel) {
        const seg = maskBoundarySegments(sel.mask, sel.maskWidth ?? ab.width, sel.maskHeight ?? ab.height);
        const p = new Path2D();
        for (let i = 0; i < seg.length; i += 4) {
          p.moveTo(seg[i], seg[i + 1]);
          p.lineTo(seg[i + 2], seg[i + 3]);
        }
        this.antsCachePath = p;
        this.antsCacheSel = sel;
      }
      path = this.antsCachePath;
    }
    if (path) {
      ctx.lineWidth = lw;
      ctx.setLineDash([dash, dash]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineDashOffset = 0;
      ctx.stroke(path);
      ctx.strokeStyle = '#000000';
      ctx.lineDashOffset = antsOffset / zoom;
      ctx.stroke(path);
    }
    ctx.restore();
  }

  private drawOverlay(overlay: Overlay | undefined, ab: Artboard, zoom: number): void {
    if (!overlay) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ab.x, ab.y);
    const lw = 1 / zoom;
    ctx.lineWidth = lw;

    const antsStroke = (draw: () => void) => {
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineDashOffset = 0;
      draw();
      ctx.strokeStyle = '#000000';
      ctx.lineDashOffset = 4 / zoom;
      draw();
      ctx.setLineDash([]);
    };

    switch (overlay.kind) {
      case 'marquee': {
        const { x, y, w, h } = overlay;
        antsStroke(() => {
          ctx.beginPath();
          if (overlay.shape === 'ellipse') {
            ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.stroke();
        });
        break;
      }
      case 'lasso': {
        antsStroke(() => {
          ctx.beginPath();
          overlay.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          if (overlay.closed) ctx.closePath();
          ctx.stroke();
        });
        break;
      }
      case 'crop': {
        // Darken outside the crop rect.
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.rect(0, 0, ab.width, ab.height);
        ctx.rect(overlay.x, overlay.y, overlay.w, overlay.h);
        ctx.fill('evenodd');
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([]);
        ctx.strokeRect(overlay.x, overlay.y, overlay.w, overlay.h);
        // rule-of-thirds
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(overlay.x + (overlay.w * i) / 3, overlay.y);
          ctx.lineTo(overlay.x + (overlay.w * i) / 3, overlay.y + overlay.h);
          ctx.moveTo(overlay.x, overlay.y + (overlay.h * i) / 3);
          ctx.lineTo(overlay.x + overlay.w, overlay.y + (overlay.h * i) / 3);
          ctx.stroke();
        }
        this.drawHandles(overlay.x, overlay.y, overlay.w, overlay.h, zoom);
        break;
      }
      case 'gradient': {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(overlay.x1, overlay.y1);
        ctx.lineTo(overlay.x2, overlay.y2);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        break;
      }
      case 'transform': {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(overlay.x, overlay.y, overlay.w, overlay.h);
        this.drawHandles(overlay.x, overlay.y, overlay.w, overlay.h, zoom);
        break;
      }
      case 'shape': {
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(overlay.x, overlay.y, overlay.w, overlay.h);
        break;
      }
      case 'pen': {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        overlay.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        if (overlay.hover && overlay.points.length) ctx.lineTo(overlay.hover.x, overlay.hover.y);
        if (overlay.closed) ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        for (const p of overlay.points) {
          ctx.beginPath();
          ctx.rect(p.x - 2.5 / zoom, p.y - 2.5 / zoom, 5 / zoom, 5 / zoom);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'brushCursor': {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.arc(overlay.x, overlay.y, Math.max(0.5, overlay.radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(overlay.x, overlay.y, Math.max(0.5, overlay.radius) + 1 / zoom, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  private drawHandles(x: number, y: number, w: number, h: number, zoom: number): void {
    const ctx = this.ctx;
    const s = 6 / zoom;
    const pts = [
      [x, y],
      [x + w / 2, y],
      [x + w, y],
      [x + w, y + h / 2],
      [x + w, y + h],
      [x + w / 2, y + h],
      [x, y + h],
      [x, y + h / 2],
    ];
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 / zoom;
    for (const [px, py] of pts) {
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.strokeRect(px - s / 2, py - s / 2, s, s);
    }
  }

  /**
   * Composite the active artboard at native resolution into a fresh canvas (no overlays,
   * no viewport). Used by Export and project thumbnails. `flattenBg` fills the artboard
   * background (or white) for formats without alpha.
   */
  composeArtboardCopy(doc: Document, flattenBg = false): HTMLCanvasElement {
    const ab = CanvasEngine.activeArtboard(doc);
    const comp = this.compositeLayers(doc, ab);
    const out = document.createElement('canvas');
    out.width = ab.width;
    out.height = ab.height;
    const octx = out.getContext('2d')!;
    if (flattenBg) {
      octx.fillStyle = ab.backgroundColor ? rgbaToCss(ab.backgroundColor) : '#ffffff';
      octx.fillRect(0, 0, ab.width, ab.height);
    }
    octx.drawImage(comp, 0, 0);
    return out;
  }

  dispose(): void {
    this.layerCanvases.clear();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a blend mode to a Canvas globalCompositeOperation (B10). */
export function mapBlend(mode: BlendMode): GlobalCompositeOperation {
  switch (mode) {
    case 'normal':
    case 'passthrough':
      return 'source-over';
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'color-dodge':
      return 'color-dodge';
    case 'color-burn':
      return 'color-burn';
    case 'hard-light':
      return 'hard-light';
    case 'soft-light':
      return 'soft-light';
    case 'difference':
      return 'difference';
    case 'exclusion':
      return 'exclusion';
    case 'hue':
      return 'hue';
    case 'saturation':
      return 'saturation';
    case 'color':
      return 'color';
    case 'luminosity':
      return 'luminosity';
    default:
      return 'source-over';
  }
}

export function buildPath2D(path: VectorPath): Path2D {
  const p = new Path2D();
  const pts = path.points;
  if (pts.length === 0) return p;
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const cur = pts[i];
    const next = pts[i + 1];
    const c1 = cur.handleOut ?? { x: cur.x, y: cur.y };
    const c2 = next.handleIn ?? { x: next.x, y: next.y };
    p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, next.x, next.y);
  }
  if (path.closed && pts.length > 1) {
    const cur = pts[pts.length - 1];
    const next = pts[0];
    const c1 = cur.handleOut ?? { x: cur.x, y: cur.y };
    const c2 = next.handleIn ?? { x: next.x, y: next.y };
    p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, next.x, next.y);
    p.closePath();
  }
  return p;
}

// Legacy singleton accessors kept for any importers; engine is now owned by React.
let engineInstance: CanvasEngine | null = null;
export function initializeCanvasEngine(canvas: HTMLCanvasElement): CanvasEngine {
  engineInstance = new CanvasEngine(canvas);
  return engineInstance;
}
export function getCanvasEngine(): CanvasEngine {
  if (!engineInstance) throw new Error('CanvasEngine not initialized');
  return engineInstance;
}
