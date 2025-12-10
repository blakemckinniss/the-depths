/**
 * Currency Generator - Map crafting orbs (PoE-style)
 *
 * Orbs modify maps to add/change modifiers, affecting dungeon difficulty and rewards.
 */

import type {
  CraftingCurrency,
  CurrencyEffect,
  CurrencyProps,
  MapItem,
  ItemRarity,
} from "@/lib/core/game-types"
import type { CurrencyType } from "@/lib/items/item-taxonomy"
import { generateId } from "@/lib/core/utils"
import {
  upgradeMapRarity,
  rerollMapModifiers,
  addMapModifier,
  addMapQuality,
  scourMap,
} from "@/lib/items/map-generator"

// =============================================================================
// CURRENCY DEFINITIONS
// =============================================================================

interface CurrencyDefinition {
  id: CurrencyType
  name: string
  description: string
  rarity: ItemRarity
  value: number
  effect: CurrencyEffect
  targetType: "map" | "equipment" | "any"
  effectDescription: string
}

/**
 * All crafting currency definitions
 */
export const CURRENCY_DEFINITIONS: Record<string, CurrencyDefinition> = {
  orb_transmutation: {
    id: "orb_transmutation",
    name: "Orb of Transmutation",
    description: "Upgrades a normal item to magic quality.",
    rarity: "common",
    value: 2,
    effect: "transmute",
    targetType: "map",
    effectDescription: "Normal → Magic (adds 1-2 modifiers)",
  },

  orb_alteration: {
    id: "orb_alteration",
    name: "Orb of Alteration",
    description: "Rerolls the modifiers on a magic item.",
    rarity: "common",
    value: 3,
    effect: "alteration",
    targetType: "map",
    effectDescription: "Reroll magic map modifiers",
  },

  orb_augmentation: {
    id: "orb_augmentation",
    name: "Orb of Augmentation",
    description: "Adds a modifier to a magic item.",
    rarity: "common",
    value: 4,
    effect: "augmentation",
    targetType: "map",
    effectDescription: "Add 1 modifier to magic map",
  },

  orb_alchemy: {
    id: "orb_alchemy",
    name: "Orb of Alchemy",
    description: "Upgrades a normal item to rare quality.",
    rarity: "uncommon",
    value: 15,
    effect: "alchemy",
    targetType: "map",
    effectDescription: "Normal → Rare (adds 3-5 modifiers)",
  },

  orb_chaos: {
    id: "orb_chaos",
    name: "Orb of Chaos",
    description: "Rerolls all modifiers on a rare item.",
    rarity: "rare",
    value: 25,
    effect: "chaos",
    targetType: "map",
    effectDescription: "Reroll all rare map modifiers",
  },

  orb_scouring: {
    id: "orb_scouring",
    name: "Orb of Scouring",
    description: "Removes all modifiers from an item.",
    rarity: "uncommon",
    value: 8,
    effect: "scouring",
    targetType: "map",
    effectDescription: "Strip all modifiers → Normal",
  },

  orb_blessed: {
    id: "orb_blessed",
    name: "Orb of the Blessed",
    description: "Improves the quality of an item.",
    rarity: "uncommon",
    value: 10,
    effect: "blessed",
    targetType: "map",
    effectDescription: "Add +1-5% quality",
  },

  orb_divine: {
    id: "orb_divine",
    name: "Divine Orb",
    description: "Rerolls the values of modifiers on an item.",
    rarity: "rare",
    value: 50,
    effect: "divine",
    targetType: "map",
    effectDescription: "Reroll modifier values (keep modifiers)",
  },

  orb_exalted: {
    id: "orb_exalted",
    name: "Exalted Orb",
    description: "Adds a powerful modifier to a rare item.",
    rarity: "legendary",
    value: 100,
    effect: "exalted",
    targetType: "map",
    effectDescription: "Add high-tier modifier to rare map",
  },
}

// =============================================================================
// CURRENCY GENERATION
// =============================================================================

/**
 * Create a currency item instance
 */
export function createCurrency(currencyId: string, stackSize = 1): CraftingCurrency | null {
  const def = CURRENCY_DEFINITIONS[currencyId]
  if (!def) return null

  const currencyProps: CurrencyProps = {
    effect: def.effect,
    targetType: def.targetType,
    description: def.effectDescription,
  }

  return {
    id: generateId(),
    name: def.name,
    entityType: "item",
    type: "misc",
    category: "currency",
    subtype: def.id,
    rarity: def.rarity,
    value: def.value,
    description: def.description,
    stackSize,
    maxStack: 999,
    currencyProps,
  }
}

/**
 * Generate a random currency drop based on tier
 */
export function generateCurrencyDrop(tier: number): CraftingCurrency | null {
  const table = getCurrencyDropTable(tier)
  const totalWeight = Object.values(table).reduce((sum, w) => sum + w, 0)

  let roll = Math.random() * totalWeight
  for (const [currencyId, weight] of Object.entries(table)) {
    roll -= weight
    if (roll <= 0) {
      return createCurrency(currencyId)
    }
  }

  return null
}

/**
 * Get currency drop weights by tier
 */
function getCurrencyDropTable(tier: number): Record<string, number> {
  if (tier <= 3) {
    // Low tier: basic orbs
    return {
      orb_transmutation: 40,
      orb_alteration: 30,
      orb_augmentation: 20,
      orb_blessed: 8,
      orb_scouring: 2,
    }
  }

  if (tier <= 6) {
    // Mid tier: more variety
    return {
      orb_transmutation: 20,
      orb_alteration: 25,
      orb_augmentation: 15,
      orb_alchemy: 15,
      orb_blessed: 12,
      orb_scouring: 8,
      orb_chaos: 5,
    }
  }

  if (tier <= 9) {
    // High tier: valuable orbs
    return {
      orb_alteration: 15,
      orb_augmentation: 10,
      orb_alchemy: 20,
      orb_blessed: 15,
      orb_scouring: 10,
      orb_chaos: 15,
      orb_divine: 10,
      orb_exalted: 5,
    }
  }

  // Endgame (T10): best drops
  return {
    orb_alchemy: 15,
    orb_blessed: 10,
    orb_scouring: 10,
    orb_chaos: 25,
    orb_divine: 20,
    orb_exalted: 20,
  }
}

// =============================================================================
// CURRENCY APPLICATION
// =============================================================================

export interface ApplyCurrencyResult {
  success: boolean
  map: MapItem | null
  message: string
}

/**
 * Apply a currency to a map
 */
export function applyCurrencyToMap(
  currency: CraftingCurrency,
  map: MapItem
): ApplyCurrencyResult {
  const effect = currency.currencyProps.effect

  switch (effect) {
    case "transmute":
      return applyTransmute(map)
    case "alteration":
      return applyAlteration(map)
    case "augmentation":
      return applyAugmentation(map)
    case "alchemy":
      return applyAlchemy(map)
    case "chaos":
      return applyChaos(map)
    case "scouring":
      return applyScouring(map)
    case "blessed":
      return applyBlessed(map)
    case "divine":
      return applyDivine(map)
    case "exalted":
      return applyExalted(map)
    default:
      return { success: false, map: null, message: "Unknown currency effect" }
  }
}

// Individual effect handlers

function applyTransmute(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "common") {
    return { success: false, map: null, message: "Can only transmute normal (white) maps" }
  }
  const upgraded = upgradeMapRarity(map, "uncommon")
  return { success: true, map: upgraded, message: "Map transmuted to magic quality" }
}

function applyAlteration(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "uncommon") {
    return { success: false, map: null, message: "Can only alter magic (blue) maps" }
  }
  const rerolled = rerollMapModifiers(map)
  return { success: true, map: rerolled, message: "Map modifiers rerolled" }
}

function applyAugmentation(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "uncommon") {
    return { success: false, map: null, message: "Can only augment magic (blue) maps" }
  }
  const augmented = addMapModifier(map)
  if (!augmented) {
    return { success: false, map: null, message: "Map already has maximum modifiers" }
  }
  return { success: true, map: augmented, message: "Modifier added to map" }
}

function applyAlchemy(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "common") {
    return { success: false, map: null, message: "Can only alchemize normal (white) maps" }
  }
  const upgraded = upgradeMapRarity(map, "rare")
  return { success: true, map: upgraded, message: "Map alchemized to rare quality" }
}

function applyChaos(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "rare") {
    return { success: false, map: null, message: "Can only chaos rare (yellow) maps" }
  }
  const rerolled = rerollMapModifiers(map)
  return { success: true, map: rerolled, message: "All map modifiers rerolled" }
}

function applyScouring(map: MapItem): ApplyCurrencyResult {
  if (map.rarity === "common") {
    return { success: false, map: null, message: "Map has no modifiers to remove" }
  }
  const scoured = scourMap(map)
  return { success: true, map: scoured, message: "All modifiers removed" }
}

function applyBlessed(map: MapItem): ApplyCurrencyResult {
  if (map.mapProps.quality >= 20) {
    return { success: false, map: null, message: "Map already at maximum quality" }
  }
  const qualityGain = 1 + Math.floor(Math.random() * 5)  // 1-5%
  const blessed = addMapQuality(map, qualityGain)
  return { success: true, map: blessed, message: `Map quality increased by ${qualityGain}%` }
}

function applyDivine(map: MapItem): ApplyCurrencyResult {
  if (map.mapProps.modifiers.length === 0) {
    return { success: false, map: null, message: "Map has no modifiers to reroll" }
  }
  // Divine rerolls values but keeps the same modifiers
  // For now, we just reroll since our modifier system uses fixed values
  const rerolled = rerollMapModifiers(map)
  return { success: true, map: rerolled, message: "Modifier values rerolled" }
}

function applyExalted(map: MapItem): ApplyCurrencyResult {
  if (map.rarity !== "rare" && map.rarity !== "legendary") {
    return { success: false, map: null, message: "Can only exalt rare or legendary maps" }
  }
  const augmented = addMapModifier(map)
  if (!augmented) {
    return { success: false, map: null, message: "Map already has maximum modifiers" }
  }
  return { success: true, map: augmented, message: "Powerful modifier added to map" }
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Check if a currency can be applied to a map
 */
export function canApplyCurrency(currency: CraftingCurrency, map: MapItem): boolean {
  const result = applyCurrencyToMap(currency, map)
  return result.success
}

/**
 * Get all currency IDs
 */
export function getAllCurrencyIds(): string[] {
  return Object.keys(CURRENCY_DEFINITIONS)
}

/**
 * Get currency by effect type
 */
export function getCurrencyByEffect(effect: CurrencyEffect): CurrencyDefinition | undefined {
  return Object.values(CURRENCY_DEFINITIONS).find(c => c.effect === effect)
}
