/**
 * Unified Canvas - Fill, Gradient, and Eyedropper Tools
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, Color, ToolType, ToolOptions } from '../types';
import { RasterOps } from '../engine/RasterOps';

export class FillTool extends BaseTool {
  type = 'fill' as ToolType;
  cursor = 'copy';
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    
    if (x < 0 || x >= layer.data.imageData.width || y < 0 || y >= layer.data.imageData.height) return;
    
    const tolerance = opts.fillTolerance;
    const contiguous = opts.fillContiguous;
    const antiAlias = opts.fillAntiAlias;
    
    // Flood fill
    this.rasterOps.floodFillArea(
      layer.data.imageData,
      x,
      y,
      opts.foregroundColor,
      tolerance,
      contiguous,
      antiAlias,
      opts.fillBlendMode
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data } });
    context.pushHistory();
  }
}

// Gradient Tool
export class GradientTool extends BaseTool {
  type = 'gradient' as ToolType;
  cursor = 'crosshair';
  private startPoint: Point | null = null;
  private isDrawing = false;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    this.startPoint = point;
    this.isDrawing = true;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || !this.startPoint) return;
    if (event.buttons === 0) return;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || !this.startPoint) return;
    
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const gradient = opts.gradient;
    
    if (!gradient) return;
    
    // Apply gradient
    this.rasterOps.applyGradient(
      layer.data.imageData,
      this.startPoint,
      point,
      gradient,
      opts.gradientBlendMode,
      opts.gradientDither,
      opts.gradientReverse
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data } });
    context.pushHistory();
    
    this.isDrawing = false;
    this.startPoint = null;
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.isDrawing) {
      this.isDrawing = false;
      this.startPoint = null;
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.isDrawing && this.startPoint) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.beginPath();
      ctx.moveTo(this.startPoint.x, this.startPoint.y);
      // We'd need current mouse position here
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Paint Bucket Tool (alias for Fill)
export class PaintBucketTool extends FillTool {
  type = 'paint-bucket' as ToolType;
}

// 3D Material Drop Tool (placeholder)
export class MaterialDropTool extends BaseTool {
  type = 'material-drop' as ToolType;
  cursor = 'copy';
  
  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    // Apply material to 3D layer
  }
}

// Eyedropper Tool
export class EyedropperTool extends BaseTool {
  type = 'eyedropper' as ToolType;
  cursor = 'crosshair';
  private sampleSize: 'point' | '3x3' | '5x5' | '11x11' | '31x31' | '51x51' | '101x101' = '3x3';
  private sampleLayers: 'current' | 'all' = 'all';

  onActivate(context: ToolContext) {
    this.sampleSize = context.toolOptions.eyedropperSampleSize;
    this.sampleLayers = context.toolOptions.eyedropperSampleLayers;
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const color = this.sampleColor(point, context);
    if (color) {
      if (event.altKey) {
        context.setToolOptions({ backgroundColor: color });
      } else {
        context.setToolOptions({ foregroundColor: color });
      }
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Show live color preview
  }

  private sampleColor(point: Point, context: ToolContext): Color | null {
    const layers = this.sampleLayers === 'all' 
      ? context.layers.filter(l => l.visible && !l.locked)
      : context.layers.filter(l => l.id === context.activeLayerId);
    
    if (layers.length === 0) return null;
    
    // Render layers to temp canvas for sampling
    const canvas = document.createElement('canvas');
    const width = Math.max(...layers.map(l => l.data.imageData?.width || 0));
    const height = Math.max(...layers.map(l => l.data.imageData?.height || 0));
    
    if (width === 0 || height === 0) return null;
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    for (const layer of layers) {
      if (layer.data.imageData) {
        ctx.putImageData(layer.data.imageData, 0, 0);
      }
    }
    
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    
    const size = this.getSampleRadius();
    let r = 0, g = 0, b = 0, a = 0, count = 0;
    
    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          r += pixel[0];
          g += pixel[1];
          b += pixel[2];
          a += pixel[3];
          count++;
        }
      }
    }
    
    if (count === 0) return null;
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
      a: a / (count * 255),
    };
  }

  private getSampleRadius(): number {
    switch (this.sampleSize) {
      case 'point': return 0;
      case '3x3': return 1;
      case '5x5': return 2;
      case '11x11': return 5;
      case '31x31': return 15;
      case '51x51': return 25;
      case '101x101': return 50;
      default: return 1;
    }
  }
}

// Color Sampler Tool
export class ColorSamplerTool extends BaseTool {
  type = 'color-sampler' as ToolType;
  cursor = 'crosshair';
  private samplers: { point: Point; color: Color }[] = [];

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.samplers.length >= 10) return; // Max 10 samplers
    
    const canvas = document.createElement('canvas');
    const layers = context.layers.filter(l => l.visible && !l.locked && l.data.imageData);
    if (layers.length === 0) return;
    
    const width = Math.max(...layers.map(l => l.data.imageData!.width));
    const height = Math.max(...layers.map(l => l.data.imageData!.height));
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    for (const layer of layers) {
      if (layer.data.imageData) {
        ctx.putImageData(layer.data.imageData, 0, 0);
      }
    }
    
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      a: pixel[3] / 255,
    };
    
    this.samplers.push({ point, color });
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.samplers = [];
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    for (const sampler of this.samplers) {
      const screen = context.canvasToScreen(sampler.point);
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / context.zoom;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10 / context.zoom, 0, Math.PI * 2);
      ctx.stroke();
      
      // Color swatch
      ctx.fillStyle = `rgba(${sampler.color.r},${sampler.color.g},${sampler.color.b},${sampler.color.a})`;
      ctx.fillRect(screen.x + 15 / context.zoom, screen.y - 10 / context.zoom, 40 / context.zoom, 20 / context.zoom);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1 / context.zoom;
      ctx.strokeRect(screen.x + 15 / context.zoom, screen.y - 10 / context.zoom, 40 / context.zoom, 20 / context.zoom);
      ctx.restore();
    }
  }
}

// Ruler Tool
export class RulerTool extends BaseTool {
  type = 'ruler' as ToolType;
  cursor = 'crosshair';
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.startPoint = point;
    this.endPoint = point;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.startPoint) {
      this.endPoint = point;
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    this.endPoint = point;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.startPoint && this.endPoint) {
      ctx.save();
      ctx.strokeStyle = '#007acc';
      ctx.lineWidth = 2 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.beginPath();
      ctx.moveTo(this.startPoint.x, this.startPoint.y);
      ctx.lineTo(this.endPoint.x, this.endPoint.y);
      ctx.stroke();
      
      // End caps
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.startPoint.x, this.startPoint.y, 4 / context.zoom, 0, Math.PI * 2);
      ctx.arc(this.endPoint.x, this.endPoint.y, 4 / context.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#007acc';
      ctx.fill();
      
      // Measurements
      const dist = Math.hypot(this.endPoint.x - this.startPoint.x, this.endPoint.y - this.startPoint.y);
      const angle = Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x) * 180 / Math.PI;
      
      ctx.font = `12px sans-serif`;
      ctx.fillStyle = '#007acc';
      ctx.fillText(`D: ${dist.toFixed(1)}px  A: ${angle.toFixed(1)}°`, 
        (this.startPoint.x + this.endPoint.x) / 2, 
        (this.startPoint.y + this.endPoint.y) / 2 - 10 / context.zoom);
      ctx.restore();
    }
  }
}

// Count Tool
export class CountTool extends BaseTool {
  type = 'count' as ToolType;
  cursor = 'crosshair';
  private counts: Point[] = [];
  private currentGroup = 1;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (event.altKey) {
      // Remove last count
      this.counts.pop();
    } else {
      this.counts.push(point);
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Delete') {
      this.counts = [];
    }
    if (event.key >= '1' && event.key <= '9') {
      this.currentGroup = parseInt(event.key);
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    ctx.save();
    ctx.font = `12px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < this.counts.length; i++) {
      const screen = context.canvasToScreen(this.counts[i]);
      
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 8 / context.zoom, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.fillText(`${i + 1}`, screen.x, screen.y);
    }
    
    ctx.restore();
  }
}

export default {
  FillTool,
  PaintBucketTool,
  GradientTool,
  MaterialDropTool,
  EyedropperTool,
  ColorSamplerTool,
  RulerTool,
  CountTool,
};