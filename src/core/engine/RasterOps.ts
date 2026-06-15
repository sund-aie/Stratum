/**
 * Stratum Raster Operations Engine
 * Core pixel manipulation and compositing algorithms
 */

import type { RGBAColor, BlendMode } from '../../types';

// ============================================================================
// BLEND MODE IMPLEMENTATIONS
// ============================================================================

export class RasterOps {
  /**
   * Apply blend mode to two pixels
   */
  static blendPixels(
    base: RGBAColor,
    blend: RGBAColor,
    mode: BlendMode
  ): RGBAColor {
    const b = { r: base.r / 255, g: base.g / 255, b: base.b / 255, a: base.a };
    const l = { r: blend.r / 255, g: blend.g / 255, b: blend.b / 255, a: blend.a };

    let result: { r: number; g: number; b: number };

    switch (mode) {
      case 'normal':
        result = this.blendNormal(b, l);
        break;
      case 'multiply':
        result = this.blendMultiply(b, l);
        break;
      case 'screen':
        result = this.blendScreen(b, l);
        break;
      case 'overlay':
        result = this.blendOverlay(b, l);
        break;
      case 'darken':
        result = this.blendDarken(b, l);
        break;
      case 'lighten':
        result = this.blendLighten(b, l);
        break;
      case 'color-dodge':
        result = this.blendColorDodge(b, l);
        break;
      case 'color-burn':
        result = this.blendColorBurn(b, l);
        break;
      case 'hard-light':
        result = this.blendHardLight(b, l);
        break;
      case 'soft-light':
        result = this.blendSoftLight(b, l);
        break;
      case 'difference':
        result = this.blendDifference(b, l);
        break;
      case 'exclusion':
        result = this.blendExclusion(b, l);
        break;
      case 'hue':
        result = this.blendHue(b, l);
        break;
      case 'saturation':
        result = this.blendSaturation(b, l);
        break;
      case 'color':
        result = this.blendColor(b, l);
        break;
      case 'luminosity':
        result = this.blendLuminosity(b, l);
        break;
      default:
        result = this.blendNormal(b, l);
    }

    // Apply alpha compositing
    const outA = l.a + b.a * (1 - l.a);
    const outR = outA > 0 ? (result.r * l.a + b.r * b.a * (1 - l.a)) / outA : 0;
    const outG = outA > 0 ? (result.g * l.a + b.g * b.a * (1 - l.a)) / outA : 0;
    const outB = outA > 0 ? (result.b * l.a + b.b * b.a * (1 - l.a)) / outA : 0;

    return {
      r: Math.round(outR * 255),
      g: Math.round(outG * 255),
      b: Math.round(outB * 255),
      a: outA,
    };
  }

  private static blendNormal(b: any, l: any): { r: number; g: number; b: number } {
    return { r: l.r, g: l.g, b: l.b };
  }

  private static blendMultiply(b: any, l: any): { r: number; g: number; b: number } {
    return { r: b.r * l.r, g: b.g * l.g, b: b.b * l.b };
  }

  private static blendScreen(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: 1 - (1 - b.r) * (1 - l.r),
      g: 1 - (1 - b.g) * (1 - l.g),
      b: 1 - (1 - b.b) * (1 - l.b),
    };
  }

  private static blendOverlay(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: b.r < 0.5 ? 2 * b.r * l.r : 1 - 2 * (1 - b.r) * (1 - l.r),
      g: b.g < 0.5 ? 2 * b.g * l.g : 1 - 2 * (1 - b.g) * (1 - l.g),
      b: b.b < 0.5 ? 2 * b.b * l.b : 1 - 2 * (1 - b.b) * (1 - l.b),
    };
  }

  private static blendDarken(b: any, l: any): { r: number; g: number; b: number } {
    return { r: Math.min(b.r, l.r), g: Math.min(b.g, l.g), b: Math.min(b.b, l.b) };
  }

  private static blendLighten(b: any, l: any): { r: number; g: number; b: number } {
    return { r: Math.max(b.r, l.r), g: Math.max(b.g, l.g), b: Math.max(b.b, l.b) };
  }

  private static blendColorDodge(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: l.r === 1 ? 1 : Math.min(1, b.r / (1 - l.r)),
      g: l.g === 1 ? 1 : Math.min(1, b.g / (1 - l.g)),
      b: l.b === 1 ? 1 : Math.min(1, b.b / (1 - l.b)),
    };
  }

  private static blendColorBurn(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: l.r === 0 ? 0 : 1 - Math.min(1, (1 - b.r) / l.r),
      g: l.g === 0 ? 0 : 1 - Math.min(1, (1 - b.g) / l.g),
      b: l.b === 0 ? 0 : 1 - Math.min(1, (1 - b.b) / l.b),
    };
  }

  private static blendHardLight(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: l.r < 0.5 ? 2 * b.r * l.r : 1 - 2 * (1 - b.r) * (1 - l.r),
      g: l.g < 0.5 ? 2 * b.g * l.g : 1 - 2 * (1 - b.g) * (1 - l.g),
      b: l.b < 0.5 ? 2 * b.b * l.b : 1 - 2 * (1 - b.b) * (1 - l.b),
    };
  }

  private static blendSoftLight(b: any, l: any): { r: number; g: number; b: number } {
    const gammaFunc = (c: number) =>
      c <= 0.25 ? ((16 * c - 12) * c + 4) * c : Math.sqrt(c);
    const f = (c: number, d: number) =>
      c < 0.5 ? d - (1 - 2 * d) * c * (1 - c) : d + (2 * d - 1) * (gammaFunc(c) - c);
    return {
      r: f(b.r, l.r),
      g: f(b.g, l.g),
      b: f(b.b, l.b),
    };
  }

  private static blendDifference(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: Math.abs(b.r - l.r),
      g: Math.abs(b.g - l.g),
      b: Math.abs(b.b - l.b),
    };
  }

  private static blendExclusion(b: any, l: any): { r: number; g: number; b: number } {
    return {
      r: b.r + l.r - 2 * b.r * l.r,
      g: b.g + l.g - 2 * b.g * l.g,
      b: b.b + l.b - 2 * b.b * l.b,
    };
  }

  private static blendHue(b: any, l: any): { r: number; g: number; b: number } {
    const hslL = this.rgbToHSL(l.r, l.g, l.b);
    const hslB = this.rgbToHSL(b.r, b.g, b.b);
    return this.hslToRGB(hslL.h, hslL.s, hslB.l);
  }

  private static blendSaturation(b: any, l: any): { r: number; g: number; b: number } {
    const hslL = this.rgbToHSL(l.r, l.g, l.b);
    const hslB = this.rgbToHSL(b.r, b.g, b.b);
    return this.hslToRGB(hslB.h, hslL.s, hslB.l);
  }

  private static blendColor(b: any, l: any): { r: number; g: number; b: number } {
    const hslL = this.rgbToHSL(l.r, l.g, l.b);
    const hslB = this.rgbToHSL(b.r, b.g, b.b);
    return this.hslToRGB(hslL.h, hslL.s, hslB.l);
  }

  private static blendLuminosity(b: any, l: any): { r: number; g: number; b: number } {
    const hslL = this.rgbToHSL(l.r, l.g, l.b);
    const hslB = this.rgbToHSL(b.r, b.g, b.b);
    return this.hslToRGB(hslB.h, hslB.s, hslL.l);
  }

  private static rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  private static hslToRGB(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r, g, b };
  }

  // ============================================================================
  // IMAGE MANIPULATION OPERATIONS
  // ============================================================================

  /**
   * Apply exposure adjustment
   */
  static applyExposure(imageData: ImageData, exposure: number): ImageData {
    const data = imageData.data;
    const factor = Math.pow(2, exposure);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * factor));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor));
    }

    return imageData;
  }

  /**
   * Apply contrast adjustment
   */
  static applyContrast(imageData: ImageData, contrast: number): ImageData {
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }

    return imageData;
  }

  /**
   * Apply saturation adjustment
   */
  static applySaturation(imageData: ImageData, saturation: number): ImageData {
    const data = imageData.data;
    const factor = 1 + saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = Math.min(255, Math.max(0, gray + factor * (data[i] - gray)));
      data[i + 1] = Math.min(255, Math.max(0, gray + factor * (data[i + 1] - gray)));
      data[i + 2] = Math.min(255, Math.max(0, gray + factor * (data[i + 2] - gray)));
    }

    return imageData;
  }

  /**
   * Apply hue rotation
   */
  static applyHueRotation(imageData: ImageData, hue: number): ImageData {
    const data = imageData.data;
    const rad = (hue * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, Math.max(0, r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928)));
      data[i + 1] = Math.min(255, Math.max(0, r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283)));
      data[i + 2] = Math.min(255, Math.max(0, r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072)));
    }

    return imageData;
  }

  /**
   * Apply levels adjustment
   */
  static applyLevels(
    imageData: ImageData,
    inputLow: number,
    inputMid: number,
    inputHigh: number,
    outputLow: number,
    outputHigh: number
  ): ImageData {
    const data = imageData.data;
    const gamma = 1 / (inputMid / 255);

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];

        // Input levels
        if (value < inputLow) value = 0;
        else if (value > inputHigh) value = 255;
        else value = ((value - inputLow) / (inputHigh - inputLow)) * 255;

        // Gamma correction
        value = Math.pow(value / 255, gamma) * 255;

        // Output levels
        value = outputLow + (value / 255) * (outputHigh - outputLow);

        data[i + j] = Math.min(255, Math.max(0, value));
      }
    }

    return imageData;
  }

  /**
   * Apply curves adjustment
   */
  static applyCurves(imageData: ImageData, curvePoints: Array<{ x: number; y: number }>): ImageData {
    const data = imageData.data;
    
    // Build lookup table from curve points
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = this.interpolateCurve(i, curvePoints);
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }

    return imageData;
  }

  private static interpolateCurve(x: number, points: Array<{ x: number; y: number }>): number {
    // Sort points by x
    const sorted = [...points].sort((a, b) => a.x - b.x);

    // Find segment
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return Math.round(p1.y + t * (p2.y - p1.y));
      }
    }

    // Extrapolate if needed
    if (x < sorted[0].x) return sorted[0].y;
    return sorted[sorted.length - 1].y;
  }

  /**
   * Gaussian blur
   */
  static gaussianBlur(imageData: ImageData, radius: number): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Create kernel
    const kernelSize = Math.floor(radius * 2 + 1);
    const kernel = this.createGaussianKernel(kernelSize, radius);

    // Apply blur (separable: horizontal then vertical)
    const temp = new Uint8ClampedArray(data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let weightSum = 0;
          for (let k = -Math.floor(kernelSize / 2); k <= Math.floor(kernelSize / 2); k++) {
            const px = Math.min(width - 1, Math.max(0, x + k));
            const idx = (y * width + px) * 4 + c;
            const weight = kernel[k + Math.floor(kernelSize / 2)];
            sum += data[idx] * weight;
            weightSum += weight;
          }
          temp[(y * width + x) * 4 + c] = sum / weightSum;
        }
        temp[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let weightSum = 0;
          for (let k = -Math.floor(kernelSize / 2); k <= Math.floor(kernelSize / 2); k++) {
            const py = Math.min(height - 1, Math.max(0, y + k));
            const idx = (py * width + x) * 4 + c;
            const weight = kernel[k + Math.floor(kernelSize / 2)];
            sum += temp[idx] * weight;
            weightSum += weight;
          }
          output[(y * width + x) * 4 + c] = sum / weightSum;
        }
        output[(y * width + x) * 4 + 3] = temp[(y * width + x) * 4 + 3];
      }
    }

    return new ImageData(output, width, height);
  }

  private static createGaussianKernel(size: number, sigma: number): Float32Array {
    const kernel = new Float32Array(size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  /**
   * Sharpen using unsharp mask
   */
  static sharpen(imageData: ImageData, amount: number, radius: number): ImageData {
    const blurred = this.gaussianBlur(imageData, radius);
    const data = imageData.data;
    const blurredData = blurred.data;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const value = data[i + c] + amount * (data[i + c] - blurredData[i + c]);
        output[i + c] = Math.min(255, Math.max(0, value));
      }
      output[i + 3] = data[i + 3];
    }

    return new ImageData(output, imageData.width, imageData.height);
  }

  /**
   * Noise reduction (simple bilateral filter approximation)
   */
  static noiseReduction(imageData: ImageData, strength: number): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    const spatialSigma = 2;
    const rangeSigma = 50 * (1 - strength / 100);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalWeight = 0;
        const values = [0, 0, 0];

        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const nx = Math.min(width - 1, Math.max(0, x + kx));
            const ny = Math.min(height - 1, Math.max(0, y + ky));

            const spatialDist = Math.sqrt(kx * kx + ky * ky);
            const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));

            for (let c = 0; c < 3; c++) {
              const idx = (ny * width + nx) * 4 + c;
              const centerIdx = (y * width + x) * 4 + c;
              const rangeDist = Math.abs(data[idx] - data[centerIdx]);
              const rangeWeight = Math.exp(-(rangeDist * rangeDist) / (2 * rangeSigma * rangeSigma));

              const weight = spatialWeight * rangeWeight;
              values[c] += data[idx] * weight;
              totalWeight += weight;
            }
          }
        }

        for (let c = 0; c < 3; c++) {
          output[(y * width + x) * 4 + c] = Math.round(values[c] / totalWeight);
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    return new ImageData(output, width, height);
  }
}
