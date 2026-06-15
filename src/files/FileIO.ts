/**
 * Unified Canvas - File I/O
 * Import images, Export PNG/JPEG/SVG, Save/Load JSON project
 */

// Import image from file/URL
export async function importImage(file: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (typeof file === 'string') {
      img.src = file;
    } else {
      img.src = URL.createObjectURL(file);
    }
  });
}

// Import multiple images
export async function importImages(files: FileList | File[]): Promise<HTMLImageElement[]> {
  const promises = Array.from(files).map(f => importImage(f));
  return Promise.all(promises);
}

// Create a raster layer from an image
import type { Layer, Document } from '../types';

export function createRasterLayerFromImage(
  img: HTMLImageElement, 
  x: number = 0, 
  y: number = 0,
  name: string = 'Image'
): Layer {
  // Create offscreen canvas to get ImageData
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  return {
    id: crypto.randomUUID(),
    name,
    type: 'raster',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    zIndex: Date.now(),
    transform: {
      x, y,
      scaleX: 1, scaleY: 1,
      rotation: 0,
      originX: img.width / 2,
      originY: img.height / 2,
      flipX: false, flipY: false,
    },
    rasterData: {
      imageData,
      width: img.width,
      height: img.height,
    },
  };
}

// Export document to PNG
export async function exportPNG(document: Document, options: ExportOptions = {}): Promise<Blob> {
  const canvas = await renderDocumentToCanvas(document, options.scale || 1);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create PNG')),
      'image/png',
      options.quality
    );
  });
}

// Export document to JPEG
export async function exportJPEG(document: Document, options: ExportOptions = {}): Promise<Blob> {
  const canvas = await renderDocumentToCanvas(document, options.scale || 1);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create JPEG')),
      'image/jpeg',
      options.quality || 0.9
    );
  });
}

// Export document to WebP
export async function exportWebP(document: Document, options: ExportOptions = {}): Promise<Blob> {
  const canvas = await renderDocumentToCanvas(document, options.scale || 1);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create WebP')),
      'image/webp',
      options.quality || 0.9
    );
  });
}

// Export document to SVG (vector layers only)
export async function exportSVG(document: Document): Promise<string> {
  const vectorLayers = document.layers.filter(l => l.type === 'vector' && l.visible);
  
  if (vectorLayers.length === 0) {
    // Fallback: embed as PNG
    const pngBlob = await exportPNG(document);
    const base64 = await blobToBase64(pngBlob);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}">
  <image width="${document.width}" height="${document.height}" href="data:image/png;base64,${base64}"/>
</svg>`;
  }
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">\n`;
  
  // Sort by z-index
  vectorLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  for (const layer of vectorLayers) {
    if (!layer.vectorData) continue;
    
    const opacity = layer.opacity !== 1 ? ` opacity="${layer.opacity}"` : '';
    const transform = layer.transformToSVG ? layer.transformToSVG() : '';
    
    svg += `  <g${opacity}${transform ? ` transform="${transform}"` : ''}>\n`;
    
    for (const pathData of layer.vectorData.paths) {
      const d = pathToSVGPath(pathData);
      const fill = fillToSVG(pathData.fill);
      const stroke = pathData.stroke ? ` stroke="${pathData.stroke.color}" stroke-width="${pathData.stroke.width}" stroke-linecap="${pathData.stroke.cap}" stroke-linejoin="${pathData.stroke.join}"` : ' stroke="none"';
      
      svg += `    <path d="${d}" fill="${fill}"${stroke} />\n`;
    }
    
    svg += '  </g>\n';
  }
  
  svg += '</svg>';
  return svg;
}

// Render document to canvas
async function renderDocumentToCanvas(document: Document, scale: number = 1): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = document.width * scale;
  canvas.height = document.height * scale;
  const ctx = canvas.getContext('2d')!;
  
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }
  
  // Fill background if needed
  if (document.backgroundColor) {
    ctx.fillStyle = document.backgroundColor;
    ctx.fillRect(0, 0, document.width, document.height);
  }
  
  // Render layers
  const sortedLayers = [...document.layers].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);
    
    // Apply transform
    ctx.translate(layer.transform.x, layer.transform.y);
    ctx.rotate(layer.transform.rotation);
    ctx.scale(layer.transform.scaleX * (layer.transform.flipX ? -1 : 1), layer.transform.scaleY * (layer.transform.flipY ? -1 : 1));
    ctx.translate(-layer.transform.originX, -layer.transform.originY);
    
    switch (layer.type) {
      case 'raster':
        if (layer.rasterData?.imageData) {
          if (layer.rasterData.imageData instanceof ImageData) {
            ctx.putImageData(layer.rasterData.imageData, 0, 0);
          }
        }
        break;
      case 'vector':
        renderVectorLayerToCtx(layer, ctx);
        break;
      case 'text':
        renderTextLayerToCtx(layer, ctx);
        break;
      case 'fill':
        renderFillLayerToCtx(layer, ctx, document.width, document.height);
        break;
    }
    
    ctx.restore();
  }
  
  return canvas;
}

function renderVectorLayerToCtx(layer: Layer, ctx: CanvasRenderingContext2D): void {
  if (!layer.vectorData) return;
  
  for (const path of layer.vectorData.paths) {
    ctx.beginPath();
    pathSegmentsToCtx(ctx, path.segments);
    if (path.closed) ctx.closePath();
    
    if (path.fill && path.fill.type !== 'none') {
      ctx.fillStyle = fillToCanvasStyle(path.fill, ctx);
      ctx.fill();
    }
    
    if (path.stroke) {
      ctx.strokeStyle = path.stroke.color;
      ctx.lineWidth = path.stroke.width;
      ctx.lineCap = path.stroke.cap;
      ctx.lineJoin = path.stroke.join;
      if (path.stroke.dash) ctx.setLineDash(path.stroke.dash);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function renderTextLayerToCtx(layer: Layer, ctx: CanvasRenderingContext2D): void {
  if (!layer.textData) return;
  
  const td = layer.textData;
  ctx.font = `${td.fontWeight} ${td.fontStyle} ${td.fontSize}px ${td.fontFamily}`;
  ctx.fillStyle = td.color;
  ctx.textBaseline = 'top';
  
  const lines = td.text.split('\n');
  const lineHeight = td.fontSize * td.lineHeight;
  
  lines.forEach((line, i) => {
    const x = 0;
    const y = i * lineHeight;
    
    let alignX = x;
    if (td.textAlign === 'center') alignX = x + ctx.measureText(line).width / 2;
    else if (td.textAlign === 'right') alignX = x + ctx.measureText(line).width;
    
    ctx.fillText(line, alignX, y);
  });
}

function renderFillLayerToCtx(layer: Layer, ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (!layer.fillData?.fill) return;
  ctx.fillStyle = fillToCanvasStyle(layer.fillData.fill, ctx);
  ctx.fillRect(0, 0, width, height);
}

function pathSegmentsToCtx(ctx: CanvasRenderingContext2D, segments: any[]): void {
  if (segments.length === 0) return;
  
  let first = true;
  for (const seg of segments) {
    if (first) {
      ctx.moveTo(seg.point.x, seg.point.y);
      first = false;
    }
    if (seg.type === 'line') {
      ctx.lineTo(seg.point.x, seg.point.y);
    } else if (seg.type === 'curve' && seg.cp1 && seg.cp2) {
      ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.point.x, seg.point.y);
    }
  }
}

// SVG conversion
function pathToSVGPath(pathData: any): string {
  let d = '';
  for (let i = 0; i < pathData.segments.length; i++) {
    const seg = pathData.segments[i];
    if (i === 0) {
      d += `M ${seg.point.x} ${seg.point.y} `;
    } else if (seg.type === 'line') {
      d += `L ${seg.point.x} ${seg.point.y} `;
    } else if (seg.type === 'curve' && seg.cp1 && seg.cp2) {
      d += `C ${seg.cp1.x} ${seg.cp1.y} ${seg.cp2.x} ${seg.cp2.y} ${seg.point.x} ${seg.point.y} `;
    }
  }
  if (pathData.closed) d += 'Z';
  return d.trim();
}

function fillToSVG(fill: any): string {
  if (!fill || fill.type === 'none') return 'none';
  if (fill.type === 'solid') return fill.color;
  // Gradient would need more complex SVG
  return fill.color || 'none';
}

function fillToCanvasStyle(fill: any, ctx: CanvasRenderingContext2D): string | CanvasGradient | CanvasPattern {
  if (!fill || fill.type === 'solid' || fill.type === undefined) {
    return fill.color || '#000';
  }
  if (fill.type === 'linearGradient' && fill.gradient) {
    const grad = ctx.createLinearGradient(0, 0, 100, 100);
    fill.gradient.stops.forEach((stop: any) => grad.addColorStop(stop.offset, stop.color));
    return grad;
  }
  if (fill.type === 'radialGradient' && fill.gradient) {
    const grad = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
    fill.gradient.stops.forEach((stop: any) => grad.addColorStop(stop.offset, stop.color));
    return grad;
  }
  return fill.color || '#000';
}

// Project save/load (JSON)
export interface ProjectFile {
  version: number;
  document: Document;
  metadata: {
    created: string;
    modified: string;
    version: string;
    author?: string;
  };
}

export function saveProject(document: Document): ProjectFile {
  return {
    version: 1,
    document: serializeDocument(document),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

export function loadProject(data: ProjectFile): Document {
  return deserializeDocument(data.document);
}

// Serialize document (convert ImageData to base64, etc.)
function serializeDocument(doc: Document): any {
  return {
    ...doc,
    layers: doc.layers.map(layer => serializeLayer(layer)),
  };
}

function serializeLayer(layer: any): any {
  const serialized = { ...layer };
  
  if (layer.rasterData?.imageData instanceof ImageData) {
    const imgData = layer.rasterData.imageData;
    const canvas = document.createElement('canvas');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imgData, 0, 0);
    serialized.rasterData = {
      ...layer.rasterData,
      imageData: canvas.toDataURL('image/png'),
      width: imgData.width,
      height: imgData.height,
    };
  }
  
  return serialized;
}

function deserializeDocument(doc: any): Document {
  return {
    ...doc,
    layers: doc.layers.map((layer: any) => deserializeLayer(layer)),
  };
}

async function deserializeLayer(layer: any): Promise<any> {
  const deserialized = { ...layer };
  
  if (layer.rasterData?.imageData && typeof layer.rasterData.imageData === 'string') {
    // Load base64 image
    const img = await importImage(layer.rasterData.imageData);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    deserialized.rasterData = {
      ...layer.rasterData,
      imageData: ctx.getImageData(0, 0, img.width, img.height),
    };
  }
  
  return deserialized;
}

// Download file helper
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}

// Copy to clipboard
export async function copyToClipboard(document: Document): Promise<void> {
  const canvas = await renderDocumentToCanvas(document);
  canvas.toBlob(async (blob) => {
    if (blob) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
      } catch (e) {
        console.error('Failed to copy to clipboard:', e);
      }
    }
  });
}

// File input helper
export function createFileInput(accept: string = 'image/*'): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.display = 'none';
  return input;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export options
export interface ExportOptions {
  scale?: number;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp' | 'svg';
  backgroundColor?: string;
  layers?: string[]; // Layer IDs to export (default: all visible)
}

function blendModeToCompositeOp(mode: string): GlobalCompositeOperation {
  const map: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    colorDodge: 'color-dodge',
    colorBurn: 'color-burn',
    hardLight: 'hard-light',
    softLight: 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
    hue: 'hue',
    saturation: 'saturation',
    color: 'color',
    luminosity: 'luminosity',
  };
  return map[mode] || 'source-over';
}

type GlobalCompositeOperation = 
  | 'source-over' | 'source-in' | 'source-out' | 'source-atop'
  | 'destination-over' | 'destination-in' | 'destination-out' | 'destination-atop'
  | 'lighter' | 'copy' | 'xor'
  | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';