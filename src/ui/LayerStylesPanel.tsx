/**
 * Unified Canvas - Layer Styles Panel
 * UI for editing layer effects
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Layer, LayerStyleConfig, Color } from '../types';
import { LayerStyles, type LayerStyleConfig as LayerStyleConfigType } from '../engine/LayerStyles';
import './LayerStylesPanel.css';

interface LayerStylesPanelProps {
  layer: Layer | null;
  onStylesChange: (styles: LayerStyleConfig) => void;
  disabled?: boolean;
}

const styleCategories = [
  { id: 'dropShadow', label: 'Drop Shadow', icon: '🌑' },
  { id: 'innerShadow', label: 'Inner Shadow', icon: '🌒' },
  { id: 'outerGlow', label: 'Outer Glow', icon: '✨' },
  { id: 'innerGlow', label: 'Inner Glow', icon: '💡' },
  { id: 'bevelEmboss', label: 'Bevel & Emboss', icon: '💎' },
  { id: 'satin', label: 'Satin', icon: '🎀' },
  { id: 'colorOverlay', label: 'Color Overlay', icon: '🎨' },
  { id: 'gradientOverlay', label: 'Gradient Overlay', icon: '🌈' },
  { id: 'patternOverlay', label: 'Pattern Overlay', icon: '🔲' },
  { id: 'stroke', label: 'Stroke', icon: '✏️' },
] as const;

type StyleCategory = typeof styleCategories[number]['id'];

function toHex(color: Color): string {
  const r = Math.round(color.r).toString(16).padStart(2, '0');
  const g = Math.round(color.g).toString(16).padStart(2, '0');
  const b = Math.round(color.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function toRgba(color: Color): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}

export function LayerStylesPanel({ layer, onStylesChange, disabled = false }: LayerStylesPanelProps) {
  const [activeCategory, setActiveCategory] = useState<StyleCategory>('dropShadow');
  const [styles, setStyles] = useState<LayerStyleConfig>(() => 
    layer?.styles || LayerStyles.getDefaultStyles()
  );
  const [showAll, setShowAll] = useState(false);

  // Update local state when layer changes
  React.useEffect(() => {
    if (layer?.styles) {
      setStyles(layer.styles);
    }
  }, [layer?.styles]);

  const updateStyle = useCallback(<K extends keyof LayerStyleConfig>(
    category: K,
    updates: Partial<LayerStyleConfig[K]>
  ) => {
    setStyles(prev => ({
      ...prev,
      [category]: { ...prev[category], ...updates } as LayerStyleConfig[K],
    }));
  }, []);

  const commitStyles = useCallback(() => {
    onStylesChange(styles);
  }, [onStylesChange, styles]);

  // Auto-commit on change
  React.useEffect(() => {
    const timer = setTimeout(commitStyles, 100);
    return () => clearTimeout(timer);
  }, [styles, commitStyles]);

  React.useEffect(() => commitStyles, [commitStyles]);

  const category = styleCategories.find(c => c.id === activeCategory);
  const categoryStyles = styles[activeCategory as keyof LayerStyleConfig];

  return (
    <div className="layer-styles-panel">
      {/* Category List */}
      <div className="styles-categories">
        {styleCategories.map(cat => {
          const catStyles = styles[cat.id as keyof LayerStyleConfig] as LayerStyleConfigType[keyof LayerStyleConfigType];
          const isEnabled = catStyles?.enabled;
          return (
            <label 
              key={cat.id} 
              className={`style-category ${activeCategory === cat.id ? 'active' : ''} ${isEnabled ? 'enabled' : ''}`}
              onClick={() => setActiveCategory(cat.id as StyleCategory)}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => updateStyle(cat.id as keyof LayerStyleConfig, { enabled: e.target.checked })}
                onClick={e => e.stopPropagation()}
              />)
            </label>
          ); 
        })}
      </div>

      {/* Style Options */}
      <div className="styles-options">
        {category && categoryStyles && (
          <div className="style-options-content">
            <StyleEditor
              category={activeCategory}
              styles={categoryStyles}
              onChange={updates => updateStyle(activeCategory as keyof LayerStyleConfig, updates)}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Global Actions */}
      <div className="styles-actions">
        <button disabled={disabled} onClick={() => setStyles(LayerStyles.getDefaultStyles())}>Reset to Default</button>
        <button disabled={disabled} onClick={() => {
          const newStyles = LayerStyles.getDefaultStyles();
          const enabledKeys = Object.keys(styles).filter(k => (styles[k as keyof LayerStyleConfig] as any)?.enabled);
          enabledKeys.forEach(k => { (newStyles as any)[k].enabled = true; });
          setStyles(newStyles);
        }}>Copy Layer Style</button>
        <button disabled={disabled} onClick={() => {}}><kbd>⌘</kbd>+Click to Paste</button>
      </div>
    </div>
  );
}

interface StyleEditorProps {
  category: StyleCategory;
  styles: any;
  onChange: (updates: any) => void;
  disabled?: boolean;
}

function StyleEditor({ category, styles, onChange, disabled = false }: StyleEditorProps) {
  const handlers: Record<StyleCategory, React.ReactElement> = {
    dropShadow: <DropShadowEditor styles={styles} onChange={onChange} disabled={disabled} />,
    innerShadow: <InnerShadowEditor styles={styles} onChange={onChange} disabled={disabled} />,
    outerGlow: <GlowEditor styles={styles} onChange={onChange} type="outer" disabled={disabled} />,
    innerGlow: <GlowEditor styles={styles} onChange={onChange} type="inner" disabled={disabled} />,
    bevelEmboss: <BevelEmbossEditor styles={styles} onChange={onChange} disabled={disabled} />,
    satin: <SatinEditor styles={styles} onChange={onChange} disabled={disabled} />,
    colorOverlay: <ColorOverlayEditor styles={styles} onChange={onChange} disabled={disabled} />,
    gradientOverlay: <GradientOverlayEditor styles={styles} onChange={onChange} disabled={disabled} />,
    patternOverlay: <PatternOverlayEditor styles={styles} onChange={onChange} disabled={disabled} />,
    stroke: <StrokeEditor styles={styles} onChange={onChange} disabled={disabled} />,
  };

  return handlers[category] || <div>Select a style category</div>;
}

function DropShadowEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <AngleRow label="Angle" value={styles.angle * 180 / Math.PI} onChange={v => onChange({ angle: v * Math.PI / 180 })} useGlobalLight={true} disabled={disabled} />
      <SliderRow label="Distance" value={styles.distance} min={0} max={200} onChange={v => onChange({ distance: v })} disabled={disabled} />
      <SliderRow label="Spread" value={styles.spread} min={0} max={100} onChange={v => onChange({ spread: v })} disabled={disabled} />
      <SliderRow label="Size" value={styles.size} min={0} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <ContourRow value={styles.contour} onChange={v => onChange({ contour: v })} disabled={disabled} />
      <SliderRow label="Noise" value={styles.noise} min={0} max={100} onChange={v => onChange({ noise: v })} disabled={disabled} />
      <CheckboxRow label="Layer Knocks Out Drop Shadow" value={styles.layerKnocksOutDropShadow} onChange={v => onChange({ layerKnocksOutDropShadow: v })} disabled={disabled} />
    </div>
  );
}

function InnerShadowEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <AngleRow label="Angle" value={styles.angle * 180 / Math.PI} onChange={v => onChange({ angle: v * Math.PI / 180 })} useGlobalLight={true} disabled={disabled} />
      <SliderRow label="Distance" value={styles.distance} min={0} max={200} onChange={v => onChange({ distance: v })} disabled={disabled} />
      <SliderRow label="Choke" value={styles.choke} min={0} max={100} onChange={v => onChange({ choke: v })} disabled={disabled} />
      <SliderRow label="Size" value={styles.size} min={0} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <ContourRow value={styles.contour} onChange={v => onChange({ contour: v })} disabled={disabled} />
      <SliderRow label="Noise" value={styles.noise} min={0} max={100} onChange={v => onChange({ noise: v })} disabled={disabled} />
    </div>
  );
}

function GlowEditor({ styles, onChange, type, disabled = false }: { styles: any, onChange: (u: any) => void, type: 'outer' | 'inner', disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <SliderRow label="Noise" value={styles.noise} min={0} max={100} onChange={v => onChange({ noise: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
      <SelectRow label="Technique" value={styles.technique} options={['softer', 'precise']} onChange={v => onChange({ technique: v })} disabled={disabled} />
      {type === 'outer' ? (
        <>
          <SliderRow label="Spread" value={styles.spread} min={0} max={100} onChange={v => onChange({ spread: v })} disabled={disabled} />
        </>
      ) : (
        <>
          <SelectRow label="Source" value={styles.source} options={['edge', 'center']} onChange={v => onChange({ source: v })} disabled={disabled} />
          <SliderRow label="Choke" value={styles.choke} min={0} max={100} onChange={v => onChange({ choke: v })} disabled={disabled} />
        </>
      )}
      <SliderRow label="Size" value={styles.size} min={0} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <ContourRow value={styles.contour} onChange={v => onChange({ contour: v })} disabled={disabled} />
      <SliderRow label="Range" value={styles.range} min={0} max={100} onChange={v => onChange({ range: v })} disabled={disabled} />
      <SliderRow label="Jitter" value={styles.jitter} min={0} max={100} onChange={v => onChange({ jitter: v })} disabled={disabled} />
    </div>
  );
}

function BevelEmbossEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <SelectRow label="Style" value={styles.style} options={['outer', 'inner', 'emboss', 'pillow', 'stroke']} onChange={v => onChange({ style: v })} disabled={disabled} />
      <SelectRow label="Technique" value={styles.technique} options={['smooth', 'chisel-hard', 'chisel-soft']} onChange={v => onChange({ technique: v })} disabled={disabled} />
      <SliderRow label="Depth" value={styles.depth} min={1} max={1000} onChange={v => onChange({ depth: v })} disabled={disabled} />
      <SelectRow label="Direction" value={styles.direction} options={['up', 'down']} onChange={v => onChange({ direction: v })} disabled={disabled} />
      <SliderRow label="Size" value={styles.size} min={1} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <SliderRow label="Soften" value={styles.soften} min={0} max={16} onChange={v => onChange({ soften: v })} disabled={disabled} />
      <AngleRow label="Angle" value={styles.angle * 180 / Math.PI} onChange={v => onChange({ angle: v * Math.PI / 180 })} useGlobalLight={true} disabled={disabled} />
      <SliderRow label="Altitude" value={styles.altitude * 180 / Math.PI} min={0} max={90} onChange={v => onChange({ altitude: v * Math.PI / 180 })} disabled={disabled} />
      <ContourRow label="Gloss Contour" value={styles.glossContour} onChange={v => onChange({ glossContour: v })} disabled={disabled} />
      <div className="subsection">Highlight</div>
      <BlendModeRow value={styles.highlightMode} onChange={v => onChange({ highlightMode: v })} defaultMode="screen" disabled={disabled} />
      <ColorRow label="Color" value={styles.highlightColor} onChange={v => onChange({ highlightColor: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.highlightOpacity * 100} min={0} max={100} onChange={v => onChange({ highlightOpacity: v / 100 })} disabled={disabled} />
      <div className="subsection">Shadow</div>
      <BlendModeRow value={styles.shadowMode} onChange={v => onChange({ shadowMode: v })} defaultMode="multiply" disabled={disabled} />
      <ColorRow label="Color" value={styles.shadowColor} onChange={v => onChange({ shadowColor: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.shadowOpacity * 100} min={0} max={100} onChange={v => onChange({ shadowOpacity: v / 100 })} disabled={disabled} />
    </div>
  );
}

function SatinEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <AngleRow label="Angle" value={styles.angle * 180 / Math.PI} onChange={v => onChange({ angle: v * Math.PI / 180 })} disabled={disabled} />
      <SliderRow label="Distance" value={styles.distance} min={0} max={200} onChange={v => onChange({ distance: v })} disabled={disabled} />
      <SliderRow label="Size" value={styles.size} min={0} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <ContourRow value={styles.contour} onChange={v => onChange({ contour: v })} disabled={disabled} />
      <CheckboxRow label="Invert" value={styles.invert} onChange={v => onChange({ invert: v })} disabled={disabled} />
    </div>
  );
}

function ColorOverlayEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
    </div>
  );
}

function GradientOverlayEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <GradientRow value={styles.gradient} onChange={v => onChange({ gradient: v })} disabled={disabled} />
      <SelectRow label="Style" value={styles.style} options={['linear', 'radial', 'angle', 'reflected', 'diamond']} onChange={v => onChange({ style: v })} disabled={disabled} />
      <AngleRow label="Angle" value={styles.angle * 180 / Math.PI} onChange={v => onChange({ angle: v * Math.PI / 180 })} disabled={disabled} />
      <SliderRow label="Scale" value={styles.scale} min={10} max={150} onChange={v => onChange({ scale: v })} disabled={disabled} />
      <CheckboxRow label="Align with Layer" value={styles.alignWithLayer} onChange={v => onChange({ alignWithLayer: v })} disabled={disabled} />
      <CheckboxRow label="Reverse" value={styles.reverse} onChange={v => onChange({ reverse: v })} disabled={disabled} />
    </div>
  );
}

function PatternOverlayEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <PatternRow value={styles.pattern} onChange={v => onChange({ pattern: v })} disabled={disabled} />
      <SliderRow label="Scale" value={styles.scale} min={1} max={1000} onChange={v => onChange({ scale: v })} disabled={disabled} />
      <CheckboxRow label="Link with Layer" value={styles.linkWithLayer} onChange={v => onChange({ linkWithLayer: v })} disabled={disabled} />
    </div>
  );
}

function StrokeEditor({ styles, onChange, disabled = false }: { styles: any, onChange: (u: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-section">
      <SliderRow label="Size" value={styles.size} min={1} max={250} onChange={v => onChange({ size: v })} disabled={disabled} />
      <SelectRow label="Position" value={styles.position} options={['outside', 'inside', 'center']} onChange={v => onChange({ position: v })} disabled={disabled} />
      <BlendModeRow value={styles.blendMode} onChange={v => onChange({ blendMode: v })} disabled={disabled} />
      <SliderRow label="Opacity" value={styles.opacity * 100} min={0} max={100} onChange={v => onChange({ opacity: v / 100 })} disabled={disabled} />
      <SelectRow label="Fill Type" value={styles.fillType} options={['color', 'gradient', 'pattern']} onChange={v => onChange({ fillType: v })} disabled={disabled} />
      <ColorRow label="Color" value={styles.color} onChange={v => onChange({ color: v })} disabled={disabled} />
    </div>
  );
}

// Shared UI Components
function BlendModeRow({ value, onChange, defaultMode = 'normal', disabled = false }: { value: string, onChange: (v: string) => void, defaultMode?: string, disabled?: boolean }) {
  const modes = ['normal', 'dissolve', 'darken', 'multiply', 'color-burn', 'linear-burn', 'darker-color', 'lighten', 'screen', 'color-dodge', 'linear-dodge', 'lighter-color', 'overlay', 'soft-light', 'hard-light', 'vivid-light', 'linear-light', 'pin-light', 'hard-mix', 'difference', 'exclusion', 'subtract', 'divide', 'hue', 'saturation', 'color', 'luminosity'];
  return (
    <div className="editor-row">
      <label>Blend Mode</label>
      <select value={value || defaultMode} onChange={e => onChange(e.target.value)} disabled={disabled}>
        {modes.map(m => <option key={m} value={m}>{m.replace(/-/g, ' ')}</option>)}
      </select>
    </div>
  );
}

function ColorRow({ label, value, onChange, disabled = false }: { label: string, value: Color, onChange: (v: Color) => void, disabled?: boolean }) {
  const [hex, setHex] = useState(toHex(value));
  return (
    <div className="editor-row">
      <label>{label}</label>
      <div className="color-input-group">
        <input type="color" value={hex} onChange={e => {
          setHex(e.target.value);
          const r = parseInt(e.target.value.slice(1, 3), 16);
          const g = parseInt(e.target.value.slice(3, 5), 16);
          const b = parseInt(e.target.value.slice(5, 7), 16);
          onChange({ ...value, r, g, b });
        }} disabled={disabled} />
        <input type="text" value={hex} onChange={e => {
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
            setHex(e.target.value);
            const r = parseInt(e.target.value.slice(1, 3), 16);
            const g = parseInt(e.target.value.slice(3, 5), 16);
            const b = parseInt(e.target.value.slice(5, 7), 16);
            onChange({ ...value, r, g, b });
          }
        }} disabled={disabled} />
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange, step = 1, disabled = false }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, step?: number, disabled?: boolean }) {
  return (
    <div className="editor-row">
      <label>{label} <span className="value-display">{value.toFixed(step < 1 ? 2 : 0)}</span></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} disabled={disabled} />
    </div>
  );
}

function AngleRow({ label, value, onChange, useGlobalLight = false, disabled = false }: { label: string, value: number, onChange: (v: number) => void, useGlobalLight?: boolean, disabled?: boolean }) {
  return (
    <div className="editor-row angle-row">
      <label>{label} <span className="value-display">{Math.round(value)}°</span></label>
      <div className="angle-control">
        <input type="range" min={0} max={360} value={value} onChange={e => onChange(parseFloat(e.target.value))} disabled={disabled} />
        <div className="angle-wheel" onClick={disabled ? undefined : (e => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const angle = Math.atan2(e.clientY - rect.top - rect.height/2, e.clientX - rect.left - rect.width/2);
          onChange((angle * 180 / Math.PI + 360) % 360);
        })}>
          <div className="angle-indicator" style={{ transform: `rotate(${value}deg)` }} />
        </div>
      </div>
      {useGlobalLight && <label className="global-light"><input type="checkbox" checked={true} disabled={disabled} /> Use Global Light</label>}
    </div>
  );
}

function ContourRow({ label = 'Contour', value, onChange, disabled = false }: { label?: string, value: string, onChange: (v: string) => void, disabled?: boolean }) {
  const contours = ['linear', 'cone', 'cone-inverted', 'gaussian', 'ring', 'ring-double', 'steps'];
  return (
    <div className="editor-row">
      <label>{label}</label>
      <select value={value || 'linear'} onChange={e => onChange(e.target.value)} disabled={disabled}>
        {contours.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
      </select>
    </div>
  );
}

function CheckboxRow({ label, value, onChange, disabled = false }: { label: string, value: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
  return (
    <div className="editor-row checkbox-row">
      <label><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} disabled={disabled} /> {label}</label>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, disabled = false }: { label: string, value: string, options: string[], onChange: (v: string) => void, disabled?: boolean }) {
  return (
    <div className="editor-row">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function GradientRow({ value, onChange, disabled = false }: { value: any, onChange: (v: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-row gradient-row">
      <label>Gradient</label>
      <button className="gradient-preview" style={{ background: `linear-gradient(90deg, ${value.stops.map((s: any) => `rgba(${Math.round(s.color.r)},${Math.round(s.color.g)},${Math.round(s.color.b)},${s.opacity ?? 1}) ${s.offset * 100}%`).join(', ')})` }} onClick={() => {}} disabled={disabled}>
        Edit Gradient
      </button>
    </div>
  );
}

function PatternRow({ value, onChange, disabled = false }: { value: any, onChange: (v: any) => void, disabled?: boolean }) {
  return (
    <div className="editor-row">
      <label>Pattern</label>
      <button className="pattern-preview" onClick={() => {}} disabled={disabled}>Select Pattern</button>
    </div>
  );
}

export default LayerStylesPanel;