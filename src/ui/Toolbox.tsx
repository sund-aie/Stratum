import React, { useState, useRef } from 'react';
import { useStore, useDispatch } from '../core/state/store';
import { getToolById } from '../core/tools/ToolRegistry';
import { ToolIcon, Icon } from './icons';
import { rgbaToCss } from '../core/color/color';
import { TOOLBOX_GROUPS, ToolGroup } from './toolboxConfig';
import { useApp } from './AppContext';

export const Toolbox: React.FC = () => {
  const state = useStore();
  const dispatch = useDispatch();
  const { commands } = useApp();
  const [groupSel, setGroupSel] = useState<Record<string, string>>({});
  const [flyout, setFlyout] = useState<{ group: ToolGroup; top: number } | null>(null);
  const holdTimer = useRef<number | null>(null);

  const currentMember = (g: ToolGroup): string => {
    // active tool wins if it belongs to this group, else the remembered/primary
    if (g.members.includes(state.activeTool)) return state.activeTool;
    return groupSel[g.primary] ?? g.primary;
  };

  const selectTool = (id: string) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: id });

  const onBtnDown = (g: ToolGroup, e: React.MouseEvent) => {
    const top = (e.currentTarget as HTMLElement).getBoundingClientRect().top;
    if (g.members.length > 1) {
      holdTimer.current = window.setTimeout(() => setFlyout({ group: g, top }), 240);
    }
  };
  const onBtnUp = (g: ToolGroup) => {
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
    if (g.members.length > 1) setFlyout({ group: g, top: (e.currentTarget as HTMLElement).getBoundingClientRect().top });
  };
  const pickFlyout = (g: ToolGroup, id: string) => {
    setGroupSel((m) => ({ ...m, [g.primary]: id }));
    selectTool(id);
    setFlyout(null);
  };

  return (
    <div className="toolbox" onMouseLeave={() => setFlyout(null)}>
      {TOOLBOX_GROUPS.map((section, si) => (
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
                onMouseUp={() => onBtnUp(g)}
                onClick={() => onBtnClick(g)}
                onContextMenu={(e) => onBtnContext(g, e)}
              >
                <ToolIcon toolId={id} size={18} />
                {g.members.length > 1 && <span className="flyout-mark" />}
              </div>
            );
          })}
          {si < TOOLBOX_GROUPS.length - 1 && <div className="tool-sep" />}
        </React.Fragment>
      ))}

      <ColorControls />

      {flyout && (
        <div className="tool-flyout" style={{ top: flyout.top - 1 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
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
        <div
          className="swatch-swap"
          title="Swap colors (X)"
          onClick={() => dispatch({ type: 'SWAP_COLORS' })}
        >
          <Icon name="swap" size={12} />
        </div>
        <div
          className="swatch-mini"
          title="Default colors (D)"
          onClick={() => dispatch({ type: 'RESET_COLORS' })}
        >
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
