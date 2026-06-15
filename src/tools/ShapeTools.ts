/**
 * Unified Canvas - Shape Tools
 * Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, Custom Shape
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, Color, VectorPath, ToolType, ToolOptions } from '../types';
import { VectorRenderer } from '../engine/VectorRenderer';
import { distance } from '../utils/math';

export class ShapeTool extends BaseTool {
  type = 'rectangle' as ToolType;
  cursor = 'crosshair';
  protected shapeType: 'rect' | 'rounded-rect' | 'ellipse' | 'polygon' | 'line' | 'custom' = 'rect';
  private startPoint: Point | null = null;
  private currentRect: { x: number; y: number; width: number; height: number } | null = null;
  private isDrawing = false;
  protected options: {
    radius?: number;
    sides?: number;
    starRatio?: number;
  } = {};

  onActivate(context: ToolContext) {
    this.options.radius = context.toolOptions.shapeCornerRadius;
    this.options.sides = context.toolOptions.shapeSides;
    this.options.starRatio = context.toolOptions.shapeStarRatio;
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.startPoint = point;
    this.currentRect = { x: point.x, y: point.y, width: 0, height: 0 };
    this.isDrawing = true;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || !this.startPoint) return;
    if (event.buttons === 0) return;
    
    const { shiftKey, altKey } = event;
    let x = point.x;
    let y = point.y;
    let width = x - this.startPoint.x;
    let height = y - this.startPoint.y;
    
    if (shiftKey) {
      // Constrain proportions
      if (this.shapeType === 'polygon' || this.shapeType === 'custom') {
        // For polygon, constrain to circle
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      } else if (this.shapeType === 'line') {
        // Constrain to 45° increments
        const angle = Math.atan2(height, width);
        const constrainedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.sqrt(width * width + height * height);
        width = Math.cos(constrainedAngle) * dist;
        height = Math.sin(constrainedAngle) * dist;
      } else {
        // Rectangle/ellipse: constrain to square/circle
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      }
    }
    
    if (altKey) {
      // Draw from center
      x = this.startPoint.x - width / 2;
      y = this.startPoint.y - height / 2;
    }
    
    this.currentRect = {
      x: Math.min(this.startPoint.x, this.startPoint.x + width),
      y: Math.min(this.startPoint.y, this.startPoint.y + height),
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || !this.currentRect) return;
    
    const { x, y, width, height } = this.currentRect;
    
    if (width < 2 || height < 2) {
      this.cancel();
      return;
    }
    
    const path = this.createShapePath(x, y, width, height);
    
    const vectorPath: VectorPath = {
      id: `path-${Date.now()}`,
      points: path,
      closed: this.shapeType !== 'line',
      fill: context.toolOptions.shapeFill,
      stroke: context.toolOptions.shapeStroke,
      strokeWidth: context.toolOptions.shapeStrokeWidth,
      strokeDash: context.toolOptions.shapeStrokeDash,
      strokeCap: context.toolOptions.shapeStrokeCap,
      strokeJoin: context.toolOptions.shapeStrokeJoin,
    };
    
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name: this.getShapeName(),
      type: 'vector',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { vectorPaths: [vectorPath] },
    };
    
    context.addLayer(layer);
    context.pushHistory();
    this.cancel();
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.isDrawing) {
      this.cancel();
    }
  }

  private cancel() {
    this.startPoint = null;
    this.currentRect = null;
    this.isDrawing = false;
  }

  protected createShapePath(x: number, y: number, width: number, height: number): Point[] {
    switch (this.shapeType) {
      case 'rect':
        return [
          { x, y, type: 'corner' },
          { x: x + width, y, type: 'corner' },
          { x: x + width, y: y + height, type: 'corner' },
          { x, y: y + height, type: 'corner' },
        ];
      case 'rounded-rect': {
        const r = Math.min(this.options.radius || 10, width / 2, height / 2);
        const kw = 0.552; // Kappa for cubic bezier approximation
        
        return [
          { x: x + r, y, type: 'smooth', handleOut: { x: x + r * kw, y } },
          { x: x + width - r, y, type: 'smooth', handleIn: { x: x + width - r * kw, y } },
          { x: x + width, y: r, type: 'smooth', handleOut: { x: x + width, y: r * kw } },
          { x: x + width, y: y + height - r, type: 'smooth', handleIn: { x: x + width, y: y + height - r * kw } },
          { x: x + width - r, y: y + height, type: 'smooth', handleOut: { x: x + width - r * kw, y: y + height } },
          { x: x + r, y: y + height, type: 'smooth', handleIn: { x: x + r * kw, y: y + height } },
          { x, y: y + height - r, type: 'smooth', handleOut: { x, y: y + height - r * kw } },
          { x, y: r, type: 'smooth', handleIn: { x, y: r * kw } },
        ];
      }
      case 'ellipse': {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = width / 2;
        const ry = height / 2;
        const kw = 0.552;
        
        return [
          { x: cx + rx, y: cy, type: 'smooth', handleIn: { x: cx + rx, y: cy - ry * kw }, handleOut: { x: cx + rx, y: cy + ry * kw } },
          { x: cx, y: cy + ry, type: 'smooth', handleIn: { x: cx + rx * kw, y: cy + ry }, handleOut: { x: cx - rx * kw, y: cy + ry } },
          { x: cx - rx, y: cy, type: 'smooth', handleIn: { x: cx - rx, y: cy + ry * kw }, handleOut: { x: cx - rx, y: cy - ry * kw } },
          { x: cx, y: cy - ry, type: 'smooth', handleIn: { x: cx - rx * kw, y: cy - ry }, handleOut: { x: cx + rx * kw, y: cy - ry } },
        ];
      }
      case 'polygon': {
        const sides = this.options.sides || 5;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = width / 2;
        const ry = height / 2;
        const starRatio = this.options.starRatio || 0;
        
        const points: Point[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const r = (i % 2 === 0 && starRatio > 0) ? rx * starRatio : rx;
          points.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * (ry / rx * r),
            type: 'corner',
          });
        }
        if (starRatio > 0) {
          // For stars, we need alternating inner/outer points
        }
        return points;
      }
      case 'line':
        return [
          { x, y, type: 'corner' },
          { x: x + width, y: y + height, type: 'corner' },
        ];
      default:
        return [];
    }
  }

  protected getShapeName(): string {
    switch (this.shapeType) {
      case 'rect': return 'Rectangle';
      case 'rounded-rect': return 'Rounded Rectangle';
      case 'ellipse': return 'Ellipse';
      case 'polygon': return 'Polygon';
      case 'line': return 'Line';
      case 'custom': return 'Custom Shape';
      default: return 'Shape';
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentRect) {
      const renderer = new VectorRenderer();
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      
      const path = this.createShapePath(
        this.currentRect.x,
        this.currentRect.y,
        this.currentRect.width,
        this.currentRect.height
      );
      
      renderer.renderPath(ctx, {
        points: path,
        closed: this.shapeType !== 'line',
      }, context.zoom);
      
      ctx.restore();
    }
  }
}

export class RectangleTool extends ShapeTool {
  type = 'rectangle' as ToolType;
  shapeType = 'rect';
}

export class RoundedRectangleTool extends ShapeTool {
  type = 'rounded-rectangle' as ToolType;
  shapeType = 'rounded-rect';
}

export class EllipseTool extends ShapeTool {
  type = 'ellipse' as ToolType;
  shapeType = 'ellipse';
}

export class PolygonTool extends ShapeTool {
  type = 'polygon' as ToolType;
  shapeType = 'polygon';
}

export class LineTool extends ShapeTool {
  type = 'line' as ToolType;
  shapeType = 'line';
}

export class CustomShapeTool extends ShapeTool {
  type = 'custom-shape' as ToolType;
  shapeType = 'custom';
  private customPath: Point[] = [];

  setCustomPath(path: Point[]) {
    this.customPath = path;
  }

  protected createShapePath(x: number, y: number, width: number, height: number): Point[] {
    if (this.customPath.length === 0) return [];
    
    // Scale custom path to fit bounds
    const bounds = this.getPathBounds(this.customPath);
    const scaleX = width / bounds.width;
    const scaleY = height / bounds.height;
    
    return this.customPath.map(p => ({
      x: x + (p.x - bounds.x) * scaleX,
      y: y + (p.y - bounds.y) * scaleY,
      type: p.type,
      handleIn: p.handleIn ? { x: x + (p.handleIn!.x - bounds.x) * scaleX, y: y + (p.handleIn!.y - bounds.y) * scaleY } : undefined,
      handleOut: p.handleOut ? { x: x + (p.handleOut!.x - bounds.x) * scaleX, y: y + (p.handleOut!.y - bounds.y) * scaleY } : undefined,
    }));
  }

  private getPathBounds(path: Point[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}

export default {
  ShapeTool,
  RectangleTool,
  RoundedRectangleTool,
  EllipseTool,
  PolygonTool,
  LineTool,
  CustomShapeTool,
};