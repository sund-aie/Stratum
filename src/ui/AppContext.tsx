import React, { createContext, useContext } from 'react';
import type { Commands } from '../core/commands';
import type { InteractionController } from '../core/interaction/InteractionController';
import type { CanvasEngine } from '../core/engine/CanvasEngine';

interface AppCtx {
  commands: Commands;
  controller: InteractionController;
  engine: CanvasEngine;
}

const Ctx = createContext<AppCtx | null>(null);

export const AppProvider: React.FC<{ value: AppCtx; children: React.ReactNode }> = ({ value, children }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
