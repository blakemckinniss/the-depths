"use client"

import { useState, useMemo } from "react"
import type { Player, Enemy, Spell, SpellBook, SpellSchool } from "@/lib/core/game-types"
import { canCastSpell } from "@/lib/magic/spell-system"
import { cn } from "@/lib/core/utils"

interface SpellBarProps {
  player: Player
  spellBook: SpellBook
  onCastSpell: (spell: Spell) => void
  inCombat: boolean
  disabled?: boolean
  currentEnemy?: Enemy | null
}

const SCHOOL_COLORS: Record<SpellSchool, string> = {
  fire: "text-orange-400",
  ice: "text-cyan-400",
  lightning: "text-yellow-300",
  earth: "text-amber-600",
  holy: "text-amber-200",
  shadow: "text-purple-400",
  nature: "text-green-400",
  spirit: "text-blue-300",
  arcane: "text-violet-400",
  illusion: "text-pink-300",
  enchantment: "text-rose-400",
  transmutation: "text-teal-400",
  blood: "text-red-500",
  void: "text-fuchsia-500",
  temporal: "text-sky-300",
  universal: "text-stone-300",
}

const SCHOOL_BG: Record<SpellSchool, string> = {
  fire: "bg-orange-500/20 border-orange-500/40",
  ice: "bg-cyan-500/20 border-cyan-500/40",
  lightning: "bg-yellow-500/20 border-yellow-500/40",
  earth: "bg-amber-700/20 border-amber-700/40",
  holy: "bg-amber-300/20 border-amber-300/40",
  shadow: "bg-purple-500/20 border-purple-500/40",
  nature: "bg-green-500/20 border-green-500/40",
  spirit: "bg-blue-400/20 border-blue-400/40",
  arcane: "bg-violet-500/20 border-violet-500/40",
  illusion: "bg-pink-400/20 border-pink-400/40",
  enchantment: "bg-rose-500/20 border-rose-500/40",
  transmutation: "bg-teal-500/20 border-teal-500/40",
  blood: "bg-red-600/20 border-red-600/40",
  void: "bg-fuchsia-600/20 border-fuchsia-600/40",
  temporal: "bg-sky-400/20 border-sky-400/40",
  universal: "bg-stone-400/20 border-stone-400/40",
}

export function SpellBar({
  player,
  spellBook,
  onCastSpell,
  inCombat,
  disabled,
  currentEnemy,
}: SpellBarProps) {
  const [hoveredSpell, setHoveredSpell] = useState<Spell | null>(null)
  const [filterSchool, setFilterSchool] = useState<SpellSchool | "all">("all")

  // Get available spells based on context
  const availableSpells = useMemo(() => {
    const contextFilter = inCombat ? "combat_only" : "exploration"

    // Filter spells from the player's spell book
    const allAvailable = spellBook.spells.filter(
      (spell) => spell.usageContext === contextFilter || spell.usageContext === "anytime"
    )

    if (filterSchool === "all") return allAvailable
    return allAvailable.filter((spell) => spell.school === filterSchool)
  }, [spellBook.spells, inCombat, filterSchool])

  // Get unique schools for filtering
  const availableSchools = useMemo(() => {
    const schools = new Set<SpellSchool>()
    spellBook.spells.forEach((s) => schools.add(s.school))
    return Array.from(schools)
  }, [spellBook.spells])

  if (spellBook.spells.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* School Filter */}
      {availableSchools.length > 1 && (
        <div className="flex flex-wrap gap-1 text-[10px]">
          <button
            onClick={() => setFilterSchool("all")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-colors",
              filterSchool === "all"
                ? "bg-stone-600 text-stone-200"
                : "bg-stone-800/50 text-stone-500 hover:text-stone-300"
            )}
          >
            All
          </button>
          {availableSchools.map((school) => (
            <button
              key={school}
              onClick={() => setFilterSchool(school)}
              className={cn(
                "px-1.5 py-0.5 rounded transition-colors capitalize",
                filterSchool === school
                  ? cn("border", SCHOOL_BG[school], SCHOOL_COLORS[school])
                  : "bg-stone-800/50 text-stone-500 hover:text-stone-300"
              )}
            >
              {school}
            </button>
          ))}
        </div>
      )}

      {/* Spell Grid */}
      <div className="flex flex-wrap gap-2">
        {availableSpells.map((spell) => {
          const castCheck = canCastSpell(player, spell, spellBook, {
            inCombat,
            hasTarget: !!currentEnemy,
            targetType: currentEnemy ? "enemy" : undefined,
          })
          const cooldown = spellBook.cooldowns[spell.id] || 0
          const isOnCooldown = cooldown > 0
          const notEnoughResource = player.resources.current < spell.resourceCost

          return (
            <div key={spell.id} className="relative">
              <button
                onClick={() => onCastSpell(spell)}
                onMouseEnter={() => setHoveredSpell(spell)}
                onMouseLeave={() => setHoveredSpell(null)}
                disabled={disabled || !castCheck.canCast}
                className={cn(
                  "px-3 py-2 rounded text-sm font-medium transition-all relative overflow-hidden",
                  "min-w-[90px] border",
                  SCHOOL_BG[spell.school],
                  castCheck.canCast && !disabled
                    ? cn("hover:brightness-110", SCHOOL_COLORS[spell.school])
                    : "text-stone-500 cursor-not-allowed brightness-50"
                )}
              >
                <span className="relative z-10">{spell.name}</span>

                {/* Resource cost indicator */}
                <span
                  className={cn(
                    "absolute bottom-0.5 right-1 text-[10px]",
                    notEnoughResource ? "text-red-400" : "text-stone-400"
                  )}
                >
                  {spell.resourceCost}
                </span>

                {/* Cooldown overlay */}
                {isOnCooldown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/70">
                    <span className="text-stone-400 font-bold">{cooldown}</span>
                  </div>
                )}
              </button>
            </div>
          )
        })}

        {availableSpells.length === 0 && (
          <span className="text-xs text-stone-600 italic">
            No spells available for {inCombat ? "combat" : "exploration"}
          </span>
        )}
      </div>

      {/* Spell Tooltip */}
      {hoveredSpell && (
        <div
          className={cn(
            "p-3 text-sm space-y-2 mt-2 border rounded",
            SCHOOL_BG[hoveredSpell.school]
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("font-medium", SCHOOL_COLORS[hoveredSpell.school])}>
              {hoveredSpell.name}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 capitalize">{hoveredSpell.school}</span>
              {hoveredSpell.cooldown > 0 && (
                <span className="text-stone-400">{hoveredSpell.cooldown} turn CD</span>
              )}
              <span className="text-stone-400">{hoveredSpell.resourceCost} cost</span>
            </div>
          </div>

          <p className="text-stone-400 text-xs">{hoveredSpell.description}</p>

          {/* Damage info */}
          {hoveredSpell.damage && (
            <div className="text-xs text-red-400">
              Damage: {hoveredSpell.damage.base}
              {hoveredSpell.damage.scaling &&
                ` (+${Math.floor(hoveredSpell.damage.scaling.ratio * 100)}% ${hoveredSpell.damage.scaling.stat})`}
              {hoveredSpell.damage.type !== "physical" && (
                <span className="text-stone-500 ml-1">({hoveredSpell.damage.type})</span>
              )}
            </div>
          )}

          {/* Healing info */}
          {hoveredSpell.healing && (
            <div className="text-xs text-green-400">
              Healing: {hoveredSpell.healing.base}
              {hoveredSpell.healing.scaling &&
                ` (+${Math.floor(hoveredSpell.healing.scaling.ratio * 100)}% ${hoveredSpell.healing.scaling.stat})`}
            </div>
          )}

          {/* Effects applied */}
          {hoveredSpell.appliesEffects && hoveredSpell.appliesEffects.length > 0 && (
            <div className="text-xs text-violet-400">
              Applies: {hoveredSpell.appliesEffects.map((e) => e.name).join(", ")}
            </div>
          )}

          {/* Utility effect */}
          {hoveredSpell.utilityEffect && (
            <div className="text-xs text-cyan-400">
              Effect: {hoveredSpell.utilityEffect.type.replace(/_/g, " ")}
              {hoveredSpell.utilityEffect.value && ` (${hoveredSpell.utilityEffect.value})`}
            </div>
          )}

          {/* Target type */}
          <div className="text-xs text-stone-500">
            Target: {hoveredSpell.targetType.replace(/_/g, " ")} •{" "}
            {hoveredSpell.usageContext.replace(/_/g, " ")}
          </div>

          {/* Tags */}
          {hoveredSpell.tags && hoveredSpell.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hoveredSpell.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-stone-700/50 rounded text-stone-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {hoveredSpell.source && (
            <div className="text-[10px] text-stone-600 border-t border-stone-700/50 pt-1">
              Learned from: {hoveredSpell.source.replace(/_/g, " ")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
