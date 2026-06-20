import React, { useState, useRef, useEffect } from 'react';
import type { RGBAColor } from '../types';
import { rgbToHex, hexToRgb, rgbToHsv, hsvToRgb, rgbaToCss } from '../core/color/color';

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }> = ({
  title,
  onClose,
  children,
  footer,
}) => (
  <div className="modal-scrim" onMouseDown={onClose}>
    <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
      <div className="dialog-title">{title}</div>
      <div className="dialog-body">{children}</div>
      <div className="dialog-footer">{footer}</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
export const NewDocumentDialog: React.FC<{ onCancel: () => void; onCreate: (w: number, h: number, bg: 'white' | 'transparent') => void }> = ({
  onCancel,
  onCreate,
}) => {
  const [w, setW] = useState(800);
  const [h, setH] = useState(600);
  const [bg, setBg] = useState<'white' | 'transparent'>('white');
  const presets: [string, number, number][] = [
    ['Default (800×600)', 800, 600],
    ['HD 1080p', 1920, 1080],
    ['Square 1000', 1000, 1000],
    ['A4 @96dpi', 794, 1123],
  ];
  return (
    <Modal
      title="New Document"
      onClose={onCancel}
      footer={
        <>
          <div className="ps-btn" onClick={onCancel}>Cancel</div>
          <div className="ps-btn" onClick={() => onCreate(w, h, bg)}>OK</div>
        </>
      }
    >
      <div className="row"><span className="label" style={{ width: 70 }}>Preset</span>
        <select className="ps-select" onChange={(e) => { const p = presets[+e.target.value]; setW(p[1]); setH(p[2]); }}>
          {presets.map((p, i) => <option key={i} value={i}>{p[0]}</option>)}
        </select>
      </div>
      <div className="row"><span className="label" style={{ width: 70 }}>Width</span>
        <input type="number" className="ps-input" style={{ width: 90 }} value={w} onChange={(e) => setW(Math.max(1, +e.target.value))} /><span className="label">px</span>
      </div>
      <div className="row"><span className="label" style={{ width: 70 }}>Height</span>
        <input type="number" className="ps-input" style={{ width: 90 }} value={h} onChange={(e) => setH(Math.max(1, +e.target.value))} /><span className="label">px</span>
      </div>
      <div className="row"><span className="label" style={{ width: 70 }}>Background</span>
        <select className="ps-select" value={bg} onChange={(e) => setBg(e.target.value as any)}>
          <option value="white">White</option>
          <option value="transparent">Transparent</option>
        </select>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
export const ExportDialog: React.FC<{ onCancel: () => void; onExport: (fmt: 'png' | 'jpeg' | 'webp', q: number) => void }> = ({
  onCancel,
  onExport,
}) => {
  const [fmt, setFmt] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [q, setQ] = useState(92);
  return (
    <Modal
      title="Export As"
      onClose={onCancel}
      footer={
        <>
          <div className="ps-btn" onClick={onCancel}>Cancel</div>
          <div className="ps-btn" onClick={() => onExport(fmt, q / 100)}>Export</div>
        </>
      }
    >
      <div className="row"><span className="label" style={{ width: 70 }}>Format</span>
        <select className="ps-select" value={fmt} onChange={(e) => setFmt(e.target.value as any)}>
          <option value="png">PNG (lossless, alpha)</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      {fmt !== 'png' && (
        <div className="row"><span className="label" style={{ width: 70 }}>Quality</span>
          <input type="range" className="ps-range" style={{ flex: 1 }} min={1} max={100} value={q} onChange={(e) => setQ(+e.target.value)} />
          <span className="label" style={{ width: 30 }}>{q}</span>
        </div>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
export const CanvasSizeDialog: React.FC<{ initW: number; initH: number; onCancel: () => void; onApply: (w: number, h: number) => void }> = ({
  initW,
  initH,
  onCancel,
  onApply,
}) => {
  const [w, setW] = useState(initW);
  const [h, setH] = useState(initH);
  return (
    <Modal
      title="Canvas Size"
      onClose={onCancel}
      footer={
        <>
          <div className="ps-btn" onClick={onCancel}>Cancel</div>
          <div className="ps-btn" onClick={() => onApply(w, h)}>OK</div>
        </>
      }
    >
      <div className="row"><span className="label" style={{ width: 60 }}>Width</span>
        <input type="number" className="ps-input" style={{ width: 90 }} value={w} onChange={(e) => setW(Math.max(1, +e.target.value))} /></div>
      <div className="row"><span className="label" style={{ width: 60 }}>Height</span>
        <input type="number" className="ps-input" style={{ width: 90 }} value={h} onChange={(e) => setH(Math.max(1, +e.target.value))} /></div>
      <div className="dim">Content anchored top-left; larger sizes pad with transparency.</div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
export const TextDialog: React.FC<{ initColor: RGBAColor; onCancel: () => void; onCreate: (text: string, size: number, family: string, color: RGBAColor) => void }> = ({
  initColor,
  onCancel,
  onCreate,
}) => {
  const [text, setText] = useState('Type here');
  const [size, setSize] = useState(48);
  const [family, setFamily] = useState('Arial');
  return (
    <Modal
      title="Add Text"
      onClose={onCancel}
      footer={
        <>
          <div className="ps-btn" onClick={onCancel}>Cancel</div>
          <div className="ps-btn" onClick={() => onCreate(text, size, family, initColor)}>OK</div>
        </>
      }
    >
      <textarea className="ps-input" style={{ height: 56, width: 240, resize: 'none' }} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      <div className="row"><span className="label" style={{ width: 50 }}>Font</span>
        <select className="ps-select" value={family} onChange={(e) => setFamily(e.target.value)}>
          {['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Tahoma', 'Impact'].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="label">Size</span>
        <input type="number" className="ps-input" style={{ width: 56 }} value={size} onChange={(e) => setSize(Math.max(1, +e.target.value))} />
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// HSV Color Picker
// ---------------------------------------------------------------------------
export const ColorPickerDialog: React.FC<{ initial: RGBAColor; onCancel: () => void; onApply: (c: RGBAColor) => void }> = ({
  initial,
  onCancel,
  onApply,
}) => {
  const init = rgbToHsv(initial.r, initial.g, initial.b);
  const [h, setH] = useState(init.h);
  const [s, setS] = useState(init.s);
  const [v, setV] = useState(init.v);
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const rgb = hsvToRgb(h, s, v);
  const color: RGBAColor = { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };
  const hueColor = hsvToRgb(h, 100, 100);

  const updateSV = (e: React.PointerEvent | PointerEvent) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, ((e as PointerEvent).clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, ((e as PointerEvent).clientY - rect.top) / rect.height));
    setS(x * 100);
    setV((1 - y) * 100);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && updateSV(e);
    const up = () => (dragging.current = false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const setFromHex = (hex: string) => {
    const c = hexToRgb(hex);
    if (c) {
      const hv = rgbToHsv(c.r, c.g, c.b);
      setH(hv.h);
      setS(hv.s);
      setV(hv.v);
    }
  };

  return (
    <Modal
      title="Color Picker"
      onClose={onCancel}
      footer={
        <>
          <div className="ps-btn" onClick={onCancel}>Cancel</div>
          <div className="ps-btn" onClick={() => onApply(color)}>OK</div>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <div
          ref={svRef}
          style={{
            position: 'relative',
            width: 180,
            height: 180,
            cursor: 'crosshair',
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${rgbaToCss({ r: hueColor.r, g: hueColor.g, b: hueColor.b, a: 1 })}`,
          }}
          className="bevel-in"
          onPointerDown={(e) => { dragging.current = true; updateSV(e); }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${s}%`,
              top: `${100 - v}%`,
              width: 10,
              height: 10,
              transform: 'translate(-5px,-5px)',
              border: '1px solid #fff',
              boxShadow: '0 0 0 1px #000',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="range"
            min={0}
            max={360}
            value={h}
            onChange={(e) => setH(+e.target.value)}
            style={{
              writingMode: 'vertical-lr' as any,
              width: 18,
              height: 180,
              accentColor: '#888',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 96 }}>
          <div className="bevel-in" style={{ height: 36, background: rgbaToCss(color) }} />
          <Field label="H" value={Math.round(h)} max={360} onChange={(val) => setH(val)} />
          <Field label="S" value={Math.round(s)} max={100} onChange={(val) => setS(val)} />
          <Field label="B" value={Math.round(v)} max={100} onChange={(val) => setV(val)} />
          <div style={{ borderTop: '1px solid var(--ps-bevel-shadow)', margin: '2px 0' }} />
          <Field label="R" value={rgb.r} max={255} onChange={(val) => setFromRgb(val, rgb.g, rgb.b)} />
          <Field label="G" value={rgb.g} max={255} onChange={(val) => setFromRgb(rgb.r, val, rgb.b)} />
          <Field label="B" value={rgb.b} max={255} onChange={(val) => setFromRgb(rgb.r, rgb.g, val)} />
          <div className="row" style={{ gap: 4 }}>
            <span className="label">#</span>
            <input className="ps-input" style={{ width: 66 }} value={rgbToHex(color).slice(1)} onChange={(e) => setFromHex('#' + e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );

  function setFromRgb(r: number, g: number, b: number) {
    const hv = rgbToHsv(r, g, b);
    setH(hv.h);
    setS(hv.s);
    setV(hv.v);
  }
};

const Field: React.FC<{ label: string; value: number; max: number; onChange: (v: number) => void }> = ({ label, value, max, onChange }) => (
  <div className="row" style={{ gap: 4 }}>
    <span className="label" style={{ width: 12 }}>{label}</span>
    <input type="number" className="ps-input" style={{ width: 56 }} min={0} max={max} value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, +e.target.value)))} />
  </div>
);
