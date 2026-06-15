/**
 * Stratum Tool Options Panel - Simplified
 */

import React from 'react';
import { useStore } from '../../core/state/store';
import { getToolRegistry, type ToolOptionDef } from '../../core/tools/ToolRegistry';

export const ToolOptionsPanel: React.FC = () => {
  const state = useStore();
  const toolRegistry = getToolRegistry();
  
  const activeTool = toolRegistry.getTool(state.activeTool);
  
  if (!activeTool) {
    return (
      <div style={{ padding: 16, color: '#888', fontSize: 13, textAlign: 'center' }}>
        No tool selected
      </div>
    );
  }

  return (
    <div style={{ width: 280, background: '#2a2a2a', borderLeft: '1px solid #444', overflow: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>{activeTool.icon}</span>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 600 }}>{activeTool.name}</h3>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 11 }}>{activeTool.shortcut && `Shortcut: ${activeTool.shortcut}`}</p>
        </div>
      </div>
      
      {activeTool.description && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #444', color: '#aaa', fontSize: 12, lineHeight: 1.5 }}>
          {activeTool.description}
        </div>
      )}
      
      {activeTool.options && activeTool.options.length > 0 && (
        <div style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Options</h4>
          {activeTool.options.map((option: ToolOptionDef) => (
            <div key={option.id} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#ccc', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>
                {option.label}
              </label>
              {option.type === 'slider' && (
                <input type="range" min={option.min} max={option.max} step={option.step || 1} defaultValue={option.default} style={{ width: '100%', accentColor: '#007acc' }} />
              )}
              {option.type === 'checkbox' && (
                <input type="checkbox" defaultChecked={option.default} style={{ accentColor: '#007acc' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolOptionsPanel;
