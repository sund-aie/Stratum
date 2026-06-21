import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getStore, useStore, useDispatch } from './core/state/store';
import type { RGBAColor } from './types';
import { CanvasEngine } from './core/engine/CanvasEngine';
import { InteractionController } from './core/interaction/InteractionController';
import { createCommands, Commands, CommandUI } from './core/commands';
import { installShortcuts } from './shortcuts/shortcuts';
import { getToolRegistry } from './core/tools/ToolRegistry';
import { exportDocument } from './core/io/exporter';
import { AppProvider } from './ui/AppContext';
import { MenuBar } from './ui/MenuBar';
import { OptionsBar } from './ui/OptionsBar';
import { Toolbox } from './ui/Toolbox';
import { StatusBar } from './ui/StatusBar';
import {
  PaletteGroup,
  LayersPanel,
  HistoryPanel,
  ColorPanel,
  PropertiesPanel,
  NavigatorPanel,
} from './ui/Panels';
import {
  NewDocumentDialog,
  ExportDialog,
  CanvasSizeDialog,
  ImageSizeDialog,
  ColorPickerDialog,
  TextDialog,
} from './ui/Dialogs';

type Dialog =
  | { type: 'new' }
  | { type: 'export' }
  | { type: 'canvasSize' }
  | { type: 'imageSize' }
  | { type: 'color'; which: 'fg' | 'bg' }
  | { type: 'text'; x: number; y: number }
  | null;

function App() {
  const dispatch = useDispatch();
  const state = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docAreaRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const controllerRef = useRef<InteractionController | null>(null);
  const commandsRef = useRef<Commands | null>(null);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<{ x: number; y: number; hint: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ---- one-time init ----
  useEffect(() => {
    if (!canvasRef.current || !docAreaRef.current) return;
    const engine = new CanvasEngine(canvasRef.current);
    engineRef.current = engine;

    const controller = new InteractionController(canvasRef.current, engine);
    controllerRef.current = controller;

    const ui: CommandUI = {
      openNewDialog: () => setDialog({ type: 'new' }),
      openExportDialog: () => setDialog({ type: 'export' }),
      openColorPicker: (which) => setDialog({ type: 'color', which }),
      openCanvasSizeDialog: () => setDialog({ type: 'canvasSize' }),
      openImageSizeDialog: () => setDialog({ type: 'imageSize' }),
      toast: showToast,
    };
    const commands = createCommands({ engine, controller, ui });
    commandsRef.current = commands;

    controller.onStatus = setStatus;
    controller.onColorPick = (c: RGBAColor, alt: boolean) =>
      getStore().dispatch({ type: alt ? 'SET_BACKGROUND' : 'SET_FOREGROUND', payload: c });
    controller.onRequestText = (x, y) => setDialog({ type: 'text', x, y });

    // theme colors from tokens (desktop / ruler chrome / text)
    const refreshDesktop = () => {
      const cs = getComputedStyle(document.documentElement);
      controller.setThemeColors(
        cs.getPropertyValue('--ps-desktop').trim() || '#5d5d5d',
        cs.getPropertyValue('--ps-chrome').trim() || '#d4d0c8',
        cs.getPropertyValue('--ps-text').trim() || '#000'
      );
      controller.renderNow();
    };
    refreshDesktop();

    const removeShortcuts = installShortcuts(commands, controller);

    // size + render on container resize
    const ro = new ResizeObserver(() => {
      const area = docAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
      controller.renderNow();
    });
    ro.observe(docAreaRef.current);

    // register tools — but do NOT auto-create a document; launch into the New dialog.
    const registry = getToolRegistry();
    dispatch({ type: 'REGISTER_TOOLS', payload: registry.getAllTools() });
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'brush' });

    setReady(true);
    setDialog({ type: 'new' });
    // size the canvas to the empty gray desktop after layout settles
    window.setTimeout(() => {
      const area = docAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
      controller.renderNow();
    }, 30);

    // theme re-sync on change handled in MenuBar; also watch attribute
    const obs = new MutationObserver(refreshDesktop);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      removeShortcuts();
      ro.disconnect();
      obs.disconnect();
      controller.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- per-mode panel defaults (applied when the workspace mode changes) ----
  const mode = state.workspaceMode;
  useEffect(() => {
    // Photo surfaces Develop; Vector surfaces Paths; Pixel keeps the standard set.
    // (active tab is handled by keying the palette groups on `mode` in the dock below)
    dispatch({ type: 'SET_PANELS', payload: { layersOpen: true, propertiesOpen: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- drag & drop image ----
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    const c = commandsRef.current;
    if (!file || !c) return; // RAW files may have empty MIME — let the decoder sniff content
    const name = file.name.replace(/\.[^.]+$/, '');
    const d = state.document;
    // If there's no document or just a freshly-created blank canvas (one layer, nothing
    // done yet), open the drop as a NEW full-resolution document. Otherwise place it at
    // native size on top of the real composition. (Part A)
    const blank = !d || (d.layers.length <= 1 && !getStore().canUndo());
    if (blank) c.openImageFile(file, name);
    else c.placeImageFile(file, name);
  };

  const commands = commandsRef.current;

  // The context value only exists once the singletons are built (after the init effect).
  // The canvas/doc-area below render UNCONDITIONALLY so the effect can find their refs on
  // the first commit; only the useApp()-consuming chrome is gated on `ctx`.
  const ctx =
    ready && commandsRef.current && controllerRef.current && engineRef.current
      ? { commands: commandsRef.current, controller: controllerRef.current, engine: engineRef.current }
      : null;

  return (
    <div className="app-shell">
      <div className="titlebar">
        <span className="app-name">Stratum</span>
        <span className="doc-name">
          Unified Canvas — {state.document?.name ?? 'Untitled'}{' '}
          {ready ? `@ ${Math.round(state.viewport.zoom * 100)}%` : ''}
        </span>
      </div>

      {ctx && (
        <AppProvider value={ctx}>
          <MenuBar />
          <OptionsBar />
        </AppProvider>
      )}

      <div className="app-body">
        {ctx && (
          <AppProvider value={ctx}>
            <Toolbox />
          </AppProvider>
        )}

        <div className="app-center">
          <div
            className="doc-area"
            ref={docAreaRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <canvas ref={canvasRef} />
            {ready && !state.document && commands && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: dialog ? 'none' : 'auto',
                }}
              >
                <div className="dialog" style={{ padding: 0 }}>
                  <div className="dialog-title">Stratum — Unified Canvas</div>
                  <div className="dialog-body" style={{ alignItems: 'center', gap: 10 }}>
                    <div className="dim">No document open</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="ps-btn" onClick={() => setDialog({ type: 'new' })}>
                        Create a new document…
                      </div>
                      <div className="ps-btn" onClick={() => commands.openImage()}>
                        Open…
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {toast && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.8)',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: 11,
                  pointerEvents: 'none',
                }}
              >
                {toast}
              </div>
            )}
          </div>
          {ctx && (
            <AppProvider value={ctx}>
              <StatusBar status={status} />
            </AppProvider>
          )}
        </div>

        {ctx && (state.panels.layersOpen || state.panels.historyOpen || state.panels.propertiesOpen) && (
          <AppProvider value={ctx}>
            <div className="dock">
              <PaletteGroup
                tabs={[
                  { id: 'nav', label: 'Navigator', render: () => <NavigatorPanel /> },
                  { id: 'color', label: 'Color', render: () => <ColorPanel /> },
                ]}
              />
              {state.panels.propertiesOpen && (
                <PaletteGroup
                  key={`props-${mode}`}
                  initial={mode === 'photo' ? 'develop' : 'props'}
                  tabs={[
                    { id: 'props', label: 'Properties', render: () => <PropertiesPanel /> },
                    { id: 'develop', label: 'Develop', render: () => <PropertiesPanel /> },
                  ]}
                />
              )}
              {state.panels.historyOpen && (
                <PaletteGroup tabs={[{ id: 'history', label: 'History', render: () => <HistoryPanel /> }]} />
              )}
              {state.panels.layersOpen && (
                <PaletteGroup
                  key={`layers-${mode}`}
                  initial={mode === 'vector' ? 'paths' : 'layers'}
                  tabs={[
                    { id: 'layers', label: 'Layers', render: () => <LayersPanel /> },
                    { id: 'channels', label: 'Channels', render: () => <div className="dim" style={{ padding: 6 }}>Channels view not yet available.</div> },
                    { id: 'paths', label: 'Paths', render: () => <div className="dim" style={{ padding: 6 }}>Paths view not yet available.</div> },
                  ]}
                />
              )}
            </div>
          </AppProvider>
        )}
      </div>

      {/* Dialogs */}
      {dialog?.type === 'new' && commands && (
        <NewDocumentDialog
          initialMode={state.workspaceMode}
          onCancel={() => setDialog(null)}
          onCreate={(r) => {
            commands.newDocument({
              width: r.width,
              height: r.height,
              background: r.background,
              mode: r.mode,
              resolution: r.resolution,
            });
            setDialog(null);
          }}
          onOpen={() => {
            setDialog(null);
            commands.openImage();
          }}
        />
      )}
      {dialog?.type === 'export' && commands && (
        <ExportDialog
          onCancel={() => setDialog(null)}
          onExport={(fmt, q) => {
            const d = getStore().getState().document;
            if (d) exportDocument(engineRef.current!, d, fmt, q);
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'canvasSize' && commands && state.document && (
        <CanvasSizeDialog
          initW={CanvasEngine.activeArtboard(state.document).width}
          initH={CanvasEngine.activeArtboard(state.document).height}
          onCancel={() => setDialog(null)}
          onApply={(w, h) => {
            commands.resizeCanvas(w, h);
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'imageSize' && commands && state.document && (
        <ImageSizeDialog
          initW={CanvasEngine.activeArtboard(state.document).width}
          initH={CanvasEngine.activeArtboard(state.document).height}
          initRes={state.document.metadata.resolution ?? 72}
          onCancel={() => setDialog(null)}
          onApply={(w, h, resample, res) => {
            commands.resampleImage(w, h, resample, res);
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'color' && (
        <ColorPickerDialog
          initial={dialog.which === 'fg' ? state.foreground : state.background}
          onCancel={() => setDialog(null)}
          onApply={(c) => {
            dispatch({ type: dialog.which === 'fg' ? 'SET_FOREGROUND' : 'SET_BACKGROUND', payload: c });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === 'text' && commands && (
        <TextDialog
          initColor={state.foreground}
          onCancel={() => setDialog(null)}
          onCreate={(text, size, family, color) => {
            commands.createTextLayer(dialog.x, dialog.y, text, size, family, color);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
