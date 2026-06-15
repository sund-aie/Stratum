import React, { useState, useEffect, useRef } from 'react';
import { getStore, useDispatch, useStore } from './core/state/store';
import type { Document } from './types';
import { initializeCanvasEngine } from './core/engine/CanvasEngine';
import { Toolbar } from './components/tools/Toolbar';
import { ToolOptionsPanel } from './components/tools/ToolOptionsPanel';
import { LayersPanel } from './components/panels/LayersPanel';

// Main App Component
function App() {
  const dispatch = useDispatch();
  const state = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasEngine, setCanvasEngine] = useState<any>(null);
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

  useEffect(() => {
    if (canvasRef.current && initialized) {
      const engine = initializeCanvasEngine(canvasRef.current);
      setCanvasEngine(engine);
      
      // Register tools from registry
      import('./core/tools/ToolRegistry').then(({ getToolRegistry }) => {
        const registry = getToolRegistry();
        const allTools = registry.getAllTools();
        dispatch({ type: 'REGISTER_TOOLS', payload: allTools });
        
        // Set initial tool
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'move' });
      });
    }
  }, [canvasRef, initialized, dispatch]);

  useEffect(() => {
    if (canvasEngine && state.document) {
      canvasEngine.render(state.document);
    }
  }, [canvasEngine, state.document, state.viewport, state.selection, state.activeTool]);

  if (!initialized) {
    return (
      <div style={{ 
        background: '#1e1e1e', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Stratum</h1>
          <p style={{ color: '#888' }}>Loading creative suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#1e1e1e',
      overflow: 'hidden',
    }}>
      {/* Left Toolbar */}
      <Toolbar orientation="vertical" compact={false} />
      
      {/* Center Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top menu bar placeholder */}
        <div style={{
          height: 40,
          background: '#2a2a2a',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 24,
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Stratum</span>
          {['File', 'Edit', 'Image', 'Layer', 'Type', 'Select', 'Filter', 'View', 'Window', 'Help'].map(menu => (
            <button
              key={menu}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ccc',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {menu}
            </button>
          ))}
        </div>
        
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
          
          {/* Zoom indicator */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: '#2a2a2a',
            padding: '8px 12px',
            borderRadius: 4,
            color: '#fff',
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {Math.round((state.viewport.zoom || 1) * 100)}%
          </div>
          
          {/* Active tool indicator */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            background: '#2a2a2a',
            padding: '8px 12px',
            borderRadius: 4,
            color: '#fff',
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>{state.tools.find(t => t.id === state.activeTool)?.icon || '🔧'}</span>
            <span>{state.tools.find(t => t.id === state.activeTool)?.name || state.activeTool}</span>
          </div>
        </div>
      </div>
      
      {/* Right Panels */}
      <ToolOptionsPanel />
      <LayersPanel />
    </div>
  );
}

export default App;
