/**
 * Unified Canvas - Core Type Definitions (Part 1: Document, Layer, Geometry)
 */

// ============================================================================
// DOCUMENT & CANVAS
// ============================================================================

export interface Document {
  id: string;
  name: string;
  width: number;
  height: number;
  resolution: number; // PPI
  colorMode: ColorMode;
  colorProfile: string; // ICC profile name
  backgroundColor: string; // Hex
  layers: Layer[];
  activeLayerId: string | null;
  history: HistoryState[];
  historyIndex: number;
  guides: Guide[];
  grid: GridSettings;
  createdAt: number;
  updatedAt: number;
}

export type ColorMode = 'RGB' | 'CMYK' | 'Lab' | 'Grayscale' | 'Bitmap';

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // in pixels from top/left
  color: string;
  locked: boolean;
}

export interface GridSettings {
  enabled: boolean;
  size: number; // pixels
  subdivisions: number;
  color: string;
}

// ============================================================================
// LAYER SYSTEM (Photoshop-style with Illustrator vectors + LR adjustments)
// ============================================================================

export type LayerType = 
  | 'raster'           // Pixel data (Photoshop)
  | 'vector'           // Paths, shapes, text (Illustrator)
  | 'adjustment'       // Non-destructive adjustment (Photoshop/LR)
  | 'fill'             // Solid/Gradient/Pattern fill
  | 'smart_object'     // Embedded document
  | 'group';           // Layer group

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  locked: boolean;
  lockedPixels: boolean;
  lockedPosition: boolean;
  lockedTransparency: boolean;
  mask: LayerMask | null;
  vectorMask: VectorMask | null;
  clippingMask: boolean; // Clip to layer below
  transform: Transform;
  filters: FilterEffect[];
  
  // Type-specific data
  rasterData?: RasterLayerData;
  vectorData?: VectorLayerData;
  adjustmentData?: AdjustmentLayerData;
  fillData?: FillLayerData;
  smartObjectData?: SmartObjectData;
  groupData?: GroupLayerData;
}

export interface LayerMask {
  enabled: boolean;
  density: number; // 0-1
  feather: number; // pixels
  data: ImageData | null; // Grayscale mask
  invert: boolean;
}

export interface VectorMask {
  enabled: boolean;
  density: number;
  feather: number;
  paths: Path[];
  invert: boolean;
}

export type BlendMode = 
  | 'normal' | 'dissolve'
  | 'darken' | 'multiply' | 'colorBurn' | 'linearBurn' | 'darkerColor'
  | 'lighten' | 'screen' | 'colorDodge' | 'linearDodge' | 'lighterColor'
  | 'overlay' | 'softLight' | 'hardLight' | 'vividLight' | 'linearLight' | 'pinLight' | 'hardMix'
  | 'difference' | 'exclusion' | 'subtract' | 'divide'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // radians
  skewX: number;
  skewY: number;
  originX: number; // 0-1
  originY: number; // 0-1
  flipX: boolean;
  flipY: boolean;
}

export interface FilterEffect {
  id: string;
  type: FilterType;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export type FilterType = 
  | 'gaussianBlur' | 'motionBlur' | 'smartBlur' | 'surfaceBlur'
  | 'sharpen' | 'sharpenEdges' | 'sharpenMore' | 'unsharpMask' | 'smartSharpen'
  | 'noise' | 'reduceNoise' | 'median' | 'dustAndScratches'
  | 'emboss' | 'findEdges' | 'highPass' | 'minimum' | 'maximum'
  | 'offset' | 'spherize' | 'ripple' | 'wave' | 'zigZag'
  | 'lensCorrection' | 'adaptiveWideAngle'
  | 'cameraRawFilter' | 'liquify' | 'vanishingPoint' | 'perspectiveWarp' | 'puppetWarp';