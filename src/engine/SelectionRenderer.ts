/**
 * Unified Canvas - Selection Renderer
 * Renders selection outlines, marching ants, and feathered masks
 */

import type { Selection, Point, Rect, Color } from '../types';
import { getPathBounds } from '../utils/math';

export interface SelectionRenderOptions {
  zoom: number;
  pan: Point;
  canvasWidth: number;
  canvasHeight: number;
  marchingAntsOffset: number;
  showOverlay: boolean;
  overlayColor?: Color;
}

export class SelectionRenderer {
  private marchingAntsInterval: number | null = null;
  private currentOffset = 0;

  startMarchingAnts(callback: () => void, speed = 100): void {
    if (this.marchingAntsInterval) return;
    this.marchingAntsInterval = window.setInterval(() => {
      this.currentOffset = (this.currentOffset + 4) % 16;
      callback();
    }, speed);
  }

  stopMarchingAnts(): void {
    if (this.marchingAntsInterval) {
      clearInterval(this.marchingAntsInterval);
      this.marchingAntsInterval = null;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    selection: Selection,
    options: SelectionRenderOptions
  ): void {
    if (selection.type === 'none') return;

    ctx.save();
    ctx.setTransform(
      options.zoom, 0, 0, options.zoom,
      options.pan.x, options.pan.y
    );

    switch (selection.type) {
      case 'marquee':
        this.renderMarquee(ctx, selection, options);
        break;
      case 'lasso':
        this.renderLasso(ctx, selection, options);
        break;
      case 'magic-wand':
      case 'object':
        this.renderMask(ctx, selection, options);
        break;
    }

    if (options.showOverlay && selection.mask) {
      this.renderOverlay(ctx, selection, options);
    }

    ctx.restore();
  }

  private renderMarquee(
    ctx: CanvasRenderingContext2D,
    selection: Selection,
    options: SelectionRenderOptions
  ): void {
    if (!selection.bounds) return;

    const { x, y, width, height } = selection.bounds;
    const inset = 0.5; // Crisp edges

    // Draw marching ants
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -options.marchingAntsOffset;

    // Outer ants (black)
    ctx.strokeRect(x + inset, y + inset, width - 1, height - 1);

    // Inner ants (white) - offset by 4
    ctx.strokeStyle = '#fff';
    ctx.lineDashOffset = -options.marchingAntsOffset + 4;
    ctx.strokeRect(x + inset, y + inset, width - 1, height - 1);

    // Draw resize handles
    this.renderHandles(ctx, selection.bounds);
  }

  private renderLasso(
    ctx: CanvasRenderingContext2D,
    selection: Selection,
    options: SelectionRenderOptions
  ): void {
    if (!selection.path || selection.path.length < 2) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -options.marchingAntsOffset;

    ctx.beginPath();
    ctx.moveTo(selection.path[0].x, selection.path[0].y);
    for (let i = 1; i < selection.path.length; i++) {
      ctx.lineTo(selection.path[i].x, selection.path[i].y);
    }
    if (selection.path.length > 2) {
      ctx.closePath();
    }
    ctx.stroke();

    // White ants
    ctx.strokeStyle = '#fff';
    ctx.lineDashOffset = -options.marchingAntsOffset + 4;
    ctx.beginPath();
    ctx.moveTo(selection.path[0].x, selection.path[0].y);
    for (let i = 1; i < selection.path.length; i++) {
      ctx.lineTo(selection.path[i].x, selection.path[i].y);
    }
    if (selection.path.length > 2) {
      ctx.closePath();
    }
    ctx.stroke();
  }

  private renderMask(
    ctx: CanvasRenderingContext2D,
    selection: Selection,
    options: SelectionRenderOptions
  ): void {
    if (!selection.mask) return;

    // Create mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = selection.mask.width;
    maskCanvas.height = selection.mask.height;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.putImageData(selection.mask, 0, 0);

    // Draw mask outline by finding edges
    this.drawMaskOutline(ctx, maskCanvas, selection.bounds);
  }

  private drawMaskOutline(
    ctx: CanvasRenderingContext2D,
    maskCanvas: HTMLCanvasElement,
    bounds: Rect | undefined
  ): void {
    const maskCtx = maskCanvas.getContext('2d')!;
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    const width = maskCanvas.width;
    const height = maskCanvas.height;

    // Find edge pixels using marching squares algorithm
    const contours = this.marchingSquares(data, width, height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this.currentOffset;

    for (const contour of contours) {
      if (contour.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(contour[0].x, contour[0].y);
      for (let i = 1; i < contour.length; i++) {
        ctx.lineTo(contour[i].x, contour[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // White ants
    ctx.strokeStyle = '#fff';
    ctx.lineDashOffset = -this.currentOffset + 4;
    for (const contour of contours) {
      if (contour.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(contour[0].x, contour[0].y);
      for (let i = 1; i < contour.length; i++) {
        ctx.lineTo(contour[i].x, contour[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  private marchingSquares(data: Uint8ClampedArray, width: number, height: number): Point[][] {
    const contours: Point[][] = [];
    const visited = new Set<string>();

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // Get 2x2 cell values (alpha channel)
        const idx = (y * width + x) * 4 + 3;
        const v00 = data[idx] > 128 ? 1 : 0;
        const v10 = data[idx + 4] > 128 ? 1 : 0;
        const v01 = data[idx + width * 4] > 128 ? 1 : 0;
        const v11 = data[idx + width * 4 + 4] > 128 ? 1 : 0;

        const caseId = v00 * 8 + v10 * 4 + v01 * 2 + v11;
        if (caseId === 0 || caseId === 15) continue;

        const key = `${x},${y},${caseId}`;
        if (visited.has(key)) continue;

        const contour = this.traceContour(data, width, height, x, y, caseId, visited);
        if (contour.length > 2) {
          contours.push(contour);
        }
      }
    }

    return contours;
  }

  private traceContour(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    startCase: number,
    visited: Set<string>
  ): Point[] {
    const contour: Point[] = [];
    let x = startX;
    let y = startY;
    let caseId = startCase;

    const directions = [
      { dx: 1, dy: 0 }, // right
      { dx: 0, dy: 1 }, // down
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: -1 }, // up
    ];

    do {
      const key = `${x},${y},${caseId}`;
      visited.add(key);

      // Add vertex based on case
      const vertex = this.getVertexForCase(x, y, caseId);
      contour.push(vertex);

      // Determine next cell
      let nextDir = -1;
      switch (caseId) {
        case 1: case 5: case 13: nextDir = 2; break; // left
        case 2: case 6: case 14: nextDir = 3; break; // up
        case 3: case 7: case 11: nextDir = 0; break; // right
        case 4: case 8: case 12: nextDir = 1; break; // down
        case 9: nextDir = 0; break; // right (ambiguous)
        case 10: nextDir = 1; break; // down (ambiguous)
      }

      if (nextDir === -1) break;

      x += directions[nextDir].dx;
      y += directions[nextDir].dy;

      if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) break;

      // Get next case
      const idx = (y * width + x) * 4 + 3;
      const v00 = data[idx] > 128 ? 1 : 0;
      const v10 = data[idx + 4] > 128 ? 1 : 0;
      const v01 = data[idx + width * 4] > 128 ? 1 : 0;
      const v11 = data[idx + width * 4 + 4] > 128 ? 1 : 0;
      caseId = v00 * 8 + v10 * 4 + v01 * 2 + v11;

    } while (x !== startX || y !== startY || caseId !== startCase);

    return contour;
  }

  private getVertexForCase(x: number, y: number, caseId: number): Point {
    switch (caseId) {
      case 1: return { x: x + 0.5, y: y + 1 };
      case 2: return { x: x, y: y + 0.5 };
      case 3: return { x: x, y: y + 0.5 };
      case 4: return { x: x + 1, y: y + 0.5 };
      case 5: return { x: x + 0.5, y: y + 1 };
      case 6: return { x: x + 1, y: y + 0.5 };
      case 7: return { x: x + 1, y: y + 0.5 };
      case 8: return { x: x + 0.5, y: y };
      case 9: return { x: x + 0.5, y: y };
      case 10: return { x: x + 0.5, y: y };
      case 11: return { x: x + 1, y: y + 0.5 };
      case 12: return { x: x + 0.5, y: y };
      case 13: return { x: x + 0.5, y: y + 1 };
      case 14: return { x: x, y: y + 0.5 };
      default: return { x: x + 0.5, y: y + 0.5 };
    }
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    selection: Selection,
    options: SelectionRenderOptions
  ): void {
    if (!selection.mask) return;

    const overlayColor = options.overlayColor || { r: 255, g: 0, b: 0, a: 0.5 };
    
    // Create overlay canvas
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = selection.mask.width;
    overlayCanvas.height = selection.mask.height;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    
    // Draw mask
    overlayCtx.putImageData(selection.mask, 0, 0);
    
    // Apply color
    overlayCtx.globalCompositeOperation = 'source-in';
    overlayCtx.fillStyle = `rgba(${overlayColor.r}, ${overlayColor.g}, ${overlayColor.b}, ${overlayColor.a})`;
    overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw to main canvas
    if (selection.bounds) {
      ctx.drawImage(
        overlayCanvas,
        selection.bounds.x,
        selection.bounds.y,
        selection.bounds.width,
        selection.bounds.height
      );
    }
  }

  private renderHandles(ctx: CanvasRenderingContext2D, bounds: Rect): void {
    const handleSize = 6;
    ctx.fillStyle = '#007acc';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    const handles = [
      { x: bounds.x, y: bounds.y }, // tl
      { x: bounds.x + bounds.width / 2, y: bounds.y }, // tm
      { x: bounds.x + bounds.width, y: bounds.y }, // tr
      { x: bounds.x, y: bounds.y + bounds.height / 2 }, // ml
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, // mr
      { x: bounds.x, y: bounds.y + bounds.height }, // bl
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, // bm
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // br
    ];

    for (const h of handles) {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }
  }

  // Create selection mask from path
  static createMaskFromPath(
    path: Point[],
    bounds: Rect,
    feather: number = 0,
    antialias: boolean = true
  ): ImageData {
    const width = Math.ceil(bounds.width);
    const height = Math.ceil(bounds.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Normalize path to bounds
    const normalizedPath = path.map(p => ({
      x: p.x - bounds.x,
      y: p.y - bounds.y,
    }));

    // Draw path
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(normalizedPath[0].x, normalizedPath[0].y);
    for (let i = 1; i < normalizedPath.length; i++) {
      ctx.lineTo(normalizedPath[i].x, normalizedPath[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Apply feather if needed
    if (feather > 0) {
      ctx.filter = `blur(${feather}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    return ctx.getImageData(0, 0, width, height);
  }

  // Create selection mask from marquee
  static createMaskFromMarquee(bounds: Rect, feather: number = 0): ImageData {
    const width = Math.ceil(bounds.width);
    const height = Math.ceil(bounds.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    if (feather > 0) {
      ctx.filter = `blur(${feather}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    return ctx.getImageData(0, 0, width, height);
  }

  // Create magic wand selection
  static createMagicWandMask(
    imageData: ImageData,
    startX: number,
    startY: number,
    tolerance: number,
    contiguous: boolean,
    feather: number = 0
  ): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Get target color at start point
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return this.createMaskFromMarquee({ x: 0, y: 0, width: 1, height: 1 });
    }

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    // Flood fill with tolerance
    const mask = new Uint8ClampedArray(width * height);
    const queue: Point[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    const colorDistance = (r: number, g: number, b: number): number => {
      return Math.sqrt(
        Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2)
      );
    };

    while (queue.length > 0) {
      const { x, y } = queue.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (colorDistance(r, g, b) <= tolerance) {
        mask[y * width + x] = 255;

        // Add neighbors
        if (contiguous) {
          if (x > 0) queue.push({ x: x - 1, y });
          if (x < width - 1) queue.push({ x: x + 1, y });
          if (y > 0) queue.push({ x, y: y - 1 });
          if (y < height - 1) queue.push({ x, y: y + 1 });
        }
      }
    }

    // Convert to ImageData
    const maskData = new ImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const alpha = mask[i];
      maskData.data[i * 4] = 255;
      maskData.data[i * 4 + 1] = 255;
      maskData.data[i * 4 + 2] = 255;
      maskData.data[i * 4 + 3] = alpha;
    }

    // Apply feather
    if (feather > 0) {
      return this.applyFeather(maskData, feather);
    }

    return maskData;
  }

  static applyFeather(mask: ImageData, radius: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(mask, 0, 0);
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    return ctx.getImageData(0, 0, mask.width, mask.height);
  }

  // Invert selection mask
  static invertMask(mask: ImageData): ImageData {
    const result = new ImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i += 4) {
      result.data[i] = 255;
      result.data[i + 1] = 255;
      result.data[i + 2] = 255;
      result.data[i + 3] = 255 - mask.data[i + 3];
    }
    return result;
  }

  // Combine masks (union, intersect, subtract)
  static combineMasks(
    maskA: ImageData,
    maskB: ImageData,
    operation: 'union' | 'intersect' | 'subtract'
  ): ImageData {
    const width = maskA.width;
    const height = maskA.height;
    const result = new ImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const a = maskA.data[i * 4 + 3] / 255;
      const b = maskB.data[i * 4 + 3] / 255;
      let alpha = 0;

      switch (operation) {
        case 'union':
          alpha = Math.max(a, b);
          break;
        case 'intersect':
          alpha = Math.min(a, b);
          break;
        case 'subtract':
          alpha = Math.max(0, a - b);
          break;
      }

      result.data[i * 4] = 255;
      result.data[i * 4 + 1] = 255;
      result.data[i * 4 + 2] = 255;
      result.data[i * 4 + 3] = Math.round(alpha * 255);
    }

    return result;
  }

  // Get selection bounds from mask
  static getMaskBounds(mask: ImageData): Rect | null {
    const width = mask.width;
    const height = mask.height;
    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + 3;
        if (mask.data[idx] > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < 0) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}

export const selectionRenderer = new SelectionRenderer();