/**
 * Image input + document/layer factories (B13).
 * Open creates a new document sized to the image; Place adds a layer to the current doc;
 * New raster layer allocates a transparent ImageData so paint tools have a buffer.
 */
import type { Document, RasterLayer, Layer, Artboard, RGBAColor } from '../../types';

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Decode any image File/Blob to ImageData via an offscreen canvas. */
export async function fileToImageData(file: Blob): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || (img as any).width;
    c.height = img.naturalHeight || (img as any).height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function dataURLToImageData(dataURL: string): Promise<ImageData> {
  return loadImage(dataURL).then((img) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  });
}

export function imageDataToDataURL(data: ImageData): string {
  const c = document.createElement('canvas');
  c.width = data.width;
  c.height = data.height;
  c.getContext('2d')!.putImageData(data, 0, 0);
  return c.toDataURL('image/png');
}

export function transparentImageData(width: number, height: number): ImageData {
  return new ImageData(width, height); // all zero = transparent
}

export function filledImageData(width: number, height: number, color: RGBAColor): ImageData {
  const d = new ImageData(width, height);
  const data = d.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = Math.round(color.a * 255);
  }
  return d;
}

export function newRasterLayer(
  name: string,
  width: number,
  height: number,
  order: number,
  pixelData?: ImageData,
  locked = false
): RasterLayer {
  return {
    id: uid('layer'),
    name,
    type: 'raster',
    visible: true,
    locked,
    opacity: 1,
    blendMode: 'normal',
    order,
    width,
    height,
    pixelData: pixelData ?? transparentImageData(width, height),
  };
}

export function makeArtboard(width: number, height: number, bg?: RGBAColor): Artboard {
  return {
    id: uid('artboard'),
    name: 'Artboard 1',
    x: 0,
    y: 0,
    width,
    height,
    backgroundColor: bg,
    locked: false,
  };
}

export function newDocument(
  name: string,
  width: number,
  height: number,
  background: 'white' | 'transparent' | RGBAColor
): Document {
  const layers: Layer[] = [];
  let bgColor: RGBAColor | undefined;
  if (background === 'white') {
    bgColor = { r: 255, g: 255, b: 255, a: 1 };
    layers.push(newRasterLayer('Background', width, height, 0, filledImageData(width, height, bgColor), false));
  } else if (background !== 'transparent') {
    bgColor = background;
    layers.push(newRasterLayer('Background', width, height, 0, filledImageData(width, height, bgColor), false));
  }
  return {
    id: uid('doc'),
    name,
    artboards: [makeArtboard(width, height, bgColor)],
    activeArtboardId: '',
    layers,
    history: [],
    historyIndex: -1,
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: '1.0.0',
      colorProfile: 'sRGB',
      bitsPerChannel: 8,
    },
  } as Document;
}

export function documentFromImageData(data: ImageData, name: string): Document {
  const doc = newDocument(name, data.width, data.height, 'transparent');
  doc.layers = [newRasterLayer(name, data.width, data.height, 0, data)];
  // fix activeArtboardId
  doc.activeArtboardId = doc.artboards[0].id;
  return doc;
}

/** Open a file picker; resolves with selected files (or empty). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
    // Safari needs the element in DOM in some cases; click works without for evergreen.
    input.click();
  });
}
