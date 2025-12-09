/**
 * AI Item Identification API
 *
 * Analyzes unknown items and reveals their true nature
 */

import { generateWithAI, AI_CONFIG, entityCache } from "@/lib/ai-utils"
import { generateMechanicsPrompt } from "@/lib/game-mechanics-ledger"
import { z } from "zod"
import { NextResponse } from "next/server"

const MECHANICS_PROMPT = generateMechanicsPrompt()

// Schema for identified item
const IdentifiedItemSchema = z.object({
  trueName: z.string().describe("The revealed true name of the item"),
  type: z.enum(["weapon", "armor", "potion", "misc", "trinket", "material"]),
  description: z.string().describe("Appearance and nature - do NOT claim on-hit effects"),
  lore: z.string().describe("Brief history or origin of this item"),
  damageType: z.enum(["physical", "fire", "ice", "lightning", "shadow", "holy", "poison", "arcane"]).nullish().describe("Weapon damage type - only for weapons"),
  stats: z.object({
    attack: z.number().nullish(),
    defense: z.number().nullish(),
    health: z.number().nullish(),
  }).nullish().describe("Stat bonuses if applicable"),
  revealText: z.string().describe("Dramatic text for the moment of revelation"),
  warnings: z.array(z.string()).nullish().describe("Any dangers or curses"),
})

const RequestSchema = z.object({
  unknownItem: z.object({
    name: z.string(),
    appearance: z.string(),
    sourceContext: z.string(),
    sensoryDetails: z.object({
      smell: z.string().optional(),
      texture: z.string().optional(),
      sound: z.string().optional(),
      weight: z.string().optional(),
    }).optional(),
    possibleUses: z.array(z.string()).optional(),
    aiHints: z.array(z.string()).optional(),
    rarity: z.string(),
  }),
  identificationMethod: z.string().describe("How the player is identifying it"),
  playerClass: z.string().optional(),
  floor: z.number().optional(),
})

const SYSTEM_PROMPT = `You are an item identifier for a dark fantasy dungeon crawler.
Analyze unknown items and reveal their true nature.

RULES:
- Match revealed item to the source context and appearance
- Higher rarity = more powerful/dangerous effects
- Include dramatic reveal text for the discovery moment
- Warnings for cursed or dangerous items
- Keep descriptions atmospheric and brief
- Effects should be mechanically meaningful

${MECHANICS_PROMPT}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.parse(body)
    const { unknownItem, identificationMethod, playerClass, floor = 1 } = parsed

    const cacheKey = entityCache.generateKey("identify", unknownItem.name, unknownItem.rarity, floor)
    const cached = entityCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const prompt = `Identify this unknown item:

Name: ${unknownItem.name}
Appearance: ${unknownItem.appearance}
Source: ${unknownItem.sourceContext}
Rarity: ${unknownItem.rarity}
${unknownItem.sensoryDetails?.smell ? `Smell: ${unknownItem.sensoryDetails.smell}` : ""}
${unknownItem.sensoryDetails?.texture ? `Texture: ${unknownItem.sensoryDetails.texture}` : ""}
${unknownItem.sensoryDetails?.sound ? `Sound: ${unknownItem.sensoryDetails.sound}` : ""}
${unknownItem.aiHints?.length ? `Hints: ${unknownItem.aiHints.join(", ")}` : ""}

Identification method: ${identificationMethod}
${playerClass ? `Player class: ${playerClass}` : ""}
Floor depth: ${floor}

Reveal the item's true nature, purpose, and any effects or dangers.
The reveal text should be atmospheric and dramatic.`

    const result = await generateWithAI({
      schema: IdentifiedItemSchema,
      prompt,
      system: SYSTEM_PROMPT,
      temperature: AI_CONFIG.temperature.creative,
      maxTokens: 500,
    })

    entityCache.set(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Identify API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "The item resists identification..." },
      { status: 500 }
    )
  }
}
