/**
 * Item Sets System
 *
 * Provides set bonuses when equipping multiple items from the same set.
 * Sets can be:
 * - Predefined (designed sets with specific themes)
 * - AI-generated (dynamic sets based on dungeon theme)
 */

import type { Item, StatusEffect, DamageType, PlayerClass } from "@/lib/core/game-types"
import { createStatusEffect } from "@/lib/entity/entity-system"

// =============================================================================
// SET DEFINITIONS
// =============================================================================

export interface ItemSet {
  id: string
  name: string
  description: string
  lore: string
  theme: string
  pieces: SetPiece[]
  bonuses: SetBonus[]
  classAffinity?: PlayerClass[]
  aiGenerated?: boolean
}

export interface SetPiece {
  slot: "weapon" | "armor" | "helmet" | "boots" | "gloves" | "ring" | "amulet"
  itemId?: string // if linked to specific item
  itemName?: string // for display/matching
  required: boolean
}

export interface SetBonus {
  piecesRequired: number
  name: string
  description: string
  effects: SetBonusEffect
}

export interface SetBonusEffect {
  attack?: number
  defense?: number
  health?: number
  maxHealth?: number
  critChance?: number
  critDamage?: number
  dodgeChance?: number
  healthRegen?: number
  damageBonus?: { type: DamageType; percent: number }
  resistance?: { type: DamageType; percent: number }
  special?: string // Custom effect description for game logic
  statusEffect?: () => StatusEffect
}

// =============================================================================
// PREDEFINED SETS
// =============================================================================

export const ITEM_SETS: ItemSet[] = [
  // === WARRIOR SETS ===
  {
    id: "iron_bastion",
    name: "Iron Bastion",
    description: "Heavy armor forged for front-line defenders.",
    lore: "Worn by the King's Vanguard in the last great war.",
    theme: "defensive",
    classAffinity: ["warrior", "paladin"],
    pieces: [
      { slot: "weapon", itemName: "Bastion Blade", required: true },
      { slot: "armor", itemName: "Bastion Plate", required: true },
      { slot: "helmet", itemName: "Bastion Helm", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Fortified",
        description: "+5 Defense, +20 Max Health",
        effects: { defense: 5, maxHealth: 20 },
      },
      {
        piecesRequired: 3,
        name: "Unbreakable",
        description: "+10 Defense, Take 15% less physical damage",
        effects: { defense: 10, resistance: { type: "physical", percent: 15 } },
      },
    ],
  },

  {
    id: "berserker_fury",
    name: "Berserker's Fury",
    description: "Blood-soaked gear of a legendary berserker.",
    lore: "Each kill only makes the wearer stronger.",
    theme: "offensive",
    classAffinity: ["warrior", "barbarian"],
    pieces: [
      { slot: "weapon", itemName: "Rage Cleaver", required: true },
      { slot: "armor", itemName: "Bloodstained Leathers", required: true },
      { slot: "gloves", itemName: "Berserker Gauntlets", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Blood Frenzy",
        description: "+8 Attack, +15% Crit Damage",
        effects: { attack: 8, critDamage: 0.15 },
      },
      {
        piecesRequired: 3,
        name: "Unstoppable Rage",
        description: "+5% Crit Chance, Gain 5 HP on kill",
        effects: { critChance: 0.05, special: "lifesteal_on_kill_5" },
      },
    ],
  },

  // === MAGE SETS ===
  {
    id: "arcane_scholar",
    name: "Arcane Scholar",
    description: "Robes of the ancient magical academy.",
    lore: "Knowledge is the greatest weapon.",
    theme: "magic",
    classAffinity: ["mage", "warlock"],
    pieces: [
      { slot: "weapon", itemName: "Scholar's Staff", required: true },
      { slot: "armor", itemName: "Arcane Robes", required: true },
      { slot: "helmet", itemName: "Crown of Insight", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Arcane Focus",
        description: "+6 Spell Damage, +20% Arcane Damage",
        effects: { attack: 6, damageBonus: { type: "arcane", percent: 20 } },
      },
      {
        piecesRequired: 3,
        name: "Spell Mastery",
        description: "Abilities cost 20% less, +5% Spell Crit",
        effects: { critChance: 0.05, special: "ability_cost_reduction_20" },
      },
    ],
  },

  {
    id: "flame_lord",
    name: "Flame Lord",
    description: "Gear imbued with eternal flames.",
    lore: "Forged in the heart of a dying star.",
    theme: "fire",
    classAffinity: ["mage", "warlock"],
    pieces: [
      { slot: "weapon", itemName: "Inferno Staff", required: true },
      { slot: "armor", itemName: "Flame Lord's Vestments", required: true },
      { slot: "ring", itemName: "Ring of Eternal Flame", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Burning Soul",
        description: "+25% Fire Damage, Fire Immunity",
        effects: { damageBonus: { type: "fire", percent: 25 }, resistance: { type: "fire", percent: 100 } },
      },
      {
        piecesRequired: 3,
        name: "Inferno",
        description: "Attacks have 20% chance to ignite enemies",
        effects: { special: "ignite_on_hit_20" },
      },
    ],
  },

  // === ROGUE SETS ===
  {
    id: "shadow_dancer",
    name: "Shadow Dancer",
    description: "Gear for those who strike from darkness.",
    lore: "You never see the Shadow Dancer coming.",
    theme: "stealth",
    classAffinity: ["rogue", "ranger"],
    pieces: [
      { slot: "weapon", itemName: "Shadow Dagger", required: true },
      { slot: "armor", itemName: "Nightshroud", required: true },
      { slot: "boots", itemName: "Silent Steps", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Cloak of Shadows",
        description: "+10% Dodge, +20% Shadow Damage",
        effects: { dodgeChance: 0.10, damageBonus: { type: "shadow", percent: 20 } },
      },
      {
        piecesRequired: 3,
        name: "Death from Above",
        description: "+25% Crit Damage, First attack each combat crits",
        effects: { critDamage: 0.25, special: "guaranteed_first_crit" },
      },
    ],
  },

  {
    id: "venomous_assassin",
    name: "Venomous Assassin",
    description: "Gear coated with deadly toxins.",
    lore: "One scratch is all it takes.",
    theme: "poison",
    classAffinity: ["rogue"],
    pieces: [
      { slot: "weapon", itemName: "Venomblade", required: true },
      { slot: "armor", itemName: "Toxic Leathers", required: true },
      { slot: "gloves", itemName: "Envenom Gloves", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Toxic",
        description: "Attacks poison enemies (3 damage/turn for 3 turns)",
        effects: { special: "poison_on_hit_3_3" },
      },
      {
        piecesRequired: 3,
        name: "Master Poisoner",
        description: "+30% Poison Damage, Poison Immunity",
        effects: { damageBonus: { type: "poison", percent: 30 }, resistance: { type: "poison", percent: 100 } },
      },
    ],
  },

  // === PALADIN SETS ===
  {
    id: "divine_champion",
    name: "Divine Champion",
    description: "Holy armor blessed by the gods.",
    lore: "The light protects and empowers.",
    theme: "holy",
    classAffinity: ["paladin", "cleric"],
    pieces: [
      { slot: "weapon", itemName: "Holy Avenger", required: true },
      { slot: "armor", itemName: "Blessed Plate", required: true },
      { slot: "helmet", itemName: "Halo of Divinity", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Divine Protection",
        description: "+5 Defense, +30% Holy Damage",
        effects: { defense: 5, damageBonus: { type: "holy", percent: 30 } },
      },
      {
        piecesRequired: 3,
        name: "Smite Evil",
        description: "Double damage vs undead and demons, +3 HP regen",
        effects: { healthRegen: 3, special: "double_damage_undead_demon" },
      },
    ],
  },

  // === NECROMANCER SETS ===
  {
    id: "death_lord",
    name: "Death Lord",
    description: "Artifacts of a powerful lich.",
    lore: "Death is but a doorway.",
    theme: "death",
    classAffinity: ["necromancer", "warlock"],
    pieces: [
      { slot: "weapon", itemName: "Soulreaper Scythe", required: true },
      { slot: "armor", itemName: "Robes of the Lich", required: true },
      { slot: "ring", itemName: "Ring of Undeath", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Soul Harvest",
        description: "Killing enemies restores 10% max HP",
        effects: { special: "soul_harvest_10" },
      },
      {
        piecesRequired: 3,
        name: "Lord of Death",
        description: "+40% Shadow Damage, 25% chance to fear enemies",
        effects: { damageBonus: { type: "shadow", percent: 40 }, special: "fear_on_hit_25" },
      },
    ],
  },

  // === UNIVERSAL SETS ===
  {
    id: "explorer",
    name: "Explorer's Garb",
    description: "Gear for seasoned dungeon delvers.",
    lore: "Experience is the best teacher.",
    theme: "utility",
    pieces: [
      { slot: "weapon", itemName: "Explorer's Blade", required: false },
      { slot: "armor", itemName: "Adventurer's Vest", required: true },
      { slot: "boots", itemName: "Seven-League Boots", required: true },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Seasoned",
        description: "+15% Gold Find, +15% XP Gain",
        effects: { special: "gold_xp_bonus_15" },
      },
      {
        piecesRequired: 3,
        name: "Veteran Explorer",
        description: "+25% better loot, Traps deal 50% less damage",
        effects: { special: "loot_bonus_25_trap_resist_50" },
      },
    ],
  },

  {
    id: "dragon_slayer",
    name: "Dragon Slayer",
    description: "Gear forged from dragon parts.",
    lore: "To defeat a dragon, you must become one.",
    theme: "dragon",
    pieces: [
      { slot: "weapon", itemName: "Dragonbone Sword", required: true },
      { slot: "armor", itemName: "Dragonscale Mail", required: true },
      { slot: "helmet", itemName: "Dragon Helm", required: false },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Dragon's Might",
        description: "+8 Attack, +5 Defense, Fire Immunity",
        effects: { attack: 8, defense: 5, resistance: { type: "fire", percent: 100 } },
      },
      {
        piecesRequired: 3,
        name: "Dragonborn",
        description: "Chance to breathe fire dealing 25 damage",
        effects: { special: "dragon_breath_25" },
      },
    ],
  },
]

// =============================================================================
// SET TRACKING
// =============================================================================

export interface EquippedSetInfo {
  set: ItemSet
  equippedPieces: number
  activeBonuses: SetBonus[]
  missingPieces: SetPiece[]
}

export function checkEquippedSets(items: Item[]): EquippedSetInfo[] {
  const results: EquippedSetInfo[] = []

  for (const set of ITEM_SETS) {
    const equippedCount = countSetPieces(items, set)

    if (equippedCount > 0) {
      const activeBonuses = set.bonuses.filter(b => b.piecesRequired <= equippedCount)
      const missingPieces = set.pieces.filter(piece => {
        return !items.some(item => matchesSetPiece(item, piece))
      })

      results.push({
        set,
        equippedPieces: equippedCount,
        activeBonuses,
        missingPieces,
      })
    }
  }

  return results
}

function countSetPieces(items: Item[], set: ItemSet): number {
  let count = 0
  for (const piece of set.pieces) {
    if (items.some(item => matchesSetPiece(item, piece))) {
      count++
    }
  }
  return count
}

function matchesSetPiece(item: Item, piece: SetPiece): boolean {
  // Match by item ID if specified
  if (piece.itemId && item.id === piece.itemId) return true

  // Match by name (for predefined sets)
  if (piece.itemName && item.name.includes(piece.itemName)) return true

  // Match by set ID stored on item
  if ((item as SetItem).setId && (item as SetItem).setPieceSlot === piece.slot) return true

  return false
}

// =============================================================================
// SET BONUS APPLICATION
// =============================================================================

export interface AppliedSetBonuses {
  attack: number
  defense: number
  health: number
  maxHealth: number
  critChance: number
  critDamage: number
  dodgeChance: number
  healthRegen: number
  damageBonuses: Array<{ type: DamageType; percent: number }>
  resistances: Array<{ type: DamageType; percent: number }>
  specials: string[]
}

export function calculateSetBonuses(equippedSets: EquippedSetInfo[]): AppliedSetBonuses {
  const result: AppliedSetBonuses = {
    attack: 0,
    defense: 0,
    health: 0,
    maxHealth: 0,
    critChance: 0,
    critDamage: 0,
    dodgeChance: 0,
    healthRegen: 0,
    damageBonuses: [],
    resistances: [],
    specials: [],
  }

  for (const setInfo of equippedSets) {
    for (const bonus of setInfo.activeBonuses) {
      const e = bonus.effects

      if (e.attack) result.attack += e.attack
      if (e.defense) result.defense += e.defense
      if (e.health) result.health += e.health
      if (e.maxHealth) result.maxHealth += e.maxHealth
      if (e.critChance) result.critChance += e.critChance
      if (e.critDamage) result.critDamage += e.critDamage
      if (e.dodgeChance) result.dodgeChance += e.dodgeChance
      if (e.healthRegen) result.healthRegen += e.healthRegen
      if (e.damageBonus) result.damageBonuses.push(e.damageBonus)
      if (e.resistance) result.resistances.push(e.resistance)
      if (e.special) result.specials.push(e.special)
    }
  }

  return result
}

// =============================================================================
// SET ITEM CREATION
// =============================================================================

export interface SetItem extends Item {
  setId: string
  setName: string
  setPieceSlot: string
  setPieceNumber: number
}

export function isSetItem(item: Item): item is SetItem {
  return "setId" in item && "setName" in item
}

export function createSetPiece(
  baseItem: Item,
  set: ItemSet,
  pieceSlot: string,
  pieceNumber: number
): SetItem {
  return {
    ...baseItem,
    setId: set.id,
    setName: set.name,
    setPieceSlot: pieceSlot,
    setPieceNumber: pieceNumber,
    description: `${baseItem.description}\n\nPart of the ${set.name} set.`,
  }
}

// =============================================================================
// SET ITEM GENERATION
// =============================================================================

export interface GenerateSetItemOptions {
  setId?: string
  slot?: "weapon" | "armor"
  floor: number
  forClass?: PlayerClass
}

export function generateSetItem(options: GenerateSetItemOptions): SetItem | null {
  const { floor, forClass, slot } = options

  // Find appropriate set
  let eligibleSets = ITEM_SETS

  if (options.setId) {
    eligibleSets = eligibleSets.filter(s => s.id === options.setId)
  } else if (forClass) {
    eligibleSets = eligibleSets.filter(
      s => !s.classAffinity || s.classAffinity.includes(forClass)
    )
  }

  if (eligibleSets.length === 0) return null

  const set = eligibleSets[Math.floor(Math.random() * eligibleSets.length)]

  // Find a piece to generate
  let eligiblePieces = set.pieces
  if (slot) {
    eligiblePieces = eligiblePieces.filter(p => p.slot === slot)
  }

  if (eligiblePieces.length === 0) return null

  const piece = eligiblePieces[Math.floor(Math.random() * eligiblePieces.length)]
  const pieceIndex = set.pieces.indexOf(piece)

  // Generate base item based on slot
  const { generateWeapon, generateArmor } = require("./item-generator")

  let baseItem: Item
  if (piece.slot === "weapon") {
    baseItem = generateWeapon({ rarity: "rare", floor })
  } else {
    baseItem = generateArmor({ rarity: "rare", floor })
  }

  // Override name with set piece name
  if (piece.itemName) {
    baseItem.name = piece.itemName
  }

  return createSetPiece(baseItem, set, piece.slot, pieceIndex)
}

// =============================================================================
// AI SET GENERATION (for dynamic sets)
// =============================================================================

export interface AISetContext {
  dungeonTheme: string
  floor: number
  playerClass?: PlayerClass
}

export function generateDynamicSet(context: AISetContext): ItemSet {
  // This would normally call the AI endpoint
  // For now, return a themed template

  const themeId = context.dungeonTheme.toLowerCase().replace(/\s+/g, "_")

  return {
    id: `dynamic_${themeId}_${Date.now()}`,
    name: `Relics of the ${context.dungeonTheme}`,
    description: `Ancient gear found in the ${context.dungeonTheme}.`,
    lore: "These items resonate with the dungeon's power.",
    theme: context.dungeonTheme,
    aiGenerated: true,
    pieces: [
      { slot: "weapon", itemName: `${context.dungeonTheme} Blade`, required: true },
      { slot: "armor", itemName: `${context.dungeonTheme} Guard`, required: true },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        name: "Dungeon's Blessing",
        description: "+5 Attack, +5 Defense, Attuned to this dungeon",
        effects: {
          attack: 5,
          defense: 5,
          special: `dungeon_attunement_${themeId}`,
        },
      },
    ],
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function getSetById(setId: string): ItemSet | undefined {
  return ITEM_SETS.find(s => s.id === setId)
}

export function getSetsForClass(playerClass: PlayerClass): ItemSet[] {
  return ITEM_SETS.filter(
    s => !s.classAffinity || s.classAffinity.includes(playerClass)
  )
}

export function getSetBonusDescription(bonus: SetBonus): string {
  return `(${bonus.piecesRequired}) ${bonus.name}: ${bonus.description}`
}

export function formatSetTooltip(setInfo: EquippedSetInfo): string[] {
  const lines: string[] = [
    `${setInfo.set.name} (${setInfo.equippedPieces}/${setInfo.set.pieces.length})`,
    setInfo.set.description,
    "",
    "Set Bonuses:",
  ]

  for (const bonus of setInfo.set.bonuses) {
    const active = setInfo.activeBonuses.includes(bonus)
    const prefix = active ? "✓" : "○"
    lines.push(`${prefix} ${getSetBonusDescription(bonus)}`)
  }

  if (setInfo.missingPieces.length > 0) {
    lines.push("")
    lines.push("Missing:")
    for (const piece of setInfo.missingPieces) {
      lines.push(`- ${piece.itemName || piece.slot}`)
    }
  }

  return lines
}
