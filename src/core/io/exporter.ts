/**
 * Export (PNG/JPEG/WebP) and project save/load (.stratum JSON).
 * Uses <a download> / object URLs — never localStorage for document data.
 */
import type { Document, Layer, RasterLayer } from '../../types';
import type { CanvasEngine } from '../engine/CanvasEngine';
import { imageDataToDataURL, dataURLToImageData } from './imageIO';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportDocument(
  engine: CanvasEngine,
  doc: Document,
  format: 'png' | 'jpeg' | 'webp',
  quality = 0.92
): Promise<void> {
  const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
  const canvas = engine.composeArtboardCopy(doc, format === 'jpeg');
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, format === 'png' ? undefined : quality)
  );
  if (!blob) throw new Error('Export failed');
  const ext = format === 'jpeg' ? 'jpg' : format;
  downloadBlob(blob, `${sanitize(doc.name)}.${ext}`);
}

function sanitize(name: string): string {
  return name.replace(/[^\w.-]+/g, '_') || 'untitled';
}

interface SerializedLayer {
  [k: string]: unknown;
  pixelDataURL?: string;
}

/** Serialize a document to a portable JSON string (raster pixels -> PNG dataURL). */
export function serializeProject(doc: Document): string {
  const layers = doc.layers.map((layer) => {
    if (layer.type === 'raster' && (layer as RasterLayer).pixelData) {
      const { pixelData, ...rest } = layer as RasterLayer;
      return { ...rest, pixelDataURL: imageDataToDataURL(pixelData!) } as SerializedLayer;
    }
    return { ...layer } as SerializedLayer;
  });
  return JSON.stringify(
    { format: 'stratum', version: 1, document: { ...doc, layers } },
    (_k, v) => (v instanceof Date ? { __date: v.toISOString() } : v)
  );
}

export function saveProject(doc: Document): void {
  const blob = new Blob([serializeProject(doc)], { type: 'application/json' });
  downloadBlob(blob, `${sanitize(doc.name)}.stratum`);
}

export async function loadProject(file: Blob): Promise<Document> {
  const text = await file.text();
  const parsed = JSON.parse(text, (_k, v) =>
    v && typeof v === 'object' && '__date' in v ? new Date((v as any).__date) : v
  );
  const doc: Document = parsed.document;
  const layers: Layer[] = [];
  for (const l of doc.layers as unknown as SerializedLayer[]) {
    if (l.pixelDataURL) {
      const data = await dataURLToImageData(l.pixelDataURL as string);
      const { pixelDataURL, ...rest } = l;
      layers.push({ ...(rest as any), pixelData: data });
    } else {
      layers.push(l as unknown as Layer);
    }
  }
  doc.layers = layers;
  return doc;
}
