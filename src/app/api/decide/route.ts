/**
 * Central AI Decision Route
 *
 * Unified entry point for ALL game AI decisions.
 * Dispatches to the appropriate decision module based on action type.
 *
 * NO FALLBACKS - if AI fails, the request fails with an error.
 * The client is responsible for handling errors appropriately.
 */

import { NextResponse } from "next/server"
import { z } from "zod"

// Import all decision modules
import { decideRoomNarrative, decideMysteryOutcome, decideDescendNarrative } from "@/hooks/room-decision"
import { decideLootDrop, decideContainerReveal } from "@/hooks/loot-decision"
import { decideNPCAction } from "@/hooks/npc-decision"
import { decideTrapAction } from "@/hooks/trap-decision"
import { decideEnvironmentalInteraction, decideExplorationChoices } from "@/hooks/environmental-decision"
import { decideCompanionTurn, decideCompanionTameReaction } from "@/hooks/companion-decision"
import { decideBossTurn, decideBossPhaseTransition, decideBossParley } from "@/hooks/boss-decision"
import { decidePathPreviews, decideSinglePathPreview, decideMysteryPathPreview } from "@/hooks/path-decision"

// Import shrine and ability decision modules if they exist
// These were created in earlier sessions
import { decideShrineInteraction } from "@/hooks/shrine-decision"
import { decideAbilityCastNarration } from "@/hooks/ability-decision"

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

const DecisionRequestSchema = z.object({
  // The type of decision to make
  action: z.enum([
    // Room/Navigation
    "room_narrative",
    "mystery_outcome",
    "descend_narrative",
    "path_previews",
    "single_path_preview",
    "mystery_path_preview",
    // Combat
    "companion_turn",
    "companion_tame",
    "boss_turn",
    "boss_phase_transition",
    "boss_parley",
    "ability_execution",
    // Encounters
    "loot_drop",
    "container_reveal",
    "npc_action",
    "trap_action",
    "shrine_interaction",
    // Exploration
    "environmental_interaction",
    "exploration_choices",
  ]),
  // Context data - varies by action type
  context: z.record(z.unknown()),
})

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { action, context } = DecisionRequestSchema.parse(body)

    let result: unknown

    switch (action) {
      // ========================================
      // Room/Navigation Decisions
      // ========================================
      case "room_narrative":
        result = await decideRoomNarrative(context as unknown as Parameters<typeof decideRoomNarrative>[0])
        break

      case "mystery_outcome":
        result = await decideMysteryOutcome(context as unknown as Parameters<typeof decideMysteryOutcome>[0])
        break

      case "descend_narrative":
        result = await decideDescendNarrative(context as unknown as Parameters<typeof decideDescendNarrative>[0])
        break

      case "path_previews":
        result = await decidePathPreviews(context as unknown as Parameters<typeof decidePathPreviews>[0])
        break

      case "single_path_preview":
        result = await decideSinglePathPreview(context as unknown as Parameters<typeof decideSinglePathPreview>[0])
        break

      case "mystery_path_preview":
        result = await decideMysteryPathPreview(context as unknown as Parameters<typeof decideMysteryPathPreview>[0])
        break

      // ========================================
      // Combat Decisions
      // ========================================
      case "companion_turn":
        result = await decideCompanionTurn(context as unknown as Parameters<typeof decideCompanionTurn>[0])
        break

      case "companion_tame":
        result = await decideCompanionTameReaction(context as unknown as Parameters<typeof decideCompanionTameReaction>[0])
        break

      case "boss_turn":
        result = await decideBossTurn(context as unknown as Parameters<typeof decideBossTurn>[0])
        break

      case "boss_phase_transition":
        result = await decideBossPhaseTransition(context as unknown as Parameters<typeof decideBossPhaseTransition>[0])
        break

      case "boss_parley":
        result = await decideBossParley(context as unknown as Parameters<typeof decideBossParley>[0])
        break

      case "ability_execution":
        result = await decideAbilityCastNarration(context as unknown as Parameters<typeof decideAbilityCastNarration>[0])
        break

      // ========================================
      // Encounter Decisions
      // ========================================
      case "loot_drop":
        result = await decideLootDrop(context as unknown as Parameters<typeof decideLootDrop>[0])
        break

      case "container_reveal":
        result = await decideContainerReveal(context as unknown as Parameters<typeof decideContainerReveal>[0])
        break

      case "npc_action":
        result = await decideNPCAction(context as unknown as Parameters<typeof decideNPCAction>[0])
        break

      case "trap_action":
        result = await decideTrapAction(context as unknown as Parameters<typeof decideTrapAction>[0])
        break

      case "shrine_interaction":
        result = await decideShrineInteraction(context as unknown as Parameters<typeof decideShrineInteraction>[0])
        break

      // ========================================
      // Exploration Decisions
      // ========================================
      case "environmental_interaction":
        result = await decideEnvironmentalInteraction(context as unknown as Parameters<typeof decideEnvironmentalInteraction>[0])
        break

      case "exploration_choices":
        result = await decideExplorationChoices(context as unknown as Parameters<typeof decideExplorationChoices>[0])
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      action,
      result,
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime

    console.error("Decision API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: error.errors,
          meta: { duration },
        },
        { status: 400 }
      )
    }

    // NO FALLBACKS - return the error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI decision failed",
        meta: { duration },
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - List available actions
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: "AI Decision API",
    version: "1.0.0",
    description: "Central entry point for all game AI decisions. NO FALLBACKS.",
    actions: {
      room_navigation: [
        "room_narrative",
        "mystery_outcome",
        "descend_narrative",
        "path_previews",
        "single_path_preview",
        "mystery_path_preview",
      ],
      combat: [
        "companion_turn",
        "companion_tame",
        "boss_turn",
        "boss_phase_transition",
        "boss_parley",
        "ability_execution",
      ],
      encounters: [
        "loot_drop",
        "container_reveal",
        "npc_action",
        "trap_action",
        "shrine_interaction",
      ],
      exploration: [
        "environmental_interaction",
        "exploration_choices",
      ],
    },
    usage: {
      method: "POST",
      body: {
        action: "string - one of the actions listed above",
        context: "object - context data specific to the action",
      },
    },
  })
}
