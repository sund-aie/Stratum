/**
 * Unified Canvas - Pen Tool
 * Vector path creation and editing (Pen, Curvature, Freeform, Add/Delete/Convert Anchor Point)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Layer, Point, PathSegment, PenPoint } from '../types';
import { penPointsToSegments, createRectanglePath, createEllipsePath, createPolygonPath, createStarPath } from '../engine/VectorRenderer';
import type { ToolMode } from '../constants/tools';

export interface PenToolState {
  mode: 'pen' | 'curvature' | 'freeform' | 'addAnchor' | 'deleteAnchor' | 'convertAnchor';
  currentPath: PenPoint[];
  isDrawing: boolean;
  hoverPoint: PenPoint | null;
  selectedAnchorIndex: number | null;
  selectedHandle: 'in' | 'out' | null;
}

export function usePenTool(
  document: any,
  activeLayerId: string | null,
  setActiveLayerId: (id: string | null) => void,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  addLayer: (layer: Layer, parentId?: string) => string,
  history: { push: (action: any) => void }
) {
  const [state, setState] = useState<PenToolState>({
    mode: 'pen',
    currentPath: [],
    isDrawing: false,
    hoverPoint: null,
    selectedAnchorIndex: null,
    selectedHandle: null,
  });
  
  const previewPathRef = useRef<SVGPathElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Pen modes
  const setMode = useCallback((mode: PenToolState['mode']) => {
    setState(prev => ({ ...prev, mode }));
  }, []);
  
  // Start new path
  const startPath = useCallback((x: number, y: number, pressure: number = 1) => {
    const point: PenPoint = {
      point: { x, y },
      pressure,
    };
    
    setState(prev => ({
      ...prev,
      currentPath: [point],
      isDrawing: true,
    }));
  }, []);
  
  // Add anchor point (click)
  const addAnchor = useCallback((x: number, y: number, pressure: number = 1, isCorner: boolean = false) => {
    setState(prev => {
      const newPoint: PenPoint = {
        point: { x, y },
        pressure,
        corner: isCorner,
      };
      
      // If this is the second point and we're in pen mode, create handles
      if (prev.currentPath.length === 1 && prev.mode === 'pen') {
        const firstPoint = prev.currentPath[0];
        const dx = x - firstPoint.point.x;
        const dy = y - firstPoint.point.y;
        
        // Auto-create smooth handles
        firstPoint.handleOut = { x: firstPoint.point.x + dx / 3, y: firstPoint.point.y + dy / 3 };
        newPoint.handleIn = { x: x - dx / 3, y: y - dy / 3 };
      }
      
      return {
        ...prev,
        currentPath: [...prev.currentPath, newPoint],
      };
    });
  }, []);
  
  // Update last anchor (drag to create handles)
  const updateLastAnchor = useCallback((x: number, y: number) => {
    setState(prev => {
      if (prev.currentPath.length === 0) return prev;
      
      const newPath = [...prev.currentPath];
      const lastIndex = newPath.length - 1;
      
      if (lastIndex === 0) {
        // First point - just move
        newPath[0] = { ...newPath[0], point: { x, y } };
      } else {
        // Update handle out of previous point and handle in of current
        const prevPoint = newPath[lastIndex - 1];
        const currPoint = newPath[lastIndex];
        
        const dx = x - prevPoint.point.x;
        const dy = y - prevPoint.point.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
          const handleLength = dist / 3;
          prevPoint.handleOut = { x: prevPoint.point.x + dx / dist * handleLength, y: prevPoint.point.y + dy / dist * handleLength };
          
          if (!currPoint.corner) {
            currPoint.handleIn = { x: x - dx / dist * handleLength, y: y - dy / dist * handleLength };
          }
        }
        
        newPath[lastIndex] = { ...currPoint, point: { x, y } };
        newPath[lastIndex - 1] = prevPoint;
      }
      
      return { ...prev, currentPath: newPath };
    });
  }, []);
  
  // Finish path
  const finishPath = useCallback((closePath: boolean = false) => {
    setState(prev => {
      if (prev.currentPath.length < 2) {
        return { ...prev, currentPath: [], isDrawing: false };
      }
      
      // Create vector layer
      const segments = penPointsToSegments(prev.currentPath);
      
      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: 'Path',
        type: 'vector',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        zIndex: Date.now(),
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, originX: 0, originY: 0, flipX: false, flipY: false },
        vectorData: {
          paths: [{
            segments,
            closed: closePath,
            fill: { type: 'none' },
            stroke: { color: '#000000', width: 2, cap: 'round', join: 'round' },
          }],
          compoundPath: false,
        },
      };
      
      const id = addLayer(newLayer);
      history.push({ type: 'addLayer', layerId: id });
      setActiveLayerId(id);
      
      return { ...prev, currentPath: [], isDrawing: false };
    });
  }, [addLayer, history, setActiveLayerId]);
  
  // Cancel path
  const cancelPath = useCallback(() => {
    setState(prev => ({ ...prev, currentPath: [], isDrawing: false }));
  }, []);
  
  // Edit existing path
  const editPath = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (layer && layer.vectorData && layer.vectorData.paths.length > 0) {
      // Convert path to pen points for editing
      const path = layer.vectorData.paths[0];
      const penPoints = segmentsToPenPoints(path.segments, path.closed);
      setState(prev => ({ ...prev, currentPath: penPoints, isDrawing: true }));
    }
  }, [document.layers, setActiveLayerId]);
  
  // Handle anchor selection
  const selectAnchor = useCallback((index: number, handle: 'in' | 'out' | null = null) => {
    setState(prev => ({ ...prev, selectedAnchorIndex: index, selectedHandle: handle }));
  }, []);
  
  // Move anchor
  const moveAnchor = useCallback((index: number, x: number, y: number) => {
    setState(prev => {
      if (index < 0 || index >= prev.currentPath.length) return prev;
      
      const newPath = [...prev.currentPath];
      const point = newPath[index];
      const dx = x - point.point.x;
      const dy = y - point.point.y;
      
      newPath[index] = {
        ...point,
        point: { x, y },
        handleIn: point.handleIn ? { x: point.handleIn.x + dx, y: point.handleIn.y + dy } : undefined,
        handleOut: point.handleOut ? { x: point.handleOut.x + dx, y: point.handleOut.y + dy } : undefined,
      };
      
      return { ...prev, currentPath: newPath };
    });
  }, []);
  
  // Move handle
  const moveHandle = useCallback((index: number, handle: 'in' | 'out', x: number, y: number) => {
    setState(prev => {
      if (index < 0 || index >= prev.currentPath.length) return prev;
      
      const newPath = [...prev.currentPath];
      newPath[index] = {
        ...newPath[index],
        [handle === 'in' ? 'handleIn' : 'handleOut']: { x, y },
      };
      
      // Mirror opposite handle for smooth points
      if (!newPath[index].corner) {
        const oppHandle = handle === 'in' ? 'handleOut' : 'handleIn';
        const anchor = newPath[index].point;
        const currHandle = newPath[index][handle === 'in' ? 'handleIn' : 'handleOut'];
        
        if (currHandle) {
          const dx = currHandle.x - anchor.x;
          const dy = currHandle.y - anchor.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist > 0) {
            newPath[index][oppHandle] = {
              x: anchor.x - dx,
              y: anchor.y - dy,
            };
          }
        }
      }
      
      return { ...prev, currentPath: newPath };
    });
  }, []);
  
  // Convert anchor type (corner/smooth)
  const convertAnchor = useCallback((index: number) => {
    setState(prev => {
      if (index < 0 || index >= prev.currentPath.length) return prev;
      
      const newPath = [...prev.currentPath];
      const point = newPath[index];
      
      if (point.corner) {
        // Convert to smooth - create handles
        const prevPt = index > 0 ? newPath[index - 1] : null;
        const nextPt = index < newPath.length - 1 ? newPath[index + 1] : null;
        
        if (prevPt) {
          const dx = point.point.x - prevPt.point.x;
          const dy = point.point.y - prevPt.point.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            point.handleIn = { x: point.point.x - dx / dist * (dist / 3), y: point.point.y - dy / dist * (dist / 3) };
          }
        }
        if (nextPt) {
          const dx = nextPt.point.x - point.point.x;
          const dy = nextPt.point.y - point.point.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            point.handleOut = { x: point.point.x + dx / dist * (dist / 3), y: point.point.y + dy / dist * (dist / 3) };
          }
        }
        point.corner = false;
      } else {
        // Convert to corner - remove handles
        point.handleIn = undefined;
        point.handleOut = undefined;
        point.corner = true;
      }
      
      newPath[index] = point;
      return { ...prev, currentPath: newPath };
    });
  }, []);
  
  // Delete anchor
  const deleteAnchor = useCallback((index: number) => {
    setState(prev => {
      if (prev.currentPath.length <= 2) return prev;
      
      const newPath = prev.currentPath.filter((_, i) => i !== index);
      return { ...prev, currentPath: newPath, selectedAnchorIndex: null };
    });
  }, []);
  
  // Commit path edits
  const commitPath = useCallback((layerId: string) => {
    setState(prev => {
      if (prev.currentPath.length < 2) return prev;
      
      const segments = penPointsToSegments(prev.currentPath);
      
      updateLayer(layerId, {
        vectorData: {
          paths: [{
            segments,
            closed: false, // Would need to track this
            fill: { type: 'none' },
            stroke: { color: '#000000', width: 2, cap: 'round', join: 'round' },
          }],
          compoundPath: false,
        },
      });
      
      history.push({ type: 'updateLayer', layerId, oldData: {} });
      return { ...prev, currentPath: [], isDrawing: false };
    });
  }, [updateLayer, history]);
  
  // Shape tools (Rectangle, Ellipse, Polygon, Star, Line)
  const drawShape = useCallback((
    type: 'rect' | 'ellipse' | 'polygon' | 'star' | 'line',
    x1: number, y1: number, x2: number, y2: number,
    options: { radius?: number; sides?: number; corners?: number } = {}
  ) => {
    let segments: PathSegment[] = [];
    const w = x2 - x1;
    const h = y2 - y1;
    
    switch (type) {
      case 'rect':
        segments = createRectanglePath(x1, y1, w, h, options.radius || 0);
        break;
      case 'ellipse':
        segments = createEllipsePath(x1 + w/2, y1 + h/2, Math.abs(w)/2, Math.abs(h)/2);
        break;
      case 'polygon':
        segments = createPolygonPath(x1 + w/2, y1 + h/2, Math.min(Math.abs(w), Math.abs(h))/2, options.sides || 6);
        break;
      case 'star':
        segments = createStarPath(x1 + w/2, y1 + h/2, Math.abs(w)/2, Math.abs(h)/2, options.corners || 5);
        break;
      case 'line':
        segments = [
          { type: 'line', point: { x: x1, y: y1 } },
          { type: 'line', point: { x: x2, y: y2 } },
        ];
        break;
    }
    
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type: 'vector',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      zIndex: Date.now(),
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, originX: 0, originY: 0, flipX: false, flipY: false },
      vectorData: {
        paths: [{
          segments,
          closed: type !== 'line',
          fill: { type: 'none' },
          stroke: { color: '#000000', width: 2, cap: 'round', join: 'round' },
        }],
        compoundPath: false,
      },
    };
    
    const id = addLayer(newLayer);
    setActiveLayerId(id);
    history.push({ type: 'addLayer', layerId: id });
  }, [addLayer, setActiveLayerId, history]);
  
  return {
    state,
    setMode,
    startPath,
    addAnchor,
    updateLastAnchor,
    finishPath,
    cancelPath,
    editPath,
    selectAnchor,
    moveAnchor,
    moveHandle,
    convertAnchor,
    deleteAnchor,
    commitPath,
    drawShape,
  };
}

// Convert path segments to pen points for editing
function segmentsToPenPoints(segments: PathSegment[], closed: boolean): PenPoint[] {
  if (segments.length === 0) return [];
  
  const points: PenPoint[] = [];
  
  // First point
  points.push({
    point: segments[0].point,
    corner: closed, // Simplified
  });
  
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prevSeg = segments[i - 1];
    
    if (seg.type === 'curve' && seg.cp1 && seg.cp2) {
      // Previous point gets handleOut, current gets handleIn
      if (points.length > 0) {
        points[points.length - 1].handleOut = seg.cp1;
      }
      points.push({
        point: seg.point,
        handleIn: seg.cp2,
        corner: false,
      });
    } else {
      points.push({
        point: seg.point,
        corner: true,
      });
    }
  }
  
  return points;
}