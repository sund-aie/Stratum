/**
 * Stratum Canvas Engine - Simplified Version
 */

import type { Document, RasterLayer, VectorLayer, AdjustmentLayer } from '../../types';

export interface CanvasEngineOptions {
  gpuAcceleration: boolean;
  pixelRatio: number;
  maxTextureSize: number;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: CanvasEngineOptions;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private offscreenCanvases: Map<string, HTMLCanvasElement> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<CanvasEngineOptions> = {}
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { 
      alpha: true, 
      desynchronized: true,
      willReadFrequently: true
    });
    
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    
    this.ctx = ctx;
    this.options = {
      gpuAcceleration: options.gpuAcceleration ?? true,
      pixelRatio: (options.pixelRatio ?? window.devicePixelRatio) || 1,
      maxTextureSize: options.maxTextureSize ?? 4096,
    };
    
    this.setupEventListeners();
    this.setupHighDPISupport();
  }

  private setupHighDPISupport(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.options.pixelRatio;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleMouseMove(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleMouseUp(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.01, Math.min(32, zoom));
  }

  public render(document: Document | null = null): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);
    
    // Draw checkerboard background
    this.drawCheckerboard();
    
    if (document) {
      this.drawArtboard(document);
      this.drawLayers(document);
    }
    
    this.ctx.restore();
  }

  private drawCheckerboard(): void {
    const size = 8;
    const lightColor = '#e0e0e0';
    const darkColor = '#c0c0c0';
    
    const width = this.canvas.width / this.options.pixelRatio;
    const height = this.canvas.height / this.options.pixelRatio;
    
    this.ctx.fillStyle = lightColor;
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.fillStyle = darkColor;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((x / size + y / size) % 2 === 0) {
          this.ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  private drawArtboard(document: Document): void {
    if (!document.artboards || document.artboards.length === 0) return;
    
    const artboard = document.artboards[0];
    
    if (artboard.backgroundColor) {
      this.ctx.fillStyle = `rgba(${artboard.backgroundColor.r}, ${artboard.backgroundColor.g}, ${artboard.backgroundColor.b}, ${artboard.backgroundColor.a})`;
      this.ctx.fillRect(artboard.x, artboard.y, artboard.width, artboard.height);
    }
    
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(artboard.x, artboard.y, artboard.width, artboard.height);
  }

  private drawLayers(document: Document): void {
    if (!document.layers || document.layers.length === 0) return;
    
    const sortedLayers = [...document.layers].sort((a, b) => a.order - b.order);
    
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      
      if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
        const rasterLayer = layer as RasterLayer;
        if (rasterLayer.pixelData) {
          const tempCanvas = window.document.createElement('canvas');
          tempCanvas.width = rasterLayer.pixelData.width;
          tempCanvas.height = rasterLayer.pixelData.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(rasterLayer.pixelData, 0, 0);
            this.ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      }
      
      this.ctx.restore();
    }
  }

  public dispose(): void {
    this.offscreenCanvases.clear();
  }
}

// Singleton instance management
let canvasEngineInstance: CanvasEngine | null = null;

export function getCanvasEngine(canvas?: HTMLCanvasElement): CanvasEngine {
  if (!canvasEngineInstance && canvas) {
    canvasEngineInstance = new CanvasEngine(canvas);
  } else if (!canvasEngineInstance) {
    throw new Error('CanvasEngine not initialized. Provide a canvas element.');
  }
  return canvasEngineInstance;
}

export function initializeCanvasEngine(canvas: HTMLCanvasElement): CanvasEngine {
  canvasEngineInstance = new CanvasEngine(canvas);
  return canvasEngineInstance;
}
