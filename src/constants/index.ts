/**
 * Unified Canvas - Constants and Default Values
 */

export const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 100;

export const DEFAULT_TOOL_OPTIONS = {
  // Brush
  brushSize: 50,
  brushHardness: 0.5,
  brushOpacity: 1,
  brushFlow: 1,
  brushSpacing: 0.25,
  brushShape: 'round' as const,
  brushDynamics: {
    sizeJitter: 0,
    opacityJitter: 0,
    flowJitter: 0,
    angleJitter: 0,
    roundnessJitter: 0,
    scatter: 0,
    count: 1,
    countJitter: 0,
    textureScale: 100,
    textureDepth: 0,
    textureMode: 'multiply' as const,
    wetEdges: false,
    buildUp: false,
    smoothing: 0,
    protectTexture: false,
  },

  // Eraser
  eraserSize: 50,
  eraserHardness: 0.5,

  // Selection
  selectionMode: 'new' as const,
  selectionFeather: 0,
  selectionAntialias: true,
  magicWandTolerance: 32,
  magicWandContiguous: true,
  magicWandSampleAllLayers: false,

  // Pen
  penMode: 'pen' as const,

  // Shape
  shapeType: 'rect' as const,
  shapeFill: { r: 0, g: 0, b: 0, a: 1 },
  shapeStroke: { r: 0, g: 0, b: 0, a: 0 },
  shapeStrokeWidth: 2,
  polygonSides: 6,
  starInset: 0.5,

  // Text
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left' as const,
  lineHeight: 1.2,
  letterSpacing: 0,

  // Transform
  transformMode: 'free' as const,
  maintainAspectRatio: true,
  rotateAroundCenter: true,

  // Crop
  cropRatio: 'free' as const,
  cropStraighten: 0,

  // General
  foregroundColor: { r: 0, g: 0, b: 0, a: 1 },
  backgroundColor: { r: 255, g: 255, b: 255, a: 1 },
};

export const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const;

export const BRUSH_SHAPES = ['round', 'square', 'custom'] as const;
export const STROKE_CAPS = ['butt', 'round', 'square'] as const;
export const STROKE_JOINS = ['miter', 'round', 'bevel'] as const;

export const TOOL_GROUPS = {
  selection: [
    'select', 'move',
    'marquee-rect', 'marquee-ellipse', 'marquee-single-row', 'marquee-single-col',
    'lasso', 'lasso-polygon', 'lasso-magnetic',
    'magic-wand', 'object-select',
  ],
  cropSlice: ['crop', 'slice', 'slice-select'],
  measurement: ['eyedropper', 'color-sampler', 'ruler', 'note', 'count'],
  retouch: [
    'brush', 'pencil', 'color-replacement', 'mixer-brush',
    'eraser', 'background-eraser', 'magic-eraser',
  ],
  painting: ['fill', 'gradient', 'paint-bucket'],
  focus: ['blur', 'sharpen', 'smudge'],
  toning: ['dodge', 'burn', 'sponge'],
  pen: ['pen', 'curvature-pen', 'freeform-pen', 'add-anchor', 'delete-anchor', 'convert-anchor'],
  type: ['horizontal-type', 'vertical-type', 'horizontal-type-mask', 'vertical-type-mask'],
  path: ['path-select', 'direct-select'],
  shape: ['rectangle', 'ellipse', 'triangle', 'polygon', 'line', 'custom-shape'],
  navigation: ['hand', 'rotate-view', 'zoom'],
} as const;

export const TOOL_CURSORS: Record<string, string> = {
  'select': 'default',
  'move': 'move',
  'marquee-rect': 'crosshair',
  'marquee-ellipse': 'crosshair',
  'lasso': 'crosshair',
  'lasso-polygon': 'crosshair',
  'lasso-magnetic': 'crosshair',
  'magic-wand': 'url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22><path fill=%22%23333%22 d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z%22/></svg>") 12 12, auto',
  'object-select': 'crosshair',
  'crop': 'crosshair',
  'eyedropper': 'url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22><path fill=%22%23333%22 d=%22M11.77 12.17l4.8-4.8c.4-.4.4-1.03 0-1.43l-1.6-1.6c-.4-.4-1.03-.4-1.43 0l-4.8 4.8-3.2-3.2c-.4-.4-1.03-.4-1.43 0l-1.6 1.6c-.4.4-.4 1.03 0 1.43l4.8 4.8 3.2-3.2c.4-.4 1.03-.4 1.43 0l1.6 1.6c.4.4.4 1.03 0 1.43l-4.8 4.8-3.2 3.2c-.4.4-1.03.4-1.43 0l-1.6-1.6c-.4-.4-.4-1.03 0-1.43z%22/></svg>") 12 12, auto',
  'brush': 'crosshair',
  'pencil': 'crosshair',
  'eraser': 'crosshair',
  'background-eraser': 'crosshair',
  'magic-eraser': 'url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22><path fill=%22%23333%22 d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z%22/></svg>") 12 12, auto',
  'fill': 'crosshair',
  'gradient': 'crosshair',
  'pen': 'crosshair',
  'curvature-pen': 'crosshair',
  'horizontal-type': 'text',
  'vertical-type': 'text',
  'path-select': 'crosshair',
  'direct-select': 'crosshair',
  'rectangle': 'crosshair',
  'ellipse': 'crosshair',
  'hand': 'grab',
  'rotate-view': 'grab',
  'zoom': 'zoom-in',
};

export const KEYBOARD_SHORTCUTS = [
  // Tools
  { key: 'v', action: 'tool:select', description: 'Selection Tool (V)' },
  { key: 'v', shift: true, action: 'tool:move', description: 'Move Tool (Shift+V)' },
  { key: 'm', action: 'tool:marquee-rect', description: 'Rectangular Marquee (M)' },
  { key: 'm', shift: true, action: 'tool:marquee-ellipse', description: 'Elliptical Marquee (Shift+M)' },
  { key: 'l', action: 'tool:lasso', description: 'Lasso Tool (L)' },
  { key: 'l', shift: true, action: 'tool:lasso-polygon', description: 'Polygonal Lasso (Shift+L)' },
  { key: 'w', action: 'tool:magic-wand', description: 'Magic Wand (W)' },
  { key: 'w', shift: true, action: 'tool:object-select', description: 'Object Selection (Shift+W)' },
  { key: 'c', action: 'tool:crop', description: 'Crop Tool (C)' },
  { key: 'i', action: 'tool:eyedropper', description: 'Eyedropper (I)' },
  { key: 'b', action: 'tool:brush', description: 'Brush Tool (B)' },
  { key: 'b', shift: true, action: 'tool:pencil', description: 'Pencil Tool (Shift+B)' },
  { key: 'e', action: 'tool:eraser', description: 'Eraser Tool (E)' },
  { key: 'e', shift: true, action: 'tool:background-eraser', description: 'Background Eraser (Shift+E)' },
  { key: 'g', action: 'tool:fill', description: 'Paint Bucket (G)' },
  { key: 'g', shift: true, action: 'tool:gradient', description: 'Gradient Tool (Shift+G)' },
  { key: 'p', action: 'tool:pen', description: 'Pen Tool (P)' },
  { key: 'p', shift: true, action: 'tool:curvature-pen', description: 'Curvature Pen (Shift+P)' },
  { key: 't', action: 'tool:horizontal-type', description: 'Horizontal Type (T)' },
  { key: 't', shift: true, action: 'tool:vertical-type', description: 'Vertical Type (Shift+T)' },
  { key: 'a', action: 'tool:path-select', description: 'Path Selection (A)' },
  { key: 'a', shift: true, action: 'tool:direct-select', description: 'Direct Selection (Shift+A)' },
  { key: 'u', action: 'tool:rectangle', description: 'Rectangle Tool (U)' },
  { key: 'h', action: 'tool:hand', description: 'Hand Tool (H)' },
  { key: 'z', action: 'tool:zoom', description: 'Zoom Tool (Z)' },

  // File
  { key: 'n', ctrl: true, action: 'file:new', description: 'New Document (Ctrl+N)' },
  { key: 'o', ctrl: true, action: 'file:open', description: 'Open (Ctrl+O)' },
  { key: 's', ctrl: true, action: 'file:save', description: 'Save (Ctrl+S)' },
  { key: 's', ctrl: true, shift: true, action: 'file:save-as', description: 'Save As (Ctrl+Shift+S)' },
  { key: 'e', ctrl: true, shift: true, action: 'file:export', description: 'Export (Ctrl+Shift+E)' },

  // Edit
  { key: 'z', ctrl: true, action: 'edit:undo', description: 'Undo (Ctrl+Z)' },
  { key: 'z', ctrl: true, shift: true, action: 'edit:redo', description: 'Redo (Ctrl+Shift+Z)' },
  { key: 'y', ctrl: true, action: 'edit:redo', description: 'Redo (Ctrl+Y)' },
  { key: 'x', ctrl: true, action: 'edit:cut', description: 'Cut (Ctrl+X)' },
  { key: 'c', ctrl: true, action: 'edit:copy', description: 'Copy (Ctrl+C)' },
  { key: 'v', ctrl: true, action: 'edit:paste', description: 'Paste (Ctrl+V)' },
  { key: 'v', ctrl: true, shift: true, action: 'edit:paste-in-place', description: 'Paste in Place (Ctrl+Shift+V)' },
  { key: 'd', ctrl: true, action: 'edit:deselect', description: 'Deselect (Ctrl+D)' },
  { key: 'd', ctrl: true, shift: true, action: 'edit:reselect', description: 'Reselect (Ctrl+Shift+D)' },
  { key: 'a', ctrl: true, action: 'edit:select-all', description: 'Select All (Ctrl+A)' },
  { key: 'f', ctrl: true, action: 'edit:fill', description: 'Fill (Ctrl+F)' },
  { key: 't', ctrl: true, action: 'edit:free-transform', description: 'Free Transform (Ctrl+T)' },

  // Layer
  { key: 'j', ctrl: true, action: 'layer:new', description: 'New Layer (Ctrl+J)' },
  { key: 'j', ctrl: true, shift: true, action: 'layer:new-via-copy', description: 'New Layer via Copy (Ctrl+Shift+J)' },
  { key: 'g', ctrl: true, action: 'layer:group', description: 'Group Layers (Ctrl+G)' },
  { key: 'g', ctrl: true, shift: true, action: 'layer:ungroup', description: 'Ungroup Layers (Ctrl+Shift+G)' },
  { key: 'e', ctrl: true, action: 'layer:merge-down', description: 'Merge Down (Ctrl+E)' },
  { key: 'e', ctrl: true, shift: true, action: 'layer:merge-visible', description: 'Merge Visible (Ctrl+Shift+E)' },
  { key: ']', ctrl: true, action: 'layer:bring-forward', description: 'Bring Forward (Ctrl+])' },
  { key: '[', ctrl: true, action: 'layer:send-backward', description: 'Send Backward (Ctrl+[)' },
  { key: ']', ctrl: true, shift: true, action: 'layer:bring-to-front', description: 'Bring to Front (Ctrl+Shift+])' },
  { key: '[', ctrl: true, shift: true, action: 'layer:send-to-back', description: 'Send to Back (Ctrl+Shift+[)' },

  // View
  { key: '+', ctrl: true, action: 'view:zoom-in', description: 'Zoom In (Ctrl+Plus)' },
  { key: '-', ctrl: true, action: 'view:zoom-out', description: 'Zoom Out (Ctrl+Minus)' },
  { key: '0', ctrl: true, action: 'view:zoom-100', description: 'Actual Size (Ctrl+0)' },
  { key: '0', ctrl: true, shift: true, action: 'view:fit-screen', description: 'Fit to Screen (Ctrl+Shift+0)' },
  { key: 'r', ctrl: true, action: 'view:toggle-rulers', description: 'Toggle Rulers (Ctrl+R)' },
  { key: "'", ctrl: true, action: 'view:toggle-grid', description: 'Toggle Grid (Ctrl+\')' },
  { key: ';', ctrl: true, action: 'view:toggle-guides', description: 'Toggle Guides (Ctrl+;)' },
  { key: ';', ctrl: true, shift: true, action: 'view:lock-guides', description: 'Lock Guides (Ctrl+Shift+;)' },
  { key: 'h', ctrl: true, action: 'view:toggle-extras', description: 'Toggle Extras (Ctrl+H)' },

  // Brush
  { key: '[', action: 'brush:decrease-size', description: 'Decrease Brush Size ([)' },
  { key: ']', action: 'brush:increase-size', description: 'Increase Brush Size (])' },
  { key: '[', shift: true, action: 'brush:decrease-hardness', description: 'Decrease Hardness (Shift+[)' },
  { key: ']', shift: true, action: 'brush:increase-hardness', description: 'Increase Hardness (Shift+])' },
  { key: ',', action: 'brush:prev-brush', description: 'Previous Brush (,)' },
  { key: '.', action: 'brush:next-brush', description: 'Next Brush (.)' },
  { key: '<', action: 'brush:first-brush', description: 'First Brush (<)' },
  { key: '>', action: 'brush:last-brush', description: 'Last Brush (>)' },
  { key: 'x', action: 'brush:swap-colors', description: 'Swap Colors (X)' },
  { key: 'd', action: 'brush:default-colors', description: 'Default Colors (D)' },

  // Navigation
  { key: ' ', action: 'nav:hand-tool', description: 'Temporary Hand Tool (Space)' },
  { key: 'z', ctrl: true, action: 'nav:zoom-tool', description: 'Temporary Zoom Tool (Ctrl+Space)' },
  { key: 'z', ctrl: true, alt: true, action: 'nav:zoom-out-tool', description: 'Temporary Zoom Out (Ctrl+Alt+Space)' },
] as const;

export const DEFAULT_GRID = {
  enabled: true,
  size: 64,
  subdivisions: 4,
  color: { r: 128, g: 128, b: 128, a: 0.3 },
  style: 'lines' as const,
};

export const DEFAULT_GUIDE_COLOR = { r: 0, g: 180, b: 255, a: 1 };

export const CANVAS_BACKGROUND_COLOR = { r: 204, g: 204, b: 204, a: 1 };

export const TRANSPARENCY_GRID_SIZE = 16;
export const TRANSPARENCY_COLORS = [
  { r: 220, g: 220, b: 220, a: 1 },
  { r: 180, g: 180, b: 180, a: 1 },
];

export const MAX_HISTORY_STATES = 100;
export const AUTO_SAVE_INTERVAL = 30000;
export const MARCHING_ANTS_SPEED = 100;