/**
 * Environmental Interaction Decision Module (LEGO Pattern)
 *
 * AI-as-LEGO-composer pattern for environmental entity interactions.
 *
 * KEY INSIGHT: AI never outputs raw reward numbers.
 * Instead, AI selects reward tiers (none/small/medium/large).
 * The kernel resolves tiers to actual gold/healing/damage values.
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, NarrativeEffect } from "@/lib/effects"
import type { ItemRarity } from "@/lib/core/game-types"
import {
  REWARD_TIERS,
  resolveRewardTier,
  type RewardTier,
} from "@/lib/lego"

// Re-export for backwards compatibility
export { REWARD_TIERS, resolveRewardTier, type RewardTier }

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type EntityClass = "container" | "mechanism" | "hazard" | "secret" | "object" | "corpse" | "magical"
export type InteractionAction = "examine" | "open" | "touch" | "break" | "activate" | "search" | "loot" | "dispel"

export interface EnvironmentalInteractionContext {
  entity: {
    name: string
    entityClass: EntityClass
    description?: string
    interactionTags: string[]
  }
  interaction: {
    action: InteractionAction
    label: string
    dangerLevel?: "safe" | "risky" | "dangerous"
  }
  player: {
    class?: string
    level: number
    healthPercent: number
  }
  floor: number
  dungeonTheme?: string
  itemUsed?: string
  capabilityUsed?: string
}

export interface EnvironmentalDecisionResult {
  narration: string
  effects: Effect[]
  metadata: { reasoning: string }
  entityConsumed: boolean
  rewardTiers: {
    gold: RewardTier
    healing: RewardTier
    damage: RewardTier
    experience: RewardTier
  }
  newEntity?: {
    name: string
    entityClass: string
    description: string
    interactionTags: string[]
  }
  item?: {
    name: string
    type: "weapon" | "armor" | "potion" | "misc"
    rarity: ItemRarity
    description?: string
    lore?: string
  }
}

export interface ExplorationChoicesContext {
  floor: number
  room: number
  dungeonName?: string
  dungeonTheme?: string
  player: {
    class?: string
    level: number
    healthPercent: number
    hasPotion: boolean
  }
  entities: Array<{
    name: string
    entityClass: string
    interactionTags: string[]
  }>
  roomNarrative?: string
}

// =============================================================================
// LEGO SCHEMAS
// =============================================================================

const rewardTierSchema = z.enum(["none", "small", "medium", "large"])

const legoInteractionOutcomeSchema = z.object({
  narration: z.string().max(200).describe("1-2 sentence vivid description of what happens"),
  rewardTiers: z.object({
    gold: rewardTierSchema.describe("Gold tier: none=0, small=5-15, medium=20-50, large=75-150"),
    healing: rewardTierSchema.describe("Healing tier: none=0, small=5-10, medium=15-30, large=40-60"),
    damage: rewardTierSchema.describe("Damage tier: none=0, small=3-8, medium=10-20, large=25-40"),
    experience: rewardTierSchema.describe("XP tier: none=0, small=5-15, medium=20-40, large=50-100"),
  }),
  item: z.object({
    name: z.string(),
    type: z.enum(["weapon", "armor", "potion", "misc"]),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
    description: z.string().optional(),
    lore: z.string().optional(),
  }).optional().describe("Item found (optional)"),
  entityConsumed: z.boolean().describe("Whether the entity is used up"),
  companionReaction: z.string().optional().describe("Companion comment if party present"),
  newEntity: z.object({
    name: z.string(),
    entityClass: z.string(),
    description: z.string(),
    interactionTags: z.array(z.string()),
  }).optional().describe("New entity revealed by interaction"),
})

const explorationChoicesSchema = z.object({
  choices: z.array(z.object({
    id: z.string(),
    text: z.string().describe("Short action description"),
    type: z.enum(["explore", "interact", "investigate", "rest", "special"]),
    riskLevel: z.enum(["safe", "risky", "dangerous"]).optional(),
    hint: z.string().optional().describe("Subtle hint about outcome"),
    entityTarget: z.string().optional().describe("Entity this targets"),
  })).describe("Available exploration choices"),
  atmosphere: z.string().optional().describe("Brief atmospheric description"),
})

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildEnvironmentalSystemPrompt(): string {
  return `You are deciding outcomes for environmental interactions in a dark fantasy dungeon.
Players interact with objects, mechanisms, containers, and secrets.

## HOW THIS WORKS
You do NOT output raw reward numbers. Instead, select TIERS for each reward type.
The kernel resolves tiers to actual values with variance.

## REWARD TIERS
- Gold: none=0, small=5-15, medium=20-50, large=75-150
- Healing: none=0, small=5-10, medium=15-30, large=40-60
- Damage: none=0, small=3-8, medium=10-20, large=25-40
- Experience: none=0, small=5-15, medium=20-40, large=50-100

## ENTITY CLASSES AND TYPICAL OUTCOMES
- container: Usually gold/items (medium-large), may be trapped (damage)
- mechanism: Activates something, may have puzzle elements, low rewards
- hazard: Often damage (medium-large), skilled interaction can neutralize
- secret: Hidden treasures (large gold/items), XP for discovery
- object: General items, varied outcomes (small-medium)
- corpse: Loot from fallen (small-medium gold, possible items)
- magical: Arcane effects - healing OR damage, rarely both

## DANGER LEVELS AFFECT TIER SELECTION
- safe: Mostly small/medium rewards, no damage
- risky: Medium rewards, small-medium damage possible
- dangerous: Large rewards, medium-large damage likely

## RULES
1. Match tiers to danger level and entity class
2. Higher floor justifies larger tiers
3. Items used or capabilities applied should improve outcomes
4. Multiple reward types are fine but be reasonable
5. Dark fantasy tone - things can go wrong
6. Keep narration to 1-2 sentences`
}

// =============================================================================
// AI DECISION FUNCTIONS (LEGO Pattern)
// =============================================================================

/**
 * Generate environmental interaction outcome using tier selection.
 * Returns reward tiers for kernel to resolve.
 */
export async function decideEnvironmentalInteraction(
  context: EnvironmentalInteractionContext
): Promise<EnvironmentalDecisionResult> {
  const prompt = `
ENVIRONMENTAL INTERACTION:
- Entity: ${context.entity.name} (${context.entity.entityClass})
- Description: ${context.entity.description || "No description"}
- Tags: ${context.entity.interactionTags.join(", ")}
- Action: ${context.interaction.action} (${context.interaction.label})
- Danger: ${context.interaction.dangerLevel || "safe"}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP)
- Floor: ${context.floor}
${context.itemUsed ? `- Item Used: ${context.itemUsed}` : ""}
${context.capabilityUsed ? `- Capability Used: ${context.capabilityUsed}` : ""}
${context.dungeonTheme ? `- Theme: ${context.dungeonTheme}` : ""}

Select reward tiers and generate outcome.`.trim()

  const result = await generateWithAI({
    schema: legoInteractionOutcomeSchema,
    prompt,
    system: buildEnvironmentalSystemPrompt(),
    temperature: AI_CONFIG.temperature.balanced,
  })

  const effects: Effect[] = []

  // Add companion reaction as narrative (effects resolved by kernel from tiers)
  if (result.companionReaction) {
    const companionEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.companionReaction,
      category: "dialogue",
      style: "normal",
    }
    effects.push(companionEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Environmental interaction: ${context.interaction.action} on ${context.entity.name}`,
    },
    entityConsumed: result.entityConsumed,
    rewardTiers: result.rewardTiers,
    newEntity: result.newEntity,
    item: result.item,
  }
}

/**
 * Generate exploration choices for current room.
 * Pure choice generation - no LEGO mechanics needed.
 */
export async function decideExplorationChoices(
  context: ExplorationChoicesContext
): Promise<{ choices: Array<{ id: string; text: string; type: string; riskLevel?: string; hint?: string; entityTarget?: string }>; atmosphere?: string }> {
  const systemPrompt = `You are generating exploration choices in a dark fantasy dungeon.
Provide contextual actions the player can take based on the room and entities present.

CHOICE TYPES:
- explore: General room exploration
- interact: Direct entity interaction
- investigate: Careful examination
- rest: Recovery action if safe
- special: Unique situational choices

RULES:
1. Generate 2-4 relevant choices
2. At least one should be safe, one should be risky
3. Consider player health - low HP players get rest options
4. Reference actual entities in the room
5. Hints should be subtle, not spoilers
6. Dark fantasy tone`

  const prompt = `
EXPLORATION CONTEXT:
- Floor ${context.floor}, Room ${context.room}
- Dungeon: ${context.dungeonName || "Unknown"} (${context.dungeonTheme || "ancient"})
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP)
- Has Potion: ${context.player.hasPotion}
- Entities: ${context.entities.map(e => `${e.name} (${e.entityClass})`).join(", ") || "None"}
${context.roomNarrative ? `- Room: ${context.roomNarrative}` : ""}

Generate exploration choices.`

  const result = await generateWithAI({
    schema: explorationChoicesSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  return {
    choices: result.choices,
    atmosphere: result.atmosphere,
  }
}

// =============================================================================
// ITEM VALUE CALCULATION
// =============================================================================

/**
 * Calculate item value based on rarity and type.
 */
export function calculateItemValue(rarity: ItemRarity, type: string): number {
  const rarityMult: Record<ItemRarity, number> = {
    common: 1,
    uncommon: 2.5,
    rare: 6,
    legendary: 15,
  }
  const typeMult: Record<string, number> = {
    weapon: 25,
    armor: 30,
    potion: 15,
    misc: 10,
  }
  return Math.floor((typeMult[type] || 15) * rarityMult[rarity])
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideEnvironmental(
  context: EnvironmentalInteractionContext
): Promise<EnvironmentalDecisionResult> {
  return decideEnvironmentalInteraction(context)
}

export async function decideChoices(
  context: ExplorationChoicesContext
): Promise<{ choices: Array<{ id: string; text: string; type: string; riskLevel?: string; hint?: string; entityTarget?: string }>; atmosphere?: string }> {
  return decideExplorationChoices(context)
}
