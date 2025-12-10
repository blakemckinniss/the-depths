/**
 * Ego Item System
 *
 * Procedural enchantment system for generating magical items with
 * random prefixes and suffixes (egos). Based on item-taxonomy enchantments.
 */

import type { Item, ItemRarity, StatusEffect } from "@/lib/core/game-types"
import type { ItemCategory } from "./item-taxonomy"
import { createStatusEffect } from "@/lib/entity/entity-system"

// =============================================================================
// EGO DEFINITIONS
// =============================================================================

export interface EgoModifier {
  id: string
  name: string
  type: "prefix" | "suffix"
  tier: 1 | 2 | 3 | 4 | 5
  applicableTo: ItemCategory[]
  modifiers: {
    attack?: number
    defense?: number
    health?: number
    healthRegen?: number
    critChance?: number
    critDamage?: number
    goldMultiplier?: number
    expMultiplier?: number
  }
  onHitEffect?: () => StatusEffect
  procChance?: number // for on-hit effects
  description: string
  loreFragment?: string
}

// =============================================================================
// PREFIX DEFINITIONS (appear before item name)
// =============================================================================

export const PREFIXES: EgoModifier[] = [
  // Tier 1 - Common
  { id: "sharp", name: "Sharp", type: "prefix", tier: 1, applicableTo: ["weapon"], modifiers: { attack: 2 }, description: "+2 Attack" },
  { id: "sturdy", name: "Sturdy", type: "prefix", tier: 1, applicableTo: ["armor"], modifiers: { defense: 2 }, description: "+2 Defense" },
  { id: "healthy", name: "Healthy", type: "prefix", tier: 1, applicableTo: ["armor", "trinket"], modifiers: { health: 10 }, description: "+10 Health" },

  // Tier 2 - Uncommon
  { id: "keen", name: "Keen", type: "prefix", tier: 2, applicableTo: ["weapon"], modifiers: { attack: 4, critChance: 0.05 }, description: "+4 Attack, +5% Crit" },
  { id: "reinforced", name: "Reinforced", type: "prefix", tier: 2, applicableTo: ["armor"], modifiers: { defense: 4 }, description: "+4 Defense" },
  { id: "vampiric", name: "Vampiric", type: "prefix", tier: 2, applicableTo: ["weapon"], modifiers: { healthRegen: 1 }, description: "Regenerate 1 HP/turn", loreFragment: "Drinks deep of spilled blood." },

  // Tier 3 - Rare
  { id: "deadly", name: "Deadly", type: "prefix", tier: 3, applicableTo: ["weapon"], modifiers: { attack: 7, critChance: 0.1 }, description: "+7 Attack, +10% Crit" },
  { id: "fortified", name: "Fortified", type: "prefix", tier: 3, applicableTo: ["armor"], modifiers: { defense: 6, health: 15 }, description: "+6 Defense, +15 Health" },
  {
    id: "flaming", name: "Flaming", type: "prefix", tier: 3, applicableTo: ["weapon"],
    modifiers: { attack: 3 },
    onHitEffect: () => createStatusEffect({
      name: "Burning",
      effectType: "debuff",
      duration: 2,
      modifiers: { healthRegen: -3 },
      description: "Fire burns the target.",
      sourceType: "item",
    }),
    procChance: 0.25,
    description: "+3 Attack, 25% chance to burn",
    loreFragment: "Flames dance along the edge.",
  },
  {
    id: "freezing", name: "Freezing", type: "prefix", tier: 3, applicableTo: ["weapon"],
    modifiers: { attack: 2 },
    onHitEffect: () => createStatusEffect({
      name: "Chilled",
      effectType: "debuff",
      duration: 2,
      modifiers: { attack: -2, defense: -2 },
      description: "Cold slows the target.",
      sourceType: "item",
    }),
    procChance: 0.25,
    description: "+2 Attack, 25% chance to chill",
    loreFragment: "Frost crackles along the surface.",
  },

  // Tier 4 - Epic
  { id: "vicious", name: "Vicious", type: "prefix", tier: 4, applicableTo: ["weapon"], modifiers: { attack: 10, critDamage: 0.5 }, description: "+10 Attack, +50% Crit Damage" },
  { id: "impenetrable", name: "Impenetrable", type: "prefix", tier: 4, applicableTo: ["armor"], modifiers: { defense: 9, health: 25 }, description: "+9 Defense, +25 Health" },
  {
    id: "corrupting", name: "Corrupting", type: "prefix", tier: 4, applicableTo: ["weapon"],
    modifiers: { attack: 5 },
    onHitEffect: () => createStatusEffect({
      name: "Corruption",
      effectType: "debuff",
      duration: 3,
      modifiers: { attack: -4, defense: -4 },
      description: "Dark corruption weakens the target.",
      sourceType: "item",
    }),
    procChance: 0.3,
    description: "+5 Attack, 30% chance to corrupt",
    loreFragment: "Whispers of the void echo within.",
  },

  // Tier 5 - Legendary
  { id: "devastating", name: "Devastating", type: "prefix", tier: 5, applicableTo: ["weapon"], modifiers: { attack: 15, critChance: 0.15, critDamage: 0.75 }, description: "+15 Attack, +15% Crit, +75% Crit Damage" },
  { id: "invincible", name: "Invincible", type: "prefix", tier: 5, applicableTo: ["armor"], modifiers: { defense: 12, health: 40, healthRegen: 2 }, description: "+12 Defense, +40 Health, +2 Regen" },
  {
    id: "godslayer", name: "Godslayer", type: "prefix", tier: 5, applicableTo: ["weapon"],
    modifiers: { attack: 12 },
    onHitEffect: () => createStatusEffect({
      name: "Divine Wound",
      effectType: "debuff",
      duration: -1, // permanent
      modifiers: { maxHealth: -20 },
      description: "A wound that cannot heal.",
      sourceType: "item",
    }),
    procChance: 0.15,
    description: "+12 Attack, 15% chance to inflict permanent wound",
    loreFragment: "Forged to slay the divine.",
  },
]

// =============================================================================
// SUFFIX DEFINITIONS (appear after item name)
// =============================================================================

export const SUFFIXES: EgoModifier[] = [
  // Tier 1
  { id: "of_vitality", name: "of Vitality", type: "suffix", tier: 1, applicableTo: ["armor", "trinket"], modifiers: { health: 10 }, description: "+10 Health" },
  { id: "of_strength", name: "of Strength", type: "suffix", tier: 1, applicableTo: ["weapon", "trinket"], modifiers: { attack: 2 }, description: "+2 Attack" },
  { id: "of_protection", name: "of Protection", type: "suffix", tier: 1, applicableTo: ["armor", "trinket"], modifiers: { defense: 2 }, description: "+2 Defense" },

  // Tier 2
  { id: "of_the_bear", name: "of the Bear", type: "suffix", tier: 2, applicableTo: ["armor", "trinket"], modifiers: { health: 20, defense: 1 }, description: "+20 Health, +1 Defense" },
  { id: "of_the_wolf", name: "of the Wolf", type: "suffix", tier: 2, applicableTo: ["weapon", "trinket"], modifiers: { attack: 3, critChance: 0.05 }, description: "+3 Attack, +5% Crit" },
  { id: "of_greed", name: "of Greed", type: "suffix", tier: 2, applicableTo: ["weapon", "armor", "trinket"], modifiers: { goldMultiplier: 1.15 }, description: "+15% Gold Find" },

  // Tier 3
  { id: "of_the_giant", name: "of the Giant", type: "suffix", tier: 3, applicableTo: ["armor", "trinket"], modifiers: { health: 35, defense: 3 }, description: "+35 Health, +3 Defense" },
  { id: "of_slaughter", name: "of Slaughter", type: "suffix", tier: 3, applicableTo: ["weapon"], modifiers: { attack: 5, critDamage: 0.25 }, description: "+5 Attack, +25% Crit Damage" },
  { id: "of_fortune", name: "of Fortune", type: "suffix", tier: 3, applicableTo: ["trinket"], modifiers: { goldMultiplier: 1.25, expMultiplier: 1.1 }, description: "+25% Gold, +10% EXP" },
  { id: "of_regeneration", name: "of Regeneration", type: "suffix", tier: 3, applicableTo: ["armor", "trinket"], modifiers: { healthRegen: 3 }, description: "+3 HP/turn" },

  // Tier 4
  { id: "of_the_titan", name: "of the Titan", type: "suffix", tier: 4, applicableTo: ["armor", "trinket"], modifiers: { health: 50, defense: 5 }, description: "+50 Health, +5 Defense" },
  { id: "of_massacre", name: "of Massacre", type: "suffix", tier: 4, applicableTo: ["weapon"], modifiers: { attack: 8, critChance: 0.1, critDamage: 0.4 }, description: "+8 Attack, +10% Crit, +40% Crit Damage" },
  { id: "of_wealth", name: "of Wealth", type: "suffix", tier: 4, applicableTo: ["trinket"], modifiers: { goldMultiplier: 1.5 }, description: "+50% Gold Find" },

  // Tier 5
  { id: "of_immortality", name: "of Immortality", type: "suffix", tier: 5, applicableTo: ["armor", "trinket"], modifiers: { health: 75, healthRegen: 5 }, description: "+75 Health, +5 Regen" },
  { id: "of_annihilation", name: "of Annihilation", type: "suffix", tier: 5, applicableTo: ["weapon"], modifiers: { attack: 12, critChance: 0.2, critDamage: 1.0 }, description: "+12 Attack, +20% Crit, +100% Crit Damage" },
  { id: "of_the_void", name: "of the Void", type: "suffix", tier: 5, applicableTo: ["weapon", "trinket"], modifiers: { attack: 8, defense: -3 }, description: "+8 Attack, -3 Defense", loreFragment: "Power drawn from the emptiness between worlds." },
]

// =============================================================================
// EGO GENERATION
// =============================================================================

/**
 * Get maximum ego tier based on item rarity
 */
function getMaxTierForRarity(rarity: ItemRarity): number {
  switch (rarity) {
    case "common": return 1
    case "uncommon": return 2
    case "rare": return 3
    case "legendary": return 5
  }
}

/**
 * Roll for number of egos based on rarity
 */
function rollEgoCount(rarity: ItemRarity): { prefixes: number; suffixes: number } {
  switch (rarity) {
    case "common":
      return { prefixes: Math.random() < 0.3 ? 1 : 0, suffixes: 0 }
    case "uncommon":
      return { prefixes: Math.random() < 0.5 ? 1 : 0, suffixes: Math.random() < 0.3 ? 1 : 0 }
    case "rare":
      return { prefixes: 1, suffixes: Math.random() < 0.6 ? 1 : 0 }
    case "legendary":
      return { prefixes: 1, suffixes: 1 }
  }
}

/**
 * Select a random ego modifier for an item
 */
function selectEgo(
  pool: EgoModifier[],
  category: ItemCategory,
  maxTier: number,
  exclude: string[] = []
): EgoModifier | null {
  const eligible = pool.filter(
    ego => ego.tier <= maxTier &&
           ego.applicableTo.includes(category) &&
           !exclude.includes(ego.id)
  )

  if (eligible.length === 0) return null

  // Weight by tier (higher tier = rarer)
  const weighted: EgoModifier[] = []
  for (const ego of eligible) {
    const weight = 6 - ego.tier // tier 1 = weight 5, tier 5 = weight 1
    for (let i = 0; i < weight; i++) {
      weighted.push(ego)
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)]
}

// =============================================================================
// ITEM ENHANCEMENT
// =============================================================================

export interface EgoItem extends Item {
  egos: {
    prefix?: EgoModifier
    suffix?: EgoModifier
  }
  baseName: string // original name before egos
  egoModifiers: EgoModifier["modifiers"]
  onHitEffects: Array<{ effect: () => StatusEffect; procChance: number }>
}

/**
 * Apply ego modifiers to an item, creating an EgoItem
 */
export function applyEgos(item: Item, forcePrefix?: string, forceSuffix?: string): EgoItem {
  const category = item.category || (item.type === "weapon" ? "weapon" : item.type === "armor" ? "armor" : "trinket")
  const maxTier = getMaxTierForRarity(item.rarity)
  const egoCount = rollEgoCount(item.rarity)

  let prefix: EgoModifier | undefined
  let suffix: EgoModifier | undefined

  // Select prefix
  if (forcePrefix) {
    prefix = PREFIXES.find(p => p.id === forcePrefix)
  } else if (egoCount.prefixes > 0) {
    prefix = selectEgo(PREFIXES, category as ItemCategory, maxTier) ?? undefined
  }

  // Select suffix
  if (forceSuffix) {
    suffix = SUFFIXES.find(s => s.id === forceSuffix)
  } else if (egoCount.suffixes > 0) {
    suffix = selectEgo(SUFFIXES, category as ItemCategory, maxTier) ?? undefined
  }

  // Build new name
  let newName = item.name
  if (prefix) newName = `${prefix.name} ${newName}`
  if (suffix) newName = `${newName} ${suffix.name}`

  // Combine modifiers
  const egoModifiers: EgoModifier["modifiers"] = {}
  const onHitEffects: EgoItem["onHitEffects"] = []

  for (const ego of [prefix, suffix]) {
    if (!ego) continue

    // Add stat modifiers
    for (const [key, value] of Object.entries(ego.modifiers)) {
      const k = key as keyof EgoModifier["modifiers"]
      if (value !== undefined) {
        egoModifiers[k] = (egoModifiers[k] || 0) + value
      }
    }

    // Add on-hit effects
    if (ego.onHitEffect && ego.procChance) {
      onHitEffects.push({ effect: ego.onHitEffect, procChance: ego.procChance })
    }
  }

  // Apply stat modifiers to item stats
  const newStats = { ...item.stats }
  if (egoModifiers.attack) newStats.attack = (newStats.attack || 0) + egoModifiers.attack
  if (egoModifiers.defense) newStats.defense = (newStats.defense || 0) + egoModifiers.defense
  if (egoModifiers.health) newStats.health = (newStats.health || 0) + egoModifiers.health

  // Calculate new value
  const tierBonus = Math.max(prefix?.tier || 0, suffix?.tier || 0)
  const valueMultiplier = 1 + (tierBonus * 0.5)

  return {
    ...item,
    name: newName,
    baseName: item.name,
    stats: newStats,
    value: Math.floor(item.value * valueMultiplier),
    egos: { prefix, suffix },
    egoModifiers,
    onHitEffects,
  }
}

/**
 * Check if item is an ego item
 */
export function isEgoItem(item: Item): item is EgoItem {
  return "egos" in item && "baseName" in item
}

/**
 * Get total modifiers from ego item (for UI display)
 */
export function getEgoModifierSummary(item: EgoItem): string[] {
  const lines: string[] = []
  const mods = item.egoModifiers

  if (mods.attack && mods.attack > 0) lines.push(`+${mods.attack} Attack`)
  if (mods.attack && mods.attack < 0) lines.push(`${mods.attack} Attack`)
  if (mods.defense && mods.defense > 0) lines.push(`+${mods.defense} Defense`)
  if (mods.defense && mods.defense < 0) lines.push(`${mods.defense} Defense`)
  if (mods.health) lines.push(`+${mods.health} Health`)
  if (mods.healthRegen) lines.push(`+${mods.healthRegen} HP/turn`)
  if (mods.critChance) lines.push(`+${Math.round(mods.critChance * 100)}% Crit`)
  if (mods.critDamage) lines.push(`+${Math.round(mods.critDamage * 100)}% Crit Damage`)
  if (mods.goldMultiplier && mods.goldMultiplier !== 1) {
    lines.push(`+${Math.round((mods.goldMultiplier - 1) * 100)}% Gold`)
  }
  if (mods.expMultiplier && mods.expMultiplier !== 1) {
    lines.push(`+${Math.round((mods.expMultiplier - 1) * 100)}% EXP`)
  }

  // Add on-hit effects
  for (const { effect, procChance } of item.onHitEffects) {
    const e = effect()
    lines.push(`${Math.round(procChance * 100)}% chance: ${e.name}`)
  }

  return lines
}

/**
 * Roll on-hit effects when attacking with an ego weapon
 */
export function rollEgoOnHitEffects(item: EgoItem): StatusEffect[] {
  const applied: StatusEffect[] = []

  for (const { effect, procChance } of item.onHitEffects) {
    if (Math.random() < procChance) {
      applied.push(effect())
    }
  }

  return applied
}

// =============================================================================
// LOOT GENERATION WITH EGOS
// =============================================================================

/**
 * Generate an ego item directly
 */
export function generateEgoItem(
  baseItem: Item,
  guaranteeEgo: boolean = false
): Item | EgoItem {
  // Check if this item should have egos
  const shouldHaveEgo = guaranteeEgo || Math.random() < getEgoChanceForRarity(baseItem.rarity)

  if (!shouldHaveEgo) return baseItem

  return applyEgos(baseItem)
}

/**
 * Get chance for an item to have egos based on rarity
 */
function getEgoChanceForRarity(rarity: ItemRarity): number {
  switch (rarity) {
    case "common": return 0.1
    case "uncommon": return 0.3
    case "rare": return 0.6
    case "legendary": return 1.0
  }
}

/**
 * Upgrade an existing item with a new ego
 */
export function addEgoToItem(item: Item | EgoItem, egoId: string): EgoItem | null {
  const ego = [...PREFIXES, ...SUFFIXES].find(e => e.id === egoId)
  if (!ego) return null

  const category = item.category || (item.type === "weapon" ? "weapon" : "armor")
  if (!ego.applicableTo.includes(category as ItemCategory)) return null

  if (isEgoItem(item)) {
    // Already has egos, check if slot is available
    if (ego.type === "prefix" && item.egos.prefix) return null
    if (ego.type === "suffix" && item.egos.suffix) return null

    return applyEgos(
      { ...item, name: item.baseName },
      ego.type === "prefix" ? ego.id : item.egos.prefix?.id,
      ego.type === "suffix" ? ego.id : item.egos.suffix?.id
    )
  }

  return applyEgos(
    item,
    ego.type === "prefix" ? ego.id : undefined,
    ego.type === "suffix" ? ego.id : undefined
  )
}
