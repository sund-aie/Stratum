/**
 * Unified Canvas - Raster Operations Engine
 * Brush engine, eraser, fill, blur, sharpen, noise, dodge, burn, smudge, etc.
 */

import type { ImageData, Point, Rect, Color, BrushDynamics } from '../types';
import { clamp } from '../utils/math';

// ============================================================================
// BRUSH ENGINE
// ============================================================================

export interface BrushStroke {
  points: BrushPoint[];
  color: Color;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  blendMode: string;
  dynamics: BrushDynamics;
}

export interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  rotation: number;
  time: number;
}

export interface BrushTip {
  shape: 'round' | 'square' | 'custom';
  diameter: number;
  hardness: number;
  spacing: number;
  angle: number;
  roundness: number;
  texture?: HTMLImageElement;
  textureScale: number;
  textureDepth: number;
  textureMode: string;
}

export class BrushEngine {
  private lastPoint: BrushPoint | null = null;
  private strokePoints: BrushPoint[] = [];
  private accumulatedFlow = 0;

  // Start a new stroke
  startStroke(point: BrushPoint): void {
    this.lastPoint = point;
    this.strokePoints = [point];
    this.accumulatedFlow = 0;
  }

  // Add point to current stroke
  addPoint(point: BrushPoint, callback: (points: BrushPoint[]) => void): void {
    if (!this.lastPoint) return;

    const distance = Math.hypot(point.x - this.lastPoint.x, point.y - this.lastPoint.y);
    const spacing = point.pressure * 25 * (1 + point.time * 0.001); // Dynamic spacing based on pressure

    if (distance >= spacing) {
      // Interpolate points for smooth strokes
      const steps = Math.ceil(distance / spacing);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const interpPoint = this.interpolatePoint(this.lastPoint, point, t);
        this.strokePoints.push(interpPoint);
      }
      this.lastPoint = point;
      callback(this.strokePoints);
      this.strokePoints = [point];
    }
  }

  // End stroke
  endStroke(): BrushPoint[] {
    const points = [...this.strokePoints];
    this.lastPoint = null;
    this.strokePoints = [];
    return points;
  }

  private interpolatePoint(a: BrushPoint, b: BrushPoint, t: number): BrushPoint {
    // Smooth interpolation using Catmull-Rom spline would be better
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      pressure: a.pressure + (b.pressure - a.pressure) * t,
      tiltX: a.tiltX + (b.tiltX - a.tiltX) * t,
      tiltY: a.tiltY + (b.tiltY - a.tiltY) * t,
      rotation: a.rotation + (b.rotation - a.rotation) * t,
      time: a.time + (b.time - a.time) * t,
    };
  }

  // Generate brush stamp for a point
  generateStamp(point: BrushPoint, tip: BrushTip): ImageData {
    const size = Math.max(1, Math.round(tip.diameter * point.pressure));
    const canvas = document.createElement('canvas');
    canvas.width = size + 4;
    canvas.height = size + 4;
    const ctx = canvas.getContext('2d')!;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create radial gradient for hardness
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, size / 2
    );
    
    const hardness = tip.hardness;
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(hardness, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    
    if (tip.shape === 'round') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tip.shape === 'square') {
      // Square with rounded corners based on hardness
      const r = size / 2;
      const cornerRadius = r * (1 - hardness);
      ctx.beginPath();
      ctx.roundRect(centerX - r, centerY - r, size, size, cornerRadius);
      ctx.fill();
    }

    // Apply texture if present
    if (tip.texture && tip.textureDepth > 0) {
      ctx.globalCompositeOperation = tip.textureMode as GlobalCompositeOperation;
      ctx.globalAlpha = tip.textureDepth / 100;
      
      const pattern = ctx.createPattern(tip.texture, 'repeat')!;
      ctx.fillStyle = pattern;
      ctx.scale(tip.textureScale / 100, tip.textureScale / 100);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

// ============================================================================
// RASTER OPERATIONS
// ============================================================================

/**
 * Apply brush stroke to layer
 */
export function applyBrushStroke(
  layerImageData: ImageData,
  stroke: BrushStroke,
  canvasBounds: Rect
): void {
  const engine = new BrushEngine();
  const tip: BrushTip = {
    shape: stroke.dynamics.texture ? 'custom' : 'round',
    diameter: stroke.size,
    hardness: stroke.hardness,
    spacing: stroke.spacing,
    angle: 0,
    roundness: 1,
    texture: stroke.dynamics.texture,
    textureScale: stroke.dynamics.textureScale,
    textureDepth: stroke.dynamics.textureDepth,
    textureMode: stroke.dynamics.textureMode,
  };

  for (const point of stroke.points) {
    const stamp = engine.generateStamp(point, tip);
    applyStamp(layerImageData, stamp, point, stroke, canvasBounds);
  }
}

function applyStamp(
  layerData: ImageData,
  stamp: ImageData,
  point: BrushPoint,
  stroke: BrushStroke,
  canvasBounds: Rect
): void {
  const stampW = stamp.width;
  const stampH = stamp.height;
  const halfW = stampW / 2;
  const halfH = stampH / 2;

  // Calculate position in layer coordinates
  const left = Math.floor(point.x - canvasBounds.x - halfW);
  const top = Math.floor(point.y - canvasBounds.y - halfH);

  // Apply dynamics
  const sizeJitter = stroke.dynamics.sizeJitter * Math.random();
  const opacityJitter = stroke.dynamics.opacityJitter * Math.random();
  const flowJitter = stroke.dynamics.flowJitter * Math.random();

  const effectiveOpacity = stroke.opacity * (1 - opacityJitter);
  const effectiveFlow = stroke.flow * (1 - flowJitter);

  // Blend stamp onto layer
  for (let sy = 0; sy < stampH; sy++) {
    const ly = top + sy;
    if (ly < 0 || ly >= canvasBounds.height) continue;

    for (let sx = 0; sx < stampW; sx++) {
      const lx = left + sx;
      if (lx < 0 || lx >= canvasBounds.width) continue;

      const stampIdx = (sy * stampW + sx) * 4;
      const stampAlpha = stamp.data[stampIdx + 3] / 255;
      
      if (stampAlpha === 0) continue;

      const layerIdx = (ly * canvasBounds.width + lx) * 4;
      const layerAlpha = layerData.data[layerIdx + 3] / 255;

      // Apply flow accumulation
      const flowAmount = effectiveFlow * stampAlpha * effectiveOpacity;
      
      // Simple normal blend with flow
      for (let c = 0; c < 3; c++) {
        const src = stroke.color[c === 0 ? 'r' : c === 1 ? 'g' : 'b'] / 255;
        const dst = layerData.data[layerIdx + c] / 255;
        const blended = dst * (1 - flowAmount * stampAlpha) + src * flowAmount * stampAlpha;
        layerData.data[layerIdx + c] = Math.round(blended * 255);
      }

      // Update alpha
      const newAlpha = layerAlpha + (1 - layerAlpha) * flowAmount * stampAlpha;
      layerData.data[layerIdx + 3] = Math.round(newAlpha * 255);
    }
  }
}

/**
 * Eraser tool
 */
export function applyEraser(
  layerImageData: ImageData,
  x: number,
  y: number,
  size: number,
  hardness: number,
  opacity: number,
  canvasBounds: Rect
): void {
  const canvas = document.createElement('canvas');
  canvas.width = size + 4;
  canvas.height = size + 4;
  const ctx = canvas.getContext('2d')!;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, size / 2
  );
  gradient.addColorStop(0, `rgba(0,0,0,${opacity})`);
  gradient.addColorStop(hardness, `rgba(0,0,0,${opacity})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const stamp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyEraserStamp(layerImageData, stamp, x, y, canvasBounds);
}

function applyEraserStamp(
  layerData: ImageData,
  stamp: ImageData,
  x: number,
  y: number,
  canvasBounds: Rect
): void {
  const stampW = stamp.width;
  const stampH = stamp.height;
  const halfW = stampW / 2;
  const halfH = stampH / 2;

  const left = Math.floor(x - canvasBounds.x - halfW);
  const top = Math.floor(y - canvasBounds.y - halfH);

  for (let sy = 0; sy < stampH; sy++) {
    const ly = top + sy;
    if (ly < 0 || ly >= canvasBounds.height) continue;

    for (let sx = 0; sx < stampW; sx++) {
      const lx = left + sx;
      if (lx < 0 || lx >= canvasBounds.width) continue;

      const stampIdx = (sy * stampW + sx) * 4;
      const eraseAmount = stamp.data[stampIdx + 3] / 255;
      
      if (eraseAmount === 0) continue;

      const layerIdx = (ly * canvasBounds.width + lx) * 4;
      const currentAlpha = layerData.data[layerIdx + 3] / 255;
      const newAlpha = currentAlpha * (1 - eraseAmount);
      layerData.data[layerIdx + 3] = Math.round(newAlpha * 255);
    }
  }
}

/**
 * Flood fill (paint bucket)
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: Color,
  tolerance: number = 0,
  contiguous: boolean = true,
  blendMode: string = 'normal'
): void {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  // Check if already filled
  if (colorsMatch(targetR, targetG, targetB, targetA, fillColor, tolerance)) return;

  const fillR = Math.round(fillColor.r);
  const fillG = Math.round(fillColor.g);
  const fillB = Math.round(fillColor.b);
  const fillA = Math.round(fillColor.a * 255);

  const visited = new Uint8Array(width * height);
  const stack: Point[] = [{ x: startX, y: startY }];

  const colorDistance = (r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number): number => {
    return Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2) +
      Math.pow(a1 - a2, 2) * 0.1
    );
  };

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pixelIdx = idx * 4;
    const r = data[pixelIdx];
    const g = data[pixelIdx + 1];
    const b = data[pixelIdx + 2];
    const a = data[pixelIdx + 3];

    if (!colorsMatch(r, g, b, a, { r: targetR, g: targetG, b: targetB, a: targetA / 255 }, tolerance)) {
      continue;
    }

    // Apply fill with blend mode
    applyBlendMode(data, pixelIdx, fillR, fillG, fillB, fillA, blendMode);

    // Add neighbors
    if (contiguous) {
      if (x > 0) stack.push({ x: x - 1, y });
      if (x < width - 1) stack.push({ x: x + 1, y });
      if (y > 0) stack.push({ x, y: y - 1 });
      if (y < height - 1) stack.push({ x, y: y + 1 });
    } else {
      // Non-contiguous: scan entire image (simplified - real impl would be more efficient)
      // This is just a placeholder for non-contiguous mode
    }
  }
}

function colorsMatch(
  r1: number, g1: number, b1: number, a1: number,
  color2: Color, tolerance: number
): boolean {
  const dr = r1 - color2.r;
  const dg = g1 - color2.g;
  const db = b1 - color2.b;
  const da = a1 - color2.a * 255;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da * 0.1) <= tolerance;
}

function applyBlendMode(
  data: Uint8ClampedArray,
  idx: number,
  srcR: number, srcG: number, srcB: number, srcA: number,
  mode: string
): void {
  const dstR = data[idx];
  const dstG = data[idx + 1];
  const dstB = data[idx + 2];
  const dstA = data[idx + 3];

  let outR = srcR, outG = srcG, outB = srcB, outA = srcA;

  // Simplified - just normal blend for now
  const alpha = srcA / 255;
  outR = Math.round(dstR * (1 - alpha) + srcR * alpha);
  outG = Math.round(dstG * (1 - alpha) + srcG * alpha);
  outB = Math.round(dstB * (1 - alpha) + srcB * alpha);
  outA = Math.round(dstA * (1 - alpha) + srcA * alpha);

  data[idx] = outR;
  data[idx + 1] = outG;
  data[idx + 2] = outB;
  data[idx + 3] = outA;
}

/**
 * Gaussian blur
 */
export function gaussianBlur(
  imageData: ImageData,
  radius: number
): ImageData {
  if (radius <= 0) return imageData;

  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Generate 1D kernel
  const kernel = generateGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);

  // Horizontal pass
  const tempData = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const kx = x + k - halfKernel;
        if (kx < 0 || kx >= width) continue;
        
        const idx = (y * width + kx) * 4;
        const w = kernel[k];
        r += data[idx] * w;
        g += data[idx + 1] * w;
        b += data[idx + 2] * w;
        a += data[idx + 3] * w;
        weightSum += w;
      }
      
      const outIdx = (y * width + x) * 4;
      tempData[outIdx] = r / weightSum;
      tempData[outIdx + 1] = g / weightSum;
      tempData[outIdx + 2] = b / weightSum;
      tempData[outIdx + 3] = a / weightSum;
    }
  }

  // Vertical pass
  const result = new ImageData(width, height);
  const resultData = result.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const ky = y + k - halfKernel;
        if (ky < 0 || ky >= height) continue;
        
        const idx = (ky * width + x) * 4;
        const w = kernel[k];
        r += tempData[idx] * w;
        g += tempData[idx + 1] * w;
        b += tempData[idx + 2] * w;
        a += tempData[idx + 3] * w;
        weightSum += w;
      }
      
      const outIdx = (y * width + x) * 4;
      resultData[outIdx] = Math.round(r / weightSum);
      resultData[outIdx + 1] = Math.round(g / weightSum);
      resultData[outIdx + 2] = Math.round(b / weightSum);
      resultData[outIdx + 3] = Math.round(a / weightSum);
    }
  }

  return result;
}

function generateGaussianKernel(radius: number): number[] {
  const sigma = radius / 3;
  const size = Math.ceil(radius * 2) * 2 + 1;
  const kernel: number[] = [];
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - Math.floor(size / 2);
    const val = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(val);
    sum += val;
  }

  // Normalize
  return kernel.map(v => v / sum);
}

/**
 * Sharpen (unsharp mask)
 */
export function sharpen(
  imageData: ImageData,
  amount: number,
  radius: number = 1,
  threshold: number = 0
): ImageData {
  const blurred = gaussianBlur(imageData, radius);
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const data = imageData.data;
  const blurData = blurred.data;
  const resultData = result.data;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = data[i + c] - blurData[i + c];
      if (Math.abs(diff) > threshold) {
        resultData[i + c] = clamp(data[i + c] + diff * amount);
      }
    }
    resultData[i + 3] = data[i + 3];
  }

  return result;
}

/**
 * Add noise
 */
export function addNoise(
  imageData: ImageData,
  amount: number,
  monochromatic: boolean = false,
  distribution: 'gaussian' | 'uniform' = 'gaussian'
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = result.data;

  for (let i = 0; i < data.length; i += 4) {
    let noise: number;
    
    if (distribution === 'gaussian') {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noise = noise * amount * 255 / 3; // Scale
    } else {
      noise = (Math.random() - 0.5) * 2 * amount * 255;
    }

    if (monochromatic) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = clamp(data[i + c] + noise);
      }
    } else {
      for (let c = 0; c < 3; c++) {
        const n = distribution === 'gaussian' 
          ? Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random()) * amount * 255 / 3
          : (Math.random() - 0.5) * 2 * amount * 255;
        data[i + c] = clamp(data[i + c] + n);
      }
    }
  }

  return result;
}

/**
 * Dodge tool
 */
export function dodgeBurn(
  imageData: ImageData,
  x: number,
  y: number,
  size: number,
  strength: number,
  mode: 'dodge' | 'burn',
  canvasBounds: Rect
): void {
  const canvas = document.createElement('canvas');
  canvas.width = size + 4;
  canvas.height = size + 4;
  const ctx = canvas.getContext('2d')!;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, size / 2
  );
  gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
  gradient.addColorStop(0.5, `rgba(255,255,255,${strength * 0.5})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const stamp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyDodgeBurnStamp(imageData, stamp, x, y, canvasBounds, mode);
}

function applyDodgeBurnStamp(
  layerData: ImageData,
  stamp: ImageData,
  x: number,
  y: number,
  canvasBounds: Rect,
  mode: 'dodge' | 'burn'
): void {
  const stampW = stamp.width;
  const stampH = stamp.height;
  const halfW = stampW / 2;
  const halfH = stampH / 2;

  const left = Math.floor(x - canvasBounds.x - halfW);
  const top = Math.floor(y - canvasBounds.y - halfH);

  for (let sy = 0; sy < stampH; sy++) {
    const ly = top + sy;
    if (ly < 0 || ly >= canvasBounds.height) continue;

    for (let sx = 0; sx < stampW; sx++) {
      const lx = left + sx;
      if (lx < 0 || lx >= canvasBounds.width) continue;

      const stampIdx = (sy * stampW + sx) * 4;
      const amount = stamp.data[stampIdx + 3] / 255;
      
      if (amount === 0) continue;

      const layerIdx = (ly * canvasBounds.width + lx) * 4;
      
      for (let c = 0; c < 3; c++) {
        const dst = layerData.data[layerIdx + c] / 255;
        let result: number;

        if (mode === 'dodge') {
          // Color dodge: dst / (1 - src)
          result = dst / (1 - amount + 0.001);
        } else {
          // Color burn: 1 - (1 - dst) / src
          result = 1 - (1 - dst) / (amount + 0.001);
        }

        layerData.data[layerIdx + c] = clamp(result * 255);
      }
    }
  }
}

/**
 * Smudge tool
 */
export function smudge(
  imageData: ImageData,
  x: number,
  y: number,
  size: number,
  strength: number,
  canvasBounds: Rect
): void {
  // Sample pixels in a circle and push them
  const radius = size / 2;
  const samples: { x: number; y: number; r: number; g: number; b: number; a: number }[] = [];

  // Collect samples
  for (let sy = -radius; sy <= radius; sy++) {
    for (let sx = -radius; sx <= radius; sx++) {
      const dist = Math.sqrt(sx * sx + sy * sy);
      if (dist > radius) continue;

      const lx = Math.floor(x - canvasBounds.x + sx);
      const ly = Math.floor(y - canvasBounds.y + sy);
      if (lx < 0 || lx >= canvasBounds.width || ly < 0 || ly >= canvasBounds.height) continue;

      const idx = (ly * canvasBounds.width + lx) * 4;
      samples.push({
        x: lx, y: ly,
        r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3]
      });
    }
  }

  // Push pixels
  const centerX = Math.floor(x - canvasBounds.x);
  const centerY = Math.floor(y - canvasBounds.y);

  for (const sample of samples) {
    const dx = sample.x - centerX;
    const dy = sample.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) continue;

    const pushDist = dist * strength;
    const pushX = centerX + (dx / dist) * pushDist;
    const pushY = centerY + (dy / dist) * pushDist;

    const tx = Math.round(pushX);
    const ty = Math.round(pushY);
    
    if (tx < 0 || tx >= canvasBounds.width || ty < 0 || ty >= canvasBounds.height) continue;

    const srcIdx = (sample.y * canvasBounds.width + sample.x) * 4;
    const dstIdx = (ty * canvasBounds.width + tx) * 4;

    for (let c = 0; c < 4; c++) {
      data[dstIdx + c] = data[srcIdx + c];
    }
  }
}

/**
 * Sponge tool (saturate/desaturate)
 */
export function sponge(
  imageData: ImageData,
  x: number,
  y: number,
  size: number,
  strength: number,
  mode: 'saturate' | 'desaturate',
  canvasBounds: Rect
): void {
  // Similar to dodge/burn but affects saturation
  const canvas = document.createElement('canvas');
  canvas.width = size + 4;
  canvas.height = size + 4;
  const ctx = canvas.getContext('2d')!;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, size / 2
  );
  gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const stamp = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applySpongeStamp(imageData, stamp, x, y, canvasBounds, mode);
}

function applySpongeStamp(
  layerData: ImageData,
  stamp: ImageData,
  x: number,
  y: number,
  canvasBounds: Rect,
  mode: 'saturate' | 'desaturate'
): void {
  const stampW = stamp.width;
  const stampH = stamp.height;
  const halfW = stampW / 2;
  const halfH = stampH / 2;

  const left = Math.floor(x - canvasBounds.x - halfW);
  const top = Math.floor(y - canvasBounds.y - halfH);

  for (let sy = 0; sy < stampH; sy++) {
    const ly = top + sy;
    if (ly < 0 || ly >= canvasBounds.height) continue;

    for (let sx = 0; sx < stampW; sx++) {
      const lx = left + sx;
      if (lx < 0 || lx >= canvasBounds.width) continue;

      const stampIdx = (sy * stampW + sx) * 4;
      const amount = stamp.data[stampIdx + 3] / 255;
      
      if (amount === 0) continue;

      const layerIdx = (ly * canvasBounds.width + lx) * 4;
      const r = layerData.data[layerIdx] / 255;
      const g = layerData.data[layerIdx + 1] / 255;
      const b = layerData.data[layerIdx + 2] / 255;

      // Convert to HSL
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let s = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      }

      // Adjust saturation
      if (mode === 'saturate') {
        s = Math.min(1, s + amount * 0.5);
      } else {
        s = Math.max(0, s - amount * 0.5);
      }

      // Convert back to RGB
      const [nr, ng, nb] = hslToRgb(
        r === g && g === b ? 0 : Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b),
        s, l
      );

      layerData.data[layerIdx] = Math.round(nr * 255);
      layerData.data[layerIdx + 1] = Math.round(ng * 255);
      layerData.data[layerIdx + 2] = Math.round(nb * 255);
    }
  }
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

/**
 * Gradient fill
 */
export function createGradient(
  type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond',
  stops: { offset: number; color: Color }[],
  bounds: Rect
): CanvasGradient {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const ctx = canvas.getContext('2d')!;

  let gradient: CanvasGradient;

  switch (type) {
    case 'linear':
      gradient = ctx.createLinearGradient(0, 0, bounds.width, 0);
      break;
    case 'radial':
      gradient = ctx.createRadialGradient(
        bounds.width / 2, bounds.height / 2, 0,
        bounds.width / 2, bounds.height / 2, Math.max(bounds.width, bounds.height) / 2
      );
      break;
    case 'angle':
      gradient = ctx.createConicGradient(Math.PI / 2, bounds.width / 2, bounds.height / 2);
      break;
    default:
      gradient = ctx.createLinearGradient(0, 0, bounds.width, 0);
  }

  for (const stop of stops) {
    gradient.addColorStop(stop.offset, colorToString(stop.color));
  }

  return gradient;
}

function colorToString(color: Color): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}