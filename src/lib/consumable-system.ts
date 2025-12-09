/**
 * Expanded Consumable System
 *
 * Comprehensive consumable items including:
 * - Health/Mana potions (multiple tiers)
 * - Buff elixirs (stat boosts)
 * - Resistance potions (damage type protection)
 * - Throwables (offensive consumables)
 * - Special consumables (scrolls, bombs, etc.)
 */

import type { Item, ItemRarity, StatusEffect, DamageType } from "./game-types"
import { createStatusEffect } from "./entity-system"

// =============================================================================
// CONSUMABLE TYPES
// =============================================================================

export type ConsumableCategory = "potion" | "elixir" | "throwable" | "scroll" | "food" | "special"

export type ConsumableSubtype =
  // Potions (instant effects)
  | "health_potion"
  | "mana_potion"
  | "antidote"
  | "holy_water"
  // Elixirs (temporary buffs)
  | "strength_elixir"
  | "intelligence_elixir"
  | "dexterity_elixir"
  | "fortitude_elixir"
  | "haste_elixir"
  | "rage_potion"
  | "focus_tea"
  // Resistance potions
  | "resistance_potion"
  | "fire_ward"
  | "frost_ward"
  | "shadow_ward"
  | "lightning_ward"
  // Throwables
  | "fire_bomb"
  | "frost_bomb"
  | "acid_flask"
  | "holy_bomb"
  | "smoke_bomb"
  | "flashbang"
  // Scrolls
  | "scroll"
  | "scroll_fireball"
  | "scroll_lightning"
  | "scroll_healing"
  | "scroll_protection"
  | "scroll_teleport"
  // Food
  | "rations"
  | "hearty_meal"
  | "elven_bread"
  // Special
  | "soul_shard"
  | "revival_stone"
  | "escape_rope"
  | "treasure_map"

// =============================================================================
// CONSUMABLE TEMPLATES
// =============================================================================

interface ConsumableTemplate {
  subtype: ConsumableSubtype
  category: ConsumableCategory
  baseName: string
  tiers: ConsumableTier[]
  useDescription: string
  targetType: "self" | "enemy" | "ground"
}

interface ConsumableTier {
  rarity: ItemRarity
  name: string
  value: number
  effect: ConsumableEffect
}

interface ConsumableEffect {
  healing?: number
  manaRestore?: number
  damage?: number
  damageType?: DamageType
  statusEffect?: () => StatusEffect
  special?: string
}

const CONSUMABLE_TEMPLATES: Record<ConsumableSubtype, ConsumableTemplate> = {
  // === HEALTH POTIONS ===
  health_potion: {
    subtype: "health_potion",
    category: "potion",
    baseName: "Health Potion",
    targetType: "self",
    useDescription: "Drink to restore health.",
    tiers: [
      { rarity: "common", name: "Minor Health Potion", value: 15, effect: { healing: 20 } },
      { rarity: "uncommon", name: "Health Potion", value: 35, effect: { healing: 40 } },
      { rarity: "rare", name: "Greater Health Potion", value: 75, effect: { healing: 75 } },
      { rarity: "legendary", name: "Elixir of Life", value: 200, effect: { healing: 150 } },
    ],
  },

  // === MANA POTIONS ===
  mana_potion: {
    subtype: "mana_potion",
    category: "potion",
    baseName: "Mana Potion",
    targetType: "self",
    useDescription: "Drink to restore mana/energy.",
    tiers: [
      { rarity: "common", name: "Minor Mana Potion", value: 15, effect: { manaRestore: 15 } },
      { rarity: "uncommon", name: "Mana Potion", value: 35, effect: { manaRestore: 30 } },
      { rarity: "rare", name: "Greater Mana Potion", value: 75, effect: { manaRestore: 50 } },
      { rarity: "legendary", name: "Arcane Elixir", value: 200, effect: { manaRestore: 100 } },
    ],
  },

  // === ANTIDOTES ===
  antidote: {
    subtype: "antidote",
    category: "potion",
    baseName: "Antidote",
    targetType: "self",
    useDescription: "Cures poison and grants temporary immunity.",
    tiers: [
      { rarity: "common", name: "Weak Antidote", value: 10, effect: { special: "cure_poison", statusEffect: () => createPoisonImmunity(2) } },
      { rarity: "uncommon", name: "Antidote", value: 25, effect: { special: "cure_poison", statusEffect: () => createPoisonImmunity(3) } },
      { rarity: "rare", name: "Universal Antidote", value: 60, effect: { special: "cure_all_debuffs", statusEffect: () => createPoisonImmunity(5) } },
    ],
  },

  // === HOLY WATER ===
  holy_water: {
    subtype: "holy_water",
    category: "potion",
    baseName: "Holy Water",
    targetType: "enemy",
    useDescription: "Throw at undead or demons for bonus damage.",
    tiers: [
      { rarity: "common", name: "Blessed Water", value: 15, effect: { damage: 25, damageType: "holy" } },
      { rarity: "uncommon", name: "Holy Water", value: 35, effect: { damage: 50, damageType: "holy" } },
      { rarity: "rare", name: "Sacred Tears", value: 80, effect: { damage: 100, damageType: "holy", statusEffect: () => createBurning("holy", 3) } },
    ],
  },

  // === STRENGTH ELIXIR ===
  strength_elixir: {
    subtype: "strength_elixir",
    category: "elixir",
    baseName: "Strength Elixir",
    targetType: "self",
    useDescription: "Temporarily increases attack power.",
    tiers: [
      { rarity: "common", name: "Weak Strength Tonic", value: 20, effect: { statusEffect: () => createStatBuff("attack", 3, 3) } },
      { rarity: "uncommon", name: "Strength Elixir", value: 45, effect: { statusEffect: () => createStatBuff("attack", 5, 4) } },
      { rarity: "rare", name: "Giant's Strength", value: 100, effect: { statusEffect: () => createStatBuff("attack", 8, 5) } },
    ],
  },

  // === INTELLIGENCE ELIXIR ===
  intelligence_elixir: {
    subtype: "intelligence_elixir",
    category: "elixir",
    baseName: "Intelligence Elixir",
    targetType: "self",
    useDescription: "Temporarily increases spell power.",
    tiers: [
      { rarity: "common", name: "Mind Sharpener", value: 20, effect: { statusEffect: () => createStatBuff("intelligence", 3, 3) } },
      { rarity: "uncommon", name: "Sage's Draught", value: 45, effect: { statusEffect: () => createStatBuff("intelligence", 5, 4) } },
      { rarity: "rare", name: "Elixir of Brilliance", value: 100, effect: { statusEffect: () => createStatBuff("intelligence", 8, 5) } },
    ],
  },

  // === DEXTERITY ELIXIR ===
  dexterity_elixir: {
    subtype: "dexterity_elixir",
    category: "elixir",
    baseName: "Dexterity Elixir",
    targetType: "self",
    useDescription: "Temporarily increases dodge and crit chance.",
    tiers: [
      { rarity: "common", name: "Cat's Grace", value: 20, effect: { statusEffect: () => createDexBuff(0.05, 3) } },
      { rarity: "uncommon", name: "Elixir of Agility", value: 45, effect: { statusEffect: () => createDexBuff(0.1, 4) } },
      { rarity: "rare", name: "Phantom Speed", value: 100, effect: { statusEffect: () => createDexBuff(0.15, 5) } },
    ],
  },

  // === FORTITUDE ELIXIR ===
  fortitude_elixir: {
    subtype: "fortitude_elixir",
    category: "elixir",
    baseName: "Fortitude Elixir",
    targetType: "self",
    useDescription: "Temporarily increases defense.",
    tiers: [
      { rarity: "common", name: "Iron Skin Tonic", value: 20, effect: { statusEffect: () => createStatBuff("defense", 3, 3) } },
      { rarity: "uncommon", name: "Stone Skin Elixir", value: 45, effect: { statusEffect: () => createStatBuff("defense", 5, 4) } },
      { rarity: "rare", name: "Adamantine Elixir", value: 100, effect: { statusEffect: () => createStatBuff("defense", 8, 5) } },
    ],
  },

  // === HASTE ELIXIR ===
  haste_elixir: {
    subtype: "haste_elixir",
    category: "elixir",
    baseName: "Haste Elixir",
    targetType: "self",
    useDescription: "Grants an extra action for several turns.",
    tiers: [
      { rarity: "uncommon", name: "Swift Draught", value: 50, effect: { statusEffect: () => createHaste(2) } },
      { rarity: "rare", name: "Time Warp Elixir", value: 120, effect: { statusEffect: () => createHaste(3) } },
    ],
  },

  // === RAGE POTION ===
  rage_potion: {
    subtype: "rage_potion",
    category: "elixir",
    baseName: "Rage Potion",
    targetType: "self",
    useDescription: "Massively increases attack but lowers defense.",
    tiers: [
      { rarity: "uncommon", name: "Berserker Brew", value: 40, effect: { statusEffect: () => createRage(5, -2, 3) } },
      { rarity: "rare", name: "Blood Fury", value: 90, effect: { statusEffect: () => createRage(10, -4, 4) } },
    ],
  },

  // === FOCUS TEA ===
  focus_tea: {
    subtype: "focus_tea",
    category: "elixir",
    baseName: "Focus Tea",
    targetType: "self",
    useDescription: "Restores resource and increases regeneration.",
    tiers: [
      { rarity: "common", name: "Calming Tea", value: 15, effect: { manaRestore: 10, statusEffect: () => createFocus(1, 3) } },
      { rarity: "uncommon", name: "Meditation Tea", value: 35, effect: { manaRestore: 20, statusEffect: () => createFocus(2, 4) } },
      { rarity: "rare", name: "Zen Master's Blend", value: 80, effect: { manaRestore: 40, statusEffect: () => createFocus(3, 5) } },
    ],
  },

  // === RESISTANCE POTIONS ===
  resistance_potion: {
    subtype: "resistance_potion",
    category: "potion",
    baseName: "Resistance Potion",
    targetType: "self",
    useDescription: "Grants resistance to all damage types.",
    tiers: [
      { rarity: "uncommon", name: "All-Resist Tonic", value: 40, effect: { statusEffect: () => createAllResist(15, 3) } },
      { rarity: "rare", name: "Universal Ward", value: 100, effect: { statusEffect: () => createAllResist(25, 4) } },
    ],
  },

  fire_ward: {
    subtype: "fire_ward",
    category: "potion",
    baseName: "Fire Ward",
    targetType: "self",
    useDescription: "Grants fire resistance.",
    tiers: [
      { rarity: "common", name: "Fire Ward", value: 20, effect: { statusEffect: () => createElementalResist("fire", 30, 4) } },
      { rarity: "uncommon", name: "Flame Immunity", value: 50, effect: { statusEffect: () => createElementalResist("fire", 50, 5) } },
    ],
  },

  frost_ward: {
    subtype: "frost_ward",
    category: "potion",
    baseName: "Frost Ward",
    targetType: "self",
    useDescription: "Grants ice resistance.",
    tiers: [
      { rarity: "common", name: "Frost Ward", value: 20, effect: { statusEffect: () => createElementalResist("ice", 30, 4) } },
      { rarity: "uncommon", name: "Ice Immunity", value: 50, effect: { statusEffect: () => createElementalResist("ice", 50, 5) } },
    ],
  },

  shadow_ward: {
    subtype: "shadow_ward",
    category: "potion",
    baseName: "Shadow Ward",
    targetType: "self",
    useDescription: "Grants shadow resistance.",
    tiers: [
      { rarity: "common", name: "Shadow Ward", value: 20, effect: { statusEffect: () => createElementalResist("shadow", 30, 4) } },
      { rarity: "uncommon", name: "Void Protection", value: 50, effect: { statusEffect: () => createElementalResist("shadow", 50, 5) } },
    ],
  },

  lightning_ward: {
    subtype: "lightning_ward",
    category: "potion",
    baseName: "Lightning Ward",
    targetType: "self",
    useDescription: "Grants lightning resistance.",
    tiers: [
      { rarity: "common", name: "Storm Ward", value: 20, effect: { statusEffect: () => createElementalResist("lightning", 30, 4) } },
      { rarity: "uncommon", name: "Thunder Immunity", value: 50, effect: { statusEffect: () => createElementalResist("lightning", 50, 5) } },
    ],
  },

  // === THROWABLES ===
  fire_bomb: {
    subtype: "fire_bomb",
    category: "throwable",
    baseName: "Fire Bomb",
    targetType: "enemy",
    useDescription: "Throw at enemies to deal fire damage.",
    tiers: [
      { rarity: "common", name: "Molotov", value: 15, effect: { damage: 15, damageType: "fire", statusEffect: () => createBurning("fire", 2) } },
      { rarity: "uncommon", name: "Fire Bomb", value: 35, effect: { damage: 30, damageType: "fire", statusEffect: () => createBurning("fire", 3) } },
      { rarity: "rare", name: "Inferno Grenade", value: 80, effect: { damage: 60, damageType: "fire", statusEffect: () => createBurning("fire", 4) } },
    ],
  },

  frost_bomb: {
    subtype: "frost_bomb",
    category: "throwable",
    baseName: "Frost Bomb",
    targetType: "enemy",
    useDescription: "Throw at enemies to deal ice damage and slow.",
    tiers: [
      { rarity: "common", name: "Ice Flask", value: 15, effect: { damage: 12, damageType: "ice", statusEffect: () => createSlow(2) } },
      { rarity: "uncommon", name: "Frost Bomb", value: 35, effect: { damage: 25, damageType: "ice", statusEffect: () => createSlow(3) } },
      { rarity: "rare", name: "Blizzard Grenade", value: 80, effect: { damage: 50, damageType: "ice", statusEffect: () => createFreeze(2) } },
    ],
  },

  acid_flask: {
    subtype: "acid_flask",
    category: "throwable",
    baseName: "Acid Flask",
    targetType: "enemy",
    useDescription: "Throw at enemies to corrode armor.",
    tiers: [
      { rarity: "common", name: "Weak Acid", value: 15, effect: { damage: 10, damageType: "poison", statusEffect: () => createArmorBreak(2, 2) } },
      { rarity: "uncommon", name: "Acid Flask", value: 35, effect: { damage: 20, damageType: "poison", statusEffect: () => createArmorBreak(4, 3) } },
      { rarity: "rare", name: "Corrosive Bomb", value: 80, effect: { damage: 35, damageType: "poison", statusEffect: () => createArmorBreak(6, 4) } },
    ],
  },

  holy_bomb: {
    subtype: "holy_bomb",
    category: "throwable",
    baseName: "Holy Bomb",
    targetType: "enemy",
    useDescription: "Devastating against undead and demons.",
    tiers: [
      { rarity: "uncommon", name: "Sacred Bomb", value: 40, effect: { damage: 40, damageType: "holy" } },
      { rarity: "rare", name: "Divine Wrath", value: 100, effect: { damage: 80, damageType: "holy", statusEffect: () => createSmite(3) } },
    ],
  },

  smoke_bomb: {
    subtype: "smoke_bomb",
    category: "throwable",
    baseName: "Smoke Bomb",
    targetType: "ground",
    useDescription: "Create a smoke screen for escape.",
    tiers: [
      { rarity: "common", name: "Smoke Pellet", value: 10, effect: { special: "flee_bonus_50" } },
      { rarity: "uncommon", name: "Smoke Bomb", value: 25, effect: { special: "guaranteed_flee" } },
    ],
  },

  flashbang: {
    subtype: "flashbang",
    category: "throwable",
    baseName: "Flashbang",
    targetType: "enemy",
    useDescription: "Blinds enemies, reducing their accuracy.",
    tiers: [
      { rarity: "uncommon", name: "Flash Powder", value: 30, effect: { statusEffect: () => createBlind(2) } },
      { rarity: "rare", name: "Sunburst", value: 70, effect: { statusEffect: () => createBlind(3), damage: 20, damageType: "holy" } },
    ],
  },

  // === SCROLLS ===
  scroll: {
    subtype: "scroll",
    category: "scroll",
    baseName: "Scroll",
    targetType: "self",
    useDescription: "Read to cast the contained spell.",
    tiers: [
      { rarity: "common", name: "Blank Scroll", value: 5, effect: { special: "blank" } },
    ],
  },

  scroll_fireball: {
    subtype: "scroll_fireball",
    category: "scroll",
    baseName: "Scroll of Fireball",
    targetType: "enemy",
    useDescription: "Cast a powerful fireball.",
    tiers: [
      { rarity: "uncommon", name: "Scroll of Fireball", value: 50, effect: { damage: 45, damageType: "fire" } },
      { rarity: "rare", name: "Scroll of Inferno", value: 120, effect: { damage: 90, damageType: "fire", statusEffect: () => createBurning("fire", 3) } },
    ],
  },

  scroll_lightning: {
    subtype: "scroll_lightning",
    category: "scroll",
    baseName: "Scroll of Lightning",
    targetType: "enemy",
    useDescription: "Strike with lightning.",
    tiers: [
      { rarity: "uncommon", name: "Scroll of Lightning", value: 50, effect: { damage: 50, damageType: "lightning" } },
      { rarity: "rare", name: "Scroll of Thunderstorm", value: 120, effect: { damage: 100, damageType: "lightning" } },
    ],
  },

  scroll_healing: {
    subtype: "scroll_healing",
    category: "scroll",
    baseName: "Scroll of Healing",
    targetType: "self",
    useDescription: "Restore health.",
    tiers: [
      { rarity: "uncommon", name: "Scroll of Healing", value: 40, effect: { healing: 50 } },
      { rarity: "rare", name: "Scroll of Greater Healing", value: 100, effect: { healing: 100 } },
    ],
  },

  scroll_protection: {
    subtype: "scroll_protection",
    category: "scroll",
    baseName: "Scroll of Protection",
    targetType: "self",
    useDescription: "Temporarily boost defense.",
    tiers: [
      { rarity: "uncommon", name: "Scroll of Protection", value: 40, effect: { statusEffect: () => createStatBuff("defense", 5, 5) } },
      { rarity: "rare", name: "Scroll of Invulnerability", value: 100, effect: { statusEffect: () => createStatBuff("defense", 10, 3) } },
    ],
  },

  scroll_teleport: {
    subtype: "scroll_teleport",
    category: "scroll",
    baseName: "Scroll of Teleport",
    targetType: "self",
    useDescription: "Escape the current floor.",
    tiers: [
      { rarity: "rare", name: "Scroll of Escape", value: 150, effect: { special: "skip_floor" } },
    ],
  },

  // === FOOD ===
  rations: {
    subtype: "rations",
    category: "food",
    baseName: "Rations",
    targetType: "self",
    useDescription: "Eat to restore a small amount of health.",
    tiers: [
      { rarity: "common", name: "Stale Bread", value: 5, effect: { healing: 5 } },
      { rarity: "common", name: "Rations", value: 10, effect: { healing: 10 } },
    ],
  },

  hearty_meal: {
    subtype: "hearty_meal",
    category: "food",
    baseName: "Hearty Meal",
    targetType: "self",
    useDescription: "Eat for health and a temporary buff.",
    tiers: [
      { rarity: "uncommon", name: "Hearty Stew", value: 25, effect: { healing: 20, statusEffect: () => createWellFed(3) } },
      { rarity: "rare", name: "Feast", value: 60, effect: { healing: 40, statusEffect: () => createWellFed(5) } },
    ],
  },

  elven_bread: {
    subtype: "elven_bread",
    category: "food",
    baseName: "Elven Bread",
    targetType: "self",
    useDescription: "Magical bread that restores health and mana.",
    tiers: [
      { rarity: "rare", name: "Lembas", value: 80, effect: { healing: 50, manaRestore: 30 } },
    ],
  },

  // === SPECIAL ===
  soul_shard: {
    subtype: "soul_shard",
    category: "special",
    baseName: "Soul Shard",
    targetType: "self",
    useDescription: "Dark energy for necromantic powers.",
    tiers: [
      { rarity: "uncommon", name: "Soul Fragment", value: 30, effect: { manaRestore: 25, special: "soul_power" } },
      { rarity: "rare", name: "Soul Shard", value: 70, effect: { manaRestore: 50, special: "soul_power_major" } },
    ],
  },

  revival_stone: {
    subtype: "revival_stone",
    category: "special",
    baseName: "Revival Stone",
    targetType: "self",
    useDescription: "Automatically revives you upon death.",
    tiers: [
      { rarity: "rare", name: "Phoenix Feather", value: 150, effect: { special: "auto_revive_50" } },
      { rarity: "legendary", name: "Soul Anchor", value: 400, effect: { special: "auto_revive_100" } },
    ],
  },

  escape_rope: {
    subtype: "escape_rope",
    category: "special",
    baseName: "Escape Rope",
    targetType: "self",
    useDescription: "Escape the dungeon immediately.",
    tiers: [
      { rarity: "uncommon", name: "Escape Rope", value: 40, effect: { special: "escape_dungeon" } },
    ],
  },

  treasure_map: {
    subtype: "treasure_map",
    category: "special",
    baseName: "Treasure Map",
    targetType: "self",
    useDescription: "Reveals a hidden treasure room on this floor.",
    tiers: [
      { rarity: "uncommon", name: "Worn Map", value: 35, effect: { special: "reveal_treasure" } },
      { rarity: "rare", name: "Ancient Map", value: 80, effect: { special: "reveal_vault" } },
    ],
  },
}

// =============================================================================
// STATUS EFFECT FACTORIES
// =============================================================================

function createPoisonImmunity(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Poison Immunity",
    effectType: "buff",
    duration,
    description: "Immune to poison.",
    sourceType: "item",
  })
}

function createBurning(element: "fire" | "holy", duration: number): StatusEffect {
  return createStatusEffect({
    name: element === "holy" ? "Holy Fire" : "Burning",
    effectType: "debuff",
    duration,
    modifiers: { healthRegen: -5 },
    description: element === "holy" ? "Holy flames sear the flesh." : "Burning alive.",
    sourceType: "item",
  })
}

function createStatBuff(stat: "attack" | "defense" | "intelligence", amount: number, duration: number): StatusEffect {
  const names: Record<string, string> = {
    attack: "Strengthened",
    defense: "Fortified",
    intelligence: "Enlightened",
  }
  return createStatusEffect({
    name: names[stat],
    effectType: "buff",
    duration,
    modifiers: { [stat]: amount },
    description: `+${amount} ${stat} for ${duration} turns.`,
    sourceType: "item",
  })
}

function createDexBuff(amount: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: "Agile",
    effectType: "buff",
    duration,
    modifiers: { dodgeChance: amount },
    description: `+${Math.round(amount * 100)}% dodge chance.`,
    sourceType: "item",
  })
}

function createHaste(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Haste",
    effectType: "buff",
    duration,
    description: "Move with supernatural speed.",
    sourceType: "item",
  })
}

function createRage(attackBonus: number, defensePenalty: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: "Berserk Rage",
    effectType: "buff",
    duration,
    modifiers: { attack: attackBonus, defense: defensePenalty },
    description: `+${attackBonus} attack, ${defensePenalty} defense.`,
    sourceType: "item",
  })
}

function createFocus(regenBonus: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: "Focused",
    effectType: "buff",
    duration,
    description: `Enhanced resource regeneration.`,
    sourceType: "item",
  })
}

function createAllResist(percent: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: "Warded",
    effectType: "buff",
    duration,
    description: `${percent}% resistance to all damage.`,
    sourceType: "item",
  })
}

function createElementalResist(element: DamageType, percent: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: `${element.charAt(0).toUpperCase() + element.slice(1)} Resist`,
    effectType: "buff",
    duration,
    description: `${percent}% resistance to ${element} damage.`,
    sourceType: "item",
  })
}

function createSlow(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Slowed",
    effectType: "debuff",
    duration,
    modifiers: { attack: -2 },
    description: "Movement impaired by cold.",
    sourceType: "item",
  })
}

function createFreeze(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Frozen",
    effectType: "debuff",
    duration,
    modifiers: { attack: -5, defense: -3 },
    description: "Encased in ice.",
    sourceType: "item",
  })
}

function createArmorBreak(amount: number, duration: number): StatusEffect {
  return createStatusEffect({
    name: "Corroded",
    effectType: "debuff",
    duration,
    modifiers: { defense: -amount },
    description: `Armor corroded. -${amount} defense.`,
    sourceType: "item",
  })
}

function createSmite(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Smited",
    effectType: "debuff",
    duration,
    modifiers: { attack: -3, defense: -3 },
    description: "Divine judgment weakens the unholy.",
    sourceType: "item",
  })
}

function createBlind(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Blinded",
    effectType: "debuff",
    duration,
    modifiers: { attack: -4 },
    description: "Cannot see clearly.",
    sourceType: "item",
  })
}

function createWellFed(duration: number): StatusEffect {
  return createStatusEffect({
    name: "Well Fed",
    effectType: "buff",
    duration,
    modifiers: { maxHealth: 10, healthRegen: 2 },
    description: "Full and satisfied.",
    sourceType: "item",
  })
}

// =============================================================================
// CONSUMABLE GENERATION
// =============================================================================

export interface GenerateConsumableOptions {
  rarity?: ItemRarity
  subtype?: ConsumableSubtype
  category?: ConsumableCategory
  floor?: number
}

export function generateConsumable(options: GenerateConsumableOptions = {}): Item {
  const { floor = 1 } = options

  // Determine subtype
  let subtype = options.subtype
  if (!subtype) {
    if (options.category) {
      // Pick random from category
      const categoryItems = Object.entries(CONSUMABLE_TEMPLATES)
        .filter(([, t]) => t.category === options.category)
        .map(([s]) => s as ConsumableSubtype)
      subtype = categoryItems[Math.floor(Math.random() * categoryItems.length)]
    } else {
      // Weight by category (potions most common)
      const weights: Record<ConsumableCategory, number> = {
        potion: 40,
        elixir: 20,
        throwable: 15,
        scroll: 10,
        food: 10,
        special: 5,
      }

      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
      let roll = Math.random() * totalWeight

      let selectedCategory: ConsumableCategory = "potion"
      for (const [cat, weight] of Object.entries(weights)) {
        roll -= weight
        if (roll <= 0) {
          selectedCategory = cat as ConsumableCategory
          break
        }
      }

      const categoryItems = Object.entries(CONSUMABLE_TEMPLATES)
        .filter(([, t]) => t.category === selectedCategory)
        .map(([s]) => s as ConsumableSubtype)
      subtype = categoryItems[Math.floor(Math.random() * categoryItems.length)]
    }
  }

  const template = CONSUMABLE_TEMPLATES[subtype]
  if (!template) {
    // Fallback to health potion
    return generateConsumable({ ...options, subtype: "health_potion" })
  }

  // Determine rarity
  let rarity = options.rarity
  if (!rarity) {
    // Roll rarity based on floor
    const roll = Math.random()
    const legendaryChance = 0.02 + floor * 0.003
    const rareChance = 0.1 + floor * 0.01
    const uncommonChance = 0.3 + floor * 0.015

    if (roll < legendaryChance) rarity = "legendary"
    else if (roll < legendaryChance + rareChance) rarity = "rare"
    else if (roll < legendaryChance + rareChance + uncommonChance) rarity = "uncommon"
    else rarity = "common"
  }

  // Find matching tier or closest
  let tier = template.tiers.find(t => t.rarity === rarity)
  if (!tier) {
    // Find closest lower rarity
    const rarityOrder: ItemRarity[] = ["common", "uncommon", "rare", "legendary"]
    const targetIndex = rarityOrder.indexOf(rarity)
    for (let i = targetIndex; i >= 0; i--) {
      tier = template.tiers.find(t => t.rarity === rarityOrder[i])
      if (tier) break
    }
    // Fallback to first tier
    if (!tier) tier = template.tiers[0]
  }

  const item: Item = {
    id: crypto.randomUUID(),
    name: tier.name,
    entityType: "potion",
    type: "potion",
    rarity: tier.rarity,
    category: "consumable",
    subtype: subtype,
    description: template.useDescription,
    stats: {
      health: tier.effect.healing,
    },
    value: tier.value,
  }

  // Store effect data in a way the game can use
  if (tier.effect.damage) {
    item.stats = { ...item.stats, attack: tier.effect.damage }
    item.damageType = tier.effect.damageType
  }
  if (tier.effect.manaRestore) {
    item.stats = { ...item.stats, defense: tier.effect.manaRestore } // Reuse defense field for mana
  }
  if (tier.effect.statusEffect) {
    item.effects = [tier.effect.statusEffect()]
  }
  if (tier.effect.special) {
    item.useText = tier.effect.special
  }

  return item
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function getConsumableTemplate(subtype: ConsumableSubtype): ConsumableTemplate | undefined {
  return CONSUMABLE_TEMPLATES[subtype]
}

export function isConsumable(item: Item): boolean {
  return item.type === "potion" || item.category === "consumable"
}

export function getConsumablesByCategory(category: ConsumableCategory): ConsumableSubtype[] {
  return Object.entries(CONSUMABLE_TEMPLATES)
    .filter(([, t]) => t.category === category)
    .map(([s]) => s as ConsumableSubtype)
}
