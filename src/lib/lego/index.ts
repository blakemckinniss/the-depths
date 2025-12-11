/**
 * LEGO Layer - AI-as-LEGO-Composer Architecture
 *
 * This module provides the building blocks for AI game decisions.
 * AI selects piece IDs, kernel resolves and executes them.
 *
 * Usage:
 *   import { PIECES, resolvePieces, validateBudget } from "@/lib/lego"
 */

// Effect atoms - building blocks
export { atoms, targets, statusTemplates } from "./effect-atoms"
export * from "./effect-atoms"

// Piece definitions and types
export {
  PIECES,
  getPiece,
  getPieceOrThrow,
  getAllPieceIds,
  getPiecesByCategory,
  getPiecesByTag,
  POWER_MULTIPLIERS,
  BLESSING_TIERS,
  CURSE_TIERS,
  DISPOSITION_CHANGES,
  REWARD_TIERS,
  type LegoPiece,
  type PieceCategory,
  type PieceRarity,
  type PowerLevel,
  type BlessingTier,
  type CurseTier,
  type DispositionChange,
  type RewardTier,
  type RewardType,
} from "./pieces"

// Registry queries
export {
  getPiecesForContext,
  getPieceManifest,
  getDetailedManifest,
  getCategorizedManifest,
  getEnemyAttackPieces,
  getShrineBlessingPieces,
  getShrineCursePieces,
  getTrapPieces,
  calculateBudget,
  getPowerMultiplier,
  getBlessingStats,
  getCurseStats,
  getDispositionDelta,
  resolveRewardTier,
  type PieceQuery,
} from "./registry"

// Executor functions
export {
  resolvePieces,
  resolvePiecesWithPower,
  resolvePiece,
  validateBudget,
  fitsInBudget,
  validatePieceIds,
  allPiecesExist,
  validateAndResolve,
  clampEffects,
  type ResolutionResult,
  type ValidationResult,
} from "./executor"
