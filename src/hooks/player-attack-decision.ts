/**
 * Player Attack Decision Module
 *
 * AI-as-code pattern for player attack narration and bonus effects.
 *
 * Unlike enemy turns where AI decides the action, for player attacks:
 * - The ACTION is player-chosen (clicking "Attack")
 * - The DAMAGE is deterministic (kernel calculates)
 * - AI provides NARRATION and decides BONUS EFFECTS
 *
 * This module wraps AI calls into the Effect-based pattern.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, TurnDecision } from "@/lib/effects"
import type { DamageType, CombatStance } from "@/lib/core/game-types"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface PlayerAttackContext {
  player: {
    name: string
    class?: string
    level: number
    health: number
    maxHealth: number
    stance: CombatStance
    weaponName?: string
    weaponType?: string
  }
  enemy: {
    id: string
    name: string
    health: number
    maxHealth: number
    weakness?: DamageType
    resistance?: DamageType
  }
  attack: {
    damage: number
    damageType: DamageType
    isCritical: boolean
    effectiveness: "effective" | "resisted" | "normal"
    comboTriggered?: string
  }
  combatRound: number
}

export interface VictoryContext {
  player: {
    name: string
    class?: string
    level: number
  }
  enemy: {
    name: string
    level: number
    isBoss: boolean
  }
  rewards: {
    gold: number
    experience: number
    lootName?: string
    lootRarity?: string
    materialCount?: number
  }
  leveledUp: boolean
}

// =============================================================================
// ZOD SCHEMAS FOR AI OUTPUT
// =============================================================================

const attackNarrationSchema = z.object({
  narration: z.string().describe("1-2 sentence vivid attack description"),
  criticalFlair: z.string().optional().describe("Extra flourish for critical hits"),
  bonusEffects: z.array(z.object({
    effectType: z.literal("narrative"),
    text: z.string(),
    category: z.enum(["combat", "exploration", "dialogue", "system", "lore"]),
    style: z.enum(["normal", "dramatic", "whisper", "warning"]).optional(),
  })).optional().describe("Additional narrative effects"),
})

const victoryNarrationSchema = z.object({
  deathNarration: z.string().describe("Brief enemy death description"),
  spoilsNarration: z.string().describe("Brief loot/reward description"),
  epitaph: z.string().optional().describe("Memorable final words or scene"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate narration and effects for player attack.
 * Damage is already calculated - AI just provides flavor.
 */
export async function decidePlayerAttackNarration(
  context: PlayerAttackContext
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy combat narrator.
Given attack results, write vivid 1-2 sentence narration.

RULES:
1. Be visceral and action-focused
2. Match tone to damage effectiveness
3. Reference weapon if available
4. For critical hits, add extra flourish
5. Never exceed 2 sentences
6. Dark fantasy tone - gritty, not heroic

EFFECTIVENESS:
- "effective": Exploit the weakness! (fire on ice creature, etc.)
- "resisted": Show the resistance (arrows ping off scales, etc.)
- "normal": Standard combat description`

  const prompt = `
ATTACK CONTEXT:
- Player: ${context.player.class || "Adventurer"} (${context.player.stance} stance)
- Weapon: ${context.player.weaponName || "bare hands"}
- Target: ${context.enemy.name} (${context.enemy.health}/${context.enemy.maxHealth} HP)
- Damage: ${context.attack.damage} ${context.attack.damageType}
- Critical: ${context.attack.isCritical}
- Effectiveness: ${context.attack.effectiveness}
${context.attack.comboTriggered ? `- Combo: ${context.attack.comboTriggered}` : ""}
- Round: ${context.combatRound}

Write attack narration.`

  const result = await generateWithAI({
    schema: attackNarrationSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  // Add narrative effects if generated
  if (result.bonusEffects) {
    effects.push(...(result.bonusEffects as Effect[]))
  }

  // Add critical flair as narrative effect
  if (context.attack.isCritical && result.criticalFlair) {
    effects.push({
      effectType: "narrative",
      text: result.criticalFlair,
      category: "combat",
      style: "dramatic",
    })
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Generated narration for ${context.attack.damage} ${context.attack.damageType} attack`,
    },
  }
}

/**
 * Generate narration for enemy defeat.
 */
export async function decideVictoryNarration(
  context: VictoryContext
): Promise<TurnDecision> {
  const systemPrompt = `You are a dark fantasy narrator describing enemy defeat.
Write brief, satisfying victory descriptions.

RULES:
1. Death description: 1 sentence, vivid but not gratuitous
2. Spoils description: Focus on the reward, hint at value
3. For bosses: Add gravitas
4. For leveling up: Acknowledge growth
5. Dark fantasy tone`

  const prompt = `
VICTORY CONTEXT:
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"}
- Enemy: ${context.enemy.name}${context.enemy.isBoss ? " (BOSS)" : ""}
- Rewards: ${context.rewards.gold}g, ${context.rewards.experience}xp
${context.rewards.lootName ? `- Loot: ${context.rewards.lootName} (${context.rewards.lootRarity})` : ""}
${context.rewards.materialCount ? `- Materials: ${context.rewards.materialCount} items` : ""}
- Leveled Up: ${context.leveledUp}

Write victory narration.`

  const result = await generateWithAI({
    schema: victoryNarrationSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  // Add epitaph as lore narrative
  if (result.epitaph) {
    effects.push({
      effectType: "narrative",
      text: result.epitaph,
      category: "lore",
      style: "whisper",
    })
  }

  return {
    narration: `${result.deathNarration} ${result.spoilsNarration}`,
    effects,
    metadata: {
      reasoning: `Victory over ${context.enemy.name}`,
    },
  }
}

// =============================================================================
// FALLBACK-FREE EXPORTS
// =============================================================================

/**
 * Main entry point for player attack AI decisions.
 * NO FALLBACKS - AI must succeed or the call fails.
 */
export async function decidePlayerAttack(
  context: PlayerAttackContext
): Promise<TurnDecision> {
  return decidePlayerAttackNarration(context)
}

export async function decideVictory(
  context: VictoryContext
): Promise<TurnDecision> {
  return decideVictoryNarration(context)
}
