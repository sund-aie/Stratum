import React, { useState, useRef, useEffect } from 'react';
import { useStore, useDispatch } from '../core/state/store';
import { getToolById } from '../core/tools/ToolRegistry';
import { ToolIcon, Icon } from './icons';
import { rgbaToCss } from '../core/color/color';
import { TOOLBOX_GROUPS_BY_MODE, ToolGroup } from './toolboxConfig';
import { useApp } from './AppContext';

export const Toolbox: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const [groupSel, setGroupSel] = useState<Record<string, string>>({});
  const [flyout, setFlyout] = useState<{ group: ToolGroup; top: number; left: number } | null>(null);
  const [dbl, setDbl] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const sections = TOOLBOX_GROUPS_BY_MODE[state.workspaceMode];

  // If the active tool isn't available in the current mode, switch to the first tool.
  useEffect(() => {
    const all = sections.flat().flatMap((g) => g.members);
    if (!all.includes(state.activeTool)) {
      const first = sections[0]?.[0]?.primary;
      if (first) dispatch({ type: 'SET_ACTIVE_TOOL', payload: first });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workspaceMode]);

  // Close the flyout on any outside click.
  useEffect(() => {
    if (!flyout) return;
    const onDown = (e: MouseEvent) => {
      if (flyoutRef.current?.contains(e.target as Node)) return;
      if (toolboxRef.current?.contains(e.target as Node)) return;
      setFlyout(null);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [flyout]);

  const currentMember = (g: ToolGroup): string => {
    if (g.members.includes(state.activeTool)) return state.activeTool;
    return groupSel[g.primary] ?? g.primary;
  };

  const selectTool = (id: string) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: id });

  const openFlyout = (g: ToolGroup, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlyout({ group: g, top: r.top, left: r.right + 2 });
  };

  const onBtnDown = (g: ToolGroup, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (g.members.length > 1) {
      holdTimer.current = window.setTimeout(() => openFlyout(g, el), 240);
    }
  };
  const onBtnUp = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const onBtnClick = (g: ToolGroup) => {
    if (flyout) return;
    selectTool(currentMember(g));
  };
  const onBtnContext = (g: ToolGroup, e: React.MouseEvent) => {
    e.preventDefault();
    if (g.members.length > 1) openFlyout(g, e.currentTarget as HTMLElement);
  };
  const pickFlyout = (g: ToolGroup, id: string) => {
    setGroupSel((m) => ({ ...m, [g.primary]: id }));
    selectTool(id);
    setFlyout(null);
  };

  return (
    <div className={`toolbox${dbl ? ' dbl' : ''}`} ref={toolboxRef}>
      <div
        className="toolbox-coltoggle"
        title={dbl ? 'Single column' : 'Double column'}
        onClick={() => setDbl((d) => !d)}
      >
        <Icon name="colToggle" size={12} />
      </div>

      <div className="toolbox-tools">
        <div className="toolbox-grid">
          {sections.map((section, si) => (
            <React.Fragment key={si}>
              {section.map((g) => {
                const id = currentMember(g);
                const tool = getToolById(id);
                const active = state.activeTool === id;
                return (
                  <div
                    key={g.primary}
                    className={`tool-btn${active ? ' active' : ''}`}
                    title={tool ? `${tool.name} (${tool.shortcut})` : id}
                    onMouseDown={(e) => onBtnDown(g, e)}
                    onMouseUp={onBtnUp}
                    onClick={() => onBtnClick(g)}
                    onContextMenu={(e) => onBtnContext(g, e)}
                  >
                    <ToolIcon toolId={id} size={18} />
                    {g.members.length > 1 && <span className="flyout-mark" />}
                  </div>
                );
              })}
              {si < sections.length - 1 && <div className="tool-sep" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="toolbox-footer">
        <div className="tool-sep" style={{ width: '70%', flex: '0 0 auto', margin: '0 0 6px' }} />
        <ColorControls />
      </div>

      {flyout && (
        <div className="tool-flyout" ref={flyoutRef} style={{ top: flyout.top, left: flyout.left }}>
          {flyout.group.members.map((mid) => {
            const t = getToolById(mid);
            return (
              <div key={mid} className="flyout-row" onClick={() => pickFlyout(flyout.group, mid)}>
                <ToolIcon toolId={mid} size={16} />
                <span>{t?.name ?? mid}</span>
                {t?.shortcut && <span className="shortcut">{t.shortcut}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ColorControls: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const { commands } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="color-controls">
        <div
          className="swatch fg bevel-out"
          style={{ background: rgbaToCss(state.foreground) }}
          title="Set foreground color"
          onClick={() => commands.ui.openColorPicker('fg')}
        />
        <div
          className="swatch bg bevel-out"
          style={{ background: rgbaToCss(state.background) }}
          title="Set background color"
          onClick={() => commands.ui.openColorPicker('bg')}
        />
        <div className="swatch-swap" title="Swap colors (X)" onClick={() => dispatch({ type: 'SWAP_COLORS' })}>
          <Icon name="swap" size={12} />
        </div>
        <div className="swatch-mini" title="Default colors (D)" onClick={() => dispatch({ type: 'RESET_COLORS' })}>
          <Icon name="defaultColors" size={11} />
        </div>
      </div>

      <div className="toolbox-toggles">
        <div
          className={`mini-btn${!state.quickMask ? ' active' : ''}`}
          title="Edit in Standard Mode"
          onClick={() => state.quickMask && dispatch({ type: 'TOGGLE_QUICK_MASK' })}
        >
          <Icon name="quickMaskOff" size={14} />
        </div>
        <div
          className={`mini-btn${state.quickMask ? ' active' : ''}`}
          title="Edit in Quick Mask Mode (Q)"
          onClick={() => !state.quickMask && dispatch({ type: 'TOGGLE_QUICK_MASK' })}
        >
          <Icon name="quickMaskOn" size={14} />
        </div>
      </div>
      <div className="toolbox-toggles">
        <div className="mini-btn active" title="Standard Screen Mode">
          <Icon name="screenStandard" size={14} />
        </div>
        <div className="mini-btn" title="Full Screen With Menu Bar">
          <Icon name="screenFullMenu" size={14} />
        </div>
        <div className="mini-btn" title="Full Screen Mode">
          <Icon name="screenFull" size={14} />
        </div>
      </div>
    </div>
  );
};
