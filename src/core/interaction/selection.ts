/**
 * Selection rasterization and marching-ants geometry.
 *
 * A selection is authoritative as a 0/255 mask in artboard pixel space. Marquee/lasso/
 * magic all rasterize to this so edits can clip against it (B7) and the overlay can trace
 * an accurate boundary (B20).
 */
import type { SelectionData, AnchorPoint } from '../../types';

/** Rasterize any selection to a width*height 0/255 mask (artboard pixel space). */
export function rasterizeSelection(
  sel: SelectionData,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);

  if (sel.type === 'magic' && sel.mask) {
    // The magic mask is already in artboard space; copy/clip to size.
    const mw = sel.maskWidth ?? width;
    const mh = sel.maskHeight ?? height;
    for (let y = 0; y < Math.min(height, mh); y++) {
      for (let x = 0; x < Math.min(width, mw); x++) {
        mask[y * width + x] = sel.mask[y * mw + x] ? 255 : 0;
      }
    }
    return mask;
  }

  if ((sel.type === 'rect' || sel.type === 'ellipse') && sel.bounds) {
    const { x, y, width: w, height: h } = sel.bounds;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(width, Math.ceil(x + w));
    const y1 = Math.min(height, Math.ceil(y + h));
    if (sel.type === 'rect') {
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * width;
        for (let xx = x0; xx < x1; xx++) mask[row + xx] = 255;
      }
    } else {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      if (rx <= 0 || ry <= 0) return mask;
      for (let yy = y0; yy < y1; yy++) {
        const ny = (yy + 0.5 - cy) / ry;
        const row = yy * width;
        for (let xx = x0; xx < x1; xx++) {
          const nx = (xx + 0.5 - cx) / rx;
          if (nx * nx + ny * ny <= 1) mask[row + xx] = 255;
        }
      }
    }
    return mask;
  }

  if ((sel.type === 'polygon' || sel.type === 'path') && sel.path) {
    const pts = sel.path.points;
    if (pts.length < 3) return mask;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const x0 = Math.max(0, Math.floor(minX));
    const y0 = Math.max(0, Math.floor(minY));
    const x1 = Math.min(width, Math.ceil(maxX));
    const y1 = Math.min(height, Math.ceil(maxY));
    for (let yy = y0; yy < y1; yy++) {
      const py = yy + 0.5;
      const row = yy * width;
      for (let xx = x0; xx < x1; xx++) {
        if (pointInPolygon(xx + 0.5, py, pts)) mask[row + xx] = 255;
      }
    }
    return mask;
  }

  return mask;
}

export function pointInPolygon(px: number, py: number, pts: AnchorPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Bounding box of the selection in artboard space, or null if empty. */
export function maskBounds(
  mask: Uint8Array,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Extract the pixel-boundary edges of a mask as line segments [x1,y1,x2,y2] in
 * artboard space. Stroking these with an animated dash yields marching ants that
 * follow the true selection shape (works for arbitrary magic-wand masks too).
 */
export function maskBoundarySegments(
  mask: Uint8Array,
  width: number,
  height: number
): number[] {
  const seg: number[] = [];
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] !== 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x, y - 1)) seg.push(x, y, x + 1, y); // top
      if (!inside(x, y + 1)) seg.push(x, y + 1, x + 1, y + 1); // bottom
      if (!inside(x - 1, y)) seg.push(x, y, x, y + 1); // left
      if (!inside(x + 1, y)) seg.push(x + 1, y, x + 1, y + 1); // right
    }
  }
  return seg;
}

export function selectionIsEmpty(sel: SelectionData | null): boolean {
  if (!sel) return true;
  if (sel.type === 'magic') return !sel.mask;
  if (sel.bounds) return sel.bounds.width < 1 || sel.bounds.height < 1;
  if (sel.path) return sel.path.points.length < 3;
  return true;
}
