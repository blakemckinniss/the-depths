/**
 * Room/Encounter Decision Module (LEGO Pattern)
 *
 * AI-as-LEGO-composer pattern for room generation and mystery encounters.
 *
 * KEY INSIGHT: AI never outputs raw stat numbers for mystery effects.
 * Instead, AI selects tiers (minor/standard/major) for blessings/curses.
 * The kernel resolves tiers to actual stat values.
 *
 * Room narratives are pure flavor - no LEGO needed.
 * Mystery outcomes use tier selection for mechanical effects.
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { Effect, NarrativeEffect } from "@/lib/effects"
import { blessingTierSchema, curseTierSchema } from "@/lib/ai/ai-schemas"
import { BLESSING_TIERS, CURSE_TIERS } from "@/lib/lego"

// =============================================================================
// MYSTERY REWARD TIERS (kernel resolves)
// =============================================================================

export const MYSTERY_GOLD_TIERS = {
  none: 0,
  small: { min: 10, max: 25 },
  medium: { min: 30, max: 60 },
  large: { min: 75, max: 150 },
} as const

export const MYSTERY_HEAL_TIERS = {
  none: 0,
  small: { min: 5, max: 15 },
  medium: { min: 20, max: 40 },
  large: { min: 50, max: 80 },
} as const

export const MYSTERY_DAMAGE_TIERS = {
  none: 0,
  small: { min: 5, max: 12 },
  medium: { min: 15, max: 30 },
  large: { min: 35, max: 60 },
} as const

export type MysteryTier = "none" | "small" | "medium" | "large"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type EventType = "combat" | "treasure" | "trap" | "shrine" | "npc" | "rest" | "boss" | "mystery"

export interface RoomContext {
  floor: number
  room: number
  dungeonTheme: string
  dungeonName: string
  eventType: EventType
  modifier?: string // "guarded", "trapped", "cursed", "blessed", "mysterious"
  twist?: string // "mimic", "ambush", "betrayal", "bonanza", "revelation"
  player: {
    class?: string
    level: number
    healthPercent: number
  }
  hazardName?: string
}

export interface MysteryContext extends RoomContext {
  eventType: "mystery"
}

export interface DescendContext {
  newFloor: number
  previousRoomsExplored: number
  dungeonTheme: string
  dungeonName: string
  player: {
    class?: string
    level: number
    healthPercent: number
  }
}

// =============================================================================
// DECISION RESULT TYPES
// =============================================================================

export interface MysteryDecisionResult {
  narration: string
  effects: Effect[]
  metadata: { reasoning: string }
  outcome: "treasure" | "healing" | "blessing" | "curse" | "damage" | "nothing"
  // Tier selections for kernel to resolve
  goldTier?: MysteryTier
  healTier?: MysteryTier
  damageTier?: MysteryTier
  blessingTier?: "minor" | "standard" | "major"
  curseTier?: "minor" | "standard" | "major"
  effectName?: string
  effectDescription?: string
}

// =============================================================================
// LEGO SCHEMAS
// =============================================================================

const roomNarrativeSchema = z.object({
  description: z.string().max(200).describe("1-2 sentence vivid room description"),
  atmosphere: z.string().optional().describe("Additional atmospheric detail"),
  foreshadowing: z.string().optional().describe("Hint about what's ahead"),
})

const mysteryTierSchema = z.enum(["none", "small", "medium", "large"])

const legoMysteryOutcomeSchema = z.object({
  narration: z.string().max(200).describe("1-2 sentence description of the mystery event"),
  outcome: z.enum(["treasure", "healing", "blessing", "curse", "damage", "nothing"]),
  // Tier selections instead of raw numbers
  goldTier: mysteryTierSchema.optional()
    .describe("If treasure: none=0, small=10-25, medium=30-60, large=75-150"),
  healTier: mysteryTierSchema.optional()
    .describe("If healing: none=0, small=5-15, medium=20-40, large=50-80"),
  damageTier: mysteryTierSchema.optional()
    .describe("If damage: none=0, small=5-12, medium=15-30, large=35-60"),
  blessingTier: blessingTierSchema.optional()
    .describe("If blessing: minor (+2/+1), standard (+4/+3), major (+7/+5)"),
  curseTier: curseTierSchema.optional()
    .describe("If curse: minor (-2/-1), standard (-4/-3), major (-7/-5)"),
  effectName: z.string().optional().describe("Name of blessing/curse effect"),
  effectDescription: z.string().optional().describe("Description of the effect"),
})

const descendNarrativeSchema = z.object({
  description: z.string().max(200).describe("1-2 sentence vivid descent description"),
  ominousHint: z.string().optional().describe("Foreboding about the floor ahead"),
})

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

function buildMysterySystemPrompt(): string {
  return `You are deciding mystery event outcomes in a dark fantasy dungeon.
Mystery events are unpredictable - they can be good or bad.

## HOW THIS WORKS
You do NOT output raw numbers. Instead, select TIERS for rewards/penalties.
The kernel resolves tiers to actual values.

## OUTCOME TYPES AND TIERS
- treasure: Select goldTier (none/small/medium/large)
- healing: Select healTier (none/small/medium/large)
- blessing: Select blessingTier (minor/standard/major) + effectName
- curse: Select curseTier (minor/standard/major) + effectName
- damage: Select damageTier (none/small/medium/large)
- nothing: The mystery fades without effect

## TIER VALUES (kernel resolves)
Gold: small=10-25, medium=30-60, large=75-150
Heal: small=5-15, medium=20-40, large=50-80
Damage: small=5-12, medium=15-30, large=35-60
Blessing: minor (+2 att/+1 def), standard (+4/+3), major (+7/+5)
Curse: minor (-2/-1), standard (-4/-3), major (-7/-5)

## OUTCOME DISTRIBUTION (roughly)
- 30% positive (treasure/healing/blessing)
- 30% neutral (nothing)
- 40% negative (curse/damage) - mysteries are dangerous!

## RULES
1. Higher floors justify larger tiers
2. Low HP players less likely to take large damage
3. Dungeon theme affects effect flavor (effectName/effectDescription)
4. Effect names should be thematic and interesting
5. Dark fantasy tone
6. Keep narration to 1-2 sentences`
}

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate room entry narrative.
 * Event type is already determined by kernel - AI provides flavor only.
 * No LEGO mechanics needed.
 */
export async function decideRoomNarrative(
  context: RoomContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  const systemPrompt = `You are narrating room entries in a dark fantasy dungeon crawler.
Write atmospheric descriptions that set the mood for what's ahead.

EVENT TYPES AND THEIR TONE:
- combat: Tension, danger, something lurks
- treasure: Glinting metal, hidden wealth, potential traps
- trap: Unease, too quiet, suspicious
- shrine: Ancient power, mystical aura, reverence
- npc: Signs of habitation, footsteps, voices
- rest: Quiet alcove, safe haven, respite
- boss: Dread, power, imminent challenge
- mystery: Unknown, otherworldly, reality shifts

MODIFIERS affect the atmosphere:
- guarded: Additional threat watching
- trapped: Hidden dangers
- cursed: Dark magic lingers
- blessed: Divine protection
- mysterious: Reality uncertain

RULES:
1. Match description to event type
2. Incorporate dungeon theme
3. Never exceed 2 sentences
4. Dark fantasy tone - gritty, atmospheric
5. Don't reveal the event type explicitly`

  const prompt = `
ROOM CONTEXT:
- Dungeon: ${context.dungeonName} (${context.dungeonTheme})
- Floor ${context.floor}, Room ${context.room}
- Event Type: ${context.eventType}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP)
${context.modifier ? `- Modifier: ${context.modifier}` : ""}
${context.twist ? `- Twist: ${context.twist}` : ""}
${context.hazardName ? `- Hazard: ${context.hazardName}` : ""}

Generate room entry narrative.`

  const result = await generateWithAI({
    schema: roomNarrativeSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  if (result.atmosphere) {
    const atmosphereEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.atmosphere,
      category: "exploration",
      style: "whisper",
    }
    effects.push(atmosphereEffect)
  }

  if (result.foreshadowing) {
    const hintEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.foreshadowing,
      category: "lore",
      style: "dramatic",
    }
    effects.push(hintEffect)
  }

  return {
    narration: result.description,
    effects,
    metadata: {
      reasoning: `Room ${context.room} on floor ${context.floor}: ${context.eventType}`,
    },
  }
}

/**
 * Generate mystery event outcome using tier selection.
 * Returns tier selections for kernel to resolve.
 */
export async function decideMysteryOutcome(
  context: MysteryContext
): Promise<MysteryDecisionResult> {
  const prompt = `
MYSTERY CONTEXT:
- Dungeon: ${context.dungeonName} (${context.dungeonTheme})
- Floor ${context.floor}, Room ${context.room}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP)
${context.modifier ? `- Modifier: ${context.modifier}` : ""}

Decide the mystery outcome and select appropriate tiers.`

  const result = await generateWithAI({
    schema: legoMysteryOutcomeSchema,
    prompt,
    system: buildMysterySystemPrompt(),
    temperature: AI_CONFIG.temperature.balanced,
  })

  // Effects are resolved by kernel from tiers, not built here
  const effects: Effect[] = []

  return {
    narration: result.narration,
    effects,
    metadata: {
      reasoning: `Mystery outcome: ${result.outcome}`,
    },
    outcome: result.outcome,
    goldTier: result.goldTier,
    healTier: result.healTier,
    damageTier: result.damageTier,
    blessingTier: result.blessingTier,
    curseTier: result.curseTier,
    effectName: result.effectName,
    effectDescription: result.effectDescription,
  }
}

/**
 * Generate floor descent narrative.
 * Pure narrative - no LEGO mechanics needed.
 */
export async function decideDescendNarrative(
  context: DescendContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  const systemPrompt = `You are narrating floor descent in a dark fantasy dungeon.
Write atmospheric descriptions of going deeper into darkness.

RULES:
1. Higher floors = more ominous
2. Reference the dungeon theme
3. Never exceed 2 sentences
4. Build dread and anticipation
5. Dark fantasy tone`

  const prompt = `
DESCENT CONTEXT:
- Dungeon: ${context.dungeonName} (${context.dungeonTheme})
- Descending to Floor ${context.newFloor}
- Rooms explored: ${context.previousRoomsExplored}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP)

Generate descent narrative.`

  const result = await generateWithAI({
    schema: descendNarrativeSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.narrative,
  })

  const effects: Effect[] = []

  if (result.ominousHint) {
    const hintEffect: NarrativeEffect = {
      effectType: "narrative",
      text: result.ominousHint,
      category: "lore",
      style: "dramatic",
    }
    effects.push(hintEffect)
  }

  return {
    narration: result.description,
    effects,
    metadata: {
      reasoning: `Descended to floor ${context.newFloor}`,
    },
  }
}

// =============================================================================
// TIER RESOLUTION HELPERS (for kernel use)
// =============================================================================

/**
 * Resolve a mystery tier to an actual value.
 * Called by kernel when applying mystery effects.
 */
export function resolveMysteryTier(
  tierType: "gold" | "heal" | "damage",
  tier: MysteryTier
): number {
  const tierTables = {
    gold: MYSTERY_GOLD_TIERS,
    heal: MYSTERY_HEAL_TIERS,
    damage: MYSTERY_DAMAGE_TIERS,
  }

  const tierTable = tierTables[tierType]
  const tierValue = tierTable[tier]

  if (tierValue === 0) return 0
  if (typeof tierValue === "number") return tierValue

  const { min, max } = tierValue
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Get blessing stats for a tier.
 * Re-exported from LEGO layer for convenience.
 */
export function getBlessingStats(tier: "minor" | "standard" | "major") {
  return BLESSING_TIERS[tier]
}

/**
 * Get curse stats for a tier.
 * Re-exported from LEGO layer for convenience.
 */
export function getCurseStats(tier: "minor" | "standard" | "major") {
  return CURSE_TIERS[tier]
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decideRoom(
  context: RoomContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  return decideRoomNarrative(context)
}

export async function decideMystery(
  context: MysteryContext
): Promise<MysteryDecisionResult> {
  return decideMysteryOutcome(context)
}

export async function decideDescend(
  context: DescendContext
): Promise<{ narration: string; effects: Effect[]; metadata: { reasoning: string } }> {
  return decideDescendNarrative(context)
}
