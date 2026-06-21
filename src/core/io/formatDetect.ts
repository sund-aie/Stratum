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

/**
 * Extract the largest embedded JPEG stream (FF D8 … FF D9) from a RAW container as a Blob.
 * This is the full-size preview in nearly all RAW/DNG files. Returns null if none found.
 */
export function extractRawPreview(bytes: Uint8Array): Blob | null {
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

  let best = -1;
  let bestEnd = -1;
  let bestLen = 0;
  for (const s of starts) {
    let end = -1;
    for (const e of ends) {
      if (e > s) {
        end = e;
        break;
      }
    }
    if (end < 0) continue;
    const len = end - s;
    if (len > bestLen) {
      bestLen = len;
      best = s;
      bestEnd = end;
    }
  }
  if (best < 0 || bestLen < 1024) return null; // ignore tiny/false matches
  return new Blob([bytes.slice(best, bestEnd)], { type: 'image/jpeg' });
}
