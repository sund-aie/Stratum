/**
 * Unified Canvas - Engine Index
 * Exports all engine modules
 */

export { LayerRenderer, renderLayer, composeLayers } from './LayerRenderer';
export { HitTester, findLayerAtPoint } from './HitTester';
export { SelectionRenderer, renderMarchingAnts, renderSelectionPath } from './SelectionRenderer';
export { 
  applyAdjustment, 
  applyBrightnessContrast,
  applyLevels,
  applyCurves,
  applyHueSaturation,
  applyColorBalance,
  applyBlackWhite,
  applyPhotoFilter,
  applyChannelMixer,
  applyColorLookup,
  applyInvert,
  applyPosterize,
  applyThreshold,
  applyGradientMap,
  applySelectiveColor,
  applyVibrance,
  applyExposure,
} from './Adjustments';
export { 
  renderPath, 
  renderPathSegments,
  hitTestPath,
  hitTestPathSegments,
  pathBounds,
  offsetPath,
  simplifyPath,
  booleanPathOps,
} from './VectorRenderer';
export { 
  brushStroke,
  eraseStroke,
  floodFill,
  gaussianBlur,
  motionBlur,
  unsharpMask,
  addNoise,
} from './RasterOps';

export type { OffscreenCanvasRenderingContext2D } from '../types';