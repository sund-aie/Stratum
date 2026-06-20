/**
 * Headless smoke test for the interaction spine. Simulates a brush gesture
 * (pointerdown -> move -> up) and asserts it actually mutates the active layer's
 * pixels in the foreground color and records exactly one undo step.
 */
import { describe, it, expect, beforeAll } from 'vitest';

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
    translate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, ellipse() {}, arc() {},
    moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {}, stroke() {}, fill() {},
    setLineDash() {}, drawImage() {}, putImageData() {}, fillText() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: (x: number, y: number, w: number, h: number) => new FakeImageData(w, h),
  };
}

function fakeCanvas(): any {
  const handlers: Record<string, ((e: any) => void)[]> = {};
  const c: any = {
    width: 0,
    height: 0,
    style: {},
    _handlers: handlers,
    getContext: () => fakeCtx(c),
    addEventListener: (t: string, fn: any) => ((handlers[t] = handlers[t] || []).push(fn)),
    removeEventListener: () => {},
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    fire: (t: string, e: any) => (handlers[t] || []).forEach((fn) => fn(e)),
  };
  return c;
}

const winHandlers: Record<string, ((e: any) => void)[]> = {};

beforeAll(() => {
  (globalThis as any).ImageData = FakeImageData;
  (globalThis as any).Path2D = class { rect() {} ellipse() {} moveTo() {} lineTo() {} bezierCurveTo() {} closePath() {} };
  (globalThis as any).requestAnimationFrame = (cb: any) => { cb(); return 0; };
  (globalThis as any).document = { createElement: (t: string) => (t === 'canvas' ? fakeCanvas() : {}) };
  (globalThis as any).window = {
    devicePixelRatio: 1,
    setInterval: () => 0,
    clearInterval: () => {},
    addEventListener: (t: string, fn: any) => ((winHandlers[t] = winHandlers[t] || []).push(fn)),
    removeEventListener: () => {},
  };
});

describe('interaction spine smoke', () => {
  it('a brush gesture paints the foreground color and records one undo step', async () => {
    const { getStore } = await import('../state/store');
    const { CanvasEngine } = await import('../engine/CanvasEngine');
    const { InteractionController } = await import('../interaction/InteractionController');
    const { newDocument } = await import('../io/imageIO');

    const store = getStore();
    const canvas = fakeCanvas();
    const engine = new CanvasEngine(canvas);
    engine.resize(800, 600);
    const controller = new InteractionController(canvas, engine);

    const doc = newDocument('t', 40, 40, 'white');
    doc.activeArtboardId = doc.artboards[0].id;
    store.dispatch({ type: 'SET_DOCUMENT', payload: doc });
    store.dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'brush' });
    store.dispatch({ type: 'SET_FOREGROUND', payload: { r: 255, g: 0, b: 0, a: 1 } });

    const undosBefore = (store as any).undoStack?.length ?? 0;

    const ev = (clientX: number, clientY: number) => ({
      button: 0, buttons: 1, pointerId: 1, clientX, clientY,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, pressure: 1, pointerType: 'mouse',
      preventDefault() {},
    });

    canvas.fire('pointerdown', ev(20, 20));
    canvas.fire('pointermove', ev(24, 20));
    (winHandlers['pointerup'] || []).forEach((fn) => fn(ev(24, 20)));

    const bg = store.getState().document!.layers.find((l) => l.id === store.getState().activeLayerId)!;
    const data = (bg as any).pixelData.data as Uint8ClampedArray;
    // find a painted (red) pixel
    let painted = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] < 60) {
        painted = true;
        break;
      }
    }
    expect(painted).toBe(true);
    expect((store as any).undoStack.length).toBe(undosBefore + 1);
  });
});
