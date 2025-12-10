/**
 * Entity Taxonomy System
 *
 * Defines REQUIRED mechanical fields for each entity category.
 * Think of this like a TCG card creator - every card type has required stats.
 *
 * Example: Weapon cards MUST have attack stat. Consumable cards MUST have effect.
 */

import type {
  Item,
  ItemRarity,
  DamageType,
  StatusEffect,
} from "@/lib/core/game-types"

// =============================================================================
// ENTITY CATEGORIES - What type of game object is this?
// =============================================================================

export type EntityCategory =
  | "weapon" // Damage dealer - REQUIRES attack stat
  | "armor" // Protection - REQUIRES defense stat
  | "consumable" // One-time use - REQUIRES effect or healing
  | "accessory" // Passive bonus - REQUIRES stat modifier
  | "material" // Crafting component - REQUIRES material type
  | "currency" // Gold/gems - REQUIRES value (adds directly to gold)
  | "key" // Unlocks things - REQUIRES key type
  | "quest" // Story item - REQUIRES quest flag

// =============================================================================
// REQUIRED MECHANICS PER CATEGORY
// =============================================================================

export interface WeaponMechanics {
  attack: number // REQUIRED: Base damage
  damageType?: DamageType // Optional: Element
  critChance?: number // Optional: 0-1
  speed?: number // Optional: Attack speed modifier
}

export interface ArmorMechanics {
  defense: number // REQUIRED: Damage reduction
  slot: "head" | "body" | "hands" | "feet" | "shield" // REQUIRED: Where worn
  resistances?: Partial<Record<DamageType, number>> // Optional: Elemental resist
}

export interface ConsumableMechanics {
  // At least ONE of these is REQUIRED:
  healing?: number // Restore HP
  manaRestore?: number // Restore resource
  damage?: number // Deal damage (throwable)
  statusEffect?: StatusEffect | (() => StatusEffect) // Apply effect
  special?: string // Special effect key (cure_poison, etc)
}

export interface AccessoryMechanics {
  // REQUIRED: At least one stat modifier
  modifiers: {
    attack?: number
    defense?: number
    maxHealth?: number
    critChance?: number
    speed?: number
  }
}

export interface MaterialMechanics {
  materialType: string // REQUIRED: metal, gem, essence, etc
  tier: number // REQUIRED: 1-5 quality
}

export interface CurrencyMechanics {
  goldValue: number // REQUIRED: Direct gold amount
}

export interface KeyMechanics {
  keyType: "common" | "uncommon" | "rare" | "legendary" | "master" // REQUIRED
  uses: number // REQUIRED: How many times usable (1 for single-use)
}

export interface QuestMechanics {
  questId: string // REQUIRED: What quest this relates to
  questAction: "start" | "progress" | "complete" // REQUIRED: What it does
}

// =============================================================================
// TAXONOMY VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  fixedItem?: Partial<Item> // Auto-fixes when possible
}

/**
 * Validate an item has required mechanics for its category.
 * Returns errors and attempts auto-fixes where possible.
 */
export function validateItemMechanics(
  item: Partial<Item>,
  category: EntityCategory
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fixes: Partial<Item> = {}

  switch (category) {
    case "weapon":
      if (!item.stats?.attack || item.stats.attack <= 0) {
        errors.push("Weapons REQUIRE positive attack stat")
        // Auto-fix based on rarity
        fixes.stats = {
          ...item.stats,
          attack: getDefaultAttack(item.rarity || "common"),
        }
      }
      break

    case "armor":
      if (!item.stats?.defense || item.stats.defense <= 0) {
        errors.push("Armor REQUIRES positive defense stat")
        fixes.stats = {
          ...item.stats,
          defense: getDefaultDefense(item.rarity || "common"),
        }
      }
      // Check subtype for armor slot
      if (!item.subtype) {
        warnings.push("Armor should specify subtype/slot (defaulting to body)")
        fixes.subtype = "body"
      }
      break

    case "consumable":
      // Need at least one effect
      const hasEffect =
        (item.stats?.health && item.stats.health > 0) ||
        (item.effects && item.effects.length > 0) ||
        item.useText

      if (!hasEffect) {
        errors.push("Consumables REQUIRE at least one effect (healing, effect, or useText)")
        // Auto-fix: add minor healing
        fixes.stats = {
          ...item.stats,
          health: getDefaultHealing(item.rarity || "common"),
        }
      }
      break

    case "accessory":
      // Need at least one modifier
      const hasModifier =
        item.stats?.attack ||
        item.stats?.defense ||
        item.stats?.health // Item uses 'health' for max health bonus

      if (!hasModifier) {
        errors.push("Accessories REQUIRE at least one stat modifier")
        fixes.stats = {
          ...item.stats,
          health: getDefaultMaxHealthBonus(item.rarity || "common"),
        }
      }
      break

    case "currency":
      // Currency should NOT be an item - should be gold directly
      warnings.push("Currency should add gold directly, not create an item")
      break

    case "material":
      // Materials need type
      if (!item.subtype) {
        warnings.push("Materials should specify subtype/materialType")
      }
      break

    case "key":
      // Keys need type
      if (!item.subtype) {
        warnings.push("Keys should specify key type")
        fixes.subtype = item.rarity || "common"
      }
      break

    case "quest":
      // Quest items should have quest-related metadata
      // The Item type doesn't have questId, so we just warn
      if (item.type !== "quest") {
        warnings.push("Quest items should have type: quest")
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixedItem: Object.keys(fixes).length > 0 ? fixes : undefined,
  }
}

// =============================================================================
// DEFAULT STATS BY RARITY
// =============================================================================

function getDefaultAttack(rarity: ItemRarity): number {
  const base: Record<ItemRarity, number> = {
    common: 3,
    uncommon: 6,
    rare: 10,
    legendary: 18,
  }
  return base[rarity]
}

function getDefaultDefense(rarity: ItemRarity): number {
  const base: Record<ItemRarity, number> = {
    common: 2,
    uncommon: 5,
    rare: 9,
    legendary: 15,
  }
  return base[rarity]
}

function getDefaultHealing(rarity: ItemRarity): number {
  const base: Record<ItemRarity, number> = {
    common: 15,
    uncommon: 30,
    rare: 50,
    legendary: 100,
  }
  return base[rarity]
}

function getDefaultMaxHealthBonus(rarity: ItemRarity): number {
  const base: Record<ItemRarity, number> = {
    common: 5,
    uncommon: 10,
    rare: 20,
    legendary: 40,
  }
  return base[rarity]
}

// =============================================================================
// CATEGORY INFERENCE
// =============================================================================

/**
 * Infer entity category from item fields.
 * Used when AI doesn't explicitly specify category.
 */
export function inferCategory(item: Partial<Item>): EntityCategory {
  // Check explicit type field first
  if (item.type) {
    const typeMap: Record<string, EntityCategory> = {
      weapon: "weapon",
      armor: "armor",
      potion: "consumable",
      scroll: "consumable",
      food: "consumable",
      trinket: "accessory",
      ring: "accessory",
      amulet: "accessory",
      material: "material",
      gold: "currency",
      gem: "currency",
      key: "key",
      quest: "quest",
    }
    const mapped = typeMap[item.type]
    if (mapped) return mapped
  }

  // Infer from stats
  if (item.stats?.attack && item.stats.attack > (item.stats?.defense || 0)) {
    return "weapon"
  }
  if (item.stats?.defense && item.stats.defense > 0) {
    return "armor"
  }
  if (item.stats?.health && item.stats.health > 0) {
    return "consumable"
  }
  if (item.effects && item.effects.length > 0) {
    return "consumable"
  }

  // Infer from name keywords
  const name = item.name?.toLowerCase() || ""
  if (/sword|axe|dagger|bow|staff|wand|mace|hammer|spear/.test(name)) {
    return "weapon"
  }
  if (/helm|armor|shield|boot|gauntlet|plate|mail|robe/.test(name)) {
    return "armor"
  }
  if (/potion|elixir|draught|vial|flask|salve/.test(name)) {
    return "consumable"
  }
  if (/scroll|tome|book/.test(name)) {
    return "consumable"
  }
  if (/ring|amulet|pendant|charm|trinket|talisman/.test(name)) {
    return "accessory"
  }
  if (/gold|coin|gem|crystal|diamond|ruby|emerald/.test(name)) {
    return "currency"
  }
  if (/key|keystone/.test(name)) {
    return "key"
  }

  // Default to material (least mechanical requirements)
  return "material"
}

// =============================================================================
// ITEM FIXUP
// =============================================================================

/**
 * Ensure an item has valid mechanics for its category.
 * Applies auto-fixes where possible.
 */
export function ensureValidMechanics(item: Partial<Item>): Item {
  const category = inferCategory(item)
  const validation = validateItemMechanics(item, category)

  if (validation.valid) {
    return item as Item
  }

  // Apply fixes
  const fixed = {
    ...item,
    ...validation.fixedItem,
  }

  // Re-validate after fixes
  const revalidation = validateItemMechanics(fixed, category)
  if (!revalidation.valid) {
    console.warn(
      `[EntityTaxonomy] Could not fully fix item "${item.name}":`,
      revalidation.errors
    )
  }

  return fixed as Item
}

// =============================================================================
// LOOT TYPE CONVERSION
// =============================================================================

/**
 * Convert currency-type loot to actual gold.
 * Returns gold amount if item should be gold, null if it's a real item.
 */
export function extractCurrencyValue(item: Partial<Item>): number | null {
  const category = inferCategory(item)

  if (category === "currency") {
    // Check for gold value in various fields
    if (item.value && item.value > 0) {
      return item.value
    }

    // Try to extract number from name (e.g., "13 Gold Coins")
    const match = item.name?.match(/(\d+)\s*(gold|coin|gem)/i)
    if (match) {
      return parseInt(match[1], 10)
    }

    // Default gold by rarity
    const rarityGold: Record<ItemRarity, number> = {
      common: 10,
      uncommon: 25,
      rare: 75,
      legendary: 200,
    }
    return rarityGold[item.rarity || "common"]
  }

  return null
}

// =============================================================================
// AI SCHEMA HELPERS
// =============================================================================

/**
 * Generate structured loot requirements for AI prompts.
 * This tells the AI exactly what fields are required per item type.
 */
export function generateLootConstraints(): string {
  return `ITEM TYPE REQUIREMENTS (TCG Card Rules):

WEAPON items MUST include:
- attack: number (damage dealt, 3-20 based on rarity)
- damageType: optional ("physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane")

ARMOR items MUST include:
- defense: number (damage reduction, 2-15 based on rarity)
- slot: "head" | "body" | "hands" | "feet" | "shield"

CONSUMABLE items MUST include AT LEAST ONE:
- healing: number (HP restored)
- manaRestore: number (resource restored)
- statusEffect: { name, effectType: "buff"|"debuff", duration, modifiers }
- special: cure_poison | cure_all_debuffs | flee_bonus_50 | etc.

ACCESSORY items MUST include:
- modifiers: { attack?: number, defense?: number, maxHealth?: number }

GOLD/CURRENCY should be returned as goldAmount: number, NOT as an item.

RARITY affects base stats:
- common: attack 3, defense 2, healing 15
- uncommon: attack 6, defense 5, healing 30
- rare: attack 10, defense 9, healing 50
- legendary: attack 18, defense 15, healing 100`
}
