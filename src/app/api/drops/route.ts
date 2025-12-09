/**
 * AI Drops & Loot API Route
 *
 * Handles AI-powered loot generation:
 * - Monster lore and special drops
 * - Treasure chest contents
 * - Boss-specific rewards
 * - Dungeon-themed loot
 */

import { generateWithAI, AI_CONFIG, entityCache } from "@/lib/ai-utils"
import { z } from "zod"
import { NextResponse } from "next/server"

// =============================================================================
// SCHEMAS
// =============================================================================

// Monster Lore - Generate backstory and special drops for monsters
const MonsterLoreSchema = z.object({
  lore: z.object({
    origin: z.string().describe("Brief origin story (1 sentence)"),
    nature: z.string().describe("What drives this creature (1 sentence)"),
    weakness_hint: z.string().describe("Cryptic hint about weakness"),
  }),
  lastWords: z.string().describe("What the monster says/does when dying (brief, atmospheric)"),
  specialDrop: z.object({
    name: z.string().describe("Unique item name themed to this monster"),
    type: z.enum(["weapon", "armor", "trinket", "consumable", "material"]),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
    description: z.string().describe("Brief item description"),
    effect: z.string().nullish().describe("Special effect if any"),
  }).nullish().describe("Only for rare/elite monsters"),
})

// Treasure Contents - What's inside a chest
const TreasureContentsSchema = z.object({
  containerDescription: z.string().describe("Brief description of the container"),
  contents: z.array(z.object({
    name: z.string(),
    type: z.enum(["weapon", "armor", "trinket", "consumable", "material", "gold", "key"]),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]).nullish(),
    description: z.string(),
    quantity: z.number().nullish(),
    effect: z.string().nullish(),
  })),
  trapped: z.boolean().describe("Is the container trapped?"),
  trapDescription: z.string().nullish().describe("Description of trap if trapped"),
  lore: z.string().nullish().describe("Any inscription or clue found"),
})

// Boss Reward - Special boss loot
const BossRewardSchema = z.object({
  trophy: z.object({
    name: z.string().describe("Trophy item from the boss"),
    description: z.string(),
    effect: z.string().describe("What the trophy does"),
  }),
  equipment: z.object({
    name: z.string(),
    type: z.enum(["weapon", "armor"]),
    subtype: z.string(),
    rarity: z.enum(["rare", "legendary"]),
    description: z.string(),
    stats: z.object({
      attack: z.number().nullish(),
      defense: z.number().nullish(),
      health: z.number().nullish(),
    }),
    specialAbility: z.string().nullish(),
  }),
  lore: z.string().describe("Brief lore about the boss's defeat"),
})

// Dungeon Themed Loot - Floor-specific rewards
const DungeonThemedLootSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    type: z.enum(["weapon", "armor", "trinket", "consumable", "material"]),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
    description: z.string(),
    themeConnection: z.string().describe("How it relates to the dungeon theme"),
    stats: z.object({
      attack: z.number().nullish(),
      defense: z.number().nullish(),
      health: z.number().nullish(),
    }).nullish(),
    effect: z.string().nullish(),
  })),
  setBonus: z.object({
    name: z.string(),
    pieces: z.array(z.string()),
    bonus: z.string(),
  }).nullish().describe("If items form a set"),
})

// Request body schema
const RequestSchema = z.object({
  action: z.enum(["monster_lore", "treasure", "boss_reward", "dungeon_loot"]),
  // For monster_lore
  monster: z.object({
    name: z.string(),
    tier: z.number().optional(),
    isElite: z.boolean().optional(),
    isBoss: z.boolean().optional(),
    weakness: z.string().optional(),
    resistance: z.string().optional(),
  }).optional(),
  // For treasure
  treasure: z.object({
    type: z.enum(["chest", "sarcophagus", "vault", "hidden_cache", "altar"]),
    quality: z.enum(["common", "rare", "legendary"]).optional(),
    locked: z.boolean().optional(),
  }).optional(),
  // For boss_reward
  boss: z.object({
    name: z.string(),
    title: z.string().optional(),
    abilities: z.array(z.string()).optional(),
  }).optional(),
  // For dungeon_loot
  dungeon: z.object({
    name: z.string(),
    theme: z.string(),
    floor: z.number(),
  }).optional(),
  // Context
  playerClass: z.string().optional(),
  floor: z.number().optional(),
})

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const MONSTER_LORE_SYSTEM = `You are a dark fantasy loremaster for a dungeon crawler game.
Generate atmospheric monster backstories and themed drops.

RULES:
- Keep text brief and punchy (1-2 sentences max per field)
- Last words should be dramatic or unsettling
- Special drops only for elite/boss monsters
- Match item theme to monster nature
- Dark fantasy tone - no humor or modern references
- Weakness hints should be cryptic, not obvious`

const TREASURE_SYSTEM = `You are a dungeon treasure generator for a dark fantasy game.
Determine what treasures are found in containers.

RULES:
- Match contents to container type (vault = better loot)
- Include 2-5 items per container
- Mix item types for variety
- Trapped containers should have better rewards
- Inscriptions/lore should hint at dungeon history
- Gold amounts: common=10-50, rare=50-200, legendary=200-500`

const BOSS_REWARD_SYSTEM = `You are a boss reward generator for a dark fantasy dungeon crawler.
Create unique, memorable boss loot.

RULES:
- Trophy items should be unique to this boss
- Equipment should feel powerful and themed
- Stats scale with boss difficulty
- Legendary items need special abilities
- Lore should reference the battle
- Names should be evocative and memorable`

const DUNGEON_THEME_SYSTEM = `You are a themed loot generator for a dark fantasy dungeon crawler.
Create items that match the dungeon's theme and atmosphere.

RULES:
- All items must thematically match the dungeon
- Include variety: weapons, armor, consumables, materials
- Generate 3-5 items
- Set bonuses are optional but should be thematic
- Higher floors = better rarity distribution
- Items should feel like they belong in this specific dungeon`

// =============================================================================
// HANDLERS
// =============================================================================

async function handleMonsterLore(
  monster: NonNullable<z.infer<typeof RequestSchema>["monster"]>,
  floor = 1
) {
  const cacheKey = entityCache.generateKey("monster_lore", monster.name, monster.tier, floor)
  const cached = entityCache.get(cacheKey)
  if (cached) return cached

  const prompt = `Generate lore for this monster:

Name: ${monster.name}
Tier: ${monster.tier || 1}
Floor: ${floor}
${monster.isElite ? "This is an ELITE enemy - generate a special drop" : ""}
${monster.isBoss ? "This is a BOSS - generate a special drop" : ""}
${monster.weakness ? `Weakness: ${monster.weakness}` : ""}
${monster.resistance ? `Resistance: ${monster.resistance}` : ""}

Create brief, atmospheric lore and dying words.
${(monster.isElite || monster.isBoss) ? "Include a unique special drop themed to this creature." : "Do NOT include a special drop for this common enemy."}`

  const result = await generateWithAI({
    schema: MonsterLoreSchema,
    prompt,
    system: MONSTER_LORE_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 400,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleTreasure(
  treasure: NonNullable<z.infer<typeof RequestSchema>["treasure"]>,
  floor = 1
) {
  const cacheKey = entityCache.generateKey("treasure", treasure.type, treasure.quality, floor)
  const cached = entityCache.get(cacheKey)
  if (cached) return cached

  const prompt = `Generate contents for this container:

Type: ${treasure.type}
Quality: ${treasure.quality || "common"}
Floor: ${floor}
Locked: ${treasure.locked || false}

Consider:
- ${treasure.type === "vault" ? "This is a vault - include valuable items" : ""}
- ${treasure.type === "sarcophagus" ? "This is a tomb - include cursed or ancient items" : ""}
- ${treasure.type === "altar" ? "This is an altar - include religious/magical items" : ""}
- Higher quality = better and more items
- 30% chance of being trapped

Generate 2-5 items appropriate to the container.`

  const result = await generateWithAI({
    schema: TreasureContentsSchema,
    prompt,
    system: TREASURE_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 600,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleBossReward(
  boss: NonNullable<z.infer<typeof RequestSchema>["boss"]>,
  floor = 1,
  playerClass?: string
) {
  const cacheKey = entityCache.generateKey("boss_reward", boss.name, floor)
  const cached = entityCache.get(cacheKey)
  if (cached) return cached

  const prompt = `Generate rewards for defeating this boss:

Boss: ${boss.name}
${boss.title ? `Title: ${boss.title}` : ""}
Floor: ${floor}
${boss.abilities?.length ? `Known Abilities: ${boss.abilities.join(", ")}` : ""}
${playerClass ? `Player Class: ${playerClass} (consider class-appropriate equipment)` : ""}

Create:
1. A unique trophy item from this boss
2. A powerful equipment piece (rare or legendary)
3. Brief victory lore

The equipment should be floor-appropriate:
- Floor 1-3: +5-10 stats
- Floor 4-6: +10-15 stats
- Floor 7+: +15-25 stats`

  const result = await generateWithAI({
    schema: BossRewardSchema,
    prompt,
    system: BOSS_REWARD_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 500,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleDungeonLoot(
  dungeon: NonNullable<z.infer<typeof RequestSchema>["dungeon"]>,
  playerClass?: string
) {
  const cacheKey = entityCache.generateKey("dungeon_loot", dungeon.name, dungeon.theme, dungeon.floor)
  const cached = entityCache.get(cacheKey)
  if (cached) return cached

  const prompt = `Generate themed loot for this dungeon:

Dungeon: ${dungeon.name}
Theme: ${dungeon.theme}
Floor: ${dungeon.floor}
${playerClass ? `Player Class: ${playerClass}` : ""}

Create 3-5 items that:
- Thematically fit the dungeon
- Have names referencing the dungeon/theme
- Scale to the floor level
- Include variety (weapons, armor, consumables)

Rarity distribution for floor ${dungeon.floor}:
- Common: ${Math.max(0, 60 - dungeon.floor * 5)}%
- Uncommon: ${30 + dungeon.floor * 2}%
- Rare: ${Math.min(25, 5 + dungeon.floor * 2)}%
- Legendary: ${Math.min(10, dungeon.floor)}%

Optionally create a set bonus if items share a theme.`

  const result = await generateWithAI({
    schema: DungeonThemedLootSchema,
    prompt,
    system: DUNGEON_THEME_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 700,
  })

  entityCache.set(cacheKey, result)
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
      case "monster_lore":
        if (!parsed.monster) {
          return NextResponse.json(
            { error: "Monster data required for lore generation" },
            { status: 400 }
          )
        }
        result = await handleMonsterLore(parsed.monster, parsed.floor)
        break

      case "treasure":
        if (!parsed.treasure) {
          return NextResponse.json(
            { error: "Treasure data required for content generation" },
            { status: 400 }
          )
        }
        result = await handleTreasure(parsed.treasure, parsed.floor)
        break

      case "boss_reward":
        if (!parsed.boss) {
          return NextResponse.json(
            { error: "Boss data required for reward generation" },
            { status: 400 }
          )
        }
        result = await handleBossReward(parsed.boss, parsed.floor, parsed.playerClass)
        break

      case "dungeon_loot":
        if (!parsed.dungeon) {
          return NextResponse.json(
            { error: "Dungeon data required for themed loot" },
            { status: 400 }
          )
        }
        result = await handleDungeonLoot(parsed.dungeon, parsed.playerClass)
        break

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Drops API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Loot generation failed - the spirits are silent" },
      { status: 500 }
    )
  }
}
