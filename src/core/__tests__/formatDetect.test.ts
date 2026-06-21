import { describe, it, expect } from 'vitest';
import { detectImageFormat, extractRawPreview } from '../io/formatDetect';

const bytes = (...b: number[]) => new Uint8Array(b);

describe('detectImageFormat (Part B)', () => {
  it('PNG', () => {
    const f = detectImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
    expect(f.kind).toBe('png');
    expect(f.isRaw).toBe(false);
  });

  it('JPEG', () => {
    const f = detectImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0));
    expect(f.kind).toBe('jpeg');
    expect(f.isRaw).toBe(false);
  });

  it('TIFF (plain) is not RAW', () => {
    const f = detectImageFormat(bytes(0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(f.kind).toBe('tiff');
    expect(f.isRaw).toBe(false);
  });

  it('CR2 (Canon RAW) by magic', () => {
    const b = new Uint8Array(16);
    b.set([0x49, 0x49, 0x2a, 0x00]);
    b[8] = 0x43; // 'C'
    b[9] = 0x52; // 'R'
    b[10] = 0x02;
    const f = detectImageFormat(b);
    expect(f.kind).toBe('cr2');
    expect(f.isRaw).toBe(true);
  });

  it('RAF (Fujifilm RAW) by magic', () => {
    const b = new Uint8Array(16);
    'FUJIFILM'.split('').forEach((ch, i) => (b[i] = ch.charCodeAt(0)));
    const f = detectImageFormat(b);
    expect(f.isRaw).toBe(true);
    expect(f.label).toMatch(/Fuji/i);
  });

  it('NEF (TIFF-based) detected by extension', () => {
    const b = bytes(0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0, 0, 0, 0, 0);
    const f = detectImageFormat(b, 'shot.nef');
    expect(f.isRaw).toBe(true);
    expect(f.label).toMatch(/Nikon/);
  });

  it('CR3 (ISO-BMFF ftyp brand crx )', () => {
    const b = new Uint8Array(16);
    'ftyp'.split('').forEach((ch, i) => (b[4 + i] = ch.charCodeAt(0)));
    'crx '.split('').forEach((ch, i) => (b[8 + i] = ch.charCodeAt(0)));
    const f = detectImageFormat(b);
    expect(f.kind).toBe('cr3');
    expect(f.isRaw).toBe(true);
  });
});

describe('extractRawPreview (Part B)', () => {
  // Build a minimal JPEG stream: SOI, one SOFn segment (with dims/precision/components),
  // `pad` bytes of (FF-free) entropy, EOI.
  const jpegStream = (
    marker: number,
    w: number,
    h: number,
    comps: number,
    precision: number,
    pad: number
  ): number[] => {
    const sofLen = 8 + 3 * comps; // 2 len + precision + h(2) + w(2) + Nf + 3*Nf
    const out: number[] = [0xff, 0xd8, 0xff, marker, (sofLen >> 8) & 0xff, sofLen & 0xff, precision, (h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff, w & 0xff, comps];
    for (let i = 0; i < 3 * comps; i++) out.push(0);
    for (let i = 0; i < pad; i++) out.push(0x00);
    out.push(0xff, 0xd9);
    return out;
  };

  it('picks the largest decodable RGB preview, ignoring thumbnail and lossless mosaic', () => {
    const thumbnail = jpegStream(0xc0, 160, 120, 3, 8, 20); // tiny SOF0 RGB
    const preview = jpegStream(0xc0, 600, 400, 3, 8, 200); // larger-by-pixels SOF0 RGB (the answer)
    const mosaic = jpegStream(0xc3, 300, 300, 4, 14, 5000); // lossless SOF3, 4-comp 14-bit, largest by BYTES

    const buf = new Uint8Array([...thumbnail, 0, 0, ...preview, 0, 0, ...mosaic]);
    const result = extractRawPreview(buf);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(600);
    expect(result!.height).toBe(400);
    expect(result!.blob.type).toBe('image/jpeg');
  });

  it('returns null when the only stream is a lossless (SOF3) mosaic', () => {
    const mosaic = jpegStream(0xc3, 1336, 3516, 4, 14, 2000);
    expect(extractRawPreview(new Uint8Array(mosaic))).toBeNull();
  });

  it('returns null when no JPEG is present', () => {
    expect(extractRawPreview(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull();
  });
});
