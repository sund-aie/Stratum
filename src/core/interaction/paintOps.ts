/**
 * Low-level pixel operations for the painting/fill/gradient tools.
 * All writes respect an optional selection mask (B7). Brush/gradient use the supplied
 * foreground/background colors (B5) — nothing is hardcoded white/black.
 */
import type { RGBAColor, VectorPath, AnchorPoint } from '../../types';
import { rgbToHsl, hslToRgb } from '../color/color';

export interface StampParams {
  size: number;
  hardness: number; // 0-100
  strength: number; // 0-1 (opacity*flow or single strength)
  mask: Uint8Array | null;
  color: RGBAColor;
}

export interface StampExtra {
  cloneSource: { x: number; y: number } | null;
  cloneOffset: { dx: number; dy: number } | null;
  exposure: number; // 0-1 (dodge/burn/sponge)
  range: string;
}

const KAPPA = 0.5522847498307936;

function coverage(dist: number, radius: number, hardness: number, hard: boolean): number {
  if (dist > radius) return 0;
  if (hard) return 1;
  const inner = radius * (hardness / 100);
  if (dist <= inner) return 1;
  if (radius - inner <= 0) return 1;
  const t = (dist - inner) / (radius - inner);
  return 1 - t * t * (3 - 2 * t); // smoothstep falloff
}

/** source-over a solid premultiplied color with coverage alpha `a` at pixel idx. */
function overColor(data: Uint8ClampedArray, idx: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  const dstA = data[idx + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) {
    data[idx + 3] = 0;
    return;
  }
  data[idx] = (r * a + data[idx] * dstA * (1 - a)) / outA;
  data[idx + 1] = (g * a + data[idx + 1] * dstA * (1 - a)) / outA;
  data[idx + 2] = (b * a + data[idx + 2] * dstA * (1 - a)) / outA;
  data[idx + 3] = outA * 255;
}

export function strokeSegment(
  img: ImageData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  toolId: string,
  params: StampParams,
  extra: StampExtra
): void {
  const radius = Math.max(0.5, params.size / 2);
  const spacing = Math.max(0.5, radius * 0.25);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    stampAt(img, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, toolId, params, extra);
  }
}

export function stampAt(
  img: ImageData,
  cx: number,
  cy: number,
  toolId: string,
  p: StampParams,
  extra: StampExtra
): void {
  const { width: W, height: H, data } = img;
  const radius = Math.max(0.5, p.size / 2);
  const r0 = Math.floor(cx - radius);
  const r1 = Math.ceil(cx + radius);
  const c0 = Math.floor(cy - radius);
  const c1 = Math.ceil(cy + radius);
  const hard = toolId === 'pencil';
  const col = p.color;

  for (let y = c0; y <= c1; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = r0; x <= r1; x++) {
      if (x < 0 || x >= W) continue;
      const d = Math.hypot(x - cx, y - cy);
      let cov = coverage(d, radius, p.hardness, hard);
      if (cov <= 0) continue;
      if (p.mask) {
        const m = p.mask[y * W + x];
        if (m === 0) continue;
        cov *= m / 255;
      }
      const idx = (y * W + x) * 4;
      const a = cov * p.strength;

      switch (toolId) {
        case 'brush':
        case 'pencil':
        case 'colorReplacement':
        case 'mixerBrush':
          overColor(data, idx, col.r, col.g, col.b, a * col.a);
          break;
        case 'eraser':
        case 'backgroundEraser':
          data[idx + 3] = Math.max(0, data[idx + 3] * (1 - a));
          break;
        case 'cloneStamp':
        case 'patternStamp':
        case 'healingBrush': {
          const off = extra.cloneOffset;
          if (!off) break;
          const sx = Math.round(x + off.dx);
          const sy = Math.round(y + off.dy);
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) break;
          const sidx = (sy * W + sx) * 4;
          overColor(data, idx, data[sidx], data[sidx + 1], data[sidx + 2], a * (data[sidx + 3] / 255));
          break;
        }
        case 'spotHealing': {
          // auto-sample from a neighbour to the upper-left of the brush
          const sx = Math.round(x - radius * 1.5);
          const sy = Math.round(y - radius * 1.5);
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) break;
          const sidx = (sy * W + sx) * 4;
          overColor(data, idx, data[sidx], data[sidx + 1], data[sidx + 2], a);
          break;
        }
        case 'dodge': {
          const f = 1 + extra.exposure * cov;
          data[idx] = Math.min(255, data[idx] * f);
          data[idx + 1] = Math.min(255, data[idx + 1] * f);
          data[idx + 2] = Math.min(255, data[idx + 2] * f);
          break;
        }
        case 'burn': {
          const f = 1 - extra.exposure * cov;
          data[idx] = Math.max(0, data[idx] * f);
          data[idx + 1] = Math.max(0, data[idx + 1] * f);
          data[idx + 2] = Math.max(0, data[idx + 2] * f);
          break;
        }
        case 'sponge': {
          const hsl = rgbToHsl(data[idx], data[idx + 1], data[idx + 2]);
          hsl.s = Math.max(0, Math.min(100, hsl.s - extra.exposure * cov * 60));
          const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          break;
        }
        case 'blur':
        case 'smudge': {
          const n = neighborsAvg(data, x, y, W, H);
          data[idx] += (n.r - data[idx]) * a;
          data[idx + 1] += (n.g - data[idx + 1]) * a;
          data[idx + 2] += (n.b - data[idx + 2]) * a;
          break;
        }
        case 'sharpen': {
          const n = neighborsAvg(data, x, y, W, H);
          data[idx] = clamp255(data[idx] + (data[idx] - n.r) * a);
          data[idx + 1] = clamp255(data[idx + 1] + (data[idx + 1] - n.g) * a);
          data[idx + 2] = clamp255(data[idx + 2] + (data[idx + 2] - n.b) * a);
          break;
        }
        default:
          overColor(data, idx, col.r, col.g, col.b, a * col.a);
      }
    }
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function neighborsAvg(data: Uint8ClampedArray, x: number, y: number, W: number, H: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = (ny * W + nx) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

// ---------------------------------------------------------------------------

export function translateImageData(src: ImageData, dx: number, dy: number): ImageData {
  const { width: W, height: H } = src;
  const out = new ImageData(W, H);
  for (let y = 0; y < H; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < W; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= W) continue;
      const si = (sy * W + sx) * 4;
      const di = (y * W + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

export function cropImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx;
      const sy = y + yy;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (yy * w + xx) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

/** Contiguous flood fill with tolerance, clipped to the selection mask. Typed-array stack. */
export function floodFill(
  img: ImageData,
  sx: number,
  sy: number,
  color: RGBAColor,
  tolerance: number,
  mask: Uint8Array | null
): void {
  const { width: W, height: H, data } = img;
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const si = (sy * W + sx) * 4;
  const tr = data[si];
  const tg = data[si + 1];
  const tb = data[si + 2];
  const ta = data[si + 3];
  const within = (i: number) => {
    const p = i * 4;
    return (
      Math.abs(data[p] - tr) <= tolerance &&
      Math.abs(data[p + 1] - tg) <= tolerance &&
      Math.abs(data[p + 2] - tb) <= tolerance &&
      Math.abs(data[p + 3] - ta) <= tolerance
    );
  };
  const ar = color.r;
  const ag = color.g;
  const ab = color.b;
  const aa = Math.round(color.a * 255);
  const stack = new Int32Array(W * H);
  let sp = 0;
  const visited = new Uint8Array(W * H);
  const start = sy * W + sx;
  stack[sp++] = start;
  visited[start] = 1;
  while (sp > 0) {
    const i = stack[--sp];
    if (!within(i)) continue;
    if (mask && mask[i] === 0) continue;
    const p = i * 4;
    data[p] = ar;
    data[p + 1] = ag;
    data[p + 2] = ab;
    data[p + 3] = aa;
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0 && !visited[i - 1]) { visited[i - 1] = 1; stack[sp++] = i - 1; }
    if (x < W - 1 && !visited[i + 1]) { visited[i + 1] = 1; stack[sp++] = i + 1; }
    if (y > 0 && !visited[i - W]) { visited[i - W] = 1; stack[sp++] = i - W; }
    if (y < H - 1 && !visited[i + W]) { visited[i + W] = 1; stack[sp++] = i + W; }
  }
}

/** Gradient with 5 shapes from fg->bg (B5), clipped to mask. */
export function drawGradient(
  img: ImageData,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fg: RGBAColor,
  bg: RGBAColor,
  shape: string,
  reverse: boolean,
  mask: Uint8Array | null
): void {
  const { width: W, height: H, data } = img;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;
  const ux = dx / len;
  const uy = dy / len;
  const gAngle = Math.atan2(dy, dx);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (mask && mask[i] === 0) continue;
      const px = x - x1;
      const py = y - y1;
      let t: number;
      switch (shape) {
        case 'Radial':
          t = Math.min(1, Math.hypot(px, py) / len);
          break;
        case 'Angle':
        case 'Angular': {
          let a = Math.atan2(py, px) - gAngle;
          a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          t = a / (Math.PI * 2);
          break;
        }
        case 'Reflected': {
          const proj = (px * ux + py * uy) / len;
          t = Math.min(1, Math.abs(proj));
          break;
        }
        case 'Diamond': {
          const u = (px * ux + py * uy) / len;
          const v = (-px * uy + py * ux) / len;
          t = Math.min(1, Math.abs(u) + Math.abs(v));
          break;
        }
        case 'Linear':
        default: {
          const proj = (px * ux + py * uy) / len;
          t = Math.max(0, Math.min(1, proj));
        }
      }
      if (reverse) t = 1 - t;
      const idx = i * 4;
      const r = fg.r + (bg.r - fg.r) * t;
      const g = fg.g + (bg.g - fg.g) * t;
      const b = fg.b + (bg.b - fg.b) * t;
      const a = (fg.a + (bg.a - fg.a) * t) * (mask ? mask[i] / 255 : 1);
      overColor(data, idx, r, g, b, a);
    }
  }
}

// ---------------------------------------------------------------------------
// Shape path construction (vector layers)
// ---------------------------------------------------------------------------

function corner(x: number, y: number): AnchorPoint {
  return { x, y, cornerType: 'corner' };
}

export function makeShapePath(
  toolId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  sides: number
): VectorPath {
  const id = `path-${Date.now().toString(36)}`;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  if (toolId === 'ellipse') {
    const pts: AnchorPoint[] = [
      { x: cx + rx, y: cy, handleIn: { x: cx + rx, y: cy - ry * KAPPA }, handleOut: { x: cx + rx, y: cy + ry * KAPPA }, cornerType: 'smooth' },
      { x: cx, y: cy + ry, handleIn: { x: cx + rx * KAPPA, y: cy + ry }, handleOut: { x: cx - rx * KAPPA, y: cy + ry }, cornerType: 'smooth' },
      { x: cx - rx, y: cy, handleIn: { x: cx - rx, y: cy + ry * KAPPA }, handleOut: { x: cx - rx, y: cy - ry * KAPPA }, cornerType: 'smooth' },
      { x: cx, y: cy - ry, handleIn: { x: cx - rx * KAPPA, y: cy - ry }, handleOut: { x: cx + rx * KAPPA, y: cy - ry }, cornerType: 'smooth' },
    ];
    return { id, closed: true, points: pts };
  }

  if (toolId === 'triangle') {
    return { id, closed: true, points: [corner(cx, y), corner(x + w, y + h), corner(x, y + h)] };
  }

  if (toolId === 'polygon' || toolId === 'customShape') {
    const n = toolId === 'customShape' ? 10 : Math.max(3, sides);
    const pts: AnchorPoint[] = [];
    const star = toolId === 'customShape';
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const rr = star && i % 2 ? 0.45 : 1;
      pts.push(corner(cx + Math.cos(ang) * rx * rr, cy + Math.sin(ang) * ry * rr));
    }
    return { id, closed: true, points: pts };
  }

  if (toolId === 'line') {
    // thin quad along the drag direction
    return { id, closed: true, points: [corner(x, y), corner(x + w, y + h), corner(x + w, y + h), corner(x, y)] };
  }

  // rectangle / roundedRectangle
  return {
    id,
    closed: true,
    points: [corner(x, y), corner(x + w, y), corner(x + w, y + h), corner(x, y + h)],
  };
}
