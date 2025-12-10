/**
 * Unified Item Generator
 *
 * Comprehensive item generation with:
 * - Weapon subtypes (sword, axe, dagger, bow, staff, wand)
 * - Damage types (physical, fire, ice, lightning, shadow, holy)
 * - Smart stat scaling
 * - AI enhancement integration
 * - Ego enchantment pipeline
 */

import type { Item, ItemRarity, PlayerClass, DamageType } from "@/lib/core/game-types"
import type { WeaponType, ArmorSlot } from "./item-taxonomy"
import { applyEgos, type EgoItem } from "./ego-item-system"
import { generateId } from "@/lib/core/utils"

// =============================================================================
// WEAPON SUBTYPES
// =============================================================================

export type WeaponSubtype = "sword" | "axe" | "dagger" | "bow" | "staff" | "wand" | "mace" | "spear" | "greatsword" | "scythe"

export interface WeaponProfile {
  subtype: WeaponSubtype
  baseDamage: number
  attackSpeed: "slow" | "normal" | "fast"
  range: "melee" | "ranged" | "magic"
  critChance: number
  critDamage: number
  twoHanded: boolean
  preferredDamageTypes: DamageType[]
  classAffinity: PlayerClass[] // classes that get bonus with this weapon
  statScaling: "strength" | "dexterity" | "intelligence"
}

export const WEAPON_PROFILES: Record<WeaponSubtype, WeaponProfile> = {
  sword: {
    subtype: "sword",
    baseDamage: 6,
    attackSpeed: "normal",
    range: "melee",
    critChance: 0.1,
    critDamage: 1.5,
    twoHanded: false,
    preferredDamageTypes: ["physical", "fire", "holy"],
    classAffinity: ["warrior", "paladin"],
    statScaling: "strength",
  },
  axe: {
    subtype: "axe",
    baseDamage: 8,
    attackSpeed: "slow",
    range: "melee",
    critChance: 0.15,
    critDamage: 2.0,
    twoHanded: false,
    preferredDamageTypes: ["physical", "fire"],
    classAffinity: ["warrior", "barbarian"],
    statScaling: "strength",
  },
  dagger: {
    subtype: "dagger",
    baseDamage: 4,
    attackSpeed: "fast",
    range: "melee",
    critChance: 0.25,
    critDamage: 2.5,
    twoHanded: false,
    preferredDamageTypes: ["physical", "poison", "shadow"],
    classAffinity: ["rogue", "monk"],
    statScaling: "dexterity",
  },
  bow: {
    subtype: "bow",
    baseDamage: 5,
    attackSpeed: "normal",
    range: "ranged",
    critChance: 0.15,
    critDamage: 1.75,
    twoHanded: true,
    preferredDamageTypes: ["physical", "poison", "ice"],
    classAffinity: ["ranger", "rogue"],
    statScaling: "dexterity",
  },
  staff: {
    subtype: "staff",
    baseDamage: 4,
    attackSpeed: "slow",
    range: "magic",
    critChance: 0.1,
    critDamage: 1.5,
    twoHanded: true,
    preferredDamageTypes: ["arcane", "fire", "ice", "lightning"],
    classAffinity: ["mage", "warlock", "necromancer"],
    statScaling: "intelligence",
  },
  wand: {
    subtype: "wand",
    baseDamage: 3,
    attackSpeed: "fast",
    range: "magic",
    critChance: 0.12,
    critDamage: 1.75,
    twoHanded: false,
    preferredDamageTypes: ["arcane", "shadow", "holy"],
    classAffinity: ["mage", "cleric", "warlock"],
    statScaling: "intelligence",
  },
  mace: {
    subtype: "mace",
    baseDamage: 7,
    attackSpeed: "slow",
    range: "melee",
    critChance: 0.08,
    critDamage: 1.5,
    twoHanded: false,
    preferredDamageTypes: ["physical", "holy", "lightning"],
    classAffinity: ["cleric", "paladin"],
    statScaling: "strength",
  },
  spear: {
    subtype: "spear",
    baseDamage: 5,
    attackSpeed: "normal",
    range: "melee",
    critChance: 0.12,
    critDamage: 1.75,
    twoHanded: true,
    preferredDamageTypes: ["physical", "lightning"],
    classAffinity: ["warrior", "monk"],
    statScaling: "dexterity",
  },
  greatsword: {
    subtype: "greatsword",
    baseDamage: 12,
    attackSpeed: "slow",
    range: "melee",
    critChance: 0.1,
    critDamage: 2.0,
    twoHanded: true,
    preferredDamageTypes: ["physical", "fire", "shadow"],
    classAffinity: ["warrior", "barbarian", "paladin"],
    statScaling: "strength",
  },
  scythe: {
    subtype: "scythe",
    baseDamage: 9,
    attackSpeed: "slow",
    range: "melee",
    critChance: 0.2,
    critDamage: 2.25,
    twoHanded: true,
    preferredDamageTypes: ["shadow", "physical", "poison"],
    classAffinity: ["necromancer", "warlock"],
    statScaling: "intelligence",
  },
}

// =============================================================================
// ARMOR SUBTYPES
// =============================================================================

export type ArmorSubtype = "helmet" | "chest" | "leggings" | "gloves" | "boots" | "shield" | "cloak" | "belt"

export interface ArmorProfile {
  subtype: ArmorSubtype
  slot: ArmorSlot
  baseDefense: number
  weight: "cloth" | "leather" | "mail" | "plate"
  movementPenalty: number
  magicPenalty: number
  bonusStats?: Partial<Record<"health" | "dodge" | "resistance", number>>
  classAffinity: PlayerClass[]
}

export const ARMOR_PROFILES: Record<ArmorSubtype, ArmorProfile> = {
  helmet: {
    subtype: "helmet",
    slot: "head",
    baseDefense: 3,
    weight: "mail",
    movementPenalty: 0,
    magicPenalty: 0,
    classAffinity: ["warrior", "paladin", "cleric"],
  },
  chest: {
    subtype: "chest",
    slot: "chest",
    baseDefense: 6,
    weight: "plate",
    movementPenalty: 1,
    magicPenalty: 1,
    bonusStats: { health: 10 },
    classAffinity: ["warrior", "paladin", "barbarian"],
  },
  gloves: {
    subtype: "gloves",
    slot: "hands",
    baseDefense: 2,
    weight: "leather",
    movementPenalty: 0,
    magicPenalty: 0,
    classAffinity: ["rogue", "ranger", "monk"],
  },
  boots: {
    subtype: "boots",
    slot: "feet",
    baseDefense: 2,
    weight: "leather",
    movementPenalty: 0,
    magicPenalty: 0,
    bonusStats: { dodge: 0.02 },
    classAffinity: ["rogue", "ranger", "monk"],
  },
  shield: {
    subtype: "shield",
    slot: "shield",
    baseDefense: 5,
    weight: "plate",
    movementPenalty: 0,
    magicPenalty: 2,
    classAffinity: ["warrior", "paladin", "cleric"],
  },
  cloak: {
    subtype: "cloak",
    slot: "cloak",
    baseDefense: 1,
    weight: "cloth",
    movementPenalty: 0,
    magicPenalty: 0,
    bonusStats: { dodge: 0.03, resistance: 5 },
    classAffinity: ["mage", "warlock", "necromancer", "rogue"],
  },
  leggings: {
    subtype: "leggings",
    slot: "legs",
    baseDefense: 4,
    weight: "mail",
    movementPenalty: 0,
    magicPenalty: 0,
    classAffinity: ["warrior", "paladin", "ranger", "barbarian"],
  },
  belt: {
    subtype: "belt",
    slot: "belt",
    baseDefense: 1,
    weight: "leather",
    movementPenalty: 0,
    magicPenalty: 0,
    bonusStats: { health: 5 },
    classAffinity: ["warrior", "barbarian", "monk", "ranger"],
  },
}

// =============================================================================
// DAMAGE TYPE SYSTEM
// =============================================================================

export interface DamageTypeInfo {
  type: DamageType
  color: string
  icon: string
  description: string
  strongVs: string[]
  weakVs: string[]
}

export const DAMAGE_TYPES: Record<DamageType, DamageTypeInfo> = {
  physical: {
    type: "physical",
    color: "#9CA3AF",
    icon: "⚔️",
    description: "Raw physical force",
    strongVs: ["beast", "humanoid"],
    weakVs: ["golem", "spirit"],
  },
  fire: {
    type: "fire",
    color: "#EF4444",
    icon: "🔥",
    description: "Burning flames",
    strongVs: ["undead", "beast", "plant"],
    weakVs: ["demon", "dragon"],
  },
  ice: {
    type: "ice",
    color: "#3B82F6",
    icon: "❄️",
    description: "Freezing cold",
    strongVs: ["demon", "dragon", "beast"],
    weakVs: ["undead", "elemental"],
  },
  lightning: {
    type: "lightning",
    color: "#FBBF24",
    icon: "⚡",
    description: "Electric shock",
    strongVs: ["golem", "construct", "aquatic"],
    weakVs: ["elemental"],
  },
  shadow: {
    type: "shadow",
    color: "#6B21A8",
    icon: "🌑",
    description: "Dark energy",
    strongVs: ["humanoid", "holy"],
    weakVs: ["undead", "demon"],
  },
  holy: {
    type: "holy",
    color: "#FCD34D",
    icon: "✨",
    description: "Divine light",
    strongVs: ["undead", "demon", "shadow"],
    weakVs: ["holy", "construct"],
  },
  poison: {
    type: "poison",
    color: "#22C55E",
    icon: "☠️",
    description: "Toxic venom",
    strongVs: ["humanoid", "beast"],
    weakVs: ["undead", "construct", "elemental"],
  },
  arcane: {
    type: "arcane",
    color: "#A855F7",
    icon: "🔮",
    description: "Pure magic",
    strongVs: ["construct", "elemental"],
    weakVs: ["magic_resistant"],
  },
}

// =============================================================================
// NAME GENERATION POOLS
// =============================================================================

interface NamePool {
  prefixes: string[]
  bases: string[]
  suffixes: string[]
}

const WEAPON_NAMES: Record<WeaponSubtype, Record<ItemRarity, NamePool>> = {
  sword: {
    common: {
      prefixes: ["Rusty", "Worn", "Chipped", "Dull"],
      bases: ["Blade", "Sword", "Cutlass", "Saber"],
      suffixes: ["", "", "of the Guard", "of Iron"],
    },
    uncommon: {
      prefixes: ["Steel", "Keen", "Sharp", "Tempered"],
      bases: ["Longsword", "Broadsword", "Falchion", "Rapier"],
      suffixes: ["of Valor", "of the Knight", "of Precision", ""],
    },
    rare: {
      prefixes: ["Enchanted", "Gleaming", "Blessed", "Runed"],
      bases: ["Claymore", "Scimitar", "Bastard Sword", "Flamberge"],
      suffixes: ["of Flames", "of Frost", "of Thunder", "of Shadows"],
    },
    legendary: {
      prefixes: ["Void-Touched", "Soul-Forged", "Dragon-Slaying", "Divine"],
      bases: ["Excalibur", "Durandal", "Gram", "Nothung"],
      suffixes: ["the Destroyer", "the Redeemer", "of Infinite Edge", "of the Abyss"],
    },
  },
  axe: {
    common: {
      prefixes: ["Crude", "Worn", "Notched", "Heavy"],
      bases: ["Hatchet", "Axe", "Cleaver", "Chopper"],
      suffixes: ["", "", "of the Woodsman", ""],
    },
    uncommon: {
      prefixes: ["Iron", "Battle", "War", "Brutal"],
      bases: ["Battleaxe", "Broadaxe", "Waraxe", "Tomahawk"],
      suffixes: ["of Rending", "of Cleaving", "of Might", ""],
    },
    rare: {
      prefixes: ["Berserker's", "Executioner's", "Bloodied", "Savage"],
      bases: ["Greataxe", "Double-Axe", "Labrys", "Francisca"],
      suffixes: ["of Carnage", "of the Berserker", "of Bloodletting", ""],
    },
    legendary: {
      prefixes: ["Godslayer", "Titan's", "Cataclysmic", "Ragnarok"],
      bases: ["Skullsplitter", "Worldender", "Doomcleaver", "Jarnbjorn"],
      suffixes: ["the Unstoppable", "of Endless Fury", "of the End Times", ""],
    },
  },
  dagger: {
    common: {
      prefixes: ["Small", "Rusty", "Thin", "Plain"],
      bases: ["Knife", "Dagger", "Shiv", "Dirk"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Sharp", "Keen", "Swift", "Balanced"],
      bases: ["Stiletto", "Kris", "Tanto", "Poignard"],
      suffixes: ["of Quickness", "of the Assassin", "of Precision", ""],
    },
    rare: {
      prefixes: ["Venomous", "Shadow", "Silent", "Cursed"],
      bases: ["Misericorde", "Kukri", "Jambia", "Cinquedea"],
      suffixes: ["of Betrayal", "of the Night", "of Venom", "of Shadows"],
    },
    legendary: {
      prefixes: ["Void", "Soul-Drinking", "Phantom", "Death's"],
      bases: ["Heartseeker", "Soulblade", "Nightfang", "Shadowstrike"],
      suffixes: ["the Silent End", "of Absolute Death", "of the Void", ""],
    },
  },
  bow: {
    common: {
      prefixes: ["Worn", "Simple", "Crude", "Bent"],
      bases: ["Shortbow", "Bow", "Hunting Bow", "Recurve"],
      suffixes: ["", "", "of the Hunter", ""],
    },
    uncommon: {
      prefixes: ["Sturdy", "Long", "Swift", "Accurate"],
      bases: ["Longbow", "Composite Bow", "Warbow", "Horsebow"],
      suffixes: ["of Accuracy", "of the Ranger", "of True Flight", ""],
    },
    rare: {
      prefixes: ["Elven", "Enchanted", "Windswept", "Legendary"],
      bases: ["Greatbow", "Dragonbow", "Skybow", "Stormbow"],
      suffixes: ["of the Wind", "of Piercing", "of the Eagle", "of Thunder"],
    },
    legendary: {
      prefixes: ["Celestial", "Void-Touched", "Godforged", "Mythic"],
      bases: ["Sunburst", "Moonshadow", "Starfall", "Infinity"],
      suffixes: ["the Unerring", "of Endless Arrows", "of the Cosmos", ""],
    },
  },
  staff: {
    common: {
      prefixes: ["Wooden", "Plain", "Worn", "Gnarled"],
      bases: ["Staff", "Rod", "Walking Stick", "Cane"],
      suffixes: ["", "", "of the Apprentice", ""],
    },
    uncommon: {
      prefixes: ["Arcane", "Enchanted", "Runed", "Mystic"],
      bases: ["Quarterstaff", "Mage's Staff", "Focus", "Scepter"],
      suffixes: ["of Focus", "of Power", "of the Mage", "of Channeling"],
    },
    rare: {
      prefixes: ["Elemental", "Void", "Astral", "Ethereal"],
      bases: ["Arcane Staff", "Spellstaff", "Conduit", "Catalyst"],
      suffixes: ["of Storms", "of Fire", "of Ice", "of the Arcane"],
    },
    legendary: {
      prefixes: ["Lich's", "Archmage's", "Cosmic", "Reality-Bending"],
      bases: ["Staff of Power", "World Tree Branch", "Astral Conduit", "Infinity Staff"],
      suffixes: ["the All-Knowing", "of Infinite Magic", "of Reality", "of the Void"],
    },
  },
  wand: {
    common: {
      prefixes: ["Simple", "Small", "Plain", "Basic"],
      bases: ["Wand", "Twig", "Stick", "Pointer"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Carved", "Polished", "Enchanted", "Glowing"],
      bases: ["Magic Wand", "Focus Wand", "Channeler", "Conduit"],
      suffixes: ["of Sparks", "of Light", "of Focus", ""],
    },
    rare: {
      prefixes: ["Crystalline", "Shadow", "Flame", "Frost"],
      bases: ["Spellwand", "Arcane Focus", "Essence Wand", "Power Wand"],
      suffixes: ["of Elements", "of Power", "of the Arcane", "of Destruction"],
    },
    legendary: {
      prefixes: ["Elder", "Void", "Primordial", "Divine"],
      bases: ["Deathstick", "Worldweaver", "Reality Wand", "Cosmic Focus"],
      suffixes: ["the Unbeatable", "of Ultimate Power", "of Creation", ""],
    },
  },
  mace: {
    common: {
      prefixes: ["Worn", "Heavy", "Crude", "Dented"],
      bases: ["Club", "Mace", "Cudgel", "Hammer"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Iron", "Blessed", "War", "Spiked"],
      bases: ["Morningstar", "Flail", "Warhammer", "Maul"],
      suffixes: ["of Smiting", "of the Cleric", "of Justice", ""],
    },
    rare: {
      prefixes: ["Holy", "Thundering", "Blessed", "Divine"],
      bases: ["Holy Mace", "Righteous Hammer", "Judgement", "Vindicator"],
      suffixes: ["of the Faithful", "of Divine Wrath", "of Light", "of Thunder"],
    },
    legendary: {
      prefixes: ["Seraphic", "Godforged", "Celestial", "Archangel's"],
      bases: ["Mjolnir", "Lightbringer", "Heaven's Fury", "Divine Retribution"],
      suffixes: ["the Holy", "of the Gods", "of Absolute Justice", ""],
    },
  },
  spear: {
    common: {
      prefixes: ["Wooden", "Simple", "Crude", "Short"],
      bases: ["Spear", "Javelin", "Pike", "Lance"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Iron", "Long", "Barbed", "Balanced"],
      bases: ["Halberd", "Glaive", "Partisan", "Trident"],
      suffixes: ["of Reach", "of Piercing", "of the Guard", ""],
    },
    rare: {
      prefixes: ["Dragon", "Storm", "Wind", "Lightning"],
      bases: ["Dragonlance", "Thunderspear", "Windpiercer", "Tempest"],
      suffixes: ["of the Heavens", "of Storms", "of the Dragon", "of Thunder"],
    },
    legendary: {
      prefixes: ["Godslaying", "Celestial", "Void", "Primordial"],
      bases: ["Gungnir", "Gae Bolg", "Longinus", "Rhongomyniad"],
      suffixes: ["the Unstoppable", "of Certain Death", "of the Gods", ""],
    },
  },
  greatsword: {
    common: {
      prefixes: ["Heavy", "Crude", "Worn", "Dull"],
      bases: ["Greatsword", "Two-Hander", "Claymore", "Zweihander"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Steel", "Massive", "War", "Battle"],
      bases: ["Flamberge", "Executioner's Blade", "Giant Sword", "Buster Sword"],
      suffixes: ["of Cleaving", "of Might", "of the Champion", ""],
    },
    rare: {
      prefixes: ["Dragon", "Demon", "Abyssal", "Infernal"],
      bases: ["Dragonslayer", "Demon Blade", "Chaos Blade", "Reaper"],
      suffixes: ["of Destruction", "of the Abyss", "of Chaos", "of Annihilation"],
    },
    legendary: {
      prefixes: ["Cosmic", "Void", "World-Ending", "God-Slaying"],
      bases: ["Balmung", "Arondight", "Caladbolg", "Ragnarok"],
      suffixes: ["the World Ender", "of the Apocalypse", "of Final Death", ""],
    },
  },
  scythe: {
    common: {
      prefixes: ["Rusty", "Worn", "Farmer's", "Old"],
      bases: ["Scythe", "Sickle", "Reaper", "Harvester"],
      suffixes: ["", "", "", ""],
    },
    uncommon: {
      prefixes: ["Dark", "Curved", "Sharp", "Death's"],
      bases: ["War Scythe", "Battle Reaper", "Crescent Blade", "Soul Sickle"],
      suffixes: ["of Reaping", "of the Grave", "of Harvest", ""],
    },
    rare: {
      prefixes: ["Spectral", "Cursed", "Shadow", "Blood"],
      bases: ["Death's Scythe", "Soul Reaper", "Ghostblade", "Bloodmoon"],
      suffixes: ["of Souls", "of the Damned", "of Eternal Night", "of Blood"],
    },
    legendary: {
      prefixes: ["Death's", "Void", "Abyssal", "Primordial"],
      bases: ["Harvest Moon", "Soul Eater", "Thanatos", "Grim Reaper"],
      suffixes: ["the Inevitable", "of Absolute End", "of the Void", ""],
    },
  },
}

const ARMOR_NAMES: Record<ArmorSubtype, Record<ItemRarity, NamePool>> = {
  helmet: {
    common: { prefixes: ["Worn", "Dented", "Simple"], bases: ["Helm", "Cap", "Hood"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Iron", "Steel", "Reinforced"], bases: ["Helmet", "Greathelm", "Visor"], suffixes: ["of Protection", "", ""] },
    rare: { prefixes: ["Enchanted", "Runed", "Blessed"], bases: ["Crown", "Circlet", "War Crown"], suffixes: ["of Wisdom", "of Insight", ""] },
    legendary: { prefixes: ["Divine", "Void", "Ancient"], bases: ["Crown of Ages", "Helm of Lords", "Godhelm"], suffixes: ["of Omniscience", "", ""] },
  },
  chest: {
    common: { prefixes: ["Worn", "Patched", "Simple"], bases: ["Vest", "Jerkin", "Tunic"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Iron", "Chain", "Scale"], bases: ["Chainmail", "Breastplate", "Cuirass"], suffixes: ["of Defense", "", ""] },
    rare: { prefixes: ["Mithril", "Dragon", "Blessed"], bases: ["Plate Armor", "Dragon Scale", "Holy Vestment"], suffixes: ["of the Guardian", "of Protection", ""] },
    legendary: { prefixes: ["Divine", "Void", "Eternal"], bases: ["Aegis", "Eternity", "Godplate"], suffixes: ["of Invincibility", "of the Immortal", ""] },
  },
  gloves: {
    common: { prefixes: ["Worn", "Simple", "Thin"], bases: ["Gloves", "Mitts", "Wraps"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Leather", "Steel", "Reinforced"], bases: ["Gauntlets", "Bracers", "Handguards"], suffixes: ["of Grip", "", ""] },
    rare: { prefixes: ["Enchanted", "Shadow", "Swift"], bases: ["War Gauntlets", "Shadow Gloves", "Swift Hands"], suffixes: ["of Dexterity", "of Speed", ""] },
    legendary: { prefixes: ["Divine", "Void", "Titan's"], bases: ["Godgrip", "Infinity Gauntlets", "Titan's Grasp"], suffixes: ["of Ultimate Power", "", ""] },
  },
  boots: {
    common: { prefixes: ["Worn", "Simple", "Old"], bases: ["Boots", "Shoes", "Sandals"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Leather", "Swift", "Sturdy"], bases: ["Greaves", "War Boots", "Treads"], suffixes: ["of Speed", "", ""] },
    rare: { prefixes: ["Enchanted", "Wind", "Shadow"], bases: ["Windwalkers", "Shadowstep", "Stormstriders"], suffixes: ["of Haste", "of the Wind", ""] },
    legendary: { prefixes: ["Divine", "Void", "Hermes'"], bases: ["Godstriders", "Voidwalkers", "Wings of Mercury"], suffixes: ["of Infinite Speed", "", ""] },
  },
  shield: {
    common: { prefixes: ["Worn", "Dented", "Wooden"], bases: ["Buckler", "Shield", "Targe"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Iron", "Steel", "Reinforced"], bases: ["Kite Shield", "Tower Shield", "Heater"], suffixes: ["of Blocking", "", ""] },
    rare: { prefixes: ["Enchanted", "Holy", "Dragon"], bases: ["Aegis", "Bulwark", "Rampart"], suffixes: ["of the Guardian", "of Reflection", ""] },
    legendary: { prefixes: ["Divine", "Void", "Eternal"], bases: ["Aegis of the Gods", "Eternity's Bulwark", "Invincible"], suffixes: ["of Absolute Defense", "", ""] },
  },
  cloak: {
    common: { prefixes: ["Worn", "Tattered", "Simple"], bases: ["Cloak", "Cape", "Mantle"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Enchanted", "Traveler's", "Hooded"], bases: ["Shroud", "Vestment", "Robe"], suffixes: ["of Shadows", "", ""] },
    rare: { prefixes: ["Shadow", "Ethereal", "Arcane"], bases: ["Shadowcloak", "Veil", "Mantle of Power"], suffixes: ["of Invisibility", "of Protection", ""] },
    legendary: { prefixes: ["Divine", "Void", "Death's"], bases: ["Cloak of Invisibility", "Void Shroud", "Mantle of the Gods"], suffixes: ["of Absolute Shadow", "", ""] },
  },
  leggings: {
    common: { prefixes: ["Worn", "Patched", "Simple"], bases: ["Pants", "Leggings", "Breeches"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Chain", "Scale", "Reinforced"], bases: ["Legguards", "Greaves", "Cuisses"], suffixes: ["of Protection", "", ""] },
    rare: { prefixes: ["Enchanted", "Mithril", "Dragon"], bases: ["War Leggings", "Plate Greaves", "Dragon Cuisses"], suffixes: ["of Stability", "of Power", ""] },
    legendary: { prefixes: ["Divine", "Void", "Titan's"], bases: ["Godlegs", "Eternity Greaves", "Legs of the Colossus"], suffixes: ["of Infinite Strength", "", ""] },
  },
  belt: {
    common: { prefixes: ["Worn", "Simple", "Old"], bases: ["Belt", "Sash", "Strap"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Leather", "Studded", "Reinforced"], bases: ["Girdle", "Waistguard", "Cincture"], suffixes: ["of Vitality", "", ""] },
    rare: { prefixes: ["Enchanted", "Dragon", "Blessed"], bases: ["War Belt", "Dragon Girdle", "Holy Cincture"], suffixes: ["of Endurance", "of Strength", ""] },
    legendary: { prefixes: ["Divine", "Void", "Titan's"], bases: ["Godbelt", "Eternity Girdle", "Belt of the Titans"], suffixes: ["of Infinite Vitality", "", ""] },
  },
}

// =============================================================================
// STAT SCALING
// =============================================================================

const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  uncommon: 1.4,
  rare: 2.0,
  legendary: 3.5,
}

const FLOOR_SCALING = 0.08 // 8% per floor

// =============================================================================
// NAME GENERATION
// =============================================================================

function generateWeaponName(subtype: WeaponSubtype, rarity: ItemRarity, damageType?: DamageType): string {
  const pool = WEAPON_NAMES[subtype][rarity]
  const prefix = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)]
  const base = pool.bases[Math.floor(Math.random() * pool.bases.length)]
  const suffix = pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)]

  // Sometimes incorporate damage type into name for rare+
  if (damageType && damageType !== "physical" && rarity !== "common" && Math.random() < 0.3) {
    const typeNames: Record<DamageType, string[]> = {
      fire: ["Flame", "Inferno", "Blazing"],
      ice: ["Frost", "Frozen", "Glacial"],
      lightning: ["Thunder", "Storm", "Voltaic"],
      shadow: ["Shadow", "Dark", "Void"],
      holy: ["Holy", "Divine", "Radiant"],
      poison: ["Venom", "Toxic", "Plague"],
      arcane: ["Arcane", "Mystic", "Ethereal"],
      physical: [],
    }
    const typeName = typeNames[damageType][Math.floor(Math.random() * typeNames[damageType].length)]
    if (typeName) {
      return `${typeName} ${base}${suffix ? " " + suffix : ""}`
    }
  }

  return `${prefix} ${base}${suffix ? " " + suffix : ""}`.trim()
}

function generateArmorName(subtype: ArmorSubtype, rarity: ItemRarity): string {
  const pool = ARMOR_NAMES[subtype][rarity]
  const prefix = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)]
  const base = pool.bases[Math.floor(Math.random() * pool.bases.length)]
  const suffix = pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)]

  return `${prefix} ${base}${suffix ? " " + suffix : ""}`.trim()
}

// =============================================================================
// ITEM GENERATION
// =============================================================================

export function rollRarity(floorBonus = 0): ItemRarity {
  const roll = Math.random()
  const legendaryChance = 0.03 + floorBonus * 0.005
  const rareChance = 0.12 + floorBonus * 0.01
  const uncommonChance = 0.25 + floorBonus * 0.015

  if (roll < legendaryChance) return "legendary"
  if (roll < legendaryChance + rareChance) return "rare"
  if (roll < legendaryChance + rareChance + uncommonChance) return "uncommon"
  return "common"
}

function rollDamageType(profile: WeaponProfile, rarity: ItemRarity): DamageType {
  // Common weapons are always physical
  if (rarity === "common") return "physical"

  // Higher rarity = higher chance of elemental
  const elementalChance = rarity === "uncommon" ? 0.2 : rarity === "rare" ? 0.5 : 0.8

  if (Math.random() < elementalChance) {
    const preferred = profile.preferredDamageTypes.filter(t => t !== "physical")
    if (preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)]
    }
  }

  return "physical"
}

function rollWeaponSubtype(): WeaponSubtype {
  const subtypes = Object.keys(WEAPON_PROFILES) as WeaponSubtype[]
  // Weight common weapons higher
  const weights: Record<WeaponSubtype, number> = {
    sword: 20, axe: 15, dagger: 15, bow: 12, staff: 10,
    wand: 8, mace: 10, spear: 10, greatsword: 5, scythe: 3,
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * totalWeight

  for (const subtype of subtypes) {
    roll -= weights[subtype]
    if (roll <= 0) return subtype
  }

  return "sword"
}

function rollArmorSubtype(): ArmorSubtype {
  const subtypes = Object.keys(ARMOR_PROFILES) as ArmorSubtype[]
  const weights: Record<ArmorSubtype, number> = {
    chest: 20, helmet: 16, leggings: 16, boots: 14, gloves: 12, shield: 10, cloak: 8, belt: 4,
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * totalWeight

  for (const subtype of subtypes) {
    roll -= weights[subtype]
    if (roll <= 0) return subtype
  }

  return "chest"
}

export interface GenerateWeaponOptions {
  rarity?: ItemRarity
  subtype?: WeaponSubtype
  damageType?: DamageType
  floor?: number
  forClass?: PlayerClass
  guaranteeEgo?: boolean
}

export function generateWeapon(options: GenerateWeaponOptions = {}): Item | EgoItem {
  const floor = options.floor ?? 1
  const rarity = options.rarity ?? rollRarity(floor - 1)

  // If generating for a specific class, prefer their weapon types
  let subtype = options.subtype
  if (!subtype && options.forClass) {
    const classWeapons = (Object.entries(WEAPON_PROFILES) as [WeaponSubtype, WeaponProfile][])
      .filter(([, profile]) => profile.classAffinity.includes(options.forClass!))
      .map(([type]) => type)
    if (classWeapons.length > 0) {
      subtype = classWeapons[Math.floor(Math.random() * classWeapons.length)]
    }
  }
  subtype = subtype ?? rollWeaponSubtype()

  const profile = WEAPON_PROFILES[subtype]
  const damageType = options.damageType ?? rollDamageType(profile, rarity)

  // Calculate stats
  const rarityMult = RARITY_MULTIPLIERS[rarity]
  const floorMult = 1 + (floor - 1) * FLOOR_SCALING
  const baseDamage = Math.floor(profile.baseDamage * rarityMult * floorMult)
  const variance = Math.floor(Math.random() * 3) - 1

  const weapon: Item = {
    id: generateId(),
    name: generateWeaponName(subtype, rarity, damageType),
    entityType: "weapon",
    type: "weapon",
    rarity,
    category: "weapon",
    subtype: subtype as WeaponType,
    damageType,
    description: generateWeaponDescription(subtype, rarity, damageType),
    stats: {
      attack: baseDamage + variance,
    },
    weaponProps: {
      twoHanded: profile.twoHanded,
      range: profile.range,
      attackSpeed: profile.attackSpeed,
      critChance: profile.critChance,
      critDamage: profile.critDamage,
    },
    value: calculateValue(rarity, "weapon", floor),
  }

  // Apply ego enchantments for rare+
  if (rarity === "rare" || rarity === "legendary" || options.guaranteeEgo) {
    return applyEgos(weapon)
  }

  // Small chance for uncommon to get egos
  if (rarity === "uncommon" && Math.random() < 0.3) {
    return applyEgos(weapon)
  }

  return weapon
}

export interface GenerateArmorOptions {
  rarity?: ItemRarity
  subtype?: ArmorSubtype
  floor?: number
  forClass?: PlayerClass
  guaranteeEgo?: boolean
}

export function generateArmor(options: GenerateArmorOptions = {}): Item | EgoItem {
  const floor = options.floor ?? 1
  const rarity = options.rarity ?? rollRarity(floor - 1)

  // If generating for a specific class, prefer their armor types
  let subtype = options.subtype
  if (!subtype && options.forClass) {
    const classArmor = (Object.entries(ARMOR_PROFILES) as [ArmorSubtype, ArmorProfile][])
      .filter(([, profile]) => profile.classAffinity.includes(options.forClass!))
      .map(([type]) => type)
    if (classArmor.length > 0) {
      subtype = classArmor[Math.floor(Math.random() * classArmor.length)]
    }
  }
  subtype = subtype ?? rollArmorSubtype()

  const profile = ARMOR_PROFILES[subtype]

  // Calculate stats
  const rarityMult = RARITY_MULTIPLIERS[rarity]
  const floorMult = 1 + (floor - 1) * FLOOR_SCALING
  const baseDefense = Math.floor(profile.baseDefense * rarityMult * floorMult)
  const variance = Math.floor(Math.random() * 2)

  const armor: Item = {
    id: generateId(),
    name: generateArmorName(subtype, rarity),
    entityType: "armor",
    type: "armor",
    rarity,
    category: "armor",
    subtype: profile.slot as ArmorSlot,
    description: generateArmorDescription(subtype, rarity),
    stats: {
      defense: baseDefense + variance,
      health: profile.bonusStats?.health ? Math.floor(profile.bonusStats.health * rarityMult) : undefined,
    },
    armorProps: {
      slot: profile.slot,
      weight: profile.weight,
      movementPenalty: profile.movementPenalty,
      magicPenalty: profile.magicPenalty,
    },
    value: calculateValue(rarity, "armor", floor),
  }

  // Apply ego enchantments for rare+
  if (rarity === "rare" || rarity === "legendary" || options.guaranteeEgo) {
    return applyEgos(armor)
  }

  if (rarity === "uncommon" && Math.random() < 0.3) {
    return applyEgos(armor)
  }

  return armor
}

function generateWeaponDescription(subtype: WeaponSubtype, rarity: ItemRarity, damageType: DamageType): string {
  const profile = WEAPON_PROFILES[subtype]
  const typeDesc = damageType !== "physical" ? ` imbued with ${damageType} energy` : ""
  const rarityDesc = rarity === "legendary" ? "A legendary" : rarity === "rare" ? "A rare" : rarity === "uncommon" ? "A well-crafted" : "A"
  const speedDesc = profile.attackSpeed === "fast" ? "quick" : profile.attackSpeed === "slow" ? "heavy" : "balanced"

  return `${rarityDesc} ${speedDesc} ${subtype}${typeDesc}.`
}

function generateArmorDescription(subtype: ArmorSubtype, rarity: ItemRarity): string {
  const profile = ARMOR_PROFILES[subtype]
  const rarityDesc = rarity === "legendary" ? "Legendary" : rarity === "rare" ? "Rare" : rarity === "uncommon" ? "Quality" : "Standard"
  const weightDesc = profile.weight === "plate" ? "heavy" : profile.weight === "cloth" ? "light" : ""

  return `${rarityDesc} ${weightDesc} ${subtype} offering solid protection.`.replace(/\s+/g, " ")
}

function calculateValue(rarity: ItemRarity, type: "weapon" | "armor", floor: number): number {
  const baseValues: Record<ItemRarity, number> = {
    common: 15,
    uncommon: 50,
    rare: 150,
    legendary: 500,
  }

  const typeMultiplier = type === "weapon" ? 1.0 : 1.2
  const floorMultiplier = 1 + (floor - 1) * 0.1

  return Math.floor(baseValues[rarity] * typeMultiplier * floorMultiplier)
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function getWeaponProfile(subtype: WeaponSubtype): WeaponProfile {
  return WEAPON_PROFILES[subtype]
}

export function getArmorProfile(subtype: ArmorSubtype): ArmorProfile {
  return ARMOR_PROFILES[subtype]
}

export function getDamageTypeInfo(type: DamageType): DamageTypeInfo {
  return DAMAGE_TYPES[type]
}

export function isWeaponSubtype(subtype: string): subtype is WeaponSubtype {
  return subtype in WEAPON_PROFILES
}

export function isArmorSubtype(subtype: string): subtype is ArmorSubtype {
  return subtype in ARMOR_PROFILES
}

// =============================================================================
// TRINKET GENERATION
// =============================================================================

export type TrinketSubtype = "ring" | "amulet"

interface TrinketProfile {
  subtype: TrinketSubtype
  baseStats: {
    attack?: number
    defense?: number
    health?: number
    critChance?: number
    dodgeChance?: number
  }
}

const TRINKET_PROFILES: Record<TrinketSubtype, TrinketProfile> = {
  ring: {
    subtype: "ring",
    baseStats: { attack: 2, critChance: 0.02 },
  },
  amulet: {
    subtype: "amulet",
    baseStats: { defense: 1, health: 5 },
  },
}

const TRINKET_NAMES: Record<TrinketSubtype, Record<ItemRarity, NamePool>> = {
  ring: {
    common: { prefixes: ["Simple", "Plain", "Copper"], bases: ["Ring", "Band", "Loop"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Silver", "Enchanted", "Gemmed"], bases: ["Ring", "Signet", "Band"], suffixes: ["of Power", "", ""] },
    rare: { prefixes: ["Golden", "Runed", "Arcane"], bases: ["Ring of Power", "Seal", "Circle"], suffixes: ["of Might", "of the Magi", ""] },
    legendary: { prefixes: ["Divine", "Void", "Eternal"], bases: ["Ring of Eternity", "Band of the Gods", "Seal of Power"], suffixes: ["of Omnipotence", "", ""] },
  },
  amulet: {
    common: { prefixes: ["Simple", "Plain", "Wooden"], bases: ["Amulet", "Pendant", "Necklace"], suffixes: ["", "", ""] },
    uncommon: { prefixes: ["Silver", "Enchanted", "Blessed"], bases: ["Talisman", "Charm", "Medallion"], suffixes: ["of Protection", "", ""] },
    rare: { prefixes: ["Golden", "Runed", "Holy"], bases: ["Amulet of Power", "Sacred Pendant", "Mystic Talisman"], suffixes: ["of the Guardian", "of Life", ""] },
    legendary: { prefixes: ["Divine", "Void", "Eternal"], bases: ["Heart of the Gods", "Amulet of Eternity", "Divine Pendant"], suffixes: ["of Immortality", "", ""] },
  },
}

function generateTrinketName(subtype: TrinketSubtype, rarity: ItemRarity): string {
  const pool = TRINKET_NAMES[subtype][rarity]
  const prefix = pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)]
  const base = pool.bases[Math.floor(Math.random() * pool.bases.length)]
  const suffix = pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)]
  return `${prefix} ${base}${suffix ? " " + suffix : ""}`.trim()
}

export interface GenerateTrinketOptions {
  rarity?: ItemRarity
  subtype?: TrinketSubtype
  floor?: number
}

export function generateTrinket(options: GenerateTrinketOptions = {}): Item {
  const rarity = options.rarity ?? rollRarity(options.floor ?? 0)
  const subtype = options.subtype ?? (Math.random() < 0.6 ? "ring" : "amulet")
  const profile = TRINKET_PROFILES[subtype]
  const rarityMult = RARITY_MULTIPLIERS[rarity]
  const floorMult = 1 + (options.floor ?? 0) * FLOOR_SCALING

  const stats: Item["stats"] = {}
  if (profile.baseStats.attack) stats.attack = Math.floor(profile.baseStats.attack * rarityMult * floorMult)
  if (profile.baseStats.defense) stats.defense = Math.floor(profile.baseStats.defense * rarityMult * floorMult)
  if (profile.baseStats.health) stats.health = Math.floor(profile.baseStats.health * rarityMult * floorMult)

  return {
    id: generateId(),
    entityType: "item",
    name: generateTrinketName(subtype, rarity),
    type: "misc",
    category: "trinket",
    subtype,
    rarity,
    stats,
    value: Math.floor(20 * rarityMult * floorMult),
    description: `A ${rarity} ${subtype} that provides minor bonuses.`,
  }
}
