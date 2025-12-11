/**
 * Path/Choice Generation Decision Module
 *
 * AI-as-code pattern for dungeon path generation.
 *
 * The path mechanics (danger levels, reward calculations) are deterministic,
 * handled by path-system and game-mechanics-ledger. AI decides:
 * - Path preview descriptions
 * - Environmental hints
 * - Atmosphere and mood
 *
 * NO FALLBACKS - AI must succeed or the game fails visibly.
 */

import { z } from "zod"
import { generateWithAI, AI_CONFIG } from "@/lib/ai/ai-utils"
import type { TurnDecision, NarrativeEffect } from "@/lib/effects"

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type RoomType = "enemy" | "treasure" | "trap" | "shrine" | "npc" | "rest" | "boss" | "mystery" | "vault"
export type DangerLevel = "safe" | "moderate" | "dangerous" | "unknown"
export type RewardLevel = "poor" | "standard" | "rich" | "unknown"

export interface PathGenerationContext {
  floor: number
  currentRoom: number
  dungeonName?: string
  dungeonTheme?: string
  player: {
    class?: string
    level: number
    healthPercent: number
    gold: number
  }
  pathCount: number
  pathConfigs: Array<{
    roomType: RoomType
    danger: DangerLevel
    reward: RewardLevel
    isVault?: boolean
    isMystery?: boolean
  }>
  recentRoomTypes: RoomType[]
}

export interface SinglePathContext {
  floor: number
  currentRoom: number
  dungeonTheme?: string
  roomType: RoomType
  danger: DangerLevel
  reward: RewardLevel
  isVault?: boolean
  isMystery?: boolean
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const pathPreviewSchema = z.object({
  preview: z.string().describe("1 sentence atmospheric hint about what lies ahead"),
  environmentHint: z.string().describe("Brief description of the passage/entrance"),
  sensoryDetail: z.string().optional().describe("What the player sees/hears/smells"),
})

const pathSetSchema = z.object({
  paths: z.array(z.object({
    preview: z.string().describe("1 sentence atmospheric hint"),
    environmentHint: z.string().describe("Brief passage description"),
  })).describe("Path descriptions, one per pathConfig"),
  atmosphere: z.string().optional().describe("Overall atmosphere of the branching point"),
})

// =============================================================================
// AI DECISION FUNCTIONS
// =============================================================================

/**
 * Generate preview descriptions for a set of paths.
 * NO FALLBACKS - AI must succeed.
 */
export async function decidePathPreviews(
  context: PathGenerationContext
): Promise<{
  paths: Array<{ preview: string; environmentHint: string }>
  atmosphere?: string
}> {
  const systemPrompt = `You are generating path previews in a dark fantasy dungeon crawler.
Players see cryptic hints about what lies down each path before choosing.

PATH TYPES AND THEIR HINTS:
- enemy/combat: Sounds of movement, growls, smell of blood, scraping claws
- treasure: Glinting metal, smell of coins, ancient chests visible
- trap: Too-quiet passages, scratches on walls, suspicious floor
- shrine: Divine light, incense, presence of something ancient
- npc: Voices, torchlight, signs of habitation
- rest: Calm air, soft light, worn stones, peace
- boss: Immense power, trembling walls, throne room vibes
- mystery: Reality bending, impossible doorways, uncertainty
- vault: Ancient seals, powerful wards, promise of great treasure

DANGER LEVEL AFFECTS TONE:
- safe: Welcoming, calm, stable
- moderate: Shadowy, uncertain, thick air
- dangerous: Oppressive, instincts screaming, walls closing in
- unknown: Reality uncertain, senses untrustworthy

RULES:
1. Each preview should be exactly 1 cryptic sentence
2. Don't reveal the room type explicitly - hint at it
3. Higher danger = more ominous hints
4. Match dungeon theme in word choice
5. Create variety - don't repeat phrases
6. Environment hints describe the physical passage`

  const pathDescriptions = context.pathConfigs.map((p, i) =>
    `Path ${i + 1}: ${p.roomType} (${p.danger}/${p.reward})${p.isVault ? " [VAULT]" : ""}${p.isMystery ? " [MYSTERY]" : ""}`
  ).join("\n")

  const prompt = `
PATH GENERATION:
- Dungeon: ${context.dungeonName || "Unknown"} (${context.dungeonTheme || "ancient"})
- Floor ${context.floor}, Room ${context.currentRoom}
- Player: Level ${context.player.level} ${context.player.class || "Adventurer"} (${context.player.healthPercent}% HP, ${context.player.gold}g)
- Recent rooms: ${context.recentRoomTypes.slice(-3).join(", ") || "none"}

PATHS TO DESCRIBE:
${pathDescriptions}

Generate preview hints for each path. Match array order.`

  const result = await generateWithAI({
    schema: pathSetSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  return {
    paths: result.paths,
    atmosphere: result.atmosphere,
  }
}

/**
 * Generate preview for a single path.
 * NO FALLBACKS - AI must succeed.
 */
export async function decideSinglePathPreview(
  context: SinglePathContext
): Promise<{ preview: string; environmentHint: string; sensoryDetail?: string }> {
  const systemPrompt = `You are generating a path preview in a dark fantasy dungeon crawler.
Create a cryptic hint about what lies down this path.

RULES:
1. Preview should be exactly 1 cryptic sentence
2. Don't reveal the room type explicitly - hint at it
3. Match danger level in tone
4. Environment hint describes the physical passage
5. Sensory detail adds immersion (sight/sound/smell)`

  const prompt = `
SINGLE PATH:
- Dungeon theme: ${context.dungeonTheme || "ancient"}
- Floor ${context.floor}, Room ${context.currentRoom}
- Room Type: ${context.roomType}
- Danger: ${context.danger}
- Reward: ${context.reward}
${context.isVault ? "- This is a VAULT (special treasure room)" : ""}
${context.isMystery ? "- This is a MYSTERY path (unknown outcome)" : ""}

Generate the path preview.`

  const result = await generateWithAI({
    schema: pathPreviewSchema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  return result
}

/**
 * Generate mystery path outcome preview.
 * Mystery paths have special, cryptic descriptions.
 */
export async function decideMysteryPathPreview(
  context: {
    floor: number
    dungeonTheme?: string
    recentMysteryOutcomes?: string[]
  }
): Promise<{ preview: string; environmentHint: string }> {
  const systemPrompt = `You are generating a MYSTERY path preview in a dark fantasy dungeon.
Mystery paths are special - reality bends around them, and outcomes are unpredictable.

MYSTERY PATH THEMES:
- Impossible geometry (doorways that shouldn't exist)
- Reality distortion (colors wrong, time feels strange)
- Otherworldly presence (something watches)
- Fate uncertain (could be great fortune or doom)

RULES:
1. Preview should be cryptic and unsettling
2. Never reveal what's actually through the door
3. Create a sense of cosmic uncertainty
4. Short - just 1 sentence`

  const prompt = `
MYSTERY PATH:
- Floor ${context.floor}
- Theme: ${context.dungeonTheme || "ancient"}
${context.recentMysteryOutcomes?.length ? `- Recent mystery outcomes: ${context.recentMysteryOutcomes.join(", ")}` : ""}

Generate mystery path preview.`

  const schema = z.object({
    preview: z.string().describe("Cryptic, unsettling 1-sentence hint"),
    environmentHint: z.string().describe("Description of the strange doorway/passage"),
  })

  const result = await generateWithAI({
    schema,
    prompt,
    system: systemPrompt,
    temperature: AI_CONFIG.temperature.creative,
  })

  return result
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function decidePaths(
  context: PathGenerationContext
): Promise<{
  paths: Array<{ preview: string; environmentHint: string }>
  atmosphere?: string
}> {
  return decidePathPreviews(context)
}

export async function decidePath(
  context: SinglePathContext
): Promise<{ preview: string; environmentHint: string; sensoryDetail?: string }> {
  return decideSinglePathPreview(context)
}

export async function decideMystery(
  context: Parameters<typeof decideMysteryPathPreview>[0]
): Promise<{ preview: string; environmentHint: string }> {
  return decideMysteryPathPreview(context)
}
