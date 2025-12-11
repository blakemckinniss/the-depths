/**
 * Shrine Interaction Decision Module (LEGO Pattern)
 *
 * AI-as-code pattern for shrine interactions.
 *
 * KEY INSIGHT: AI never outputs raw stat numbers for blessings/curses.
 * Instead, AI selects:
 * - outcome: blessing | curse | nothing | mixed
 * - tier: minor | standard | major
 *
 * The kernel looks up stat values from BLESSING_TIERS / CURSE_TIERS.
 * This ensures AI cannot grant broken blessings or unfair curses.
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { ShrineTurnDecision } from "@/lib/effects/effect-types"
import {
  shrineTurnDecisionSchema,
  blessingTierSchema,
  curseTierSchema,
} from "@/lib/ai/ai-schemas"
import {
  BLESSING_TIERS,
  CURSE_TIERS,
  REWARD_TIERS,
  getShrineBlessingPieces,
  getShrineCursePieces,
  getPieceManifest,
  resolveRewardTier,
  type RewardTier,
} from "@/lib/lego"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type ShrineType = "health" | "power" | "fortune" | "dark" | "unknown"
export type ShrineAction = "accept" | "decline" | "desecrate" | "seek_blessing"

export interface ShrineInteractionContext {
  player: {
    name: string
    class?: string
    level: number
    health: number
    maxHealth: number
    gold: number
  }
  shrine: {
    id: string
    name: string
    shrineType: ShrineType
    description?: string
    cost?: { health?: number; gold?: number }
    riskLevel: "safe" | "moderate" | "dangerous" | "deadly"
  }
  action: ShrineAction
  canAfford: boolean
  dungeonTheme?: string
  floor: number
}

// =============================================================================
// LEGO SHRINE SCHEMA
// =============================================================================

const rewardTierSchema = z.enum(["none", "small", "medium", "large"])

/**
 * LEGO-based shrine outcome schema.
 * AI selects outcome type and tier, kernel resolves to actual stat values.
 */
export const legoShrineOutcomeSchema = z.object({
  narration: z.string().max(300)
    .describe("1-3 sentence vivid shrine interaction description"),
  outcome: z.enum(["blessing", "curse", "nothing", "mixed"])
    .describe("The result of the interaction"),
  blessingTier: blessingTierSchema.nullish()
    .describe("If blessing: minor (+2/+1), standard (+4/+3), major (+7/+5)"),
  curseTier: curseTierSchema.nullish()
    .describe("If curse: minor (-2/-1), standard (-4/-3), major (-7/-5)"),
  healTier: rewardTierSchema.nullish()
    .describe("Optional healing: none=0, small=5-15, medium=20-40, large=50-80"),
  goldTier: rewardTierSchema.nullish()
    .describe("Optional gold: none=0, small=5-15, medium=20-50, large=75-150"),
  pieceIds: z.array(z.string()).max(2).nullish()
    .describe("Optional 0-2 additional effect pieces from manifest"),
})

const shrineDeclineSchema = z.object({
  narration: z.string().describe("1 sentence description of leaving the shrine"),
})

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(
  blessingPieces: string,
  cursePieces: string
): string {
  return `You are a dark fantasy narrator and game master for shrine interactions.
Decide the outcome of shrine interactions based on shrine type and player action.

## HOW THIS WORKS
You do NOT output raw stat numbers. Instead:
1. Choose an outcome: blessing, curse, nothing, or mixed
2. If blessing, select a tier: minor, standard, or major
3. If curse, select a tier: minor, standard, or major
4. Optionally select heal/gold TIERS (not amounts): none, small, medium, large
5. Optionally select 0-2 additional piece IDs for special effects

The kernel resolves all tiers to actual values:
- Blessing tiers: minor (+2 att/+1 def), standard (+4/+3), major (+7/+5)
- Curse tiers: minor (-2/-1), standard (-4/-3), major (-7/-5)
- Heal tiers: none=0, small=5-15, medium=20-40, large=50-80
- Gold tiers: none=0, small=5-15, medium=20-50, large=75-150

## SHRINE TYPES AND NATURE
- health: Healing shrines, generally safe, grant regeneration or restoration
- power: Combat shrines, grant attack bonuses but may demand sacrifice
- fortune: Luck shrines, grant gold/exp bonuses, unpredictable
- dark: Dangerous shrines, high risk/reward, may curse or empower
- unknown: Mystery shrines, completely unpredictable outcomes

## ACTIONS
- accept: Make the offering, receive standard blessing for shrine type
- desecrate: Defile the shrine (only for dark shrines), very risky
- seek_blessing: Attempt deeper communion, moderate risk for greater reward

## RISK LEVELS AFFECT OUTCOME PROBABILITIES
- safe: 90% blessing, 10% nothing
- moderate: 70% blessing, 20% mixed, 10% curse
- dangerous: 50% blessing, 30% curse, 20% nothing
- deadly: 30% blessing, 50% curse, 20% mixed

## TIER SELECTION GUIDELINES
- minor: Common outcome, low-power shrine, first interaction
- standard: Typical outcome for moderate shrines, worthy offerings
- major: Rare, reserved for dangerous shrines with significant risk

## AVAILABLE BLESSING PIECES (optional extras)
${blessingPieces}

## AVAILABLE CURSE PIECES (optional extras)
${cursePieces}

## RULES
1. Match blessing tier to shrine risk (safe=minor, dangerous=major)
2. Curses should be thematic to the shrine type
3. healTier and goldTier are OPTIONAL bonuses (select none if not applicable)
4. pieceIds are OPTIONAL for special effects
5. Be vivid but concise in narration
6. Dark fantasy tone - shrines are ancient, mysterious, potentially dangerous
`
}

// =============================================================================
// MAIN DECISION FUNCTION (LEGO Pattern)
// =============================================================================

/**
 * Generate shrine interaction outcome using LEGO tier selection.
 * AI selects outcome type and tier, kernel resolves to stat values.
 */
export async function decideShrineInteraction(
  context: ShrineInteractionContext
): Promise<ShrineTurnDecision> {
  // Decline is simple - just narration
  if (context.action === "decline") {
    const result = await generateWithAI({
      schema: shrineDeclineSchema,
      prompt: `Player ${context.player.class || "Adventurer"} leaves ${context.shrine.name} (${context.shrine.shrineType} shrine) without interacting. Write brief departure.`,
      system: "You are a dark fantasy narrator. Write brief, atmospheric descriptions. One sentence max.",
      temperature: AI_CONFIG.temperature.narrative,
    })

    return {
      narration: result.narration,
      outcome: "nothing",
      metadata: { reasoning: "Player declined shrine" },
    }
  }

  // Cannot afford - kernel should catch this, but handle gracefully
  if (!context.canAfford && context.action === "accept") {
    return {
      narration: "You cannot afford this offering. The shrine's power remains beyond your reach.",
      outcome: "nothing",
      metadata: { reasoning: "Cannot afford shrine cost" },
    }
  }

  // Get available pieces for shrine effects
  const blessingPieces = getPieceManifest(getShrineBlessingPieces())
  const cursePieces = getPieceManifest(getShrineCursePieces())

  const prompt = buildShrinePrompt(context)

  const result = await generateWithAI({
    schema: legoShrineOutcomeSchema,
    prompt,
    system: buildSystemPrompt(blessingPieces, cursePieces),
    temperature: AI_CONFIG.temperature.balanced,
  })

  // Return as ShrineTurnDecision (kernel will resolve tiers to Effects)
  return {
    narration: result.narration,
    outcome: result.outcome,
    blessingTier: result.blessingTier ?? undefined,
    curseTier: result.curseTier ?? undefined,
    healTier: result.healTier ?? undefined,
    goldTier: result.goldTier ?? undefined,
    pieceIds: result.pieceIds ?? undefined,
    metadata: {
      reasoning: `Shrine ${context.action}: ${result.outcome}`,
    },
  }
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function buildShrinePrompt(context: ShrineInteractionContext): string {
  const { player, shrine, action, floor } = context

  const playerHealthPct = Math.round((player.health / player.maxHealth) * 100)

  return `
SHRINE INTERACTION:
- Player: Level ${player.level} ${player.class || "Adventurer"} (${player.health}/${player.maxHealth} HP = ${playerHealthPct}%, ${player.gold}g)
- Shrine: ${shrine.name} (${shrine.shrineType} type, ${shrine.riskLevel} risk)
- Description: ${shrine.description || "An ancient shrine of unknown origin"}
- Action: ${action}
- Floor: ${floor}
${shrine.cost?.gold ? `- Gold Cost: ${shrine.cost.gold}` : ""}
${shrine.cost?.health ? `- Health Cost: ${shrine.cost.health}` : ""}

Determine the outcome, select appropriate tiers, and write narration.
`.trim()
}

// =============================================================================
// EXPORTS (backwards compatibility)
// =============================================================================

export async function decideShrineAction(
  context: ShrineInteractionContext
): Promise<ShrineTurnDecision> {
  return decideShrineInteraction(context)
}

// =============================================================================
// TIER LOOKUP HELPERS (for kernel use)
// =============================================================================

/**
 * Get stat bonuses for a blessing tier.
 * Used by kernel when applying shrine effects.
 */
export function getBlessingStats(tier: "minor" | "standard" | "major") {
  return BLESSING_TIERS[tier]
}

/**
 * Get stat penalties for a curse tier.
 * Used by kernel when applying shrine effects.
 */
export function getCurseStats(tier: "minor" | "standard" | "major") {
  return CURSE_TIERS[tier]
}
