/**
 * Foresight System - Calculate what outcomes players can see based on their abilities
 *
 * Foresight is EARNED through gameplay:
 * - High skills grant passive visibility
 * - Racial abilities (Elf Keen Senses) grant specific visibility
 * - Class abilities grant temporary visibility
 * - Status effects grant temporary visibility
 * - Items grant passive or temporary visibility
 */

import type { Player, SkillType } from "@/lib/core/game-types"
import type { ForesightLevel, ForesightSource, ForesightResult } from "@/lib/core/game-types"
import {
  SKILL_FORESIGHT,
  RACIAL_FORESIGHT,
  ABILITY_FORESIGHT,
  EFFECT_FORESIGHT,
  ITEM_FORESIGHT,
  type ChoiceContext,
  type EntityImpact,
  getPossibleImpacts,
} from "@/lib/mechanics/game-mechanics-ledger"
import { getSkillModifier } from "@/lib/combat/skill-check"

// Foresight level priority (higher index = more information)
const FORESIGHT_PRIORITY: ForesightLevel[] = ["hidden", "risk", "type", "partial", "full"]

function getForesightPriority(level: ForesightLevel): number {
  return FORESIGHT_PRIORITY.indexOf(level)
}

function higherForesight(a: ForesightLevel, b: ForesightLevel): ForesightLevel {
  return getForesightPriority(a) >= getForesightPriority(b) ? a : b
}

interface ForesightCheck {
  level: ForesightLevel
  source: ForesightSource
  sourceName: string
  narrative: string
}

/**
 * Check skill-based passive foresight
 */
function checkSkillForesight(
  player: Player,
  context: ChoiceContext,
  entityTags: string[]
): ForesightCheck | null {
  for (const [skillName, config] of Object.entries(SKILL_FORESIGHT)) {
    // Check if this skill applies to this context
    if (!config.appliesTo.includes(context)) continue

    // Check tag filter if present (e.g., arcana only for magical entities)
    const tagFilter = "tagFilter" in config ? config.tagFilter : undefined
    if (tagFilter && !tagFilter.some((tag: string) => entityTags.includes(tag))) {
      continue
    }

    // Get player's skill value via the skill check system
    const skillValue = getSkillModifier(player, skillName as SkillType) + 10 // Convert modifier to effective value

    // Check against thresholds (highest first)
    if (skillValue >= config.thresholds.full) {
      return { level: "full", source: skillName as ForesightSource, sourceName: skillName, narrative: config.narrative }
    }
    if (skillValue >= config.thresholds.partial) {
      return { level: "partial", source: skillName as ForesightSource, sourceName: skillName, narrative: config.narrative }
    }
    if (skillValue >= config.thresholds.type) {
      return { level: "type", source: skillName as ForesightSource, sourceName: skillName, narrative: config.narrative }
    }
    if (skillValue >= config.thresholds.risk) {
      return { level: "risk", source: skillName as ForesightSource, sourceName: skillName, narrative: config.narrative }
    }
  }
  return null
}

/**
 * Check racial passive foresight (e.g., Elf Keen Senses)
 */
function checkRacialForesight(player: Player, context: ChoiceContext): ForesightCheck | null {
  for (const [abilityName, config] of Object.entries(RACIAL_FORESIGHT)) {
    // Check if player has this race (config.race is display name, player.race is lowercase id)
    const raceMatch = player.race?.toLowerCase() === config.race.toLowerCase()
    if (!raceMatch) continue

    // Check if this ability applies to this context
    if (!config.appliesTo.includes(context)) continue

    return {
      level: config.revealLevel,
      source: "racial",
      sourceName: abilityName,
      narrative: config.narrative,
    }
  }
  return null
}

/**
 * Check active ability foresight effects
 */
function checkAbilityForesight(
  player: Player,
  context: ChoiceContext,
  entityTags: string[]
): ForesightCheck | null {
  // Check if player has any active foresight ability effects
  for (const effect of player.activeEffects || []) {
    const abilityConfig = ABILITY_FORESIGHT[effect.name as keyof typeof ABILITY_FORESIGHT]
    if (!abilityConfig) continue

    // Check if this ability applies to this context
    if (!abilityConfig.appliesTo.includes(context)) continue

    // Check tag filter if present
    const tagFilter = "tagFilter" in abilityConfig ? abilityConfig.tagFilter : undefined
    if (tagFilter && !tagFilter.some((tag: string) => entityTags.includes(tag))) {
      continue
    }

    return {
      level: abilityConfig.revealLevel,
      source: "ability",
      sourceName: effect.name,
      narrative: abilityConfig.narrative,
    }
  }
  return null
}

/**
 * Check status effect foresight
 */
function checkEffectForesight(player: Player, context: ChoiceContext): ForesightCheck | null {
  for (const effect of player.activeEffects || []) {
    const effectConfig = EFFECT_FORESIGHT[effect.name as keyof typeof EFFECT_FORESIGHT]
    if (!effectConfig) continue

    // Check if this effect applies to this context (or "all")
    if (effectConfig.appliesTo !== "all" && !effectConfig.appliesTo.includes(context)) {
      continue
    }

    return {
      level: effectConfig.revealLevel,
      source: "effect",
      sourceName: effect.name,
      narrative: effectConfig.narrative,
    }
  }
  return null
}

/**
 * Check item-based foresight (equipped items with passive foresight)
 */
function checkItemForesight(player: Player, context: ChoiceContext): ForesightCheck | null {
  // Check all equipped items
  const equippedItems = [
    player.equipment.weapon,
    player.equipment.armor,
    player.equipment.amulet,
    player.equipment.offHand,
  ].filter(Boolean)

  for (const item of equippedItems) {
    if (!item) continue
    const itemConfig = ITEM_FORESIGHT[item.name as keyof typeof ITEM_FORESIGHT]
    if (!itemConfig) continue
    if (itemConfig.type !== "equipment") continue
    if (!itemConfig.passive) continue

    // Check if this item applies to this context
    if (!itemConfig.appliesTo.includes(context)) continue

    return {
      level: itemConfig.revealLevel,
      source: "item",
      sourceName: item.name,
      narrative: itemConfig.narrative,
    }
  }
  return null
}

/**
 * Filter impacts based on foresight level
 */
function filterImpactsByLevel(impacts: EntityImpact[], level: ForesightLevel): EntityImpact[] {
  switch (level) {
    case "hidden":
      return []
    case "risk":
      // Only show if dangerous impacts exist (but not which ones)
      return []
    case "type":
      // Show impact categories (damage, buff, etc.) but not specifics
      return impacts.slice(0, 2) // Limited reveal
    case "partial":
      // Show most impacts but not exact values
      return impacts.slice(0, 4)
    case "full":
      // Show all impacts
      return impacts
  }
}

/**
 * Generate outcome hint based on foresight level and impacts
 */
function generateOutcomeHint(
  level: ForesightLevel,
  impacts: EntityImpact[],
  narrative: string
): string | undefined {
  if (level === "hidden") return undefined

  const dangerousImpacts = ["damage_player", "apply_debuff", "trigger_trap", "spawn_enemy"]
  const beneficialImpacts = ["heal_player", "apply_buff", "grant_item", "grant_gold", "grant_xp"]

  const hasDanger = impacts.some((i) => dangerousImpacts.includes(i))
  const hasBenefit = impacts.some((i) => beneficialImpacts.includes(i))

  switch (level) {
    case "risk":
      if (hasDanger && hasBenefit) return `${narrative} mixed outcomes...`
      if (hasDanger) return `${narrative} danger ahead...`
      if (hasBenefit) return `${narrative} something promising...`
      return `${narrative} uncertainty...`

    case "type":
      const types: string[] = []
      if (impacts.some((i) => i.includes("damage"))) types.push("damage")
      if (impacts.some((i) => i.includes("heal"))) types.push("healing")
      if (impacts.some((i) => i.includes("buff"))) types.push("enhancement")
      if (impacts.some((i) => i.includes("debuff"))) types.push("hindrance")
      if (impacts.some((i) => i.includes("item") || i.includes("gold"))) types.push("treasure")
      return `${narrative} ${types.join(", ")} possible`

    case "partial":
      return `${narrative}: ${impacts.slice(0, 3).join(", ")}...`

    case "full":
      return `${narrative}: ${impacts.join(", ")}`
  }
}

/**
 * Determine risk level from impacts
 */
function determineRiskLevel(impacts: EntityImpact[]): "safe" | "risky" | "dangerous" {
  const dangerousImpacts = ["damage_player", "trigger_trap", "spawn_enemy"]
  const riskyImpacts = ["apply_debuff", "consume_item", "modify_stat"]

  const dangerCount = impacts.filter((i) => dangerousImpacts.includes(i)).length
  const riskyCount = impacts.filter((i) => riskyImpacts.includes(i)).length

  if (dangerCount >= 2) return "dangerous"
  if (dangerCount >= 1 || riskyCount >= 2) return "risky"
  return "safe"
}

/**
 * Main foresight calculation function
 *
 * Checks all foresight sources and returns the highest level available to the player
 */
export function calculateForesight(
  player: Player,
  context: ChoiceContext,
  action: string,
  entityTags: string[]
): ForesightResult {
  // Get possible impacts for this action/entity combination
  const possibleImpacts = getPossibleImpacts(action, entityTags)

  // Default: hidden
  let bestCheck: ForesightCheck = {
    level: "hidden",
    source: "perception",
    sourceName: "",
    narrative: "",
  }

  // Check all foresight sources, keep the highest
  const checks = [
    checkEffectForesight(player, context), // Effects have highest priority (active choice)
    checkAbilityForesight(player, context, entityTags), // Then abilities
    checkItemForesight(player, context), // Then items
    checkRacialForesight(player, context), // Then racial
    checkSkillForesight(player, context, entityTags), // Then skills (passive)
  ]

  for (const check of checks) {
    if (check && getForesightPriority(check.level) > getForesightPriority(bestCheck.level)) {
      bestCheck = check
    }
  }

  // Build result
  const result: ForesightResult = {
    level: bestCheck.level,
    source: bestCheck.source,
    sourceName: bestCheck.sourceName || undefined,
  }

  // Add revealed impacts based on level
  if (bestCheck.level !== "hidden") {
    result.revealedImpacts = filterImpactsByLevel(possibleImpacts, bestCheck.level)
    result.outcomeHint = generateOutcomeHint(bestCheck.level, possibleImpacts, bestCheck.narrative)
  }

  // Add risk level for 'risk' and above
  if (getForesightPriority(bestCheck.level) >= getForesightPriority("risk")) {
    result.riskLevel = determineRiskLevel(possibleImpacts)
  }

  return result
}

/**
 * Quick check if player has ANY foresight for a context
 */
export function hasForesight(player: Player, context: ChoiceContext): boolean {
  const result = calculateForesight(player, context, "examine", [])
  return result.level !== "hidden"
}

/**
 * Get all active foresight sources for a player
 */
export function getActiveForesightSources(player: Player): Array<{
  source: ForesightSource
  name: string
  appliesTo: ChoiceContext[] | "all"
}> {
  const sources: Array<{
    source: ForesightSource
    name: string
    appliesTo: ChoiceContext[] | "all"
  }> = []

  // Check racial
  for (const [name, config] of Object.entries(RACIAL_FORESIGHT)) {
    const raceMatch = player.race?.toLowerCase() === config.race.toLowerCase()
    if (raceMatch) {
      sources.push({ source: "racial", name, appliesTo: config.appliesTo })
    }
  }

  // Check effects
  for (const effect of player.activeEffects || []) {
    const config = EFFECT_FORESIGHT[effect.name as keyof typeof EFFECT_FORESIGHT]
    if (config) {
      sources.push({ source: "effect", name: effect.name, appliesTo: config.appliesTo })
    }
  }

  // Check items
  const equippedItems = [
    player.equipment.weapon,
    player.equipment.armor,
    player.equipment.amulet,
    player.equipment.offHand,
  ].filter(Boolean)

  for (const item of equippedItems) {
    if (!item) continue
    const config = ITEM_FORESIGHT[item.name as keyof typeof ITEM_FORESIGHT]
    if (config?.type === "equipment" && config.passive) {
      sources.push({ source: "item", name: item.name, appliesTo: config.appliesTo })
    }
  }

  return sources
}
