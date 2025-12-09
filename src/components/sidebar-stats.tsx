"use client"

import type { Player } from "@/lib/game-types"
import { EntityText } from "./entity-text"
import { StatBar } from "./stat-bar"
import { StatusEffectsDisplay } from "./status-effects-display"
import { PartyPanel } from "./party-panel"
import { calculateEffectiveStats } from "@/lib/entity-system"
import { getResourceColor, CLASSES } from "@/lib/ability-system"
import { cn } from "@/lib/utils"
import { useValueChange, useResourceChange, useGoldChange } from "@/hooks/use-value-change"

interface SidebarStatsProps {
  player: Player
  floor: number
  currentRoom: number
}

export function SidebarStats({ player, floor, currentRoom }: SidebarStatsProps) {
  const { stats, equipment, activeEffects, party } = player
  const effectiveStats = calculateEffectiveStats(player)
  const classDef = player.class ? CLASSES[player.class] : null
  const resourceColor = getResourceColor(player.resources.type)

  // Animation hooks
  const resourceAnim = useResourceChange(
    player.resources.current,
    player.resources.type as "mana" | "rage" | "energy" | "focus" | "souls"
  )
  const goldAnim = useGoldChange(stats.gold)
  const attackAnim = useValueChange(effectiveStats.attack)
  const defenseAnim = useValueChange(effectiveStats.defense)

  return (
    <div className="h-full flex flex-col py-6 px-4 space-y-6 text-sm">
      <div>
        <h2 className="text-primary font-medium tracking-wide mb-1">{player.name}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Level {stats.level}</span>
          {classDef && <span className={cn("text-xs font-medium", classDef.color)}>{classDef.name}</span>}
        </div>
      </div>

      <div className="space-y-3">
        <StatBar label="HP" current={stats.health} max={effectiveStats.maxHealth} color="health" compact />
        <StatBar label="XP" current={stats.experience} max={stats.experienceToLevel} color="exp" compact />
        {player.resources.max > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={cn("uppercase font-medium", resourceColor)}>{player.resources.type}</span>
              <span className="text-muted-foreground tabular-nums">
                {player.resources.current}/{player.resources.max}
              </span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  player.resources.type === "mana" && "bg-blue-500",
                  player.resources.type === "rage" && "bg-red-500",
                  player.resources.type === "energy" && "bg-yellow-500",
                  player.resources.type === "focus" && "bg-amber-400",
                  player.resources.type === "souls" && "bg-violet-500",
                  resourceAnim,
                )}
                style={{ width: `${(player.resources.current / player.resources.max) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs">Attack</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{stats.attack}</span>
            {equipment.weapon && <span className="text-xs text-entity-weapon">+{equipment.weapon.stats?.attack}</span>}
            {activeEffects.some((e) => e.modifiers.attack) && (
              <span
                className={`text-xs ${activeEffects.reduce((a, e) => a + (e.modifiers.attack ?? 0), 0) > 0 ? "text-sky-400" : "text-purple-400"}`}
              >
                {activeEffects.reduce((a, e) => a + (e.modifiers.attack ?? 0), 0) > 0 ? "+" : ""}
                {activeEffects.reduce((a, e) => a + (e.modifiers.attack ?? 0), 0)}
              </span>
            )}
            <span className={cn(attackAnim)}>
              <EntityText type="damage">{effectiveStats.attack}</EntityText>
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs">Defense</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{stats.defense}</span>
            {equipment.armor && <span className="text-xs text-entity-armor">+{equipment.armor.stats?.defense}</span>}
            {activeEffects.some((e) => e.modifiers.defense) && (
              <span
                className={`text-xs ${activeEffects.reduce((a, e) => a + (e.modifiers.defense ?? 0), 0) > 0 ? "text-sky-400" : "text-purple-400"}`}
              >
                {activeEffects.reduce((a, e) => a + (e.modifiers.defense ?? 0), 0) > 0 ? "+" : ""}
                {activeEffects.reduce((a, e) => a + (e.modifiers.defense ?? 0), 0)}
              </span>
            )}
            <span className={cn(defenseAnim)}>
              <EntityText type="armor">{effectiveStats.defense}</EntityText>
            </span>
          </div>
        </div>
        {stats.critChance > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Crit</span>
            <span className="text-orange-400 text-xs">{Math.floor(stats.critChance * 100)}%</span>
          </div>
        )}
        {stats.dodgeChance > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Dodge</span>
            <span className="text-cyan-400 text-xs">{Math.floor(stats.dodgeChance * 100)}%</span>
          </div>
        )}
      </div>

      <div className="h-px bg-border/50" />

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Gold</span>
          <span className={cn(goldAnim)}>
            <EntityText type="gold">{stats.gold}</EntityText>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Floor</span>
          <EntityText type="location">{floor}</EntityText>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Room</span>
          <span>{currentRoom}</span>
        </div>
      </div>

      {player.abilities.length > 0 && (
        <>
          <div className="h-px bg-border/50" />
          <div className="space-y-2">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Abilities</h3>
            <div className="space-y-1">
              {player.abilities.slice(0, 4).map((ability) => {
                const cooldown = player.abilityCooldowns[ability.id] || 0
                return (
                  <div key={ability.id} className="flex items-center justify-between text-xs">
                    <EntityText
                      type="ability"
                      entity={ability}
                      className={cn("truncate", cooldown > 0 ? "text-stone-500" : "text-stone-300")}
                    >
                      {ability.name}
                    </EntityText>
                    {cooldown > 0 && <span className="text-stone-500 text-[10px]">{cooldown}t</span>}
                  </div>
                )
              })}
              {player.abilities.length > 4 && (
                <span className="text-stone-500 text-[10px]">+{player.abilities.length - 4} more</span>
              )}
            </div>
          </div>
        </>
      )}

      {activeEffects.length > 0 && (
        <>
          <div className="h-px bg-border/50" />
          <StatusEffectsDisplay effects={activeEffects} compact />
        </>
      )}

      {party && (party.active.length > 0 || party.reserve.length > 0) && (
        <>
          <div className="h-px bg-border/50" />
          <PartyPanel party={party} compact />
        </>
      )}

      <div className="h-px bg-border/50" />

      <div className="space-y-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Equipment</h3>
        <div className="space-y-2">
          <div>
            <span className="text-xs text-muted-foreground block mb-0.5">Weapon</span>
            {equipment.weapon ? (
              <EntityText type={equipment.weapon.rarity} entity={equipment.weapon}>{equipment.weapon.name}</EntityText>
            ) : (
              <span className="text-muted-foreground/50 text-xs italic">None</span>
            )}
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-0.5">Armor</span>
            {equipment.armor ? (
              <EntityText type={equipment.armor.rarity} entity={equipment.armor}>{equipment.armor.name}</EntityText>
            ) : (
              <span className="text-muted-foreground/50 text-xs italic">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
