/**
 * AI Decision Layer
 *
 * Clean interface between game logic and AI model.
 * Hides prompt construction, model calls, and response parsing.
 *
 * Usage:
 *   const decision = await decideTurn(state, command)
 *   const newState = applyEffects(state, decision.effects)
 */

import { z } from "zod"
import { generateWithAI, buildSystemPrompt, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { GameState, CombatStance, DamageType } from "@/lib/core/game-types"
import type { Effect, TurnDecision, DecisionContext } from "./effect-types"

// =============================================================================
// ZOD SCHEMAS FOR AI OUTPUT
// =============================================================================

/**
 * Effect schema for AI output validation.
 * This is the contract the AI must follow.
 */
const effectTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("player") }),
  z.object({ type: z.literal("enemy") }),
  z.object({ type: z.literal("companion"), id: z.string() }),
])

const damageTypeSchema = z.enum([
  "physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane",
])

const effectSchema = z.discriminatedUnion("effectType", [
  // Damage
  z.object({
    effectType: z.literal("damage"),
    target: effectTargetSchema,
    amount: z.number().min(1).max(999),
    damageType: damageTypeSchema.optional(),
    source: z.string(),
    canKill: z.boolean().optional(),
  }),
  // Heal
  z.object({
    effectType: z.literal("heal"),
    target: effectTargetSchema,
    amount: z.number().min(1).max(999),
    source: z.string(),
  }),
  // Gold
  z.object({
    effectType: z.literal("modify_gold"),
    amount: z.number().min(-9999).max(9999),
    source: z.string(),
  }),
  // Experience
  z.object({
    effectType: z.literal("modify_experience"),
    amount: z.number().min(0).max(9999),
    source: z.string(),
  }),
  // Status effect
  z.object({
    effectType: z.literal("apply_status"),
    target: effectTargetSchema,
    status: z.object({
      id: z.string(),
      name: z.string(),
      entityType: z.literal("effect"),
      effectType: z.enum(["buff", "debuff", "neutral"]),
      duration: z.number().min(-1).max(20),
      description: z.string().optional(),
      modifiers: z.object({
        attack: z.number().optional(),
        defense: z.number().optional(),
        maxHealth: z.number().optional(),
        healthRegen: z.number().optional(),
        critChance: z.number().optional(),
        dodgeChance: z.number().optional(),
        damageMultiplier: z.number().optional(),
      }).optional(),
    }),
  }),
  // Damage enemy (shorthand)
  z.object({
    effectType: z.literal("damage_enemy"),
    amount: z.number().min(1).max(999),
    damageType: damageTypeSchema.optional(),
    source: z.string(),
  }),
  // End combat
  z.object({
    effectType: z.literal("end_combat"),
    result: z.enum(["victory", "flee", "death"]),
  }),
  // Stance
  z.object({
    effectType: z.literal("set_stance"),
    stance: z.enum(["balanced", "aggressive", "defensive"]),
  }),
  // Narrative (for flavor text)
  z.object({
    effectType: z.literal("narrative"),
    text: z.string(),
    category: z.enum(["combat", "exploration", "dialogue", "system", "lore"]),
    style: z.enum(["normal", "dramatic", "whisper", "warning"]).optional(),
  }),
])

const turnDecisionSchema = z.object({
  narration: z.string().describe("1-2 sentence vivid description of what happens"),
  effects: z.array(effectSchema).describe("List of game effects to apply"),
  metadata: z.object({
    reasoning: z.string().optional(),
  }).optional(),
})

// =============================================================================
// CONTEXT BUILDERS
// =============================================================================

/**
 * Build a compressed view of game state for AI consumption.
 * Filters to relevant info to save tokens.
 */
function buildDecisionContext(state: GameState): DecisionContext {
  const context: DecisionContext = {
    player: {
      health: state.player.stats.health,
      maxHealth: state.player.stats.maxHealth,
      attack: state.player.stats.attack,
      defense: state.player.stats.defense,
      level: state.player.stats.level,
      class: state.player.class ?? undefined,
      race: state.player.race ?? undefined,
      stance: state.player.stance,
      gold: state.player.stats.gold,
      activeEffects: state.player.activeEffects.map(e => e.name),
      abilities: state.player.abilities.map(a => a.name),
    },
    environment: {
      dungeonTheme: state.currentDungeon?.theme || "unknown",
      floor: state.floor,
      room: state.currentRoom,
      hazards: state.currentHazard ? [state.currentHazard.name] : [],
    },
    recentEvents: state.eventHistory.slice(-5).map(e => e.type),
  }

  // Add combat context if in combat
  if (state.inCombat && state.currentEnemy) {
    context.combat = {
      enemy: {
        name: state.currentEnemy.name,
        health: state.currentEnemy.health,
        maxHealth: state.currentEnemy.maxHealth,
        attack: state.currentEnemy.attack,
        defense: state.currentEnemy.defense,
        weakness: state.currentEnemy.weakness,
        resistance: state.currentEnemy.resistance,
        abilities: state.currentEnemy.abilities?.map(a => a.name) || [],
      },
      round: state.combatRound || 1,
      playerAdvantage: state.player.stats.health / state.player.stats.maxHealth >
        state.currentEnemy.health / state.currentEnemy.maxHealth,
    }
  }

  return context
}

/**
 * Build the system prompt for decision making.
 */
function buildDecisionSystemPrompt(decisionType: string): string {
  const base = `You are a dark fantasy dungeon master making game decisions.
Your role is to decide what happens next and express it as a list of game effects.

CRITICAL RULES:
1. Output valid effects that the game engine can process
2. Keep narration terse and visceral (1-2 sentences max)
3. Respect game balance - don't give excessive rewards or damage
4. Be consistent with the dark fantasy tone

AVAILABLE EFFECTS:
- damage: Deal damage to player/enemy/companion
- heal: Restore health
- modify_gold: Add/remove gold
- apply_status: Apply buff/debuff
- damage_enemy: Shorthand for damaging current enemy
- end_combat: End the current combat
- set_stance: Change combat stance
- narrative: Add flavor text to the log

DAMAGE TYPES: physical, fire, ice, lightning, shadow, holy, poison, arcane
`

  const typeSpecific: Record<string, string> = {
    enemy_turn: `
CONTEXT: It's the enemy's turn in combat.
Decide what the enemy does: basic attack, use an ability, or special action.
Output the appropriate damage effect and narration.
Consider: enemy health, player health, enemy abilities, combat momentum.
`,
    player_attack: `
CONTEXT: The player is attacking.
The damage has already been calculated by the engine.
Your job is to provide vivid narration for the attack.
Do NOT add extra damage effects - just narration.
`,
    shrine_interaction: `
CONTEXT: Player is interacting with a shrine.
Decide the outcome: blessing, curse, or nothing.
Blessings should apply positive status effects.
Curses should apply negative effects but not be instantly lethal.
`,
    trap_trigger: `
CONTEXT: A trap has been triggered.
Decide the damage and any status effects.
Consider: trap type, player stats, dungeon difficulty.
`,
    loot_decision: `
CONTEXT: Deciding what loot to generate.
This is a meta-decision about item type and rarity.
Consider: player class, equipment gaps, floor level, source type.
`,
  }

  return base + (typeSpecific[decisionType] || "")
}

// =============================================================================
// MAIN API
// =============================================================================

export type DecisionType =
  | "enemy_turn"
  | "player_attack"
  | "shrine_interaction"
  | "trap_trigger"
  | "loot_decision"
  | "npc_response"
  | "room_event"

interface DecideOptions {
  state: GameState
  decisionType: DecisionType
  additionalContext?: Record<string, unknown>
  temperature?: number
}

/**
 * Main entry point for AI decisions.
 * Takes game state + decision type, returns effects to apply.
 */
export async function decide(options: DecideOptions): Promise<TurnDecision> {
  const {
    state,
    decisionType,
    additionalContext = {},
    temperature = AI_CONFIG.temperature.balanced,
  } = options

  const context = buildDecisionContext(state)
  const systemPrompt = buildDecisionSystemPrompt(decisionType)

  const prompt = `
GAME CONTEXT:
${JSON.stringify(context, null, 2)}

ADDITIONAL CONTEXT:
${JSON.stringify(additionalContext, null, 2)}

DECISION TYPE: ${decisionType}

Provide your decision as a TurnDecision with narration and effects.
`

  // NO FALLBACK: If AI fails, the error propagates up.
  // This is intentional - AI-as-code means AI is required, not optional.
  const result = await generateWithAI({
    schema: turnDecisionSchema,
    prompt,
    system: systemPrompt,
    temperature,
    useCache: false, // Decisions should not be cached
  })

  return {
    narration: result.narration,
    effects: result.effects as Effect[],
    metadata: result.metadata,
  }
}

// =============================================================================
// SPECIALIZED DECISION FUNCTIONS
// =============================================================================

/**
 * Decide enemy's turn in combat.
 */
export async function decideEnemyTurn(
  state: GameState,
): Promise<TurnDecision> {
  if (!state.currentEnemy) {
    return {
      narration: "",
      effects: [],
    }
  }

  return decide({
    state,
    decisionType: "enemy_turn",
    additionalContext: {
      enemyAbilities: state.currentEnemy.abilities,
      enemyAiPattern: state.currentEnemy.aiPattern,
    },
  })
}

/**
 * Generate narration for player's attack (damage already calculated).
 */
export async function narratePlayerAttack(
  state: GameState,
  damage: number,
  damageType?: DamageType,
  isCritical?: boolean,
): Promise<TurnDecision> {
  return decide({
    state,
    decisionType: "player_attack",
    additionalContext: {
      damageDealt: damage,
      damageType,
      isCritical,
      weaponName: state.player.equipment.mainHand?.name,
    },
    temperature: AI_CONFIG.temperature.narrative,
  })
}

/**
 * Decide shrine interaction outcome.
 */
export async function decideShrineOutcome(
  state: GameState,
  shrineType: string,
  offering?: string,
): Promise<TurnDecision> {
  return decide({
    state,
    decisionType: "shrine_interaction",
    additionalContext: {
      shrineType,
      offering,
      playerPiety: state.player.activeEffects.filter(
        e => e.sourceType === "shrine"
      ).length,
    },
    temperature: AI_CONFIG.temperature.creative,
  })
}

/**
 * Decide trap effect when triggered.
 */
export async function decideTrapEffect(
  state: GameState,
  trapType: string,
  disarmAttempted: boolean,
): Promise<TurnDecision> {
  return decide({
    state,
    decisionType: "trap_trigger",
    additionalContext: {
      trapType,
      disarmAttempted,
      playerDexterity: state.player.stats.dexterity,
    },
  })
}

// =============================================================================
// HYBRID DECISION (AI + Engine)
// =============================================================================

/**
 * For cases where engine calculates mechanics but AI adds flavor.
 * Engine provides the effects, AI provides narration.
 */
export async function narrateEffects(
  state: GameState,
  effects: Effect[],
  context: string,
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy narrator.
Given a list of game effects that are about to happen, write vivid 1-2 sentence narration.
Do NOT modify the effects - just provide narration for them.`

  const prompt = `
CONTEXT: ${context}
EFFECTS: ${JSON.stringify(effects, null, 2)}
GAME STATE SUMMARY:
- Player HP: ${state.player.stats.health}/${state.player.stats.maxHealth}
- Enemy: ${state.currentEnemy?.name || "none"}

Write narration for these effects.
`

  // NO FALLBACK: AI must succeed
  const result = await generateWithAI({
    schema: z.object({
      narration: z.string(),
    }),
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  return {
    narration: result.narration,
    effects, // Pass through unchanged
  }
}
