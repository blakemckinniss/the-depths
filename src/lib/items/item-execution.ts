/**
 * Item Execution System
 *
 * Bridges the gap between item data and game state changes.
 * Resolves item mechanics from multiple sources:
 * 1. Structured effects[] array
 * 2. Item stats (health, attack, defense)
 * 3. Template lookup from consumable-system
 * 4. Special effect strings in useText
 */

import type { Item, GameState, StatusEffect, DamageType } from "@/lib/core/game-types"
import type { GameAction } from "@/contexts/game-reducer"
import {
  getConsumableTemplate,
  isConsumable,
  type ConsumableSubtype,
} from "./consumable-system"
import { createStatusEffect } from "@/lib/entity/entity-system"

// =============================================================================
// TYPES
// =============================================================================

export interface ItemUseResult {
  success: boolean
  actions: GameAction[]
  narration: string
  effectsApplied: StatusEffect[]
  consumed: boolean
  targetType: "self" | "enemy" | "ground"
}

interface ResolvedMechanics {
  healing?: number
  manaRestore?: number
  damage?: number
  damageType?: DamageType
  statusEffect?: StatusEffect | (() => StatusEffect)
  special?: string
  targetType: "self" | "enemy" | "ground"
}

// =============================================================================
// MECHANIC RESOLUTION
// =============================================================================

/**
 * Resolve item mechanics from multiple sources.
 * Priority: effects[] > stats > template lookup > useText
 */
function resolveItemMechanics(item: Item): ResolvedMechanics | null {
  // 1. Check structured effects array
  if (item.effects && item.effects.length > 0) {
    const effect = item.effects[0]
    return {
      statusEffect: effect,
      targetType: effect.effectType === "debuff" ? "enemy" : "self",
    }
  }

  // 2. Check stats-based mechanics
  if (item.stats?.health && item.stats.health > 0) {
    return {
      healing: item.stats.health,
      targetType: "self",
    }
  }

  // 3. Try template lookup by subtype
  if (item.subtype) {
    const template = getConsumableTemplate(item.subtype as ConsumableSubtype)
    if (template) {
      // Find tier matching item rarity
      const tier =
        template.tiers.find((t) => t.rarity === item.rarity) || template.tiers[0]
      return {
        healing: tier.effect.healing,
        manaRestore: tier.effect.manaRestore,
        damage: tier.effect.damage,
        damageType: tier.effect.damageType,
        statusEffect: tier.effect.statusEffect,
        special: tier.effect.special,
        targetType: template.targetType,
      }
    }
  }

  // 4. Check for throwable damage items
  if (item.stats?.attack && item.stats.attack > 0 && item.damageType) {
    return {
      damage: item.stats.attack,
      damageType: item.damageType,
      targetType: "enemy",
    }
  }

  // 5. Check special effect from useText
  if (item.useText && SPECIAL_EFFECTS.has(item.useText)) {
    return {
      special: item.useText,
      targetType: "self",
    }
  }

  // 6. Fallback: if it's a potion type, assume minor healing
  if (item.type === "potion" || item.category === "consumable") {
    return {
      healing: 15, // Minor healing fallback
      targetType: "self",
    }
  }

  return null
}

// =============================================================================
// SPECIAL EFFECTS
// =============================================================================

const SPECIAL_EFFECTS = new Set([
  "cure_poison",
  "cure_all_debuffs",
  "flee_bonus_50",
  "guaranteed_flee",
  "auto_revive_50",
  "auto_revive_100",
  "escape_dungeon",
  "reveal_treasure",
  "reveal_vault",
  "skip_floor",
  "soul_power",
  "soul_power_major",
  "blank",
])

function handleSpecialEffect(
  special: string,
  gameState: GameState
): { actions: GameAction[]; narration: string; success: boolean } {
  const actions: GameAction[] = []
  let narration = ""
  let success = false

  switch (special) {
    case "cure_poison": {
      const poisonEffects = gameState.player.activeEffects
        .filter(
          (e) =>
            e.name.toLowerCase().includes("poison") ||
            e.name.toLowerCase().includes("toxic")
        )
        .map((e) => e.id)
      for (const id of poisonEffects) {
        actions.push({ type: "REMOVE_EFFECT", payload: id })
      }
      narration =
        poisonEffects.length > 0 ? "Poison cleansed!" : "No poison to cure."
      success = poisonEffects.length > 0
      break
    }

    case "cure_all_debuffs": {
      const debuffs = gameState.player.activeEffects
        .filter((e) => e.effectType === "debuff")
        .map((e) => e.id)
      for (const id of debuffs) {
        actions.push({ type: "REMOVE_EFFECT", payload: id })
      }
      narration =
        debuffs.length > 0
          ? `Cleansed ${debuffs.length} ailment${debuffs.length > 1 ? "s" : ""}!`
          : "No ailments to cure."
      success = debuffs.length > 0
      break
    }

    case "flee_bonus_50": {
      actions.push({
        type: "ADD_EFFECT",
        payload: createStatusEffect({
          name: "Smoke Cover",
          effectType: "buff",
          duration: 1,
          description: "+50% flee chance",
          sourceType: "item",
        }),
      })
      narration = "Smoke billows around you, concealing your escape."
      success = true
      break
    }

    case "guaranteed_flee": {
      actions.push({
        type: "ADD_EFFECT",
        payload: createStatusEffect({
          name: "Perfect Escape",
          effectType: "buff",
          duration: 1,
          description: "Guaranteed escape on next flee attempt",
          sourceType: "item",
        }),
      })
      narration = "Dense smoke fills the area. Escape is certain."
      success = true
      break
    }

    case "auto_revive_50":
    case "auto_revive_100": {
      const revivePercent = special === "auto_revive_100" ? 100 : 50
      actions.push({
        type: "ADD_EFFECT",
        payload: createStatusEffect({
          name: "Soul Anchor",
          effectType: "buff",
          duration: -1, // Permanent until triggered
          description: `Auto-revive at ${revivePercent}% HP on death`,
          sourceType: "item",
        }),
      })
      narration = "A protective aura binds your soul to this realm."
      success = true
      break
    }

    case "escape_dungeon": {
      // This requires special handling in game flow
      actions.push({ type: "SET_PHASE", payload: "tavern" })
      actions.push({ type: "CLEAR_DUNGEON" })
      narration = "The rope yanks you back to safety!"
      success = true
      break
    }

    case "reveal_treasure":
    case "reveal_vault": {
      // These would need path system integration
      narration =
        "The map reveals hidden paths... (treasure discovery not yet implemented)"
      success = false
      break
    }

    case "skip_floor": {
      // This requires special handling
      narration = "A teleportation spell... (floor skip not yet implemented)"
      success = false
      break
    }

    case "soul_power":
    case "soul_power_major": {
      // Grant temporary damage boost
      const boost = special === "soul_power_major" ? 8 : 4
      actions.push({
        type: "ADD_EFFECT",
        payload: createStatusEffect({
          name: "Soul Surge",
          effectType: "buff",
          duration: 3,
          modifiers: { attack: boost },
          description: `Dark power courses through you. +${boost} attack.`,
          sourceType: "item",
        }),
      })
      narration = "Dark energy suffuses your being."
      success = true
      break
    }

    case "blank":
      narration = "The blank scroll crumbles to dust."
      success = true // Still consumed
      break

    default:
      narration = `Unknown effect: ${special}`
      success = false
  }

  return { actions, narration, success }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Execute item use and return game state changes.
 *
 * @param item - The item being used
 * @param gameState - Current game state (for context)
 * @returns ItemUseResult with actions to dispatch
 */
export function executeItemUse(item: Item, gameState: GameState): ItemUseResult {
  const result: ItemUseResult = {
    success: false,
    actions: [],
    narration: "",
    effectsApplied: [],
    consumed: true,
    targetType: "self",
  }

  // Resolve mechanics
  const mechanics = resolveItemMechanics(item)
  if (!mechanics) {
    result.narration = `${item.name} has no usable effect.`
    result.consumed = false
    return result
  }

  result.targetType = mechanics.targetType

  // Check if targeting makes sense
  if (mechanics.targetType === "enemy" && !gameState.currentEnemy) {
    result.narration = `${item.name} requires an enemy target.`
    result.consumed = false
    return result
  }

  // Apply healing
  if (mechanics.healing && mechanics.healing > 0) {
    const currentHealth = gameState.player.stats.health
    const maxHealth = gameState.player.stats.maxHealth
    const healAmount = Math.min(mechanics.healing, maxHealth - currentHealth)

    if (healAmount > 0) {
      result.actions.push({ type: "MODIFY_PLAYER_HEALTH", payload: healAmount })
      result.narration += `Restored ${healAmount} health. `
      result.success = true
    } else {
      result.narration += "Already at full health. "
    }
  }

  // Apply mana restore (using resources.current)
  if (mechanics.manaRestore && mechanics.manaRestore > 0) {
    // Note: Would need MODIFY_PLAYER_RESOURCE action if mana exists
    result.narration += `Restored ${mechanics.manaRestore} energy. `
    result.success = true
  }

  // Apply damage to enemy
  if (mechanics.damage && mechanics.damage > 0 && gameState.currentEnemy) {
    result.actions.push({ type: "DAMAGE_ENEMY", payload: mechanics.damage })
    const typeStr = mechanics.damageType ? ` ${mechanics.damageType}` : ""
    result.narration += `Dealt ${mechanics.damage}${typeStr} damage! `
    result.success = true
  }

  // Apply status effect
  if (mechanics.statusEffect) {
    const effect =
      typeof mechanics.statusEffect === "function"
        ? mechanics.statusEffect()
        : mechanics.statusEffect

    if (mechanics.targetType === "enemy" && gameState.currentEnemy) {
      // Apply debuff to enemy - store in enemy effects
      // Note: Would need UPDATE_ENEMY action to add effect
      result.narration += `Applied ${effect.name} to enemy. `
      result.success = true
    } else {
      // Apply buff/debuff to player
      result.actions.push({ type: "ADD_EFFECT", payload: effect })
      result.effectsApplied.push(effect)
      result.narration += `Gained ${effect.name}. `
      result.success = true
    }
  }

  // Handle special effects
  if (mechanics.special) {
    const specialResult = handleSpecialEffect(mechanics.special, gameState)
    result.actions.push(...specialResult.actions)
    result.narration += specialResult.narration
    result.success = result.success || specialResult.success
  }

  // Remove item from inventory if consumed and successful
  if (result.success && result.consumed) {
    result.actions.push({ type: "REMOVE_ITEM", payload: item.id })
  }

  // Clean up narration
  result.narration = result.narration.trim()
  if (!result.narration) {
    result.narration = result.success ? `Used ${item.name}.` : `${item.name} had no effect.`
  }

  return result
}

/**
 * Check if an item can be used (has usable mechanics)
 */
export function canUseItem(item: Item): boolean {
  if (!isConsumable(item) && item.type !== "potion") {
    return false
  }
  const mechanics = resolveItemMechanics(item)
  return mechanics !== null
}

/**
 * Get use description for an item
 */
export function getItemUseDescription(item: Item): string {
  const mechanics = resolveItemMechanics(item)
  if (!mechanics) return "Cannot be used"

  const parts: string[] = []

  if (mechanics.healing) parts.push(`Heal ${mechanics.healing} HP`)
  if (mechanics.manaRestore) parts.push(`Restore ${mechanics.manaRestore} energy`)
  if (mechanics.damage) {
    const type = mechanics.damageType ? ` ${mechanics.damageType}` : ""
    parts.push(`Deal ${mechanics.damage}${type} damage`)
  }
  if (mechanics.statusEffect) {
    const effect =
      typeof mechanics.statusEffect === "function"
        ? mechanics.statusEffect()
        : mechanics.statusEffect
    parts.push(`Apply ${effect.name}`)
  }
  if (mechanics.special) {
    parts.push(mechanics.special.replace(/_/g, " "))
  }

  return parts.length > 0 ? parts.join(", ") : item.useText || "Use"
}
