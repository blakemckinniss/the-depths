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
