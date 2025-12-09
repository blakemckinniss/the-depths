import {
  generateWithAI,
  buildSystemPrompt,
  AI_CONFIG,
  entityCache,
} from "@/lib/ai-utils";
import {
  generateEntitySystemPrompt,
  ENTITY_CLASSES,
  ENTITY_TAGS,
} from "@/lib/game-mechanics-ledger";
import {
  roomEventSchema,
  combatRoundSchema,
  victorySchema,
  companionRecruitSchema,
  companionActionSchema,
  companionMomentSchema,
  pathPreviewSchema,
  hazardNarrationSchema,
  enhancedLootSchema,
  dungeonCardSchema,
  deathNarrationSchema,
  environmentalInteractionSchema,
  unknownItemUseSchema,
  generateEffectSchema,
  effectComboSchema,
  ambientEffectSchema,
} from "@/lib/ai-schemas";

export async function POST(req: Request) {
  const body = await req.json();
  const { eventType, context } = body;

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
  });

  switch (eventType) {
    case "room_event": {
      const cacheKey =
        context.roomTypeHint === "empty"
          ? entityCache.generateKey(
              "room",
              context.dungeonTheme,
              context.floor,
              "empty",
            )
          : undefined; // Don't cache non-empty rooms - they need variety

      return Response.json(
        await generateWithAI({
          schema: roomEventSchema,
          prompt: `Generate a room event for floor ${context.floor}, room ${context.room}.
Dungeon theme: ${context.dungeonTheme || "dark fantasy"}.
Room type preference: ${context.roomTypeHint || "any"}.
Recent rooms: ${context.recentRooms || "none"}.

PLAYER CONTEXT:
- Inventory: ${context.playerInventory || "basic gear"}
- Class: ${context.playerClass || "adventurer"}
- Has containers: ${context.hasContainers || "unknown"}
- Has fire source: ${context.hasFireSource || "unknown"}
- Has lockpicks: ${context.hasLockpicks || "unknown"}
- Known abilities: ${context.playerAbilities || "basic"}

${generateEntitySystemPrompt()}`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 800,
          cacheKey,
        }),
      );
    }

    case "combat_round": {
      return Response.json(
        await generateWithAI({
          schema: combatRoundSchema,
          prompt: `Generate a combat round between player and ${context.enemyName}.

Combat state:
- Player dealt ${context.playerDamage} damage (${context.damageType || "physical"})
- ${context.effectiveness === "effective" ? "SUPER EFFECTIVE!" : context.effectiveness === "resisted" ? "RESISTED!" : ""}
- Player HP: ${context.playerHealth}/${context.maxHealth}
- Enemy HP: ${context.enemyHealth}/${context.enemyMaxHealth}
- Player stance: ${context.playerStance}
- ${context.isCritical ? "CRITICAL HIT!" : ""}
- ${context.comboTriggered ? `COMBO: ${context.comboName}!` : ""}

${context.enemyAttacks ? `Enemy attacks for ${context.enemyDamage} damage.` : "Enemy staggered."}
${context.enemyUsedAbility ? `Enemy used: ${context.enemyAbilityName}` : ""}`,
          system,
          temperature: AI_CONFIG.temperature.narrative,
          maxTokens: 500,
          useCache: false,
        }),
      );
    }

    case "victory": {
      return Response.json(
        await generateWithAI({
          schema: victorySchema,
          prompt: `Generate victory sequence for defeating ${context.enemyName}.

Rounds fought: ${context.roundsFought}
Player HP: ${context.playerHealth}/${context.maxHealth}
Gold: ${context.goldGain}, XP: ${context.expGain}
${context.lootName ? `Loot: ${context.lootName} (${context.lootRarity})` : "No loot"}
${context.leveledUp ? "LEVELED UP!" : ""}`,
          system,
          temperature: AI_CONFIG.temperature.narrative,
          maxTokens: 500,
          useCache: false,
        }),
      );
    }

    case "companion_recruit": {
      return Response.json(
        await generateWithAI({
          schema: companionRecruitSchema,
          prompt: `Generate a unique companion being recruited.

Method: ${context.recruitMethod}
${context.sourceEntity ? `Source: ${context.sourceEntity.name}` : ""}
Dungeon: ${context.dungeonTheme || "dark fantasy"}
Floor: ${context.floor || 1}
Player class: ${context.playerClass || "adventurer"}

Make them MEMORABLE and UNIQUE. Stats should be numbers. Abilities 1-3 max.`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 800,
          useCache: false,
        }),
      );
    }

    case "companion_action": {
      return Response.json(
        await generateWithAI({
          schema: companionActionSchema,
          prompt: `Generate companion combat action.

Companion: ${context.companionName} (${context.companionSpecies})
Style: ${context.combatStyle}, Mood: ${context.mood}
Bond: ${context.bondLevel}
Action: ${context.actionType}
${context.abilityName ? `Using: ${context.abilityName}` : ""}
Enemy: ${context.enemyName || "none"}`,
          system,
          temperature: AI_CONFIG.temperature.narrative,
          maxTokens: 400,
          useCache: false,
        }),
      );
    }

    case "companion_moment": {
      return Response.json(
        await generateWithAI({
          schema: companionMomentSchema,
          prompt: `Generate a small companion moment.

Companion: ${context.companionName}
Personality: ${context.personality?.join(", ")}
Quirk: ${context.quirk}
Situation: ${context.situation}`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 300,
          useCache: false,
        }),
      );
    }

    case "path_preview": {
      const cacheKey = entityCache.generateKey(
        "path",
        context.dungeonName,
        context.floor,
        context.numPaths,
      );
      return Response.json(
        await generateWithAI({
          schema: pathPreviewSchema,
          prompt: `Generate ${context.numPaths} branching path previews.

Dungeon: ${context.dungeonName}
Floor: ${context.floor}
Path types: ${context.pathTypes?.join(", ") || "varied"}

Make each path feel distinct. Include exactly ${context.numPaths} paths in the array.`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 500,
          cacheKey,
        }),
      );
    }

    case "hazard_narration": {
      const cacheKey = entityCache.generateKey(
        "hazard",
        context.hazardName,
        context.hazardType,
      );
      return Response.json(
        await generateWithAI({
          schema: hazardNarrationSchema,
          prompt: `Generate narration for ${context.hazardName} hazard.

Type: ${context.hazardType}
Damage: ${context.damagePerTurn || "none"}
Effects: ${context.specialEffects || "none"}`,
          system,
          temperature: AI_CONFIG.temperature.narrative,
          maxTokens: 300,
          cacheKey,
        }),
      );
    }

    case "enhanced_loot": {
      const cacheKey = entityCache.generateKey(
        "loot",
        context.itemType,
        context.rarity,
        context.dungeonTheme,
      );
      return Response.json(
        await generateWithAI({
          schema: enhancedLootSchema,
          prompt: `Generate enhanced loot description.

Item: ${context.itemType} (${context.rarity})
Dungeon theme: ${context.dungeonTheme}
Floor: ${context.floor}`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 300,
          cacheKey,
        }),
      );
    }

    case "dungeon_card": {
      return Response.json(
        await generateWithAI({
          schema: dungeonCardSchema,
          prompt: `Generate a ${context.rarity} dungeon card.

${context.isMystery ? "MYSTERY dungeon - be cryptic." : ""}
Floors: ${context.floors}`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 400,
          useCache: false, // Each dungeon should be unique
        }),
      );
    }

    case "death_narration": {
      return Response.json(
        await generateWithAI({
          schema: deathNarrationSchema,
          prompt: `Generate death narration.

Killed by: ${context.killedBy}
Floor: ${context.floor}
Level: ${context.playerLevel}
Class: ${context.playerClass}
Gold collected: ${context.goldTotal}
Enemies slain: ${context.enemiesSlain}

Make it dramatic and dark.`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 400,
          useCache: false,
        }),
      );
    }

    case "environmental_interaction": {
      return Response.json(
        await generateWithAI({
          schema: environmentalInteractionSchema,
          prompt: `Player interacts with environmental entity.

Entity: ${context.entityName} (${context.entityClass})
Entity description: ${context.entityDescription || "unknown"}
Interaction: ${context.interactionAction} (${context.interactionLabel})
Danger level: ${context.dangerLevel}
Player class: ${context.playerClass || "adventurer"}
Player health: ${context.playerHealth}/${context.maxHealth}
Item used: ${context.itemUsed || "none"}
Companion present: ${context.companionName || "none"}

Generate the outcome. Consider:
- Danger level (safe/risky/dangerous) influences success chance
- Class-appropriate interactions have better outcomes
- Using proper items guarantees success for risky actions
- Dangerous actions have meaningful consequences
- Include companion reactions if one is present`,
          system,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 600,
          useCache: false,
        }),
      );
    }

    case "unknown_item_use": {
      return Response.json(
        await generateWithAI({
          schema: unknownItemUseSchema,
          prompt: `A player is using an unknown/mysterious item. Determine what happens.

ITEM DETAILS:
Name: ${context.itemName}
Appearance: ${context.itemAppearance}
Source: ${context.itemSource}
Sensory details: ${context.sensoryDetails || "unremarkable"}
Hints collected: ${context.itemHints || "none"}

USE CONTEXT:
Method of use: ${context.useMethod}
Target: ${context.target || "self"}
Player class: ${context.playerClass}
Player health: ${context.playerHealth}/${context.maxHealth}
Player level: ${context.playerLevel}
Current situation: ${context.situation || "exploring dungeon"}
Active effects on player: ${context.activeEffects || "none"}
${context.companionPresent ? `Companion present: ${context.companionName}` : ""}

DETERMINATION GUIDELINES:
- Be fair but unpredictable. Dark fantasy tone.
- Consider the item's source and sensory details as clues
- "Black water" from a dungeon should probably be bad
- Magical substances might be powerful but dangerous
- Class can influence outcomes
- Include skill checks for ambiguous situations
- Permanent changes should be RARE and significant
- Even harmful effects should feel interesting, not punishing

BE A FAIR BUT DRAMATIC DUNGEON MASTER.`,
          system,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 800,
          useCache: false,
        }),
      );
    }

    case "generate_effect": {
      const cacheKey = entityCache.generateKey(
        "effect",
        context.source,
        context.intendedType,
        context.maxPowerLevel,
      );
      return Response.json(
        await generateWithAI({
          schema: generateEffectSchema,
          prompt: `Generate a balanced status effect for a dungeon crawler RPG.

SOURCE & CONTEXT:
- Source: ${context.source} (${context.sourceType || "unknown"})
- Dungeon theme: ${context.dungeonTheme || "dark fantasy"}
- Player level: ${context.playerLevel || 1}
- Current floor: ${context.floor || 1}
- Player class: ${context.playerClass || "adventurer"}
- Situation: ${context.situation || "exploration"}

CONSTRAINTS:
- Power Level: 1-${context.maxPowerLevel || 5} scale
- Allowed categories: ${context.allowedCategories?.join(", ") || "any"}
- Max duration: ${context.maxDuration || 10}
- Max stacks: ${context.maxStacks || 3}
- Can be permanent: ${context.allowPermanent ? "yes" : "no"}
- Intended effect type: ${context.intendedType || "contextual"} (buff/debuff/neutral)

BALANCE GUIDELINES:
- Power 1-3: Minor stat changes (+/-1-3), short duration, common
- Power 4-6: Moderate changes (+/-4-6), medium duration, may stack, uncommon
- Power 7-8: Major changes (+/-7-10), longer duration, complex triggers, rare
- Power 9-10: Legendary, permanent or transformative, game-changing

${context.themeHints || "Match the dungeon's dark fantasy atmosphere."}

Generate a SINGLE effect that fits the context. Be creative but balanced.`,
          system,
          temperature: AI_CONFIG.temperature.balanced,
          maxTokens: 600,
          cacheKey,
        }),
      );
    }

    case "effect_combo": {
      return Response.json(
        await generateWithAI({
          schema: effectComboSchema,
          prompt: `Two effects have combined into something greater.

COMBO TRIGGERED:
- Effect 1: ${context.effect1Name} (${context.effect1Element})
- Effect 2: ${context.effect2Name} (${context.effect2Element})
- Combo Name: ${context.comboName}
- Result: ${context.resultType}

${context.damage ? `Damage dealt: ${context.damage}` : ""}
${context.newEffectName ? `New effect created: ${context.newEffectName}` : ""}

Describe this dramatic elemental interaction. Make it visceral and memorable.`,
          system,
          temperature: AI_CONFIG.temperature.creative,
          maxTokens: 400,
          useCache: false,
        }),
      );
    }

    case "ambient_effect": {
      const cacheKey = entityCache.generateKey(
        "ambient",
        context.environmentType,
        context.effectName,
      );
      return Response.json(
        await generateWithAI({
          schema: ambientEffectSchema,
          prompt: `The dungeon environment is affecting the player.

ENVIRONMENT: ${context.environmentType}
EFFECT: ${context.effectName}
DESCRIPTION: ${context.effectDescription}
${context.wasResisted ? "The player RESISTED this effect." : context.wasMitigated ? "The effect was MITIGATED but still applied." : "The effect fully applies."}
Player class: ${context.playerClass}

Describe how this environmental hazard manifests. Be atmospheric and foreboding.`,
          system,
          temperature: AI_CONFIG.temperature.narrative,
          maxTokens: 300,
          cacheKey,
        }),
      );
    }

    default:
      return Response.json({ error: "Unknown event type" }, { status: 400 });
  }
}
