/**
 * LEGO Executor - Resolve piece IDs to Effect arrays
 *
 * This is the bridge between AI decisions (pieceIds) and the effect executor.
 * It validates budgets and piece existence before resolution.
 */

import type { Effect } from "@/lib/effects/effect-types"
import { PIECES, getPieceOrThrow, type PowerLevel, POWER_MULTIPLIERS } from "./pieces"
import type { DamageEffect, HealEffect } from "@/lib/effects/effect-types"

// =============================================================================
// TYPES
// =============================================================================

export interface ResolutionResult {
  success: boolean
  effects: Effect[]
  errors: string[]
  totalCost: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  totalCost: number
}

// =============================================================================
// PIECE RESOLUTION
// =============================================================================

/**
 * Resolve an array of piece IDs to their Effect arrays.
 * Validates each piece exists before resolution.
 */
export function resolvePieces(pieceIds: string[]): ResolutionResult {
  const effects: Effect[] = []
  const errors: string[] = []
  let totalCost = 0

  for (const id of pieceIds) {
    const piece = PIECES[id]
    if (!piece) {
      errors.push(`Unknown piece: ${id}`)
      continue
    }

    effects.push(...piece.atoms)
    totalCost += piece.cost
  }

  return {
    success: errors.length === 0,
    effects,
    errors,
    totalCost,
  }
}

/**
 * Resolve pieces with power level scaling applied to damage/heal effects.
 */
export function resolvePiecesWithPower(
  pieceIds: string[],
  powerLevel: PowerLevel = "medium"
): ResolutionResult {
  const baseResult = resolvePieces(pieceIds)

  if (!baseResult.success) {
    return baseResult
  }

  const multiplier = POWER_MULTIPLIERS[powerLevel]

  // Scale damage and heal effects
  const scaledEffects = baseResult.effects.map((effect) => {
    if (effect.effectType === "damage" || effect.effectType === "damage_enemy") {
      return {
        ...effect,
        amount: Math.round((effect as DamageEffect).amount * multiplier),
      }
    }

    if (effect.effectType === "heal") {
      return {
        ...effect,
        amount: Math.round((effect as HealEffect).amount * multiplier),
      }
    }

    return effect
  })

  return {
    ...baseResult,
    effects: scaledEffects,
  }
}

/**
 * Resolve a single piece by ID.
 * Throws if piece doesn't exist.
 */
export function resolvePiece(pieceId: string): Effect[] {
  const piece = getPieceOrThrow(pieceId)
  return [...piece.atoms]
}

// =============================================================================
// BUDGET VALIDATION
// =============================================================================

/**
 * Validate that piece IDs don't exceed budget.
 */
export function validateBudget(pieceIds: string[], maxBudget: number): ValidationResult {
  const errors: string[] = []
  let totalCost = 0

  for (const id of pieceIds) {
    const piece = PIECES[id]
    if (!piece) {
      errors.push(`Unknown piece: ${id}`)
      continue
    }
    totalCost += piece.cost
  }

  if (totalCost > maxBudget) {
    errors.push(`Budget exceeded: ${totalCost} > ${maxBudget}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    totalCost,
  }
}

/**
 * Check if a set of pieces fits within budget (boolean shorthand).
 */
export function fitsInBudget(pieceIds: string[], maxBudget: number): boolean {
  return validateBudget(pieceIds, maxBudget).valid
}

// =============================================================================
// PIECE EXISTENCE VALIDATION
// =============================================================================

/**
 * Validate that all piece IDs exist in the registry.
 */
export function validatePieceIds(pieceIds: string[]): ValidationResult {
  const errors: string[] = []

  for (const id of pieceIds) {
    if (!PIECES[id]) {
      errors.push(`Unknown piece: ${id}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalCost: 0,
  }
}

/**
 * Check if all piece IDs are valid (boolean shorthand).
 */
export function allPiecesExist(pieceIds: string[]): boolean {
  return pieceIds.every((id) => PIECES[id] !== undefined)
}

// =============================================================================
// FULL VALIDATION (for AI output)
// =============================================================================

/**
 * Perform full validation of AI-generated piece selection.
 * Checks: existence, budget, and returns resolved effects if valid.
 */
export function validateAndResolve(
  pieceIds: string[],
  maxBudget: number,
  powerLevel?: PowerLevel
): ResolutionResult {
  // First validate existence
  const existenceCheck = validatePieceIds(pieceIds)
  if (!existenceCheck.valid) {
    return {
      success: false,
      effects: [],
      errors: existenceCheck.errors,
      totalCost: 0,
    }
  }

  // Then validate budget
  const budgetCheck = validateBudget(pieceIds, maxBudget)
  if (!budgetCheck.valid) {
    return {
      success: false,
      effects: [],
      errors: budgetCheck.errors,
      totalCost: budgetCheck.totalCost,
    }
  }

  // Finally resolve
  if (powerLevel) {
    return resolvePiecesWithPower(pieceIds, powerLevel)
  }

  return resolvePieces(pieceIds)
}

// =============================================================================
// EFFECT CLAMPING (safety net)
// =============================================================================

/**
 * Clamp effect values to safe ranges.
 * This is a safety net in case pieces have misconfigured values.
 */
export function clampEffects(effects: Effect[]): Effect[] {
  return effects.map((effect) => {
    if (effect.effectType === "damage" || effect.effectType === "damage_enemy") {
      const damageEffect = effect as DamageEffect
      return {
        ...damageEffect,
        amount: Math.max(1, Math.min(damageEffect.amount, 999)),
      }
    }

    if (effect.effectType === "heal") {
      const healEffect = effect as HealEffect
      return {
        ...healEffect,
        amount: Math.max(1, Math.min(healEffect.amount, 999)),
      }
    }

    if (effect.effectType === "modify_gold") {
      return {
        ...effect,
        amount: Math.max(-9999, Math.min(effect.amount, 9999)),
      }
    }

    return effect
  })
}
