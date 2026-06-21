import { describe, it, expect } from 'vitest';
import { TOOLBOX_GROUPS_BY_MODE } from '../../ui/toolboxConfig';
import { getToolRegistry } from '../tools/ToolRegistry';

// Library views are panels/views, not canvas tools — excluded from the toolbox by design.
const VIEW_IDS = new Set(['libraryGrid', 'libraryLoupe', 'libraryCompare', 'librarySurvey', 'people', 'folders', 'collections']);

const primaries = (mode: 'pixel' | 'vector' | 'photo') =>
  TOOLBOX_GROUPS_BY_MODE[mode].flat().map((g) => g.primary);
const members = (mode: 'pixel' | 'vector' | 'photo') =>
  TOOLBOX_GROUPS_BY_MODE[mode].flat().flatMap((g) => g.members);

describe('workspace toolbox sets (Part B)', () => {
  it('Pixel is the full editing toolbox incl. Pen and Path Selection', () => {
    const p = primaries('pixel');
    for (const id of ['move', 'rectMarquee', 'lasso', 'magicWand', 'crop', 'spotHealing', 'brush', 'cloneStamp', 'historyBrush', 'eraser', 'gradient', 'blur', 'dodge', 'pen', 'selection', 'horizontalType', 'rectangle', 'eyedropper', 'hand', 'zoom']) {
      expect(p).toContain(id);
    }
    // Direct Selection reachable via the path-selection flyout
    expect(members('pixel')).toContain('directSelection');
  });

  it('Vector stays vector-centric (pen/shapes/path, no raster paint)', () => {
    const p = primaries('vector');
    expect(p).toContain('pen');
    expect(p).toContain('selection');
    expect(p).toContain('rectangle');
    expect(p).not.toContain('brush');
    expect(p).not.toContain('cloneStamp');
  });

  it('Photo surfaces the local-adjustment / masking toolset', () => {
    const p = primaries('photo');
    expect(p).toContain('crop');
    expect(p).toContain('eyedropper');
    const m = members('photo');
    for (const id of ['spotRemoval', 'adjustmentBrush', 'graduatedFilter', 'radialFilter', 'rangeMask', 'whiteBalance', 'aiSelectSubject']) {
      expect(m).toContain(id);
    }
    expect(p).not.toContain('brush');
  });

  it('every registry tool (except library views) is surfaced in at least one mode', () => {
    const surfaced = new Set<string>();
    (['pixel', 'vector', 'photo'] as const).forEach((mode) =>
      TOOLBOX_GROUPS_BY_MODE[mode].flat().forEach((g) => g.members.forEach((id) => surfaced.add(id)))
    );
    const missing = getToolRegistry()
      .getAllTools()
      .map((t) => t.id)
      .filter((id) => !VIEW_IDS.has(id) && !surfaced.has(id));
    expect(missing).toEqual([]);
  });
});
