"use client"

import type { EnemyAbility } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"

interface EnemyAbilityWarnProps {
  ability: EnemyAbility
  enemyName: string
}

const damageTypeColors: Record<string, string> = {
  physical: "text-stone-300",
  fire: "text-orange-400",
  ice: "text-cyan-400",
  lightning: "text-yellow-400",
  shadow: "text-purple-400",
  holy: "text-amber-300",
  poison: "text-green-400",
  arcane: "text-blue-400",
}

export function EnemyAbilityWarn({ ability, enemyName }: EnemyAbilityWarnProps) {
  const color = damageTypeColors[ability.damageType || "physical"]

  return (
    <div className={cn("p-2 bg-red-500/10 border border-red-500/30 rounded text-sm", color)}>
      <div className="flex items-center gap-2">
        <span className="text-red-400 animate-pulse">!</span>
        <span className="text-stone-300">{enemyName} prepares</span>
        <span className={cn("font-medium", color)}>{ability.name}</span>
      </div>
      {ability.description && <p className="text-xs text-stone-500 mt-1 ml-5">{ability.description}</p>}
    </div>
  )
}
