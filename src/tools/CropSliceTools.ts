/**
 * Unified Canvas - Crop, Slice, and Miscellaneous Tools
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, Rect, ToolType, ToolOptions } from '../types';
import { RasterOps } from '../engine/RasterOps';

export class CropTool extends BaseTool {
  type = 'crop' as ToolType;
  cursor = 'crosshair';
  private cropRect: Rect | null = null;
  private isDrawing = false;
  private dragHandle: string | null = null;
  private dragStart: Point | null = null;
  private initialRect: Rect | null = null;
  private shieldColor = { r: 0, g: 0, b: 0, a: 0.75 };
  private shieldOpacity = 0.75;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.cropRect) {
      // Start new crop
      this.cropRect = { x: point.x, y: point.y, width: 0, height: 0 };
      this.isDrawing = true;
    } else {
      // Check handle
      this.dragHandle = this.getHandleAtPoint(point);
      if (this.dragHandle) {
        this.dragStart = point;
        this.initialRect = { ...this.cropRect };
      } else if (this.pointInRect(point, this.cropRect)) {
        // Move crop
        this.dragHandle = 'move';
        this.dragStart = point;
        this.initialRect = { ...this.cropRect };
      }
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.cropRect) {
      const { shiftKey, altKey } = event;
      let x = point.x;
      let y = point.y;
      let width = x - this.cropRect.x;
      let height = y - this.cropRect.y;
      
      if (shiftKey) {
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      }
      
      if (altKey) {
        x = this.cropRect.x - width / 2;
        y = this.cropRect.y - height / 2;
      }
      
      this.cropRect = {
        x: Math.min(this.cropRect.x, this.cropRect.x + width),
        y: Math.min(this.cropRect.y, this.cropRect.y + height),
        width: Math.abs(width),
        height: Math.abs(height),
      };
    } else if (this.dragHandle && this.dragStart && this.initialRect && this.cropRect) {
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      
      switch (this.dragHandle) {
        case 'move':
          this.cropRect.x = this.initialRect.x + dx;
          this.cropRect.y = this.initialRect.y + dy;
          break;
        case 'nw':
          this.cropRect.x = this.initialRect.x + dx;
          this.cropRect.y = this.initialRect.y + dy;
          this.cropRect.width = this.initialRect.width - dx;
          this.cropRect.height = this.initialRect.height - dy;
          break;
        case 'ne':
          this.cropRect.y = this.initialRect.y + dy;
          this.cropRect.width = this.initialRect.width + dx;
          this.cropRect.height = this.initialRect.height - dy;
          break;
        case 'se':
          this.cropRect.width = this.initialRect.width + dx;
          this.cropRect.height = this.initialRect.height + dy;
          break;
        case 'sw':
          this.cropRect.x = this.initialRect.x + dx;
          this.cropRect.width = this.initialRect.width - dx;
          this.cropRect.height = this.initialRect.height + dy;
          break;
      }
      
      // Constrain to positive
      if (this.cropRect.width < 0) {
        this.cropRect.x += this.cropRect.width;
        this.cropRect.width = Math.abs(this.cropRect.width);
      }
      if (this.cropRect.height < 0) {
        this.cropRect.y += this.cropRect.height;
        this.cropRect.height = Math.abs(this.cropRect.height);
      }
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.cropRect && this.cropRect.width > 10 && this.cropRect.height > 10) {
      this.isDrawing = false;
    } else if (this.isDrawing) {
      this.cropRect = null;
      this.isDrawing = false;
    }
    this.dragHandle = null;
    this.dragStart = null;
    this.initialRect = null;
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Enter' && this.cropRect) {
      this.applyCrop(context);
    }
    if (event.key === 'Escape') {
      this.cancelCrop(context);
    }
  }

  private applyCrop(context: ToolContext) {
    if (!this.cropRect) return;
    
    // Crop all visible layers
    const cropX = Math.floor(this.cropRect.x);
    const cropY = Math.floor(this.cropRect.y);
    const cropW = Math.floor(this.cropRect.width);
    const cropH = Math.floor(this.cropRect.height);
    
    for (const layer of context.layers) {
      if (layer.visible && layer.data.imageData) {
        const ops = new RasterOps();
        const cropped = ops.cropImage(layer.data.imageData, cropX, cropY, cropW, cropH);
        context.updateLayer(layer.id, { 
          data: { ...layer.data, imageData: cropped },
          transform: { x: layer.transform.x - cropX, y: layer.transform.y - cropY, ...layer.transform }
        });
      }
    }
    
    context.pushHistory();
    this.cropRect = null;
  }

  private cancelCrop(context: ToolContext) {
    this.cropRect = null;
    this.isDrawing = false;
  }

  private getHandleAtPoint(point: Point): string | null {
    if (!this.cropRect) return null;
    
    const handles = [
      { name: 'nw', x: this.cropRect.x, y: this.cropRect.y },
      { name: 'ne', x: this.cropRect.x + this.cropRect.width, y: this.cropRect.y },
      { name: 'se', x: this.cropRect.x + this.cropRect.width, y: this.cropRect.y + this.cropRect.height },
      { name: 'sw', x: this.cropRect.x, y: this.cropRect.y + this.cropRect.height },
    ];
    
    for (const handle of handles) {
      const dist = Math.hypot(point.x - handle.x, point.y - handle.y);
      if (dist < 10) return handle.name;
    }
    return null;
  }

  private pointInRect(point: Point, rect: Rect): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (!this.cropRect) return;
    
    const canvas = context.canvas;
    const { x, y, width, height } = this.cropRect;
    
    // Draw shield
    ctx.save();
    ctx.fillStyle = `rgba(${this.shieldColor.r}, ${this.shieldColor.g}, ${this.shieldColor.b}, ${this.shieldOpacity})`;
    ctx.fillRect(0, 0, canvas.width / context.zoom, y);
    ctx.fillRect(0, y, x, height);
    ctx.fillRect(x + width, y, canvas.width / context.zoom - x - width, height);
    ctx.fillRect(0, y + height, canvas.width / context.zoom, canvas.height / context.zoom - y - height);
    
    // Draw crop border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / context.zoom;
    ctx.strokeRect(x, y, width, height);
    
    // Draw handles
    ctx.fillStyle = '#fff';
    const handles = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
    
    for (const handle of handles) {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 6 / context.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1 / context.zoom;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + width * i / 3, y);
      ctx.lineTo(x + width * i / 3, y + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + height * i / 3);
      ctx.lineTo(x + width, y + height * i / 3);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

// Slice Tool
export class SliceTool extends BaseTool {
  type = 'slice' as ToolType;
  cursor = 'crosshair';
  private slices: { rect: Rect; name: string; type: 'image' | 'no-image'; url: string }[] = [];
  private currentSlice: Rect | null = null;
  private isDrawing = false;
  private dragHandle: string | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.currentSlice) {
      this.currentSlice = { x: point.x, y: point.y, width: 0, height: 0 };
      this.isDrawing = true;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.currentSlice) {
      const { shiftKey, altKey } = event;
      let x = point.x;
      let y = point.y;
      let width = x - this.currentSlice.x;
      let height = y - this.currentSlice.y;
      
      if (shiftKey) {
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      }
      
      this.currentSlice = {
        x: Math.min(this.currentSlice.x, this.currentSlice.x + width),
        y: Math.min(this.currentSlice.y, this.currentSlice.y + height),
        width: Math.abs(width),
        height: Math.abs(height),
      };
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.currentSlice && this.currentSlice.width > 5 && this.currentSlice.height > 5) {
      this.slices.push({
        rect: { ...this.currentSlice },
        name: `Slice ${this.slices.length + 1}`,
        type: 'image',
        url: '',
      });
      this.currentSlice = null;
      this.isDrawing = false;
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    ctx.save();
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth = 1 / context.zoom;
    ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
    
    for (const slice of this.slices) {
      ctx.strokeRect(slice.rect.x, slice.rect.y, slice.rect.width, slice.rect.height);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.1)';
      ctx.fillRect(slice.rect.x, slice.rect.y, slice.rect.width, slice.rect.height);
    }
    
    if (this.currentSlice) {
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(this.currentSlice.x, this.currentSlice.y, this.currentSlice.width, this.currentSlice.height);
    }
    
    ctx.restore();
  }
}

// Slice Select Tool
export class SliceSelectTool extends BaseTool {
  type = 'slice-select' as ToolType;
  cursor = 'default';
  
  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    // Select slice
  }
}

// Frame Tool (Illustrator style)
export class FrameTool extends BaseTool {
  type = 'frame' as ToolType;
  cursor = 'crosshair';
  private frames: { rect: Rect; layerId: string }[] = [];
  private currentFrame: Rect | null = null;
  private isDrawing = false;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.currentFrame) {
      this.currentFrame = { x: point.x, y: point.y, width: 0, height: 0 };
      this.isDrawing = true;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.currentFrame) {
      let x = point.x;
      let y = point.y;
      let width = x - this.currentFrame.x;
      let height = y - this.currentFrame.y;
      
      this.currentFrame = {
        x: Math.min(this.currentFrame.x, this.currentFrame.x + width),
        y: Math.min(this.currentFrame.y, this.currentFrame.y + height),
        width: Math.abs(width),
        height: Math.abs(height),
      };
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.currentFrame && this.currentFrame.width > 10 && this.currentFrame.height > 10) {
      // Create frame layer with placeholder
      const layer: Layer = {
        id: `frame-${Date.now()}`,
        name: 'Frame',
        type: 'frame',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        order: context.layers.length,
        transform: { 
          x: this.currentFrame.x, 
          y: this.currentFrame.y, 
          scaleX: 1, 
          scaleY: 1, 
          rotation: 0 
        },
        data: {
          frame: {
            rect: { ...this.currentFrame },
            content: null,
            fit: 'cover',
          }
        },
      };
      
      context.addLayer(layer);
      this.frames.push({ rect: { ...this.currentFrame }, layerId: layer.id });
      this.currentFrame = null;
      this.isDrawing = false;
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentFrame) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.strokeRect(this.currentFrame.x, this.currentFrame.y, this.currentFrame.width, this.currentFrame.height);
      ctx.restore();
    }
  }
}

// Perspective Crop Tool
export class PerspectiveCropTool extends BaseTool {
  type = 'perspective-crop' as ToolType;
  cursor = 'crosshair';
  private quad: Point[] = [];
  private dragPoint: number | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.quad.length < 4) {
      this.quad.push(point);
    } else {
      // Check if clicking on existing point
      for (let i = 0; i < 4; i++) {
        if (Math.hypot(point.x - this.quad[i].x, point.y - this.quad[i].y) < 10) {
          this.dragPoint = i;
          break;
        }
      }
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.dragPoint !== null && this.quad[this.dragPoint]) {
      this.quad[this.dragPoint] = point;
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    this.dragPoint = null;
    
    if (this.quad.length === 4) {
      this.applyPerspectiveCrop(context);
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape') {
      this.quad = [];
    }
  }

  private applyPerspectiveCrop(context: ToolContext) {
    // Apply perspective transform to crop
    // This would use a perspective transform matrix
    context.pushHistory();
    this.quad = [];
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.quad.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#00c8ff';
      ctx.lineWidth = 2 / context.zoom;
      ctx.beginPath();
      ctx.moveTo(this.quad[0].x, this.quad[0].y);
      for (let i = 1; i < this.quad.length; i++) {
        ctx.lineTo(this.quad[i].x, this.quad[i].y);
      }
      if (this.quad.length === 4) {
        ctx.closePath();
      }
      ctx.stroke();
      
      // Draw handles
      ctx.fillStyle = '#00c8ff';
      for (const p of this.quad) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 / context.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// 3D Tools (placeholders for future)
export class Rotate3DTool extends BaseTool {
  type = '3d-rotate' as ToolType;
  cursor = 'grab';
}

export class Roll3DTool extends BaseTool {
  type = '3d-roll' as ToolType;
  cursor = 'crosshair';
}

export class Drag3DTool extends BaseTool {
  type = '3d-drag' as ToolType;
  cursor = 'move';
}

export class Slide3DTool extends BaseTool {
  type = '3d-slide' as ToolType;
  cursor = 'move';
}

export class Scale3DTool extends BaseTool {
  type = '3d-scale' as ToolType;
  cursor = 'move';
}

export class Orbit3DTool extends BaseTool {
  type = '3d-orbit' as ToolType;
  cursor = 'grab';
}

export default {
  CropTool,
  PerspectiveCropTool,
  SliceTool,
  SliceSelectTool,
  FrameTool,
  Rotate3DTool,
  Roll3DTool,
  Drag3DTool,
  Slide3DTool,
  Scale3DTool,
  Orbit3DTool,
};