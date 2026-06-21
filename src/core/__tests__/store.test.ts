import { describe, it, expect } from 'vitest';
import { getStore } from '../state/store';
import type { Document, SelectionData } from '../../types';

function tinyDoc(): Document {
  return {
    id: 'd',
    name: 'T',
    activeArtboardId: 'ab',
    artboards: [{ id: 'ab', name: 'A', x: 0, y: 0, width: 10, height: 10, locked: false }],
    layers: [
      { id: 'l1', name: 'L1', type: 'raster', visible: true, locked: false, opacity: 1, blendMode: 'normal', order: 0, width: 10, height: 10 } as any,
    ],
    history: [],
    historyIndex: -1,
    metadata: { createdAt: new Date(), modifiedAt: new Date(), version: '1', colorProfile: 'sRGB', bitsPerChannel: 8 },
  };
}

describe('gesture-granular history', () => {
  const store = getStore();

  it('undoes/redoes both document and selection per gesture', () => {
    store.dispatch({ type: 'SET_DOCUMENT', payload: tinyDoc() });
    expect(store.canUndo()).toBe(false);

    // gesture 1: change opacity
    store.beginHistory('Opacity');
    store.dispatch({ type: 'UPDATE_LAYER', payload: { id: 'l1', changes: { opacity: 0.5 } } });
    store.commitHistory();
    expect(store.getState().document!.layers[0].opacity).toBe(0.5);
    expect(store.canUndo()).toBe(true);

    // gesture 2: set a selection
    const sel: SelectionData = { type: 'rect', bounds: { x: 1, y: 1, width: 4, height: 4 }, antiAlias: false };
    store.beginHistory('Marquee');
    store.dispatch({ type: 'SET_SELECTION', payload: sel });
    store.commitHistory();
    expect(store.getState().selection).toEqual(sel);

    // undo selection
    store.undo();
    expect(store.getState().selection).toBeNull();
    expect(store.getState().document!.layers[0].opacity).toBe(0.5);

    // undo opacity
    store.undo();
    expect(store.getState().document!.layers[0].opacity).toBe(1);
    expect(store.canUndo()).toBe(false);

    // redo both
    store.redo();
    expect(store.getState().document!.layers[0].opacity).toBe(0.5);
    store.redo();
    expect(store.getState().selection).toEqual(sel);
  });

  it('SET_WORKSPACE_MODE switches mode but keeps the document', () => {
    store.dispatch({ type: 'SET_DOCUMENT', payload: tinyDoc() });
    const docBefore = store.getState().document;
    expect(store.getState().workspaceMode).toBe('pixel');
    store.dispatch({ type: 'SET_WORKSPACE_MODE', payload: 'vector' });
    expect(store.getState().workspaceMode).toBe('vector');
    expect(store.getState().document).toBe(docBefore); // same document, just a view change
    store.dispatch({ type: 'SET_WORKSPACE_MODE', payload: 'photo' });
    expect(store.getState().workspaceMode).toBe('photo');
  });

  it('SET_PANELS merges a partial panel state', () => {
    store.dispatch({ type: 'SET_PANELS', payload: { historyOpen: true } });
    expect(store.getState().panels.historyOpen).toBe(true);
    expect(store.getState().panels.layersOpen).toBe(true); // untouched
  });

  it('mid-gesture preview moves do not create extra steps', () => {
    store.dispatch({ type: 'SET_DOCUMENT', payload: tinyDoc() });
    store.beginHistory('Stroke');
    // simulate many transient updates within one gesture
    for (let i = 0; i < 5; i++) {
      store.dispatch({ type: 'UPDATE_LAYER', payload: { id: 'l1', changes: { opacity: 0.9 - i * 0.1 } } });
    }
    store.commitHistory();
    // exactly one undo restores the whole gesture
    store.undo();
    expect(store.getState().document!.layers[0].opacity).toBe(1);
  });
});
