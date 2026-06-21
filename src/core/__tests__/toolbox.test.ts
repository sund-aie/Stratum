import { describe, it, expect } from 'vitest';
import { TOOLBOX_GROUPS_BY_MODE } from '../../ui/toolboxConfig';

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

  it('Photo stays minimal (no brush/pen)', () => {
    const p = primaries('photo');
    expect(p).toContain('crop');
    expect(p).toContain('eyedropper');
    expect(p).not.toContain('brush');
    expect(p).not.toContain('pen');
  });
});
