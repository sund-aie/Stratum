/**
 * Unified Canvas - Brush Tools
 * Brush, Pencil, Eraser, Color Replacement, Mixer Brush, Blur, Sharpen, Smudge, Dodge, Burn, Sponge
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, Color, BrushDynamics, ToolType, ToolOptions } from '../types';
import { RasterOps } from '../engine/RasterOps';
import { distance, lerp } from '../utils/math';

export class BrushTool extends BaseTool {
  type = 'brush' as ToolType;
  cursor = 'crosshair';
  private isPainting = false;
  private lastPoint: Point | null = null;
  private strokePoints: Point[] = [];
  private strokeColor: Color;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
    this.strokeColor = { r: 0, g: 0, b: 0, a: 1 };
  }

  onActivate(context: ToolContext) {
    this.strokeColor = context.toolOptions.foregroundColor;
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isPainting = true;
    this.lastPoint = point;
    this.strokePoints = [point];
    this.strokeColor = context.toolOptions.foregroundColor;
    
    // Apply brush at start point
    this.applyBrush(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isPainting || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    // Apply brush with spacing
    const spacing = context.toolOptions.brushSpacing;
    const distanceFromLast = distance(this.lastPoint, point);
    const brushSize = context.toolOptions.brushSize;
    const stepSize = brushSize * spacing / 100;
    
    if (distanceFromLast >= stepSize) {
      this.applyBrush(this.lastPoint, point, context);
      this.lastPoint = point;
    }
    
    this.strokePoints.push(point);
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isPainting) {
      context.pushHistory();
    }
    this.isPainting = false;
    this.lastPoint = null;
    this.strokePoints = [];
  }

  private applyBrush(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const dynamics: BrushDynamics = {
      size: opts.brushSize,
      hardness: opts.brushHardness,
      opacity: opts.brushOpacity,
      flow: opts.brushFlow,
      spacing: opts.brushSpacing,
      angle: 0,
      roundness: 1,
      scatter: 0,
      count: 1,
      colorJitter: 0,
      opacityJitter: 0,
      sizeJitter: 0,
    };
    
    this.rasterOps.applyBrush(
      layer.data.imageData,
      from,
      to,
      this.strokeColor,
      dynamics,
      opts.brushBlendMode
    );
    
    // Update layer
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    // Preview is handled by CanvasViewport
  }
}

// Pencil Tool (hard-edged brush)
export class PencilTool extends BaseTool {
  type = 'pencil' as ToolType;
  cursor = 'crosshair';
  private isPainting = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isPainting = true;
    this.lastPoint = point;
    this.applyPencil(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isPainting || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyPencil(this.lastPoint, point, context);
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isPainting) {
      context.pushHistory();
    }
    this.isPainting = false;
    this.lastPoint = null;
  }

  private applyPencil(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    // Pencil uses 100% hardness and no spacing
    const dynamics: BrushDynamics = {
      size: opts.brushSize,
      hardness: 1,
      opacity: opts.brushOpacity,
      flow: opts.brushFlow,
      spacing: 1,
      angle: 0,
      roundness: 1,
      scatter: 0,
      count: 1,
      colorJitter: 0,
      opacityJitter: 0,
      sizeJitter: 0,
    };
    
    this.rasterOps.applyBrush(
      layer.data.imageData,
      from,
      to,
      opts.foregroundColor,
      dynamics,
      opts.brushBlendMode
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Eraser Tool
export class EraserTool extends BaseTool {
  type = 'eraser' as ToolType;
  cursor = 'cell';
  private isErasing = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isErasing = true;
    this.lastPoint = point;
    this.applyEraser(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isErasing || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyEraser(this.lastPoint, point, context);
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isErasing) {
      context.pushHistory();
    }
    this.isErasing = false;
    this.lastPoint = null;
  }

  private applyEraser(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const dynamics: BrushDynamics = {
      size: opts.brushSize,
      hardness: opts.brushHardness,
      opacity: opts.brushOpacity,
      flow: opts.brushFlow,
      spacing: opts.brushSpacing,
      angle: 0,
      roundness: 1,
      scatter: 0,
      count: 1,
      colorJitter: 0,
      opacityJitter: 0,
      sizeJitter: 0,
    };
    
    this.rasterOps.applyEraser(
      layer.data.imageData,
      from,
      to,
      dynamics
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Background Eraser
export class BackgroundEraserTool extends BaseTool {
  type = 'background-eraser' as ToolType;
  cursor = 'cell';
  private isErasing = false;
  private sampleColor: Color | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    // Sample color at click point
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    const imageData = layer.data.imageData;
    
    if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
      const idx = (y * imageData.width + x) * 4;
      this.sampleColor = {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2],
        a: imageData.data[idx + 3] / 255,
      };
      
      this.isErasing = true;
      this.applyBackgroundEraser(point, point, context);
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isErasing || !this.sampleColor) return;
    if (event.buttons === 0) return;
    
    this.applyBackgroundEraser(point, point, context);
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isErasing) {
      context.pushHistory();
    }
    this.isErasing = false;
    this.sampleColor = null;
  }

  private applyBackgroundEraser(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData || !this.sampleColor) return;
    
    const opts = context.toolOptions;
    const dynamics: BrushDynamics = {
      size: opts.brushSize,
      hardness: opts.brushHardness,
      opacity: 1,
      flow: opts.brushFlow,
      spacing: opts.brushSpacing,
      angle: 0,
      roundness: 1,
      scatter: 0,
      count: 1,
      colorJitter: 0,
      opacityJitter: 0,
      sizeJitter: 0,
    };
    
    this.rasterOps.applyBackgroundEraser(
      layer.data.imageData,
      from,
      to,
      this.sampleColor,
      opts.brushOpacity, // tolerance
      dynamics
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Magic Eraser
export class MagicEraserTool extends BaseTool {
  type = 'magic-eraser' as ToolType;
  cursor = 'cell';
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    const imageData = layer.data.imageData;
    
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return;
    
    const idx = (y * imageData.width + x) * 4;
    const targetColor = {
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
      a: imageData.data[idx + 3] / 255,
    };
    
    if (targetColor.a === 0) return;
    
    // Flood fill to transparent
    const tolerance = 32; // Fixed tolerance for magic eraser
    this.rasterOps.floodFillToTransparent(imageData, x, y, targetColor, tolerance, true);
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
    context.pushHistory();
  }
}

// Blur Tool
export class BlurTool extends BaseTool {
  type = 'blur' as ToolType;
  cursor = 'crosshair';
  private isBlurring = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isBlurring = true;
    this.lastPoint = point;
    this.applyEffect(point, point, context, 'blur');
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isBlurring || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyEffect(this.lastPoint, point, context, 'blur');
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isBlurring) {
      context.pushHistory();
    }
    this.isBlurring = false;
    this.lastPoint = null;
  }

  private applyEffect(from: Point, to: Point, context: ToolContext, effect: 'blur' | 'sharpen' | 'smudge') {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const strength = opts.brushOpacity; // Use opacity as strength
    
    this.rasterOps.applyLocalEffect(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      effect,
      strength
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Sharpen Tool
export class SharpenTool extends BaseTool {
  type = 'sharpen' as ToolType;
  cursor = 'crosshair';
  private isSharpening = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isSharpening = true;
    this.lastPoint = point;
    this.applyEffect(point, point, context, 'sharpen');
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isSharpening || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyEffect(this.lastPoint, point, context, 'sharpen');
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isSharpening) {
      context.pushHistory();
    }
    this.isSharpening = false;
    this.lastPoint = null;
  }

  private applyEffect(from: Point, to: Point, context: ToolContext, effect: 'blur' | 'sharpen' | 'smudge') {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const strength = opts.brushOpacity;
    
    this.rasterOps.applyLocalEffect(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      effect,
      strength
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Smudge Tool
export class SmudgeTool extends BaseTool {
  type = 'smudge' as ToolType;
  cursor = 'crosshair';
  private isSmudging = false;
  private lastPoint: Point | null = null;
  private sampleBuffer: ImageData | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    this.isSmudging = true;
    this.lastPoint = point;
    
    // Sample area around cursor
    const size = context.toolOptions.brushSize;
    this.sampleBuffer = this.rasterOps.sampleArea(layer.data.imageData, point, size);
    
    this.applyEffect(point, point, context, 'smudge');
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isSmudging || !this.lastPoint || !this.sampleBuffer) return;
    if (event.buttons === 0) return;
    
    this.applyEffect(this.lastPoint, point, context, 'smudge');
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isSmudging) {
      context.pushHistory();
    }
    this.isSmudging = false;
    this.lastPoint = null;
    this.sampleBuffer = null;
  }

  private applyEffect(from: Point, to: Point, context: ToolContext, effect: 'blur' | 'sharpen' | 'smudge') {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const strength = opts.brushOpacity;
    
    this.rasterOps.applyLocalEffect(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      effect,
      strength,
      this.sampleBuffer || undefined
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Dodge Tool
export class DodgeTool extends BaseTool {
  type = 'dodge' as ToolType;
  cursor = 'crosshair';
  private isDodging = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;
  private range: 'shadows' | 'midtones' | 'highlights' = 'midtones';

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onActivate(context: ToolContext) {
    // Could read from tool options
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isDodging = true;
    this.lastPoint = point;
    this.applyDodgeBurn(point, point, context, 'dodge');
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDodging || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyDodgeBurn(this.lastPoint, point, context, 'dodge');
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDodging) {
      context.pushHistory();
    }
    this.isDodging = false;
    this.lastPoint = null;
  }

  private applyDodgeBurn(from: Point, to: Point, context: ToolContext, mode: 'dodge' | 'burn') {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const exposure = opts.brushOpacity * 0.5; // Exposure
    
    this.rasterOps.applyDodgeBurn(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      mode,
      exposure,
      this.range
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Burn Tool
export class BurnTool extends BaseTool {
  type = 'burn' as ToolType;
  cursor = 'crosshair';
  private isBurning = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;
  private range: 'shadows' | 'midtones' | 'highlights' = 'midtones';

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isBurning = true;
    this.lastPoint = point;
    this.applyDodgeBurn(point, point, context, 'burn');
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isBurning || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyDodgeBurn(this.lastPoint, point, context, 'burn');
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isBurning) {
      context.pushHistory();
    }
    this.isBurning = false;
    this.lastPoint = null;
  }

  private applyDodgeBurn(from: Point, to: Point, context: ToolContext, mode: 'dodge' | 'burn') {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const exposure = opts.brushOpacity * 0.5;
    
    this.rasterOps.applyDodgeBurn(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      mode,
      exposure,
      this.range
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Sponge Tool
export class SpongeTool extends BaseTool {
  type = 'sponge' as ToolType;
  cursor = 'crosshair';
  private isSponging = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;
  private mode: 'saturate' | 'desaturate' = 'desaturate';

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context)) return;
    
    this.isSponging = true;
    this.lastPoint = point;
    this.applySponge(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isSponging || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applySponge(this.lastPoint, point, context);
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isSponging) {
      context.pushHistory();
    }
    this.isSponging = false;
    this.lastPoint = null;
  }

  private applySponge(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const flow = opts.brushFlow;
    
    this.rasterOps.applySponge(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      this.mode,
      flow
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Color Replacement Tool
export class ColorReplacementTool extends BaseTool {
  type = 'color-replacement' as ToolType;
  cursor = 'crosshair';
  private isPainting = false;
  private lastPoint: Point | null = null;
  private rasterOps: RasterOps;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    this.isPainting = true;
    this.lastPoint = point;
    this.applyColorReplacement(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isPainting || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyColorReplacement(this.lastPoint, point, context);
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isPainting) {
      context.pushHistory();
    }
    this.isPainting = false;
    this.lastPoint = null;
  }

  private applyColorReplacement(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    const dynamics = {
      size: opts.brushSize,
      hardness: opts.brushHardness,
      opacity: opts.brushOpacity,
      flow: opts.brushFlow,
      spacing: opts.brushSpacing,
      angle: 0,
      roundness: 1,
      scatter: 0,
      count: 1,
      colorJitter: 0,
      opacityJitter: 0,
      sizeJitter: 0,
    };
    
    this.rasterOps.applyColorReplacement(
      layer.data.imageData,
      from,
      to,
      opts.foregroundColor, // Replacement color
      opts.backgroundColor, // Color to replace
      30, // tolerance
      dynamics,
      opts.brushBlendMode
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

// Mixer Brush Tool
export class MixerBrushTool extends BaseTool {
  type = 'mixer-brush' as ToolType;
  cursor = 'crosshair';
  private isMixing = false;
  private lastPoint: Point | null = null;
  private paintLoad: Color[] = [];
  private rasterOps: RasterOps;
  private wet = 50;
  private load = 50;
  private mix = 50;
  private flow = 50;

  constructor() {
    super();
    this.rasterOps = new RasterOps();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!this.isLayerEditable(layer, context) || !layer.data.imageData) return;
    
    this.isMixing = true;
    this.lastPoint = point;
    
    // Load paint from canvas at start point
    this.paintLoad = this.rasterOps.sampleColors(layer.data.imageData, point, context.toolOptions.brushSize);
    
    this.applyMixer(point, point, context);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isMixing || !this.lastPoint) return;
    if (event.buttons === 0) return;
    
    this.applyMixer(this.lastPoint, point, context);
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isMixing) {
      context.pushHistory();
    }
    this.isMixing = false;
    this.lastPoint = null;
    this.paintLoad = [];
  }

  private applyMixer(from: Point, to: Point, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || !layer.data.imageData) return;
    
    const opts = context.toolOptions;
    
    this.rasterOps.applyMixerBrush(
      layer.data.imageData,
      from,
      to,
      opts.brushSize,
      opts.brushHardness,
      opts.foregroundColor,
      this.paintLoad,
      {
        wet: this.wet,
        load: this.load,
        mix: this.mix,
        flow: this.flow,
      }
    );
    
    context.updateLayer(layer.id, { data: { ...layer.data, imageData: layer.data.imageData } });
  }
}

export default {
  BrushTool,
  PencilTool,
  EraserTool,
  BackgroundEraserTool,
  MagicEraserTool,
  BlurTool,
  SharpenTool,
  SmudgeTool,
  DodgeTool,
  BurnTool,
  SpongeTool,
  ColorReplacementTool,
  MixerBrushTool,
};