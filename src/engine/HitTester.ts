/**
 * Unified Canvas - Hit Testing Engine
 * Handles layer hit-testing for selection, clicks, and hover
 */

import type { Layer, Point, Rect, LayerType, PathPoint } from '../types';
import { pointInRect, pointInPolygon, getPathBounds } from '../utils/math';

export interface HitTestResult {
  layerId: string | null;
  layer: Layer | null;
  hitType: 'bounds' | 'content' | 'handle' | 'guide' | 'none';
  handleType?: 'tl' | 'tr' | 'bl' | 'br' | 'mt' | 'mb' | 'ml' | 'mr' | 'rotate';
  guideId?: string;
  guideOrientation?: 'horizontal' | 'vertical';
  distance?: number;
}

export class HitTester {
  private handleSize = 8;
  private guideTolerance = 5;

  hitTest(
    layers: Layer[],
    point: Point,
    options: {
      zoom: number;
      pan: Point;
      activeLayerId: string | null;
      showHandles: boolean;
      checkGuides?: boolean;
      guides?: any[];
    }
  ): HitTestResult {
    const { zoom, pan, activeLayerId, showHandles, checkGuides, guides } = options;

    // Transform point to canvas coordinates
    const canvasPoint = this.screenToCanvas(point, zoom, pan);

    // Check guides first (topmost priority)
    if (checkGuides && guides) {
      const guideHit = this.hitTestGuides(guides, canvasPoint, zoom);
      if (guideHit) return guideHit;
    }

    // Check layers from top to bottom
    const visibleLayers = [...layers].filter(l => l.visible).reverse();

    for (const layer of visibleLayers) {
      // Check handles if active layer
      if (showHandles && layer.id === activeLayerId) {
        const handleHit = this.hitTestHandles(layer, canvasPoint, zoom);
        if (handleHit) return handleHit;
      }

      // Check layer bounds
      if (this.hitTestBounds(layer, canvasPoint)) {
        // Check actual content for more precise hit testing
        const contentHit = this.hitTestContent(layer, canvasPoint);
        return {
          layerId: layer.id,
          layer,
          hitType: contentHit ? 'content' : 'bounds',
        };
      }
    }

    return { layerId: null, layer: null, hitType: 'none' };
  }

  hitTestMulti(
    layers: Layer[],
    rect: Rect,
    options: { zoom: number; pan: Point }
  ): Layer[] {
    const { zoom, pan } = options;
    const canvasRect = this.screenRectToCanvas(rect, zoom, pan);
    const hits: Layer[] = [];

    for (const layer of layers) {
      if (!layer.visible) continue;
      if (this.rectsIntersect(layer.bounds, canvasRect)) {
        hits.push(layer);
      }
    }

    return hits;
  }

  private screenToCanvas(point: Point, zoom: number, pan: Point): Point {
    return {
      x: (point.x - pan.x) / zoom,
      y: (point.y - pan.y) / zoom,
    };
  }

  private screenRectToCanvas(rect: Rect, zoom: number, pan: Point): Rect {
    return {
      x: (rect.x - pan.x) / zoom,
      y: (rect.y - pan.y) / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom,
    };
  }

  private hitTestBounds(layer: Layer, point: Point): boolean {
    return pointInRect(point, layer.bounds);
  }

  private hitTestContent(layer: Layer, point: Point): boolean {
    switch (layer.type) {
      case 'raster':
        return this.hitTestRaster(layer, point);
      case 'vector':
        return this.hitTestVector(layer, point);
      case 'text':
        return this.hitTestText(layer, point);
      default:
        return true; // Use bounds for other types
    }
  }

  private hitTestRaster(layer: Layer, point: Point): boolean {
    // Check alpha in layer's image data
    if (!layer.data.imageData && !layer.data.canvas) return false;

    let imageData = layer.data.imageData;
    if (!imageData && layer.data.canvas) {
      const ctx = layer.data.canvas.getContext('2d')!;
      imageData = ctx.getImageData(0, 0, layer.data.canvas.width, layer.data.canvas.height);
    }

    if (!imageData) return false;

    // Convert point to local coordinates
    const localX = Math.floor(point.x - layer.bounds.x);
    const localY = Math.floor(point.y - layer.bounds.y);

    if (localX < 0 || localX >= imageData.width || localY < 0 || localY >= imageData.height) {
      return false;
    }

    const index = (localY * imageData.width + localX) * 4 + 3; // Alpha channel
    return imageData.data[index] > 0;
  }

  private hitTestVector(layer: Layer, point: Point): boolean {
    if (!layer.data.paths) return false;

    for (const path of layer.data.paths) {
      if (this.pointInPath(path, point)) {
        return true;
      }
    }
    return false;
  }

  private pointInPath(path: any, point: Point): boolean {
    // Use winding number algorithm
    const points = path.points;
    if (points.length < 3) return false;

    let winding = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      if (p1.y <= point.y) {
        if (p2.y > point.y && this.isLeft(p1, p2, point) > 0) {
          winding++;
        }
      } else {
        if (p2.y <= point.y && this.isLeft(p1, p2, point) < 0) {
          winding--;
        }
      }
    }
    return winding !== 0;
  }

  private isLeft(p0: Point, p1: Point, p2: Point): number {
    return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
  }

  private hitTestText(layer: Layer, point: Point): boolean {
    const textData = layer.data.text;
    if (!textData) return false;

    // Simple bounds check for text (could be improved with actual glyph hit testing)
    return pointInRect(point, layer.bounds);
  }

  private hitTestHandles(layer: Layer, point: Point, zoom: number): HitTestResult | null {
    const handleSize = this.handleSize / zoom;
    const bounds = layer.bounds;
    const handles = this.getHandlePositions(bounds);

    for (const [handleType, handlePos] of Object.entries(handles)) {
      const handleRect = {
        x: handlePos.x - handleSize,
        y: handlePos.y - handleSize,
        width: handleSize * 2,
        height: handleSize * 2,
      };
      if (pointInRect(point, handleRect)) {
        return {
          layerId: layer.id,
          layer,
          hitType: 'handle',
          handleType: handleType as any,
        };
      }
    }

    // Check rotation handle
    const rotateHandle = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y - 30 / zoom,
    };
    const rotateRect = {
      x: rotateHandle.x - handleSize,
      y: rotateHandle.y - handleSize,
      width: handleSize * 2,
      height: handleSize * 2,
    };
    if (pointInRect(point, rotateRect)) {
      return {
        layerId: layer.id,
        layer,
        hitType: 'handle',
        handleType: 'rotate',
      };
    }

    return null;
  }

  private getHandlePositions(bounds: Rect): Record<string, Point> {
    return {
      tl: { x: bounds.x, y: bounds.y },
      tm: { x: bounds.x + bounds.width / 2, y: bounds.y },
      tr: { x: bounds.x + bounds.width, y: bounds.y },
      ml: { x: bounds.x, y: bounds.y + bounds.height / 2 },
      mr: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      bl: { x: bounds.x, y: bounds.y + bounds.height },
      bm: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    };
  }

  private hitTestGuides(guides: any[], point: Point, zoom: number): HitTestResult | null {
    const tolerance = this.guideTolerance / zoom;

    for (const guide of guides) {
      if (!guide.locked) continue;
      let distance = 0;

      if (guide.orientation === 'horizontal') {
        distance = Math.abs(point.y - guide.position);
        if (distance <= tolerance) {
          return {
            layerId: null,
            layer: null,
            hitType: 'guide',
            guideId: guide.id,
            guideOrientation: 'horizontal',
            distance,
          };
        }
      } else {
        distance = Math.abs(point.x - guide.position);
        if (distance <= tolerance) {
          return {
            layerId: null,
            layer: null,
            hitType: 'guide',
            guideId: guide.id,
            guideOrientation: 'vertical',
            distance,
          };
        }
      }
    }

    return null;
  }

  private rectsIntersect(a: Rect, b: Rect): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
}

export const hitTester = new HitTester();