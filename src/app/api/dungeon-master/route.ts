import { generateWithAI, buildSystemPrompt, AI_CONFIG, entityCache, type MechanicsArea } from "@/lib/ai/ai-utils"
import {
  roomSchema,
  enemyEncounterSchema,
  playerAttackSchema,
  enemyAttackSchema,
  dmVictorySchema,
  lootSchema,
  goldDiscoverySchema,
  fleeSuccessSchema,
  fleeFailSchema,
  playerDeathSchema,
  descendSchema,
  emptyRoomSchema,
  explorationChoicesSchema,
} from "@/lib/ai/ai-schemas"

export async function POST(req: Request) {
  const body = await req.json()
  const { type, context } = body

  // Get mechanics areas relevant to each narration type
  const getMechanicsForType = (narrativeType: string): MechanicsArea[] => {
    switch (narrativeType) {
      case "room":
      case "empty_room":
        return ["events", "paths", "progression", "chaos"];
      case "enemy_encounter":
      case "player_attack":
      case "enemy_attack":
        return ["combat", "enemies", "levels", "effects"];
      case "victory":
        return ["combat", "economy", "levels", "effects", "items"];
      case "loot":
      case "gold_discovery":
        return ["items", "economy"];
      case "flee_success":
      case "flee_fail":
        return ["combat", "skills"];
      case "player_death":
        // Death is a dramatic moment - give comprehensive context
        return ["combat", "enemies", "levels", "progression"];
      case "descend":
        return ["progression", "events", "chaos"];
      default:
        return ["events", "levels"];
    }
  };

  const system = buildSystemPrompt({
    dungeonName: context.dungeonName || "Depths of Shadowmire",
    dungeonTheme: context.dungeonTheme || "cursed ancient dungeon",
    floor: context.floor,
    room: context.roomNumber,
    playerLevel: context.playerLevel,
    playerHealth: context.playerHealth,
    maxHealth: context.maxHealth,
    playerClass: context.playerClass,
    companions: context.companions,
    currentHazard: context.currentHazard,
    recentEvents: context.recentEvents,
    includeMechanics: getMechanicsForType(type),
  })

  // Temperature based on narration type
  const temperature = type === "player_death"
    ? AI_CONFIG.temperature.creative
    : AI_CONFIG.temperature.narrative

  switch (type) {
    case "room": {
      const cacheKey = entityCache.generateKey("dm", "room", context.floor, context.roomNumber)
      return Response.json(await generateWithAI({
        schema: roomSchema,
        prompt: `The player enters room ${context.roomNumber} on floor ${context.floor}.
Player health: ${context.playerHealth}/${context.maxHealth}.
Generate an atmospheric room description and what happens when they enter.`,
        system,
        temperature,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "enemy_encounter": {
      return Response.json(await generateWithAI({
        schema: enemyEncounterSchema,
        prompt: `A ${context.enemyName} appears!
Enemy stats: ${context.enemyHealth} HP, ${context.enemyAttack} attack.
Player is on floor ${context.floor}, room ${context.roomNumber}.
${context.isBoss ? "This is a BOSS encounter - make it dramatic and terrifying." : ""}`,
        system,
        temperature: context.isBoss ? AI_CONFIG.temperature.creative : temperature,
        maxTokens: 300,
        useCache: false, // Combat is dynamic
      }))
    }

    case "player_attack": {
      return Response.json(await generateWithAI({
        schema: playerAttackSchema,
        prompt: `The player attacks ${context.enemyName} for ${context.damage} damage.
${context.playerWeapon ? `Player wields: ${context.playerWeapon}` : "Player attacks with bare fists."}
Enemy current HP: ${context.enemyHealth}/${context.enemyMaxHealth} after this hit.
${context.isCritical ? "This was a powerful blow!" : ""}`,
        system,
        temperature,
        maxTokens: 200,
        useCache: false,
      }))
    }

    case "enemy_attack": {
      return Response.json(await generateWithAI({
        schema: enemyAttackSchema,
        prompt: `The ${context.enemyName} attacks the player for ${context.damage} damage.
Player HP after: ${context.playerHealth}/${context.maxHealth}.
${context.playerHealth < context.maxHealth * 0.3 ? "Player is critically wounded!" : ""}`,
        system,
        temperature,
        maxTokens: 200,
        useCache: false,
      }))
    }

    case "victory": {
      return Response.json(await generateWithAI({
        schema: dmVictorySchema,
        prompt: `The player defeats ${context.enemyName}!
Gained: ${context.expGain} experience, ${context.goldGain} gold.
${context.lootName ? `Dropped loot: ${context.lootName} (${context.lootRarity})` : "No loot dropped."}
${context.leveledUp ? "The player leveled up!" : ""}`,
        system,
        temperature,
        maxTokens: 200,
        useCache: false,
      }))
    }

    case "loot": {
      const cacheKey = entityCache.generateKey("dm", "loot", context.itemType, context.itemRarity, context.floor)
      return Response.json(await generateWithAI({
        schema: lootSchema,
        prompt: `The player finds treasure in room ${context.roomNumber}.
Item found: ${context.itemName} (${context.itemType}, ${context.itemRarity} rarity).`,
        system,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 200,
        cacheKey,
      }))
    }

    case "gold_discovery": {
      return Response.json(await generateWithAI({
        schema: goldDiscoverySchema,
        prompt: `The player finds ${context.goldAmount} gold coins in room ${context.roomNumber}.`,
        system,
        temperature,
        maxTokens: 150,
        useCache: false,
      }))
    }

    case "flee_success": {
      return Response.json(await generateWithAI({
        schema: fleeSuccessSchema,
        prompt: `The player successfully flees from ${context.enemyName}!`,
        system,
        temperature,
        maxTokens: 150,
        useCache: false,
      }))
    }

    case "flee_fail": {
      return Response.json(await generateWithAI({
        schema: fleeFailSchema,
        prompt: `The player fails to flee from ${context.enemyName} and takes ${context.damage} damage!
Player HP: ${context.playerHealth}/${context.maxHealth} after the hit.`,
        system,
        temperature,
        maxTokens: 150,
        useCache: false,
      }))
    }

    case "player_death": {
      return Response.json(await generateWithAI({
        schema: playerDeathSchema,
        prompt: `The player has been slain by ${context.enemyName} on floor ${context.floor}, room ${context.roomNumber}.
They reached level ${context.playerLevel} and collected ${context.goldTotal} gold.
Create a dramatic, dark death narration.`,
        system,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 300,
        useCache: false,
      }))
    }

    case "descend": {
      const cacheKey = entityCache.generateKey("dm", "descend", context.newFloor)
      return Response.json(await generateWithAI({
        schema: descendSchema,
        prompt: `The player descends to floor ${context.newFloor} of the dungeon.
They have explored ${context.roomsExplored} rooms and are level ${context.playerLevel}.`,
        system,
        temperature,
        maxTokens: 200,
        cacheKey,
      }))
    }

    case "empty_room": {
      const cacheKey = entityCache.generateKey("dm", "empty", context.floor, context.roomNumber % 5) // Cache by pattern
      return Response.json(await generateWithAI({
        schema: emptyRoomSchema,
        prompt: `The player finds an empty room (room ${context.roomNumber}, floor ${context.floor}).
Nothing of immediate interest, but the atmosphere should still be unsettling.`,
        system,
        temperature,
        maxTokens: 200,
        cacheKey,
      }))
    }

    case "exploration_choices": {
      // Build entity context
      const entitiesDesc = context.entities?.length > 0
        ? `Environmental entities in room: ${context.entities.map((e: { name: string; entityClass: string; interactionTags?: string[] }) =>
            `${e.name} (${e.entityClass}${e.interactionTags?.length ? `, tags: ${e.interactionTags.join(", ")}` : ""})`
          ).join("; ")}`
        : "No special entities present.";

      const playerContext = `Player: Level ${context.playerLevel} ${context.playerClass || "Adventurer"}, ` +
        `HP: ${context.playerHealth}/${context.maxHealth}` +
        (context.hasPotion ? ", has healing potion" : "") +
        (context.lowHealth ? " (wounded)" : "");

      const roomContext = context.roomNarrative
        ? `Current scene: ${context.roomNarrative}`
        : `Room ${context.roomNumber} on floor ${context.floor}.`;

      return Response.json(await generateWithAI({
        schema: explorationChoicesSchema,
        prompt: `Generate 2-5 contextual exploration choices for the player.

${roomContext}
${entitiesDesc}
${playerContext}

ALWAYS include one "explore" type choice to progress deeper.
If entities exist, include interaction choices for them.
If player is wounded and has potions, suggest resting.
Make choices feel natural to the scene - don't force variety if the situation is simple.
Choices should range from safe to risky based on dungeon floor and player state.`,
        system,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 400,
        useCache: false, // Choices should feel fresh
      }))
    }

    default:
      return Response.json({ error: "Unknown event type" }, { status: 400 })
  }
}
