/**
 * Effect Executor - The Kernel
 *
 * This is the single point of truth for all game state mutations.
 * All effects flow through here, get validated, and produce a new GameState.
 *
 * Design principles:
 * 1. Pure function: (GameState, Effect[]) => GameState
 * 2. All validation happens here - invalid effects are logged and skipped
 * 3. Invariants are enforced (health clamping, inventory limits, etc.)
 * 4. Each effect execution is logged for replay/debugging
 */

import type { GameState, StatusEffect } from "@/lib/core/game-types"
import type {
  Effect,
  DamageEffect,
  HealEffect,
  ModifyGoldEffect,
  AddItemEffect,
  RemoveItemEffect,
  ApplyStatusEffect,
  RemoveStatusEffect,
  DamageEnemyEffect,
  EndCombatEffect,
  SetStanceEffect,
  NarrativeEffect,
  ModifyExperienceEffect,
  CompositeEffect,
} from "./effect-types"
import { generateId } from "@/lib/core/utils"

// =============================================================================
// CONFIGURATION
// =============================================================================

const EXECUTOR_CONFIG = {
  // Hard caps to prevent AI from breaking the game
  maxDamagePerEffect: 9999,
  maxHealPerEffect: 9999,
  maxGoldChange: 99999,
  maxInventorySize: 50,
  minHealth: 0,

  // Logging
  logEffects: true,
  logValidationErrors: true,
} as const

// =============================================================================
// EXECUTION RESULT
// =============================================================================

export interface ExecutionResult {
  state: GameState
  applied: Effect[]
  skipped: Array<{ effect: Effect; reason: string }>
  narratives: string[]
  logs: EffectLog[]
}

export interface EffectLog {
  timestamp: number
  effectType: string
  target?: string
  before?: unknown
  after?: unknown
  skipped?: boolean
  reason?: string
}

// =============================================================================
// MAIN EXECUTOR
// =============================================================================

/**
 * Execute a list of effects against the game state.
 * Returns the new state plus metadata about what happened.
 */
export function executeEffects(
  state: GameState,
  effects: Effect[],
): ExecutionResult {
  const result: ExecutionResult = {
    state: { ...state },
    applied: [],
    skipped: [],
    narratives: [],
    logs: [],
  }

  for (const effect of effects) {
    // Handle composite effects by flattening
    if (effect.effectType === "composite") {
      const compositeResult = executeEffects(result.state, (effect as CompositeEffect).effects)
      result.state = compositeResult.state
      result.applied.push(...compositeResult.applied)
      result.skipped.push(...compositeResult.skipped)
      result.narratives.push(...compositeResult.narratives)
      result.logs.push(...compositeResult.logs)
      continue
    }

    // Validate and execute single effect
    const validation = validateEffect(result.state, effect)
    if (!validation.valid) {
      result.skipped.push({ effect, reason: validation.reason })
      result.logs.push({
        timestamp: Date.now(),
        effectType: effect.effectType,
        skipped: true,
        reason: validation.reason,
      })
      continue
    }

    // Execute the effect
    const { newState, log } = executeSingleEffect(result.state, effect)
    result.state = newState
    result.applied.push(effect)
    result.logs.push(log)

    // Collect narratives
    if (effect.effectType === "narrative") {
      result.narratives.push((effect as NarrativeEffect).text)
    }
  }

  return result
}

// =============================================================================
// VALIDATION
// =============================================================================

interface ValidationResult {
  valid: boolean
  reason: string
}

function validateEffect(state: GameState, effect: Effect): ValidationResult {
  switch (effect.effectType) {
    case "damage": {
      const e = effect as DamageEffect
      if (e.amount < 0) return { valid: false, reason: "Negative damage" }
      if (e.amount > EXECUTOR_CONFIG.maxDamagePerEffect) {
        return { valid: false, reason: `Damage ${e.amount} exceeds cap ${EXECUTOR_CONFIG.maxDamagePerEffect}` }
      }
      if (e.target.type === "enemy" && !state.currentEnemy) {
        return { valid: false, reason: "No enemy in combat" }
      }
      return { valid: true, reason: "" }
    }

    case "heal": {
      const e = effect as HealEffect
      if (e.amount < 0) return { valid: false, reason: "Negative heal" }
      if (e.amount > EXECUTOR_CONFIG.maxHealPerEffect) {
        return { valid: false, reason: `Heal ${e.amount} exceeds cap` }
      }
      return { valid: true, reason: "" }
    }

    case "modify_gold": {
      const e = effect as ModifyGoldEffect
      if (Math.abs(e.amount) > EXECUTOR_CONFIG.maxGoldChange) {
        return { valid: false, reason: "Gold change exceeds cap" }
      }
      if (e.amount < 0 && state.player.stats.gold + e.amount < 0) {
        return { valid: false, reason: "Insufficient gold" }
      }
      return { valid: true, reason: "" }
    }

    case "add_item": {
      if (state.player.inventory.length >= EXECUTOR_CONFIG.maxInventorySize) {
        return { valid: false, reason: "Inventory full" }
      }
      return { valid: true, reason: "" }
    }

    case "remove_item": {
      const e = effect as RemoveItemEffect
      const hasItem = state.player.inventory.some(i => i.id === e.itemId)
      if (!hasItem) {
        return { valid: false, reason: `Item ${e.itemId} not in inventory` }
      }
      return { valid: true, reason: "" }
    }

    case "damage_enemy": {
      if (!state.currentEnemy) {
        return { valid: false, reason: "No enemy in combat" }
      }
      return { valid: true, reason: "" }
    }

    case "end_combat": {
      if (!state.inCombat) {
        return { valid: false, reason: "Not in combat" }
      }
      return { valid: true, reason: "" }
    }

    // Explicitly handled types that don't need additional validation
    case "narrative":
    case "set_stance":
    case "apply_status":
    case "remove_status":
    case "modify_experience":
      return { valid: true, reason: "" }

    default:
      // Unknown effect types are INVALID - fail visibly (NO FALLBACKS philosophy)
      return { valid: false, reason: `Unknown effect type: ${effect.effectType}` }
  }
}

// =============================================================================
// SINGLE EFFECT EXECUTION
// =============================================================================

interface SingleEffectResult {
  newState: GameState
  log: EffectLog
}

function executeSingleEffect(state: GameState, effect: Effect): SingleEffectResult {
  const log: EffectLog = {
    timestamp: Date.now(),
    effectType: effect.effectType,
  }

  switch (effect.effectType) {
    case "damage":
      return executeDamage(state, effect as DamageEffect, log)

    case "heal":
      return executeHeal(state, effect as HealEffect, log)

    case "modify_gold":
      return executeModifyGold(state, effect as ModifyGoldEffect, log)

    case "modify_experience":
      return executeModifyExperience(state, effect as ModifyExperienceEffect, log)

    case "add_item":
      return executeAddItem(state, effect as AddItemEffect, log)

    case "remove_item":
      return executeRemoveItem(state, effect as RemoveItemEffect, log)

    case "apply_status":
      return executeApplyStatus(state, effect as ApplyStatusEffect, log)

    case "remove_status":
      return executeRemoveStatus(state, effect as RemoveStatusEffect, log)

    case "damage_enemy":
      return executeDamageEnemy(state, effect as DamageEnemyEffect, log)

    case "end_combat":
      return executeEndCombat(state, effect as EndCombatEffect, log)

    case "set_stance":
      return executeSetStance(state, effect as SetStanceEffect, log)

    case "narrative":
      // Narrative effects don't modify state
      return { newState: state, log }

    default:
      // Unknown effect type - pass through unchanged
      console.warn(`Unknown effect type: ${effect.effectType}`)
      return { newState: state, log }
  }
}

// =============================================================================
// EFFECT HANDLERS
// =============================================================================

function executeDamage(
  state: GameState,
  effect: DamageEffect,
  log: EffectLog,
): SingleEffectResult {
  const { target, amount, canKill = true } = effect
  log.target = target.type

  if (target.type === "player") {
    const currentHealth = state.player.stats.health
    const minHealth = canKill ? EXECUTOR_CONFIG.minHealth : 1
    const newHealth = Math.max(minHealth, currentHealth - amount)

    log.before = currentHealth
    log.after = newHealth

    return {
      newState: {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            health: newHealth,
          },
        },
      },
      log,
    }
  }

  if (target.type === "enemy" && state.currentEnemy) {
    const currentHealth = state.currentEnemy.health
    const newHealth = Math.max(0, currentHealth - amount)

    log.before = currentHealth
    log.after = newHealth

    return {
      newState: {
        ...state,
        currentEnemy: {
          ...state.currentEnemy,
          health: newHealth,
        },
      },
      log,
    }
  }

  if (target.type === "companion") {
    const companionIndex = state.player.party.active.findIndex(
      c => c.id === target.id,
    )
    if (companionIndex === -1) {
      return { newState: state, log }
    }

    const companion = state.player.party.active[companionIndex]
    const newHealth = Math.max(0, companion.stats.health - amount)
    const newActive = [...state.player.party.active]
    newActive[companionIndex] = {
      ...companion,
      stats: { ...companion.stats, health: newHealth },
      alive: newHealth > 0,
    }

    log.before = companion.stats.health
    log.after = newHealth

    return {
      newState: {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            active: newActive,
          },
        },
      },
      log,
    }
  }

  return { newState: state, log }
}

function executeHeal(
  state: GameState,
  effect: HealEffect,
  log: EffectLog,
): SingleEffectResult {
  const { target, amount, canOverheal = false } = effect
  log.target = target.type

  if (target.type === "player") {
    const currentHealth = state.player.stats.health
    const maxHealth = state.player.stats.maxHealth
    const cap = canOverheal ? maxHealth * 1.5 : maxHealth
    const newHealth = Math.min(cap, currentHealth + amount)

    log.before = currentHealth
    log.after = newHealth

    return {
      newState: {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            health: newHealth,
          },
        },
      },
      log,
    }
  }

  return { newState: state, log }
}

function executeModifyGold(
  state: GameState,
  effect: ModifyGoldEffect,
  log: EffectLog,
): SingleEffectResult {
  const currentGold = state.player.stats.gold
  const newGold = Math.max(0, currentGold + effect.amount)

  log.before = currentGold
  log.after = newGold

  return {
    newState: {
      ...state,
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          gold: newGold,
        },
      },
    },
    log,
  }
}

function executeModifyExperience(
  state: GameState,
  effect: ModifyExperienceEffect,
  log: EffectLog,
): SingleEffectResult {
  const currentExp = state.player.stats.experience
  const newExp = Math.max(0, currentExp + effect.amount)

  log.before = currentExp
  log.after = newExp

  return {
    newState: {
      ...state,
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          experience: newExp,
        },
      },
    },
    log,
  }
}

function executeAddItem(
  state: GameState,
  effect: AddItemEffect,
  log: EffectLog,
): SingleEffectResult {
  const item = {
    ...effect.item,
    id: effect.item.id || generateId(),
  }

  log.after = item.name

  return {
    newState: {
      ...state,
      player: {
        ...state.player,
        inventory: [...state.player.inventory, item],
      },
    },
    log,
  }
}

function executeRemoveItem(
  state: GameState,
  effect: RemoveItemEffect,
  log: EffectLog,
): SingleEffectResult {
  const item = state.player.inventory.find(i => i.id === effect.itemId)
  log.before = item?.name

  return {
    newState: {
      ...state,
      player: {
        ...state.player,
        inventory: state.player.inventory.filter(i => i.id !== effect.itemId),
      },
    },
    log,
  }
}

function executeApplyStatus(
  state: GameState,
  effect: ApplyStatusEffect,
  log: EffectLog,
): SingleEffectResult {
  const { target, status } = effect
  const statusWithId: StatusEffect = {
    ...status,
    id: status.id || generateId(),
  }

  log.target = target.type
  log.after = status.name

  if (target.type === "player") {
    // Check for existing status to stack/refresh
    const existingIndex = state.player.activeEffects.findIndex(
      e => e.name === status.name,
    )

    let newEffects: StatusEffect[]
    if (existingIndex >= 0) {
      // Refresh duration or stack
      const existing = state.player.activeEffects[existingIndex]
      const updated = {
        ...existing,
        duration: Math.max(existing.duration, status.duration),
        stacks: (existing.stacks || 1) + 1,
      }
      newEffects = [...state.player.activeEffects]
      newEffects[existingIndex] = updated
    } else {
      newEffects = [...state.player.activeEffects, statusWithId]
    }

    return {
      newState: {
        ...state,
        player: {
          ...state.player,
          activeEffects: newEffects,
        },
      },
      log,
    }
  }

  return { newState: state, log }
}

function executeRemoveStatus(
  state: GameState,
  effect: RemoveStatusEffect,
  log: EffectLog,
): SingleEffectResult {
  const { target, statusId } = effect
  log.target = target.type

  if (target.type === "player") {
    const removed = state.player.activeEffects.find(e => e.id === statusId)
    log.before = removed?.name

    return {
      newState: {
        ...state,
        player: {
          ...state.player,
          activeEffects: state.player.activeEffects.filter(
            e => e.id !== statusId,
          ),
        },
      },
      log,
    }
  }

  return { newState: state, log }
}

function executeDamageEnemy(
  state: GameState,
  effect: DamageEnemyEffect,
  log: EffectLog,
): SingleEffectResult {
  if (!state.currentEnemy) {
    return { newState: state, log }
  }

  const currentHealth = state.currentEnemy.health
  const newHealth = Math.max(0, currentHealth - effect.amount)

  log.target = "enemy"
  log.before = currentHealth
  log.after = newHealth

  return {
    newState: {
      ...state,
      currentEnemy: {
        ...state.currentEnemy,
        health: newHealth,
      },
    },
    log,
  }
}

function executeEndCombat(
  state: GameState,
  effect: EndCombatEffect,
  log: EffectLog,
): SingleEffectResult {
  log.after = effect.result

  return {
    newState: {
      ...state,
      inCombat: false,
      currentEnemy: null,
    },
    log,
  }
}

function executeSetStance(
  state: GameState,
  effect: SetStanceEffect,
  log: EffectLog,
): SingleEffectResult {
  log.before = state.player.stance
  log.after = effect.stance

  return {
    newState: {
      ...state,
      player: {
        ...state.player,
        stance: effect.stance,
      },
    },
    log,
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Execute effects and return just the new state (convenience wrapper)
 */
export function applyEffects(state: GameState, effects: Effect[]): GameState {
  return executeEffects(state, effects).state
}

/**
 * Validate effects without executing them
 */
export function validateEffects(
  state: GameState,
  effects: Effect[],
): Array<{ effect: Effect; valid: boolean; reason: string }> {
  return effects.map(effect => {
    const result = validateEffect(state, effect)
    return { effect, ...result }
  })
}

/**
 * Create a summary of what effects would do (for preview/confirmation)
 */
export function summarizeEffects(effects: Effect[]): string[] {
  return effects.map(effect => {
    switch (effect.effectType) {
      case "damage": {
        const e = effect as DamageEffect
        return `Deal ${e.amount} ${e.damageType || "physical"} damage to ${e.target.type}`
      }
      case "heal": {
        const e = effect as HealEffect
        return `Heal ${e.target.type} for ${e.amount}`
      }
      case "modify_gold": {
        const e = effect as ModifyGoldEffect
        return e.amount >= 0 ? `Gain ${e.amount} gold` : `Lose ${-e.amount} gold`
      }
      case "add_item": {
        const e = effect as AddItemEffect
        return `Add ${e.item.name} to inventory`
      }
      case "apply_status": {
        const e = effect as ApplyStatusEffect
        return `Apply ${e.status.name} to ${e.target.type}`
      }
      case "narrative": {
        return `[Narration]`
      }
      default:
        return `${effect.effectType}`
    }
  })
}
