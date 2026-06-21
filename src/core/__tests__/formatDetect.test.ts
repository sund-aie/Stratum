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
  const makeJpeg = (payload: number) => {
    const b = new Uint8Array(payload + 4);
    b[0] = 0xff;
    b[1] = 0xd8;
    b[b.length - 2] = 0xff;
    b[b.length - 1] = 0xd9;
    return b;
  };

  it('returns the largest embedded JPEG stream', () => {
    const small = makeJpeg(50); // 54 bytes (ignored, < 1024)
    const large = makeJpeg(1200); // 1204 bytes
    const buf = new Uint8Array(small.length + 5 + large.length);
    buf.set(small, 0);
    buf.set(large, small.length + 5);
    const blob = extractRawPreview(buf);
    expect(blob).not.toBeNull();
    expect(blob!.size).toBe(large.length);
  });

  it('returns null when no JPEG is present', () => {
    expect(extractRawPreview(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull();
  });
});
