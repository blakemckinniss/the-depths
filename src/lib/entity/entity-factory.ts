import type {
  Enemy,
  Item,
  ItemRarity,
  NPC,
  Trap,
  Shrine,
  Companion,
  Boss,
  StatusEffect,
  CompanionAbility,
  DamageType,
} from "@/lib/core/game-types"
import { generateEntityId, STATUS_EFFECTS } from "./entity-system"
import type { RoomEventResponse, CompanionRecruitResponse } from "@/lib/hooks/use-event-chain"
import { calculateEntityLevel, ENTITY_LEVEL_CONFIG } from "@/lib/mechanics/game-mechanics-ledger"

// Convert AI tier to stats multiplier
function tierToMultiplier(tier: string): number {
  switch (tier) {
    case "minion":
      return 0.7
    case "standard":
      return 1
    case "elite":
      return 1.4
    case "boss":
      return 2
    default:
      return 1
  }
}

// Convert AI tier to rank for level calculation
function tierToRank(tier: string): keyof typeof ENTITY_LEVEL_CONFIG.rankBonus {
  switch (tier) {
    case "minion":
      return "normal"
    case "standard":
      return "normal"
    case "elite":
      return "rare"
    case "boss":
      return "boss"
    default:
      return "normal"
  }
}

// Create enemy from AI-generated data
export function createEnemyFromAI(
  aiData: NonNullable<RoomEventResponse["enemy"]>,
  floor: number,
  baseStats?: { health: number; attack: number; defense: number },
): Enemy {
  const mult = tierToMultiplier(aiData.tier)
  const floorScale = 1 + (floor - 1) * 0.15

  const base = baseStats || {
    health: 20 + floor * 5,
    attack: 5 + floor * 2,
    defense: 2 + floor,
  }

  // Convert AI ability strings to EnemyAbility objects
  const abilities = aiData.abilities.map((abilityName, index) => ({
    id: generateEntityId("ability"),
    name: abilityName,
    description: `Uses ${abilityName}`,
    damage: Math.floor(base.attack * mult * floorScale * 1.3),
    cooldown: 2 + index,
    currentCooldown: 0,
    chance: 0.4,
    narration: `${aiData.name} uses ${abilityName}!`,
  }))

  // Validate weakness as DamageType
  const validDamageTypes: DamageType[] = [
    "physical",
    "fire",
    "ice",
    "lightning",
    "shadow",
    "holy",
    "poison",
    "arcane",
  ]
  const weakness: DamageType | undefined = aiData.weakness
    ? (validDamageTypes.find((t) => aiData.weakness?.toLowerCase().includes(t)) as DamageType | undefined)
    : undefined

  // Calculate level based on floor and tier
  const rank = tierToRank(aiData.tier)
  const level = calculateEntityLevel(floor, rank)

  return {
    id: generateEntityId("enemy"),
    entityType: "enemy",
    name: aiData.name,
    description: aiData.description,
    level,
    health: Math.floor(base.health * mult * floorScale),
    maxHealth: Math.floor(base.health * mult * floorScale),
    attack: Math.floor(base.attack * mult * floorScale),
    defense: Math.floor(base.defense * mult * floorScale),
    expReward: Math.floor(15 * mult * floorScale),
    goldReward: Math.floor(10 * mult * floorScale),
    abilities,
    weakness,
    lastWords: aiData.deathCry,
    aiGenerated: true,
  }
}

// Create item from AI-generated data
export function createItemFromAI(
  aiData: NonNullable<RoomEventResponse["loot"]>,
  type: "weapon" | "armor" | "potion",
  rarity: ItemRarity,
  floor: number,
): Item {
  const baseStats: Record<ItemRarity, { attack: number; defense: number; health: number }> = {
    common: { attack: 3, defense: 2, health: 15 },
    uncommon: { attack: 6, defense: 5, health: 30 },
    rare: { attack: 10, defense: 9, health: 50 },
    legendary: { attack: 18, defense: 15, health: 100 },
  }

  const stats = baseStats[rarity]
  const floorBonus = floor - 1

  return {
    id: generateEntityId("item"),
    entityType: type,
    name: aiData.itemName,
    description: aiData.itemDescription,
    lore: aiData.itemLore,
    type,
    rarity,
    stats: {
      attack: type === "weapon" ? stats.attack + floorBonus : undefined,
      defense: type === "armor" ? stats.defense + floorBonus : undefined,
      health: type === "potion" ? stats.health : undefined,
    },
    value: { common: 20, uncommon: 60, rare: 180, legendary: 500 }[rarity],
    aiGenerated: true,
  }
}

// Create trap from AI-generated data
export function createTrapFromAI(
  aiData: NonNullable<RoomEventResponse["trap"]>,
  floor: number,
  trapType: "damage" | "poison" | "curse" = "damage",
): Trap {
  const baseDamage = 10 + floor * 3

  let effect: StatusEffect | undefined
  if (trapType === "poison") {
    effect = STATUS_EFFECTS.poisoned()
  } else if (trapType === "curse") {
    effect = STATUS_EFFECTS.cursed()
  }

  return {
    id: generateEntityId("trap"),
    entityType: "trap",
    name: aiData.name,
    description: aiData.appearance,
    trapType,
    damage: trapType === "damage" ? baseDamage : Math.floor(baseDamage * 0.5),
    effect,
    disarmDC: 8 + floor,
    triggered: false,
    hidden: true,
    aiGenerated: true,
  }
}

// Create shrine from AI-generated data
export function createShrineFromAI(aiData: NonNullable<RoomEventResponse["shrine"]>, floor: number): Shrine {
  // Determine shrine type from aura/appearance keywords
  let shrineType: Shrine["shrineType"] = "unknown"
  const auraLower = aiData.aura.toLowerCase()
  if (auraLower.includes("heal") || auraLower.includes("restor") || auraLower.includes("life")) {
    shrineType = "health"
  } else if (auraLower.includes("power") || auraLower.includes("strength") || auraLower.includes("might")) {
    shrineType = "power"
  } else if (auraLower.includes("gold") || auraLower.includes("fortune") || auraLower.includes("luck")) {
    shrineType = "fortune"
  } else if (auraLower.includes("dark") || auraLower.includes("shadow") || auraLower.includes("void")) {
    shrineType = "dark"
  }

  const riskLevel = shrineType === "dark" ? "dangerous" : shrineType === "unknown" ? "moderate" : "safe"

  return {
    id: generateEntityId("shrine"),
    entityType: "shrine",
    name: aiData.name,
    description: aiData.appearance,
    shrineType,
    riskLevel,
    cost:
      shrineType === "health"
        ? { gold: 20 + floor * 5 }
        : shrineType === "power"
          ? { health: 10 }
          : shrineType === "fortune"
            ? { gold: 40 + floor * 10 }
            : undefined,
    used: false,
    aiGenerated: true,
  }
}

// Create NPC from AI-generated data
export function createNPCFromAI(aiData: NonNullable<RoomEventResponse["npc"]>, floor: number): NPC {
  // Determine role from motivation/personality keywords
  let role: NPC["role"] = "mysterious"
  const motivationLower = aiData.motivation.toLowerCase()
  const personalityLower = aiData.personality.toLowerCase()

  if (motivationLower.includes("sell") || motivationLower.includes("trade") || motivationLower.includes("coin")) {
    role = "merchant"
  } else if (
    motivationLower.includes("trap") ||
    motivationLower.includes("rescue") ||
    motivationLower.includes("escape")
  ) {
    role = "trapped"
  } else if (
    motivationLower.includes("quest") ||
    motivationLower.includes("task") ||
    motivationLower.includes("mission")
  ) {
    role = "quest_giver"
  }

  return {
    id: generateEntityId("npc"),
    entityType: "npc",
    name: aiData.name,
    description: aiData.appearance,
    role,
    disposition: role === "merchant" ? 60 : role === "trapped" ? 70 : 50,
    personality: aiData.personality,
    dialogue: [aiData.greeting],
    aiGenerated: true,
  }
}

export function createCompanionFromAI(aiData: CompanionRecruitResponse, floor: number, sourceEnemyLevel?: number): Companion {
  const floorScale = 1 + (floor - 1) * 0.1

  // Companion level: inherit from source enemy if tamed, otherwise calculate from floor
  const level = sourceEnemyLevel ?? calculateEntityLevel(floor, "normal")

  // Convert AI abilities to game abilities
  const abilities: CompanionAbility[] = aiData.abilities.map((a, i) => ({
    id: generateEntityId("ability"),
    name: a.name,
    description: a.description,
    cooldown: a.cooldown,
    currentCooldown: 0,
    effect: {
      type: a.effectType,
      target: a.target,
      value: Math.floor(a.power * floorScale),
      special: a.effectType === "special" ? a.description : undefined,
    },
    narration: a.narration,
  }))

  return {
    id: generateEntityId("companion"),
    entityType: "companion",
    name: aiData.name,
    description: aiData.appearance,
    origin: aiData.origin,
    species: aiData.species,
    personality: aiData.personality,
    stats: {
      health: Math.floor(aiData.stats.health * floorScale),
      maxHealth: Math.floor(aiData.stats.health * floorScale),
      attack: Math.floor(aiData.stats.attack * floorScale),
      defense: Math.floor(aiData.stats.defense * floorScale),
      speed: aiData.stats.speed,
      level,
    },
    abilities,
    combatBehavior: {
      style: aiData.combatStyle,
      priority: aiData.combatPriority,
      fleeThreshold: aiData.fleeThreshold,
    },
    bond: {
      level: aiData.bond.startingLevel,
      mood: aiData.bond.initialMood,
      memory: [aiData.bond.firstMemory],
    },
    evolution: aiData.evolution
      ? {
          potential: aiData.evolution.potential,
          triggers: aiData.evolution.triggers,
          evolvesInto: aiData.evolution.evolvesInto,
        }
      : undefined,
    appearance: aiData.appearance,
    quirk: aiData.quirk,
    battleCry: aiData.battleCry,
    idleComment: aiData.idleComment,
    alive: true,
    inParty: false,
    turnsWithPlayer: 0,
    flags: aiData.flags,
    aiGenerated: true,
  }
}

// Create companion from rescued NPC or AI data (fallback)
export function createCompanionFromNPC(npc: NPC, playerLevel = 1): Companion {
  const roleStats = {
    merchant: { health: 20, attack: 3, defense: 2, style: "passive" as const },
    quest_giver: { health: 25, attack: 5, defense: 3, style: "support" as const },
    trapped: { health: 30, attack: 6, defense: 4, style: "defensive" as const },
    mysterious: { health: 25, attack: 7, defense: 3, style: "tactical" as const },
    hostile_neutral: { health: 35, attack: 8, defense: 5, style: "aggressive" as const },
  }

  const stats = roleStats[npc.role] || roleStats.trapped

  // Rescued NPCs are player level - 1 (minimum 1)
  const level = Math.max(1, playerLevel - 1)

  return {
    id: generateEntityId("companion"),
    entityType: "companion",
    name: npc.name,
    description: npc.description || "A grateful survivor",
    origin: "rescue",
    species: "human",
    personality: ["grateful", "determined"],
    stats: {
      health: stats.health,
      maxHealth: stats.health,
      attack: stats.attack,
      defense: stats.defense,
      speed: 5,
      level,
    },
    abilities: [
      {
        id: generateEntityId("ability"),
        name: "Assist",
        description: "Helps in combat",
        cooldown: 2,
        currentCooldown: 0,
        effect: {
          type: "damage",
          target: "enemy",
          value: stats.attack,
        },
        narration: `${npc.name} joins the fight!`,
      },
    ],
    combatBehavior: {
      style: stats.style,
      priority: "support the player",
    },
    bond: {
      level: 60,
      mood: "grateful",
      memory: ["Was rescued from the dungeon"],
    },
    appearance: npc.description || "A weary but determined adventurer",
    quirk: npc.personality || "Owes their life to you",
    alive: true,
    inParty: false,
    turnsWithPlayer: 0,
    flags: [],
    aiGenerated: true,
  }
}

// Create boss from AI-generated encounter data
export function createBossFromAI(
  entrance: {
    bossName: string
    bossTitle: string
    bossDescription: string
    introDialogue: string
  },
  phases: Array<{ name: string; transitionNarration: string; newAbility: string; bossDialogue: string }>,
  deathSequence: { lastWords: string },
  floor: number,
  baseStats?: { health: number; attack: number; defense: number },
): Boss {
  const floorScale = 1 + (floor - 1) * 0.2
  const base = baseStats || {
    health: 100,
    attack: 15,
    defense: 10,
  }

  return {
    id: generateEntityId("boss"),
    entityType: "boss",
    name: entrance.bossName,
    description: entrance.bossDescription,
    health: Math.floor(base.health * floorScale),
    maxHealth: Math.floor(base.health * floorScale),
    attack: Math.floor(base.attack * floorScale),
    defense: Math.floor(base.defense * floorScale),
    currentPhase: 0,
    phases: phases.map((p, i) => ({
      name: p.name,
      healthThreshold: i === 0 ? 100 : i === 1 ? 60 : 30,
      attackModifier: 1 + i * 0.25,
      defenseModifier: 1 - i * 0.15,
      specialAbility: p.newAbility,
      narration: p.transitionNarration,
    })),
    expReward: Math.floor(100 * floorScale),
    goldReward: Math.floor(50 * floorScale),
    guaranteedLoot: [],
    dialogue: {
      intro: entrance.introDialogue,
      phase_transitions: phases.map((p) => p.bossDialogue),
      death: deathSequence.lastWords,
    },
    aiGenerated: true,
  }
}

// Roll for item rarity based on dungeon rarity
export function rollItemRarity(dungeonRarity: ItemRarity): ItemRarity {
  const weights: Record<ItemRarity, Record<ItemRarity, number>> = {
    common: { common: 70, uncommon: 25, rare: 4, legendary: 1 },
    uncommon: { common: 50, uncommon: 35, rare: 12, legendary: 3 },
    rare: { common: 30, uncommon: 40, rare: 25, legendary: 5 },
    legendary: { common: 15, uncommon: 35, rare: 35, legendary: 15 },
  }

  const tierWeights = weights[dungeonRarity]
  const total = Object.values(tierWeights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total

  for (const [rarity, weight] of Object.entries(tierWeights)) {
    roll -= weight
    if (roll <= 0) return rarity as ItemRarity
  }

  return "common"
}

// Roll for item type
export function rollItemType(): "weapon" | "armor" | "potion" {
  const roll = Math.random()
  if (roll < 0.35) return "weapon"
  if (roll < 0.65) return "armor"
  return "potion"
}
