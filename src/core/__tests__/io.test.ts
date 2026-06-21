import { describe, it, expect, beforeAll } from 'vitest';

// Minimal ImageData for Node so newDocument('white') can allocate a background buffer.
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

describe('newDocument factory', () => {
  it('stores resolution in metadata and sizes the artboard', async () => {
    const { newDocument } = await import('../io/imageIO');
    const doc = newDocument('Doc', 1920, 1080, 'transparent', 300);
    expect(doc.artboards[0].width).toBe(1920);
    expect(doc.artboards[0].height).toBe(1080);
    expect(doc.metadata.resolution).toBe(300);
    // transparent background => no Background layer
    expect(doc.layers.length).toBe(0);
  });

  it('white background creates a filled Background layer; resolution defaults to 72', async () => {
    const { newDocument } = await import('../io/imageIO');
    const doc = newDocument('Doc', 64, 48, 'white');
    expect(doc.metadata.resolution).toBe(72);
    expect(doc.layers.length).toBe(1);
    expect(doc.layers[0].type).toBe('raster');
  });
});
