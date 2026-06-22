/**
 * Color math for photographic adjustments — sRGB <-> linear-light conversions and helpers.
 * Tonal/color adjustments should operate in LINEAR light (convert in, do the math, convert
 * back, clamp once) so they behave like a camera instead of crushing/​color-shifting in
 * gamma-encoded space.
 */

// Rec.709 luminance weights (for LINEAR rgb).
export const LUM_R = 0.2126;
export const LUM_G = 0.7152;
export const LUM_B = 0.0722;

/** Precomputed sRGB(8-bit) -> linear(0..1) LUT. */
export const SRGB_TO_LINEAR = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const cn = i / 255;
    t[i] = cn <= 0.04045 ? cn / 12.92 : ((cn + 0.055) / 1.055) ** 2.4;
  }
  return t;
})();

/** sRGB 8-bit -> linear 0..1. */
export function srgbToLinear(c8: number): number {
  return SRGB_TO_LINEAR[c8 < 0 ? 0 : c8 > 255 ? 255 : c8 | 0];
}

/** linear 0..1 -> sRGB 8-bit (clamped, rounded). */
export function linearToSrgb8(lin: number): number {
  if (lin <= 0) return 0;
  if (lin >= 1) return 255;
  const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055;
  const v = Math.round(s * 255);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Linear luminance from linear rgb (0..1). */
export function linearLuminance(r: number, g: number, b: number): number {
  return LUM_R * r + LUM_G * g + LUM_B * b;
}

/** Perceptual luminance from sRGB 8-bit values (for hue-preserving saturation/vibrance). */
export function srgbLuminance(r: number, g: number, b: number): number {
  return LUM_R * r + LUM_G * g + LUM_B * b;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Hermite smoothstep; tolerates edge0 > edge1 (reversed ramp). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const d = edge1 - edge0;
  if (d === 0) return x < edge0 ? 0 : 1;
  let t = (x - edge0) / d;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}
