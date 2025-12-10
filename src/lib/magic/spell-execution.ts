/**
 * Spell Execution System
 *
 * Handles the actual casting of spells in different contexts:
 * - Combat (damage, healing, buffs, debuffs)
 * - Exploration (utility spells)
 * - Targeted (item transmutation, NPC charm, etc.)
 */

import type { Player, Enemy, Item, NPC, StatusEffect, DamageType } from "@/lib/core/game-types"
import type { Spell, SpellBook, SpellCastResult } from "./spell-system"
import { canCastSpell, calculateSpellDamage, calculateSpellHealing } from "./spell-system"
import { createStatusEffect } from "@/lib/entity/entity-system"

// =============================================================================
// SPELL EXECUTION
// =============================================================================

export interface CastContext {
  inCombat: boolean
  player: Player
  spellBook: SpellBook
  target?: {
    type: "enemy" | "ally" | "item" | "npc" | "environment" | "self"
    entity?: Enemy | Item | NPC
  }
  room?: {
    hasTraps?: boolean
    hasSecrets?: boolean
    isLit?: boolean
    entities?: unknown[]
  }
}

/**
 * Execute a spell and return the result
 */
export function castSpell(spell: Spell, context: CastContext): SpellCastResult {
  const { player, spellBook, target, inCombat } = context

  // Validate can cast
  const canCast = canCastSpell(player, spell, spellBook, {
    inCombat,
    hasTarget: !!target,
    targetType: target?.type,
  })

  if (!canCast.canCast) {
    return {
      success: false,
      reason: canCast.reason,
      resourceSpent: 0,
      cooldownSet: 0,
      narration: canCast.reason ?? "The spell fails.",
    }
  }

  // Calculate costs
  const resourceSpent = spell.resourceCost
  const healthSpent = spell.healthCost

  // Execute based on effect type
  let result: SpellCastResult

  switch (spell.effectType) {
    case "damage":
      result = executeDamageSpell(spell, player, target?.entity as Enemy | undefined)
      break
    case "heal":
      result = executeHealSpell(spell, player)
      break
    case "buff":
      result = executeBuffSpell(spell, player)
      break
    case "debuff":
      result = executeDebuffSpell(spell, player, target?.entity as Enemy | undefined)
      break
    case "utility":
      result = executeUtilitySpell(spell, context)
      break
    case "transmute":
      result = executeTransmuteSpell(spell, context)
      break
    case "control":
      result = executeControlSpell(spell, context)
      break
    case "summon":
      result = executeSummonSpell(spell, context)
      break
    case "ward":
      result = executeWardSpell(spell, player)
      break
    default:
      result = {
        success: false,
        reason: "Unknown spell type",
        resourceSpent: 0,
        cooldownSet: 0,
        narration: "The spell fizzles with uncertainty.",
      }
  }

  // Apply costs if successful
  if (result.success) {
    result.resourceSpent = resourceSpent
    result.healthSpent = healthSpent
    result.cooldownSet = spell.cooldown
  }

  return result
}

// =============================================================================
// SPELL TYPE EXECUTORS
// =============================================================================

function executeDamageSpell(
  spell: Spell,
  player: Player,
  target?: Enemy
): SpellCastResult {
  if (!spell.damage) {
    return {
      success: false,
      reason: "Spell has no damage component",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The spell lacks destructive power.",
    }
  }

  const { damage, isCritical } = calculateSpellDamage(player, spell, target)

  const narration = spell.castNarration
    ? `${spell.castNarration} ${isCritical ? "Critical hit! " : ""}${damage} ${spell.damage.type} damage!`
    : `You cast ${spell.name}${spell.incantation ? ` ("${spell.incantation}")` : ""}. ${isCritical ? "Critical! " : ""}${damage} damage!`

  return {
    success: true,
    damage,
    damageType: spell.damage.type,
    isCritical,
    effectsApplied: spell.appliesEffects,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration,
  }
}

function executeHealSpell(spell: Spell, player: Player): SpellCastResult {
  const healing = calculateSpellHealing(player, spell)

  const narration = spell.castNarration
    ? `${spell.castNarration} You recover ${healing} health!`
    : `You cast ${spell.name}. ${healing} health restored!`

  return {
    success: true,
    healing,
    effectsApplied: spell.appliesEffects,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration,
  }
}

function executeBuffSpell(spell: Spell, player: Player): SpellCastResult {
  if (!spell.appliesEffects || spell.appliesEffects.length === 0) {
    return {
      success: false,
      reason: "Spell has no buff effects",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The spell has no effect.",
    }
  }

  const effectNames = spell.appliesEffects.map((e) => e.name).join(", ")
  const narration = spell.castNarration ?? `You cast ${spell.name}. You gain ${effectNames}!`

  return {
    success: true,
    effectsApplied: spell.appliesEffects,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration,
  }
}

function executeDebuffSpell(
  spell: Spell,
  player: Player,
  target?: Enemy
): SpellCastResult {
  if (!spell.appliesEffects || spell.appliesEffects.length === 0) {
    return {
      success: false,
      reason: "Spell has no debuff effects",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The spell has no effect.",
    }
  }

  const effectNames = spell.appliesEffects.map((e) => e.name).join(", ")
  const targetName = target?.name ?? "the enemy"
  const narration =
    spell.castNarration ?? `You cast ${spell.name} on ${targetName}. ${effectNames} applied!`

  return {
    success: true,
    effectsApplied: spell.appliesEffects,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration,
  }
}

function executeUtilitySpell(spell: Spell, context: CastContext): SpellCastResult {
  if (!spell.utilityEffect) {
    return {
      success: false,
      reason: "Spell has no utility effect",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "Nothing happens.",
    }
  }

  const { type, value, duration } = spell.utilityEffect
  let utilityResult: SpellCastResult["utilityResult"]
  let narration: string

  switch (type) {
    case "light":
      utilityResult = {
        type: "light",
        success: true,
        description: `The area is illuminated for ${duration ?? 10} turns.`,
      }
      narration = spell.castNarration ?? "A warm glow emanates from your hand, illuminating the darkness."
      break

    case "reveal_traps":
      const trapsFound = context.room?.hasTraps ? ["Hidden trap revealed!"] : []
      utilityResult = {
        type: "reveal_traps",
        success: true,
        description: trapsFound.length > 0 ? "Traps detected!" : "No traps found.",
        trapRevealed: trapsFound,
      }
      narration =
        trapsFound.length > 0
          ? "Your magical senses detect hidden dangers!"
          : "Your spell reveals no hidden traps."
      break

    case "reveal_secrets":
      utilityResult = {
        type: "reveal_secrets",
        success: true,
        description: context.room?.hasSecrets ? "A secret is revealed!" : "Nothing hidden here.",
        secretRevealed: context.room?.hasSecrets ? "Hidden passage detected" : undefined,
      }
      narration = context.room?.hasSecrets
        ? "The walls shimmer, revealing hidden secrets!"
        : "Your spell finds nothing hidden."
      break

    case "identify":
      const item = context.target?.entity as Item | undefined
      if (item) {
        utilityResult = {
          type: "identify",
          success: true,
          description: `${item.name} has been identified!`,
        }
        narration = `The item's true nature is revealed: ${item.name}!`
      } else {
        utilityResult = {
          type: "identify",
          success: false,
          description: "No item to identify.",
        }
        narration = "You need to target an item to identify."
      }
      break

    case "teleport":
      utilityResult = {
        type: "teleport",
        success: true,
        description: "You vanish and reappear elsewhere!",
        teleportedTo: "next_room",
      }
      narration = spell.castNarration ?? "Reality bends as you step through space itself!"
      break

    case "unlock":
      utilityResult = {
        type: "unlock",
        success: true,
        description: "The lock clicks open!",
      }
      narration = spell.castNarration ?? "With a word of power, the lock surrenders."
      break

    case "dispel":
      utilityResult = {
        type: "dispel",
        success: true,
        description: "Magical effects are dispelled!",
      }
      narration = "Arcane energies unravel as your spell takes effect."
      break

    case "scry":
      utilityResult = {
        type: "scry",
        success: true,
        description: "Visions of paths ahead fill your mind.",
      }
      narration = "Your mind's eye sees beyond these walls..."
      break

    default:
      utilityResult = {
        type,
        success: true,
        description: `${type} effect activated.`,
      }
      narration = spell.castNarration ?? `You cast ${spell.name}.`
  }

  return {
    success: true,
    utilityResult,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration,
  }
}

function executeTransmuteSpell(spell: Spell, context: CastContext): SpellCastResult {
  if (!spell.utilityEffect) {
    return {
      success: false,
      reason: "Spell has no transmutation effect",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The transmutation fails.",
    }
  }

  const { type, value } = spell.utilityEffect
  const item = context.target?.entity as Item | undefined

  if (type === "transmute_gold" && item) {
    const goldValue = Math.floor((item.value ?? 10) * ((value ?? 100) / 100))
    return {
      success: true,
      utilityResult: {
        type: "transmute_gold",
        success: true,
        description: `${item.name} dissolves into ${goldValue} gold!`,
        goldGained: goldValue,
      },
      resourceSpent: 0,
      cooldownSet: spell.cooldown,
      narration:
        spell.castNarration ??
        `The ${item.name} shimmers and transforms into a pile of ${goldValue} gold coins!`,
    }
  }

  return {
    success: false,
    reason: "Invalid transmutation target",
    resourceSpent: 0,
    cooldownSet: 0,
    narration: "The transmutation requires a valid target.",
  }
}

function executeControlSpell(spell: Spell, context: CastContext): SpellCastResult {
  if (!spell.utilityEffect) {
    return {
      success: false,
      reason: "Spell has no control effect",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The mind magic fails.",
    }
  }

  const { type, duration } = spell.utilityEffect
  const target = context.target?.entity

  switch (type) {
    case "charm":
      if (context.target?.type === "npc") {
        return {
          success: true,
          utilityResult: {
            type: "charm",
            success: true,
            description: `The target regards you favorably for ${duration ?? 5} interactions.`,
            npcCharmed: true,
          },
          effectsApplied: spell.appliesEffects,
          resourceSpent: 0,
          cooldownSet: spell.cooldown,
          narration: spell.castNarration ?? "Their eyes glaze slightly. They seem much friendlier now.",
        }
      }
      break

    case "fear":
      return {
        success: true,
        utilityResult: {
          type: "fear",
          success: true,
          description: "Terror grips your target!",
        },
        effectsApplied: spell.appliesEffects,
        resourceSpent: 0,
        cooldownSet: spell.cooldown,
        narration: spell.castNarration ?? "Primal fear seizes your foe!",
      }

    case "dominate":
      return {
        success: true,
        utilityResult: {
          type: "dominate",
          success: true,
          description: "Your will overrides theirs!",
        },
        effectsApplied: spell.appliesEffects,
        resourceSpent: 0,
        cooldownSet: spell.cooldown,
        narration: "Your mind crushes their resistance. They are yours to command.",
      }

    case "banish":
      return {
        success: true,
        utilityResult: {
          type: "banish",
          success: true,
          description: "The creature is cast into the void!",
          enemyBanished: true,
        },
        resourceSpent: 0,
        cooldownSet: spell.cooldown,
        narration: spell.castNarration ?? "Reality tears open, swallowing your foe into nothingness!",
      }
  }

  return {
    success: false,
    reason: "Control spell requires appropriate target",
    resourceSpent: 0,
    cooldownSet: 0,
    narration: "Your mental energies find no purchase.",
  }
}

function executeSummonSpell(spell: Spell, context: CastContext): SpellCastResult {
  if (!spell.utilityEffect || spell.utilityEffect.type !== "summon_companion") {
    return {
      success: false,
      reason: "Not a summon spell",
      resourceSpent: 0,
      cooldownSet: 0,
      narration: "The summoning fails.",
    }
  }

  const { duration } = spell.utilityEffect

  return {
    success: true,
    utilityResult: {
      type: "summon_companion",
      success: true,
      description: `A spirit familiar appears to aid you for ${duration ?? 10} turns!`,
      companionSummoned: "spirit_familiar",
    },
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration: spell.castNarration ?? "With eldritch words, you call forth a spirit to serve you!",
  }
}

function executeWardSpell(spell: Spell, player: Player): SpellCastResult {
  if (!spell.appliesEffects || spell.appliesEffects.length === 0) {
    // Create a default ward effect
    const wardEffect = createStatusEffect({
      name: spell.name,
      effectType: "buff",
      duration: spell.utilityEffect?.duration ?? 5,
      modifiers: { defense: 5, damageTaken: 0.8 },
      description: "A protective ward surrounds you.",
      sourceType: "ability",
    })

    return {
      success: true,
      effectsApplied: [wardEffect],
      resourceSpent: 0,
      cooldownSet: spell.cooldown,
      narration: spell.castNarration ?? "A shimmering barrier of force surrounds you!",
    }
  }

  return {
    success: true,
    effectsApplied: spell.appliesEffects,
    resourceSpent: 0,
    cooldownSet: spell.cooldown,
    narration: spell.castNarration ?? "Protective magic envelops you!",
  }
}

// =============================================================================
// SPELL BOOK MANAGEMENT
// =============================================================================

/**
 * Apply spell cast to player state
 */
export function applySpellCast(
  player: Player,
  spellBook: SpellBook,
  spell: Spell,
  result: SpellCastResult
): { player: Player; spellBook: SpellBook } {
  if (!result.success) {
    return { player, spellBook }
  }

  // Deduct resources
  let newPlayer = {
    ...player,
    resources: {
      ...player.resources,
      current: player.resources.current - result.resourceSpent,
    },
  }

  // Deduct health cost if any
  if (result.healthSpent) {
    newPlayer = {
      ...newPlayer,
      stats: {
        ...newPlayer.stats,
        health: newPlayer.stats.health - result.healthSpent,
      },
    }
  }

  // Apply healing
  if (result.healing) {
    newPlayer = {
      ...newPlayer,
      stats: {
        ...newPlayer.stats,
        health: Math.min(newPlayer.stats.maxHealth, newPlayer.stats.health + result.healing),
      },
    }
  }

  // Apply effects to player (buffs)
  if (result.effectsApplied) {
    const buffEffects = result.effectsApplied.filter((e) => e.effectType === "buff")
    if (buffEffects.length > 0) {
      newPlayer = {
        ...newPlayer,
        activeEffects: [...newPlayer.activeEffects, ...buffEffects],
      }
    }
  }

  // Update spell book cooldowns and recent cast
  const newSpellBook = {
    ...spellBook,
    cooldowns: {
      ...spellBook.cooldowns,
      [spell.id]: result.cooldownSet,
    },
    recentlyCast: [spell.id, ...spellBook.recentlyCast.filter((id) => id !== spell.id)].slice(0, 5),
  }

  return { player: newPlayer, spellBook: newSpellBook }
}

/**
 * Apply spell damage to enemy
 */
export function applySpellDamageToEnemy(
  enemy: Enemy,
  damage: number,
  damageType: DamageType,
  effectsApplied?: StatusEffect[]
): { enemy: Enemy; narratives: string[]; debuffsToApply?: StatusEffect[] } {
  const narratives: string[] = []

  // Check weakness/resistance
  let finalDamage = damage
  if (enemy.weakness === damageType) {
    finalDamage = Math.floor(damage * 1.5)
    narratives.push(`The ${enemy.name} is weak to ${damageType}!`)
  } else if (enemy.resistance === damageType) {
    finalDamage = Math.floor(damage * 0.5)
    narratives.push(`The ${enemy.name} resists ${damageType}...`)
  }

  const newEnemy = {
    ...enemy,
    health: Math.max(0, enemy.health - finalDamage),
  }

  // Note: Enemies don't have an activeEffects array - debuffs are tracked via combat state
  // If effects need to be applied, they should be returned for the caller to handle
  return { enemy: newEnemy, narratives, debuffsToApply: effectsApplied?.filter((e) => e.effectType === "debuff") }
}
