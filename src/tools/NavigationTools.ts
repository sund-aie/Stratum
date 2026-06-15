/**
 * Unified Canvas - Navigation Tools
 * Hand, Zoom, Rotate View
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, ToolType, ToolOptions } from '../types';

export class HandTool extends BaseTool {
  type = 'hand' as ToolType;
  cursor = 'grab';
  private isPanning = false;
  private lastPoint: Point | null = null;
  private spaceKeyHeld = false;

  onActivate(context: ToolContext) {
    // Enable space key for temporary hand tool
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (event.button === 0 || event.button === 1) { // Left or middle click
      this.isPanning = true;
      this.lastPoint = point;
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isPanning || !this.lastPoint) return;
    
    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    
    // Update pan in context (would need to be exposed)
    // For now, this is a placeholder - the actual pan is handled by CanvasViewport
    this.lastPoint = point;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    this.isPanning = false;
    this.lastPoint = null;
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.code === 'Space') {
      this.spaceKeyHeld = true;
      // Temporary hand tool
    }
  }

  onKeyUp(event: KeyboardEvent, context: ToolContext) {
    if (event.code === 'Space') {
      this.spaceKeyHeld = false;
    }
  }

  onWheel(delta: Point, event: WheelEvent, context: ToolContext) {
    // Zoom with mouse wheel while hand tool active
    if (event.altKey) {
      const factor = delta.y > 0 ? 0.9 : 1.1;
      // Trigger zoom
    }
  }
}

export class ZoomTool extends BaseTool {
  type = 'zoom' as ToolType;
  cursor = 'zoom-in';
  private isZooming = false;
  private startPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.startPoint = point;
    this.isZooming = true;
    
    if (event.altKey) {
      // Zoom out
      context.setToolOptions({ zoomAction: 'out' });
    } else if (event.ctrlKey || event.metaKey) {
      // Zoom to fit / 100%
    } else {
      // Zoom in
      context.setToolOptions({ zoomAction: 'in' });
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isZooming || !this.startPoint) return;
    
    // Could do marquee zoom
    if (event.shiftKey) {
      // Draw marquee for zoom to area
    }
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isZooming && this.startPoint) {
      const dx = point.x - this.startPoint.x;
      const dy = point.y - this.startPoint.y;
      
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        // Marquee zoom
        context.setToolOptions({ 
          zoomAction: 'marquee',
          zoomRect: {
            x: Math.min(this.startPoint.x, point.x),
            y: Math.min(this.startPoint.y, point.y),
            width: Math.abs(dx),
            height: Math.abs(dy),
          }
        });
      }
    }
    this.isZooming = false;
    this.startPoint = null;
  }

  onWheel(delta: Point, event: WheelEvent, context: ToolContext) {
    const factor = delta.y > 0 ? 0.9 : 1.1;
    context.setToolOptions({ 
      zoomAction: 'wheel',
      zoomFactor: factor,
      zoomCenter: { x: event.clientX, y: event.clientY }
    });
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === '0') {
      // 100% zoom
      context.setToolOptions({ zoomAction: '100%' });
    } else if (event.key === '1') {
      // Actual size (1:1)
      context.setToolOptions({ zoomAction: 'actual' });
    }
  }
}

export class RotateViewTool extends BaseTool {
  type = 'rotate-view' as ToolType;
  cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><path fill=\'white\' d=\'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v-3l4-4-4-4v3z\'/></svg>") 12 12, auto';
  private isRotating = false;
  private startAngle = 0;
  private centerPoint: Point | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    this.isRotating = true;
    this.centerPoint = { 
      x: context.pan.x + context.canvas.width / 2 / context.zoom, 
      y: context.pan.y + context.canvas.height / 2 / context.zoom 
    };
    this.startAngle = Math.atan2(point.y - this.centerPoint.y, point.x - this.centerPoint.x);
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    if (!this.isRotating || !this.centerPoint) return;
    
    const currentAngle = Math.atan2(point.y - this.centerPoint.y, point.x - this.centerPoint.x);
    const delta = currentAngle - this.startAngle;
    
    context.setToolOptions({ 
      viewRotation: context.toolOptions.viewRotation + delta 
    });
    
    this.startAngle = currentAngle;
  }

  onMouseUp(point: Point, event: MouseEvent, context: ToolContext) {
    this.isRotating = false;
    this.centerPoint = null;
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (event.key === 'Escape') {
      // Reset view rotation
      context.setToolOptions({ viewRotation: 0 });
    }
  }
}

// Navigator (bird's eye view) - not a tool but a panel
export class NavigatorPanel {
  // Would be a separate UI component
}

export default {
  HandTool,
  ZoomTool,
  RotateViewTool,
  NavigatorPanel,
};