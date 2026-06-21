import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getStore, useStore, useDispatch } from './core/state/store';
import type { RGBAColor } from './types';
import { CanvasEngine } from './core/engine/CanvasEngine';
import { InteractionController } from './core/interaction/InteractionController';
import { createCommands, Commands, CommandUI } from './core/commands';
import { installShortcuts } from './shortcuts/shortcuts';
import { getToolRegistry } from './core/tools/ToolRegistry';
import { newDocument } from './core/io/imageIO';
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
  ColorPickerDialog,
  TextDialog,
} from './ui/Dialogs';

type Dialog =
  | { type: 'new' }
  | { type: 'export' }
  | { type: 'canvasSize' }
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

    // register tools + default document
    const registry = getToolRegistry();
    dispatch({ type: 'REGISTER_TOOLS', payload: registry.getAllTools() });
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'brush' });

    const doc = newDocument('Untitled-1', 800, 600, 'white');
    doc.activeArtboardId = doc.artboards[0].id;
    dispatch({ type: 'SET_DOCUMENT', payload: doc });

    setReady(true);
    // fit after layout settles
    window.setTimeout(() => {
      const area = docAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
      commands.fitToScreen();
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

  // ---- drag & drop image ----
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/') && commandsRef.current) {
      const name = file.name.replace(/\.[^.]+$/, '');
      if (state.document) commandsRef.current.placeImageFile(file, name);
      else commandsRef.current.openImageFile(file, name);
    }
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
          onCancel={() => setDialog(null)}
          onCreate={(w, h, bg) => {
            commands.newDocument(w, h, bg);
            setDialog(null);
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
