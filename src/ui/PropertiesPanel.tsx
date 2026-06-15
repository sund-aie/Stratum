/**
 * Unified Canvas - Properties Panel Component
 * Context-aware properties for active tool/layer
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { Layer, LayerType, ToolType, ToolOptions, Color, BlendMode } from '../types';
import { ADJUSTMENT_CONFIG } from '../engine/Adjustments';
import { BLEND_MODES } from '../constants';
import { LayerStylesPanel } from './LayerStylesPanel';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  activeTool: ToolType;
  toolOptions: ToolOptions;
  onToolOptionsChange: (options: Partial<ToolOptions>) => void;
  activeLayer: Layer | null;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  disabled?: boolean;
}

const toolLabels: Record<ToolType, string> = {
  'select': 'Selection Tool',
  'move': 'Move Tool',
  'marquee-rect': 'Rectangular Marquee',
  'marquee-ellipse': 'Elliptical Marquee',
  'marquee-single-row': 'Single Row Marquee',
  'marquee-single-col': 'Single Column Marquee',
  'lasso': 'Lasso Tool',
  'lasso-polygon': 'Polygonal Lasso',
  'lasso-magnetic': 'Magnetic Lasso',
  'magic-wand': 'Magic Wand',
  'object-select': 'Object Selection',
  'crop': 'Crop Tool',
  'slice': 'Slice Tool',
  'slice-select': 'Slice Select',
  'eyedropper': 'Eyedropper',
  'color-sampler': 'Color Sampler',
  'ruler': 'Ruler',
  'note': 'Note',
  'count': 'Count',
  'brush': 'Brush Tool',
  'pencil': 'Pencil Tool',
  'color-replacement': 'Color Replacement',
  'mixer-brush': 'Mixer Brush',
  'eraser': 'Eraser Tool',
  'background-eraser': 'Background Eraser',
  'magic-eraser': 'Magic Eraser',
  'fill': 'Fill Tool',
  'gradient': 'Gradient Tool',
  'paint-bucket': 'Paint Bucket',
  'blur': 'Blur Tool',
  'sharpen': 'Sharpen Tool',
  'smudge': 'Smudge Tool',
  'dodge': 'Dodge Tool',
  'burn': 'Burn Tool',
  'sponge': 'Sponge Tool',
  'pen': 'Pen Tool',
  'curvature-pen': 'Curvature Pen',
  'freeform-pen': 'Freeform Pen',
  'add-anchor': 'Add Anchor Point',
  'delete-anchor': 'Delete Anchor Point',
  'convert-anchor': 'Convert Anchor Point',
  'horizontal-type': 'Horizontal Type',
  'vertical-type': 'Vertical Type',
  'horizontal-type-mask': 'Horizontal Type Mask',
  'vertical-type-mask': 'Vertical Type Mask',
  'path-select': 'Path Selection',
  'direct-select': 'Direct Selection',
  'rectangle': 'Rectangle Tool',
  'ellipse': 'Ellipse Tool',
  'triangle': 'Triangle Tool',
  'polygon': 'Polygon Tool',
  'line': 'Line Tool',
  'custom-shape': 'Custom Shape',
  'hand': 'Hand Tool',
  'rotate-view': 'Rotate View',
  'zoom': 'Zoom Tool',
};

function InputGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`properties-input-group ${className}`}>
      <label className="properties-label">{label}</label>
      <div className="properties-input-wrapper">{children}</div>
    </div>
  );
}

function Slider({ value, min, max, step, onChange, unit = '', disabled = false, showValue = true }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
  showValue?: boolean;
}) {
  return (
    <div className="properties-slider-wrapper">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="properties-slider"
      />
      {showValue && (
        <span className="properties-slider-value">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      )}
    </div>
  );
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  activeTool,
  toolOptions,
  onToolOptionsChange,
  activeLayer,
  onLayerUpdate,
  disabled = false,
}) => {
  const brushProps = useMemo(() => {
    if (!['brush', 'pencil', 'eraser', 'color-replacement', 'mixer-brush', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'sponge'].includes(activeTool)) {
      return null;
    }
    return {
      size: toolOptions.brushSize,
      hardness: toolOptions.brushHardness,
      opacity: toolOptions.brushOpacity,
      flow: toolOptions.brushFlow,
      spacing: toolOptions.brushSpacing,
      blendMode: toolOptions.brushBlendMode,
    };
  }, [activeTool, toolOptions]);

  const textProps = useMemo(() => {
    if (!['horizontal-type', 'vertical-type', 'horizontal-type-mask', 'vertical-type-mask'].includes(activeTool)) {
      return null;
    }
    if (!activeLayer) return {};
    return {
      fontFamily: toolOptions.fontFamily,
      fontSize: toolOptions.fontSize,
      fontWeight: toolOptions.fontWeight,
      fontStyle: toolOptions.fontStyle,
      textAlign: toolOptions.textAlign,
      leading: toolOptions.leading,
      tracking: toolOptions.tracking,
      color: toolOptions.foregroundColor,
      text: activeLayer.data.text?.content || '',
    };
  }, [activeTool, toolOptions, activeLayer]);

  const shapeProps = useMemo(() => {
    if (!['rectangle', 'ellipse', 'triangle', 'polygon', 'line', 'custom-shape'].includes(activeTool)) {
      return null;
    }
    return {
      fill: toolOptions.shapeFill,
      stroke: toolOptions.shapeStroke,
      strokeWidth: toolOptions.shapeStrokeWidth,
      radius: toolOptions.shapeRadius,
      sides: toolOptions.shapeSides,
    };
  }, [activeTool, toolOptions]);

  const marqueeProps = useMemo(() => {
    if (!['marquee-rect', 'marquee-ellipse', 'marquee-single-row', 'marquee-single-col'].includes(activeTool)) {
      return null;
    }
    return {
      feather: toolOptions.marqueeFeather,
      style: toolOptions.marqueeStyle,
      width: toolOptions.marqueeWidth,
      height: toolOptions.marqueeHeight,
    };
  }, [activeTool, toolOptions]);

  const lassoProps = useMemo(() => {
    if (!['lasso', 'lasso-polygon', 'lasso-magnetic'].includes(activeTool)) {
      return null;
    }
    return {
      feather: toolOptions.lassoFeather,
      antiAlias: toolOptions.lassoAntiAlias,
      width: toolOptions.magneticWidth,
      contrast: toolOptions.magneticContrast,
      frequency: toolOptions.magneticFrequency,
    };
  }, [activeTool, toolOptions]);

  const magicWandProps = useMemo(() => {
    if (activeTool !== 'magic-wand') return null;
    return {
      tolerance: toolOptions.magicWandTolerance,
      contiguous: toolOptions.magicWandContiguous,
      sampleAllLayers: toolOptions.magicWandSampleAllLayers,
    };
  }, [activeTool, toolOptions]);

  const penProps = useMemo(() => {
    if (!['pen', 'curvature-pen', 'freeform-pen', 'add-anchor', 'delete-anchor', 'convert-anchor'].includes(activeTool)) {
      return null;
    }
    return {
      pathOperation: toolOptions.penPathOperation,
      rubberBand: toolOptions.penRubberBand,
    };
  }, [activeTool, toolOptions]);

  const layerProps = useMemo(() => {
    if (!activeLayer) return null;
    return {
      name: activeLayer.name,
      visible: activeLayer.visible,
      opacity: activeLayer.opacity,
      blendMode: activeLayer.blendMode,
      locked: activeLayer.locked,
      fillOpacity: activeLayer.fillOpacity,
      // Masks
      hasMask: !!activeLayer.mask,
      maskEnabled: activeLayer.maskEnabled,
      maskDensity: activeLayer.maskDensity,
      maskFeather: activeLayer.maskFeather,
    };
  }, [activeLayer]);

  const adjustmentProps = useMemo(() => {
    if (!activeLayer || activeLayer.type !== 'adjustment' || !activeLayer.adjustment) {
      return null;
    }
    const config = ADJUSTMENT_CONFIG[activeLayer.adjustment.type];
    return {
      type: activeLayer.adjustment.type,
      label: config?.label || 'Adjustment',
      params: activeLayer.adjustment.params,
      config: config?.params || [],
    };
  }, [activeLayer]);

  const handleToolOptionChange = useCallback((key: string, value: any) => {
    onToolOptionsChange({ [key]: value });
  }, [onToolOptionsChange]);

  const handleLayerUpdate = useCallback((key: string, value: any) => {
    if (activeLayer) {
      onLayerUpdate(activeLayer.id, { [key]: value });
    }
  }, [activeLayer, onLayerUpdate]);

  const handleAdjustmentParamChange = useCallback((paramKey: string, value: any) => {
    if (activeLayer && activeLayer.adjustment) {
      const newParams = { ...activeLayer.adjustment.params, [paramKey]: value };
      onLayerUpdate(activeLayer.id, { adjustment: { ...activeLayer.adjustment, params: newParams } });
    }
  }, [activeLayer, onLayerUpdate]);

  if (!activeTool && !activeLayer) {
    return (
      <div className="properties-panel">
        <div className="properties-empty">Select a tool or layer to see properties</div>
      </div>
    );
  }

  return (
    <div className="properties-panel" role="region" aria-label="Properties">
      {activeTool && (
        <div className="properties-section">
          <h3 className="properties-section-title">
            <span className="tool-icon">{getToolIcon(activeTool)}</span>
            {toolLabels[activeTool]}
          </h3>
          
          {brushProps && (
            <div className="properties-grid">
              <InputGroup label="Size">
                <Slider
                  value={brushProps.size}
                  min={1}
                  max={5000}
                  step={1}
                  unit="px"
                  onChange={(v) => handleToolOptionChange('brushSize', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Hardness">
                <Slider
                  value={brushProps.hardness * 100}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => handleToolOptionChange('brushHardness', v / 100)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Opacity">
                <Slider
                  value={brushProps.opacity * 100}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => handleToolOptionChange('brushOpacity', v / 100)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Flow">
                <Slider
                  value={brushProps.flow * 100}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => handleToolOptionChange('brushFlow', v / 100)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Spacing">
                <Slider
                  value={brushProps.spacing}
                  min={1}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => handleToolOptionChange('brushSpacing', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Blend Mode">
                <select
                  className="properties-select"
                  value={brushProps.blendMode}
                  onChange={(e) => handleToolOptionChange('brushBlendMode', e.target.value)}
                  disabled={disabled}
                >
                  {BLEND_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                  ))}
                </select>
              </InputGroup>
            </div>
          )}

          {textProps && (
            <div className="properties-grid">
              <InputGroup label="Font Family">
                <select
                  className="properties-select"
                  value={textProps.fontFamily}
                  onChange={(e) => handleToolOptionChange('fontFamily', e.target.value)}
                  disabled={disabled}
                >
                  {['Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 
                    'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </InputGroup>
              <InputGroup label="Font Size">
                <Slider
                  value={textProps.fontSize}
                  min={6}
                  max={200}
                  step={1}
                  unit="pt"
                  onChange={(v) => handleToolOptionChange('fontSize', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Weight">
                <select
                  className="properties-select"
                  value={textProps.fontWeight}
                  onChange={(e) => handleToolOptionChange('fontWeight', e.target.value)}
                  disabled={disabled}
                >
                  {['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </InputGroup>
              <InputGroup label="Style">
                <select
                  className="properties-select"
                  value={textProps.fontStyle}
                  onChange={(e) => handleToolOptionChange('fontStyle', e.target.value)}
                  disabled={disabled}
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                  <option value="oblique">Oblique</option>
                </select>
              </InputGroup>
              <InputGroup label="Align">
                <select
                  className="properties-select"
                  value={textProps.textAlign}
                  onChange={(e) => handleToolOptionChange('textAlign', e.target.value)}
                  disabled={disabled}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </InputGroup>
              <InputGroup label="Leading">
                <Slider
                  value={textProps.leading}
                  min={0}
                  max={200}
                  step={1}
                  unit="pt"
                  onChange={(v) => handleToolOptionChange('leading', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Tracking">
                <Slider
                  value={textProps.tracking}
                  min={-200}
                  max={200}
                  step={1}
                  onChange={(v) => handleToolOptionChange('tracking', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Color">
                <ColorPicker color={textProps.color} onChange={(c) => handleToolOptionChange('foregroundColor', c)} />
              </InputGroup>
            </div>
          )}

          {shapeProps && (
            <div className="properties-grid">
              <InputGroup label="Fill">
                <ColorPicker color={shapeProps.fill} onChange={(c) => handleToolOptionChange('shapeFill', c)} />
              </InputGroup>
              <InputGroup label="Stroke">
                <ColorPicker color={shapeProps.stroke} onChange={(c) => handleToolOptionChange('shapeStroke', c)} />
              </InputGroup>
              <InputGroup label="Stroke Width">
                <Slider
                  value={shapeProps.strokeWidth}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="px"
                  onChange={(v) => handleToolOptionChange('shapeStrokeWidth', v)}
                  disabled={disabled}
                />
              </InputGroup>
              {activeTool === 'rectangle' && (
                <InputGroup label="Corner Radius">
                  <Slider
                    value={shapeProps.radius}
                    min={0}
                    max={500}
                    step={1}
                    unit="px"
                    onChange={(v) => handleToolOptionChange('shapeRadius', v)}
                    disabled={disabled}
                  />
                </InputGroup>
              )}
              {activeTool === 'polygon' && (
                <InputGroup label="Sides">
                  <Slider
                    value={shapeProps.sides}
                    min={3}
                    max={20}
                    step={1}
                    onChange={(v) => handleToolOptionChange('shapeSides', v)}
                    disabled={disabled}
                  />
                </InputGroup>
              )}
            </div>
          )}

          {marqueeProps && (
            <div className="properties-grid">
              <InputGroup label="Feather">
                <Slider
                  value={marqueeProps.feather}
                  min={0}
                  max={250}
                  step={0.5}
                  unit="px"
                  onChange={(v) => handleToolOptionChange('marqueeFeather', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Style">
                <select
                  className="properties-select"
                  value={marqueeProps.style}
                  onChange={(e) => handleToolOptionChange('marqueeStyle', e.target.value)}
                  disabled={disabled}
                >
                  <option value="normal">Normal</option>
                  <option value="fixed-ratio">Fixed Ratio</option>
                  <option value="fixed-size">Fixed Size</option>
                </select>
              </InputGroup>
              {marqueeProps.style === 'fixed-size' && (
                <>
                  <InputGroup label="Width">
                    <input
                      type="number"
                      className="properties-input"
                      value={marqueeProps.width}
                      onChange={(e) => handleToolOptionChange('marqueeWidth', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                    />
                  </InputGroup>
                  <InputGroup label="Height">
                    <input
                      type="number"
                      className="properties-input"
                      value={marqueeProps.height}
                      onChange={(e) => handleToolOptionChange('marqueeHeight', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                    />
                  </InputGroup>
                </>
              )}
            </div>
          )}

          {lassoProps && (
            <div className="properties-grid">
              <InputGroup label="Feather">
                <Slider
                  value={lassoProps.feather}
                  min={0}
                  max={250}
                  step={0.5}
                  unit="px"
                  onChange={(v) => handleToolOptionChange('lassoFeather', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Anti-alias">
                <label className="properties-checkbox">
                  <input
                    type="checkbox"
                    checked={lassoProps.antiAlias}
                    onChange={(e) => handleToolOptionChange('lassoAntiAlias', e.target.checked)}
                    disabled={disabled}
                  />
                  <span>Anti-alias</span>
                </label>
              </InputGroup>
              {activeTool === 'lasso-magnetic' && (
                <>
                  <InputGroup label="Width">
                    <Slider
                      value={lassoProps.width}
                      min={1}
                      max={256}
                      step={1}
                      unit="px"
                      onChange={(v) => handleToolOptionChange('magneticWidth', v)}
                      disabled={disabled}
                    />
                  </InputGroup>
                  <InputGroup label="Contrast">
                    <Slider
                      value={lassoProps.contrast}
                      min={1}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={(v) => handleToolOptionChange('magneticContrast', v)}
                      disabled={disabled}
                    />
                  </InputGroup>
                  <InputGroup label="Frequency">
                    <Slider
                      value={lassoProps.frequency}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(v) => handleToolOptionChange('magneticFrequency', v)}
                      disabled={disabled}
                    />
                  </InputGroup>
                </>
              )}
            </div>
          )}

          {magicWandProps && (
            <div className="properties-grid">
              <InputGroup label="Tolerance">
                <Slider
                  value={magicWandProps.tolerance}
                  min={0}
                  max={255}
                  step={1}
                  onChange={(v) => handleToolOptionChange('magicWandTolerance', v)}
                  disabled={disabled}
                />
              </InputGroup>
              <InputGroup label="Contiguous">
                <label className="properties-checkbox">
                  <input
                    type="checkbox"
                    checked={magicWandProps.contiguous}
                    onChange={(e) => handleToolOptionChange('magicWandContiguous', e.target.checked)}
                    disabled={disabled}
                  />
                  <span>Contiguous</span>
                </label>
              </InputGroup>
              <InputGroup label="Sample All Layers">
                <label className="properties-checkbox">
                  <input
                    type="checkbox"
                    checked={magicWandProps.sampleAllLayers}
                    onChange={(e) => handleToolOptionChange('magicWandSampleAllLayers', e.target.checked)}
                    disabled={disabled}
                  />
                  <span>Sample All Layers</span>
                </label>
              </InputGroup>
            </div>
          )}

          {penProps && (
            <div className="properties-grid">
              <InputGroup label="Path Operation">
                <select
                  className="properties-select"
                  value={penProps.pathOperation}
                  onChange={(e) => handleToolOptionChange('penPathOperation', e.target.value)}
                  disabled={disabled}
                >
                  <option value="combine">Combine Shapes</option>
                  <option value="subtract">Subtract Front Shape</option>
                  <option value="intersect">Intersect Shapes</option>
                  <option value="exclude">Exclude Overlapping</option>
                </select>
              </InputGroup>
              <InputGroup label="Rubber Band">
                <label className="properties-checkbox">
                  <input
                    type="checkbox"
                    checked={penProps.rubberBand}
                    onChange={(e) => handleToolOptionChange('penRubberBand', e.target.checked)}
                    disabled={disabled}
                  />
                  <span>Rubber Band Preview</span>
                </label>
              </InputGroup>
            </div>
          )}
        </div>
      )}

      {layerProps && (
        <div className="properties-section">
          <h3 className="properties-section-title">Layer Properties</h3>
          <div className="properties-grid">
            <InputGroup label="Name">
              <input
                type="text"
                className="properties-input"
                value={layerProps.name}
                onChange={(e) => handleLayerUpdate('name', e.target.value)}
                disabled={disabled}
              />
            </InputGroup>
            <InputGroup label="Opacity">
              <Slider
                value={layerProps.opacity * 100}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => handleLayerUpdate('opacity', v / 100)}
                disabled={disabled}
              />
            </InputGroup>
            <InputGroup label="Fill Opacity">
              <Slider
                value={layerProps.fillOpacity * 100}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => handleLayerUpdate('fillOpacity', v / 100)}
                disabled={disabled}
              />
            </InputGroup>
            <InputGroup label="Blend Mode">
              <select
                className="properties-select"
                value={layerProps.blendMode}
                onChange={(e) => handleLayerUpdate('blendMode', e.target.value)}
                disabled={disabled}
              >
                {BLEND_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                ))}
              </select>
            </InputGroup>
            <InputGroup label="Visible">
              <label className="properties-checkbox">
                <input
                  type="checkbox"
                  checked={layerProps.visible}
                  onChange={(e) => handleLayerUpdate('visible', e.target.checked)}
                  disabled={disabled}
                />
                <span>Visible</span>
              </label>
            </InputGroup>
            <InputGroup label="Locked">
              <label className="properties-checkbox">
                <input
                  type="checkbox"
                  checked={layerProps.locked}
                  onChange={(e) => handleLayerUpdate('locked', e.target.checked)}
                  disabled={disabled}
                />
                <span>Locked</span>
              </label>
            </InputGroup>
          </div>

          {/* Mask properties */}
          {layerProps.hasMask && (
            <>
              <div className="properties-divider" />
              <div className="properties-grid">
                <InputGroup label="Mask Enabled">
                  <label className="properties-checkbox">
                    <input
                      type="checkbox"
                      checked={layerProps.maskEnabled}
                      onChange={(e) => handleLayerUpdate('maskEnabled', e.target.checked)}
                      disabled={disabled}
                    />
                    <span>Enabled</span>
                  </label>
                </InputGroup>
                <InputGroup label="Density">
                  <Slider
                    value={layerProps.maskDensity * 100}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(v) => handleLayerUpdate('maskDensity', v / 100)}
                    disabled={disabled}
                  />
                </InputGroup>
                <InputGroup label="Feather">
                  <Slider
                    value={layerProps.maskFeather}
                    min={0}
                    max={250}
                    step={0.5}
                    unit="px"
                    onChange={(v) => handleLayerUpdate('maskFeather', v)}
                    disabled={disabled}
                  />
                </InputGroup>
              </div>
            </>
          )}
        </div>
      )}

      {/* Layer Styles */}
      {layerProps && !layerProps.isAdjustment && !layerProps.isGroup && (
        <div className="properties-section">
          <h3 className="properties-section-title">✨ Layer Styles</h3>
          <LayerStylesPanel
            layer={activeLayer}
            onStylesChange={(styles) => handleLayerUpdate('styles', styles)}
            disabled={disabled}
          />
        </div>
      )}

      {adjustmentProps && (
        <div className="properties-section">
          <h3 className="properties-section-title">
            <span>{ADJUSTMENT_ICONS[adjustmentProps.type]}</span>
            {adjustmentProps.label}
          </h3>
          <div className="properties-grid">
            {adjustmentProps.config.map(param => (
              <InputGroup key={param.key} label={param.label}>
                {param.type === 'slider' && (
                  <Slider
                    value={adjustmentProps.params[param.key] || 0}
                    min={param.min || -100}
                    max={param.max || 100}
                    step={param.step || 1}
                    onChange={(v) => handleAdjustmentParamChange(param.key, v)}
                    disabled={disabled}
                  />
                )}
                {param.type === 'curves' && (
                  <div className="properties-curves-placeholder">
                    Curves Editor (click to open)
                  </div>
                )}
                {param.type === 'levels' && (
                  <div className="properties-levels-placeholder">
                    Levels Editor (click to open)
                  </div>
                )}
                {param.type === 'color-balance' && (
                  <div className="properties-color-balance-placeholder">
                    Color Balance Editor (click to open)
                  </div>
                )}
              </InputGroup>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function ColorPicker({ color, onChange }: { color: Color; onChange: (color: Color) => void }) {
  return (
    <div className="properties-color-picker">
      <input
        type="color"
        value={`#${colorToHex({ r: color.r, g: color.g, b: color.b, a: 1 })}`}
        onChange={(e) => {
          const hex = e.target.value;
          const rgb = parseInt(hex.slice(1), 16);
          onChange({ r: (rgb >> 16) & 255, g: (rgb >> 8) & 255, b: rgb & 255, a: color.a });
        }}
        className="properties-color-input"
      />
      <span className="properties-color-value">
        {color.r}, {color.g}, {color.b}
      </span>
    </div>
  );
}

function colorToHex(color: Color): string {
  return ((1 << 24) + (Math.round(color.r) << 16) + (Math.round(color.g) << 8) + Math.round(color.b)).toString(16).slice(1);
}

const ADJUSTMENT_ICONS: Record<string, string> = {
  'brightness-contrast': '☀',
  'curves': '⤴',
  'levels': '▮',
  'hsl': '🎨',
  'exposure': '📷',
  'vibrance': '✨',
  'color-balance': '⚖',
};

function getToolIcon(tool: ToolType): string {
  const icons: Record<ToolType, string> = {
    'select': '▢', 'move': '⤢',
    'marquee-rect': '⬜', 'marquee-ellipse': '⭘', 'marquee-single-row': '━━', 'marquee-single-col': '┃┃',
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
}

export default PropertiesPanel;