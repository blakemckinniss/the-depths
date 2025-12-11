/**
 * Effects Module - AI-as-Code Architecture
 *
 * This module provides the core infrastructure for the AI-as-code pattern:
 * - Effect types: The "instruction set" AI can output
 * - Effect executor: The kernel that applies effects to game state
 * - AI decision layer: Clean interface to LLM for decisions
 *
 * Usage:
 *   import { decide, executeEffects, applyEffects } from "@/lib/effects"
 *
 *   // AI makes a decision
 *   const decision = await decide({ state, decisionType: "enemy_turn" })
 *
 *   // Apply effects to state
 *   const newState = applyEffects(state, decision.effects)
 */

// Types
export type {
  Effect,
  EffectTarget,
  DamageEffect,
  HealEffect,
  ModifyGoldEffect,
  AddItemEffect,
  ApplyStatusEffect,
  NarrativeEffect,
  TurnDecision,
  DecisionContext,
  // LEGO decision types
  LegoTurnDecision,
  ShrineTurnDecision,
  NPCTurnDecision,
  AnyLegoDecision,
} from "./effect-types"

// Type guards
export {
  isDamageEffect,
  isHealEffect,
  isNarrativeEffect,
  isCompositeEffect,
} from "./effect-types"

// Executor
export {
  executeEffects,
  applyEffects,
  validateEffects,
  summarizeEffects,
  type ExecutionResult,
  type EffectLog,
} from "./effect-executor"

// AI Decision Layer
export {
  decide,
  decideEnemyTurn,
  narratePlayerAttack,
  decideShrineOutcome,
  decideTrapEffect,
  narrateEffects,
  type DecisionType,
} from "./ai-decision-layer"
