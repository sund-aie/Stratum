/**
 * Unified Canvas - Geometry Utilities
 */

export interface Point { x: number; y: number; }
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Size { width: number; height: number; }

export interface Transform {
  x: number; y: number;
  scaleX: number; scaleY: number;
  rotation: number; // radians
  skewX: number; skewY: number;
  originX: number; originY: number; // 0-1
  flipX: boolean; flipY: boolean;
}

export function identityTransform(): Transform {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, originX: 0, originY: 0, flipX: false, flipY: false };
}

export function translateTransform(t: Transform, dx: number, dy: number): Transform {
  return { ...t, x: t.x + dx, y: t.y + dy };
}

export function scaleTransform(t: Transform, sx: number, sy: number, originX = 0.5, originY = 0.5): Transform {
  return { ...t, scaleX: t.scaleX * sx, scaleY: t.scaleY * sy, originX, originY };
}

export function rotateTransform(t: Transform, angle: number, originX = 0.5, originY = 0.5): Transform {
  return { ...t, rotation: t.rotation + angle, originX, originY };
}

export function skewTransform(t: Transform, skewX: number, skewY: number): Transform {
  return { ...t, skewX: t.skewX + skewX, skewY: t.skewY + skewY };
}

export function flipTransform(t: Transform, flipX: boolean, flipY: boolean): Transform {
  return { ...t, flipX: t.flipX !== flipX, flipY: t.flipY !== flipY };
}

export function applyTransform(p: Point, t: Transform): Point {
  // Translate to origin
  let x = p.x - t.originX;
  let y = p.y - t.originY;
  
  // Scale
  x *= t.scaleX;
  y *= t.scaleY;
  
  // Skew
  const sx = x + y * Math.tan(t.skewX);
  const sy = y + x * Math.tan(t.skewY);
  x = sx; y = sy;
  
  // Rotate
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  x = rx; y = ry;
  
  // Flip
  if (t.flipX) x = -x;
  if (t.flipY) y = -y;
  
  // Translate back + position
  return { x: x + t.originX + t.x, y: y + t.originY + t.y };
}

export function inverseTransform(p: Point, t: Transform): Point {
  // Reverse: translate back from position, unflip, unrotate, unskew, unscale, translate from origin
  let x = p.x - t.x;
  let y = p.y - t.y;
  
  if (t.flipX) x = -x;
  if (t.flipY) y = -y;
  
  const cos = Math.cos(-t.rotation);
  const sin = Math.sin(-t.rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  x = rx; y = ry;
  
  // Unscrew (approximate - exact requires solving linear system)
  const sX = x - y * Math.tan(t.skewX);
  const sY = y - x * Math.tan(t.skewY);
  x = sX; y = sY;
  
  x /= t.scaleX;
  y /= t.scaleY;
  
  return { x: x + t.originX, y: y + t.originY };
}

export function composeTransform(a: Transform, b: Transform): Transform {
  // Apply a then b (b * a in matrix terms)
  const m1 = transformToMatrix(a);
  const m2 = transformToMatrix(b);
  const m = multiplyMatrix(m2, m1);
  return matrixToTransform(m);
}

export function transformToMatrix(t: Transform): number[] {
  // 3x3 matrix [a, b, c, d, e, f, 0, 0, 1] for 2D affine
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  
  const a = t.scaleX * cos;
  const b = t.scaleX * sin;
  const c = -t.scaleY * sin + t.scaleY * Math.tan(t.skewX);
  const d = t.scaleY * cos + t.scaleY * Math.tan(t.skewY);
  const e = t.x;
  const f = t.y;
  
  // Apply origin offset
  const ox = t.originX;
  const oy = t.originY;
  
  return [
    a, b, 0,
    c, d, 0,
    e - a * ox - c * oy + ox,
    f - b * ox - d * oy + oy,
    1
  ];
}

export function matrixToTransform(m: number[]): Transform {
  // Simplified extraction
  const a = m[0], b = m[1], c = m[3], d = m[4];
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const rotation = Math.atan2(b, a);
  return { x: m[6], y: m[7], scaleX, scaleY, rotation, skewX: 0, skewY: 0, originX: 0, originY: 0, flipX: false, flipY: false };
}

export function multiplyMatrix(a: number[], b: number[]): number[] {
  return [
    a[0]*b[0] + a[1]*b[3], a[0]*b[1] + a[1]*b[4], 0,
    a[3]*b[0] + a[4]*b[3], a[3]*b[1] + a[4]*b[4], 0,
    a[6]*b[0] + a[7]*b[3] + b[6], a[6]*b[1] + a[7]*b[4] + b[7], 1
  ];
}

export function rectUnion(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

export function rectIntersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x >= x2 || y >= y2) return null;
  return { x, y, width: x2 - x, height: y2 - y };
}

export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
}

export function rectFromPoints(p1: Point, p2: Point): Rect {
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y),
  };
}

export function rectCenter(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function pointDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointAngle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function clampPoint(p: Point, r: Rect): Point {
  return {
    x: Math.max(r.x, Math.min(r.x + r.width, p.x)),
    y: Math.max(r.y, Math.min(r.y + r.height, p.y)),
  };
}