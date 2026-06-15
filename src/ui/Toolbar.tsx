/**
 * Unified Canvas - Toolbar Component
 * Main tool selection panel with grouped tools
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { ToolType, ToolOptions } from '../types';
import { TOOL_GROUPS, TOOL_CURSORS, KEYBOARD_SHORTCUTS } from '../constants';
import './Toolbar.css';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  toolOptions: ToolOptions;
  onToolOptionsChange: (options: Partial<ToolOptions>) => void;
  disabled?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  toolOptions,
  onToolOptionsChange,
  disabled = false,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['selection', 'retouch', 'pen', 'shape', 'navigation']);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  }, []);

  const getToolIcon = (tool: ToolType): string => {
    const icons: Record<ToolType, string> = {
      'select': '▢', 'move': '⤢',
      'marquee-rect': '⬜', 'marquee-ellipse': '⭘',
      'marquee-single-row': '━━', 'marquee-single-col': '┃┃',
      'lasso': '⭘', 'lasso-polygon': '⬟', 'lasso-magnetic': '🧲',
      'magic-wand': '✨', 'object-select': '🎯',
      'crop': '⤢', 'slice': '⧈', 'slice-select': '⧉',
      'eyedropper': '💧', 'color-sampler': '🔍', 'ruler': '📏', 'note': '📝', 'count': '123',
      'brush': '🖌', 'pencil': '✏️', 'color-replacement': '🖌↔', 'mixer-brush': '🎨',
      'eraser': '🧽', 'background-eraser': '🧽✨', 'magic-eraser': '✨🧽',
      'fill': '🪣', 'gradient': '🌈', 'paint-bucket': '🪣',
      'blur': '💧', 'sharpen': '🔪', 'smudge': '👆',
      'dodge': '👁', 'burn': '👁‍🗨', 'sponge': '🧽',
      'pen': '✒️', 'curvature-pen': '⤢✒️', 'freeform-pen': '✒️~',
      'add-anchor': '➕', 'delete-anchor': '➖', 'convert-anchor': '⇄',
      'horizontal-type': 'T', 'vertical-type': '⊥',
      'horizontal-type-mask': 'T▢', 'vertical-type-mask': '⊥▢',
      'path-select': '⤡', 'direct-select': '⤢',
      'rectangle': '▭', 'ellipse': '⭘', 'triangle': '△',
      'polygon': '⬟', 'line': '━', 'custom-shape': '✦',
      'hand': '✋', 'rotate-view': '🔄', 'zoom': '🔍',
    };
    return icons[tool] || '?';
  };

  const getToolName = (tool: ToolType): string => {
    const names: Record<ToolType, string> = {
      'select': 'Selection', 'move': 'Move',
      'marquee-rect': 'Rectangular Marquee', 'marquee-ellipse': 'Elliptical Marquee',
      'marquee-single-row': 'Single Row Marquee', 'marquee-single-col': 'Single Column Marquee',
      'lasso': 'Lasso', 'lasso-polygon': 'Polygonal Lasso', 'lasso-magnetic': 'Magnetic Lasso',
      'magic-wand': 'Magic Wand', 'object-select': 'Object Selection',
      'crop': 'Crop', 'slice': 'Slice', 'slice-select': 'Slice Select',
      'eyedropper': 'Eyedropper', 'color-sampler': 'Color Sampler', 'ruler': 'Ruler', 'note': 'Note', 'count': 'Count',
      'brush': 'Brush', 'pencil': 'Pencil', 'color-replacement': 'Color Replacement', 'mixer-brush': 'Mixer Brush',
      'eraser': 'Eraser', 'background-eraser': 'Background Eraser', 'magic-eraser': 'Magic Eraser',
      'fill': 'Fill', 'gradient': 'Gradient', 'paint-bucket': 'Paint Bucket',
      'blur': 'Blur', 'sharpen': 'Sharpen', 'smudge': 'Smudge',
      'dodge': 'Dodge', 'burn': 'Burn', 'sponge': 'Sponge',
      'pen': 'Pen', 'curvature-pen': 'Curvature Pen', 'freeform-pen': 'Freeform Pen',
      'add-anchor': 'Add Anchor Point', 'delete-anchor': 'Delete Anchor Point', 'convert-anchor': 'Convert Anchor Point',
      'horizontal-type': 'Horizontal Type', 'vertical-type': 'Vertical Type',
      'horizontal-type-mask': 'Horizontal Type Mask', 'vertical-type-mask': 'Vertical Type Mask',
      'path-select': 'Path Selection', 'direct-select': 'Direct Selection',
      'rectangle': 'Rectangle', 'ellipse': 'Ellipse', 'triangle': 'Triangle',
      'polygon': 'Polygon', 'line': 'Line', 'custom-shape': 'Custom Shape',
      'hand': 'Hand', 'rotate-view': 'Rotate View', 'zoom': 'Zoom',
    };
    return names[tool] || tool;
  };

  const getShortcut = (tool: ToolType): string | null => {
    const shortcut = KEYBOARD_SHORTCUTS.find(s => s.action === `tool:${tool}`);
    if (!shortcut) return null;
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  };

  const groupLabels: Record<string, string> = {
    selection: 'Selection Tools',
    cropSlice: 'Crop & Slice',
    measurement: 'Measurement',
    retouch: 'Retouch & Paint',
    painting: 'Painting',
    focus: 'Focus',
    toning: 'Toning',
    pen: 'Pen Tools',
    type: 'Type Tools',
    path: 'Path Tools',
    shape: 'Shape Tools',
    navigation: 'Navigation',
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {Object.entries(TOOL_GROUPS).map(([groupKey, tools]) => (
        <div key={groupKey} className="toolbar-group">
          <button
            type="button"
            className="toolbar-group-header"
            onClick={() => toggleGroup(groupKey)}
            aria-expanded={expandedGroups.includes(groupKey)}
            aria-controls={`toolbar-group-${groupKey}`}
          >
            <span className="toolbar-group-title">{groupLabels[groupKey]}</span>
            <span className={`toolbar-group-toggle ${expandedGroups.includes(groupKey) ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          <div
            id={`toolbar-group-${groupKey}`}
            className={`toolbar-group-content ${expandedGroups.includes(groupKey) ? 'expanded' : ''}`}
            role="group"
            aria-label={groupLabels[groupKey]}
          >
            {tools.map((tool) => {
              const shortcut = getShortcut(tool);
              const isActive = activeTool === tool;
              
              return (
                <button
                  key={tool}
                  type="button"
                  className={`toolbar-tool ${isActive ? 'active' : ''}`}
                  onClick={() => !disabled && onToolChange(tool)}
                  disabled={disabled}
                  title={`${getToolName(tool)}${shortcut ? ` (${shortcut})` : ''}`}
                  aria-pressed={isActive}
                  aria-label={getToolName(tool)}
                  style={{ cursor: TOOL_CURSORS[tool] || 'default' }}
                >
                  <span className="toolbar-tool-icon">{getToolIcon(tool)}</span>
                  {shortcut && <span className="toolbar-tool-shortcut">{shortcut}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Color chips */}
      <div className="toolbar-divider" />
      <div className="toolbar-colors" role="group" aria-label="Colors">
        <button
          type="button"
          className="toolbar-color-chip foreground"
          style={{ backgroundColor: `rgba(${toolOptions.foregroundColor.r}, ${toolOptions.foregroundColor.g}, ${toolOptions.foregroundColor.b}, ${toolOptions.foregroundColor.a})` }}
          title="Foreground Color (X to swap, D for default)"
          onClick={() => {}}
          aria-label="Foreground color"
        />
        <button
          type="button"
          className="toolbar-color-chip background"
          style={{ backgroundColor: `rgba(${toolOptions.backgroundColor.r}, ${toolOptions.backgroundColor.g}, ${toolOptions.backgroundColor.b}, ${toolOptions.backgroundColor.a})` }}
          title="Background Color"
          onClick={() => {}}
          aria-label="Background color"
        />
        <button
          type="button"
          className="toolbar-color-switch"
          title="Swap Colors (X)"
          onClick={() => onToolOptionsChange({ 
            foregroundColor: toolOptions.backgroundColor, 
            backgroundColor: toolOptions.foregroundColor 
          })}
          aria-label="Swap colors"
        >
          ⇄
        </button>
        <button
          type="button"
          className="toolbar-color-reset"
          title="Default Colors (D)"
          onClick={() => onToolOptionsChange({ 
            foregroundColor: { r: 0, g: 0, b: 0, a: 1 }, 
            backgroundColor: { r: 255, g: 255, b: 255, a: 1 } 
          })}
          aria-label="Reset colors"
        >
          ⬜
        </button>
      </div>
      
      {/* Quick mask / screen modes */}
      <div className="toolbar-divider" />
      <div className="toolbar-screen-modes" role="group" aria-label="Screen modes">
        <button type="button" className="toolbar-screen-mode" title="Standard Screen Mode (F)">▢</button>
        <button type="button" className="toolbar-screen-mode" title="Full Screen with Menu (F)">▢</button>
        <button type="button" className="toolbar-screen-mode" title="Full Screen (F)">▢</button>
      </div>
    </div>
  );
};

export default Toolbar;