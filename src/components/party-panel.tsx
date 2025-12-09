"use client"

import type { PartyState } from "@/lib/game-types"
import { CompanionDisplay } from "./companion-display"
import { useState } from "react"

interface PartyPanelProps {
  party: PartyState
  onSwapCompanion?: (activeId: string, reserveId: string) => void
  onDismissCompanion?: (companionId: string) => void
  compact?: boolean
}

export function PartyPanel({ party, onSwapCompanion, onDismissCompanion: _onDismissCompanion, compact = false }: PartyPanelProps) {
  const [selectedActive, setSelectedActive] = useState<string | null>(null)
  const [selectedReserve, setSelectedReserve] = useState<string | null>(null)

  const handleSwap = () => {
    if (selectedActive && selectedReserve && onSwapCompanion) {
      onSwapCompanion(selectedActive, selectedReserve)
      setSelectedActive(null)
      setSelectedReserve(null)
    }
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Party</h3>
          <span className="text-[10px] text-muted-foreground">
            {party.active.length}/{party.maxActive} active
          </span>
        </div>

        {party.active.length === 0 && party.reserve.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic">No companions</p>
        ) : (
          <div className="space-y-1">
            {party.active.map((companion) => (
              <CompanionDisplay key={companion.id} companion={companion} compact />
            ))}
            {party.reserve.length > 0 && (
              <p className="text-[10px] text-muted-foreground pt-1">+{party.reserve.length} in reserve</p>
            )}
          </div>
        )}

        {party.graveyard.length > 0 && (
          <p className="text-[10px] text-red-400/50 italic">{party.graveyard.length} fallen</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Party */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-primary">Active Party</h3>
          <span className="text-xs text-muted-foreground">
            {party.active.length}/{party.maxActive}
          </span>
        </div>

        {party.active.length === 0 ? (
          <div className="p-4 rounded-lg bg-zinc-900/30 text-center">
            <p className="text-sm text-muted-foreground">No active companions</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Tame creatures or rescue NPCs to recruit</p>
          </div>
        ) : (
          <div className="space-y-2">
            {party.active.map((companion) => (
              <CompanionDisplay
                key={companion.id}
                companion={companion}
                selected={selectedActive === companion.id}
                onSelect={() => setSelectedActive(selectedActive === companion.id ? null : companion.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Swap Button */}
      {selectedActive && selectedReserve && onSwapCompanion && (
        <button
          onClick={handleSwap}
          className="w-full py-2 px-3 rounded bg-teal-500/20 text-teal-400 text-sm hover:bg-teal-500/30 transition-colors"
        >
          Swap Selected Companions
        </button>
      )}

      {/* Reserve */}
      {party.reserve.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Reserve ({party.reserve.length})</h3>
          <div className="space-y-2">
            {party.reserve.map((companion) => (
              <CompanionDisplay
                key={companion.id}
                companion={companion}
                compact
                selected={selectedReserve === companion.id}
                onSelect={() => setSelectedReserve(selectedReserve === companion.id ? null : companion.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Graveyard */}
      {party.graveyard.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <h3 className="text-xs text-red-400/70 mb-2">Fallen ({party.graveyard.length})</h3>
          <div className="space-y-1">
            {party.graveyard.map((companion) => (
              <div key={companion.id} className="flex items-center gap-2 text-xs text-muted-foreground/50">
                <span className="line-through">{companion.name}</span>
                <span className="text-[10px]">{companion.species}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
