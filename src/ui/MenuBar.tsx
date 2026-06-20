import React, { useState, useEffect, useRef } from 'react';
import { useStore, useDispatch, getStore } from '../core/state/store';
import { useApp } from './AppContext';
import { Icon } from './icons';

interface MenuRow {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  checked?: boolean;
  sep?: boolean;
}

export const MenuBar: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const { commands } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hasDoc = !!state.document;
  const hasSel = !!state.selection;
  const canUndo = getStore().canUndo();
  const canRedo = getStore().canRedo();

  const menus: Record<string, MenuRow[]> = {
    File: [
      { label: 'New…', shortcut: 'Ctrl+N', action: () => commands.ui.openNewDialog() },
      { label: 'Open…', shortcut: 'Ctrl+O', action: () => commands.openImage() },
      { label: 'Place…', action: () => commands.placeImage(), disabled: !hasDoc },
      { label: 'Open Project…', action: () => commands.openProject() },
      { label: '', sep: true },
      { label: 'Save Project', shortcut: 'Ctrl+S', action: () => commands.saveProject(), disabled: !hasDoc },
      { label: 'Export PNG', action: () => commands.exportPng(), disabled: !hasDoc },
      { label: 'Export As…', shortcut: 'Ctrl+Shift+E', action: () => commands.exportAs(), disabled: !hasDoc },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => commands.undo(), disabled: !canUndo },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => commands.redo(), disabled: !canRedo },
      { label: '', sep: true },
      { label: 'Fill with Foreground', shortcut: 'Shift+F5', action: () => commands.fillForeground(), disabled: !hasDoc },
      { label: 'Fill with Background', action: () => commands.fillBackground(), disabled: !hasDoc },
      { label: '', sep: true },
      { label: 'Free Transform', shortcut: 'Ctrl+T', action: () => commands.ui.toast('Free Transform: use Move tool for now'), disabled: !hasDoc },
    ],
    Image: [
      { label: 'Image Size…', action: () => commands.imageSize(), disabled: !hasDoc },
      { label: 'Canvas Size…', action: () => commands.canvasSize(), disabled: !hasDoc },
      { label: 'Crop', action: () => commands.applyCrop(), disabled: !hasDoc },
      { label: '', sep: true },
      { label: 'Adjustment: Exposure', action: () => commands.addAdjustmentLayer('exposure'), disabled: !hasDoc },
      { label: 'Adjustment: Curves', action: () => commands.addAdjustmentLayer('curves'), disabled: !hasDoc },
      { label: 'Adjustment: Hue/Saturation', action: () => commands.addAdjustmentLayer('hsl'), disabled: !hasDoc },
      { label: 'Adjustment: Invert', action: () => commands.addAdjustmentLayer('invert'), disabled: !hasDoc },
    ],
    Layer: [
      { label: 'New Layer', shortcut: 'Ctrl+Shift+N', action: () => commands.addRasterLayer(), disabled: !hasDoc },
      { label: 'Duplicate Layer', shortcut: 'Ctrl+J', action: () => commands.duplicateLayer(), disabled: !hasDoc },
      { label: 'Delete Layer', action: () => commands.deleteLayer(), disabled: !hasDoc },
      { label: '', sep: true },
      { label: 'New Adjustment Layer…', action: () => commands.addAdjustmentLayer('exposure'), disabled: !hasDoc },
      { label: '', sep: true },
      { label: 'Merge Down', shortcut: 'Ctrl+E', action: () => commands.mergeDown(), disabled: !hasDoc },
      { label: 'Flatten Image', action: () => commands.flatten(), disabled: !hasDoc },
    ],
    Select: [
      { label: 'All', shortcut: 'Ctrl+A', action: () => commands.selectAll(), disabled: !hasDoc },
      { label: 'Deselect', shortcut: 'Ctrl+D', action: () => commands.deselect(), disabled: !hasSel },
      { label: 'Reselect', shortcut: 'Ctrl+Shift+D', action: () => commands.reselect() },
      { label: 'Inverse', shortcut: 'Ctrl+Shift+I', action: () => commands.inverseSelection(), disabled: !hasSel },
    ],
    Filter: [
      { label: 'Gaussian Blur', action: () => commands.applyFilter('gaussianBlur'), disabled: !hasDoc },
      { label: 'Sharpen', action: () => commands.applyFilter('sharpen'), disabled: !hasDoc },
      { label: 'Reduce Noise', action: () => commands.applyFilter('noiseReduction'), disabled: !hasDoc },
      { label: 'Invert', action: () => commands.applyFilter('invert'), disabled: !hasDoc },
      { label: 'Desaturate', action: () => commands.applyFilter('desaturate'), disabled: !hasDoc },
      { label: '', sep: true },
      { label: 'Neural Filters…  (unavailable)', disabled: true },
      { label: 'Generative Fill…  (unavailable)', disabled: true },
    ],
    View: [
      { label: 'Zoom In', shortcut: 'Ctrl++', action: () => commands.zoomIn() },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: () => commands.zoomOut() },
      { label: 'Fit on Screen', shortcut: 'Ctrl+0', action: () => commands.fitToScreen() },
      { label: 'Actual Pixels', shortcut: 'Ctrl+1', action: () => commands.actualPixels() },
      { label: '', sep: true },
      {
        label: 'Rulers',
        checked: state.viewport.rulerVisible,
        action: () => dispatch({ type: 'UPDATE_VIEWPORT', payload: { rulerVisible: !state.viewport.rulerVisible } }),
      },
    ],
    Window: [
      { label: 'Layers', checked: state.panels.layersOpen, action: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'layersOpen' }) },
      { label: 'History', checked: state.panels.historyOpen, action: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'historyOpen' }) },
      { label: 'Properties', checked: state.panels.propertiesOpen, action: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'propertiesOpen' }) },
      { label: '', sep: true },
      { label: 'Theme: CS2 (2006)', checked: state.theme === 'cs2', action: () => setTheme('cs2') },
      { label: 'Theme: Modern (dark)', checked: state.theme === 'modern', action: () => setTheme('modern') },
    ],
    Help: [{ label: 'About Stratum', action: () => commands.ui.toast('Stratum — Unified Canvas. A CS2-styled web editor.') }],
  };

  const setTheme = (t: 'cs2' | 'modern') => {
    dispatch({ type: 'SET_THEME', payload: t });
    document.documentElement.setAttribute('data-theme', t);
  };

  const run = (row: MenuRow) => {
    if (row.disabled || !row.action) return;
    row.action();
    setOpen(null);
  };

  return (
    <div className="menubar" ref={barRef}>
      {Object.keys(menus).map((name) => (
        <div key={name} style={{ position: 'relative' }}>
          <div
            className={`menu-item${open === name ? ' open' : ''}`}
            onMouseDown={() => setOpen(open === name ? null : name)}
            onMouseEnter={() => open && setOpen(name)}
          >
            {name}
          </div>
          {open === name && (
            <div className="menu-dropdown">
              {menus[name].map((row, i) =>
                row.sep ? (
                  <div key={i} className="menu-sep" />
                ) : (
                  <div key={i} className={`menu-row${row.disabled ? ' disabled' : ''}`} onClick={() => run(row)}>
                    {row.checked && <span className="check"><Icon name="check" size={11} /></span>}
                    <span>{row.label}</span>
                    {row.shortcut && <span className="shortcut">{row.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
