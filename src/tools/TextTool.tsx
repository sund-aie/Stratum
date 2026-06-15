/**
 * Unified Canvas - Text Tool
 * Text editing with path conversion, formatting, font management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Layer, Point, TextData, FontMetrics } from '../types';
import { createTextLayer, updateTextLayer, textLayerToPath } from '../utils/textLayer';

// Default fonts available in browser
export const SYSTEM_FONTS = [
  { family: 'Inter, system-ui, sans-serif', name: 'Inter', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', name: 'System UI', weights: [400, 500, 600, 700] },
  { family: 'Georgia, serif', name: 'Georgia', weights: [400, 700] },
  { family: '"Times New Roman", Times, serif', name: 'Times New Roman', weights: [400, 700] },
  { family: 'Arial, Helvetica, sans-serif', name: 'Arial', weights: [400, 700] },
  { family: 'Verdana, Geneva, sans-serif', name: 'Verdana', weights: [400, 700] },
  { family: '"Courier New", Courier, monospace', name: 'Courier New', weights: [400, 700] },
  { family: '"Helvetica Neue", Helvetica, Arial, sans-serif', name: 'Helvetica Neue', weights: [200, 300, 400, 500, 600, 700, 800] },
];

export function useTextTool(
  document: any,
  activeLayerId: string | null,
  setActiveLayerId: (id: string | null) => void,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  addLayer: (layer: Layer, parentId?: string) => string,
  history: { push: (action: any) => void }
) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Start editing existing text layer
  const startEditing = useCallback((layerId: string) => {
    const layer = document.layers.find((l: Layer) => l.id === layerId);
    if (layer && layer.type === 'text') {
      setEditingLayerId(layerId);
      setIsEditing(true);
      setCursorPosition(layer.textData?.text.length || 0);
    }
  }, [document.layers]);
  
  // Create new text layer at position
  const createText = useCallback((x: number, y: number) => {
    const newLayer = createTextLayer(x, y, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      fontWeight: '400',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
    });
    const id = addLayer(newLayer);
    setEditingLayerId(id);
    setIsEditing(true);
    setCursorPosition(0);
    history.push({ type: 'addLayer', layerId: id });
    return id;
  }, [addLayer, history]);
  
  // Handle text input
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editingLayerId) return;
    
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    updateLayer(editingLayerId, {
      textData: { text: newText },
    });
    setCursorPosition(cursorPos);
  }, [editingLayerId, updateLayer]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    }
    if (e.key === 'Escape') {
      cancelEditing();
    }
  }, []);
  
  // Finish editing (commit)
  const finishEditing = useCallback(() => {
    if (editingLayerId) {
      // Convert to path if needed
      const layer = document.layers.find((l: Layer) => l.id === editingLayerId);
      if (layer && layer.textData && layer.textData.text.trim() === '') {
        // Empty text - remove layer
        // history.push({ type: 'deleteLayer', layerId: editingLayerId });
      }
      setIsEditing(false);
      setEditingLayerId(null);
      setCursorPosition(0);
      setSelection(null);
    }
  }, [editingLayerId, document.layers]);
  
  // Cancel editing
  const cancelEditing = useCallback(() => {
    if (editingLayerId) {
      // Could restore previous text
      setIsEditing(false);
      setEditingLayerId(null);
      setCursorPosition(0);
      setSelection(null);
    }
  }, [editingLayerId]);
  
  // Format text (bold, italic, etc.)
  const formatText = useCallback((property: keyof TextData, value: any) => {
    if (!editingLayerId) return;
    
    updateLayer(editingLayerId, {
      textData: { [property]: value },
    });
  }, [editingLayerId, updateLayer]);
  
  // Convert text to vector path
  const convertToShape = useCallback(() => {
    if (!editingLayerId) return;
    
    const layer = document.layers.find((l: Layer) => l.id === editingLayerId);
    if (!layer || !layer.textData) return;
    
    const paths = textLayerToPath(layer.textData, layer.transform);
    
    updateLayer(editingLayerId, {
      type: 'vector',
      vectorData: { paths, compoundPath: false },
      textData: undefined,
    });
    
    setIsEditing(false);
    setEditingLayerId(null);
    history.push({ type: 'convertTextToShape', layerId: editingLayerId });
  }, [editingLayerId, document.layers, updateLayer, history]);
  
  // Render text editor overlay
  const renderEditor = useCallback(() => {
    if (!isEditing || !editingLayerId || !containerRef.current) return null;
    
    const layer = document.layers.find((l: Layer) => l.id === editingLayerId);
    if (!layer || !layer.textData) return null;
    
    const style: React.CSSProperties = {
      position: 'absolute',
      left: layer.transform.x + 'px',
      top: layer.transform.y + 'px',
      transform: `rotate(${layer.transform.rotation}rad) scale(${layer.transform.scaleX}, ${layer.transform.scaleY})`,
      transformOrigin: `${layer.transform.originX}px ${layer.transform.originY}px`,
      fontFamily: layer.textData.fontFamily,
      fontSize: layer.textData.fontSize + 'px',
      fontWeight: layer.textData.fontWeight,
      fontStyle: layer.textData.fontStyle,
      color: layer.textData.color,
      lineHeight: layer.textData.lineHeight,
      letterSpacing: layer.textData.letterSpacing + 'px',
      textAlign: layer.textData.textAlign,
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      outline: 'none',
      background: 'transparent',
      border: '1px dashed #0066ff',
      padding: '2px',
      minWidth: '100px',
      minHeight: '24px',
      zIndex: 1000,
      pointerEvents: 'auto',
    };
    
    return (
      <div ref={containerRef} style={style}>
        <textarea
          ref={textareaRef}
          value={layer.textData.text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={finishEditing}
          autoFocus
          spellCheck={false}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '24px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            font: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
          }}
        />
      </div>
    );
  }, [isEditing, editingLayerId, document.layers, handleInput, handleKeyDown, finishEditing]);
  
  return {
    isEditing,
    editingLayerId,
    cursorPosition,
    selection,
    startEditing,
    createText,
    finishEditing,
    cancelEditing,
    formatText,
    convertToShape,
    renderEditor,
    textareaRef,
    containerRef,
  };
}

// Text layer utilities
export function createTextLayer(
  x: number, 
  y: number, 
  textData: Partial<TextData>
): Layer {
  return {
    id: crypto.randomUUID(),
    name: 'Text Layer',
    type: 'text',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    zIndex: Date.now(),
    transform: {
      x, y,
      scaleX: 1, scaleY: 1,
      rotation: 0,
      originX: 0, originY: 0,
      flipX: false, flipY: false,
    },
    textData: {
      text: '',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      fontWeight: '400',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      ...textData,
    },
  };
}

export function updateTextLayer(layer: Layer, updates: Partial<TextData>): Layer {
  if (!layer.textData) return layer;
  
  return {
    ...layer,
    textData: { ...layer.textData, ...updates },
  };
}

export function textLayerToPath(textData: TextData, transform: any): PathSegment[][] {
  // Simplified - would use canvas measureText and path construction
  // For now, return empty array
  return [];
}

interface PathSegment {
  type: 'line' | 'curve' | 'quadratic';
  point: Point;
  cp1?: Point;
  cp2?: Point;
}