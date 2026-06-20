/**
 * Stratum Adjustments Engine
 * Image adjustment algorithms for Photoshop/Lightroom-style editing
 */

import type { AdjustmentType, AdjustmentSettings, HSLAdjustments } from '../../types';
import { RasterOps } from './RasterOps';

export class Adjustments {
  /**
   * Apply an adjustment to image data
   */
  static apply(
    imageData: ImageData,
    type: AdjustmentType,
    settings: AdjustmentSettings
  ): ImageData {
    switch (type) {
      case 'exposure':
        return this.applyExposure(imageData, settings.exposure || 0);
      case 'contrast':
        return this.applyContrast(imageData, settings.contrast || 0);
      case 'highlights':
        return this.applyHighlights(imageData, settings.highlights || 0);
      case 'shadows':
        return this.applyShadows(imageData, settings.shadows || 0);
      case 'whites':
        return this.applyWhites(imageData, settings.whites || 0);
      case 'blacks':
        return this.applyBlacks(imageData, settings.blacks || 0);
      case 'vibrance':
        return this.applyVibrance(imageData, settings.vibrance || 0);
      case 'saturation':
        return this.applySaturation(imageData, settings.saturationAdjust || 0);
      case 'temperature':
        return this.applyTemperature(imageData, settings.temperature || 0);
      case 'tint':
        return this.applyTint(imageData, settings.tint || 0);
      case 'clarity':
        return this.applyClarity(imageData, settings.clarity || 0);
      case 'dehaze':
        return this.applyDehaze(imageData, settings.dehaze || 0);
      case 'texture':
        return this.applyTexture(imageData, settings.texture || 0);
      case 'hue':
        return this.applyHue(imageData, settings.hue);
      case 'curves':
        return this.applyCurves(imageData, settings.curves);
      case 'levels':
        return this.applyLevels(imageData, settings.levels);
      case 'colorBalance':
        return this.applyColorBalance(imageData, settings.colorBalance);
      case 'splitToning':
        return this.applySplitToning(imageData, settings.splitToning);
      case 'hsl':
        return this.applyHSL(imageData, settings);
      case 'sharpening':
        return this.applySharpening(imageData, settings.sharpening);
      case 'noiseReduction':
        return this.applyNoiseReduction(imageData, settings.noiseReduction);
      case 'vignette':
        return this.applyVignette(imageData, settings.vignette);
      case 'invert':
        return this.applyInvert(imageData);
      case 'posterize':
        return this.applyPosterize(imageData, settings.posterize || 4);
      case 'threshold':
        return this.applyThreshold(imageData, settings.threshold || 128);
      case 'gradientMap':
        return this.applyGradientMap(imageData, settings.gradientMap);
      default:
        return imageData;
    }
  }

  private static applyExposure(imageData: ImageData, exposure: number): ImageData {
    return RasterOps.applyExposure(imageData, exposure);
  }

  private static applyContrast(imageData: ImageData, contrast: number): ImageData {
    return RasterOps.applyContrast(imageData, contrast);
  }

  private static applySaturation(imageData: ImageData, saturation: number): ImageData {
    return RasterOps.applySaturation(imageData, saturation);
  }

  private static applyHighlights(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const factor = 1 + amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      if (luminance > 128) {
        const highlightFactor = (luminance - 128) / 127;
        const adjustedFactor = factor * highlightFactor;
        
        data[i] = Math.min(255, Math.max(0, data[i] * (1 + adjustedFactor)));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * (1 + adjustedFactor)));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * (1 + adjustedFactor)));
      }
    }

    return imageData;
  }

  private static applyShadows(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const factor = 1 + amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      if (luminance < 128) {
        const shadowFactor = (128 - luminance) / 128;
        const adjustedFactor = factor * shadowFactor;
        
        data[i] = Math.min(255, Math.max(0, data[i] * (1 + adjustedFactor)));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * (1 + adjustedFactor)));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * (1 + adjustedFactor)));
      }
    }

    return imageData;
  }

  private static applyWhites(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const factor = amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const maxChannel = Math.max(data[i], data[i + 1], data[i + 2]);
      
      if (maxChannel > 200) {
        const whiteFactor = (maxChannel - 200) / 55 * factor;
        data[i] = Math.min(255, Math.max(0, data[i] + whiteFactor * 255));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + whiteFactor * 255));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + whiteFactor * 255));
      }
    }

    return imageData;
  }

  private static applyBlacks(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const factor = amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
      
      if (minChannel < 55) {
        const blackFactor = (55 - minChannel) / 55 * factor;
        data[i] = Math.min(255, Math.max(0, data[i] - blackFactor * 55));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] - blackFactor * 55));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - blackFactor * 55));
      }
    }

    return imageData;
  }

  private static applyVibrance(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const factor = amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const maxChannel = Math.max(data[i], data[i + 1], data[i + 2]);
      const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
      const saturation = maxChannel - minChannel;
      
      // Less saturated colors get more boost
      const vibranceFactor = factor * (1 - saturation / 255);
      
      const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = Math.min(255, Math.max(0, gray + (1 + vibranceFactor) * (data[i] - gray)));
      data[i + 1] = Math.min(255, Math.max(0, gray + (1 + vibranceFactor) * (data[i + 1] - gray)));
      data[i + 2] = Math.min(255, Math.max(0, gray + (1 + vibranceFactor) * (data[i + 2] - gray)));
    }

    return imageData;
  }

  private static applyTemperature(imageData: ImageData, temperature: number): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Warm (positive) adds red/yellow, cool (negative) adds blue
      data[i] = Math.min(255, Math.max(0, data[i] + temperature * 2.55));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - temperature * 2.55));
    }

    return imageData;
  }

  private static applyTint(imageData: ImageData, tint: number): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Positive adds magenta, negative adds green
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] - tint * 2.55));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + tint * 1.27));
    }

    return imageData;
  }

  private static applyClarity(imageData: ImageData, amount: number): ImageData {
    // Clarity is midtone contrast enhancement using local contrast
    const blurred = RasterOps.gaussianBlur(imageData, 10);
    const data = imageData.data;
    const blurredData = blurred.data;
    const output = new Uint8ClampedArray(data.length);

    const strength = amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const localContrast = data[i + c] - blurredData[i + c];
        output[i + c] = Math.min(255, Math.max(0, data[i + c] + localContrast * strength));
      }
      output[i + 3] = data[i + 3];
    }

    return new ImageData(output, imageData.width, imageData.height);
  }

  private static applyDehaze(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data;
    const strength = amount / 100;

    // Estimate atmospheric light and transmission
    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const hazeFactor = 1 - strength * (1 - luminance / 255);
      
      data[i] = Math.min(255, Math.max(0, data[i] / hazeFactor));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] / hazeFactor));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] / hazeFactor));
    }

    return imageData;
  }

  private static applyTexture(imageData: ImageData, amount: number): ImageData {
    // Texture enhances fine details without affecting edges
    const sharpened = RasterOps.sharpen(imageData, amount / 100, 1);
    const blurred = RasterOps.gaussianBlur(imageData, 10);
    
    const data = imageData.data;
    const sharpenedData = sharpened.data;
    const blurredData = blurred.data;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        // Blend sharpened details with original based on edge detection
        const edgeStrength = Math.abs(sharpenedData[i + c] - blurredData[i + c]);
        const blendFactor = Math.min(1, edgeStrength / 50);
        output[i + c] = Math.round(data[i + c] * (1 - blendFactor) + sharpenedData[i + c] * blendFactor * (amount / 100));
      }
      output[i + 3] = data[i + 3];
    }

    return new ImageData(output, imageData.width, imageData.height);
  }

  private static applyHue(imageData: ImageData, hueSettings?: HSLAdjustments): ImageData {
    if (!hueSettings) return imageData;
    
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const hsl = this.rgbToHSL(data[i], data[i + 1], data[i + 2]);
      const hueShift = this.getHueShift(hsl.h, hueSettings);
      hsl.h = (hsl.h + hueShift) % 360;
      if (hsl.h < 0) hsl.h += 360;
      
      const rgb = this.hslToRGB(hsl.h, hsl.s, hsl.l);
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
    }

    return imageData;
  }

  private static getHueShift(hue: number, settings: HSLAdjustments): number {
    // Map hue to color ranges and apply corresponding shift
    const ranges = [
      { name: 'red', start: 0, end: 15, shift: settings.red },
      { name: 'red', start: 345, end: 360, shift: settings.red },
      { name: 'orange', start: 15, end: 45, shift: settings.orange },
      { name: 'yellow', start: 45, end: 75, shift: settings.yellow },
      { name: 'green', start: 75, end: 165, shift: settings.green },
      { name: 'aqua', start: 165, end: 195, shift: settings.aqua },
      { name: 'blue', start: 195, end: 255, shift: settings.blue },
      { name: 'purple', start: 255, end: 285, shift: settings.purple },
      { name: 'magenta', start: 285, end: 345, shift: settings.magenta },
    ];

    for (const range of ranges) {
      if (hue >= range.start && hue < range.end) {
        return range.shift ?? 0; // empty HSL bands must be a no-op, not NaN
      }
    }

    return 0;
  }

  private static applyCurves(imageData: ImageData, curves?: any): ImageData {
    if (!curves?.rgb || curves.rgb.length === 0) return imageData;
    return RasterOps.applyCurves(imageData, curves.rgb);
  }

  private static applyLevels(imageData: ImageData, levels?: any): ImageData {
    if (!levels?.rgb) return imageData;
    
    const { inputLow, inputMid, inputHigh, outputLow, outputHigh } = levels.rgb;
    return RasterOps.applyLevels(imageData, inputLow, inputMid, inputHigh, outputLow, outputHigh);
  }

  private static applyColorBalance(imageData: ImageData, settings?: any): ImageData {
    if (!settings) return imageData;
    
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      let shadowsFactor = 0, midtonesFactor = 0, highlightsFactor = 0;
      
      if (luminance < 85) {
        shadowsFactor = (85 - luminance) / 85;
      } else if (luminance < 170) {
        midtonesFactor = 1 - Math.abs(luminance - 127.5) / 42.5;
      } else {
        highlightsFactor = (luminance - 170) / 85;
      }

      data[i] = Math.min(255, Math.max(0, 
        data[i] + 
        settings.shadows.r * shadowsFactor +
        settings.midtones.r * midtonesFactor +
        settings.highlights.r * highlightsFactor
      ));
      
      data[i + 1] = Math.min(255, Math.max(0,
        data[i + 1] +
        settings.shadows.g * shadowsFactor +
        settings.midtones.g * midtonesFactor +
        settings.highlights.g * highlightsFactor
      ));
      
      data[i + 2] = Math.min(255, Math.max(0,
        data[i + 2] +
        settings.shadows.b * shadowsFactor +
        settings.midtones.b * midtonesFactor +
        settings.highlights.b * highlightsFactor
      ));
    }

    return imageData;
  }

  private static applySplitToning(imageData: ImageData, settings?: any): ImageData {
    if (!settings) return imageData;
    
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const normalizedLuminance = luminance / 255;
      
      // Calculate balance between highlights and shadows
      const highlightWeight = Math.pow(normalizedLuminance, settings.balance || 50);
      const shadowWeight = 1 - highlightWeight;
      
      // Convert hue/sat to RGB
      const highlightRGB = this.hslToRGB(settings.highlights.hue || 0, (settings.highlights.saturation || 0) / 100, 0.5);
      const shadowRGB = this.hslToRGB(settings.shadows.hue || 0, (settings.shadows.saturation || 0) / 100, 0.5);
      
      // Apply tint based on weights
      data[i] = Math.min(255, Math.max(0, 
        data[i] + 
        (highlightRGB.r - 128) * highlightWeight * (settings.highlights.saturation / 100) +
        (shadowRGB.r - 128) * shadowWeight * (settings.shadows.saturation / 100)
      ));
      
      data[i + 1] = Math.min(255, Math.max(0,
        data[i + 1] +
        (highlightRGB.g - 128) * highlightWeight * (settings.highlights.saturation / 100) +
        (shadowRGB.g - 128) * shadowWeight * (settings.shadows.saturation / 100)
      ));
      
      data[i + 2] = Math.min(255, Math.max(0,
        data[i + 2] +
        (highlightRGB.b - 128) * highlightWeight * (settings.highlights.saturation / 100) +
        (shadowRGB.b - 128) * shadowWeight * (settings.shadows.saturation / 100)
      ));
    }

    return imageData;
  }

  private static applyHSL(imageData: ImageData, settings: any): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const hsl = this.rgbToHSL(data[i], data[i + 1], data[i + 2]);
      const hueShift = this.getHueShift(hsl.h, settings.hue || {});
      
      hsl.h = (hsl.h + hueShift) % 360;
      if (hsl.h < 0) hsl.h += 360;
      
      // Apply saturation adjustments per hue range
      const satShift = this.getHueShift(hsl.h, settings.saturation || {});
      hsl.s = Math.max(0, Math.min(1, hsl.s + satShift / 100));
      
      // Apply luminance adjustments per hue range
      const lumShift = this.getHueShift(hsl.h, settings.luminance || {});
      hsl.l = Math.max(0, Math.min(1, hsl.l + lumShift / 100));
      
      const rgb = this.hslToRGB(hsl.h, hsl.s, hsl.l);
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
    }

    return imageData;
  }

  private static applySharpening(imageData: ImageData, settings?: any): ImageData {
    if (!settings) return imageData;
    return RasterOps.sharpen(imageData, settings.amount || 0.5, settings.radius || 1);
  }

  private static applyNoiseReduction(imageData: ImageData, settings?: any): ImageData {
    if (!settings) return imageData;
    return RasterOps.noiseReduction(imageData, settings.luminance || 0);
  }

  private static applyVignette(imageData: ImageData, settings?: any): ImageData {
    if (!settings) return imageData;
    
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const amount = -(settings.amount || 0) / 100;
    const midpoint = (settings.midpoint || 50) / 100;
    const roundness = settings.roundness || 50;
    const feather = (settings.feather || 50) / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        
        // Elliptical distance based on roundness
        const aspectRatio = width / height;
        const distance = Math.sqrt(
          (dx * dx) / (aspectRatio ** (roundness / 50)) +
          (dy * dy) * (aspectRatio ** (roundness / 50))
        );
        
        const normalizedDistance = distance / maxRadius;
        
        // Calculate vignette effect
        let vignetteFactor = 1;
        if (normalizedDistance > midpoint) {
          const falloff = (normalizedDistance - midpoint) / (1 - midpoint);
          vignetteFactor = 1 - amount * Math.pow(falloff, 1 / feather);
        }
        
        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, data[idx] * vignetteFactor));
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * vignetteFactor));
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * vignetteFactor));
      }
    }

    return imageData;
  }

  private static applyInvert(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }

    return imageData;
  }

  private static applyPosterize(imageData: ImageData, levels: number): ImageData {
    const data = imageData.data;
    const numLevels = Math.max(2, Math.min(256, levels));
    const step = 255 / (numLevels - 1);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.floor(data[i] / step) * step);
      data[i + 1] = Math.round(Math.floor(data[i + 1] / step) * step);
      data[i + 2] = Math.round(Math.floor(data[i + 2] / step) * step);
    }

    return imageData;
  }

  private static applyThreshold(imageData: ImageData, threshold: number): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const value = gray >= threshold ? 255 : 0;
      
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    return imageData;
  }

  private static applyGradientMap(imageData: ImageData, gradient?: any): ImageData {
    if (!gradient?.stops) return imageData;
    
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const normalizedGray = gray / 255;
      
      // Find gradient stop
      let color = gradient.stops[0].color;
      for (let j = 0; j < gradient.stops.length - 1; j++) {
        const stop1 = gradient.stops[j];
        const stop2 = gradient.stops[j + 1];
        
        if (normalizedGray >= stop1.offset && normalizedGray <= stop2.offset) {
          const t = (normalizedGray - stop1.offset) / (stop2.offset - stop1.offset);
          color = {
            r: Math.round(stop1.color.r + t * (stop2.color.r - stop1.color.r)),
            g: Math.round(stop1.color.g + t * (stop2.color.g - stop1.color.g)),
            b: Math.round(stop1.color.b + t * (stop2.color.b - stop1.color.b)),
            a: stop1.color.a + t * (stop2.color.a - stop1.color.a),
          };
          break;
        }
      }
      
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = Math.round(color.a * 255);
    }

    return imageData;
  }

  // ============================================================================
  // COLOR CONVERSION UTILITIES
  // ============================================================================

  private static rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s, l };
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
      r = hue2rgb(p, q, h / 360 + 1 / 3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1 / 3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
}
