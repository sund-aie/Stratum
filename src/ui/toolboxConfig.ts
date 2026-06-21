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
  wand: { primary: 'magicWand', members: ['magicWand', 'quickSelection'] },
  crop: { primary: 'crop', members: ['crop', 'perspectiveCrop', 'slice'] },
  heal: { primary: 'spotHealing', members: ['spotHealing', 'healingBrush', 'patch', 'redEye'] },
  brush: { primary: 'brush', members: ['brush', 'pencil', 'colorReplacement'] },
  clone: { primary: 'cloneStamp', members: ['cloneStamp', 'patternStamp'] },
  history: { primary: 'historyBrush', members: ['historyBrush', 'artHistoryBrush'] },
  eraser: { primary: 'eraser', members: ['eraser', 'backgroundEraser', 'magicEraser'] },
  gradient: { primary: 'gradient', members: ['gradient', 'paintBucket'] },
  focus: { primary: 'blur', members: ['blur', 'sharpen', 'smudge'] },
  tone: { primary: 'dodge', members: ['dodge', 'burn', 'sponge'] },
  pen: { primary: 'pen', members: ['pen', 'curvaturePen', 'addAnchor', 'deleteAnchor', 'convertPoint'] },
  type: { primary: 'horizontalType', members: ['horizontalType', 'verticalType', 'horizontalTypeMask', 'verticalTypeMask'] },
  pathSel: { primary: 'selection', members: ['selection', 'directSelection'] },
  shapes: { primary: 'rectangle', members: ['rectangle', 'roundedRectangle', 'ellipse', 'polygon', 'line', 'customShape'] },
  eyedropper: { primary: 'eyedropper', members: ['eyedropper', 'colorSampler', 'ruler', 'note'] },
  hand: { primary: 'hand', members: ['hand'] },
  zoom: { primary: 'zoom', members: ['zoom'] },
};

/** Per-mode toolbox groups. Each inner array is a separated section. */
export const TOOLBOX_GROUPS_BY_MODE: Record<WorkspaceMode, ToolGroup[][]> = {
  // Pixel — the full raster set.
  pixel: [
    [G.move, G.marquee, G.lasso, G.wand, G.crop],
    [G.heal, G.brush, G.clone, G.history, G.eraser, G.gradient, G.focus, G.tone],
    [G.type, G.shapes],
    [G.eyedropper, G.hand, G.zoom],
  ],
  // Vector — paths / shapes / type; no raster paint or retouch.
  vector: [
    [G.pathSel, G.pen, G.shapes],
    [G.type],
    [G.eyedropper, G.hand, G.zoom],
  ],
  // Photo — minimal; the heavy lifting lives in the Develop panel.
  photo: [
    [G.crop, G.heal],
    [G.eyedropper, G.hand, G.zoom],
  ],
};

/** Back-compat default (Pixel). */
export const TOOLBOX_GROUPS = TOOLBOX_GROUPS_BY_MODE.pixel;
