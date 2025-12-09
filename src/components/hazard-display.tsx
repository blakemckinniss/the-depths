"use client"

import type { EnvironmentalHazard } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface HazardDisplayProps {
  hazard: EnvironmentalHazard
  isMitigated?: boolean
}

const hazardColors: Record<EnvironmentalHazard["type"], string> = {
  fire: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  ice: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  poison: "text-green-400 bg-green-500/10 border-green-500/30",
  darkness: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  holy: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  arcane: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  flooding: "text-blue-300 bg-blue-400/10 border-blue-400/30",
  crumbling: "text-stone-400 bg-stone-500/10 border-stone-500/30",
  haunted: "text-violet-400 bg-violet-500/10 border-violet-500/30",
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
    <div className={cn("p-2 rounded border text-sm", hazardColors[hazard.type])}>
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
