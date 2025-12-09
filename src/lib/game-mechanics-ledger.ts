/**
 * Game Mechanics Ledger
 *
 * Single source of truth for what game mechanics actually exist.
 * AI prompts reference this to generate truthful item descriptions.
 *
 * When you add new mechanics (e.g., on-hit effects), update this file
 * and the AI will automatically know about them.
 */

// =============================================================================
// WEAPON MECHANICS
// =============================================================================

export const WEAPON_MECHANICS = {
  /**
   * Damage types affect effectiveness against enemies with weaknesses/resistances.
   * Weakness = 1.5x damage, Resistance = 0.5x damage
   */
  damageTypes: [
    "physical",
    "fire",
    "ice",
    "lightning",
    "shadow",
    "holy",
    "poison",
    "arcane",
  ] as const,

  /**
   * Stat bonuses that weapons can provide
   */
  statBonuses: [
    "attack",
    "defense",
    "health",
    "critChance",
    "critDamage",
  ] as const,

  /**
   * Weapon properties from profiles
   */
  weaponProperties: [
    "attackSpeed",  // slow/normal/fast - affects ability cooldowns
    "range",        // melee/ranged/magic
    "twoHanded",    // boolean
  ] as const,

  /**
   * ON-HIT EFFECTS - Currently NOT implemented
   * When these are added, move them to implementedOnHitEffects
   */
  notImplementedOnHitEffects: [
    "burn on hit",
    "freeze on hit",
    "poison on hit",
    "X damage on critical hit",
    "proc chance effects",
    "lifesteal",
    "mana steal",
    "chance to stun",
    "chance to bleed",
  ] as const,

  /**
   * ON-HIT EFFECTS - Currently implemented
   * Add effects here as they get implemented in combat-system.ts
   */
  implementedOnHitEffects: [] as const,
} as const

// =============================================================================
// ARMOR MECHANICS
// =============================================================================

export const ARMOR_MECHANICS = {
  statBonuses: [
    "defense",
    "health",
    "dodge",
    "resistance",
  ] as const,

  /**
   * Damage resistances - reduce damage from specific types
   */
  resistances: WEAPON_MECHANICS.damageTypes,

  notImplementedEffects: [
    "thorns damage",
    "damage reflection",
    "on-hit-taken effects",
  ] as const,

  implementedEffects: [] as const,
} as const

// =============================================================================
// CONSUMABLE MECHANICS
// =============================================================================

export const CONSUMABLE_MECHANICS = {
  /**
   * Effects consumables can have
   */
  implementedEffects: [
    "heal HP",
    "restore resource",
    "apply buff (temporary stat boost)",
    "cure debuff",
    "deal damage to enemies",
    "reveal map/secrets",
  ] as const,

  /**
   * Status effects that can be applied
   */
  statusEffects: {
    buffs: [
      "attack boost",
      "defense boost",
      "health regen",
      "crit chance boost",
      "damage type boost",
    ],
    debuffs: [
      "attack reduction",
      "defense reduction",
      "damage over time",
      "slow",
    ],
  },
} as const

// =============================================================================
// TRINKET/MISC MECHANICS
// =============================================================================

export const TRINKET_MECHANICS = {
  /**
   * Passive stat bonuses
   */
  statBonuses: [
    "attack",
    "defense",
    "health",
    "critChance",
    "critDamage",
    "goldFind",
    "expBonus",
  ] as const,

  /**
   * Trinkets currently cannot have active effects
   */
  notImplementedEffects: [
    "on-kill effects",
    "on-room-enter effects",
    "activated abilities",
  ] as const,

  implementedEffects: [] as const,
} as const

// =============================================================================
// SET BONUS MECHANICS
// =============================================================================

export const SET_MECHANICS = {
  implementedBonuses: [
    "flat stat bonuses (attack, defense, health)",
    "percentage damage bonuses by type",
    "percentage resistances by type",
  ] as const,

  notImplementedBonuses: [
    "proc effects",
    "on-kill bonuses",
    "activated set abilities",
  ] as const,
} as const

// =============================================================================
// AI PROMPT GENERATION
// =============================================================================

/**
 * Generates the "truthful effects" section for AI prompts.
 * Call this in your API routes to get up-to-date mechanics info.
 */
export function generateMechanicsPrompt(): string {
  const implemented = {
    weaponDamageTypes: WEAPON_MECHANICS.damageTypes.join(", "),
    weaponStats: WEAPON_MECHANICS.statBonuses.join(", "),
    weaponOnHit: WEAPON_MECHANICS.implementedOnHitEffects.length > 0
      ? WEAPON_MECHANICS.implementedOnHitEffects.join(", ")
      : "NONE",
    armorStats: ARMOR_MECHANICS.statBonuses.join(", "),
  }

  const notImplemented = [
    ...WEAPON_MECHANICS.notImplementedOnHitEffects,
  ]

  return `IMPORTANT - TRUTHFUL ITEM EFFECTS:
Only describe effects that actually exist in the game.

IMPLEMENTED (describe these):
✓ Weapon damage types: ${implemented.weaponDamageTypes}
  → These affect damage vs enemy weaknesses/resistances (1.5x/0.5x)
✓ Weapon stat bonuses: ${implemented.weaponStats}
✓ Armor stat bonuses: ${implemented.armorStats}
${implemented.weaponOnHit !== "NONE" ? `✓ On-hit effects: ${implemented.weaponOnHit}` : ""}

NOT IMPLEMENTED (do NOT claim these):
${notImplemented.map(e => `✗ "${e}"`).join("\n")}

Examples:
GOOD: "A blade wreathed in shadow, dealing shadow damage effective against holy creatures"
GOOD: "Grants +5 attack and +10% critical chance"
BAD: "Burns enemies for 3 fire damage on critical hits" (on-hit effects don't exist)
BAD: "15% chance to freeze on hit" (proc effects don't exist)`
}

/**
 * Shorter version for schema descriptions
 */
export function getMechanicsHint(): string {
  return "Appearance/damage type only - do NOT claim on-hit effects, procs, or triggers (not implemented)"
}

/**
 * Get valid damage types for schema enums
 */
export function getDamageTypes() {
  return WEAPON_MECHANICS.damageTypes
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DamageType = typeof WEAPON_MECHANICS.damageTypes[number]
export type WeaponStat = typeof WEAPON_MECHANICS.statBonuses[number]
export type ArmorStat = typeof ARMOR_MECHANICS.statBonuses[number]
