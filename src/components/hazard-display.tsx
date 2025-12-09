"use client"

import type { EnvironmentalHazard } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface HazardDisplayProps {
  hazard: EnvironmentalHazard
  isMitigated?: boolean
}

const hazardColors: Record<EnvironmentalHazard["type"], string> = {
  fire: "text-orange-400 border-l-orange-500/70",
  ice: "text-cyan-400 border-l-cyan-500/70",
  poison: "text-green-400 border-l-green-500/70",
  darkness: "text-purple-400 border-l-purple-500/70",
  holy: "text-yellow-400 border-l-yellow-500/70",
  arcane: "text-blue-400 border-l-blue-500/70",
  flooding: "text-blue-300 border-l-blue-400/70",
  crumbling: "text-stone-400 border-l-stone-500/70",
  haunted: "text-violet-400 border-l-violet-500/70",
}

const hazardIcons: Record<EnvironmentalHazard["type"], string> = {
  fire: "🔥",
  ice: "❄",
  poison: "☠",
  darkness: "◐",
  holy: "✦",
  arcane: "✧",
  flooding: "〰",
  crumbling: "⚠",
  haunted: "👻",
}

export function HazardDisplay({ hazard, isMitigated }: HazardDisplayProps) {
  return (
    <div className={cn("pl-3 py-2 border-l-2 text-sm", hazardColors[hazard.type])}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{hazardIcons[hazard.type]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{hazard.name}</span>
            {isMitigated && <span className="text-xs text-emerald-400">(mitigated)</span>}
          </div>
          <p className="text-xs opacity-70">{hazard.description}</p>
        </div>
        {hazard.duration !== "permanent" && <span className="text-xs opacity-50">{hazard.duration} turns</span>}
      </div>
      {hazard.effects.damagePerTurn && (
        <div className="mt-1 text-xs">
          <span className="text-red-400">
            -{isMitigated ? Math.floor(hazard.effects.damagePerTurn * 0.5) : hazard.effects.damagePerTurn} HP/turn
          </span>
        </div>
      )}
    </div>
  )
}
