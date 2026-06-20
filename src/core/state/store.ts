/**
 * Stratum State Management
 * Centralized state store using a simple pub/sub pattern.
 *
 * History is gesture-granular (B9): rapid per-move mutations no longer create
 * undo states. Use beginHistory()/commitHistory() (or commit(name, fn)) to record
 * exactly one undo step per gesture/command. Snapshots are deep clones that preserve
 * ImageData and typed arrays via structuredClone.
 */

import type {
  Document,
  Layer,
  ViewportState,
  ToolDefinition,
  SelectionData,
  Guide,
  RGBAColor,
} from '../../types';

// ============================================================================
// STATE INTERFACES
// ============================================================================

export type ThemeName = 'cs2' | 'modern';

export interface AppState {
  document: Document | null;
  activeTool: string;
  activeLayerId: string | null;
  tools: ToolDefinition[];
  viewport: ViewportState;
  selection: SelectionData | null;
  guides: Guide[];
  panels: PanelState;
  preferences: Preferences;
  foreground: RGBAColor;
  background: RGBAColor;
  /** Controlled tool options: toolOptions[toolId][optionId] = value. (B4) */
  toolOptions: Record<string, Record<string, unknown>>;
  quickMask: boolean;
  theme: ThemeName;
  /** Names of undo entries for the History panel; index 0 = oldest. */
  historyEntries: string[];
  /** Pointer into historyEntries; equals historyEntries.length when at the live tip. */
  historyPointer: number;
}

export interface PanelState {
  layersOpen: boolean;
  propertiesOpen: boolean;
  adjustmentsOpen: boolean;
  toolbarOpen: boolean;
  historyOpen: boolean;
}

export interface Preferences {
  theme: 'dark' | 'light';
  gpuAcceleration: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  undoLimit: number;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const defaultPreferences: Preferences = {
  theme: 'dark',
  gpuAcceleration: true,
  autoSave: true,
  autoSaveInterval: 300000, // 5 minutes
  undoLimit: 50,
};

const defaultViewport: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rulerVisible: false,
  gridVisible: false,
  guidesVisible: true,
  snapToGrid: false,
  snapToGuides: true,
  pixelPreview: false,
};

const defaultPanelState: PanelState = {
  layersOpen: true,
  propertiesOpen: true,
  adjustmentsOpen: false,
  toolbarOpen: true,
  historyOpen: false,
};

export function createDefaultState(): AppState {
  return {
    document: null,
    activeTool: 'move',
    activeLayerId: null,
    tools: [],
    viewport: { ...defaultViewport },
    selection: null,
    guides: [],
    panels: { ...defaultPanelState },
    preferences: { ...defaultPreferences },
    foreground: { r: 0, g: 0, b: 0, a: 1 },
    background: { r: 255, g: 255, b: 255, a: 1 },
    toolOptions: {},
    quickMask: false,
    theme: 'cs2',
    historyEntries: [],
    historyPointer: 0,
  };
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type Action =
  | { type: 'SET_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: Partial<Document> }
  | { type: 'ADD_LAYER'; payload: Layer }
  | { type: 'REMOVE_LAYER'; payload: string }
  | { type: 'UPDATE_LAYER'; payload: { id: string; changes: Partial<Layer> } }
  | { type: 'REORDER_LAYERS'; payload: { layerIds: string[] } }
  | { type: 'SET_ACTIVE_LAYER'; payload: string | null }
  | { type: 'SET_ACTIVE_TOOL'; payload: string }
  | { type: 'REGISTER_TOOLS'; payload: ToolDefinition[] }
  | { type: 'UPDATE_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'SET_SELECTION'; payload: SelectionData | null }
  | { type: 'ADD_GUIDE'; payload: Guide }
  | { type: 'REMOVE_GUIDE'; payload: string }
  | { type: 'UPDATE_GUIDE'; payload: { id: string; changes: Partial<Guide> } }
  | { type: 'TOGGLE_PANEL'; payload: keyof PanelState }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'SET_FOREGROUND'; payload: RGBAColor }
  | { type: 'SET_BACKGROUND'; payload: RGBAColor }
  | { type: 'SWAP_COLORS' }
  | { type: 'RESET_COLORS' }
  | { type: 'SET_TOOL_OPTION'; payload: { toolId: string; optionId: string; value: unknown } }
  | { type: 'TOGGLE_QUICK_MASK' }
  | { type: 'SET_THEME'; payload: ThemeName }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ============================================================================
// HELPERS
// ============================================================================

/** Deep clone a document, preserving ImageData / typed arrays / Dates / Maps. */
export function cloneDocument(doc: Document): Document {
  try {
    return structuredClone(doc);
  } catch {
    // Fallback for environments without structuredClone: hand-clone ImageData.
    return manualCloneDocument(doc);
  }
}

function manualCloneDocument(doc: Document): Document {
  const cloneLayer = (layer: Layer): Layer => {
    const copy: any = { ...layer };
    if ('pixelData' in layer && (layer as any).pixelData) {
      const src = (layer as any).pixelData as ImageData;
      copy.pixelData = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    }
    if ('paths' in layer && Array.isArray((layer as any).paths)) {
      copy.paths = JSON.parse(JSON.stringify((layer as any).paths));
    }
    if ((layer as any).settings) copy.settings = JSON.parse(JSON.stringify((layer as any).settings));
    return copy as Layer;
  };
  return {
    ...doc,
    layers: doc.layers.map(cloneLayer),
    artboards: doc.artboards.map((a) => ({ ...a })),
  };
}

// ============================================================================
// STORE CLASS
// ============================================================================

type Subscriber = (state: AppState) => void;

interface HistoryEntry {
  name: string;
  doc: Document;
  selection: SelectionData | null;
}

export class Store {
  private state: AppState;
  private subscribers: Set<Subscriber>;

  // Gesture-granular history (B9).
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private pendingSnapshot: { doc: Document; selection: SelectionData | null } | null = null;
  private pendingName = '';

  constructor() {
    this.state = createDefaultState();
    this.subscribers = new Set();
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  dispatch = (action: Action): void => {
    const newState = this.reduce(this.state, action);
    if (newState !== this.state) {
      this.state = newState;
      this.notifySubscribers();
    }
  };

  // -------------------------------------------------------------------------
  // History API (B9) — one undo step per gesture/command.
  // -------------------------------------------------------------------------

  beginHistory(name: string): void {
    if (this.pendingSnapshot) return; // already inside a gesture; keep first snapshot
    if (!this.state.document) return;
    // selection objects are immutable once created, so a reference snapshot is safe.
    this.pendingSnapshot = { doc: cloneDocument(this.state.document), selection: this.state.selection };
    this.pendingName = name;
  }

  commitHistory(nameOverride?: string): void {
    if (!this.pendingSnapshot) return;
    this.undoStack.push({
      name: nameOverride ?? this.pendingName,
      doc: this.pendingSnapshot.doc,
      selection: this.pendingSnapshot.selection,
    });
    if (this.undoStack.length > this.state.preferences.undoLimit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.pendingSnapshot = null;
    this.syncHistoryMeta();
    this.notifySubscribers();
  }

  cancelHistory(): void {
    this.pendingSnapshot = null;
  }

  /** Convenience wrapper: snapshot, run mutations, commit one undo step. */
  commit(name: string, fn: () => void): void {
    this.beginHistory(name);
    fn();
    this.commitHistory(name);
  }

  private syncHistoryMeta(): void {
    this.state = {
      ...this.state,
      historyEntries: this.undoStack.map((e) => e.name),
      historyPointer: this.undoStack.length,
    };
  }

  undo(): void {
    if (this.undoStack.length === 0 || !this.state.document) return;
    const entry = this.undoStack.pop()!;
    this.redoStack.push({ name: entry.name, doc: cloneDocument(this.state.document), selection: this.state.selection });
    this.state = { ...this.state, document: entry.doc, selection: entry.selection };
    this.syncHistoryMeta();
    this.notifySubscribers();
  }

  redo(): void {
    if (this.redoStack.length === 0 || !this.state.document) return;
    const entry = this.redoStack.pop()!;
    this.undoStack.push({ name: entry.name, doc: cloneDocument(this.state.document), selection: this.state.selection });
    this.state = { ...this.state, document: entry.doc, selection: entry.selection };
    this.syncHistoryMeta();
    this.notifySubscribers();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // -------------------------------------------------------------------------

  private reduce(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'SET_DOCUMENT': {
        // Fresh document resets history.
        this.undoStack = [];
        this.redoStack = [];
        this.pendingSnapshot = null;
        const firstLayer = action.payload.layers[0];
        return {
          ...state,
          document: action.payload,
          activeLayerId: firstLayer ? firstLayer.id : null,
          historyEntries: [],
          historyPointer: 0,
        };
      }

      case 'UPDATE_DOCUMENT':
        if (!state.document) return state;
        return { ...state, document: { ...state.document, ...action.payload } };

      case 'ADD_LAYER':
        if (!state.document) return state;
        return {
          ...state,
          document: {
            ...state.document,
            layers: [...state.document.layers, action.payload],
          },
          activeLayerId: action.payload.id,
        };

      case 'REMOVE_LAYER': {
        if (!state.document) return state;
        const remaining = state.document.layers.filter((l) => l.id !== action.payload);
        return {
          ...state,
          document: { ...state.document, layers: remaining },
          activeLayerId:
            state.activeLayerId === action.payload
              ? remaining.length
                ? remaining[remaining.length - 1].id
                : null
              : state.activeLayerId,
        };
      }

      case 'UPDATE_LAYER':
        if (!state.document) return state;
        return {
          ...state,
          document: {
            ...state.document,
            layers: state.document.layers.map((layer) =>
              layer.id === action.payload.id
                ? ({ ...layer, ...action.payload.changes } as Layer)
                : layer
            ),
          },
        };

      case 'REORDER_LAYERS': {
        if (!state.document) return state;
        const order = action.payload.layerIds;
        const byId = new Map(state.document.layers.map((l) => [l.id, l]));
        const reordered = order
          .map((id, i) => {
            const l = byId.get(id);
            return l ? ({ ...l, order: i } as Layer) : null;
          })
          .filter((l): l is Layer => l !== null);
        // keep any layers not mentioned (defensive)
        for (const l of state.document.layers) {
          if (!order.includes(l.id)) reordered.push(l);
        }
        return { ...state, document: { ...state.document, layers: reordered } };
      }

      case 'SET_ACTIVE_LAYER':
        return { ...state, activeLayerId: action.payload };

      case 'SET_ACTIVE_TOOL':
        return { ...state, activeTool: action.payload };

      case 'REGISTER_TOOLS':
        return { ...state, tools: action.payload };

      case 'UPDATE_VIEWPORT':
        return { ...state, viewport: { ...state.viewport, ...action.payload } };

      case 'SET_SELECTION':
        return { ...state, selection: action.payload };

      case 'ADD_GUIDE':
        return { ...state, guides: [...state.guides, action.payload] };

      case 'REMOVE_GUIDE':
        return { ...state, guides: state.guides.filter((g) => g.id !== action.payload) };

      case 'UPDATE_GUIDE':
        return {
          ...state,
          guides: state.guides.map((guide) =>
            guide.id === action.payload.id ? { ...guide, ...action.payload.changes } : guide
          ),
        };

      case 'TOGGLE_PANEL':
        return {
          ...state,
          panels: { ...state.panels, [action.payload]: !state.panels[action.payload] },
        };

      case 'UPDATE_PREFERENCES':
        return { ...state, preferences: { ...state.preferences, ...action.payload } };

      case 'SET_FOREGROUND':
        return { ...state, foreground: action.payload };

      case 'SET_BACKGROUND':
        return { ...state, background: action.payload };

      case 'SWAP_COLORS':
        return { ...state, foreground: state.background, background: state.foreground };

      case 'RESET_COLORS':
        return {
          ...state,
          foreground: { r: 0, g: 0, b: 0, a: 1 },
          background: { r: 255, g: 255, b: 255, a: 1 },
        };

      case 'SET_TOOL_OPTION': {
        const { toolId, optionId, value } = action.payload;
        return {
          ...state,
          toolOptions: {
            ...state.toolOptions,
            [toolId]: { ...(state.toolOptions[toolId] || {}), [optionId]: value },
          },
        };
      }

      case 'TOGGLE_QUICK_MASK':
        return { ...state, quickMask: !state.quickMask };

      case 'SET_THEME':
        return { ...state, theme: action.payload };

      case 'UNDO':
        this.undo();
        return this.state;

      case 'REDO':
        this.redo();
        return this.state;

      default:
        return state;
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((subscriber) => subscriber(this.state));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
  }
  return storeInstance;
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect } from 'react';

export function useStore(): AppState {
  const store = getStore();
  const [state, setState] = useState<AppState>(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    // sync immediately in case state changed between render and effect
    setState({ ...store.getState() });
    return unsubscribe;
  }, []);

  return state;
}

export function useDispatch() {
  const store = getStore();
  return store.dispatch;
}
