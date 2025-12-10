"use client"

import type { Player, Item, EquipmentSlot, ItemRarity } from "@/lib/core/game-types"
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
  head: "◇",
  chest: "◈",
  legs: "▽",
  feet: "△",
  hands: "◊",
  ring1: "○",
  ring2: "○",
  amulet: "◎",
  cloak: "▷",
  belt: "□",
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  mainHand: "Weapon",
  offHand: "Off-Hand",
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

// Rarity-based styling for equipment slots
const RARITY_SLOT_STYLES: Record<ItemRarity, string> = {
  common: "border-stone-600/40 bg-stone-800/20",
  uncommon: "border-entity-item/50 bg-entity-item/5",
  rare: "border-entity-rare/60 bg-entity-rare/10",
  legendary: "border-entity-legendary/70 bg-entity-legendary/15 shadow-[inset_0_0_8px_rgba(255,180,50,0.1)]",
}

const RARITY_ICON_STYLES: Record<ItemRarity, string> = {
  common: "text-stone-500",
  uncommon: "text-entity-item/70",
  rare: "text-entity-rare/80",
  legendary: "text-entity-legendary/90",
}

function EquipSlot({ slot, item, compact = false }: { slot: EquipmentSlot; item: Item | null; compact?: boolean }) {
  const rarity = item?.rarity || "common"

  if (compact) {
    // Ultra-compact mode for accessories
    return (
      <div
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors",
          item ? RARITY_SLOT_STYLES[rarity] : "border-stone-700/30 bg-stone-800/10"
        )}
        title={item ? `${item.name} (${rarity})` : SLOT_LABELS[slot]}
      >
        <span className={cn("text-[10px]", item ? RARITY_ICON_STYLES[rarity] : "text-stone-600")}>
          {SLOT_ICONS[slot]}
        </span>
        {item ? (
          <EntityText type={rarity} entity={item} className="text-[10px] truncate max-w-[60px]">
            {item.name}
          </EntityText>
        ) : (
          <span className="text-stone-600 text-[10px]">{SLOT_LABELS[slot]}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded border transition-all",
        item ? RARITY_SLOT_STYLES[rarity] : "border-stone-700/30 bg-stone-800/10"
      )}
    >
      <span className={cn("text-xs w-4 text-center", item ? RARITY_ICON_STYLES[rarity] : "text-stone-600")}>
        {SLOT_ICONS[slot]}
      </span>
      {item ? (
        <EntityText type={rarity} entity={item} className="text-xs truncate flex-1">
          {item.name}
        </EntityText>
      ) : (
        <span className="text-stone-600/60 text-xs italic flex-1">{SLOT_LABELS[slot]}</span>
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

// Section wrapper with subtle visual grouping
function Section({
  title,
  icon,
  children,
  color = "text-muted-foreground",
  className
}: {
  title: string
  icon?: string
  children: React.ReactNode
  color?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-medium", color)}>
        {icon && <span className="opacity-60">{icon}</span>}
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

// Compact stat display in a single row
function StatPair({
  label,
  value,
  suffix = "",
  color
}: {
  label: string
  value: number | string
  suffix?: string
  color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500 text-[10px]">{label}</span>
      <span className={cn("text-xs tabular-nums", color)}>{value}{suffix}</span>
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

  // Count equipped items by rarity for summary
  const equippedItems = equipmentSlots.map(s => equipment[s]).filter(Boolean)
  const rarityCounts = {
    legendary: equippedItems.filter(i => i?.rarity === "legendary").length,
    rare: equippedItems.filter(i => i?.rarity === "rare").length,
    uncommon: equippedItems.filter(i => i?.rarity === "uncommon").length,
    common: equippedItems.filter(i => i?.rarity === "common").length,
  }

  // Check if we have any advanced stats to show
  const hasOffensiveStats = stats.critChance > 0 || stats.critDamage > 1.5 || stats.vampirism > 0
  const hasDefensiveStats = stats.dodgeChance > 0 || stats.blockChance > 0 || stats.thorns > 0
  const hasUtilityStats = stats.luck > 0 || stats.magicFind > 0 || stats.expBonus > 0 || stats.healthRegen > 0 || stats.resourceRegen > 0

  return (
    <div className="h-full flex flex-col py-3 px-2.5 text-sm overflow-y-auto scrollbar-thin">
      {/* ═══ CHARACTER HEADER ═══ */}
      <div className="mb-3 pb-3 border-b border-stone-700/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-primary font-semibold tracking-wide truncate">{player.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-stone-400 bg-stone-800/50 px-1.5 py-0.5 rounded">
                Lv.{stats.level}
              </span>
              {classDef && (
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-800/50", classDef.color)}>
                  {classDef.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ VITALS ═══ */}
      <div className="space-y-1.5 mb-3">
        <StatBar label="HP" current={stats.health} max={effectiveStats.maxHealth} color="health" compact />
        <StatBar label="XP" current={stats.experience} max={stats.experienceToLevel} color="exp" compact />
        {player.resources.max > 0 && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className={cn("uppercase font-medium", resourceColor)}>{player.resources.type}</span>
              <span className="text-stone-400 tabular-nums">
                {player.resources.current}/{player.resources.max}
              </span>
            </div>
            <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
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

      {/* ═══ COMBAT STATS (Always visible, compact 2-col) ═══ */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 py-2 px-2 bg-stone-800/30 rounded border border-stone-700/30 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-orange-400/70 text-[10px]">ATK</span>
          <span className={cn("text-xs font-medium text-orange-400 tabular-nums", attackAnim)}>
            {effectiveStats.attack}
            {totalAttackBonus > 0 && <span className="text-entity-weapon text-[10px]">+{totalAttackBonus}</span>}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-blue-400/70 text-[10px]">DEF</span>
          <span className={cn("text-xs font-medium text-blue-400 tabular-nums", defenseAnim)}>
            {effectiveStats.defense}
            {totalDefenseBonus > 0 && <span className="text-entity-armor text-[10px]">+{totalDefenseBonus}</span>}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cyan-400/70 text-[10px]">SPD</span>
          <span className="text-xs text-cyan-400 tabular-nums">{stats.speed}</span>
        </div>
        {stats.critChance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-amber-400/70 text-[10px]">CRIT</span>
            <span className="text-xs text-amber-400 tabular-nums">{Math.floor(stats.critChance * 100)}%</span>
          </div>
        )}
      </div>

      {/* ═══ EQUIPMENT (Moved up for prominence) ═══ */}
      <Section title="Equipment" icon="◈" color="text-stone-400" className="mb-3">
        {/* Gear summary badges */}
        {equippedItems.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {rarityCounts.legendary > 0 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-entity-legendary/20 text-entity-legendary border border-entity-legendary/30">
                {rarityCounts.legendary} Leg
              </span>
            )}
            {rarityCounts.rare > 0 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-entity-rare/20 text-entity-rare border border-entity-rare/30">
                {rarityCounts.rare} Rare
              </span>
            )}
            {rarityCounts.uncommon > 0 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-entity-item/20 text-entity-item border border-entity-item/30">
                {rarityCounts.uncommon} Unc
              </span>
            )}
          </div>
        )}

        {/* Weapons - prominent display */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <EquipSlot slot="mainHand" item={equipment.mainHand} />
          <EquipSlot slot="offHand" item={equipment.offHand} />
        </div>

        {/* Armor - 3x2 grid for compactness */}
        <div className="grid grid-cols-3 gap-1 mb-1.5">
          <EquipSlot slot="head" item={equipment.head} compact />
          <EquipSlot slot="chest" item={equipment.chest} compact />
          <EquipSlot slot="hands" item={equipment.hands} compact />
          <EquipSlot slot="legs" item={equipment.legs} compact />
          <EquipSlot slot="feet" item={equipment.feet} compact />
          <EquipSlot slot="belt" item={equipment.belt} compact />
        </div>

        {/* Accessories - horizontal row */}
        <div className="flex gap-1 flex-wrap">
          <EquipSlot slot="ring1" item={equipment.ring1} compact />
          <EquipSlot slot="ring2" item={equipment.ring2} compact />
          <EquipSlot slot="amulet" item={equipment.amulet} compact />
          <EquipSlot slot="cloak" item={equipment.cloak} compact />
        </div>
      </Section>

      {/* ═══ STATUS EFFECTS (Important - show early if active) ═══ */}
      {activeEffects.length > 0 && (
        <div className="mb-3 p-2 bg-stone-800/40 rounded border border-stone-700/40">
          <StatusEffectsDisplay effects={activeEffects} compact />
        </div>
      )}

      {/* ═══ ABILITIES ═══ */}
      {player.abilities.length > 0 && (
        <Section title="Abilities" icon="★" color="text-cyan-500/70" className="mb-3">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {player.abilities.slice(0, 6).map((ability) => {
              const cooldown = player.abilityCooldowns[ability.id] || 0
              return (
                <div key={ability.id} className="flex items-center justify-between text-[10px] min-w-0">
                  <EntityText
                    type="ability"
                    entity={ability}
                    className={cn("truncate", cooldown > 0 ? "text-stone-500" : "text-stone-300")}
                  >
                    {ability.name}
                  </EntityText>
                  {cooldown > 0 && <span className="text-stone-500 ml-1 shrink-0">{cooldown}t</span>}
                </div>
              )
            })}
          </div>
          {player.abilities.length > 6 && (
            <span className="text-stone-500 text-[9px]">+{player.abilities.length - 6} more</span>
          )}
        </Section>
      )}

      {/* ═══ ADVANCED STATS (Collapsible area for secondary stats) ═══ */}
      {(hasOffensiveStats || hasDefensiveStats || hasUtilityStats) && (
        <div className="space-y-2 pt-2 border-t border-stone-700/30">
          {/* Offensive */}
          {hasOffensiveStats && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {stats.critDamage > 1.5 && (
                <StatPair label="Crit Dmg" value={`${Math.floor(stats.critDamage * 100)}%`} color="text-orange-300" />
              )}
              {stats.vampirism > 0 && (
                <StatPair label="Lifesteal" value={`${Math.floor(stats.vampirism * 100)}%`} color="text-red-400" />
              )}
            </div>
          )}

          {/* Defensive */}
          {hasDefensiveStats && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {stats.dodgeChance > 0 && (
                <StatPair label="Dodge" value={`${Math.floor(stats.dodgeChance * 100)}%`} color="text-cyan-400" />
              )}
              {stats.blockChance > 0 && (
                <StatPair label="Block" value={`${Math.floor(stats.blockChance * 100)}%`} color="text-blue-400" />
              )}
              {stats.thorns > 0 && (
                <StatPair label="Thorns" value={stats.thorns} color="text-amber-500" />
              )}
            </div>
          )}

          {/* Utility */}
          {hasUtilityStats && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {stats.luck > 0 && (
                <StatPair label="Luck" value={`+${stats.luck}`} color="text-green-400" />
              )}
              {stats.magicFind > 0 && (
                <StatPair label="MF" value={`+${Math.floor(stats.magicFind * 100)}%`} color="text-purple-400" />
              )}
              {stats.expBonus > 0 && (
                <StatPair label="XP Bonus" value={`+${Math.floor(stats.expBonus * 100)}%`} color="text-yellow-400" />
              )}
              {stats.healthRegen > 0 && (
                <StatPair label="HP/turn" value={`+${stats.healthRegen}`} color="text-entity-heal" />
              )}
              {stats.resourceRegen > 0 && (
                <StatPair label="Res/turn" value={`+${stats.resourceRegen}`} color="text-blue-400" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ PARTY ═══ */}
      {party && (party.active.length > 0 || party.reserve.length > 0) && (
        <div className="mt-3 pt-2 border-t border-stone-700/30">
          <PartyPanel party={party} compact />
        </div>
      )}

      {/* Spacer for scroll comfort */}
      <div className="flex-1 min-h-4" />
    </div>
  )
}
