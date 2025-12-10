"use client"
import { cn } from "@/lib/core/utils"

type CombatStance = "balanced" | "aggressive" | "defensive"

interface StanceSelectorProps {
  currentStance: CombatStance
  onChangeStance: (stance: CombatStance) => void
  disabled?: boolean
}

const stanceInfo: Record<CombatStance, { name: string; desc: string; icon: string; color: string }> = {
  balanced: {
    name: "Balanced",
    desc: "Standard combat",
    icon: "⚖",
    color: "text-stone-300 border-stone-500/50",
  },
  aggressive: {
    name: "Aggressive",
    desc: "+30% DMG, -30% DEF",
    icon: "⚔",
    color: "text-red-400 border-red-500/50",
  },
  defensive: {
    name: "Defensive",
    desc: "+40% DEF, -30% DMG",
    icon: "🛡",
    color: "text-blue-400 border-blue-500/50",
  },
}

export function StanceSelector({ currentStance, onChangeStance, disabled }: StanceSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-stone-500 mr-1">Stance:</span>
      {(Object.keys(stanceInfo) as CombatStance[]).map((stance) => {
        const info = stanceInfo[stance]
        const isActive = currentStance === stance
        return (
          <button
            key={stance}
            onClick={() => onChangeStance(stance)}
            disabled={disabled || isActive}
            title={`${info.name}: ${info.desc}`}
            className={cn(
              "px-2 py-1 text-xs rounded border transition-all",
              isActive ? info.color : "text-stone-500 border-stone-700/50 hover:border-stone-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <span className="mr-1">{info.icon}</span>
            {info.name}
          </button>
        )
      })}
    </div>
  )
}
