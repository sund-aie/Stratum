/**
 * Unified Canvas - Core Type Definitions (Part 5: Export, Import, Workspace, UI)
 */

import type { Document } from './document';

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'psd' | 'tiff' | 'json';
  quality?: number; width?: number; height?: number; scale?: number;
  transparent?: boolean;
  colorSpace?: 'sRGB' | 'AdobeRGB' | 'P3' | 'ProPhoto';
  includeMetadata?: boolean;
  layers?: 'all' | 'visible' | 'selected' | 'merged';
  psdMaximizeCompatibility?: boolean;
  svgMinify?: boolean; svgResponsive?: boolean;
  jsonIncludeHistory?: boolean; jsonIncludePreviews?: boolean;
}

export interface ImportOptions {
  rawProfile?: string; rawWhiteBalance?: 'auto' | 'camera' | 'custom';
  rawTemperature?: number; rawTint?: number;
  psdImportTextAsEditable?: boolean; psdImportVectorsAsShapes?: boolean;
  svgImportTextAsEditable?: boolean;
  pdfPage?: number; pdfResolution?: number;
}

// ============================================================================
// WORKSPACE / UI STATE
// ============================================================================

export interface Workspace {
  id: string; name: string;
  panels: PanelState[]; toolbar: ToolbarState;
  shortcuts: ShortcutMap; theme: 'dark' | 'light' | 'system'; language: string;
}

export interface PanelState {
  id: string; type: PanelType; visible: boolean; docked: boolean;
  position: 'left' | 'right' | 'top' | 'bottom' | 'floating';
  size: { width?: number; height?: number }; tabIndex: number; groupedWith?: string[];
}

export type PanelType = 
  | 'layers' | 'properties' | 'adjustments' | 'history' | 'channels' | 'paths'
  | 'color' | 'swatches' | 'gradients' | 'patterns' | 'brushes' | 'toolPresets'
  | 'libraries' | 'assets' | 'info' | 'navigator' | 'histogram' | 'character'
  | 'paragraph' | 'glyphs' | 'appearance' | 'graphicStyles' | 'symbols' | 'brushesAI'
  | 'lrLibrary' | 'lrDevelop' | 'lrMap' | 'lrBook' | 'lrSlideshow' | 'lrPrint' | 'lrWeb';

export interface ToolbarState {
  visible: boolean; orientation: 'vertical' | 'horizontal';
  position: 'left' | 'right' | 'top' | 'bottom';
  tools: ToolId[]; extraTools: ToolId[]; springLoaded?: ToolId;
}

export type ShortcutMap = Record<string, ToolId | string>;

export interface UIState {
  activeModal: ModalType | null; modalData: any;
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  tooltip: { x: number; y: number; text: string } | null;
  statusMessage: string;
  progress: { message: string; value: number; max: number } | null;
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
  label: string; action: string; shortcut?: string; icon?: string;
  disabled?: boolean; divider?: boolean; submenu?: ContextMenuItem[];
}

// ============================================================================
// APPLICATION STATE (Root store)
// ============================================================================

export interface AppState {
  // Documents
  documents: Map<string, Document>;
  activeDocumentId: string | null;
  
  // Current document derived state
  activeLayer: import('./document').Layer | null;
  selectedLayerIds: string[];
  
  // Tools
  activeTool: ToolId;
  activeToolOptions: ToolOptions;
  previousTool: ToolId | null; // For spring-loaded
  
  // Colors
  foregroundColor: string; backgroundColor: string;
  
  // UI
  ui: UIState;
  workspace: Workspace;
  
  // Canvas interaction
  canvasTransform: { scale: number; x: number; y: number; rotation: number };
  mousePosition: { x: number; y: number } | null;
  dragState: DragState | null;
  
  // Selection (for raster)
  activeSelection: SelectionData | null;
  
  // Vector editing
  editingPathId: string | null;
  editingPointIndex: number | null;
  editingHandle: 'ctrl1' | 'ctrl2' | 'point' | null;
  
  // Text editing
  editingTextLayerId: string | null;
  textCursorPosition: number | null;
  textSelection: { start: number; end: number } | null;
}

export interface DragState {
  type: 'move' | 'transform' | 'select' | 'brush' | 'pen' | 'shape' | 'crop' | 'rotateView' | 'hand' | 'measure';
  startX: number; startY: number; currentX: number; currentY: number;
  layerIds?: string[]; // For multi-layer transform
  originalTransforms?: Map<string, Transform>; // For transform
  selectionPath?: Point[]; // For lasso/polygon
}

export interface SelectionData {
  // Can be: ImageData (pixel mask), Path[] (vector), or 'all' | 'none'
  type: 'pixel' | 'vector' | 'none' | 'all';
  pixelMask?: ImageData; // Grayscale
  vectorPaths?: import('./layers').Path[];
  bounds: Rect;
  feather: number;
  antiAlias: boolean;
}

export interface Rect { x: number; y: number; width: number; height: number; }
export interface Transform { x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number; originX: number; originY: number; flipX: boolean; flipY: boolean; }
export type ToolId = string;
export interface ToolOptions {}
export type ModalType = string;