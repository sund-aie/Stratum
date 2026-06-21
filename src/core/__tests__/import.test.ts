import { describe, it, expect, beforeAll } from 'vitest';
import type { CommandUI } from '../commands';

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

const noopUI = (): CommandUI => ({
  openNewDialog() {},
  openExportDialog() {},
  openColorPicker() {},
  openCanvasSizeDialog() {},
  openImageSizeDialog() {},
  toast() {},
});

describe('import preserves native resolution (Part A)', () => {
  it('opening a 1000×1000 image yields a 1000×1000 document', async () => {
    const { documentFromImageData } = await import('../io/imageIO');
    const doc = documentFromImageData(new (globalThis as any).ImageData(1000, 1000), 'p');
    expect(doc.artboards[0].width).toBe(1000);
    expect(doc.artboards[0].height).toBe(1000);
    const rl = doc.layers[0] as any;
    expect(rl.pixelData.width).toBe(1000);
    expect(rl.pixelData.height).toBe(1000);
  });

  it('placing a 2000×1500 image into an 800×600 doc keeps native size with a centering offset', async () => {
    const { getStore } = await import('../state/store');
    const { createCommands } = await import('../commands');
    const { newDocument } = await import('../io/imageIO');
    const store = getStore();
    store.dispatch({ type: 'SET_DOCUMENT', payload: newDocument('d', 800, 600, 'transparent') });
    const commands = createCommands({ engine: {} as any, controller: {} as any, ui: noopUI() });

    commands.placeData(new (globalThis as any).ImageData(2000, 1500), 'photo');

    const layers = store.getState().document!.layers;
    const placed = layers[layers.length - 1] as any;
    expect(placed.pixelData.width).toBe(2000); // NOT 800
    expect(placed.pixelData.height).toBe(1500); // NOT 600
    expect(placed.x).toBe(Math.round((800 - 2000) / 2)); // -600
    expect(placed.y).toBe(Math.round((600 - 1500) / 2)); // -450
  });
});

describe('paint/fill lands correctly on an offset full-res layer (Part A)', () => {
  it('fill clips into the right layer-local region', async () => {
    const { getStore } = await import('../state/store');
    const { createCommands } = await import('../commands');
    const { newDocument, newRasterLayer } = await import('../io/imageIO');
    const store = getStore();
    store.dispatch({ type: 'SET_DOCUMENT', payload: newDocument('d', 800, 600, 'transparent') });

    const layer = newRasterLayer('photo', 2000, 1500, 1, new (globalThis as any).ImageData(2000, 1500));
    layer.x = -600;
    layer.y = -450;
    store.dispatch({ type: 'ADD_LAYER', payload: layer });
    store.dispatch({ type: 'SET_ACTIVE_LAYER', payload: layer.id });
    store.dispatch({ type: 'SET_FOREGROUND', payload: { r: 255, g: 0, b: 0, a: 1 } });
    store.dispatch({
      type: 'SET_SELECTION',
      payload: { type: 'rect', bounds: { x: 100, y: 100, width: 40, height: 40 }, antiAlias: false },
    });

    const commands = createCommands({ engine: {} as any, controller: {} as any, ui: noopUI() });
    commands.fillForeground();

    const data = (store.getState().document!.layers.find((l) => l.id === layer.id) as any).pixelData.data as Uint8ClampedArray;
    // artboard (110,110) maps to layer-local (710,560) — inside the selection → red
    const inside = (560 * 2000 + 710) * 4;
    expect(data[inside]).toBe(255);
    expect(data[inside + 3]).toBe(255);
    // artboard (0,0) maps to layer-local (600,450) — outside the selection → untouched
    const outside = (450 * 2000 + 600) * 4;
    expect(data[outside + 3]).toBe(0);
  });
});
