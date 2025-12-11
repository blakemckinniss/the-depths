/**
 * NPC Interaction Decision Module
 *
 * AI-as-code pattern for NPC dialogue and choices.
 *
 * The NPC mechanics (trade costs, disposition changes) are deterministic,
 * calculated by the kernel. AI decides:
 * - Dialogue responses
 * - Reaction narration
 * - Bonus narrative effects
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { NPCTurnDecision } from "@/lib/effects"
import { dispositionChangeSchema } from "@/lib/ai/ai-schemas"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type NPCRole = "merchant" | "quest_giver" | "mysterious" | "trapped" | "hostile_neutral"
export type NPCAction = "talk" | "trade" | "help" | "attack" | "leave"

export interface NPCInteractionContext {
  player: {
    name: string
    class?: string
    level: number
    gold: number
  }
  npc: {
    id: string
    name: string
    role: NPCRole
    description?: string
    disposition: number
    personality?: string
    hasInventory: boolean
    questId?: string
  }
  action: NPCAction
  actionContext?: {
    itemName?: string
    itemCost?: number
    goldReward?: number
    tradedSuccessfully?: boolean
    helpedSuccessfully?: boolean
  }
  floor: number
  dungeonTheme?: string
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const npcDialogueSchema = z.object({
  dialogue: z.string().describe("1-2 sentence NPC dialogue in character"),
  tone: z.enum(["friendly", "neutral", "suspicious", "hostile", "fearful", "grateful"]).describe("NPC's emotional tone"),
  hint: z.string().optional().describe("Subtle hint about dungeon secrets or dangers"),
})

const npcReactionSchema = z.object({
  narration: z.string().describe("1-2 sentence description of NPC reaction"),
  dialogue: z.string().optional().describe("Short NPC response if appropriate"),
  dispositionChange: dispositionChangeSchema.nullish()
    .describe("Magnitude: slight (±5), moderate (±15), significant (±30)"),
  dispositionDirection: z.enum(["positive", "negative"]).nullish()
    .describe("Whether disposition improves or worsens"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate NPC dialogue for talk action.
 */
export async function decideNPCDialogue(
  context: NPCInteractionContext
): Promise<NPCTurnDecision> {
  const systemPrompt = `You are voicing an NPC in a dark fantasy dungeon crawler.
Write dialogue that matches the NPC's role and personality.

NPC ROLES:
- merchant: Greedy but practical, focused on trade
- quest_giver: Cryptic, knowledgeable, offer missions
- mysterious: Enigmatic, speak in riddles, know secrets
- trapped: Desperate, grateful for help, fearful
- hostile_neutral: Suspicious, threatening, might attack

RULES:
1. Stay in character for the NPC's role and personality
2. Reference the dungeon setting naturally
3. Disposition affects tone (-100 hostile, 0 neutral, +100 friendly)
4. Keep dialogue to 1-2 sentences
5. Dark fantasy tone - gritty, dangerous world
6. Merchants mention wares, trapped NPCs plead, mysterious NPCs hint at secrets`

  const prompt = `
NPC ENCOUNTER:
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.gold}g)
- NPC: ${context.npc.name} (${context.npc.role})
- Description: ${context.npc.description || "A dungeon denizen"}
- Personality: ${context.npc.personality || "Unknown"}
- Disposition: ${context.npc.disposition} (${context.npc.disposition < -30 ? "hostile" : context.npc.disposition > 30 ? "friendly" : "neutral"})
- Has Inventory: ${context.npc.hasInventory ? "Yes" : "No"}
- Floor: ${context.floor}

Generate dialogue for when the player talks to this NPC.`

  const result = await generateWithAI({
    schema: npcDialogueSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  // Combine dialogue with hint if present (hint becomes subtle lore)
  const fullNarration = result.hint
    ? `${result.dialogue}\n\n*${result.hint}*`
    : result.dialogue

  return {
    narration: fullNarration,
    metadata: {
      reasoning: `NPC dialogue: ${result.tone} tone`,
    },
  }
}

/**
 * Generate NPC reaction for non-talk actions.
 */
export async function decideNPCReaction(
  context: NPCInteractionContext
): Promise<NPCTurnDecision> {
  const systemPrompt = `You are narrating NPC reactions in a dark fantasy dungeon crawler.
Write brief reactions that match the NPC's personality and the action taken.

ACTIONS AND EXPECTED REACTIONS:
- trade: Merchant reaction to purchase (satisfied, disappointed if can't afford)
- help: Trapped NPC's gratitude or desperation
- attack: NPC's surprise and fear/anger
- leave: Brief farewell appropriate to disposition

RULES:
1. Keep reactions to 1-2 sentences
2. Match tone to NPC's disposition and the action
3. Dark fantasy tone
4. Disposition change should reflect the action's impact`

  const actionDesc = context.action === "trade"
    ? context.actionContext?.tradedSuccessfully ? "successful trade" : "failed trade (can't afford)"
    : context.action === "help"
    ? "player helped them"
    : context.action === "attack"
    ? "player attacked them"
    : "player leaving"

  const prompt = `
NPC REACTION:
- NPC: ${context.npc.name} (${context.npc.role}, disposition ${context.npc.disposition})
- Personality: ${context.npc.personality || "Unknown"}
- Action: ${context.action} - ${actionDesc}
${context.actionContext?.itemName ? `- Item: ${context.actionContext.itemName}` : ""}
${context.actionContext?.goldReward ? `- Gold Reward: ${context.actionContext.goldReward}` : ""}

Generate NPC reaction.`

  const result = await generateWithAI({
    schema: npcReactionSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  // Combine narration with dialogue if present
  const fullNarration = result.dialogue
    ? `${result.narration} "${result.dialogue}"`
    : result.narration

  const directionSymbol = result.dispositionDirection === "positive" ? "+" : "-"

  return {
    narration: fullNarration,
    dispositionChange: result.dispositionChange ?? undefined,
    dispositionDirection: result.dispositionDirection ?? undefined,
    metadata: {
      reasoning: `NPC reaction to ${context.action} (disposition ${directionSymbol}${result.dispositionChange ?? "none"})`,
    },
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideNPCAction(
  context: NPCInteractionContext
): Promise<NPCTurnDecision> {
  if (context.action === "talk") {
    return decideNPCDialogue(context)
  }
  return decideNPCReaction(context)
}
