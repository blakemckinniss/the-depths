/**
 * Boss Behavior Decision Module (LEGO Pattern)
 *
 * AI-as-LEGO-composer pattern for boss combat decisions.
 *
 * KEY INSIGHT: AI never outputs raw damage numbers.
 * Instead, AI selects pieceIds[] and powerLevel.
 * The kernel resolves pieces to Effects and applies power scaling.
 *
 * Bosses have phases, dialogue, and unique mechanics, but the
 * fundamental pattern is the same as regular enemies.
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, NarrativeEffect, LegoTurnDecision } from "@/lib/effects"
import type { DamageType, EnemyAbility } from "@/lib/core/game-types"
import { powerLevelSchema } from "@/lib/ai/ai-schemas"
import {
  getEnemyAttackPieces,
  getPieceManifest,
  calculateBudget,
} from "@/lib/lego"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface BossPhaseInfo {
  name: string
  healthThreshold: number
  attackModifier: number
  defenseModifier: number
  specialAbility?: string
  narration?: string
}

export interface BossTurnContext {
  boss: {
    id: string
    name: string
    health: number
    maxHealth: number
    attack: number
    defense: number
    abilities: EnemyAbility[]
    aiPattern: "random" | "smart" | "ability_focused" | "defensive_until_low"
    phases: BossPhaseInfo[]
    currentPhase: number
    weakness?: DamageType
    resistance?: DamageType
    dialogue?: {
      intro: string
      phase_transitions: string[]
      death: string
      lowHealth?: string
    }
  }
  player: {
    name: string
    class?: string
    health: number
    maxHealth: number
    defense: number
    stance: string
    stanceDefenseMod: number
    activeEffects: string[]
  }
  combatRound: number
  dungeonFloor: number
  dungeonTheme?: string
  phaseJustChanged: boolean
}

export interface PhaseTransitionContext {
  boss: {
    name: string
    health: number
    maxHealth: number
  }
  previousPhase: BossPhaseInfo
  newPhase: BossPhaseInfo
  phaseIndex: number
  totalPhases: number
  dungeonTheme?: string
}

export interface ParleyContext {
  boss: {
    name: string
    health: number
    maxHealth: number
    dialogue?: {
      intro: string
      death: string
      lowHealth?: string
    }
  }
  player: {
    class?: string
    level: number
    charisma?: number
  }
  parleyAttempt: number
  dungeonTheme?: string
}

// =============================================================================
// LEGO BOSS ACTION SCHEMA
// =============================================================================

/**
 * LEGO-based boss action schema.
 * AI selects piece IDs, kernel resolves them to Effects.
 */
const legoBossActionSchema = z.object({
  narration: z.string().max(250).describe("1-2 sentence vivid boss action description"),
  pieceIds: z.array(z.string()).min(1).max(4)
    .describe("1-4 LEGO piece IDs from the manifest (bosses get more pieces)"),
  powerLevel: powerLevelSchema
    .describe("Attack intensity: light (testing), medium (standard), heavy (devastating)"),
  action: z.enum(["basic_attack", "use_ability", "phase_ability", "taunt"])
    .describe("Boss action type for context"),
  dialogue: z.string().optional().describe("Boss spoken dialogue, if any"),
  reasoning: z.string().optional().describe("Brief tactical reasoning"),
})

const phaseTransitionSchema = z.object({
  narration: z.string().describe("2-3 sentence dramatic phase transition"),
  bossDialogue: z.string().optional().describe("What the boss says during transition"),
  environmentalChange: z.string().optional().describe("How the arena/environment changes"),
  newThreat: z.string().optional().describe("Additional threat or mechanic warning"),
})

const parleyOutcomeSchema = z.object({
  success: z.boolean().describe("Whether parley succeeds"),
  narration: z.string().describe("1-2 sentence description of the parley attempt"),
  bossResponse: z.string().describe("Boss's spoken response"),
  outcome: z.enum(["fight_continues", "boss_retreats", "boss_joins", "temporary_truce", "boss_enrages"]),
  goldTier: z.enum(["none", "small", "medium", "large"]).optional()
    .describe("Gold tier if boss retreats: none=0, small=25-50, medium=75-150, large=200-400"),
  itemOffered: z.string().optional().describe("Item boss offers if parley succeeds"),
})

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildBossSystemPrompt(budget: number, availablePieces: string, currentPhase: BossPhaseInfo): string {
  return `You are controlling a boss enemy in a dark fantasy dungeon crawler combat.
Bosses are powerful foes with phases, special abilities, and dramatic personalities.

## HOW THIS WORKS
You do NOT output damage numbers. Instead:
1. Select 1-4 piece IDs from the AVAILABLE PIECES list (bosses get more pieces than regular enemies)
2. Choose a power level (light/medium/heavy) based on the attack's intensity
3. Write vivid 1-2 sentence narration with optional dialogue

The game kernel will:
- Resolve your piece IDs to actual damage effects
- Apply power level multiplier (light=0.6x, medium=1.0x, heavy=1.5x)
- Apply phase attack modifier (${currentPhase.attackModifier}x)
- Execute all effects on the player

## BOSS PHASES
- Current phase affects damage output via attackModifier
- Phase abilities (if any) should be represented by selecting powerful pieces
- When phase changes, boss should use heavier power levels

## AI PATTERNS
- "random": Chaotic attacks, pick varied pieces
- "smart": Tactical - debuffs early, heavy attacks when player is low
- "ability_focused": Prefer elemental/special pieces over basic_strike
- "defensive_until_low": Light attacks until HP < 40%, then heavy

## POWER BUDGET
Your total piece cost must not exceed: ${budget}
Bosses get higher budgets than regular enemies.

## POWER LEVEL GUIDELINES
- light: Testing attack, probing defenses (0.6x damage)
- medium: Standard boss attack (1.0x damage)
- heavy: Devastating blow, boss fully commits (1.5x damage)

## AVAILABLE PIECES
${availablePieces}

## RULES
1. ONLY use piece IDs from the AVAILABLE PIECES list above
2. Total cost must not exceed budget (${budget})
3. Bosses are theatrical - include dialogue when dramatic
4. Match pieces to boss's damage types and abilities
5. Narration should be menacing and dramatic`
}

// =============================================================================
// AI DECISION FUNCTIONS (LEGO Pattern)
// =============================================================================

/**
 * Decide boss action using LEGO pieces.
 * Returns LegoTurnDecision with pieceIds for the kernel to resolve.
 */
export async function decideBossTurn(
  context: BossTurnContext
): Promise<LegoTurnDecision & { action: string; dialogue?: string }> {
  const currentPhase = context.boss.phases[context.boss.currentPhase]

  // Bosses get 1.5x budget compared to regular enemies
  const baseBudget = calculateBudget(context.dungeonFloor, "enemy")
  const budget = Math.floor(baseBudget * 1.5)

  // Get available pieces
  const availablePieces = getEnemyAttackPieces(budget)
  const pieceManifest = getPieceManifest(availablePieces)

  const healthPct = Math.round((context.boss.health / context.boss.maxHealth) * 100)
  const playerHealthPct = Math.round((context.player.health / context.player.maxHealth) * 100)

  const availableAbilities = context.boss.abilities
    .filter(a => a.currentCooldown === 0)
    .map(a => `- ${a.name}: ${a.damageType || "physical"}`)
    .join("\n")

  const prompt = `
BOSS COMBAT - ROUND ${context.combatRound}
${context.phaseJustChanged ? "*** PHASE JUST CHANGED - Boss is powered up! ***" : ""}
POWER BUDGET: ${budget}

BOSS: ${context.boss.name}
- Health: ${context.boss.health}/${context.boss.maxHealth} (${healthPct}%)
- Current Phase: ${currentPhase.name} (${context.boss.currentPhase + 1}/${context.boss.phases.length})
- Phase Attack Modifier: ${currentPhase.attackModifier}x
- AI Pattern: ${context.boss.aiPattern}
${currentPhase.specialAbility ? `- Phase Special: ${currentPhase.specialAbility}` : ""}
${context.boss.weakness ? `- Weakness: ${context.boss.weakness}` : ""}

BOSS ABILITIES (for flavor reference):
${availableAbilities || "Basic attacks only"}

PLAYER: ${context.player.name} (${context.player.class || "Adventurer"})
- Health: ${context.player.health}/${context.player.maxHealth} (${playerHealthPct}%)
- Defense: ${context.player.defense} (stance: ${context.player.stance})
- Active effects: ${context.player.activeEffects.join(", ") || "none"}

${context.dungeonTheme ? `Dungeon: ${context.dungeonTheme}` : ""}

Select pieces and power level for ${context.boss.name}'s attack.`.trim()

  const result = await generateWithAI({
    schema: legoBossActionSchema,
    prompt,
    system: buildBossSystemPrompt(budget, pieceManifest, currentPhase),
    temperature: AI_CONFIG.temperature.balanced,
    useCache: false,
  })

  return {
    narration: result.narration,
    pieceIds: result.pieceIds,
    powerLevel: result.powerLevel,
    action: result.action,
    dialogue: result.dialogue,
    metadata: {
      reasoning: result.reasoning || `Boss ${context.boss.name} chose: ${result.action}`,
    },
  }
}

/**
 * Generate narration for boss phase transition.
 * Pure narrative - no LEGO pieces needed.
 */
export async function decideBossPhaseTransition(
  context: PhaseTransitionContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  const systemPrompt = `You are narrating a boss phase transition in a dark fantasy game.
Phase transitions are dramatic moments when the boss powers up or changes tactics.

RULES:
1. Make it dramatic and threatening
2. Describe visible changes in the boss
3. Warn about new dangers
4. Boss dialogue should be menacing
5. Keep to 2-3 sentences
6. Dark fantasy tone - visceral, dangerous`

  const healthPct = Math.round((context.boss.health / context.boss.maxHealth) * 100)

  const prompt = `
BOSS PHASE TRANSITION:
- Boss: ${context.boss.name} (${healthPct}% HP)
- From Phase: ${context.previousPhase.name}
- To Phase: ${context.newPhase.name} (${context.phaseIndex + 1}/${context.totalPhases})
- New Attack Modifier: ${context.newPhase.attackModifier}x
- New Defense Modifier: ${context.newPhase.defenseModifier}x
${context.newPhase.specialAbility ? `- New Special: ${context.newPhase.specialAbility}` : ""}
${context.dungeonTheme ? `- Dungeon Theme: ${context.dungeonTheme}` : ""}

Narrate the phase transition.`

  const result = await generateWithAI({
    schema: phaseTransitionSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  if (result.bossDialogue) {
    const dialogueEffect: NarrativeEffect = {
      effectType: "narrative",
      text: `"${result.bossDialogue}"`,
      category: "dialogue",
      style: "dramatic",
    }
    effects.push(dialogueEffect)
  }

  if (result.environmentalChange) {
    const envEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.environmentalChange,
      category: "combat",
      style: "warning",
    }
    effects.push(envEffect)
  }

  if (result.newThreat) {
    const threatEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.newThreat,
      category: "combat",
      style: "warning",
    }
    effects.push(threatEffect)
  }

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Phase transition: ${context.previousPhase.name} → ${context.newPhase.name}`,
    },
  }
}

// Gold tier lookup table (kernel resolves)
export const PARLEY_GOLD_TIERS = {
  none: 0,
  small: { min: 25, max: 50 },
  medium: { min: 75, max: 150 },
  large: { min: 200, max: 400 },
} as const

/**
 * Decide outcome of player parley attempt with boss.
 * Uses tier selection for gold instead of raw numbers.
 */
export async function decideBossParley(
  context: ParleyContext
): Promise<{
  narration: string
  effects: Effect[]
  metadata: { reasoning: string }
  outcome: string
  goldTier?: string
  itemOffered?: string
}> {
  const systemPrompt = `You are deciding the outcome of a parley attempt with a boss in a dark fantasy game.
Parley is a risky negotiation - bosses rarely surrender but might offer deals.

OUTCOMES:
- fight_continues: Boss refuses, combat resumes (most common)
- boss_retreats: Boss offers gold/item and leaves (rare, low HP only)
- boss_joins: Boss becomes ally (very rare, requires special conditions)
- temporary_truce: Brief pause in combat (uncommon)
- boss_enrages: Boss becomes stronger/angrier (failed parley penalty)

GOLD TIERS (if boss retreats):
- none: No gold offered
- small: Modest payment (25-50g)
- medium: Decent payment (75-150g)
- large: Generous payment (200-400g)

RULES:
1. Most parleys fail - bosses are prideful
2. Low HP increases chance of retreat/truce
3. Multiple failed parleys often cause enrage
4. Boss personality affects response
5. Keep narration dramatic
6. Boss response should be in-character`

  const healthPct = Math.round((context.boss.health / context.boss.maxHealth) * 100)

  const prompt = `
PARLEY ATTEMPT:
- Boss: ${context.boss.name} (${healthPct}% HP)
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"}
- Parley Attempt #: ${context.parleyAttempt}
${context.player.charisma ? `- Player Charisma: ${context.player.charisma}` : ""}
${context.boss.dialogue?.lowHealth && healthPct < 30 ? `- Boss low HP dialogue hint: "${context.boss.dialogue.lowHealth}"` : ""}
${context.dungeonTheme ? `- Dungeon: ${context.dungeonTheme}` : ""}

Decide the parley outcome.`

  const result = await generateWithAI({
    schema: parleyOutcomeSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  const effects: Effect[] = []

  // Add boss response as dialogue
  const responseEffect: NarrativeEffect = {
    effectType: "narrative",
    text: `"${result.bossResponse}"`,
    category: "dialogue",
    style: result.success ? "normal" : "warning",
  }
  effects.push(responseEffect)

  // Gold is resolved by kernel using PARLEY_GOLD_TIERS, not added as effect here

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Parley outcome: ${result.outcome}`,
    },
    outcome: result.outcome,
    goldTier: result.goldTier,
    itemOffered: result.itemOffered,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideBossAction(
  context: BossTurnContext
): Promise<LegoTurnDecision & { action: string; dialogue?: string }> {
  return decideBossTurn(context)
}

export async function decidePhaseChange(
  context: PhaseTransitionContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  return decideBossPhaseTransition(context)
}

export async function decideParley(
  context: ParleyContext
): Promise<{
  narration: string
  effects: Effect[]
  metadata: { reasoning: string }
  outcome: string
  goldTier?: string
  itemOffered?: string
}> {
  return decideBossParley(context)
}
