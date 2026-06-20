import { describe, it, expect } from 'vitest';
import { screenToArtboard, artboardToScreen, ViewTransform } from '../interaction/coords';

describe('coordinate transform', () => {
  const cases: ViewTransform[] = [
    { zoom: 1, panX: 0, panY: 0, originX: 0, originY: 0 },
    { zoom: 2.5, panX: 120, panY: -40, originX: 0, originY: 0 },
    { zoom: 0.33, panX: -10, panY: 200, originX: 5, originY: 7 },
  ];
  const rect = { left: 50, top: 30 };

  it('screen -> artboard -> screen round-trips', () => {
    for (const vt of cases) {
      for (const [cx, cy] of [
        [100, 100],
        [400, 250],
        [55, 900],
      ]) {
        const ab = screenToArtboard(cx, cy, rect, vt);
        const back = artboardToScreen(ab.x, ab.y, vt);
        // artboardToScreen returns CSS px relative to canvas; add rect to compare to client
        expect(Math.abs(back.x + rect.left - cx)).toBeLessThan(1e-6);
        expect(Math.abs(back.y + rect.top - cy)).toBeLessThan(1e-6);
      }
    }
  });

  it('identity transform maps client to canvas-local', () => {
    const ab = screenToArtboard(60, 40, rect, cases[0]);
    expect(ab).toEqual({ x: 10, y: 10 });
  });
});
