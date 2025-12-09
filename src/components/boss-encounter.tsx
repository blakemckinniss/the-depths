"use client"

import type { Boss } from "@/lib/game-types"
import { EntityText } from "./entity-text"
import { StatBar } from "./stat-bar"
import { cn } from "@/lib/utils"

interface BossEncounterProps {
  boss: Boss
  onAction: (choice: "attack" | "defend" | "flee") => void
  isProcessing?: boolean
  currentPhaseNarration?: string
}

export function BossEncounter({ boss, onAction, isProcessing, currentPhaseNarration }: BossEncounterProps) {
  const currentPhase = boss.phases[boss.currentPhase]
  const healthPercent = (boss.health / boss.maxHealth) * 100

  return (
    <div className="my-4 p-4 bg-red-500/5 border border-red-900/30 rounded-lg space-y-3">
      <div className="text-center space-y-1">
        <EntityText type="boss" className="text-lg">
          {boss.name}
        </EntityText>
        {boss.dialogue?.intro && boss.health === boss.maxHealth && (
          <p className="text-sm text-red-300/80 italic">&quot;{boss.dialogue.intro}&quot;</p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Phase: <span className="text-red-400">{currentPhase.name}</span>
          </span>
          <span className="text-red-400">
            {boss.health}/{boss.maxHealth}
          </span>
        </div>
        <StatBar label="HP" current={boss.health} max={boss.maxHealth} color="enemy" compact />

        {/* Phase indicators */}
        <div className="flex gap-1 mt-1">
          {boss.phases.map((phase, i) => (
            <div
              key={phase.name}
              className={cn(
                "flex-1 h-1 rounded",
                i <= boss.currentPhase ? "bg-red-500" : "bg-red-900/30",
                healthPercent <= phase.healthThreshold && i > boss.currentPhase && "animate-pulse",
              )}
              title={phase.name}
            />
          ))}
        </div>
      </div>

      {currentPhaseNarration && <p className="text-sm text-muted-foreground italic">{currentPhaseNarration}</p>}

      {currentPhase.specialAbility && (
        <div className="text-xs text-orange-400">Special: {currentPhase.specialAbility}</div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onAction("attack")}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 text-sm rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-medium"
        >
          Attack
        </button>

        <button
          onClick={() => onAction("defend")}
          disabled={isProcessing}
          className="px-3 py-2 text-sm rounded bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Defend
        </button>

        <button
          onClick={() => onAction("flee")}
          disabled={isProcessing}
          className="px-3 py-2 text-sm rounded bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 transition-colors"
          title="Fleeing from a boss is difficult..."
        >
          Flee
        </button>
      </div>
    </div>
  )
}
