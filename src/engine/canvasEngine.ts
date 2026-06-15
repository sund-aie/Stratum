/**
 * Unified Canvas - Canvas Engine
 * LayerRenderer & HitTester for multi-layer compositing
 */

import type { Document, Layer, Transform, Rect, Point, BlendMode } from '../types';
import { identityTransform, uuid, composeLayers, getLayerBounds } from '../utils/helpers';

/**
 * LayerRenderer - Handles rendering of individual layers and document composition
 * Uses OffscreenCanvas for layer caching and efficient re-rendering
 */
export class LayerRenderer {
  private layerCache = new Map<string, { canvas: OffscreenCanvas; dirty: boolean; bounds: Rect }>();
  private document: Document | null = null;
  
  setDocument(document: Document): void {
    this.document = document;
  }
  
  /**
   * Render entire document to a context
   */
  renderDocument(document: Document, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    composeLayers(document.layers, ctx, document.width, document.height, this);
  }
  
  /**
   * Render a single layer to its cached offscreen canvas
   */
  renderLayer(layer: Layer): OffscreenCanvas {
    const cacheKey = `${layer.id}-${layer.type}`;
    let cached = this.layerCache.get(cacheKey);
    
    if (!cached) {
      const width = layer.rasterData?.width || 1920;
      const height = layer.rasterData?.height || 1080;
      const canvas = new OffscreenCanvas(width, height);
      cached = { canvas, dirty: true, bounds: { x: 0, y: 0, width, height } };
      this.layerCache.set(cacheKey, cached);
    }
    
    if (cached.dirty) {
      const ctx = cached.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, cached.canvas.width, cached.canvas.height);
      
      // Render layer content based on type
      if (layer.type === 'raster' && layer.rasterData) {
        this.renderRasterLayer(ctx, layer);
      } else if (layer.type === 'vector' && layer.vectorData) {
        this.renderVectorLayer(ctx, layer);
      } else if (layer.type === 'text' && layer.textData) {
        this.renderTextLayer(ctx, layer);
      } else if (layer.type === 'fill' && layer.fillData) {
        this.renderFillLayer(ctx, layer);
      } else if (layer.type === 'adjustment' && layer.adjustmentData) {
        // Adjustment layers don't render themselves - they're applied during composition
      }
      
      cached.dirty = false;
      cached.bounds = getLayerBounds(layer, this);
    }
    
    return cached.canvas;
  }
  
  /**
   * Get cached layer canvas (renders if dirty)
   */
  getLayerCanvas(layer: Layer): OffscreenCanvas {
    return this.renderLayer(layer);
  }
  
  /**
   * Render raster layer content
   */
  private renderRasterLayer(ctx: OffscreenCanvasRenderingContext2D, layer: Layer): void {
    if (layer.rasterData?.canvas) {
      ctx.drawImage(layer.rasterData.canvas, 0, 0);
    }
  }
  
  /**
   * Render vector layer content
   */
  private renderVectorLayer(ctx: OffscreenCanvasRenderingContext2D, layer: Layer): void {
    for (const path of layer.vectorData!.paths) {
      ctx.beginPath();
      for (let i = 0; i < path.segments.length; i++) {
        const seg = path.segments[i];
        if (i === 0) {
          ctx.moveTo(seg.point.x, seg.point.y);
        } else if (seg.type === 'curve' && seg.ctrl1 && seg.ctrl2) {
          ctx.bezierCurveTo(seg.ctrl1.x, seg.ctrl1.y, seg.ctrl2.x, seg.ctrl2.y, seg.point.x, seg.point.y);
        } else {
          ctx.lineTo(seg.point.x, seg.point.y);
        }
      }
      
      // Fill
      if (path.fill && path.fill.type !== 'none') {
        ctx.fillStyle = this.createFillStyle(ctx, path.fill);
        ctx.fill(path.fill.type === 'evenodd' ? 'evenodd' : 'nonzero');
      }
      
      // Stroke
      if (path.stroke && path.stroke.type !== 'none') {
        ctx.strokeStyle = this.createStrokeStyle(ctx, path.stroke);
        ctx.lineWidth = path.stroke.width;
        ctx.lineCap = path.stroke.cap;
        ctx.lineJoin = path.stroke.join;
        if (path.stroke.dashArray) ctx.setLineDash(path.stroke.dashArray);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  
  /**
   * Render text layer content
   */
  private renderTextLayer(ctx: OffscreenCanvasRenderingContext2D, layer: Layer): void {
    const td = layer.textData!;
    ctx.font = `${td.fontStyle} ${td.fontWeight} ${td.fontSize}px ${td.fontFamily}`;
    ctx.fillStyle = td.color;
    ctx.textAlign = td.textAlign;
    ctx.textBaseline = 'top';
    
    const lines = td.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, i * td.fontSize * td.lineHeight);
    }
  }
  
  /**
   * Render fill layer content
   */
  private renderFillLayer(ctx: OffscreenCanvasRenderingContext2D, layer: Layer): void {
    const fill = layer.fillData!.fill;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    if (fill.type === 'solid') {
      ctx.fillStyle = fill.color;
      ctx.fillRect(0, 0, width, height);
    } else if (fill.type === 'linearGradient' && fill.gradient) {
      const grad = ctx.createLinearGradient(0, 0, width * Math.cos(fill.gradient.angle || 0), width * Math.sin(fill.gradient.angle || 0));
      for (const stop of fill.gradient.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (fill.type === 'radialGradient' && fill.gradient) {
      const cx = fill.gradient.center?.x || width / 2;
      const cy = fill.gradient.center?.y || height / 2;
      const r = fill.gradient.radius || Math.min(width, height) / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      for (const stop of fill.gradient.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }
  
  /**
   * Create CanvasGradient or CanvasPattern from Fill object
   */
  private createFillStyle(ctx: OffscreenCanvasRenderingContext2D, fill: any): string | CanvasGradient | CanvasPattern {
    if (fill.type === 'solid') return fill.color;
    if (fill.type === 'linearGradient' && fill.gradient) {
      const grad = ctx.createLinearGradient(0, 0, 100, 100); // Placeholder - would use actual bounds
      for (const stop of fill.gradient.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      return grad;
    }
    return '#000';
  }
  
  /**
   * Create stroke style
   */
  private createStrokeStyle(ctx: OffscreenCanvasRenderingContext2D, stroke: any): string | CanvasGradient | CanvasPattern {
    if (stroke.type === 'solid') return stroke.color;
    if (stroke.type === 'linearGradient' && stroke.gradient) {
      const grad = ctx.createLinearGradient(0, 0, 100, 100);
      for (const stop of stroke.gradient.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      return grad;
    }
    return '#000';
  }
  
  /**
   * Invalidate layer cache (mark for re-render)
   */
  invalidateLayer(layerId: string): void {
    for (const [key, cached] of this.layerCache.entries()) {
      if (key.startsWith(layerId)) {
        cached.dirty = true;
      }
    }
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.layerCache.clear();
  }
}

/**
 * HitTester - Finds which layer is at a given point
 * Uses cached layer canvases for pixel-perfect hit testing
 */
export class HitTester {
  private renderer: LayerRenderer;
  
  constructor(renderer: LayerRenderer) {
    this.renderer = renderer;
  }
  
  /**
   * Find the topmost visible layer at a point
   */
  findLayerAtPoint(document: Document, x: number, y: number, renderer: LayerRenderer): Layer | null {
    // Iterate layers top to bottom (last in array = topmost)
    for (let i = document.layers.length - 1; i >= 0; i--) {
      const layer = document.layers[i];
      if (!layer.visible || layer.locked) continue;
      
      if (this.hitTestLayer(layer, x, y, renderer)) {
        return layer;
      }
    }
    return null;
  }
  
  /**
   * Hit test a single layer
   */
  private hitTestLayer(layer: Layer, x: number, y: number, renderer: LayerRenderer): boolean {
    // Quick bounds check first
    const bounds = getLayerBounds(layer, renderer);
    if (x < bounds.x || x > bounds.x + bounds.width || y < bounds.y || y > bounds.y + bounds.height) {
      return false;
    }
    
    // For raster layers, do pixel-perfect alpha test
    if (layer.type === 'raster' && layer.rasterData) {
      const canvas = renderer.getLayerCanvas(layer);
      const ctx = canvas.getContext('2d');
      try {
        const imageData = ctx.getImageData(x - bounds.x, y - bounds.y, 1, 1);
        return imageData.data[3] > 0; // Alpha > 0
      } catch {
        return true; // If we can't read, assume hit
      }
    }
    
    // For vector/text layers, use path hit testing
    if (layer.type === 'vector' && layer.vectorData) {
      return this.hitTestPaths(layer.vectorData.paths, x - bounds.x, y - bounds.y);
    }
    
    if (layer.type === 'text' && layer.textData) {
      // Simplified: use bounding box
      return true; // Would need text measurement for accurate hit test
    }
    
    return true; // Fill, adjustment, group layers hit test as bounds
  }
  
  /**
   * Hit test vector paths
   */
  private hitTestPaths(paths: any[], x: number, y: number): boolean {
    // Use a temporary canvas for path hit testing
    const canvas = new OffscreenCanvas(10, 10);
    const ctx = canvas.getContext('2d')!;
    
    for (const path of paths) {
      ctx.beginPath();
      for (let i = 0; i < path.segments.length; i++) {
        const seg = path.segments[i];
        if (i === 0) ctx.moveTo(seg.point.x, seg.point.y);
        else if (seg.type === 'curve' && seg.ctrl1 && seg.ctrl2) {
          ctx.bezierCurveTo(seg.ctrl1.x, seg.ctrl1.y, seg.ctrl2.x, seg.ctrl2.y, seg.point.x, seg.point.y);
        } else {
          ctx.lineTo(seg.point.x, seg.point.y);
        }
      }
      
      if (ctx.isPointInPath(x, y, path.fill?.type === 'evenodd' ? 'evenodd' : 'nonzero')) {
        return true;
      }
      
      if (path.stroke && path.stroke.type !== 'none') {
        ctx.lineWidth = path.stroke.width;
        if (ctx.isPointInStroke(x, y)) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Find all layers at a point (for selection)
   */
  findLayersAtPoint(document: Document, x: number, y: number, renderer: LayerRenderer): Layer[] {
    const result: Layer[] = [];
    for (let i = document.layers.length - 1; i >= 0; i--) {
      const layer = document.layers[i];
      if (!layer.visible) continue;
      if (this.hitTestLayer(layer, x, y, renderer)) {
        result.push(layer);
      }
    }
    return result;
  }
}

/**
 * SelectionRenderer - Renders selection outlines (marching ants)
 */
export class SelectionRenderer {
  static renderMarchingAnts(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    path: any,
    animationTime: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -animationTime * 0.2;
    
    ctx.beginPath();
    for (let i = 0; i < path.segments.length; i++) {
      const seg = path.segments[i];
      if (i === 0) ctx.moveTo(seg.point.x, seg.point.y);
      else if (seg.type === 'curve' && seg.ctrl1 && seg.ctrl2) {
        ctx.bezierCurveTo(seg.ctrl1.x, seg.ctrl1.y, seg.ctrl2.x, seg.ctrl2.y, seg.point.x, seg.point.y);
      } else {
        ctx.lineTo(seg.point.x, seg.point.y);
      }
    }
    if (path.closed) ctx.closePath();
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000';
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -animationTime * 0.2 + 2;
    ctx.stroke();
    ctx.restore();
  }
  
  static renderSelectionBounds(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    bounds: Rect
  ): void {
    ctx.save();
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }
}

/**
 * Apply adjustment layer to image data
 */
export function applyAdjustment(
  imageData: ImageData,
  adjustment: any
): ImageData {
  const data = imageData.data;
  const { type, params } = adjustment;
  
  const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const outData = result.data;
  
  if (type === 'brightnessContrast') {
    const brightness = (params.brightness || 0) * 2.55; // -100 to 100 -> -255 to 255
    const contrast = (params.contrast || 0) / 100; // -100 to 100 -> -1 to 1
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c] + brightness;
        v = factor * (v - 128) + 128;
        outData[i + c] = Math.max(0, Math.min(255, v));
      }
      outData[i + 3] = data[i + 3];
    }
  }
  
  else if (type === 'levels') {
    const inBlack = params.levelsInputBlack || 0;
    const inWhite = params.levelsInputWhite || 255;
    const gamma = params.levelsInputGamma || 1;
    const outBlack = params.levelsOutputBlack || 0;
    const outWhite = params.levelsOutputWhite || 255;
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c];
        // Input levels
        v = ((v - inBlack) / (inWhite - inBlack)) * 255;
        // Gamma
        v = Math.pow(v / 255, 1 / gamma) * 255;
        // Output levels
        v = outBlack + (v / 255) * (outWhite - outBlack);
        outData[i + c] = Math.max(0, Math.min(255, v));
      }
      outData[i + 3] = data[i + 3];
    }
  }
  
  else if (type === 'hueSaturation') {
    const hueShift = (params.hueShift || 0) * Math.PI / 180;
    const satShift = (params.satShift || 0) / 100;
    const lightShift = (params.lightShift || 0) / 100;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      
      // RGB to HSL
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      // Apply adjustments
      h = (h + hueShift / (2 * Math.PI)) % 1;
      s = Math.max(0, Math.min(1, s + satShift));
      l = Math.max(0, Math.min(1, l + lightShift));
      
      // HSL to RGB
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      if (s === 0) { r = g = b = l; }
      else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      outData[i] = Math.round(r * 255);
      outData[i + 1] = Math.round(g * 255);
      outData[i + 2] = Math.round(b * 255);
      outData[i + 3] = data[i + 3];
    }
  }
  
  else if (type === 'exposure') {
    const exposure = params.exposure || 0;
    const offset = params.offset || 0;
    const gamma = params.gamma || 1;
    const expFactor = Math.pow(2, exposure);
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c] / 255;
        v = (v * expFactor + offset);
        v = Math.pow(v, 1 / gamma);
        outData[i + c] = Math.round(Math.max(0, Math.min(1, v)) * 255);
      }
      outData[i + 3] = data[i + 3];
    }
  }
  
  else if (type === 'invert') {
    for (let i = 0; i < data.length; i += 4) {
      outData[i] = 255 - data[i];
      outData[i + 1] = 255 - data[i + 1];
      outData[i + 2] = 255 - data[i + 2];
      outData[i + 3] = data[i + 3];
    }
  }
  
  return result;
}

/**
 * Blend modes implementation
 */
export function blendColors(blendMode: BlendMode, base: number, blend: number, opacity: number): number {
  let result = 0;
  const b = base / 255;
  const a = blend / 255;
  
  switch (blendMode) {
    case 'normal': result = a; break;
    case 'multiply': result = b * a; break;
    case 'screen': result = 1 - (1 - b) * (1 - a); break;
    case 'overlay': result = b < 0.5 ? 2 * b * a : 1 - 2 * (1 - b) * (1 - a); break;
    case 'darken': result = Math.min(b, a); break;
    case 'lighten': result = Math.max(b, a); break;
    case 'colorDodge': result = b === 1 ? 1 : Math.min(1, a / (1 - b)); break;
    case 'colorBurn': result = b === 0 ? 0 : 1 - Math.min(1, (1 - a) / b); break;
    case 'hardLight': result = a < 0.5 ? 2 * b * a : 1 - 2 * (1 - b) * (1 - a); break;
    case 'softLight': result = a < 0.5 ? b - (1 - 2 * a) * b * (1 - b) : b + (2 * a - 1) * (b < 0.5 ? Math.sqrt(b) : b); break;
    case 'difference': result = Math.abs(b - a); break;
    case 'exclusion': result = b + a - 2 * b * a; break;
    default: result = a;
  }
  
  return Math.round((b + (result - b) * opacity) * 255);
}

export { LayerRenderer, HitTester, SelectionRenderer };