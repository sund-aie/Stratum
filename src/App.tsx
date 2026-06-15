/**
 * Unified Canvas - Main Application Component
 * Integrates all tools, panels, and engine
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Toolbar } from './ui/Toolbar';
import { LayerPanel } from './ui/LayerPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { AdjustmentLayersPanel } from './ui/AdjustmentLayersPanel';
import { CanvasViewport } from './ui/CanvasViewport';
import { ColorPicker } from './ui/ColorPicker';
import { CanvasRenderer } from './engine/CanvasRenderer';
import { HitTester } from './engine/HitTester';
import { SelectionRenderer } from './engine/SelectionRenderer';
import { RasterOps } from './engine/RasterOps';
import { VectorRenderer } from './engine/VectorRenderer';
import { Adjustments } from './engine/Adjustments';
import {
  type Layer,
  type Selection,
  type ToolType,
  type ToolOptions,
  type Color,
  type Point,
  type Rect,
  DEFAULT_CANVAS_SIZE,
  DEFAULT_ZOOM,
} from './types';
import {
  MarqueeRectTool, MarqueeEllipseTool, LassoTool, PolygonalLassoTool, MagicWandTool, MoveTool,
  BrushTool, PencilTool, EraserTool, BackgroundEraserTool, MagicEraserTool,
  BlurTool, SharpenTool, SmudgeTool, DodgeTool, BurnTool, SpongeTool,
  ColorReplacementTool, MixerBrushTool,
  PenTool, CurvaturePenTool, FreeformPenTool,
  AddAnchorTool, DeleteAnchorTool, ConvertAnchorTool,
  PathSelectTool, DirectSelectTool,
  TypeTool, VerticalTypeTool, HorizontalTypeMaskTool, VerticalTypeMaskTool,
  RectangleTool, RoundedRectangleTool, EllipseTool, PolygonTool, LineTool, CustomShapeTool,
  TransformTool, PerspectiveTransformTool, WarpTransformTool, PuppetWarpTool, ContentAwareScaleTool,
  FillTool, PaintBucketTool, GradientTool, MaterialDropTool,
  EyedropperTool, ColorSamplerTool, RulerTool, CountTool,
  HandTool, ZoomTool, RotateViewTool,
  CropTool, PerspectiveCropTool, SliceTool, SliceSelectTool, FrameTool,
} from './tools';

import './App.css';

// Tool registry
const toolRegistry = {
  'marquee-rect': MarqueeRectTool,
  'marquee-ellipse': MarqueeEllipseTool,
  'lasso': LassoTool,
  'lasso-polygon': PolygonalLassoTool,
  'magic-wand': MagicWandTool,
  'move': MoveTool,
  'brush': BrushTool,
  'pencil': PencilTool,
  'eraser': EraserTool,
  'background-eraser': BackgroundEraserTool,
  'magic-eraser': MagicEraserTool,
  'blur': BlurTool,
  'sharpen': SharpenTool,
  'smudge': SmudgeTool,
  'dodge': DodgeTool,
  'burn': BurnTool,
  'sponge': SpongeTool,
  'color-replacement': ColorReplacementTool,
  'mixer-brush': MixerBrushTool,
  'pen': PenTool,
  'curvature-pen': CurvaturePenTool,
  'freeform-pen': FreeformPenTool,
  'add-anchor': AddAnchorTool,
  'delete-anchor': DeleteAnchorTool,
  'convert-anchor': ConvertAnchorTool,
  'path-select': PathSelectTool,
  'direct-select': DirectSelectTool,
  'horizontal-type': TypeTool,
  'vertical-type': VerticalTypeTool,
  'horizontal-type-mask': HorizontalTypeMaskTool,
  'vertical-type-mask': VerticalTypeMaskTool,
  'rectangle': RectangleTool,
  'rounded-rectangle': RoundedRectangleTool,
  'ellipse': EllipseTool,
  'polygon': PolygonTool,
  'line': LineTool,
  'custom-shape': CustomShapeTool,
  'free-transform': TransformTool,
  'perspective-transform': PerspectiveTransformTool,
  'warp-transform': WarpTransformTool,
  'puppet-warp': PuppetWarpTool,
  'content-aware-scale': ContentAwareScaleTool,
  'fill': FillTool,
  'paint-bucket': PaintBucketTool,
  'gradient': GradientTool,
  'material-drop': MaterialDropTool,
  'eyedropper': EyedropperTool,
  'color-sampler': ColorSamplerTool,
  'ruler': RulerTool,
  'count': CountTool,
  'hand': HandTool,
  'zoom': ZoomTool,
  'rotate-view': RotateViewTool,
  'crop': CropTool,
  'perspective-crop': PerspectiveCropTool,
  'slice': SliceTool,
  'slice-select': SliceSelectTool,
  'frame': FrameTool,
};

function createTool(type: ToolType) {
  const ToolClass = toolRegistry[type];
  if (ToolClass) {
    return new ToolClass();
  }
  return null;
}

interface AppState {
  // Canvas
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: Point;
  viewRotation: number;
  
  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  
  // Selection
  selection: Selection | null;
  
  // Tools
  activeTool: ToolType;
  toolOptions: ToolOptions;
  
  // Colors
  foregroundColor: Color;
  backgroundColor: Color;
  
  // History
  history: Layer[][];
  historyIndex: number;
  
  // UI
  showLayerPanel: boolean;
  showPropertiesPanel: boolean;
  showColorPicker: boolean;
  toolOptionsPanel: string; // which sub-panel is open
}

const defaultToolOptions: ToolOptions = {
  // Brush
  brushSize: 50,
  brushHardness: 0.5,
  brushOpacity: 1,
  brushFlow: 1,
  brushSpacing: 25,
  brushBlendMode: 'normal',
  
  // Selection
  marqueeStyle: 'normal',
  marqueeWidth: 100,
  marqueeHeight: 100,
  marqueeFeather: 0,
  lassoFeather: 0,
  lassoAntiAlias: true,
  magicWandTolerance: 32,
  magicWandContiguous: true,
  
  // Pen
  penRubberBand: true,
  
  // Shape
  shapeFill: null,
  shapeStroke: null,
  shapeStrokeWidth: 1,
  shapeStrokeDash: [],
  shapeStrokeCap: 'butt',
  shapeStrokeJoin: 'miter',
  shapeCornerRadius: 10,
  shapeSides: 5,
  shapeStarRatio: 0,
  
  // Text
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  leading: 120,
  tracking: 0,
  
  // Fill
  fillTolerance: 32,
  fillContiguous: true,
  fillAntiAlias: true,
  fillBlendMode: 'normal',
  
  // Gradient
  gradient: {
    type: 'linear',
    stops: [
      { offset: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { offset: 1, color: { r: 255, g: 255, b: 255, a: 1 } },
    ],
  },
  gradientBlendMode: 'normal',
  gradientDither: true,
  gradientReverse: false,
  
  // Eyedropper
  eyedropperSampleSize: '3x3',
  eyedropperSampleLayers: 'all',
  
  // Transform
  transformMode: 'transform',
  
  // Zoom
  zoomAction: 'in',
};

const defaultForegroundColor: Color = { r: 0, g: 0, b: 0, a: 1 };
const defaultBackgroundColor: Color = { r: 255, g: 255, b: 255, a: 1 };

export function App() {
  const [state, setState] = useState<AppState>(() => ({
    canvasSize: DEFAULT_CANVAS_SIZE,
    zoom: DEFAULT_ZOOM,
    pan: { x: 0, y: 0 },
    viewRotation: 0,
    layers: [],
    activeLayerId: null,
    selection: null,
    activeTool: 'move',
    toolOptions: defaultToolOptions,
    foregroundColor: defaultForegroundColor,
    backgroundColor: defaultBackgroundColor,
    history: [[]],
    historyIndex: 0,
    showLayerPanel: true,
    showPropertiesPanel: true,
    showColorPicker: false,
    toolOptionsPanel: 'brush',
  }));
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(new CanvasRenderer());
  const hitTesterRef = useRef(new HitTester());
  const selectionRendererRef = useRef(new SelectionRenderer());
  const rasterOpsRef = useRef(new RasterOps());
  const vectorRendererRef = useRef(new VectorRenderer());
  const adjustmentsRef = useRef(new Adjustments());
  const toolRef = useRef(createTool(state.activeTool));
  
  // Initialize with a background layer
  useEffect(() => {
    if (state.layers.length === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d')!;
      canvas.width = state.canvasSize.width;
      canvas.height = state.canvasSize.height;
      
      // Create background layer
      const bgLayer: Layer = {
        id: 'background',
        name: 'Background',
        type: 'raster',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: true,
        order: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        data: {
          imageData: ctx.createImageData(state.canvasSize.width, state.canvasSize.height),
        },
      };
      
      // Fill with white
      const data = bgLayer.data.imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      
      // Create a working layer
      const workLayer: Layer = {
        id: 'layer-1',
        name: 'Layer 1',
        type: 'raster',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        order: 1,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        data: {
          imageData: ctx.createImageData(state.canvasSize.width, state.canvasSize.height),
        },
      };
      
      setState(prev => ({
        ...prev,
        layers: [bgLayer, workLayer],
        activeLayerId: workLayer.id,
      }));
    }
  }, []);
  
  // Update tool when activeTool changes
  useEffect(() => {
    toolRef.current = createTool(state.activeTool);
    if (toolRef.current) {
      toolRef.current.onActivate?.(toolContext);
    }
  }, [state.activeTool]);
  
  // Tool context passed to all tools
  const toolContext = useMemo(() => ({
    canvas: canvasRef.current!,
    zoom: state.zoom,
    pan: state.pan,
    viewRotation: state.viewRotation,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    selection: state.selection,
    toolOptions: state.toolOptions,
    foregroundColor: state.foregroundColor,
    backgroundColor: state.backgroundColor,
    setToolOptions: (options: Partial<ToolOptions>) => {
      setState(prev => ({ ...prev, toolOptions: { ...prev.toolOptions, ...options } }));
    },
    setSelection: (selection: Selection | null) => {
      setState(prev => ({ ...prev, selection }));
    },
    addLayer: (layer: Layer) => {
      setState(prev => ({
        ...prev,
        layers: [...prev.layers, layer],
        activeLayerId: layer.id,
      }));
    },
    removeLayer: (layerId: string) => {
      setState(prev => ({
        ...prev,
        layers: prev.layers.filter(l => l.id !== layerId),
        activeLayerId: prev.activeLayerId === layerId 
          ? prev.layers[prev.layers.length - 2]?.id || null 
          : prev.activeLayerId,
      }));
    },
    updateLayer: (layerId: string, updates: Partial<Layer>) => {
      setState(prev => ({
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, ...updates } : l
        ),
      }));
    },
    pushHistory: () => {
      setState(prev => {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(prev.layers)));
        if (newHistory.length > 50) newHistory.shift();
        return { ...prev, history: newHistory, historyIndex: newHistory.length - 1 };
      });
    },
    undo: () => {
      setState(prev => {
        if (prev.historyIndex > 0) {
          return {
            ...prev,
            historyIndex: prev.historyIndex - 1,
            layers: JSON.parse(JSON.stringify(prev.history[prev.historyIndex - 1])),
          };
        }
        return prev;
      });
    },
    redo: () => {
      setState(prev => {
        if (prev.historyIndex < prev.history.length - 1) {
          return {
            ...prev,
            historyIndex: prev.historyIndex + 1,
            layers: JSON.parse(JSON.stringify(prev.history[prev.historyIndex + 1])),
          };
        }
        return prev;
      });
    },
    canvasToScreen: (point: Point): Point => ({
      x: (point.x - state.pan.x) * state.zoom,
      y: (point.y - state.pan.y) * state.zoom,
    }),
    screenToCanvas: (point: Point): Point => ({
      x: point.x / state.zoom + state.pan.x,
      y: point.y / state.zoom + state.pan.y,
    }),
  }), [
    state.layers,
    state.activeLayerId,
    state.selection,
    state.toolOptions,
    state.foregroundColor,
    state.backgroundColor,
    state.zoom,
    state.pan,
    state.viewRotation,
  ]);
  
  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let animationId: number;
    let lastTime = 0;
    
    const render = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply view transform
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(state.viewRotation);
      ctx.scale(state.zoom, state.zoom);
      ctx.translate(-state.pan.x - state.canvasSize.width / 2, -state.pan.y - state.canvasSize.height / 2);
      
      // Render layers
      rendererRef.current.render(ctx, state.layers, state.zoom);
      
      // Render selection overlay
      if (state.selection) {
        selectionRendererRef.current.render(ctx, state.selection, state.zoom);
      }
      
      // Render active tool overlay
      if (toolRef.current && toolRef.current.renderOverlay) {
        toolRef.current.renderOverlay(ctx, toolContext as any);
      }
      
      ctx.restore();
      
      animationId = requestAnimationFrame(render);
    };
    
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [state.layers, state.zoom, state.pan, state.viewRotation, state.selection, state.activeTool]);
  
  // Event handlers for canvas
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    toolRef.current.onMouseDown?.(point, event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    toolRef.current.onMouseMove?.(point, event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    toolRef.current.onMouseUp?.(point, event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    toolRef.current.onClick?.(point, event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    toolRef.current.onDoubleClick?.(point, event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!toolRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const point = toolContext.screenToCanvas({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    
    const delta = { x: event.deltaX, y: event.deltaY };
    
    toolRef.current.onWheel?.(delta, event.nativeEvent, toolContext as any);
    
    // Default zoom with Alt+wheel
    if (event.altKey) {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      setState(prev => ({
        ...prev,
        zoom: Math.max(0.01, Math.min(100, prev.zoom * factor)),
      }));
    }
  }, [toolContext]);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!toolRef.current) return;
    
    toolRef.current.onKeyDown?.(event.nativeEvent, toolContext as any);
    
    // Global shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          if (event.shiftKey) {
            toolContext.redo();
          } else {
            toolContext.undo();
          }
          event.preventDefault();
          break;
        case 's':
          // Save
          event.preventDefault();
          break;
        case 'n':
          // New document
          event.preventDefault();
          break;
        case 'o':
          // Open
          event.preventDefault();
          break;
      }
    }
    
    if (event.key === ' ' && !event.ctrlKey && !event.metaKey) {
      // Temporary hand tool
    }
  }, [toolContext]);
  
  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    if (!toolRef.current) return;
    toolRef.current.onKeyUp?.(event.nativeEvent, toolContext as any);
  }, [toolContext]);
  
  // Tool selection
  const setActiveTool = useCallback((tool: ToolType) => {
    setState(prev => ({ ...prev, activeTool: tool }));
  }, []);
  
  // Color changes
  const setForegroundColor = useCallback((color: Color) => {
    setState(prev => ({ ...prev, foregroundColor: color }));
  }, []);
  
  const setBackgroundColor = useCallback((color: Color) => {
    setState(prev => ({ ...prev, backgroundColor: color }));
  }, []);
  
  const swapColors = useCallback(() => {
    setState(prev => ({
      ...prev,
      foregroundColor: prev.backgroundColor,
      backgroundColor: prev.foregroundColor,
    }));
  }, []);
  
  const resetColors = useCallback(() => {
    setState(prev => ({
      ...prev,
      foregroundColor: defaultForegroundColor,
      backgroundColor: defaultBackgroundColor,
    }));
  }, []);
  
  // Layer operations
  const addLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${state.layers.length}`,
      type: 'raster',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: state.layers.length,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      data: {
        imageData: ctx.createImageData(state.canvasSize.width, state.canvasSize.height),
      },
    };
    
    setState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  }, [state.layers.length, state.canvasSize]);
  
  const duplicateLayer = useCallback(() => {
    if (!state.activeLayerId) return;
    
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer) return;
    
    const newLayer: Layer = {
      ...layer,
      id: `layer-${Date.now()}`,
      name: `${layer.name} copy`,
      order: layer.order + 1,
      data: {
        ...layer.data,
        imageData: layer.data.imageData ? new ImageData(
          new Uint8ClampedArray(layer.data.imageData.data),
          layer.data.imageData.width,
          layer.data.imageData.height
        ) : undefined,
      },
    };
    
    setState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  }, [state.activeLayerId, state.layers]);
  
  const deleteLayer = useCallback(() => {
    if (!state.activeLayerId) return;
    if (state.layers.length <= 2) return; // Keep background + at least 1
    
    const newLayers = state.layers.filter(l => l.id !== state.activeLayerId);
    const newActive = newLayers[newLayers.length - 1]?.id || null;
    
    setState(prev => ({
      ...prev,
      layers: newLayers,
      activeLayerId: newActive,
    }));
  }, [state.activeLayerId, state.layers]);
  
  // Zoom controls
  const zoomIn = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.min(100, prev.zoom * 1.2) }));
  }, []);
  
  const zoomOut = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.max(0.01, prev.zoom / 1.2) }));
  }, []);
  
  const zoomToFit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const scaleX = canvas.clientWidth / state.canvasSize.width;
    const scaleY = canvas.clientHeight / state.canvasSize.height;
    const zoom = Math.min(scaleX, scaleY) * 0.9;
    
    setState(prev => ({ ...prev, zoom, pan: { x: 0, y: 0 } }));
  }, [state.canvasSize]);
  
  const zoomTo100 = useCallback(() => {
    setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }));
  }, []);
  
  // Pan
  const setPan = useCallback((pan: Point) => {
    setState(prev => ({ ...prev, pan }));
  }, []);
  
  // File operations
  const exportImage = useCallback(async (format: 'png' | 'jpeg' | 'webp' = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = state.canvasSize.width;
    exportCanvas.height = state.canvasSize.height;
    const exportCtx = exportCanvas.getContext('2d')!;
    
    // Render all layers to export canvas
    rendererRef.current.render(exportCtx, state.layers.filter(l => l.visible), 1);
    
    const blob = await new Promise<Blob | null>(resolve => 
      exportCanvas.toBlob(resolve, `image/${format}`)
    );
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unified-canvas-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [state.canvasSize, state.layers]);
  
  const handleFileOpen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      
      // Resize canvas to image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear and draw
      ctx.clearRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: file.name,
        type: 'raster',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        order: state.layers.length,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        data: { imageData },
      };
      
      setState(prev => ({
        ...prev,
        canvasSize: { width: img.width, height: img.height },
        layers: [...prev.layers, newLayer],
        activeLayerId: newLayer.id,
        pan: { x: 0, y: 0 },
      }));
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [state.layers.length]);
  
  return (
    <div className="app" onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      {/* Menu Bar */}
      <div className="menu-bar">
        <div className="menu-item">
          <span>File</span>
          <div className="menu-dropdown">
            <button onClick={() => handleFileOpen({ target: { files: [] } } as any)}>New</button>
            <button>Open...</button>
            <button>Save</button>
            <button>Save As...</button>
            <hr />
            <button onClick={() => exportImage('png')}>Export as PNG</button>
            <button onClick={() => exportImage('jpeg')}>Export as JPEG</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Edit</span>
          <div className="menu-dropdown">
            <button onClick={toolContext.undo}>Undo</button>
            <button onClick={toolContext.redo}>Redo</button>
            <hr />
            <button>Cut</button>
            <button>Copy</button>
            <button>Paste</button>
            <hr />
            <button>Fill...</button>
            <button>Stroke...</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Image</span>
          <div className="menu-dropdown">
            <button>Adjustments...</button>
            <button>Image Size...</button>
            <button>Canvas Size...</button>
            <button>Crop</button>
            <button>Trim...</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Layer</span>
          <div className="menu-dropdown">
            <button onClick={addLayer}>New Layer</button>
            <button onClick={duplicateLayer}>Duplicate Layer</button>
            <button onClick={deleteLayer}>Delete Layer</button>
            <hr />
            <button>Merge Down</button>
            <button>Merge Visible</button>
            <button>Flatten Image</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Select</span>
          <div className="menu-dropdown">
            <button>All</button>
            <button>Deselect</button>
            <button>Reselect</button>
            <button>Inverse</button>
            <hr />
            <button>Modify...</button>
            <button>Feather...</button>
            <button>Color Range...</button>
            <button>Focus Area...</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Filter</span>
          <div className="menu-dropdown">
            <button>Blur</button>
            <button>Sharpen</button>
            <button>Noise</button>
            <button>Distort</button>
            <button>Stylize</button>
            <button>Camera Raw Filter...</button>
            <hr />
            <button>Filter Gallery...</button>
            <button>Convert for Smart Filters</button>
          </div>
        </div>
        <div className="menu-item">
          <span>View</span>
          <div className="menu-dropdown">
            <button onClick={zoomIn}>Zoom In</button>
            <button onClick={zoomOut}>Zoom Out</button>
            <button onClick={zoomToFit}>Fit on Screen</button>
            <button onClick={zoomTo100}>100%</button>
            <hr />
            <button>Rulers</button>
            <button>Guides</button>
            <button>Grid</button>
            <button>Smart Guides</button>
          </div>
        </div>
        <div className="menu-item">
          <span>Window</span>
          <div className="menu-dropdown">
            <label><input type="checkbox" checked={state.showLayerPanel} onChange={e => setState(prev => ({...prev, showLayerPanel: e.target.checked}))} /> Layers</label>
            <label><input type="checkbox" checked={state.showPropertiesPanel} onChange={e => setState(prev => ({...prev, showPropertiesPanel: e.target.checked}))} /> Properties</label>
            <label><input type="checkbox" checked={state.showColorPicker} onChange={e => setState(prev => ({...prev, showColorPicker: e.target.checked}))} /> Color Picker</label>
          </div>
        </div>
        <div className="menu-item">
          <span>Help</span>
          <div className="menu-dropdown">
            <button>Documentation</button>
            <button>Keyboard Shortcuts</button>
            <button>About</button>
          </div>
        </div>
      </div>
      
      {/* Options Bar */}
      <div className="options-bar">
        <PropertiesPanel
          activeTool={state.activeTool}
          activeLayer={state.layers.find(l => l.id === state.activeLayerId)}
          toolOptions={state.toolOptions}
          onToolOptionsChange={setState as any}
          layers={state.layers}
          activeLayerId={state.activeLayerId}
          canvasSize={state.canvasSize}
          zoom={state.zoom}
        />
      </div>
      
      {/* Main Workspace */}
      <div className="workspace">
        {/* Left Toolbar */}
        <Toolbar
          activeTool={state.activeTool}
          onToolChange={setActiveTool}
          foregroundColor={state.foregroundColor}
          backgroundColor={state.backgroundColor}
          onForegroundChange={setForegroundColor}
          onBackgroundChange={setBackgroundColor}
          onSwapColors={swapColors}
          onResetColors={resetColors}
        />
        
        {/* Center Canvas */}
        <div className="canvas-container" style={{ flex: 1 }}>
          <CanvasViewport
            ref={canvasRef as any}
            canvasSize={state.canvasSize}
            zoom={state.zoom}
            pan={state.pan}
            viewRotation={state.viewRotation}
            onZoomChange={setState as any}
            onPanChange={setState as any}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            activeTool={state.activeTool}
            toolOptions={state.toolOptions}
            selection={state.selection}
            layers={state.layers}
            activeLayerId={state.activeLayerId}
            foregroundColor={state.foregroundColor}
            backgroundColor={state.backgroundColor}
          />
        </div>
        
        {/* Right Panels */}
        <div className="right-panels">
          {state.showLayerPanel && (
            <LayerPanel
              layers={state.layers}
              activeLayerId={state.activeLayerId}
              onLayerSelect={setState as any}
              onLayerUpdate={setState as any}
              onAddLayer={addLayer}
              onDuplicateLayer={duplicateLayer}
              onDeleteLayer={deleteLayer}
            />
          )}
          
          {state.showPropertiesPanel && (
            <PropertiesPanel
              activeTool={state.activeTool}
              activeLayer={state.layers.find(l => l.id === state.activeLayerId)}
              toolOptions={state.toolOptions}
              onToolOptionsChange={setState as any}
              layers={state.layers}
              activeLayerId={state.activeLayerId}
              canvasSize={state.canvasSize}
              zoom={state.zoom}
            />
          )}
          
          {state.showColorPicker && (
            <ColorPicker
              foregroundColor={state.foregroundColor}
              backgroundColor={state.backgroundColor}
              onForegroundChange={setForegroundColor}
              onBackgroundChange={setBackgroundColor}
            />
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="status-bar">
        <span>Zoom: {Math.round(state.zoom * 100)}%</span>
        <span>|</span>
        <span>Layer: {state.layers.find(l => l.id === state.activeLayerId)?.name || 'None'}</span>
        <span>|</span>
        <span>Tool: {state.activeTool}</span>
        <span>|</span>
        <span>{state.canvasSize.width} × {state.canvasSize.height} px</span>
        <span>|</span>
        <span>RGB/8</span>
      </div>
    </div>
  );
}

export default App;