/**
 * Unified Canvas - Core Type Definitions (Part 3: Adjustments, Fill, Smart Object, Group)
 */

import type { Transform, Gradient, GradientStop } from './geometry';

// ============================================================================
// ADJUSTMENT LAYERS (Photoshop + Lightroom)
// ============================================================================

export interface AdjustmentLayerData {
  type: AdjustmentType;
  params: AdjustmentParams;
  clipped: boolean;
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
  brightness?: number; contrast?: number; useLegacy?: boolean;
  
  // Levels
  levelsInputBlack?: number; levelsInputWhite?: number; levelsInputGamma?: number;
  levelsOutputBlack?: number; levelsOutputWhite?: number; levelsChannel?: 'rgb' | 'red' | 'green' | 'blue';
  
  // Curves
  curvesPoints?: CurvePoint[]; curvesChannel?: 'rgb' | 'red' | 'green' | 'blue';
  
  // Exposure
  exposure?: number; offset?: number; gamma?: number;
  
  // Vibrance
  vibrance?: number; saturation?: number;
  
  // Hue/Saturation
  hueShift?: number; satShift?: number; lightShift?: number;
  hueRange?: HueRange[]; colorize?: boolean; colorizeHue?: number; colorizeSat?: number; colorizeLight?: number;
  
  // Color Balance
  shadows?: ColorShift; midtones?: ColorShift; highlights?: ColorShift; preserveLuminosity?: boolean;
  
  // Black & White
  bwRed?: number; bwYellow?: number; bwGreen?: number; bwCyan?: number; bwBlue?: number; bwMagenta?: number;
  bwTint?: boolean; bwTintHue?: number; bwTintSat?: number;
  
  // Photo Filter
  filterColor?: string; filterDensity?: number; preserveLuminosityPF?: boolean;
  
  // Channel Mixer
  channelMixerRed?: ChannelValues; channelMixerGreen?: ChannelValues; channelMixerBlue?: ChannelValues;
  channelMixerConstant?: number; channelMixerMonochrome?: boolean;
  
  // Color Lookup
  lut3D?: string; lutAbstract?: string; lutDeviceLink?: string;
  
  // Posterize
  posterizeLevels?: number;
  
  // Threshold
  thresholdLevel?: number;
  
  // Gradient Map
  gradientMapGradient?: Gradient; gradientMapDither?: boolean; gradientMapReverse?: boolean;
  
  // Selective Color
  selectiveColors?: SelectiveColor[]; selectiveColorMethod?: 'relative' | 'absolute';
  
  // Shadows/Highlights
  shadowsAmount?: number; shadowsTonalWidth?: number; shadowsRadius?: number;
  highlightsAmount?: number; highlightsTonalWidth?: number; highlightsRadius?: number;
  colorCorrection?: number; midtoneContrast?: number; shadowsClip?: number; highlightsClip?: number;
  
  // Lightroom Basic
  lrTemperature?: number; lrTint?: number; lrExposure?: number; lrContrast?: number;
  lrHighlights?: number; lrShadows?: number; lrWhites?: number; lrBlacks?: number;
  lrTexture?: number; lrClarity?: number; lrDehaze?: number; lrVibrance?: number; lrSaturation?: number;
  
  // Tone Curve
  toneCurveParametric?: ToneCurveParametric; toneCurvePoint?: ToneCurvePoint[];
  toneCurveChannel?: 'rgb' | 'red' | 'green' | 'blue'; toneCurveRefineSat?: number;
  
  // HSL/Color/B&W
  hslHue?: HSLValues; hslSat?: HSLValues; hslLum?: HSLValues; hslColorMode?: 'hsl' | 'color' | 'bw';
  
  // Color Grading
  colorGradingShadows?: ColorWheel; colorGradingMidtones?: ColorWheel;
  colorGradingHighlights?: ColorWheel; colorGradingGlobal?: ColorWheel;
  colorGradingBlending?: number; colorGradingBalance?: number;
  
  // Detail
  sharpenAmount?: number; sharpenRadius?: number; sharpenDetail?: number; sharpenMasking?: number;
  nrLuminance?: number; nrLuminanceDetail?: number; nrLuminanceContrast?: number;
  nrColor?: number; nrColorDetail?: number; nrColorSmoothness?: number;
  
  // Lens Correction
  lensProfileEnable?: boolean; lensProfileMake?: string; lensProfileModel?: string; lensProfileProfile?: string;
  lensDistortion?: number; lensVignetting?: number; lensDefringe?: number;
  lensDefringeHue?: number; lensDefringeHueWidth?: number;
  
  // Transform
  transformMode?: 'auto' | 'guided' | 'level' | 'vertical' | 'full';
  transformVertical?: number; transformHorizontal?: number; transformRotate?: number;
  transformAspect?: number; transformScale?: number; transformOffsetX?: number; transformOffsetY?: number;
  transformGuidedLines?: GuidedLine[];
  
  // Effects
  vignetteAmount?: number; vignetteMidpoint?: number; vignetteRoundness?: number; vignetteFeather?: number; vignetteHighlights?: number;
  grainAmount?: number; grainSize?: number; grainRoughness?: number;
  
  // Calibration
  calibrationShadowsTint?: number; calibrationRedHue?: number; calibrationRedSat?: number;
  calibrationGreenHue?: number; calibrationGreenSat?: number; calibrationBlueHue?: number; calibrationBlueSat?: number;
  calibrationProcessVersion?: string;
}

export interface CurvePoint { input: number; output: number; }
export interface HueRange { hue: number; range: number; }
export interface ColorShift { cyanRed: number; magentaGreen: number; yellowBlue: number; }
export interface ChannelValues { red: number; green: number; blue: number; }
export interface SelectiveColor { color: 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'whites' | 'neutrals' | 'blacks'; cyan: number; magenta: number; yellow: number; black: number; }
export interface ToneCurveParametric { highlights: number; lights: number; darks: number; shadows: number; highlightsSplit: number; lightsSplit: number; darksSplit: number; }
export interface ToneCurvePoint { input: number; output: number; }
export interface HSLValues { red: number; orange: number; yellow: number; green: number; aqua: number; blue: number; purple: number; magenta: number; }
export interface ColorWheel { hue: number; saturation: number; }
export interface GuidedLine { id: string; x1: number; y1: number; x2: number; y2: number; }

// ============================================================================
// FILL LAYER
// ============================================================================

export interface FillLayerData {
  fillType: 'solid' | 'gradient' | 'pattern';
  fill: Fill;
  patternId?: string; patternScale?: number; patternAngle?: number;
  gradient?: Gradient;
  gradientStyle?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  gradientReverse?: boolean; gradientAlign?: boolean; gradientScale?: number;
}

// ============================================================================
// SMART OBJECT
// ============================================================================

export interface SmartObjectData {
  embedded: boolean;
  filePath?: string;
  document?: import('./document').Document;
  placedTransform: Transform;
  filterMask?: import('./document').LayerMask;
}

// ============================================================================
// GROUP LAYER
// ============================================================================

export interface GroupLayerData {
  expanded: boolean;
  passThrough: boolean;
}

// ============================================================================
// HISTORY / UNDO
// ============================================================================

export interface HistoryState {
  id: string;
  name: string;
  timestamp: number;
  type: 'snapshot' | 'delta';
  documentSnapshot?: import('./document').Document;
  delta?: HistoryDelta;
  layerIdsAffected: string[];
}

export interface HistoryDelta {
  action: HistoryActionType;
  layerId: string;
  prevState: Partial<import('./document').Layer>;
  newState: Partial<import('./document').Layer>;
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