/**
 * Unified Canvas - Vector Tools
 * Pen, Curvature Pen, Freeform Pen, Anchor Point Tools, Path Selection, Direct Selection
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, VectorPath, PathPoint, Selection, ToolType, ToolOptions } from '../types';
import { VectorRenderer } from '../engine/VectorRenderer';
import { HitTester } from '../engine/HitTester';
import { distance, pointOnLine, cubicBezierPoint, cubicBezierTangent } from '../utils/math';

export class PenTool extends BaseTool {
  type = 'pen' as ToolType;
  cursor = 'crosshair';
  private currentPath: PathPoint[] = [];
  private isDrawing = false;
  private previewPoint: Point | null = null;
  private rubberBand = false;

  onActivate(context: ToolContext) {
    this.rubberBand = context.toolOptions.penRubberBand;
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const { shiftKey, altKey } = event;
    
    if (!this.isDrawing) {
      // Start new path
      this.currentPath = [{ ...point, type: 'corner' }];
      this.isDrawing = true;
      this.previewPoint = point;
    } else {
      if (shiftKey) {
        // Constrain angle to 45° increments
        const lastPoint = this.currentPath[this.currentPath.length - 1];
        const angle = Math.atan2(point.y - lastPoint.y, point.x - lastPoint.x);
        const constrainedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = distance(lastPoint, point);
        point = {
          x: lastPoint.x + Math.cos(constrainedAngle) * dist,
          y: lastPoint.y + Math.sin(constrainedAngle) * dist,
        };
      }
      
      if (altKey) {
        // Convert last point to smooth and add new corner
        const lastIdx = this.currentPath.length - 1;
        if (lastIdx >= 0) {
          this.currentPath[lastIdx] = { ...this.currentPath[lastIdx], type: 'smooth' };
        }
      }
      
      // Add point
      this.currentPath.push({ ...point, type: altKey ? 'corner' : 'smooth' });
      this.previewPoint = point;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    this.previewPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    // Path continues until Esc or click on first point
  }

  onClick(point: Point, event: MouseEvent, context: ToolContext) {
    // Check if clicking on first point to close path
    if (this.isDrawing && this.currentPath.length > 2) {
      const firstPoint = this.currentPath[0];
      if (distance(point, firstPoint) < 10 / context.zoom) {
        this.finishPath(context, true);
      }
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.isDrawing) {
      this.cancelPath(context);
    }
  }

  private finishPath(context: ToolContext, closed: boolean) {
    if (this.currentPath.length < 2) {
      this.cancelPath(context);
      return;
    }
    
    if (closed) {
      this.currentPath.push({ ...this.currentPath[0] });
    }
    
    const path: VectorPath = {
      id: `path-${Date.now()}`,
      points: this.currentPath,
      closed,
      fill: context.toolOptions.shapeFill,
      stroke: context.toolOptions.shapeStroke,
      strokeWidth: context.toolOptions.shapeStrokeWidth,
    };
    
    // Create vector layer
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name: 'Pen Path',
      type: 'vector',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { vectorPaths: [path] },
    };
    
    context.addLayer(layer);
    context.pushHistory();
    
    this.currentPath = [];
    this.isDrawing = false;
    this.previewPoint = null;
  }

  private cancelPath(context: ToolContext) {
    this.currentPath = [];
    this.isDrawing = false;
    this.previewPoint = null;
    context.setSelection(null);
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentPath.length > 0) {
      const renderer = new VectorRenderer();
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      
      if (this.currentPath.length === 1) {
        // Draw point
        ctx.beginPath();
        ctx.arc(this.currentPath[0].x, this.currentPath[0].y, 4 / context.zoom, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Draw path
        renderer.renderPath(ctx, {
          points: this.currentPath,
          closed: false,
        }, context.zoom);
        
        // Draw rubber band preview
        if (this.rubberBand && this.previewPoint) {
          ctx.beginPath();
          const lastPoint = this.currentPath[this.currentPath.length - 1];
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(this.previewPoint.x, this.previewPoint.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}

// Curvature Pen Tool (auto-smooth curves)
export class CurvaturePenTool extends BaseTool {
  type = 'curvature-pen' as ToolType;
  cursor = 'crosshair';
  private currentPath: PathPoint[] = [];
  private isDrawing = false;
  private previewPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing) {
      this.currentPath = [{ ...point, type: 'corner' }];
      this.isDrawing = true;
    } else {
      this.currentPath.push({ ...point, type: 'smooth' });
      // Auto-adjust control points for curvature
      this.adjustCurvature();
    }
    this.previewPoint = point;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    this.previewPoint = point;
  }

  onClick(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDrawing && this.currentPath.length > 2) {
      const firstPoint = this.currentPath[0];
      if (distance(point, firstPoint) < 10 / context.zoom) {
        this.finishPath(context, true);
      }
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.isDrawing) {
      this.cancelPath(context);
    }
    if (event.key === 'Alt' || event.key === 'Option') {
      // Next point will be corner
    }
  }

  onKeyUp(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Alt' || event.key === 'Option') {
      // Back to smooth
    }
  }

  private adjustCurvature() {
    if (this.currentPath.length < 3) return;
    
    // Simple curvature adjustment: make middle point smooth with auto-handles
    const len = this.currentPath.length;
    const p1 = this.currentPath[len - 3];
    const p2 = this.currentPath[len - 2];
    const p3 = this.currentPath[len - 1];
    
    // Calculate auto handles for p2
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;
    
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (len1 > 0 && len2 > 0) {
      const tension = 0.33;
      p2.handleOut = {
        x: p2.x + (dx2 / len2 - dx1 / len1) * tension * Math.min(len1, len2),
        y: p2.y + (dy2 / len2 - dy1 / len1) * tension * Math.min(len1, len2),
      };
      p2.handleIn = {
        x: p2.x - (dx2 / len2 - dx1 / len1) * tension * Math.min(len1, len2),
        y: p2.y - (dy2 / len2 - dy1 / len1) * tension * Math.min(len1, len2),
      };
    }
  }

  private finishPath(context: ToolContext, closed: boolean) {
    if (this.currentPath.length < 2) {
      this.cancelPath(context);
      return;
    }
    
    if (closed) {
      this.currentPath.push({ ...this.currentPath[0] });
    }
    
    const path: VectorPath = {
      id: `path-${Date.now()}`,
      points: this.currentPath,
      closed,
      fill: context.toolOptions.shapeFill,
      stroke: context.toolOptions.shapeStroke,
      strokeWidth: context.toolOptions.shapeStrokeWidth,
    };
    
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name: 'Curvature Path',
      type: 'vector',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { vectorPaths: [path] },
    };
    
    context.addLayer(layer);
    context.pushHistory();
    
    this.currentPath = [];
    this.isDrawing = false;
    this.previewPoint = null;
  }

  private cancelPath(context: ToolContext) {
    this.currentPath = [];
    this.isDrawing = false;
    this.previewPoint = null;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.currentPath.length > 0) {
      const renderer = new VectorRenderer();
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      
      renderer.renderPath(ctx, {
        points: this.currentPath,
        closed: false,
      }, context.zoom);
      
      if (this.previewPoint) {
        ctx.beginPath();
        const lastPoint = this.currentPath[this.currentPath.length - 1];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(this.previewPoint.x, this.previewPoint.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// Freeform Pen Tool
export class FreeformPenTool extends BaseTool {
  type = 'freeform-pen' as ToolType;
  cursor = 'crosshair';
  private currentPath: PathPoint[] = [];
  private isDrawing = false;
  private points: Point[] = [];
  private lastPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.points = [point];
    this.lastPoint = point;
    this.isDrawing = true;
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing) return;
    if (event.buttons === 0) return;
    
    // Add point with minimum distance
    if (distance(this.lastPoint!, point) > 2) {
      this.points.push(point);
      this.lastPoint = point;
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDrawing || this.points.length < 3) {
      this.isDrawing = false;
      this.points = [];
      return;
    }
    
    // Fit curve to points
    this.currentPath = this.fitCurve(this.points);
    this.finishPath(context, false);
    this.isDrawing = false;
    this.points = [];
  }

  private fitCurve(points: Point[]): PathPoint[] {
    // Simplified: convert to smooth curve with auto handles
    const result: PathPoint[] = [];
    const tension = 0.3;
    
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const pt: PathPoint = { ...p, type: 'smooth' };
      
      if (i > 0 && i < points.length - 1) {
        const prev = points[i - 1];
        const next = points[i + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        pt.handleIn = { x: p.x - dx * tension, y: p.y - dy * tension };
        pt.handleOut = { x: p.x + dx * tension, y: p.y + dy * tension };
      }
      
      result.push(pt);
    }
    
    return result;
  }

  private finishPath(context: ToolContext, closed: boolean) {
    if (this.currentPath.length < 2) return;
    
    const path: VectorPath = {
      id: `path-${Date.now()}`,
      points: this.currentPath,
      closed,
      fill: context.toolOptions.shapeFill,
      stroke: context.toolOptions.shapeStroke,
      strokeWidth: context.toolOptions.shapeStrokeWidth,
    };
    
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name: 'Freeform Path',
      type: 'vector',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { vectorPaths: [path] },
    };
    
    context.addLayer(layer);
    context.pushHistory();
    
    this.currentPath = [];
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

// Add Anchor Point Tool
export class AddAnchorTool extends BaseTool {
  type = 'add-anchor' as ToolType;
  cursor = 'crosshair';
  private hitTester: HitTester;

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || layer.type !== 'vector' || !layer.data.vectorPaths) return;
    
    for (const path of layer.data.vectorPaths) {
      // Find closest segment
      const segment = this.findClosestSegment(path, point);
      if (segment) {
        const { index, t } = segment;
        const newPoint = this.splitSegment(path, index, t);
        
        path.points.splice(index + 1, 0, newPoint);
        context.updateLayer(layer.id, { data: { ...layer.data } });
        context.pushHistory();
        break;
      }
    }
  }

  private findClosestSegment(path: VectorPath, point: Point): { index: number; t: number } | null {
    let minDist = Infinity;
    let bestSegment: { index: number; t: number } | null = null;
    
    const points = path.points;
    for (let i = 0; i < points.length - (path.closed ? 0 : 1); i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      // For cubic bezier, check distance to curve
      if (p1.handleOut || p2.handleIn) {
        // Simplified: check distance to line
        const proj = pointOnLine(point, p1, p2);
        const dist = distance(point, proj);
        if (dist < minDist && proj.t >= 0 && proj.t <= 1) {
          minDist = dist;
          bestSegment = { index: i, t: proj.t };
        }
      } else {
        // Line segment
        const proj = pointOnLine(point, p1, p2);
        const dist = distance(point, proj);
        if (dist < minDist && proj.t >= 0 && proj.t <= 1) {
          minDist = dist;
          bestSegment = { index: i, t: proj.t };
        }
      }
    }
    
    return minDist < 10 ? bestSegment : null;
  }

  private splitSegment(path: VectorPath, index: number, t: number): PathPoint {
    const points = path.points;
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    
    if (p1.handleOut || p2.handleIn) {
      // Cubic bezier split (de Casteljau)
      const h1 = p1.handleOut || { x: p1.x, y: p1.y };
      const h2 = p2.handleIn || { x: p2.x, y: p2.y };
      
      // Split at t
      const q0 = { x: p1.x, y: p1.y };
      const q1 = { x: lerp(p1.x, h1.x, t), y: lerp(p1.y, h1.y, t) };
      const q2 = { x: lerp(h1.x, h2.x, t), y: lerp(h1.y, h2.y, t) };
      const q3 = { x: lerp(h2.x, p2.x, t), y: lerp(h2.y, p2.y, t) };
      
      const r0 = { x: lerp(q0.x, q1.x, t), y: lerp(q0.y, q1.y, t) };
      const r1 = { x: lerp(q1.x, q2.x, t), y: lerp(q1.y, q2.y, t) };
      const r2 = { x: lerp(q2.x, q3.x, t), y: lerp(q2.y, q3.y, t) };
      
      const s0 = { x: lerp(r0.x, r1.x, t), y: lerp(r0.y, r1.y, t) };
      const s1 = { x: lerp(r1.x, r2.x, t), y: lerp(r1.y, r2.y, t) };
      
      const newPoint = { x: lerp(s0.x, s1.x, t), y: lerp(s0.y, s1.y, t), type: 'smooth' };
      newPoint.handleIn = { x: s0.x, y: s0.y };
      newPoint.handleOut = { x: s1.x, y: s1.y };
      
      // Update original handles
      p1.handleOut = { x: q1.x, y: q1.y };
      p2.handleIn = { x: r2.x, y: r2.y };
      
      return newPoint;
    } else {
      // Line split
      return {
        x: lerp(p1.x, p2.x, t),
        y: lerp(p1.y, p2.y, t),
        type: 'corner',
      };
    }
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    // Highlight segment under cursor
  }
}

// Delete Anchor Point Tool
export class DeleteAnchorTool extends BaseTool {
  type = 'delete-anchor' as ToolType;
  cursor = 'crosshair';
  private hitTester: HitTester;

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || layer.type !== 'vector' || !layer.data.vectorPaths) return;
    
    for (const path of layer.data.vectorPaths) {
      // Find closest point
      let minDist = Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < path.points.length; i++) {
        const dist = distance(point, path.points[i]);
        if (dist < minDist && dist < 10 / context.zoom) {
          minDist = dist;
          bestIndex = i;
        }
      }
      
      if (bestIndex >= 0 && path.points.length > 2) {
        path.points.splice(bestIndex, 1);
        context.updateLayer(layer.id, { data: { ...layer.data } });
        context.pushHistory();
        break;
      }
    }
  }
}

// Convert Anchor Point Tool
export class ConvertAnchorTool extends BaseTool {
  type = 'convert-anchor' as ToolType;
  cursor = 'crosshair';
  private hitTester: HitTester;

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const layer = this.getActiveLayer(context);
    if (!layer || layer.type !== 'vector' || !layer.data.vectorPaths) return;
    
    for (const path of layer.data.vectorPaths) {
      // Find closest point
      let minDist = Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < path.points.length; i++) {
        const dist = distance(point, path.points[i]);
        if (dist < minDist && dist < 10 / context.zoom) {
          minDist = dist;
          bestIndex = i;
        }
      }
      
      if (bestIndex >= 0) {
        const pt = path.points[bestIndex];
        if (pt.type === 'corner') {
          pt.type = 'smooth';
          // Add default handles
          const prev = path.points[(bestIndex - 1 + path.points.length) % path.points.length];
          const next = path.points[(bestIndex + 1) % path.points.length];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          pt.handleIn = { x: pt.x - dx * 0.33, y: pt.y - dy * 0.33 };
          pt.handleOut = { x: pt.x + dx * 0.33, y: pt.y + dy * 0.33 };
        } else {
          pt.type = 'corner';
          pt.handleIn = undefined;
          pt.handleOut = undefined;
        }
        
        context.updateLayer(layer.id, { data: { ...layer.data } });
        context.pushHistory();
        break;
      }
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Could drag handles here
  }
}

// Path Selection Tool (Path Component Selection)
export class PathSelectTool extends BaseTool {
  type = 'path-select' as ToolType;
  cursor = 'default';
  private hitTester: HitTester;

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const { shiftKey } = event;
    const hit = this.hitTester.hitTest(point, context.layers, context.activeLayerId);
    
    if (hit && hit.type === 'vector') {
      if (shiftKey) {
        // Add to selection
      } else {
        // Select path
        context.setSelection({
          type: 'path',
          pathId: hit.id,
          bounds: hit.bounds,
          path: hit.path,
        });
      }
    } else {
      // Start marquee selection of paths
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Hover preview
  }
}

// Direct Selection Tool (Anchor Point Selection)
export class DirectSelectTool extends BaseTool {
  type = 'direct-select' as ToolType;
  cursor = 'crosshair';
  private hitTester: HitTester;
  private selectedAnchor: { layerId: string; pathId: string; index: number } | null = null;
  private dragStart: Point | null = null;
  private isDragging = false;

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const hit = this.hitTester.hitTestAnchor(point, context.layers);
    
    if (hit) {
      this.selectedAnchor = hit;
      this.dragStart = point;
      this.isDragging = true;
    } else {
      this.selectedAnchor = null;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDragging || !this.dragStart || !this.selectedAnchor) return;
    
    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;
    
    // Update anchor position
    const layer = context.layers.find(l => l.id === this.selectedAnchor!.layerId);
    if (layer && layer.data.vectorPaths) {
      const path = layer.data.vectorPaths.find(p => p.id === this.selectedAnchor!.pathId);
      if (path && path.points[this.selectedAnchor!.index]) {
        path.points[this.selectedAnchor!.index].x += dx;
        path.points[this.selectedAnchor!.index].y += dy;
        
        // Also move handles if smooth
        const pt = path.points[this.selectedAnchor!.index];
        if (pt.handleIn) {
          pt.handleIn.x += dx;
          pt.handleIn.y += dy;
        }
        if (pt.handleOut) {
          pt.handleOut.x += dx;
          pt.handleOut.y += dy;
        }
        
        context.updateLayer(layer.id, { data: { ...layer.data } });
      }
    }
    
    this.dragStart = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDragging) {
      context.pushHistory();
    }
    this.isDragging = false;
    this.dragStart = null;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    // Draw selected anchor highlights
  }
}

export default {
  PenTool,
  CurvaturePenTool,
  FreeformPenTool,
  AddAnchorTool,
  DeleteAnchorTool,
  ConvertAnchorTool,
  PathSelectTool,
  DirectSelectTool,
};