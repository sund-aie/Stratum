import type { WorkspaceMode } from '../core/state/store';

/** CS2 single-column toolbox layout: ordered groups, each a flyout of tool ids. */
export interface ToolGroup {
  primary: string; // default tool id shown
  members: string[]; // flyout members (incl. primary)
}

// Reusable groups (flyout members are the existing registry tool ids).
const G: Record<string, ToolGroup> = {
  move: { primary: 'move', members: ['move'] },
  marquee: { primary: 'rectMarquee', members: ['rectMarquee', 'ellipseMarquee'] },
  lasso: { primary: 'lasso', members: ['lasso', 'polygonalLasso', 'magneticLasso'] },
  wand: {
    primary: 'magicWand',
    members: ['magicWand', 'quickSelection', 'objectSelection', 'aiSelectSubject', 'aiSelectSky', 'aiSelectBackground', 'aiSelectPeople'],
  },
  crop: { primary: 'crop', members: ['crop', 'perspectiveCrop', 'slice'] },
  heal: { primary: 'spotHealing', members: ['spotHealing', 'healingBrush', 'patch', 'contentAwareMove', 'redEye', 'removeTool'] },
  brush: { primary: 'brush', members: ['brush', 'pencil', 'colorReplacement', 'mixerBrush'] },
  clone: { primary: 'cloneStamp', members: ['cloneStamp', 'patternStamp'] },
  history: { primary: 'historyBrush', members: ['historyBrush', 'artHistoryBrush'] },
  eraser: { primary: 'eraser', members: ['eraser', 'backgroundEraser', 'magicEraser'] },
  gradient: { primary: 'gradient', members: ['gradient', 'paintBucket', '3dMaterialDrop'] },
  focus: { primary: 'blur', members: ['blur', 'sharpen', 'smudge'] },
  tone: { primary: 'dodge', members: ['dodge', 'burn', 'sponge'] },
  pen: { primary: 'pen', members: ['pen', 'curvaturePen', 'addAnchor', 'deleteAnchor', 'convertPoint'] },
  type: { primary: 'horizontalType', members: ['horizontalType', 'verticalType', 'horizontalTypeMask', 'verticalTypeMask'] },
  pathSel: { primary: 'selection', members: ['selection', 'directSelection'] },
  shapes: { primary: 'rectangle', members: ['rectangle', 'roundedRectangle', 'ellipse', 'triangle', 'polygon', 'line', 'customShape'] },
  eyedropper: { primary: 'eyedropper', members: ['eyedropper', 'colorSampler', 'ruler', 'note', 'count', 'measure'] },
  hand: { primary: 'hand', members: ['hand'] },
  zoom: { primary: 'zoom', members: ['zoom'] },

  // Vector mode groups
  pathSelV: { primary: 'selection', members: ['selection', 'directSelection', 'groupSelection'] },
  penV: { primary: 'pen', members: ['pen', 'curvaturePen', 'curvature', 'addAnchor', 'deleteAnchor', 'convertPoint', 'smooth', 'join', 'shaper'] },
  shapesV: { primary: 'rectangle', members: ['rectangle', 'roundedRectangle', 'ellipse', 'polygon', 'star', 'triangle', 'line'] },
  geometric: { primary: 'lineSegment', members: ['lineSegment', 'arc', 'spiral', 'grid', 'polarGrid', 'flare'] },
  vbrush: { primary: 'paintbrush', members: ['paintbrush', 'blobBrush'] },
  cut: { primary: 'eraser', members: ['eraser', 'scissors', 'knife'] },
  build: { primary: 'shapeBuilder', members: ['shapeBuilder', 'livePaintBucket', 'livePaintSelection'] },
  transform: { primary: 'freeTransform', members: ['rotate', 'reflect', 'scale', 'shear', 'freeTransform', 'width', 'rescale'] },
  typeV: { primary: 'type', members: ['type', 'areaType', 'typeOnPath', 'verticalType', 'verticalAreaType', 'verticalTypeOnPath', 'touchType'] },
  symbols: {
    primary: 'symbolSprayer',
    members: ['symbolSprayer', 'symbolShifter', 'symbolScruncher', 'symbolSizer', 'symbolSpinner', 'symbolStainer', 'symbolScreener', 'symbolStyler'],
  },
  eyedropperV: { primary: 'eyedropper', members: ['eyedropper'] },

  // Photo / develop
  cropP: { primary: 'crop', members: ['crop', 'cropOverlay'] },
  spot: { primary: 'spotRemoval', members: ['spotRemoval', 'redEyeCorrection', 'removeTool'] },
  local: { primary: 'adjustmentBrush', members: ['adjustmentBrush', 'graduatedFilter', 'radialFilter', 'rangeMask'] },
  aiMask: { primary: 'aiSelectSubject', members: ['aiSelectSubject', 'aiSelectSky', 'aiSelectBackground', 'aiSelectPeople'] },
  wbP: { primary: 'whiteBalance', members: ['whiteBalance', 'targetedAdjustment'] },
};

/** Per-mode toolbox groups. Each inner array is a separated section. */
export const TOOLBOX_GROUPS_BY_MODE: Record<WorkspaceMode, ToolGroup[][]> = {
  // Pixel — the full raster editing toolbox (mirrors a complete raster editor).
  pixel: [
    [G.move, G.marquee, G.lasso, G.wand, G.crop],
    [G.heal, G.brush, G.clone, G.history, G.eraser, G.gradient, G.focus, G.tone],
    [G.pen, G.type, G.pathSel, G.shapes],
    [G.eyedropper, G.hand, G.zoom],
  ],
  // Vector — the full vector/illustration toolset.
  vector: [
    [G.pathSelV, G.penV, G.vbrush, G.shapesV, G.geometric],
    [G.cut, G.build, G.transform],
    [G.typeV, G.symbols],
    [G.eyedropperV, G.hand, G.zoom],
  ],
  // Photo — the local-adjustment / masking develop toolset.
  photo: [
    [G.cropP, G.spot, G.local, G.aiMask],
    [G.wbP, G.eyedropperV, G.hand, G.zoom],
  ],
};

/** Back-compat default (Pixel). */
export const TOOLBOX_GROUPS = TOOLBOX_GROUPS_BY_MODE.pixel;
