/**
 * Trap Interaction Decision Module
 *
 * AI-as-code pattern for trap encounters.
 *
 * The trap mechanics (disarm chance, damage calculation) are deterministic,
 * calculated by the kernel. AI decides:
 * - Narration for the interaction
 * - Outcome description based on action result
 * - Bonus narrative effects
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, TurnDecision, NarrativeEffect } from "@/lib/effects"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type TrapType = "damage" | "poison" | "curse" | "teleport" | "alarm"
export type TrapAction = "disarm" | "trigger" | "avoid"
export type TrapOutcome = "success" | "failure" | "partial"

export interface TrapInteractionContext {
  player: {
    name: string
    class?: string
    level: number
    health: number
    maxHealth: number
    dexterity: number
  }
  trap: {
    id: string
    name: string
    trapType: TrapType
    description?: string
    damage?: number
    disarmDC: number
    hidden: boolean
  }
  action: TrapAction
  outcome: TrapOutcome
  damageDealt?: number
  effectApplied?: string
  floor: number
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const trapOutcomeSchema = z.object({
  narration: z.string().describe("1-2 sentence vivid trap interaction description"),
  outcomeDetail: z.string().optional().describe("Additional detail about the outcome"),
  playerReaction: z.string().optional().describe("Brief description of player's reaction"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate narration for trap interaction.
 * Outcome is already determined by kernel - AI just provides flavor.
 */
export async function decideTrapNarration(
  context: TrapInteractionContext
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy narrator for trap encounters.
Write vivid, tense descriptions of trap interactions.

TRAP TYPES AND THEIR NATURE:
- damage: Physical traps (spikes, blades, crushing stones)
- poison: Chemical/biological traps (gas, darts, spores)
- curse: Magical traps (runes, ward stones, cursed mechanisms)
- teleport: Spatial traps (portals, displacement fields)
- alarm: Alert traps (bells, magical signals, summoning circles)

OUTCOMES:
- success: Player overcomes the trap (disarmed, avoided safely)
- failure: Trap triggers fully, player takes consequences
- partial: Mixed result (avoided but clipped, partial trigger)

RULES:
1. Match description intensity to damage dealt
2. Reference the trap mechanism visually
3. Be visceral for damage, clever for disarms
4. Never exceed 2 sentences
5. Dark fantasy tone - traps are ancient, deadly, unforgiving`

  const outcomeDesc = context.outcome === "success"
    ? "successfully"
    : context.outcome === "failure"
    ? "failed - trap triggered"
    : "partially avoided"

  const prompt = `
TRAP ENCOUNTER:
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.health}/${context.player.maxHealth} HP)
- Trap: ${context.trap.name} (${context.trap.trapType} type, DC ${context.trap.disarmDC})
- Description: ${context.trap.description || "A deadly trap"}
- Hidden: ${context.trap.hidden ? "Yes - player spotted it" : "No - visible"}
- Action: ${context.action}
- Outcome: ${outcomeDesc}
${context.damageDealt ? `- Damage Dealt: ${context.damageDealt}` : ""}
${context.effectApplied ? `- Effect Applied: ${context.effectApplied}` : ""}
- Floor: ${context.floor}

Write trap interaction narration.`

  const result = await generateWithAI({
    schema: trapOutcomeSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  // Add narrative effects for additional detail
  if (result.outcomeDetail) {
    const detailEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.outcomeDetail,
      category: "exploration",
      style: context.outcome === "failure" ? "warning" : "normal",
    }
    effects.push(detailEffect)
  }

  if (result.playerReaction) {
    const reactionEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.playerReaction,
      category: "exploration",
      style: "whisper",
    }
    effects.push(reactionEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Trap ${context.action}: ${context.outcome}`,
    },
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideTrapAction(
  context: TrapInteractionContext
): Promise<TurnDecision> {
  return decideTrapNarration(context)
}
