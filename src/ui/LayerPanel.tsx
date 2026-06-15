/**
 * Unified Canvas - Layer Panel Component
 * Layer management: add, remove, reorder, visibility, opacity, blend modes, masks, groups
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Layer, LayerType, BlendMode } from '../types';
import { BLEND_MODES } from '../constants';
import './LayerPanel.css';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (layerId: string | null) => void;
  onLayerAdd: (type?: LayerType, parentId?: string) => void;
  onLayerRemove: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerReorder: (layerId: string, newIndex: number) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerBlendModeChange: (layerId: string, blendMode: BlendMode) => void;
  onLayerNameChange: (layerId: string, name: string) => void;
  onLayerAddMask: (layerId: string) => void;
  onLayerRemoveMask: (layerId: string) => void;
  onLayerToggleMask: (layerId: string) => void;
  onLayerGroup: (layerIds: string[]) => void;
  onLayerUngroup: (layerId: string) => void;
  disabled?: boolean;
}

const layerTypeIcons: Record<LayerType, string> = {
  raster: '🖼',
  vector: '✒️',
  text: 'T',
  adjustment: '☀',
  group: '📁',
};

const blendModeLabels: Record<BlendMode, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity',
};

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerAdd,
  onLayerRemove,
  onLayerDuplicate,
  onLayerReorder,
  onLayerToggleVisibility,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerNameChange,
  onLayerAddMask,
  onLayerRemoveMask,
  onLayerToggleMask,
  onLayerGroup,
  onLayerUngroup,
  disabled = false,
}) => {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | 'inside'>('before');

  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    if (disabled) return;
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    if (disabled || draggedLayerId === layerId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.25) {
      setDragPosition('before');
    } else if (y > height * 0.75) {
      setDragPosition('after');
    } else {
      setDragPosition('inside');
    }
    setDragOverLayerId(layerId);
  }, [disabled, draggedLayerId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverLayerId(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    if (disabled || !draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }
    e.preventDefault();

    const sourceIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetLayerId);
    
    let newIndex = targetIndex;
    if (dragPosition === 'after') newIndex = targetIndex + 1;
    else if (dragPosition === 'before') newIndex = targetIndex;
    // 'inside' would require group handling

    // Adjust for removal of source
    if (sourceIndex < newIndex) newIndex--;

    onLayerReorder(draggedLayerId, newIndex);
    
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, [disabled, draggedLayerId, layers, dragPosition, onLayerReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  }, []);

  const startEditingName = useCallback((layer: Layer) => {
    if (disabled) return;
    setEditingNameId(layer.id);
    setEditName(layer.name);
  }, [disabled]);

  const finishEditingName = useCallback(() => {
    if (editingNameId && editName.trim()) {
      onLayerNameChange(editingNameId, editName.trim());
    }
    setEditingNameId(null);
  }, [editingNameId, editName, onLayerNameChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, layerId: string) => {
    if (e.key === 'Enter') {
      finishEditingName();
    } else if (e.key === 'Escape') {
      setEditingNameId(null);
    }
  }, [finishEditingName]);

  // Build layer tree with groups
  const layerTree = useMemo(() => {
    const rootLayers = layers.filter(l => !l.parentId);
    const childrenMap = new Map<string, Layer[]>();
    
    for (const layer of layers) {
      if (layer.parentId) {
        if (!childrenMap.has(layer.parentId)) {
          childrenMap.set(layer.parentId, []);
        }
        childrenMap.get(layer.parentId)!.push(layer);
      }
    }

    const buildTree = (layer: Layer, depth: number = 0) => ({
      layer,
      depth,
      children: (childrenMap.get(layer.id) || []).sort((a, b) => a.order - b.order).map(c => buildTree(c, depth + 1)),
      hasChildren: childrenMap.has(layer.id) && childrenMap.get(layer.id)!.length > 0,
    });

    return rootLayers.sort((a, b) => a.order - b.order).map(l => buildTree(l));
  }, [layers]);

  const renderLayerNode = (node: ReturnType<typeof buildTree>[0], index: number) => {
    const { layer, depth, children, hasChildren } = node;
    const isActive = activeLayerId === layer.id;
    const isDragged = draggedLayerId === layer.id;
    const isDragOver = dragOverLayerId === layer.id;

    return (
      <div key={layer.id} className="layer-panel-node">
        <div
          className={`layer-panel-row ${isActive ? 'active' : ''} ${isDragged ? 'dragging' : ''} ${isDragOver ? `drag-over-${dragPosition}` : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, layer.id)}
          onDragOver={(e) => handleDragOver(e, layer.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, layer.id)}
          onDragEnd={handleDragEnd}
          onClick={() => onLayerSelect(layer.id)}
          onDoubleClick={() => layer.type !== 'group' && startEditingName(layer)}
          onContextMenu={(e) => { e.preventDefault(); showContextMenu(e, layer); }}
        >
          {/* Visibility */}
          <button
            className="layer-visibility"
            onClick={(e) => { e.stopPropagation(); onLayerToggleVisibility(layer.id); }}
            aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
            aria-pressed={layer.visible}
          >
            {layer.visible ? '👁' : '👁‍🗨'}
          </button>

          {/* Expand/collapse for groups */}
          {hasChildren && (
            <button
              className="layer-expand"
              onClick={(e) => { e.stopPropagation();-toggleGroup(layer.id); }}
              aria-expanded={expandedGroups.includes(layer.id)}
            >
              {expandedGroups.includes(layer.id) ? '▼' : '▶'}
            </button>
          )}

          {/* Thumbnail */}
          <div className="layer-thumbnail" style={{ background: getLayerThumbnail(layer) }}>
            {layer.type === 'adjustment' && layer.adjustment && (
              <span className="adjustment-badge">{ADJUSTMENT_ICONS[layer.adjustment.type]}</span>
            )}
          </div>

          {/* Name */}
          <div className="layer-name-wrapper" style={{ flex: 1 }}>
            {editingNameId === layer.id ? (
              <input
                type="text"
                className="layer-name-edit"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={finishEditingName}
                onKeyDown={(e) => handleKeyDown(e, layer.id)}
                autoFocus
              />
            ) : (
              <span className="layer-name" title={layer.name}>
                {layerTypeIcons[layer.type]} {layer.name}
              </span>
            )}
          </div>

          {/* Opacity */}
          <input
            type="range"
            className="layer-opacity"
            min="0"
            max="100"
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => { e.stopPropagation(); onLayerOpacityChange(layer.id, parseInt(e.target.value) / 100); }}
            aria-label="Layer opacity"
          />

          {/* Blend mode */}
          <select
            className="layer-blend-mode"
            value={layer.blendMode}
            onChange={(e) => { e.stopPropagation(); onLayerBlendModeChange(layer.id, e.target.value as BlendMode); }}
            aria-label="Blend mode"
          >
            {BLEND_MODES.map(mode => (
              <option key={mode} value={mode}>{blendModeLabels[mode]}</option>
            ))}
          </select>

          {/* Mask indicator */}
          {layer.mask && (
            <button
              className={`layer-mask ${layer.maskEnabled ? '' : 'disabled'}`}
              onClick={(e) => { e.stopPropagation(); onLayerToggleMask(layer.id); }}
              aria-label={layer.maskEnabled ? 'Disable mask' : 'Enable mask'}
            >
              🎭
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && expandedGroups.includes(layer.id) && (
          <div className="layer-children">
            {children.map((child, i) => renderLayerNode(child, i))}
          </div>
        )}
      </div>
    );
  };

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const ADJUSTMENT_ICONS: Record<string, string> = {
    'brightness-contrast': '☀',
    'curves': '⤴',
    'levels': '▮',
    'hsl': '🎨',
    'exposure': '📷',
    'vibrance': '✨',
    'color-balance': '⚖',
  };

  const getLayerThumbnail = (layer: Layer): string => {
    if (layer.type === 'raster' && layer.data.canvas) {
      return `url(${layer.data.canvas.toDataURL()})`;
    }
    if (layer.data.imageData) {
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(layer.data.imageData, 0, 0);
      return `url(${canvas.toDataURL()})`;
    }
    if (layer.type === 'adjustment') return 'linear-gradient(45deg, #444 25%, #555 25%, #555 50%, #444 50%, #444 75%, #555 75%, #555)';
    return 'transparent';
  };

  const showContextMenu = (e: React.MouseEvent, layer: Layer) => {
    e.preventDefault();
    // Context menu would be implemented here
  };

  return (
    <div className="layer-panel" role="region" aria-label="Layers">
      <div className="layer-panel-header">
        <h3>Layers</h3>
        <div className="layer-panel-actions">
          <button
            type="button"
            className="layer-btn"
            onClick={() => onLayerAdd('raster')}
            title="New Layer (Ctrl+J)"
            disabled={disabled}
            aria-label="New layer"
          >
            +
          </button>
          <button
            type="button"
            className="layer-btn"
            onClick={() => onLayerAdd('adjustment')}
            title="New Adjustment Layer"
            disabled={disabled}
            aria-label="New adjustment layer"
          >
            ☀
          </button>
          <button
            type="button"
            className="layer-btn"
            onClick={() => {
              const selected = layers.find(l => l.id === activeLayerId);
              if (selected) onLayerRemove(selected.id);
            }}
            title="Delete Layer (Delete)"
            disabled={disabled || !activeLayerId}
            aria-label="Delete layer"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="layer-panel-content">
        {layerTree.length === 0 ? (
          <div className="layer-panel-empty">No layers. Click + to add.</div>
        ) : (
          layerTree.map((node, i) => renderLayerNode(node, i))
        )}
      </div>
    </div>
  );
};

function buildTree(layer: Layer, depth: number, childrenMap: Map<string, Layer[]>): ReturnType<typeof buildTree> {
  return {
    layer,
    depth,
    children: (childrenMap.get(layer.id) || []).sort((a, b) => a.order - b.order).map(c => buildTree(c, depth + 1, childrenMap)),
    hasChildren: (childrenMap.get(layer.id) || []).length > 0,
  };
}

export default LayerPanel;