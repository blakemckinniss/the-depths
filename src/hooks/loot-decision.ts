/**
 * Loot Generation Decision Module
 *
 * AI-as-code pattern for loot drop generation.
 *
 * The loot mechanics (rarity tables, value calculations) are deterministic,
 * calculated by the kernel. AI decides:
 * - What items to generate
 * - Item descriptions and lore
 * - Special effects and bonuses
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, TurnDecision, NarrativeEffect } from "@/lib/effects"
import type { Item, ItemRarity, DamageType } from "@/lib/core/game-types"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type LootSource = "enemy" | "chest" | "boss" | "shrine" | "quest" | "floor_clear"

export interface LootGenerationContext {
  source: LootSource
  sourceName: string
  sourceLevel: number
  player: {
    class?: string
    level: number
  }
  floor: number
  dungeonTheme?: string
  guaranteedRarity?: ItemRarity
  itemCount?: number
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const lootItemSchema = z.object({
  name: z.string().describe("Item name"),
  type: z.enum(["weapon", "armor", "trinket", "consumable", "material"]),
  rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
  description: z.string().describe("Brief item description"),
  lore: z.string().optional().describe("Item backstory or origin"),
  stats: z.object({
    attack: z.number().optional(),
    defense: z.number().optional(),
    health: z.number().optional(),
  }).optional(),
  damageType: z.enum(["physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane"]).optional(),
  effect: z.string().optional().describe("Special effect description"),
})

const lootDropSchema = z.object({
  narration: z.string().describe("1-2 sentence loot discovery description"),
  items: z.array(lootItemSchema).describe("Items dropped"),
  goldAmount: z.number().min(0).describe("Gold dropped"),
  specialMoment: z.string().optional().describe("Extra narration for rare/legendary drops"),
})

const containerRevealSchema = z.object({
  openingNarration: z.string().describe("Description of opening the container"),
  revealMoment: z.string().describe("The big reveal of contents"),
  items: z.array(lootItemSchema).describe("Items found"),
  goldAmount: z.number().min(0),
  isCursed: z.boolean().describe("Whether container was cursed"),
  curseEffect: z.string().optional().describe("Description of curse if triggered"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate loot drops for an enemy kill or chest.
 * NO FALLBACKS - AI must succeed.
 */
export async function decideLootDrop(
  context: LootGenerationContext
): Promise<TurnDecision> {
  const systemPrompt = `You are generating loot for a dark fantasy dungeon crawler.
Create items that fit the source and dungeon theme.

ITEM TYPES:
- weapon: Attack-focused, has attack stat
- armor: Defense-focused, has defense stat
- trinket: Utility items with various stat bonuses
- consumable: One-use items (potions, scrolls)
- material: Crafting components

RARITY DISTRIBUTION (respect guaranteedRarity if provided):
- common: Basic items, simple descriptions
- uncommon: Slightly better, has minor effects
- rare: Powerful, has special properties
- legendary: Extremely powerful, unique abilities

RULES:
1. Match item themes to the source/dungeon
2. Higher floor = better stats
3. Boss/rare sources = better rarity
4. Class-appropriate items when possible
5. Dark fantasy tone - items have gritty histories
6. Gold amount scales with floor and source importance`

  const itemCount = context.itemCount || (context.source === "boss" ? 3 : context.source === "chest" ? 2 : 1)

  const prompt = `
LOOT CONTEXT:
- Source: ${context.source} (${context.sourceName})
- Source Level: ${context.sourceLevel}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"}
- Floor: ${context.floor}
- Theme: ${context.dungeonTheme || "generic dungeon"}
${context.guaranteedRarity ? `- Guaranteed Rarity: ${context.guaranteedRarity}` : ""}
- Item Count: ${itemCount}

Generate loot drop.`

  const result = await generateWithAI({
    schema: lootDropSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  const effects: Effect[] = []

  // Convert AI items to game Items and create add_item effects
  for (const aiItem of result.items) {
    const gameItem = aiItemToGameItem(aiItem)
    effects.push({
      effectType: "add_item",
      item: gameItem,
      source: context.source,
    })
  }

  // Add gold effect
  if (result.goldAmount > 0) {
    effects.push({
      effectType: "modify_gold",
      amount: result.goldAmount,
      source: context.source,
    })
  }

  // Add special moment narration
  if (result.specialMoment) {
    const specialEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.specialMoment,
      category: "lore",
      style: "dramatic",
    }
    effects.push(specialEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Generated ${result.items.length} items from ${context.source}`,
    },
  }
}

/**
 * Generate container opening reveal.
 * NO FALLBACKS - AI must succeed.
 */
export async function decideContainerReveal(
  context: LootGenerationContext & {
    containerType: string
    containerRarity: string
    isLocked: boolean
  }
): Promise<TurnDecision> {
  const systemPrompt = `You are narrating a loot container opening in a dark fantasy game.
Build anticipation and excitement, especially for rare finds.

CONTAINER TYPES affect tone:
- chest: Classic treasure, adventurous
- coffer: Valuable goods, merchant-like
- sarcophagus: Ancient, potentially cursed
- reliquary: Holy or unholy artifacts
- urn: Mysterious, could be ashes or gems

RULES:
1. Opening narration builds suspense
2. Reveal moment matches container rarity
3. Rare/legendary containers may be cursed (20% chance)
4. Curses should be interesting, not just "take damage"
5. Dark fantasy tone
6. Gold scales with container rarity`

  const prompt = `
CONTAINER OPENING:
- Container: ${context.containerType} (${context.containerRarity} rarity)
- Locked: ${context.isLocked}
- Floor: ${context.floor}
- Theme: ${context.dungeonTheme || "generic dungeon"}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"}

Generate container reveal.`

  const result = await generateWithAI({
    schema: containerRevealSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  const effects: Effect[] = []

  // Convert items
  for (const aiItem of result.items) {
    const gameItem = aiItemToGameItem(aiItem)
    effects.push({
      effectType: "add_item",
      item: gameItem,
      source: "container",
    })
  }

  // Gold
  if (result.goldAmount > 0) {
    effects.push({
      effectType: "modify_gold",
      amount: result.goldAmount,
      source: "container",
    })
  }

  // Curse effect
  if (result.isCursed && result.curseEffect) {
    const curseNarrative: NarrativeEffect = {
      effectType: "narrative",
      text: result.curseEffect,
      category: "combat",
      style: "warning",
    }
    effects.push(curseNarrative)
  }

  const fullNarration = `${result.openingNarration} ${result.revealMoment}`

  return {
    narration: fullNarration,
    effects,
    metadata: {
      reasoning: `Container reveal: ${result.items.length} items, ${result.goldAmount}g${result.isCursed ? ", CURSED" : ""}`,
    },
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function aiItemToGameItem(aiItem: z.infer<typeof lootItemSchema>): Item {
  const id = `loot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

  const entityType = aiItem.type === "weapon" ? "weapon" as const
    : aiItem.type === "armor" ? "armor" as const
    : "item" as const

  const itemType = aiItem.type === "weapon" ? "weapon" as const
    : aiItem.type === "armor" ? "armor" as const
    : aiItem.type === "consumable" ? "potion" as const
    : "misc" as const

  const value = calculateItemValue(aiItem.rarity as ItemRarity, aiItem.type)

  return {
    id,
    name: aiItem.name,
    entityType,
    type: itemType,
    rarity: aiItem.rarity as ItemRarity,
    description: aiItem.description,
    lore: aiItem.lore,
    value,
    category: aiItem.type as Item["category"],
    stats: aiItem.stats,
    damageType: aiItem.damageType as DamageType | undefined,
    useText: aiItem.effect,
    aiGenerated: true,
  }
}

function calculateItemValue(rarity: ItemRarity, type: string): number {
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
  }
  return Math.floor((typeMult[type] || 20) * rarityMult[rarity])
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideLoot(
  context: LootGenerationContext
): Promise<TurnDecision> {
  return decideLootDrop(context)
}

export async function decideContainerOpen(
  context: LootGenerationContext & {
    containerType: string
    containerRarity: string
    isLocked: boolean
  }
): Promise<TurnDecision> {
  return decideContainerReveal(context)
}
