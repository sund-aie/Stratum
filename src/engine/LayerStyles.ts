/**
 * Unified Canvas - Layer Styles Engine
 * Handles all layer effects: Drop Shadow, Inner Shadow, Outer Glow, Inner Glow,
 * Bevel & Emboss, Satin, Color/Gradient/Pattern Overlay, Stroke
 */

import type { Layer, LayerStyle, Point, Rect, Color, ImageData } from '../types';
import { applyMatrixToPoint, composeMatrix } from '../utils/math';

export interface LayerStyleConfig {
  dropShadow?: DropShadowConfig;
  innerShadow?: InnerShadowConfig;
  outerGlow?: OuterGlowConfig;
  innerGlow?: InnerGlowConfig;
  bevelEmboss?: BevelEmbossConfig;
  satin?: SatinConfig;
  colorOverlay?: ColorOverlayConfig;
  gradientOverlay?: GradientOverlayConfig;
  patternOverlay?: PatternOverlayConfig;
  stroke?: StrokeConfig;
}

export interface DropShadowConfig {
  enabled: boolean;
  blendMode: string;
  color: Color;
  opacity: number;
  angle: number;
  distance: number;
  spread: number;
  size: number;
  contour?: string;
  noise: number;
  layerKnocksOutDropShadow: boolean;
}

export interface InnerShadowConfig {
  enabled: boolean;
  blendMode: string;
  color: Color;
  opacity: number;
  angle: number;
  distance: number;
  choke: number;
  size: number;
  contour?: string;
  noise: number;
}

export interface OuterGlowConfig {
  enabled: boolean;
  blendMode: string;
  opacity: number;
  noise: number;
  color: Color;
  gradient?: Gradient;
  technique: 'softer' | 'precise';
  spread: number;
  size: number;
  contour?: string;
  range: number;
  jitter: number;
}

export interface InnerGlowConfig {
  enabled: boolean;
  blendMode: string;
  opacity: number;
  noise: number;
  color: Color;
  gradient?: Gradient;
  technique: 'softer' | 'precise';
  source: 'edge' | 'center';
  choke: number;
  size: number;
  contour?: string;
  range: number;
  jitter: number;
}

export interface BevelEmbossConfig {
  enabled: boolean;
  style: 'outer' | 'inner' | 'emboss' | 'pillow' | 'stroke';
  technique: 'smooth' | 'chisel-hard' | 'chisel-soft';
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
  angle: number;
  altitude: number;
  glossContour?: string;
  highlightMode: string;
  highlightColor: Color;
  highlightOpacity: number;
  shadowMode: string;
  shadowColor: Color;
  shadowOpacity: number;
}

export interface SatinConfig {
  enabled: boolean;
  blendMode: string;
  color: Color;
  opacity: number;
  angle: number;
  distance: number;
  size: number;
  contour?: string;
  invert: boolean;
}

export interface ColorOverlayConfig {
  enabled: boolean;
  blendMode: string;
  color: Color;
  opacity: number;
}

export interface GradientOverlayConfig {
  enabled: boolean;
  blendMode: string;
  opacity: number;
  gradient: Gradient;
  style: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  angle: number;
  scale: number;
  alignWithLayer: boolean;
  reverse: boolean;
}

export interface PatternOverlayConfig {
  enabled: boolean;
  blendMode: string;
  opacity: number;
  pattern: ImageData;
  scale: number;
  linkWithLayer: boolean;
}

export interface StrokeConfig {
  enabled: boolean;
  size: number;
  position: 'outside' | 'inside' | 'center';
  blendMode: string;
  opacity: number;
  fillType: 'color' | 'gradient' | 'pattern';
  color: Color;
  gradient?: Gradient;
  pattern?: ImageData;
}

export interface Gradient {
  type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  stops: GradientStop[];
}

export interface GradientStop {
  offset: number;
  color: Color;
  opacity?: number;
}

export class LayerStyles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.tempCtx = this.tempCanvas.getContext('2d')!;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
  }

  applyStyles(
    layer: Layer,
    sourceImage: ImageData,
    targetCtx: CanvasRenderingContext2D
  ) {
    if (!layer.styles) return;

    const styles = layer.styles;
    const bounds = this.getLayerBounds(layer, sourceImage);

    // Create masks for effects
    const alphaMask = this.extractAlpha(sourceImage);
    const invertedMask = this.invertAlpha(alphaMask);

    // Apply effects in order (bottom to top)
    if (styles.dropShadow?.enabled) {
      this.applyDropShadow(sourceImage, alphaMask, styles.dropShadow, bounds, targetCtx);
    }

    if (styles.innerShadow?.enabled) {
      this.applyInnerShadow(sourceImage, alphaMask, styles.innerShadow, bounds, targetCtx);
    }

    if (styles.innerGlow?.enabled) {
      this.applyInnerGlow(sourceImage, alphaMask, styles.innerGlow, bounds, targetCtx);
    }

    if (styles.bevelEmboss?.enabled) {
      this.applyBevelEmboss(sourceImage, alphaMask, styles.bevelEmboss, bounds, targetCtx);
    }

    if (styles.satin?.enabled) {
      this.applySatin(sourceImage, alphaMask, styles.satin, bounds, targetCtx);
    }

    if (styles.colorOverlay?.enabled) {
      this.applyColorOverlay(sourceImage, alphaMask, styles.colorOverlay, targetCtx);
    }

    if (styles.gradientOverlay?.enabled) {
      this.applyGradientOverlay(sourceImage, alphaMask, styles.gradientOverlay, bounds, targetCtx);
    }

    if (styles.patternOverlay?.enabled) {
      this.applyPatternOverlay(sourceImage, alphaMask, styles.patternOverlay, bounds, targetCtx);
    }

    if (styles.outerGlow?.enabled) {
      this.applyOuterGlow(sourceImage, alphaMask, styles.outerGlow, bounds, targetCtx);
    }

    if (styles.stroke?.enabled) {
      this.applyStroke(sourceImage, alphaMask, styles.stroke, bounds, targetCtx);
    }

    // Finally draw the original layer content on top
    targetCtx.putImageData(sourceImage, bounds.x, bounds.y);
  }

  private getLayerBounds(layer: Layer, imageData: ImageData): Rect {
    const transform = layer.transform;
    return {
      x: transform.x - imageData.width / 2 * transform.scaleX,
      y: transform.y - imageData.height / 2 * transform.scaleY,
      width: imageData.width * transform.scaleX,
      height: imageData.height * transform.scaleY,
    };
  }

  private extractAlpha(imageData: ImageData): Uint8ClampedArray {
    const alpha = new Uint8ClampedArray(imageData.width * imageData.height);
    const data = imageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      alpha[j] = data[i + 3];
    }
    return alpha;
  }

  private invertAlpha(alpha: Uint8ClampedArray): Uint8ClampedArray {
    const inverted = new Uint8ClampedArray(alpha.length);
    for (let i = 0; i < alpha.length; i++) {
      inverted[i] = 255 - alpha[i];
    }
    return inverted;
  }

  private applyDropShadow(
    source: ImageData,
    alpha: Uint8ClampedArray,
    config: DropShadowConfig,
    bounds: Rect,
    targetCtx: CanvasRenderingContext2D
  ) {
    const { distance, angle, size, spread, opacity, color, blendMode } = config;
    
    // Create shadow image
    const shadowData = this.createShadow(
      alpha,
      source.width,
      source.height,
      distance,
      angle,
      spread,
      size,
      color,
      opacity
    );

    // Apply Gaussian blur
    this.gaussianBlur(shadowData, source.width, source.height, size / 2);

    // Draw shadow with blend mode
    targetCtx.save();
    targetCtx.globalCompositeOperation = this.getCompositeOperation(blendMode);
    targetCtx.globalAlpha = opacity;
    targetCtx.putImageData(shadowData, bounds.x + Math.cos(angle) * distance, bounds.y + Math.sin(angle) * distance);
    targetCtx.restore();
  }

  // Simplified implementations for brevity - full implementations would be much longer
  private createShadow(
    alpha: Uint8ClampedArray,
    width: number,
    height: number,
    distance: number,
    angle: number,
    spread: number,
    size: number,
    color: Color,
    opacity: number
  ): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    const offsetX = Math.round(Math.cos(angle) * distance);
    const offsetY = Math.round(Math.sin(angle) * distance);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = x - offsetX;
        const srcY = y - offsetY;
        
        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const a = alpha[srcY * width + srcX];
          if (a > 0) {
            const idx = (y * width + x) * 4;
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = Math.round(a * opacity);
          }
        }
      }
    }
    return new ImageData(data, width, height);
  }

  private gaussianBlur(data: ImageData, width: number, height: number, radius: number) {
    // Simplified box blur approximation
    const pixels = data.data;
    const temp = new Uint8ClampedArray(pixels.length);
    const r = Math.ceil(radius);
    const weight = 1 / ((r * 2 + 1) ** 2);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const idx = (y * width + nx) * 4;
          rSum += pixels[idx];
          gSum += pixels[idx + 1];
          bSum += pixels[idx + 2];
          aSum += pixels[idx + 3];
        }
        const idx = (y * width + x) * 4;
        temp[idx] = rSum * weight;
        temp[idx + 1] = gSum * weight;
        temp[idx + 2] = bSum * weight;
        temp[idx + 3] = aSum * weight;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const idx = (ny * width + x) * 4;
          rSum += temp[idx];
          gSum += temp[idx + 1];
          bSum += temp[idx + 2];
          aSum += temp[idx + 3];
        }
        const idx = (y * width + x) * 4;
        pixels[idx] = rSum * weight;
        pixels[idx + 1] = gSum * weight;
        pixels[idx + 2] = bSum * weight;
        pixels[idx + 3] = aSum * weight;
      }
    }
  }

  private getCompositeOperation(mode: string): GlobalCompositeOperation {
    const map: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'hue': 'hue',
      'saturation': 'saturation',
      'color': 'color',
      'luminosity': 'luminosity',
    };
    return map[mode] || 'source-over';
  }

  // Placeholder methods for other effects - full implementations would follow similar patterns
  private applyInnerShadow(source: ImageData, alpha: Uint8ClampedArray, config: InnerShadowConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyInnerGlow(source: ImageData, alpha: Uint8ClampedArray, config: OuterGlowConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyBevelEmboss(source: ImageData, alpha: Uint8ClampedArray, config: BevelEmbossConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applySatin(source: ImageData, alpha: Uint8ClampedArray, config: SatinConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyColorOverlay(source: ImageData, alpha: Uint8ClampedArray, config: ColorOverlayConfig, targetCtx: CanvasRenderingContext2D) { }
  private applyGradientOverlay(source: ImageData, alpha: Uint8ClampedArray, config: GradientOverlayConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyPatternOverlay(source: ImageData, alpha: Uint8ClampedArray, config: PatternOverlayConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyOuterGlow(source: ImageData, alpha: Uint8ClampedArray, config: OuterGlowConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }
  private applyStroke(source: ImageData, alpha: Uint8ClampedArray, config: StrokeConfig, bounds: Rect, targetCtx: CanvasRenderingContext2D) { }

  static getDefaultStyles(): LayerStyleConfig {
    return {
      dropShadow: {
        enabled: false,
        blendMode: 'multiply',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 0.75,
        angle: 120 * Math.PI / 180,
        distance: 5,
        spread: 0,
        size: 5,
        noise: 0,
        layerKnocksOutDropShadow: true,
      },
      innerShadow: {
        enabled: false,
        blendMode: 'multiply',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 0.75,
        angle: -90 * Math.PI / 180,
        distance: 5,
        choke: 0,
        size: 5,
        noise: 0,
      },
      outerGlow: {
        enabled: false,
        blendMode: 'screen',
        opacity: 0.75,
        noise: 0,
        color: { r: 255, g: 255, b: 255, a: 1 },
        technique: 'softer',
        spread: 0,
        size: 5,
        range: 50,
        jitter: 0,
      },
      innerGlow: {
        enabled: false,
        blendMode: 'screen',
        opacity: 0.75,
        noise: 0,
        color: { r: 255, g: 255, b: 255, a: 1 },
        technique: 'softer',
        source: 'edge',
        choke: 0,
        size: 5,
        range: 50,
        jitter: 0,
      },
      bevelEmboss: {
        enabled: false,
        style: 'outer',
        technique: 'smooth',
        depth: 100,
        direction: 'up',
        size: 5,
        soften: 0,
        angle: 120 * Math.PI / 180,
        altitude: 30 * Math.PI / 180,
        highlightMode: 'screen',
        highlightColor: { r: 255, g: 255, b: 255, a: 1 },
        highlightOpacity: 0.75,
        shadowMode: 'multiply',
        shadowColor: { r: 0, g: 0, b: 0, a: 1 },
        shadowOpacity: 0.75,
      },
      satin: {
        enabled: false,
        blendMode: 'multiply',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 0.5,
        angle: 19 * Math.PI / 180,
        distance: 10,
        size: 10,
        invert: false,
      },
      colorOverlay: {
        enabled: false,
        blendMode: 'normal',
        color: { r: 255, g: 0, b: 0, a: 1 },
        opacity: 1,
      },
      gradientOverlay: {
        enabled: false,
        blendMode: 'normal',
        opacity: 1,
        gradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
            { offset: 1, color: { r: 255, g: 255, b: 255, a: 1 } },
          ],
        },
        style: 'linear',
        angle: 90 * Math.PI / 180,
        scale: 100,
        alignWithLayer: true,
        reverse: false,
      },
      patternOverlay: {
        enabled: false,
        blendMode: 'normal',
        opacity: 1,
        pattern: new ImageData(1, 1),
        scale: 100,
        linkWithLayer: true,
      },
      stroke: {
        enabled: false,
        size: 3,
        position: 'outside',
        blendMode: 'normal',
        opacity: 1,
        fillType: 'color',
        color: { r: 0, g: 0, b: 0, a: 1 },
      },
    };
  }
}

export default LayerStyles;