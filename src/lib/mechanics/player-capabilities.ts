/**
 * Player Capabilities System
 *
 * Unified extraction of player capabilities from multiple sources:
 * - Spells (exploration/anytime/targeted usage contexts)
 * - Items (tools like lockpicks, torches, ropes)
 * - Abilities (class abilities with exploration uses)
 *
 * Used to:
 * 1. Pass context to AI for generating relevant encounters
 * 2. Generate situational choice buttons in dungeon exploration
 * 3. Display always-available capabilities in utility bar
 */

import type {
  Player,
  Item,
  Ability,
  ResourceType,
} from "@/lib/core/game-types"
import type { Spell, SpellBook } from "@/lib/magic/spell-system"
import { canCastSpell } from "@/lib/magic/spell-system"
import type { ToolType } from "@/lib/items/item-taxonomy"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Where this capability comes from
 */
export type CapabilitySource = "spell" | "item" | "ability" | "innate"

/**
 * Utility types that capabilities can provide
 * Aligned with SpellUtilityType but also covers item-based utilities
 */
export type CapabilityUtilityType =
  // From spells
  | "light"
  | "reveal_traps"
  | "reveal_secrets"
  | "teleport"
  | "unlock"
  | "identify"
  | "transmute_gold"
  | "transmute_item"
  | "charm"
  | "dominate"
  | "fear"
  | "ward_area"
  | "summon_companion"
  | "banish"
  | "dispel"
  | "scry"
  | "restore_item"
  // Item-specific
  | "traverse" // Rope, grappling hook
  | "break" // Crowbar
  | "navigate" // Compass, map

/**
 * A single capability the player can use
 */
export interface PlayerCapability {
  id: string
  name: string
  description?: string
  source: CapabilitySource
  sourceId: string // spell.id, item.id, ability.id

  // What it can do
  utilityType?: CapabilityUtilityType
  targetType: "self" | "item" | "environment" | "npc" | "enemy" | "location"

  // Availability
  available: boolean // Has resources, not on cooldown, has charges
  reason?: string // Why unavailable (for tooltip)

  // Cost (if any)
  cost?: {
    type: "mana" | "health" | "charges" | "consumable" | ResourceType
    amount: number
  }

  // UI category
  category: "always" | "situational"

  // For matching to situations
  tags?: string[] // Additional matching tags (spell school, item type, etc.)
}

/**
 * All player capabilities organized for different uses
 */
export interface PlayerCapabilities {
  // Always-available (Teleport, etc.) - for dedicated UI bar
  always: PlayerCapability[]

  // Situational (context-dependent) - for choice buttons
  situational: PlayerCapability[]

  // All capabilities combined
  all: PlayerCapability[]

  // Utility types available across all sources (for AI prompt)
  utilityTypes: CapabilityUtilityType[]

  // Summary string for AI prompt
  summary: string
}

// =============================================================================
// CAPABILITY EXTRACTION
// =============================================================================

/**
 * Extract all player capabilities from spells, items, and abilities
 */
export function extractPlayerCapabilities(
  player: Player,
  options?: { inCombat?: boolean }
): PlayerCapabilities {
  const inCombat = options?.inCombat ?? false

  const spellCaps = extractSpellCapabilities(player, inCombat)
  const itemCaps = extractItemCapabilities(player)
  const abilityCaps = extractAbilityCapabilities(player, inCombat)

  const all = [...spellCaps, ...itemCaps, ...abilityCaps]

  // Categorize
  const always = all.filter(c => c.category === "always")
  const situational = all.filter(c => c.category === "situational")

  // Get unique utility types
  const utilityTypes = [
    ...new Set(all.filter(c => c.utilityType).map(c => c.utilityType!)),
  ]

  // Build summary for AI
  const availableNames = all.filter(c => c.available).map(c => c.name)
  const summary =
    availableNames.length > 0
      ? `${availableNames.join(", ")} (${utilityTypes.join(", ")})`
      : "none"

  return {
    always,
    situational,
    all,
    utilityTypes,
    summary,
  }
}

// =============================================================================
// SPELL CAPABILITIES
// =============================================================================

function extractSpellCapabilities(
  player: Player,
  inCombat: boolean
): PlayerCapability[] {
  const capabilities: PlayerCapability[] = []
  const spellBook = player.spellBook

  if (!spellBook?.spells) return capabilities

  for (const spell of spellBook.spells) {
    // Skip combat-only spells when not in combat
    if (spell.usageContext === "combat_only" && !inCombat) continue

    // Skip exploration spells when in combat
    if (spell.usageContext === "exploration" && inCombat) continue

    // Check if can cast
    const canCast = canCastSpell(player, spell, spellBook, {
      inCombat,
      hasTarget: false, // Will check target at use time
      targetType: undefined,
    })

    // Determine category
    const isAlwaysOn = isAlwaysAvailableSpell(spell)

    // Map spell utility type to capability utility type
    const utilityType = spell.utilityEffect?.type as
      | CapabilityUtilityType
      | undefined

    capabilities.push({
      id: `spell_${spell.id}`,
      name: spell.name,
      description: spell.description,
      source: "spell",
      sourceId: spell.id,
      utilityType,
      targetType: mapSpellTargetType(spell.targetType),
      available: canCast.canCast,
      reason: canCast.reason,
      cost: {
        type: spell.resourceType,
        amount: spell.resourceCost,
      },
      category: isAlwaysOn ? "always" : "situational",
      tags: [spell.school, spell.effectType, ...(spell.tags || [])],
    })
  }

  return capabilities
}

/**
 * Spells that should always be shown (utility bar)
 */
function isAlwaysAvailableSpell(spell: Spell): boolean {
  // Teleport is always available
  if (spell.utilityEffect?.type === "teleport") return true

  // "Anytime" spells that are utility-focused
  if (
    spell.usageContext === "anytime" &&
    spell.effectType === "utility"
  ) {
    return true
  }

  return false
}

function mapSpellTargetType(
  spellTarget: Spell["targetType"]
): PlayerCapability["targetType"] {
  switch (spellTarget) {
    case "self":
      return "self"
    case "enemy":
    case "all_enemies":
      return "enemy"
    case "ally":
    case "all_allies":
      return "self" // Close enough for capability matching
    case "item":
      return "item"
    case "npc":
      return "npc"
    case "environment":
      return "environment"
    case "location":
      return "location"
    default:
      return "environment"
  }
}

// =============================================================================
// ITEM CAPABILITIES
// =============================================================================

/**
 * Tool types that provide capabilities
 */
const TOOL_CAPABILITIES: Record<
  ToolType,
  { utilityType: CapabilityUtilityType; targetType: PlayerCapability["targetType"] } | null
> = {
  // Light sources
  torch: { utilityType: "light", targetType: "environment" },
  lantern: { utilityType: "light", targetType: "environment" },

  // Unlock tools
  lockpick: { utilityType: "unlock", targetType: "environment" },
  crowbar: { utilityType: "break", targetType: "environment" },

  // Traverse tools
  rope: { utilityType: "traverse", targetType: "environment" },
  grappling_hook: { utilityType: "traverse", targetType: "environment" },

  // Navigation
  compass: { utilityType: "navigate", targetType: "self" },
  map: { utilityType: "navigate", targetType: "self" },

  // Special
  holy_water: { utilityType: "dispel", targetType: "enemy" },
  spyglass: { utilityType: "scry", targetType: "environment" },
  mirror: { utilityType: "reveal_secrets", targetType: "environment" },

  // Crafting tools - no exploration capabilities
  hammer: null,
  tongs: null,
  anvil: null,
  mortar_pestle: null,
  sewing_kit: null,
  alchemy_set: null,

  // Utility tools - no direct capabilities
  shovel: null,
  pickaxe: null,
  fishing_rod: null,
  trap_kit: null,
  disguise_kit: null,
  bell: null,
  whistle: null,
}

function extractItemCapabilities(player: Player): PlayerCapability[] {
  const capabilities: PlayerCapability[] = []

  if (!player.inventory) return capabilities

  for (const item of player.inventory) {
    // Check if it's a tool with capabilities
    if (item.category === "tool" && item.subtype) {
      const toolType = item.subtype as ToolType
      const capConfig = TOOL_CAPABILITIES[toolType]

      if (capConfig) {
        capabilities.push({
          id: `item_${item.id}`,
          name: item.name,
          description: item.description,
          source: "item",
          sourceId: item.id,
          utilityType: capConfig.utilityType,
          targetType: capConfig.targetType,
          available: true, // Items are always available if in inventory
          cost: isConsumableTool(toolType)
            ? { type: "consumable", amount: 1 }
            : undefined,
          category: "situational",
          tags: [toolType, item.category || "tool"],
        })
      }
    }

    // Check for keys (special unlock capability)
    if (item.type === "key" || item.category === "key") {
      capabilities.push({
        id: `item_${item.id}`,
        name: item.name,
        description: item.description || "A key that might open something",
        source: "item",
        sourceId: item.id,
        utilityType: "unlock",
        targetType: "environment",
        available: true,
        category: "situational",
        tags: ["key", item.subtype as string].filter(Boolean),
      })
    }
  }

  return capabilities
}

/**
 * Tools that get consumed on use
 */
function isConsumableTool(toolType: ToolType): boolean {
  return ["torch", "holy_water"].includes(toolType)
}

// =============================================================================
// ABILITY CAPABILITIES
// =============================================================================

function extractAbilityCapabilities(
  player: Player,
  inCombat: boolean
): PlayerCapability[] {
  const capabilities: PlayerCapability[] = []

  if (!player.abilities) return capabilities

  for (const ability of player.abilities) {
    // Skip passives
    if (ability.isPassive) continue

    // Skip abilities without utility (pure combat abilities)
    if (ability.category !== "utility") continue

    // Check cooldown
    const onCooldown = ability.currentCooldown > 0

    // Check resources
    const hasResources = player.resources.current >= ability.resourceCost

    // Determine availability
    const available = !onCooldown && hasResources
    let reason: string | undefined
    if (onCooldown) {
      reason = `On cooldown (${ability.currentCooldown} turns)`
    } else if (!hasResources) {
      reason = `Not enough ${ability.resourceType}`
    }

    // Map ability to utility type (if applicable)
    const utilityType = inferAbilityUtilityType(ability)

    if (utilityType) {
      capabilities.push({
        id: `ability_${ability.id}`,
        name: ability.name,
        description: ability.description,
        source: "ability",
        sourceId: ability.id,
        utilityType,
        targetType: mapAbilityTargetType(ability.targetType),
        available,
        reason,
        cost: {
          type: ability.resourceType,
          amount: ability.resourceCost,
        },
        category: "situational",
        tags: [ability.category],
      })
    }
  }

  return capabilities
}

/**
 * Infer utility type from ability name/tags
 */
function inferAbilityUtilityType(
  ability: Ability
): CapabilityUtilityType | undefined {
  const nameLower = ability.name.toLowerCase()

  // Trap-related abilities
  if (
    nameLower.includes("trap") ||
    nameLower.includes("detect") ||
    nameLower.includes("sense danger")
  ) {
    return "reveal_traps"
  }

  // Stealth/reveal abilities
  if (
    nameLower.includes("perception") ||
    nameLower.includes("keen eye") ||
    nameLower.includes("search")
  ) {
    return "reveal_secrets"
  }

  // Lockpicking abilities
  if (nameLower.includes("lockpick") || nameLower.includes("pick lock")) {
    return "unlock"
  }

  return undefined
}

function mapAbilityTargetType(
  abilityTarget: Ability["targetType"]
): PlayerCapability["targetType"] {
  switch (abilityTarget) {
    case "self":
      return "self"
    case "enemy":
    case "all_enemies":
    case "random":
      return "enemy"
    case "ally":
    case "all_allies":
      return "self"
    default:
      return "environment"
  }
}

// =============================================================================
// CAPABILITY MATCHING
// =============================================================================

/**
 * Match capabilities to a situation described by tags
 */
export function matchCapabilitiesToSituation(
  capabilities: PlayerCapability[],
  situationTags: string[]
): PlayerCapability[] {
  const matches: PlayerCapability[] = []
  const tagsLower = situationTags.map(t => t.toLowerCase())

  for (const cap of capabilities) {
    if (!cap.utilityType) continue

    // Match based on utility type and situation tags
    if (
      // Dark situations → light capabilities
      (tagsLower.some(t => t.includes("dark") || t.includes("unlit")) &&
        cap.utilityType === "light") ||
      // Locked situations → unlock capabilities
      (tagsLower.some(
        t => t.includes("locked") || t.includes("sealed") || t.includes("barred")
      ) &&
        cap.utilityType === "unlock") ||
      // Trapped/suspicious → reveal capabilities
      (tagsLower.some(
        t =>
          t.includes("trap") ||
          t.includes("suspicious") ||
          t.includes("danger")
      ) &&
        cap.utilityType === "reveal_traps") ||
      // Hidden → reveal secrets
      (tagsLower.some(
        t => t.includes("hidden") || t.includes("secret") || t.includes("concealed")
      ) &&
        cap.utilityType === "reveal_secrets") ||
      // Gaps/chasms → traverse
      (tagsLower.some(
        t =>
          t.includes("gap") ||
          t.includes("chasm") ||
          t.includes("pit") ||
          t.includes("climb")
      ) &&
        cap.utilityType === "traverse") ||
      // Magical barriers → dispel
      (tagsLower.some(
        t =>
          t.includes("magical") ||
          t.includes("enchanted") ||
          t.includes("barrier")
      ) &&
        cap.utilityType === "dispel") ||
      // Unknown items → identify
      (tagsLower.some(
        t =>
          t.includes("unknown") ||
          t.includes("unidentified") ||
          t.includes("mysterious")
      ) &&
        cap.utilityType === "identify") ||
      // Corpses/undead → related spells
      (tagsLower.some(
        t => t.includes("corpse") || t.includes("dead") || t.includes("body")
      ) &&
        cap.tags?.some(t => t.includes("necro") || t.includes("spirit")))
    ) {
      matches.push(cap)
    }
  }

  return matches
}

/**
 * Build AI context string for capabilities
 */
export function buildCapabilityContextForAI(
  capabilities: PlayerCapabilities
): string {
  const lines: string[] = []

  lines.push("PLAYER CAPABILITIES (non-combat):")
  lines.push(`- Utility types available: ${capabilities.utilityTypes.join(", ") || "none"}`)
  lines.push(`- Available now: ${capabilities.summary}`)

  // Light sources
  const lightCaps = capabilities.situational.filter(
    c => c.utilityType === "light" && c.available
  )
  if (lightCaps.length > 0) {
    lines.push(`- Light sources: ${lightCaps.map(c => c.name).join(", ")}`)
  }

  // Unlock capabilities
  const unlockCaps = capabilities.situational.filter(
    c => c.utilityType === "unlock" && c.available
  )
  if (unlockCaps.length > 0) {
    lines.push(`- Can unlock: ${unlockCaps.map(c => c.name).join(", ")}`)
  }

  // Traverse capabilities
  const traverseCaps = capabilities.situational.filter(
    c => c.utilityType === "traverse" && c.available
  )
  if (traverseCaps.length > 0) {
    lines.push(`- Can traverse: ${traverseCaps.map(c => c.name).join(", ")}`)
  }

  lines.push("")
  lines.push("CAPABILITY INTEGRATION GUIDANCE:")
  lines.push("Generate situations where player capabilities could help:")

  if (capabilities.utilityTypes.includes("light")) {
    lines.push('- "light" capability → dark areas, pits, obscured passages')
  }
  if (capabilities.utilityTypes.includes("unlock")) {
    lines.push('- "unlock" capability → locked doors, sealed chests, magical barriers')
  }
  if (
    capabilities.utilityTypes.includes("reveal_traps") ||
    capabilities.utilityTypes.includes("reveal_secrets")
  ) {
    lines.push('- "reveal" capabilities → suspicious areas, hidden compartments')
  }
  if (
    capabilities.utilityTypes.includes("transmute_gold") ||
    capabilities.utilityTypes.includes("transmute_item")
  ) {
    lines.push('- "transmute" → material puzzles, cursed objects, blocked paths')
  }

  return lines.join("\n")
}
