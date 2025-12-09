/**
 * Enemy Rank System
 *
 * Enemies can be Normal, Rare, Unique, Boss, or Elite Boss.
 * Higher ranks have better stats, more abilities, names, and guaranteed loot.
 */

import type { Enemy, EnemyAbility, StatusEffect, DamageType } from "./game-types"
import { createStatusEffect } from "./entity-system"

// =============================================================================
// RANK DEFINITIONS
// =============================================================================

export type EnemyRank = "normal" | "rare" | "unique" | "boss" | "elite_boss"

export interface RankModifiers {
  healthMultiplier: number
  attackMultiplier: number
  defenseMultiplier: number
  expMultiplier: number
  goldMultiplier: number
  abilityCount: number // number of special abilities
  guaranteedLoot: boolean
  lootRarityBoost: number // 0-3, boosts minimum loot rarity
  isNamed: boolean
  hasTitle: boolean
  spawnChance: number // chance to spawn as this rank (cumulative check)
}

export const RANK_MODIFIERS: Record<EnemyRank, RankModifiers> = {
  normal: {
    healthMultiplier: 1.0,
    attackMultiplier: 1.0,
    defenseMultiplier: 1.0,
    expMultiplier: 1.0,
    goldMultiplier: 1.0,
    abilityCount: 0,
    guaranteedLoot: false,
    lootRarityBoost: 0,
    isNamed: false,
    hasTitle: false,
    spawnChance: 0.70, // 70% normal
  },
  rare: {
    healthMultiplier: 1.5,
    attackMultiplier: 1.3,
    defenseMultiplier: 1.2,
    expMultiplier: 2.0,
    goldMultiplier: 2.5,
    abilityCount: 1,
    guaranteedLoot: true,
    lootRarityBoost: 1,
    isNamed: true,
    hasTitle: false,
    spawnChance: 0.90, // 20% rare (70-90)
  },
  unique: {
    healthMultiplier: 2.0,
    attackMultiplier: 1.6,
    defenseMultiplier: 1.5,
    expMultiplier: 4.0,
    goldMultiplier: 5.0,
    abilityCount: 2,
    guaranteedLoot: true,
    lootRarityBoost: 2,
    isNamed: true,
    hasTitle: true,
    spawnChance: 0.97, // 7% unique (90-97)
  },
  boss: {
    healthMultiplier: 3.0,
    attackMultiplier: 2.0,
    defenseMultiplier: 2.0,
    expMultiplier: 8.0,
    goldMultiplier: 10.0,
    abilityCount: 3,
    guaranteedLoot: true,
    lootRarityBoost: 2,
    isNamed: true,
    hasTitle: true,
    spawnChance: 1.0, // Bosses are placed, not rolled
  },
  elite_boss: {
    healthMultiplier: 5.0,
    attackMultiplier: 2.5,
    defenseMultiplier: 2.5,
    expMultiplier: 15.0,
    goldMultiplier: 20.0,
    abilityCount: 4,
    guaranteedLoot: true,
    lootRarityBoost: 3,
    isNamed: true,
    hasTitle: true,
    spawnChance: 1.0, // Elite bosses are special spawns
  },
}

// =============================================================================
// NAME GENERATION
// =============================================================================

const NAME_PREFIXES = [
  "Grim", "Dark", "Blood", "Shadow", "Doom", "Death", "Plague", "Rot",
  "Vile", "Cursed", "Wretched", "Twisted", "Savage", "Brutal", "Fel",
  "Ancient", "Elder", "Prime", "Alpha", "Dread", "Terror", "Horror",
  "Bane", "Scourge", "Ruin", "Havoc", "Chaos", "Void", "Null", "Ash",
]

const NAME_SUFFIXES = [
  "bane", "maw", "fang", "claw", "tooth", "scale", "hide", "bone",
  "skull", "heart", "soul", "shade", "wraith", "spawn", "brood",
  "kin", "born", "touched", "marked", "blessed", "cursed", "sworn",
]

const TITLES = [
  "the Destroyer", "the Devourer", "the Corrupted", "the Forsaken",
  "the Eternal", "the Undying", "the Relentless", "the Merciless",
  "the Butcher", "the Flayer", "the Harvester", "the Reaper",
  "the Defiler", "the Profane", "the Accursed", "the Damned",
  "the Unyielding", "the Ironclad", "the Unstoppable", "the Inevitable",
  "Who Walks in Shadow", "of the Deep", "from the Void", "of a Thousand Screams",
  "the Last", "the First", "the Forgotten", "the Awakened",
]

/**
 * Generate a unique name for a ranked enemy
 */
export function generateEnemyName(baseName: string, rank: EnemyRank): string {
  if (rank === "normal") return baseName

  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)]
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)]

  // For rare enemies, just add a prefix
  if (rank === "rare") {
    return `${prefix} ${baseName}`
  }

  // For unique/boss, create a proper name
  const properName = `${prefix}${suffix}`

  if (rank === "unique" || rank === "boss" || rank === "elite_boss") {
    const title = TITLES[Math.floor(Math.random() * TITLES.length)]
    return `${properName} ${title}`
  }

  return properName
}

// =============================================================================
// SPECIAL ABILITIES BY RANK
// =============================================================================

interface RankAbilityTemplate {
  name: string
  description: string
  damageType?: DamageType
  damageMultiplier: number // multiplier of base enemy attack
  cooldown: number
  effect?: () => StatusEffect
  chance: number
}

const RARE_ABILITIES: RankAbilityTemplate[] = [
  {
    name: "Crushing Blow",
    description: "A devastating attack that ignores some defense",
    damageType: "physical",
    damageMultiplier: 1.8,
    cooldown: 3,
    chance: 0.4,
  },
  {
    name: "Venomous Strike",
    description: "Poisons the target",
    damageType: "poison",
    damageMultiplier: 1.2,
    cooldown: 2,
    effect: () => createStatusEffect({
      name: "Rank Poison",
      effectType: "debuff",
      duration: 4,
      modifiers: { healthRegen: -3 },
      description: "Potent venom courses through your veins.",
      sourceType: "enemy",
    }),
    chance: 0.5,
  },
  {
    name: "War Cry",
    description: "Increases damage for several turns",
    damageMultiplier: 0,
    cooldown: 5,
    effect: () => createStatusEffect({
      name: "Enraged",
      effectType: "buff",
      duration: 3,
      modifiers: { attack: 5 },
      description: "Fury empowers this creature.",
      sourceType: "enemy",
    }),
    chance: 0.3,
  },
]

const UNIQUE_ABILITIES: RankAbilityTemplate[] = [
  {
    name: "Soul Rend",
    description: "Tears at the very essence of life",
    damageType: "shadow",
    damageMultiplier: 2.0,
    cooldown: 4,
    effect: () => createStatusEffect({
      name: "Soul Torn",
      effectType: "debuff",
      duration: 3,
      modifiers: { attack: -3, defense: -3 },
      description: "Your soul has been damaged.",
      sourceType: "enemy",
    }),
    chance: 0.35,
  },
  {
    name: "Life Drain",
    description: "Steals life force from the target",
    damageType: "shadow",
    damageMultiplier: 1.5,
    cooldown: 3,
    chance: 0.4,
  },
  {
    name: "Infernal Blast",
    description: "Unleashes hellfire",
    damageType: "fire",
    damageMultiplier: 2.2,
    cooldown: 4,
    effect: () => createStatusEffect({
      name: "Burning",
      effectType: "debuff",
      duration: 3,
      modifiers: { healthRegen: -4 },
      description: "Hellfire burns you.",
      sourceType: "enemy",
    }),
    chance: 0.3,
  },
  {
    name: "Frost Nova",
    description: "Chilling blast that slows movement",
    damageType: "ice",
    damageMultiplier: 1.6,
    cooldown: 3,
    effect: () => createStatusEffect({
      name: "Frozen",
      effectType: "debuff",
      duration: 2,
      modifiers: { attack: -4, defense: -2 },
      description: "Ice slows your movements.",
      sourceType: "enemy",
    }),
    chance: 0.4,
  },
]

const BOSS_ABILITIES: RankAbilityTemplate[] = [
  {
    name: "Annihilate",
    description: "A devastating attack meant to destroy",
    damageType: "physical",
    damageMultiplier: 3.0,
    cooldown: 5,
    chance: 0.25,
  },
  {
    name: "Doom",
    description: "Marks the target for death",
    damageMultiplier: 0,
    cooldown: 6,
    effect: () => createStatusEffect({
      name: "Doomed",
      effectType: "debuff",
      duration: 5,
      modifiers: { defense: -8 },
      description: "Death comes for you.",
      sourceType: "enemy",
    }),
    chance: 0.3,
  },
  {
    name: "Summon Minions",
    description: "Calls forth lesser creatures",
    damageMultiplier: 0,
    cooldown: 8,
    chance: 0.2,
  },
  {
    name: "Regenerate",
    description: "Rapidly heals wounds",
    damageMultiplier: 0,
    cooldown: 6,
    effect: () => createStatusEffect({
      name: "Regenerating",
      effectType: "buff",
      duration: 3,
      modifiers: { healthRegen: 10 },
      description: "Wounds close rapidly.",
      sourceType: "enemy",
    }),
    chance: 0.25,
  },
  {
    name: "Void Rift",
    description: "Tears a hole in reality",
    damageType: "arcane",
    damageMultiplier: 2.5,
    cooldown: 4,
    effect: () => createStatusEffect({
      name: "Void-Touched",
      effectType: "debuff",
      duration: 4,
      modifiers: { maxHealth: -15 },
      description: "The void drains your vitality.",
      sourceType: "enemy",
    }),
    chance: 0.3,
  },
]

/**
 * Generate special abilities for a ranked enemy
 */
function generateRankAbilities(rank: EnemyRank, baseAttack: number, enemyName: string): EnemyAbility[] {
  const modifiers = RANK_MODIFIERS[rank]
  const abilities: EnemyAbility[] = []

  let pool: RankAbilityTemplate[] = []
  if (rank === "rare") pool = RARE_ABILITIES
  else if (rank === "unique") pool = [...RARE_ABILITIES, ...UNIQUE_ABILITIES]
  else if (rank === "boss" || rank === "elite_boss") pool = [...UNIQUE_ABILITIES, ...BOSS_ABILITIES]

  // Shuffle and pick abilities
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, modifiers.abilityCount)

  for (const template of selected) {
    abilities.push({
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      damage: template.damageMultiplier > 0 ? Math.floor(baseAttack * template.damageMultiplier) : undefined,
      damageType: template.damageType,
      cooldown: template.cooldown,
      currentCooldown: 0,
      effect: template.effect?.(),
      chance: template.chance,
      narration: `${enemyName} uses ${template.name}!`,
    })
  }

  return abilities
}

// =============================================================================
// RANK ROLLING
// =============================================================================

/**
 * Roll for enemy rank based on floor depth
 */
export function rollEnemyRank(floor: number): EnemyRank {
  // Higher floors have better chance of rare+ enemies
  const floorBonus = Math.min(floor * 0.02, 0.15) // max 15% bonus at floor 7+

  const roll = Math.random()

  // Adjusted thresholds with floor bonus
  const normalThreshold = RANK_MODIFIERS.normal.spawnChance - floorBonus
  const rareThreshold = RANK_MODIFIERS.rare.spawnChance - (floorBonus * 0.5)
  const uniqueThreshold = RANK_MODIFIERS.unique.spawnChance - (floorBonus * 0.25)

  if (roll < normalThreshold) return "normal"
  if (roll < rareThreshold) return "rare"
  if (roll < uniqueThreshold) return "unique"

  // Very rare chance for elite boss encounter in regular rooms on high floors
  if (floor >= 5 && Math.random() < 0.01) return "elite_boss"

  return "unique"
}

// =============================================================================
// ENEMY UPGRADING
// =============================================================================

/**
 * Extended enemy interface with rank information
 */
export interface RankedEnemy extends Enemy {
  rank: EnemyRank
  originalName: string // base enemy type before naming
  title?: string
  rankAbilities: EnemyAbility[] // abilities from rank (separate from base abilities)
  lootRarityBoost: number
}

/**
 * Upgrade a normal enemy to a higher rank
 */
export function upgradeEnemyRank(enemy: Enemy, rank: EnemyRank, floor: number): RankedEnemy {
  const modifiers = RANK_MODIFIERS[rank]

  // Generate name
  const rankedName = generateEnemyName(enemy.name, rank)

  // Calculate scaled stats
  const scaledHealth = Math.floor(enemy.maxHealth * modifiers.healthMultiplier)
  const scaledAttack = Math.floor(enemy.attack * modifiers.attackMultiplier)
  const scaledDefense = Math.floor(enemy.defense * modifiers.defenseMultiplier)
  const scaledExp = Math.floor(enemy.expReward * modifiers.expMultiplier)
  const scaledGold = Math.floor(enemy.goldReward * modifiers.goldMultiplier)

  // Generate rank abilities
  const rankAbilities = generateRankAbilities(rank, scaledAttack, rankedName)

  // Combine with existing abilities
  const allAbilities = [
    ...(enemy.abilities || []),
    ...rankAbilities,
  ]

  // Determine AI pattern based on rank
  let aiPattern = enemy.aiPattern || "random"
  if (rank === "rare") aiPattern = "smart"
  if (rank === "unique") aiPattern = "ability_focused"
  if (rank === "boss" || rank === "elite_boss") aiPattern = "smart"

  return {
    ...enemy,
    name: rankedName,
    originalName: enemy.name,
    rank,
    health: scaledHealth,
    maxHealth: scaledHealth,
    attack: scaledAttack,
    defense: scaledDefense,
    expReward: scaledExp,
    goldReward: scaledGold,
    abilities: allAbilities,
    rankAbilities,
    aiPattern,
    lootRarityBoost: modifiers.lootRarityBoost,
  }
}

/**
 * Create a ranked enemy from a base enemy template
 */
export function createRankedEnemy(baseEnemy: Enemy, floor: number, forceRank?: EnemyRank): RankedEnemy {
  const rank = forceRank ?? rollEnemyRank(floor)
  return upgradeEnemyRank(baseEnemy, rank, floor)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get display color for enemy rank
 */
export function getRankColor(rank: EnemyRank): string {
  switch (rank) {
    case "normal": return "text-gray-300"
    case "rare": return "text-blue-400"
    case "unique": return "text-purple-400"
    case "boss": return "text-orange-400"
    case "elite_boss": return "text-red-500"
  }
}

/**
 * Get rank display name
 */
export function getRankDisplayName(rank: EnemyRank): string {
  switch (rank) {
    case "normal": return "Normal"
    case "rare": return "Rare"
    case "unique": return "Unique"
    case "boss": return "Boss"
    case "elite_boss": return "Elite Boss"
  }
}

/**
 * Check if enemy is a miniboss (unique or higher, but not actual boss)
 */
export function isMiniboss(enemy: RankedEnemy): boolean {
  return enemy.rank === "unique"
}

/**
 * Check if enemy should drop guaranteed loot
 */
export function hasGuaranteedLoot(rank: EnemyRank): boolean {
  return RANK_MODIFIERS[rank].guaranteedLoot
}

/**
 * Get minimum loot rarity for a rank
 */
export function getMinLootRarity(rank: EnemyRank): "common" | "uncommon" | "rare" | "legendary" {
  const boost = RANK_MODIFIERS[rank].lootRarityBoost
  if (boost >= 3) return "rare"
  if (boost >= 2) return "uncommon"
  if (boost >= 1) return "uncommon"
  return "common"
}
