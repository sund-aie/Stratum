/**
 * Unified Canvas - Vector Rendering Engine
 * Renders vector paths with fills, strokes, and various effects
 */

import type { VectorPath, PathPoint, Color, Rect, Point } from '../types';

export interface VectorRenderOptions {
  showHandles?: boolean;
  showControlHandles?: boolean;
  selectedPathId?: string;
  selectedPointIds?: string[];
  handleSize?: number;
  snapToGrid?: boolean;
  gridSize?: number;
}

/**
 * Render a single vector path
 */
export function renderVectorPath(
  path: VectorPath,
  ctx: CanvasRenderingContext2D,
  options: VectorRenderOptions = {}
): void {
  const points = path.points;
  if (points.length === 0) return;

  ctx.save();

  // Build path
  ctx.beginPath();
  
  if (points.length === 1) {
    // Single point - draw as small circle
    ctx.arc(points[0].x, points[0].y, 2, 0, Math.PI * 2);
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Check if previous point has outgoing handle
      if (prev.handleOut && curr.handleIn) {
        // Cubic Bezier
        ctx.bezierCurveTo(
          prev.handleOut.x,
          prev.handleOut.y,
          curr.handleIn.x,
          curr.handleIn.y,
          curr.x,
          curr.y
        );
      } else if (prev.handleOut) {
        // Quadratic Bezier (only one handle)
        ctx.quadraticCurveTo(
          prev.handleOut.x,
          prev.handleOut.y,
          curr.x,
          curr.y
        );
      } else {
        // Straight line
        ctx.lineTo(curr.x, curr.y);
      }
    }
    
    if (path.closed) {
      // Close path with curve if last point has handle
      const last = points[points.length - 1];
      const first = points[0];
      if (last.handleOut && first.handleIn) {
        ctx.bezierCurveTo(
          last.handleOut.x,
          last.handleOut.y,
          first.handleIn.x,
          first.handleIn.y,
          first.x,
          first.y
        );
      } else {
        ctx.closePath();
      }
    }
  }

  // Fill
  if (path.fill && path.fill.a > 0) {
    ctx.fillStyle = colorToString(path.fill);
    ctx.fill(path.closed ? 'nonzero' : 'evenodd');
  }

  // Stroke
  if (path.stroke && path.stroke.a > 0 && path.strokeWidth > 0) {
    ctx.strokeStyle = colorToString(path.stroke);
    ctx.lineWidth = path.strokeWidth;
    ctx.lineCap = path.strokeCap;
    ctx.lineJoin = path.strokeJoin;
    
    if (path.dashArray && path.dashArray.length > 0) {
      ctx.setLineDash(path.dashArray);
    }
    
    ctx.stroke();
  }

  // Draw handles if selected
  if (options.showHandles && (options.selectedPathId === path.id || !options.selectedPathId)) {
    drawPathHandles(ctx, path, options);
  }

  ctx.restore();
}

/**
 * Render all paths in a vector layer
 */
export function renderVectorLayer(
  paths: VectorPath[],
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  options: VectorRenderOptions = {}
): void {
  for (const path of paths) {
    renderVectorPath(path, ctx, options);
  }
}

/**
 * Draw anchor points and control handles
 */
function drawPathHandles(
  ctx: CanvasRenderingContext2D,
  path: VectorPath,
  options: VectorRenderOptions
): void {
  const handleSize = options.handleSize || 8;
  const isSelected = options.selectedPathId === path.id;

  // Draw control handles and lines
  if (options.showControlHandles) {
    ctx.save();
    ctx.strokeStyle = isSelected ? '#007acc' : '#888';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const point of path.points) {
      // Incoming handle
      if (point.handleIn) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.handleIn.x, point.handleIn.y);
        ctx.stroke();
        
        // Handle point
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = isSelected ? '#007acc' : '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(point.handleIn.x, point.handleIn.y, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Outgoing handle
      if (point.handleOut) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.handleOut.x, point.handleOut.y);
        ctx.stroke();
        
        // Handle point
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = isSelected ? '#007acc' : '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(point.handleOut.x, point.handleOut.y, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw anchor points
  for (const point of path.points) {
    const isPointSelected = options.selectedPointIds?.includes(point.id as string) || false;
    
    ctx.fillStyle = isPointSelected ? '#007acc' : '#fff';
    ctx.strokeStyle = isSelected ? '#007acc' : '#333';
    ctx.lineWidth = isPointSelected ? 2 : 1.5;
    
    // Different shapes for point types
    const size = handleSize;
    ctx.beginPath();
    
    switch (point.type) {
      case 'corner':
        // Square for corner points
        ctx.rect(point.x - size / 2, point.y - size / 2, size, size);
        break;
      case 'smooth':
        // Diamond for smooth points
        ctx.moveTo(point.x, point.y - size / 2);
        ctx.lineTo(point.x + size / 2, point.y);
        ctx.lineTo(point.x, point.y + size / 2);
        ctx.lineTo(point.x - size / 2, point.y);
        ctx.closePath();
        break;
      case 'symmetric':
        // Circle for symmetric points
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        break;
    }
    
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Create a rectangle path
 */
export function createRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 0,
  id?: string
): VectorPath {
  const points: PathPoint[] = [];
  const hw = width / 2;
  const hh = height / 2;
  const cx = x + hw;
  const cy = y + hh;

  if (radius === 0) {
    // Simple rectangle
    points.push(
      { x: x, y: y, type: 'corner' },
      { x: x + width, y: y, type: 'corner' },
      { x: x + width, y: y + height, type: 'corner' },
      { x: x, y: y + height, type: 'corner' }
    );
  } else {
    // Rounded rectangle using bezier curves
    const r = Math.min(radius, hw, hh);
    const kappa = 0.5522847498; // 4/3 * (sqrt(2) - 1)
    
    // Top-left
    points.push(
      { x: x + r, y: y, type: 'smooth', handleOut: { x: x + r * kappa, y: y } },
      { x: x + width - r, y: y, type: 'smooth', handleIn: { x: x + width - r * kappa, y: y } }
    );
    // Top-right
    points.push(
      { x: x + width, y: y + r, type: 'smooth', handleOut: { x: x + width, y: y + r * kappa } },
      { x: x + width, y: y + height - r, type: 'smooth', handleIn: { x: x + width, y: y + height - r * kappa } }
    );
    // Bottom-right
    points.push(
      { x: x + width - r, y: y + height, type: 'smooth', handleOut: { x: x + width - r * kappa, y: y + height } },
      { x: x + r, y: y + height, type: 'smooth', handleIn: { x: x + r * kappa, y: y + height } }
    );
    // Bottom-left
    points.push(
      { x: x, y: y + height - r, type: 'smooth', handleOut: { x: x, y: y + height - r * kappa } },
      { x: x, y: y + r, type: 'smooth', handleIn: { x: x, y: y + r * kappa } }
    );
  }

  return {
    id: id || crypto.randomUUID(),
    points,
    closed: true,
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
  };
}

/**
 * Create an ellipse path
 */
export function createEllipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  id?: string
): VectorPath {
  const points: PathPoint[] = [];
  const kappa = 0.5522847498;
  
  // Right
  points.push({ 
    x: cx + rx, 
    y: cy, 
    type: 'symmetric', 
    handleIn: { x: cx + rx, y: cy - ry * kappa },
    handleOut: { x: cx + rx, y: cy + ry * kappa }
  });
  // Bottom
  points.push({ 
    x: cx, 
    y: cy + ry, 
    type: 'symmetric', 
    handleIn: { x: cx + rx * kappa, y: cy + ry },
    handleOut: { x: cx - rx * kappa, y: cy + ry }
  });
  // Left
  points.push({ 
    x: cx - rx, 
    y: cy, 
    type: 'symmetric', 
    handleIn: { x: cx - rx, y: cy + ry * kappa },
    handleOut: { x: cx - rx, y: cy - ry * kappa }
  });
  // Top
  points.push({ 
    x: cx, 
    y: cy - ry, 
    type: 'symmetric', 
    handleIn: { x: cx - rx * kappa, y: cy - ry },
    handleOut: { x: cx + rx * kappa, y: cy - ry }
  });

  return {
    id: id || crypto.randomUUID(),
    points,
    closed: true,
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
  };
}

/**
 * Create a polygon path
 */
export function createPolygonPath(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number = 0,
  id?: string
): VectorPath {
  const points: PathPoint[] = [];
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = rotation - Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push({ x, y, type: 'corner' });
  }

  return {
    id: id || crypto.randomUUID(),
    points,
    closed: true,
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
  };
}

/**
 * Create a star path
 */
export function createStarPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation: number = 0,
  id?: string
): VectorPath {
  const pathPoints: PathPoint[] = [];
  const angleStep = Math.PI / points;
  const startAngle = rotation - Math.PI / 2;

  for (let i = 0; i < points * 2; i++) {
    const angle = startAngle + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    pathPoints.push({ x, y, type: 'corner' });
  }

  return {
    id: id || crypto.randomUUID(),
    points: pathPoints,
    closed: true,
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
  };
}

/**
 * Create a line path
 */
export function createLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  id?: string
): VectorPath {
  return {
    id: id || crypto.randomUUID(),
    points: [
      { x: x1, y: y1, type: 'corner' },
      { x: x2, y: y2, type: 'corner' },
    ],
    closed: false,
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
  };
}

/**
 * Convert text to vector paths
 */
export function textToPaths(
  text: string,
  x: number,
  y: number,
  font: string,
  fontSize: number,
  options: { align?: 'left' | 'center' | 'right'; letterSpacing?: number } = {}
): VectorPath[] {
  const paths: VectorPath[] = [];
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${fontSize}px ${font}`;

  const { align = 'left', letterSpacing = 0 } = options;
  let currentX = x;

  if (align === 'center') {
    const width = ctx.measureText(text).width + letterSpacing * (text.length - 1);
    currentX = x - width / 2;
  } else if (align === 'right') {
    const width = ctx.measureText(text).width + letterSpacing * (text.length - 1);
    currentX = x - width;
  }

  for (const char of text) {
    // Use Path2D to get glyph path (simplified - real impl would use font parsing)
    const charPath = new Path2D();
    // This is a placeholder - real implementation would extract glyph outlines
    // from font files using opentype.js or similar
    paths.push({
      id: crypto.randomUUID(),
      points: [
        { x: currentX, y: y, type: 'corner' },
        { x: currentX + ctx.measureText(char).width, y: y, type: 'corner' },
        { x: currentX + ctx.measureText(char).width, y: y + fontSize, type: 'corner' },
        { x: currentX, y: y + fontSize, type: 'corner' },
      ],
      closed: true,
    });
    currentX += ctx.measureText(char).width + letterSpacing;
  }

  return paths;
}

/**
 * Calculate bounds of a vector path
 */
export function getPathBounds(path: VectorPath): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const point of path.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);

    // Include handles in bounds
    if (point.handleIn) {
      minX = Math.min(minX, point.handleIn.x);
      minY = Math.min(minY, point.handleIn.y);
      maxX = Math.max(maxX, point.handleIn.x);
      maxY = Math.max(maxY, point.handleIn.y);
    }
    if (point.handleOut) {
      minX = Math.min(minX, point.handleOut.x);
      minY = Math.min(minY, point.handleOut.y);
      maxX = Math.max(maxX, point.handleOut.x);
      maxY = Math.max(maxY, point.handleOut.y);
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Transform a path by matrix
 */
export function transformPath(
  path: VectorPath,
  matrix: { a: number; b: number; c: number; d: number; e: number; f: number }
): VectorPath {
  const transformPoint = (p: Point): Point => ({
    x: p.x * matrix.a + p.y * matrix.c + matrix.e,
    y: p.x * matrix.b + p.y * matrix.d + matrix.f,
  });

  return {
    ...path,
    id: path.id,
    points: path.points.map(p => ({
      ...p,
      x: transformPoint(p).x,
      y: transformPoint(p).y,
      handleIn: p.handleIn ? transformPoint(p.handleIn) : undefined,
      handleOut: p.handleOut ? transformPoint(p.handleOut) : undefined,
    })),
  };
}

/**
 * Offset a path
 */
export function offsetPath(path: VectorPath, dx: number, dy: number): VectorPath {
  return {
    ...path,
    id: path.id,
    points: path.points.map(p => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy,
      handleIn: p.handleIn ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy } : undefined,
      handleOut: p.handleOut ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy } : undefined,
    })),
  };
}

/**
 * Simplify path (reduce points)
 */
export function simplifyPath(path: VectorPath, tolerance: number = 1): VectorPath {
  // Douglas-Peucker algorithm
  const simplify = (points: PathPoint[], start: number, end: number): PathPoint[] => {
    if (end - start <= 1) return [points[start]];

    let maxDist = 0;
    let maxIndex = start;
    const startPt = points[start];
    const endPt = points[end];

    for (let i = start + 1; i < end; i++) {
      const dist = pointToLineDistance(points[i], startPt, endPt);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      const left = simplify(points, start, maxIndex);
      const right = simplify(points, maxIndex, end);
      return [...left.slice(0, -1), ...right];
    }

    return [startPt];
  };

  const simplified = simplify(path.points, 0, path.points.length - 1);
  // Ensure closed paths have matching start/end
  if (path.closed && simplified.length > 1) {
    simplified.push({ ...simplified[0] });
  }

  return {
    ...path,
    id: path.id,
    points: simplified,
  };
}

function pointToLineDistance(p: PathPoint, a: PathPoint, b: PathPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  
  return Math.hypot(p.x - closestX, p.y - closestY);
}

function colorToString(color: Color): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}

/**
 * Boolean operations on paths (union, subtract, intersect, exclude)
 * Note: These are placeholders - real implementation would use a library like clipper.js
 */
export function booleanPathOperation(
  pathA: VectorPath,
  pathB: VectorPath,
  operation: 'union' | 'subtract' | 'intersect' | 'exclude'
): VectorPath[] {
  // Placeholder - returns original paths
  // Real implementation would use polygon clipping
  console.warn(`Boolean operation ${operation} not fully implemented`);
  return [pathA, pathB];
}

/**
 * Expand/stroke path to outline
 */
export function expandPath(path: VectorPath, distance: number): VectorPath[] {
  // Placeholder - real implementation would use offset curves
  console.warn('Path expansion not fully implemented');
  return [path];
}

/**
 * Convert stroke to fill (outline stroke)
 */
export function outlineStroke(path: VectorPath): VectorPath[] {
  // Placeholder
  console.warn('Stroke outlining not fully implemented');
  return [path];
}