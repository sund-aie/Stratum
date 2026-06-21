/**
 * Image format detection by magic bytes (not just extension) + RAW embedded-preview
 * extraction. Browsers can't develop camera RAW; for RAW files we surface the embedded
 * full-size JPEG preview that virtually all RAW/DNG containers carry.
 */

export interface FormatInfo {
  kind: string;
  mime: string;
  isRaw: boolean;
  label: string;
}

function ascii(b: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(b[off + i] || 0);
  return s;
}

function extOf(filename?: string): string {
  if (!filename) return '';
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

const RAW_EXT_VENDOR: Record<string, string> = {
  nef: 'Nikon',
  dng: 'DNG',
  arw: 'Sony',
  orf: 'Olympus',
  rw2: 'Panasonic',
  cr2: 'Canon',
  cr3: 'Canon',
  raf: 'Fujifilm',
};

/** Detect an image format from the first bytes (and, for TIFF-based RAW, the filename). */
export function detectImageFormat(bytes: Uint8Array, filename?: string): FormatInfo {
  const b = bytes;

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { kind: 'png', mime: 'image/png', isRaw: false, label: 'PNG' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { kind: 'jpeg', mime: 'image/jpeg', isRaw: false, label: 'JPEG' };
  if (ascii(b, 0, 4) === 'GIF8')
    return { kind: 'gif', mime: 'image/gif', isRaw: false, label: 'GIF' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP')
    return { kind: 'webp', mime: 'image/webp', isRaw: false, label: 'WebP' };
  if (b[0] === 0x42 && b[1] === 0x4d)
    return { kind: 'bmp', mime: 'image/bmp', isRaw: false, label: 'BMP' };
  if (ascii(b, 0, 8) === 'FUJIFILM')
    return { kind: 'raf', mime: 'image/x-fuji-raf', isRaw: true, label: 'RAF (Fujifilm RAW)' };

  // ISO-BMFF (ftyp) — AVIF / HEIC / CR3.
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand === 'crx ') return { kind: 'cr3', mime: 'image/x-canon-cr3', isRaw: true, label: 'CR3 (Canon RAW)' };
    if (/avif|avis/.test(brand)) return { kind: 'avif', mime: 'image/avif', isRaw: false, label: 'AVIF' };
    if (/heic|heix|heif|mif1|msf1|hevc/.test(brand))
      return { kind: 'heic', mime: 'image/heic', isRaw: false, label: 'HEIC/HEIF' };
  }

  // TIFF (II*\0 little-endian or MM\0* big-endian); CR2 and many RAWs are TIFF-based.
  const tiffLE = b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00;
  const tiffBE = b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a;
  if (tiffLE || tiffBE) {
    if (tiffLE && b[8] === 0x43 && b[9] === 0x52 && b[10] === 0x02)
      return { kind: 'cr2', mime: 'image/x-canon-cr2', isRaw: true, label: 'CR2 (Canon RAW)' };
    const e = extOf(filename);
    if (e in RAW_EXT_VENDOR && e !== 'tif' && e !== 'tiff')
      return { kind: e, mime: `image/x-${e}`, isRaw: true, label: `${e.toUpperCase()} (${RAW_EXT_VENDOR[e]} RAW)` };
    return { kind: 'tiff', mime: 'image/tiff', isRaw: false, label: 'TIFF' };
  }

  // Couldn't sniff — fall back to extension for known RAW types.
  const e = extOf(filename);
  if (e in RAW_EXT_VENDOR)
    return { kind: e, mime: `image/x-${e}`, isRaw: true, label: `${e.toUpperCase()} (${RAW_EXT_VENDOR[e]} RAW)` };
  return { kind: 'unknown', mime: 'application/octet-stream', isRaw: false, label: e ? e.toUpperCase() : 'Unknown' };
}

export interface RawPreview {
  blob: Blob;
  width: number;
  height: number;
}

interface SofInfo {
  marker: number;
  precision: number;
  width: number;
  height: number;
  components: number;
}

/**
 * Parse the first Start-Of-Frame marker within a JPEG stream [start, end).
 * Returns its marker code, bit precision, dimensions, and component count.
 */
function readSof(bytes: Uint8Array, start: number, end: number): SofInfo | null {
  let p = start + 2; // skip SOI
  while (p + 1 < end) {
    if (bytes[p] !== 0xff) {
      p++;
      continue;
    }
    // Collapse any fill 0xFF bytes; `m` lands on the marker code.
    let m = p + 1;
    while (m < end && bytes[m] === 0xff) m++;
    if (m >= end) break;
    const marker = bytes[m];
    // Standalone markers (no length): TEM, RSTn, SOI, EOI.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      p = m + 1;
      continue;
    }
    if (m + 2 >= end) break;
    const len = (bytes[m + 1] << 8) | bytes[m + 2];
    if (len < 2) break;
    // SOFn = 0xC0..0xCF, excluding C4 (DHT), C8 (JPG), CC (DAC).
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (m + 8 >= end) break;
      const precision = bytes[m + 3];
      const height = (bytes[m + 4] << 8) | bytes[m + 5];
      const width = (bytes[m + 6] << 8) | bytes[m + 7];
      const components = bytes[m + 8];
      return { marker, precision, width, height, components };
    }
    if (marker === 0xda) break; // SOS — entropy data begins; SOF would precede it
    p = m + 1 + len;
  }
  return null;
}

/**
 * Extract a RAW container's embedded, browser-decodable RGB preview.
 *
 * RAW files embed several JPEG streams: a tiny thumbnail, a full-size RGB preview, and the
 * sensor mosaic itself encoded as lossless JPEG (SOF3, often 4-component / >8-bit and the
 * LARGEST by bytes). Browsers cannot decode lossless JPEG, so we must NOT pick by byte size.
 * Instead we inspect each stream's SOF marker and choose the largest-by-PIXELS stream that is
 * baseline/extended/progressive (SOF0/1/2), 3-component, 8-bit — i.e. the real preview.
 */
export function extractRawPreview(bytes: Uint8Array): RawPreview | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] === 0xff) {
      const n = bytes[i + 1];
      if (n === 0xd8) starts.push(i);
      else if (n === 0xd9) ends.push(i + 2);
    }
  }
  if (!starts.length || !ends.length) return null;

  let best: { start: number; end: number; w: number; h: number } | null = null;
  for (const start of starts) {
    let end = -1;
    for (const e of ends) {
      if (e > start) {
        end = e;
        break;
      }
    }
    if (end < 0) continue;
    const sof = readSof(bytes, start, end);
    if (!sof) continue;
    const decodable =
      (sof.marker === 0xc0 || sof.marker === 0xc1 || sof.marker === 0xc2) &&
      sof.components === 3 &&
      sof.precision === 8;
    if (!decodable) continue; // rejects the SOF3 lossless mosaic and odd-format streams
    const area = sof.width * sof.height;
    if (!best || area > best.w * best.h) best = { start, end, w: sof.width, h: sof.height };
  }
  if (!best) return null;
  return {
    blob: new Blob([bytes.slice(best.start, best.end)], { type: 'image/jpeg' }),
    width: best.w,
    height: best.h,
  };
}
