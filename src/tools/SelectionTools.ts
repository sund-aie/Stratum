/**
 * Unified Canvas - Selection Tools
 * Marquee, Lasso, Magic Wand, Object Selection
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Rect, Selection, Layer, LayerType, ToolType, ToolOptions } from '../types';
import { pointInRect, pointInPolygon, polygonArea, polygonCentroid } from '../utils/math';
import { RasterOps } from '../engine/RasterOps';
import { HitTester } from '../engine/HitTester';

// Marquee Tools
export class MarqueeRectTool extends BaseTool {
  type = 'marquee-rect' as ToolType;
  cursor = 'crosshair';
  private startPoint: Point | null = null;
  private currentRect: Rect | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.startPoint = point;
    this.currentRect = { x: point.x, y: point.y, width: 0, height: 0 };
    
    const { shiftKey, altKey } = event;
    const toolOptions = context.toolOptions;
    const style = toolOptions.marqueeStyle;
    
    if (style === 'fixed-ratio') {
      const ratio = toolOptions.marqueeWidth / toolOptions.marqueeHeight;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.startPoint) return;
    
    const { shiftKey, altKey } = event;
    let x = point.x;
    let y = point.y;
    let width = x - this.startPoint.x;
    let height = y - this.startPoint.y;
    
    if (shiftKey) {
      // Constrain to square
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = width >= 0 ? size : -size;
      height = height >= 0 ? size : -size;
    }
    
    if (altKey) {
      // Draw from center
      x = this.startPoint.x - width / 2;
      y = this.startPoint.y - height / 2;
      width = width;
      height = height;
    }
    
    if (event.buttons === 0) return;
    
    this.currentRect = {
      x: Math.min(this.startPoint.x, this.startPoint.x + width),
      y: Math.min(this.startPoint.y, this.startPoint.y + height),
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.startPoint || !this.currentRect) return;
    
    const { width, height, x, y } = this.currentRect;
    
    if (width < 1 || height < 1) {
      context.setSelection(null);
    } else {
      const selection: Selection = {
        type: 'marquee',
        bounds: { x, y, width, height },
        path: [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ],
        feather: context.toolOptions.marqueeFeather,
        antiAlias: true,
      };
      context.setSelection(selection);
    }
    
    this.startPoint = null;
    this.currentRect = null;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentRect) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.strokeRect(
        this.currentRect.x,
        this.currentRect.y,
        this.currentRect.width,
        this.currentRect.height
      );
      ctx.restore();
    }
  }
}

// Elliptical Marquee
export class MarqueeEllipseTool extends BaseTool {
  type = 'marquee-ellipse' as ToolType;
  cursor = 'crosshair';
  private startPoint: Point | null = null;
  private currentRect: Rect | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.startPoint = point;
    this.currentRect = { x: point.x, y: point.y, width: 0, height: 0 };
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.startPoint) return;
    
    const { shiftKey, altKey } = event;
    let x = point.x;
    let y = point.y;
    let width = x - this.startPoint.x;
    let height = y - this.startPoint.y;
    
    if (shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = width >= 0 ? size : -size;
      height = height >= 0 ? size : -size;
    }
    
    if (altKey) {
      x = this.startPoint.x - width / 2;
      y = this.startPoint.y - height / 2;
    }
    
    if (event.buttons === 0) return;
    
    this.currentRect = {
      x: Math.min(this.startPoint.x, this.startPoint.x + width),
      y: Math.min(this.startPoint.y, this.startPoint.y + height),
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.startPoint || !this.currentRect) return;
    
    const { width, height, x, y } = this.currentRect;
    
    if (width < 1 || height < 1) {
      context.setSelection(null);
    } else {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      
      const path: Point[] = [];
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        path.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
      }
      
      const selection: Selection = {
        type: 'marquee',
        bounds: { x, y, width, height },
        path,
        feather: context.toolOptions.marqueeFeather,
        antiAlias: true,
      };
      context.setSelection(selection);
    }
    
    this.startPoint = null;
    this.currentRect = null;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentRect) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      const cx = this.currentRect.x + this.currentRect.width / 2;
      const cy = this.currentRect.y + this.currentRect.height / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, this.currentRect.width / 2, this.currentRect.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Lasso Tool
export class LassoTool extends BaseTool {
  type = 'lasso' as ToolType;
  cursor = 'crosshair';
  private points: Point[] = [];
  private isDrawing = false;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.points = [point];
    this.isDrawing = true;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing) return;
    if (event.buttons === 0) return;
    this.points.push(point);
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || this.points.length < 3) {
      this.isDrawing = false;
      this.points = [];
      context.setSelection(null);
      return;
    }
    
    // Close the path
    this.points.push({ ...this.points[0] });
    
    const bounds = this.getBounds(this.points);
    const selection: Selection = {
      type: 'lasso',
      bounds,
      path: this.points,
      feather: context.toolOptions.lassoFeather,
      antiAlias: context.toolOptions.lassoAntiAlias,
    };
    context.setSelection(selection);
    
    this.isDrawing = false;
    this.points = [];
  }

  private getBounds(points: Point[]): Rect {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.points.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Polygonal Lasso
export class PolygonalLassoTool extends BaseTool {
  type = 'lasso-polygon' as ToolType;
  cursor = 'crosshair';
  private points: Point[] = [];
  private isDrawing = false;
  private previewPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing) {
      this.points = [point];
      this.isDrawing = true;
    } else {
      // Check if clicking near start point to close
      const start = this.points[0];
      const dist = Math.hypot(point.x - start.x, point.y - start.y);
      if (dist < 10 && this.points.length >= 3) {
        this.finishSelection(context);
        return;
      }
      this.points.push(point);
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    this.previewPoint = point;
  }

  onDoubleClick(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.points.length >= 3) {
      this.finishSelection(context);
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.isDrawing) {
      this.points = [];
      this.isDrawing = false;
      context.setSelection(null);
    }
  }

  private finishSelection(context: ToolContext) {
    if (this.points.length < 3) {
      this.isDrawing = false;
      this.points = [];
      context.setSelection(null);
      return;
    }
    
    this.points.push({ ...this.points[0] });
    const bounds = this.getBounds(this.points);
    
    const selection: Selection = {
      type: 'lasso',
      bounds,
      path: this.points,
      feather: context.toolOptions.lassoFeather,
      antiAlias: context.toolOptions.lassoAntiAlias,
    };
    context.setSelection(selection);
    
    this.isDrawing = false;
    this.points = [];
    this.previewPoint = null;
  }

  private getBounds(points: Point[]): Rect {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.points.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      if (this.previewPoint) {
        ctx.lineTo(this.previewPoint.x, this.previewPoint.y);
      }
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = '#fff';
      for (const p of this.points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / context.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// Magic Wand Tool
export class MagicWandTool extends BaseTool {
  type = 'magic-wand' as ToolType;
  cursor = 'crosshair';

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || layer.type !== 'raster') return;
    
    const rasterOps = new RasterOps();
    const tolerance = context.toolOptions.magicWandTolerance;
    const contiguous = context.toolOptions.magicWandContiguous;
    
    // Sample color at point
    const imageData = layer.data.imageData;
    if (!imageData) return;
    
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return;
    
    const idx = (y * imageData.width + x) * 4;
    const targetColor = {
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
      a: imageData.data[idx + 3] / 255,
    };
    
    if (targetColor.a === 0) return;
    
    // Flood fill
    const selectionMask = rasterOps.floodFill(imageData, x, y, targetColor, tolerance, contiguous);
    const path = rasterOps.maskToPath(selectionMask);
    
    if (path.length > 2) {
      const bounds = this.getBounds(path);
      const selection: Selection = {
        type: 'magic-wand',
        bounds,
        path,
        feather: 0,
        antiAlias: true,
      };
      context.setSelection(selection);
    }
  }

  private getBounds(points: Point[]): Rect {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}

// Move Tool
export class MoveTool extends BaseTool {
  type = 'move' as ToolType;
  cursor = 'move';
  private isDragging = false;
  private dragStart: Point | null = null;
  private draggedLayerId: string | null = null;
  private initialLayerPos: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    // Check if clicking on a layer
    const hitTester = new HitTester();
    const hitLayer = hitTester.hitTest(point, context.layers, context.activeLayerId);
    
    if (hitLayer) {
      this.draggedLayerId = hitLayer.id;
      this.dragStart = point;
      this.initialLayerPos = { x: hitLayer.transform.x, y: hitLayer.transform.y };
      this.isDragging = true;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDragging || !this.draggedLayerId || !this.dragStart || !this.initialLayerPos) return;
    
    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;
    
    context.updateLayer(this.draggedLayerId, {
      transform: {
        x: this.initialLayerPos.x + dx,
        y: this.initialLayerPos.y + dy,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    });
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDragging) {
      context.pushHistory();
    }
    this.isDragging = false;
    this.dragStart = null;
    this.draggedLayerId = null;
    this.initialLayerPos = null;
  }
}

export default {
  MarqueeRectTool,
  MarqueeEllipseTool,
  LassoTool,
  PolygonalLassoTool,
  MagicWandTool,
  MoveTool,
};