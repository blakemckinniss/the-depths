/**
 * Material Generation System
 *
 * Comprehensive system for generating crafting materials with:
 * - Quality grades affecting output
 * - Processing/refinement chains (raw → processed → refined)
 * - Source tracking (what monsters/locations drop them)
 * - Tags for recipe matching
 * - Rarity-based generation
 * - Future alchemy/crafting support
 */

import type { Item, ItemRarity } from "@/lib/core/game-types"
import type { MaterialType } from "@/lib/items/item-taxonomy"
import { MATERIAL_TIERS, getMaterialTier } from "@/lib/items/item-taxonomy"

// =============================================================================
// QUALITY SYSTEM
// =============================================================================

export type MaterialQuality = "crude" | "normal" | "fine" | "superior" | "pristine"

export const QUALITY_MULTIPLIERS: Record<MaterialQuality, number> = {
  crude: 0.5,
  normal: 1.0,
  fine: 1.5,
  superior: 2.0,
  pristine: 3.0,
}

export const QUALITY_VALUE_MULTIPLIERS: Record<MaterialQuality, number> = {
  crude: 0.25,
  normal: 1.0,
  fine: 2.0,
  superior: 4.0,
  pristine: 10.0,
}

// Roll quality based on floor/luck
export function rollQuality(floorBonus = 0, luckBonus = 0): MaterialQuality {
  const roll = Math.random() * 100 + floorBonus * 2 + luckBonus
  if (roll >= 98) return "pristine"
  if (roll >= 90) return "superior"
  if (roll >= 70) return "fine"
  if (roll >= 30) return "normal"
  return "crude"
}

// =============================================================================
// PROCESSING STATE
// =============================================================================

export type ProcessingState = "raw" | "processed" | "refined" | "purified" | "perfected"

export const PROCESSING_CHAINS: Record<ProcessingState, ProcessingState | null> = {
  raw: "processed",
  processed: "refined",
  refined: "purified",
  purified: "perfected",
  perfected: null, // end of chain
}

export const PROCESSING_REQUIREMENTS: Record<ProcessingState, { tool?: string; skill?: string; cost: number }> = {
  raw: { cost: 0 },
  processed: { tool: "hammer", cost: 5 },
  refined: { tool: "anvil", skill: "smithing", cost: 15 },
  purified: { tool: "alchemy_set", skill: "alchemy", cost: 30 },
  perfected: { tool: "enchanting_altar", skill: "enchanting", cost: 100 },
}

// =============================================================================
// MATERIAL CATEGORIES
// =============================================================================

export type MaterialCategory = "metal" | "gem" | "organic" | "animal" | "monster" | "magical" | "mundane"

export const MATERIAL_CATEGORIES: Record<MaterialType, MaterialCategory> = {
  // Metals
  ore_iron: "metal",
  ore_silver: "metal",
  ore_gold: "metal",
  ore_mithril: "metal",
  ore_adamantine: "metal",
  ore_obsidian: "metal",
  ingot: "metal",
  // Gems
  gem_raw: "gem",
  gem_cut: "gem",
  gem_magical: "gem",
  crystal: "gem",
  pearl: "gem",
  // Organic
  herb: "organic",
  mushroom: "organic",
  flower: "organic",
  root: "organic",
  seed: "organic",
  spore: "organic",
  // Animal
  hide: "animal",
  leather: "animal",
  bone: "animal",
  fang: "animal",
  claw_material: "animal",
  scale: "animal",
  feather: "animal",
  silk: "animal",
  venom: "animal",
  blood: "animal",
  // Monster
  essence: "monster",
  soul_shard: "monster",
  ectoplasm: "monster",
  demon_heart: "monster",
  dragon_scale: "monster",
  // Magical
  arcane_dust: "magical",
  enchanting_powder: "magical",
  void_essence: "magical",
  elemental_core: "magical",
  // Mundane
  wood: "mundane",
  cloth: "mundane",
  string: "mundane",
  oil: "mundane",
  wax: "mundane",
  coal: "mundane",
  salt: "mundane",
  sulfur: "mundane",
}

// =============================================================================
// MATERIAL TAGS (for recipe matching)
// =============================================================================

export type MaterialTag =
  | "flammable"
  | "conductive"
  | "toxic"
  | "magical"
  | "holy"
  | "dark"
  | "elemental_fire"
  | "elemental_ice"
  | "elemental_lightning"
  | "elemental_earth"
  | "healing"
  | "buffing"
  | "debuffing"
  | "transmutation"
  | "structural"
  | "decorative"
  | "weapon_material"
  | "armor_material"
  | "reagent"
  | "catalyst"
  | "fuel"
  | "binding"
  | "rare"
  | "legendary"
  | "organic"

export const MATERIAL_TAGS: Record<MaterialType, MaterialTag[]> = {
  // Metals
  ore_iron: ["structural", "weapon_material", "armor_material", "conductive"],
  ore_silver: ["conductive", "weapon_material", "holy", "decorative"],
  ore_gold: ["conductive", "decorative", "magical", "transmutation"],
  ore_mithril: ["magical", "weapon_material", "armor_material", "rare"],
  ore_adamantine: ["structural", "weapon_material", "armor_material", "legendary"],
  ore_obsidian: ["dark", "weapon_material", "magical"],
  ingot: ["structural", "weapon_material", "armor_material"],
  // Gems
  gem_raw: ["decorative", "magical"],
  gem_cut: ["decorative", "magical", "catalyst"],
  gem_magical: ["magical", "catalyst", "rare"],
  crystal: ["magical", "conductive", "catalyst"],
  pearl: ["decorative", "holy", "healing"],
  // Organic
  herb: ["healing", "reagent", "organic"],
  mushroom: ["reagent", "toxic", "healing"],
  flower: ["reagent", "healing", "decorative"],
  root: ["reagent", "healing", "buffing"],
  seed: ["reagent", "transmutation"],
  spore: ["toxic", "reagent", "debuffing"],
  // Animal
  hide: ["armor_material", "structural"],
  leather: ["armor_material", "structural", "binding"],
  bone: ["weapon_material", "structural", "dark"],
  fang: ["weapon_material", "toxic"],
  claw_material: ["weapon_material"],
  scale: ["armor_material", "elemental_fire"],
  feather: ["decorative", "magical"],
  silk: ["armor_material", "magical", "binding"],
  venom: ["toxic", "debuffing", "reagent"],
  blood: ["reagent", "dark", "magical"],
  // Monster
  essence: ["magical", "catalyst", "reagent"],
  soul_shard: ["magical", "dark", "catalyst", "rare"],
  ectoplasm: ["magical", "dark", "reagent"],
  demon_heart: ["dark", "catalyst", "legendary"],
  dragon_scale: ["armor_material", "elemental_fire", "legendary"],
  // Magical
  arcane_dust: ["magical", "catalyst", "reagent"],
  enchanting_powder: ["magical", "catalyst", "transmutation"],
  void_essence: ["dark", "magical", "legendary", "catalyst"],
  elemental_core: ["elemental_fire", "elemental_ice", "elemental_lightning", "catalyst", "rare"],
  // Mundane
  wood: ["flammable", "structural", "fuel"],
  cloth: ["flammable", "armor_material"],
  string: ["binding", "structural"],
  oil: ["flammable", "fuel", "reagent"],
  wax: ["flammable", "binding", "fuel"],
  coal: ["fuel", "flammable"],
  salt: ["reagent", "holy"],
  sulfur: ["flammable", "reagent", "toxic"],
}

// =============================================================================
// MATERIAL SOURCES
// =============================================================================

export interface MaterialSource {
  type: "monster" | "location" | "harvest" | "treasure" | "merchant" | "quest"
  sources: string[]
  dropChance: number // 0-1
  minFloor?: number
  maxFloor?: number
}

export const MATERIAL_SOURCES: Partial<Record<MaterialType, MaterialSource[]>> = {
  // Common materials - found everywhere
  ore_iron: [
    { type: "location", sources: ["mines", "caves", "rocky_areas"], dropChance: 0.4 },
    { type: "merchant", sources: ["blacksmith"], dropChance: 1.0 },
  ],
  wood: [
    { type: "location", sources: ["forest", "ruins"], dropChance: 0.6 },
    { type: "merchant", sources: ["general_store"], dropChance: 1.0 },
  ],
  cloth: [
    { type: "location", sources: ["ruins", "crypts"], dropChance: 0.3 },
    { type: "monster", sources: ["bandit", "cultist", "ghost"], dropChance: 0.2 },
  ],
  herb: [
    { type: "harvest", sources: ["forest", "garden", "swamp"], dropChance: 0.5 },
    { type: "merchant", sources: ["alchemist", "herbalist"], dropChance: 1.0 },
  ],
  bone: [
    { type: "monster", sources: ["skeleton", "undead", "beast"], dropChance: 0.4 },
    { type: "location", sources: ["crypt", "bone_pile", "graveyard"], dropChance: 0.3 },
  ],

  // Uncommon materials
  ore_silver: [
    { type: "location", sources: ["deep_mines", "moonlit_caves"], dropChance: 0.2, minFloor: 3 },
    { type: "treasure", sources: ["chest", "strongbox"], dropChance: 0.15 },
  ],
  leather: [
    { type: "monster", sources: ["beast", "animal", "werewolf"], dropChance: 0.3 },
    { type: "merchant", sources: ["tanner", "leatherworker"], dropChance: 1.0 },
  ],
  gem_raw: [
    { type: "location", sources: ["gem_vein", "treasure_room"], dropChance: 0.15, minFloor: 2 },
    { type: "monster", sources: ["golem", "earth_elemental"], dropChance: 0.2 },
  ],
  mushroom: [
    { type: "harvest", sources: ["dark_caves", "swamp", "underground"], dropChance: 0.4 },
    { type: "location", sources: ["mushroom_grove"], dropChance: 0.7 },
  ],

  // Rare materials
  ore_gold: [
    { type: "location", sources: ["treasure_vault", "dragon_hoard"], dropChance: 0.1, minFloor: 5 },
    { type: "treasure", sources: ["legendary_chest"], dropChance: 0.25 },
  ],
  essence: [
    { type: "monster", sources: ["elemental", "spirit", "wraith"], dropChance: 0.25, minFloor: 4 },
  ],
  silk: [
    { type: "monster", sources: ["spider", "giant_spider", "silk_moth"], dropChance: 0.3, minFloor: 3 },
  ],
  venom: [
    { type: "monster", sources: ["snake", "spider", "scorpion", "wyvern"], dropChance: 0.2 },
  ],
  crystal: [
    { type: "location", sources: ["crystal_cave", "magical_sanctum"], dropChance: 0.2, minFloor: 5 },
    { type: "monster", sources: ["crystal_golem"], dropChance: 0.4 },
  ],

  // Epic materials
  ore_mithril: [
    { type: "location", sources: ["ancient_mines", "dwarven_ruins"], dropChance: 0.08, minFloor: 7 },
    { type: "monster", sources: ["ancient_guardian"], dropChance: 0.15 },
  ],
  soul_shard: [
    { type: "monster", sources: ["boss", "lich", "death_knight", "soul_reaper"], dropChance: 0.2, minFloor: 6 },
  ],
  gem_magical: [
    { type: "location", sources: ["arcane_sanctum", "wizard_tower"], dropChance: 0.1, minFloor: 6 },
    { type: "monster", sources: ["arcane_golem", "crystal_dragon"], dropChance: 0.2 },
  ],

  // Legendary materials
  ore_adamantine: [
    { type: "location", sources: ["meteor_crater", "void_rift"], dropChance: 0.05, minFloor: 9 },
    { type: "monster", sources: ["adamantine_golem"], dropChance: 0.15 },
  ],
  demon_heart: [
    { type: "monster", sources: ["demon_lord", "pit_fiend", "balor"], dropChance: 0.3, minFloor: 8 },
  ],
  dragon_scale: [
    { type: "monster", sources: ["dragon", "wyrm", "drake_boss"], dropChance: 0.25, minFloor: 8 },
  ],
  void_essence: [
    { type: "monster", sources: ["void_creature", "eldritch_horror"], dropChance: 0.2, minFloor: 9 },
    { type: "location", sources: ["void_rift", "dimensional_tear"], dropChance: 0.1 },
  ],
  elemental_core: [
    { type: "monster", sources: ["elemental_lord", "primordial"], dropChance: 0.2, minFloor: 8 },
  ],
}

// =============================================================================
// MATERIAL PROFILES
// =============================================================================

export interface MaterialProfile {
  type: MaterialType
  category: MaterialCategory
  tier: number
  baseValue: number
  stackLimit: number
  tags: MaterialTag[]
  processingPath: ProcessingState[]
  description: string
  loreHints: string[]
}

export const MATERIAL_PROFILES: Record<MaterialType, MaterialProfile> = {
  // METALS
  ore_iron: {
    type: "ore_iron",
    category: "metal",
    tier: 1,
    baseValue: 5,
    stackLimit: 99,
    tags: ["structural", "weapon_material", "armor_material", "conductive"],
    processingPath: ["raw", "processed", "refined"],
    description: "Common iron ore, foundation of smithing",
    loreHints: ["The backbone of civilization", "Forged in ancient fires"],
  },
  ore_silver: {
    type: "ore_silver",
    category: "metal",
    tier: 2,
    baseValue: 15,
    stackLimit: 99,
    tags: ["conductive", "weapon_material", "holy", "decorative"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "Precious metal with anti-undead properties",
    loreHints: ["Moonlight made solid", "Bane of the undead"],
  },
  ore_gold: {
    type: "ore_gold",
    category: "metal",
    tier: 3,
    baseValue: 50,
    stackLimit: 50,
    tags: ["conductive", "decorative", "magical", "transmutation"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "The metal of kings and mages",
    loreHints: ["Sunlight crystallized", "Conduit of magical energy"],
  },
  ore_mithril: {
    type: "ore_mithril",
    category: "metal",
    tier: 4,
    baseValue: 200,
    stackLimit: 20,
    tags: ["magical", "weapon_material", "armor_material", "rare"],
    processingPath: ["raw", "processed", "refined", "purified", "perfected"],
    description: "Legendary lightweight metal of elven make",
    loreHints: ["Starlight woven into steel", "Light as a feather, strong as dragon bone"],
  },
  ore_adamantine: {
    type: "ore_adamantine",
    category: "metal",
    tier: 5,
    baseValue: 500,
    stackLimit: 10,
    tags: ["structural", "weapon_material", "armor_material", "legendary"],
    processingPath: ["raw", "processed", "refined", "purified", "perfected"],
    description: "Virtually indestructible metal from the deep earth",
    loreHints: ["Forged in the heart of dying stars", "The gods' own armor"],
  },
  ore_obsidian: {
    type: "ore_obsidian",
    category: "metal",
    tier: 3,
    baseValue: 40,
    stackLimit: 50,
    tags: ["dark", "weapon_material", "magical"],
    processingPath: ["raw", "processed", "refined"],
    description: "Volcanic glass infused with shadow",
    loreHints: ["Frozen darkness", "Born from the world's blood"],
  },
  ingot: {
    type: "ingot",
    category: "metal",
    tier: 1,
    baseValue: 10,
    stackLimit: 99,
    tags: ["structural", "weapon_material", "armor_material"],
    processingPath: ["processed", "refined"],
    description: "Refined metal ready for smithing",
    loreHints: ["The smith's canvas", "Potential incarnate"],
  },

  // GEMS
  gem_raw: {
    type: "gem_raw",
    category: "gem",
    tier: 2,
    baseValue: 25,
    stackLimit: 50,
    tags: ["decorative", "magical"],
    processingPath: ["raw", "processed"],
    description: "Uncut gemstone with hidden potential",
    loreHints: ["Earth's treasure", "Sleeping beauty"],
  },
  gem_cut: {
    type: "gem_cut",
    category: "gem",
    tier: 3,
    baseValue: 75,
    stackLimit: 30,
    tags: ["decorative", "magical", "catalyst"],
    processingPath: ["processed", "refined"],
    description: "Precisely cut gemstone revealing inner fire",
    loreHints: ["Light imprisoned", "Faceted perfection"],
  },
  gem_magical: {
    type: "gem_magical",
    category: "gem",
    tier: 4,
    baseValue: 250,
    stackLimit: 10,
    tags: ["magical", "catalyst", "rare"],
    processingPath: ["refined", "purified", "perfected"],
    description: "Gem infused with raw magical energy",
    loreHints: ["Power crystallized", "A captured spell"],
  },
  crystal: {
    type: "crystal",
    category: "gem",
    tier: 3,
    baseValue: 60,
    stackLimit: 30,
    tags: ["magical", "conductive", "catalyst"],
    processingPath: ["raw", "processed", "refined"],
    description: "Natural crystal formation resonating with energy",
    loreHints: ["The world's memories", "Tuning fork of magic"],
  },
  pearl: {
    type: "pearl",
    category: "gem",
    tier: 2,
    baseValue: 35,
    stackLimit: 50,
    tags: ["decorative", "holy", "healing"],
    processingPath: ["raw", "processed"],
    description: "Ocean's treasure formed in living shells",
    loreHints: ["Tears of the sea goddess", "Moondrops solidified"],
  },

  // ORGANIC
  herb: {
    type: "herb",
    category: "organic",
    tier: 1,
    baseValue: 3,
    stackLimit: 99,
    tags: ["healing", "reagent"],
    processingPath: ["raw", "processed"],
    description: "Common medicinal plant",
    loreHints: ["Nature's medicine", "Green healing"],
  },
  mushroom: {
    type: "mushroom",
    category: "organic",
    tier: 2,
    baseValue: 8,
    stackLimit: 99,
    tags: ["reagent", "toxic", "healing"],
    processingPath: ["raw", "processed"],
    description: "Fungal growth with alchemical properties",
    loreHints: ["Neither plant nor beast", "Secrets of the dark"],
  },
  flower: {
    type: "flower",
    category: "organic",
    tier: 1,
    baseValue: 4,
    stackLimit: 99,
    tags: ["reagent", "healing", "decorative"],
    processingPath: ["raw", "processed"],
    description: "Delicate bloom with subtle magical properties",
    loreHints: ["Beauty distilled", "Essence of spring"],
  },
  root: {
    type: "root",
    category: "organic",
    tier: 2,
    baseValue: 6,
    stackLimit: 99,
    tags: ["reagent", "healing", "buffing"],
    processingPath: ["raw", "processed", "refined"],
    description: "Underground plant matter with concentrated essence",
    loreHints: ["Deep earth's bounty", "Hidden strength"],
  },
  seed: {
    type: "seed",
    category: "organic",
    tier: 1,
    baseValue: 2,
    stackLimit: 99,
    tags: ["reagent", "transmutation"],
    processingPath: ["raw"],
    description: "Dormant potential of new life",
    loreHints: ["Life compressed", "Tomorrow's forest"],
  },
  spore: {
    type: "spore",
    category: "organic",
    tier: 2,
    baseValue: 10,
    stackLimit: 50,
    tags: ["toxic", "reagent", "debuffing"],
    processingPath: ["raw", "processed"],
    description: "Microscopic seeds of fungal life",
    loreHints: ["Invisible menace", "Patience incarnate"],
  },

  // ANIMAL
  hide: {
    type: "hide",
    category: "animal",
    tier: 1,
    baseValue: 6,
    stackLimit: 50,
    tags: ["armor_material", "structural"],
    processingPath: ["raw", "processed"],
    description: "Raw animal skin ready for tanning",
    loreHints: ["Nature's armor", "Gift of the hunt"],
  },
  leather: {
    type: "leather",
    category: "animal",
    tier: 2,
    baseValue: 15,
    stackLimit: 50,
    tags: ["armor_material", "structural", "binding"],
    processingPath: ["processed", "refined"],
    description: "Tanned and treated animal hide",
    loreHints: ["Second skin", "Crafted protection"],
  },
  bone: {
    type: "bone",
    category: "animal",
    tier: 1,
    baseValue: 4,
    stackLimit: 99,
    tags: ["weapon_material", "structural", "dark"],
    processingPath: ["raw", "processed"],
    description: "Skeletal remains of creatures",
    loreHints: ["Structure of life", "Death's framework"],
  },
  fang: {
    type: "fang",
    category: "animal",
    tier: 2,
    baseValue: 12,
    stackLimit: 50,
    tags: ["weapon_material", "toxic"],
    processingPath: ["raw", "processed"],
    description: "Sharp tooth from a predator",
    loreHints: ["Nature's blade", "Hunter's legacy"],
  },
  claw_material: {
    type: "claw_material",
    category: "animal",
    tier: 2,
    baseValue: 10,
    stackLimit: 50,
    tags: ["weapon_material"],
    processingPath: ["raw", "processed"],
    description: "Razor-sharp claw from a beast",
    loreHints: ["Rending fury", "Predator's tool"],
  },
  scale: {
    type: "scale",
    category: "animal",
    tier: 2,
    baseValue: 18,
    stackLimit: 50,
    tags: ["armor_material", "elemental_fire"],
    processingPath: ["raw", "processed", "refined"],
    description: "Protective scale from a reptilian creature",
    loreHints: ["Natural armor", "Scaled defense"],
  },
  feather: {
    type: "feather",
    category: "animal",
    tier: 1,
    baseValue: 5,
    stackLimit: 99,
    tags: ["decorative", "magical"],
    processingPath: ["raw", "processed"],
    description: "Light plumage from a winged creature",
    loreHints: ["Touch of sky", "Whisper of wind"],
  },
  silk: {
    type: "silk",
    category: "animal",
    tier: 3,
    baseValue: 40,
    stackLimit: 30,
    tags: ["armor_material", "magical", "binding"],
    processingPath: ["raw", "processed", "refined"],
    description: "Fine threads spun by magical creatures",
    loreHints: ["Strength in delicacy", "Woven moonlight"],
  },
  venom: {
    type: "venom",
    category: "animal",
    tier: 3,
    baseValue: 35,
    stackLimit: 20,
    tags: ["toxic", "debuffing", "reagent"],
    processingPath: ["raw", "processed", "refined"],
    description: "Deadly toxin extracted from venomous creatures",
    loreHints: ["Liquid death", "Nature's poison"],
  },
  blood: {
    type: "blood",
    category: "animal",
    tier: 2,
    baseValue: 15,
    stackLimit: 30,
    tags: ["reagent", "dark", "magical"],
    processingPath: ["raw", "processed"],
    description: "Life essence of creatures",
    loreHints: ["River of life", "Crimson power"],
  },

  // MONSTER
  essence: {
    type: "essence",
    category: "monster",
    tier: 3,
    baseValue: 50,
    stackLimit: 30,
    tags: ["magical", "catalyst", "reagent"],
    processingPath: ["raw", "processed", "refined"],
    description: "Concentrated magical energy from magical beings",
    loreHints: ["Soul residue", "Magic distilled"],
  },
  soul_shard: {
    type: "soul_shard",
    category: "monster",
    tier: 4,
    baseValue: 150,
    stackLimit: 10,
    tags: ["magical", "dark", "catalyst", "rare"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "Crystallized fragment of a departed spirit",
    loreHints: ["Trapped eternity", "Echo of existence"],
  },
  ectoplasm: {
    type: "ectoplasm",
    category: "monster",
    tier: 3,
    baseValue: 45,
    stackLimit: 30,
    tags: ["magical", "dark", "reagent"],
    processingPath: ["raw", "processed"],
    description: "Spiritual residue from ghostly entities",
    loreHints: ["Ghost tears", "Between-worlds matter"],
  },
  demon_heart: {
    type: "demon_heart",
    category: "monster",
    tier: 5,
    baseValue: 500,
    stackLimit: 5,
    tags: ["dark", "catalyst", "legendary"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "Still-beating heart of a slain demon",
    loreHints: ["Infernal core", "Corrupted life force"],
  },
  dragon_scale: {
    type: "dragon_scale",
    category: "monster",
    tier: 5,
    baseValue: 400,
    stackLimit: 10,
    tags: ["armor_material", "elemental_fire", "legendary"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "Scale shed by an ancient dragon",
    loreHints: ["Wyrm's armor", "Fire given form"],
  },

  // MAGICAL
  arcane_dust: {
    type: "arcane_dust",
    category: "magical",
    tier: 2,
    baseValue: 20,
    stackLimit: 99,
    tags: ["magical", "catalyst", "reagent"],
    processingPath: ["raw", "processed"],
    description: "Fine powder of concentrated magical energy",
    loreHints: ["Spell fragments", "Magic particulate"],
  },
  enchanting_powder: {
    type: "enchanting_powder",
    category: "magical",
    tier: 3,
    baseValue: 60,
    stackLimit: 50,
    tags: ["magical", "catalyst", "transmutation"],
    processingPath: ["processed", "refined"],
    description: "Specialized powder for imbuing items with magic",
    loreHints: ["Transformation catalyst", "Enchanter's medium"],
  },
  void_essence: {
    type: "void_essence",
    category: "magical",
    tier: 5,
    baseValue: 600,
    stackLimit: 5,
    tags: ["dark", "magical", "legendary", "catalyst"],
    processingPath: ["raw", "processed", "refined", "purified", "perfected"],
    description: "Pure energy from the space between dimensions",
    loreHints: ["Nothing made something", "The uncolor"],
  },
  elemental_core: {
    type: "elemental_core",
    category: "magical",
    tier: 4,
    baseValue: 300,
    stackLimit: 10,
    tags: ["elemental_fire", "elemental_ice", "elemental_lightning", "catalyst", "rare"],
    processingPath: ["raw", "processed", "refined", "purified"],
    description: "Crystallized heart of a primordial elemental",
    loreHints: ["Nature's fury condensed", "Primal power source"],
  },

  // MUNDANE
  wood: {
    type: "wood",
    category: "mundane",
    tier: 1,
    baseValue: 2,
    stackLimit: 99,
    tags: ["flammable", "structural", "fuel"],
    processingPath: ["raw", "processed"],
    description: "Common lumber from trees",
    loreHints: ["Forest's gift", "Building block of civilization"],
  },
  cloth: {
    type: "cloth",
    category: "mundane",
    tier: 1,
    baseValue: 3,
    stackLimit: 99,
    tags: ["flammable", "armor_material"],
    processingPath: ["raw", "processed"],
    description: "Woven fabric for basic crafting",
    loreHints: ["Threads united", "Simple protection"],
  },
  string: {
    type: "string",
    category: "mundane",
    tier: 1,
    baseValue: 1,
    stackLimit: 99,
    tags: ["binding", "structural"],
    processingPath: ["raw", "processed"],
    description: "Basic cordage for tying and binding",
    loreHints: ["Simple connection", "Humble utility"],
  },
  oil: {
    type: "oil",
    category: "mundane",
    tier: 1,
    baseValue: 4,
    stackLimit: 50,
    tags: ["flammable", "fuel", "reagent"],
    processingPath: ["raw", "processed"],
    description: "Flammable liquid with many uses",
    loreHints: ["Liquid fire", "Ancient light"],
  },
  wax: {
    type: "wax",
    category: "mundane",
    tier: 1,
    baseValue: 3,
    stackLimit: 50,
    tags: ["flammable", "binding", "fuel"],
    processingPath: ["raw", "processed"],
    description: "Moldable substance from bees or plants",
    loreHints: ["Bee's bounty", "Sealant of secrets"],
  },
  coal: {
    type: "coal",
    category: "mundane",
    tier: 1,
    baseValue: 2,
    stackLimit: 99,
    tags: ["fuel", "flammable"],
    processingPath: ["raw"],
    description: "Black rock that burns hot and long",
    loreHints: ["Ancient forests compressed", "Smith's friend"],
  },
  salt: {
    type: "salt",
    category: "mundane",
    tier: 1,
    baseValue: 3,
    stackLimit: 99,
    tags: ["reagent", "holy"],
    processingPath: ["raw", "processed"],
    description: "White crystals of purification",
    loreHints: ["Earth's tears", "Ward against evil"],
  },
  sulfur: {
    type: "sulfur",
    category: "mundane",
    tier: 2,
    baseValue: 8,
    stackLimit: 50,
    tags: ["flammable", "reagent", "toxic"],
    processingPath: ["raw", "processed"],
    description: "Yellow mineral with pungent smell",
    loreHints: ["Brimstone", "Hell's perfume"],
  },
}

// =============================================================================
// MATERIAL ITEM GENERATION
// =============================================================================

export interface MaterialItem extends Item {
  category: "material"
  subtype: MaterialType
  materialCategory: MaterialCategory
  tier: number
  quality: MaterialQuality
  processingState: ProcessingState
  quantity: number
  tags: MaterialTag[]
  sourceInfo?: {
    sourceType: MaterialSource["type"]
    sourceName: string
    floor?: number
  }
}

export interface GenerateMaterialOptions {
  type?: MaterialType
  tier?: number
  category?: MaterialCategory
  floor?: number
  quality?: MaterialQuality
  processingState?: ProcessingState
  quantity?: number
  source?: {
    type: MaterialSource["type"]
    name: string
  }
  forceRarity?: ItemRarity
}

let materialIdCounter = 0

function generateMaterialId(): string {
  return `mat_${Date.now()}_${++materialIdCounter}`
}

// Get rarity from tier
function tierToRarity(tier: number): ItemRarity {
  if (tier >= 5) return "legendary"
  if (tier >= 4) return "rare"
  if (tier >= 2) return "uncommon"
  return "common"
}

// Get materials by tier
function getMaterialsByTier(tier: number): MaterialType[] {
  const tierKey = `tier${tier}` as keyof typeof MATERIAL_TIERS
  return MATERIAL_TIERS[tierKey] || []
}

// Get materials by category
function getMaterialsByCategory(category: MaterialCategory): MaterialType[] {
  return Object.entries(MATERIAL_CATEGORIES)
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type as MaterialType)
}

// Roll a random material type
function rollMaterialType(options: {
  tier?: number
  category?: MaterialCategory
  floor?: number
}): MaterialType {
  let candidates: MaterialType[] = []

  if (options.tier) {
    candidates = getMaterialsByTier(options.tier)
  } else if (options.category) {
    candidates = getMaterialsByCategory(options.category)
  } else {
    // Roll tier based on floor
    const floor = options.floor || 1
    const tierRoll = Math.random() * 100
    let tier: number

    if (tierRoll < 50 - floor * 3) tier = 1
    else if (tierRoll < 75 - floor * 2) tier = 2
    else if (tierRoll < 90 - floor) tier = 3
    else if (tierRoll < 98) tier = 4
    else tier = 5

    candidates = getMaterialsByTier(Math.min(tier, 5))
  }

  // Filter by floor minimum if specified
  if (options.floor) {
    candidates = candidates.filter((type) => {
      const sources = MATERIAL_SOURCES[type]
      if (!sources) return true
      return sources.some((s) => !s.minFloor || s.minFloor <= options.floor!)
    })
  }

  if (candidates.length === 0) {
    candidates = getMaterialsByTier(1)
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Generate material name
function generateMaterialName(
  type: MaterialType,
  quality: MaterialQuality,
  processingState: ProcessingState
): string {
  const profile = MATERIAL_PROFILES[type]
  const qualityPrefix = quality !== "normal" ? quality.charAt(0).toUpperCase() + quality.slice(1) + " " : ""
  const statePrefix = processingState !== "raw" ? processingState.charAt(0).toUpperCase() + processingState.slice(1) + " " : ""

  // Format the base type name
  const baseName = type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return `${qualityPrefix}${statePrefix}${baseName}`
}

// Generate material description
function generateMaterialDescription(
  type: MaterialType,
  quality: MaterialQuality,
  processingState: ProcessingState
): string {
  const profile = MATERIAL_PROFILES[type]
  let desc = profile.description

  if (quality === "pristine") {
    desc = `Flawless specimen. ${desc}`
  } else if (quality === "superior") {
    desc = `Exceptional quality. ${desc}`
  } else if (quality === "fine") {
    desc = `Above average quality. ${desc}`
  } else if (quality === "crude") {
    desc = `Poor quality but usable. ${desc}`
  }

  if (processingState === "perfected") {
    desc += " Processed to absolute perfection."
  } else if (processingState === "purified") {
    desc += " Purified of all impurities."
  } else if (processingState === "refined") {
    desc += " Refined for optimal use."
  } else if (processingState === "processed") {
    desc += " Processed and ready for use."
  }

  return desc
}

// Calculate material value
function calculateMaterialValue(
  type: MaterialType,
  quality: MaterialQuality,
  processingState: ProcessingState,
  quantity: number
): number {
  const profile = MATERIAL_PROFILES[type]
  const baseValue = profile.baseValue
  const qualityMult = QUALITY_VALUE_MULTIPLIERS[quality]

  // Processing state multipliers
  const stateMult: Record<ProcessingState, number> = {
    raw: 1.0,
    processed: 1.5,
    refined: 2.5,
    purified: 4.0,
    perfected: 8.0,
  }

  return Math.floor(baseValue * qualityMult * stateMult[processingState] * quantity)
}

// Main generation function
export function generateMaterial(options: GenerateMaterialOptions = {}): MaterialItem {
  const type = options.type || rollMaterialType({
    tier: options.tier,
    category: options.category,
    floor: options.floor,
  })

  const profile = MATERIAL_PROFILES[type]
  const tier = getMaterialTier(type)

  const quality = options.quality || rollQuality(options.floor || 0)
  const processingState = options.processingState || "raw"
  const quantity = options.quantity || Math.floor(Math.random() * 3) + 1

  const rarity = options.forceRarity || tierToRarity(tier)
  const value = calculateMaterialValue(type, quality, processingState, quantity)

  const name = generateMaterialName(type, quality, processingState)
  const description = generateMaterialDescription(type, quality, processingState)

  const material: MaterialItem = {
    id: generateMaterialId(),
    name,
    entityType: "item",
    type: "misc",
    category: "material",
    subtype: type,
    materialCategory: profile.category,
    tier,
    rarity,
    quality,
    processingState,
    quantity,
    value,
    description,
    tags: profile.tags,
  }

  if (options.source) {
    material.sourceInfo = {
      sourceType: options.source.type,
      sourceName: options.source.name,
      floor: options.floor,
    }
  }

  return material
}

// =============================================================================
// LOOT TABLE GENERATION
// =============================================================================

export interface MaterialDropTable {
  materials: Array<{
    type: MaterialType
    weight: number
    quantityRange: [number, number]
    qualityBonus?: number
  }>
  totalWeight: number
}

// Generate drop table for a source
export function generateDropTableForSource(
  sourceType: MaterialSource["type"],
  sourceName: string,
  floor: number
): MaterialDropTable {
  const materials: MaterialDropTable["materials"] = []
  let totalWeight = 0

  for (const [type, sources] of Object.entries(MATERIAL_SOURCES)) {
    if (!sources) continue

    for (const source of sources) {
      if (source.type !== sourceType) continue
      if (!source.sources.includes(sourceName) && !source.sources.some((s) => sourceName.includes(s))) continue
      if (source.minFloor && floor < source.minFloor) continue
      if (source.maxFloor && floor > source.maxFloor) continue

      const weight = Math.floor(source.dropChance * 100)
      const tier = getMaterialTier(type as MaterialType)

      materials.push({
        type: type as MaterialType,
        weight,
        quantityRange: [1, Math.max(1, 4 - tier)],
        qualityBonus: Math.floor(floor / 3),
      })
      totalWeight += weight
    }
  }

  return { materials, totalWeight }
}

// Roll drops from a table
export function rollMaterialDrops(
  table: MaterialDropTable,
  rollCount: number,
  floor: number
): MaterialItem[] {
  const drops: MaterialItem[] = []

  for (let i = 0; i < rollCount; i++) {
    const roll = Math.random() * table.totalWeight
    let cumulative = 0

    for (const entry of table.materials) {
      cumulative += entry.weight
      if (roll < cumulative) {
        const quantity =
          Math.floor(Math.random() * (entry.quantityRange[1] - entry.quantityRange[0] + 1)) +
          entry.quantityRange[0]

        drops.push(
          generateMaterial({
            type: entry.type,
            floor,
            quantity,
          })
        )
        break
      }
    }
  }

  return drops
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

// Generate materials for monster defeat
export function generateMonsterMaterialDrops(
  monsterName: string,
  monsterTier: number,
  floor: number
): MaterialItem[] {
  const dropCount = Math.floor(Math.random() * monsterTier) + 1
  const table = generateDropTableForSource("monster", monsterName.toLowerCase(), floor)

  if (table.materials.length === 0) {
    // Fallback to generic drops
    return Array.from({ length: dropCount }, () =>
      generateMaterial({ floor, tier: Math.min(monsterTier, 3) })
    )
  }

  return rollMaterialDrops(table, dropCount, floor)
}

// Generate materials from harvesting
export function generateHarvestMaterials(
  locationType: string,
  floor: number
): MaterialItem[] {
  const table = generateDropTableForSource("harvest", locationType.toLowerCase(), floor)
  const harvestCount = Math.floor(Math.random() * 3) + 1

  if (table.materials.length === 0) {
    return [generateMaterial({ floor, category: "organic" })]
  }

  return rollMaterialDrops(table, harvestCount, floor)
}

// Generate materials from treasure
export function generateTreasureMaterials(
  treasureType: string,
  floor: number,
  isRare = false
): MaterialItem[] {
  const table = generateDropTableForSource("treasure", treasureType.toLowerCase(), floor)
  const dropCount = isRare ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 2) + 1

  if (table.materials.length === 0) {
    const minTier = isRare ? 2 : 1
    return Array.from({ length: dropCount }, () =>
      generateMaterial({ floor, tier: Math.min(floor, 3) + minTier - 1 })
    )
  }

  return rollMaterialDrops(table, dropCount, floor)
}

// Get processing requirements for next state
export function getProcessingRequirements(
  material: MaterialItem
): { nextState: ProcessingState; requirements: typeof PROCESSING_REQUIREMENTS[ProcessingState] } | null {
  const nextState = PROCESSING_CHAINS[material.processingState]
  if (!nextState) return null

  const profile = MATERIAL_PROFILES[material.subtype]
  if (!profile.processingPath.includes(nextState)) return null

  return {
    nextState,
    requirements: PROCESSING_REQUIREMENTS[nextState],
  }
}

// Process a material to next state
export function processMaterial(
  material: MaterialItem,
  targetState: ProcessingState
): MaterialItem {
  const profile = MATERIAL_PROFILES[material.subtype]

  if (!profile.processingPath.includes(targetState)) {
    throw new Error(`Cannot process ${material.subtype} to ${targetState}`)
  }

  const newMaterial = { ...material }
  newMaterial.processingState = targetState
  newMaterial.name = generateMaterialName(material.subtype, material.quality, targetState)
  newMaterial.description = generateMaterialDescription(material.subtype, material.quality, targetState)
  newMaterial.value = calculateMaterialValue(
    material.subtype,
    material.quality,
    targetState,
    material.quantity
  )

  return newMaterial
}

// Check if materials have specific tags
export function materialHasTags(material: MaterialItem, requiredTags: MaterialTag[]): boolean {
  return requiredTags.every((tag) => material.tags.includes(tag))
}

// Find materials matching recipe requirements
export function findMatchingMaterials(
  inventory: MaterialItem[],
  requirements: {
    tags?: MaterialTag[]
    category?: MaterialCategory
    tier?: number
    minQuality?: MaterialQuality
    processingState?: ProcessingState
  }
): MaterialItem[] {
  return inventory.filter((mat) => {
    if (requirements.tags && !materialHasTags(mat, requirements.tags)) return false
    if (requirements.category && mat.materialCategory !== requirements.category) return false
    if (requirements.tier && mat.tier < requirements.tier) return false
    if (requirements.processingState && mat.processingState !== requirements.processingState) return false

    if (requirements.minQuality) {
      const qualityOrder: MaterialQuality[] = ["crude", "normal", "fine", "superior", "pristine"]
      const minIndex = qualityOrder.indexOf(requirements.minQuality)
      const matIndex = qualityOrder.indexOf(mat.quality)
      if (matIndex < minIndex) return false
    }

    return true
  })
}
