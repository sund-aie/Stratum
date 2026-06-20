import { describe, it, expect } from 'vitest';

// Node test env has no ImageData global; provide a minimal one matching both signatures.
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
      if (typeof a === 'number') {
        this.width = a;
        this.height = b;
        this.data = new Uint8ClampedArray(a * b * 4);
      } else {
        this.data = a;
        this.width = b;
        this.height = c!;
      }
    }
  };
}

import { strokeSegment, drawGradient, translateImageData, StampParams } from '../interaction/paintOps';

function img(w: number, h: number) {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } as unknown as ImageData;
}
const px = (im: ImageData, x: number, y: number) => {
  const i = (y * im.width + x) * 4;
  return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]];
};

describe('brush stamp (B5/B7)', () => {
  const params = (mask: Uint8Array | null): StampParams => ({
    size: 6,
    hardness: 100,
    strength: 1,
    mask,
    color: { r: 255, g: 0, b: 0, a: 1 },
  });
  const extra = { cloneSource: null, cloneOffset: null, exposure: 0.5, range: 'Midtones' };

  it('paints the foreground color (not hardcoded white)', () => {
    const im = img(12, 12);
    strokeSegment(im, 6, 6, 6, 6, 'brush', params(null), extra);
    const [r, g, b, a] = px(im, 6, 6);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
    expect(a).toBeGreaterThan(200);
  });

  it('respects a selection mask (clips writes)', () => {
    const im = img(12, 12);
    const mask = new Uint8Array(12 * 12); // all zero = nothing selected
    strokeSegment(im, 6, 6, 6, 6, 'brush', params(mask), extra);
    expect(px(im, 6, 6)[3]).toBe(0); // untouched
  });
});

describe('gradient direction (fg -> bg)', () => {
  it('runs foreground at the start and background at the end', () => {
    const im = img(10, 1);
    drawGradient(im, 0, 0, 9, 0, { r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }, 'Linear', false, null);
    expect(px(im, 0, 0)[0]).toBeLessThan(40); // near black at start
    expect(px(im, 9, 0)[0]).toBeGreaterThan(215); // near white at end
  });
});

describe('translateImageData', () => {
  it('shifts pixels and clears the vacated region', () => {
    const im = img(4, 4);
    // set (0,0) to opaque green
    im.data[0] = 0;
    im.data[1] = 255;
    im.data[2] = 0;
    im.data[3] = 255;
    const out = translateImageData(im, 1, 0);
    expect(px(out, 1, 0)).toEqual([0, 255, 0, 255]);
    expect(px(out, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});
