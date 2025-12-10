import {
  generateWithAI,
  buildSystemPrompt,
  AI_CONFIG,
  entityCache,
  type MechanicsArea,
} from "@/lib/ai/ai-utils";
import {
  generateEntitySystemPrompt,
  ENTITY_CLASSES,
  ENTITY_TAGS,
  generateImpactConstraintPrompt,
  EVENT_COOLDOWNS,
  EVENT_BASE_WEIGHTS,
  type EventType,
} from "@/lib/mechanics/game-mechanics-ledger";
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
} from "@/lib/ai/ai-schemas";

// =============================================================================
// SPAWN DISTRIBUTION VALIDATION
// =============================================================================

// Map AI schema entity types to ledger event types
const ENTITY_TO_EVENT_TYPE: Record<string, EventType> = {
  enemy: "combat",
  treasure: "treasure",
  trap: "trap",
  shrine: "shrine",
  npc: "npc",
  empty: "rest",
  boss: "boss",
};

const EVENT_TO_ENTITY_TYPE: Record<EventType, string> = {
  combat: "enemy",
  treasure: "treasure",
  trap: "trap",
  shrine: "shrine",
  npc: "npc",
  rest: "empty",
  boss: "boss",
  mystery: "empty", // Mystery maps to empty for now
};

interface SerializedEventMemory {
  history: Array<{ type: string; room: number; floor: number }>;
  typeLastSeen: Record<string, number>;
  combatStreak: number;
  roomsSinceReward: number;
}

/**
 * Calculate which entity types are allowed based on cooldowns and recent spawns.
 * Returns allowed types with weights and a hint string for the AI.
 */
function calculateAllowedEntityTypes(
  eventMemory: SerializedEventMemory | null,
  currentRoom: number,
  currentFloor: number
): {
  allowed: string[];
  weights: Record<string, number>;
  hint: string;
} {
  // Default: all types allowed
  if (!eventMemory) {
    return {
      allowed: ["enemy", "treasure", "trap", "shrine", "npc", "empty"],
      weights: { enemy: 35, treasure: 20, trap: 15, shrine: 10, npc: 10, empty: 10 },
      hint: "",
    };
  }

  const allowed: string[] = [];
  const weights: Record<string, number> = {};
  const onCooldown: string[] = [];
  const typeLastSeen = eventMemory.typeLastSeen || {};

  // Check each entity type against cooldowns
  for (const [entityType, eventType] of Object.entries(ENTITY_TO_EVENT_TYPE)) {
    if (entityType === "boss") continue; // Boss is scripted

    const lastSeen = typeLastSeen[eventType];
    const cooldown = EVENT_COOLDOWNS[eventType] || 0;

    // Calculate if on cooldown (same floor only)
    const isOnCooldown = lastSeen !== undefined && currentRoom - lastSeen < cooldown;

    if (isOnCooldown) {
      onCooldown.push(entityType);
      weights[entityType] = 0;
    } else {
      allowed.push(entityType);
      // Apply base weight with streak penalty
      let weight = EVENT_BASE_WEIGHTS[eventType] || 10;

      // Reduce weight if seen recently (soft variety boost)
      const recentCount = eventMemory.history.filter(
        (h) => h.type === eventType && currentRoom - h.room <= 5
      ).length;
      weight = Math.max(5, weight - recentCount * 5);

      weights[entityType] = weight;
    }
  }

  // Ensure at least one type is available
  if (allowed.length === 0) {
    allowed.push("enemy", "empty");
    weights.enemy = 35;
    weights.empty = 10;
  }

  // Build hint for AI
  const hintParts: string[] = [];
  if (onCooldown.length > 0) {
    hintParts.push(`AVOID (recently seen): ${onCooldown.join(", ")}`);
  }
  if (eventMemory.combatStreak >= 2) {
    hintParts.push(`Combat streak: ${eventMemory.combatStreak} - consider variety`);
  }
  if (eventMemory.roomsSinceReward >= 4) {
    hintParts.push(`${eventMemory.roomsSinceReward} rooms since reward - consider treasure/shrine`);
  }

  const hint = hintParts.length > 0
    ? `\nSPAWN DISTRIBUTION: ${hintParts.join(". ")}.`
    : "";

  return { allowed, weights, hint };
}

/**
 * Validate AI's entity type choice. If invalid, select a weighted alternative.
 */
function validateEntityType(
  aiChoice: string,
  allowed: string[],
  weights: Record<string, number>
): { type: string; wasRedirected: boolean; reason?: string } {
  if (allowed.includes(aiChoice)) {
    return { type: aiChoice, wasRedirected: false };
  }

  // Select weighted random from allowed types
  const totalWeight = allowed.reduce((sum, t) => sum + (weights[t] || 10), 0);
  let roll = Math.random() * totalWeight;

  for (const type of allowed) {
    roll -= weights[type] || 10;
    if (roll <= 0) {
      return {
        type,
        wasRedirected: true,
        reason: `${aiChoice} on cooldown, redirected to ${type}`,
      };
    }
  }

  // Fallback
  return {
    type: allowed[0] || "enemy",
    wasRedirected: true,
    reason: `${aiChoice} unavailable, using ${allowed[0]}`,
  };
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(req: Request) {
  const body = await req.json();
  const { eventType, context } = body;

  // Build system prompt with relevant mechanics for this event type
  const getMechanicsForEvent = (eventType: string) => {
    switch (eventType) {
      case "combat_round":
      case "victory":
        return ["combat", "enemies", "levels", "effects"] as const;
      case "companion_recruit":
      case "companion_action":
      case "companion_moment":
        return ["companions", "levels", "effects"] as const;
      case "room_event":
      case "path_preview":
        return ["events", "paths", "chaos", "progression"] as const;
      case "generate_effect":
      case "effect_combo":
      case "ambient_effect":
        return ["effects", "chaos"] as const;
      case "environmental_interaction":
      case "unknown_item_use":
        return ["skills", "effects", "items"] as const;
      default:
        return ["events", "levels"] as const;
    }
  };

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
    dungeonModifiers: context.dungeonModifiers,
    mapMetadata: context.mapMetadata,
    includeMechanics: [...getMechanicsForEvent(eventType)],
  });

  switch (eventType) {
    case "room_event": {
      // Calculate spawn distribution based on event memory
      const spawnDist = calculateAllowedEntityTypes(
        context.eventMemory as SerializedEventMemory | null,
        context.room || 0,
        context.floor || 1
      );

      const cacheKey =
        context.roomTypeHint === "empty"
          ? entityCache.generateKey(
              "room",
              context.dungeonTheme,
              context.floor,
              "empty",
            )
          : undefined; // Don't cache non-empty rooms - they need variety

      // Generate room event with spawn hints
      const aiResult = await generateWithAI({
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

${context.playerCapabilities || ""}
${spawnDist.hint}

${generateEntitySystemPrompt()}`,
        system,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 800,
        cacheKey,
      });

      // Validate AI's entity type choice against cooldowns
      if (aiResult && aiResult.entityType) {
        const validation = validateEntityType(
          aiResult.entityType,
          spawnDist.allowed,
          spawnDist.weights
        );

        if (validation.wasRedirected) {
          // AI chose a type on cooldown - redirect to allowed type
          // Note: We keep the AI's generated content but change the entity type
          // This means the content may not perfectly match, but variety is enforced
          aiResult.entityType = validation.type as typeof aiResult.entityType;
          // Log redirect for debugging (validation.reason contains details)
          console.log(`[SpawnDistribution] ${validation.reason}`);
        }
      }

      return Response.json(aiResult);
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
      // Generate impact constraints to prevent theater/hallucinated outcomes
      const entityTags = context.entityTags || [];
      const impactConstraint = generateImpactConstraintPrompt(
        context.interactionAction,
        entityTags
      );

      return Response.json(
        await generateWithAI({
          schema: environmentalInteractionSchema,
          prompt: `Player interacts with environmental entity.

Entity: ${context.entityName} (${context.entityClass})
Entity description: ${context.entityDescription || "unknown"}
Entity tags: ${entityTags.join(", ") || "none"}
Interaction: ${context.interactionAction} (${context.interactionLabel})
Danger level: ${context.dangerLevel}
Player class: ${context.playerClass || "adventurer"}
Player health: ${context.playerHealth}/${context.maxHealth}
Item used: ${context.itemUsed || "none"}
Companion present: ${context.companionName || "none"}

MECHANICAL IMPACT REQUIREMENT:
${impactConstraint}

Generate the outcome. Consider:
- Danger level (safe/risky/dangerous) influences success chance
- Class-appropriate interactions have better outcomes
- Using proper items guarantees success for risky actions
- Dangerous actions have meaningful consequences
- Include companion reactions if one is present
- CRITICAL: The outcome MUST have real mechanical impact (item, gold, damage, healing, effect, etc.)`,
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
