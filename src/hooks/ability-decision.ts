/**
 * Ability Execution Decision Module
 *
 * AI-as-code pattern for ability cast narration.
 *
 * The ability mechanics (damage, healing, effects) are deterministic,
 * calculated by executeAbility in ability-system.ts.
 *
 * AI provides:
 * - Cast narration (how the ability looks/feels)
 * - Effect application narration
 * - Victory narration when ability kills
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, TurnDecision } from "@/lib/effects"
import type { DamageType } from "@/lib/core/game-types"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface AbilityCastContext {
  player: {
    name: string
    class?: string
    level: number
  }
  ability: {
    name: string
    description?: string
    damageType?: DamageType
    targetType: "enemy" | "self" | "ally" | "all_enemies" | "all_allies" | "random"
    damage?: number
    healing?: number
    isCritical?: boolean
    effectsApplied?: string[]
  }
  enemy?: {
    name: string
    health: number
    maxHealth: number
  }
  effectiveness?: "effective" | "resisted" | "normal"
}

export interface AbilityVictoryContext {
  player: {
    class?: string
    level: number
  }
  ability: {
    name: string
    damageType?: DamageType
  }
  enemy: {
    name: string
    level: number
  }
  rewards: {
    gold: number
    experience: number
    lootName?: string
  }
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const abilityCastSchema = z.object({
  narration: z.string().describe("1-2 sentence vivid ability cast description"),
  effectNarration: z.string().optional().describe("Description if status effects were applied"),
})

const abilityVictorySchema = z.object({
  narration: z.string().describe("Brief enemy death by ability description"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate narration for ability cast.
 * Mechanics are already calculated - AI just provides flavor.
 */
export async function decideAbilityCastNarration(
  context: AbilityCastContext
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy combat narrator.
Describe ability usage with vivid, action-focused language.

RULES:
1. Be visceral and magical for spells
2. Be brutal for physical abilities
3. Match tone to damage type (fire=blazing, ice=freezing, shadow=creeping)
4. For healing/buffs: describe the sensation
5. Never exceed 2 sentences
6. Dark fantasy tone`

  const prompt = `
ABILITY CONTEXT:
- Caster: ${context.player.class || "Adventurer"}
- Ability: ${context.ability.name}
- Target: ${context.ability.targetType === "self" ? "Self" : context.enemy?.name || "Enemy"}
- Type: ${context.ability.damageType || "physical"}
${context.ability.damage ? `- Damage: ${context.ability.damage}` : ""}
${context.ability.healing ? `- Healing: ${context.ability.healing}` : ""}
${context.ability.isCritical ? "- CRITICAL HIT!" : ""}
${context.effectiveness ? `- Effectiveness: ${context.effectiveness}` : ""}
${context.ability.effectsApplied?.length ? `- Effects: ${context.ability.effectsApplied.join(", ")}` : ""}

Write ability narration.`

  const result = await generateWithAI({
    schema: abilityCastSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  // Add effect narration as narrative effect
  if (result.effectNarration) {
    effects.push({
      effectType: "narrative",
      text: result.effectNarration,
      category: "combat",
      style: "normal",
    })
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Generated narration for ${context.ability.name}`,
    },
  }
}

/**
 * Generate narration for ability kill.
 */
export async function decideAbilityVictoryNarration(
  context: AbilityVictoryContext
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy narrator.
Describe enemy death by ability with brief, satisfying prose.

RULES:
1. Reference the ability that killed them
2. Match tone to damage type
3. One sentence max
4. Dark fantasy tone`

  const prompt = `
VICTORY CONTEXT:
- Ability: ${context.ability.name} (${context.ability.damageType || "physical"})
- Enemy: ${context.enemy.name}
- Rewards: ${context.rewards.gold}g, ${context.rewards.experience}xp

Write brief death narration.`

  const result = await generateWithAI({
    schema: abilityVictorySchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  return {
    narration: result.narration,
    effects: [],
    metadata: {
      reasoning: `Victory over ${context.enemy.name} with ${context.ability.name}`,
    },
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideAbilityCast(
  context: AbilityCastContext
): Promise<TurnDecision> {
  return decideAbilityCastNarration(context)
}

export async function decideAbilityVictory(
  context: AbilityVictoryContext
): Promise<TurnDecision> {
  return decideAbilityVictoryNarration(context)
}
