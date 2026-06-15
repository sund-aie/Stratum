/**
 * Unified Canvas - Adjustment Layers Panel
 * Comprehensive panel for creating and editing adjustment layers with all 25 types
 * Supports Photoshop + Lightroom adjustments, masking, clipping, and real-time preview
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { Layer, AdjustmentType, AdjustmentParams, Color } from '../types';
import { ADJUSTMENT_CONFIG, AdjustmentParamsSchema, AdjustmentUIConfig } from '../engine/Adjustments';
import { ColorPicker } from './ColorPicker';
import './AdjustmentLayersPanel.css';

// Adjustment categories for organized UI
const ADJUSTMENT_CATEGORIES = {
  tonal: {
    label: 'Tonal',
    icon: '☀',
    types: ['brightness-contrast', 'exposure', 'levels', 'curves', 'shadows-highlights', 'hdr-toning'] as AdjustmentType[],
  },
  color: {
    label: 'Color',
    icon: '🎨',
    types: ['hsl', 'color-balance', 'vibrance', 'hue-saturation', 'selective-color', 'replace-color', 'channel-mixer', 'gradient-map', 'color-lookup', 'invert', 'posterize', 'threshold'] as AdjustmentType[],
  },
  creative: {
    label: 'Creative',
    icon: '✨',
    types: ['photo-filter', 'camera-raw-filter', 'black-white', 'sepia', 'cross-process'] as AdjustmentType[],
  },
  lightroom: {
    label: 'Lightroom Develop',
    icon: '📷',
    types: ['lr-basic', 'lr-tone-curve', 'lr-hsl', 'lr-split-toning', 'lr-detail', 'lr-lens-correction', 'lr-effects', 'lr-calibration'] as AdjustmentType[],
  },
} as const;

function InputGroup({ label, children, className = '', tooltip }: { label: string; children: React.ReactNode; className?: string; tooltip?: string }) {
  return (
    <div className={`adj-input-group ${className}`}>
      <label className="adj-label" title={tooltip}>
        {label}
      </label>
      <div className="adj-input-wrapper">{children}</div>
    </div>
  );
}

function SliderRow({ value, min, max, step, onChange, unit = '', disabled = false, showValue = true, marks }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
  showValue?: boolean;
  marks?: { value: number; label: string }[];
}) {
  return (
    <div className="adj-slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="adj-slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      {showValue && (
        <span className="adj-slider-value">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      )}
    </div>
  );
}

function SelectRow({ value, options, onChange, disabled = false }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <select
      className="adj-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ColorRow({ value, onChange, disabled = false }: { value: Color; onChange: (color: Color) => void; disabled?: boolean }) {
  const hex = `#${((1 << 24) + (Math.round(value.r * 255) << 16) + (Math.round(value.g * 255) << 8) + Math.round(value.b * 255)).toString(16).slice(1)}`;
  return (
    <div className="adj-color-row">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange({
          r: parseInt(e.target.value.slice(1, 3), 16) / 255,
          g: parseInt(e.target.value.slice(3, 5), 16) / 255,
          b: parseInt(e.target.value.slice(5, 7), 16) / 255,
          a: value.a,
        })}
        disabled={disabled}
        className="adj-color-input"
      />
      <span className="adj-color-hex" style={{ color: hex }}>{hex}</span>
    </div>
  );
}

function CheckboxRow({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className="adj-checkbox-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

// Curves editor component (simplified - full implementation would be more complex)
function CurvesEditor({ value, onChange, disabled = false }: { value: { points: { x: number; y: number }[]; channel: string }; onChange: (value: { points: { x: number; y: number }[]; channel: string }) => void; disabled?: boolean }) {
  const [channel, setChannel] = useState(value.channel || 'rgb');
  
  // Simplified curves - in production this would be a full curve editor widget
  const channels = [
    { value: 'rgb', label: 'RGB' },
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ];

  const handlePointChange = (index: number, x: number, y: number) => {
    const newPoints = [...value.points];
    newPoints[index] = { x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) };
    onChange({ ...value, points: newPoints });
  };

  return (
    <div className="adj-curves-editor">
      <div className="adj-curves-channel-select">
        {channels.map(c => (
          <button
            key={c.value}
            className={`adj-channel-btn ${channel === c.value ? 'active' : ''}`}
            onClick={() => setChannel(c.value)}
            disabled={disabled}
            onMouseDown={() => onChange({ ...value, channel: c.value })}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="adj-curves-preview" title="Click to add point">
        <svg width="200" height="200" viewBox="0 0 256 256">
          {/* Grid */}
          <g stroke="#333" strokeWidth="0.5" opacity="0.3">
            {[64, 128, 192].forEach(v => (
              <>
                <line x1={v} y1={0} x2={v} y2={256} />
                <line x1={0} y1={v} x2={256} y2={v} />
              </>
            ))}
          </g>
          {/* Diagonal reference */}
          <line x1={0} y1={256} x2={256} y2={0} stroke="#555" strokeWidth="1" strokeDasharray="4,4" />
          {/* Curve path */}
          <path
            d={value.points.length > 1
              ? `M${value.points.map((p, i) => 
                  i === 0 ? `${p.x},${256-p.y}` : `C${p.x},${256-p.y}`
                ).join(' ')}`
              : 'M0,256 L256,0'
            }
            stroke="#00d4ff"
            strokeWidth="2"
            fill="none"
          />
          {/* Points */}
          {value.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={256 - p.y}
              r={5}
              fill="#00d4ff"
              stroke="#fff"
              strokeWidth="2"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startPoint = { ...p };
                const onMove = (me: MouseEvent) => {
                  const dx = (me.clientX - startX) / 2;
                  const dy = (startY - me.clientY) / 2;
                  handlePointChange(i, startPoint.x + dx, startPoint.y + dy);
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// Levels editor - histogram with three input sliders
function LevelsEditor({ value, onChange, disabled = false }: { value: number[]; onChange: (value: number[]) => void; disabled?: boolean }) {
  const [black, setBlack] = useState(value[0] || 0);
  const [gamma, setGamma] = useState(value[1] || 1.0);
  const [white, setWhite] = useState(value[2] || 255);
  const [outputBlack, setOutputBlack] = useState(value[3] || 0);
  const [outputWhite, setOutputWhite] = useState(value[4] || 255);

  return (
    <div className="adj-levels-editor">
      <div className="adj-levels-inputs">
        <InputGroup label="Input Levels">
          <div className="adj-levels-row">
            <SliderRow
              value={black}
              min={0}
              max={254}
              step={1}
              onChange={(v) => { setBlack(v); onChange([v, gamma, white, outputBlack, outputWhite]); }}
              disabled={disabled}
            />
            <SliderRow
              value={gamma}
              min={0.1}
              max={9.99}
              step={0.01}
              onChange={(v) => { setGamma(v); onChange([black, v, white, outputBlack, outputWhite]); }}
              disabled={disabled}
            />
            <SliderRow
              value={white}
              min={1}
              max={255}
              step={1}
              onChange={(v) => { setWhite(v); onChange([black, gamma, v, outputBlack, outputWhite]); }}
              disabled={disabled}
            />
          </div>
        </InputGroup>
        <InputGroup label="Output Levels">
          <div className="adj-levels-row">
            <SliderRow
              value={outputBlack}
              min={0}
              max={254}
              step={1}
              onChange={(v) => { setOutputBlack(v); onChange([black, gamma, white, v, outputWhite]); }}
              disabled={disabled}
            />
            <SliderRow
              value={outputWhite}
              min={1}
              max={255}
              step={1}
              onChange={(v) => { setOutputWhite(v); onChange([black, gamma, white, outputBlack, v]); }}
              disabled={disabled}
            />
          </div>
        </InputGroup>
      </div>
      <div className="adj-levels-histogram" aria-label="Levels histogram preview">
        <canvas width="256" height="64" ref={(c) => {
          if (c) drawHistogram(c, black, gamma, white);
        }} />
      </div>
    </div>
  );
}

function drawHistogram(canvas: HTMLCanvasElement, black: number, gamma: number, white: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = '#00d4ff';
  for (let i = 0; i < 256; i++) {
    let v = i;
    // Apply levels
    if (v < black) v = 0;
    else if (v > white) v = 255;
    else v = 255 * Math.pow((v - black) / (white - black), 1/gamma);
    const h = Math.max(1, (v / 255) * 60);
    ctx.fillRect(i, 64 - h, 1, h);
  }
}

// HSL Editor with 8 color ranges
function HSLEditor({ value, onChange, disabled = false }: { value: AdjustmentParams['hsl']; onChange: (value: AdjustmentParams['hsl']) => void; disabled?: boolean }) {
  const colorRanges = [
    { key: 'master', label: 'Master', color: '#fff' },
    { key: 'reds', label: 'Reds', color: '#ff4444' },
    { key: 'yellows', label: 'Yellows', color: '#ffff44' },
    { key: 'greens', label: 'Greens', color: '#44ff44' },
    { key: 'cyans', label: 'Cyans', color: '#44ffff' },
    { key: 'blues', label: 'Blues', color: '#4444ff' },
    { key: 'magentas', label: 'Magentas', color: '#ff44ff' },
  ] as const;

  const [activeRange, setActiveRange] = useState<'master' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas'>('master');

  const range = value[activeRange] || { hue: 0, saturation: 0, lightness: 0 };

  const handleChange = (field: 'hue' | 'saturation' | 'lightness', val: number) => {
    onChange({
      ...value,
      [activeRange]: { ...range, [field]: val },
    });
  };

  return (
    <div className="adj-hsl-editor">
      <div className="adj-hsl-ranges">
        {colorRanges.map(r => (
          <button
            key={r.key}
            className={`adj-hsl-range-btn ${activeRange === r.key ? 'active' : ''}`}
            onClick={() => setActiveRange(r.key)}
            disabled={disabled}
            style={{ borderLeftColor: r.color }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="adj-hsl-controls">
        <InputGroup label="Hue">
          <SliderRow
            value={range.hue}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => handleChange('hue', v)}
            disabled={disabled}
          />
        </InputGroup>
        <InputGroup label="Saturation">
          <SliderRow
            value={range.saturation}
            min={-100}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => handleChange('saturation', v)}
            disabled={disabled}
          />
        </InputGroup>
        <InputGroup label="Lightness">
          <SliderRow
            value={range.lightness}
            min={-100}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => handleChange('lightness', v)}
            disabled={disabled}
          />
        </InputGroup>
      </div>
      <CheckboxRow
        label="Colorize"
        checked={value.colorize || false}
        onChange={(v) => onChange({ ...value, colorize: v })}
        disabled={disabled}
      />
    </div>
  );
}

// Color Balance Editor (Shadows/Midtones/Highlights)
function ColorBalanceEditor({ value, onChange, disabled = false }: { value: AdjustmentParams['color-balance']; onChange: (value: AdjustmentParams['color-balance']) => void; disabled?: boolean }) {
  const tones = ['shadows', 'midtones', 'highlights'] as const;
  const [activeTone, setActiveTone] = useState<'shadows' | 'midtones' | 'highlights'>('midtones');

  const tone = value[activeTone] || { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
  const preserveLuminosity = value.preserveLuminosity !== false;

  const handleChange = (field: 'cyanRed' | 'magentaGreen' | 'yellowBlue', val: number) => {
    onChange({
      ...value,
      [activeTone]: { ...tone, [field]: val },
    });
  };

  return (
    <div className="adj-color-balance-editor">
      <div className="adj-tone-select">
        {tones.map(t => (
          <button
            key={t}
            className={`adj-tone-btn ${activeTone === t ? 'active' : ''}`}
            onClick={() => setActiveTone(t)}
            disabled={disabled}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <CheckboxRow
        label="Preserve Luminosity"
        checked={preserveLuminosity}
        onChange={(v) => onChange({ ...value, preserveLuminosity: v })}
        disabled={disabled}
      />
      <div className="adj-cb-sliders">
        <InputGroup label="Cyan ←→ Red">
          <SliderRow
            value={tone.cyanRed}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => handleChange('cyanRed', v)}
            disabled={disabled}
          />
        </InputGroup>
        <InputGroup label="Magenta ←→ Green">
          <SliderRow
            value={tone.magentaGreen}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => handleChange('magentaGreen', v)}
            disabled={disabled}
          />
        </InputGroup>
        <InputGroup label="Yellow ←→ Blue">
          <SliderRow
            value={tone.yellowBlue}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => handleChange('yellowBlue', v)}
            disabled={disabled}
          />
        </InputGroup>
      </div>
    </div>
  );
}

// Split Toning / Color Grading Editor
function SplitToningEditor({ value, onChange, disabled = false }: { value: AdjustmentParams['lr-split-toning'] | AdjustmentParams['split-toning']; onChange: (value: any) => void; disabled?: boolean }) {
  const [mode, setMode] = useState<'shadows' | 'midtones' | 'highlights' | 'global'>('shadows');
  
  // Support both Lightroom (lr-split-toning) and Photoshop (split-toning) param structures
  const shadows = value.shadows || { hue: 0, saturation: 0 };
  const midtones = value.midtones || { hue: 0, saturation: 0 };
  const highlights = value.highlights || { hue: 0, saturation: 0 };
  const global = value.global || { hue: 0, saturation: 0 };
  const balance = value.balance || 0;
  const blending = value.blending || 50;

  const current = mode === 'shadows' ? shadows : mode === 'midtones' ? midtones : mode === 'highlights' ? highlights : global;

  const handleChange = (field: 'hue' | 'saturation', val: number) => {
    const newVal = { ...current, [field]: val };
    if (mode === 'shadows') onChange({ ...value, shadows: newVal });
    else if (mode === 'midtones') onChange({ ...value, midtones: newVal });
    else if (mode === 'highlights') onChange({ ...value, highlights: newVal });
    else onChange({ ...value, global: newVal });
  };

  return (
    <div className="adj-split-toning-editor">
      <div className="adj-toning-modes">
        {['shadows', 'midtones', 'highlights', 'global'].map(m => (
          <button
            key={m}
            className={`adj-mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m as any)}
            disabled={disabled}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      <InputGroup label="Hue">
        <SliderRow
          value={current.hue}
          min={0}
          max={360}
          step={1}
          unit="°"
          onChange={(v) => handleChange('hue', v)}
          disabled={disabled}
        />
      </InputGroup>
      <InputGroup label="Saturation">
        <SliderRow
          value={current.saturation}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => handleChange('saturation', v)}
          disabled={disabled}
        />
      </InputGroup>
      <InputGroup label="Balance">
        <SliderRow
          value={balance}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => onChange({ ...value, balance: v })}
          disabled={disabled}
        />
      </InputGroup>
      <InputGroup label="Blending">
        <SliderRow
          value={blending}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onChange({ ...value, blending: v })}
          disabled={disabled}
        />
      </InputGroup>
    </div>
  );
}

// Generic param editor for simple numeric params
function GenericParamsEditor({ config, value, onChange, disabled }: { config: AdjustmentUIConfig; value: AdjustmentParams; onChange: (key: string, val: any) => void; disabled?: boolean }) {
  if (!config.params || config.params.length === 0) {
    return <div className="adj-no-params">No adjustable parameters</div>;
  }

  return (
    <div className="adj-generic-editor">
      {config.params.map(param => {
        const paramValue = value[param.key];
        
        switch (param.type) {
          case 'slider':
            return (
              <InputGroup key={param.key} label={param.label} tooltip={param.tooltip}>
                <SliderRow
                  value={paramValue ?? param.default ?? 0}
                  min={param.min ?? 0}
                  max={param.max ?? 100}
                  step={param.step ?? 1}
                  unit={param.unit ?? ''}
                  onChange={(v) => onChange(param.key, v)}
                  disabled={disabled}
                />
              </InputGroup>
            );
          case 'select':
            return (
              <InputGroup key={param.key} label={param.label} tooltip={param.tooltip}>
                <SelectRow
                  value={paramValue ?? param.default ?? ''}
                  options={param.options ?? []}
                  onChange={(v) => onChange(param.key, v)}
                  disabled={disabled}
                />
              </InputGroup>
            );
          case 'color':
            return (
              <InputGroup key={param.key} label={param.label} tooltip={param.tooltip}>
                <ColorRow
                  value={paramValue ?? param.default ?? { r: 0, g: 0, b: 0, a: 1 }}
                  onChange={(v) => onChange(param.key, v)}
                  disabled={disabled}
                />
              </InputGroup>
            );
          case 'boolean':
            return (
              <InputGroup key={param.key} label={param.label} tooltip={param.tooltip}>
                <CheckboxRow
                  checked={paramValue ?? param.default ?? false}
                  onChange={(v) => onChange(param.key, v)}
                  disabled={disabled}
                />
              </InputGroup>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// Main Adjustment Type Selector
function AdjustmentTypeSelector({ onSelect, currentType }: { onSelect: (type: AdjustmentType) => void; currentType?: AdjustmentType }) {
  return (
    <div className="adj-type-selector">
      <div className="adj-type-search">
        <input
          type="search"
          placeholder="Search adjustments..."
          className="adj-search-input"
          onChange={(e) => {
            // Filter logic would go here
          }}
        />
      </div>
      {Object.entries(ADJUSTMENT_CATEGORIES).map(([catKey, category]) => (
        <div key={catKey} className="adj-category">
          <div className="adj-category-header">
            <span className="adj-category-icon">{category.icon}</span>
            <span className="adj-category-label">{category.label}</span>
          </div>
          <div className="adj-type-grid">
            {category.types.map(type => {
              const config = ADJUSTMENT_CONFIG[type];
              const isActive = currentType === type;
              return (
                <button
                  key={type}
                  className={`adj-type-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelect(type)}
                  title={config?.description || type}
                >
                  <span className="adj-type-name">{config?.label || type}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Adjustment Layer Properties (layer-level: mask, clipping, blend mode, opacity)
function AdjustmentLayerProperties({ layer, onUpdate, disabled = false }: { layer: Layer; onUpdate: (updates: Partial<Layer>) => void; disabled?: boolean }) {
  if (!layer.adjustment) return null;

  const config = ADJUSTMENT_CONFIG[layer.adjustment.type];

  return (
    <div className="adj-layer-properties">
      <h4>Adjustment Layer Properties</h4>
      <InputGroup label="Name">
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          disabled={disabled}
          className="adj-layer-name-input"
        />
      </InputGroup>
      <InputGroup label="Type">
        <span className="adj-type-display">{config?.label || layer.adjustment.type}</span>
      </InputGroup>
      <InputGroup label="Blend Mode">
        <SelectRow
          value={layer.blendMode}
          options={[
            'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
            'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion',
            'hue', 'saturation', 'color', 'luminosity'
          ].map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
          onChange={(v) => onUpdate({ blendMode: v as any })}
          disabled={disabled}
        />
      </InputGroup>
      <InputGroup label="Opacity">
        <SliderRow
          value={layer.opacity * 100}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate({ opacity: v / 100 })}
          disabled={disabled}
        />
      </InputGroup>
      <InputGroup label="Fill Opacity">
        <SliderRow
          value={(layer.fillOpacity ?? 1) * 100}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate({ fillOpacity: v / 100 })}
          disabled={disabled}
        />
      </InputGroup>
      <div className="adj-mask-section">
        <h5>Masking</h5>
        <CheckboxRow
          label="Layer Mask Enabled"
          checked={layer.maskEnabled !== false}
          onChange={(v) => onUpdate({ maskEnabled: v })}
          disabled={disabled}
        />
        <CheckboxRow
          label="Clipped to Layer Below"
          checked={layer.adjustment.clipped || false}
          onChange={(v) => onUpdate({ adjustment: { ...layer.adjustment!, clipped: v } })}
          disabled={disabled}
        />
        <CheckboxRow
          label="Vector Mask Enabled"
          checked={layer.vectorMaskEnabled || false}
          onChange={(v) => onUpdate({ vectorMaskEnabled: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Main Adjustment Parameters Editor
function AdjustmentParamsEditor({ layer, onUpdate, disabled = false }: { layer: Layer; onUpdate: (params: AdjustmentParams) => void; disabled?: boolean }) {
  if (!layer.adjustment) return null;

  const config = ADJUSTMENT_CONFIG[layer.adjustment.type];
  const params = layer.adjustment.params;

  const handleParamChange = useCallback((key: string, val: any) => {
    onUpdate({ ...params, [key]: val });
  }, [params, onUpdate]);

  // Specialized editors for complex adjustments
  switch (layer.adjustment.type) {
    case 'curves':
      return (
        <CurvesEditor
          value={params.curves || { points: [{ x: 0, y: 0 }, { x: 255, y: 255 }], channel: 'rgb' }}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
    case 'levels':
      return (
        <LevelsEditor
          value={params.levels || [0, 1, 255, 0, 255]}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
    case 'hsl':
    case 'hue-saturation':
      return (
        <HSLEditor
          value={params.hsl || { master: { hue: 0, saturation: 0, lightness: 0 } }}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
    case 'color-balance':
      return (
        <ColorBalanceEditor
          value={params.colorBalance || { shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }, midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }, highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }, preserveLuminosity: true }}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
    case 'lr-split-toning':
    case 'split-toning':
      return (
        <SplitToningEditor
          value={params}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
    default:
      return (
        <GenericParamsEditor
          config={config}
          value={params}
          onChange={handleParamChange}
          disabled={disabled}
        />
      );
  }
}

export function AdjustmentLayersPanel({ 
  layers, 
  activeLayerId, 
  onLayerSelect, 
  onLayerUpdate, 
  onAddAdjustmentLayer,
  disabled = false 
}: {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string | null) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onAddAdjustmentLayer: (type: AdjustmentType) => void;
  disabled?: boolean;
}) {
  const [selectedType, setSelectedType] = useState<AdjustmentType | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const activeLayer = useMemo(() => layers.find(l => l.id === activeLayerId), [layers, activeLayerId]);
  const isAdjustmentLayer = activeLayer?.type === 'adjustment';

  const adjustmentLayers = useMemo(() => layers.filter(l => l.type === 'adjustment'), [layers]);

  const handleAddAdjustment = useCallback((type: AdjustmentType) => {
    onAddAdjustmentLayer(type);
    setShowTypeSelector(false);
    setSelectedType(null);
  }, [onAddAdjustmentLayer]);

  if (!isAdjustmentLayer && !showTypeSelector && adjustmentLayers.length === 0) {
    return (
      <div className="adj-panel empty">
        <div className="adj-empty-state">
          <div className="adj-empty-icon">☀</div>
          <h3>No Adjustment Layers</h3>
          <p>Create non-destructive adjustments that can be edited anytime</p>
          <button className="adj-create-btn" onClick={() => setShowTypeSelector(true)} disabled={disabled}>
            + Create Adjustment Layer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adj-panel" role="region" aria-label="Adjustment Layers">
      <div className="adj-panel-header">
        <h3>{isAdjustmentLayer ? 'Adjustment Layer' : 'Adjustment Layers'}</h3>
        {!isAdjustmentLayer && (
          <button 
            className="adj-add-btn" 
            onClick={() => setShowTypeSelector(true)}
            disabled={disabled}
            aria-label="Add adjustment layer"
          >
            +
          </button>
        )}
      </div>

      {showTypeSelector && (
        <div className="adj-type-selector-overlay" onClick={() => setShowTypeSelector(false)}>
          <div className="adj-type-selector-modal" onClick={(e) => e.stopPropagation()}>
            <AdjustmentTypeSelector onSelect={handleAddAdjustment} currentType={selectedType || undefined} />
            <button className="adj-close-btn" onClick={() => setShowTypeSelector(false)}>Done</button>
          </div>
        </div>
      )}

      {isAdjustmentLayer && (
        <>
          <AdjustmentLayerProperties
            layer={activeLayer!}
            onUpdate={(updates) => onLayerUpdate(activeLayerId!, updates)}
            disabled={disabled}
          />
          <div className="adj-params-section">
            <h4>Parameters</h4>
            <AdjustmentParamsEditor
              layer={activeLayer!}
              onUpdate={(params) => onLayerUpdate(activeLayerId!, { adjustment: { ...activeLayer!.adjustment!, params } })}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {!isAdjustmentLayer && adjustmentLayers.length > 0 && (
        <div className="adj-layer-list">
          <h4>Existing Adjustment Layers</h4>
          {adjustmentLayers.map(layer => (
            <div key={layer.id} className={`adj-layer-item ${activeLayerId === layer.id ? 'active' : ''}`} onClick={() => onLayerSelect(layer.id)}>
              <span className="adj-layer-type-icon">{ADJUSTMENT_CATEGORIES.tonal.types.includes(layer.adjustment!.type as any) ? '☀' : ADJUSTMENT_CATEGORIES.color.types.includes(layer.adjustment!.type as any) ? '🎨' : '✨'}</span>
              <span className="adj-layer-name">{layer.name}</span>
              {layer.adjustment?.clipped && <span className="adj-clipped-badge">⤷</span>}
              {layer.maskEnabled === false && <span className="adj-mask-disabled">🚫</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdjustmentLayersPanel;