/**
 * Game Mechanics Ledger - Capability Registry
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SINGLE SOURCE OF TRUTH FOR GAME ENGINE CAPABILITIES                     │
 * │                                                                         │
 * │ This file defines what the game engine CAN PROCESS.                     │
 * │ AI generates effects using these primitives as building blocks.         │
 * │                                                                         │
 * │ The engine interprets effect metadata - AI has creative freedom         │
 * │ within these bounds. Any combination of valid primitives works.         │
 * │                                                                         │
 * │ TO ADD NEW CAPABILITY:                                                  │
 * │ 1. Add to appropriate array below                                       │
 * │ 2. Wire up processing in effect-system.ts or combat-system.ts           │
 * │ 3. AI automatically gains access to the new primitive                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// EFFECT ENGINE CAPABILITIES
// These are the atomic building blocks AI can combine into effects
// =============================================================================

/**
 * Effect triggers - WHEN effects activate
 * Processed by processEffectTrigger() in effect-system.ts
 */
export const EFFECT_TRIGGERS = [
  "passive",           // Always active while effect exists
  "turn_start",        // Start of each turn
  "turn_end",          // End of each turn
  "on_attack",         // When player attacks
  "on_defend",         // When player defends/blocks
  "on_damage_taken",   // When player takes damage
  "on_damage_dealt",   // When player deals damage
  "on_kill",           // When player kills an enemy
  "on_heal",           // When player is healed
  "on_room_enter",     // When entering a new room
  "on_combat_start",   // When combat begins
  "on_combat_end",     // When combat ends
  "on_critical_hit",   // When player lands a critical hit
] as const

/**
 * Effect categories - WHAT TYPE of effect it is
 * Determines how the effect is processed
 */
export const EFFECT_CATEGORIES = [
  "damage_over_time",   // Deals damage each tick (burning, bleeding, poison)
  "heal_over_time",     // Heals each tick (regeneration)
  "stat_modifier",      // Modifies stats while active (+attack, +defense)
  "damage_modifier",    // Modifies damage dealt/taken
  "resistance",         // Reduces damage from specific types
  "vulnerability",      // Increases damage from specific types
  "control",            // Stun, slow, blind, etc.
  "utility",            // Gold find, exp boost, etc.
  "triggered",          // Has sub-effects that fire on conditions
  "transformation",     // Changes player state (form, abilities)
  "aura",               // Affects nearby entities
  "compound",           // Multiple effect types combined
] as const

/**
 * Duration types - HOW LONG effects last
 */
export const DURATION_TYPES = [
  "turns",        // Lasts N turns
  "actions",      // Lasts N player actions
  "rooms",        // Lasts N room transitions
  "hits",         // Lasts N times triggered
  "permanent",    // Until explicitly removed
  "conditional",  // Until condition met (AI defines condition)
] as const

/**
 * Stacking behaviors - WHAT HAPPENS when effect reapplied
 */
export const STACK_BEHAVIORS = [
  "none",         // Refreshes duration only
  "duration",     // Adds to duration
  "intensity",    // Increases power (stack count)
  "independent",  // Creates separate instance
] as const

/**
 * Stat modifiers - WHAT STATS effects can modify
 * Applied in calculateEffectiveStats() in entity-system.ts
 */
export const STAT_MODIFIERS = [
  "attack",           // Flat attack bonus
  "defense",          // Flat defense bonus
  "maxHealth",        // Max HP bonus
  "healthRegen",      // HP per turn (negative = damage)
  "critChance",       // Critical hit chance (0-1)
  "critDamage",       // Critical damage multiplier
  "dodgeChance",      // Chance to avoid damage (0-1)
  "goldMultiplier",   // Gold find multiplier
  "expMultiplier",    // Experience multiplier
  "damageMultiplier", // Outgoing damage multiplier
  "damageTaken",      // Incoming damage multiplier
] as const

/**
 * Damage types - elemental/physical damage categories
 * Used for weakness/resistance calculations
 */
export const DAMAGE_TYPES = [
  "physical",
  "fire",
  "ice",
  "lightning",
  "shadow",
  "holy",
  "poison",
  "arcane",
] as const

// =============================================================================
// ITEM CAPABILITIES
// =============================================================================

/**
 * Item types the game recognizes
 */
export const ITEM_TYPES = [
  "weapon",
  "armor",
  "trinket",
  "consumable",
  "material",
  "key",
  "quest",
] as const

/**
 * Weapon subtypes
 */
export const WEAPON_SUBTYPES = [
  "sword", "axe", "mace", "dagger", "spear", "bow", "crossbow",
  "staff", "wand", "flail", "hammer", "scythe", "claws",
] as const

/**
 * Armor subtypes
 */
export const ARMOR_SUBTYPES = [
  "cloth", "leather", "chainmail", "plate", "robes", "hide",
] as const

/**
 * Consumable subtypes
 */
export const CONSUMABLE_SUBTYPES = [
  "potion", "elixir", "food", "scroll", "bomb", "salve",
] as const

/**
 * Rarities and their power scaling
 */
export const RARITIES = {
  common: { statMultiplier: 1.0, maxEffects: 0, effectChance: 0 },
  uncommon: { statMultiplier: 1.2, maxEffects: 1, effectChance: 0.3 },
  rare: { statMultiplier: 1.5, maxEffects: 2, effectChance: 0.6 },
  legendary: { statMultiplier: 2.0, maxEffects: 3, effectChance: 1.0 },
} as const

// =============================================================================
// CONSTRAINT SYSTEM
// Defines power bounds by source - AI must stay within these
// =============================================================================

export const EFFECT_CONSTRAINTS = {
  /** Common items - weak, short, no stacking */
  common_item: {
    maxPower: 2,
    maxDuration: 3,
    maxStacks: 1,
    allowedCategories: ["stat_modifier", "utility"] as const,
    forbiddenTriggers: ["on_kill", "on_critical_hit"] as const,
  },

  /** Uncommon items - moderate effects */
  uncommon_item: {
    maxPower: 4,
    maxDuration: 5,
    maxStacks: 2,
    allowedCategories: ["stat_modifier", "utility", "damage_modifier", "heal_over_time"] as const,
    forbiddenTriggers: [] as const,
  },

  /** Rare items - strong effects, can trigger */
  rare_item: {
    maxPower: 6,
    maxDuration: 8,
    maxStacks: 3,
    allowedCategories: EFFECT_CATEGORIES,
    forbiddenTriggers: [] as const,
  },

  /** Legendary items - powerful, unique effects */
  legendary_item: {
    maxPower: 10,
    maxDuration: -1, // Can be permanent
    maxStacks: 5,
    allowedCategories: EFFECT_CATEGORIES,
    forbiddenTriggers: [] as const,
  },

  /** Enemy attacks - debuffs and damage */
  enemy_attack: {
    maxPower: 5,
    maxDuration: 4,
    maxStacks: 3,
    allowedCategories: ["damage_over_time", "stat_modifier", "control", "vulnerability"] as const,
    forbiddenTriggers: ["on_kill"] as const,
  },

  /** Shrine blessings - varied power */
  shrine: {
    maxPower: 7,
    maxDuration: 10,
    maxStacks: 1,
    allowedCategories: EFFECT_CATEGORIES,
    forbiddenTriggers: [] as const,
  },

  /** Curses - nasty long-lasting effects */
  curse: {
    maxPower: 6,
    maxDuration: -1, // Often permanent until cured
    maxStacks: 1,
    allowedCategories: ["damage_over_time", "stat_modifier", "vulnerability", "control"] as const,
    forbiddenTriggers: [] as const,
  },

  /** Environmental hazards */
  environmental: {
    maxPower: 4,
    maxDuration: 0, // Room-based duration
    maxStacks: 1,
    allowedCategories: ["damage_over_time", "stat_modifier", "control"] as const,
    forbiddenTriggers: ["on_kill", "on_combat_end"] as const,
  },

  /** Crafted items - scales with material tier */
  crafted: {
    maxPower: 8, // Tier-dependent
    maxDuration: 10,
    maxStacks: 3,
    allowedCategories: EFFECT_CATEGORIES,
    forbiddenTriggers: [] as const,
  },
} as const

// =============================================================================
// PROMPT GENERATION
// =============================================================================

/**
 * Generates comprehensive prompt describing what effects AI can create.
 * Used by API routes for item/effect generation.
 */
export function generateMechanicsPrompt(): string {
  return `EFFECT SYSTEM CAPABILITIES:
You can create effects using these building blocks. Combine them creatively.

TRIGGERS (when effects activate):
${EFFECT_TRIGGERS.map(t => `• ${t}`).join("\n")}

CATEGORIES (effect types):
${EFFECT_CATEGORIES.map(c => `• ${c}`).join("\n")}

STAT MODIFIERS (what can be changed):
${STAT_MODIFIERS.map(s => `• ${s}`).join("\n")}

DAMAGE TYPES:
${DAMAGE_TYPES.join(", ")}

DURATION TYPES: ${DURATION_TYPES.join(", ")}
STACKING: ${STACK_BEHAVIORS.join(", ")}

EFFECT STRUCTURE:
Items can grant effects with:
- category: The effect type
- triggers: When it activates (can be multiple)
- modifiers: Stat changes (attack, defense, healthRegen, etc.)
- duration/durationType: How long it lasts
- stackBehavior: What happens on reapplication
- triggeredEffects: Sub-effects that fire on specific triggers

EXAMPLES OF VALID EFFECTS:
✓ "Grants +5 attack while equipped" (stat_modifier, passive, attack: 5)
✓ "Burns for 3 damage per turn for 3 turns" (damage_over_time, turn_end, healthRegen: -3, duration: 3)
✓ "On critical hit, gain 2 health" (triggered, on_critical_hit, heal: 2)
✓ "When hit, 30% chance to reflect 5 damage" (triggered, on_damage_taken, chance: 0.3, damage: 5)
✓ "Increases gold found by 20%" (utility, passive, goldMultiplier: 1.2)

CONSTRAINTS:
- Power scales with rarity (common=weak, legendary=strong)
- Effects must use defined triggers and modifiers
- Be creative with combinations, but stay within the system`
}

/**
 * Generates crafting-specific mechanics prompt
 */
export function generateCraftingMechanicsPrompt(): string {
  return `CRAFTED ITEM MECHANICS:
Crafted items can have effects based on materials used.

MATERIAL TIER → EFFECT POWER:
• Tier 1: Basic stats only (+1-2)
• Tier 2: Minor effects (duration 2-3)
• Tier 3: Moderate effects, can have triggers
• Tier 4: Strong effects, multiple modifiers
• Tier 5: Powerful effects, complex triggers

ELEMENTAL MATERIALS:
Fire materials → fire damage type, can grant burn effects (damage_over_time)
Ice materials → ice damage type, can grant slow effects
Lightning materials → lightning damage type, can grant stun triggers
Shadow materials → shadow damage type, can grant lifesteal triggers
Holy materials → holy damage type, can grant healing triggers

CRAFTED EFFECT RULES:
✓ Effects must match material properties
✓ Combining materials can create compound effects
✓ Quality affects effect power within tier bounds
✓ Higher tier = more complex triggers allowed`
}

/**
 * Generates status effect prompt for consumables/abilities
 */
export function generateStatusEffectPrompt(): string {
  const buffs = ["attack boost", "defense boost", "health regen", "crit chance", "damage multiplier"]
  const debuffs = ["attack reduction", "defense reduction", "damage over time", "slow", "vulnerability"]

  return `STATUS EFFECT RULES:
Valid buff types: ${buffs.join(", ")}
Valid debuff types: ${debuffs.join(", ")}

Effects must have:
- Duration in turns (or durationType for special cases)
- Clear modifier values (+X attack, -Y defense, etc.)
- Stack behavior (refresh, stack duration, or stack intensity)

Effects CAN:
- Trigger on specific events (on_attack, on_damage_taken, etc.)
- Have sub-effects that fire conditionally
- Stack up to defined limits
- Be permanent (for curses/blessings)

Effects use the standard modifier system:
${STAT_MODIFIERS.map(s => `• ${s}`).join("\n")}`
}

/**
 * Short hint for schema .describe() fields
 */
export function getMechanicsHint(): string {
  return "Describe the effect using valid triggers (on_attack, turn_end, etc.) and modifiers (attack, defense, healthRegen). Be creative within the effect system."
}

/**
 * Get constraint set for a source type
 */
export function getConstraints(source: keyof typeof EFFECT_CONSTRAINTS) {
  return EFFECT_CONSTRAINTS[source]
}

/**
 * Validate an effect against constraints
 */
export function validateEffect(
  effect: { power?: number; duration?: number; stacks?: number; category?: string; trigger?: string },
  source: keyof typeof EFFECT_CONSTRAINTS,
): { valid: boolean; violations: string[] } {
  const constraints = EFFECT_CONSTRAINTS[source]
  const violations: string[] = []

  if (effect.power && effect.power > constraints.maxPower) {
    violations.push(`Power ${effect.power} exceeds max ${constraints.maxPower} for ${source}`)
  }

  if (effect.duration && constraints.maxDuration > 0 && effect.duration > constraints.maxDuration) {
    violations.push(`Duration ${effect.duration} exceeds max ${constraints.maxDuration} for ${source}`)
  }

  if (effect.stacks && effect.stacks > constraints.maxStacks) {
    violations.push(`Stacks ${effect.stacks} exceeds max ${constraints.maxStacks} for ${source}`)
  }

  if (effect.category && !(constraints.allowedCategories as readonly string[]).includes(effect.category)) {
    violations.push(`Category "${effect.category}" not allowed for ${source}`)
  }

  if (effect.trigger && (constraints.forbiddenTriggers as readonly string[]).includes(effect.trigger)) {
    violations.push(`Trigger "${effect.trigger}" forbidden for ${source}`)
  }

  return { valid: violations.length === 0, violations }
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type EffectTrigger = typeof EFFECT_TRIGGERS[number]
export type EffectCategory = typeof EFFECT_CATEGORIES[number]
export type DurationType = typeof DURATION_TYPES[number]
export type StackBehavior = typeof STACK_BEHAVIORS[number]
export type StatModifier = typeof STAT_MODIFIERS[number]
export type DamageType = typeof DAMAGE_TYPES[number]
export type ItemType = typeof ITEM_TYPES[number]
export type Rarity = keyof typeof RARITIES
export type ConstraintSource = keyof typeof EFFECT_CONSTRAINTS

// Re-export for backwards compatibility with existing imports
export const WEAPON_MECHANICS = {
  damageTypes: DAMAGE_TYPES,
  statBonuses: ["attack", "defense", "health", "critChance", "critDamage"] as const,
} as const

export const getDamageTypes = () => DAMAGE_TYPES
