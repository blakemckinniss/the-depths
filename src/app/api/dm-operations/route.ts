import {
  generateWithAI,
  buildSystemPrompt,
  AI_CONFIG,
} from "@/lib/ai/ai-utils";
import {
  generateDMCapabilitiesPrompt,
  DM_OPERATIONS,
  ENTITY_LINK_TYPES,
  RULE_MODIFIERS,
  ENTITY_MUTATIONS,
  isValidTransformation,
  isValidLinkForEntities,
  canMergeEntities,
} from "@/lib/mechanics/game-mechanics-ledger";
import {
  dmOperationRequestSchema,
  dmCreativeEventSchema,
  entityTransformationSchema,
  entityLinkSchema,
  ruleModifierGrantSchema,
  entitySpawnSchema,
  entityMutationSchema,
  entityMergeSchema,
} from "@/lib/ai/ai-schemas";

export async function POST(req: Request) {
  const body = await req.json();
  const { operationType, context } = body;

  // Build system prompt with DM capabilities context
  const system = buildSystemPrompt({
    dungeonName: context.dungeonName,
    dungeonTheme: context.dungeonTheme,
    floor: context.floor,
    room: context.room,
    playerLevel: context.playerLevel,
    playerHealth: context.playerHealth,
    maxHealth: context.maxHealth,
    playerClass: context.playerClass,
    companions: context.companions,
    currentHazard: context.currentHazard,
    recentEvents: context.recentEvents,
    includeMechanics: ["events", "effects", "companions"],
  });

  // Add DM capabilities to the system prompt
  const dmCapabilities = generateDMCapabilitiesPrompt();
  const enhancedSystem = `${system}\n\n${dmCapabilities}`;

  switch (operationType) {
    // Direct operation request - AI generates a specific operation
    case "dm_operation": {
      return Response.json(
        await generateWithAI({
          schema: dmOperationRequestSchema,
          prompt: `Generate a DM operation based on the current game context.

CURRENT STATE:
- Entities present: ${context.entities?.map((e: { id: string; type: string; name: string }) => `${e.name} (${e.type}, ${e.id})`).join(", ") || "none"}
- Active links: ${context.activeLinks?.length || 0}
- Active modifiers: ${context.activeModifiers?.length || 0}
- Situation: ${context.situation || "exploration"}

TRIGGER: ${context.trigger || "narrative opportunity"}

CONSTRAINTS:
- Power level: ${context.maxPowerLevel || 5}
- Must be reversible: ${context.mustBeReversible ? "yes" : "no"}
- Allowed operations: ${context.allowedOperations?.join(", ") || "any"}

Available operations: ${DM_OPERATIONS.join(", ")}

Generate an appropriate DM operation that enhances the narrative while staying within bounds.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 600,
          useCache: false,
        }),
      );
    }

    // Creative event - AI suggests a transformation, link, or modifier
    case "creative_event": {
      return Response.json(
        await generateWithAI({
          schema: dmCreativeEventSchema,
          prompt: `Generate a creative DM event for this moment.

NARRATIVE CONTEXT:
${context.narrativeContext || "The player progresses through the dungeon."}

ENTITIES AVAILABLE:
${context.entities?.map((e: { id: string; type: string; name: string; description?: string }) =>
  `- ${e.name} (${e.type}): ${e.description || "no description"}`
).join("\n") || "No entities"}

RECENT EVENTS:
${context.recentEvents?.join("\n") || "None"}

PLAYER STATE:
- Class: ${context.playerClass || "adventurer"}
- Level: ${context.playerLevel || 1}
- Health: ${context.playerHealth}/${context.maxHealth}
- Companions: ${context.companions?.length || 0}

EVENT GUIDELINES:
- Create something memorable and impactful
- Stay within TCG-style bounded creativity
- Consider offering player choice when appropriate
- Power level should match floor/difficulty: ${context.floor || 1}
- Theme: ${context.dungeonTheme || "dark fantasy"}

What creative event should occur?`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 800,
          useCache: false,
        }),
      );
    }

    // Entity transformation
    case "transformation": {
      // Validate transformation is valid before generating
      if (context.sourceType && context.targetType) {
        if (!isValidTransformation(context.sourceType, context.targetType)) {
          return Response.json(
            { error: `Invalid transformation: ${context.sourceType} → ${context.targetType}` },
            { status: 400 }
          );
        }
      }

      return Response.json(
        await generateWithAI({
          schema: entityTransformationSchema,
          prompt: `Generate an entity transformation.

SOURCE ENTITY:
- ID: ${context.entityId}
- Name: ${context.entityName}
- Type: ${context.sourceType}
- Description: ${context.entityDescription || "unknown"}

TRANSFORMATION TRIGGER: ${context.trigger}

TARGET TYPE: ${context.targetType || "determine based on context"}

NARRATIVE REASON: ${context.narrativeReason || "the entity undergoes a metamorphosis"}

Generate a dramatic transformation with appropriate mutations.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 500,
          useCache: false,
        }),
      );
    }

    // Entity link creation
    case "create_link": {
      // Validate link type
      if (context.linkType && context.sourceType && context.targetType) {
        if (!isValidLinkForEntities(context.linkType, context.sourceType, context.targetType)) {
          return Response.json(
            { error: `Invalid link: ${context.linkType} between ${context.sourceType} and ${context.targetType}` },
            { status: 400 }
          );
        }
      }

      return Response.json(
        await generateWithAI({
          schema: entityLinkSchema,
          prompt: `Generate an entity link/bond.

SOURCE ENTITY:
- ID: ${context.sourceEntityId}
- Name: ${context.sourceName}
- Type: ${context.sourceType}

TARGET ENTITY:
- ID: ${context.targetEntityId}
- Name: ${context.targetName}
- Type: ${context.targetType}

LINK CONTEXT: ${context.linkContext || "a mysterious connection forms"}

SUGGESTED LINK TYPE: ${context.linkType || "determine based on context"}
Available link types: ${ENTITY_LINK_TYPES.join(", ")}

Generate the mechanical bond between these entities.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 500,
          useCache: false,
        }),
      );
    }

    // Grant rule modifier
    case "grant_modifier": {
      return Response.json(
        await generateWithAI({
          schema: ruleModifierGrantSchema,
          prompt: `Generate a rule modifier grant.

TARGET ENTITY:
- ID: ${context.targetEntityId}
- Name: ${context.targetName}
- Type: ${context.targetType}

SOURCE: ${context.source || "unknown power"}
SOURCE TYPE: ${context.sourceType || "event"}

SITUATION: ${context.situation || "a moment of power"}

Available modifiers: ${Object.keys(RULE_MODIFIERS).join(", ")}

Generate an appropriate TCG-style modifier for this entity.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 400,
          useCache: false,
        }),
      );
    }

    // Spawn entity
    case "spawn": {
      return Response.json(
        await generateWithAI({
          schema: entitySpawnSchema,
          prompt: `Generate a new entity spawn.

SPAWN CONTEXT: ${context.spawnContext || "something emerges from the shadows"}

ENTITY TYPE PREFERENCE: ${context.entityType || "any"}
POWER TIER: ${context.tier || "standard"}
SPAWN TRIGGER: ${context.trigger || "narrative"}

LINKED TO: ${context.linkedTo ? `${context.linkedToName} (${context.linkedToType})` : "nothing"}

Available mutations: ${ENTITY_MUTATIONS.join(", ")}

Generate the spawned entity details.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 600,
          useCache: false,
        }),
      );
    }

    // Apply mutations
    case "mutate": {
      return Response.json(
        await generateWithAI({
          schema: entityMutationSchema,
          prompt: `Generate mutations for an entity.

TARGET ENTITY:
- ID: ${context.targetEntityId}
- Name: ${context.targetName}
- Type: ${context.targetType}
- Current state: ${context.currentState || "normal"}

MUTATION TRIGGER: ${context.trigger || "exposure to dark forces"}
MUTATION SOURCE: ${context.source || "unknown"}

Available mutations: ${ENTITY_MUTATIONS.join(", ")}

Generate appropriate mutations based on context.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 400,
          useCache: false,
        }),
      );
    }

    // Merge entities
    case "merge": {
      // Validate merge
      if (context.baseType && context.mergeTypes) {
        for (const mergeType of context.mergeTypes) {
          if (!canMergeEntities(context.baseType, mergeType)) {
            return Response.json(
              { error: `Invalid merge: ${context.baseType} + ${mergeType}` },
              { status: 400 }
            );
          }
        }
      }

      return Response.json(
        await generateWithAI({
          schema: entityMergeSchema,
          prompt: `Generate an entity merge.

BASE ENTITY:
- ID: ${context.baseEntityId}
- Name: ${context.baseName}
- Type: ${context.baseType}

MERGING ENTITIES:
${context.mergeEntities?.map((e: { id: string; name: string; type: string }) =>
  `- ${e.name} (${e.type}): ${e.id}`
).join("\n") || "unknown"}

MERGE TRIGGER: ${context.trigger || "entities combine"}

Generate the merged entity form.`,
          system: enhancedSystem,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 500,
          useCache: false,
        }),
      );
    }

    default:
      return Response.json(
        { error: `Unknown operation type: ${operationType}` },
        { status: 400 }
      );
  }
}
