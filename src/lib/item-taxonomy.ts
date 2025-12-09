/**
 * Item Taxonomy System
 *
 * Provides a comprehensive category/subcategory structure for all game items.
 * This serves as grounding for AI generation - the AI can create creative variants
 * within these well-defined categories while maintaining gameplay consistency.
 */

import type { StatusEffect, ItemRarity } from "./game-types"

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

/**
 * Primary item categories - the top-level classification
 */
export type ItemCategory =
  | "weapon"
  | "armor"
  | "consumable"
  | "container"
  | "material"
  | "tool"
  | "tome"
  | "trinket"
  | "key"
  | "relic"
  | "currency"
  | "quest"
  | "unknown"

/**
 * Weapon subcategories
 */
export type WeaponType =
  // Melee - One-handed
  | "sword"
  | "dagger"
  | "axe"
  | "mace"
  | "flail"
  | "rapier"
  | "scimitar"
  // Melee - Two-handed
  | "greatsword"
  | "greataxe"
  | "warhammer"
  | "halberd"
  | "scythe"
  | "quarterstaff"
  // Ranged
  | "bow"
  | "crossbow"
  | "throwing_knife"
  | "javelin"
  | "sling"
  // Magic
  | "staff"
  | "wand"
  | "orb"
  | "tome_weapon"
  // Exotic
  | "whip"
  | "chain"
  | "claw"
  | "fist_weapon"

/**
 * Armor subcategories by slot
 */
export type ArmorSlot = "head" | "chest" | "legs" | "feet" | "hands" | "shield" | "cloak" | "belt"

/**
 * Armor weight class affects movement and abilities
 */
export type ArmorWeight = "cloth" | "leather" | "mail" | "plate"

/**
 * Consumable subcategories
 */
export type ConsumableType =
  // Potions
  | "potion_health"
  | "potion_mana"
  | "potion_stamina"
  | "potion_buff"
  | "potion_cure"
  | "potion_resist"
  | "potion_poison" // throwable
  // Food & Drink
  | "food_raw"
  | "food_cooked"
  | "food_preserved"
  | "drink_water"
  | "drink_alcohol"
  | "drink_magical"
  // Scrolls (single-use spells)
  | "scroll_damage"
  | "scroll_buff"
  | "scroll_utility"
  | "scroll_summon"
  // Throwables
  | "bomb_fire"
  | "bomb_ice"
  | "bomb_poison"
  | "bomb_smoke"
  // Other
  | "bandage"
  | "antidote"
  | "elixir"

/**
 * Container subcategories
 */
export type ContainerType =
  // Portable
  | "pouch"
  | "bag"
  | "satchel"
  | "backpack"
  | "quiver"
  // Stationary (found in world)
  | "chest"
  | "crate"
  | "barrel"
  | "urn"
  | "coffin"
  | "strongbox"
  | "safe"
  // Special
  | "bag_of_holding"
  | "coin_purse"
  | "herb_pouch"
  | "scroll_case"

/**
 * Material subcategories (crafting ingredients)
 */
export type MaterialType =
  // Metals
  | "ore_iron"
  | "ore_silver"
  | "ore_gold"
  | "ore_mithril"
  | "ore_adamantine"
  | "ore_obsidian"
  | "ingot"
  // Gems
  | "gem_raw"
  | "gem_cut"
  | "gem_magical"
  | "crystal"
  | "pearl"
  // Organic
  | "herb"
  | "mushroom"
  | "flower"
  | "root"
  | "seed"
  | "spore"
  // Animal
  | "hide"
  | "leather"
  | "bone"
  | "fang"
  | "claw_material"
  | "scale"
  | "feather"
  | "silk"
  | "venom"
  | "blood"
  // Monster
  | "essence"
  | "soul_shard"
  | "ectoplasm"
  | "demon_heart"
  | "dragon_scale"
  // Magical
  | "arcane_dust"
  | "enchanting_powder"
  | "void_essence"
  | "elemental_core"
  // Mundane
  | "wood"
  | "cloth"
  | "string"
  | "oil"
  | "wax"
  | "coal"
  | "salt"
  | "sulfur"

/**
 * Tool subcategories
 */
export type ToolType =
  // Dungeon Tools
  | "lockpick"
  | "crowbar"
  | "rope"
  | "grappling_hook"
  | "torch"
  | "lantern"
  | "compass"
  | "map"
  // Crafting Tools
  | "hammer"
  | "tongs"
  | "anvil"
  | "mortar_pestle"
  | "sewing_kit"
  | "alchemy_set"
  // Utility
  | "shovel"
  | "pickaxe"
  | "fishing_rod"
  | "trap_kit"
  | "disguise_kit"
  // Special
  | "spyglass"
  | "mirror"
  | "bell"
  | "whistle"
  | "holy_water"

/**
 * Tome subcategories (knowledge items)
 */
export type TomeType =
  // Skill Books (teach abilities)
  | "skill_book_combat"
  | "skill_book_magic"
  | "skill_book_stealth"
  | "skill_book_craft"
  // Lore Books (world info)
  | "lore_history"
  | "lore_bestiary"
  | "lore_geography"
  | "lore_religion"
  // Recipes (crafting instructions)
  | "recipe_alchemy"
  | "recipe_smithing"
  | "recipe_enchanting"
  | "recipe_cooking"
  // Spell Books (contain spells)
  | "spellbook_elemental"
  | "spellbook_divine"
  | "spellbook_dark"
  | "spellbook_arcane"
  // Special
  | "journal"
  | "map_treasure"
  | "contract"
  | "wanted_poster"

/**
 * Trinket subcategories (accessories)
 */
export type TrinketType =
  // Jewelry
  | "ring"
  | "amulet"
  | "necklace"
  | "bracelet"
  | "brooch"
  | "earring"
  // Charms
  | "charm"
  | "talisman"
  | "totem"
  | "idol"
  // Other
  | "badge"
  | "medal"
  | "insignia"
  | "token"

/**
 * Key subcategories
 */
export type KeyType =
  // Physical Keys
  | "key_common"
  | "key_ornate"
  | "key_skeleton"
  | "key_master"
  | "key_boss"
  // Magical Keys
  | "key_runic"
  | "key_ethereal"
  | "key_void"
  // Special Access
  | "keycard"
  | "signet"
  | "seal"
  | "pass"

/**
 * Relic subcategories (powerful artifacts)
 */
export type RelicType =
  // Set Pieces
  | "relic_weapon"
  | "relic_armor"
  | "relic_trinket"
  // Unique Artifacts
  | "artifact_ancient"
  | "artifact_divine"
  | "artifact_cursed"
  | "artifact_legendary"
  // Fragments (collectible pieces)
  | "fragment"
  | "shard"
  | "piece"

/**
 * Currency subcategories
 */
export type CurrencyType =
  | "gold"
  | "silver"
  | "copper"
  | "gem_currency"
  | "soul"
  | "token_merchant"
  | "token_guild"
  | "ancient_coin"

// =============================================================================
// CATEGORY METADATA
// =============================================================================

/**
 * Defines properties and behaviors for each category
 */
export interface CategoryMetadata {
  name: string
  description: string
  stackable: boolean
  maxStack: number
  canEquip: boolean
  canUse: boolean
  canDrop: boolean
  canSell: boolean
  canCraft: boolean
  defaultValue: number
  rarityWeights: Record<ItemRarity, number>
}

export const CATEGORY_METADATA: Record<ItemCategory, CategoryMetadata> = {
  weapon: {
    name: "Weapon",
    description: "Tools of combat and destruction",
    stackable: false,
    maxStack: 1,
    canEquip: true,
    canUse: false,
    canDrop: true,
    canSell: true,
    canCraft: true,
    defaultValue: 25,
    rarityWeights: { common: 50, uncommon: 30, rare: 15, legendary: 5 },
  },
  armor: {
    name: "Armor",
    description: "Protective equipment",
    stackable: false,
    maxStack: 1,
    canEquip: true,
    canUse: false,
    canDrop: true,
    canSell: true,
    canCraft: true,
    defaultValue: 30,
    rarityWeights: { common: 50, uncommon: 30, rare: 15, legendary: 5 },
  },
  consumable: {
    name: "Consumable",
    description: "Items that are used up when activated",
    stackable: true,
    maxStack: 99,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: true,
    defaultValue: 10,
    rarityWeights: { common: 60, uncommon: 25, rare: 12, legendary: 3 },
  },
  container: {
    name: "Container",
    description: "Items that hold other items",
    stackable: false,
    maxStack: 1,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: false,
    defaultValue: 15,
    rarityWeights: { common: 60, uncommon: 25, rare: 12, legendary: 3 },
  },
  material: {
    name: "Material",
    description: "Raw crafting ingredients",
    stackable: true,
    maxStack: 999,
    canEquip: false,
    canUse: false,
    canDrop: true,
    canSell: true,
    canCraft: false,
    defaultValue: 5,
    rarityWeights: { common: 70, uncommon: 20, rare: 8, legendary: 2 },
  },
  tool: {
    name: "Tool",
    description: "Utility items for exploration and crafting",
    stackable: false,
    maxStack: 1,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: true,
    defaultValue: 20,
    rarityWeights: { common: 55, uncommon: 30, rare: 12, legendary: 3 },
  },
  tome: {
    name: "Tome",
    description: "Books containing knowledge, skills, or recipes",
    stackable: false,
    maxStack: 1,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: false,
    defaultValue: 50,
    rarityWeights: { common: 40, uncommon: 35, rare: 18, legendary: 7 },
  },
  trinket: {
    name: "Trinket",
    description: "Accessories that provide passive bonuses",
    stackable: false,
    maxStack: 1,
    canEquip: true,
    canUse: false,
    canDrop: true,
    canSell: true,
    canCraft: true,
    defaultValue: 35,
    rarityWeights: { common: 45, uncommon: 32, rare: 17, legendary: 6 },
  },
  key: {
    name: "Key",
    description: "Items that unlock doors, chests, or secrets",
    stackable: true,
    maxStack: 99,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: false,
    canCraft: false,
    defaultValue: 0,
    rarityWeights: { common: 50, uncommon: 30, rare: 15, legendary: 5 },
  },
  relic: {
    name: "Relic",
    description: "Powerful artifacts with unique properties",
    stackable: false,
    maxStack: 1,
    canEquip: true,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: false,
    defaultValue: 500,
    rarityWeights: { common: 0, uncommon: 20, rare: 50, legendary: 30 },
  },
  currency: {
    name: "Currency",
    description: "Money and trade tokens",
    stackable: true,
    maxStack: 9999,
    canEquip: false,
    canUse: false,
    canDrop: true,
    canSell: false,
    canCraft: false,
    defaultValue: 1,
    rarityWeights: { common: 80, uncommon: 15, rare: 4, legendary: 1 },
  },
  quest: {
    name: "Quest Item",
    description: "Items tied to quests and story progression",
    stackable: false,
    maxStack: 1,
    canEquip: false,
    canUse: true,
    canDrop: false,
    canSell: false,
    canCraft: false,
    defaultValue: 0,
    rarityWeights: { common: 40, uncommon: 30, rare: 20, legendary: 10 },
  },
  unknown: {
    name: "Unknown",
    description: "Unidentified items with mysterious properties",
    stackable: false,
    maxStack: 1,
    canEquip: false,
    canUse: true,
    canDrop: true,
    canSell: true,
    canCraft: false,
    defaultValue: 25,
    rarityWeights: { common: 30, uncommon: 35, rare: 25, legendary: 10 },
  },
}

// =============================================================================
// WEAPON PROPERTIES
// =============================================================================

export interface WeaponProperties {
  type: WeaponType
  twoHanded: boolean
  damageType: "physical" | "slashing" | "piercing" | "bludgeoning"
  range: "melee" | "ranged" | "magic"
  baseAttack: number
  attackSpeed: "slow" | "normal" | "fast"
  critChance: number
  specialProperty?: string
}

export const WEAPON_TEMPLATES: Record<WeaponType, Omit<WeaponProperties, "type">> = {
  // One-handed melee
  sword: { twoHanded: false, damageType: "slashing", range: "melee", baseAttack: 8, attackSpeed: "normal", critChance: 0.1 },
  dagger: { twoHanded: false, damageType: "piercing", range: "melee", baseAttack: 4, attackSpeed: "fast", critChance: 0.2 },
  axe: { twoHanded: false, damageType: "slashing", range: "melee", baseAttack: 10, attackSpeed: "slow", critChance: 0.15 },
  mace: { twoHanded: false, damageType: "bludgeoning", range: "melee", baseAttack: 9, attackSpeed: "slow", critChance: 0.05 },
  flail: { twoHanded: false, damageType: "bludgeoning", range: "melee", baseAttack: 8, attackSpeed: "slow", critChance: 0.1 },
  rapier: { twoHanded: false, damageType: "piercing", range: "melee", baseAttack: 6, attackSpeed: "fast", critChance: 0.18 },
  scimitar: { twoHanded: false, damageType: "slashing", range: "melee", baseAttack: 7, attackSpeed: "fast", critChance: 0.12 },
  // Two-handed melee
  greatsword: { twoHanded: true, damageType: "slashing", range: "melee", baseAttack: 14, attackSpeed: "slow", critChance: 0.12 },
  greataxe: { twoHanded: true, damageType: "slashing", range: "melee", baseAttack: 16, attackSpeed: "slow", critChance: 0.18 },
  warhammer: { twoHanded: true, damageType: "bludgeoning", range: "melee", baseAttack: 15, attackSpeed: "slow", critChance: 0.08 },
  halberd: { twoHanded: true, damageType: "piercing", range: "melee", baseAttack: 13, attackSpeed: "slow", critChance: 0.1 },
  scythe: { twoHanded: true, damageType: "slashing", range: "melee", baseAttack: 12, attackSpeed: "normal", critChance: 0.2 },
  quarterstaff: { twoHanded: true, damageType: "bludgeoning", range: "melee", baseAttack: 6, attackSpeed: "fast", critChance: 0.05 },
  // Ranged
  bow: { twoHanded: true, damageType: "piercing", range: "ranged", baseAttack: 10, attackSpeed: "normal", critChance: 0.15 },
  crossbow: { twoHanded: true, damageType: "piercing", range: "ranged", baseAttack: 14, attackSpeed: "slow", critChance: 0.2 },
  throwing_knife: { twoHanded: false, damageType: "piercing", range: "ranged", baseAttack: 5, attackSpeed: "fast", critChance: 0.18 },
  javelin: { twoHanded: false, damageType: "piercing", range: "ranged", baseAttack: 8, attackSpeed: "normal", critChance: 0.12 },
  sling: { twoHanded: false, damageType: "bludgeoning", range: "ranged", baseAttack: 4, attackSpeed: "fast", critChance: 0.08 },
  // Magic
  staff: { twoHanded: true, damageType: "physical", range: "magic", baseAttack: 6, attackSpeed: "normal", critChance: 0.1 },
  wand: { twoHanded: false, damageType: "physical", range: "magic", baseAttack: 4, attackSpeed: "fast", critChance: 0.12 },
  orb: { twoHanded: false, damageType: "physical", range: "magic", baseAttack: 5, attackSpeed: "normal", critChance: 0.15 },
  tome_weapon: { twoHanded: true, damageType: "physical", range: "magic", baseAttack: 8, attackSpeed: "slow", critChance: 0.2 },
  // Exotic
  whip: { twoHanded: false, damageType: "slashing", range: "melee", baseAttack: 5, attackSpeed: "fast", critChance: 0.1 },
  chain: { twoHanded: false, damageType: "bludgeoning", range: "melee", baseAttack: 7, attackSpeed: "normal", critChance: 0.08 },
  claw: { twoHanded: false, damageType: "slashing", range: "melee", baseAttack: 6, attackSpeed: "fast", critChance: 0.22 },
  fist_weapon: { twoHanded: false, damageType: "bludgeoning", range: "melee", baseAttack: 5, attackSpeed: "fast", critChance: 0.15 },
}

// =============================================================================
// ARMOR PROPERTIES
// =============================================================================

export interface ArmorProperties {
  slot: ArmorSlot
  weight: ArmorWeight
  baseDefense: number
  movementPenalty: number // 0 = none, negative = slower
  magicPenalty: number // affects spellcasting
}

export const ARMOR_SLOT_TEMPLATES: Record<ArmorSlot, { baseDefense: number; primaryStat: "defense" | "resistance" | "evasion" }> = {
  head: { baseDefense: 3, primaryStat: "defense" },
  chest: { baseDefense: 8, primaryStat: "defense" },
  legs: { baseDefense: 5, primaryStat: "defense" },
  feet: { baseDefense: 2, primaryStat: "evasion" },
  hands: { baseDefense: 2, primaryStat: "defense" },
  shield: { baseDefense: 6, primaryStat: "defense" },
  cloak: { baseDefense: 1, primaryStat: "resistance" },
  belt: { baseDefense: 1, primaryStat: "defense" },
}

export const ARMOR_WEIGHT_MODIFIERS: Record<ArmorWeight, { defenseMultiplier: number; movementPenalty: number; magicPenalty: number }> = {
  cloth: { defenseMultiplier: 0.5, movementPenalty: 0, magicPenalty: 0 },
  leather: { defenseMultiplier: 0.75, movementPenalty: 0, magicPenalty: 0 },
  mail: { defenseMultiplier: 1.0, movementPenalty: -1, magicPenalty: -1 },
  plate: { defenseMultiplier: 1.5, movementPenalty: -2, magicPenalty: -2 },
}

// =============================================================================
// MATERIAL PROPERTIES
// =============================================================================

export interface MaterialProperties {
  type: MaterialType
  tier: 1 | 2 | 3 | 4 | 5 // affects crafting output quality
  category: "metal" | "gem" | "organic" | "animal" | "monster" | "magical" | "mundane"
}

export const MATERIAL_TIERS: Record<string, MaterialType[]> = {
  tier1: ["ore_iron", "wood", "cloth", "hide", "herb", "bone", "coal", "string"],
  tier2: ["ore_silver", "leather", "gem_raw", "mushroom", "fang", "feather", "oil", "salt"],
  tier3: ["ore_gold", "gem_cut", "silk", "scale", "essence", "arcane_dust", "crystal", "sulfur"],
  tier4: ["ore_mithril", "gem_magical", "venom", "blood", "soul_shard", "enchanting_powder", "pearl"],
  tier5: ["ore_adamantine", "ore_obsidian", "demon_heart", "dragon_scale", "void_essence", "elemental_core", "ectoplasm"],
}

// =============================================================================
// ENCHANTMENT SYSTEM
// =============================================================================

export type EnchantmentType =
  | "damage_bonus"
  | "defense_bonus"
  | "elemental_damage"
  | "elemental_resist"
  | "life_steal"
  | "mana_steal"
  | "crit_chance"
  | "crit_damage"
  | "attack_speed"
  | "movement_speed"
  | "health_bonus"
  | "health_regen"
  | "resource_regen"
  | "gold_find"
  | "exp_bonus"
  | "effect_on_hit"
  | "effect_on_kill"
  | "proc_chance"

export interface Enchantment {
  id: string
  name: string
  type: EnchantmentType
  tier: 1 | 2 | 3 | 4 | 5
  prefix?: string // e.g., "Flaming" for fire damage
  suffix?: string // e.g., "of the Bear" for health
  modifiers: Partial<{
    attack: number
    defense: number
    health: number
    healthRegen: number
    critChance: number
    critDamage: number
    goldMultiplier: number
    expMultiplier: number
  }>
  effect?: Partial<StatusEffect>
  procChance?: number // for on-hit effects
  description: string
}

export const ENCHANTMENT_TEMPLATES: Partial<Record<EnchantmentType, Enchantment[]>> = {
  damage_bonus: [
    { id: "sharp", name: "Sharp", type: "damage_bonus", tier: 1, prefix: "Sharp", modifiers: { attack: 2 }, description: "Increases attack by 2" },
    { id: "keen", name: "Keen", type: "damage_bonus", tier: 2, prefix: "Keen", modifiers: { attack: 4 }, description: "Increases attack by 4" },
    { id: "deadly", name: "Deadly", type: "damage_bonus", tier: 3, prefix: "Deadly", modifiers: { attack: 7 }, description: "Increases attack by 7" },
    { id: "vicious", name: "Vicious", type: "damage_bonus", tier: 4, prefix: "Vicious", modifiers: { attack: 10 }, description: "Increases attack by 10" },
    { id: "devastating", name: "Devastating", type: "damage_bonus", tier: 5, prefix: "Devastating", modifiers: { attack: 15 }, description: "Increases attack by 15" },
  ],
  defense_bonus: [
    { id: "sturdy", name: "Sturdy", type: "defense_bonus", tier: 1, prefix: "Sturdy", modifiers: { defense: 2 }, description: "Increases defense by 2" },
    { id: "reinforced", name: "Reinforced", type: "defense_bonus", tier: 2, prefix: "Reinforced", modifiers: { defense: 4 }, description: "Increases defense by 4" },
    { id: "fortified", name: "Fortified", type: "defense_bonus", tier: 3, prefix: "Fortified", modifiers: { defense: 6 }, description: "Increases defense by 6" },
    { id: "impenetrable", name: "Impenetrable", type: "defense_bonus", tier: 4, prefix: "Impenetrable", modifiers: { defense: 9 }, description: "Increases defense by 9" },
    { id: "invincible", name: "Invincible", type: "defense_bonus", tier: 5, prefix: "Invincible", modifiers: { defense: 12 }, description: "Increases defense by 12" },
  ],
  health_bonus: [
    { id: "healthy", name: "Healthy", type: "health_bonus", tier: 1, suffix: "of Vitality", modifiers: { health: 10 }, description: "Increases health by 10" },
    { id: "hearty", name: "Hearty", type: "health_bonus", tier: 2, suffix: "of the Bear", modifiers: { health: 20 }, description: "Increases health by 20" },
    { id: "robust", name: "Robust", type: "health_bonus", tier: 3, suffix: "of the Giant", modifiers: { health: 35 }, description: "Increases health by 35" },
    { id: "titanic", name: "Titanic", type: "health_bonus", tier: 4, suffix: "of the Titan", modifiers: { health: 50 }, description: "Increases health by 50" },
    { id: "immortal", name: "Immortal", type: "health_bonus", tier: 5, suffix: "of Immortality", modifiers: { health: 75 }, description: "Increases health by 75" },
  ],
  crit_chance: [
    { id: "precise", name: "Precise", type: "crit_chance", tier: 2, prefix: "Precise", modifiers: { critChance: 0.05 }, description: "+5% critical chance" },
    { id: "deadly_crit", name: "Deadly", type: "crit_chance", tier: 3, prefix: "Deadly", modifiers: { critChance: 0.1 }, description: "+10% critical chance" },
    { id: "assassins", name: "Assassin's", type: "crit_chance", tier: 4, prefix: "Assassin's", modifiers: { critChance: 0.15 }, description: "+15% critical chance" },
  ],
  gold_find: [
    { id: "greedy", name: "Greedy", type: "gold_find", tier: 1, suffix: "of Greed", modifiers: { goldMultiplier: 1.1 }, description: "+10% gold find" },
    { id: "prosperous", name: "Prosperous", type: "gold_find", tier: 2, suffix: "of Prosperity", modifiers: { goldMultiplier: 1.25 }, description: "+25% gold find" },
    { id: "wealthy", name: "Wealthy", type: "gold_find", tier: 3, suffix: "of Wealth", modifiers: { goldMultiplier: 1.5 }, description: "+50% gold find" },
  ],
}

// =============================================================================
// EXAMPLE ITEM TEMPLATES (For AI generation grounding)
// =============================================================================

/**
 * Example items for each category - AI can use these as templates
 * for generating creative variations
 */
export const EXAMPLE_ITEMS = {
  containers: [
    { name: "Worn Leather Pouch", subtype: "pouch", slots: 4, description: "A small pouch for coins and trinkets" },
    { name: "Adventurer's Backpack", subtype: "backpack", slots: 16, description: "A sturdy pack for long journeys" },
    { name: "Treasure Chest", subtype: "chest", slots: 20, description: "An ornate chest bound in iron" },
    { name: "Bag of Holding", subtype: "bag_of_holding", slots: 100, description: "Interior space larger than exterior suggests" },
    { name: "Rotting Coffin", subtype: "coffin", slots: 6, description: "Perhaps some valuables were buried with the deceased" },
  ],
  materials: [
    { name: "Iron Ore", subtype: "ore_iron", tier: 1, description: "Common metal ore, foundation of smithing" },
    { name: "Silver Nugget", subtype: "ore_silver", tier: 2, description: "Precious metal effective against undead" },
    { name: "Mithril Vein Fragment", subtype: "ore_mithril", tier: 4, description: "Legendary lightweight metal" },
    { name: "Shadowroot", subtype: "root", tier: 3, description: "A dark root that absorbs light" },
    { name: "Dragon's Blood", subtype: "blood", tier: 5, description: "Crimson ichor of immense magical potency" },
    { name: "Soul Shard", subtype: "soul_shard", tier: 4, description: "A crystallized fragment of a departed spirit" },
  ],
  tomes: [
    { name: "Warrior's Compendium", subtype: "skill_book_combat", teaches: "power_strike", description: "Master the art of devastating blows" },
    { name: "Grimoire of Flames", subtype: "spellbook_elemental", teaches: "fireball", description: "Ancient fire magic bound in dragonskin" },
    { name: "Alchemist's Recipe Book", subtype: "recipe_alchemy", recipes: ["health_potion", "mana_elixir"], description: "Detailed brewing instructions" },
    { name: "Bestiary of the Deep", subtype: "lore_bestiary", description: "Detailed accounts of dungeon creatures" },
  ],
  trinkets: [
    { name: "Ring of Minor Protection", subtype: "ring", modifiers: { defense: 2 }, description: "A simple band with protective enchantment" },
    { name: "Amulet of the Phoenix", subtype: "amulet", modifiers: { healthRegen: 3 }, description: "Warm to the touch, grants regeneration" },
    { name: "Lucky Charm", subtype: "charm", modifiers: { goldMultiplier: 1.1 }, description: "A rabbit's foot that brings fortune" },
    { name: "Cultist's Talisman", subtype: "talisman", modifiers: { attack: 3, defense: -1 }, description: "Power at a price" },
  ],
  relics: [
    { name: "Blade of the Fallen King", subtype: "relic_weapon", description: "A legendary sword that whispers of ancient battles" },
    { name: "Crown of Shadows", subtype: "artifact_cursed", description: "Grants power but consumes the wearer's humanity" },
    { name: "Shard of the World Stone", subtype: "fragment", description: "A piece of the pillar that holds reality together" },
  ],
  keys: [
    { name: "Rusty Key", subtype: "key_common", description: "Opens common doors and chests" },
    { name: "Skeleton Key", subtype: "key_skeleton", description: "May work on multiple locks" },
    { name: "Void Key", subtype: "key_void", description: "Opens portals to other dimensions" },
    { name: "Boss Chamber Seal", subtype: "key_boss", description: "Required to enter the boss chamber" },
  ],
  tools: [
    { name: "Thieves' Lockpicks", subtype: "lockpick", uses: 10, description: "For opening locks without keys" },
    { name: "Everburning Torch", subtype: "torch", description: "Magical flame that never extinguishes" },
    { name: "Rope of Climbing", subtype: "rope", description: "50 feet of rope that can climb on command" },
    { name: "Dowsing Rod", subtype: "compass", description: "Points toward treasure or water" },
  ],
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get metadata for an item category
 */
export function getCategoryMetadata(category: ItemCategory): CategoryMetadata {
  return CATEGORY_METADATA[category]
}

/**
 * Check if an item of this category can be stacked
 */
export function isStackable(category: ItemCategory): boolean {
  return CATEGORY_METADATA[category].stackable
}

/**
 * Get the max stack size for a category
 */
export function getMaxStack(category: ItemCategory): number {
  return CATEGORY_METADATA[category].maxStack
}

/**
 * Roll rarity based on category weights
 */
export function rollRarityForCategory(category: ItemCategory): ItemRarity {
  const weights = CATEGORY_METADATA[category].rarityWeights
  const total = weights.common + weights.uncommon + weights.rare + weights.legendary
  const roll = Math.random() * total

  if (roll < weights.common) return "common"
  if (roll < weights.common + weights.uncommon) return "uncommon"
  if (roll < weights.common + weights.uncommon + weights.rare) return "rare"
  return "legendary"
}

/**
 * Get all weapon types of a specific range
 */
export function getWeaponsByRange(range: "melee" | "ranged" | "magic"): WeaponType[] {
  return (Object.entries(WEAPON_TEMPLATES) as [WeaponType, typeof WEAPON_TEMPLATES[WeaponType]][])
    .filter(([_, props]) => props.range === range)
    .map(([type]) => type)
}

/**
 * Get material tier
 */
export function getMaterialTier(materialType: MaterialType): number {
  for (const [tier, materials] of Object.entries(MATERIAL_TIERS)) {
    if (materials.includes(materialType)) {
      return parseInt(tier.replace("tier", ""))
    }
  }
  return 1
}
