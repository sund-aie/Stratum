/**
 * Unified Canvas - Layer Renderer
 * Multi-layer compositing with blend modes, opacity, masks, and transforms
 */

import type { Layer, Document, Transform, BlendMode, Fill, Point } from '../types';

export class LayerRenderer {
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  constructor() {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(1, 1);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    }
  }
  
  // Render entire document to canvas
  renderDocument(document: Document, ctx: CanvasRenderingContext2D): void {
    // Sort layers by z-index
    const sortedLayers = [...document.layers].sort((a, b) => a.zIndex - b.zIndex);
    
    // Draw each visible layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      renderLayer(layer, ctx, document.width, document.height, this);
    }
  }
  
  // Render a single layer to a context
  renderLayerToOffscreen(layer: Layer, width: number, height: number): OffscreenCanvasRenderingContext2D | null {
    if (!layer.visible) return null;
    
    // Create or resize offscreen canvas
    if (!this.offscreenCanvas || this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas = typeof OffscreenCanvas !== 'undefined' 
        ? new OffscreenCanvas(width, height)
        : document.createElement('canvas');
      if (this.offscreenCanvas instanceof HTMLCanvasElement) {
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
      }
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    }
    
    const ctx = this.offscreenCtx!;
    ctx.clearRect(0, 0, width, height);
    
    renderLayer(layer, ctx, width, height, this);
    
    return ctx;
  }
  
  // Apply layer transform
  applyTransform(ctx: CanvasRenderingContext2D, transform: Transform): void {
    ctx.save();
    ctx.translate(transform.originX, transform.originY);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX * (transform.flipX ? -1 : 1), transform.scaleY * (transform.flipY ? -1 : 1));
    ctx.translate(-transform.originX, -transform.originY);
    ctx.translate(transform.x, transform.y);
  }
  
  // Apply layer mask
  applyMask(ctx: CanvasRenderingContext2D, layer: Layer, width: number, height: number): void {
    if (!layer.maskData?.enabled) return;
    
    const mask = layer.maskData;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    
    // Render mask - simplified to just draw the mask as grayscale
    // In a full implementation, this would be a separate layer/image
    ctx.fillStyle = 'white';
    ctx.globalAlpha = mask.density;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  }
}

// Layer type renderers
function renderLayer(layer: Layer, ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, renderer: LayerRenderer): void {
  ctx.save();
  
  // Apply blend mode
  ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);
  ctx.globalAlpha = layer.opacity;
  
  // Apply transform
  renderer.applyTransform(ctx, layer.transform);
  
  // Render based on layer type
  switch (layer.type) {
    case 'raster':
      renderRasterLayer(layer, ctx, canvasWidth, canvasHeight);
      break;
    case 'vector':
      renderVectorLayer(layer, ctx);
      break;
    case 'text':
      renderTextLayer(layer, ctx);
      break;
    case 'adjustment':
      // Adjustment layers are handled in composeLayers
      break;
    case 'fill':
      renderFillLayer(layer, ctx, canvasWidth, canvasHeight);
      break;
    case 'group':
      // Groups are handled by composing children
      break;
  }
  
  // Apply mask
  renderer.applyMask(ctx, layer, canvasWidth, canvasHeight);
  
  ctx.restore();
}

function renderRasterLayer(layer: Layer, ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (!layer.rasterData?.imageData) return;
  
  const imgData = layer.rasterData.imageData;
  
  if (imgData instanceof ImageData) {
    ctx.putImageData(imgData, 0, 0);
  } else if (imgData instanceof HTMLImageElement || imgData instanceof HTMLCanvasElement || imgData instanceof ImageBitmap) {
    ctx.drawImage(imgData, 0, 0, width, height);
  }
}

function renderVectorLayer(layer: Layer, ctx: CanvasRenderingContext2D): void {
  if (!layer.vectorData) return;
  
  for (const path of layer.vectorData.paths) {
    renderPathSegments(ctx, path.segments, path.closed);
    
    if (path.fill && path.fill.type !== 'none') {
      ctx.fillStyle = fillToStyle(path.fill, ctx);
      ctx.fill();
    }
    
    if (path.stroke) {
      ctx.strokeStyle = fillToStyle(path.stroke.color, ctx);
      ctx.lineWidth = path.stroke.width;
      ctx.lineCap = path.stroke.cap;
      ctx.lineJoin = path.stroke.join;
      ctx.stroke();
    }
  }
}

function renderTextLayer(layer: Layer, ctx: CanvasRenderingContext2D): void {
  if (!layer.textData) return;
  
  const td = layer.textData;
  ctx.font = `${td.fontWeight} ${td.fontStyle} ${td.fontSize}px ${td.fontFamily}`;
  ctx.fillStyle = td.color;
  ctx.textBaseline = 'top';
  
  // Handle multi-line text
  const lines = td.text.split('\n');
  const lineHeight = td.fontSize * td.lineHeight;
  
  lines.forEach((line, i) => {
    const x = 0;
    const y = i * lineHeight;
    
    let alignX = x;
    if (td.textAlign === 'center') alignX = x + ctx.measureText(line).width / 2;
    else if (td.textAlign === 'right') alignX = x + ctx.measureText(line).width;
    
    ctx.fillText(line, alignX, y);
  });
}

function renderFillLayer(layer: Layer, ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (!layer.fillData?.fill) return;
  
  const fill = layer.fillData.fill;
  ctx.fillStyle = fillToStyle(fill, ctx);
  ctx.fillRect(0, 0, width, height);
}

// Compose multiple layers with adjustment layers applied non-destructively
export function composeLayers(layers: Layer[], width: number, height: number, renderer: LayerRenderer): ImageData {
  const canvas = typeof OffscreenCanvas !== 'undefined' 
    ? new OffscreenCanvas(width, height)
    : document.createElement('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  
  let adjustmentStack: Layer[] = [];
  
  for (const layer of layers) {
    if (!layer.visible) continue;
    
    if (layer.type === 'adjustment' && layer.adjustmentData) {
      adjustmentStack.push(layer);
      continue;
    }
    
    // Render layer
    ctx.save();
    ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);
    ctx.globalAlpha = layer.opacity;
    renderer.applyTransform(ctx, layer.transform);
    
    switch (layer.type) {
      case 'raster':
        renderRasterLayer(layer, ctx, width, height);
        break;
      case 'vector':
        renderVectorLayer(layer, ctx);
        break;
      case 'text':
        renderTextLayer(layer, ctx);
        break;
      case 'fill':
        renderFillLayer(layer, ctx, width, height);
        break;
    }
    
    // Apply adjustment layers that are clipped to this layer
    for (const adjLayer of adjustmentStack) {
      if (!adjLayer.adjustmentData?.clipped) continue;
      applyAdjustmentToContext(ctx, adjLayer.adjustmentData, width, height);
    }
    
    renderer.applyMask(ctx, layer, width, height);
    ctx.restore();
  }
  
  // Apply global adjustment layers (not clipped)
  for (const adjLayer of adjustmentStack) {
    if (adjLayer.adjustmentData?.clipped) continue;
    applyAdjustmentToContext(ctx, adjLayer.adjustmentData!, width, height);
  }
  
  return ctx.getImageData(0, 0, width, height);
}

function applyAdjustmentToContext(ctx: CanvasRenderingContext2D, adj: any, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const result = applyAdjustment(imgData, adj.type, adj.params);
  ctx.putImageData(result, 0, 0);
}

function blendModeToCompositeOp(mode: BlendMode): GlobalCompositeOperation {
  const map: Record<BlendMode, GlobalCompositeOperation> = {
    normal: 'source-over',
    dissolve: 'source-over', // Not directly supported
    darken: 'darken',
    multiply: 'multiply',
    colorBurn: 'color-burn',
    linearBurn: 'color-burn', // Approximation
    darkerColor: 'darken',
    lighten: 'lighten',
    screen: 'screen',
    colorDodge: 'color-dodge',
    linearDodge: 'color-dodge', // Approximation
    lighterColor: 'lighten',
    overlay: 'overlay',
    softLight: 'soft-light',
    hardLight: 'hard-light',
    vividLight: 'hard-light', // Approximation
    linearLight: 'hard-light', // Approximation
    pinLight: 'hard-light', // Approximation
    hardMix: 'hard-light', // Approximation
    difference: 'difference',
    exclusion: 'exclusion',
    subtract: 'source-over', // Not directly supported
    divide: 'source-over', // Not directly supported
    hue: 'hue',
    saturation: 'saturation',
    color: 'color',
    luminosity: 'luminosity',
  };
  return map[mode] || 'source-over';
}

type GlobalCompositeOperation = 
  | 'source-over' | 'source-in' | 'source-out' | 'source-atop'
  | 'destination-over' | 'destination-in' | 'destination-out' | 'destination-atop'
  | 'lighter' | 'copy' | 'xor'
  | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

function fillToStyle(fill: Fill | { color: string; type: 'solid' }, ctx: CanvasRenderingContext2D): string | CanvasGradient | CanvasPattern {
  const f = fill as any;
  if (f.type === 'solid' || f.type === undefined) {
    return f.color || '#000';
  }
  if (f.type === 'linearGradient' && f.gradient) {
    const grad = f.gradient;
    // Simplified - would need proper coordinate calculation
    const gradient = ctx.createLinearGradient(0, 0, 100, 100);
    grad.stops.forEach((stop: any) => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  }
  if (f.type === 'radialGradient' && f.gradient) {
    const gradient = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
    f.gradient.stops.forEach((stop: any) => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  }
  return '#000';
}

// Helper to render path segments directly
function renderPathSegments(ctx: CanvasRenderingContext2D, segments: any[], closed: boolean): void {
  ctx.beginPath();
  if (segments.length === 0) return;
  
  let first = true;
  for (const seg of segments) {
    if (first) {
      ctx.moveTo(seg.point.x, seg.point.y);
      first = false;
    }
    if (seg.type === 'line') {
      ctx.lineTo(seg.point.x, seg.point.y);
    } else if (seg.type === 'curve' && seg.cp1 && seg.cp2) {
      ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.point.x, seg.point.y);
    }
  }
  
  if (closed) ctx.closePath();
}

export { renderLayer, composeLayers };