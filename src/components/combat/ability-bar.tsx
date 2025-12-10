"use client"

import { useState } from "react"
import type { Player, Ability, SustainedAbility } from "@/lib/core/game-types"
import { canUseAbility, getResourceColor } from "@/lib/character/ability-system"
import { canActivateSustained, getEffectiveResources, getSustainedDisplayColor } from "@/lib/character/sustained-ability-system"
import { cn } from "@/lib/core/utils"

interface AbilityBarProps {
  player: Player
  onUseAbility: (ability: Ability) => void
  onToggleSustained?: (ability: SustainedAbility) => void
  disabled?: boolean
}

export function AbilityBar({ player, onUseAbility, onToggleSustained, disabled }: AbilityBarProps) {
  const [hoveredAbility, setHoveredAbility] = useState<Ability | null>(null)
  const [hoveredSustained, setHoveredSustained] = useState<SustainedAbility | null>(null)

  const resourceColor = getResourceColor(player.resources.type)

  // Calculate effective resources after sustained reserves
  const effectiveResources = getEffectiveResources(player.resources, player.sustainedAbilities)

  return (
    <div className="space-y-2">
      {/* Resource Bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className={cn("font-medium uppercase", resourceColor)}>{player.resources.type}</span>
        <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden relative">
          {/* Reserved portion (darker) */}
          {effectiveResources.reserved > 0 && (
            <div
              className="absolute right-0 top-0 h-full bg-stone-700/50"
              style={{ width: `${(effectiveResources.reserved / player.resources.max) * 100}%` }}
            />
          )}
          {/* Available portion */}
          <div
            className={cn(
              "h-full transition-all duration-300",
              player.resources.type === "mana" && "bg-blue-500",
              player.resources.type === "rage" && "bg-red-500",
              player.resources.type === "energy" && "bg-yellow-500",
              player.resources.type === "focus" && "bg-amber-400",
              player.resources.type === "souls" && "bg-violet-500",
            )}
            style={{ width: `${(effectiveResources.current / player.resources.max) * 100}%` }}
          />
        </div>
        <span className="text-stone-400 tabular-nums">
          {effectiveResources.current}/{effectiveResources.max}
          {effectiveResources.reserved > 0 && (
            <span className="text-stone-600 text-[10px]"> ({effectiveResources.reserved} reserved)</span>
          )}
        </span>
      </div>

      {/* Sustained Abilities */}
      {player.sustainedAbilities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {player.sustainedAbilities.map((ability) => {
            const { canActivate } = ability.isActive
              ? { canActivate: true }
              : canActivateSustained(
                  ability,
                  player.resources.current,
                  player.resources.max,
                  player.stats.health,
                  player.stats.maxHealth,
                  player.sustainedAbilities
                )
            const displayColor = getSustainedDisplayColor(ability)

            return (
              <div key={ability.id} className="relative">
                <button
                  onClick={() => onToggleSustained?.(ability)}
                  onMouseEnter={() => setHoveredSustained(ability)}
                  onMouseLeave={() => setHoveredSustained(null)}
                  disabled={disabled || (!ability.isActive && !canActivate)}
                  className={cn(
                    "px-3 py-2 rounded text-sm font-medium transition-all relative overflow-hidden",
                    "min-w-[80px] border-2",
                    ability.isActive
                      ? "border-amber-500/60 bg-stone-700/80"
                      : "border-stone-600/40 bg-stone-800/40",
                    canActivate || ability.isActive
                      ? "hover:bg-stone-600/60 text-stone-200"
                      : "text-stone-500 cursor-not-allowed",
                  )}
                >
                  <span className={cn("relative z-10", displayColor)}>{ability.name}</span>

                  {/* Toggle indicator */}
                  <span
                    className={cn(
                      "absolute top-0.5 right-1 text-[10px]",
                      ability.isActive ? "text-amber-400" : "text-stone-600",
                    )}
                  >
                    {ability.isActive ? "ON" : "OFF"}
                  </span>

                  {/* Reserve cost indicator */}
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-1 text-[10px]",
                      resourceColor,
                    )}
                  >
                    -{ability.sustained.resourceReserve}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Ability Buttons */}
      <div className="flex flex-wrap gap-2">
        {player.abilities.map((ability) => {
          const { canUse } = canUseAbility(player, ability)
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

      {/* Sustained Ability Tooltip */}
      {hoveredSustained && (
        <div className="bg-stone-800/90 p-3 text-sm space-y-2 mt-2 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-amber-200">{hoveredSustained.name}</span>
            <span className={cn("text-xs", hoveredSustained.isActive ? "text-amber-400" : "text-stone-500")}>
              {hoveredSustained.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="text-stone-400 text-xs">{hoveredSustained.description}</p>
          <div className="text-xs space-y-1">
            <div className={resourceColor}>
              Reserves: {hoveredSustained.sustained.resourceReserve} {hoveredSustained.resourceType}
            </div>
            {hoveredSustained.sustained.activationCost > 0 && (
              <div className="text-stone-500">
                Activation cost: {hoveredSustained.sustained.activationCost}
              </div>
            )}
            {hoveredSustained.sustained.healthReserve && (
              <div className="text-red-400">
                Health reserved: {hoveredSustained.sustained.healthReserve}
              </div>
            )}
            {hoveredSustained.sustained.tickEffect && (
              <div className="text-violet-400">
                Per turn: {hoveredSustained.sustained.tickEffect.narration}
              </div>
            )}
          </div>
          <div className="text-xs text-stone-500 border-t border-stone-700 pt-1 mt-1">
            Effect: {hoveredSustained.sustained.constantEffect.description}
          </div>
          {hoveredSustained.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hoveredSustained.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-stone-700/50 rounded text-stone-500">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ability Tooltip */}
      {hoveredAbility && !hoveredSustained && (
        <div className="bg-stone-800/90 p-3 text-sm space-y-2 mt-2">
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
