"use client"

import type { Companion } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"
import { getBondTier, getCompanionColor } from "@/lib/entity/companion-system"
import { EntityText } from "@/components/narrative/entity-text"

interface CompanionDisplayProps {
  companion: Companion
  compact?: boolean
  onSelect?: () => void
  selected?: boolean
}

export function CompanionDisplay({ companion, compact = false, onSelect, selected }: CompanionDisplayProps) {
  const bondTier = getBondTier(companion.bond.level)
  const companionColor = getCompanionColor(companion)

  if (!companion.alive) {
    return (
      <div className="text-xs text-muted-foreground italic opacity-50">
        {companion.name} <span className="text-red-400/50">fallen</span>
      </div>
    )
  }

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left p-2 rounded transition-colors",
          selected ? "bg-teal-500/20" : "hover:bg-zinc-800/50",
          onSelect && "cursor-pointer",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <EntityText type="companion" entity={companion} className={cn("text-sm font-medium truncate", companionColor)}>
            {companion.name}
          </EntityText>
          <span className="text-[10px] text-muted-foreground">{companion.species}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${(companion.stats.health / companion.stats.maxHealth) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {companion.stats.health}/{companion.stats.maxHealth}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">Bond:</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                bondTier === "soulbound"
                  ? "bg-violet-500"
                  : bondTier === "loyal"
                    ? "bg-cyan-500"
                    : bondTier === "friendly"
                      ? "bg-emerald-500"
                      : bondTier === "neutral"
                        ? "bg-zinc-500"
                        : bondTier === "wary"
                          ? "bg-orange-500"
                          : "bg-red-500",
              )}
              style={{ width: `${companion.bond.level}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground capitalize">{bondTier}</span>
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg space-y-3 transition-colors",
        selected ? "bg-teal-500/15 ring-1 ring-teal-500/30" : "bg-zinc-900/50",
        onSelect && "cursor-pointer hover:bg-zinc-800/50",
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <EntityText type="companion" entity={companion} className={cn("font-medium", companionColor)}>
            {companion.name}
          </EntityText>
          <p className="text-xs text-muted-foreground">{companion.species}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              companion.combatBehavior.style === "aggressive" && "bg-red-500/20 text-red-400",
              companion.combatBehavior.style === "defensive" && "bg-blue-500/20 text-blue-400",
              companion.combatBehavior.style === "support" && "bg-green-500/20 text-green-400",
              companion.combatBehavior.style === "tactical" && "bg-amber-500/20 text-amber-400",
              companion.combatBehavior.style === "chaotic" && "bg-purple-500/20 text-purple-400",
              companion.combatBehavior.style === "passive" && "bg-zinc-500/20 text-zinc-400",
            )}
          >
            {companion.combatBehavior.style}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>Health</span>
            <span className="tabular-nums">
              {companion.stats.health}/{companion.stats.maxHealth}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${(companion.stats.health / companion.stats.maxHealth) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px]">ATK</span>
            <p className="text-entity-damage">{companion.stats.attack}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">DEF</span>
            <p className="text-entity-armor">{companion.stats.defense}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">SPD</span>
            <p className="text-cyan-400">{companion.stats.speed}</p>
          </div>
        </div>
      </div>

      {/* Bond */}
      <div>
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-muted-foreground">Bond</span>
          <span className={companionColor}>
            {bondTier} ({companion.bond.level})
          </span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              bondTier === "soulbound"
                ? "bg-violet-500"
                : bondTier === "loyal"
                  ? "bg-cyan-500"
                  : bondTier === "friendly"
                    ? "bg-emerald-500"
                    : bondTier === "neutral"
                      ? "bg-zinc-500"
                      : bondTier === "wary"
                        ? "bg-orange-500"
                        : "bg-red-500",
            )}
            style={{ width: `${companion.bond.level}%` }}
          />
        </div>
        {companion.bond.mood && (
          <p className="text-[10px] text-muted-foreground mt-1 italic">Mood: {companion.bond.mood}</p>
        )}
      </div>

      {/* Abilities */}
      {companion.abilities.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Abilities</p>
          <div className="space-y-1">
            {companion.abilities.map((ability) => (
              <div key={ability.id} className="flex items-center justify-between text-xs">
                <EntityText
                  type="ability"
                  entity={ability}
                  className={ability.currentCooldown > 0 ? "text-zinc-500" : "text-zinc-300"}
                >
                  {ability.name}
                </EntityText>
                {ability.currentCooldown > 0 && (
                  <span className="text-zinc-600 text-[10px]">{ability.currentCooldown}t</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quirk */}
      {companion.quirk && (
        <p className="text-[10px] text-muted-foreground italic border-t border-zinc-800 pt-2">{companion.quirk}</p>
      )}

      {/* Evolution hint */}
      {companion.evolution?.potential && (
        <p className="text-[10px] text-violet-400/70 italic">{companion.evolution.potential}</p>
      )}

      {/* Flags */}
      {companion.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {companion.flags.map((flag) => (
            <span
              key={flag}
              className={cn(
                "text-[9px] px-1 py-0.5 rounded",
                flag === "evolving" && "bg-violet-500/20 text-violet-400",
                flag === "temporary" && "bg-zinc-500/20 text-zinc-400",
                flag === "betrayal_chance" && "bg-red-500/20 text-red-400",
                flag === "summon" && "bg-blue-500/20 text-blue-400",
                flag === "cannot_die" && "bg-amber-500/20 text-amber-400",
              )}
            >
              {flag.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
