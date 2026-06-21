/**
 * Stratum - Unified Creative Suite
 * Core type definitions for raster, vector, and photo editing
 */

// ============================================================================
// LAYER TYPES
// ============================================================================

export type LayerType = 'raster' | 'vector' | 'adjustment' | 'mask' | 'group' | 'text' | 'fill';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  order: number;
  parentId?: string;
  expanded?: boolean; // For groups
  /** Per-layer raster mask (alpha multiplier) applied during compositing. */
  layerMask?: MaskData;
}

export interface RasterLayer extends BaseLayer {
  type: 'raster';
  width: number;
  height: number;
  pixelData?: ImageData;
  source?: string; // URL or base64
}

export interface VectorLayer extends BaseLayer {
  type: 'vector';
  paths: VectorPath[];
  fill?: FillStyle;
  stroke?: StrokeStyle;
  effects?: VectorEffect[];
}

export interface AdjustmentLayer extends BaseLayer {
  type: 'adjustment';
  adjustmentType: AdjustmentType;
  settings: AdjustmentSettings;
  mask?: MaskData;
}

export interface MaskLayer extends BaseLayer {
  type: 'mask';
  targetLayerId: string;
  maskData: MaskData;
  inverted: boolean;
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  children: Layer[];
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: RGBAColor;
  align: 'left' | 'center' | 'right';
  leading: number; // line height in px
  tracking: number; // letter spacing in px
  boxWidth?: number; // paragraph text wrap width
}

export interface FillLayer extends BaseLayer {
  type: 'fill';
  fill: FillStyle;
  /** Optional clip path; when absent fills the whole artboard. */
  mask?: MaskData;
}

export type Layer =
  | RasterLayer
  | VectorLayer
  | AdjustmentLayer
  | MaskLayer
  | GroupLayer
  | TextLayer
  | FillLayer;

// ============================================================================
// VECTOR TYPES
// ============================================================================

export interface VectorPath {
  id: string;
  closed: boolean;
  points: AnchorPoint[];
  fill?: FillStyle;
  stroke?: StrokeStyle;
}

export interface AnchorPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
  cornerType: 'smooth' | 'corner';
}

export interface FillStyle {
  type: 'solid' | 'gradient' | 'pattern';
  color?: RGBAColor;
  gradient?: GradientData;
  pattern?: PatternData;
  opacity: number;
}

export interface StrokeStyle {
  color: RGBAColor;
  width: number;
  dashArray?: number[];
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  miterLimit: number;
  opacity: number;
}

export interface GradientData {
  type: 'linear' | 'radial' | 'angular';
  stops: GradientStop[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface GradientStop {
  offset: number; // 0-1
  color: RGBAColor;
}

export interface PatternData {
  id: string;
  repeat: 'repeat' | 'reflect' | 'none';
}

export interface VectorEffect {
  type: 'dropShadow' | 'innerShadow' | 'glow' | 'blur';
  enabled: boolean;
  settings: Record<string, number | RGBAColor>;
}

// ============================================================================
// ADJUSTMENT TYPES (raster / photo adjustments)
// ============================================================================

export type AdjustmentType = 
  | 'exposure'
  | 'contrast'
  | 'highlights'
  | 'shadows'
  | 'whites'
  | 'blacks'
  | 'vibrance'
  | 'saturation'
  | 'temperature'
  | 'tint'
  | 'hue'
  | 'curves'
  | 'levels'
  | 'colorBalance'
  | 'splitToning'
  | 'hsl'
  | 'sharpening'
  | 'noiseReduction'
  | 'vignette'
  | 'dehaze'
  | 'clarity'
  | 'texture'
  | 'invert'
  | 'posterize'
  | 'threshold'
  | 'gradientMap';

export interface AdjustmentSettings {
  // Basic develop-style adjustments
  exposure?: number; // -10 to +10
  contrast?: number; // -100 to +100
  highlights?: number; // -100 to +100
  shadows?: number; // -100 to +100
  whites?: number; // -100 to +100
  blacks?: number; // -100 to +100
  vibrance?: number; // -100 to +100
  saturationAdjust?: number; // -100 to +100 (renamed to avoid conflict)
  temperature?: number; // -100 to +100
  tint?: number; // -100 to +100
  clarity?: number; // -100 to +100
  dehaze?: number; // -100 to +100
  texture?: number; // -100 to +100
  
  // HSL
  hue?: HSLAdjustments;
  saturationHSL?: HSLAdjustments; // Renamed to avoid conflict
  luminance?: HSLAdjustments;
  
  // Curves
  curves?: CurveChannels;
  
  // Levels
  levels?: LevelChannels;
  
  // Color Balance
  colorBalance?: ColorBalanceSettings;
  
  // Split Toning
  splitToning?: SplitToningSettings;
  
  // Sharpening & Noise
  sharpening?: SharpeningSettings;
  noiseReduction?: NoiseReductionSettings;
  
  // Vignette
  vignette?: VignetteSettings;
  
  // Special
  invert?: boolean;
  posterize?: number;
  threshold?: number;
  gradientMap?: GradientData;
}

export interface HSLAdjustments {
  red: number;
  orange: number;
  yellow: number;
  green: number;
  aqua: number;
  blue: number;
  purple: number;
  magenta: number;
}

export interface CurveChannels {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface CurvePoint {
  x: number; // 0-255
  y: number; // 0-255
}

export interface LevelChannels {
  rgb: LevelSettings;
  red: LevelSettings;
  green: LevelSettings;
  blue: LevelSettings;
}

export interface LevelSettings {
  inputLow: number;
  inputMid: number;
  inputHigh: number;
  outputLow: number;
  outputHigh: number;
}

export interface ColorBalanceSettings {
  shadows: { r: number; g: number; b: number };
  midtones: { r: number; g: number; b: number };
  highlights: { r: number; g: number; b: number };
  preserveLuminosity: boolean;
}

export interface SplitToningSettings {
  highlights: { hue: number; saturation: number };
  shadows: { hue: number; saturation: number };
  balance: number;
}

export interface SharpeningSettings {
  amount: number;
  radius: number;
  detail: number;
  masking: number;
}

export interface NoiseReductionSettings {
  luminance: number;
  detail: number;
  contrast: number;
  color: number;
  smoothness: number;
}

export interface VignetteSettings {
  amount: number;
  midpoint: number;
  roundness: number;
  feather: number;
}

// ============================================================================
// MASK TYPES
// ============================================================================

export interface MaskData {
  type: 'pixel' | 'vector' | 'gradient' | 'brush';
  pixelData?: ImageData;
  vectorPath?: VectorPath;
  gradient?: GradientData;
  inverted: boolean;
}

// ============================================================================
// COLOR TYPES
// ============================================================================

export interface RGBAColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface HSVAColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
  a: number; // 0-1
}

export interface LABColor {
  l: number; // 0-100
  a: number; // -128 to +127
  b: number; // -128 to +127
}

// ============================================================================
// BLEND MODES
// ============================================================================

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
  | 'luminosity'
  | 'passthrough';

// ============================================================================
// DOCUMENT & ARTBOARD
// ============================================================================

export interface Document {
  id: string;
  name: string;
  artboards: Artboard[];
  activeArtboardId: string;
  layers: Layer[];
  history: HistoryState[];
  historyIndex: number;
  metadata: DocumentMetadata;
}

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: RGBAColor;
  locked: boolean;
}

export interface DocumentMetadata {
  createdAt: Date;
  modifiedAt: Date;
  version: string;
  colorProfile: string;
  bitsPerChannel: 8 | 16 | 32;
}

// ============================================================================
// HISTORY & UNDO
// ============================================================================

export interface HistoryState {
  id: string;
  name: string;
  timestamp: number;
  snapshot?: Uint8ClampedArray;
  layerStates?: Map<string, Layer>;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export type ToolCategory = 'select' | 'crop' | 'slice' | 'navigation' | 'retouch' | 'paint' | 'draw' | 'type' | 'vector';

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  icon: string;
  shortcut: string;
  description: string;
  options: ToolOption[];
}

export interface ToolOption {
  id: string;
  type: 'checkbox' | 'slider' | 'dropdown' | 'color' | 'text' | 'button-group';
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  /** Dropdown choices. Authoring may use bare strings; normalize at render. */
  options?: Array<string | { value: string; label: string }>;
  /** Segmented button choices for `button-group`. */
  buttons?: Array<{ value: string; label: string; icon?: string; tooltip?: string }>;
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

export interface SelectionData {
  type: 'rect' | 'ellipse' | 'polygon' | 'path' | 'magic';
  bounds?: { x: number; y: number; width: number; height: number };
  path?: VectorPath;
  feather?: number;
  antiAlias: boolean;
  /**
   * Rasterized selection mask in artboard pixel space (0=outside, 255=inside).
   * When present it is authoritative for clipping edits. width/height describe it.
   */
  mask?: Uint8Array;
  maskWidth?: number;
  maskHeight?: number;
}

export interface TransformData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface CanvasEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'dblclick' | 'wheel' | 'keydown' | 'keyup';
  /** Raw screen coordinates (clientX/clientY). */
  x: number;
  y: number;
  /** Artboard-pixel coordinates (DPR/zoom/pan/origin already removed). */
  canvasX: number;
  canvasY: number;
  button?: number;
  buttons?: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  delta?: number;
  key?: string;
  /** Pen pressure 0..1 (1 for mouse). */
  pressure?: number;
  pointerType?: string;
}

// ============================================================================
// VIEWPORT & ZOOM
// ============================================================================

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  rulerVisible: boolean;
  gridVisible: boolean;
  guidesVisible: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
  pixelPreview: boolean;
}

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
  locked: boolean;
  color?: RGBAColor;
}

// ============================================================================
// AI FEATURES (2026)
// ============================================================================

export interface AIFeatureRequest {
  type: 'generativeFill' | 'generativeExpand' | 'generativeRemove' | 'neuralFilter' | 'selectSubject' | 'selectSky' | 'enhance';
  prompt?: string;
  selection?: SelectionData;
  layerId?: string;
  settings: Record<string, unknown>;
}

export interface AIFeatureResult {
  success: boolean;
  data?: ImageData | VectorPath[] | MaskData;
  error?: string;
}

// ============================================================================
// PERFORMANCE & GPU
// ============================================================================

export interface GPUCapabilities {
  available: boolean;
  maxTextureSize: number;
  maxViewportDims: number;
  supportsComputeShaders: boolean;
  supportsFloatTextures: boolean;
  vramGB: number;
}

export interface RenderSettings {
  useGPU: boolean;
  quality: 'draft' | 'preview' | 'final';
  downsampleFactor: number;
  liveRendering: boolean;
}
