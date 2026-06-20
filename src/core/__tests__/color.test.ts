import { describe, it, expect } from 'vitest';
import { rgbToHsv, hsvToRgb, rgbToHsl, hslToRgb, hexToRgb, rgbToHex } from '../color/color';

describe('color conversions', () => {
  const samples = [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [123, 45, 200],
    [10, 200, 90],
  ];

  it('rgb -> hsv -> rgb round-trips', () => {
    for (const [r, g, b] of samples) {
      const { h, s, v } = rgbToHsv(r, g, b);
      const out = hsvToRgb(h, s, v);
      expect(Math.abs(out.r - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.g - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.b - b)).toBeLessThanOrEqual(1);
    }
  });

  it('rgb -> hsl -> rgb round-trips', () => {
    for (const [r, g, b] of samples) {
      const { h, s, l } = rgbToHsl(r, g, b);
      const out = hslToRgb(h, s, l);
      expect(Math.abs(out.r - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.g - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.b - b)).toBeLessThanOrEqual(1);
    }
  });

  it('hex parses and serializes', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgb('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 1 });
    expect(hexToRgb('nope')).toBeNull();
    expect(rgbToHex({ r: 16, g: 32, b: 48, a: 1 })).toBe('#102030');
  });
});
