/**
 * Unified Canvas - Keyboard Shortcuts & History
 * Unified shortcuts system, undo/redo history management
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Document, Layer, ToolId, HistoryAction } from '../types';

// ============= HISTORY MANAGER =============

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  maxHistory: number;
}

export const MAX_HISTORY = 100;

export function createHistoryManager(initialDoc: Document): HistoryState {
  return {
    past: [],
    future: [],
    maxHistory: MAX_HISTORY,
  };
}

export function pushHistory(state: HistoryState, action: HistoryAction): HistoryState {
  const newPast = [...state.past, action];
  if (newPast.length > state.maxHistory) {
    newPast.shift();
  }
  
  return {
    ...state,
    past: newPast,
    future: [], // Clear future on new action
  };
}

export function undo(state: HistoryState): { state: HistoryState; action: HistoryAction | null } {
  if (state.past.length === 0) {
    return { state, action: null };
  }
  
  const action = state.past[state.past.length - 1];
  return {
    state: {
      ...state,
      past: state.past.slice(0, -1),
      future: [action, ...state.future],
    },
    action,
  };
}

export function redo(state: HistoryState): { state: HistoryState; action: HistoryAction | null } {
  if (state.future.length === 0) {
    return { state, action: null };
  }
  
  const action = state.future[0];
  return {
    state: {
      ...state,
      past: [...state.past, action],
      future: state.future.slice(1),
    },
    action,
  };
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}

// History action creators
export function createLayerAction(
  type: 'addLayer' | 'deleteLayer' | 'updateLayer' | 'moveLayer',
  layerId: string,
  layer?: Layer,
  oldLayer?: Layer,
  index?: number
): HistoryAction {
  return { type, layerId, layer, oldLayer, index, timestamp: Date.now() };
}

export function createTransformAction(layerId: string, oldTransform: any, newTransform: any): HistoryAction {
  return { type: 'transform', layerId, oldTransform, newTransform, timestamp: Date.now() };
}

export function createToolAction(tool: ToolId, data: any): HistoryAction {
  return { type: 'tool', tool, data, timestamp: Date.now() };
}

// Apply history action to document
export function applyHistoryAction(doc: Document, action: HistoryAction, reverse: boolean = false): Document {
  const newDoc = { ...doc, layers: [...doc.layers] };
  
  switch (action.type) {
    case 'addLayer':
      if (reverse) {
        // Remove layer
        const idx = newDoc.layers.findIndex(l => l.id === action.layerId);
        if (idx >= 0) newDoc.layers.splice(idx, 1);
      } else {
        if (action.layer) newDoc.layers.push(action.layer);
      }
      break;
      
    case 'deleteLayer':
      if (reverse) {
        if (action.layer && action.index !== undefined) {
          newDoc.layers.splice(action.index, 0, action.layer);
        }
      } else {
        const idx = newDoc.layers.findIndex(l => l.id === action.layerId);
        if (idx >= 0) newDoc.layers.splice(idx, 1);
      }
      break;
      
    case 'updateLayer':
      const layerIdx = newDoc.layers.findIndex(l => l.id === action.layerId);
      if (layerIdx >= 0) {
        if (reverse && action.oldLayer) {
          newDoc.layers[layerIdx] = action.oldLayer;
        } else if (action.layer) {
          newDoc.layers[layerIdx] = { ...newDoc.layers[layerIdx], ...action.layer };
        }
      }
      break;
      
    case 'moveLayer':
      const moveIdx = newDoc.layers.findIndex(l => l.id === action.layerId);
      if (moveIdx >= 0) {
        const [layer] = newDoc.layers.splice(moveIdx, 1);
        const newIdx = reverse ? (action.index || moveIdx) : newDoc.layers.length;
        newDoc.layers.splice(newIdx, 0, layer);
      }
      break;
      
    case 'transform':
      const transIdx = newDoc.layers.findIndex(l => l.id === action.layerId);
      if (transIdx >= 0) {
        newDoc.layers[transIdx] = {
          ...newDoc.layers[transIdx],
          transform: reverse ? action.oldTransform : action.newTransform,
        };
      }
      break;
  }
  
  return newDoc;
}

// ============= KEYBOARD SHORTCUTS =============

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
  context?: 'global' | 'canvas' | 'text' | 'transform';
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // File
  { key: 'n', ctrl: true, action: 'newDocument', description: 'New document' },
  { key: 'o', ctrl: true, action: 'openDocument', description: 'Open document' },
  { key: 's', ctrl: true, action: 'saveDocument', description: 'Save document' },
  { key: 's', ctrl: true, shift: true, action: 'saveAsDocument', description: 'Save as...' },
  { key: 'e', ctrl: true, shift: true, action: 'exportDocument', description: 'Export...' },
  
  // Edit
  { key: 'z', ctrl: true, action: 'undo', description: 'Undo' },
  { key: 'z', ctrl: true, shift: true, action: 'redo', description: 'Redo' },
  { key: 'y', ctrl: true, action: 'redo', description: 'Redo (alt)' },
  { key: 'x', ctrl: true, action: 'cut', description: 'Cut' },
  { key: 'c', ctrl: true, action: 'copy', description: 'Copy' },
  { key: 'v', ctrl: true, action: 'paste', description: 'Paste' },
  { key: 'a', ctrl: true, action: 'selectAll', description: 'Select all' },
  { key: 'd', ctrl: true, action: 'deselect', description: 'Deselect' },
  { key: 'd', ctrl: true, shift: true, action: 'reselect', description: 'Reselect' },
  
  // Tools
  { key: 'v', action: 'toolSelect', description: 'Move tool (V)' },
  { key: 'b', action: 'toolBrush', description: 'Brush tool (B)' },
  { key: 'e', action: 'toolEraser', description: 'Eraser tool (E)' },
  { key: 'p', action: 'toolPen', description: 'Pen tool (P)' },
  { key: 't', action: 'toolText', description: 'Text tool (T)' },
  { key: 'u', action: 'toolShape', description: 'Shape tool (U)' },
  { key: 'm', action: 'toolMarquee', description: 'Marquee tool (M)' },
  { key: 'l', action: 'toolLasso', description: 'Lasso tool (L)' },
  { key: 'w', action: 'toolMagicWand', description: 'Magic wand (W)' },
  { key: 'c', action: 'toolCrop', description: 'Crop tool (C)' },
  { key: 'i', action: 'toolEyedropper', description: 'Eyedropper (I)' },
  { key: 'g', action: 'toolGradient', description: 'Gradient tool (G)' },
  { key: 'j', action: 'toolHealing', description: 'Healing brush (J)' },
  { key: 'o', action: 'toolBlur', description: 'Blur tool (O)' },
  { key: 'r', action: 'toolRotate', description: 'Rotate view (R)' },
  { key: 'h', action: 'toolHand', description: 'Hand tool (H)' },
  { key: 'z', action: 'toolZoom', description: 'Zoom tool (Z)' },
  
  // Transform
  { key: 't', ctrl: true, action: 'freeTransform', description: 'Free transform (Ctrl+T)' },
  { key: 't', ctrl: true, shift: true, action: 'transformAgain', description: 'Transform again' },
  
  // Layers
  { key: 'j', ctrl: true, action: 'newLayer', description: 'New layer (Ctrl+J)' },
  { key: 'j', ctrl: true, shift: true, action: 'duplicateLayer', description: 'Duplicate layer (Ctrl+Shift+J)' },
  { key: 'g', ctrl: true, action: 'groupLayers', description: 'Group layers (Ctrl+G)' },
  { key: 'g', ctrl: true, shift: true, action: 'ungroupLayers', description: 'Ungroup layers' },
  { key: 'e', ctrl: true, shift: true, action: 'mergeLayers', description: 'Merge layers (Ctrl+Shift+E)' },
  { key: 'e', ctrl: true, alt: true, shift: true, action: 'mergeVisible', description: 'Merge visible (Ctrl+Alt+Shift+E)' },
  { key: ']', action: 'moveLayerUp', description: 'Move layer up (])' },
  { key: '[', action: 'moveLayerDown', description: 'Move layer down ([)' },
  { key: ']', shift: true, action: 'moveLayerTop', description: 'Move layer to top (Shift+])' },
  { key: '[', shift: true, action: 'moveLayerBottom', description: 'Move layer to bottom (Shift+[)' },
  
  // View
  { key: '+', ctrl: true, action: 'zoomIn', description: 'Zoom in (Ctrl+)' },
  { key: '-', ctrl: true, action: 'zoomOut', description: 'Zoom out (Ctrl+-)' },
  { key: '0', ctrl: true, action: 'zoomActual', description: 'Actual size (Ctrl+0)' },
  { key: '0', ctrl: true, shift: true, action: 'zoomFit', description: 'Fit on screen (Ctrl+Shift+0)' },
  { key: 'r', ctrl: true, action: 'toggleRulers', description: 'Toggle rulers (Ctrl+R)' },
  { key: 'h', ctrl: true, action: 'toggleGuides', description: 'Toggle guides (Ctrl+H)' },
  { key: ';', ctrl: true, action: 'toggleSnapping', description: 'Toggle snapping (Ctrl+;)' },
  { key: '\'', ctrl: true, shift: true, action: 'toggleGrid', description: 'Toggle grid (Ctrl+\')' },
  
  // Selection
  { key: 'i', ctrl: true, shift: true, action: 'invertSelection', description: 'Invert selection (Ctrl+Shift+I)' },
  { key: 'f', ctrl: true, shift: true, action: 'featherSelection', description: 'Feather selection (Ctrl+Shift+F)' },
  { key: 'a', ctrl: true, shift: true, action: 'expandSelection', description: 'Expand selection (Ctrl+Shift+A)' },
  { key: 's', ctrl: true, alt: true, action: 'contractSelection', description: 'Contract selection' },
  
  // Adjustments
  { key: 'l', ctrl: true, shift: true, action: 'adjustLevels', description: 'Levels (Ctrl+Shift+L)' },
  { key: 'm', ctrl: true, shift: true, action: 'adjustCurves', description: 'Curves (Ctrl+Shift+M)' },
  { key: 'u', ctrl: true, shift: true, action: 'adjustHueSat', description: 'Hue/Saturation (Ctrl+Shift+U)' },
  { key: 'b', ctrl: true, shift: true, action: 'adjustBrightness', description: 'Brightness/Contrast' },
  { key: 'i', ctrl: true, action: 'invertColors', description: 'Invert (Ctrl+I)' },
  
  // Masks
  { key: 'm', ctrl: true, alt: true, action: 'addLayerMask', description: 'Add layer mask' },
  { key: 'm', ctrl: true, alt: true, shift: true, action: 'deleteLayerMask', description: 'Delete layer mask' },
  { key: '\\', action: 'toggleMask', description: 'Toggle mask (\)' },
  
  // Colors
  { key: 'x', action: 'swapColors', description: 'Swap foreground/background (X)' },
  { key: 'd', action: 'defaultColors', description: 'Default colors (D)' },
];

// Check if shortcut matches event
export function matchShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
  if ((shortcut.ctrl || shortcut.meta) && !event.ctrlKey && !event.metaKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;
  return true;
}

// Get shortcuts for display
export function getShortcutsForAction(action: string): Shortcut[] {
  return DEFAULT_SHORTCUTS.filter(s => s.action === action);
}

export function getAllShortcuts(): Shortcut[] {
  return DEFAULT_SHORTCUTS;
}

// ============= REACT HOOKS =============

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  handlers: Record<string, () => void>,
  context: string = 'global'
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't intercept input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      for (const shortcut of shortcuts) {
        if (shortcut.context && shortcut.context !== context && shortcut.context !== 'global') continue;
        
        if (matchShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          
          const handler = handlers[shortcut.action];
          if (handler) {
            handler();
          }
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, handlers, context]);
}

// ============= UNDO/REDO HOOK =============

export function useHistory(initialDoc: Document) {
  const historyRef = useRef(createHistoryManager(initialDoc));
  const docRef = useRef(initialDoc);
  
  const push = useCallback((action: HistoryAction) => {
    historyRef.current = pushHistory(historyRef.current, action);
  }, []);
  
  const doUndo = useCallback(() => {
    const { state, action } = undo(historyRef.current);
    historyRef.current = state;
    return action;
  }, []);
  
  const doRedo = useCallback(() => {
    const { state, action } = redo(historyRef.current);
    historyRef.current = state;
    return action;
  }, []);
  
  const canUndo = useCallback(() => undo(historyRef.current).action !== null, []);
  const canRedo = useCallback(() => redo(historyRef.current).action !== null, []);
  
  return { push, undo: doUndo, redo: doRedo, canUndo, canRedo, history: historyRef.current };
}