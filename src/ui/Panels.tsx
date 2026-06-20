import React, { useState, useEffect, useRef } from 'react';
import { useStore, useDispatch, getStore } from '../core/state/store';
import type { Layer, BlendMode, AdjustmentLayer, RasterLayer } from '../types';
import { Icon, LAYER_ICON } from './icons';
import { useApp } from './AppContext';
import { rgbToHex, hexToRgb, rgbaToCss } from '../core/color/color';
import { defaultSettings } from '../core/commands';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

// ---------------------------------------------------------------------------
// Tabbed palette group
// ---------------------------------------------------------------------------
export const PaletteGroup: React.FC<{
  tabs: { id: string; label: string; render: () => React.ReactNode }[];
  initial?: string;
}> = ({ tabs, initial }) => {
  const [active, setActive] = useState(initial ?? tabs[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const cur = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="palette-group">
      <div className="palette-title">
        <span>{cur.label}</span>
        <span className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
          <Icon name={collapsed ? 'chevronRight' : 'collapse'} size={11} />
        </span>
      </div>
      {!collapsed && (
        <>
          {tabs.length > 1 && (
            <div className="palette-tabs">
              {tabs.map((t) => (
                <div key={t.id} className={`palette-tab${t.id === active ? ' active' : ''}`} onClick={() => setActive(t.id)}>
                  {t.label}
                </div>
              ))}
            </div>
          )}
          <div className="palette-body">{cur.render()}</div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------
export const LayersPanel: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const { commands } = useApp();
  const doc = state.document;
  const layers = doc ? [...doc.layers].sort((a, b) => b.order - a.order) : [];
  const active = doc?.layers.find((l) => l.id === state.activeLayerId);

  const setActive = (id: string) => dispatch({ type: 'SET_ACTIVE_LAYER', payload: id });
  const toggleVisible = (l: Layer) =>
    getStore().commit('Toggle Visibility', () =>
      dispatch({ type: 'UPDATE_LAYER', payload: { id: l.id, changes: { visible: !l.visible } } })
    );
  const toggleLock = (l: Layer) =>
    dispatch({ type: 'UPDATE_LAYER', payload: { id: l.id, changes: { locked: !l.locked } } });

  return (
    <div>
      <div className="row" style={{ gap: 4, marginBottom: 4 }}>
        <select
          className="ps-select"
          style={{ flex: 1 }}
          value={active?.blendMode ?? 'normal'}
          disabled={!active}
          onChange={(e) =>
            active && dispatch({ type: 'UPDATE_LAYER', payload: { id: active.id, changes: { blendMode: e.target.value as BlendMode } } })
          }
        >
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
        <span className="label">Opacity</span>
        <input
          type="range"
          className="ps-range"
          style={{ flex: 1 }}
          min={0}
          max={100}
          value={Math.round((active?.opacity ?? 1) * 100)}
          disabled={!active}
          onChange={(e) =>
            active && dispatch({ type: 'UPDATE_LAYER', payload: { id: active.id, changes: { opacity: Number(e.target.value) / 100 } } })
          }
        />
        <span className="label" style={{ width: 30, textAlign: 'right' }}>
          {Math.round((active?.opacity ?? 1) * 100)}%
        </span>
      </div>

      <div className="bevel-in" style={{ background: 'var(--ps-input-bg)', maxHeight: 220, overflowY: 'auto' }}>
        {layers.length === 0 && <div className="dim" style={{ padding: 8 }}>No layers</div>}
        {layers.map((l) => (
          <div key={l.id} className={`list-row${state.activeLayerId === l.id ? ' selected' : ''}`} onClick={() => setActive(l.id)}>
            <span className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleVisible(l); }} title="Toggle visibility">
              {l.visible ? <Icon name="eye" size={14} /> : <span style={{ width: 14, height: 14, display: 'inline-block', border: '1px solid var(--ps-bevel-shadow)' }} />}
            </span>
            <Icon name={LAYER_ICON[l.type] ?? 'layerRaster'} size={15} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
            <span className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLock(l); }} title="Lock">
              {l.locked ? <Icon name="lock" size={12} /> : <span style={{ opacity: 0.25 }}><Icon name="lockOpen" size={12} /></span>}
            </span>
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 3, marginTop: 4 }}>
        <div className="mini-btn bevel-out" title="New Adjustment Layer" onClick={() => commands.addAdjustmentLayer('exposure')}>
          <Icon name="layerAdjust" size={14} />
        </div>
        <div className="mini-btn bevel-out" title="New Layer" onClick={() => commands.addRasterLayer()}>
          <Icon name="newLayer" size={14} />
        </div>
        <div className="mini-btn bevel-out" title="Delete Layer" onClick={() => commands.deleteLayer()}>
          <Icon name="trash" size={14} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
export const HistoryPanel: React.FC = () => {
  const state = useStore();
  const entries = state.historyEntries;
  const jumpTo = (index: number) => {
    const store = getStore();
    const steps = entries.length - (index + 1);
    for (let i = 0; i < steps; i++) store.undo();
  };
  return (
    <div className="bevel-in" style={{ background: 'var(--ps-input-bg)', minHeight: 80, maxHeight: 200, overflowY: 'auto' }}>
      {entries.length === 0 && <div className="dim" style={{ padding: 8 }}>No history yet</div>}
      {entries.map((name, i) => (
        <div key={i} className={`list-row${i === entries.length - 1 ? ' selected' : ''}`} onClick={() => jumpTo(i)}>
          <Icon name="historyBrush" size={13} />
          <span style={{ flex: 1 }}>{name}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
const SWATCHES = ['#000000', '#ffffff', '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#7f00ff', '#ff00ff', '#808080', '#c0c0c0'];

export const ColorPanel: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const fg = state.foreground;
  const set = (r: number, g: number, b: number) => dispatch({ type: 'SET_FOREGROUND', payload: { r, g, b, a: 1 } });
  const channel = (label: string, val: number, key: 'r' | 'g' | 'b') => (
    <div className="row" style={{ gap: 6 }}>
      <span className="label" style={{ width: 12 }}>{label}</span>
      <input
        type="range"
        className="ps-range"
        style={{ flex: 1 }}
        min={0}
        max={255}
        value={val}
        onChange={(e) => set(key === 'r' ? +e.target.value : fg.r, key === 'g' ? +e.target.value : fg.g, key === 'b' ? +e.target.value : fg.b)}
      />
      <input
        type="number"
        className="ps-input"
        style={{ width: 40 }}
        min={0}
        max={255}
        value={Math.round(val)}
        onChange={(e) => set(key === 'r' ? +e.target.value : fg.r, key === 'g' ? +e.target.value : fg.g, key === 'b' ? +e.target.value : fg.b)}
      />
    </div>
  );
  return (
    <div>
      {channel('R', fg.r, 'r')}
      {channel('G', fg.g, 'g')}
      {channel('B', fg.b, 'b')}
      <div className="row" style={{ gap: 6, marginTop: 4 }}>
        <div className="bevel-in" style={{ width: 34, height: 20, background: rgbaToCss(fg) }} />
        <input
          className="ps-input"
          style={{ width: 70 }}
          value={rgbToHex(fg)}
          onChange={(e) => {
            const c = hexToRgb(e.target.value);
            if (c) set(c.r, c.g, c.b);
          }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 6 }}>
        {SWATCHES.map((s) => (
          <div
            key={s}
            className="bevel-thin-out"
            style={{ width: 16, height: 16, background: s, cursor: 'pointer' }}
            title={s}
            onClick={() => {
              const c = hexToRgb(s);
              if (c) set(c.r, c.g, c.b);
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Properties / Develop (adjustment editors)
// ---------------------------------------------------------------------------
interface SliderSpec { key: string; label: string; min: number; max: number; }
const ADJ_SPECS: Record<string, SliderSpec[]> = {
  exposure: [{ key: 'exposure', label: 'Exposure', min: -5, max: 5 }],
  contrast: [{ key: 'contrast', label: 'Contrast', min: -100, max: 100 }],
  highlights: [{ key: 'highlights', label: 'Highlights', min: -100, max: 100 }],
  shadows: [{ key: 'shadows', label: 'Shadows', min: -100, max: 100 }],
  whites: [{ key: 'whites', label: 'Whites', min: -100, max: 100 }],
  blacks: [{ key: 'blacks', label: 'Blacks', min: -100, max: 100 }],
  vibrance: [{ key: 'vibrance', label: 'Vibrance', min: -100, max: 100 }],
  saturation: [{ key: 'saturationAdjust', label: 'Saturation', min: -100, max: 100 }],
  temperature: [{ key: 'temperature', label: 'Temperature', min: -100, max: 100 }],
  tint: [{ key: 'tint', label: 'Tint', min: -100, max: 100 }],
  clarity: [{ key: 'clarity', label: 'Clarity', min: -100, max: 100 }],
  dehaze: [{ key: 'dehaze', label: 'Dehaze', min: -100, max: 100 }],
  texture: [{ key: 'texture', label: 'Texture', min: -100, max: 100 }],
  posterize: [{ key: 'posterize', label: 'Levels', min: 2, max: 32 }],
  threshold: [{ key: 'threshold', label: 'Threshold', min: 0, max: 255 }],
};

const DEVELOP_BUTTONS: { type: AdjustmentLayer['adjustmentType']; label: string }[] = [
  { type: 'exposure', label: 'Exposure' },
  { type: 'contrast', label: 'Contrast' },
  { type: 'highlights', label: 'Highlights' },
  { type: 'shadows', label: 'Shadows' },
  { type: 'vibrance', label: 'Vibrance' },
  { type: 'saturation', label: 'Saturation' },
  { type: 'temperature', label: 'Temp' },
  { type: 'tint', label: 'Tint' },
  { type: 'clarity', label: 'Clarity' },
  { type: 'dehaze', label: 'Dehaze' },
  { type: 'curves', label: 'Curves' },
  { type: 'hsl', label: 'HSL' },
  { type: 'vignette', label: 'Vignette' },
  { type: 'invert', label: 'Invert' },
];

export const PropertiesPanel: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const { commands } = useApp();
  const active = state.document?.layers.find((l) => l.id === state.activeLayerId);

  if (active && active.type === 'adjustment') {
    const layer = active as AdjustmentLayer;
    const specs = ADJ_SPECS[layer.adjustmentType];
    const setSetting = (key: string, value: number) =>
      dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { settings: { ...layer.settings, [key]: value } } as Partial<Layer> } });
    return (
      <div>
        <div className="section-label">{layer.name} (Adjustment)</div>
        {!specs && <div className="dim" style={{ padding: 4 }}>{layer.adjustmentType}: live sliders not available; effect still applies.</div>}
        {specs?.map((s) => {
          const val = ((layer.settings as Record<string, unknown>)[s.key] as number) ?? 0;
          return (
            <AdjSlider
              key={s.key}
              label={s.label}
              min={s.min}
              max={s.max}
              value={val}
              onChange={(v) => setSetting(s.key, v)}
            />
          );
        })}
        <div className="row" style={{ marginTop: 4 }}>
          <span className="label">Opacity</span>
          <input
            type="range"
            className="ps-range"
            style={{ flex: 1 }}
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { opacity: +e.target.value / 100 } } })}
          />
        </div>
      </div>
    );
  }

  // Develop: offer adjustment-layer creation (non-destructive)
  return (
    <div>
      <div className="section-label">Develop — add an adjustment</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {DEVELOP_BUTTONS.map((b) => (
          <div key={b.type} className="ps-btn" onClick={() => commands.addAdjustmentLayer(b.type)} title={`Add ${b.label} adjustment layer`}>
            {b.label}
          </div>
        ))}
      </div>
      <div className="dim" style={{ marginTop: 8, lineHeight: 1.4 }}>
        Adjustments are added as non-destructive layers. Select an adjustment layer to edit its sliders here.
      </div>
    </div>
  );
};

const AdjSlider: React.FC<{ label: string; min: number; max: number; value: number; onChange: (v: number) => void }> = ({
  label,
  min,
  max,
  value,
  onChange,
}) => {
  const begin = () => getStore().beginHistory(`Adjust ${label}`);
  const commit = () => getStore().commitHistory();
  return (
    <div className="row" style={{ gap: 6 }}>
      <span className="label" style={{ width: 70 }}>{label}</span>
      <input
        type="range"
        className="ps-range"
        style={{ flex: 1 }}
        min={min}
        max={max}
        step={(max - min) > 20 ? 1 : 0.1}
        value={value}
        onPointerDown={begin}
        onPointerUp={commit}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="label" style={{ width: 32, textAlign: 'right' }}>{Math.round(value * 10) / 10}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Navigator (thumbnail + zoom)
// ---------------------------------------------------------------------------
export const NavigatorPanel: React.FC = () => {
  const state = useStore();
  const { engine, commands } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !state.document) return;
    try {
      const comp = engine.composeArtboardCopy(state.document, true);
      const maxW = 200;
      const scale = Math.min(maxW / comp.width, 120 / comp.height, 1);
      c.width = Math.max(1, Math.round(comp.width * scale));
      c.height = Math.max(1, Math.round(comp.height * scale));
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(comp, 0, 0, c.width, c.height);
    } catch {
      /* ignore */
    }
  }, [state.document, state.viewport, engine]);

  return (
    <div>
      <div className="bevel-in" style={{ background: 'var(--ps-input-bg)', display: 'flex', justifyContent: 'center', padding: 4 }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <div className="row" style={{ marginTop: 4, gap: 4 }}>
        <span className="label">Zoom {Math.round(state.viewport.zoom * 100)}%</span>
        <div className="spacer" />
        <div className="ps-btn" onClick={() => commands.zoomOut()}><Icon name="zoom" size={12} /> –</div>
        <div className="ps-btn" onClick={() => commands.zoomIn()}><Icon name="zoom" size={12} /> +</div>
      </div>
    </div>
  );
};
