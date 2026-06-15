/**
 * Unified Canvas - Tool Base Classes and Types
 */

import type { Point, Rect, Layer, Selection, ToolType, ToolOptions, Color } from '../types';

export interface ToolContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  layers: Layer[];
  activeLayerId: string | null;
  selection: Selection | null;
  toolOptions: ToolOptions;
  zoom: number;
  pan: Point;
  screenToCanvas: (x: number, y: number) => Point;
  canvasToScreen: (point: Point) => Point;
  addLayer: (layer: Layer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  setSelection: (selection: Selection | null) => void;
  setToolOptions: (options: Partial<ToolOptions>) => void;
  pushHistory: () => void;
}

export interface Tool {
  type: ToolType;
  cursor: string;
  onActivate?: (context: ToolContext) => void;
  onDeactivate?: (context: ToolContext) => void;
  onMouseDown: (point: Point, event: MouseEvent, context: ToolContext) => void;
  onMouseMove: (point: Point, event: MouseEvent, context: ToolContext) => void;
  onMouseUp: (point: Point, event: MouseEvent, context: ToolContext) => void;
  onClick?: (point: Point, event: MouseEvent, context: ToolContext) => void;
  onDoubleClick?: (point: Point, event: MouseEvent, context: ToolContext) => void;
  onKeyDown?: (event: KeyboardEvent, context: ToolContext) => void;
  onKeyUp?: (event: KeyboardEvent, context: ToolContext) => void;
  onWheel?: (delta: Point, event: WheelEvent, context: ToolContext) => void;
  renderOverlay?: (ctx: CanvasRenderingContext2D, context: ToolContext) => void;
}

export abstract class BaseTool implements Tool {
  abstract type: ToolType;
  abstract cursor: string;
  
  protected isActive = false;
  protected dragStart: Point | null = null;
  protected lastPoint: Point | null = null;

  onActivate?(context: ToolContext): void;
  onDeactivate?(context: ToolContext): void;
  
  abstract onMouseDown(point: Point, event: MouseEvent, context: ToolContext): void;
  abstract onMouseMove(point: Point, event: MouseEvent, context: ToolContext): void;
  abstract onMouseUp(point: Point, event: MouseEvent, context: ToolContext): void;
  onClick?(point: Point, event: MouseEvent, context: ToolContext): void;
  onDoubleClick?(point: Point, event: MouseEvent, context: ToolContext): void;
  onKeyDown?(event: KeyboardEvent, context: ToolContext): void;
  onKeyUp?(event: KeyboardEvent, context: ToolContext): void;
  onWheel?(delta: Point, event: WheelEvent, context: ToolContext): void;
  renderOverlay?(ctx: CanvasRenderingContext2D, context: ToolContext): void;

  protected getActiveLayer(context: ToolContext): Layer | null {
    if (!context.activeLayerId) return null;
    return context.layers.find(l => l.id === context.activeLayerId) || null;
  }

  protected isLayerEditable(layer: Layer | null, context: ToolContext): boolean {
    if (!layer) return false;
    if (layer.locked) return false;
    if (!layer.visible) return false;
    return true;
  }
}

export function createToolContext(
  canvas: HTMLCanvasElement,
  state: {
    layers: Layer[];
    activeLayerId: string | null;
    selection: Selection | null;
    toolOptions: ToolOptions;
    zoom: number;
    pan: Point;
  },
  actions: {
    addLayer: (layer: Layer) => void;
    removeLayer: (layerId: string) => void;
    updateLayer: (layerId: string, updates: Partial<Layer>) => void;
    setSelection: (selection: Selection | null) => void;
    setToolOptions: (options: Partial<ToolOptions>) => void;
    pushHistory: () => void;
  }
): ToolContext {
  const ctx = canvas.getContext('2d')!;
  
  return {
    canvas,
    ctx,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    selection: state.selection,
    toolOptions: state.toolOptions,
    zoom: state.zoom,
    pan: state.pan,
    screenToCanvas: (x: number, y: number) => ({
      x: (x - state.pan.x) / state.zoom,
      y: (y - state.pan.y) / state.zoom,
    }),
    canvasToScreen: (point: Point) => ({
      x: point.x * state.zoom + state.pan.x,
      y: point.y * state.zoom + state.pan.y,
    }),
    ...actions,
  };
}