import { describe, it, expect } from 'vitest';
import { mapBlend } from '../engine/CanvasEngine';
import { floodFill } from '../interaction/paintOps';
import { rasterizeSelection } from '../interaction/selection';
import type { SelectionData } from '../../types';

// Minimal ImageData-like shim for Node (paintOps only touches width/height/data).
function makeImg(w: number, h: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width: w, height: h, data } as unknown as ImageData;
}

describe('blend-mode mapping', () => {
  it('maps to valid canvas composite ops', () => {
    expect(mapBlend('normal')).toBe('source-over');
    expect(mapBlend('passthrough')).toBe('source-over');
    expect(mapBlend('multiply')).toBe('multiply');
    expect(mapBlend('soft-light')).toBe('soft-light');
    expect(mapBlend('luminosity')).toBe('luminosity');
  });
});

describe('flood fill', () => {
  it('fills a contiguous uniform region and respects tolerance', () => {
    const img = makeImg(4, 4, [255, 255, 255, 255]);
    // paint a red barrier column at x=2
    for (let y = 0; y < 4; y++) {
      const i = (y * 4 + 2) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 0;
      img.data[i + 2] = 0;
    }
    floodFill(img, 0, 0, { r: 0, g: 0, b: 255, a: 1 }, 10, null);
    // left of the barrier should be blue
    const left = (0 * 4 + 0) * 4;
    expect([img.data[left], img.data[left + 1], img.data[left + 2]]).toEqual([0, 0, 255]);
    // right of the barrier should remain white (not reached)
    const right = (0 * 4 + 3) * 4;
    expect([img.data[right], img.data[right + 1], img.data[right + 2]]).toEqual([255, 255, 255]);
  });

  it('clips to a selection mask', () => {
    const img = makeImg(4, 4, [255, 255, 255, 255]);
    const mask = new Uint8Array(16);
    mask[0] = 255; // only pixel (0,0) selected
    floodFill(img, 0, 0, { r: 0, g: 0, b: 0, a: 1 }, 255, mask);
    expect(img.data[3]).toBe(255); // alpha set on (0,0)
    expect(img.data[0]).toBe(0);
    // neighbour (1,0) must be untouched
    const n = (0 * 4 + 1) * 4;
    expect(img.data[n]).toBe(255);
  });
});

describe('selection rasterization', () => {
  it('rasterizes a rect selection', () => {
    const sel: SelectionData = { type: 'rect', bounds: { x: 1, y: 1, width: 2, height: 2 }, antiAlias: false };
    const m = rasterizeSelection(sel, 4, 4);
    expect(m[0]).toBe(0); // (0,0) outside
    expect(m[1 * 4 + 1]).toBe(255); // (1,1) inside
    expect(m[2 * 4 + 2]).toBe(255); // (2,2) inside
    let count = 0;
    for (let i = 0; i < m.length; i++) if (m[i]) count++;
    expect(count).toBe(4);
  });

  it('rasterizes an ellipse roughly centered', () => {
    const sel: SelectionData = { type: 'ellipse', bounds: { x: 0, y: 0, width: 10, height: 10 }, antiAlias: false };
    const m = rasterizeSelection(sel, 10, 10);
    expect(m[5 * 10 + 5]).toBe(255); // center inside
    expect(m[0]).toBe(0); // corner outside
  });
});
