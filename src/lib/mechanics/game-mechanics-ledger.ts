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
  "passive", // Always active while effect exists
  "turn_start", // Start of each turn
  "turn_end", // End of each turn
  "on_attack", // When player attacks
  "on_defend", // When player defends/blocks
  "on_damage_taken", // When player takes damage
  "on_damage_dealt", // When player deals damage
  "on_kill", // When player kills an enemy
  "on_heal", // When player is healed
  "on_room_enter", // When entering a new room
  "on_combat_start", // When combat begins
  "on_combat_end", // When combat ends
  "on_critical_hit", // When player lands a critical hit
] as const;

/**
 * Effect categories - WHAT TYPE of effect it is
 * Determines how the effect is processed
 */
export const EFFECT_CATEGORIES = [
  "damage_over_time", // Deals damage each tick (burning, bleeding, poison)
  "heal_over_time", // Heals each tick (regeneration)
  "stat_modifier", // Modifies stats while active (+attack, +defense)
  "damage_modifier", // Modifies damage dealt/taken
  "resistance", // Reduces damage from specific types
  "vulnerability", // Increases damage from specific types
  "control", // Stun, slow, blind, etc.
  "utility", // Gold find, exp boost, etc.
  "triggered", // Has sub-effects that fire on conditions
  "transformation", // Changes player state (form, abilities)
  "aura", // Affects nearby entities
  "compound", // Multiple effect types combined
] as const;

/**
 * Duration types - HOW LONG effects last
 */
export const DURATION_TYPES = [
  "turns", // Lasts N turns
  "actions", // Lasts N player actions
  "rooms", // Lasts N room transitions
  "hits", // Lasts N times triggered
  "permanent", // Until explicitly removed
  "conditional", // Until condition met (AI defines condition)
] as const;

/**
 * Stacking behaviors - WHAT HAPPENS when effect reapplied
 */
export const STACK_BEHAVIORS = [
  "none", // Refreshes duration only
  "duration", // Adds to duration
  "intensity", // Increases power (stack count)
  "independent", // Creates separate instance
] as const;

/**
 * Stat modifiers - WHAT STATS effects can modify
 * Applied in calculateEffectiveStats() in entity-system.ts
 */
export const STAT_MODIFIERS = [
  "attack", // Flat attack bonus
  "defense", // Flat defense bonus
  "maxHealth", // Max HP bonus
  "healthRegen", // HP per turn (negative = damage)
  "critChance", // Critical hit chance (0-1)
  "critDamage", // Critical damage multiplier
  "dodgeChance", // Chance to avoid damage (0-1)
  "goldMultiplier", // Gold find multiplier
  "expMultiplier", // Experience multiplier
  "damageMultiplier", // Outgoing damage multiplier
  "damageTaken", // Incoming damage multiplier
] as const;

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
] as const;

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
] as const;

/**
 * Weapon subtypes
 */
export const WEAPON_SUBTYPES = [
  "sword",
  "axe",
  "mace",
  "dagger",
  "spear",
  "bow",
  "crossbow",
  "staff",
  "wand",
  "flail",
  "hammer",
  "scythe",
  "claws",
] as const;

/**
 * Armor subtypes
 */
export const ARMOR_SUBTYPES = [
  "cloth",
  "leather",
  "chainmail",
  "plate",
  "robes",
  "hide",
] as const;

/**
 * Consumable subtypes
 */
export const CONSUMABLE_SUBTYPES = [
  "potion",
  "elixir",
  "food",
  "scroll",
  "bomb",
  "salve",
] as const;

/**
 * Rarities and their power scaling
 */
export const RARITIES = {
  common: { statMultiplier: 1.0, maxEffects: 0, effectChance: 0 },
  uncommon: { statMultiplier: 1.2, maxEffects: 1, effectChance: 0.3 },
  rare: { statMultiplier: 1.5, maxEffects: 2, effectChance: 0.6 },
  legendary: { statMultiplier: 2.0, maxEffects: 3, effectChance: 1.0 },
} as const;

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
    allowedCategories: [
      "stat_modifier",
      "utility",
      "damage_modifier",
      "heal_over_time",
    ] as const,
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
    allowedCategories: [
      "damage_over_time",
      "stat_modifier",
      "control",
      "vulnerability",
    ] as const,
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
    allowedCategories: [
      "damage_over_time",
      "stat_modifier",
      "vulnerability",
      "control",
    ] as const,
    forbiddenTriggers: [] as const,
  },

  /** Environmental hazards */
  environmental: {
    maxPower: 4,
    maxDuration: 0, // Room-based duration
    maxStacks: 1,
    allowedCategories: [
      "damage_over_time",
      "stat_modifier",
      "control",
    ] as const,
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
} as const;

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
${EFFECT_TRIGGERS.map((t) => `• ${t}`).join("\n")}

CATEGORIES (effect types):
${EFFECT_CATEGORIES.map((c) => `• ${c}`).join("\n")}

STAT MODIFIERS (what can be changed):
${STAT_MODIFIERS.map((s) => `• ${s}`).join("\n")}

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
- Be creative with combinations, but stay within the system`;
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
✓ Higher tier = more complex triggers allowed`;
}

/**
 * Generates status effect prompt for consumables/abilities
 */
export function generateStatusEffectPrompt(): string {
  const buffs = [
    "attack boost",
    "defense boost",
    "health regen",
    "crit chance",
    "damage multiplier",
  ];
  const debuffs = [
    "attack reduction",
    "defense reduction",
    "damage over time",
    "slow",
    "vulnerability",
  ];

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
${STAT_MODIFIERS.map((s) => `• ${s}`).join("\n")}`;
}

/**
 * Short hint for schema .describe() fields
 */
export function getMechanicsHint(): string {
  return "Describe the effect using valid triggers (on_attack, turn_end, etc.) and modifiers (attack, defense, healthRegen). Be creative within the effect system.";
}

/**
 * Get constraint set for a source type
 */
export function getConstraints(source: keyof typeof EFFECT_CONSTRAINTS) {
  return EFFECT_CONSTRAINTS[source];
}

/**
 * Validate an effect against constraints
 */
export function validateEffect(
  effect: {
    power?: number;
    duration?: number;
    stacks?: number;
    category?: string;
    trigger?: string;
  },
  source: keyof typeof EFFECT_CONSTRAINTS,
): { valid: boolean; violations: string[] } {
  const constraints = EFFECT_CONSTRAINTS[source];
  const violations: string[] = [];

  if (effect.power && effect.power > constraints.maxPower) {
    violations.push(
      `Power ${effect.power} exceeds max ${constraints.maxPower} for ${source}`,
    );
  }

  if (
    effect.duration &&
    constraints.maxDuration > 0 &&
    effect.duration > constraints.maxDuration
  ) {
    violations.push(
      `Duration ${effect.duration} exceeds max ${constraints.maxDuration} for ${source}`,
    );
  }

  if (effect.stacks && effect.stacks > constraints.maxStacks) {
    violations.push(
      `Stacks ${effect.stacks} exceeds max ${constraints.maxStacks} for ${source}`,
    );
  }

  if (
    effect.category &&
    !(constraints.allowedCategories as readonly string[]).includes(
      effect.category,
    )
  ) {
    violations.push(`Category "${effect.category}" not allowed for ${source}`);
  }

  if (
    effect.trigger &&
    (constraints.forbiddenTriggers as readonly string[]).includes(
      effect.trigger,
    )
  ) {
    violations.push(`Trigger "${effect.trigger}" forbidden for ${source}`);
  }

  return { valid: violations.length === 0, violations };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type EffectTrigger = (typeof EFFECT_TRIGGERS)[number];
export type EffectCategory = (typeof EFFECT_CATEGORIES)[number];
export type DurationType = (typeof DURATION_TYPES)[number];
export type StackBehavior = (typeof STACK_BEHAVIORS)[number];
export type StatModifier = (typeof STAT_MODIFIERS)[number];
export type DamageType = (typeof DAMAGE_TYPES)[number];
export type ItemType = (typeof ITEM_TYPES)[number];
export type Rarity = keyof typeof RARITIES;
export type ConstraintSource = keyof typeof EFFECT_CONSTRAINTS;

// Re-export for backwards compatibility with existing imports
export const WEAPON_MECHANICS = {
  damageTypes: DAMAGE_TYPES,
  statBonuses: [
    "attack",
    "defense",
    "health",
    "critChance",
    "critDamage",
  ] as const,
} as const;

export const getDamageTypes = () => DAMAGE_TYPES;

// =============================================================================
// ECONOMY CONSTANTS
// Centralized gold and value calculations for AI-generated content
// =============================================================================

/**
 * Gold drop ranges by quality tier
 * Used by treasure generation, monster drops, etc.
 */
export const GOLD_RANGES = {
  common: { min: 10, max: 50 },
  uncommon: { min: 30, max: 100 },
  rare: { min: 50, max: 200 },
  epic: { min: 150, max: 400 },
  legendary: { min: 200, max: 500 },
} as const;

/**
 * Rarity value multipliers for item valuation
 */
export const RARITY_VALUE_MULTIPLIERS = {
  common: 1,
  uncommon: 2.5,
  rare: 6,
  epic: 10,
  legendary: 15,
} as const;

/**
 * Item type base values for valuation
 */
export const TYPE_BASE_VALUES = {
  weapon: 25,
  armor: 30,
  trinket: 35,
  consumable: 15,
  material: 10,
  gold: 1,
  key: 50,
  tool: 20,
  quest: 0,
} as const;

/**
 * Calculate item value based on rarity and type
 */
export function calculateItemValue(
  rarity: keyof typeof RARITY_VALUE_MULTIPLIERS,
  type: keyof typeof TYPE_BASE_VALUES,
): number {
  return Math.floor(TYPE_BASE_VALUES[type] * RARITY_VALUE_MULTIPLIERS[rarity]);
}

// =============================================================================
// GAME PROGRESSION CONSTANTS
// Level scaling, floor bonuses, and skill ranges
// =============================================================================

/**
 * Stat scaling by floor range
 * Defines min/max stat bonuses for items found on each floor tier
 */
export const FLOOR_STAT_SCALING = {
  early: { floors: [1, 3], statRange: [5, 10] },
  mid: { floors: [4, 6], statRange: [10, 15] },
  late: { floors: [7, Infinity], statRange: [15, 25] },
} as const;

/**
 * Get stat range for a given floor
 */
export function getFloorStatRange(floor: number): { min: number; max: number } {
  if (floor <= 3) return { min: 5, max: 10 };
  if (floor <= 6) return { min: 10, max: 15 };
  return { min: 15, max: 25 };
}

/**
 * Floor bonus calculation for various mechanics
 * Used for rarity boosts, loot quality, etc.
 */
export const FLOOR_BONUS = {
  /** Base multiplier per floor */
  perFloor: 2,
  /** Maximum floor bonus cap */
  maxBonus: 20,
} as const;

/**
 * Calculate floor bonus (capped)
 */
export function calculateFloorBonus(floor: number): number {
  return Math.min(floor * FLOOR_BONUS.perFloor, FLOOR_BONUS.maxBonus);
}

/**
 * Skill/proficiency ranges
 */
export const SKILL_RANGES = {
  alchemy: { min: 1, max: 10 },
  lockpicking: { min: 1, max: 10 },
  perception: { min: 1, max: 10 },
} as const;

// =============================================================================
// GACHA/LOOT CONSTANTS
// Pity system, rarity distributions, and container mechanics
// =============================================================================

/**
 * Pity system configuration for bad luck protection
 */
export const PITY_SYSTEM = {
  /** Opens required before pity kicks in */
  opensThreshold: 5,
  /** Bonus percentage per open after threshold */
  bonusPerOpen: 5,
  /** Maximum pity bonus (10 opens * 5% = 50%) */
  maxBonus: 50,
} as const;

/**
 * Calculate pity bonus based on opens since last rare+ item
 */
export function calculatePityBonus(opensSinceRare: number): number {
  if (opensSinceRare <= PITY_SYSTEM.opensThreshold) return 0;
  const bonus =
    (opensSinceRare - PITY_SYSTEM.opensThreshold) * PITY_SYSTEM.bonusPerOpen;
  return Math.min(bonus, PITY_SYSTEM.maxBonus);
}

/**
 * Base rarity chances (percentage) before floor/pity bonuses
 */
export const BASE_RARITY_CHANCES = {
  legendary: 2,
  epic: 8,
  rare: 25,
  uncommon: 55,
  common: 100, // Fallback
} as const;

/**
 * Loot count ranges by container rarity
 */
export const CONTAINER_LOOT_COUNTS = {
  common: { min: 1, max: 2 },
  uncommon: { min: 2, max: 3 },
  rare: { min: 2, max: 4 },
  epic: { min: 3, max: 5 },
  legendary: { min: 4, max: 6 },
} as const;

/**
 * Rarity distribution for dungeon floor loot generation
 */
export function getFloorRarityDistribution(floor: number): {
  common: number;
  uncommon: number;
  rare: number;
  legendary: number;
} {
  return {
    common: Math.max(0, 60 - floor * 5),
    uncommon: 30 + floor * 2,
    rare: Math.min(25, 5 + floor * 2),
    legendary: Math.min(10, floor),
  };
}

/**
 * Trap chance for containers (percentage)
 */
export const CONTAINER_TRAP_CHANCE = 30;

// =============================================================================
// COMBAT CONSTANTS
// Critical thresholds, wound levels, damage calculations
// =============================================================================

/**
 * Health thresholds for combat mechanics
 */
export const HEALTH_THRESHOLDS = {
  /** Critical wound - below this percentage triggers special effects */
  criticalWound: 0.3,
  /** Low health warning threshold */
  lowHealth: 0.5,
  /** Full health threshold */
  fullHealth: 1.0,
} as const;

/**
 * Check if health percentage is at critical wound level
 */
export function isCriticalWound(
  currentHealth: number,
  maxHealth: number,
): boolean {
  return currentHealth / maxHealth <= HEALTH_THRESHOLDS.criticalWound;
}

/**
 * Combat stance modifiers
 */
export const STANCE_MODIFIERS = {
  aggressive: { damageMultiplier: 1.25, defenseMultiplier: 0.75 },
  defensive: { damageMultiplier: 0.75, defenseMultiplier: 1.25 },
  balanced: { damageMultiplier: 1.0, defenseMultiplier: 1.0 },
} as const;

// =============================================================================
// SOCIAL/NPC CONSTANTS
// Disposition ranges, health descriptors, NPC mechanics
// =============================================================================

/**
 * NPC disposition thresholds
 */
export const DISPOSITION_RANGES = {
  hostile: { max: 30 },
  neutral: { min: 30, max: 60 },
  friendly: { min: 60 },
} as const;

/**
 * Get disposition label from numeric value
 */
export function getDispositionLabel(
  disposition: number,
): "hostile" | "neutral" | "friendly" {
  if (disposition < DISPOSITION_RANGES.hostile.max) return "hostile";
  if (disposition < DISPOSITION_RANGES.neutral.max) return "neutral";
  return "friendly";
}

/**
 * Health descriptor thresholds (percentage of max health)
 */
export const HEALTH_DESCRIPTORS = {
  badlyWounded: { max: 30 },
  injured: { min: 30, max: 60 },
  healthy: { min: 60 },
} as const;

/**
 * Get health description from percentage
 */
export function getHealthDescriptor(
  healthPercent: number,
): "badly wounded" | "injured" | "healthy" {
  if (healthPercent < HEALTH_DESCRIPTORS.badlyWounded.max)
    return "badly wounded";
  if (healthPercent < HEALTH_DESCRIPTORS.injured.max) return "injured";
  return "healthy";
}

/**
 * NPC roles available in the game
 */
export const NPC_ROLES = [
  "merchant",
  "trapped",
  "mysterious",
  "quest_giver",
] as const;

// =============================================================================
// ENTITY SYSTEM CONSTANTS
// Environmental entities, classes, and tags for AI generation
// =============================================================================

/**
 * Entity classes for environmental objects
 */
export const ENTITY_CLASSES = [
  "object", // General interactive objects
  "substance", // Liquids, gases, materials
  "creature", // Living things
  "mechanism", // Traps, levers, mechanical devices
  "magical", // Magical phenomena
  "corpse", // Dead bodies, remains
  "container", // Chests, urns, bags
] as const;

/**
 * Entity tags for interaction hints
 */
export const ENTITY_TAGS = [
  "collectible", // Can be picked up
  "dangerous", // May cause harm
  "readable", // Has text/information
  "breakable", // Can be destroyed
  "consumable", // Can be consumed/used
  "tameable", // Can become companion
  "interactive", // Has special interaction
  "lootable", // Contains items
  "ancient", // Old/historical
  "magical", // Has magic properties
  "hidden", // Not immediately visible
  "trapped", // Has trap mechanism
  "valuable", // Worth gold
  "quest", // Related to quest
] as const;

// =============================================================================
// ENTITY IMPACT SYSTEM
// Defines REAL game state changes that interactions can produce
// Used to validate that options have mechanical impact (anti-theater)
// =============================================================================

/**
 * Entity impacts - ACTUAL game state changes the engine processes
 * These are the only real outcomes an interaction can produce.
 * If an option can't produce any of these, it's theater and should be filtered.
 */
export const ENTITY_IMPACTS = [
  // Resource changes
  "grant_gold",        // Add gold to player
  "grant_item",        // Add item to inventory
  "grant_xp",          // Add experience points
  "heal_player",       // Restore player HP
  "damage_player",     // Deal damage to player
  "consume_item",      // Remove item from inventory (item used)

  // Status effects
  "apply_buff",        // Apply positive status effect
  "apply_debuff",      // Apply negative status effect
  "remove_effect",     // Cleanse/remove status effect

  // Entity changes
  "consume_entity",    // Remove entity from room (used up)
  "transform_entity",  // Change entity into something else
  "spawn_entity",      // Create new environmental entity
  "add_to_inventory",  // Entity becomes inventory item

  // Combat triggers
  "spawn_enemy",       // Trigger combat encounter
  "spawn_companion",   // Create recruitable companion

  // World changes
  "reveal_secret",     // Unlock hidden content/path
  "trigger_trap",      // Activate trap mechanism
  "modify_environment",// Change room state

  // Permanent changes
  "modify_stat",       // Permanent stat increase/decrease
  "grant_ability",     // Learn new ability
  "advance_quest",     // Quest/story progression
] as const;

export type EntityImpact = (typeof ENTITY_IMPACTS)[number];

/**
 * Interaction actions and what impacts they CAN produce
 * Actions are verbs - what the player DOES to the entity
 */
export const ACTION_POTENTIAL_IMPACTS: Record<string, readonly EntityImpact[]> = {
  // Collection actions
  "collect": ["add_to_inventory", "consume_entity", "apply_buff", "apply_debuff"],
  "loot": ["grant_item", "grant_gold", "trigger_trap", "spawn_enemy", "consume_entity", "reveal_secret"],
  "take": ["grant_item", "add_to_inventory", "consume_entity", "trigger_trap"],

  // Examination actions (minimal but some impact possible)
  "examine": ["reveal_secret", "advance_quest", "apply_buff"], // Only if entity has hidden/quest tags
  "read": ["grant_xp", "advance_quest", "apply_buff", "apply_debuff", "reveal_secret"],

  // Physical interaction
  "touch": ["apply_buff", "apply_debuff", "damage_player", "heal_player", "trigger_trap", "transform_entity", "spawn_enemy"],
  "break": ["grant_item", "consume_entity", "spawn_enemy", "trigger_trap", "modify_environment"],
  "use_ability": ["consume_entity", "apply_buff", "remove_effect", "spawn_companion", "heal_player", "damage_player", "transform_entity"],

  // Consumption
  "consume": ["heal_player", "damage_player", "apply_buff", "apply_debuff", "modify_stat", "consume_entity"],
  "taste": ["apply_buff", "apply_debuff", "damage_player", "heal_player"],
  "drink": ["heal_player", "damage_player", "apply_buff", "apply_debuff", "modify_stat", "consume_entity"],

  // Item usage
  "use_item": ["consume_item", "apply_buff", "transform_entity", "spawn_companion", "trigger_trap", "heal_player"],

  // Creature interaction
  "tame": ["spawn_companion", "damage_player", "apply_debuff"],
  "feed": ["spawn_companion", "consume_item", "apply_buff"],
  "approach": ["spawn_companion", "spawn_enemy", "damage_player", "apply_debuff"],
} as const;

/**
 * Entity tags and what impacts they ENABLE
 * Tags describe entity properties - what the entity CAN provide
 */
export const TAG_ENABLED_IMPACTS: Record<string, readonly EntityImpact[]> = {
  // Core functional tags
  "lootable": ["grant_item", "grant_gold", "grant_xp", "reveal_secret"],
  "collectible": ["add_to_inventory", "consume_entity"],
  "consumable": ["heal_player", "damage_player", "apply_buff", "apply_debuff", "modify_stat", "consume_entity"],
  "breakable": ["consume_entity", "grant_item", "modify_environment", "trigger_trap"],
  "readable": ["grant_xp", "advance_quest", "reveal_secret", "apply_buff", "apply_debuff"],

  // Danger tags
  "dangerous": ["damage_player", "apply_debuff", "trigger_trap", "spawn_enemy"],
  "trapped": ["trigger_trap", "damage_player", "apply_debuff"],

  // Magical tags
  "magical": ["apply_buff", "apply_debuff", "heal_player", "damage_player", "transform_entity", "grant_ability", "modify_stat"],

  // Creature tags
  "tameable": ["spawn_companion"],

  // Discovery tags
  "hidden": ["reveal_secret", "grant_item", "advance_quest"],
  "valuable": ["grant_gold", "grant_item"],
  "quest": ["advance_quest", "grant_xp", "reveal_secret"],

  // Interactive tags
  "interactive": ["transform_entity", "spawn_entity", "modify_environment", "apply_buff", "apply_debuff"],
  "ancient": ["grant_xp", "reveal_secret", "apply_buff", "apply_debuff", "advance_quest"],
} as const;

/**
 * Check if an action on an entity with given tags can produce any real impact
 * Returns true if the interaction has at least one possible game state change
 *
 * @param action - The interaction action (e.g., "examine", "loot", "touch")
 * @param entityTags - The entity's interaction tags
 * @returns true if the action can have real impact, false if it's pure theater
 */
export function canInteractionHaveImpact(action: string, entityTags: readonly string[]): boolean {
  const actionImpacts = ACTION_POTENTIAL_IMPACTS[action];
  if (!actionImpacts || actionImpacts.length === 0) {
    // Unknown action - be conservative, allow it
    return true;
  }

  // Collect all impacts this entity enables via its tags
  const enabledImpacts = new Set<EntityImpact>();
  for (const tag of entityTags) {
    const tagImpacts = TAG_ENABLED_IMPACTS[tag];
    if (tagImpacts) {
      for (const impact of tagImpacts) {
        enabledImpacts.add(impact);
      }
    }
  }

  // If entity has no recognized tags, be conservative - allow interaction
  if (enabledImpacts.size === 0) {
    return true;
  }

  // Check if action can produce any impact that entity enables
  return actionImpacts.some(impact => enabledImpacts.has(impact));
}

/**
 * Get the possible impacts for an action on an entity
 * Returns the intersection of what the action CAN do and what the entity ENABLES
 *
 * @param action - The interaction action
 * @param entityTags - The entity's interaction tags
 * @returns Array of possible impacts, empty if no valid impacts
 */
export function getPossibleImpacts(action: string, entityTags: readonly string[]): EntityImpact[] {
  const actionImpacts = ACTION_POTENTIAL_IMPACTS[action];
  if (!actionImpacts) return [];

  const enabledImpacts = new Set<EntityImpact>();
  for (const tag of entityTags) {
    const tagImpacts = TAG_ENABLED_IMPACTS[tag];
    if (tagImpacts) {
      for (const impact of tagImpacts) {
        enabledImpacts.add(impact);
      }
    }
  }

  return actionImpacts.filter(impact => enabledImpacts.has(impact));
}

/**
 * Generate AI prompt for entity impact constraints
 * Tells AI what real impacts are possible for given entity/action
 */
export function generateImpactConstraintPrompt(action: string, entityTags: readonly string[]): string {
  const possibleImpacts = getPossibleImpacts(action, entityTags);

  if (possibleImpacts.length === 0) {
    return `WARNING: This action has NO valid mechanical impacts. The result MUST include at least one of: ${ENTITY_IMPACTS.slice(0, 5).join(", ")}, etc.`;
  }

  return `VALID IMPACTS for this interaction: ${possibleImpacts.join(", ")}.
The outcome MUST include at least one of these impacts. Do not generate pure narrative with no state change.`;
}

/**
 * Container types for loot generation
 */
export const CONTAINER_TYPES = [
  "chest",
  "coffer",
  "lockbox",
  "urn",
  "pouch",
  "satchel",
  "casket",
  "reliquary",
  "crate",
  "barrel",
] as const;

/**
 * Treasure container types with theming
 */
export const TREASURE_CONTAINER_TYPES = [
  "chest",
  "sarcophagus",
  "vault",
  "hidden_cache",
  "altar",
] as const;

/**
 * Generate entity embedding format instruction for AI
 */
export function getEntityEmbeddingFormat(): string {
  return `Embed interactive entities using {entity:NAME:CLASS:TAG1,TAG2} format.
Classes: ${ENTITY_CLASSES.join(", ")}
Tags: ${ENTITY_TAGS.join(", ")}`;
}

// =============================================================================
// DUNGEON CONSTANTS
// Themes, archetypes, and dungeon generation
// =============================================================================

/**
 * Dungeon theme archetypes
 */
export const DUNGEON_THEMES = [
  "ancient ruins",
  "cursed catacombs",
  "abandoned mines",
  "haunted castle",
  "infernal depths",
  "frozen caverns",
  "poisonous swamp",
  "shadow realm",
  "forgotten temple",
  "necropolis",
] as const;

/**
 * Default dungeon for fallback
 */
export const DEFAULT_DUNGEON = {
  name: "Depths of Shadowmire",
  theme: "cursed ancient dungeon",
} as const;

// =============================================================================
// MATERIAL SYSTEM CONSTANTS
// Quality levels, synergy rules, crafting mechanics
// =============================================================================

/**
 * Material quality levels (ordered lowest to highest)
 */
export const MATERIAL_QUALITIES = [
  "crude",
  "normal",
  "fine",
  "superior",
  "pristine",
] as const;

/**
 * Quality score bonuses for crafting calculations
 */
export const QUALITY_SCORES = {
  crude: -5,
  normal: 0,
  fine: 5,
  superior: 10,
  pristine: 20,
} as const;

/**
 * Material synergy bonuses (points added to crafting score)
 */
export const SYNERGY_BONUSES = {
  catalyst_present: 15,
  multiple_reagents: 10,
  healing_organic: 10,
  weapon_structural: 10,
} as const;

/**
 * Material conflict penalties (points subtracted from crafting score)
 */
export const CONFLICT_PENALTIES = {
  holy_dark: -20,
  fire_ice: -15,
  toxic_healing: -10,
} as const;

/**
 * Volatility levels for crafting
 */
export const VOLATILITY_LEVELS = [
  "stable",
  "reactive",
  "volatile",
  "explosive",
] as const;

/**
 * Material tier to effect power mapping
 */
export const MATERIAL_TIER_POWER = {
  1: { description: "Basic stats only (+1-2)", maxPower: 2 },
  2: { description: "Minor effects (duration 2-3)", maxPower: 3 },
  3: { description: "Moderate effects, can have triggers", maxPower: 5 },
  4: { description: "Strong effects, multiple modifiers", maxPower: 7 },
  5: { description: "Powerful effects, complex triggers", maxPower: 10 },
} as const;

// =============================================================================
// AI CONFIGURATION CONSTANTS
// Temperature settings, model configuration, retry settings
// =============================================================================

/**
 * AI temperature presets for different generation types
 */
export const AI_TEMPERATURES = {
  /** Names, descriptions, lore - high creativity */
  creative: 0.9,
  /** Combat narration, events - moderate creativity */
  narrative: 0.8,
  /** General entities - balanced */
  balanced: 0.75,
  /** Stats-heavy, deterministic content */
  structured: 0.6,
} as const;

/**
 * AI retry configuration
 */
export const AI_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Entity cache: more items, longer TTL */
  entity: { maxSize: 200, ttlMinutes: 60 },
  /** Narrative cache: fewer items, shorter TTL for freshness */
  narrative: { maxSize: 100, ttlMinutes: 15 },
} as const;

// =============================================================================
// EXTENDED PROMPT GENERATORS
// =============================================================================

/**
 * Generate economy-aware prompt for AI loot generation
 */
export function generateEconomyPrompt(): string {
  return `ECONOMY RULES:
Gold amounts by tier:
${Object.entries(GOLD_RANGES)
  .map(([tier, range]) => `• ${tier}: ${range.min}-${range.max} gold`)
  .join("\n")}

Item values scale with rarity (${Object.entries(RARITY_VALUE_MULTIPLIERS)
    .map(([r, m]) => `${r}=${m}x`)
    .join(", ")})`;
}

/**
 * Generate progression-aware prompt for floor-scaled content
 */
export function generateProgressionPrompt(floor: number): string {
  const statRange = getFloorStatRange(floor);
  const rarityDist = getFloorRarityDistribution(floor);

  return `FLOOR ${floor} SCALING:
Stat range: +${statRange.min} to +${statRange.max}
Rarity distribution: common=${rarityDist.common}%, uncommon=${rarityDist.uncommon}%, rare=${rarityDist.rare}%, legendary=${rarityDist.legendary}%`;
}

/**
 * Generate NPC context prompt
 */
export function generateNPCContextPrompt(
  disposition: number,
  healthPercent?: number,
): string {
  const dispositionLabel = getDispositionLabel(disposition);
  const healthLabel =
    healthPercent !== undefined ? getHealthDescriptor(healthPercent) : null;

  return `NPC CONTEXT:
Disposition: ${disposition}/100 (${dispositionLabel})
${healthLabel ? `Player appears ${healthLabel}` : ""}`;
}

/**
 * Generate entity system prompt for room descriptions
 */
export function generateEntitySystemPrompt(): string {
  return `ENTITY GENERATION:
${getEntityEmbeddingFormat()}

Make each entity feel like it could lead to interesting gameplay decisions.`;
}

/**
 * Generate material/crafting prompt
 */
export function generateMaterialPrompt(): string {
  return `MATERIAL SYSTEM:
Qualities: ${MATERIAL_QUALITIES.join(" < ")}
Quality bonuses: ${Object.entries(QUALITY_SCORES)
    .map(([q, s]) => `${q}=${s > 0 ? "+" : ""}${s}`)
    .join(", ")}

Synergies: ${Object.entries(SYNERGY_BONUSES)
    .map(([k, v]) => `${k.replace(/_/g, " ")}=+${v}`)
    .join(", ")}
Conflicts: ${Object.entries(CONFLICT_PENALTIES)
    .map(([k, v]) => `${k.replace(/_/g, "+")}=${v}`)
    .join(", ")}`;
}

/**
 * Master prompt combining all mechanics for comprehensive AI context
 */
export function generateComprehensiveMechanicsPrompt(options?: {
  includeEconomy?: boolean;
  includeProgression?: boolean;
  includeEntities?: boolean;
  includeMaterials?: boolean;
  floor?: number;
}): string {
  const parts = [generateMechanicsPrompt()];

  if (options?.includeEconomy) {
    parts.push(generateEconomyPrompt());
  }
  if (options?.includeProgression && options.floor) {
    parts.push(generateProgressionPrompt(options.floor));
  }
  if (options?.includeEntities) {
    parts.push(generateEntitySystemPrompt());
  }
  if (options?.includeMaterials) {
    parts.push(generateMaterialPrompt());
  }

  return parts.join("\n\n");
}

// =============================================================================
// TYPE EXPORTS FOR NEW CONSTANTS
// =============================================================================

export type MaterialQuality = (typeof MATERIAL_QUALITIES)[number];
export type VolatilityLevel = (typeof VOLATILITY_LEVELS)[number];
export type EntityClass = (typeof ENTITY_CLASSES)[number];
export type EntityTag = (typeof ENTITY_TAGS)[number];
export type ContainerType = (typeof CONTAINER_TYPES)[number];
export type DungeonTheme = (typeof DUNGEON_THEMES)[number];
export type NPCRole = (typeof NPC_ROLES)[number];
export type AITemperaturePreset = keyof typeof AI_TEMPERATURES;

// =============================================================================
// COMBAT SYSTEM CONSTANTS
// Damage calculations, multipliers, AI behavior thresholds
// =============================================================================

/**
 * Damage type effectiveness multipliers
 */
export const DAMAGE_EFFECTIVENESS = {
  /** Damage multiplier when hitting enemy weakness */
  weaknessMultiplier: 1.5,
  /** Damage multiplier when hitting enemy resistance */
  resistanceMultiplier: 0.5,
  /** Defense reduction ratio for damage calculation */
  defenseReductionRatio: 0.5,
} as const;

/**
 * Critical hit configuration
 */
export const CRITICAL_HIT_CONFIG = {
  /** Base critical hit chance (before modifiers) */
  baseChance: 0.05,
  /** Base critical damage multiplier */
  baseDamageMultiplier: 1.5,
} as const;

/**
 * Combo system definitions - sequences that trigger bonuses
 */
export const COMBO_BONUSES = {
  fire_burst: {
    bonus: 0.5,
    duration: 2,
    description: "+50% fire damage for 2 turns",
  },
  shadow_chain: {
    ignoreDefense: true,
    duration: 1,
    description: "Next attack ignores defense",
  },
  holy_shield: {
    blockNextAttack: true,
    duration: 1,
    description: "Block next attack completely",
  },
  frost_lock: {
    attackReduction: -0.3,
    duration: 2,
    description: "Enemy slowed, -30% attack",
  },
  berserker_rage: {
    damageBoost: 0.25,
    defenseReduction: 0.15,
    duration: 3,
    description: "+25% damage, -15% defense for 3 turns",
  },
} as const;

/**
 * Enemy AI behavior thresholds
 */
export const ENEMY_AI_THRESHOLDS = {
  /** Health percentage to trigger defensive behavior */
  defensiveHealthThreshold: 0.4,
  /** Chance to use ability when in defensive mode with low health */
  defensiveLowHealthAbilityChance: 0.8,
  /** Chance to use ability in defensive mode normally */
  defensiveNormalAbilityChance: 0.3,
  /** Player health threshold to trigger finishing moves (smart AI) */
  finishingMoveThreshold: 0.3,
  /** Chance to use finishing move when player is low */
  finishingMoveChance: 0.7,
  /** Player health threshold for early debuffs (smart AI) */
  earlyDebuffThreshold: 0.6,
  /** Chance to use debuff early */
  earlyDebuffChance: 0.5,
  /** Base ability usage chance for smart AI */
  smartBaseAbilityChance: 0.4,
} as const;

/**
 * Enemy ability generation parameters
 */
export const ENEMY_ABILITY_CONFIG = {
  /** Base cooldown for generated abilities */
  baseCooldown: 2,
  /** Random cooldown variance */
  cooldownVariance: 2,
  /** Ability damage templates with multipliers */
  damageMultipliers: {
    savageStrike: 1.5,
    poisonSpit: 0.8,
    darkBolt: 1.2,
    flameBreath: 1.4,
    frostTouch: 0.9,
    arcaneBlast: 1.1,
  },
  /** Effect chances by damage type */
  effectChances: {
    poison: 0.7,
    shadow: 0.5,
    fire: 0.6,
    ice: 0.6,
    arcane: 0.5,
    physical: 0,
  },
} as const;

// =============================================================================
// ITEM GENERATION CONSTANTS
// Weapon/armor base stats, rarity scaling, loot rolls
// =============================================================================

/**
 * Weapon base stats by subtype
 */
export const WEAPON_BASE_STATS = {
  sword: {
    baseDamage: 6,
    critChance: 0.1,
    critDamage: 1.5,
    attackSpeed: "normal",
  },
  axe: {
    baseDamage: 8,
    critChance: 0.15,
    critDamage: 2.0,
    attackSpeed: "slow",
  },
  dagger: {
    baseDamage: 4,
    critChance: 0.25,
    critDamage: 2.5,
    attackSpeed: "fast",
  },
  bow: {
    baseDamage: 5,
    critChance: 0.15,
    critDamage: 1.75,
    attackSpeed: "normal",
  },
  staff: {
    baseDamage: 4,
    critChance: 0.1,
    critDamage: 1.5,
    attackSpeed: "slow",
  },
  wand: {
    baseDamage: 3,
    critChance: 0.12,
    critDamage: 1.75,
    attackSpeed: "fast",
  },
  mace: {
    baseDamage: 7,
    critChance: 0.08,
    critDamage: 1.5,
    attackSpeed: "slow",
  },
  spear: {
    baseDamage: 5,
    critChance: 0.12,
    critDamage: 1.75,
    attackSpeed: "normal",
  },
  greatsword: {
    baseDamage: 12,
    critChance: 0.1,
    critDamage: 2.0,
    attackSpeed: "slow",
  },
  scythe: {
    baseDamage: 9,
    critChance: 0.2,
    critDamage: 2.25,
    attackSpeed: "slow",
  },
} as const;

/**
 * Armor base defense by slot
 */
export const ARMOR_BASE_DEFENSE = {
  helmet: 3,
  chest: 6,
  gloves: 2,
  boots: 2,
  shield: 5,
  cloak: 1,
} as const;

/**
 * Item rarity stat multipliers for scaling
 */
export const ITEM_RARITY_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.4,
  rare: 2.0,
  legendary: 3.5,
} as const;

/**
 * Per-floor stat scaling percentage
 */
export const ITEM_FLOOR_SCALING = 0.08; // 8% per floor

/**
 * Rarity roll probabilities (base chances before floor bonus)
 */
export const RARITY_ROLL_BASE = {
  legendary: 0.03,
  rare: 0.12,
  uncommon: 0.25,
  /** Floor bonus multipliers per rarity */
  floorBonusMultipliers: {
    legendary: 0.005,
    rare: 0.01,
    uncommon: 0.015,
  },
} as const;

/**
 * Elemental damage roll chances by rarity
 */
export const ELEMENTAL_DAMAGE_CHANCES = {
  common: 0, // Always physical
  uncommon: 0.2,
  rare: 0.5,
  legendary: 0.8,
} as const;

/**
 * Weapon subtype spawn weights (higher = more common)
 */
export const WEAPON_SPAWN_WEIGHTS = {
  sword: 20,
  axe: 15,
  dagger: 15,
  bow: 12,
  staff: 10,
  wand: 8,
  mace: 10,
  spear: 10,
  greatsword: 5,
  scythe: 3,
} as const;

/**
 * Armor subtype spawn weights (higher = more common)
 */
export const ARMOR_SPAWN_WEIGHTS = {
  chest: 25,
  helmet: 20,
  boots: 18,
  gloves: 15,
  shield: 12,
  cloak: 10,
} as const;

/**
 * Ego enchantment chances
 */
export const EGO_ENCHANT_CONFIG = {
  /** Uncommon items have small chance for ego */
  uncommonEgoChance: 0.3,
  /** Rare and legendary always get ego */
  guaranteedEgoRarities: ["rare", "legendary"] as const,
} as const;

// =============================================================================
// ENEMY RANK SYSTEM CONSTANTS
// Rank modifiers, spawn rates, naming conventions
// =============================================================================

/**
 * Enemy rank stat multipliers
 */
export const ENEMY_RANK_MODIFIERS = {
  normal: {
    healthMultiplier: 1.0,
    attackMultiplier: 1.0,
    defenseMultiplier: 1.0,
    expMultiplier: 1.0,
    goldMultiplier: 1.0,
    abilityCount: 0,
    guaranteedLoot: false,
    lootRarityBoost: 0,
  },
  rare: {
    healthMultiplier: 1.5,
    attackMultiplier: 1.3,
    defenseMultiplier: 1.2,
    expMultiplier: 2.0,
    goldMultiplier: 2.5,
    abilityCount: 1,
    guaranteedLoot: true,
    lootRarityBoost: 1,
  },
  unique: {
    healthMultiplier: 2.0,
    attackMultiplier: 1.6,
    defenseMultiplier: 1.5,
    expMultiplier: 4.0,
    goldMultiplier: 5.0,
    abilityCount: 2,
    guaranteedLoot: true,
    lootRarityBoost: 2,
  },
  boss: {
    healthMultiplier: 3.0,
    attackMultiplier: 2.0,
    defenseMultiplier: 2.0,
    expMultiplier: 8.0,
    goldMultiplier: 10.0,
    abilityCount: 3,
    guaranteedLoot: true,
    lootRarityBoost: 2,
  },
  elite_boss: {
    healthMultiplier: 5.0,
    attackMultiplier: 2.5,
    defenseMultiplier: 2.5,
    expMultiplier: 15.0,
    goldMultiplier: 20.0,
    abilityCount: 4,
    guaranteedLoot: true,
    lootRarityBoost: 3,
  },
} as const;

/**
 * Enemy rank spawn probabilities (cumulative thresholds)
 */
export const ENEMY_RANK_SPAWN_RATES = {
  normal: 0.7, // 70% normal
  rare: 0.9, // 20% rare (70-90)
  unique: 0.97, // 7% unique (90-97)
  /** Floor bonus for rank rolling */
  floorBonusPerFloor: 0.02,
  maxFloorBonus: 0.15,
  /** Elite boss spawn chance on high floors */
  eliteBossFloorRequirement: 5,
  eliteBossChance: 0.01,
} as const;

/**
 * Rank ability damage multipliers
 */
export const RANK_ABILITY_MULTIPLIERS = {
  rare: {
    crushingBlow: 1.8,
    venomousStrike: 1.2,
  },
  unique: {
    soulRend: 2.0,
    lifeDrain: 1.5,
    infernalBlast: 2.2,
    frostNova: 1.6,
  },
  boss: {
    annihilate: 3.0,
    voidRift: 2.5,
  },
} as const;

// =============================================================================
// SKILL CHECK CONSTANTS
// Difficulty thresholds, class bonuses, stat calculations
// =============================================================================

/**
 * Skill check difficulty class (DC) thresholds
 */
export const SKILL_DIFFICULTY_THRESHOLDS = {
  trivial: 5,
  easy: 10,
  moderate: 15,
  hard: 20,
  veryHard: 25,
  nearlyImpossible: 30,
} as const;

/**
 * Get difficulty label from DC value
 */
export function getDifficultyLabel(dc: number): string {
  if (dc <= SKILL_DIFFICULTY_THRESHOLDS.trivial) return "Trivial";
  if (dc <= SKILL_DIFFICULTY_THRESHOLDS.easy) return "Easy";
  if (dc <= SKILL_DIFFICULTY_THRESHOLDS.moderate) return "Moderate";
  if (dc <= SKILL_DIFFICULTY_THRESHOLDS.hard) return "Hard";
  if (dc <= SKILL_DIFFICULTY_THRESHOLDS.veryHard) return "Very Hard";
  return "Nearly Impossible";
}

/**
 * Class skill bonuses for skill checks
 */
export const CLASS_SKILL_BONUSES = {
  rogue: { stealth: 3, dexterity: 3, perception: 2 },
  mage: { arcana: 3, intelligence: 3 },
  warlock: { arcana: 3, intelligence: 3 },
  necromancer: { arcana: 3, intelligence: 3 },
  cleric: { wisdom: 3, medicine: 3 },
  paladin: { wisdom: 3, medicine: 3 },
  ranger: { survival: 3, perception: 3, stealth: 2 },
  barbarian: { strength: 3 },
  warrior: { strength: 3 },
  monk: { wisdom: 2, dexterity: 2 },
} as const;

/**
 * Skill check calculation constants
 */
export const SKILL_CHECK_CONFIG = {
  /** Base stat value for modifier calculation */
  baseStatValue: 10,
  /** Stat divisor for modifier (stat - 10) / 2 */
  modifierDivisor: 2,
  /** Level scaling (bonus per X levels) */
  levelScalingDivisor: 4,
  /** Charisma scaling divisor (level-based) */
  charismaLevelDivisor: 3,
  /** Critical success roll */
  criticalSuccess: 20,
  /** Critical failure roll */
  criticalFailure: 1,
} as const;

// =============================================================================
// PATH SYSTEM CONSTANTS
// Path generation, danger levels, reward multipliers
// =============================================================================

/**
 * Path generation configuration
 */
export const PATH_GENERATION_CONFIG = {
  /** Minimum paths per junction */
  minPaths: 2,
  /** Maximum paths per junction */
  maxPaths: 3,
  /** Chance to guarantee at least one safe option */
  safePathGuaranteeChance: 0.7,
  /** Chance to add a mystery path */
  mysteryPathChance: 0.2,
} as const;

/**
 * Path danger level thresholds (based on roll)
 */
export const PATH_DANGER_THRESHOLDS = {
  /** Roll above this = safe path */
  safe: 0.7,
  /** Roll above this = moderate path */
  moderate: 0.4,
  /** Roll above this = dangerous path */
  dangerous: 0.15,
  /** Below dangerous threshold = boss path chance */
} as const;

/**
 * Path reward multipliers
 */
export const PATH_REWARD_MULTIPLIERS = {
  rich: 1.5,
  standard: 1.0,
  poor: 0.6,
  /** Unknown has variable rewards */
  unknownGood: 2.0,
  unknownBad: 0.8,
  /** Chance for unknown to be good */
  unknownGoodChance: 0.3,
} as const;

/**
 * Room type probabilities by danger level
 */
export const ROOM_TYPE_PROBABILITIES = {
  safe: {
    treasure: 0.5,
    shrine: 0.25,
    npc: 0.25,
  },
  moderate: {
    enemy: 0.6,
    trap: 0.2,
    treasure: 0.2,
  },
  dangerous: {
    enemy: 0.7,
    trap: 0.3,
  },
} as const;

// =============================================================================
// COMPANION SYSTEM CONSTANTS
// Party limits, bond mechanics, taming rules
// =============================================================================

/**
 * Party composition limits
 */
export const PARTY_LIMITS = {
  /** Max active companions by player level */
  activeByLevel: {
    level10Plus: 3,
    level5Plus: 2,
    default: 1,
  },
  /** Level thresholds */
  levelThresholds: {
    tier3: 10,
    tier2: 5,
  },
  /** Maximum total companions (active + reserve) */
  maxTotal: 10,
} as const;

/**
 * Get max active companions for a player level
 */
export function getMaxActiveCompanions(playerLevel: number): number {
  if (playerLevel >= PARTY_LIMITS.levelThresholds.tier3)
    return PARTY_LIMITS.activeByLevel.level10Plus;
  if (playerLevel >= PARTY_LIMITS.levelThresholds.tier2)
    return PARTY_LIMITS.activeByLevel.level5Plus;
  return PARTY_LIMITS.activeByLevel.default;
}

/**
 * Bond tier thresholds
 */
export const BOND_TIER_THRESHOLDS = {
  hostile: { max: 10 },
  wary: { min: 10, max: 25 },
  neutral: { min: 25, max: 50 },
  friendly: { min: 50, max: 75 },
  loyal: { min: 75, max: 95 },
  soulbound: { min: 95 },
} as const;

/**
 * Get bond tier from bond level
 */
export function getBondTierFromLevel(
  bondLevel: number,
): "hostile" | "wary" | "neutral" | "friendly" | "loyal" | "soulbound" {
  if (bondLevel < BOND_TIER_THRESHOLDS.hostile.max) return "hostile";
  if (bondLevel < BOND_TIER_THRESHOLDS.wary.max) return "wary";
  if (bondLevel < BOND_TIER_THRESHOLDS.neutral.max) return "neutral";
  if (bondLevel < BOND_TIER_THRESHOLDS.friendly.max) return "friendly";
  if (bondLevel < BOND_TIER_THRESHOLDS.loyal.max) return "loyal";
  return "soulbound";
}

/**
 * Bond tier combat effects
 */
export const BOND_TIER_EFFECTS = {
  hostile: { damageBonus: -0.5, defenseBonus: -0.5, betrayalChance: 0.3 },
  wary: { damageBonus: -0.2, defenseBonus: -0.2, betrayalChance: 0.1 },
  neutral: { damageBonus: 0, defenseBonus: 0, betrayalChance: 0.02 },
  friendly: { damageBonus: 0.1, defenseBonus: 0.1, betrayalChance: 0 },
  loyal: { damageBonus: 0.25, defenseBonus: 0.25, betrayalChance: 0 },
  soulbound: { damageBonus: 0.5, defenseBonus: 0.5, betrayalChance: 0 },
} as const;

/**
 * Taming mechanics configuration
 */
export const TAMING_CONFIG = {
  /** Enemy HP threshold to allow taming (percentage) */
  hpThreshold: 0.25,
  /** Base taming success chance */
  baseChance: 0.3,
  /** Ranger class bonus */
  rangerBonus: 0.25,
  /** Penalty per level difference */
  levelDiffPenalty: 0.1,
  /** Minimum taming chance */
  minChance: 0.05,
  /** Maximum taming chance */
  maxChance: 0.9,
  /** EXP to level ratio for enemy level estimate */
  expToLevelRatio: 15,
} as const;

/**
 * Companion fallback stats by NPC role
 */
export const NPC_COMPANION_STATS = {
  merchant: { health: 20, attack: 3, defense: 2, style: "passive" },
  quest_giver: { health: 25, attack: 5, defense: 3, style: "support" },
  trapped: { health: 30, attack: 6, defense: 4, style: "defensive" },
  mysterious: { health: 25, attack: 7, defense: 3, style: "tactical" },
  hostile_neutral: { health: 35, attack: 8, defense: 5, style: "aggressive" },
} as const;

// =============================================================================
// CHAOS EVENT CONSTANTS
// Event probabilities, durations, severity effects
// =============================================================================

/**
 * Chaos event severity levels
 */
export const CHAOS_SEVERITY_LEVELS = [
  "minor",
  "moderate",
  "major",
  "catastrophic",
] as const;

/**
 * Chaos event type categories
 */
export const CHAOS_EVENT_TYPES = [
  "environmental",
  "invasion",
  "magical",
  "factional",
  "cosmic",
  "personal",
] as const;

/**
 * Base chaos event trigger probabilities
 */
export const CHAOS_TRIGGER_PROBABILITIES = {
  /** Random event base chances */
  random: {
    tunnelCollapse: 0.03,
    risingWaters: 0.02,
    planarRift: 0.01,
  },
  /** Mood threshold triggers */
  moodThreshold: {
    tunnelCollapse: { threshold: 70, chance: 0.1 },
    risingWaters: { threshold: 70, chance: 0.05 },
    monsterMigration: { threshold: 80, chance: 0.2 },
    wildMagicSurge: { threshold: 60, chance: 0.08 },
  },
  /** Floor-based triggers */
  floorBased: {
    risingWaters: { floor: 3, chance: 0.05 },
    planarRift: { floor: 5, chance: 0.05 },
    stalker: { floor: 2, chance: 0.05 },
  },
  /** Turn count triggers */
  turnCount: {
    monsterMigration: { every: 50, chance: 0.1 },
    bloodMoon: { every: 100, chance: 0.15 },
  },
  /** Kill threshold triggers */
  killThreshold: {
    stalker: { kills: 10, chance: 0.1 },
  },
  /** Player action triggers */
  playerAction: {
    spreadingFire: { action: "fire_spell", chance: 0.15 },
    wildMagicSurge: { action: "spell_cast", chance: 0.05 },
  },
  /** Cascade triggers from other events */
  cascade: {
    spreadingFire: { from: "oil_spill", chance: 0.8 },
    nemesisReturns: { from: "enemy_escaped", chance: 0.5 },
    factionWar: { from: "at_war", chance: 0.3 },
  },
} as const;

/**
 * Chaos event duration ranges
 */
export const CHAOS_EVENT_DURATIONS = {
  /** Short environmental events */
  short: { min: 3, max: 5 },
  /** Medium duration events */
  medium: { min: 8, max: 15 },
  /** Long cosmic/invasion events */
  long: { min: 15, max: 25 },
  /** Permanent until resolved */
  permanent: -1,
} as const;

/**
 * Chaos event reward scaling
 */
export const CHAOS_EVENT_REWARDS = {
  minor: { exp: 25, gold: 15 },
  moderate: { exp: 50, gold: 30 },
  major: { exp: 100, gold: 50 },
  catastrophic: { exp: 200, gold: 100 },
} as const;

/**
 * Chaos event escalation timing
 */
export const CHAOS_ESCALATION_CONFIG = {
  /** Turns between escalation checks */
  escalationInterval: 5,
} as const;

// =============================================================================
// EXTENDED PROMPT GENERATORS FOR NEW SYSTEMS
// =============================================================================

/**
 * Generate combat system prompt for AI
 */
export function generateCombatPrompt(): string {
  return `COMBAT MECHANICS:
Damage effectiveness:
• Weakness hit: ${DAMAGE_EFFECTIVENESS.weaknessMultiplier}x damage
• Resistance hit: ${DAMAGE_EFFECTIVENESS.resistanceMultiplier}x damage
• Defense reduces damage by ${DAMAGE_EFFECTIVENESS.defenseReductionRatio * 100}%

Stances:
${Object.entries(STANCE_MODIFIERS)
  .map(
    ([stance, mods]) =>
      `• ${stance}: ${mods.damageMultiplier}x damage, ${mods.defenseMultiplier}x defense`,
  )
  .join("\n")}

Critical hits: ${CRITICAL_HIT_CONFIG.baseChance * 100}% chance, ${CRITICAL_HIT_CONFIG.baseDamageMultiplier}x damage`;
}

/**
 * Generate enemy rank prompt for AI
 */
export function generateEnemyRankPrompt(): string {
  return `ENEMY RANKS:
${Object.entries(ENEMY_RANK_MODIFIERS)
  .map(
    ([rank, mods]) =>
      `• ${rank}: ${mods.healthMultiplier}x HP, ${mods.attackMultiplier}x ATK, ${mods.expMultiplier}x EXP, ${mods.abilityCount} abilities`,
  )
  .join("\n")}

Spawn rates: Normal ${ENEMY_RANK_SPAWN_RATES.normal * 100}%, Rare ${(ENEMY_RANK_SPAWN_RATES.rare - ENEMY_RANK_SPAWN_RATES.normal) * 100}%, Unique ${(ENEMY_RANK_SPAWN_RATES.unique - ENEMY_RANK_SPAWN_RATES.rare) * 100}%`;
}

/**
 * Generate skill check prompt for AI
 */
export function generateSkillCheckPrompt(): string {
  return `SKILL CHECK DCs:
${Object.entries(SKILL_DIFFICULTY_THRESHOLDS)
  .map(([diff, dc]) => `• ${diff}: DC ${dc}`)
  .join("\n")}

Natural 20 = Critical Success, Natural 1 = Critical Failure
Modifiers: (stat - 10) / 2 + class bonus + level/${SKILL_CHECK_CONFIG.levelScalingDivisor}`;
}

/**
 * Generate companion system prompt for AI
 */
export function generateCompanionPrompt(): string {
  return `COMPANION MECHANICS:
Party limits: Level 1-4 = 1 active, Level 5-9 = 2 active, Level 10+ = 3 active
Max total companions: ${PARTY_LIMITS.maxTotal}

Bond tiers and effects:
${Object.entries(BOND_TIER_EFFECTS)
  .map(
    ([tier, effects]) =>
      `• ${tier}: ${effects.damageBonus > 0 ? "+" : ""}${effects.damageBonus * 100}% damage, ${effects.betrayalChance > 0 ? `${effects.betrayalChance * 100}% betrayal` : "no betrayal"}`,
  )
  .join("\n")}

Taming: Enemy must be below ${TAMING_CONFIG.hpThreshold * 100}% HP, base ${TAMING_CONFIG.baseChance * 100}% chance, Ranger +${TAMING_CONFIG.rangerBonus * 100}%`;
}

/**
 * Generate chaos event prompt for AI
 */
export function generateChaosPrompt(): string {
  return `CHAOS EVENTS:
Severity levels: ${CHAOS_SEVERITY_LEVELS.join(" < ")}
Event types: ${CHAOS_EVENT_TYPES.join(", ")}

Reward scaling:
${Object.entries(CHAOS_EVENT_REWARDS)
  .map(
    ([severity, rewards]) =>
      `• ${severity}: ${rewards.exp} EXP, ${rewards.gold} gold`,
  )
  .join("\n")}

Events can be triggered by: random chance, mood thresholds, floor depth, turn count, kills, player actions, or cascade from other events.`;
}

/**
 * Generate path system prompt for AI
 */
export function generatePathPrompt(): string {
  return `PATH SYSTEM:
Paths per junction: ${PATH_GENERATION_CONFIG.minPaths}-${PATH_GENERATION_CONFIG.maxPaths}
Safe path guarantee: ${PATH_GENERATION_CONFIG.safePathGuaranteeChance * 100}%
Mystery path chance: ${PATH_GENERATION_CONFIG.mysteryPathChance * 100}%

Danger levels affect rewards:
• Safe (>${PATH_DANGER_THRESHOLDS.safe * 100}%): Poor rewards, treasure/shrine/NPC
• Moderate (>${PATH_DANGER_THRESHOLDS.moderate * 100}%): Standard rewards, enemy/trap/treasure
• Dangerous (>${PATH_DANGER_THRESHOLDS.dangerous * 100}%): Rich rewards, enemy/trap/boss

Reward multipliers: rich=${PATH_REWARD_MULTIPLIERS.rich}x, standard=${PATH_REWARD_MULTIPLIERS.standard}x, poor=${PATH_REWARD_MULTIPLIERS.poor}x`;
}

/**
 * Generate item generation prompt for AI
 */
export function generateItemGenerationPrompt(): string {
  return `ITEM GENERATION:
Rarity multipliers: ${Object.entries(ITEM_RARITY_MULTIPLIERS)
    .map(([r, m]) => `${r}=${m}x`)
    .join(", ")}
Floor scaling: +${ITEM_FLOOR_SCALING * 100}% per floor

Weapon base damage by type:
${Object.entries(WEAPON_BASE_STATS)
  .map(
    ([type, stats]) =>
      `• ${type}: ${stats.baseDamage} base, ${stats.critChance * 100}% crit, ${stats.critDamage}x crit dmg`,
  )
  .join("\n")}

Elemental damage chances: ${Object.entries(ELEMENTAL_DAMAGE_CHANCES)
    .map(([r, c]) => `${r}=${c * 100}%`)
    .join(", ")}`;
}

/**
 * Master comprehensive prompt with all new systems
 */
export function generateFullMechanicsPrompt(options?: {
  includeCombat?: boolean;
  includeEnemyRanks?: boolean;
  includeSkillChecks?: boolean;
  includeCompanions?: boolean;
  includeChaos?: boolean;
  includePaths?: boolean;
  includeItemGen?: boolean;
}): string {
  const parts = [generateMechanicsPrompt()];

  if (options?.includeCombat) parts.push(generateCombatPrompt());
  if (options?.includeEnemyRanks) parts.push(generateEnemyRankPrompt());
  if (options?.includeSkillChecks) parts.push(generateSkillCheckPrompt());
  if (options?.includeCompanions) parts.push(generateCompanionPrompt());
  if (options?.includeChaos) parts.push(generateChaosPrompt());
  if (options?.includePaths) parts.push(generatePathPrompt());
  if (options?.includeItemGen) parts.push(generateItemGenerationPrompt());

  return parts.join("\n\n");
}

// =============================================================================
// ENTITY LEVEL SYSTEM
// Levels for enemies, companions, NPCs - makes level difference matter
// =============================================================================

/**
 * Entity level calculation configuration
 * Enemy level = baseLevel + (floor-1) * levelsPerFloor + rankBonus ± variance
 */
export const ENTITY_LEVEL_CONFIG = {
  /** Starting level for floor 1 enemies */
  baseLevel: 1,
  /** Average level increase per dungeon floor */
  levelsPerFloor: 2,
  /** Random variance around expected level (±variance) */
  variance: 1,
  /** Bonus levels by enemy rank */
  rankBonus: {
    normal: 0,
    rare: 1,
    unique: 2,
    boss: 3,
    elite_boss: 5,
  },
} as const;

/**
 * Combat damage scaling based on level difference
 */
export const LEVEL_COMBAT_SCALING = {
  /** Damage bonus per level above target (+5% per level) */
  damagePerLevelAdvantage: 0.05,
  /** Damage penalty per level below target (-3% per level) */
  damagePerLevelDisadvantage: 0.03,
  /** Maximum damage bonus cap (+50%) */
  maxDamageBonus: 0.50,
  /** Maximum damage penalty cap (-30%, so 70% minimum damage) */
  maxDamagePenalty: 0.30,
} as const;

/**
 * XP scaling based on level difference
 */
export const LEVEL_XP_SCALING = {
  /** XP reduction per level below player (-10% per level) */
  xpPerLevelBelow: 0.10,
  /** XP bonus per level above player (+5% per level) */
  xpPerLevelAbove: 0.05,
  /** Minimum XP percentage (10% even for gray enemies) */
  minimumXpPercent: 0.10,
  /** Maximum XP percentage (150% for high-level enemies) */
  maximumXpPercent: 1.50,
  /** Level difference threshold for "gray" enemies (trivial XP) */
  grayLevelThreshold: 5,
} as const;

/**
 * Expected level ranges per floor (for reference/validation)
 */
export const FLOOR_LEVEL_RANGES = {
  1: { normal: [1, 2], rare: [2, 3], boss: [4, 5] },
  2: { normal: [3, 4], rare: [4, 5], boss: [6, 7] },
  3: { normal: [5, 6], rare: [6, 7], boss: [8, 9] },
  4: { normal: [7, 8], rare: [8, 9], boss: [10, 11] },
  5: { normal: [9, 10], rare: [10, 11], boss: [12, 13] },
  6: { normal: [11, 12], rare: [12, 13], boss: [14, 15] },
  7: { normal: [13, 14], rare: [14, 15], boss: [16, 17] },
} as const;

/**
 * Calculate entity level from floor and rank
 */
export function calculateEntityLevel(
  floor: number,
  rank: keyof typeof ENTITY_LEVEL_CONFIG.rankBonus = "normal",
  includeVariance = true,
): number {
  const { baseLevel, levelsPerFloor, variance, rankBonus } = ENTITY_LEVEL_CONFIG;
  const base = baseLevel + (floor - 1) * levelsPerFloor;
  const bonus = rankBonus[rank];
  const randomVariance = includeVariance
    ? Math.floor(Math.random() * (variance * 2 + 1)) - variance
    : 0;
  return Math.max(1, base + bonus + randomVariance);
}

/**
 * Get damage modifier based on level difference
 * @param attackerLevel Level of the attacker
 * @param defenderLevel Level of the defender
 * @returns Multiplier for damage (e.g., 1.15 = +15% damage)
 */
export function getLevelDamageModifier(
  attackerLevel: number,
  defenderLevel: number,
): number {
  const levelDiff = attackerLevel - defenderLevel;
  const { damagePerLevelAdvantage, damagePerLevelDisadvantage, maxDamageBonus, maxDamagePenalty } =
    LEVEL_COMBAT_SCALING;

  if (levelDiff > 0) {
    // Attacker is higher level - bonus damage
    const bonus = levelDiff * damagePerLevelAdvantage;
    return Math.min(1 + bonus, 1 + maxDamageBonus);
  } else if (levelDiff < 0) {
    // Attacker is lower level - penalty
    const penalty = Math.abs(levelDiff) * damagePerLevelDisadvantage;
    return Math.max(1 - penalty, 1 - maxDamagePenalty);
  }
  return 1.0; // Same level, no modifier
}

/**
 * Get XP modifier based on level difference
 * @param playerLevel Player's current level
 * @param enemyLevel Enemy's level
 * @returns Multiplier for XP gained (e.g., 0.8 = 80% of base XP)
 */
export function getXpModifier(playerLevel: number, enemyLevel: number): number {
  const levelDiff = playerLevel - enemyLevel;
  const { xpPerLevelBelow, xpPerLevelAbove, minimumXpPercent, maximumXpPercent, grayLevelThreshold } =
    LEVEL_XP_SCALING;

  // Gray enemies - trivially low level
  if (levelDiff >= grayLevelThreshold) {
    return minimumXpPercent;
  }

  if (levelDiff > 0) {
    // Player is higher level - reduced XP
    const reduction = levelDiff * xpPerLevelBelow;
    return Math.max(1 - reduction, minimumXpPercent);
  } else if (levelDiff < 0) {
    // Enemy is higher level - bonus XP
    const bonus = Math.abs(levelDiff) * xpPerLevelAbove;
    return Math.min(1 + bonus, maximumXpPercent);
  }
  return 1.0; // Same level, full XP
}

/**
 * Get level difference color coding for UI
 * @param playerLevel Player's level
 * @param entityLevel Entity's level
 * @returns Tailwind color class
 */
export function getLevelDiffColor(playerLevel: number, entityLevel: number): string {
  const diff = entityLevel - playerLevel;
  if (diff <= -5) return "text-gray-500"; // Gray - trivial
  if (diff <= -3) return "text-green-400"; // Green - easy
  if (diff <= 2) return "text-yellow-400"; // Yellow - fair fight
  if (diff <= 4) return "text-orange-400"; // Orange - challenging
  return "text-red-500"; // Red - dangerous
}

/**
 * Generate level system prompt for AI
 */
export function generateLevelSystemPrompt(): string {
  return `LEVEL SYSTEM:
Entity levels scale with floor: Level = 1 + (floor-1)*${ENTITY_LEVEL_CONFIG.levelsPerFloor} + rankBonus
Rank bonuses: ${Object.entries(ENTITY_LEVEL_CONFIG.rankBonus)
    .map(([rank, bonus]) => `${rank}=+${bonus}`)
    .join(", ")}

Combat scaling:
• Higher level = +${LEVEL_COMBAT_SCALING.damagePerLevelAdvantage * 100}% damage per level (max +${LEVEL_COMBAT_SCALING.maxDamageBonus * 100}%)
• Lower level = -${LEVEL_COMBAT_SCALING.damagePerLevelDisadvantage * 100}% damage per level (min -${LEVEL_COMBAT_SCALING.maxDamagePenalty * 100}%)

XP scaling:
• Enemy below player: -${LEVEL_XP_SCALING.xpPerLevelBelow * 100}% per level (min ${LEVEL_XP_SCALING.minimumXpPercent * 100}%)
• Enemy above player: +${LEVEL_XP_SCALING.xpPerLevelAbove * 100}% per level (max ${LEVEL_XP_SCALING.maximumXpPercent * 100}%)
• ${LEVEL_XP_SCALING.grayLevelThreshold}+ levels below = gray enemy (${LEVEL_XP_SCALING.minimumXpPercent * 100}% XP)`;
}

// =============================================================================
// EVENT ORCHESTRATION SYSTEM
// =============================================================================

/**
 * Event types that can occur in dungeon rooms
 */
export const EVENT_TYPES = [
  "combat",
  "treasure",
  "trap",
  "shrine",
  "npc",
  "rest",
  "mystery",
  "boss",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Cooldowns: minimum rooms before an event type can repeat
 * Prevents "treasure, treasure, treasure" sequences
 */
export const EVENT_COOLDOWNS: Record<EventType, number> = {
  combat: 0, // Combat can always happen
  treasure: 3, // Wait 3 rooms after treasure
  trap: 2, // Wait 2 rooms after trap
  shrine: 4, // Shrines are rare
  npc: 2, // NPCs space out
  rest: 5, // Rest areas are uncommon
  mystery: 3, // Mystery events need spacing
  boss: 10, // Boss per floor anyway
} as const;

/**
 * Base weights for event selection (before modifiers)
 */
export const EVENT_BASE_WEIGHTS: Record<EventType, number> = {
  combat: 35,
  treasure: 12,
  trap: 15,
  shrine: 8,
  npc: 10,
  rest: 5,
  mystery: 10,
  boss: 0, // Boss is forced, not rolled
} as const;

/**
 * Event modifiers that add secondary elements to primary events
 */
export const EVENT_MODIFIERS = {
  guarded: {
    name: "Guarded",
    description: "Protected by enemies",
    appliesTo: ["treasure", "shrine", "npc"] as EventType[],
    weight: 15, // 15% chance when applicable
    addsCombat: true,
  },
  trapped: {
    name: "Trapped",
    description: "Conceals a trap",
    appliesTo: ["treasure", "rest", "npc"] as EventType[],
    weight: 20,
    addsTrap: true,
  },
  cursed: {
    name: "Cursed",
    description: "Bears a dark enchantment",
    appliesTo: ["treasure", "shrine"] as EventType[],
    weight: 10,
    addsNegativeEffect: true,
  },
  blessed: {
    name: "Blessed",
    description: "Touched by divine grace",
    appliesTo: ["combat", "trap"] as EventType[],
    weight: 8,
    addsPositiveEffect: true,
  },
  mysterious: {
    name: "Mysterious",
    description: "Shrouded in unknown magic",
    appliesTo: ["treasure", "shrine", "npc", "rest"] as EventType[],
    weight: 12,
    addsRandomOutcome: true,
  },
} as const;

export type EventModifier = keyof typeof EVENT_MODIFIERS;

/**
 * Event twists - surprise revelations that change the encounter
 */
export const EVENT_TWISTS = {
  mimic: {
    name: "Mimic!",
    description: "The treasure was alive!",
    appliesTo: ["treasure"] as EventType[],
    chance: 0.08, // 8% of treasure events
    transformsTo: "combat",
  },
  ambush: {
    name: "Ambush!",
    description: "Enemies spring from hiding!",
    appliesTo: ["rest", "treasure", "npc"] as EventType[],
    chance: 0.10,
    transformsTo: "combat",
  },
  rescue: {
    name: "Rescue",
    description: "Someone needs saving!",
    appliesTo: ["combat"] as EventType[],
    chance: 0.12,
    addsNPC: true,
  },
  offering: {
    name: "Offering Required",
    description: "The shrine demands sacrifice",
    appliesTo: ["shrine"] as EventType[],
    chance: 0.25,
    requiresPayment: true,
  },
  betrayal: {
    name: "Betrayal!",
    description: "Trust was misplaced",
    appliesTo: ["npc"] as EventType[],
    chance: 0.05,
    transformsTo: "combat",
  },
  revelation: {
    name: "Revelation",
    description: "Hidden truth unveiled",
    appliesTo: ["mystery"] as EventType[],
    chance: 0.30,
    grantsLore: true,
  },
  bonanza: {
    name: "Bonanza!",
    description: "More than expected!",
    appliesTo: ["treasure"] as EventType[],
    chance: 0.05,
    multiplesReward: 2,
  },
} as const;

export type EventTwist = keyof typeof EVENT_TWISTS;

/**
 * Player state thresholds that modify event weights
 */
export const PLAYER_STATE_MODIFIERS = {
  lowHealth: {
    threshold: 0.3, // Below 30% HP
    modifiers: {
      shrine: 2.0, // Double shrine chance
      rest: 2.5, // More rest areas
      npc: 1.5, // More merchants (potions)
      combat: 0.7, // Less combat
      trap: 0.5, // Fewer traps
    },
  },
  lowGold: {
    threshold: 20, // Below 20 gold
    modifiers: {
      treasure: 1.5,
      npc: 0.7, // Merchants less useful
    },
  },
  highGold: {
    threshold: 200, // Above 200 gold
    modifiers: {
      npc: 1.5, // More merchants to spend at
      treasure: 0.8, // Slightly less treasure
    },
  },
  noWeapon: {
    modifiers: {
      treasure: 1.8,
      npc: 1.3,
    },
  },
  noArmor: {
    modifiers: {
      treasure: 1.5,
      shrine: 1.3, // Defensive blessings
    },
  },
  combatStreak: {
    threshold: 3, // 3+ combats in a row
    modifiers: {
      combat: 0.3, // Heavily reduce more combat
      rest: 2.0,
      shrine: 1.5,
      treasure: 1.3,
    },
  },
  noRecentReward: {
    threshold: 4, // 4+ rooms without treasure/shrine
    modifiers: {
      treasure: 1.8,
      shrine: 1.5,
    },
  },
} as const;

/**
 * Floor progression affects event distribution
 */
export const FLOOR_EVENT_SCALING = {
  early: {
    floors: [1, 2],
    modifiers: {
      combat: 1.2, // More combat early (tutorial)
      trap: 0.7, // Fewer traps
      mystery: 0.5, // Less mystery
      shrine: 1.3, // More shrines to help
    },
  },
  mid: {
    floors: [3, 4, 5],
    modifiers: {
      trap: 1.2,
      mystery: 1.0,
      npc: 1.2,
    },
  },
  late: {
    floors: [6, 7, 8],
    modifiers: {
      combat: 0.9,
      trap: 1.5,
      mystery: 1.5,
      treasure: 1.2,
    },
  },
  endgame: {
    floors: [9, 10],
    modifiers: {
      combat: 1.1,
      mystery: 2.0,
      shrine: 0.7, // Fewer safe options
      rest: 0.5,
    },
  },
} as const;

/**
 * Dungeon theme affects event weights
 */
export const THEME_EVENT_MODIFIERS: Record<string, Partial<Record<EventType, number>>> = {
  crypt: { combat: 1.2, shrine: 1.3, trap: 0.8, mystery: 1.2 },
  cavern: { trap: 1.4, treasure: 1.2, combat: 0.9 },
  fortress: { combat: 1.3, trap: 1.2, npc: 0.7 },
  temple: { shrine: 2.0, mystery: 1.5, combat: 0.8, trap: 0.6 },
  abyss: { mystery: 2.0, trap: 1.3, shrine: 0.5, rest: 0.3 },
  library: { mystery: 1.8, npc: 1.5, treasure: 1.3, combat: 0.7 },
  sewers: { trap: 1.5, combat: 1.1, shrine: 0.5, rest: 0.7 },
  prison: { npc: 1.5, trap: 1.3, combat: 1.2, treasure: 0.8 },
} as const;

/**
 * Event memory structure for tracking recent events
 */
export interface EventMemory {
  history: Array<{ type: EventType; room: number; floor: number }>;
  typeLastSeen: Map<EventType, number>; // Room number when last seen
  combatStreak: number;
  roomsSinceReward: number; // Rooms since treasure or valuable shrine
}

/**
 * Create initial event memory
 */
export function createEventMemory(): EventMemory {
  return {
    history: [],
    typeLastSeen: new Map(),
    combatStreak: 0,
    roomsSinceReward: 0,
  };
}

/**
 * Update event memory after an event occurs
 */
export function updateEventMemory(
  memory: EventMemory,
  eventType: EventType,
  room: number,
  floor: number
): EventMemory {
  const updated: EventMemory = {
    history: [...memory.history.slice(-20), { type: eventType, room, floor }],
    typeLastSeen: new Map(memory.typeLastSeen),
    combatStreak: eventType === "combat" ? memory.combatStreak + 1 : 0,
    roomsSinceReward:
      eventType === "treasure" || eventType === "shrine"
        ? 0
        : memory.roomsSinceReward + 1,
  };
  updated.typeLastSeen.set(eventType, room);
  return updated;
}

/**
 * Check if an event type is on cooldown
 */
export function isEventOnCooldown(
  memory: EventMemory,
  eventType: EventType,
  currentRoom: number
): boolean {
  const lastSeen = memory.typeLastSeen.get(eventType);
  if (lastSeen === undefined) return false;
  const cooldown = EVENT_COOLDOWNS[eventType];
  return currentRoom - lastSeen < cooldown;
}

/**
 * Calculate dynamic event weights based on context
 */
export function calculateDynamicEventWeights(context: {
  floor: number;
  room: number;
  playerHealthPercent: number;
  playerGold: number;
  hasWeapon: boolean;
  hasArmor: boolean;
  dungeonTheme?: string;
  memory: EventMemory;
}): Record<EventType, number> {
  // Start with base weights
  const weights: Record<EventType, number> = { ...EVENT_BASE_WEIGHTS };

  // Apply cooldowns (zero out events on cooldown)
  for (const eventType of EVENT_TYPES) {
    if (isEventOnCooldown(context.memory, eventType, context.room)) {
      weights[eventType] = 0;
    }
  }

  // Apply floor progression modifiers
  let floorTier: keyof typeof FLOOR_EVENT_SCALING = "mid";
  if (context.floor <= 2) floorTier = "early";
  else if (context.floor <= 5) floorTier = "mid";
  else if (context.floor <= 8) floorTier = "late";
  else floorTier = "endgame";

  const floorMods = FLOOR_EVENT_SCALING[floorTier].modifiers;
  for (const [type, mod] of Object.entries(floorMods)) {
    weights[type as EventType] *= mod;
  }

  // Apply theme modifiers
  if (context.dungeonTheme && THEME_EVENT_MODIFIERS[context.dungeonTheme]) {
    const themeMods = THEME_EVENT_MODIFIERS[context.dungeonTheme];
    for (const [type, mod] of Object.entries(themeMods)) {
      if (mod !== undefined) {
        weights[type as EventType] *= mod;
      }
    }
  }

  // Apply player state modifiers
  if (context.playerHealthPercent < PLAYER_STATE_MODIFIERS.lowHealth.threshold) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.lowHealth.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  if (context.playerGold < PLAYER_STATE_MODIFIERS.lowGold.threshold) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.lowGold.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  if (context.playerGold > PLAYER_STATE_MODIFIERS.highGold.threshold) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.highGold.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  if (!context.hasWeapon) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.noWeapon.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  if (!context.hasArmor) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.noArmor.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  // Apply combat streak modifier
  if (context.memory.combatStreak >= PLAYER_STATE_MODIFIERS.combatStreak.threshold) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.combatStreak.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  // Apply no-reward streak modifier
  if (context.memory.roomsSinceReward >= PLAYER_STATE_MODIFIERS.noRecentReward.threshold) {
    for (const [type, mod] of Object.entries(PLAYER_STATE_MODIFIERS.noRecentReward.modifiers)) {
      weights[type as EventType] *= mod;
    }
  }

  // Ensure no negative weights
  for (const type of EVENT_TYPES) {
    weights[type] = Math.max(0, weights[type]);
  }

  return weights;
}

/**
 * Select an event type using weighted random with memory
 */
export function selectEventType(
  weights: Record<EventType, number>,
  forcedType?: EventType
): EventType {
  if (forcedType) return forcedType;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return "combat"; // Fallback

  let roll = Math.random() * total;
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return type as EventType;
  }
  return "combat";
}

/**
 * Roll for event modifier
 */
export function rollEventModifier(eventType: EventType): EventModifier | null {
  for (const [modKey, mod] of Object.entries(EVENT_MODIFIERS)) {
    if (mod.appliesTo.includes(eventType) && Math.random() * 100 < mod.weight) {
      return modKey as EventModifier;
    }
  }
  return null;
}

/**
 * Roll for event twist
 */
export function rollEventTwist(eventType: EventType): EventTwist | null {
  for (const [twistKey, twist] of Object.entries(EVENT_TWISTS)) {
    if (twist.appliesTo.includes(eventType) && Math.random() < twist.chance) {
      return twistKey as EventTwist;
    }
  }
  return null;
}

/**
 * Full event orchestration result
 */
export interface OrchestratedEvent {
  type: EventType;
  modifier: EventModifier | null;
  twist: EventTwist | null;
  weights: Record<EventType, number>; // For debugging/AI context
}

/**
 * Orchestrate a complete event decision
 */
export function orchestrateEvent(context: {
  floor: number;
  room: number;
  playerHealthPercent: number;
  playerGold: number;
  hasWeapon: boolean;
  hasArmor: boolean;
  dungeonTheme?: string;
  memory: EventMemory;
  forcedType?: EventType;
}): OrchestratedEvent {
  const weights = calculateDynamicEventWeights(context);
  const type = selectEventType(weights, context.forcedType);
  const modifier = rollEventModifier(type);
  const twist = rollEventTwist(type);

  return { type, modifier, twist, weights };
}

/**
 * Generate event system prompt for AI orchestration
 */
export function generateEventSystemPrompt(): string {
  const cooldownList = Object.entries(EVENT_COOLDOWNS)
    .filter(([, cd]) => cd > 0)
    .map(([type, cd]) => `${type}: ${cd} rooms`)
    .join(", ");

  const modifierList = Object.entries(EVENT_MODIFIERS)
    .map(([key, mod]) => `${mod.name}: ${mod.description}`)
    .join("; ");

  const twistList = Object.entries(EVENT_TWISTS)
    .map(([key, twist]) => `${twist.name}: ${twist.description}`)
    .join("; ");

  return `EVENT ORCHESTRATION SYSTEM:

Event Types: ${EVENT_TYPES.join(", ")}

Cooldowns (min rooms between repeats): ${cooldownList}

Event Modifiers (compound events): ${modifierList}

Event Twists (surprises): ${twistList}

The system dynamically adjusts event weights based on:
- Player health (low HP = more shrines/rest, less combat)
- Player gold (low = more treasure, high = more merchants)
- Equipment gaps (missing weapon/armor = more treasure)
- Combat streaks (3+ combats = reduce combat weight 70%)
- Reward drought (4+ rooms without loot = increase treasure)
- Floor progression (early = tutorial, late = chaos)
- Dungeon theme (temples = shrines, caverns = traps)

When generating narrative, consider the modifier and twist:
- Guarded treasure should mention the enemy presence
- Trapped events should hint at danger
- Twists should be dramatic reveals, not telegraphed`;
}

// =============================================================================
// TYPE EXPORTS FOR NEW CONSTANTS
// =============================================================================

export type EnemyRank = keyof typeof ENEMY_RANK_MODIFIERS;
export type BondTier = keyof typeof BOND_TIER_EFFECTS;
export type ChaosSeverity = (typeof CHAOS_SEVERITY_LEVELS)[number];
export type ChaosEventType = (typeof CHAOS_EVENT_TYPES)[number];
export type SkillDifficulty = keyof typeof SKILL_DIFFICULTY_THRESHOLDS;
