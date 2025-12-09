/**
 * Game Mechanics Ledger
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SINGLE SOURCE OF TRUTH FOR GAME MECHANICS                               │
 * │                                                                         │
 * │ This file defines what game mechanics ACTUALLY exist vs what DON'T.     │
 * │ AI prompts reference this to generate truthful descriptions.            │
 * │                                                                         │
 * │ WHEN YOU IMPLEMENT A NEW MECHANIC:                                      │
 * │ 1. Add it to the appropriate "implemented" array                        │
 * │ 2. Remove it from the "notImplemented" array                            │
 * │ 3. AI will automatically start allowing those descriptions              │
 * └─────────────────────────────────────────────────────────────────────────┘
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
   * Weapon properties from profiles (item-generator.ts)
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
    "execute at low HP",
    "bonus damage vs type",
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
    "auto-heal when hit",
    "damage absorption shields",
  ] as const,

  implementedEffects: [] as const,
} as const

// =============================================================================
// CONSUMABLE MECHANICS
// =============================================================================

export const CONSUMABLE_MECHANICS = {
  /**
   * Effects consumables CAN have (implemented)
   */
  implementedEffects: [
    "heal HP (immediate)",
    "restore resource/mana",
    "apply temporary buff (stat boost with duration)",
    "cure/remove debuffs",
    "deal immediate damage",
    "reveal hidden things",
  ] as const,

  /**
   * Effects consumables CANNOT have (not implemented)
   */
  notImplementedEffects: [
    "permanent stat increases",
    "learn new abilities",
    "summon creatures",
    "teleportation",
  ] as const,

  /**
   * Status effects that CAN be applied via consumables
   */
  implementedStatusEffects: {
    buffs: [
      "attack boost (flat or %)",
      "defense boost (flat or %)",
      "health regen per turn",
      "crit chance boost",
      "damage type effectiveness boost",
    ] as const,
    debuffs: [
      "attack reduction",
      "defense reduction",
      "damage over time (poison, burn, bleed)",
      "slow (reduced actions)",
    ] as const,
  },
} as const

// =============================================================================
// TRINKET/ACCESSORY MECHANICS
// =============================================================================

export const TRINKET_MECHANICS = {
  /**
   * Passive stat bonuses trinkets CAN provide
   */
  implementedBonuses: [
    "attack",
    "defense",
    "health",
    "critChance",
    "critDamage",
    "goldFind",
    "expBonus",
  ] as const,

  /**
   * Effects trinkets CANNOT have
   */
  notImplementedEffects: [
    "on-kill effects",
    "on-room-enter effects",
    "activated abilities",
    "aura effects on allies",
    "auto-cast spells",
  ] as const,

  implementedActiveEffects: [] as const,
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
    "proc effects on set completion",
    "on-kill bonuses",
    "activated set abilities",
    "transform effects",
  ] as const,
} as const

// =============================================================================
// CRAFTING/ALCHEMY MECHANICS
// =============================================================================

export const CRAFTING_MECHANICS = {
  /**
   * What alchemy/crafting CAN produce
   */
  implementedOutputs: [
    "consumables (potions, elixirs, bombs)",
    "materials (refined from raw)",
    "basic equipment with stats",
  ] as const,

  /**
   * What alchemy/crafting CANNOT produce
   */
  notImplementedOutputs: [
    "items with on-hit effects",
    "items with proc chances",
    "legendary items with unique abilities",
    "items that cast spells",
  ] as const,

  /**
   * Crafted item stats should follow these rules
   */
  craftedItemRules: [
    "Stats scale with material tier (1-5)",
    "Quality affects stat values (crude to pristine)",
    "Elemental materials give damage type, not on-hit burns",
  ] as const,
} as const

// =============================================================================
// ABILITY/SKILL MECHANICS
// =============================================================================

export const ABILITY_MECHANICS = {
  /**
   * What player abilities CAN do
   */
  implementedEffects: [
    "deal damage (with damage type)",
    "apply status effects to target",
    "heal self or allies",
    "buff self or allies (temporary)",
    "debuff enemies (temporary)",
    "change combat stance",
  ] as const,

  /**
   * Ability costs
   */
  implementedCosts: [
    "resource cost (mana, energy, rage, etc.)",
    "cooldown in turns",
    "health cost",
  ] as const,

  /**
   * What abilities CANNOT do
   */
  notImplementedEffects: [
    "permanent stat changes",
    "instant kill effects",
    "summon persistent creatures",
    "modify the dungeon",
  ] as const,
} as const

// =============================================================================
// ENEMY MECHANICS
// =============================================================================

export const ENEMY_MECHANICS = {
  /**
   * What enemies CAN have
   */
  implementedTraits: [
    "weakness to damage type (take 1.5x)",
    "resistance to damage type (take 0.5x)",
    "abilities with cooldowns",
    "special attacks with warnings",
    "death drops (gold, items)",
  ] as const,

  /**
   * What enemies CANNOT have
   */
  notImplementedTraits: [
    "damage reflection",
    "instant kill attacks",
    "resurrection after death",
    "spawning additional enemies mid-combat",
  ] as const,
} as const

// =============================================================================
// AI PROMPT GENERATION - CORE FUNCTIONS
// =============================================================================

/**
 * Generates the full "truthful effects" section for AI prompts.
 * Use this in API routes that generate items/equipment.
 */
export function generateMechanicsPrompt(): string {
  const weaponDamageTypes = WEAPON_MECHANICS.damageTypes.join(", ")
  const weaponStats = WEAPON_MECHANICS.statBonuses.join(", ")
  const armorStats = ARMOR_MECHANICS.statBonuses.join(", ")
  const hasOnHit = WEAPON_MECHANICS.implementedOnHitEffects.length > 0
  const onHitEffects = hasOnHit
    ? WEAPON_MECHANICS.implementedOnHitEffects.join(", ")
    : null

  const notImplemented = [
    ...WEAPON_MECHANICS.notImplementedOnHitEffects,
    ...ARMOR_MECHANICS.notImplementedEffects,
  ]

  return `IMPORTANT - TRUTHFUL ITEM EFFECTS:
Only describe effects that actually exist in the game.

IMPLEMENTED (you CAN describe these):
✓ Weapon damage types: ${weaponDamageTypes}
  → These affect damage vs enemy weaknesses/resistances (1.5x/0.5x)
✓ Weapon stat bonuses: ${weaponStats}
✓ Armor stat bonuses: ${armorStats}
✓ Consumables: heal, buff, debuff, cure, damage
${onHitEffects ? `✓ On-hit effects: ${onHitEffects}` : ""}

NOT IMPLEMENTED (do NOT claim these):
${notImplemented.slice(0, 8).map(e => `✗ "${e}"`).join("\n")}

Examples of GOOD descriptions:
- "A blade wreathed in shadow, dealing shadow damage effective against holy creatures"
- "Grants +5 attack and +10% critical chance"
- "Armor imbued with fire resistance"

Examples of BAD descriptions (these mechanics don't exist):
- "Burns enemies for 3 fire damage on critical hits"
- "15% chance to freeze on hit"
- "Steals 10% of damage dealt as health"
- "Reflects 20% of damage taken back to attacker"`
}

/**
 * Generates mechanics prompt specifically for crafted/alchemical items
 */
export function generateCraftingMechanicsPrompt(): string {
  return `CRAFTED ITEM MECHANICS:
Crafted items follow these rules:

CAN HAVE:
${CRAFTING_MECHANICS.implementedOutputs.map(e => `✓ ${e}`).join("\n")}
${CRAFTING_MECHANICS.craftedItemRules.map(e => `✓ ${e}`).join("\n")}

CANNOT HAVE:
${CRAFTING_MECHANICS.notImplementedOutputs.map(e => `✗ ${e}`).join("\n")}

When materials have elemental tags (fire, ice, etc.):
- They grant that DAMAGE TYPE, not on-hit effects
- "Fire essence" → weapon deals fire damage, NOT "burns on hit"
- "Frost crystal" → weapon deals ice damage, NOT "freezes on hit"`
}

/**
 * Generates prompt section for status effects
 */
export function generateStatusEffectPrompt(): string {
  const buffs = CONSUMABLE_MECHANICS.implementedStatusEffects.buffs.join(", ")
  const debuffs = CONSUMABLE_MECHANICS.implementedStatusEffects.debuffs.join(", ")

  return `STATUS EFFECT RULES:
Valid buff types: ${buffs}
Valid debuff types: ${debuffs}

Effects must have:
- Duration in turns (1-10 typically)
- Clear modifier values (+X attack, -Y defense, etc.)
- Stack behavior (does it stack? refresh? independent?)

Effects CANNOT:
- Be permanent (max ~10 turns for powerful effects)
- Instantly kill or incapacitate
- Create other entities
- Modify the dungeon layout`
}

/**
 * Shorter version for Zod schema .describe() fields
 */
export function getMechanicsHint(): string {
  return "Describe appearance and damage type only. Do NOT claim on-hit effects, procs, lifesteal, or triggers (not implemented)"
}

/**
 * Even shorter hint for nested schema fields
 */
export function getShortMechanicsHint(): string {
  return "No on-hit/proc effects"
}

/**
 * Get valid damage types for schema enums
 */
export function getDamageTypes() {
  return WEAPON_MECHANICS.damageTypes
}

/**
 * Check if a described effect is valid
 * Returns { valid: boolean, reason?: string }
 */
export function validateEffectDescription(description: string): { valid: boolean; reason?: string } {
  const lowerDesc = description.toLowerCase()

  const invalidPatterns = [
    { pattern: /\d+%?\s*(chance|proc)/i, reason: "Proc chance effects not implemented" },
    { pattern: /on (hit|strike|attack)/i, reason: "On-hit effects not implemented" },
    { pattern: /lifesteal|life steal/i, reason: "Lifesteal not implemented" },
    { pattern: /mana steal/i, reason: "Mana steal not implemented" },
    { pattern: /reflects? (damage|back)/i, reason: "Damage reflection not implemented" },
    { pattern: /stun(s|ning)? (on|chance)/i, reason: "Stun-on-hit not implemented" },
    { pattern: /bleed(s|ing)? (on|chance)/i, reason: "Bleed-on-hit not implemented" },
    { pattern: /burn(s|ing)? (enemies|on|for \d)/i, reason: "Burn-on-hit not implemented" },
    { pattern: /freeze(s|ing)? (enemies|on|chance)/i, reason: "Freeze-on-hit not implemented" },
    { pattern: /poison(s|ing)? (enemies|on)/i, reason: "Poison-on-hit not implemented" },
  ]

  for (const { pattern, reason } of invalidPatterns) {
    if (pattern.test(lowerDesc)) {
      return { valid: false, reason }
    }
  }

  return { valid: true }
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DamageType = typeof WEAPON_MECHANICS.damageTypes[number]
export type WeaponStat = typeof WEAPON_MECHANICS.statBonuses[number]
export type ArmorStat = typeof ARMOR_MECHANICS.statBonuses[number]
export type ConsumableEffect = typeof CONSUMABLE_MECHANICS.implementedEffects[number]
