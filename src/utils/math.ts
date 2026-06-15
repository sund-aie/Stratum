/**
 * Unified Canvas - Math Utilities
 * Geometry, matrix operations, color space conversions, interpolation
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformMatrix {
  a: number; // scaleX
  b: number; // shearY
  c: number; // shearX
  d: number; // scaleY
  e: number; // translateX
  f: number; // translateY
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

export const identityMatrix: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function multiplyMatrix(a: TransformMatrix, b: TransformMatrix): TransformMatrix {
  return {
    a: a.a * b.a + a.c * b.b,
    b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d,
    d: a.b * b.c + a.d * b.d,
    e: a.a * b.e + a.c * b.f + a.e,
    f: a.b * b.e + a.d * b.f + a.f,
  };
}

export function applyMatrixToPoint(matrix: TransformMatrix, point: Point): Point {
  return {
    x: point.x * matrix.a + point.y * matrix.c + matrix.e,
    y: point.x * matrix.b + point.y * matrix.d + matrix.f,
  };
}

export function invertMatrix(matrix: TransformMatrix): TransformMatrix | null {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(det) < 1e-10) return null;

  const invDet = 1 / det;
  return {
    a: matrix.d * invDet,
    b: -matrix.b * invDet,
    c: -matrix.c * invDet,
    d: matrix.a * invDet,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) * invDet,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) * invDet,
  };
}

export function composeMatrix(
  translateX: number = 0,
  translateY: number = 0,
  scaleX: number = 1,
  scaleY: number = 1,
  rotation: number = 0,
  skewX: number = 0,
  skewY: number = 0,
  originX: number = 0,
  originY: number = 0
): TransformMatrix {
  // Translate to origin
  const t1 = { a: 1, b: 0, c: 0, d: 1, e: -originX, f: -originY };
  
  // Scale
  const s = { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 };
  
  // Skew
  const sk = { a: 1, b: Math.tan(skewY), c: Math.tan(skewX), d: 1, e: 0, f: 0 };
  
  // Rotate
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const r = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  
  // Translate back
  const t2 = { a: 1, b: 0, c: 0, d: 1, e: originX + translateX, f: originY + translateY };

  // Compose: T2 * R * Sk * S * T1
  let result = multiplyMatrix(t2, r);
  result = multiplyMatrix(result, sk);
  result = multiplyMatrix(result, s);
  result = multiplyMatrix(result, t1);

  return result;
}

export function decomposeMatrix(matrix: TransformMatrix): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
} | null {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(det) < 1e-10) return null;

  const translateX = matrix.e;
  const translateY = matrix.f;

  // Scale and rotation
  const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
  const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d) * (det > 0 ? 1 : -1);

  const rotation = Math.atan2(matrix.b, matrix.a);
  const skewX = Math.atan2(-matrix.c * scaleX + matrix.a * scaleY, matrix.a * scaleX + matrix.c * scaleY);
  const skewY = Math.atan2(matrix.b * scaleY + matrix.d * scaleX, matrix.d * scaleY - matrix.b * scaleX);

  return { translateX, translateY, scaleX, scaleY, rotation, skewX, skewY };
}

// ============================================================================
// GEOMETRY
// ============================================================================

export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
         point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x ||
           a.y + a.height < b.y || b.y + b.height < a.y);
}

export function getRectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function inflateRect(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function clampRect(rect: Rect, bounds: Rect): Rect {
  return {
    x: clamp(rect.x, bounds.x, bounds.x + bounds.width - rect.width),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - rect.height),
    width: Math.min(rect.width, bounds.width),
    height: Math.min(rect.height, bounds.height),
  };
}

export function getPathBounds(points: Point[]): Rect {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = points[0].x, minY = points[0].y;
  let maxX = points[0].x, maxY = points[0].y;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPoint(point: Point, min: Point, max: Point): Point {
  return { x: clamp(point.x, min.x, max.x), y: clamp(point.y, min.y, max.y) };
}

// ============================================================================
// BEZIER CURVES
// ============================================================================

export function cubicBezier(
  t: number,
  p0: Point, p1: Point, p2: Point, p3: Point
): Point {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function quadraticBezier(
  t: number,
  p0: Point, p1: Point, p2: Point
): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

export function getCubicBezierLength(
  p0: Point, p1: Point, p2: Point, p3: Point,
  segments: number = 100
): number {
  let length = 0;
  let prev = p0;
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const curr = cubicBezier(t, p0, p1, p2, p3);
    length += distance(prev, curr);
    prev = curr;
  }
  
  return length;
}

export function splitCubicBezier(
  t: number,
  p0: Point, p1: Point, p2: Point, p3: Point
): { left: Point[]; right: Point[] } {
  // De Casteljau's algorithm
  const q0 = lerpPoint(p0, p1, t);
  const q1 = lerpPoint(p1, p2, t);
  const q2 = lerpPoint(p2, p3, t);
  
  const r0 = lerpPoint(q0, q1, t);
  const r1 = lerpPoint(q1, q2, t);
  
  const s0 = lerpPoint(r0, r1, t);

  return {
    left: [p0, q0, r0, s0],
    right: [s0, r1, q2, p3],
  };
}

export function getCubicBezierBounds(
  p0: Point, p1: Point, p2: Point, p3: Point
): Rect {
  // Find extrema by solving derivative = 0
  const findRoots = (a: number, b: number, c: number): number[] => {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return [];
    const sqrt = Math.sqrt(disc);
    const t1 = (-b + sqrt) / (2 * a);
    const t2 = (-b - sqrt) / (2 * a);
    return [t1, t2].filter(t => t > 0 && t < 1);
  };

  // Derivative: 3(1-t)²(p1-p0) + 6(1-t)t(p2-p1) + 3t²(p3-p2)
  // = At² + Bt + C
  const Ax = 3 * (p3.x - 3 * p2.x + 3 * p1.x - p0.x);
  const Bx = 6 * (p2.x - 2 * p1.x + p0.x);
  const Cx = 3 * (p1.x - p0.x);

  const Ay = 3 * (p3.y - 3 * p2.y + 3 * p1.y - p0.y);
  const By = 6 * (p2.y - 2 * p1.y + p0.y);
  const Cy = 3 * (p1.y - p0.y);

  const ts = [0, 1, ...findRoots(Ax, Bx, Cx), ...findRoots(Ay, By, Cy)];
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const t of ts) {
    const pt = cubicBezier(t, p0, p1, p2, p3);
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ============================================================================
// COLOR SPACE CONVERSIONS
// ============================================================================

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h: h * 360, s: s * 100, v: v * 100 };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; v /= 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b_: number } {
  // sRGB to XYZ
  const toLinear = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // sRGB D65 to XYZ
  const X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  // XYZ to Lab (D65 white point)
  const refX = 0.95047; const refY = 1.00000; const refZ = 1.08883;

  const fx = X / refX;
  const fy = Y / refY;
  const fz = Z / refZ;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16/116);

  const L = 116 * f(fy) - 16;
  const a = 500 * (f(fx) - f(fy));
  const b_ = 200 * (f(fy) - f(fz));

  return { l: L, a: a, b_: b_ };
}

export function labToRgb(l: number, a: number, b_: number): { r: number; g: number; b: number } {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b_ / 200;

  const finv = (t: number) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16/116) / 7.787;
  };

  const X = finv(fx) * 0.95047;
  const Y = finv(fy) * 1.00000;
  const Z = finv(fz) * 1.08883;

  // XYZ to sRGB
  const rl = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const gl = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  const bl = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

  const toSRGB = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1/2.4) - 0.055;
  };

  return {
    r: Math.round(toSRGB(rl) * 255),
    g: Math.round(toSRGB(gl) * 255),
    b: Math.round(toSRGB(bl) * 255),
  };
}

export function colorToString(color: Color): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}

export function stringToColor(str: string): Color | null {
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

export function hexToColor(hex: string): Color | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
    a: match[4] ? parseInt(match[4], 16) / 255 : 1,
  };
}

export function colorToHex(color: Color): string {
  const toHex = (c: number) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

// ============================================================================
// INTERPOLATION
// ============================================================================

export function catmullRom(points: Point[], tension: number = 0.5): Point[] {
  if (points.length < 2) return points;
  
  const result: Point[] = [];
  const n = points.length;
  
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    
    for (let t = 0; t <= 1; t += 0.1) {
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      ) * tension;
      
      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      ) * tension;
      
      result.push({ x, y });
    }
  }
  
  return result;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ============================================================================
// RANDOM
// ============================================================================

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomPointInRect(rect: Rect): Point {
  return {
    x: randomInRange(rect.x, rect.x + rect.width),
    y: randomInRange(rect.y, rect.y + rect.height),
  };
}

export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}