import React, { useState } from 'react';
import { useStore } from '../core/state/store';
import { useApp } from './AppContext';
import { CanvasEngine } from '../core/engine/CanvasEngine';

export const StatusBar: React.FC<{ status: { x: number; y: number; hint: string } | null }> = ({ status }) => {
  const state = useStore();
  const { commands } = useApp();
  const [zoomText, setZoomText] = useState('');
  const doc = state.document;
  const ab = doc ? CanvasEngine.activeArtboard(doc) : null;
  const zoomPct = Math.round(state.viewport.zoom * 100);

  const applyZoom = (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) commands.zoomCentered(n / 100);
    setZoomText('');
  };

  return (
    <div className="statusbar">
      <input
        className="ps-input zoom-field"
        value={zoomText === '' ? `${zoomPct}%` : zoomText}
        onChange={(e) => setZoomText(e.target.value.replace('%', ''))}
        onBlur={(e) => applyZoom(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && applyZoom((e.target as HTMLInputElement).value)}
        title="Zoom level"
      />
      <div className="sep" />
      {doc?.metadata.sourceFormat && (
        <>
          <span>{doc.metadata.sourceFormat}</span>
          <div className="sep" />
        </>
      )}
      <span>{ab ? `${ab.width} × ${ab.height} px` : 'No document'}</span>
      <div className="sep" />
      <span>{doc?.metadata.bitsPerChannel ?? 8}-bit / {doc?.metadata.colorProfile ?? 'sRGB'}</span>
      <div className="sep" />
      {status && (
        <span className="dim">
          {status.x}, {status.y}
        </span>
      )}
      <div className="spacer" style={{ marginLeft: 'auto' }} />
      <span className="status-hint">{status?.hint ?? ''}</span>
    </div>
  );
};
