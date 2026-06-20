/**
 * Global keyboard-shortcut manager (B19, §7). Respects text-input focus and supports
 * tool cycling for shared letters (press the same letter again to advance the group).
 */
import { getStore } from '../core/state/store';
import type { Commands } from '../core/commands';
import type { InteractionController } from '../core/interaction/InteractionController';
import { toolEngine } from '../core/tools/ToolEngine';
import { getToolById } from '../core/tools/ToolRegistry';

// letter -> ordered tool group (CS2 toolbox grouping).
const TOOL_GROUPS: Record<string, string[]> = {
  v: ['move'],
  m: ['rectMarquee', 'ellipseMarquee'],
  l: ['lasso', 'polygonalLasso', 'magneticLasso'],
  w: ['magicWand', 'quickSelection'],
  c: ['crop', 'perspectiveCrop'],
  k: ['slice'],
  j: ['spotHealing', 'healingBrush', 'patch', 'redEye'],
  b: ['brush', 'pencil', 'colorReplacement', 'mixerBrush'],
  s: ['cloneStamp', 'patternStamp'],
  y: ['historyBrush', 'artHistoryBrush'],
  e: ['eraser', 'backgroundEraser', 'magicEraser'],
  g: ['gradient', 'paintBucket'],
  o: ['dodge', 'burn', 'sponge'],
  p: ['pen', 'curvaturePen'],
  t: ['horizontalType', 'verticalType'],
  a: ['selection', 'directSelection'],
  u: ['rectangle', 'roundedRectangle', 'ellipse', 'polygon', 'line', 'customShape'],
  h: ['hand'],
  r: ['rotateView'],
  z: ['zoom'],
  i: ['eyedropper', 'colorSampler', 'ruler'],
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function installShortcuts(commands: Commands, controller: InteractionController): () => void {
  const store = getStore();
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const selectTool = (id: string) => {
    store.dispatch({ type: 'SET_ACTIVE_TOOL', payload: id });
  };

  const cycleLetter = (letter: string) => {
    const group = TOOL_GROUPS[letter];
    if (!group || group.length === 0) return;
    const cur = store.getState().activeTool;
    const idx = group.indexOf(cur);
    selectTool(idx === -1 ? group[0] : group[(idx + 1) % group.length]);
  };

  const adjustBrush = (delta: number) => {
    const tool = store.getState().activeTool;
    const def = getToolById(tool)?.options.find((o) => o.id === 'brushSize');
    if (!def) return;
    const cur = (store.getState().toolOptions[tool]?.brushSize as number) ?? (def.default as number) ?? 20;
    const next = Math.max(1, Math.min(1000, cur + delta));
    store.dispatch({ type: 'SET_TOOL_OPTION', payload: { toolId: tool, optionId: 'brushSize', value: next } });
    toolEngine.setToolOption(tool, 'brushSize', next);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key;
    const lower = key.toLowerCase();

    if (key === ' ' && !isTypingTarget(e.target)) {
      controller.setSpace(true);
      e.preventDefault();
      return;
    }

    if (isTypingTarget(e.target)) return;

    // ---- modified (Ctrl/Cmd) commands ----
    if (mod) {
      switch (lower) {
        case 'n':
          e.preventDefault();
          e.shiftKey ? commands.addRasterLayer() : commands.newDocument();
          return;
        case 'o':
          e.preventDefault();
          commands.openImage();
          return;
        case 's':
          e.preventDefault();
          commands.saveProject();
          return;
        case 'e':
          e.preventDefault();
          e.shiftKey ? commands.exportAs() : commands.mergeDown();
          return;
        case 'z':
          e.preventDefault();
          e.shiftKey ? commands.redo() : commands.undo();
          return;
        case 'y':
          e.preventDefault();
          commands.redo();
          return;
        case 'a':
          e.preventDefault();
          commands.selectAll();
          return;
        case 'd':
          e.preventDefault();
          e.shiftKey ? commands.reselect() : commands.deselect();
          return;
        case 'i':
          if (e.shiftKey) {
            e.preventDefault();
            commands.inverseSelection();
            return;
          }
          break;
        case 'j':
          e.preventDefault();
          commands.duplicateLayer();
          return;
        case 'c':
          e.preventDefault();
          commands.copySelection();
          return;
        case 'v':
          e.preventDefault();
          commands.paste();
          return;
        case 't':
          e.preventDefault();
          commands.ui.toast('Free Transform: drag the layer with Move; full transform handles coming online');
          return;
        case '=':
        case '+':
          e.preventDefault();
          commands.zoomIn();
          return;
        case '-':
          e.preventDefault();
          commands.zoomOut();
          return;
        case '0':
          e.preventDefault();
          commands.fitToScreen();
          return;
        case '1':
          e.preventDefault();
          commands.actualPixels();
          return;
      }
      return;
    }

    // ---- unmodified ----
    if (key === 'F5' && e.shiftKey) {
      e.preventDefault();
      commands.fillForeground();
      return;
    }
    if (key === '[') return adjustBrush(-2);
    if (key === ']') return adjustBrush(2);
    if (lower === 'd') return commands.defaultColors();
    if (lower === 'x') return commands.swapColors();
    if (lower === 'q') return commands.toggleQuickMask();
    if (lower === 'f') {
      commands.ui.toast('Screen mode cycling is cosmetic in this build');
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      commands.fillBackground();
      return;
    }
    if (key === 'Enter') {
      if (store.getState().activeTool === 'crop') commands.applyCrop();
      return;
    }
    if (key === 'Escape') {
      store.dispatch({ type: 'SET_SELECTION', payload: null });
      return;
    }
    // Arrow nudge (move tool)
    if (store.getState().activeTool === 'move' && key.startsWith('Arrow')) {
      e.preventDefault();
      const n = e.shiftKey ? 10 : 1;
      if (key === 'ArrowLeft') controller.nudge(-n, 0);
      if (key === 'ArrowRight') controller.nudge(n, 0);
      if (key === 'ArrowUp') controller.nudge(0, -n);
      if (key === 'ArrowDown') controller.nudge(0, n);
      return;
    }

    // Tool letters
    if (/^[a-z]$/.test(lower) && TOOL_GROUPS[lower]) {
      cycleLetter(lower);
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') controller.setSpace(false);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
