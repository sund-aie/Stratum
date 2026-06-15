/**
 * Unified Canvas - Utility Functions
 */

import type { Transform, Point, Rect, Layer, Document } from '../types';

export function identityTransform(): Transform {
  return {
    x: 0, y: 0,
    scaleX: 1, scaleY: 1,
    rotation: 0,
    skewX: 0, skewY: 0,
    originX: 0, originY: 0,
    flipX: false, flipY: false,
  };
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getCanvasPoint(event: MouseEvent | React.MouseEvent, canvas: HTMLCanvasElement, viewport: { scale: number; x: number; y: number; rotation: number }): Point {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - viewport.x) / viewport.scale;
  const y = (event.clientY - rect.top - viewport.y) / viewport.scale;
  return { x, y };
}

export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
         point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectFromPoints(p1: Point, p2: Point): Rect {
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y),
  };
}

export function applyTransform(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, transform: Transform): void {
  ctx.translate(transform.x, transform.y);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scaleX * (transform.flipX ? -1 : 1), transform.scaleY * (transform.flipY ? -1 : 1));
  ctx.translate(-transform.originX, -transform.originY);
}

export function getTransformHandles(layer: Layer, renderer: any): Array<{ type: 'corner' | 'edge' | 'rotate'; position: string; cursor: string; rect: Rect }> {
  const bounds = getLayerBounds(layer, renderer);
  const handleSize = 8;
  const rotateOffset = 20;
  
  return [
    { type: 'corner', position: 'tl', cursor: 'nw-resize', rect: { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'edge', position: 't', cursor: 'n-resize', rect: { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'corner', position: 'tr', cursor: 'ne-resize', rect: { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'edge', position: 'r', cursor: 'e-resize', rect: { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'corner', position: 'br', cursor: 'se-resize', rect: { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'edge', position: 'b', cursor: 's-resize', rect: { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'corner', position: 'bl', cursor: 'sw-resize', rect: { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'edge', position: 'l', cursor: 'w-resize', rect: { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, width: handleSize, height: handleSize } },
    { type: 'rotate', position: 'rotate', cursor: 'crosshair', rect: { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - rotateOffset - handleSize/2, width: handleSize, height: handleSize } },
  ];
}

export function getLayerBounds(layer: Layer, renderer: any): Rect {
  if (layer.type === 'raster' && layer.rasterData) {
    return { x: layer.transform.x, y: layer.transform.y, width: layer.rasterData.width, height: layer.rasterData.height };
  }
  if (layer.type === 'vector' && layer.vectorData) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of layer.vectorData.paths) {
      for (const seg of path.segments) {
        minX = Math.min(minX, seg.point.x);
        minY = Math.min(minY, seg.point.y);
        maxX = Math.max(maxX, seg.point.x);
        maxY = Math.max(maxY, seg.point.y);
      }
    }
    if (minX === Infinity) return { x: 0, y: 0, width: 100, height: 100 };
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: layer.transform.x, y: layer.transform.y, width: 100, height: 100 };
}

export function createDefaultDocument(width = 1920, height = 1080): Document {
  const bgLayer: Layer = {
    id: uuid(),
    name: 'Background',
    type: 'raster',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    locked: true,
    lockedPosition: true,
    lockedPixels: true,
    lockedTransparency: false,
    transform: identityTransform(),
    rasterData: { width, height, channels: 4 },
  };
  
  const layer1: Layer = {
    id: uuid(),
    name: 'Layer 1',
    type: 'raster',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    locked: false,
    lockedPosition: false,
    lockedPixels: false,
    lockedTransparency: false,
    transform: identityTransform(),
    rasterData: { width, height, channels: 4 },
  };
  
  return {
    id: uuid(),
    name: 'Untitled',
    width,
    height,
    resolution: 72,
    colorMode: 'RGB',
    colorProfile: 'sRGB',
    backgroundColor: '#ffffff',
    layers: [bgLayer, layer1],
    guides: [],
    slices: [],
    history: [],
    historyIndex: -1,
  };
}

export function createLayer(type: Layer['type'], name: string, width: number, height: number): Layer {
  const base: Layer = {
    id: uuid(),
    name,
    type,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    locked: false,
    lockedPosition: false,
    lockedPixels: false,
    lockedTransparency: false,
    transform: identityTransform(),
  };
  
  switch (type) {
    case 'raster':
      return { ...base, rasterData: { width, height, channels: 4 } };
    case 'vector':
      return { ...base, vectorData: { paths: [] } };
    case 'text':
      return { ...base, textData: { text: '', fontFamily: 'Arial', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', lineHeight: 1.2, letterSpacing: 0, color: '#000000', decoration: 'none', direction: 'ltr' } };
    case 'adjustment':
      return { ...base, adjustmentData: { type: 'brightnessContrast', params: { brightness: 0, contrast: 0 }, clipped: false } };
    case 'fill':
      return { ...base, fillData: { fill: { type: 'solid', color: '#000000' } } };
    case 'group':
      return { ...base, groupData: { parentId: null, expanded: true } };
    default:
      return { ...base, rasterData: { width, height, channels: 4 } };
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  return '#' + [r, g, b, Math.round(a * 255)].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

export function composeLayers(layers: Layer[], ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, renderer: any): void {
  ctx.clearRect(0, 0, width, height);
  
  for (const layer of layers) {
    if (!layer.visible) continue;
    
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode as any;
    
    applyTransform(ctx, layer.transform);
    
    if (layer.type === 'raster' && layer.rasterData?.canvas) {
      ctx.drawImage(layer.rasterData.canvas, 0, 0);
    } else if (layer.type === 'vector' && layer.vectorData) {
      renderVectorPaths(ctx, layer.vectorData.paths);
    } else if (layer.type === 'text' && layer.textData) {
      renderText(ctx, layer.textData);
    } else if (layer.type === 'fill' && layer.fillData) {
      renderFill(ctx, layer.fillData.fill, width, height);
    }
    
    ctx.restore();
  }
}

function renderVectorPaths(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, paths: any[]): void {
  for (const path of paths) {
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
    
    if (path.fill && path.fill.type !== 'none') {
      ctx.fillStyle = path.fill.color || '#000';
      ctx.fill(path.fill.type === 'evenodd' ? 'evenodd' : 'nonzero');
    }
    
    if (path.stroke && path.stroke.type !== 'none') {
      ctx.strokeStyle = path.stroke.color || '#000';
      ctx.lineWidth = path.stroke.width;
      ctx.lineCap = path.stroke.cap;
      ctx.lineJoin = path.stroke.join;
      if (path.stroke.dashArray) ctx.setLineDash(path.stroke.dashArray);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function renderText(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, textData: any): void {
  ctx.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
  ctx.fillStyle = textData.color;
  ctx.textAlign = textData.textAlign;
  ctx.textBaseline = 'top';
  
  const lines = textData.text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, i * textData.fontSize * textData.lineHeight);
  }
}

function renderFill(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, fill: any, width: number, height: number): void {
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
  }
}