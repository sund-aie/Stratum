import React, { useState, useEffect } from 'react';
import { getStore, useDispatch, useStore } from './core/state/store';
import type { Document, Artboard, RasterLayer } from './types';

// Simple Canvas Component
function Canvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const state = useStore();
  const dispatch = useDispatch();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw artboard
    if (state.document?.artboards[0]) {
      const artboard = state.document.artboards[0];
      ctx.fillStyle = artboard.backgroundColor 
        ? `rgba(${artboard.backgroundColor.r}, ${artboard.backgroundColor.g}, ${artboard.backgroundColor.b}, ${artboard.backgroundColor.a})`
        : '#ffffff';
      ctx.fillRect(artboard.x, artboard.y, artboard.width, artboard.height);
    }

    // Render layers
    if (state.document?.layers) {
      state.document.layers.forEach((layer) => {
        if (layer.type === 'raster' && layer.pixelData) {
          ctx.putImageData(layer.pixelData, 0, 0);
        }
      });
    }
  }, [state.document]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
      />
    </div>
  );
}

// Toolbar Component
function Toolbar() {
  const state = useStore();
  const dispatch = useDispatch();

  const tools = [
    { id: 'move', icon: '✥', name: 'Move (V)' },
    { id: 'select', icon: '◫', name: 'Select (M)' },
    { id: 'lasso', icon: '⊂', name: 'Lasso (L)' },
    { id: 'crop', icon: '⌗', name: 'Crop (C)' },
    { id: 'brush', icon: '🖌', name: 'Brush (B)' },
    { id: 'pen', icon: '✒', name: 'Pen (P)' },
    { id: 'text', icon: 'T', name: 'Text (T)' },
    { id: 'gradient', icon: '▤', name: 'Gradient (G)' },
  ];

  return (
    <div style={{
      width: 50,
      background: '#333',
      borderRight: '1px solid #444',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 0'
    }}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id })}
          title={tool.name}
          style={{
            width: 36,
            height: 36,
            margin: '2px 0',
            border: 'none',
            borderRadius: 4,
            background: state.activeTool === tool.id ? '#555' : 'transparent',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

// Layer Panel Component
function LayerPanel() {
  const state = useStore();
  const dispatch = useDispatch();

  const addLayer = () => {
    const newLayer: RasterLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${state.document?.layers.length || 0}`,
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      order: state.document?.layers.length || 0,
      width: 800,
      height: 600,
    };
    dispatch({ type: 'ADD_LAYER', payload: newLayer });
  };

  return (
    <div style={{
      width: 250,
      background: '#2a2a2a',
      borderLeft: '1px solid #444',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: 12,
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#fff', fontWeight: 600 }}>Layers</span>
        <button
          onClick={addLayer}
          style={{
            background: '#007acc',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          + New
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {state.document?.layers.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
            No layers yet
          </div>
        ) : (
          state.document?.layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                padding: 8,
                borderBottom: '1px solid #333',
                background: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER',
                  payload: { id: layer.id, changes: { visible: e.target.checked } }
                })}
              />
              <span style={{ color: '#fff', fontSize: 13 }}>{layer.name}</span>
              <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>
                {layer.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Properties Panel Component  
function PropertiesPanel() {
  const state = useStore();

  return (
    <div style={{
      width: 250,
      background: '#2a2a2a',
      borderLeft: '1px solid #444',
      padding: 12
    }}>
      <h3 style={{ color: '#fff', marginBottom: 12, fontSize: 14 }}>Properties</h3>
      {state.selection ? (
        <div style={{ color: '#ccc', fontSize: 13 }}>
          <p>Selection Active</p>
          <p>X: {state.selection.bounds?.x || 0}</p>
          <p>Y: {state.selection.bounds?.y || 0}</p>
          <p>W: {state.selection.bounds?.width || 0}</p>
          <p>H: {state.selection.bounds?.height || 0}</p>
        </div>
      ) : (
        <div style={{ color: '#666', fontSize: 13 }}>
          No selection
        </div>
      )}
    </div>
  );
}

// Main App Component
function App() {
  const dispatch = useDispatch();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize with a default document
    const doc: Document = {
      id: 'doc-1',
      name: 'Untitled',
      artboards: [{
        id: 'artboard-1',
        name: 'Artboard 1',
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        backgroundColor: { r: 255, g: 255, b: 255, a: 1 },
        locked: false,
      }],
      activeArtboardId: 'artboard-1',
      layers: [],
      history: [],
      historyIndex: -1,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        version: '1.0.0',
        colorProfile: 'sRGB',
        bitsPerChannel: 8,
      },
    };

    dispatch({ type: 'SET_DOCUMENT', payload: doc });
    setInitialized(true);
  }, [dispatch]);

  if (!initialized) {
    return <div style={{ background: '#1e1e1e', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Loading...
    </div>;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#1e1e1e',
      overflow: 'hidden'
    }}>
      <Toolbar />
      <Canvas />
      <PropertiesPanel />
      <LayerPanel />
    </div>
  );
}

export default App;
