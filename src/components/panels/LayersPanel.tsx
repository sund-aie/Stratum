/**
 * Stratum Layers Panel
 * Advanced layer management with support for raster, vector, and adjustment layers
 */

import React from 'react';
import { useStore, useDispatch } from '../../core/state/store';
import type { Layer, RasterLayer, VectorLayer, AdjustmentLayer } from '../../types';

export const LayersPanel: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [filterText, setFilterText] = React.useState('');
  const [showAllTypes, setShowAllTypes] = React.useState(true);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);

  const layerTypeIcons: Record<string, string> = {
    raster: '🖼',
    vector: '✒',
    adjustment: '⚙',
    group: '📁',
  };

  const blendModes = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ];

  const handleAddLayer = (type: Layer['type'] = 'raster') => {
    const baseLayer = {
      id: `layer-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${state.document?.layers.length || 0}`,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal' as const,
      order: state.document?.layers.length || 0,
    };

    let newLayer: Layer;
    
    if (type === 'raster') {
      newLayer = {
        ...baseLayer,
        type: 'raster',
        width: 800,
        height: 600,
      } as RasterLayer;
    } else if (type === 'vector') {
      newLayer = {
        ...baseLayer,
        type: 'vector',
        paths: [],
      } as VectorLayer;
    } else {
      newLayer = {
        ...baseLayer,
        type: 'adjustment',
        adjustments: [],
      } as AdjustmentLayer;
    }

    dispatch({ type: 'ADD_LAYER', payload: newLayer });
  };

  const handleDeleteLayer = (layerId: string) => {
    dispatch({ type: 'REMOVE_LAYER', payload: layerId });
  };

  const handleDuplicateLayer = (layer: Layer) => {
    const duplicatedLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      name: `${layer.name} copy`,
      order: (state.document?.layers.length || 0),
    };
    dispatch({ type: 'ADD_LAYER', payload: duplicatedLayer });
  };

  const toggleVisibility = (layerId: string, current: boolean) => {
    dispatch({
      type: 'UPDATE_LAYER',
      payload: { id: layerId, changes: { visible: !current } }
    });
  };

  const toggleLock = (layerId: string, current: boolean) => {
    dispatch({
      type: 'UPDATE_LAYER',
      payload: { id: layerId, changes: { locked: !current } }
    });
  };

  const updateOpacity = (layerId: string, opacity: number) => {
    dispatch({
      type: 'UPDATE_LAYER',
      payload: { id: layerId, changes: { opacity } }
    });
  };

  const updateBlendMode = (layerId: string, blendMode: string) => {
    dispatch({
      type: 'UPDATE_LAYER',
      payload: { id: layerId, changes: { blendMode: blendMode as any } }
    });
  };

  const filteredLayers = React.useMemo(() => {
    if (!state.document?.layers) return [];
    
    return state.document.layers.filter(layer => {
      const matchesFilter = layer.name.toLowerCase().includes(filterText.toLowerCase());
      const matchesType = showAllTypes || layer.type === 'raster';
      return matchesFilter && matchesType;
    }).sort((a, b) => b.order - a.order);
  }, [state.document?.layers, filterText, showAllTypes]);

  return (
    <div style={{
      width: 280,
      background: '#2a2a2a',
      borderLeft: '1px solid #444',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 600 }}>Layers</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => handleAddLayer('raster')}
            title="New Raster Layer"
            style={{
              padding: '4px 8px',
              background: '#007acc',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            📄
          </button>
          <button
            onClick={() => handleAddLayer('vector')}
            title="New Vector Layer"
            style={{
              padding: '4px 8px',
              background: '#333',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✒
          </button>
          <button
            onClick={() => handleAddLayer('adjustment')}
            title="New Adjustment Layer"
            style={{
              padding: '4px 8px',
              background: '#333',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Filter and options */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #444',
        display: 'flex',
        gap: 8,
      }}>
        <input
          type="text"
          placeholder="Filter layers..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#888',
          fontSize: 11,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showAllTypes}
            onChange={(e) => setShowAllTypes(e.target.checked)}
          />
          All types
        </label>
      </div>

      {/* Layer list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredLayers.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 13,
          }}>
            {filterText ? 'No matching layers' : 'No layers yet'}
            {!filterText && (
              <div style={{ marginTop: 8 }}>
                Click + to add a layer
              </div>
            )}
          </div>
        ) : (
          filteredLayers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                background: selectedLayerId === layer.id ? '#3a3a3a' : '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (selectedLayerId !== layer.id) {
                  e.currentTarget.style.background = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedLayerId !== layer.id) {
                  e.currentTarget.style.background = '#2a2a2a';
                }
              }}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer.id, layer.visible);
                }}
                style={{
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'transparent',
                  color: layer.visible ? '#fff' : '#444',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {layer.visible ? '👁' : '○'}
              </button>

              {/* Layer type icon */}
              <span style={{ fontSize: 14 }}>{layerTypeIcons[layer.type]}</span>

              {/* Layer name */}
              <span style={{
                flex: 1,
                color: '#fff',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {layer.name}
              </span>

              {/* Lock toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLock(layer.id, layer.locked);
                }}
                style={{
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'transparent',
                  color: layer.locked ? '#ff6b6b' : '#444',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🔒
              </button>

              {/* Opacity slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={layer.opacity * 100}
                onChange={(e) => {
                  e.stopPropagation();
                  updateOpacity(layer.id, parseInt(e.target.value) / 100);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 50,
                  accentColor: '#007acc',
                }}
                title={`Opacity: ${(layer.opacity * 100).toFixed(0)}%`}
              />

              {/* Blend mode dropdown */}
              <select
                value={layer.blendMode}
                onChange={(e) => {
                  e.stopPropagation();
                  updateBlendMode(layer.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '2px 4px',
                  background: '#333',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 10,
                  outline: 'none',
                  maxWidth: 80,
                }}
              >
                {blendModes.map(mode => (
                  <option key={mode} value={mode}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {/* Footer with layer count */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #444',
        background: '#252525',
        color: '#666',
        fontSize: 11,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{filteredLayers.length} layer{filteredLayers.length !== 1 ? 's' : ''}</span>
        <span>{state.document?.layers.filter(l => l.visible).length} visible</span>
      </div>
    </div>
  );
};

export default LayersPanel;
