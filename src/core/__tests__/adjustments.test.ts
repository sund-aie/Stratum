import { describe, it, expect, beforeAll } from 'vitest';
import { rgbToHsv } from '../color/color';

beforeAll(() => {
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
});

const pixel = (r: number, g: number, b: number) => {
  const d = new (globalThis as any).ImageData(1, 1) as ImageData;
  d.data[0] = r;
  d.data[1] = g;
  d.data[2] = b;
  d.data[3] = 255;
  return d;
};

describe('exposure (linear-light, no black-crush)', () => {
  it('+1 EV brightens mid-gray, −1 EV darkens, neither clamps to 0; 0 is a no-op', async () => {
    const { Adjustments } = await import('../engine/Adjustments');

    const up = Adjustments.apply(pixel(128, 128, 128), 'exposure', { exposure: 1 });
    expect(up.data[0]).toBeGreaterThan(140); // brighter
    expect(up.data[0]).toBeLessThan(255); // not clamped to white

    const down = Adjustments.apply(pixel(128, 128, 128), 'exposure', { exposure: -1 });
    expect(down.data[0]).toBeLessThan(116); // darker
    expect(down.data[0]).toBeGreaterThan(0); // NOT crushed to black

    const same = Adjustments.apply(pixel(128, 128, 128), 'exposure', { exposure: 0 });
    expect(same.data[0]).toBe(128); // no-op
  });
});

describe('tonal regions preserve hue', () => {
  it('a shadow lift brightens a saturated mid-tone while keeping its hue', async () => {
    const { Adjustments } = await import('../engine/Adjustments');
    const hueBefore = rgbToHsv(200, 100, 50).h;

    const out = Adjustments.apply(pixel(200, 100, 50), 'shadows', { shadows: 50 });
    const hueAfter = rgbToHsv(out.data[0], out.data[1], out.data[2]).h;

    // brighter overall
    expect(out.data[0] + out.data[1] + out.data[2]).toBeGreaterThan(350);
    // hue essentially unchanged (uniform linear scale preserves chromaticity)
    expect(Math.abs(hueAfter - hueBefore)).toBeLessThan(3);
  });

  it('highlights at 0 is a no-op', async () => {
    const { Adjustments } = await import('../engine/Adjustments');
    const out = Adjustments.apply(pixel(180, 90, 40), 'highlights', { highlights: 0 });
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([180, 90, 40]);
  });
});
