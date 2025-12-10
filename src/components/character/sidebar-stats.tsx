"use client"

import type { Player, Item, EquipmentSlot } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "./stat-bar"
import { StatusEffectsDisplay } from "@/components/effects/status-effects-display"
import { PartyPanel } from "@/components/party/party-panel"
import { calculateEffectiveStats } from "@/lib/entity/entity-system"
import { getResourceColor, CLASSES } from "@/lib/character/ability-system"
import { cn } from "@/lib/core/utils"
import { useValueChange, useResourceChange } from "@/hooks/use-value-change"

interface SidebarStatsProps {
  player: Player
}

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  mainHand: "⚔",
  offHand: "🛡",
  head: "👑",
  chest: "🎽",
  legs: "👖",
  feet: "👢",
  hands: "🧤",
  ring1: "💍",
  ring2: "💍",
  amulet: "📿",
  cloak: "🧣",
  belt: "📦",
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  mainHand: "Main Hand",
  offHand: "Off Hand",
  head: "Head",
  chest: "Chest",
  legs: "Legs",
  feet: "Feet",
  hands: "Hands",
  ring1: "Ring",
  ring2: "Ring",
  amulet: "Amulet",
  cloak: "Cloak",
  belt: "Belt",
}

function EquipSlot({ slot, item }: { slot: EquipmentSlot; item: Item | null }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-xs opacity-60 w-4">{SLOT_ICONS[slot]}</span>
      {item ? (
        <EntityText type={item.rarity} entity={item} className="text-xs truncate flex-1">
          {item.name}
        </EntityText>
      ) : (
        <span className="text-muted-foreground/40 text-xs italic">{SLOT_LABELS[slot]}</span>
      )}
    </div>
  )
}

function StatLine({ label, value, color, labelColor, suffix = "" }: { label: string; value: number | string; color?: string; labelColor?: string; suffix?: string }) {
  if (typeof value === "number" && value === 0) return null
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-xs", labelColor || "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs", color)}>{typeof value === "number" && value > 0 ? `+${value}` : value}{suffix}</span>
    </div>
  )
}

export function SidebarStats({ player }: SidebarStatsProps) {
  const { stats, equipment, activeEffects, party } = player
  const effectiveStats = calculateEffectiveStats(player)
  const classDef = player.class ? CLASSES[player.class] : null
  const resourceColor = getResourceColor(player.resources.type)

  // Animation hooks
  const resourceAnim = useResourceChange(
    player.resources.current,
    player.resources.type as "mana" | "rage" | "energy" | "focus" | "souls"
  )
  const attackAnim = useValueChange(effectiveStats.attack)
  const defenseAnim = useValueChange(effectiveStats.defense)

  // Calculate total equipment bonuses
  const equipmentSlots = Object.keys(equipment) as EquipmentSlot[]
  const totalAttackBonus = equipmentSlots.reduce((sum, slot) => sum + (equipment[slot]?.stats?.attack ?? 0), 0)
  const totalDefenseBonus = equipmentSlots.reduce((sum, slot) => sum + (equipment[slot]?.stats?.defense ?? 0), 0)

  return (
    <div className="h-full flex flex-col py-4 px-3 space-y-4 text-sm overflow-y-auto scrollbar-thin">
      {/* Character Header */}
      <div>
        <h2 className="text-primary font-medium tracking-wide mb-1">{player.name}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Level {stats.level}</span>
          {classDef && <span className={cn("text-xs font-medium", classDef.color)}>{classDef.name}</span>}
        </div>
      </div>

      {/* Vitals */}
      <div className="space-y-2">
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

      <div className="h-px bg-border/50" />

      {/* Core Stats */}
      <div className="space-y-1.5">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Combat</h3>
        <div className="flex justify-between items-center">
          <span className="text-orange-400/80 text-xs">Attack</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{stats.attack}</span>
            {totalAttackBonus > 0 && <span className="text-xs text-entity-weapon">+{totalAttackBonus}</span>}
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
          <span className="text-blue-400/80 text-xs">Defense</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{stats.defense}</span>
            {totalDefenseBonus > 0 && <span className="text-xs text-entity-armor">+{totalDefenseBonus}</span>}
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
        <StatLine label="Speed" value={stats.speed} labelColor="text-cyan-400/80" color="text-cyan-400" />
      </div>

      {/* Offensive Stats */}
      {(stats.critChance > 0 || stats.critDamage > 1.5 || stats.vampirism > 0) && (
        <div className="space-y-1.5">
          <h3 className="text-xs text-orange-500/60 uppercase tracking-wider mb-2">Offense</h3>
          {stats.critChance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-orange-400/70 text-xs">Crit Chance</span>
              <span className="text-orange-400 text-xs">{Math.floor(stats.critChance * 100)}%</span>
            </div>
          )}
          {stats.critDamage > 1.5 && (
            <div className="flex justify-between items-center">
              <span className="text-orange-300/70 text-xs">Crit Damage</span>
              <span className="text-orange-300 text-xs">{Math.floor(stats.critDamage * 100)}%</span>
            </div>
          )}
          {stats.vampirism > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-red-400/70 text-xs">Vampirism</span>
              <span className="text-red-400 text-xs">{Math.floor(stats.vampirism * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Defensive Stats */}
      {(stats.dodgeChance > 0 || stats.blockChance > 0 || stats.thorns > 0) && (
        <div className="space-y-1.5">
          <h3 className="text-xs text-blue-500/60 uppercase tracking-wider mb-2">Defense</h3>
          {stats.dodgeChance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-cyan-400/70 text-xs">Dodge</span>
              <span className="text-cyan-400 text-xs">{Math.floor(stats.dodgeChance * 100)}%</span>
            </div>
          )}
          {stats.blockChance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-blue-400/70 text-xs">Block</span>
              <span className="text-blue-400 text-xs">{Math.floor(stats.blockChance * 100)}%</span>
            </div>
          )}
          {stats.thorns > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-amber-500/70 text-xs">Thorns</span>
              <span className="text-amber-500 text-xs">{stats.thorns}</span>
            </div>
          )}
        </div>
      )}

      {/* Utility Stats */}
      {(stats.luck > 0 || stats.magicFind > 0 || stats.expBonus > 0 || stats.healthRegen > 0 || stats.resourceRegen > 0) && (
        <div className="space-y-1.5">
          <h3 className="text-xs text-emerald-500/60 uppercase tracking-wider mb-2">Utility</h3>
          {stats.luck > 0 && <StatLine label="Luck" value={stats.luck} labelColor="text-green-400/70" color="text-green-400" />}
          {stats.magicFind > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-purple-400/70 text-xs">Magic Find</span>
              <span className="text-purple-400 text-xs">+{Math.floor(stats.magicFind * 100)}%</span>
            </div>
          )}
          {stats.expBonus > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-yellow-400/70 text-xs">Exp Bonus</span>
              <span className="text-yellow-400 text-xs">+{Math.floor(stats.expBonus * 100)}%</span>
            </div>
          )}
          {stats.healthRegen > 0 && <StatLine label="HP Regen" value={stats.healthRegen} labelColor="text-emerald-400/70" color="text-entity-heal" suffix="/turn" />}
          {stats.resourceRegen > 0 && <StatLine label="Resource Regen" value={stats.resourceRegen} labelColor="text-blue-400/70" color="text-blue-400" suffix="/turn" />}
        </div>
      )}

      {/* Abilities */}
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

      {/* Status Effects */}
      {activeEffects.length > 0 && (
        <>
          <div className="h-px bg-border/50" />
          <StatusEffectsDisplay effects={activeEffects} compact />
        </>
      )}

      {/* Party */}
      {party && (party.active.length > 0 || party.reserve.length > 0) && (
        <>
          <div className="h-px bg-border/50" />
          <PartyPanel party={party} compact />
        </>
      )}

      <div className="h-px bg-border/50" />

      {/* Equipment Grid */}
      <div className="space-y-2">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Equipment</h3>

        {/* Weapons Row */}
        <div className="grid grid-cols-2 gap-x-2">
          <EquipSlot slot="mainHand" item={equipment.mainHand} />
          <EquipSlot slot="offHand" item={equipment.offHand} />
        </div>

        {/* Armor Slots */}
        <div className="space-y-0.5">
          <EquipSlot slot="head" item={equipment.head} />
          <EquipSlot slot="chest" item={equipment.chest} />
          <EquipSlot slot="hands" item={equipment.hands} />
          <EquipSlot slot="legs" item={equipment.legs} />
          <EquipSlot slot="feet" item={equipment.feet} />
        </div>

        {/* Accessories */}
        <div className="grid grid-cols-2 gap-x-2">
          <EquipSlot slot="ring1" item={equipment.ring1} />
          <EquipSlot slot="ring2" item={equipment.ring2} />
        </div>
        <div className="space-y-0.5">
          <EquipSlot slot="amulet" item={equipment.amulet} />
          <EquipSlot slot="cloak" item={equipment.cloak} />
          <EquipSlot slot="belt" item={equipment.belt} />
        </div>
      </div>
    </div>
  )
}
