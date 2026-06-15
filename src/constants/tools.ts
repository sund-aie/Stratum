/**
 * Unified Canvas - Tool Constants
 */

export type ToolId = string;

export interface ToolDefinition {
  id: ToolId;
  icon: string;
  label: string;
  group: string;
  shortcut?: string;
  cursor?: string;
}

export const TOOL_GROUPS: Record<ToolId, ToolId[]> = {
  // Selection
  move: ['move', 'artboard'],
  marqueeRect: ['marqueeRect', 'marqueeEllipse', 'marqueeRow', 'marqueeCol'],
  lasso: ['lasso', 'lassoPoly', 'lassoMagnetic'],
  quickSelect: ['quickSelect', 'objectSelect'],
  magicWand: ['magicWand'],
  
  // Crop/Slice
  crop: ['crop', 'perspectiveCrop'],
  slice: ['slice', 'sliceSelect'],
  
  // Measurement
  eyedropper: ['eyedropper', 'colorSampler', 'ruler', 'note', 'count'],
  
  // Retouching
  spotHeal: ['spotHeal', 'healBrush', 'patch', 'contentAwareMove', 'redEye', 'removeTool'],
  cloneStamp: ['cloneStamp', 'patternStamp'],
  eraser: ['eraser', 'bgEraser', 'magicEraser'],
  
  // Painting
  brush: ['brush', 'pencil', 'colorReplace', 'mixerBrush'],
  historyBrush: ['historyBrush', 'artHistoryBrush'],
  gradient: ['gradient', 'paintBucket', 'materialDrop'],
  
  // Drawing/Type
  pen: ['pen', 'freeformPen', 'curvaturePen'],
  addAnchor: ['addAnchor'],
  deleteAnchor: ['deleteAnchor'],
  convertPoint: ['convertPoint'],
  typeHorizontal: ['typeHorizontal', 'typeVertical', 'typeMaskHorizontal', 'typeMaskVertical'],
  pathSelect: ['pathSelect', 'directSelect'],
  shapeRect: ['shapeRect', 'shapeEllipse', 'shapeTriangle', 'shapePolygon', 'shapeLine', 'shapeCustom'],
  
  // Navigation
  hand: ['hand', 'rotateView'],
  zoom: ['zoom'],
};

export const TOOL_ICONS: Record<ToolId, { icon: string; label: string; cursor?: string }> = {
  // Selection
  move: { icon: '↔', label: 'Move Tool', cursor: 'move' },
  artboard: { icon: '⬜', label: 'Artboard Tool', cursor: 'crosshair' },
  marqueeRect: { icon: '⬜', label: 'Rectangular Marquee', cursor: 'crosshair' },
  marqueeEllipse: { icon: '⭘', label: 'Elliptical Marquee', cursor: 'crosshair' },
  marqueeRow: { icon: '➖', label: 'Single Row Marquee', cursor: 'crosshair' },
  marqueeCol: { icon: '➖', label: 'Single Column Marquee', cursor: 'crosshair' },
  lasso: { icon: '✎', label: 'Lasso Tool', cursor: 'crosshair' },
  lassoPoly: { icon: '⬟', label: 'Polygonal Lasso', cursor: 'crosshair' },
  lassoMagnetic: { icon: '✎', label: 'Magnetic Lasso', cursor: 'crosshair' },
  quickSelect: { icon: '☑', label: 'Quick Selection', cursor: 'crosshair' },
  magicWand: { icon: '✨', label: 'Magic Wand', cursor: 'crosshair' },
  objectSelect: { icon: '🔍', label: 'Object Selection', cursor: 'crosshair' },
  
  // Crop/Slice
  crop: { icon: '✂', label: 'Crop Tool', cursor: 'crosshair' },
  perspectiveCrop: { icon: '⬟', label: 'Perspective Crop', cursor: 'crosshair' },
  slice: { icon: '⩚', label: 'Slice Tool', cursor: 'crosshair' },
  sliceSelect: { icon: '☑', label: 'Slice Select', cursor: 'pointer' },
  
  // Measurement
  eyedropper: { icon: '💧', label: 'Eyedropper', cursor: 'crosshair' },
  colorSampler: { icon: '🎯', label: 'Color Sampler', cursor: 'crosshair' },
  ruler: { icon: '📏', label: 'Ruler', cursor: 'crosshair' },
  note: { icon: '📝', label: 'Note Tool', cursor: 'help' },
  count: { icon: '🔢', label: 'Count Tool', cursor: 'crosshair' },
  
  // Retouching
  spotHeal: { icon: '🩹', label: 'Spot Healing Brush', cursor: 'crosshair' },
  healBrush: { icon: '🩹', label: 'Healing Brush', cursor: 'crosshair' },
  patch: { icon: '🧩', label: 'Patch Tool', cursor: 'crosshair' },
  contentAwareMove: { icon: '📦', label: 'Content-Aware Move', cursor: 'crosshair' },
  redEye: { icon: '👁', label: 'Red Eye Tool', cursor: 'crosshair' },
  removeTool: { icon: '🧽', label: 'Remove Tool', cursor: 'crosshair' },
  cloneStamp: { icon: '🖹', label: 'Clone Stamp', cursor: 'crosshair' },
  patternStamp: { icon: '🖹', label: 'Pattern Stamp', cursor: 'crosshair' },
  eraser: { icon: '🧽', label: 'Eraser', cursor: 'crosshair' },
  bgEraser: { icon: '🧽', label: 'Background Eraser', cursor: 'crosshair' },
  magicEraser: { icon: '✨', label: 'Magic Eraser', cursor: 'crosshair' },
  
  // Painting
  brush: { icon: '🖌', label: 'Brush Tool', cursor: 'crosshair' },
  pencil: { icon: '✏', label: 'Pencil Tool', cursor: 'crosshair' },
  colorReplace: { icon: '🖌', label: 'Color Replacement', cursor: 'crosshair' },
  mixerBrush: { icon: '🖌', label: 'Mixer Brush', cursor: 'crosshair' },
  historyBrush: { icon: '↺', label: 'History Brush', cursor: 'crosshair' },
  artHistoryBrush: { icon: '🎨', label: 'Art History Brush', cursor: 'crosshair' },
  gradient: { icon: '🎨', label: 'Gradient Tool', cursor: 'crosshair' },
  paintBucket: { icon: '🪣', label: 'Paint Bucket', cursor: 'crosshair' },
  materialDrop: { icon: '💧', label: 'Material Drop', cursor: 'crosshair' },
  
  // Drawing/Type
  pen: { icon: '✒', label: 'Pen Tool', cursor: 'crosshair' },
  freeformPen: { icon: '✒', label: 'Freeform Pen', cursor: 'crosshair' },
  curvaturePen: { icon: '✒', label: 'Curvature Pen', cursor: 'crosshair' },
  addAnchor: { icon: '➕', label: 'Add Anchor Point', cursor: 'crosshair' },
  deleteAnchor: { icon: '➖', label: 'Delete Anchor Point', cursor: 'crosshair' },
  convertPoint: { icon: '⌈', label: 'Convert Point', cursor: 'crosshair' },
  typeHorizontal: { icon: 'T', label: 'Horizontal Type', cursor: 'text' },
  typeVertical: { icon: 'T', label: 'Vertical Type', cursor: 'text' },
  typeMaskHorizontal: { icon: 'T', label: 'Horizontal Type Mask', cursor: 'text' },
  typeMaskVertical: { icon: 'T', label: 'Vertical Type Mask', cursor: 'text' },
  pathSelect: { icon: '⌂', label: 'Path Selection', cursor: 'pointer' },
  directSelect: { icon: '⌃', label: 'Direct Selection', cursor: 'pointer' },
  shapeRect: { icon: '⬜', label: 'Rectangle', cursor: 'crosshair' },
  shapeEllipse: { icon: '⭘', label: 'Ellipse', cursor: 'crosshair' },
  shapeTriangle: { icon: '▲', label: 'Triangle', cursor: 'crosshair' },
  shapePolygon: { icon: '⬟', label: 'Polygon', cursor: 'crosshair' },
  shapeLine: { icon: '⟷', label: 'Line', cursor: 'crosshair' },
  shapeCustom: { icon: '⬡', label: 'Custom Shape', cursor: 'crosshair' },
  
  // Navigation
  hand: { icon: '✋', label: 'Hand Tool', cursor: 'grab' },
  rotateView: { icon: '↻', label: 'Rotate View', cursor: 'crosshair' },
  zoom: { icon: '🔍', label: 'Zoom Tool', cursor: 'zoom-in' },
};

export const TOOL_SHORTCUTS: Record<ToolId, string> = {
  move: 'V',
  artboard: 'Shift+V',
  marqueeRect: 'M',
  marqueeEllipse: 'Shift+M',
  lasso: 'L',
  lassoPoly: 'Shift+L',
  lassoMagnetic: 'Shift+L',
  quickSelect: 'W',
  objectSelect: 'Shift+W',
  magicWand: 'Shift+W',
  crop: 'C',
  perspectiveCrop: 'Shift+C',
  slice: 'Shift+C',
  sliceSelect: 'Shift+C',
  eyedropper: 'I',
  colorSampler: 'Shift+I',
  ruler: 'Shift+I',
  spotHeal: 'J',
  healBrush: 'J',
  patch: 'J',
  contentAwareMove: 'J',
  redEye: 'Shift+J',
  removeTool: 'Shift+J',
  cloneStamp: 'S',
  patternStamp: 'Shift+S',
  eraser: 'E',
  bgEraser: 'Shift+E',
  magicEraser: 'Shift+E',
  brush: 'B',
  pencil: 'Shift+B',
  colorReplace: 'Shift+B',
  mixerBrush: 'Shift+B',
  historyBrush: 'Y',
  artHistoryBrush: 'Shift+Y',
  gradient: 'G',
  paintBucket: 'G',
  materialDrop: 'Shift+G',
  pen: 'P',
  freeformPen: 'Shift+P',
  curvaturePen: 'Shift+P',
  addAnchor: '=',
  deleteAnchor: '-',
  convertPoint: 'Shift+C',
  typeHorizontal: 'T',
  typeVertical: 'Shift+T',
  pathSelect: 'A',
  directSelect: 'Shift+A',
  shapeRect: 'U',
  shapeEllipse: 'Shift+U',
  hand: 'H',
  rotateView: 'Shift+H',
  zoom: 'Z',
};

export const TOOL_CURSORS: Record<ToolId, string> = {
  move: 'move',
  marqueeRect: 'crosshair',
  marqueeEllipse: 'crosshair',
  lasso: 'crosshair',
  quickSelect: 'crosshair',
  magicWand: 'crosshair',
  crop: 'crosshair',
  eyedropper: 'crosshair',
  brush: 'crosshair',
  pencil: 'crosshair',
  eraser: 'crosshair',
  pen: 'crosshair',
  typeHorizontal: 'text',
  pathSelect: 'pointer',
  directSelect: 'pointer',
  hand: 'grab',
  zoom: 'zoom-in',
};