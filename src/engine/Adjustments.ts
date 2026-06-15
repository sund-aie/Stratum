/**
 * Unified Canvas - Adjustment Layers Engine
 * Non-destructive image adjustments: Brightness/Contrast, Curves, Levels, HSL, Exposure, Vibrance, Color Balance
 */

import type { Color } from '../types';

export interface AdjustmentParams {
  // Brightness/Contrast
  brightness?: number;    // -100 to 100
  contrast?: number;      // -100 to 100

  // Curves
  curves?: {
    master?: number[];     // 256 values
    red?: number[];
    green?: number[];
    blue?: number[];
  };

  // Levels
  levels?: {
    inputBlack?: number;   // 0-255
    inputWhite?: number;   // 0-255
    inputMid?: number;     // 0.1-9.99
    outputBlack?: number;  // 0-255
    outputWhite?: number;  // 0-255
    channel?: 'rgb' | 'red' | 'green' | 'blue';
  };

  // HSL
  hue?: number;           // -180 to 180
  saturation?: number;    // -100 to 100
  lightness?: number;     // -100 to 100
  colorize?: boolean;
  colorizeHue?: number;   // 0-360
  colorizeSaturation?: number; // 0-100

  // Exposure
  exposure?: number;      // -10 to 10
  offset?: number;        // -1 to 1
  gamma?: number;         // 0.1 to 10

  // Vibrance
  vibrance?: number;      // -100 to 100
  saturationVib?: number; // -100 to 100

  // Color Balance
  shadows?: { cyanRed: number; magentaGreen: number; yellowBlue: number };
  midtones?: { cyanRed: number; magentaGreen: number; yellowBlue: number };
  highlights?: { cyanRed: number; magentaGreen: number; yellowBlue: number };
  preserveLuminosity?: boolean;
}

export type AdjustmentType = 
  | 'brightness-contrast'
  | 'curves'
  | 'levels'
  | 'hsl'
  | 'exposure'
  | 'vibrance'
  | 'color-balance';

export function applyAdjustment(
  imageData: ImageData,
  adjustment: { type: AdjustmentType; params: AdjustmentParams; enabled: boolean }
): ImageData {
  if (!adjustment.enabled) return imageData;

  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  switch (adjustment.type) {
    case 'brightness-contrast':
      applyBrightnessContrast(result, adjustment.params);
      break;
    case 'curves':
      applyCurves(result, adjustment.params);
      break;
    case 'levels':
      applyLevels(result, adjustment.params);
      break;
    case 'hsl':
      applyHSL(result, adjustment.params);
      break;
    case 'exposure':
      applyExposure(result, adjustment.params);
      break;
    case 'vibrance':
      applyVibrance(result, adjustment.params);
      break;
    case 'color-balance':
      applyColorBalance(result, adjustment.params);
      break;
  }

  return result;
}

// Brightness/Contrast
function applyBrightnessContrast(imageData: ImageData, params: AdjustmentParams): void {
  const brightness = (params.brightness || 0) * 2.55; // -255 to 255
  const contrast = (params.contrast || 0) / 100;       // -1 to 1
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      val = val + brightness;
      val = factor * (val - 128) + 128;
      data[i + c] = clamp(val);
    }
  }
}

// Curves
function applyCurves(imageData: ImageData, params: AdjustmentParams): void {
  const curves = params.curves;
  if (!curves) return;

  // Build lookup tables
  const buildLUT = (curve?: number[]): number[] => {
    const lut = new Array(256);
    if (!curve) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }
    // Interpolate curve points
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      // Simple linear interpolation between curve points
      // In real implementation, use spline interpolation
      lut[i] = Math.round(clamp(curve[i] || i));
    }
    return lut;
  };

  const masterLUT = buildLUT(curves.master);
  const redLUT = buildLUT(curves.red);
  const greenLUT = buildLUT(curves.green);
  const blueLUT = buildLUT(curves.blue);

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = redLUT[data[i]] || masterLUT[data[i]];
    data[i + 1] = greenLUT[data[i + 1]] || masterLUT[data[i + 1]];
    data[i + 2] = blueLUT[data[i + 2]] || masterLUT[data[i + 2]];
  }
}

// Levels
function applyLevels(imageData: ImageData, params: AdjustmentParams): void {
  const levels = params.levels;
  if (!levels) return;

  const channel = levels.channel || 'rgb';
  const inBlack = levels.inputBlack || 0;
  const inWhite = levels.inputWhite || 255;
  const inMid = levels.inputMid || 1.0;
  const outBlack = levels.outputBlack || 0;
  const outWhite = levels.outputWhite || 255;

  const data = imageData.data;
  const channels = channel === 'rgb' ? [0, 1, 2] : 
                   channel === 'red' ? [0] : 
                   channel === 'green' ? [1] : [2];

  // Precompute LUT
  const lut = new Array(256);
  const inRange = inWhite - inBlack;
  if (inRange === 0) return;

  for (let i = 0; i < 256; i++) {
    let val = (i - inBlack) / inRange;
    val = Math.pow(val, 1 / inMid); // Gamma correction
    val = val * (outWhite - outBlack) + outBlack;
    lut[i] = clamp(val);
  }

  for (let i = 0; i < data.length; i += 4) {
    for (const c of channels) {
      data[i + c] = lut[data[i + c]];
    }
  }
}

// HSL (Hue/Saturation/Lightness)
function applyHSL(imageData: ImageData, params: AdjustmentParams): void {
  const hueShift = (params.hue || 0) / 360;      // -0.5 to 0.5
  const satMul = 1 + (params.saturation || 0) / 100; // 0 to 2
  const lightAdd = (params.lightness || 0) * 2.55;    // -255 to 255

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    if (params.colorize) {
      // Colorize mode
      const h = (params.colorizeHue || 0) / 360;
      const s = (params.colorizeSaturation || 0) / 100;
      const l = (r + g + b) / 3; // Use luminance
      [r, g, b] = hslToRgb(h, s, l);
    } else {
      // Convert to HSL
      let [h, s, l] = rgbToHsl(r, g, b);
      
      // Apply adjustments
      h = (h + hueShift) % 1;
      if (h < 0) h += 1;
      s = clamp(s * satMul, 0, 1);
      l = clamp(l + lightAdd / 255, 0, 1);
      
      // Convert back
      [r, g, b] = hslToRgb(h, s, l);
    }

    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(g * 255);
    data[i + 2] = Math.round(b * 255);
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    hue2rgb(p, q, h + 1/3),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1/3),
  ];
}

// Exposure
function applyExposure(imageData: ImageData, params: AdjustmentParams): void {
  const exposure = params.exposure || 0;
  const offset = params.offset || 0;
  const gamma = params.gamma || 1;

  const ev = Math.pow(2, exposure);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c] / 255;
      val = val * ev + offset;
      val = Math.pow(Math.max(0, val), 1 / gamma);
      data[i + c] = clamp(val * 255);
    }
  }
}

// Vibrance
function applyVibrance(imageData: ImageData, params: AdjustmentParams): void {
  const vibrance = (params.vibrance || 0) / 100;     // -1 to 1
  const saturation = (params.saturationVib || 0) / 100; // -1 to 1
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    const [h, s, l] = rgbToHsl(r, g, b);
    
    // Vibrance affects less saturated colors more
    const satFactor = 1 - s;
    const vib = vibrance * satFactor;
    const sat = saturation;
    
    let newS = s + vib + sat;
    newS = clamp(newS, 0, 1);

    const [nr, ng, nb] = hslToRgb(h, newS, l);
    data[i] = Math.round(nr * 255);
    data[i + 1] = Math.round(ng * 255);
    data[i + 2] = Math.round(nb * 255);
  }
}

// Color Balance
function applyColorBalance(imageData: ImageData, params: AdjustmentParams): void {
  const shadows = params.shadows || { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
  const midtones = params.midtones || { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
  const highlights = params.highlights || { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
  const preserveLum = params.preserveLuminosity !== false;

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let factor: number;

    if (lum < 85) {
      factor = lum / 85; // Shadows
      r += shadows.cyanRed * factor;
      g += shadows.magentaGreen * factor;
      b += shadows.yellowBlue * factor;
    } else if (lum > 170) {
      factor = (lum - 170) / 85; // Highlights
      r += highlights.cyanRed * factor;
      g += highlights.magentaGreen * factor;
      b += highlights.yellowBlue * factor;
    } else {
      factor = (lum - 85) / 85; // Midtones
      r += midtones.cyanRed * factor;
      g += midtones.magentaGreen * factor;
      b += midtones.yellowBlue * factor;
    }

    if (preserveLum) {
      const newLum = 0.299 * r + 0.587 * g + 0.114 * b;
      const ratio = lum / (newLum || 1);
      r *= ratio;
      g *= ratio;
      b *= ratio;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
}

function clamp(val: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// Create default adjustment parameters
export function createDefaultAdjustment(type: AdjustmentType): AdjustmentParams {
  switch (type) {
    case 'brightness-contrast':
      return { brightness: 0, contrast: 0 };
    case 'curves':
      return { curves: { master: Array.from({ length: 256 }, (_, i) => i) } };
    case 'levels':
      return { levels: { inputBlack: 0, inputWhite: 255, inputMid: 1, outputBlack: 0, outputWhite: 255 } };
    case 'hsl':
      return { hue: 0, saturation: 0, lightness: 0, colorize: false };
    case 'exposure':
      return { exposure: 0, offset: 0, gamma: 1 };
    case 'vibrance':
      return { vibrance: 0, saturationVib: 0 };
    case 'color-balance':
      return {
        shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
        midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
        highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
        preserveLuminosity: true,
      };
  }
}

// Create adjustment UI configuration
export const ADJUSTMENT_CONFIG: Record<AdjustmentType, {
  label: string;
  icon: string;
  params: Array<{ key: string; label: string; type: 'slider' | 'curves' | 'levels' | 'color-wheel' | 'color-balance'; min?: number; max?: number; step?: number }>;
}> = {
  'brightness-contrast': {
    label: 'Brightness/Contrast',
    icon: '☀',
    params: [
      { key: 'brightness', label: 'Brightness', type: 'slider', min: -100, max: 100, step: 1 },
      { key: 'contrast', label: 'Contrast', type: 'slider', min: -100, max: 100, step: 1 },
    ],
  },
  'curves': {
    label: 'Curves',
    icon: '⤴',
    params: [
      { key: 'curves', label: 'Curves', type: 'curves' },
    ],
  },
  'levels': {
    label: 'Levels',
    icon: '▮',
    params: [
      { key: 'levels', label: 'Levels', type: 'levels' },
    ],
  },
  'hsl': {
    label: 'Hue/Saturation',
    icon: '🎨',
    params: [
      { key: 'hue', label: 'Hue', type: 'slider', min: -180, max: 180, step: 1 },
      { key: 'saturation', label: 'Saturation', type: 'slider', min: -100, max: 100, step: 1 },
      { key: 'lightness', label: 'Lightness', type: 'slider', min: -100, max: 100, step: 1 },
      { key: 'colorize', label: 'Colorize', type: 'slider', min: 0, max: 1, step: 1 },
    ],
  },
  'exposure': {
    label: 'Exposure',
    icon: '📷',
    params: [
      { key: 'exposure', label: 'Exposure', type: 'slider', min: -10, max: 10, step: 0.1 },
      { key: 'offset', label: 'Offset', type: 'slider', min: -1, max: 1, step: 0.01 },
      { key: 'gamma', label: 'Gamma', type: 'slider', min: 0.1, max: 10, step: 0.01 },
    ],
  },
  'vibrance': {
    label: 'Vibrance',
    icon: '✨',
    params: [
      { key: 'vibrance', label: 'Vibrance', type: 'slider', min: -100, max: 100, step: 1 },
      { key: 'saturationVib', label: 'Saturation', type: 'slider', min: -100, max: 100, step: 1 },
    ],
  },
  'color-balance': {
    label: 'Color Balance',
    icon: '⚖',
    params: [
      { key: 'shadows', label: 'Shadows', type: 'color-balance' },
      { key: 'midtones', label: 'Midtones', type: 'color-balance' },
      { key: 'highlights', label: 'Highlights', type: 'color-balance' },
    ],
  },
};