"use client"

import type { Trap, Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { calculateDisarmChance } from "@/lib/core/game-data"
import { calculateForesight } from "@/lib/mechanics/foresight-system"

interface TrapInteractionProps {
  trap: Trap
  player: Player
  onAction: (action: "disarm" | "trigger" | "avoid") => void
  disabled?: boolean
}

export function TrapInteraction({ trap, player, onAction, disabled }: TrapInteractionProps) {
  const disarmChance = calculateDisarmChance(player, trap)

  // Calculate foresight for trap encounter
  const foresight = calculateForesight(
    player,
    "trap_encounter",
    "interact",
    ["trap", "danger"]
  )

  // Determine what info to show based on foresight level
  const showDamage = foresight.level === "partial" || foresight.level === "full"
  const showEffect = foresight.level === "full"
  const showRiskOnly = foresight.level === "risk" || foresight.level === "type"

  return (
    <div className="my-4 pl-4 py-3 border-l-2 border-l-red-500/50 space-y-4">
      <div className="text-center">
        <EntityText type="trap" className="text-lg">
          {trap.name}
        </EntityText>
        <p className="text-stone-400 text-sm mt-1">{trap.description}</p>
      </div>

      {/* Foresight-aware damage/effect display */}
      <div className="text-center text-sm text-stone-500">
        {foresight.level === "hidden" ? (
          <span className="text-stone-600 italic">Effects unknown</span>
        ) : showRiskOnly ? (
          <span className="text-yellow-500/70">
            Potentially dangerous
            {foresight.outcomeHint && <span className="block text-xs mt-1">{foresight.outcomeHint}</span>}
          </span>
        ) : showDamage ? (
          <>
            Potential damage: <span className="text-red-400">{trap.damage}</span>
            {showEffect && trap.effect ? (
              <span>
                {" "}
                + <EntityText type="curse">{trap.effect.name}</EntityText>
              </span>
            ) : trap.effect ? (
              <span className="text-stone-600"> + additional effect</span>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Foresight source indicator */}
      {foresight.level !== "hidden" && foresight.source && (
        <div className="text-center">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
            foresight.level === "full" ? "bg-emerald-900/30 text-emerald-400" :
            foresight.level === "partial" ? "bg-purple-900/30 text-purple-400" :
            "bg-yellow-900/30 text-yellow-400"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {foresight.source === "racial" ? "Keen Senses" :
             foresight.source === "ability" ? "Active Ability" :
             foresight.source === "effect" ? "Foresight Effect" :
             foresight.source === "item" ? "Item Bonus" :
             "Skill Check"}
          </span>
        </div>
      )}

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
