"use client"

import type { ComboTracker } from "@/lib/core/game-types"

interface ComboDisplayProps {
  combo: ComboTracker
}

export function ComboDisplay({ combo }: ComboDisplayProps) {
  if (!combo.activeCombo) return null

  return (
    <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded animate-pulse">
      <span className="text-amber-400 font-bold text-sm">{combo.activeCombo.name}!</span>
      <span className="text-xs text-amber-300/70">{combo.activeCombo.bonus}</span>
      <span className="text-xs text-stone-500 ml-auto">{combo.activeCombo.turnsRemaining} turns</span>
    </div>
  )
}
