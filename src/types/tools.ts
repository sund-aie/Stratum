/**
 * Unified Canvas - Core Type Definitions (Part 4: Tools, Geometry, Colors)
 */

// ============================================================================
// TOOLS SYSTEM
// ============================================================================

export type ToolId = 
  // Selection
  | 'move' | 'artboard' | 'marqueeRect' | 'marqueeEllipse' | 'marqueeRow' | 'marqueeCol'
  | 'lasso' | 'lassoPoly' | 'lassoMagnetic' | 'quickSelect' | 'magicWand' | 'objectSelect'
  // Crop/Slice
  | 'crop' | 'perspectiveCrop' | 'slice' | 'sliceSelect'
  // Measurement
  | 'eyedropper' | 'colorSampler' | 'ruler' | 'note' | 'count'
  // Retouching
  | 'spotHeal' | 'healBrush' | 'patch' | 'contentAwareMove' | 'redEye' | 'removeTool'
  | 'cloneStamp' | 'patternStamp' | 'eraser' | 'bgEraser' | 'magicEraser'
  // Painting
  | 'brush' | 'pencil' | 'colorReplace' | 'mixerBrush' | 'historyBrush' | 'artHistoryBrush'
  | 'gradient' | 'paintBucket' | 'materialDrop'
  // Drawing/Type
  | 'pen' | 'freeformPen' | 'curvaturePen' | 'addAnchor' | 'deleteAnchor' | 'convertPoint'
  | 'typeHorizontal' | 'typeVertical' | 'typeMaskHorizontal' | 'typeMaskVertical'
  | 'pathSelect' | 'directSelect'
  | 'shapeRect' | 'shapeEllipse' | 'shapeTriangle' | 'shapePolygon' | 'shapeLine' | 'shapeCustom'
  // Navigation
  | 'hand' | 'rotateView' | 'zoom'
  // Illustrator-specific
  | 'selection' | 'directSelection' | 'groupSelection' | 'magicWandAI' | 'lassoAI'
  | 'penAI' | 'curvatureAI' | 'pencilAI' | 'smooth' | 'pathEraser' | 'joinTool'
  | 'shaper' | 'brushAI' | 'blobBrush' | 'widthTool' | 'warpTool' | 'twirlTool'
  | 'puckerTool' | 'bloatTool' | 'scallopTool' | 'crystallizeTool' | 'wrinkleTool'
  | 'freeTransformAI' | 'perspectiveDistort' | 'puppetWarpAI' | 'rotateAI' | 'reflectAI'
  | 'scaleAI' | 'shearAI' | 'reshapeAI' | 'scissors' | 'knife'
  | 'gradientAI' | 'meshTool' | 'livePaintBucket' | 'livePaintSelect'
  | 'typeAI' | 'areaType' | 'typeOnPath' | 'verticalTypeAI' | 'verticalAreaType' | 'verticalTypeOnPath' | 'touchType'
  | 'symbolSprayer' | 'symbolShifter' | 'symbolScruncher' | 'symbolSizer' | 'symbolSpinner' | 'symbolStainer' | 'symbolScreener' | 'symbolStyler'
  | 'shapeBuilder' | 'blendTool' | 'dimensionTool' | 'intertwine'
  // Lightroom Develop
  | 'lrCrop' | 'lrSpotRemoval' | 'lrRedEye' | 'lrMaskBrush' | 'lrMaskGradLinear' | 'lrMaskGradRadial'
  | 'lrMaskColorRange' | 'lrMaskLuminanceRange' | 'lrMaskDepthRange' | 'lrMaskSelectSubject' | 'lrMaskSelectSky' | 'lrMaskSelectBackground'
  | 'lrMaskSelectObjects' | 'lrMaskSelectPeople' | 'lrMaskSelectLandscape'
  // Cross-app
  | 'frameTool';

export interface ToolOptions {
  // Selection
  marqueeStyle?: 'normal' | 'fixedRatio' | 'fixedSize';
  marqueeRatio?: string; marqueeWidth?: number; marqueeHeight?: number;
  feather?: number; antiAlias?: boolean;
  sampleAllLayers?: boolean; contiguous?: boolean; tolerance?: number;
  
  // Brush
  brushSize?: number; brushHardness?: number; brushOpacity?: number; brushFlow?: number;
  brushSmoothing?: number; brushBlendMode?: import('./document').BlendMode;
  brushPreset?: string; brushSpacing?: number;
  brushShapeDynamics?: boolean; brushScattering?: boolean; brushTexture?: boolean;
  brushDualBrush?: boolean; brushColorDynamics?: boolean; brushTransfer?: boolean;
  brushWetEdges?: boolean; brushBuildUp?: boolean; brushSmoothingRadial?: boolean;
  
  // Eraser
  eraserMode?: 'brush' | 'pencil' | 'block';
  eraserSize?: number; eraserHardness?: number; eraserOpacity?: number; eraserFlow?: number;
  
  // Gradient
  gradientType?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  gradientPreset?: string; gradientReverse?: boolean; gradientDither?: boolean; gradientTransparency?: boolean;
  
  // Paint Bucket
  fillMode?: 'foreground' | 'pattern'; fillTolerance?: number; fillAntiAlias?: boolean;
  fillContiguous?: boolean; fillAllLayers?: boolean; fillPattern?: string;
  
  // Pen
  penMode?: 'path' | 'shape' | 'pixels'; penRubberBand?: boolean; penCombinesShapes?: boolean;
  
  // Shape
  shapeFill?: import('./layers').Fill; shapeStroke?: import('./layers').Stroke;
  shapeStrokeWidth?: number; shapeStrokeAlign?: 'center' | 'inside' | 'outside';
  shapeRoundedRadius?: number; shapePolygonSides?: number; shapeStarInset?: number;
  
  // Text
  fontFamily?: string; fontSize?: number; fontWeight?: string; fontStyle?: 'normal' | 'italic' | 'oblique';
  fontStretch?: string; textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string; leading?: number; tracking?: number; baselineShift?: number;
  textDecoration?: 'none' | 'underline' | 'strikethrough';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  verticalScale?: number; horizontalScale?: number;
  antiAlias?: 'none' | 'sharp' | 'crisp' | 'strong' | 'smooth';
  
  // Crop
  cropAspectRatio?: string; cropWidth?: number; cropHeight?: number;
  cropStraighten?: boolean; cropContentAware?: boolean;
  cropOverlay?: 'grid' | 'thirds' | 'diagonal' | 'triangle' | 'goldenRatio' | 'goldenSpiral' | 'aspectRatios';
  
  // Transform
  transformReferencePoint?: string; transformPerspective?: boolean; transformWarp?: boolean; transformWarpPreset?: string;
  
  // Eyedropper
  sampleSize?: 'point' | '3x3' | '5x5' | '11x11' | '31x31' | '51x51' | '101x101'; sampleRing?: boolean;
  
  // Measure
  measureUseMeasurementScale?: boolean;
  
  // Lightroom specific
  lrMaskOverlay?: 'red' | 'green' | 'white' | 'black' | 'color' | 'none'; lrMaskOverlayOpacity?: number;
  lrMaskShowPins?: boolean; lrBrushAutoMask?: boolean; lrBrushFeather?: number; lrBrushFlow?: number;
  lrBrushDensity?: number; lrBrushSize?: number;
}

// ============================================================================
// GEOMETRY UTILITIES
// ============================================================================

export interface Rect { x: number; y: number; width: number; height: number; }
export interface Size { width: number; height: number; }
export interface Point { x: number; y: number; }

export function rectUnion(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

export function rectIntersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x >= x2 || y >= y2) return null;
  return { x, y, width: x2 - x, height: y2 - y };
}

export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
}

export function applyTransform(p: Point, t: Transform): Point {
  let x = p.x - t.originX;
  let y = p.y - t.originY;
  x *= t.scaleX; y *= t.scaleY;
  const sx = x + y * Math.tan(t.skewX);
  const sy = y + x * Math.tan(t.skewY); x = sx; y = sy;
  const cos = Math.cos(t.rotation); const sin = Math.sin(t.rotation);
  const rx = x * cos - y * sin; const ry = x * sin + y * cos; x = rx; y = ry;
  if (t.flipX) x = -x; if (t.flipY) y = -y;
  return { x: x + t.originX + t.x, y: y + t.originY + t.y };
}

export function identityTransform(): Transform {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, originX: 0, originY: 0, flipX: false, flipY: false };
}

export interface Transform {
  x: number; y: number; scaleX: number; scaleY: number; rotation: number;
  skewX: number; skewY: number; originX: number; originY: number; flipX: boolean; flipY: boolean;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export interface RGBA { r: number; g: number; b: number; a: number; }
export interface HSLA { h: number; s: number; l: number; a: number; }

export function hexToRgba(hex: string): RGBA {
  const clean = hex.replace('#', '');
  if (clean.length === 3) return { r: parseInt(clean[0]+clean[0],16), g: parseInt(clean[1]+clean[1],16), b: parseInt(clean[2]+clean[2],16), a: 255 };
  if (clean.length === 6) return { r: parseInt(clean.slice(0,2),16), g: parseInt(clean.slice(2,4),16), b: parseInt(clean.slice(4,6),16), a: 255 };
  if (clean.length === 8) return { r: parseInt(clean.slice(0,2),16), g: parseInt(clean.slice(2,4),16), b: parseInt(clean.slice(4,6),16), a: parseInt(clean.slice(6,8),16) };
  return { r: 0, g: 0, b: 0, a: 255 };
}

export function rgbaToHex(rgba: RGBA): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(rgba.a)}`;
}

export function rgbaToHsla(rgba: RGBA): HSLA {
  const r = rgba.r/255, g = rgba.g/255, b = rgba.b/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    const d = max-min; s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){ case r: h=(g-b)/d+(g<b?6:0); break; case g: h=(b-r)/d+2; break; case b: h=(r-g)/d+4; break; }
    h *= 60;
  }
  return { h, s: s*100, l: l*100, a: rgba.a/255 };
}