/**
 * Headless smoke test for the render pass. Stubs a 2D context + canvas so the full
 * compositing path (raster + vector + text + fill + adjustment, blend modes, overlays)
 * runs end-to-end without a browser and must not throw. Catches undefined access /
 * bad canvas API usage that tsc cannot.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Document, Layer } from '../../types';

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
  const ctx: any = {
    canvas,
    setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {},
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, font: '',
    beginPath() {}, rect() {}, clip() {}, ellipse() {}, arc() {},
    moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {},
    stroke() {}, fill() {}, setLineDash() {}, drawImage() {}, putImageData() {},
    fillText() {}, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: (x: number, y: number, w: number, h: number) => new FakeImageData(w, h),
  };
  return ctx;
}

function fakeCanvas(): any {
  const c: any = { width: 0, height: 0 };
  c.getContext = () => fakeCtx(c);
  c.toDataURL = () => 'data:,';
  return c;
}

beforeAll(() => {
  (globalThis as any).ImageData = FakeImageData;
  (globalThis as any).window = { devicePixelRatio: 2 };
  (globalThis as any).document = { createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas() : {}) };
  (globalThis as any).Path2D = class {
    rect() {}
    ellipse() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    closePath() {}
  };
});

describe('render pass smoke', () => {
  it('composites all layer types and overlays without throwing', async () => {
    const { CanvasEngine } = await import('../engine/CanvasEngine');
    const canvas = fakeCanvas();
    const engine = new CanvasEngine(canvas);
    engine.resize(800, 600);

    const baseLayer = (over: Partial<Layer>): Layer =>
      ({ id: over.id, name: 'L', visible: true, locked: false, opacity: 1, blendMode: 'normal', order: 0, ...over } as Layer);

    const doc: Document = {
      id: 'd',
      name: 'Test',
      activeArtboardId: 'ab',
      artboards: [{ id: 'ab', name: 'A', x: 0, y: 0, width: 64, height: 48, locked: false, backgroundColor: { r: 255, g: 255, b: 255, a: 1 } }],
      layers: [
        baseLayer({ id: 'r', type: 'raster', order: 0, width: 64, height: 48, pixelData: new (globalThis as any).ImageData(64, 48) } as any),
        baseLayer({ id: 'v', type: 'vector', order: 1, paths: [{ id: 'p', closed: true, points: [{ x: 1, y: 1, cornerType: 'corner' }, { x: 10, y: 1, cornerType: 'corner' }, { x: 10, y: 10, cornerType: 'corner' }] }], fill: { type: 'solid', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 } } as any),
        baseLayer({ id: 't', type: 'text', order: 2, text: 'Hi\nWorld', x: 4, y: 4, fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: { r: 0, g: 0, b: 0, a: 1 }, align: 'left', leading: 14, tracking: 0 } as any),
        baseLayer({ id: 'f', type: 'fill', order: 3, blendMode: 'multiply', fill: { type: 'solid', color: { r: 100, g: 100, b: 100, a: 1 }, opacity: 0.5 } } as any),
        baseLayer({ id: 'a', type: 'adjustment', order: 4, adjustmentType: 'exposure', settings: { exposure: 0.5 } } as any),
        baseLayer({ id: 'a2', type: 'adjustment', order: 5, adjustmentType: 'hsl', settings: {} } as any),
      ],
      history: [],
      historyIndex: -1,
      metadata: { createdAt: new Date(), modifiedAt: new Date(), version: '1', colorProfile: 'sRGB', bitsPerChannel: 8 },
    };

    const viewport = { zoom: 1.5, panX: 20, panY: 10, rulerVisible: true, gridVisible: false, guidesVisible: true, snapToGrid: false, snapToGuides: true, pixelPreview: false };

    expect(() =>
      engine.render({
        document: doc,
        viewport,
        selection: { type: 'rect', bounds: { x: 2, y: 2, width: 20, height: 20 }, antiAlias: false },
        overlay: { kind: 'marquee', shape: 'ellipse', x: 1, y: 1, w: 10, h: 10 },
        desktop: '#5d5d5d',
        antsOffset: 3,
        activeLayerId: 'r',
      })
    ).not.toThrow();

    expect(() => engine.composeArtboardCopy(doc, true)).not.toThrow();
  });
});
