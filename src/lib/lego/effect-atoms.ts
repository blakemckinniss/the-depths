/**
 * Effect Atoms - Safe constructors for atomic game effects
 *
 * These are the smallest building blocks of the LEGO system.
 * Each function creates a properly typed Effect object.
 *
 * AI never calls these directly - they're used to build LegoPieces.
 */

import type {
  Effect,
  EffectTarget,
  DamageEffect,
  HealEffect,
  ModifyGoldEffect,
  ModifyExperienceEffect,
  ApplyStatusEffect,
  RemoveStatusEffect,
  NarrativeEffect,
  SetStanceEffect,
  DamageEnemyEffect,
  EndCombatEffect,
  ModifyPlayerStatsEffect,
} from "@/lib/effects/effect-types"
import type { DamageType, CombatStance, StatusEffect } from "@/lib/core/game-types"

// =============================================================================
// TARGET HELPERS
// =============================================================================

export const targets = {
  player: (): EffectTarget => ({ type: "player" }),
  enemy: (): EffectTarget => ({ type: "enemy" }),
  companion: (id: string): EffectTarget => ({ type: "companion", id }),
  npc: (id: string): EffectTarget => ({ type: "npc", id }),
}

// =============================================================================
// DAMAGE & HEALING ATOMS
// =============================================================================

export function damage(
  target: EffectTarget,
  amount: number,
  source: string,
  options: {
    damageType?: DamageType
    ignoreDefense?: boolean
    canKill?: boolean
  } = {}
): DamageEffect {
  return {
    effectType: "damage",
    target,
    amount,
    source,
    damageType: options.damageType,
    ignoreDefense: options.ignoreDefense,
    canKill: options.canKill ?? true,
  }
}

export function heal(
  target: EffectTarget,
  amount: number,
  source: string,
  options: { canOverheal?: boolean } = {}
): HealEffect {
  return {
    effectType: "heal",
    target,
    amount,
    source,
    canOverheal: options.canOverheal,
  }
}

export function damageEnemy(
  amount: number,
  source: string,
  damageType?: DamageType
): DamageEnemyEffect {
  return {
    effectType: "damage_enemy",
    amount,
    source,
    damageType,
  }
}

// =============================================================================
// RESOURCE ATOMS
// =============================================================================

export function modifyGold(amount: number, source: string): ModifyGoldEffect {
  return {
    effectType: "modify_gold",
    amount,
    source,
  }
}

export function modifyExperience(amount: number, source: string): ModifyExperienceEffect {
  return {
    effectType: "modify_experience",
    amount,
    source,
  }
}

// =============================================================================
// STATUS EFFECT ATOMS
// =============================================================================

export function applyStatus(
  target: EffectTarget,
  status: StatusEffect
): ApplyStatusEffect {
  return {
    effectType: "apply_status",
    target,
    status,
  }
}

export function removeStatus(
  target: EffectTarget,
  statusId: string
): RemoveStatusEffect {
  return {
    effectType: "remove_status",
    target,
    statusId,
  }
}

// =============================================================================
// COMBAT ATOMS
// =============================================================================

export function setStance(stance: CombatStance): SetStanceEffect {
  return {
    effectType: "set_stance",
    stance,
  }
}

export function endCombat(result: "victory" | "flee" | "death"): EndCombatEffect {
  return {
    effectType: "end_combat",
    result,
  }
}

// =============================================================================
// PLAYER STAT ATOMS
// =============================================================================

export function modifyPlayerStats(
  changes: {
    attack?: number
    defense?: number
    maxHealth?: number
    strength?: number
    intelligence?: number
    dexterity?: number
  },
  source: string,
  permanent: boolean = false
): ModifyPlayerStatsEffect {
  return {
    effectType: "modify_player_stats",
    changes,
    permanent,
    source,
  }
}

// =============================================================================
// NARRATIVE ATOMS
// =============================================================================

export function narrative(
  text: string,
  category: "combat" | "exploration" | "dialogue" | "system" | "lore" = "combat"
): NarrativeEffect {
  return {
    effectType: "narrative",
    text,
    category,
  }
}

// =============================================================================
// PREDEFINED STATUS EFFECTS (for quick reference)
// =============================================================================

/**
 * Common status effect templates that can be used in pieces.
 * These mirror the STATUS_EFFECTS from entity-system.ts but are inline
 * to avoid circular dependencies.
 */
export const statusTemplates = {
  // Damage over time
  burning: (stacks = 1): StatusEffect => ({
    id: `burning_${Date.now()}`,
    name: "Burning",
    entityType: "curse",
    effectType: "debuff",
    duration: 3,
    stacks,
    modifiers: { healthRegen: -5 * stacks },
    description: "Flames consume your flesh.",
  }),

  poisoned: (stacks = 1): StatusEffect => ({
    id: `poisoned_${Date.now()}`,
    name: "Poisoned",
    entityType: "curse",
    effectType: "debuff",
    duration: 5,
    stacks,
    modifiers: { healthRegen: -3 * stacks },
    description: "Toxins course through your veins.",
  }),

  bleeding: (stacks = 1): StatusEffect => ({
    id: `bleeding_${Date.now()}`,
    name: "Bleeding",
    entityType: "curse",
    effectType: "debuff",
    duration: 4,
    stacks,
    modifiers: { healthRegen: -4 * stacks },
    description: "Blood flows from your wounds.",
  }),

  // Stat debuffs
  weakened: (): StatusEffect => ({
    id: `weakened_${Date.now()}`,
    name: "Weakened",
    entityType: "curse",
    effectType: "debuff",
    duration: 3,
    modifiers: { attack: -5 },
    description: "Your strength fades.",
  }),

  vulnerable: (): StatusEffect => ({
    id: `vulnerable_${Date.now()}`,
    name: "Vulnerable",
    entityType: "curse",
    effectType: "debuff",
    duration: 3,
    modifiers: { defense: -5 },
    description: "Your defenses crumble.",
  }),

  chilled: (): StatusEffect => ({
    id: `chilled_${Date.now()}`,
    name: "Chilled",
    entityType: "curse",
    effectType: "debuff",
    duration: 2,
    modifiers: { attack: -3, defense: -2 },
    description: "Cold seeps into your bones.",
  }),

  // Buffs
  blessed: (): StatusEffect => ({
    id: `blessed_${Date.now()}`,
    name: "Blessed",
    entityType: "blessing",
    effectType: "buff",
    duration: 5,
    modifiers: { attack: 3, defense: 2 },
    description: "Divine favor strengthens you.",
  }),

  fortified: (): StatusEffect => ({
    id: `fortified_${Date.now()}`,
    name: "Fortified",
    entityType: "blessing",
    effectType: "buff",
    duration: 3,
    modifiers: { defense: 5, maxHealth: 10 },
    description: "Your skin hardens like stone.",
  }),

  empowered: (): StatusEffect => ({
    id: `empowered_${Date.now()}`,
    name: "Empowered",
    entityType: "blessing",
    effectType: "buff",
    duration: 3,
    modifiers: { attack: 5 },
    description: "Power surges through you.",
  }),

  regenerating: (): StatusEffect => ({
    id: `regenerating_${Date.now()}`,
    name: "Regenerating",
    entityType: "blessing",
    effectType: "buff",
    duration: 5,
    modifiers: { healthRegen: 4 },
    description: "Your wounds knit together.",
  }),

  // Control effects
  stunned: (): StatusEffect => ({
    id: `stunned_${Date.now()}`,
    name: "Stunned",
    entityType: "curse",
    effectType: "debuff",
    duration: 1,
    modifiers: { attack: -10, defense: -5 },
    description: "You cannot act.",
  }),

  // Curses
  cursed: (): StatusEffect => ({
    id: `cursed_${Date.now()}`,
    name: "Cursed",
    entityType: "curse",
    effectType: "debuff",
    duration: 10,
    modifiers: { attack: -3, defense: -2, dodgeChance: -0.1 },
    description: "Dark magic clings to your soul.",
  }),
}

// =============================================================================
// EXPORTED ATOMS OBJECT (for convenient access)
// =============================================================================

export const atoms = {
  // Targeting
  targets,

  // Effects
  damage,
  heal,
  damageEnemy,
  modifyGold,
  modifyExperience,
  applyStatus,
  removeStatus,
  setStance,
  endCombat,
  modifyPlayerStats,
  narrative,

  // Status templates
  statusTemplates,
}

export default atoms
