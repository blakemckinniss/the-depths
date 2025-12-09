/**
 * AI NPC Dialogue Generation API
 *
 * Generates context-aware NPC dialogue based on their personality,
 * role, and current game state
 */

import { generateWithAI, AI_CONFIG, entityCache } from "@/lib/ai-utils"
import { generateMechanicsPrompt } from "@/lib/game-mechanics-ledger"
import { z } from "zod"
import { NextResponse } from "next/server"

// Get mechanics prompt once at module load
const MECHANICS_PROMPT = generateMechanicsPrompt()

// Schema for NPC dialogue response
const DialogueResponseSchema = z.object({
  greeting: z.string().describe("Initial greeting based on disposition"),
  dialogue: z.array(z.object({
    text: z.string().describe("What the NPC says"),
    emotion: z.enum(["neutral", "friendly", "suspicious", "fearful", "excited", "mysterious"]),
  })).describe("Main dialogue lines"),
  options: z.array(z.object({
    text: z.string().describe("Player response option"),
    tone: z.enum(["friendly", "aggressive", "curious", "dismissive"]),
    outcome: z.string().describe("Brief hint about what this leads to"),
  })).describe("2-4 dialogue options for the player"),
  secrets: z.array(z.string()).nullish().describe("Information NPC might reveal if trust is high"),
  questHook: z.object({
    available: z.boolean(),
    hint: z.string().nullish(),
  }).nullish().describe("Whether NPC has a quest to offer"),
})

const RequestSchema = z.object({
  npc: z.object({
    name: z.string(),
    role: z.enum(["merchant", "trapped", "mysterious", "quest_giver"]),
    personality: z.string(),
    disposition: z.number().describe("0-100, how friendly they are"),
  }),
  context: z.object({
    dungeonName: z.string().optional(),
    dungeonTheme: z.string().optional(),
    floor: z.number(),
    playerClass: z.string().optional(),
    playerHealth: z.number().optional().describe("Percentage of max health"),
    recentEvents: z.array(z.string()).optional().describe("Recent things that happened"),
  }),
  conversationHistory: z.array(z.string()).optional().describe("Previous exchanges"),
})

const SYSTEM_PROMPT = `You are an NPC dialogue generator for a dark fantasy dungeon crawler.
Generate immersive, personality-driven dialogue.

RULES:
- Match dialogue to NPC personality and role
- Disposition affects friendliness (0=hostile, 100=devoted)
- Merchants should mention wares naturally
- Trapped NPCs should seem desperate but cautious
- Mysterious NPCs speak in riddles/hints
- Quest givers should tease their quest naturally
- Keep individual lines brief (1-2 sentences)
- Provide 2-4 meaningful response options
- Dark fantasy tone - no modern references

When NPCs mention items, effects, or abilities, only reference mechanics that actually exist in the game:
${MECHANICS_PROMPT}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.parse(body)
    const { npc, context, conversationHistory } = parsed

    // Cache key includes disposition range for variety
    const dispositionRange = npc.disposition < 30 ? "hostile" : npc.disposition < 60 ? "neutral" : "friendly"
    const cacheKey = entityCache.generateKey("npc_dialogue", npc.name, npc.role, dispositionRange, context.floor)
    const cached = entityCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const prompt = `Generate dialogue for this NPC:

NPC: ${npc.name}
Role: ${npc.role}
Personality: ${npc.personality}
Disposition: ${npc.disposition}/100 (${dispositionRange})

Context:
- Dungeon: ${context.dungeonName || "Unknown"} (${context.dungeonTheme || "dark"} theme)
- Floor: ${context.floor}
${context.playerClass ? `- Speaking to: ${context.playerClass}` : ""}
${context.playerHealth !== undefined ? `- Player appears ${context.playerHealth < 30 ? "badly wounded" : context.playerHealth < 60 ? "injured" : "healthy"}` : ""}
${context.recentEvents?.length ? `- Recent events: ${context.recentEvents.join(", ")}` : ""}

${conversationHistory?.length ? `Previous conversation:\n${conversationHistory.join("\n")}` : "This is the first meeting."}

Generate an appropriate greeting, dialogue, and response options.
${npc.role === "quest_giver" ? "Include a quest hook." : ""}
${npc.role === "merchant" ? "Naturally work in mention of their wares." : ""}
${npc.role === "trapped" ? "They should be cautious but hopeful for rescue." : ""}
${npc.role === "mysterious" ? "Speak cryptically, hinting at secrets." : ""}`

    const result = await generateWithAI({
      schema: DialogueResponseSchema,
      prompt,
      system: SYSTEM_PROMPT,
      temperature: AI_CONFIG.temperature.creative,
      maxTokens: 600,
    })

    entityCache.set(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("NPC Dialogue API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "The NPC seems lost in thought..." },
      { status: 500 }
    )
  }
}
