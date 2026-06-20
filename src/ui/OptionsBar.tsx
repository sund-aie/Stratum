import React from 'react';
import { useStore, useDispatch } from '../core/state/store';
import { getToolById } from '../core/tools/ToolRegistry';
import type { ToolOption } from '../types';
import { toolEngine } from '../core/tools/ToolEngine';
import { ToolIcon, Icon } from './icons';

function normalizeOptions(opts?: Array<string | { value: string; label: string }>) {
  return (opts ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export const OptionsBar: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const tool = getToolById(state.activeTool);

  const getVal = (opt: ToolOption): unknown =>
    state.toolOptions[state.activeTool]?.[opt.id] ?? opt.default;

  const setVal = (opt: ToolOption, value: unknown) => {
    dispatch({ type: 'SET_TOOL_OPTION', payload: { toolId: state.activeTool, optionId: opt.id, value } });
    toolEngine.setToolOption(state.activeTool, opt.id, value); // keep ToolEngine in sync
  };

  return (
    <div className="options-bar">
      <div className="tool-preset-well bevel-in" title="Tool Presets">
        <ToolIcon toolId={state.activeTool} size={18} />
        <Icon name="chevronDown" size={10} />
      </div>
      <div className="opt-sep" />
      <span className="opt-label" style={{ fontWeight: 'bold' }}>{tool?.name ?? 'No tool'}</span>
      {tool && tool.options.length > 0 && <div className="opt-sep" />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {tool?.options.map((opt) => (
          <OptionControl key={opt.id} opt={opt} value={getVal(opt)} onChange={(v) => setVal(opt, v)} />
        ))}
      </div>
    </div>
  );
};

const OptionControl: React.FC<{ opt: ToolOption; value: unknown; onChange: (v: unknown) => void }> = ({
  opt,
  value,
  onChange,
}) => {
  switch (opt.type) {
    case 'slider': {
      const v = typeof value === 'number' ? value : Number(value) || 0;
      return (
        <div className="opt-group">
          <span className="opt-label">{opt.label}:</span>
          <input
            type="range"
            className="ps-range"
            style={{ width: 80 }}
            min={opt.min ?? 0}
            max={opt.max ?? 100}
            step={opt.step ?? 1}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <input
            type="number"
            className="ps-input"
            style={{ width: 44 }}
            min={opt.min}
            max={opt.max}
            step={opt.step ?? 1}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
    case 'checkbox': {
      const checked = !!value;
      return (
        <div className="opt-group">
          <div className="ps-checkbox" onClick={() => onChange(!checked)}>
            {checked && <Icon name="check" size={11} />}
          </div>
          <span className="opt-label">{opt.label}</span>
        </div>
      );
    }
    case 'dropdown': {
      const options = normalizeOptions(opt.options);
      return (
        <div className="opt-group">
          <span className="opt-label">{opt.label}:</span>
          <select className="ps-select" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case 'color': {
      const hex = typeof value === 'string' ? value : '#000000';
      return (
        <div className="opt-group">
          <span className="opt-label">{opt.label}:</span>
          <label
            className="bevel-out"
            style={{ width: 22, height: 18, background: hex, display: 'inline-block', cursor: 'pointer' }}
          >
            <input
              type="color"
              value={hex}
              onChange={(e) => onChange(e.target.value)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
          </label>
        </div>
      );
    }
    case 'text': {
      return (
        <div className="opt-group">
          <span className="opt-label">{opt.label}:</span>
          <input
            type="text"
            className="ps-input"
            style={{ width: 90 }}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }
    case 'button-group': {
      const buttons = opt.buttons ?? normalizeOptions(opt.options).map((o) => ({ value: o.value, label: o.label }));
      return (
        <div className="opt-group">
          <span className="opt-label">{opt.label}:</span>
          <div className="btn-group">
            {buttons.map((b) => (
              <div
                key={b.value}
                className={`seg${String(value) === b.value ? ' active' : ''}`}
                title={(b as any).tooltip ?? b.label}
                onClick={() => onChange(b.value)}
              >
                {b.label.slice(0, 3)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
};
