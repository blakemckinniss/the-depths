/**
 * Spell System - Learnable Magic/Skills
 *
 * Unlike class Abilities (granted by class selection), Spells are:
 * - Learned from items (tomes, scrolls), events, NPCs, shrines
 * - Usable in/out of combat depending on spell type
 * - Not restricted by class (though some may have prerequisites)
 * - Persistent across runs (can be stored in meta-progression)
 *
 * The AI generates creative spells within these constraints.
 */

import type {
  GameEntity,
  StatusEffect,
  DamageType,
  ResourceType,
  PlayerClass,
  Item,
  Player,
  Enemy,
  NPC,
} from "@/lib/core/game-types"
import { generateEntityId, createStatusEffect } from "@/lib/entity/entity-system"

// =============================================================================
// SPELL TYPES
// =============================================================================

/**
 * When a spell can be used
 */
export type SpellUsageContext =
  | "combat_only" // Can only be used during combat (attack spells, combat buffs)
  | "exploration" // Can only be used outside combat (reveal secrets, light, detect)
  | "anytime" // Can be used in or out of combat (heal, buff, teleport)
  | "targeted" // Requires specific target type (transmute item, charm NPC, unlock door)

/**
 * What a targeted spell can affect
 */
export type SpellTargetType =
  | "self" // Cast on self
  | "enemy" // Single enemy
  | "ally" // Companion or NPC ally
  | "all_enemies" // All enemies in combat
  | "all_allies" // Self + companions
  | "item" // Cast on an item (transmute, identify, enchant)
  | "npc" // Cast on an NPC (charm, dominate, read mind)
  | "environment" // Cast on room/area (light, ward, detect traps)
  | "location" // Teleport to location

/**
 * How spell was learned
 */
export type SpellSource =
  | "tome" // Learned from reading a tome/spellbook
  | "scroll_study" // Permanently learned from a scroll (not single-use)
  | "shrine" // Granted by a shrine blessing
  | "npc" // Taught by an NPC
  | "event" // Learned through a game event
  | "discovery" // Found/revealed through exploration
  | "quest" // Quest reward
  | "innate" // Born with it (race/background)
  | "curse" // Forced upon by a curse (may have drawbacks)
  | "artifact" // Bound to an artifact (only works while equipped)

/**
 * Magical school/type for thematic grouping
 */
export type SpellSchool =
  // Elemental
  | "fire"
  | "ice"
  | "lightning"
  | "earth"
  // Divine/Spiritual
  | "holy"
  | "shadow"
  | "nature"
  | "spirit"
  // Arcane
  | "arcane"
  | "illusion"
  | "enchantment"
  | "transmutation"
  // Special
  | "blood" // Costs HP instead of mana
  | "void" // Dangerous/chaotic magic
  | "temporal" // Time manipulation
  | "universal" // Basic magic available to all

/**
 * Effect types a spell can produce
 */
export type SpellEffectType =
  | "damage" // Deal damage
  | "heal" // Restore health
  | "buff" // Apply beneficial effect
  | "debuff" // Apply harmful effect
  | "summon" // Create entity (companion, minion)
  | "utility" // Non-combat effect (light, reveal, teleport)
  | "transmute" // Transform target (item, enemy, environment)
  | "control" // Mind control, charm, fear
  | "ward" // Protection, shield, barrier

// =============================================================================
// SPELL INTERFACE
// =============================================================================

export interface Spell extends GameEntity {
  entityType: "ability"

  // Core identity
  school: SpellSchool
  usageContext: SpellUsageContext
  effectType: SpellEffectType

  // Targeting
  targetType: SpellTargetType
  requiresTarget: boolean
  aoeRadius?: number // For area spells

  // Cost & Cooldown
  resourceCost: number
  resourceType: ResourceType
  healthCost?: number // For blood magic
  cooldown: number // Turns
  castTime?: number // 0 = instant, 1+ = channels

  // Effects
  damage?: {
    base: number
    scaling?: { stat: "intelligence" | "attack" | "level"; ratio: number }
    type: DamageType
  }
  healing?: {
    base: number
    scaling?: { stat: "intelligence" | "level" | "maxHealth"; ratio: number }
  }
  appliesEffects?: StatusEffect[]
  removeEffects?: string[] // Effect names to cleanse

  // Utility effects
  utilityEffect?: {
    type:
      | "light" // Illuminate area
      | "reveal_traps" // Show hidden traps
      | "reveal_secrets" // Show hidden paths/items
      | "teleport" // Move to location
      | "unlock" // Open locked doors/chests
      | "identify" // Reveal item properties
      | "transmute_gold" // Convert item to gold
      | "transmute_item" // Convert item to another item
      | "charm" // Make NPC friendly
      | "dominate" // Control enemy
      | "fear" // Make enemy flee
      | "ward_area" // Protect room from hazards
      | "summon_companion" // Create temporary ally
      | "banish" // Remove enemy from combat
      | "dispel" // Remove magical effects
      | "scry" // See future rooms/events
      | "restore_item" // Repair broken item
    value?: number // Magnitude of effect
    duration?: number // How long effect lasts
  }

  // Requirements
  levelRequired: number
  prerequisites?: {
    spells?: string[] // Must know these spells first
    stats?: { stat: string; minimum: number }[]
    class?: PlayerClass[]
    items?: string[] // Must possess these items
  }

  // Learning metadata
  source?: SpellSource
  sourceId?: string // ID of entity that taught this spell
  learnedAt?: number // Timestamp when learned

  // AI-generated flavor
  incantation?: string // The words spoken to cast
  castNarration?: string // "You raise your hands and..."
  successNarration?: string // "The spell takes effect!"
  failNarration?: string // "The spell fizzles..."

  // Visual
  animation?: string // Animation hint for UI
  color?: string // Spell color theme

  // Constraints for AI generation
  powerLevel: number // 1-10 for balance
  rarity: "common" | "uncommon" | "rare" | "legendary"

  // Tags for AI context and combos
  tags: string[]
}

// =============================================================================
// SPELL RESULT
// =============================================================================

export interface SpellCastResult {
  success: boolean
  reason?: string // Why it failed

  // Resource changes
  resourceSpent: number
  healthSpent?: number

  // Effects produced
  damage?: number
  damageType?: DamageType
  healing?: number
  isCritical?: boolean
  effectsApplied?: StatusEffect[]
  effectsRemoved?: string[]

  // Utility results
  utilityResult?: {
    type: string
    success: boolean
    description: string
    // Specific results
    goldGained?: number
    itemTransformed?: Item
    secretRevealed?: string
    trapRevealed?: string[]
    teleportedTo?: string
    npcCharmed?: boolean
    enemyBanished?: boolean
    companionSummoned?: string
  }

  // Cooldown set
  cooldownSet: number

  // Narration
  narration: string
}

// =============================================================================
// SPELL BOOK (Player's known spells)
// =============================================================================

export interface SpellBook {
  spells: Spell[]
  favorites: string[] // Quick-access spell IDs
  recentlyCast: string[] // Last 5 spells cast
  cooldowns: Record<string, number> // spellId -> turns remaining
}

export function createEmptySpellBook(): SpellBook {
  return {
    spells: [],
    favorites: [],
    recentlyCast: [],
    cooldowns: {},
  }
}

// =============================================================================
// SPELL CREATION & VALIDATION
// =============================================================================

export function createSpell(
  partial: Partial<Spell> & {
    name: string
    school: SpellSchool
    effectType: SpellEffectType
    usageContext: SpellUsageContext
    targetType: SpellTargetType
  }
): Spell {
  return {
    id: generateEntityId("spell"),
    entityType: "ability",
    description: partial.description ?? `A ${partial.school} spell.`,

    // Defaults
    resourceCost: partial.resourceCost ?? 10,
    resourceType: partial.resourceType ?? "mana",
    cooldown: partial.cooldown ?? 0,
    requiresTarget: partial.requiresTarget ?? (partial.targetType !== "self"),
    levelRequired: partial.levelRequired ?? 1,
    powerLevel: partial.powerLevel ?? 3,
    rarity: partial.rarity ?? "common",
    tags: partial.tags ?? [partial.school, partial.effectType],

    ...partial,
  }
}

/**
 * Validates a spell against game constraints
 */
export function validateSpell(spell: Spell): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Power level bounds
  if (spell.powerLevel < 1 || spell.powerLevel > 10) {
    issues.push(`Power level ${spell.powerLevel} out of bounds (1-10)`)
  }

  // Cost validation
  if (spell.resourceCost < 0) {
    issues.push("Resource cost cannot be negative")
  }

  // Damage spells must have damage defined
  if (spell.effectType === "damage" && !spell.damage) {
    issues.push("Damage spells must define damage")
  }

  // Heal spells must have healing defined
  if (spell.effectType === "heal" && !spell.healing) {
    issues.push("Heal spells must define healing")
  }

  // Utility spells must have utility effect
  if (spell.effectType === "utility" && !spell.utilityEffect) {
    issues.push("Utility spells must define utilityEffect")
  }

  // Combat-only spells shouldn't have exploration utilities
  if (spell.usageContext === "combat_only" && spell.utilityEffect) {
    const explorationUtils = ["reveal_traps", "reveal_secrets", "identify", "transmute_gold", "scry"]
    if (explorationUtils.includes(spell.utilityEffect.type)) {
      issues.push(`Combat-only spell has exploration utility: ${spell.utilityEffect.type}`)
    }
  }

  return { valid: issues.length === 0, issues }
}

// =============================================================================
// SPELL EXECUTION
// =============================================================================

export function canCastSpell(
  player: Player,
  spell: Spell,
  spellBook: SpellBook,
  context: { inCombat: boolean; hasTarget: boolean; targetType?: string }
): { canCast: boolean; reason?: string } {
  // Check if spell is known
  if (!spellBook.spells.find(s => s.id === spell.id)) {
    return { canCast: false, reason: "You don't know this spell" }
  }

  // Check cooldown
  const cooldownRemaining = spellBook.cooldowns[spell.id] || 0
  if (cooldownRemaining > 0) {
    return { canCast: false, reason: `On cooldown (${cooldownRemaining} turns)` }
  }

  // Check resource
  if (player.resources.current < spell.resourceCost) {
    return { canCast: false, reason: `Not enough ${spell.resourceType} (need ${spell.resourceCost})` }
  }

  // Check health cost
  if (spell.healthCost && player.stats.health <= spell.healthCost) {
    return { canCast: false, reason: `Not enough health (need ${spell.healthCost})` }
  }

  // Check level
  if (player.stats.level < spell.levelRequired) {
    return { canCast: false, reason: `Requires level ${spell.levelRequired}` }
  }

  // Check usage context
  switch (spell.usageContext) {
    case "combat_only":
      if (!context.inCombat) {
        return { canCast: false, reason: "Can only be cast in combat" }
      }
      break
    case "exploration":
      if (context.inCombat) {
        return { canCast: false, reason: "Cannot be cast in combat" }
      }
      break
    case "targeted":
      if (spell.requiresTarget && !context.hasTarget) {
        return { canCast: false, reason: "Requires a target" }
      }
      break
    // "anytime" always allowed
  }

  // Check target type matches
  if (spell.requiresTarget && context.targetType) {
    const validTargets: Record<SpellTargetType, string[]> = {
      self: ["self"],
      enemy: ["enemy"],
      ally: ["ally", "companion"],
      all_enemies: ["enemy"],
      all_allies: ["self", "ally", "companion"],
      item: ["item"],
      npc: ["npc"],
      environment: ["environment", "room"],
      location: ["location"],
    }
    if (!validTargets[spell.targetType].includes(context.targetType)) {
      return { canCast: false, reason: `Invalid target type for this spell` }
    }
  }

  return { canCast: true }
}

export function calculateSpellDamage(
  player: Player,
  spell: Spell,
  target?: Enemy
): { damage: number; isCritical: boolean } {
  if (!spell.damage) return { damage: 0, isCritical: false }

  let damage = spell.damage.base

  // Apply scaling
  if (spell.damage.scaling) {
    const statValue =
      spell.damage.scaling.stat === "intelligence"
        ? player.stats.intelligence
        : spell.damage.scaling.stat === "attack"
          ? player.stats.attack
          : player.stats.level
    damage += Math.floor(statValue * spell.damage.scaling.ratio)
  }

  // Apply target defense (if applicable)
  if (target) {
    damage = Math.max(1, damage - Math.floor(target.defense * 0.3))
  }

  // Critical hit check (spells have lower base crit than attacks)
  const critChance = player.stats.critChance * 0.5
  const isCritical = Math.random() < critChance
  if (isCritical) {
    damage = Math.floor(damage * 1.5)
  }

  return { damage, isCritical }
}

export function calculateSpellHealing(player: Player, spell: Spell): number {
  if (!spell.healing) return 0

  let healing = spell.healing.base

  // Apply scaling
  if (spell.healing.scaling) {
    const statValue =
      spell.healing.scaling.stat === "intelligence"
        ? player.stats.intelligence
        : spell.healing.scaling.stat === "level"
          ? player.stats.level
          : player.stats.maxHealth
    healing += Math.floor(statValue * spell.healing.scaling.ratio)
  }

  // Cap at max health
  const maxHeal = player.stats.maxHealth - player.stats.health
  return Math.min(healing, maxHeal)
}

// =============================================================================
// SPELL LEARNING
// =============================================================================

export interface LearnSpellResult {
  success: boolean
  reason?: string
  spell?: Spell
  narration: string
}

export function canLearnSpell(
  player: Player,
  spell: Spell,
  spellBook: SpellBook
): { canLearn: boolean; reason?: string } {
  // Already known
  if (spellBook.spells.find(s => s.id === spell.id || s.name === spell.name)) {
    return { canLearn: false, reason: "You already know this spell" }
  }

  // Level requirement
  if (player.stats.level < spell.levelRequired) {
    return { canLearn: false, reason: `Requires level ${spell.levelRequired}` }
  }

  // Prerequisites
  if (spell.prerequisites) {
    // Check required spells
    if (spell.prerequisites.spells) {
      for (const reqSpell of spell.prerequisites.spells) {
        if (!spellBook.spells.find(s => s.id === reqSpell || s.name === reqSpell)) {
          return { canLearn: false, reason: `Requires knowing: ${reqSpell}` }
        }
      }
    }

    // Check stats
    if (spell.prerequisites.stats) {
      for (const req of spell.prerequisites.stats) {
        const playerStat = player.stats[req.stat as keyof typeof player.stats]
        if (typeof playerStat === "number" && playerStat < req.minimum) {
          return { canLearn: false, reason: `Requires ${req.stat} ${req.minimum}` }
        }
      }
    }

    // Check class
    if (spell.prerequisites.class && player.class) {
      if (!spell.prerequisites.class.includes(player.class)) {
        return { canLearn: false, reason: `Requires class: ${spell.prerequisites.class.join(" or ")}` }
      }
    }
  }

  return { canLearn: true }
}

export function learnSpell(
  player: Player,
  spell: Spell,
  spellBook: SpellBook,
  source: SpellSource,
  sourceId?: string
): LearnSpellResult {
  const check = canLearnSpell(player, spell, spellBook)
  if (!check.canLearn) {
    return {
      success: false,
      reason: check.reason,
      narration: `You cannot learn ${spell.name}. ${check.reason}`,
    }
  }

  // Create learned copy with source info
  const learnedSpell: Spell = {
    ...spell,
    id: generateEntityId("spell"),
    source,
    sourceId,
    learnedAt: Date.now(),
  }

  // Add to spellbook
  spellBook.spells.push(learnedSpell)

  return {
    success: true,
    spell: learnedSpell,
    narration: spell.castNarration
      ? `You study the arcane text... ${spell.name} is now etched in your mind!`
      : `You have learned ${spell.name}!`,
  }
}

// =============================================================================
// SPELL TICK (COOLDOWNS)
// =============================================================================

export function tickSpellCooldowns(spellBook: SpellBook): SpellBook {
  const newCooldowns: Record<string, number> = {}

  for (const [spellId, turns] of Object.entries(spellBook.cooldowns)) {
    if (turns > 1) {
      newCooldowns[spellId] = turns - 1
    }
  }

  return { ...spellBook, cooldowns: newCooldowns }
}

// =============================================================================
// PREDEFINED SPELL TEMPLATES
// =============================================================================

export const SPELL_TEMPLATES: Record<string, Partial<Spell> & { name: string }> = {
  // === FIRE SCHOOL ===
  spark: {
    name: "Spark",
    school: "fire",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 5,
    resourceType: "mana",
    cooldown: 0,
    damage: { base: 8, scaling: { stat: "intelligence", ratio: 0.5 }, type: "fire" },
    levelRequired: 1,
    powerLevel: 2,
    rarity: "common",
    description: "A small burst of flame.",
    incantation: "Ignis!",
    tags: ["fire", "damage", "basic"],
  },

  fireball: {
    name: "Fireball",
    school: "fire",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 2,
    damage: { base: 25, scaling: { stat: "intelligence", ratio: 1.2 }, type: "fire" },
    aoeRadius: 1,
    levelRequired: 3,
    powerLevel: 5,
    rarity: "uncommon",
    description: "A classic ball of explosive fire.",
    incantation: "Ignis Magnus!",
    castNarration: "You conjure a roiling sphere of flame...",
    successNarration: "The fireball explodes in a brilliant blaze!",
    tags: ["fire", "damage", "aoe"],
  },

  immolate: {
    name: "Immolate",
    school: "fire",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 15,
    resourceType: "mana",
    cooldown: 1,
    damage: { base: 10, type: "fire" },
    appliesEffects: [
      createStatusEffect({
        name: "Burning",
        effectType: "debuff",
        duration: 3,
        modifiers: { healthRegen: -5 },
        description: "Wreathed in flames.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 2,
    powerLevel: 4,
    rarity: "uncommon",
    description: "Set an enemy ablaze, dealing damage over time.",
    tags: ["fire", "damage", "dot"],
  },

  // === ICE SCHOOL ===
  frostbolt: {
    name: "Frostbolt",
    school: "ice",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 8,
    resourceType: "mana",
    cooldown: 0,
    damage: { base: 10, scaling: { stat: "intelligence", ratio: 0.6 }, type: "ice" },
    appliesEffects: [
      createStatusEffect({
        name: "Chilled",
        effectType: "debuff",
        duration: 2,
        modifiers: { attack: -2 },
        description: "Slowed by cold.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 1,
    powerLevel: 3,
    rarity: "common",
    description: "A bolt of freezing ice that slows the target.",
    tags: ["ice", "damage", "slow"],
  },

  ice_barrier: {
    name: "Ice Barrier",
    school: "ice",
    effectType: "buff",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 4,
    appliesEffects: [
      createStatusEffect({
        name: "Ice Barrier",
        effectType: "buff",
        duration: 3,
        modifiers: { defense: 8 },
        description: "Encased in protective ice.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 2,
    powerLevel: 4,
    rarity: "uncommon",
    description: "Surround yourself with a barrier of ice.",
    tags: ["ice", "buff", "defensive"],
  },

  // === HOLY SCHOOL ===
  lesser_heal: {
    name: "Lesser Heal",
    school: "holy",
    effectType: "heal",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 15,
    resourceType: "mana",
    cooldown: 1,
    healing: { base: 20, scaling: { stat: "intelligence", ratio: 0.8 } },
    levelRequired: 1,
    powerLevel: 3,
    rarity: "common",
    description: "A basic healing spell.",
    incantation: "Lux Sana!",
    tags: ["holy", "heal", "basic"],
  },

  smite: {
    name: "Smite",
    school: "holy",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 12,
    resourceType: "mana",
    cooldown: 0,
    damage: { base: 15, scaling: { stat: "intelligence", ratio: 0.7 }, type: "holy" },
    levelRequired: 1,
    powerLevel: 3,
    rarity: "common",
    description: "Strike with divine radiance.",
    tags: ["holy", "damage"],
  },

  bless: {
    name: "Bless",
    school: "holy",
    effectType: "buff",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 18,
    resourceType: "mana",
    cooldown: 5,
    appliesEffects: [
      createStatusEffect({
        name: "Blessed",
        effectType: "buff",
        duration: 5,
        modifiers: { attack: 3, defense: 2 },
        description: "Divine favor strengthens you.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 2,
    powerLevel: 4,
    rarity: "uncommon",
    description: "Call upon divine favor for protection.",
    tags: ["holy", "buff"],
  },

  // === SHADOW SCHOOL ===
  shadow_bolt: {
    name: "Shadow Bolt",
    school: "shadow",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 10,
    resourceType: "mana",
    cooldown: 0,
    damage: { base: 12, scaling: { stat: "intelligence", ratio: 0.8 }, type: "shadow" },
    levelRequired: 1,
    powerLevel: 3,
    rarity: "common",
    description: "A bolt of dark energy.",
    tags: ["shadow", "damage"],
  },

  life_drain: {
    name: "Life Drain",
    school: "shadow",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 18,
    resourceType: "mana",
    cooldown: 2,
    damage: { base: 15, type: "shadow" },
    healing: { base: 10 },
    levelRequired: 3,
    powerLevel: 5,
    rarity: "uncommon",
    description: "Drain life from your enemy to heal yourself.",
    tags: ["shadow", "damage", "lifesteal"],
  },

  curse_of_weakness: {
    name: "Curse of Weakness",
    school: "shadow",
    effectType: "debuff",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 12,
    resourceType: "mana",
    cooldown: 3,
    appliesEffects: [
      createStatusEffect({
        name: "Weakened",
        effectType: "debuff",
        duration: 4,
        modifiers: { attack: -4, defense: -2 },
        description: "Dark magic saps strength.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 2,
    powerLevel: 4,
    rarity: "uncommon",
    description: "Weaken an enemy with dark magic.",
    tags: ["shadow", "debuff", "curse"],
  },

  // === ARCANE SCHOOL ===
  arcane_missile: {
    name: "Arcane Missiles",
    school: "arcane",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 12,
    resourceType: "mana",
    cooldown: 0,
    damage: { base: 12, scaling: { stat: "intelligence", ratio: 0.9 }, type: "arcane" },
    levelRequired: 1,
    powerLevel: 3,
    rarity: "common",
    description: "Bolts of pure arcane energy that never miss.",
    tags: ["arcane", "damage", "reliable"],
  },

  mana_shield: {
    name: "Mana Shield",
    school: "arcane",
    effectType: "buff",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 25,
    resourceType: "mana",
    cooldown: 5,
    appliesEffects: [
      createStatusEffect({
        name: "Mana Shield",
        effectType: "buff",
        duration: 4,
        modifiers: { defense: 10 },
        description: "Mana forms a protective barrier.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 3,
    powerLevel: 5,
    rarity: "uncommon",
    description: "Convert mana into a protective shield.",
    tags: ["arcane", "buff", "defensive"],
  },

  // === UTILITY SPELLS ===
  light: {
    name: "Light",
    school: "universal",
    effectType: "utility",
    usageContext: "exploration",
    targetType: "environment",
    resourceCost: 5,
    resourceType: "mana",
    cooldown: 0,
    requiresTarget: false,
    utilityEffect: { type: "light", duration: 10 },
    levelRequired: 1,
    powerLevel: 1,
    rarity: "common",
    description: "Create a floating light source.",
    incantation: "Lux!",
    tags: ["universal", "utility", "light"],
  },

  detect_traps: {
    name: "Detect Traps",
    school: "arcane",
    effectType: "utility",
    usageContext: "exploration",
    targetType: "environment",
    resourceCost: 10,
    resourceType: "mana",
    cooldown: 3,
    requiresTarget: false,
    utilityEffect: { type: "reveal_traps", value: 3 },
    levelRequired: 2,
    powerLevel: 3,
    rarity: "uncommon",
    description: "Reveal hidden traps in the area.",
    tags: ["arcane", "utility", "detection"],
  },

  identify: {
    name: "Identify",
    school: "arcane",
    effectType: "utility",
    usageContext: "anytime",
    targetType: "item",
    resourceCost: 15,
    resourceType: "mana",
    cooldown: 0,
    utilityEffect: { type: "identify" },
    levelRequired: 2,
    powerLevel: 3,
    rarity: "uncommon",
    description: "Reveal the true nature of an item.",
    tags: ["arcane", "utility", "identification"],
  },

  // === TRANSMUTATION SCHOOL ===
  transmute_gold: {
    name: "Transmute to Gold",
    school: "transmutation",
    effectType: "transmute",
    usageContext: "exploration",
    targetType: "item",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 5,
    utilityEffect: { type: "transmute_gold", value: 150 }, // Percentage of item value
    levelRequired: 4,
    powerLevel: 5,
    rarity: "rare",
    description: "Convert an item into gold coins.",
    incantation: "Aurum Transmuta!",
    tags: ["transmutation", "utility", "gold"],
  },

  unlock: {
    name: "Knock",
    school: "transmutation",
    effectType: "utility",
    usageContext: "exploration",
    targetType: "environment",
    resourceCost: 15,
    resourceType: "mana",
    cooldown: 2,
    utilityEffect: { type: "unlock" },
    levelRequired: 3,
    powerLevel: 4,
    rarity: "uncommon",
    description: "Magically unlock doors and chests.",
    incantation: "Aperi!",
    tags: ["transmutation", "utility", "unlock"],
  },

  // === ENCHANTMENT SCHOOL ===
  charm_person: {
    name: "Charm",
    school: "enchantment",
    effectType: "control",
    usageContext: "targeted",
    targetType: "npc",
    resourceCost: 25,
    resourceType: "mana",
    cooldown: 10,
    utilityEffect: { type: "charm", duration: 5 },
    levelRequired: 4,
    powerLevel: 6,
    rarity: "rare",
    description: "Make an NPC temporarily friendly.",
    tags: ["enchantment", "control", "social"],
  },

  fear: {
    name: "Fear",
    school: "enchantment",
    effectType: "control",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 18,
    resourceType: "mana",
    cooldown: 4,
    utilityEffect: { type: "fear", duration: 2 },
    appliesEffects: [
      createStatusEffect({
        name: "Terrified",
        effectType: "debuff",
        duration: 2,
        modifiers: { attack: -5, defense: -3 },
        description: "Paralyzed with fear.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 3,
    powerLevel: 5,
    rarity: "uncommon",
    description: "Strike terror into your enemy's heart.",
    tags: ["enchantment", "control", "debuff"],
  },

  // === BLOOD MAGIC ===
  blood_sacrifice: {
    name: "Blood Sacrifice",
    school: "blood",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 0,
    resourceType: "mana",
    healthCost: 15,
    cooldown: 2,
    damage: { base: 35, type: "shadow" },
    levelRequired: 4,
    powerLevel: 6,
    rarity: "rare",
    description: "Sacrifice your own blood for devastating damage.",
    tags: ["blood", "damage", "sacrifice"],
  },

  // === TEMPORAL MAGIC ===
  haste: {
    name: "Haste",
    school: "temporal",
    effectType: "buff",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 30,
    resourceType: "mana",
    cooldown: 6,
    appliesEffects: [
      createStatusEffect({
        name: "Hasted",
        effectType: "buff",
        duration: 3,
        modifiers: { attack: 4, dodgeChance: 0.15 },
        description: "Time moves slower around you.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 5,
    powerLevel: 6,
    rarity: "rare",
    description: "Accelerate your personal time.",
    tags: ["temporal", "buff", "speed"],
  },

  // === VOID MAGIC ===
  banish: {
    name: "Banish",
    school: "void",
    effectType: "utility",
    usageContext: "combat_only",
    targetType: "enemy",
    resourceCost: 40,
    resourceType: "mana",
    cooldown: 8,
    utilityEffect: { type: "banish" },
    levelRequired: 6,
    powerLevel: 8,
    rarity: "rare",
    description: "Cast an enemy into the void, removing them from combat.",
    tags: ["void", "utility", "removal"],
  },

  // === NATURE MAGIC ===
  regenerate: {
    name: "Regenerate",
    school: "nature",
    effectType: "heal",
    usageContext: "anytime",
    targetType: "self",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 3,
    appliesEffects: [
      createStatusEffect({
        name: "Regenerating",
        effectType: "buff",
        duration: 5,
        modifiers: { healthRegen: 5 },
        description: "Wounds knit together rapidly.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 3,
    powerLevel: 5,
    rarity: "uncommon",
    description: "Grant rapid healing over time.",
    tags: ["nature", "heal", "hot"],
  },

  poison_cloud: {
    name: "Poison Cloud",
    school: "nature",
    effectType: "damage",
    usageContext: "combat_only",
    targetType: "all_enemies",
    resourceCost: 22,
    resourceType: "mana",
    cooldown: 3,
    damage: { base: 8, type: "poison" },
    appliesEffects: [
      createStatusEffect({
        name: "Poisoned",
        effectType: "debuff",
        duration: 4,
        modifiers: { healthRegen: -3 },
        description: "Toxic vapors seep in.",
        sourceType: "ability",
      }),
    ],
    levelRequired: 4,
    powerLevel: 5,
    rarity: "uncommon",
    description: "Create a cloud of toxic gas.",
    aoeRadius: 2,
    tags: ["nature", "damage", "poison", "aoe"],
  },

  // === SUMMONING ===
  summon_familiar: {
    name: "Summon Familiar",
    school: "spirit",
    effectType: "summon",
    usageContext: "exploration",
    targetType: "self",
    resourceCost: 35,
    resourceType: "mana",
    cooldown: 10,
    utilityEffect: { type: "summon_companion", duration: 10 },
    levelRequired: 5,
    powerLevel: 6,
    rarity: "rare",
    description: "Summon a spirit familiar to aid you.",
    tags: ["spirit", "summon", "companion"],
  },
}

// =============================================================================
// SPELL GENERATION FOR AI
// =============================================================================

export interface SpellGenerationConstraints {
  maxPowerLevel: number
  allowedSchools: SpellSchool[]
  allowedContexts: SpellUsageContext[]
  allowedEffects: SpellEffectType[]
  maxResourceCost: number
  maxCooldown: number
  playerLevel: number
  dungeonTheme?: string
  source: SpellSource
}

export const SPELL_CONSTRAINTS_BY_SOURCE: Record<SpellSource, Partial<SpellGenerationConstraints>> = {
  tome: {
    maxPowerLevel: 8,
    allowedSchools: ["fire", "ice", "lightning", "arcane", "shadow", "holy", "nature"],
    maxResourceCost: 50,
  },
  scroll_study: {
    maxPowerLevel: 6,
    allowedSchools: ["fire", "ice", "arcane", "transmutation"],
    maxResourceCost: 35,
  },
  shrine: {
    maxPowerLevel: 7,
    allowedSchools: ["holy", "nature", "spirit", "void"],
    allowedEffects: ["buff", "heal", "utility"],
  },
  npc: {
    maxPowerLevel: 6,
    maxResourceCost: 40,
  },
  event: {
    maxPowerLevel: 7,
    allowedSchools: ["arcane", "shadow", "void", "blood"],
  },
  discovery: {
    maxPowerLevel: 5,
    allowedEffects: ["utility", "buff"],
    allowedSchools: ["universal", "arcane", "transmutation"],
  },
  quest: {
    maxPowerLevel: 9,
    // No restrictions - quest rewards can be powerful
  },
  innate: {
    maxPowerLevel: 4,
    allowedSchools: ["universal", "nature", "spirit"],
    maxResourceCost: 20,
  },
  curse: {
    maxPowerLevel: 8,
    allowedSchools: ["shadow", "blood", "void"],
    allowedEffects: ["damage", "debuff"],
  },
  artifact: {
    maxPowerLevel: 10,
    // Artifact-bound spells can be very powerful
  },
}

export function generateSpellPrompt(constraints: SpellGenerationConstraints): string {
  return `Generate a spell for a dungeon crawler RPG.

CONSTRAINTS:
- Power Level: 1-${constraints.maxPowerLevel}
- Schools: ${constraints.allowedSchools?.join(", ") || "any"}
- Usage Contexts: ${constraints.allowedContexts?.join(", ") || "any"}
- Effect Types: ${constraints.allowedEffects?.join(", ") || "any"}
- Max Resource Cost: ${constraints.maxResourceCost || 50}
- Player Level: ${constraints.playerLevel}
- Source: ${constraints.source}
${constraints.dungeonTheme ? `- Dungeon Theme: ${constraints.dungeonTheme}` : ""}

SPELL STRUCTURE:
- name: Creative, evocative name
- school: Magical school (${["fire", "ice", "lightning", "holy", "shadow", "arcane", "nature", "transmutation", "enchantment", "blood", "void", "temporal", "spirit", "universal"].join(", ")})
- effectType: What it does (damage, heal, buff, debuff, summon, utility, transmute, control, ward)
- usageContext: When usable (combat_only, exploration, anytime, targeted)
- targetType: What it targets (self, enemy, ally, all_enemies, all_allies, item, npc, environment, location)
- resourceCost: Mana/energy cost
- damage/healing: If applicable, base value and scaling
- appliesEffects: Status effects to apply
- utilityEffect: For utility spells, what it does
- description: Flavor text
- incantation: Optional spoken words
- castNarration: What happens when cast
- tags: Keywords for combos and AI context

Be creative but balanced within the power level.`
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getSpellsBySchool(school: SpellSchool): Spell[] {
  return Object.values(SPELL_TEMPLATES)
    .filter((t) => t.school === school)
    .map((t) =>
      createSpell({
        ...t,
        school: t.school!,
        effectType: t.effectType!,
        usageContext: t.usageContext!,
        targetType: t.targetType!,
      })
    )
}

export function getSpellsByContext(context: SpellUsageContext): Spell[] {
  return Object.values(SPELL_TEMPLATES)
    .filter((t) => t.usageContext === context)
    .map((t) =>
      createSpell({
        ...t,
        school: t.school!,
        effectType: t.effectType!,
        usageContext: t.usageContext!,
        targetType: t.targetType!,
      })
    )
}

export function getSpellFromTemplate(templateId: string): Spell | null {
  const template = SPELL_TEMPLATES[templateId]
  if (!template) return null

  return createSpell({
    ...template,
    school: template.school!,
    effectType: template.effectType!,
    usageContext: template.usageContext!,
    targetType: template.targetType!,
  })
}
