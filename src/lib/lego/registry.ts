/**
 * LEGO Registry - Query functions for AI piece selection
 *
 * These functions help build AI prompts by filtering and formatting
 * available pieces based on context constraints.
 */

import {
  PIECES,
  type LegoPiece,
  type PieceCategory,
  type PieceRarity,
  POWER_MULTIPLIERS,
  BLESSING_TIERS,
  CURSE_TIERS,
  DISPOSITION_CHANGES,
  REWARD_TIERS,
  type PowerLevel,
  type BlessingTier,
  type CurseTier,
  type DispositionChange,
  type RewardTier,
  type RewardType,
} from "./pieces"

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

export interface PieceQuery {
  categories?: PieceCategory[]
  tags?: string[]
  excludeTags?: string[]
  maxCost?: number
  minCost?: number
  rarity?: PieceRarity[]
  ids?: string[]
}

/**
 * Filter pieces based on query criteria.
 * All criteria are AND-ed together.
 */
export function getPiecesForContext(query: PieceQuery): LegoPiece[] {
  return Object.values(PIECES).filter((piece) => {
    // Category filter
    if (query.categories && !query.categories.includes(piece.category)) {
      return false
    }

    // Tag inclusion filter (any tag matches)
    if (query.tags && query.tags.length > 0) {
      if (!query.tags.some((t) => piece.tags.includes(t))) {
        return false
      }
    }

    // Tag exclusion filter
    if (query.excludeTags && query.excludeTags.length > 0) {
      if (query.excludeTags.some((t) => piece.tags.includes(t))) {
        return false
      }
    }

    // Cost filters
    if (query.maxCost !== undefined && piece.cost > query.maxCost) {
      return false
    }
    if (query.minCost !== undefined && piece.cost < query.minCost) {
      return false
    }

    // Rarity filter
    if (query.rarity && !query.rarity.includes(piece.rarity)) {
      return false
    }

    // Specific IDs filter
    if (query.ids && !query.ids.includes(piece.id)) {
      return false
    }

    return true
  })
}

// =============================================================================
// MANIFEST GENERATORS (for AI prompts)
// =============================================================================

/**
 * Generate a compact manifest of pieces for AI prompts.
 * Format: "- id (cost: N, tags: a, b, c)"
 */
export function getPieceManifest(pieces: LegoPiece[]): string {
  return pieces
    .map((p) => `- ${p.id} (cost: ${p.cost}, tags: ${p.tags.join(", ")})`)
    .join("\n")
}

/**
 * Generate a detailed manifest with narration hints.
 */
export function getDetailedManifest(pieces: LegoPiece[]): string {
  return pieces
    .map(
      (p) =>
        `- ${p.id} [${p.category}/${p.rarity}] (cost: ${p.cost})\n` +
        `  Tags: ${p.tags.join(", ")}\n` +
        `  Hints: ${p.narrationHints}`
    )
    .join("\n\n")
}

/**
 * Generate manifest grouped by category.
 */
export function getCategorizedManifest(pieces: LegoPiece[]): string {
  const byCategory = new Map<PieceCategory, LegoPiece[]>()

  for (const piece of pieces) {
    const list = byCategory.get(piece.category) || []
    list.push(piece)
    byCategory.set(piece.category, list)
  }

  const sections: string[] = []
  for (const [category, categoryPieces] of byCategory) {
    sections.push(
      `## ${category.toUpperCase()}\n` +
        categoryPieces.map((p) => `- ${p.id} (cost: ${p.cost})`).join("\n")
    )
  }

  return sections.join("\n\n")
}

// =============================================================================
// CONTEXT-SPECIFIC PIECE SETS
// =============================================================================

/**
 * Get pieces suitable for enemy combat turns.
 */
export function getEnemyAttackPieces(maxBudget: number): LegoPiece[] {
  return getPiecesForContext({
    categories: ["attack", "debuff"],
    maxCost: maxBudget,
    excludeTags: ["trap", "shrine"],
  })
}

/**
 * Get pieces suitable for shrine blessings.
 */
export function getShrineBlessingPieces(): LegoPiece[] {
  return getPiecesForContext({
    categories: ["buff", "utility"],
    tags: ["shrine", "heal", "buff"],
  })
}

/**
 * Get pieces suitable for shrine curses.
 */
export function getShrineCursePieces(): LegoPiece[] {
  return getPiecesForContext({
    categories: ["debuff"],
    tags: ["curse", "debuff"],
  })
}

/**
 * Get pieces suitable for trap effects.
 */
export function getTrapPieces(): LegoPiece[] {
  return getPiecesForContext({
    tags: ["trap"],
  })
}

// =============================================================================
// BUDGET CALCULATION
// =============================================================================

/**
 * Calculate the maximum budget for a given floor and context.
 */
export function calculateBudget(floor: number, context: "enemy" | "boss" | "trap" | "shrine"): number {
  const baseBudgets = {
    enemy: 4,
    boss: 8,
    trap: 4,
    shrine: 5,
  }

  const base = baseBudgets[context]
  const floorBonus = Math.floor(floor / 3) // +1 budget every 3 floors

  return Math.min(base + floorBonus, 10) // Cap at 10
}

// =============================================================================
// TIER EXPORTS (for kernel calculations)
// =============================================================================

export {
  POWER_MULTIPLIERS,
  BLESSING_TIERS,
  CURSE_TIERS,
  DISPOSITION_CHANGES,
  type PowerLevel,
  type BlessingTier,
  type CurseTier,
  type DispositionChange,
}

/**
 * Get actual damage multiplier from power level.
 */
export function getPowerMultiplier(level: PowerLevel): number {
  return POWER_MULTIPLIERS[level]
}

/**
 * Get blessing stat bonuses from tier.
 */
export function getBlessingStats(tier: BlessingTier) {
  return BLESSING_TIERS[tier]
}

/**
 * Get curse stat penalties from tier.
 */
export function getCurseStats(tier: CurseTier) {
  return CURSE_TIERS[tier]
}

/**
 * Get disposition change value from level.
 */
export function getDispositionDelta(change: DispositionChange): number {
  return DISPOSITION_CHANGES[change]
}

/**
 * Resolve a reward tier to an actual value.
 * Rolls within the min-max range for non-zero tiers.
 */
export function resolveRewardTier(
  rewardType: RewardType,
  tier: RewardTier
): number {
  const tierTable = REWARD_TIERS[rewardType]
  const tierValue = tierTable[tier]

  if (tierValue === 0) return 0
  if (typeof tierValue === "number") return tierValue

  // Roll within the range
  const { min, max } = tierValue
  return Math.floor(Math.random() * (max - min + 1)) + min
}
