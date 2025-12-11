/**
 * Companion Turn Decision Module
 *
 * AI-as-code pattern for companion combat decisions.
 *
 * The companion mechanics (damage calculation, cooldowns) are deterministic,
 * handled by companion-system. AI decides:
 * - What action the companion takes
 * - Narration for the action
 * - Personality-driven behavior
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, TurnDecision, NarrativeEffect } from "@/lib/effects"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type CompanionAction = "attack" | "ability" | "defend" | "flee" | "betray"
export type CombatBehaviorStyle = "aggressive" | "defensive" | "support" | "tactical" | "wild" | "chaotic" | "passive"

export interface CompanionAbilityInfo {
  id: string
  name: string
  effectType: "damage" | "heal" | "buff" | "debuff"
  value?: number
  cooldown: number
  currentCooldown: number
  narration?: string
}

export interface CompanionTurnContext {
  companion: {
    name: string
    species: string
    bondLevel: number
    bondTitle: string
    healthPercent: number
    attack: number
    defense: number
    behaviorStyle: CombatBehaviorStyle
    personality?: string
    abilities: CompanionAbilityInfo[]
    turnsWithPlayer: number
  }
  player: {
    name: string
    class?: string
    healthPercent: number
    maxHealth: number
  }
  enemy: {
    name: string
    healthPercent: number
    attack: number
    defense: number
    isBoss: boolean
  } | null
  combatTurn: number
  dungeonTheme?: string
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const companionActionSchema = z.object({
  action: z.enum(["attack", "ability", "defend", "flee", "betray"]).describe("The action the companion takes"),
  abilityId: z.string().optional().describe("ID of ability to use if action is 'ability'"),
  narration: z.string().describe("1-2 sentence description of the companion's action"),
  innerThought: z.string().optional().describe("Brief companion inner thought/motivation"),
  targetEnemy: z.boolean().default(true).describe("Whether action targets enemy (vs player for heals)"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Decide what action a companion takes on their turn.
 * NO FALLBACKS - AI must succeed.
 */
export async function decideCompanionAction(
  context: CompanionTurnContext
): Promise<TurnDecision & { action: CompanionAction; abilityId?: string; targetEnemy: boolean }> {
  const systemPrompt = `You are deciding combat actions for a companion creature in a dark fantasy RPG.
Companions have personalities, bond levels with the player, and combat behaviors.

ACTION TYPES:
- attack: Basic attack against enemy
- ability: Use a specific ability (specify abilityId)
- defend: Take defensive stance, protect player
- flee: Panic and flee (only if bond is low and danger is high)
- betray: Turn on player (only if bond is very low and companion is hostile)

BOND EFFECTS:
- Bond 0-25: Distrustful - may flee or betray
- Bond 26-50: Neutral - follows basic behavior
- Bond 51-75: Loyal - prioritizes player safety
- Bond 76-100: Soulbound - will sacrifice for player

COMBAT BEHAVIORS:
- aggressive: Prioritizes damage, uses offensive abilities
- defensive: Protects player, uses defensive abilities
- support: Heals and buffs, avoids direct combat
- tactical: Debuffs enemies, strategic ability use
- wild: Unpredictable, may do anything

RULES:
1. Low bond companions (< 25) may flee when below 30% HP
2. Very low bond companions (< 10) may betray if player is vulnerable
3. Support companions prioritize healing low-HP players
4. Abilities on cooldown (currentCooldown > 0) cannot be used
5. High bond companions fight more bravely
6. Keep narration to 1-2 sentences, in-character for the companion
7. Inner thoughts reveal companion personality`

  const availableAbilities = context.companion.abilities
    .filter(a => a.currentCooldown === 0)
    .map(a => `${a.name} (${a.effectType}${a.value ? `: ${a.value}` : ""})`)
    .join(", ") || "None"

  const prompt = `
COMPANION TURN:
- Companion: ${context.companion.name} (${context.companion.species})
- Bond: ${context.companion.bondLevel}/100 (${context.companion.bondTitle})
- Health: ${context.companion.healthPercent}%
- Stats: ATK ${context.companion.attack}, DEF ${context.companion.defense}
- Behavior: ${context.companion.behaviorStyle}
- Personality: ${context.companion.personality || "Unknown"}
- Turns with player: ${context.companion.turnsWithPlayer}
- Available abilities: ${availableAbilities}

PLAYER STATUS:
- ${context.player.name} (${context.player.class || "Adventurer"})
- Health: ${context.player.healthPercent}%

${context.enemy ? `ENEMY:
- ${context.enemy.name}${context.enemy.isBoss ? " [BOSS]" : ""}
- Health: ${context.enemy.healthPercent}%
- Stats: ATK ${context.enemy.attack}, DEF ${context.enemy.defense}` : "No enemy present"}

Combat turn: ${context.combatTurn}
${context.dungeonTheme ? `Dungeon theme: ${context.dungeonTheme}` : ""}

Decide the companion's action.`

  const result = await generateWithAI({
    schema: companionActionSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.balanced,
  })

  const effects: Effect[] = []

  // Add inner thought as narrative effect
  if (result.innerThought) {
    const thoughtEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.innerThought,
      category: "dialogue",
      style: "whisper",
    }
    effects.push(thoughtEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Companion ${context.companion.name} chose: ${result.action}`,
    },
    action: result.action,
    abilityId: result.abilityId,
    targetEnemy: result.targetEnemy,
  }
}

/**
 * Decide companion reaction to taming attempt.
 * NO FALLBACKS - AI must succeed.
 */
export async function decideCompanionTameReaction(
  context: {
    enemy: {
      name: string
      species?: string
      healthPercent: number
      personality?: string
    }
    player: {
      class?: string
      level: number
      charisma?: number
    }
    tameChance: number
    roll: number
    success: boolean
  }
): Promise<TurnDecision> {
  const systemPrompt = `You are narrating a creature taming attempt in a dark fantasy RPG.
The player is trying to turn an enemy into a companion.

TAMING OUTCOMES:
- Success: The creature submits and joins the party
- Failure: The creature lashes out in defiance

RULES:
1. Success narration should show the creature's submission/acceptance
2. Failure narration should show the creature's rejection/attack
3. Reference the creature's personality if known
4. Keep to 1-2 sentences
5. Dark fantasy tone - taming is not always gentle`

  const prompt = `
TAMING ATTEMPT:
- Creature: ${context.enemy.name}${context.enemy.species ? ` (${context.enemy.species})` : ""}
- Creature HP: ${context.enemy.healthPercent}%
- Personality: ${context.enemy.personality || "Unknown"}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"}
- Tame chance: ${Math.round(context.tameChance * 100)}%
- Roll: ${Math.round(context.roll * 100)}
- Result: ${context.success ? "SUCCESS" : "FAILURE"}

Narrate the taming ${context.success ? "success" : "failure"}.`

  const schema = z.object({
    narration: z.string().describe("Description of the taming attempt outcome"),
    creatureReaction: z.string().optional().describe("The creature's visible/vocal reaction"),
  })

  const result = await generateWithAI({
    schema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  if (result.creatureReaction) {
    const reactionEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.creatureReaction,
      category: "combat",
      style: "normal",
    }
    effects.push(reactionEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Taming ${context.success ? "succeeded" : "failed"}`,
    },
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideCompanionTurn(
  context: CompanionTurnContext
): Promise<TurnDecision & { action: CompanionAction; abilityId?: string; targetEnemy: boolean }> {
  return decideCompanionAction(context)
}

export async function decideTame(
  context: Parameters<typeof decideCompanionTameReaction>[0]
): Promise<TurnDecision> {
  return decideCompanionTameReaction(context)
}
