/**
 * Stratum Toolbar Component
 * Complete tool palette with all Photoshop, Illustrator, and Lightroom tools
 */

import React from 'react';
import { useStore, useDispatch } from '../../core/state/store';
import { getToolRegistry, type ToolCategory } from '../../core/tools/ToolRegistry';

interface ToolbarProps {
  orientation?: 'vertical' | 'horizontal';
  compact?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  orientation = 'vertical', 
  compact = false 
}) => {
  const state = useStore();
  const dispatch = useDispatch();
  const toolRegistry = getToolRegistry();
  
  const categories: ToolCategory[] = ['select', 'crop', 'retouch', 'paint', 'draw', 'vector', 'type', 'navigate'];
  const categoryIcons: Record<ToolCategory, string> = {
    select: '↖',
    crop: '⌗',
    retouch: '✦',
    paint: '🖌',
    draw: '○',
    vector: '✒',
    type: 'T',
    navigate: '✋',
  };

  const [expandedCategory, setExpandedCategory] = React.useState<ToolCategory | null>('select');

  const handleToolSelect = (toolId: string) => {
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId });
  };

  const toggleCategory = (category: ToolCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const containerStyle: React.CSSProperties = {
    background: '#2a2a2a',
    borderRight: orientation === 'vertical' ? '1px solid #444' : undefined,
    borderBottom: orientation === 'horizontal' ? '1px solid #444' : undefined,
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    alignItems: 'stretch',
    overflow: 'auto',
  };

  if (compact) {
    // Compact mode - show only active tool from each category
    return (
      <div style={{ ...containerStyle, width: 50, padding: '4px 0' }}>
        {categories.map((category) => {
          const tools = toolRegistry.getToolsByCategory(category);
          const activeTool = tools.find(t => t.id === state.activeTool);
          const tool = activeTool || tools[0];
          
          if (!tool) return null;
          
          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
              style={{
                width: 42,
                height: 42,
                margin: '2px 4px',
                border: 'none',
                borderRadius: 4,
                background: state.activeTool === tool.id ? '#007acc' : 'transparent',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>
    );
  }

  // Full mode - expandable categories
  return (
    <div style={{ ...containerStyle, width: 280, padding: '8px 0' }}>
      {categories.map((category) => {
        const tools = toolRegistry.getToolsByCategory(category);
        const isExpanded = expandedCategory === category;
        
        return (
          <div key={category} style={{ marginBottom: 8 }}>
            <button
              onClick={() => toggleCategory(category)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: isExpanded ? '#3a3a3a' : 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <span style={{ fontSize: 14 }}>{categoryIcons[category]}</span>
              <span>{category}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
            
            {isExpanded && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 2,
                padding: '4px 8px',
                background: '#252525',
                borderRadius: 4,
                marginTop: 4,
              }}>
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    title={`${tool.name}\n${tool.description}\nShortcut: ${tool.shortcut}`}
                    style={{
                      aspectRatio: '1',
                      border: 'none',
                      borderRadius: 4,
                      background: state.activeTool === tool.id ? '#007acc' : '#333',
                      color: '#fff',
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.zIndex = '10';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '1';
                    }}
                  >
                    {tool.icon}
                    {state.activeTool === tool.id && (
                      <div style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        width: 6,
                        height: 6,
                        background: '#00ff00',
                        borderRadius: '50%',
                      }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Tool count summary */}
      <div style={{
        padding: '12px',
        marginTop: 'auto',
        borderTop: '1px solid #444',
        color: '#888',
        fontSize: 11,
        textAlign: 'center',
      }}>
        {toolRegistry.getAllTools().length} tools available
      </div>
    </div>
  );
};

export default Toolbar;
