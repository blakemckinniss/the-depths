import { generateWithAI, AI_CONFIG, entityCache, getItemMechanicsPrompt } from "@/lib/ai/ai-utils"
import {
  itemSchema,
  enemySchema,
  npcSchema,
  trapSchema,
  shrineSchema,
  bossSchema,
  companionSchema,
  roomNarrationSchema,
  combatNarrationSchema,
  eventOutcomeSchema,
} from "@/lib/ai/ai-schemas"

// Get mechanics prompt once at module load
const ITEM_MECHANICS = getItemMechanicsPrompt()

export async function POST(req: Request) {
  const body = await req.json()
  const { type, context } = body

  const baseSystem = `You are a dark fantasy dungeon master generating entities and narration for a roguelike dungeon crawler.
Your tone is atmospheric, terse, and evocative - inspired by classic MUD games and dark fantasy.
Keep all responses brief and punchy. Use vivid, visceral imagery. Avoid purple prose.
Never use emojis. Never break character. Never mention game mechanics directly.
The setting is cursed ancient dungeons filled with monsters, traps, and dark magic.
Theme context: ${context.dungeonTheme || "ancient cursed dungeon"}`

  // Extended system prompt for item generation
  const itemSystem = `${baseSystem}

${ITEM_MECHANICS}`

  switch (type) {
    case "item": {
      const cacheKey = entityCache.generateKey("item", context.rarity, context.itemType, context.floor)
      return Response.json(await generateWithAI({
        schema: itemSchema,
        prompt: `Generate a ${context.rarity} rarity ${context.itemType} for floor ${context.floor}.
${context.itemType === "weapon" ? `Weapon damage tier: ${context.damage}` : ""}
${context.itemType === "armor" ? `Armor defense tier: ${context.defense}` : ""}
${context.itemType === "potion" ? "This is a consumable potion." : ""}
Make it feel ${context.rarity === "legendary" ? "mythical and powerful" : context.rarity === "rare" ? "notable and well-crafted" : "functional but worn"}.`,
        system: itemSystem,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "enemy": {
      const cacheKey = context.isBoss
        ? undefined // Don't cache bosses
        : entityCache.generateKey("enemy", context.tier, context.archetype, context.floor)
      return Response.json(await generateWithAI({
        schema: enemySchema,
        prompt: `Generate a ${context.tier} tier enemy for floor ${context.floor}.
Enemy stats: ${context.health} HP, ${context.attack} attack, ${context.defense} defense.
${context.isBoss ? "This is a BOSS enemy - make it terrifying and memorable." : ""}
Enemy archetype hint: ${context.archetype || "generic dungeon creature"}`,
        system: baseSystem,
        temperature: context.isBoss ? AI_CONFIG.temperature.creative : AI_CONFIG.temperature.balanced,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "npc": {
      const cacheKey = entityCache.generateKey("npc", context.role, context.floor)
      return Response.json(await generateWithAI({
        schema: npcSchema,
        prompt: `Generate a ${context.role} NPC encountered in the dungeon.
Floor: ${context.floor}.
${context.role === "merchant" ? "They trade goods in this dangerous place." : ""}
${context.role === "trapped" ? "They need rescue or have been here too long." : ""}
${context.role === "mysterious" ? "Their motives are unclear." : ""}
${context.role === "quest_giver" ? "They have a task for the adventurer." : ""}`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "trap": {
      const cacheKey = entityCache.generateKey("trap", context.trapType, context.floor)
      return Response.json(await generateWithAI({
        schema: trapSchema,
        prompt: `Generate a ${context.trapType} trap for floor ${context.floor}.
Danger level: ${context.danger || "moderate"}.
${context.trapType === "damage" ? `Deals ${context.damage} damage.` : ""}
${context.trapType === "poison" ? "Applies poison effect." : ""}
${context.trapType === "curse" ? "Applies a dark curse." : ""}`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.balanced,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "shrine": {
      const cacheKey = entityCache.generateKey("shrine", context.shrineType, context.riskLevel)
      return Response.json(await generateWithAI({
        schema: shrineSchema,
        prompt: `Generate a ${context.shrineType} shrine for floor ${context.floor}.
Risk level: ${context.riskLevel}.
${context.shrineType === "dark" ? "This shrine has dangerous, unpredictable effects." : ""}
${context.shrineType === "health" ? "This shrine offers healing or restoration." : ""}
${context.shrineType === "power" ? "This shrine offers combat enhancement." : ""}
${context.shrineType === "fortune" ? "This shrine affects luck and rewards." : ""}`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "boss": {
      return Response.json(await generateWithAI({
        schema: bossSchema,
        prompt: `Generate a floor ${context.floor} boss monster.
Stats: ${context.health} HP, ${context.attack} attack, ${context.defense} defense.
Dungeon theme: ${context.dungeonTheme}.
This boss guards the depths. Make it memorable and terrifying.`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 500,
        useCache: false, // Bosses should always be unique
      }))
    }

    case "companion": {
      return Response.json(await generateWithAI({
        schema: companionSchema,
        prompt: `Generate a ${context.role} companion that might join the player.
How they were found: ${context.encounterType || "trapped in a cell"}.
Role: ${context.role} (${context.role === "fighter" ? "melee combatant" : context.role === "healer" ? "support/healing" : context.role === "scout" ? "trap detection" : "magical attacks"}).
Stats: ${context.health} HP, ${context.attack} attack.
They may or may not be trustworthy.`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.creative,
        maxTokens: 400,
        useCache: false, // Companions should be unique
      }))
    }

    case "room_narration": {
      const cacheKey = entityCache.generateKey("narration", context.roomType, context.floor, context.entityName ? "entity" : "empty")
      return Response.json(await generateWithAI({
        schema: roomNarrationSchema,
        prompt: `Generate narration for room ${context.roomNumber} on floor ${context.floor}.
Room type: ${context.roomType}.
${context.entityName ? `Contains: ${context.entityName}` : "The room appears empty."}
Player state: ${context.playerHealth}/${context.maxHealth} HP.
Previous rooms explored: ${context.roomNumber - 1}.`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.narrative,
        maxTokens: 300,
        cacheKey,
      }))
    }

    case "combat_narration": {
      return Response.json(await generateWithAI({
        schema: combatNarrationSchema,
        prompt: `Generate combat narration.
Attacker: ${context.attackerName} (${context.attackerType}).
Target: ${context.targetName} (${context.targetType}).
Damage dealt: ${context.damage}.
${context.weaponUsed ? `Weapon: ${context.weaponUsed}` : "Unarmed attack."}
${context.isCritical ? "This was a critical/powerful hit!" : ""}
${context.isKillingBlow ? "This is the killing blow!" : ""}`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.narrative,
        maxTokens: 250,
        useCache: false, // Combat is dynamic
      }))
    }

    case "event_outcome": {
      return Response.json(await generateWithAI({
        schema: eventOutcomeSchema,
        prompt: `Generate outcome narration for: ${context.eventType}.
${context.success ? "The action succeeded." : "The action failed."}
Context: ${context.description}
${context.damage ? `Damage involved: ${context.damage}` : ""}
${context.effectApplied ? `Effect applied: ${context.effectApplied}` : ""}`,
        system: baseSystem,
        temperature: AI_CONFIG.temperature.narrative,
        maxTokens: 250,
        useCache: false,
      }))
    }

    default:
      return Response.json({ error: "Unknown entity type" }, { status: 400 })
  }
}
