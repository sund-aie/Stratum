/**
 * Part A composite-cache test: rendering twice with only the viewport changed rebuilds the
 * composite once; changing the document revision forces exactly one more build.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Document } from '../../types';

class FakeImageData {
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
}

function fakeCtx(canvas: any): any {
  return {
    canvas,
    setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {}, save() {}, restore() {},
    translate() {}, scale() {}, rotate() {}, beginPath() {}, rect() {}, clip() {}, ellipse() {}, arc() {},
    moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {}, stroke() {}, fill() {},
    setLineDash() {}, drawImage() {}, putImageData() {}, fillText() {}, font: '',
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: (x: number, y: number, w: number, h: number) => new FakeImageData(w, h),
  };
}
function fakeCanvas(): any {
  const c: any = { width: 0, height: 0 };
  c.getContext = () => fakeCtx(c);
  return c;
}

beforeAll(() => {
  (globalThis as any).ImageData = FakeImageData;
  (globalThis as any).window = { devicePixelRatio: 1 };
  (globalThis as any).document = { createElement: (t: string) => (t === 'canvas' ? fakeCanvas() : {}) };
  (globalThis as any).Path2D = class { rect() {} ellipse() {} moveTo() {} lineTo() {} bezierCurveTo() {} closePath() {} };
});

function doc(): Document {
  return {
    id: 'd',
    name: 'T',
    activeArtboardId: 'ab',
    artboards: [{ id: 'ab', name: 'A', x: 0, y: 0, width: 64, height: 48, locked: false }],
    layers: [{ id: 'r', name: 'L', type: 'raster', visible: true, locked: false, opacity: 1, blendMode: 'normal', order: 0, width: 64, height: 48, pixelData: new FakeImageData(64, 48) } as any],
    history: [],
    historyIndex: -1,
    metadata: { createdAt: new Date(), modifiedAt: new Date(), version: '1', colorProfile: 'sRGB', bitsPerChannel: 8 },
  };
}

const vp = (panX: number) => ({ zoom: 1, panX, panY: 0, rulerVisible: false, gridVisible: false, guidesVisible: true, snapToGrid: false, snapToGuides: true, pixelPreview: false });

describe('composite cache (Part A)', () => {
  it('viewport-only changes reuse the cache; a revision bump rebuilds once', async () => {
    const { CanvasEngine } = await import('../engine/CanvasEngine');
    const engine = new CanvasEngine(fakeCanvas());
    engine.resize(800, 600);
    const d = doc();

    const base = { document: d, selection: null, desktop: '#5d5d5d', antsOffset: 0, activeLayerId: 'r' };

    engine.render({ ...base, viewport: vp(0) as any, revision: 1 });
    expect(engine.compositeBuilds).toBe(1);

    // same revision, different viewport (pan) → no rebuild
    engine.render({ ...base, viewport: vp(50) as any, revision: 1 });
    expect(engine.compositeBuilds).toBe(1);

    // revision bump → exactly one more build
    engine.render({ ...base, viewport: vp(50) as any, revision: 2 });
    expect(engine.compositeBuilds).toBe(2);

    // explicit invalidation also rebuilds
    engine.invalidateComposite();
    engine.render({ ...base, viewport: vp(50) as any, revision: 2 });
    expect(engine.compositeBuilds).toBe(3);
  });
});
