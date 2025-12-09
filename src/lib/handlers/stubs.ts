/**
 * Handler Stubs
 *
 * Develop new handler logic here in isolation before integrating into dungeon-game.tsx.
 * This file is for prototyping - logic tested here can be moved to the monolith.
 *
 * Pattern:
 * 1. Write pure function here
 * 2. Test with sample data
 * 3. Copy to dungeon-game.tsx wrapped in useCallback
 */

import type {
  GameState,
  Player,
  Enemy,
  Item,
  StatusEffect,
  Ability,
} from "../game-types"

// =============================================================================
// RESULT TYPES (for handler returns)
// =============================================================================

export interface HandlerResult<T = void> {
  success: boolean
  data?: T
  log?: string
  error?: string
}

export interface CombatResult {
  updatedPlayer: Player
  updatedEnemy: Enemy | null
  damage: number
  logs: string[]
  enemyDefeated: boolean
}

export interface EffectResult {
  player: Player
  appliedEffects: StatusEffect[]
  expiredEffects: StatusEffect[]
  tickDamage: number
  tickHeal: number
}

// =============================================================================
// STUB TEMPLATES
// =============================================================================

/**
 * Template for new combat handler
 *
 * AI HINT: Copy this pattern when adding new combat actions
 */
export function handleNewCombatAction(
  player: Player,
  enemy: Enemy,
  // Add params as needed
): CombatResult {
  // Calculate damage, effects, etc.
  const damage = 0
  const logs: string[] = []

  // Return updated state
  return {
    updatedPlayer: player,
    updatedEnemy: enemy,
    damage,
    logs,
    enemyDefeated: false,
  }
}

/**
 * Template for new item action
 *
 * AI HINT: Copy this pattern when adding new item interactions
 */
export function handleNewItemAction(
  player: Player,
  item: Item,
): HandlerResult<{ updatedPlayer: Player; consumed: boolean }> {
  // Validate item can be used
  if (!item) {
    return { success: false, error: "No item provided" }
  }

  // Apply item effect
  const updatedPlayer = { ...player }
  const consumed = false

  return {
    success: true,
    data: { updatedPlayer, consumed },
    log: `Used ${item.name}`,
  }
}

/**
 * Template for new ability
 *
 * AI HINT: Copy this pattern when adding new class abilities
 */
export function executeNewAbility(
  player: Player,
  ability: Ability,
  target: Enemy | null,
): HandlerResult<{
  damage: number
  healing: number
  effectsApplied: StatusEffect[]
}> {
  // Check resource cost
  if (player.resources.current < (ability.resourceCost || 0)) {
    return { success: false, error: "Not enough resource" }
  }

  // Check cooldown
  const cooldown = player.abilityCooldowns?.[ability.id] || 0
  if (cooldown > 0) {
    return { success: false, error: `On cooldown (${cooldown} turns)` }
  }

  // Execute ability logic
  const damage = ability.baseDamage || 0
  const healing = ability.baseHealing || 0
  const effectsApplied: StatusEffect[] = []

  return {
    success: true,
    data: { damage, healing, effectsApplied },
    log: ability.castNarration || `Used ${ability.name}`,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Safe state update helper
 *
 * AI HINT: Use this to avoid mutation bugs
 */
export function updatePlayerStats(
  player: Player,
  updates: Partial<Player["stats"]>
): Player {
  return {
    ...player,
    stats: {
      ...player.stats,
      ...updates,
    },
  }
}

/**
 * Add effect to player with stacking logic
 */
export function addEffectToPlayer(
  player: Player,
  effect: StatusEffect
): Player {
  const existingIndex = player.activeEffects.findIndex(
    (e) => e.name === effect.name
  )

  if (existingIndex >= 0 && effect.stacks) {
    // Stack existing effect
    const existing = player.activeEffects[existingIndex]
    const updated = {
      ...existing,
      stacks: (existing.stacks || 1) + 1,
      duration: Math.max(existing.duration, effect.duration),
    }
    return {
      ...player,
      activeEffects: [
        ...player.activeEffects.slice(0, existingIndex),
        updated,
        ...player.activeEffects.slice(existingIndex + 1),
      ],
    }
  }

  // Add new effect
  return {
    ...player,
    activeEffects: [...player.activeEffects, effect],
  }
}
