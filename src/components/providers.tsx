"use client"

import type { ReactNode } from "react"
import { EntityModalProvider } from "./entity-modal-context"
import { EntityDetailModal } from "./entity-detail-modal"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <EntityModalProvider>
      {children}
      <EntityDetailModal />
    </EntityModalProvider>
  )
}
