/**
 * Unified Canvas - Transform Tools
 * Free Transform, Perspective, Warp, Puppet Warp, Content-Aware Scale
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, ToolType, ToolOptions } from '../types';
import { HitTester } from '../engine/HitTester';
import { distance, pointInPolygon, applyMatrixToPoint, invertMatrix, composeMatrix } from '../utils/math';

export class TransformTool extends BaseTool {
  type = 'free-transform' as ToolType;
  cursor = 'move';
  private hitTester: HitTester;
  private selectedLayer: Layer | null = null;
  private dragHandle: string | null = null;
  private dragStart: Point | null = null;
  private initialTransform: Layer['transform'] | null = null;
  private initialBounds: { x: number; y: number; width: number; height: number } | null = null;
  private isDragging = false;
  private mode: 'transform' | 'perspective' | 'warp' | 'puppet' = 'transform';
  private warpGrid: { points: Point[]; cols: number; rows: number } | null = null;
  private puppetPins: Point[] = [];

  constructor() {
    super();
    this.hitTester = new HitTester();
  }

  onActivate(context: ToolContext) {
    this.mode = context.toolOptions.transformMode || 'transform';
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    const hit = this.hitTester.hitTestTransformHandle(point, context.layers, context.activeLayerId);
    
    if (hit) {
      this.selectedLayer = hit.layer;
      this.dragHandle = hit.handle;
      this.dragStart = point;
      this.initialTransform = { ...hit.layer.transform };
      this.initialBounds = hit.bounds;
      this.isDragging = true;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isDragging || !this.selectedLayer || !this.dragStart || !this.initialTransform || !this.initialBounds) return;
    
    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;
    const { shiftKey, altKey, ctrlKey, metaKey } = event;
    
    let newTransform = { ...this.initialTransform };
    
    switch (this.dragHandle) {
      case 'move':
        newTransform.x = this.initialTransform.x + dx;
        newTransform.y = this.initialTransform.y + dy;
        break;
        
      case 'nw':
      case 'n':
      case 'ne':
      case 'e':
      case 'se':
      case 's':
      case 'sw':
      case 'w':
        this.applyResizeHandle(newTransform, this.initialBounds!, this.dragHandle, dx, dy, shiftKey, altKey);
        break;
        
      case 'rotate':
        this.applyRotation(newTransform, this.initialBounds!, dx, dy, shiftKey);
        break;
    }
    
    if (this.mode === 'perspective' || this.mode === 'warp') {
      // Apply perspective/warp distortion
      this.applyPerspectiveWarp(this.selectedLayer, point, event);
    }
    
    context.updateLayer(this.selectedLayer.id, { transform: newTransform });
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDragging) {
      context.pushHistory();
    }
    this.isDragging = false;
    this.dragHandle = null;
    this.dragStart = null;
    this.selectedLayer = null;
    this.initialTransform = null;
    this.initialBounds = null;
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape' && this.selectedLayer) {
      // Cancel transform
      if (this.initialTransform && this.initialBounds) {
        context.updateLayer(this.selectedLayer.id, { transform: this.initialTransform });
      }
      this.isDragging = false;
      this.selectedLayer = null;
    }
  }

  private applyResizeHandle(
    transform: Layer['transform'],
    bounds: { x: number; y: number; width: number; height: number },
    handle: string,
    dx: number,
    dy: number,
    shiftKey: boolean,
    altKey: boolean
  ) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    
    let newX = bounds.x;
    let newY = bounds.y;
    let newW = bounds.width;
    let newH = bounds.height;
    
    switch (handle) {
      case 'nw':
        newX = bounds.x + dx;
        newY = bounds.y + dy;
        newW = bounds.width - dx;
        newH = bounds.height - dy;
        break;
      case 'n':
        newY = bounds.y + dy;
        newH = bounds.height - dy;
        break;
      case 'ne':
        newY = bounds.y + dy;
        newW = bounds.width + dx;
        newH = bounds.height - dy;
        break;
      case 'e':
        newW = bounds.width + dx;
        break;
      case 'se':
        newW = bounds.width + dx;
        newH = bounds.height + dy;
        break;
      case 's':
        newH = bounds.height + dy;
        break;
      case 'sw':
        newX = bounds.x + dx;
        newW = bounds.width - dx;
        newH = bounds.height + dy;
        break;
      case 'w':
        newX = bounds.x + dx;
        newW = bounds.width - dx;
        break;
    }
    
    // Constrain proportions if shift
    if (shiftKey && handle.length === 2) {
      const aspect = bounds.width / bounds.height;
      const newAspect = newW / newH;
      if (newAspect > aspect) {
        newH = newW / aspect;
      } else {
        newW = newH * aspect;
      }
    }
    
    // From center if alt
    if (altKey && handle.length === 2) {
      const dw = newW - bounds.width;
      const dh = newH - bounds.height;
      newX = bounds.x - dw / 2;
      newY = bounds.y - dh / 2;
      newW = bounds.width + dw;
      newH = bounds.height + dh;
    }
    
    transform.x = newX + newW / 2 - cx;
    transform.y = newY + newH / 2 - cy;
    transform.scaleX = newW / bounds.width;
    transform.scaleY = newH / bounds.height;
  }

  private applyRotation(
    transform: Layer['transform'],
    bounds: { x: number; y: number; width: number; height: number },
    dx: number,
    dy: number,
    shiftKey: boolean
  ) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    
    const angle = Math.atan2(dy, dx);
    let rotation = this.initialTransform!.rotation + angle;
    
    if (shiftKey) {
      // Snap to 15° increments
      rotation = Math.round(rotation / (Math.PI / 12)) * (Math.PI / 12);
    }
    
    transform.rotation = rotation;
    transform.x = this.initialTransform!.x;
    transform.y = this.initialTransform!.y;
  }

  private applyPerspectiveWarp(layer: Layer, point: Point, event: MouseEvent) {
    // Would implement perspective/warp matrix manipulation
    // Simplified: just update transform for now
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (!this.selectedLayer || !this.initialBounds) return;
    
    const bounds = this.initialBounds;
    const transform = this.selectedLayer.transform;
    
    ctx.save();
    ctx.strokeStyle = '#007acc';
    ctx.lineWidth = 1 / context.zoom;
    ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
    
    // Calculate transformed corners
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
    ].map(p => applyMatrixToPoint(p, this.getTransformMatrix(transform, bounds)));
    
    // Draw bounding box
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Draw handles
    ctx.fillStyle = '#007acc';
    for (const corner of corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 6 / context.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Rotation handle
    const topCenter = {
      x: (corners[0].x + corners[1].x) / 2,
      y: (corners[0].y + corners[1].y) / 2 - 20 / context.zoom,
    };
    ctx.beginPath();
    ctx.arc(topCenter.x, topCenter.y, 6 / context.zoom, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private getTransformMatrix(transform: Layer['transform'], bounds: { x: number; y: number; width: number; height: number }) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    
    return composeMatrix({
      translateX: transform.x,
      translateY: transform.y,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      rotation: transform.rotation,
      originX: cx,
      originY: cy,
    });
  }
}

// Perspective Transform Tool
export class PerspectiveTransformTool extends TransformTool {
  type = 'perspective-transform' as ToolType;
  
  onActivate(context: ToolContext) {
    this.mode = 'perspective';
  }
}

// Warp Transform Tool
export class WarpTransformTool extends TransformTool {
  type = 'warp-transform' as ToolType;
  private warpHandles: Point[] = [];
  
  onActivate(context: ToolContext) {
    this.mode = 'warp';
    this.initializeWarpGrid(context);
  }
  
  private initializeWarpGrid(context: ToolContext) {
    if (!this.selectedLayer) return;
    // Create 3x3 grid for warp
  }
  
  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    // Check warp grid handles
  }
  
  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Drag warp handles
  }
}

// Puppet Warp Tool
export class PuppetWarpTool extends TransformTool {
  type = 'puppet-warp' as ToolType;
  cursor = 'crosshair';
  
  onActivate(context: ToolContext) {
    this.mode = 'puppet';
  }
  
  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    // Add pin
    this.puppetPins.push(point);
  }
  
  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Move selected pin
  }
}

// Content-Aware Scale Tool
export class ContentAwareScaleTool extends TransformTool {
  type = 'content-aware-scale' as ToolType;
  
  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    super.onMouseDown(point, event, context);
    if (this.isDragging) {
      this.initializeContentAwareScale(context);
    }
  }
  
  private initializeContentAwareScale(context: ToolContext) {
    // Analyze image for content-aware scaling
    // Protect skin tones, faces, etc.
  }
  
  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isDragging) {
      this.applyContentAwareScale(context);
    }
  }
  
  private applyContentAwareScale(context: ToolContext) {
    // Apply seam carving / content-aware scaling algorithm
  }
}

export default {
  TransformTool,
  PerspectiveTransformTool,
  WarpTransformTool,
  PuppetWarpTool,
  ContentAwareScaleTool,
};