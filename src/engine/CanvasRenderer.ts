/**
 * Unified Canvas - Canvas Rendering Engine
 * Handles multi-layer rendering with blend modes, transforms, and adjustment layers
 */

import type { Layer, LayerType, BlendMode, Rect, Point, Size, Color, TransformMatrix } from '../types';
import { identityMatrix, multiplyMatrix, applyMatrixToPoint, invertMatrix } from '../utils/math';
import { applyAdjustment } from './Adjustments';
import { renderVectorPath, renderVectorLayer } from './VectorRenderer';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface RenderOptions {
  showTransparencyGrid: boolean;
  showSelection: boolean;
  selection?: any;
  showBounds: boolean;
  showGuides: boolean;
  guides?: any[];
  grid?: any;
  zoom: number;
  pan: Point;
  activeLayerId: string | null;
  hoverLayerId: string | null;
}

export class CanvasRenderer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private layerCache: Map<string, HTMLCanvasElement> = new Map();
  private cacheValid: Map<string, boolean> = new Map();

  getOffscreenContext(width: number, height: number, dpr: number): CanvasRenderingContext2D {
    if (!this.offscreenCanvas || 
        this.offscreenCanvas.width !== width * dpr || 
        this.offscreenCanvas.height !== height * dpr) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width * dpr;
      this.offscreenCanvas.height = height * dpr;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { 
        willReadFrequently: true,
        alpha: true 
      })!;
      this.offscreenCtx.scale(dpr, dpr);
    }
    return this.offscreenCtx!;
  }

  render(
    layers: Layer[],
    context: RenderContext,
    options: RenderOptions
  ): void {
    const { ctx, width, height, devicePixelRatio } = context;
    const { zoom, pan } = options;

    // Clear
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Draw transparency grid
    if (options.showTransparencyGrid) {
      this.drawTransparencyGrid(ctx, width, height, zoom, pan);
    }

    // Draw background
    ctx.fillStyle = 'rgb(204, 204, 204)';
    ctx.fillRect(0, 0, width, height);

    // Apply view transform
    ctx.setTransform(
      devicePixelRatio * zoom, 0, 0, devicePixelRatio * zoom,
      devicePixelRatio * pan.x, devicePixelRatio * pan.y
    );

    // Render layers in order (bottom to top)
    const visibleLayers = layers.filter(l => l.visible);
    
    for (const layer of visibleLayers) {
      this.renderLayer(layer, ctx, options, layers);
    }

    // Draw grid and guides
    if (options.grid?.enabled) {
      this.drawGrid(ctx, width, height, zoom, pan, options.grid);
    }
    if (options.showGuides && options.guides) {
      this.drawGuides(ctx, options.guides);
    }
  }

  private renderLayer(
    layer: Layer,
    ctx: CanvasRenderingContext2D,
    options: RenderOptions,
    allLayers: Layer[]
  ): void {
    const isActive = layer.id === options.activeLayerId;
    const isHover = layer.id === options.hoverLayerId;

    // Save context
    ctx.save();

    // Apply layer transform
    this.applyTransform(ctx, layer.transform);

    // Apply opacity
    ctx.globalAlpha = layer.opacity;

    // Apply blend mode
    ctx.globalCompositeOperation = layer.blendMode;

    // Apply mask if present
    if (layer.mask) {
      this.applyMask(ctx, layer.mask, layer.bounds);
    }

    // Render layer content based on type
    switch (layer.type) {
      case 'raster':
        this.renderRasterLayer(layer, ctx);
        break;
      case 'vector':
        this.renderVectorLayerWrapper(layer, ctx);
        break;
      case 'text':
        this.renderTextLayer(layer, ctx);
        break;
      case 'adjustment':
        this.renderAdjustmentLayer(layer, ctx, allLayers);
        break;
      case 'group':
        // Groups are handled by rendering children
        break;
    }

    // Draw layer bounds if active/hover
    if (options.showBounds && (isActive || isHover)) {
      this.drawLayerBounds(ctx, layer.bounds, isActive);
    }

    ctx.restore();
  }

  private renderRasterLayer(layer: Layer, ctx: CanvasRenderingContext2D): void {
    if (!layer.data.canvas && !layer.data.imageData) return;

    // Use cached canvas if available
    let canvas = layer.data.canvas;
    
    if (!canvas && layer.data.imageData) {
      canvas = this.imageDataToCanvas(layer.data.imageData);
      layer.data.canvas = canvas;
    }

    if (canvas) {
      ctx.drawImage(
        canvas,
        layer.bounds.x,
        layer.bounds.y,
        layer.bounds.width,
        layer.bounds.height
      );
    }
  }

  private renderVectorLayerWrapper(layer: Layer, ctx: CanvasRenderingContext2D): void {
    if (!layer.data.paths) return;
    
    renderVectorLayer(layer.data.paths, ctx, layer.bounds);
  }

  private renderTextLayer(layer: Layer, ctx: CanvasRenderingContext2D): void {
    const textData = layer.data.text;
    if (!textData) return;

    const { content, fontFamily, fontSize, fontWeight, fontStyle, textAlign, lineHeight, letterSpacing, fill, stroke, strokeWidth } = textData;

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.colorToString(fill);
    
    if (stroke && strokeWidth > 0) {
      ctx.strokeStyle = this.colorToString(stroke);
      ctx.lineWidth = strokeWidth;
    }

    const lines = content.split('\n');
    const actualLineHeight = fontSize * lineHeight;

    for (let i = 0; i < lines.length; i++) {
      const x = layer.bounds.x + (textAlign === 'center' ? layer.bounds.width / 2 : 
                        textAlign === 'right' ? layer.bounds.width : 0);
      const y = layer.bounds.y + i * actualLineHeight;

      if (letterSpacing !== 0) {
        this.drawTextWithLetterSpacing(ctx, lines[i], x, y, letterSpacing, textAlign, layer.bounds.width);
      } else {
        ctx.fillText(lines[i], x, y);
        if (stroke && strokeWidth > 0) {
          ctx.strokeText(lines[i], x, y);
        }
      }
    }
  }

  private drawTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    spacing: number,
    align: string,
    width: number
  ): void {
    const chars = text.split('');
    let currentX = x;
    
    if (align === 'center') {
      const totalWidth = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
      currentX = x - totalWidth / 2;
    } else if (align === 'right') {
      const totalWidth = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
      currentX = x - totalWidth;
    }

    for (const char of chars) {
      ctx.fillText(char, currentX, y);
      currentX += ctx.measureText(char).width + spacing;
    }
  }

  private renderAdjustmentLayer(
    layer: Layer,
    ctx: CanvasRenderingContext2D,
    allLayers: Layer[]
  ): void {
    if (!layer.adjustment || !layer.adjustment.enabled) return;

    // Find layers below this adjustment layer
    const layerIndex = allLayers.findIndex(l => l.id === layer.id);
    const affectedLayers = allLayers.slice(0, layerIndex).filter(l => l.visible);

    if (affectedLayers.length === 0) return;

    // Create composite of affected layers
    const composite = this.createComposite(affectedLayers, ctx, layer.bounds);
    
    // Apply adjustment
    const adjusted = applyAdjustment(composite, layer.adjustment);
    
    // Draw adjusted composite
    ctx.putImageData(adjusted, layer.bounds.x, layer.bounds.y);
  }

  private createComposite(
    layers: Layer[],
    ctx: CanvasRenderingContext2D,
    bounds: Rect
  ): ImageData {
    // Create temporary canvas for composite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(bounds.width);
    tempCanvas.height = Math.ceil(bounds.height);
    const tempCtx = tempCanvas.getContext('2d')!;

    // Render layers to temp canvas
    for (const layer of layers) {
      tempCtx.save();
      tempCtx.globalAlpha = layer.opacity;
      tempCtx.globalCompositeOperation = layer.blendMode;
      this.applyTransform(tempCtx, layer.transform);

      if (layer.type === 'raster' && layer.data.canvas) {
        tempCtx.drawImage(layer.data.canvas, layer.bounds.x - bounds.x, layer.bounds.y - bounds.y);
      } else if (layer.type === 'vector' && layer.data.paths) {
        renderVectorLayer(layer.data.paths, tempCtx, { 
          x: layer.bounds.x - bounds.x, 
          y: layer.bounds.y - bounds.y, 
          width: layer.bounds.width, 
          height: layer.bounds.height 
        });
      } else if (layer.type === 'text' && layer.data.text) {
        // Render text (simplified)
        const t = layer.data.text;
        tempCtx.font = `${t.fontStyle} ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
        tempCtx.fillStyle = this.colorToString(t.fill);
        tempCtx.fillText(t.content, layer.bounds.x - bounds.x, layer.bounds.y - bounds.y);
      }

      tempCtx.restore();
    }

    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: TransformMatrix): void {
    if (transform.a !== 1 || transform.b !== 0 || transform.c !== 0 || 
        transform.d !== 1 || transform.e !== 0 || transform.f !== 0) {
      ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
    }
  }

  private applyMask(ctx: CanvasRenderingContext2D, mask: ImageData, bounds: Rect): void {
    // Save current composite operation
    const prevOp = ctx.globalCompositeOperation;
    
    // Create mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.putImageData(mask, 0, 0);

    // Use destination-in to apply mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, bounds.x, bounds.y, bounds.width, bounds.height);
    
    ctx.globalCompositeOperation = prevOp;
  }

  private drawLayerBounds(ctx: CanvasRenderingContext2D, bounds: Rect, isActive: boolean): void {
    ctx.save();
    ctx.strokeStyle = isActive ? '#007acc' : '#007acc88';
    ctx.lineWidth = 1 / (ctx.getTransform().a || 1);
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Draw corner handles
    const handleSize = 6 / (ctx.getTransform().a || 1);
    ctx.setLineDash([]);
    ctx.fillStyle = '#007acc';
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ];
    for (const corner of corners) {
      ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    }
    ctx.restore();
  }

  private drawTransparencyGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number,
    pan: Point
  ): void {
    const gridSize = TRANSPARENCY_GRID_SIZE * zoom;
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;
    const startX = -(pan.x * zoom) % gridSize;
    const startY = -(pan.y * zoom) % gridSize;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const colorIndex = (row + col) % 2;
        const color = TRANSPARENCY_COLORS[colorIndex];
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fillRect(
          startX + col * gridSize,
          startY + row * gridSize,
          gridSize,
          gridSize
        );
      }
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    zoom: number,
    pan: Point,
    grid: any
  ): void {
    ctx.save();
    ctx.strokeStyle = this.colorToString(grid.color);
    ctx.lineWidth = 1 / zoom;
    
    if (grid.style === 'dots') {
      // Draw dots at intersections
      const step = grid.size * zoom;
      const subStep = step / grid.subdivisions;
      ctx.fillStyle = ctx.strokeStyle;
      
      for (let x = -pan.x * zoom; x < canvasWidth; x += subStep) {
        for (let y = -pan.y * zoom; y < canvasHeight; y += subStep) {
          // Main grid lines
          if (x % step === 0 || y % step === 0) {
            ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
          }
        }
      }
    } else {
      // Draw lines
      ctx.beginPath();
      const step = grid.size * zoom;
      const subStep = step / grid.subdivisions;
      
      for (let x = -pan.x * zoom; x < canvasWidth; x += subStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = -pan.y * zoom; y < canvasHeight; y += subStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGuides(ctx: CanvasRenderingContext2D, guides: any[]): void {
    for (const guide of guides) {
      if (!guide.locked) continue;
      ctx.save();
      ctx.strokeStyle = this.colorToString(guide.color);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      
      if (guide.orientation === 'horizontal') {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(ctx.canvas.width, guide.position);
      } else {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, ctx.canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private colorToString(color: Color): string {
    return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
  }

  // Cache management
  invalidateLayerCache(layerId: string): void {
    this.cacheValid.set(layerId, false);
  }

  clearCache(): void {
    this.layerCache.clear();
    this.cacheValid.clear();
  }

  // Get flattened image data
  getFlattenedImageData(
    layers: Layer[],
    width: number,
    height: number,
    dpr: number
  ): ImageData {
    const ctx = this.getOffscreenContext(width, height, dpr);
    ctx.clearRect(0, 0, width, height);
    
    for (const layer of layers.filter(l => l.visible)) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      this.applyTransform(ctx, layer.transform);

      if (layer.type === 'raster' && layer.data.canvas) {
        ctx.drawImage(layer.data.canvas, layer.bounds.x, layer.bounds.y);
      } else if (layer.type === 'vector' && layer.data.paths) {
        renderVectorLayer(layer.data.paths, ctx, layer.bounds);
      }
      
      ctx.restore();
    }

    return ctx.getImageData(0, 0, width, height);
  }
}

export const canvasRenderer = new CanvasRenderer();

// Import constants
import { TRANSPARENCY_GRID_SIZE, TRANSPARENCY_COLORS } from '../constants';