/**
 * Unified Canvas - Core Type Definitions
 * Combines Photoshop, Illustrator, and Lightroom concepts
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

// ============================================================================
// RASTER LAYER (Photoshop)
// ============================================================================

export interface RasterLayerData {
  canvas: OffscreenCanvas | HTMLCanvasElement | null;
  width: number;
  height: number;
  // For non-destructive editing: store original + operations
  originalData?: ImageData;
  operations: RasterOperation[];
}

export type RasterOperationType = 
  | 'brush' | 'eraser' | 'fill' | 'gradient' | 'filter'
  | 'transform' | 'adjustment' | 'clone' | 'heal' | 'patch';

export interface RasterOperation {
  id: string;
  type: RasterOperationType;
  timestamp: number;
  data: any; // Type-specific operation data
  bounds: Rect; // Affected region for optimization
}

// ============================================================================
// VECTOR LAYER (Illustrator)
// ============================================================================

export interface VectorLayerData {
  paths: Path[];
  artboards: Artboard[];
  // Live effects (Illustrator Appearance panel)
  appearances: Appearance[];
}

export interface Path {
  id: string;
  segments: PathSegment[];
  closed: boolean;
  fill: Fill | null;
  stroke: Stroke | null;
  transform: Transform;
  // Live Path Effects
  effects: PathEffect[];
}

export interface PathSegment {
  type: 'line' | 'curve';
  // For line: end point
  // For curve: control points + end point
  point: Point;
  ctrl1?: Point;
  ctrl2?: Point;
}

export interface Point {
  x: number;
  y: number;
}

export type Fill = 
  | { type: 'solid'; color: string; opacity: number }
  | { type: 'linearGradient'; gradient: Gradient; opacity: number }
  | { type: 'radialGradient'; gradient: Gradient; opacity: number }
  | { type: 'freeformGradient'; stops: FreeformGradientStop[]; opacity: number }
  | { type: 'pattern'; patternId: string; opacity: number }
  | { type: 'none' };

export interface Gradient {
  stops: GradientStop[];
  angle: number; // radians
  center?: Point;
  radius?: number;
  focalPoint?: Point;
}

export interface GradientStop {
  offset: number; // 0-1
  color: string;
  opacity: number;
  midpoint?: number;
}

export interface FreeformGradientStop {
  id: string;
  point: Point;
  color: string;
  opacity: number;
}

export type Stroke = 
  | { type: 'solid'; color: string; width: number; opacity: number }
  | { type: 'linearGradient'; gradient: Gradient; width: number; opacity: number }
  | { type: 'radialGradient'; gradient: Gradient; width: number; opacity: number }
  | { type: 'none' };

export interface StrokeOptions {
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  miterLimit: number;
  dashArray: number[];
  dashOffset: number;
  alignment: 'center' | 'inside' | 'outside';
  variableWidthProfile?: VariableWidthProfile;
}

export interface VariableWidthProfile {
  points: WidthPoint[]; // position 0-1, width multiplier
}

export interface WidthPoint {
  position: number;
  width: number;
}

export interface PathEffect {
  id: string;
  type: PathEffectType;
  enabled: boolean;
  params: Record<string, any>;
}

export type PathEffectType = 
  | 'zigZag' | 'roughen' | 'scribble' | 'puckerAndBloat' | 'transform'
  | 'offset' | 'roundCorners' | 'addArrowheads' | 'trimPaths'
  | 'wavy' | 'distortAndTransform' | 'envelopeDistort';

export interface Artboard {
  id: string;
  name: string;
  rect: Rect;
  backgroundColor: string;
}

export interface Appearance {
  id: string;
  fills: Fill[];
  strokes: Stroke[];
  effects: Effect[];
}

export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: Record<string, any>;
}

export type EffectType = 
  | 'dropShadow' | 'innerShadow' | 'outerGlow' | 'innerGlow'
  | 'bevelEmboss' | 'satin' | 'colorOverlay' | 'gradientOverlay' | 'patternOverlay'
  | 'stroke' | 'gaussianBlur' | 'feather';

// ============================================================================
// ADJUSTMENT LAYERS (Photoshop + Lightroom)
// ============================================================================

export interface AdjustmentLayerData {
  type: AdjustmentType;
  params: AdjustmentParams;
  // For clipping to layer below
  clipped: boolean;
  // Mask is in base Layer
}

export type AdjustmentType = 
  // Photoshop
  | 'brightnessContrast' | 'levels' | 'curves' | 'exposure' | 'vibrance'
  | 'hueSaturation' | 'colorBalance' | 'blackWhite' | 'photoFilter' | 'channelMixer'
  | 'colorLookup' | 'invert' | 'posterize' | 'threshold' | 'gradientMap'
  | 'selectiveColor' | 'shadowsHighlights' | 'hdrToning'
  // Lightroom-style
  | 'basic' | 'toneCurve' | 'hsl' | 'colorGrading' | 'detail' | 'lensCorrection'
  | 'transform' | 'effects' | 'calibration';

export interface AdjustmentParams {
  // Brightness/Contrast
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  useLegacy?: boolean;
  
  // Levels
  levelsInputBlack?: number; // 0-255
  levelsInputWhite?: number; // 0-255
  levelsInputGamma?: number; // 0.1-10
  levelsOutputBlack?: number; // 0-255
  levelsOutputWhite?: number; // 0-255
  levelsChannel?: 'rgb' | 'red' | 'green' | 'blue';
  
  // Curves
  curvesPoints?: CurvePoint[]; // Per channel
  curvesChannel?: 'rgb' | 'red' | 'green' | 'blue';
  
  // Exposure
  exposure?: number; // -5 to 5
  offset?: number; // -1 to 1
  gamma?: number; // 0.1 to 10
  
  // Vibrance
  vibrance?: number; // -100 to 100
  saturation?: number; // -100 to 100
  
  // Hue/Saturation
  hueShift?: number; // -180 to 180
  satShift?: number; // -100 to 100
  lightShift?: number; // -100 to 100
  hueRange?: HueRange[];
  colorize?: boolean;
  colorizeHue?: number;
  colorizeSat?: number;
  colorizeLight?: number;
  
  // Color Balance
  shadows?: ColorShift;
  midtones?: ColorShift;
  highlights?: ColorShift;
  preserveLuminosity?: boolean;
  
  // Black & White
  bwRed?: number; // -200 to 300
  bwYellow?: number;
  bwGreen?: number;
  bwCyan?: number;
  bwBlue?: number;
  bwMagenta?: number;
  bwTint?: boolean;
  bwTintHue?: number;
  bwTintSat?: number;
  
  // Photo Filter
  filterColor?: string;
  filterDensity?: number; // 0-100
  preserveLuminosityPF?: boolean;
  
  // Channel Mixer
  channelMixerRed?: ChannelValues;
  channelMixerGreen?: ChannelValues;
  channelMixerBlue?: ChannelValues;
  channelMixerConstant?: number; // -200 to 200
  channelMixerMonochrome?: boolean;
  
  // Color Lookup
  lut3D?: string; // .cube file reference
  lutAbstract?: string;
  lutDeviceLink?: string;
  
  // Posterize
  posterizeLevels?: number; // 2-255
  
  // Threshold
  thresholdLevel?: number; // 1-255
  
  // Gradient Map
  gradientMapGradient?: Gradient;
  gradientMapDither?: boolean;
  gradientMapReverse?: boolean;
  
  // Selective Color
  selectiveColors?: SelectiveColor[];
  selectiveColorMethod?: 'relative' | 'absolute';
  
  // Shadows/Highlights
  shadowsAmount?: number; // 0-100
  shadowsTonalWidth?: number; // 0-100
  shadowsRadius?: number; // 0-500
  highlightsAmount?: number;
  highlightsTonalWidth?: number;
  highlightsRadius?: number;
  colorCorrection?: number; // -100 to 100
  midtoneContrast?: number; // -100 to 100
  shadowsClip?: number; // 0-1
  highlightsClip?: number; // 0-1
  
  // Lightroom Basic
  lrTemperature?: number; // -100 to 100
  lrTint?: number; // -100 to 100
  lrExposure?: number; // -5 to 5
  lrContrast?: number; // -100 to 100
  lrHighlights?: number; // -100 to 100
  lrShadows?: number; // -100 to 100
  lrWhites?: number; // -100 to 100
  lrBlacks?: number; // -100 to 100
  lrTexture?: number; // -100 to 100
  lrClarity?: number; // -100 to 100
  lrDehaze?: number; // -100 to 100
  lrVibrance?: number; // -100 to 100
  lrSaturation?: number; // -100 to 100
  
  // Tone Curve
  toneCurveParametric?: ToneCurveParametric;
  toneCurvePoint?: ToneCurvePoint[];
  toneCurveChannel?: 'rgb' | 'red' | 'green' | 'blue';
  toneCurveRefineSat?: number; // -100 to 100
  
  // HSL/Color/B&W
  hslHue?: HSLValues;
  hslSat?: HSLValues;
  hslLum?: HSLValues;
  hslColorMode?: 'hsl' | 'color' | 'bw';
  
  // Color Grading
  colorGradingShadows?: ColorWheel;
  colorGradingMidtones?: ColorWheel;
  colorGradingHighlights?: ColorWheel;
  colorGradingGlobal?: ColorWheel;
  colorGradingBlending?: number; // 0-100
  colorGradingBalance?: number; // -100 to 100
  
  // Detail
  sharpenAmount?: number; // 0-150
  sharpenRadius?: number; // 0.5-3
  sharpenDetail?: number; // 0-100
  sharpenMasking?: number; // 0-100
  nrLuminance?: number; // 0-100
  nrLuminanceDetail?: number; // 0-100
  nrLuminanceContrast?: number; // 0-100
  nrColor?: number; // 0-100
  nrColorDetail?: number; // 0-100
  nrColorSmoothness?: number; // 0-100
  
  // Lens Correction
  lensProfileEnable?: boolean;
  lensProfileMake?: string;
  lensProfileModel?: string;
  lensProfileProfile?: string;
  lensDistortion?: number; // -100 to 100
  lensVignetting?: number; // -100 to 100
  lensDefringe?: number; // 0-100
  lensDefringeHue?: number;
  lensDefringeHueWidth?: number;
  
  // Transform
  transformMode?: 'auto' | 'guided' | 'level' | 'vertical' | 'full';
  transformVertical?: number; // -100 to 100
  transformHorizontal?: number;
  transformRotate?: number;
  transformAspect?: number;
  transformScale?: number;
  transformOffsetX?: number;
  transformOffsetY?: number;
  transformGuidedLines?: GuidedLine[];
  
  // Effects
  vignetteAmount?: number; // -100 to 100
  vignetteMidpoint?: number; // 0-100
  vignetteRoundness?: number; // -100 to 100
  vignetteFeather?: number; // 0-100
  vignetteHighlights?: number; // -100 to 100
  grainAmount?: number; // 0-100
  grainSize?: number; // 0-100
  grainRoughness?: number; // 0-100
  
  // Calibration
  calibrationShadowsTint?: number; // -100 to 100
  calibrationRedHue?: number; // -100 to 100
  calibrationRedSat?: number; // -100 to 100
  calibrationGreenHue?: number;
  calibrationGreenSat?: number;
  calibrationBlueHue?: number;
  calibrationBlueSat?: number;
  calibrationProcessVersion?: string;
}

export interface CurvePoint {
  input: number; // 0-255
  output: number; // 0-255
}

export interface HueRange {
  hue: number; // 0-360
  range: number; // 0-360
}

export interface ColorShift {
  cyanRed: number; // -100 to 100
  magentaGreen: number;
  yellowBlue: number;
}

export interface ChannelValues {
  red: number; // -200 to 200
  green: number;
  blue: number;
}

export interface SelectiveColor {
  color: 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'whites' | 'neutrals' | 'blacks';
  cyan: number; // -100 to 100
  magenta: number;
  yellow: number;
  black: number;
}

export interface ToneCurveParametric {
  highlights: number; // -100 to 100
  lights: number;
  darks: number;
  shadows: number;
  highlightsSplit: number; // 0-100
  lightsSplit: number;
  darksSplit: number;
}

export interface ToneCurvePoint {
  input: number; // 0-1
  output: number; // 0-1
}

export interface HSLValues {
  red: number; // -100 to 100
  orange: number;
  yellow: number;
  green: number;
  aqua: number;
  blue: number;
  purple: number;
  magenta: number;
}

export interface ColorWheel {
  hue: number; // 0-360
  saturation: number; // 0-100
  // angle and distance from center in UI
}

export interface GuidedLine {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

// ============================================================================
// FILL LAYER
// ============================================================================

export interface FillLayerData {
  fillType: 'solid' | 'gradient' | 'pattern';
  fill: Fill;
  // Pattern specific
  patternId?: string;
  patternScale?: number;
  patternAngle?: number;
  // Gradient specific
  gradient?: Gradient;
  gradientStyle?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  gradientReverse?: boolean;
  gradientAlign?: boolean;
  gradientScale?: number;
}

// ============================================================================
// SMART OBJECT
// ============================================================================

export interface SmartObjectData {
  // Embedded or linked
  embedded: boolean;
  // If linked
  filePath?: string;
  // Embedded document data
  document?: Document;
  // Placed transform
  placedTransform: Transform;
  // Filter mask
  filterMask?: LayerMask;
}

// ============================================================================
// GROUP LAYER
// ============================================================================

export interface GroupLayerData {
  // Just a container - children are in document.layers with parentGroupId
  expanded: boolean;
  // Group-level blend mode (pass through vs normal)
  passThrough: boolean;
}

// ============================================================================
// HISTORY / UNDO
// ============================================================================

export interface HistoryState {
  id: string;
  name: string;
  timestamp: number;
  // Snapshot or delta
  type: 'snapshot' | 'delta';
  documentSnapshot?: Document; // Full snapshot (expensive)
  delta?: HistoryDelta; // Incremental change
  layerIdsAffected: string[];
}

export interface HistoryDelta {
  action: HistoryActionType;
  layerId: string;
  prevState: Partial<Layer>;
  newState: Partial<Layer>;
}

export type HistoryActionType = 
  | 'createLayer' | 'deleteLayer' | 'duplicateLayer' | 'moveLayer'
  | 'layerVisibility' | 'layerOpacity' | 'layerBlendMode' | 'layerLock'
  | 'layerMask' | 'layerVectorMask' | 'layerClippingMask'
  | 'layerTransform' | 'layerFilter'
  | 'rasterPaint' | 'rasterErase' | 'rasterFill' | 'rasterFilter'
  | 'vectorPath' | 'vectorPoint' | 'vectorStroke' | 'vectorFill'
  | 'textEdit' | 'textFormat'
  | 'adjustmentParams' | 'adjustmentClipped'
  | 'fillContent' | 'smartObjectEdit' | 'groupExpand';

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
  // 3D (placeholder)
  // | '3dObjectRotate' | ...

  // Illustrator-specific tools
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

  // Lightroom Develop tools (in Develop module)
  | 'lrCrop' | 'lrSpotRemoval' | 'lrRedEye' | 'lrMaskBrush' | 'lrMaskGradLinear' | 'lrMaskGradRadial'
  | 'lrMaskColorRange' | 'lrMaskLuminanceRange' | 'lrMaskDepthRange' | 'lrMaskSelectSubject' | 'lrMaskSelectSky' | 'lrMaskSelectBackground'
  | 'lrMaskSelectObjects' | 'lrMaskSelectPeople' | 'lrMaskSelectLandscape'

  // Cross-app
  | 'frameTool';

export interface ToolOptions {
  // Selection
  marqueeStyle?: 'normal' | 'fixedRatio' | 'fixedSize';
  marqueeRatio?: string; // "1:1"
  marqueeWidth?: number;
  marqueeHeight?: number;
  feather?: number;
  antiAlias?: boolean;
  sampleAllLayers?: boolean;
  contiguous?: boolean;
  tolerance?: number; // 0-255
  
  // Brush
  brushSize?: number;
  brushHardness?: number; // 0-100
  brushOpacity?: number; // 0-100
  brushFlow?: number; // 0-100
  brushSmoothing?: number; // 0-100
  brushBlendMode?: BlendMode;
  brushPreset?: string;
  brushSpacing?: number; // 1-1000
  brushShapeDynamics?: boolean;
  brushScattering?: boolean;
  brushTexture?: boolean;
  brushDualBrush?: boolean;
  brushColorDynamics?: boolean;
  brushTransfer?: boolean;
  brushWetEdges?: boolean;
  brushBuildUp?: boolean;
  brushSmoothingRadial?: boolean;
  
  // Eraser
  eraserMode?: 'brush' | 'pencil' | 'block';
  eraserSize?: number;
  eraserHardness?: number;
  eraserOpacity?: number;
  eraserFlow?: number;
  
  // Gradient
  gradientType?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  gradientPreset?: string;
  gradientReverse?: boolean;
  gradientDither?: boolean;
  gradientTransparency?: boolean;
  
  // Paint Bucket
  fillMode?: 'foreground' | 'pattern';
  fillTolerance?: number;
  fillAntiAlias?: boolean;
  fillContiguous?: boolean;
  fillAllLayers?: boolean;
  fillPattern?: string;
  
  // Pen
  penMode?: 'path' | 'shape' | 'pixels';
  penRubberBand?: boolean;
  penCombinesShapes?: boolean;
  
  // Shape
  shapeFill?: Fill;
  shapeStroke?: Stroke;
  shapeStrokeWidth?: number;
  shapeStrokeAlign?: 'center' | 'inside' | 'outside';
  shapeRoundedRadius?: number;
  shapePolygonSides?: number;
  shapeStarInset?: number;
  
  // Text
  fontFamily?: string;
  fontSize?: number; // px
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontStretch?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  leading?: number; // auto or px
  tracking?: number; // em
  baselineShift?: number;
  textDecoration?: 'none' | 'underline' | 'strikethrough';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  verticalScale?: number;
  horizontalScale?: number;
  antiAlias?: 'none' | 'sharp' | 'crisp' | 'strong' | 'smooth';
  
  // Crop
  cropAspectRatio?: string; // "original" | "1:1" | "4:5" | "16:9" | "custom"
  cropWidth?: number;
  cropHeight?: number;
  cropStraighten?: boolean;
  cropContentAware?: boolean;
  cropOverlay?: 'grid' | 'thirds' | 'diagonal' | 'triangle' | 'goldenRatio' | 'goldenSpiral' | 'aspectRatios';
  
  // Transform
  transformReferencePoint?: string; // 3x3 grid position
  transformPerspective?: boolean;
  transformWarp?: boolean;
  transformWarpPreset?: string;
  
  // Eyedropper
  sampleSize?: 'point' | '3x3' | '5x5' | '11x11' | '31x31' | '51x51' | '101x101';
  sampleRing?: boolean;
  
  // Measure
  measureUseMeasurementScale?: boolean;
  
  // Lightroom specific
  lrMaskOverlay?: 'red' | 'green' | 'white' | 'black' | 'color' | 'none';
  lrMaskOverlayOpacity?: number;
  lrMaskShowPins?: boolean;
  lrBrushAutoMask?: boolean;
  lrBrushFeather?: number;
  lrBrushFlow?: number;
  lrBrushDensity?: number;
  lrBrushSize?: number;
}

// ============================================================================
// GEOMETRY UTILITIES
// ============================================================================

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

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
  // Translate to origin
  let x = p.x - t.originX;
  let y = p.y - t.originY;
  
  // Scale
  x *= t.scaleX;
  y *= t.scaleY;
  
  // Skew
  const sx = x + y * Math.tan(t.skewX);
  const sy = y + x * Math.tan(t.skewY);
  x = sx; y = sy;
  
  // Rotate
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  x = rx; y = ry;
  
  // Flip
  if (t.flipX) x = -x;
  if (t.flipY) y = -y;
  
  // Translate back + position
  return { x: x + t.originX + t.x, y: y + t.originY + t.y };
}

export function identityTransform(): Transform {
  return {
    x: 0, y: 0,
    scaleX: 1, scaleY: 1,
    rotation: 0,
    skewX: 0, skewY: 0,
    originX: 0, originY: 0,
    flipX: false, flipY: false,
  };
}

export function composeTransform(a: Transform, b: Transform): Transform {
  // Apply a then b
  // This is simplified - real implementation needs matrix multiplication
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    scaleX: a.scaleX * b.scaleX,
    scaleY: a.scaleY * b.scaleY,
    rotation: a.rotation + b.rotation,
    skewX: a.skewX + b.skewX,
    skewY: a.skewY + b.skewY,
    originX: b.originX,
    originY: b.originY,
    flipX: a.flipX !== b.flipX,
    flipY: a.flipY !== b.flipY,
  };
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export interface RGBA {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-255
}

export interface HSLA {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

export function hexToRgba(hex: string): RGBA {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
      a: 255,
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
      a: 255,
    };
  }
  if (clean.length === 8) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
      a: parseInt(clean.slice(6, 8), 16),
    };
  }
  return { r: 0, g: 0, b: 0, a: 255 };
}

export function rgbaToHex(rgba: RGBA): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(rgba.a)}`;
}

export function rgbaToHsla(rgba: RGBA): HSLA {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
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
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100, a: rgba.a / 255 };
}

export function blendColors(base: RGBA, blend: RGBA, mode: BlendMode, opacity: number): RGBA {
  // Simplified - real implementation needs full blend mode math
  const a = blend.a / 255 * opacity;
  const ia = 1 - a;
  return {
    r: Math.round(blend.r * a + base.r * ia),
    g: Math.round(blend.g * a + base.g * ia),
    b: Math.round(blend.b * a + base.b * ia),
    a: Math.round(255 * (1 - (1 - base.a / 255) * (1 - a))),
  };
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'psd' | 'tiff' | 'json';
  quality?: number; // 0-1 for JPEG/WebP
  width?: number;
  height?: number;
  scale?: number;
  transparent?: boolean;
  colorSpace?: 'sRGB' | 'AdobeRGB' | 'P3' | 'ProPhoto';
  includeMetadata?: boolean;
  layers?: 'all' | 'visible' | 'selected' | 'merged';
  // PSD specific
  psdMaximizeCompatibility?: boolean;
  // SVG specific
  svgMinify?: boolean;
  svgResponsive?: boolean;
  // JSON project
  jsonIncludeHistory?: boolean;
  jsonIncludePreviews?: boolean;
}

export interface ImportOptions {
  // For raw files
  rawProfile?: string;
  rawWhiteBalance?: 'auto' | 'camera' | 'custom';
  rawTemperature?: number;
  rawTint?: number;
  // For PSD
  psdImportTextAsEditable?: boolean;
  psdImportVectorsAsShapes?: boolean;
  // For SVG
  svgImportTextAsEditable?: boolean;
  // For PDF
  pdfPage?: number;
  pdfResolution?: number;
}

// ============================================================================
// WORKSPACE / UI STATE
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  panels: PanelState[];
  toolbar: ToolbarState;
  shortcuts: ShortcutMap;
  theme: 'dark' | 'light' | 'system';
  language: string;
}

export interface PanelState {
  id: string;
  type: PanelType;
  visible: boolean;
  docked: boolean;
  position: 'left' | 'right' | 'top' | 'bottom' | 'floating';
  size: { width?: number; height?: number };
  tabIndex: number;
  groupedWith?: string[];
}

export type PanelType = 
  | 'layers' | 'properties' | 'adjustments' | 'history' | 'channels' | 'paths'
  | 'color' | 'swatches' | 'gradients' | 'patterns' | 'brushes' | 'toolPresets'
  | 'libraries' | 'assets' | 'info' | 'navigator' | 'histogram' | 'character'
  | 'paragraph' | 'glyphs' | 'appearance' | 'graphicStyles' | 'symbols' | 'brushesAI'
  | 'lrLibrary' | 'lrDevelop' | 'lrMap' | 'lrBook' | 'lrSlideshow' | 'lrPrint' | 'lrWeb';

export interface ToolbarState {
  visible: boolean;
  orientation: 'vertical' | 'horizontal';
  position: 'left' | 'right' | 'top' | 'bottom';
  tools: ToolId[]; // Order
  extraTools: ToolId[]; // Overflow
  springLoaded?: ToolId; // Currently held spring-loaded tool
}

export type ShortcutMap = Record<string, ToolId | string>; // Key -> ToolId or command

export interface UIState {
  // Modals
  activeModal: ModalType | null;
  modalData: any;
  // Context menus
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  // Tooltips
  tooltip: { x: number; y: number; text: string } | null;
  // Status bar
  statusMessage: string;
  // Progress
  progress: { message: string; value: number; max: number } | null;
  // Color picker
  colorPicker: { type: 'foreground' | 'background'; x: number; y: number } | null;
}

export type ModalType = 
  | 'newDocument' | 'imageSize' | 'canvasSize' | 'exportAs' | 'saveForWeb'
  | 'curves' | 'levels' | 'hueSaturation' | 'colorBalance' | 'blackWhite'
  | 'layerStyle' | 'blendingOptions' | 'newLayer' | 'duplicateLayer' | 'layerMask'
  | 'adjustmentLayer' | 'fillLayer' | 'smartObject' | 'filterGallery' | 'liquify'
  | 'vanishingPoint' | 'perspectiveWarp' | 'puppetWarp' | 'cameraRaw'
  | 'textEdit' | 'paragraphStyle' | 'characterStyle' | 'glyphs'
  | 'gradientEditor' | 'patternEditor' | 'brushSettings' | 'toolPresets'
  | 'keyboardShortcuts' | 'preferences' | 'colorSettings' | 'syncSettings'
  | 'lrImport' | 'lrExport' | 'lrPublish' | 'lrTether' | 'lrPrint' | 'lrBook'
  | 'aiImageTrace' | 'aiGenerativeFill' | 'aiGenerativeRecolor' | 'aiTextToVector'
  | 'about' | 'help';

export interface ContextMenuItem {
  label: string;
  action: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  submenu?: ContextMenuItem[];
}