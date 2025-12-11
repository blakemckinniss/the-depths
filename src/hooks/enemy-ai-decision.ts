/**
 * Enemy AI Decision Module (LEGO Pattern)
 *
 * This module wraps the AI call for enemy turn decisions.
 * AI selects piece IDs from the LEGO registry, kernel resolves and executes.
 *
 * KEY INSIGHT: AI never outputs raw damage numbers or effect objects.
 * Instead, AI picks from predefined pieces and selects a power level.
 * The kernel resolves pieces to Effects and applies power scaling.
 *
 * NO FALLBACKS - AI failure propagates up, game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { LegoTurnDecision } from "@/lib/effects/effect-types"
import type { DamageType, EnemyAbility, CombatStance } from "@/lib/core/game-types"
import {
  legoTurnDecisionSchema,
  powerLevelSchema,
} from "@/lib/ai/ai-schemas"
import {
  getEnemyAttackPieces,
  getPieceManifest,
  calculateBudget,
} from "@/lib/lego"

// =============================================================================
// CONTEXT TYPE
// =============================================================================

export interface EnemyTurnContext {
  enemy: {
    id: string
    name: string
    health: number
    maxHealth: number
    attack: number
    defense: number
    abilities: EnemyAbility[]
    aiPattern: string
    weakness?: DamageType
    resistance?: DamageType
  }
  player: {
    health: number
    maxHealth: number
    defense: number
    stance: CombatStance
    stanceDefenseMod: number
    activeEffects: string[]
  }
  combatRound: number
  dungeonFloor: number
}

// =============================================================================
// LEGACY ZOD SCHEMA (deprecated, kept for reference)
// =============================================================================

/**
 * @deprecated Use legoEnemyActionSchema instead
 */
export const enemyActionSchema = z.object({
  action: z.enum(["basic_attack", "use_ability", "special"]),
  abilityName: z.string().optional().describe("Name of ability if using one"),
  damage: z.number().min(1).max(999).describe("Final damage after defense"),
  damageType: z.enum([
    "physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane"
  ]).optional(),
  applyEffect: z.object({
    name: z.string(),
    duration: z.number().min(1).max(10),
    type: z.enum(["buff", "debuff", "neutral"]),
    description: z.string(),
  }).optional().describe("Status effect to apply, if any"),
  narration: z.string().describe("1 sentence vivid combat narration"),
  reasoning: z.string().optional().describe("Why this action was chosen"),
})

// =============================================================================
// LEGO ENEMY ACTION SCHEMA
// =============================================================================

/**
 * New LEGO-based enemy action schema.
 * AI selects piece IDs, kernel resolves them to Effects.
 */
export const legoEnemyActionSchema = z.object({
  narration: z.string().max(200).describe("1 sentence vivid combat narration"),
  pieceIds: z.array(z.string()).min(1).max(3)
    .describe("1-3 LEGO piece IDs from the manifest below"),
  powerLevel: powerLevelSchema
    .describe("Attack intensity: light (glancing), medium (solid), heavy (devastating)"),
  reasoning: z.string().optional().describe("Brief tactical reasoning"),
})

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(budget: number, availablePieces: string): string {
  return `You are controlling an enemy in a dark fantasy dungeon crawler combat.
Your job is to select attack pieces from the LEGO registry based on the enemy's AI pattern.

## HOW THIS WORKS
You do NOT output damage numbers. Instead:
1. Select 1-3 piece IDs from the AVAILABLE PIECES list
2. Choose a power level (light/medium/heavy) based on the attack's intensity
3. Write vivid 1-sentence narration

The game kernel will:
- Resolve your piece IDs to actual damage effects
- Apply power level multiplier (light=0.6x, medium=1.0x, heavy=1.5x)
- Execute all effects on the player

## AI PATTERNS (how different enemies behave)
- "random": Use abilities randomly, pick pieces that match their damage type
- "smart": Tactical - use debuffs early, heavy attacks when player is low
- "ability_focused": Prefer elemental/special pieces over basic_strike
- "defensive_until_low": Light attacks until HP < 40%, then heavy

## POWER BUDGET
Your total piece cost must not exceed: ${budget}
Each piece has a cost (shown in parentheses). Sum of costs must be ≤ ${budget}.

## POWER LEVEL GUIDELINES
- light: Glancing blow, weak hit, testing attack (0.6x damage)
- medium: Solid hit, standard attack (1.0x damage)
- heavy: Devastating blow, critical strike (1.5x damage)

Use heavy sparingly - it's for when the enemy commits fully to an attack.

## AVAILABLE PIECES
${availablePieces}

## RULES
1. ONLY use piece IDs from the AVAILABLE PIECES list above
2. Total cost must not exceed budget (${budget})
3. Match pieces to enemy's damage type and abilities
4. Narration should be terse and visceral (1 sentence max)
5. Consider enemy AI pattern when choosing tactics
`
}

// =============================================================================
// MAIN DECISION FUNCTION (LEGO Pattern)
// =============================================================================

/**
 * AI decides the enemy's turn action using LEGO pieces.
 * Returns LegoTurnDecision with pieceIds for the kernel to resolve.
 */
export async function decideEnemyTurn(
  context: EnemyTurnContext
): Promise<LegoTurnDecision> {
  const { enemy, player, combatRound, dungeonFloor } = context

  // Calculate budget based on floor
  const budget = calculateBudget(dungeonFloor, "enemy")

  // Get available pieces for enemy combat
  const availablePieces = getEnemyAttackPieces(budget)
  const pieceManifest = getPieceManifest(availablePieces)

  // Build the prompt with combat context
  const prompt = buildEnemyTurnPrompt(context, budget)

  try {
    const result = await generateWithAI({
      schema: legoEnemyActionSchema,
      prompt,
      system: buildSystemPrompt(budget, pieceManifest),
      temperature: AI_CONFIG.temperature.balanced,
      useCache: false, // Combat decisions should not be cached
    })

    // Return as LegoTurnDecision (kernel will resolve pieceIds to Effects)
    return {
      narration: result.narration,
      pieceIds: result.pieceIds,
      powerLevel: result.powerLevel,
      metadata: {
        reasoning: result.reasoning,
      },
    }
  } catch (error) {
    console.error("Enemy AI decision failed:", error)
    throw error // NO FALLBACKS - AI failure propagates up, game fails visibly
  }
}

/**
 * @deprecated Use decideEnemyTurn instead
 */
export const decideEnemyTurnV2 = decideEnemyTurn

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function buildEnemyTurnPrompt(context: EnemyTurnContext, budget: number): string {
  const { enemy, player, combatRound, dungeonFloor } = context

  const enemyHealthPct = Math.round((enemy.health / enemy.maxHealth) * 100)
  const playerHealthPct = Math.round((player.health / player.maxHealth) * 100)

  // Suggest damage types based on enemy abilities
  const enemyDamageTypes = enemy.abilities
    .map(a => a.damageType || "physical")
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .join(", ")

  return `
COMBAT ROUND: ${combatRound}
DUNGEON FLOOR: ${dungeonFloor}
POWER BUDGET: ${budget}

ENEMY: ${enemy.name}
- Health: ${enemy.health}/${enemy.maxHealth} (${enemyHealthPct}%)
- Attack Power: ${enemy.attack}
- AI Pattern: ${enemy.aiPattern}
- Damage Types: ${enemyDamageTypes || "physical"}
${enemy.weakness ? `- Weakness: ${enemy.weakness}` : ""}
${enemy.resistance ? `- Resistance: ${enemy.resistance}` : ""}

PLAYER:
- Health: ${player.health}/${player.maxHealth} (${playerHealthPct}%)
- Defense: ${player.defense} (stance: ${player.stance})
- Active effects: ${player.activeEffects.join(", ") || "none"}

TACTICAL SITUATION:
- Enemy is ${enemyHealthPct > 70 ? "healthy" : enemyHealthPct > 40 ? "wounded" : "critical"}
- Player is ${playerHealthPct > 70 ? "healthy" : playerHealthPct > 40 ? "wounded" : "critical"}

Select pieces and power level for ${enemy.name}'s attack.
`.trim()
}

// =============================================================================
// HELPER: Validate damage is reasonable (legacy, for backwards compatibility)
// =============================================================================

/**
 * @deprecated Power scaling is now handled by the kernel via power levels
 */
export function validateEnemyDamage(
  proposedDamage: number,
  enemyAttack: number,
  playerDefense: number,
  stanceMod: number
): number {
  // Calculate expected damage range
  const minExpected = 1
  const maxExpected = Math.floor(enemyAttack * 2) // Cap at 2x enemy attack

  // Clamp to reasonable range
  const clamped = Math.max(minExpected, Math.min(maxExpected, proposedDamage))

  if (clamped !== proposedDamage) {
    console.warn(
      `Enemy damage clamped: ${proposedDamage} → ${clamped} (enemy attack: ${enemyAttack})`
    )
  }

  return clamped
}
