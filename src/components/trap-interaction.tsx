"use client"

import type { Trap, Player } from "@/lib/game-types"
import { EntityText } from "./entity-text"
import { calculateDisarmChance } from "@/lib/game-data"

interface TrapInteractionProps {
  trap: Trap
  player: Player
  onAction: (action: "disarm" | "trigger" | "avoid") => void
  disabled?: boolean
}

export function TrapInteraction({ trap, player, onAction, disabled }: TrapInteractionProps) {
  const disarmChance = calculateDisarmChance(player, trap)

  return (
    <div className="my-4 pl-4 py-3 border-l-2 border-l-red-500/50 space-y-4">
      <div className="text-center">
        <EntityText type="trap" className="text-lg">
          {trap.name}
        </EntityText>
        <p className="text-stone-400 text-sm mt-1">{trap.description}</p>
      </div>

      <div className="text-center text-sm text-stone-500">
        Potential damage: <span className="text-red-400">{trap.damage}</span>
        {trap.effect && (
          <span>
            {" "}
            + <EntityText type="curse">{trap.effect.name}</EntityText>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onAction("disarm")}
          disabled={disabled}
          className="px-4 py-2 bg-cyan-900/40 hover:bg-cyan-800/50 text-cyan-300 transition-colors disabled:opacity-50"
        >
          Attempt Disarm <span className="text-cyan-500/70">({Math.floor(disarmChance)}%)</span>
        </button>

        <button
          onClick={() => onAction("avoid")}
          disabled={disabled}
          className="px-4 py-2 bg-stone-800/50 hover:bg-stone-700/50 text-stone-300 transition-colors disabled:opacity-50"
        >
          Carefully Avoid <span className="text-stone-500">(50%, reduced damage)</span>
        </button>

        <button
          onClick={() => onAction("trigger")}
          disabled={disabled}
          className="px-4 py-2 bg-red-900/30 hover:bg-red-800/40 text-red-400 transition-colors disabled:opacity-50"
        >
          Trigger It <span className="text-red-500/70">(guaranteed damage)</span>
        </button>
      </div>
    </div>
  )
}
