/**
 * Stratum State Management
 * Centralized state store using a simple pub/sub pattern
 */

import type { Document, Layer, ViewportState, ToolDefinition, SelectionData, Guide } from '../../types';

// ============================================================================
// STATE INTERFACES
// ============================================================================

export interface AppState {
  document: Document | null;
  activeTool: string;
  tools: ToolDefinition[];
  viewport: ViewportState;
  selection: SelectionData | null;
  guides: Guide[];
  panels: PanelState;
  preferences: Preferences;
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
  rulerVisible: true,
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
    tools: [],
    viewport: defaultViewport,
    selection: null,
    guides: [],
    panels: defaultPanelState,
    preferences: defaultPreferences,
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
  | { type: 'SET_ACTIVE_TOOL'; payload: string }
  | { type: 'REGISTER_TOOLS'; payload: ToolDefinition[] }
  | { type: 'UPDATE_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'SET_SELECTION'; payload: SelectionData | null }
  | { type: 'ADD_GUIDE'; payload: Guide }
  | { type: 'REMOVE_GUIDE'; payload: string }
  | { type: 'UPDATE_GUIDE'; payload: { id: string; changes: Partial<Guide> } }
  | { type: 'TOGGLE_PANEL'; payload: keyof PanelState }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ============================================================================
// STORE CLASS
// ============================================================================

type Subscriber = (state: AppState) => void;

export class Store {
  private state: AppState;
  private subscribers: Set<Subscriber>;
  private history: AppState[];
  private historyIndex: number;

  constructor() {
    this.state = createDefaultState();
    this.subscribers = new Set();
    this.history = [];
    this.historyIndex = -1;
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  dispatch(action: Action): void {
    // Save state for undo before certain actions
    if (this.shouldSaveHistory(action.type)) {
      this.saveHistory();
    }

    const newState = this.reduce(this.state, action);
    
    if (newState !== this.state) {
      this.state = newState;
      this.notifySubscribers();
    }
  }

  private shouldSaveHistory(actionType: string): boolean {
    const historyActions = [
      'ADD_LAYER',
      'REMOVE_LAYER',
      'UPDATE_LAYER',
      'REORDER_LAYERS',
      'SET_SELECTION',
    ];
    return historyActions.includes(actionType);
  }

  private saveHistory(): void {
    // Remove any future states if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Clone and save current state
    const clonedState = JSON.parse(JSON.stringify(this.state));
    this.history.push(clonedState);

    // Limit history size
    if (this.history.length > this.state.preferences.undoLimit) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): void {
    if (this.historyIndex >= 0) {
      const previousState = this.history[this.historyIndex];
      this.historyIndex--;
      this.state = previousState;
      this.notifySubscribers();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const nextState = this.history[this.historyIndex];
      this.state = nextState;
      this.notifySubscribers();
    }
  }

  private reduce(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'SET_DOCUMENT':
        return { ...state, document: action.payload };

      case 'UPDATE_DOCUMENT':
        if (!state.document) return state;
        return {
          ...state,
          document: { ...state.document, ...action.payload },
        };

      case 'ADD_LAYER':
        if (!state.document) return state;
        return {
          ...state,
          document: {
            ...state.document,
            layers: [...state.document.layers, action.payload],
          },
        };

      case 'REMOVE_LAYER':
        if (!state.document) return state;
        return {
          ...state,
          document: {
            ...state.document,
            layers: state.document.layers.filter((l) => l.id !== action.payload),
          },
        };

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

      case 'REORDER_LAYERS':
        if (!state.document) return state;
        // Implement layer reordering logic
        return state;

      case 'SET_ACTIVE_TOOL':
        return { ...state, activeTool: action.payload };

      case 'REGISTER_TOOLS':
        return { ...state, tools: action.payload };

      case 'UPDATE_VIEWPORT':
        return {
          ...state,
          viewport: { ...state.viewport, ...action.payload },
        };

      case 'SET_SELECTION':
        return { ...state, selection: action.payload };

      case 'ADD_GUIDE':
        return { ...state, guides: [...state.guides, action.payload] };

      case 'REMOVE_GUIDE':
        return {
          ...state,
          guides: state.guides.filter((g) => g.id !== action.payload),
        };

      case 'UPDATE_GUIDE':
        return {
          ...state,
          guides: state.guides.map((guide) =>
            guide.id === action.payload.id
              ? { ...guide, ...action.payload.changes }
              : guide
          ),
        };

      case 'TOGGLE_PANEL':
        return {
          ...state,
          panels: {
            ...state.panels,
            [action.payload]: !state.panels[action.payload],
          },
        };

      case 'UPDATE_PREFERENCES':
        return {
          ...state,
          preferences: { ...state.preferences, ...action.payload },
        };

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
// REACT HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useStore(): AppState {
  const store = getStore();
  const [state, setState] = useState<AppState>(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  return state;
}

export function useDispatch() {
  const store = getStore();
  return (action: Action) => store.dispatch(action);
}
