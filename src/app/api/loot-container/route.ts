/**
 * AI Loot Container / Gacha System
 *
 * Creates the dopamine-driven loot reveal experience:
 * - Generate mysterious sealed containers
 * - Examine containers for hints (build anticipation)
 * - Open with dramatic AI-generated reveal
 */

import { generateWithAI, AI_CONFIG, entityCache } from "@/lib/ai-utils"
import { generateMechanicsPrompt } from "@/lib/game-mechanics-ledger"
import { z } from "zod"
import { NextResponse } from "next/server"

const MECHANICS_PROMPT = generateMechanicsPrompt()

// =============================================================================
// SCHEMAS
// =============================================================================

// Container generation - what you find
const ContainerSchema = z.object({
  id: z.string().describe("Unique container ID"),
  name: z.string().describe("Evocative container name"),
  type: z.enum([
    "chest", "coffer", "lockbox", "urn", "pouch",
    "satchel", "casket", "reliquary", "crate", "barrel"
  ]),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  appearance: z.string().describe("Visual description building mystery"),
  hints: z.object({
    weight: z.string().describe("How heavy it feels"),
    sound: z.string().describe("What you hear when shaken"),
    smell: z.string().nullish().describe("Any scent"),
    aura: z.string().nullish().describe("Magical aura if present"),
  }),
  locked: z.boolean(),
  lockDescription: z.string().nullish(),
  cursed: z.boolean(),
  curseHint: z.string().nullish().describe("Subtle warning if cursed"),
})

// Examination result - build anticipation
const ExamineResultSchema = z.object({
  detailedDescription: z.string().describe("Closer look reveals more details"),
  qualityHint: z.enum(["worthless", "modest", "valuable", "precious", "priceless"]),
  dangerWarning: z.string().nullish().describe("If something seems off"),
  loreFragment: z.string().nullish().describe("Any markings or inscriptions"),
  anticipationText: z.string().describe("Text that builds excitement/dread"),
})

// Opening result - the big reveal
const OpeningResultSchema = z.object({
  openingNarrative: z.string().describe("Dramatic description of opening moment"),
  revealMoment: z.string().describe("The instant contents are revealed - build suspense"),
  contents: z.array(z.object({
    name: z.string(),
    type: z.enum(["weapon", "armor", "trinket", "consumable", "material", "gold", "gem", "artifact", "cursed"]),
    rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
    description: z.string().describe("Appearance description - do NOT claim on-hit effects or procs"),
    value: z.number(),
    damageType: z.enum(["physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane"]).nullish().describe("Weapon damage type - only for weapons"),
    isJackpot: z.boolean().nullish().describe("True for exceptional finds"),
  })),
  jackpotMoment: z.string().nullish().describe("Special text if legendary/jackpot"),
  curseTriggered: z.boolean().nullish(),
  curseEffect: z.string().nullish(),
  afterglow: z.string().describe("How player feels after opening"),
})

// Request schema
const RequestSchema = z.object({
  action: z.enum(["generate", "examine", "open"]),
  // For generate
  floor: z.number().optional(),
  dungeonTheme: z.string().optional(),
  guaranteedRarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]).optional(),
  // For examine/open
  container: ContainerSchema.optional(),
  // Pity system - increase rare chance after bad luck
  opensSinceRare: z.number().optional(),
})

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const GENERATE_SYSTEM = `You are a mysterious loot container generator for a dark fantasy dungeon crawler.
Create containers that build anticipation and mystery.

RULES:
- Names should be evocative and hint at contents
- Appearance should create curiosity
- Hints should tease but not spoil
- Locked containers need interesting lock descriptions
- Cursed containers should have subtle warnings
- Match container type to dungeon theme
- Higher floor = better potential rewards

CONTAINER RARITY AFFECTS:
- common: simple containers, basic loot
- uncommon: decorated containers, decent loot
- rare: ornate containers, valuable loot
- epic: ancient/magical containers, powerful loot
- legendary: mythical containers, legendary loot

Generate mystery and anticipation.`

const EXAMINE_SYSTEM = `You are building anticipation for a loot reveal in a dark fantasy game.
The player is examining a sealed container before opening it.

RULES:
- Build excitement through sensory details
- Hint at quality without spoiling
- Create anticipation text that makes them WANT to open it
- If dangerous, add subtle warnings
- Reference any inscriptions or markings
- Make them feel the weight of the moment

The goal is to maximize the dopamine before the reveal.`

const OPEN_SYSTEM = `You are narrating the climactic moment of opening a loot container.
This is the PAYOFF - make it satisfying.

RULES:
- Opening narrative should build final suspense
- Reveal moment should be dramatic
- Contents should match container rarity
- Jackpot moments need special celebration text
- Even common loot should feel like a discovery
- Cursed items should have ominous reveals
- Afterglow text captures the emotional state

LOOT DISTRIBUTION BY CONTAINER RARITY:
- common: 1-2 items, mostly common/uncommon
- uncommon: 2-3 items, better chance of rare
- rare: 2-4 items, guaranteed at least one rare
- epic: 3-5 items, guaranteed rare, chance of epic
- legendary: 4-6 items, guaranteed epic, high legendary chance

${MECHANICS_PROMPT}

Make the reveal FEEL rewarding.`

// =============================================================================
// HANDLERS
// =============================================================================

async function handleGenerate(
  floor: number,
  dungeonTheme?: string,
  guaranteedRarity?: string,
  opensSinceRare?: number
) {
  // Pity system: increase rare chance after many common opens
  let rarityBoost = 0
  if (opensSinceRare && opensSinceRare > 5) {
    rarityBoost = Math.min(opensSinceRare - 5, 10) * 5 // +5% per open after 5
  }

  // Base rarity distribution with floor scaling
  const floorBonus = Math.min(floor * 2, 20)
  const rarityRoll = Math.random() * 100

  let rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  if (guaranteedRarity) {
    rarity = guaranteedRarity as typeof rarity
  } else if (rarityRoll < 2 + floorBonus / 2 + rarityBoost / 2) {
    rarity = "legendary"
  } else if (rarityRoll < 8 + floorBonus + rarityBoost) {
    rarity = "epic"
  } else if (rarityRoll < 25 + floorBonus + rarityBoost) {
    rarity = "rare"
  } else if (rarityRoll < 55 + floorBonus / 2) {
    rarity = "uncommon"
  } else {
    rarity = "common"
  }

  const prompt = `Generate a mysterious sealed loot container:

Floor: ${floor}
Dungeon Theme: ${dungeonTheme || "ancient ruins"}
Target Rarity: ${rarity}

Create a container that:
- Matches the dungeon atmosphere
- Has intriguing hints about contents
- Builds curiosity and anticipation
- ${rarity === "legendary" ? "Should feel SPECIAL and ancient" : ""}
- ${rarity === "epic" ? "Should have magical properties" : ""}
- ${rarity === "rare" ? "Should look valuable" : ""}

Generate a unique ID using format: container_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  const result = await generateWithAI({
    schema: ContainerSchema,
    prompt,
    system: GENERATE_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 400,
  })

  return result
}

async function handleExamine(container: z.infer<typeof ContainerSchema>) {
  const cacheKey = entityCache.generateKey("examine_container", container.id)
  const cached = entityCache.get(cacheKey)
  if (cached) return cached

  const prompt = `The player examines this sealed container more closely:

Container: ${container.name}
Type: ${container.type}
Rarity: ${container.rarity}
Appearance: ${container.appearance}
Weight: ${container.hints.weight}
Sound when shaken: ${container.hints.sound}
${container.hints.smell ? `Smell: ${container.hints.smell}` : ""}
${container.hints.aura ? `Magical aura: ${container.hints.aura}` : ""}
${container.locked ? `Lock: ${container.lockDescription}` : "Unsealed"}
${container.cursed ? `Warning signs: ${container.curseHint}` : ""}

Build anticipation for the opening. Make them WANT to open it.
${container.rarity === "legendary" ? "This is LEGENDARY - build maximum hype!" : ""}
${container.cursed ? "Include subtle danger warnings without spoiling." : ""}`

  const result = await generateWithAI({
    schema: ExamineResultSchema,
    prompt,
    system: EXAMINE_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 350,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleOpen(container: z.infer<typeof ContainerSchema>) {
  // Don't cache opens - each should be unique

  const prompt = `The player opens the container. THIS IS THE BIG MOMENT.

Container: ${container.name}
Type: ${container.type}
Rarity: ${container.rarity}
Appearance: ${container.appearance}
${container.locked ? "They picked/broke the lock." : ""}
${container.cursed ? "WARNING: This container is cursed!" : ""}

RARITY: ${container.rarity.toUpperCase()}
${container.rarity === "legendary" ? "THIS IS A LEGENDARY CONTAINER - Generate amazing loot and CELEBRATE!" : ""}
${container.rarity === "epic" ? "This is an epic container - generate impressive loot!" : ""}
${container.rarity === "rare" ? "This is a rare container - generate valuable loot." : ""}

Generate:
1. Dramatic opening narrative (the moment of truth)
2. The reveal moment (suspenseful)
3. Contents matching the rarity tier
4. ${container.rarity === "legendary" || container.rarity === "epic" ? "Special jackpot celebration text" : ""}
5. ${container.cursed ? "Curse trigger description" : ""}
6. How the player feels after

Make it SATISFYING.`

  const result = await generateWithAI({
    schema: OpeningResultSchema,
    prompt,
    system: OPEN_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 800,
  })

  return result
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.parse(body)

    let result: unknown

    switch (parsed.action) {
      case "generate":
        result = await handleGenerate(
          parsed.floor || 1,
          parsed.dungeonTheme,
          parsed.guaranteedRarity,
          parsed.opensSinceRare
        )
        break

      case "examine":
        if (!parsed.container) {
          return NextResponse.json(
            { error: "Container required for examination" },
            { status: 400 }
          )
        }
        result = await handleExamine(parsed.container)
        break

      case "open":
        if (!parsed.container) {
          return NextResponse.json(
            { error: "Container required for opening" },
            { status: 400 }
          )
        }
        result = await handleOpen(parsed.container)
        break

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Loot Container API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "The container's secrets remain hidden..." },
      { status: 500 }
    )
  }
}
