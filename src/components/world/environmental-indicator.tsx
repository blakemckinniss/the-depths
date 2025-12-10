"use client"

import { getEnvironmentType, getDungeonAmbientEffects } from "@/lib/world/environmental-effects"
import type { DungeonCard } from "@/lib/core/game-types"
import type { EnhancedStatusEffect } from "@/lib/combat/effect-system"
import { cn } from "@/lib/core/utils"

interface EnvironmentalIndicatorProps {
  dungeon: DungeonCard | null
  activeEffects: EnhancedStatusEffect[]
  className?: string
}

export function EnvironmentalIndicator({ dungeon, activeEffects, className }: EnvironmentalIndicatorProps) {
  if (!dungeon) return null

  const envType = getEnvironmentType(dungeon.theme)
  const ambientEffects = getDungeonAmbientEffects(dungeon)

  // Count environmental effects currently active on player
  const activeEnvEffects = activeEffects.filter((e) => e.sourceType === "environment")

  const getEnvColor = (type: string) => {
    switch (type) {
      case "crypt":
        return "from-purple-500/20 to-transparent border-purple-500/30"
      case "swamp":
        return "from-green-500/20 to-transparent border-green-500/30"
      case "volcano":
        return "from-orange-500/20 to-transparent border-orange-500/30"
      case "ice_cave":
        return "from-cyan-500/20 to-transparent border-cyan-500/30"
      case "abyss":
        return "from-violet-500/20 to-transparent border-violet-500/30"
      case "temple":
        return "from-amber-500/20 to-transparent border-amber-500/30"
      case "nightmare":
        return "from-pink-500/20 to-transparent border-pink-500/30"
      default:
        return "from-secondary/20 to-transparent border-secondary/30"
    }
  }

  const getEnvIcon = (type: string) => {
    switch (type) {
      case "crypt":
        return "☠"
      case "swamp":
        return "☘"
      case "volcano":
        return "🜂"
      case "ice_cave":
        return "❆"
      case "abyss":
        return "◉"
      case "temple":
        return "☀"
      case "nightmare":
        return "☾"
      default:
        return "◇"
    }
  }

  return (
    <div className={cn("px-3 py-2 bg-gradient-to-r border-l-2 rounded-r-sm", getEnvColor(envType), className)}>
      {/* Environment header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm opacity-70">{getEnvIcon(envType)}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {envType.replace("_", " ")} Environment
        </span>
      </div>

      {/* Potential hazards */}
      {ambientEffects.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="opacity-70">Hazards: </span>
          {ambientEffects.map((ae, i) => (
            <span key={ae.id}>
              {i > 0 && ", "}
              <span className="text-foreground/70">{ae.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Active environmental debuffs */}
      {activeEnvEffects.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {activeEnvEffects.map((effect) => (
            <span
              key={effect.id}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                effect.effectType === "debuff" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400",
              )}
            >
              {effect.name}
              {effect.currentStacks > 1 && ` x${effect.currentStacks}`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
