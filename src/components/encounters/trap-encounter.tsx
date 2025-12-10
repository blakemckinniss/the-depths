"use client"

import type { Trap, Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { cn } from "@/lib/core/utils"

interface TrapEncounterProps {
  trap: Trap
  player: Player
  onAction: (choice: "disarm" | "trigger" | "avoid") => void
  isProcessing?: boolean
  aiDescription?: string
  disarmChance: number
}

export function TrapEncounter({
  trap,
  player,
  onAction,
  isProcessing,
  aiDescription,
  disarmChance,
}: TrapEncounterProps) {
  return (
    <div className="my-4 p-4 bg-orange-500/5 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <EntityText type="trap">{trap.name}</EntityText>
        {trap.damage && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{trap.damage} DMG</span>
        )}
        {trap.effect && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{trap.effect.name}</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{aiDescription || trap.description}</p>

      <div className="text-xs text-muted-foreground">
        Disarm chance:{" "}
        <span
          className={cn(
            disarmChance >= 70 ? "text-green-400" : disarmChance >= 40 ? "text-yellow-400" : "text-red-400",
          )}
        >
          {disarmChance}%
        </span>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onAction("disarm")}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
        >
          Attempt Disarm
        </button>

        <button
          onClick={() => onAction("trigger")}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Trigger Intentionally
        </button>

        <button
          onClick={() => onAction("avoid")}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm rounded bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Try to Avoid
        </button>
      </div>
    </div>
  )
}
