"use client"

import type { DamageType } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"

interface WeaknessIndicatorProps {
  weakness?: DamageType
  resistance?: DamageType
}

const typeColors: Record<DamageType, string> = {
  physical: "text-stone-300",
  fire: "text-orange-400",
  ice: "text-cyan-400",
  lightning: "text-yellow-400",
  shadow: "text-purple-400",
  holy: "text-amber-300",
  poison: "text-green-400",
  arcane: "text-blue-400",
}

const typeIcons: Record<DamageType, string> = {
  physical: "⚔",
  fire: "🔥",
  ice: "❄",
  lightning: "⚡",
  shadow: "◐",
  holy: "✦",
  poison: "☠",
  arcane: "✧",
}

export function WeaknessIndicator({ weakness, resistance }: WeaknessIndicatorProps) {
  if (!weakness && !resistance) return null

  return (
    <div className="flex items-center gap-3 text-xs">
      {weakness && (
        <span className={cn("flex items-center gap-1", typeColors[weakness])}>
          <span className="text-emerald-400">▼</span>
          <span>{typeIcons[weakness]}</span>
          <span>Weak</span>
        </span>
      )}
      {resistance && (
        <span className={cn("flex items-center gap-1", typeColors[resistance])}>
          <span className="text-red-400">▲</span>
          <span>{typeIcons[resistance]}</span>
          <span>Resist</span>
        </span>
      )}
    </div>
  )
}
