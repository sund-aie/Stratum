/**
 * Unified Canvas - Core Type Definitions (Part 2: Raster, Vector, Path)
 */

import type { Transform, Rect, Point } from './geometry';

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
  point: Point;
  ctrl1?: Point;
  ctrl2?: Point;
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
  points: WidthPoint[];
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