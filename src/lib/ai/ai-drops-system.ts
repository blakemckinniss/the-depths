/**
 * AI Drops System - Client Side
 *
 * Provides functions for AI-powered loot generation:
 * - Monster lore and special drops
 * - Treasure chest contents
 * - Boss rewards
 * - Dungeon-themed loot
 *
 * All operations use the /api/drops endpoint
 */

import type { Item, ItemRarity, Enemy } from "@/lib/core/game-types"

// =============================================================================
// TYPES
// =============================================================================

export interface MonsterLore {
  lore: {
    origin: string
    nature: string
    weakness_hint: string
  }
  lastWords: string
  specialDrop?: {
    name: string
    type: "weapon" | "armor" | "trinket" | "consumable" | "material"
    rarity: ItemRarity
    description: string
    effect?: string
  }
}

export interface TreasureItem {
  name: string
  type: "weapon" | "armor" | "trinket" | "consumable" | "material" | "gold" | "key"
  rarity?: ItemRarity
  description: string
  quantity?: number
  effect?: string
}

export interface TreasureContents {
  containerDescription: string
  contents: TreasureItem[]
  trapped: boolean
  trapDescription?: string
  lore?: string
}

export interface BossReward {
  trophy: {
    name: string
    description: string
    effect: string
  }
  equipment: {
    name: string
    type: "weapon" | "armor"
    subtype: string
    rarity: "rare" | "legendary"
    description: string
    stats: {
      attack?: number
      defense?: number
      health?: number
    }
    specialAbility?: string
  }
  lore: string
}

export interface DungeonThemedItem {
  name: string
  type: "weapon" | "armor" | "trinket" | "consumable" | "material"
  rarity: ItemRarity
  description: string
  themeConnection: string
  stats?: {
    attack?: number
    defense?: number
    health?: number
  }
  effect?: string
}

export interface DungeonThemedLoot {
  items: DungeonThemedItem[]
  setBonus?: {
    name: string
    pieces: string[]
    bonus: string
  }
}

// =============================================================================
// API CALLS
// =============================================================================

async function callDropsAPI<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/drops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || "Drop generation failed")
  }

  return response.json()
}

// =============================================================================
// MONSTER LORE
// =============================================================================

/**
 * Generate lore and special drops for a monster
 */
export async function generateMonsterLore(
  enemy: Enemy,
  floor: number = 1
): Promise<MonsterLore> {
  const isElite = enemy.name.includes("Elite") || enemy.name.includes("Champion")
  const isBoss = enemy.name.includes("Lord") || enemy.name.includes("King") ||
                 enemy.expReward > 100 || enemy.maxHealth > 150

  return callDropsAPI<MonsterLore>({
    action: "monster_lore",
    monster: {
      name: enemy.name,
      tier: enemy.monsterTier || Math.ceil(floor / 2),
      isElite,
      isBoss,
      weakness: enemy.weakness,
      resistance: enemy.resistance,
    },
    floor,
  })
}

/**
 * Apply monster lore to an enemy
 */
export function applyMonsterLore(enemy: Enemy, lore: MonsterLore): Enemy {
  return {
    ...enemy,
    lastWords: lore.lastWords,
    description: lore.lore.origin,
    aiGenerated: true,
  }
}

/**
 * Convert special drop to game Item
 */
export function specialDropToItem(drop: NonNullable<MonsterLore["specialDrop"]>): Item {
  const id = `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    id,
    name: drop.name,
    entityType: drop.type === "weapon" ? "weapon" : drop.type === "armor" ? "armor" : "item",
    type: drop.type === "weapon" ? "weapon" : drop.type === "armor" ? "armor" :
          drop.type === "consumable" ? "potion" : "misc",
    rarity: drop.rarity,
    description: drop.description,
    value: calculateDropValue(drop.rarity, drop.type),
    category: drop.type,
    aiGenerated: true,
    useText: drop.effect,
  }
}

// =============================================================================
// TREASURE GENERATION
// =============================================================================

export type TreasureType = "chest" | "sarcophagus" | "vault" | "hidden_cache" | "altar"
export type TreasureQuality = "common" | "rare" | "legendary"

/**
 * Generate contents for a treasure container
 */
export async function generateTreasureContents(
  type: TreasureType,
  quality: TreasureQuality = "common",
  floor: number = 1,
  locked: boolean = false
): Promise<TreasureContents> {
  return callDropsAPI<TreasureContents>({
    action: "treasure",
    treasure: { type, quality, locked },
    floor,
  })
}

/**
 * Convert treasure contents to game Items
 */
export function treasureToItems(contents: TreasureContents): Item[] {
  return contents.contents.map((item, index): Item => {
    const id = `treasure_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`

    if (item.type === "gold") {
      return {
        id,
        name: item.name,
        entityType: "item",
        type: "misc",
        rarity: "common" as const,
        description: item.description,
        value: item.quantity || 10,
        category: "currency" as Item["category"],
        aiGenerated: true,
      }
    }

    if (item.type === "key") {
      return {
        id,
        name: item.name,
        entityType: "item",
        type: "key",
        rarity: (item.rarity || "uncommon") as ItemRarity,
        description: item.description,
        value: 50,
        category: "key" as Item["category"],
        aiGenerated: true,
      }
    }

    const entityType = item.type === "weapon" ? "weapon" as const
      : item.type === "armor" ? "armor" as const
      : "item" as const
    const itemType = item.type === "weapon" ? "weapon" as const
      : item.type === "armor" ? "armor" as const
      : item.type === "consumable" ? "potion" as const
      : "misc" as const

    return {
      id,
      name: item.name,
      entityType,
      type: itemType,
      rarity: (item.rarity || "common") as ItemRarity,
      description: item.description,
      value: calculateDropValue(item.rarity || "common", item.type),
      category: item.type as Item["category"],
      aiGenerated: true,
      useText: item.effect,
    }
  })
}

// =============================================================================
// BOSS REWARDS
// =============================================================================

interface BossContext {
  name: string
  title?: string
  abilities?: string[]
}

/**
 * Generate unique rewards for defeating a boss
 */
export async function generateBossReward(
  boss: BossContext,
  floor: number = 1,
  playerClass?: string
): Promise<BossReward> {
  return callDropsAPI<BossReward>({
    action: "boss_reward",
    boss,
    floor,
    playerClass,
  })
}

/**
 * Convert boss reward to game Items
 */
export function bossRewardToItems(reward: BossReward): Item[] {
  const items: Item[] = []
  const timestamp = Date.now()

  // Trophy item
  items.push({
    id: `boss_trophy_${timestamp}`,
    name: reward.trophy.name,
    entityType: "item",
    type: "misc",
    rarity: "legendary",
    description: reward.trophy.description,
    value: 500,
    category: "trinket",
    aiGenerated: true,
    useText: reward.trophy.effect,
    lore: reward.lore,
  })

  // Equipment
  const equip = reward.equipment
  items.push({
    id: `boss_equip_${timestamp}`,
    name: equip.name,
    entityType: equip.type,
    type: equip.type,
    rarity: equip.rarity,
    description: equip.description,
    value: equip.rarity === "legendary" ? 400 : 200,
    category: equip.type,
    subtype: equip.subtype,
    stats: equip.stats,
    aiGenerated: true,
    useText: equip.specialAbility,
    lore: reward.lore,
  })

  return items
}

// =============================================================================
// DUNGEON THEMED LOOT
// =============================================================================

interface DungeonContext {
  name: string
  theme: string
  floor: number
}

/**
 * Generate loot themed to a specific dungeon
 */
export async function generateDungeonLoot(
  dungeon: DungeonContext,
  playerClass?: string
): Promise<DungeonThemedLoot> {
  return callDropsAPI<DungeonThemedLoot>({
    action: "dungeon_loot",
    dungeon,
    playerClass,
  })
}

/**
 * Convert dungeon loot to game Items
 */
export function dungeonLootToItems(loot: DungeonThemedLoot): Item[] {
  const timestamp = Date.now()

  return loot.items.map((item, index) => ({
    id: `dungeon_${timestamp}_${index}`,
    name: item.name,
    entityType: item.type === "weapon" ? "weapon" as const :
                item.type === "armor" ? "armor" as const : "item" as const,
    type: item.type === "weapon" ? "weapon" as const :
          item.type === "armor" ? "armor" as const :
          item.type === "consumable" ? "potion" as const : "misc" as const,
    rarity: item.rarity,
    description: item.description,
    value: calculateDropValue(item.rarity, item.type),
    category: item.type as Item["category"],
    stats: item.stats,
    aiGenerated: true,
    useText: item.effect,
    lore: item.themeConnection,
    // Mark set items
    setId: loot.setBonus?.pieces.includes(item.name) ? loot.setBonus.name : undefined,
  }))
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateDropValue(rarity: ItemRarity, type: string): number {
  const rarityMult: Record<ItemRarity, number> = {
    common: 1,
    uncommon: 2.5,
    rare: 6,
    legendary: 15,
  }
  const typeMult: Record<string, number> = {
    weapon: 25,
    armor: 30,
    trinket: 35,
    consumable: 15,
    material: 10,
    gold: 1,
    key: 50,
  }
  return Math.floor((typeMult[type] || 20) * rarityMult[rarity])
}

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Enhance an enemy with AI-generated lore
 * Call this when spawning elite/boss enemies
 */
export async function enhanceEnemyWithLore(
  enemy: Enemy,
  floor: number
): Promise<Enemy> {
  try {
    const lore = await generateMonsterLore(enemy, floor)
    const enhanced = applyMonsterLore(enemy, lore)

    // Add special drop to loot if generated
    if (lore.specialDrop && !enhanced.loot) {
      enhanced.loot = specialDropToItem(lore.specialDrop)
    }

    return enhanced
  } catch {
    // If AI fails, return original enemy
    return enemy
  }
}

/**
 * Generate themed loot for completing a floor
 * Call this when player clears a floor
 */
export async function generateFloorReward(
  dungeonName: string,
  dungeonTheme: string,
  floor: number,
  playerClass?: string
): Promise<Item[]> {
  try {
    const loot = await generateDungeonLoot(
      { name: dungeonName, theme: dungeonTheme, floor },
      playerClass
    )
    return dungeonLootToItems(loot)
  } catch {
    return [] // Silent fail, use regular loot system
  }
}

/**
 * Open a treasure container with AI-generated contents
 */
export async function openTreasureContainer(
  type: TreasureType,
  floor: number,
  isRare: boolean = false
): Promise<{ items: Item[]; trapped: boolean; trapDescription?: string; lore?: string }> {
  try {
    const quality: TreasureQuality = isRare ? "rare" : floor > 5 ? "rare" : "common"
    const contents = await generateTreasureContents(type, quality, floor)

    return {
      items: treasureToItems(contents),
      trapped: contents.trapped,
      trapDescription: contents.trapDescription,
      lore: contents.lore,
    }
  } catch {
    // Return empty on failure
    return { items: [], trapped: false }
  }
}

// =============================================================================
// AI ITEM IDENTIFICATION
// =============================================================================

export interface IdentifiedItem {
  trueName: string
  type: "weapon" | "armor" | "potion" | "misc" | "trinket" | "material"
  description: string
  lore: string
  effects?: Array<{ type: string; value?: number; description: string }>
  revealText: string
  warnings?: string[]
}

export interface UnknownItemInput {
  name: string
  appearance: string
  sourceContext: string
  sensoryDetails?: {
    smell?: string
    texture?: string
    sound?: string
    weight?: string
  }
  possibleUses?: string[]
  aiHints?: string[]
  rarity: string
}

/**
 * Identify an unknown item using AI
 */
export async function identifyUnknownItem(
  unknownItem: UnknownItemInput,
  identificationMethod: string,
  playerClass?: string,
  floor: number = 1
): Promise<IdentifiedItem | null> {
  try {
    const response = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unknownItem,
        identificationMethod,
        playerClass,
        floor,
      }),
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Convert identified item to game Item
 */
export function identifiedToItem(identified: IdentifiedItem, originalRarity: ItemRarity): Item {
  const id = `identified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    id,
    name: identified.trueName,
    entityType: identified.type === "weapon" ? "weapon" : identified.type === "armor" ? "armor" : "item",
    type: identified.type === "weapon" ? "weapon" : identified.type === "armor" ? "armor" :
          identified.type === "potion" ? "potion" : "misc",
    rarity: originalRarity,
    description: identified.description,
    lore: identified.lore,
    value: calculateDropValue(originalRarity, identified.type),
    category: identified.type as Item["category"],
    aiGenerated: true,
    useText: identified.effects?.[0]?.description,
  }
}

// =============================================================================
// AI NPC DIALOGUE
// =============================================================================

export interface NPCDialogueResponse {
  greeting: string
  dialogue: Array<{ text: string; emotion: string }>
  options: Array<{ text: string; tone: string; outcome: string }>
  secrets?: string[]
  questHook?: { available: boolean; hint?: string }
}

export interface NPCContext {
  dungeonName?: string
  dungeonTheme?: string
  floor: number
  playerClass?: string
  playerHealth?: number
  recentEvents?: string[]
}

/**
 * Generate AI dialogue for an NPC
 */
export async function generateNPCDialogue(
  npc: { name: string; role: string; personality: string; disposition: number },
  context: NPCContext,
  conversationHistory?: string[]
): Promise<NPCDialogueResponse | null> {
  try {
    const response = await fetch("/api/npc-dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npc,
        context,
        conversationHistory,
      }),
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

// =============================================================================
// BOSS REWARDS (uses existing generateBossReward + bossRewardToItems)
// =============================================================================

/**
 * Generate and convert boss rewards for a defeated boss
 * Call this when a boss is defeated
 */
export async function getBossVictoryRewards(
  bossName: string,
  bossTitle?: string,
  bossAbilities?: string[],
  floor: number = 1,
  playerClass?: string
): Promise<{ items: Item[]; lore: string } | null> {
  try {
    const reward = await generateBossReward(
      { name: bossName, title: bossTitle, abilities: bossAbilities },
      floor,
      playerClass
    )
    return {
      items: bossRewardToItems(reward),
      lore: reward.lore,
    }
  } catch {
    return null
  }
}

// =============================================================================
// LOOT CONTAINER / GACHA SYSTEM
// =============================================================================

export type LootContainerRarity = "common" | "uncommon" | "rare" | "epic" | "legendary"
export type LootContainerType = "chest" | "coffer" | "lockbox" | "urn" | "pouch" |
  "satchel" | "casket" | "reliquary" | "crate" | "barrel"

export interface LootContainer {
  id: string
  name: string
  type: LootContainerType
  rarity: LootContainerRarity
  appearance: string
  hints: {
    weight: string
    sound: string
    smell?: string
    aura?: string
  }
  locked: boolean
  lockDescription?: string
  cursed: boolean
  curseHint?: string
}

export interface ContainerExamineResult {
  detailedDescription: string
  qualityHint: "worthless" | "modest" | "valuable" | "precious" | "priceless"
  dangerWarning?: string
  loreFragment?: string
  anticipationText: string
}

export interface ContainerLootItem {
  name: string
  type: "weapon" | "armor" | "trinket" | "consumable" | "material" | "gold" | "gem" | "artifact" | "cursed"
  rarity: LootContainerRarity
  description: string
  value: number
  effect?: string
  isJackpot?: boolean
}

export interface ContainerOpenResult {
  openingNarrative: string
  revealMoment: string
  contents: ContainerLootItem[]
  jackpotMoment?: string
  curseTriggered?: boolean
  curseEffect?: string
  afterglow: string
}

/**
 * Generate a mysterious sealed loot container
 * Use opensSinceRare for pity system
 */
export async function generateLootContainer(
  floor: number = 1,
  dungeonTheme?: string,
  guaranteedRarity?: LootContainerRarity,
  opensSinceRare?: number
): Promise<LootContainer | null> {
  try {
    const response = await fetch("/api/loot-container", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        floor,
        dungeonTheme,
        guaranteedRarity,
        opensSinceRare,
      }),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Examine a container more closely (builds anticipation)
 */
export async function examineContainer(
  container: LootContainer
): Promise<ContainerExamineResult | null> {
  try {
    const response = await fetch("/api/loot-container", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "examine",
        container,
      }),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Open the container - THE BIG REVEAL
 */
export async function openContainer(
  container: LootContainer
): Promise<ContainerOpenResult | null> {
  try {
    const response = await fetch("/api/loot-container", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open",
        container,
      }),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Convert container loot to game Items
 */
export function containerLootToItems(loot: ContainerLootItem[]): Item[] {
  const timestamp = Date.now()
  return loot.map((item, index) => ({
    id: `loot_${timestamp}_${index}_${Math.random().toString(36).substr(2, 6)}`,
    name: item.name,
    entityType: item.type === "weapon" ? "weapon" as const :
                item.type === "armor" ? "armor" as const : "item" as const,
    type: item.type === "weapon" ? "weapon" as const :
          item.type === "armor" ? "armor" as const :
          item.type === "consumable" ? "potion" as const : "misc" as const,
    rarity: item.rarity === "epic" ? "legendary" as const : item.rarity as ItemRarity,
    description: item.description,
    value: item.value,
    category: item.type as Item["category"],
    aiGenerated: true,
    useText: item.effect,
    // Mark jackpot items
    lore: item.isJackpot ? "A truly exceptional find!" : undefined,
  }))
}

/**
 * Get rarity color class for UI
 */
export function getRarityColor(rarity: LootContainerRarity): string {
  switch (rarity) {
    case "legendary": return "text-amber-400"
    case "epic": return "text-purple-400"
    case "rare": return "text-blue-400"
    case "uncommon": return "text-green-400"
    default: return "text-zinc-400"
  }
}

/**
 * Get rarity glow class for UI effects
 */
export function getRarityGlow(rarity: LootContainerRarity): string {
  switch (rarity) {
    case "legendary": return "shadow-amber-500/50 animate-pulse"
    case "epic": return "shadow-purple-500/40"
    case "rare": return "shadow-blue-500/30"
    default: return ""
  }
}
