/**
 * Unified Canvas - Core Type Definitions
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type LayerType = 'raster' | 'vector' | 'text' | 'adjustment' | 'group';

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  mask?: ImageData;
  data: LayerData;
  bounds: Rect;
  transform: TransformMatrix;
  parentId?: string;
  children?: string[];
  adjustment?: AdjustmentData;
}

export interface LayerData {
  // Raster layer
  imageData?: ImageData;
  canvas?: HTMLCanvasElement;
  
  // Vector layer
  paths?: VectorPath[];
  
  // Text layer
  text?: TextData;
  
  // Group layer
  layerIds?: string[];
}

export interface VectorPath {
  id: string;
  points: PathPoint[];
  closed: boolean;
  fill?: Color;
  stroke?: Color;
  strokeWidth: number;
  strokeCap: 'butt' | 'round' | 'square';
  strokeJoin: 'miter' | 'round' | 'bevel';
  dashArray?: number[];
}

export interface PathPoint {
  x: number;
  y: number;
  type: 'corner' | 'smooth' | 'symmetric';
  handleIn?: Point;
  handleOut?: Point;
}

export interface TextData {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  fill: Color;
  stroke?: Color;
  strokeWidth: number;
  bounds: Rect;
  path?: VectorPath; // Text on path
}

export interface AdjustmentData {
  type: 'brightness-contrast' | 'curves' | 'levels' | 'hsl' | 'exposure' | 'vibrance' | 'color-balance';
  params: Record<string, number>;
  enabled: boolean;
}

export interface TransformMatrix {
  a: number; // scaleX
  b: number; // shearY
  c: number; // shearX
  d: number; // scaleY
  e: number; // translateX
  f: number; // translateY
}

export interface Selection {
  type: 'none' | 'marquee' | 'lasso' | 'magic-wand' | 'object';
  path?: PathPoint[];
  bounds?: Rect;
  mask?: ImageData; // Feathered selection mask
  feather: number;
  antialias: boolean;
  marchingAntsOffset: number;
}

export interface ToolOptions {
  // Brush
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  brushFlow: number;
  brushSpacing: number;
  brushShape: 'round' | 'square' | 'custom';
  brushTexture?: HTMLImageElement;
  brushDynamics: BrushDynamics;
  
  // Eraser
  eraserSize: number;
  eraserHardness: number;
  
  // Selection
  selectionMode: 'new' | 'add' | 'subtract' | 'intersect';
  selectionFeather: number;
  selectionAntialias: boolean;
  magicWandTolerance: number;
  magicWandContiguous: boolean;
  magicWandSampleAllLayers: boolean;
  
  // Pen
  penMode: 'pen' | 'curvature' | 'freeform' | 'add-anchor' | 'delete-anchor' | 'convert-anchor';
  
  // Shape
  shapeType: 'rect' | 'ellipse' | 'line' | 'polygon' | 'star' | 'custom';
  shapeFill: Color;
  shapeStroke: Color;
  shapeStrokeWidth: number;
  polygonSides: number;
  starInset: number;
  
  // Text
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  
  // Transform
  transformMode: 'free' | 'perspective' | 'warp' | 'puppet';
  maintainAspectRatio: boolean;
  rotateAroundCenter: boolean;
  
  // Crop
  cropRatio: 'free' | '1:1' | '4:5' | '16:9' | '9:16' | '3:2' | '2:3';
  cropStraighten: number;
  
  // General
  foregroundColor: Color;
  backgroundColor: Color;
}

export interface BrushDynamics {
  sizeJitter: number;
  opacityJitter: number;
  flowJitter: number;
  angleJitter: number;
  roundnessJitter: number;
  scatter: number;
  count: number;
  countJitter: number;
  textureScale: number;
  textureDepth: number;
  textureMode: 'multiply' | 'subtract' | 'overlay' | 'color-dodge' | 'color-burn';
  wetEdges: boolean;
  buildUp: boolean;
  smoothing: number;
  protectTexture: boolean;
}

export interface HistoryEntry {
  id: string;
  description: string;
  timestamp: number;
  beforeState: AppState | null;
  afterState: AppState | null;
  layerIds?: string[];
  tool?: string;
}

export interface AppState {
  layers: Layer[];
  activeLayerId: string | null;
  selection: Selection;
  canvasSize: Size;
  zoom: number;
  pan: Point;
  tool: ToolType;
  toolOptions: ToolOptions;
  history: HistoryEntry[];
  historyIndex: number;
  guides: Guide[];
  grid: GridSettings;
  rulers: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
}

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
  color: Color;
  locked: boolean;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  subdivisions: number;
  color: Color;
  style: 'lines' | 'dots';
}

export type ToolType =
  | 'select'
  | 'move'
  | 'marquee-rect'
  | 'marquee-ellipse'
  | 'marquee-single-row'
  | 'marquee-single-col'
  | 'lasso'
  | 'lasso-polygon'
  | 'lasso-magnetic'
  | 'magic-wand'
  | 'object-select'
  | 'crop'
  | 'slice'
  | 'slice-select'
  | 'eyedropper'
  | 'color-sampler'
  | 'ruler'
  | 'note'
  | 'count'
  | 'brush'
  | 'pencil'
  | 'color-replacement'
  | 'mixer-brush'
  | 'eraser'
  | 'background-eraser'
  | 'magic-eraser'
  | 'fill'
  | 'gradient'
  | 'paint-bucket'
  | 'blur'
  | 'sharpen'
  | 'smudge'
  | 'dodge'
  | 'burn'
  | 'sponge'
  | 'pen'
  | 'curvature-pen'
  | 'freeform-pen'
  | 'add-anchor'
  | 'delete-anchor'
  | 'convert-anchor'
  | 'horizontal-type'
  | 'vertical-type'
  | 'horizontal-type-mask'
  | 'vertical-type-mask'
  | 'path-select'
  | 'direct-select'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  | 'line'
  | 'custom-shape'
  | 'hand'
  | 'rotate-view'
  | 'zoom';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  description: string;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf';
  quality: number;
  width?: number;
  height?: number;
  scale?: number;
  transparent: boolean;
  includeMetadata: boolean;
  colorSpace: 'sRGB' | 'AdobeRGB' | 'P3';
}

export interface ProjectFile {
  version: string;
  name: string;
  canvasSize: Size;
  layers: Layer[];
  guides: Guide[];
  grid: GridSettings;
  history: HistoryEntry[];
  historyIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  layerCount: number;
  pixelCount: number;
  memoryUsage: number;
}