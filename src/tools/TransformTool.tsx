/**
 * Unified Canvas - Transform Tool
 * Free transform with handles, perspective, warp, puppet warp
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Layer, Transform, Point } from '../types';
import { getLayerBounds, getTransformHandles, getHandleAtPoint, inverseTransformPoint, transformPoint } from '../engine/HitTester';

export interface TransformState {
  activeLayerId: string | null;
  mode: 'free' | 'perspective' | 'warp' | 'puppet';
  originalTransform: Transform | null;
  activeHandle: string | null;
  startPoint: Point | null;
  startTransform: Transform | null;
  warpGrid: Point[][] | null;
  puppetPins: { id: string; x: number; y: number }[];
}

const DEFAULT_TRANSFORM: Transform = {
  x: 0, y: 0,
  scaleX: 1, scaleY: 1,
  rotation: 0,
  originX: 0, originY: 0,
  flipX: false, flipY: false,
};

export function useTransformTool(
  document: any,
  activeLayerId: string | null,
  setActiveLayerId: (id: string | null) => void,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  history: { push: (action: any) => void }
) {
  const [state, setState] = useState<TransformState>({
    activeLayerId: null,
    mode: 'free',
    originalTransform: null,
    activeHandle: null,
    startPoint: null,
    startTransform: null,
    warpGrid: null,
    puppetPins: [],
  });
  
  // Initialize transform for a layer
  const initTransform = useCallback((layerId: string) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (!layer) return;
    
    const bounds = getLayerBounds(layer, null); // Would need renderer
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Set origin to center
    const transform = { ...layer.transform };
    transform.originX = centerX;
    transform.originY = centerY;
    
    setState({
      activeLayerId: layerId,
      mode: 'free',
      originalTransform: { ...transform },
      activeHandle: null,
      startPoint: null,
      startTransform: { ...transform },
      warpGrid: null,
      puppetPins: [],
    });
    
    updateLayer(layerId, { transform });
  }, [document.layers, updateLayer]);
  
  // Start transform
  const startTransform = useCallback((handle: string, x: number, y: number) => {
    setState(prev => {
      if (!prev.activeLayerId) return prev;
      
      const layer = document.layers.find((l: Layer) => l.id === prev.activeLayerId);
      if (!layer) return prev;
      
      return {
        ...prev,
        activeHandle: handle,
        startPoint: { x, y },
        startTransform: { ...layer.transform },
      };
    });
  }, [document.layers]);
  
  // Update transform (drag)
  const updateTransform = useCallback((x: number, y: number, shiftKey: boolean = false, altKey: boolean = false) => {
    setState(prev => {
      if (!prev.activeLayerId || !prev.activeHandle || !prev.startPoint || !prev.startTransform) return prev;
      
      const layer = document.layers.find((l: Layer) => l.id === prev.activeLayerId);
      if (!layer) return prev;
      
      const dx = x - prev.startPoint.x;
      const dy = y - prev.startPoint.y;
      const transform = { ...prev.startTransform };
      
      // Get bounds for center calculations
      const bounds = getLayerBounds(layer, null);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      
      // Transform handle deltas to layer space
      // (Simplified - would use inverseTransformPoint)
      
      switch (prev.activeHandle) {
        case 'tl':
          // Top-left - scale and translate
          if (shiftKey) {
            // Uniform scale from opposite corner
            const newScaleX = Math.max(0.01, (bounds.width - dx) / bounds.width);
            const newScaleY = Math.max(0.01, (bounds.height - dy) / bounds.height);
            const scale = Math.min(newScaleX, newScaleY);
            transform.scaleX = scale * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = scale * (prev.startTransform.flipY ? -1 : 1);
            transform.x = prev.startTransform.x + bounds.width * (1 - scale);
            transform.y = prev.startTransform.y + bounds.height * (1 - scale);
          } else {
            transform.scaleX = Math.max(0.01, (bounds.width - dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = Math.max(0.01, (bounds.height - dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
            transform.x = prev.startTransform.x + dx;
            transform.y = prev.startTransform.y + dy;
          }
          break;
          
        case 'tr':
          if (shiftKey) {
            const newScaleX = Math.max(0.01, (bounds.width + dx) / bounds.width);
            const newScaleY = Math.max(0.01, (bounds.height - dy) / bounds.height);
            const scale = Math.min(newScaleX, newScaleY);
            transform.scaleX = scale * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = scale * (prev.startTransform.flipY ? -1 : 1);
            transform.y = prev.startTransform.y + bounds.height * (1 - scale);
          } else {
            transform.scaleX = Math.max(0.01, (bounds.width + dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = Math.max(0.01, (bounds.height - dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
            transform.y = prev.startTransform.y + dy;
          }
          break;
          
        case 'br':
          if (shiftKey) {
            const newScaleX = Math.max(0.01, (bounds.width + dx) / bounds.width);
            const newScaleY = Math.max(0.01, (bounds.height + dy) / bounds.height);
            const scale = Math.min(newScaleX, newScaleY);
            transform.scaleX = scale * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = scale * (prev.startTransform.flipY ? -1 : 1);
          } else {
            transform.scaleX = Math.max(0.01, (bounds.width + dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = Math.max(0.01, (bounds.height + dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
          }
          break;
          
        case 'bl':
          if (shiftKey) {
            const newScaleX = Math.max(0.01, (bounds.width - dx) / bounds.width);
            const newScaleY = Math.max(0.01, (bounds.height + dy) / bounds.height);
            const scale = Math.min(newScaleX, newScaleY);
            transform.scaleX = scale * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = scale * (prev.startTransform.flipY ? -1 : 1);
            transform.x = prev.startTransform.x + bounds.width * (1 - scale);
          } else {
            transform.scaleX = Math.max(0.01, (bounds.width - dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
            transform.scaleY = Math.max(0.01, (bounds.height + dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
            transform.x = prev.startTransform.x + dx;
          }
          break;
          
        case 't':
          if (shiftKey) {
            // Constrain to corner handles
          } else {
            transform.scaleY = Math.max(0.01, (bounds.height - dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
            transform.y = prev.startTransform.y + dy;
          }
          break;
          
        case 'b':
          transform.scaleY = Math.max(0.01, (bounds.height + dy) / bounds.height) * (prev.startTransform.flipY ? -1 : 1);
          break;
          
        case 'l':
          if (shiftKey) {
            // constrain
          } else {
            transform.scaleX = Math.max(0.01, (bounds.width - dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
            transform.x = prev.startTransform.x + dx;
          }
          break;
          
        case 'r':
          transform.scaleX = Math.max(0.01, (bounds.width + dx) / bounds.width) * (prev.startTransform.flipX ? -1 : 1);
          break;
          
        case 'rotate':
          // Calculate angle from center
          const angle = Math.atan2(y - cy, x - cx) - Math.atan2(prev.startPoint.y - cy, prev.startPoint.x - cx);
          transform.rotation = prev.startTransform.rotation + angle;
          
          // Snap to 15 degree increments with shift
          if (shiftKey) {
            const deg = (transform.rotation * 180 / Math.PI) % 360;
            const snapped = Math.round(deg / 15) * 15;
            transform.rotation = snapped * Math.PI / 180;
          }
          break;
      }
      
      // Alt key: transform from center
      if (altKey && !['rotate'].includes(prev.activeHandle)) {
        // Mirror the transform
        // Would need more complex logic
      }
      
      updateLayer(prev.activeLayerId, { transform });
      
      return { ...prev };
    });
  }, [document.layers, updateLayer]);
  
  // End transform
  const endTransform = useCallback(() => {
    setState(prev => {
      if (!prev.activeLayerId || !prev.originalTransform) return prev;
      
      history.push({
        type: 'transform',
        layerId: prev.activeLayerId,
        oldTransform: prev.originalTransform,
        newTransform: document.layers.find((l: Layer) => l.id === prev.activeLayerId)?.transform,
      });
      
      return {
        ...prev,
        activeHandle: null,
        startPoint: null,
        startTransform: null,
        originalTransform: null,
      };
    });
  }, [document.layers, history]);
  
  // Cancel transform
  const cancelTransform = useCallback(() => {
    setState(prev => {
      if (!prev.activeLayerId || !prev.originalTransform) return prev;
      
      updateLayer(prev.activeLayerId, { transform: prev.originalTransform });
      
      return {
        ...prev,
        activeHandle: null,
        startPoint: null,
        startTransform: null,
        originalTransform: null,
      };
    });
  }, [updateLayer]);
  
  // Set transform mode
  const setMode = useCallback((mode: TransformState['mode']) => {
    setState(prev => ({ ...prev, mode }));
  }, []);
  
  // Apply numeric transform
  const applyTransform = useCallback((layerId: string, updates: Partial<Transform>) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (!layer) return;
    
    const newTransform = { ...layer.transform, ...updates };
    updateLayer(layerId, { transform: newTransform });
    history.push({ type: 'transform', layerId, oldTransform: layer.transform, newTransform });
  }, [document.layers, updateLayer, history]);
  
  // Flip horizontal/vertical
  const flipHorizontal = useCallback((layerId: string) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (!layer) return;
    
    updateLayer(layerId, {
      transform: { ...layer.transform, flipX: !layer.transform.flipX }
    });
  }, [document.layers, updateLayer]);
  
  const flipVertical = useCallback((layerId: string) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (!layer) return;
    
    updateLayer(layerId, {
      transform: { ...layer.transform, flipY: !layer.transform.flipY }
    });
  }, [document.layers, updateLayer]);
  
  // Warp mode - create grid
  const createWarpGrid = useCallback((layerId: string, rows: number = 3, cols: number = 3) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (!layer) return;
    
    const bounds = getLayerBounds(layer, null);
    const grid: Point[][] = [];
    
    for (let r = 0; r <= rows; r++) {
      const row: Point[] = [];
      for (let c = 0; c <= cols; c++) {
        row.push({
          x: bounds.x + (bounds.width / cols) * c,
          y: bounds.y + (bounds.height / rows) * r,
        });
      }
      grid.push(row);
    }
    
    setState(prev => ({ ...prev, warpGrid: grid, mode: 'warp' }));
  }, [document.layers]);
  
  // Update warp grid point
  const updateWarpPoint = useCallback((row: number, col: number, x: number, y: number) => {
    setState(prev => {
      if (!prev.warpGrid) return prev;
      
      const newGrid = prev.warpGrid.map((r, ri) => 
        r.map((p, ci) => ri === row && ci === col ? { x, y } : p)
      );
      
      // Apply warp to layer (simplified)
      return { ...prev, warpGrid: newGrid };
    });
  }, []);
  
  // Puppet warp pins
  const addPuppetPin = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      puppetPins: [...prev.puppetPins, { id: crypto.randomUUID(), x, y }],
      mode: 'puppet',
    }));
  }, []);
  
  const removePuppetPin = useCallback((pinId: string) => {
    setState(prev => ({
      ...prev,
      puppetPins: prev.puppetPins.filter(p => p.id !== pinId),
    }));
  }, []);
  
  const movePuppetPin = useCallback((pinId: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      puppetPins: prev.puppetPins.map(p => p.id === pinId ? { ...p, x, y } : p),
    }));
  }, []);
  
  // Get handles for active layer
  const handles = useMemo(() => {
    if (!state.activeLayerId) return [];
    
    const layer = document.layers.find((l: Layer) => l.id === state.activeLayerId);
    if (!layer) return [];
    
    return getTransformHandles(layer, null); // Would need renderer
  }, [state.activeLayerId, document.layers]);
  
  // Check if point is over a handle
  const hitTestHandle = useCallback((x: number, y: number) => {
    return getHandleAtPoint(handles, x, y);
  }, [handles]);
  
  return {
    state,
    initTransform,
    startTransform,
    updateTransform,
    endTransform,
    cancelTransform,
    setMode,
    applyTransform,
    flipHorizontal,
    flipVertical,
    createWarpGrid,
    updateWarpPoint,
    addPuppetPin,
    removePuppetPin,
    movePuppetPin,
    handles,
    hitTestHandle,
  };
}