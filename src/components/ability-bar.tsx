"use client"

import { useState } from "react"
import type { Player, Ability, Enemy } from "@/lib/game-types"
import { canUseAbility, getResourceColor, CLASSES } from "@/lib/ability-system"
import { cn } from "@/lib/utils"

interface AbilityBarProps {
  player: Player
  currentEnemy: Enemy | null
  onUseAbility: (ability: Ability) => void
  disabled?: boolean
}

export function AbilityBar({ player, currentEnemy: _currentEnemy, onUseAbility, disabled }: AbilityBarProps) {
  const [hoveredAbility, setHoveredAbility] = useState<Ability | null>(null)

  const resourceColor = getResourceColor(player.resources.type)
  const _classDef = player.class ? CLASSES[player.class] : null

  return (
    <div className="space-y-2">
      {/* Resource Bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className={cn("font-medium uppercase", resourceColor)}>{player.resources.type}</span>
        <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              player.resources.type === "mana" && "bg-blue-500",
              player.resources.type === "rage" && "bg-red-500",
              player.resources.type === "energy" && "bg-yellow-500",
              player.resources.type === "focus" && "bg-amber-400",
              player.resources.type === "souls" && "bg-violet-500",
            )}
            style={{ width: `${(player.resources.current / player.resources.max) * 100}%` }}
          />
        </div>
        <span className="text-stone-400 tabular-nums">
          {player.resources.current}/{player.resources.max}
        </span>
      </div>

      {/* Ability Buttons */}
      <div className="flex flex-wrap gap-2">
        {player.abilities.map((ability) => {
          const { canUse, reason: _reason } = canUseAbility(player, ability)
          const cooldown = player.abilityCooldowns[ability.id] || 0
          const isOnCooldown = cooldown > 0
          const notEnoughResource = player.resources.current < ability.resourceCost

          return (
            <div key={ability.id} className="relative">
              <button
                onClick={() => onUseAbility(ability)}
                onMouseEnter={() => setHoveredAbility(ability)}
                onMouseLeave={() => setHoveredAbility(null)}
                disabled={disabled || !canUse}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium transition-all relative overflow-hidden",
                  "min-w-[80px]",
                  canUse && !disabled
                    ? "bg-stone-700/60 hover:bg-stone-600/60 text-stone-200"
                    : "bg-stone-800/40 text-stone-500 cursor-not-allowed",
                  isOnCooldown && "opacity-60",
                )}
              >
                <span className="relative z-10">{ability.name}</span>

                {/* Cost indicator */}
                <span
                  className={cn(
                    "absolute bottom-0.5 right-1 text-[10px]",
                    notEnoughResource ? "text-red-400" : resourceColor,
                  )}
                >
                  {ability.resourceCost}
                </span>

                {/* Cooldown overlay */}
                {isOnCooldown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60">
                    <span className="text-stone-400 font-bold">{cooldown}</span>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Ability Tooltip */}
      {hoveredAbility && (
        <div className="bg-stone-800/90 rounded p-3 text-sm space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-amber-200">{hoveredAbility.name}</span>
            <div className="flex items-center gap-2 text-xs">
              {hoveredAbility.cooldown > 0 && <span className="text-stone-400">{hoveredAbility.cooldown} turn CD</span>}
              <span className={resourceColor}>
                {hoveredAbility.resourceCost} {hoveredAbility.resourceType}
              </span>
            </div>
          </div>
          <p className="text-stone-400 text-xs">{hoveredAbility.description}</p>
          {hoveredAbility.baseDamage && (
            <div className="text-xs text-red-400">
              Damage: {hoveredAbility.baseDamage}
              {hoveredAbility.damageScaling &&
                ` (+${Math.floor(hoveredAbility.damageScaling.ratio * 100)}% ${hoveredAbility.damageScaling.stat})`}
            </div>
          )}
          {hoveredAbility.baseHealing && (
            <div className="text-xs text-green-400">
              Healing: {hoveredAbility.baseHealing}
              {hoveredAbility.healingScaling &&
                ` (+${Math.floor(hoveredAbility.healingScaling.ratio * 100)}% ${hoveredAbility.healingScaling.stat})`}
            </div>
          )}
          {hoveredAbility.appliesEffects && hoveredAbility.appliesEffects.length > 0 && (
            <div className="text-xs text-violet-400">
              Applies: {hoveredAbility.appliesEffects.map((e) => e.name).join(", ")}
            </div>
          )}
          {hoveredAbility.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hoveredAbility.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-stone-700/50 rounded text-stone-500">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
