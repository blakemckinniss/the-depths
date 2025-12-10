/**
 * AI Alchemy System - Client Side
 *
 * Provides functions for AI-powered crafting:
 * - Recipe discovery from material combinations
 * - Item lore generation
 * - Salvage predictions
 * - Enchantment suggestions
 *
 * All operations use the /api/alchemy endpoint
 */

import type { Item, ItemRarity, StatusEffect } from "@/lib/core/game-types"
import type { MaterialItem, MaterialTag } from "@/lib/materials/material-system"
import { generateMaterial } from "@/lib/materials/material-system"

// =============================================================================
// TYPES
// =============================================================================

export interface AlchemyResult {
  success: boolean
  result?: {
    name: string
    type: "weapon" | "armor" | "consumable" | "trinket" | "tool" | "material"
    subtype: string
    rarity: ItemRarity
    description: string
    stats?: {
      attack?: number
      defense?: number
      health?: number
    }
    effect?: {
      name: string
      description: string
      duration?: number
    }
  }
  failure?: {
    reason: string
    hint: string
    byproduct?: string
  }
  lore: string
}

export interface ItemLore {
  origin: string
  history: string
  legend?: string
  curse?: string
  inscription?: string
}

export interface SalvageResult {
  materials: Array<{
    type: string
    quantity: number
    quality: "crude" | "normal" | "fine" | "superior" | "pristine"
  }>
  description: string
  bonus?: {
    material: string
    quantity: number
    reason: string
  }
}

export interface EnchantmentSuggestion {
  suggestions: Array<{
    name: string
    type: "prefix" | "suffix"
    effect: string
    affinity: number
    requiredMaterials: string[]
  }>
  alchemicalNotes: string
}

export interface AlchemyContext {
  playerClass?: string
  floor?: number
  alchemySkill?: number
}

// =============================================================================
// API CALLS
// =============================================================================

async function callAlchemyAPI<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/alchemy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || "Alchemy failed")
  }

  return response.json()
}

// =============================================================================
// RECIPE DISCOVERY
// =============================================================================

/**
 * Attempt to discover a recipe by combining materials
 * The AI determines what can be created based on material properties
 */
export async function discoverRecipe(
  materials: MaterialItem[],
  context: AlchemyContext = {}
): Promise<AlchemyResult> {
  // Validate minimum materials
  if (materials.length < 2) {
    return {
      success: false,
      failure: {
        reason: "Insufficient materials",
        hint: "Alchemy requires at least two components to create a reaction.",
        byproduct: undefined,
      },
      lore: "The lone ingredient sits inert, awaiting a companion.",
    }
  }

  // Check for obvious conflicts (for quick rejection without API call)
  const hasHoly = materials.some(m => m.tags.includes("holy"))
  const hasDark = materials.some(m => m.tags.includes("dark"))
  const hasFire = materials.some(m => m.tags.includes("elemental_fire"))
  const hasIce = materials.some(m => m.tags.includes("elemental_ice"))

  // Extreme conflicts have lower success chance but still possible
  const isVolatile = (hasHoly && hasDark) || (hasFire && hasIce)

  // Prepare materials for API
  const materialData = materials.map(m => ({
    type: m.subtype,
    name: m.name,
    tier: m.tier,
    quality: m.quality,
    tags: m.tags,
    quantity: m.quantity,
  }))

  const result = await callAlchemyAPI<AlchemyResult>({
    action: "discover",
    materials: materialData,
    ...context,
  })

  // Add volatility note if applicable
  if (isVolatile && result.success) {
    result.lore = `⚡ Volatile combination! ${result.lore}`
  }

  return result
}

/**
 * Convert an alchemy result into an actual game Item
 */
export function alchemyResultToItem(result: AlchemyResult): Item | null {
  if (!result.success || !result.result) {
    return null
  }

  const r = result.result
  const id = `alch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const item: Item = {
    id,
    name: r.name,
    entityType: r.type === "weapon" ? "weapon" : r.type === "armor" ? "armor" : "item",
    type: r.type === "consumable" ? "potion" : r.type === "weapon" ? "weapon" : r.type === "armor" ? "armor" : "misc",
    rarity: r.rarity,
    description: r.description,
    value: calculateAlchemyValue(r.rarity, r.type),
    category: r.type as Item["category"],
    subtype: r.subtype,
    aiGenerated: true,
    lore: result.lore,
  }

  if (r.stats) {
    item.stats = r.stats
  }

  if (r.effect) {
    const statusEffect: StatusEffect = {
      id: `eff_${id}`,
      name: r.effect.name,
      entityType: "effect",
      effectType: "buff",
      duration: r.effect.duration || 3,
      modifiers: {},
      description: r.effect.description,
    }
    item.effects = [statusEffect]
    item.useText = r.effect.description
  }

  return item
}

function calculateAlchemyValue(rarity: ItemRarity, type: string): number {
  const rarityMult: Record<ItemRarity, number> = {
    common: 1,
    uncommon: 2.5,
    rare: 6,
    legendary: 15,
  }
  const typeMult: Record<string, number> = {
    weapon: 25,
    armor: 30,
    consumable: 15,
    trinket: 35,
    tool: 20,
    material: 10,
  }
  return Math.floor((typeMult[type] || 20) * rarityMult[rarity])
}

// =============================================================================
// ITEM LORE GENERATION
// =============================================================================

/**
 * Generate atmospheric lore/backstory for an item
 */
export async function generateItemLore(item: Item): Promise<ItemLore> {
  const result = await callAlchemyAPI<ItemLore>({
    action: "lore",
    item: {
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      stats: item.stats,
      damageType: item.damageType,
    },
  })

  return result
}

/**
 * Apply generated lore to an item
 */
export function applyLoreToItem(item: Item, lore: ItemLore): Item {
  const loreText = [
    lore.origin,
    lore.history,
    lore.legend,
    lore.inscription ? `Inscription: "${lore.inscription}"` : null,
    lore.curse ? `⚠️ ${lore.curse}` : null,
  ].filter(Boolean).join("\n\n")

  return {
    ...item,
    lore: loreText,
    description: item.description || lore.origin,
    aiGenerated: true,
  }
}

// =============================================================================
// SALVAGE SYSTEM
// =============================================================================

/**
 * Determine what materials are recovered from salvaging an item
 */
export async function calculateSalvage(
  item: Item,
  context: AlchemyContext = {}
): Promise<SalvageResult> {
  const result = await callAlchemyAPI<SalvageResult>({
    action: "salvage",
    itemToSalvage: {
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      value: item.value,
      stats: item.stats,
    },
    ...context,
  })

  return result
}

/**
 * Convert salvage results into actual MaterialItems
 */
export function salvageResultToMaterials(result: SalvageResult): MaterialItem[] {
  const materials: MaterialItem[] = []

  for (const mat of result.materials) {
    try {
      const material = generateMaterial({
        type: mat.type as MaterialItem["subtype"],
        quality: mat.quality,
        quantity: mat.quantity,
      })
      materials.push(material)
    } catch {
      // If type doesn't match, generate a generic material
      const material = generateMaterial({
        tier: 1,
        quality: mat.quality,
        quantity: mat.quantity,
      })
      material.name = `Salvaged ${mat.type}`
      materials.push(material)
    }
  }

  // Add bonus material if present
  if (result.bonus) {
    try {
      const bonusMat = generateMaterial({
        type: result.bonus.material as MaterialItem["subtype"],
        quality: "superior",
        quantity: result.bonus.quantity,
      })
      materials.push(bonusMat)
    } catch {
      // Skip if invalid type
    }
  }

  return materials
}

// =============================================================================
// ENCHANTMENT SUGGESTIONS
// =============================================================================

/**
 * Get AI suggestions for enchantments based on available materials
 */
export async function suggestEnchantments(
  materials: MaterialItem[],
  context: AlchemyContext = {}
): Promise<EnchantmentSuggestion> {
  const materialData = materials.map(m => ({
    type: m.subtype,
    name: m.name,
    tier: m.tier,
    quality: m.quality,
    tags: m.tags,
    quantity: m.quantity,
  }))

  const result = await callAlchemyAPI<EnchantmentSuggestion>({
    action: "enchant",
    materials: materialData,
    ...context,
  })

  return result
}

// =============================================================================
// RECIPE HINTS (LOCAL, NO API)
// =============================================================================

interface RecipeHint {
  tags: MaterialTag[]
  resultType: string
  hint: string
}

const RECIPE_HINTS: RecipeHint[] = [
  { tags: ["healing", "reagent"], resultType: "potion", hint: "Combine healing herbs with a catalyst for restoration" },
  { tags: ["toxic", "reagent"], resultType: "poison", hint: "Venoms and reagents create deadly concoctions" },
  { tags: ["weapon_material", "elemental_fire"], resultType: "fire_weapon", hint: "Forge metal with fire essence for burning blades" },
  { tags: ["armor_material", "elemental_ice"], resultType: "frost_armor", hint: "Cold-forged armor resists heat" },
  { tags: ["catalyst", "magical"], resultType: "enchantment", hint: "Catalysts amplify magical materials into enchantments" },
  { tags: ["holy", "healing"], resultType: "divine_potion", hint: "Sacred herbs create blessed elixirs" },
  { tags: ["dark", "catalyst"], resultType: "curse", hint: "Dark catalysts birth terrible curses" },
  { tags: ["dark", "decorative"], resultType: "soul_gem", hint: "Souls bound in crystal hold great power" },
]

/**
 * Get hints for what recipes might be possible with given materials
 * (Local calculation, no API call)
 */
export function getRecipeHints(materials: MaterialItem[]): string[] {
  const allTags = new Set<MaterialTag>()
  for (const mat of materials) {
    for (const tag of mat.tags) {
      allTags.add(tag)
    }
  }

  const hints: string[] = []
  for (const recipe of RECIPE_HINTS) {
    const matchCount = recipe.tags.filter(t => allTags.has(t)).length
    if (matchCount >= 2 || (recipe.tags.length === 2 && matchCount === recipe.tags.length)) {
      hints.push(recipe.hint)
    }
  }

  return hints
}

// =============================================================================
// MATERIAL SYNERGY CALCULATION (LOCAL)
// =============================================================================

interface SynergyResult {
  score: number
  synergies: string[]
  conflicts: string[]
  volatility: "stable" | "reactive" | "volatile" | "explosive"
}

/**
 * Calculate synergy between materials (local, no API)
 * Used for UI feedback before committing to alchemy
 */
export function calculateMaterialSynergy(materials: MaterialItem[]): SynergyResult {
  const allTags = new Map<MaterialTag, number>()
  for (const mat of materials) {
    for (const tag of mat.tags) {
      allTags.set(tag, (allTags.get(tag) || 0) + 1)
    }
  }

  const synergies: string[] = []
  const conflicts: string[] = []
  let score = 0

  // Check for positive synergies
  if ((allTags.get("catalyst") || 0) >= 1 && allTags.size > 2) {
    synergies.push("Catalyst amplifies other materials")
    score += 15
  }
  if ((allTags.get("reagent") || 0) >= 2) {
    synergies.push("Multiple reagents enable complex reactions")
    score += 10
  }
  if (allTags.has("healing") && allTags.has("organic")) {
    synergies.push("Organic healing components combine naturally")
    score += 10
  }
  if (allTags.has("weapon_material") && allTags.has("structural")) {
    synergies.push("Strong structural bond for forging")
    score += 10
  }

  // Check for conflicts
  if (allTags.has("holy") && allTags.has("dark")) {
    conflicts.push("Holy and dark energies clash violently")
    score -= 20
  }
  if (allTags.has("elemental_fire") && allTags.has("elemental_ice")) {
    conflicts.push("Fire and ice neutralize each other")
    score -= 15
  }
  if (allTags.has("toxic") && allTags.has("healing")) {
    conflicts.push("Toxins may corrupt healing properties")
    score -= 10
  }

  // Calculate average tier bonus
  const avgTier = materials.reduce((sum, m) => sum + m.tier, 0) / materials.length
  score += avgTier * 5

  // Quality bonus
  const qualityScores: Record<string, number> = {
    crude: -5,
    normal: 0,
    fine: 5,
    superior: 10,
    pristine: 20,
  }
  for (const mat of materials) {
    score += qualityScores[mat.quality] || 0
  }

  // Determine volatility
  let volatility: SynergyResult["volatility"] = "stable"
  if (conflicts.length > 0) {
    volatility = conflicts.length === 1 ? "reactive" : "volatile"
    if (conflicts.length >= 2 && allTags.has("catalyst")) {
      volatility = "explosive"
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    synergies,
    conflicts,
    volatility,
  }
}

// =============================================================================
// ALCHEMY WORKBENCH STATE
// =============================================================================

export interface AlchemyWorkbench {
  selectedMaterials: MaterialItem[]
  lastResult: AlchemyResult | null
  discoveredRecipes: Map<string, AlchemyResult>
  totalExperiments: number
  successfulExperiments: number
}

export function createAlchemyWorkbench(): AlchemyWorkbench {
  return {
    selectedMaterials: [],
    lastResult: null,
    discoveredRecipes: new Map(),
    totalExperiments: 0,
    successfulExperiments: 0,
  }
}

export function getRecipeKey(materials: MaterialItem[]): string {
  return materials
    .map(m => `${m.subtype}:${m.quality}`)
    .sort()
    .join("+")
}

export function workbenchAddMaterial(
  workbench: AlchemyWorkbench,
  material: MaterialItem
): AlchemyWorkbench {
  return {
    ...workbench,
    selectedMaterials: [...workbench.selectedMaterials, material],
  }
}

export function workbenchRemoveMaterial(
  workbench: AlchemyWorkbench,
  index: number
): AlchemyWorkbench {
  const newMaterials = [...workbench.selectedMaterials]
  newMaterials.splice(index, 1)
  return {
    ...workbench,
    selectedMaterials: newMaterials,
  }
}

export function workbenchClear(workbench: AlchemyWorkbench): AlchemyWorkbench {
  return {
    ...workbench,
    selectedMaterials: [],
  }
}

export async function workbenchExperiment(
  workbench: AlchemyWorkbench,
  context: AlchemyContext = {}
): Promise<{ workbench: AlchemyWorkbench; result: AlchemyResult }> {
  const result = await discoverRecipe(workbench.selectedMaterials, context)

  const key = getRecipeKey(workbench.selectedMaterials)
  const newDiscovered = new Map(workbench.discoveredRecipes)

  if (result.success) {
    newDiscovered.set(key, result)
  }

  return {
    workbench: {
      ...workbench,
      lastResult: result,
      discoveredRecipes: newDiscovered,
      totalExperiments: workbench.totalExperiments + 1,
      successfulExperiments: workbench.successfulExperiments + (result.success ? 1 : 0),
    },
    result,
  }
}
