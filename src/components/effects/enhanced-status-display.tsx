"use client"

import { useState } from "react"
import type { EnhancedStatusEffect } from "@/lib/combat/effect-system"
import { cn } from "@/lib/core/utils"

interface EnhancedStatusDisplayProps {
  effects: EnhancedStatusEffect[]
  onRemove?: (effectId: string) => void
  showDetails?: boolean
}

export function EnhancedStatusDisplay({ effects, onRemove, showDetails = false }: EnhancedStatusDisplayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (effects.length === 0) return null

  const buffs = effects.filter((e) => e.effectType === "buff")
  const debuffs = effects.filter((e) => e.effectType === "debuff")
  const neutrals = effects.filter((e) => e.effectType === "neutral")

  const renderEffect = (effect: EnhancedStatusEffect) => {
    const isHovered = hoveredId === effect.id

    // Duration display
    const durationDisplay = () => {
      if (effect.durationType === "permanent") return "∞"
      const suffix =
        {
          turns: "t",
          actions: "a",
          rooms: "r",
          hits: "h",
          conditional: "?",
        }[effect.durationType] ?? ""
      return `${effect.durationRemaining}${suffix}`
    }

    // Stack display
    const stackDisplay = effect.currentStacks > 1 ? `×${effect.currentStacks}` : ""

    // Animation class
    const animationClass = effect.animation ? `entity-${effect.animation}` : ""

    return (
      <div
        key={effect.id}
        className="relative"
        onMouseEnter={() => setHoveredId(effect.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div
          className={cn(
            "px-2 py-1 text-xs rounded cursor-default transition-all",
            effect.effectType === "buff" && "bg-emerald-500/20 text-emerald-400",
            effect.effectType === "debuff" && "bg-red-500/20 text-red-400",
            effect.effectType === "neutral" && "bg-zinc-500/20 text-zinc-400",
            effect.rarity === "rare" && "ring-1 ring-purple-500/30",
            effect.rarity === "legendary" && "ring-1 ring-amber-500/50",
            animationClass,
          )}
        >
          <span className={cn("font-medium", effect.color)}>{effect.name}</span>
          {stackDisplay && <span className="ml-1 text-white/60">{stackDisplay}</span>}
          <span className="ml-2 opacity-60">{durationDisplay()}</span>
        </div>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute z-50 bottom-full left-0 mb-1 p-2 bg-zinc-900 border border-zinc-700 rounded shadow-lg min-w-48 max-w-64">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("font-semibold", effect.color)}>{effect.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{effect.rarity}</span>
            </div>

            {effect.description && <p className="text-xs text-muted-foreground mb-2 italic">{effect.description}</p>}

            {/* Modifiers */}
            <div className="space-y-0.5 text-xs">
              {effect.modifiers.attack && (
                <div className={effect.modifiers.attack > 0 ? "text-emerald-400" : "text-red-400"}>
                  Attack: {effect.modifiers.attack > 0 ? "+" : ""}
                  {effect.modifiers.attack}
                  {effect.stackBehavior === "intensity" && effect.currentStacks > 1 && (
                    <span className="opacity-60"> (×{effect.currentStacks})</span>
                  )}
                </div>
              )}
              {effect.modifiers.defense && (
                <div className={effect.modifiers.defense > 0 ? "text-emerald-400" : "text-red-400"}>
                  Defense: {effect.modifiers.defense > 0 ? "+" : ""}
                  {effect.modifiers.defense}
                </div>
              )}
              {effect.modifiers.healthRegen && (
                <div className={effect.modifiers.healthRegen > 0 ? "text-emerald-400" : "text-red-400"}>
                  {effect.modifiers.healthRegen > 0 ? "Heal" : "Damage"}: {Math.abs(effect.modifiers.healthRegen)}/tick
                </div>
              )}
              {effect.modifiers.goldMultiplier && effect.modifiers.goldMultiplier !== 1 && (
                <div className="text-amber-400">Gold: ×{effect.modifiers.goldMultiplier.toFixed(2)}</div>
              )}
            </div>

            {/* Duration info */}
            <div className="mt-2 pt-2 border-t border-zinc-700 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>
                  {effect.durationType === "permanent"
                    ? "Permanent"
                    : `${effect.durationRemaining} ${effect.durationType}`}
                </span>
              </div>
              {effect.stackBehavior !== "none" && (
                <div className="flex justify-between">
                  <span>Stacks:</span>
                  <span>
                    {effect.currentStacks}/{effect.maxStacks} ({effect.stackBehavior})
                  </span>
                </div>
              )}
              {!effect.cleansable && <div className="text-purple-400 mt-1">Cannot be cleansed</div>}
            </div>

            {/* Remove button if handler provided */}
            {onRemove && effect.cleansable && (
              <button
                onClick={() => onRemove(effect.id)}
                className="mt-2 w-full px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
              >
                Attempt Cleanse
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!showDetails) {
    // Compact inline display
    return <div className="flex flex-wrap gap-1">{effects.map(renderEffect)}</div>
  }

  // Detailed grouped display
  return (
    <div className="space-y-2">
      {buffs.length > 0 && (
        <div>
          <div className="text-xs text-emerald-400/60 uppercase tracking-wider mb-1">Buffs</div>
          <div className="flex flex-wrap gap-1">{buffs.map(renderEffect)}</div>
        </div>
      )}
      {debuffs.length > 0 && (
        <div>
          <div className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Debuffs</div>
          <div className="flex flex-wrap gap-1">{debuffs.map(renderEffect)}</div>
        </div>
      )}
      {neutrals.length > 0 && (
        <div>
          <div className="text-xs text-zinc-400/60 uppercase tracking-wider mb-1">Other</div>
          <div className="flex flex-wrap gap-1">{neutrals.map(renderEffect)}</div>
        </div>
      )}
    </div>
  )
}
