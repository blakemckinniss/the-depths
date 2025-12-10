/**
 * AI Alchemy API Route
 *
 * Handles AI-powered crafting operations:
 * - Recipe discovery from material combinations
 * - Item lore generation
 * - Salvage result determination
 * - Enchantment suggestions
 */

import { generateWithAI, AI_CONFIG, entityCache } from "@/lib/ai/ai-utils"
import { generateCraftingMechanicsPrompt, generateMechanicsPrompt } from "@/lib/mechanics/game-mechanics-ledger"
import { z } from "zod"
import { NextResponse } from "next/server"

// Get mechanics prompts once at module load
const CRAFTING_MECHANICS = generateCraftingMechanicsPrompt()
const ITEM_MECHANICS = generateMechanicsPrompt()

// =============================================================================
// SCHEMAS
// =============================================================================

// Recipe Discovery - What can be made from these materials?
const RecipeDiscoverySchema = z.object({
  success: z.boolean().describe("Whether a valid recipe was discovered"),
  result: z.object({
    name: z.string().describe("Name of the crafted item"),
    type: z.enum(["weapon", "armor", "consumable", "trinket", "tool", "material"]).describe("Item category"),
    subtype: z.string().describe("Specific item type (e.g., 'health_potion', 'sword', 'ring')"),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]).describe("Item rarity based on materials used"),
    description: z.string().describe("Short atmospheric description of the item"),
    stats: z.object({
      attack: z.number().nullish(),
      defense: z.number().nullish(),
      health: z.number().nullish(),
    }).nullish(),
    effect: z.object({
      name: z.string(),
      description: z.string(),
      duration: z.number().nullish(),
    }).nullish(),
  }).nullish(),
  failure: z.object({
    reason: z.string().describe("Why the combination failed"),
    hint: z.string().describe("Cryptic hint about what might work better"),
    byproduct: z.string().nullish().describe("Minor item produced from failed attempt"),
  }).nullish(),
  lore: z.string().describe("Brief alchemical observation about this combination"),
})

// Item Lore - Generate backstory for an item
const ItemLoreSchema = z.object({
  origin: z.string().describe("Where/how the item was created (1-2 sentences)"),
  history: z.string().describe("Notable events in the item's past (1-2 sentences)"),
  legend: z.string().nullish().describe("Any myths or legends (only for rare+ items)"),
  curse: z.string().nullish().describe("Hidden curse or drawback (only sometimes)"),
  inscription: z.string().nullish().describe("Text inscribed on the item"),
})

// Salvage Results - What materials come from breaking down an item?
const SalvageResultSchema = z.object({
  materials: z.array(z.object({
    type: z.string().describe("Material type from taxonomy"),
    quantity: z.number().describe("Amount recovered"),
    quality: z.enum(["crude", "normal", "fine", "superior", "pristine"]),
  })),
  description: z.string().describe("Brief description of the salvage process"),
  bonus: z.object({
    material: z.string(),
    quantity: z.number(),
    reason: z.string(),
  }).nullish().describe("Rare bonus material from exceptional salvage"),
})

// Enchantment Suggestion - What enchantments fit these materials?
const EnchantmentSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string().describe("Enchantment name"),
    type: z.enum(["prefix", "suffix"]).describe("Whether it's a prefix or suffix"),
    effect: z.string().describe("What the enchantment does"),
    affinity: z.number().min(1).max(10).describe("How well the materials suit this enchantment"),
    requiredMaterials: z.array(z.string()).describe("Which of the provided materials are needed"),
  })),
  alchemicalNotes: z.string().describe("Brief observation about the material synergies"),
})

// Request body schema
const RequestSchema = z.object({
  action: z.enum(["discover", "lore", "salvage", "enchant"]),
  // For discover/enchant
  materials: z.array(z.object({
    type: z.string(),
    name: z.string(),
    tier: z.number(),
    quality: z.string(),
    tags: z.array(z.string()),
    quantity: z.number().optional(),
  })).optional(),
  // For lore
  item: z.object({
    name: z.string(),
    type: z.string(),
    rarity: z.string(),
    stats: z.record(z.number()).optional(),
    damageType: z.string().optional(),
  }).optional(),
  // For salvage
  itemToSalvage: z.object({
    name: z.string(),
    type: z.string(),
    rarity: z.string(),
    value: z.number(),
    stats: z.record(z.number()).optional(),
  }).optional(),
  // Context
  playerClass: z.string().optional(),
  floor: z.number().optional(),
  alchemySkill: z.number().optional(), // 1-10
})

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const ALCHEMY_SYSTEM = `You are an ancient alchemist AI in a dark fantasy dungeon crawler.
Your role is to determine what can be crafted from material combinations.

RULES:
- Combinations should feel logical based on material tags and fantasy tropes
- Higher tier materials = better results
- Matching tags = synergy bonuses
- Conflicting tags (holy+dark, fire+ice) = unstable results or failures
- Quality affects success rate - pristine materials rarely fail
- Be creative but consistent with dark fantasy themes
- Rare/legendary results should be exceptional, not common
- Failed experiments should produce something (ash, residue, corrupted materials)

MATERIAL TAG MEANINGS:
- healing: Can be used in restorative items
- catalyst: Amplifies other materials
- reagent: Basic alchemy ingredient
- toxic/debuffing: Poisons, curses
- elemental_*: Elemental damage/resistance
- holy/dark: Divine vs corrupted
- weapon_material/armor_material: Can be forged into equipment
- flammable/fuel: Fire-related, volatile
- structural/binding: Physical crafting

${CRAFTING_MECHANICS}

${ITEM_MECHANICS}`

const LORE_SYSTEM = `You are a lorekeeper AI for a dark fantasy dungeon crawler.
Generate atmospheric backstories for items.

RULES:
- Keep text brief and punchy (1-2 sentences per field)
- Match tone to rarity: common=mundane, legendary=epic
- Include specific names, places, events
- Hint at the world's dark history
- Legendary items should feel unique and storied
- Occasionally include curses or hidden properties
- No modern references or humor

${ITEM_MECHANICS}`

const SALVAGE_SYSTEM = `You are an alchemist AI determining salvage results.
When items are broken down, determine what materials are recovered.

RULES:
- Higher rarity = better/more materials
- Weapons yield weapon_materials (metal, bone, wood)
- Armor yields armor_materials (leather, metal, cloth, scale)
- Potions yield reagents and catalysts
- Magical items yield essence, dust, or shards
- Quality depends on salvage skill
- Occasionally grant bonus rare materials
- Total value of materials < original item value (entropy)

${CRAFTING_MECHANICS}`

const ENCHANT_SYSTEM = `You are an enchanter AI suggesting magical enhancements.
Based on available materials, suggest possible enchantments.

RULES:
- Match enchantments to material tags
- Fire materials = fire enchants
- Holy materials = divine/anti-undead
- Catalyst materials boost enchantment power
- Suggest 2-4 options with varying power levels
- Higher affinity = better success chance
- Include both prefix and suffix options

${ITEM_MECHANICS}`

// =============================================================================
// HANDLERS
// =============================================================================

async function handleDiscovery(materials: NonNullable<z.infer<typeof RequestSchema>["materials"]>, alchemySkill = 5) {
  const materialSummary = materials.map(m =>
    `${m.name} (Tier ${m.tier}, ${m.quality}, tags: ${m.tags.join(", ")})`
  ).join("\n")

  const cacheKey = entityCache.generateKey(
    "alchemy",
    ...materials.map(m => `${m.type}:${m.quality}`).sort()
  )

  // Check cache
  const cached = entityCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const prompt = `A player with alchemy skill ${alchemySkill}/10 attempts to combine these materials:

${materialSummary}

Determine:
1. Can these materials create something useful?
2. If yes: What item is created? Consider the material tags and tiers.
3. If no: Why did it fail? What byproduct remains? Give a cryptic hint.

The combination should feel logical based on fantasy alchemy principles.
Higher tier and quality materials should produce better results.
Conflicting elemental or alignment tags may cause instability.`

  const result = await generateWithAI({
    schema: RecipeDiscoverySchema,
    prompt,
    system: ALCHEMY_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 600,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleLore(item: NonNullable<z.infer<typeof RequestSchema>["item"]>) {
  const cacheKey = entityCache.generateKey("lore", item.name, item.type, item.rarity)

  const cached = entityCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const prompt = `Generate lore for this ${item.rarity} ${item.type}:

Name: ${item.name}
Stats: ${item.stats ? JSON.stringify(item.stats) : "None"}
${item.damageType ? `Damage Type: ${item.damageType}` : ""}

Create a brief but evocative backstory appropriate to its rarity level.
${item.rarity === "legendary" ? "This is a legendary item - give it an epic history." : ""}
${item.rarity === "common" ? "This is common - keep the lore mundane but atmospheric." : ""}`

  const result = await generateWithAI({
    schema: ItemLoreSchema,
    prompt,
    system: LORE_SYSTEM,
    temperature: AI_CONFIG.temperature.creative,
    maxTokens: 400,
  })

  entityCache.set(cacheKey, result)
  return result
}

async function handleSalvage(
  item: NonNullable<z.infer<typeof RequestSchema>["itemToSalvage"]>,
  alchemySkill = 5
) {
  const prompt = `A player with alchemy skill ${alchemySkill}/10 salvages this item:

Name: ${item.name}
Type: ${item.type}
Rarity: ${item.rarity}
Value: ${item.value} gold
Stats: ${item.stats ? JSON.stringify(item.stats) : "None"}

Determine what materials are recovered. Consider:
- Item type determines material categories (weapon→metal/wood, armor→leather/metal)
- Rarity affects quality and quantity
- Higher skill = better quality materials
- Occasionally grant bonus rare materials for excellent salvage
- Total material value should be less than item value

Use material types from the game's taxonomy:
Metals: ore_iron, ore_silver, ore_gold, ore_mithril, ingot
Gems: gem_raw, gem_cut, crystal
Organic: herb, mushroom, essence
Animal: hide, leather, bone, scale, silk
Magical: arcane_dust, enchanting_powder, soul_shard`

  const result = await generateWithAI({
    schema: SalvageResultSchema,
    prompt,
    system: SALVAGE_SYSTEM,
    temperature: AI_CONFIG.temperature.structured,
    maxTokens: 400,
  })

  return result
}

async function handleEnchant(
  materials: NonNullable<z.infer<typeof RequestSchema>["materials"]>,
  playerClass?: string
) {
  const materialSummary = materials.map(m =>
    `${m.name} (tags: ${m.tags.join(", ")})`
  ).join("\n")

  const prompt = `Suggest enchantments that could be created from these materials:

${materialSummary}

${playerClass ? `Player class: ${playerClass} (consider class-appropriate enchantments)` : ""}

Provide 2-4 enchantment options with:
- Creative but fitting names
- Clear effects
- Affinity score (how well materials match)
- Which materials are required`

  const result = await generateWithAI({
    schema: EnchantmentSuggestionSchema,
    prompt,
    system: ENCHANT_SYSTEM,
    temperature: AI_CONFIG.temperature.balanced,
    maxTokens: 500,
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
      case "discover":
        if (!parsed.materials || parsed.materials.length === 0) {
          return NextResponse.json(
            { error: "Materials required for discovery" },
            { status: 400 }
          )
        }
        result = await handleDiscovery(parsed.materials, parsed.alchemySkill)
        break

      case "lore":
        if (!parsed.item) {
          return NextResponse.json(
            { error: "Item required for lore generation" },
            { status: 400 }
          )
        }
        result = await handleLore(parsed.item)
        break

      case "salvage":
        if (!parsed.itemToSalvage) {
          return NextResponse.json(
            { error: "Item required for salvage" },
            { status: 400 }
          )
        }
        result = await handleSalvage(parsed.itemToSalvage, parsed.alchemySkill)
        break

      case "enchant":
        if (!parsed.materials || parsed.materials.length === 0) {
          return NextResponse.json(
            { error: "Materials required for enchantment suggestions" },
            { status: 400 }
          )
        }
        result = await handleEnchant(parsed.materials, parsed.playerClass)
        break

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Alchemy API error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Alchemy failed - the materials react violently!" },
      { status: 500 }
    )
  }
}
