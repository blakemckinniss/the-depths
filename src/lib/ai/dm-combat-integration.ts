/**
 * DM Combat Integration
 *
 * Hooks DM Operations into combat flow for:
 * - Entity link processing (damage sharing, death triggers)
 * - Rule modifier checking (DEATHTOUCH, FIRST_STRIKE, etc.)
 * - Turn-based effect management
 */

import type { Enemy, Player, GameState } from "@/lib/core/game-types";
import {
  getDMSystem,
  type EntityLinkManager,
  type RuleModifierManager,
} from "@/lib/ai/event-engine";
import { RULE_MODIFIERS, type RuleModifierKey } from "@/lib/mechanics/game-mechanics-ledger";

// ============================================================================
// DM COMBAT HOOKS
// ============================================================================

/**
 * Check if an entity has a specific rule modifier active
 */
export function hasRuleModifier(entityId: string, modifierKey: RuleModifierKey): boolean {
  const dm = getDMSystem();
  if (!dm) return false;
  return dm.ruleManager.hasModifier(entityId, modifierKey);
}

/**
 * Get the effect value for a modifier if entity has it
 */
export function getModifierEffect(entityId: string, modifierKey: RuleModifierKey): unknown | null {
  const dm = getDMSystem();
  if (!dm) return null;
  return dm.ruleManager.getModifierEffect(entityId, modifierKey);
}

/**
 * Check if entity has DEATHTOUCH (any damage kills)
 */
export function hasDeathtouch(entityId: string): boolean {
  return hasRuleModifier(entityId, "DEATHTOUCH");
}

/**
 * Check if entity has FIRST_STRIKE (attacks first in combat)
 */
export function hasFirstStrike(entityId: string): boolean {
  return hasRuleModifier(entityId, "FIRST_STRIKE");
}

/**
 * Check if entity has REGENERATE (resurrect once per combat)
 */
export function hasRegenerate(entityId: string): boolean {
  return hasRuleModifier(entityId, "REGENERATE");
}

/**
 * Check if entity has INDESTRUCTIBLE (immune to damage)
 */
export function hasIndestructible(entityId: string): boolean {
  return hasRuleModifier(entityId, "INDESTRUCTIBLE");
}

/**
 * Check if entity has LIFELINK (heal for damage dealt)
 */
export function getLifelinkRatio(entityId: string): number {
  const effect = getModifierEffect(entityId, "LIFELINK");
  if (effect && typeof effect === "object" && "lifeSteal" in effect) {
    return (effect as { lifeSteal: number }).lifeSteal;
  }
  return 0;
}

/**
 * Use a limited-use modifier (decrements uses, returns if still active)
 */
export function useModifier(entityId: string, modifierKey: RuleModifierKey): boolean {
  const dm = getDMSystem();
  if (!dm) return false;
  return dm.ruleManager.useModifier(entityId, modifierKey);
}

// ============================================================================
// DEATH PROCESSING
// ============================================================================

export interface DeathTriggerResult {
  additionalDeaths: string[]; // Entity IDs that die as a result
  effects: Array<{ entityId: string; effect: string; value?: number }>;
  narrative: string[];
}

/**
 * Process death triggers for a killed entity
 * Returns any cascading effects (soul_bound deaths, etc.)
 */
export function processEntityDeath(entityId: string): DeathTriggerResult {
  const dm = getDMSystem();
  if (!dm) {
    return { additionalDeaths: [], effects: [], narrative: [] };
  }

  const triggers = dm.linkManager.processDeathTriggers(entityId);

  // Map the affected entities and effects to our result format
  return {
    additionalDeaths: triggers.affectedEntities,
    effects: triggers.affectedEntities.map((id, i) => ({
      entityId: id,
      effect: "death_trigger",
      value: undefined,
    })),
    narrative: triggers.effects,
  };
}

// ============================================================================
// DAMAGE PROCESSING
// ============================================================================

export interface DamageShareResult {
  sharedDamage: Array<{ entityId: string; damage: number }>;
  narrative: string[];
}

/**
 * Process damage sharing for linked entities
 */
export function processDamageSharing(entityId: string, damage: number): DamageShareResult {
  const dm = getDMSystem();
  if (!dm) {
    return { sharedDamage: [], narrative: [] };
  }

  const shared = dm.linkManager.processDamageShare(entityId, damage);

  return {
    sharedDamage: shared.map((share) => ({
      entityId: share.sharedWith,
      damage: share.sharedDamage,
    })),
    narrative: shared.map((share) =>
      `The life-link pulses - ${share.sharedWith} takes ${share.sharedDamage} shared damage.`
    ),
  };
}

// ============================================================================
// TURN PROCESSING
// ============================================================================

/**
 * Process end-of-turn effects for an entity's modifiers
 */
export function processTurnEnd(entityId: string): string[] {
  const dm = getDMSystem();
  if (!dm) return [];

  const expired = dm.ruleManager.processTurnEnd(entityId);
  return expired.map((key) => {
    const mod = RULE_MODIFIERS[key];
    return `${mod?.name || key} effect has expired.`;
  });
}

/**
 * Process end-of-combat effects for an entity's modifiers
 */
export function processCombatEnd(entityId: string): string[] {
  const dm = getDMSystem();
  if (!dm) return [];

  const expired = dm.ruleManager.processCombatEnd(entityId);
  return expired.map((key) => {
    const mod = RULE_MODIFIERS[key];
    return `${mod?.name || key} fades as combat ends.`;
  });
}

// ============================================================================
// COMBAT MODIFIERS
// ============================================================================

export interface CombatModifiers {
  damageMultiplier: number;
  defenseMultiplier: number;
  speedBonus: number;
  hasFirstStrike: boolean;
  hasDeathtouch: boolean;
  hasIndestructible: boolean;
  lifestealRatio: number;
  additionalEffects: string[];
}

/**
 * Get all combat-relevant modifiers for an entity
 */
export function getCombatModifiers(entityId: string): CombatModifiers {
  const dm = getDMSystem();

  const defaults: CombatModifiers = {
    damageMultiplier: 1.0,
    defenseMultiplier: 1.0,
    speedBonus: 0,
    hasFirstStrike: false,
    hasDeathtouch: false,
    hasIndestructible: false,
    lifestealRatio: 0,
    additionalEffects: [],
  };

  if (!dm) return defaults;

  return {
    damageMultiplier: dm.ruleManager.hasModifier(entityId, "DOUBLE_STRIKE") ? 2.0 : 1.0,
    defenseMultiplier: dm.ruleManager.hasModifier(entityId, "HEXPROOF") ? 1.5 : 1.0,
    speedBonus: dm.ruleManager.hasModifier(entityId, "FIRST_STRIKE") ? 50 : 0,
    hasFirstStrike: dm.ruleManager.hasModifier(entityId, "FIRST_STRIKE"),
    hasDeathtouch: dm.ruleManager.hasModifier(entityId, "DEATHTOUCH"),
    hasIndestructible: dm.ruleManager.hasModifier(entityId, "INDESTRUCTIBLE"),
    lifestealRatio: getLifelinkRatio(entityId),
    additionalEffects: getActiveModifierNames(entityId),
  };
}

/**
 * Get names of all active modifiers for an entity
 */
export function getActiveModifierNames(entityId: string): string[] {
  const dm = getDMSystem();
  if (!dm) return [];

  const modifiers = dm.ruleManager.getModifiersForEntity(entityId);
  return modifiers.map((m) => {
    const modDef = RULE_MODIFIERS[m.key];
    return modDef?.name || m.key;
  });
}

// ============================================================================
// ENTITY LINKS
// ============================================================================

/**
 * Get all links for an entity
 */
export function getEntityLinks(entityId: string) {
  const dm = getDMSystem();
  if (!dm) return [];
  return dm.linkManager.getLinksForEntity(entityId);
}

/**
 * Check if two entities are linked
 */
export function areEntitiesLinked(entityId1: string, entityId2: string): boolean {
  const dm = getDMSystem();
  if (!dm) return false;
  return dm.linkManager.getLinkBetween(entityId1, entityId2) !== undefined;
}

/**
 * Check if entity has a phylactery (can resurrect)
 */
export function hasPhylactery(entityId: string): { hasPhylactery: boolean; phylacteryId?: string } {
  const dm = getDMSystem();
  if (!dm) return { hasPhylactery: false };

  const links = dm.linkManager.getLinksOfType("phylactery");
  const phylacteryLink = links.find((l) => l.sourceId === entityId);

  return {
    hasPhylactery: !!phylacteryLink,
    phylacteryId: phylacteryLink?.targetId,
  };
}
