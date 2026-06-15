/**
 * Stratum Tool Engine
 * Core implementation of all tool behaviors
 */

import type { CanvasEvent, SelectionData, VectorPath, AnchorPoint, RasterLayer, VectorLayer } from '../../types';
import type { ToolDefinition } from '../../types';

export interface ToolState {
  isActive: boolean;
  isDrawing: boolean;
  lastX: number;
  lastY: number;
  startPoint: { x: number; y: number } | null;
  selection?: SelectionData;
  currentPath?: VectorPath;
}

export class ToolEngine {
  private state: Map<string, ToolState> = new Map();
  private options: Map<string, any> = new Map();

  getToolState(toolId: string): ToolState {
    if (!this.state.has(toolId)) {
      this.state.set(toolId, {
        isActive: false,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        startPoint: null,
      });
    }
    return this.state.get(toolId)!;
  }

  setToolOption(toolId: string, optionId: string, value: any): void {
    const key = `${toolId}-${optionId}`;
    this.options.set(key, value);
  }

  getToolOption(toolId: string, optionId: string, defaultValue: any): any {
    const key = `${toolId}-${optionId}`;
    return this.options.get(key) ?? defaultValue;
  }

  // ============================================================================
  // SELECTION TOOLS
  // ============================================================================

  handleMarqueeSelection(event: CanvasEvent, toolId: string): SelectionData | null {
    const state = this.getToolState(toolId);
    
    if (event.type === 'mousedown') {
      state.startPoint = { x: event.canvasX, y: event.canvasY };
      state.isDrawing = true;
    } else if (event.type === 'mousemove' && state.isDrawing && state.startPoint) {
      const width = event.canvasX - state.startPoint.x;
      const height = event.canvasY - state.startPoint.y;
      
      return {
        type: 'rect',
        bounds: {
          x: width < 0 ? event.canvasX : state.startPoint.x,
          y: height < 0 ? event.canvasY : state.startPoint.y,
          width: Math.abs(width),
          height: Math.abs(height),
        },
        antiAlias: this.getToolOption(toolId, 'antiAlias', true),
        feather: this.getToolOption(toolId, 'feather', 0),
      };
    } else if (event.type === 'mouseup') {
      state.isDrawing = false;
    }
    
    return null;
  }

  handleLassoSelection(event: CanvasEvent, toolId: string): SelectionData | null {
    const state = this.getToolState(toolId);
    
    if (event.type === 'mousedown') {
      state.startPoint = { x: event.canvasX, y: event.canvasY };
      state.isDrawing = true;
      state.currentPath = {
        id: `path-${Date.now()}`,
        closed: false,
        points: [{ x: event.canvasX, y: event.canvasY, cornerType: 'corner' }],
      };
    } else if (event.type === 'mousemove' && state.isDrawing && state.currentPath) {
      state.currentPath.points.push({
        x: event.canvasX,
        y: event.canvasY,
        cornerType: 'corner',
      });
      
      return {
        type: 'polygon',
        path: state.currentPath,
        antiAlias: this.getToolOption(toolId, 'antiAlias', true),
        feather: this.getToolOption(toolId, 'feather', 0),
      };
    } else if (event.type === 'mouseup') {
      state.isDrawing = false;
      if (state.currentPath) {
        state.currentPath.closed = true;
      }
    }
    
    return null;
  }

  handleMagicWand(event: CanvasEvent, imageData: ImageData): SelectionData | null {
    if (event.type !== 'click') return null;
    
    const tolerance = this.getToolOption('magicWand', 'tolerance', 32);
    const contiguous = this.getToolOption('magicWand', 'contiguous', true);
    
    const startX = Math.floor(event.canvasX);
    const startY = Math.floor(event.canvasY);
    const idx = (startY * imageData.width + startX) * 4;
    
    const targetR = imageData.data[idx];
    const targetG = imageData.data[idx + 1];
    const targetB = imageData.data[idx + 2];
    
    const mask = new Uint8Array(imageData.width * imageData.height);
    const visited = new Uint8Array(imageData.width * imageData.height);
    const queue: [number, number][] = [[startX, startY]];
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const visIdx = y * imageData.width + x;
      
      if (visited[visIdx]) continue;
      visited[visIdx] = 1;
      
      const pIdx = (y * imageData.width + x) * 4;
      const dR = Math.abs(imageData.data[pIdx] - targetR);
      const dG = Math.abs(imageData.data[pIdx + 1] - targetG);
      const dB = Math.abs(imageData.data[pIdx + 2] - targetB);
      
      if (dR + dG + dB <= tolerance) {
        mask[visIdx] = 1;
        
        if (contiguous) {
          if (x > 0) queue.push([x - 1, y]);
          if (x < imageData.width - 1) queue.push([x + 1, y]);
          if (y > 0) queue.push([x, y - 1]);
          if (y < imageData.height - 1) queue.push([x, y + 1]);
        }
      }
    }
    
    if (!contiguous) {
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const pIdx = (y * imageData.width + x) * 4;
          const dR = Math.abs(imageData.data[pIdx] - targetR);
          const dG = Math.abs(imageData.data[pIdx + 1] - targetG);
          const dB = Math.abs(imageData.data[pIdx + 2] - targetB);
          if (dR + dG + dB <= tolerance) {
            mask[y * imageData.width + x] = 1;
          }
        }
      }
    }
    
    return {
      type: 'magic',
      antiAlias: true,
    };
  }

  // ============================================================================
  // PAINTING TOOLS
  // ============================================================================

  handleBrush(event: CanvasEvent, layer: RasterLayer): ImageData | null {
    if (!layer.pixelData) return null;
    
    const size = this.getToolOption('brush', 'brushSize', 20);
    const hardness = this.getToolOption('brush', 'hardness', 50);
    const opacity = this.getToolOption('brush', 'opacity', 100);
    const flow = this.getToolOption('brush', 'flow', 100);
    
    const data = layer.pixelData.data;
    const radius = Math.floor(size / 2);
    
    if (event.type === 'mousemove' || event.type === 'mousedown') {
      const cx = Math.floor(event.canvasX);
      const cy = Math.floor(event.canvasY);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const falloff = hardness < 100 ? 1 - (dist / radius) * (1 - hardness / 100) : 1;
              const alpha = (opacity / 100) * (flow / 100) * falloff;
              
              const idx = (y * layer.width + x) * 4;
              data[idx] = Math.min(255, data[idx] + (255 - data[idx]) * alpha);
              data[idx + 1] = Math.min(255, data[idx + 1] + (255 - data[idx + 1]) * alpha);
              data[idx + 2] = Math.min(255, data[idx + 2] + (255 - data[idx + 2]) * alpha);
            }
          }
        }
      }
      
      return layer.pixelData;
    }
    
    return null;
  }

  handleEraser(event: CanvasEvent, layer: RasterLayer): ImageData | null {
    if (!layer.pixelData) return null;
    
    const size = this.getToolOption('eraser', 'brushSize', 20);
    const hardness = this.getToolOption('eraser', 'hardness', 50);
    const opacity = this.getToolOption('eraser', 'opacity', 100);
    
    const data = layer.pixelData.data;
    const radius = Math.floor(size / 2);
    
    if (event.type === 'mousemove' || event.type === 'mousedown') {
      const cx = Math.floor(event.canvasX);
      const cy = Math.floor(event.canvasY);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const falloff = hardness < 100 ? 1 - (dist / radius) * (1 - hardness / 100) : 1;
              const alpha = (opacity / 100) * falloff;
              
              const idx = (y * layer.width + x) * 4 + 3;
              data[idx] = Math.max(0, data[idx] * (1 - alpha));
            }
          }
        }
      }
      
      return layer.pixelData;
    }
    
    return null;
  }

  // ============================================================================
  // RETOUCHING TOOLS
  // ============================================================================

  handleCloneStamp(event: CanvasEvent, layer: RasterLayer, sourcePoint?: { x: number; y: number }): ImageData | null {
    if (!layer.pixelData || !sourcePoint) return null;
    
    const size = this.getToolOption('cloneStamp', 'brushSize', 20);
    const hardness = this.getToolOption('cloneStamp', 'hardness', 50);
    const opacity = this.getToolOption('cloneStamp', 'opacity', 100);
    
    const data = layer.pixelData.data;
    const radius = Math.floor(size / 2);
    
    if (event.type === 'mousemove' || event.type === 'mousedown') {
      const cx = Math.floor(event.canvasX);
      const cy = Math.floor(event.canvasY);
      const offsetX = sourcePoint.x - cx;
      const offsetY = sourcePoint.y - cy;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          const srcX = x + offsetX;
          const srcY = y + offsetY;
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height &&
              srcX >= 0 && srcX < layer.width && srcY >= 0 && srcY < layer.height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const falloff = hardness < 100 ? 1 - (dist / radius) * (1 - hardness / 100) : 1;
              const alpha = (opacity / 100) * falloff;
              
              const dstIdx = (y * layer.width + x) * 4;
              const srcIdx = (srcY * layer.width + srcX) * 4;
              
              for (let c = 0; c < 3; c++) {
                data[dstIdx + c] = Math.round(data[dstIdx + c] * (1 - alpha) + data[srcIdx + c] * alpha);
              }
            }
          }
        }
      }
      
      return layer.pixelData;
    }
    
    return null;
  }

  handleHealingBrush(event: CanvasEvent, layer: RasterLayer, sourcePoint?: { x: number; y: number }): ImageData | null {
    if (!layer.pixelData || !sourcePoint) return null;
    
    const size = this.getToolOption('healingBrush', 'brushSize', 20);
    const data = layer.pixelData.data;
    const radius = Math.floor(size / 2);
    
    if (event.type === 'mousemove' || event.type === 'mousedown') {
      const cx = Math.floor(event.canvasX);
      const cy = Math.floor(event.canvasY);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          const srcX = x + (sourcePoint.x - cx);
          const srcY = y + (sourcePoint.y - cy);
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height &&
              srcX >= 0 && srcX < layer.width && srcY >= 0 && srcY < layer.height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const dstIdx = (y * layer.width + x) * 4;
              const srcIdx = (srcY * layer.width + srcX) * 4;
              
              // Simple blending - real healing would match texture and lighting
              for (let c = 0; c < 3; c++) {
                data[dstIdx + c] = Math.round((data[dstIdx + c] + data[srcIdx + c]) / 2);
              }
            }
          }
        }
      }
      
      return layer.pixelData;
    }
    
    return null;
  }

  // ============================================================================
  // GRADIENT TOOL
  // ============================================================================

  handleGradient(event: CanvasEvent, layer: RasterLayer): ImageData | null {
    const state = this.getToolState('gradient');
    
    if (!layer.pixelData) return null;
    
    const data = layer.pixelData.data;
    const type = this.getToolOption('gradient', 'type', 'Linear');
    
    if (event.type === 'mousedown') {
      state.startPoint = { x: event.canvasX, y: event.canvasY };
      state.isDrawing = true;
    } else if (event.type === 'mouseup' && state.startPoint) {
      const startX = Math.floor(state.startPoint.x);
      const startY = Math.floor(state.startPoint.y);
      const endX = Math.floor(event.canvasX);
      const endY = Math.floor(event.canvasY);
      
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        for (let y = 0; y < layer.height; y++) {
          for (let x = 0; x < layer.width; x++) {
            let t: number;
            
            if (type === 'Linear') {
              const proj = ((x - startX) * dx + (y - startY) * dy) / (length * length);
              t = Math.max(0, Math.min(1, proj));
            } else if (type === 'Radial') {
              const dist = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
              t = Math.max(0, Math.min(1, dist / length));
            } else {
              t = 0.5;
            }
            
            const idx = (y * layer.width + x) * 4;
            // Simple gradient from white to black
            const value = Math.round(255 * (1 - t));
            data[idx] = value;
            data[idx + 1] = value;
            data[idx + 2] = value;
            data[idx + 3] = 255;
          }
        }
      }
      
      state.isDrawing = false;
      state.startPoint = null;
      return layer.pixelData;
    }
    
    return null;
  }

  // ============================================================================
  // CROP TOOL
  // ============================================================================

  handleCrop(event: CanvasEvent): SelectionData | null {
    const state = this.getToolState('crop');
    
    if (event.type === 'mousedown') {
      state.startPoint = { x: event.canvasX, y: event.canvasY };
      state.isDrawing = true;
    } else if (event.type === 'mousemove' && state.isDrawing && state.startPoint) {
      const width = event.canvasX - state.startPoint.x;
      const height = event.canvasY - state.startPoint.y;
      
      return {
        type: 'rect',
        bounds: {
          x: width < 0 ? event.canvasX : state.startPoint.x,
          y: height < 0 ? event.canvasY : state.startPoint.y,
          width: Math.abs(width),
          height: Math.abs(height),
        },
        antiAlias: false,
      };
    } else if (event.type === 'mouseup') {
      state.isDrawing = false;
    }
    
    return null;
  }
}

export const toolEngine = new ToolEngine();
