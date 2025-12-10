/**
 * Transmogrification System
 *
 * Converts unwanted items into crafting materials, magical essence,
 * or chance-based upgrades. Inspired by ToME's transmogrification chest.
 */

import type { Item, ItemRarity, DamageType, StatusEffect } from "@/lib/core/game-types"
import type { MaterialType, ItemCategory } from "./item-taxonomy"
import { generateId } from "@/lib/core/utils"

// =============================================================================
// ESSENCE TYPES
// =============================================================================

export type EssenceType =
  | "arcane"      // From magical items
  | "primal"      // From nature/organic items
  | "shadow"      // From cursed/dark items
  | "elemental"   // From elemental damage items
  | "martial"     // From weapons/armor
  | "vital"       // From potions/healing items
  | "void"        // From legendary items

export interface MagicalEssence {
  id: string
  type: EssenceType
  amount: number
  purity: 1 | 2 | 3 | 4 | 5 // Higher purity = better results
  sourceRarity: ItemRarity
}

// =============================================================================
// TRANSMOGRIFICATION RESULTS
// =============================================================================

export type TransmogResultType =
  | "essence"           // Pure magical essence
  | "material"          // Raw crafting material
  | "upgrade_success"   // Item became better
  | "upgrade_failure"   // Item destroyed
  | "unexpected"        // Random transformation
  | "cursed"           // Something went wrong

export interface TransmogResult {
  type: TransmogResultType
  essence?: MagicalEssence
  materials?: TransmogMaterial[]
  upgradedItem?: Item
  unexpectedItem?: Partial<Item>
  narration: string
  goldValue: number // Vendor value of results
}

export interface TransmogMaterial {
  id: string
  name: string
  materialType: MaterialType | string
  tier: 1 | 2 | 3 | 4 | 5
  quantity: number
  description: string
}

// =============================================================================
// TRANSMOGRIFICATION CONFIG
// =============================================================================

interface TransmogConfig {
  essenceYield: number // Base essence per rarity
  materialChance: number // Chance to yield material instead of essence
  upgradeChance: number // Chance to upgrade instead of destroy
  curseChance: number // Chance of cursed result
  unexpectedChance: number // Chance of random transformation
}

const RARITY_CONFIG: Record<ItemRarity, TransmogConfig> = {
  common: {
    essenceYield: 1,
    materialChance: 0.6,
    upgradeChance: 0.05,
    curseChance: 0.02,
    unexpectedChance: 0.03,
  },
  uncommon: {
    essenceYield: 3,
    materialChance: 0.5,
    upgradeChance: 0.08,
    curseChance: 0.03,
    unexpectedChance: 0.05,
  },
  rare: {
    essenceYield: 8,
    materialChance: 0.4,
    upgradeChance: 0.12,
    curseChance: 0.05,
    unexpectedChance: 0.07,
  },
  legendary: {
    essenceYield: 20,
    materialChance: 0.3,
    upgradeChance: 0.15,
    curseChance: 0.08,
    unexpectedChance: 0.10,
  },
}

// =============================================================================
// ESSENCE DETERMINATION
// =============================================================================

function determineEssenceType(item: Item): EssenceType {
  // Check damage type first
  if (item.damageType) {
    switch (item.damageType) {
      case "fire":
      case "ice":
      case "lightning":
        return "elemental"
      case "shadow":
        return "shadow"
      case "holy":
        return "primal"
      case "poison":
        return "primal"
      case "arcane":
        return "arcane"
    }
  }

  // Check item type
  if (item.type === "weapon" || item.type === "armor") {
    return "martial"
  }

  if (item.type === "potion") {
    return "vital"
  }

  // Check category
  if (item.category === "tome" || item.category === "trinket") {
    return "arcane"
  }

  if (item.category === "material") {
    return "primal"
  }

  // Legendary items always yield void essence
  if (item.rarity === "legendary") {
    return "void"
  }

  // Default based on rarity
  return item.rarity === "rare" ? "arcane" : "martial"
}

function determinePurity(item: Item): 1 | 2 | 3 | 4 | 5 {
  const rarityPurity: Record<ItemRarity, 1 | 2 | 3 | 4 | 5> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    legendary: 5,
  }

  let purity = rarityPurity[item.rarity]

  // Enchantments increase purity
  if (item.enchantments && item.enchantments.length > 0) {
    purity = Math.min(5, purity + 1) as 1 | 2 | 3 | 4 | 5
  }

  // Effects increase purity
  if (item.effects && item.effects.length > 0) {
    purity = Math.min(5, purity + 1) as 1 | 2 | 3 | 4 | 5
  }

  return purity
}

// =============================================================================
// MATERIAL EXTRACTION
// =============================================================================

const MATERIAL_TABLES: Record<string, TransmogMaterial[]> = {
  weapon: [
    { id: generateId(), name: "Weapon Fragments", materialType: "metal_scrap", tier: 1, quantity: 1, description: "Broken metal pieces suitable for reforging." },
    { id: generateId(), name: "Steel Shards", materialType: "steel_ingot", tier: 2, quantity: 1, description: "Quality steel fragments." },
    { id: generateId(), name: "Enchanted Metal", materialType: "mithril_ore", tier: 3, quantity: 1, description: "Metal infused with magical properties." },
  ],
  armor: [
    { id: generateId(), name: "Armor Scraps", materialType: "leather_scraps", tier: 1, quantity: 1, description: "Salvageable armor pieces." },
    { id: generateId(), name: "Reinforced Plates", materialType: "iron_ingot", tier: 2, quantity: 1, description: "Sturdy armor plating." },
    { id: generateId(), name: "Enchanted Cloth", materialType: "silk_thread", tier: 3, quantity: 1, description: "Magically woven fabric." },
  ],
  potion: [
    { id: generateId(), name: "Alchemical Residue", materialType: "herb_bundle", tier: 1, quantity: 1, description: "Leftover alchemical compounds." },
    { id: generateId(), name: "Distilled Essence", materialType: "monster_blood", tier: 2, quantity: 1, description: "Concentrated magical liquid." },
    { id: generateId(), name: "Philosopher's Dust", materialType: "arcane_dust", tier: 4, quantity: 1, description: "Rare alchemical byproduct." },
  ],
  misc: [
    { id: generateId(), name: "Mysterious Particles", materialType: "raw_crystal", tier: 1, quantity: 1, description: "Strange matter of unknown origin." },
    { id: generateId(), name: "Magical Residue", materialType: "enchanting_dust", tier: 2, quantity: 1, description: "Faint magical emanations made solid." },
  ],
}

function extractMaterials(item: Item): TransmogMaterial[] {
  const table = MATERIAL_TABLES[item.type] || MATERIAL_TABLES.misc
  const rarityBonus: Record<ItemRarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    legendary: 3,
  }

  // Select material based on rarity
  const tierIndex = Math.min(table.length - 1, rarityBonus[item.rarity])
  const baseMaterial = table[tierIndex]

  // Calculate quantity
  const quantity = 1 + Math.floor(Math.random() * (rarityBonus[item.rarity] + 1))

  return [{
    ...baseMaterial,
    id: generateId(),
    quantity,
    tier: Math.min(5, baseMaterial.tier + Math.floor(rarityBonus[item.rarity] / 2)) as 1 | 2 | 3 | 4 | 5,
  }]
}

// =============================================================================
// UNEXPECTED TRANSFORMATIONS
// =============================================================================

const UNEXPECTED_ITEMS: Partial<Item>[] = [
  {
    name: "Transmuted Curiosity",
    description: "Something strange emerged from the transmogrification.",
    rarity: "uncommon",
    type: "misc",
    value: 50,
  },
  {
    name: "Essence Crystal",
    description: "Crystallized magical energy in physical form.",
    rarity: "rare",
    type: "misc",
    value: 150,
  },
  {
    name: "Void Shard",
    description: "A fragment of nothingness made manifest.",
    rarity: "rare",
    type: "misc",
    value: 200,
  },
  {
    name: "Chaos Gem",
    description: "Pure entropy captured in gemstone form.",
    rarity: "legendary",
    type: "misc",
    value: 500,
  },
]

const CURSED_EFFECTS: Partial<StatusEffect>[] = [
  {
    name: "Transmog Sickness",
    effectType: "debuff",
    duration: 5,
    modifiers: { attack: -2, defense: -2 },
    description: "The failed transmutation has left you weakened.",
  },
  {
    name: "Essence Drain",
    effectType: "debuff",
    duration: 3,
    modifiers: { healthRegen: -5 },
    description: "Magical energy seeps from your body.",
  },
  {
    name: "Void Touch",
    effectType: "debuff",
    duration: 10,
    modifiers: { maxHealth: -10 },
    description: "The void has marked you.",
  },
]

// =============================================================================
// UPGRADE SYSTEM
// =============================================================================

function attemptUpgrade(item: Item): Item | null {
  // Can't upgrade legendary
  if (item.rarity === "legendary") return null

  const rarityUpgrade: Record<ItemRarity, ItemRarity> = {
    common: "uncommon",
    uncommon: "rare",
    rare: "legendary",
    legendary: "legendary",
  }

  const statMultiplier: Record<ItemRarity, number> = {
    common: 1.3,
    uncommon: 1.5,
    rare: 2.0,
    legendary: 1.0,
  }

  const mult = statMultiplier[item.rarity]

  return {
    ...item,
    id: generateId(),
    name: `Transmuted ${item.name}`,
    rarity: rarityUpgrade[item.rarity],
    value: Math.floor(item.value * mult * 1.5),
    stats: item.stats ? {
      attack: item.stats.attack ? Math.floor(item.stats.attack * mult) : undefined,
      defense: item.stats.defense ? Math.floor(item.stats.defense * mult) : undefined,
      health: item.stats.health ? Math.floor(item.stats.health * mult) : undefined,
    } : undefined,
    description: `${item.description || ""} [Transmuted to a higher form]`,
    lore: "The transmogrification process has elevated this item beyond its original nature.",
  }
}

// =============================================================================
// NARRATION GENERATION
// =============================================================================

const ESSENCE_NARRATIONS: Record<EssenceType, string[]> = {
  arcane: [
    "Mystical energies swirl as the item dissolves into pure arcane essence.",
    "Glowing runes appear and fade as magical power is extracted.",
  ],
  primal: [
    "The scent of forest and earth fills the air as primal essence coalesces.",
    "Natural energy flows from the dissolving item like morning mist.",
  ],
  shadow: [
    "Darkness seeps from the item, condensing into shadowy essence.",
    "The item crumbles into inky darkness, leaving behind concentrated shadow.",
  ],
  elemental: [
    "Raw elemental power crackles as the item is reduced to pure energy.",
    "Fire, ice, and lightning flash briefly before settling into essence.",
  ],
  martial: [
    "The weapon's spirit departs, leaving behind the essence of combat.",
    "Steel and leather dissolve into the concentrated will of warriors.",
  ],
  vital: [
    "Life energy pulses as the item releases its healing potential.",
    "A warm glow suffuses the area as vital essence is extracted.",
  ],
  void: [
    "Reality warps and bends as void essence tears free from the item.",
    "The item vanishes into nothingness, leaving behind fragments of the void.",
  ],
}

function generateNarration(
  item: Item,
  resultType: TransmogResultType,
  essenceType?: EssenceType
): string {
  switch (resultType) {
    case "essence":
      const narrations = ESSENCE_NARRATIONS[essenceType || "arcane"]
      return narrations[Math.floor(Math.random() * narrations.length)]

    case "material":
      return `The ${item.name} breaks down into useful crafting materials.`

    case "upgrade_success":
      return `The transmogrification chamber hums with power. When the light fades, the ${item.name} has been elevated to something greater!`

    case "upgrade_failure":
      return `The ${item.name} shudders, cracks appear across its surface, and it crumbles to worthless dust.`

    case "unexpected":
      return `Something unexpected happens! The ${item.name} twists and warps, transforming into something entirely different.`

    case "cursed":
      return `Dark energy surges from the transmogrification! The ${item.name} is consumed, leaving behind a lingering curse.`

    default:
      return `The ${item.name} dissolves in the transmogrification chamber.`
  }
}

// =============================================================================
// MAIN TRANSMOGRIFICATION FUNCTION
// =============================================================================

export interface TransmogOptions {
  forceEssence?: boolean // Always yield essence
  forceMaterial?: boolean // Always yield materials
  allowUpgrade?: boolean // Enable upgrade chance (default true)
  allowCurse?: boolean // Enable curse chance (default true)
  luckBonus?: number // 0-1 bonus to good outcomes
}

/**
 * Transmogrify an item into essence, materials, or something unexpected
 */
export function transmogrifyItem(
  item: Item,
  options: TransmogOptions = {}
): TransmogResult {
  const config = RARITY_CONFIG[item.rarity]
  const luckBonus = options.luckBonus || 0

  // Determine outcome
  const roll = Math.random()
  let resultType: TransmogResultType

  if (options.forceEssence) {
    resultType = "essence"
  } else if (options.forceMaterial) {
    resultType = "material"
  } else {
    // Check for special outcomes
    const curseThreshold = options.allowCurse !== false ? config.curseChance * (1 - luckBonus) : 0
    const unexpectedThreshold = curseThreshold + config.unexpectedChance
    const upgradeThreshold = options.allowUpgrade !== false
      ? unexpectedThreshold + config.upgradeChance * (1 + luckBonus)
      : unexpectedThreshold
    const materialThreshold = upgradeThreshold + config.materialChance

    if (roll < curseThreshold) {
      resultType = "cursed"
    } else if (roll < unexpectedThreshold) {
      resultType = "unexpected"
    } else if (roll < upgradeThreshold) {
      // Attempt upgrade
      const upgraded = attemptUpgrade(item)
      if (upgraded) {
        resultType = "upgrade_success"
      } else {
        resultType = "upgrade_failure"
      }
    } else if (roll < materialThreshold) {
      resultType = "material"
    } else {
      resultType = "essence"
    }
  }

  // Generate result based on type
  const essenceType = determineEssenceType(item)

  switch (resultType) {
    case "essence":
      return {
        type: "essence",
        essence: {
          id: generateId(),
          type: essenceType,
          amount: config.essenceYield,
          purity: determinePurity(item),
          sourceRarity: item.rarity,
        },
        narration: generateNarration(item, resultType, essenceType),
        goldValue: Math.floor(item.value * 0.3),
      }

    case "material":
      return {
        type: "material",
        materials: extractMaterials(item),
        narration: generateNarration(item, resultType),
        goldValue: Math.floor(item.value * 0.4),
      }

    case "upgrade_success":
      const upgraded = attemptUpgrade(item)!
      return {
        type: "upgrade_success",
        upgradedItem: upgraded,
        narration: generateNarration(item, resultType),
        goldValue: upgraded.value,
      }

    case "upgrade_failure":
      return {
        type: "upgrade_failure",
        narration: generateNarration(item, resultType),
        goldValue: 0,
      }

    case "unexpected":
      const unexpectedItem = UNEXPECTED_ITEMS[
        Math.floor(Math.random() * UNEXPECTED_ITEMS.length)
      ]
      return {
        type: "unexpected",
        unexpectedItem: {
          ...unexpectedItem,
          id: generateId(),
        },
        narration: generateNarration(item, resultType),
        goldValue: unexpectedItem.value || 100,
      }

    case "cursed":
      return {
        type: "cursed",
        narration: generateNarration(item, resultType),
        goldValue: 0,
      }

    default:
      return {
        type: "essence",
        essence: {
          id: generateId(),
          type: essenceType,
          amount: config.essenceYield,
          purity: determinePurity(item),
          sourceRarity: item.rarity,
        },
        narration: generateNarration(item, "essence", essenceType),
        goldValue: Math.floor(item.value * 0.3),
      }
  }
}

// =============================================================================
// BATCH TRANSMOGRIFICATION
// =============================================================================

export interface BatchTransmogResult {
  totalEssence: Map<EssenceType, MagicalEssence>
  totalMaterials: TransmogMaterial[]
  upgradedItems: Item[]
  unexpectedItems: Partial<Item>[]
  cursedCount: number
  failedCount: number
  totalGoldValue: number
  narrations: string[]
}

/**
 * Transmogrify multiple items at once
 */
export function batchTransmogrify(
  items: Item[],
  options: TransmogOptions = {}
): BatchTransmogResult {
  const result: BatchTransmogResult = {
    totalEssence: new Map(),
    totalMaterials: [],
    upgradedItems: [],
    unexpectedItems: [],
    cursedCount: 0,
    failedCount: 0,
    totalGoldValue: 0,
    narrations: [],
  }

  for (const item of items) {
    const transmogResult = transmogrifyItem(item, options)
    result.totalGoldValue += transmogResult.goldValue
    result.narrations.push(transmogResult.narration)

    switch (transmogResult.type) {
      case "essence":
        if (transmogResult.essence) {
          const existing = result.totalEssence.get(transmogResult.essence.type)
          if (existing) {
            existing.amount += transmogResult.essence.amount
            existing.purity = Math.max(existing.purity, transmogResult.essence.purity) as 1 | 2 | 3 | 4 | 5
          } else {
            result.totalEssence.set(transmogResult.essence.type, transmogResult.essence)
          }
        }
        break

      case "material":
        if (transmogResult.materials) {
          result.totalMaterials.push(...transmogResult.materials)
        }
        break

      case "upgrade_success":
        if (transmogResult.upgradedItem) {
          result.upgradedItems.push(transmogResult.upgradedItem)
        }
        break

      case "upgrade_failure":
        result.failedCount++
        break

      case "unexpected":
        if (transmogResult.unexpectedItem) {
          result.unexpectedItems.push(transmogResult.unexpectedItem)
        }
        break

      case "cursed":
        result.cursedCount++
        break
    }
  }

  return result
}

// =============================================================================
// ESSENCE CRAFTING
// =============================================================================

export interface EssenceCraftRecipe {
  id: string
  name: string
  description: string
  requirements: { type: EssenceType; amount: number; minPurity?: number }[]
  result: Partial<Item> | StatusEffect
  resultType: "item" | "effect"
}

const ESSENCE_RECIPES: EssenceCraftRecipe[] = [
  {
    id: "essence_potion_health",
    name: "Essence of Vitality",
    description: "Craft a powerful healing potion from vital essence.",
    requirements: [{ type: "vital", amount: 5, minPurity: 2 }],
    result: {
      name: "Transmuted Healing Potion",
      type: "potion",
      rarity: "uncommon",
      description: "A potion crafted from pure vital essence.",
      value: 100,
    },
    resultType: "item",
  },
  {
    id: "essence_enchant_fire",
    name: "Flame Infusion",
    description: "Temporarily imbue a weapon with fire damage.",
    requirements: [
      { type: "elemental", amount: 8, minPurity: 3 },
      { type: "martial", amount: 3 },
    ],
    result: {
      name: "Flame Infusion",
      effectType: "buff" as const,
      duration: 10,
      modifiers: { attack: 5 },
      description: "Your weapon burns with magical fire.",
    },
    resultType: "effect",
  },
  {
    id: "essence_void_crystal",
    name: "Void Crystal",
    description: "Condense void essence into a powerful artifact.",
    requirements: [
      { type: "void", amount: 15, minPurity: 4 },
      { type: "arcane", amount: 10, minPurity: 3 },
    ],
    result: {
      name: "Void Crystal",
      type: "misc",
      rarity: "legendary",
      description: "A crystal containing the essence of the void itself.",
      value: 1000,
    },
    resultType: "item",
  },
]

/**
 * Check if player has enough essence for a recipe
 */
export function canCraftRecipe(
  recipe: EssenceCraftRecipe,
  playerEssence: Map<EssenceType, MagicalEssence>
): boolean {
  for (const req of recipe.requirements) {
    const essence = playerEssence.get(req.type)
    if (!essence) return false
    if (essence.amount < req.amount) return false
    if (req.minPurity && essence.purity < req.minPurity) return false
  }
  return true
}

/**
 * Get all available recipes
 */
export function getEssenceRecipes(): EssenceCraftRecipe[] {
  return [...ESSENCE_RECIPES]
}

/**
 * Craft an item or effect from essence
 */
export function craftFromEssence(
  recipe: EssenceCraftRecipe,
  playerEssence: Map<EssenceType, MagicalEssence>
): { success: boolean; result?: Item | StatusEffect; remainingEssence: Map<EssenceType, MagicalEssence> } {
  if (!canCraftRecipe(recipe, playerEssence)) {
    return { success: false, remainingEssence: playerEssence }
  }

  // Consume essence
  const remaining = new Map(playerEssence)
  for (const req of recipe.requirements) {
    const essence = remaining.get(req.type)!
    essence.amount -= req.amount
    if (essence.amount <= 0) {
      remaining.delete(req.type)
    }
  }

  // Generate result
  const result = {
    ...recipe.result,
    id: generateId(),
  } as Item | StatusEffect

  return {
    success: true,
    result,
    remainingEssence: remaining,
  }
}
