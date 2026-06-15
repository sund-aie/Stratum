/**
 * Unified Canvas - Color Picker Component
 * Advanced color picker with multiple modes: wheel, sliders, swatches, libraries
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Color } from '../types';
import { hsvToRgb, rgbToHsv, rgbToHsl, hslToRgb, rgbToLab, labToRgb } from '../utils/math';
import './ColorPicker.css';

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  onClose?: () => void;
  showAlpha?: boolean;
  presetColors?: Color[];
  mode?: 'wheel' | 'sliders' | 'swatches' | 'libraries';
  disabled?: boolean;
}

type ColorMode = 'hsv' | 'hsl' | 'rgb' | 'lab' | 'cmyk';

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  onClose,
  showAlpha = true,
  presetColors = [],
  mode: initialMode = 'wheel',
  disabled = false,
}) => {
  const [hsv, setHsv] = useState(() => rgbToHsv(color.r, color.g, color.b));
  const [colorMode, setColorMode] = useState<ColorMode>('hsv');
  const [activeTab, setActiveTab] = useState(initialMode);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLCanvasElement>(null);
  const alphaSliderRef = useRef<HTMLCanvasElement>(null);

  // Sync HSV from color prop
  useEffect(() => {
    const newHsv = rgbToHsv(color.r, color.g, color.b);
    setHsv(newHsv);
    updateInputs(newHsv, color.a);
  }, [color]);

  const updateInputs = useCallback((hsv: { h: number; s: number; v: number }, alpha: number) => {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    
    setInputValues({
      h: Math.round(hsv.h).toString(),
      s: Math.round(hsv.s).toString(),
      v: Math.round(hsv.v).toString(),
      r: Math.round(rgb.r).toString(),
      g: Math.round(rgb.g).toString(),
      b: Math.round(rgb.b).toString(),
      hslH: Math.round(hsl.h).toString(),
      hslS: Math.round(hsl.s).toString(),
      hslL: Math.round(hsl.l).toString(),
      labL: Math.round(lab.l).toString(),
      labA: Math.round(lab.a).toString(),
      labB: Math.round(lab.b_).toString(),
      a: Math.round(alpha * 100).toString(),
      hex: rgbToHex(rgb),
    });
  }, []);

  const handleHsvChange = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    onChange({ ...rgb, a: color.a });
    updateInputs(newHsv, color.a);
  }, [color.a, onChange, updateInputs]);

  const handleAlphaChange = useCallback((alpha: number) => {
    onChange({ ...color, a: alpha });
    updateInputs(hsv, alpha);
  }, [color, hsv, onChange, updateInputs]);

  const handleRgbChange = useCallback((r: number, g: number, b: number) => {
    const newHsv = rgbToHsv(r, g, b);
    setHsv(newHsv);
    onChange({ r, g, b, a: color.a });
    updateInputs(newHsv, color.a);
  }, [color.a, onChange, updateInputs]);

  const handleHexChange = useCallback((hex: string) => {
    const rgb = parseHex(hex);
    if (rgb) {
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHsv(newHsv);
      onChange({ ...rgb, a: color.a });
      updateInputs(newHsv, color.a);
    }
  }, [color.a, onChange, updateInputs]);

  const handleInputChange = useCallback((key: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setInputValues(prev => ({ ...prev, [key]: value }));
    
    switch (colorMode) {
      case 'hsv': {
        const newHsv = { ...hsv };
        if (key === 'h') newHsv.h = clamp(numValue, 0, 360);
        if (key === 's') newHsv.s = clamp(numValue, 0, 100);
        if (key === 'v') newHsv.v = clamp(numValue, 0, 100);
        handleHsvChange(newHsv);
        break;
      }
      case 'rgb': {
        const r = parseInt(inputValues.r) || 0;
        const g = parseInt(inputValues.g) || 0;
        const b = parseInt(inputValues.b) || 0;
        if (key === 'r') handleRgbChange(clamp(numValue, 0, 255), g, b);
        if (key === 'g') handleRgbChange(r, clamp(numValue, 0, 255), b);
        if (key === 'b') handleRgbChange(r, g, clamp(numValue, 0, 255));
        break;
      }
      case 'hsl': {
        const h = parseInt(inputValues.hslH) || 0;
        const s = parseInt(inputValues.hslS) || 0;
        const l = parseInt(inputValues.hslL) || 0;
        const rgb = hslToRgb(
          key === 'hslH' ? clamp(numValue, 0, 360) : h,
          key === 'hslS' ? clamp(numValue, 0, 100) : s,
          key === 'hslL' ? clamp(numValue, 0, 100) : l
        );
        handleRgbChange(rgb.r, rgb.g, rgb.b);
        break;
      }
    }
  }, [colorMode, hsv, inputValues, handleHsvChange, handleRgbChange]);

  // Draw color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const size = canvas.width = canvas.height = 200;
    const center = size / 2;
    const radius = center - 2;
    
    // Create wheel gradient
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= radius) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI + 180;
          const saturation = dist / radius * 100;
          const value = 100;
          
          const rgb = hsvToRgb(angle, saturation, value);
          const idx = (y * size + x) * 4;
          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          data[idx + 3] = 255;
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw selector
    const selectorRadius = hsv.s / 100 * radius;
    const selectorAngle = (hsv.h - 180) * Math.PI / 180;
    const sx = center + Math.cos(selectorAngle) * selectorRadius;
    const sy = center + Math.sin(selectorAngle) * selectorRadius;
    
    ctx.strokeStyle = hsv.v > 50 ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hsv.v > 50 ? '#fff' : '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.stroke();
  }, [hsv]);

  // Draw hue/saturation/value sliders
  useEffect(() => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width = 200;
    const height = canvas.height = 120;
    const sliderHeight = 30;
    const gap = 5;
    
    // Hue slider
    const hueGradient = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i <= 360; i += 30) {
      const rgb = hsvToRgb(i, 100, 100);
      hueGradient.addColorStop(i / 360, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
    }
    ctx.fillStyle = hueGradient;
    ctx.fillRect(0, 0, width, sliderHeight);
    
    // Hue selector
    const hx = hsv.h / 360 * width;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, -2);
    ctx.lineTo(hx, sliderHeight + 2);
    ctx.stroke();
    
    // Saturation slider
    const satY = sliderHeight + gap;
    const satGradient = ctx.createLinearGradient(0, satY, width, satY);
    const hsv100 = hsvToRgb(hsv.h, 100, 100);
    const hsv0 = hsvToRgb(hsv.h, 0, 100);
    satGradient.addColorStop(0, `rgb(${hsv0.r},${hsv0.g},${hsv0.b})`);
    satGradient.addColorStop(1, `rgb(${hsv100.r},${hsv100.g},${hsv100.b})`);
    ctx.fillStyle = satGradient;
    ctx.fillRect(0, satY, width, sliderHeight);
    
    // Saturation selector
    const sx = hsv.s / 100 * width;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(sx, satY - 2);
    ctx.lineTo(sx, satY + sliderHeight + 2);
    ctx.stroke();
    
    // Value slider
    const valY = satY + sliderHeight + gap;
    const valGradient = ctx.createLinearGradient(0, valY, width, valY);
    const hsvV100 = hsvToRgb(hsv.h, hsv.s, 100);
    valGradient.addColorStop(0, '#000');
    valGradient.addColorStop(1, `rgb(${hsvV100.r},${hsvV100.g},${hsvV100.b})`);
    ctx.fillStyle = valGradient;
    ctx.fillRect(0, valY, width, sliderHeight);
    
    // Value selector
    const vx = hsv.v / 100 * width;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(vx, valY - 2);
    ctx.lineTo(vx, valY + sliderHeight + 2);
    ctx.stroke();
  }, [hsv]);

  // Draw alpha slider
  useEffect(() => {
    if (!showAlpha) return;
    const canvas = alphaSliderRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width = 200;
    const height = canvas.height = 20;
    
    // Checkerboard
    const squareSize = 10;
    for (let x = 0; x < width; x += squareSize) {
      for (let y = 0; y < height; y += squareSize) {
        const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#ccc' : '#fff';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
    
    // Color gradient
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Alpha selector
    const ax = color.a * width;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, -2);
    ctx.lineTo(ax, height + 2);
    ctx.stroke();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, -2);
    ctx.lineTo(ax, height + 2);
    ctx.stroke();
  }, [hsv, color.a, showAlpha]);

  const handleWheelClick = useCallback((e: React.MouseEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const center = rect.width / 2;
    const dx = e.clientX - rect.left - center;
    const dy = e.clientY - rect.top - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = center - 2;
    
    if (dist <= radius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 180;
      const saturation = Math.min(dist / radius, 1) * 100;
      handleHsvChange({ h: angle, s: saturation, v: hsv.v });
    }
  }, [hsv.v, handleHsvChange]);

  const handleSliderClick = useCallback((e: React.MouseEvent) => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = 200;
    const sliderHeight = 30;
    const gap = 5;
    
    if (y >= 0 && y < sliderHeight) {
      // Hue
      handleHsvChange({ ...hsv, h: Math.min(x / width, 1) * 360 });
    } else if (y >= sliderHeight + gap && y < sliderHeight * 2 + gap) {
      // Saturation
      handleHsvChange({ ...hsv, s: Math.min(x / width, 1) * 100 });
    } else if (y >= sliderHeight * 2 + gap * 2 && y < sliderHeight * 3 + gap * 2) {
      // Value
      handleHsvChange({ ...hsv, v: Math.min(x / width, 1) * 100 });
    }
  }, [hsv, handleHsvChange]);

  const handleAlphaClick = useCallback((e: React.MouseEvent) => {
    if (!showAlpha) return;
    const canvas = alphaSliderRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = 200;
    handleAlphaChange(Math.min(x / width, 1));
  }, [showAlpha, handleAlphaChange]);

  const handlePresetClick = useCallback((preset: Color) => {
    const newHsv = rgbToHsv(preset.r, preset.g, preset.b);
    setHsv(newHsv);
    onChange(preset);
    updateInputs(newHsv, preset.a);
  }, [onChange, updateInputs]);

  const defaultPresets = useMemo(() => [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
    { r: 255, g: 0, b: 0, a: 1 },
    { r: 0, g: 255, b: 0, a: 1 },
    { r: 0, g: 0, b: 255, a: 1 },
    { r: 255, g: 255, b: 0, a: 1 },
    { r: 255, g: 0, b: 255, a: 1 },
    { r: 0, g: 255, b: 255, a: 1 },
    { r: 128, g: 128, b: 128, a: 1 },
    { r: 255, g: 128, b: 0, a: 1 },
    { r: 128, g: 0, b: 255, a: 1 },
    { r: 0, g: 128, b: 255, a: 1 },
  ], []);

  return (
    <div className="color-picker" role="dialog" aria-label="Color Picker">
      <div className="color-picker-tabs">
        <button
          className={`color-picker-tab ${activeTab === 'wheel' ? 'active' : ''}`}
          onClick={() => setActiveTab('wheel')}
          disabled={disabled}
        >
          Wheel
        </button>
        <button
          className={`color-picker-tab ${activeTab === 'sliders' ? 'active' : ''}`}
          onClick={() => setActiveTab('sliders')}
          disabled={disabled}
        >
          Sliders
        </button>
        <button
          className={`color-picker-tab ${activeTab === 'swatches' ? 'active' : ''}`}
          onClick={() => setActiveTab('swatches')}
          disabled={disabled}
        >
          Swatches
        </button>
      </div>

      <div className="color-picker-content">
        {activeTab === 'wheel' && (
          <div className="color-picker-wheel">
            <canvas
              ref={wheelRef}
              width={200}
              height={200}
              onMouseDown={handleWheelClick}
              onMouseMove={(e) => e.buttons === 1 && handleWheelClick(e)}
              className="color-wheel-canvas"
              aria-label="Hue-Saturation wheel"
            />
            <canvas
              ref={sliderRef}
              width={200}
              height={120}
              onMouseDown={handleSliderClick}
              onMouseMove={(e) => e.buttons === 1 && handleSliderClick(e)}
              className="color-sliders-canvas"
              aria-label="Hue, Saturation, Value sliders"
            />
            {showAlpha && (
              <canvas
                ref={alphaSliderRef}
                width={200}
                height={20}
                onMouseDown={handleAlphaClick}
                onMouseMove={(e) => e.buttons === 1 && handleAlphaClick(e)}
                className="color-alpha-canvas"
                aria-label="Opacity slider"
              />
            )}
          </div>
        )}

        {activeTab === 'sliders' && (
          <div className="color-picker-sliders">
            <div className="color-mode-selector">
              <button
                className={colorMode === 'hsv' ? 'active' : ''}
                onClick={() => setColorMode('hsv')}
                disabled={disabled}
              >HSV</button>
              <button
                className={colorMode === 'hsl' ? 'active' : ''}
                onClick={() => setColorMode('hsl')}
                disabled={disabled}
              >HSL</button>
              <button
                className={colorMode === 'rgb' ? 'active' : ''}
                onClick={() => setColorMode('rgb')}
                disabled={disabled}
              >RGB</button>
              <button
                className={colorMode === 'lab' ? 'active' : ''}
                onClick={() => setColorMode('lab')}
                disabled={disabled}
              >Lab</button>
            </div>

            <div className="color-inputs">
              {colorMode === 'hsv' && (
                <>
                  <ColorInput label="H" value={inputValues.h} onChange={(v) => handleInputChange('h', v)} min={0} max={360} step={1} disabled={disabled} />
                  <ColorInput label="S" value={inputValues.s} onChange={(v) => handleInputChange('s', v)} min={0} max={100} step={1} disabled={disabled} />
                  <ColorInput label="V" value={inputValues.v} onChange={(v) => handleInputChange('v', v)} min={0} max={100} step={1} disabled={disabled} />
                </>
              )}
              {colorMode === 'hsl' && (
                <>
                  <ColorInput label="H" value={inputValues.hslH} onChange={(v) => handleInputChange('hslH', v)} min={0} max={360} step={1} disabled={disabled} />
                  <ColorInput label="S" value={inputValues.hslS} onChange={(v) => handleInputChange('hslS', v)} min={0} max={100} step={1} disabled={disabled} />
                  <ColorInput label="L" value={inputValues.hslL} onChange={(v) => handleInputChange('hslL', v)} min={0} max={100} step={1} disabled={disabled} />
                </>
              )}
              {colorMode === 'rgb' && (
                <>
                  <ColorInput label="R" value={inputValues.r} onChange={(v) => handleInputChange('r', v)} min={0} max={255} step={1} disabled={disabled} />
                  <ColorInput label="G" value={inputValues.g} onChange={(v) => handleInputChange('g', v)} min={0} max={255} step={1} disabled={disabled} />
                  <ColorInput label="B" value={inputValues.b} onChange={(v) => handleInputChange('b', v)} min={0} max={255} step={1} disabled={disabled} />
                </>
              )}
              {colorMode === 'lab' && (
                <>
                  <ColorInput label="L" value={inputValues.labL} onChange={(v) => handleInputChange('labL', v)} min={0} max={100} step={1} disabled={disabled} />
                  <ColorInput label="A" value={inputValues.labA} onChange={(v) => handleInputChange('labA', v)} min={-128} max={127} step={1} disabled={disabled} />
                  <ColorInput label="B" value={inputValues.labB} onChange={(v) => handleInputChange('labB', v)} min={-128} max={127} step={1} disabled={disabled} />
                </>
              )}
              {showAlpha && (
                <ColorInput label="A" value={inputValues.a} onChange={(v) => handleInputChange('a', v)} min={0} max={100} step={1} disabled={disabled} />
              )}
              <ColorInput 
                label="#" 
                value={inputValues.hex} 
                onChange={handleHexChange} 
                type="text" 
                maxLength={6}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {activeTab === 'swatches' && (
          <div className="color-picker-swatches">
            <div className="swatch-group">
              <h4>Recent Colors</h4>
              <div className="swatch-grid">
                {[color, ...presetColors.slice(0, 11)].map((c, i) => (
                  <button
                    key={i}
                    className="color-swatch"
                    style={{ backgroundColor: `rgba(${c.r},${c.g},${c.b},${c.a})` }}
                    onClick={() => handlePresetClick(c)}
                    disabled={disabled}
                    title={`R:${c.r} G:${c.g} B:${c.b}`}
                  />
                ))}
              </div>
            </div>
            <div className="swatch-group">
              <h4>Defaults</h4>
              <div className="swatch-grid">
                {defaultPresets.map((c, i) => (
                  <button
                    key={i}
                    className="color-swatch"
                    style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                    onClick={() => handlePresetClick(c)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="color-picker-preview">
        <div 
          className="color-preview-current"
          style={{ backgroundColor: `rgba(${color.r},${color.g},${color.b},${color.a})` }}
        />
        <div 
          className="color-preview-previous"
          style={{ backgroundColor: `rgba(${ColorToRgb(color).r},${ColorToRgb(color).g},${ColorToRgb(color).b},1)` }}
        />
      </div>

      {onClose && (
        <div className="color-picker-actions">
          <button onClick={onClose} className="color-picker-btn primary">OK</button>
          <button onClick={onClose} className="color-picker-btn">Cancel</button>
        </div>
      )}
    </div>
  );
};

function ColorInput({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step, 
  type = 'number',
  maxLength,
  disabled = false 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div className="color-input-row">
      <label className="color-input-label">{label}</label>
      {type === 'number' ? (
        <input
          type="number"
          className="color-input"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (maxLength && val.length > maxLength) return;
            if (min !== undefined && parseInt(val) < min) return;
            if (max !== undefined && parseInt(val) > max) return;
            onChange(val);
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
      ) : (
        <input
          type="text"
          className="color-input color-input-hex"
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, maxLength);
            onChange(val);
          }}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function parseHex(hex: string): Color | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b, a: 1 };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ColorToRgb(color: Color): { r: number; g: number; b: number } {
  return { r: color.r, g: color.g, b: color.b };
}

export default ColorPicker;