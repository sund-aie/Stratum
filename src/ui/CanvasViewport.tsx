/**
 * Unified Canvas - Canvas Viewport Component
 * Main canvas area with zoom, pan, grid, rulers, guides
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Layer, Selection, Point, Rect, ToolType, ToolOptions, Color } from '../types';
import { CanvasRenderer } from '../engine/CanvasRenderer';
import { HitTester } from '../engine/HitTester';
import { SelectionRenderer } from '../engine/SelectionRenderer';
import { VectorRenderer } from '../engine/VectorRenderer';
import { DEFAULT_CANVAS_SIZE, MIN_ZOOM, MAX_ZOOM } from '../constants';
import { clamp, applyMatrixToPoint, invertMatrix, composeMatrix } from '../utils/math';
import './CanvasViewport.css';

interface CanvasViewportProps {
  layers: Layer[];
  activeLayerId: string | null;
  selection: Selection | null;
  tool: ToolType;
  toolOptions: ToolOptions;
  zoom: number;
  pan: Point;
  onZoomChange: (zoom: number, center?: Point) => void;
  onPanChange: (pan: Point) => void;
  onCanvasClick: (point: Point, event: React.MouseEvent) => void;
  onCanvasMouseDown: (point: Point, event: React.MouseEvent) => void;
  onCanvasMouseMove: (point: Point, event: React.MouseEvent) => void;
  onCanvasMouseUp: (point: Point, event: React.MouseEvent) => void;
  onCanvasWheel: (delta: Point, event: React.WheelEvent) => void;
  onCanvasContextMenu: (point: Point, event: React.MouseEvent) => void;
  onCanvasKeyDown: (event: React.KeyboardEvent) => void;
  onCanvasKeyUp: (event: React.KeyboardEvent) => void;
  width: number;
  height: number;
  showGrid: boolean;
  showGuides: boolean;
  guides: { horizontal: number[]; vertical: number[] };
  snapToGrid: boolean;
  gridSize: number;
  snapToGuides: boolean;
  canvasBackground: string;
  disabled?: boolean;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  layers,
  activeLayerId,
  selection,
  tool,
  toolOptions,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onCanvasClick,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasWheel,
  onCanvasContextMenu,
  onCanvasKeyDown,
  onCanvasKeyUp,
  width,
  height,
  showGrid,
  showGuides,
  guides,
  snapToGrid,
  gridSize,
  snapToGuides,
  canvasBackground,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  const cornerRef = useRef<HTMLCanvasElement>(null);
  
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_SIZE.width, height: DEFAULT_CANVAS_SIZE.height });
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Initialize renderers
  const renderer = useMemo(() => new CanvasRenderer(), []);
  const hitTester = useMemo(() => new HitTester(), []);
  const selectionRenderer = useMemo(() => new SelectionRenderer(), []);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      // Canvas internal size = viewport size / zoom for crisp rendering
      // But we use CSS transform for zoom, so internal size = viewport size
      setCanvasSize({ width, height });
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d')!;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [width, height]);

  // Render main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    
    // Save and apply transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw canvas background (checkerboard for transparency)
    drawCheckerboard(ctx, canvasSize.width, canvasSize.height, canvasBackground);
    
    // Draw layers
    renderer.renderLayers(layers, ctx, { 
      x: -pan.x / zoom, 
      y: -pan.y / zoom, 
      width: width / zoom, 
      height: height / zoom 
    }, activeLayerId);

    ctx.restore();
  }, [layers, activeLayerId, zoom, pan, width, height, canvasSize, canvasBackground, renderer]);

  // Render overlay (selection, guides, grid, preview)
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    
    // Apply same transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvasSize.width, canvasSize.height, gridSize, zoom);
    }

    // Draw guides
    if (showGuides) {
      drawGuides(ctx, guides, canvasSize.width, canvasSize.height);
    }

    // Draw selection
    if (selection) {
      selectionRenderer.render(selection, ctx, { 
        x: -pan.x / zoom, 
        y: -pan.y / zoom, 
        width: width / zoom, 
        height: height / zoom 
      }, zoom);
    }

    // Draw hover preview for tools
    if (hoveredPoint && !disabled) {
      drawToolPreview(ctx, tool, toolOptions, hoveredPoint, zoom);
    }

    ctx.restore();
  }, [selection, hoveredPoint, showGrid, showGuides, guides, gridSize, zoom, pan, width, height, canvasSize, tool, toolOptions, disabled, selectionRenderer]);

  // Render rulers
  useEffect(() => {
    const topRuler = rulerTopRef.current;
    const leftRuler = rulerLeftRef.current;
    const corner = cornerRef.current;
    
    if (!topRuler || !leftRuler || !corner) return;

    const rulerSize = 20;
    
    // Top ruler
    topRuler.width = width * window.devicePixelRatio;
    topRuler.height = rulerSize * window.devicePixelRatio;
    topRuler.style.width = `${width}px`;
    topRuler.style.height = `${rulerSize}px`;
    
    const topCtx = topRuler.getContext('2d')!;
    topCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawRuler(topCtx, width, rulerSize, 'horizontal', pan.x, zoom);

    // Left ruler
    leftRuler.width = rulerSize * window.devicePixelRatio;
    leftRuler.height = height * window.devicePixelRatio;
    leftRuler.style.width = `${rulerSize}px`;
    leftRuler.style.height = `${height}px`;
    
    const leftCtx = leftRuler.getContext('2d')!;
    leftCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawRuler(leftCtx, rulerSize, height, 'vertical', pan.y, zoom);

    // Corner
    corner.width = rulerSize * window.devicePixelRatio;
    corner.height = rulerSize * window.devicePixelRatio;
    corner.style.width = `${rulerSize}px`;
    corner.style.height = `${rulerSize}px`;
    
    const cornerCtx = corner.getContext('2d')!;
    cornerCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    cornerCtx.fillStyle = '#2d2d2d';
    cornerCtx.fillRect(0, 0, rulerSize, rulerSize);
  }, [width, height, pan, zoom]);

  // Convert screen to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    setHoveredPoint(point);
    
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      // Middle click or space+click = pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    } else {
      onCanvasMouseDown(point, e);
    }
  }, [disabled, screenToCanvas, pan, isSpacePressed, onCanvasMouseDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    setHoveredPoint(point);
    
    if (isPanning && panStart) {
      onPanChange({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else {
      onCanvasMouseMove(point, e);
    }
  }, [disabled, screenToCanvas, isPanning, panStart, onPanChange, onCanvasMouseMove]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    } else {
      const point = screenToCanvas(e.clientX, e.clientY);
      onCanvasMouseUp(point, e);
    }
  }, [disabled, isPanning, screenToCanvas, onCanvasMouseUp]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || isPanning) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    onCanvasClick(point, e);
  }, [disabled, isPanning, screenToCanvas, onCanvasClick]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const point = screenToCanvas(e.clientX, e.clientY);
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
      onZoomChange(newZoom, point);
    } else if (e.shiftKey) {
      // Horizontal pan
      onPanChange({ x: pan.x - e.deltaY, y: pan.y });
    } else {
      // Vertical pan
      onPanChange({ x: pan.x, y: pan.y - e.deltaY });
    }
  }, [disabled, screenToCanvas, zoom, pan, onZoomChange, onPanChange]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    const point = screenToCanvas(e.clientX, e.clientY);
    onCanvasContextMenu(point, e);
  }, [disabled, screenToCanvas, onCanvasContextMenu]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space' && !isSpacePressed) {
      setIsSpacePressed(true);
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
    onCanvasKeyDown(e);
  }, [isSpacePressed, onCanvasKeyDown]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false);
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }
    onCanvasKeyUp(e);
  }, [onCanvasKeyUp]);

  // Attach keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="canvas-viewport" tabIndex={0}>
      {/* Rulers */}
      <div className="canvas-rulers">
        <canvas ref={cornerRef} className="canvas-ruler-corner" />
        <canvas ref={rulerTopRef} className="canvas-ruler canvas-ruler-top" />
        <canvas ref={rulerLeftRef} className="canvas-ruler canvas-ruler-left" />
      </div>
      
      {/* Canvas Area */}
      <div className="canvas-area" 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <canvas 
          ref={canvasRef} 
          className="canvas-main" 
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        />
        <canvas 
          ref={overlayRef} 
          className="canvas-overlay"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
      
      {/* Status bar */}
      <div className="canvas-status">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Layer: {activeLayerId ? layers.find(l => l.id === activeLayerId)?.name : 'None'}</span>
        <span>Tool: {tool}</span>
        {hoveredPoint && (
          <span>X: {Math.round(hoveredPoint.x)} Y: {Math.round(hoveredPoint.y)}</span>
        )}
      </div>
    </div>
  );
};

function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, background: string) {
  const squareSize = 20;
  const light = '#ffffff';
  const dark = '#cccccc';
  
  if (background === 'transparent') {
    for (let y = 0; y < height; y += squareSize) {
      for (let x = 0; x < width; x += squareSize) {
        const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
        ctx.fillStyle = isEven ? light : dark;
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number, zoom: number) {
  const majorGrid = gridSize * 10;
  const effectiveGrid = gridSize / zoom;
  
  if (effectiveGrid < 2) return; // Too small to see
  
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1 / zoom;
  
  // Minor grid
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Major grid
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1 / zoom;
  
  for (let x = 0; x <= width; x += majorGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += majorGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawGuides(ctx: CanvasRenderingContext2D, guides: { horizontal: number[]; vertical: number[] }, width: number, height: number) {
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  for (const x of guides.vertical) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (const y of guides.horizontal) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

function drawRuler(ctx: CanvasRenderingContext2D, width: number, height: number, orientation: 'horizontal' | 'vertical', panOffset: number, zoom: number) {
  const rulerSize = orientation === 'horizontal' ? height : width;
  const canvasSize = orientation === 'horizontal' ? width : height;
  
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (orientation === 'horizontal') {
    ctx.moveTo(0, rulerSize - 1);
    ctx.lineTo(width, rulerSize - 1);
  } else {
    ctx.moveTo(rulerSize - 1, 0);
    ctx.lineTo(rulerSize - 1, height);
  }
  ctx.stroke();
  
  // Tick marks
  const majorUnit = 100;
  const minorUnit = 10;
  const start = -panOffset / zoom;
  const end = start + canvasSize / zoom;
  
  const firstMajor = Math.ceil(start / majorUnit) * majorUnit;
  
  ctx.fillStyle = '#aaa';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  for (let pos = firstMajor; pos < end; pos += majorUnit) {
    const screenPos = (pos - start) * zoom;
    
    if (orientation === 'horizontal') {
      // Major tick
      ctx.beginPath();
      ctx.moveTo(screenPos, rulerSize - 15);
      ctx.lineTo(screenPos, rulerSize - 1);
      ctx.stroke();
      
      // Label
      ctx.fillText(`${pos}`, screenPos, rulerSize - 18);
      
      // Minor ticks
      for (let i = 1; i < 10; i++) {
        const minorPos = screenPos + i * minorUnit * zoom;
        if (minorPos > width) break;
        ctx.beginPath();
        ctx.moveTo(minorPos, rulerSize - 8);
        ctx.lineTo(minorPos, rulerSize - 1);
        ctx.stroke();
      }
    } else {
      // Major tick
      ctx.beginPath();
      ctx.moveTo(rulerSize - 15, screenPos);
      ctx.lineTo(rulerSize - 1, screenPos);
      ctx.stroke();
      
      // Label
      ctx.save();
      ctx.translate(rulerSize - 18, screenPos);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${pos}`, 0, 0);
      ctx.restore();
      
      // Minor ticks
      for (let i = 1; i < 10; i++) {
        const minorPos = screenPos + i * minorUnit * zoom;
        if (minorPos > height) break;
        ctx.beginPath();
        ctx.moveTo(rulerSize - 8, minorPos);
        ctx.lineTo(rulerSize - 1, minorPos);
        ctx.stroke();
      }
    }
  }
}

function drawToolPreview(
  ctx: CanvasRenderingContext2D,
  tool: ToolType,
  toolOptions: ToolOptions,
  point: Point,
  zoom: number
) {
  const size = toolOptions.brushSize / zoom;
  const hardness = toolOptions.brushHardness;
  
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1 / zoom;
  
  switch (tool) {
    case 'brush':
    case 'pencil':
    case 'eraser':
    case 'blur':
    case 'sharpen':
    case 'smudge':
    case 'dodge':
    case 'burn':
    case 'sponge': {
      // Brush preview
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size / 2);
      gradient.addColorStop(0, `rgba(255,255,255,${hardness})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'marquee-rect':
    case 'marquee-ellipse':
    case 'crop': {
      // Show crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      ctx.moveTo(point.x - size, point.y);
      ctx.lineTo(point.x + size, point.y);
      ctx.moveTo(point.x, point.y - size);
      ctx.lineTo(point.x, point.y + size);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
  }
  
  ctx.restore();
}

export default CanvasViewport;