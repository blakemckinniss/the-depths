"use client";

import type { ReactNode } from "react";
import { EntityModalProvider } from "./entity-modal-context";
import { EntityDetailModal } from "./entity-detail-modal";
import { GameProvider } from "@/contexts/game-context";
import { UIProvider } from "@/contexts/ui-context";
import { LogProvider } from "@/contexts/log-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <UIProvider>
        <LogProvider>
          <EntityModalProvider>
            {children}
            <EntityDetailModal />
          </EntityModalProvider>
        </LogProvider>
      </UIProvider>
    </GameProvider>
  );
}
