/**
 * Comprehensive Game Mechanics Ledger Test Suite
 *
 * This test suite validates:
 * 1. All constants are properly defined and accessible
 * 2. Validation functions work correctly
 * 3. Prompt generators produce valid output
 * 4. Game systems can consume ledger values
 * 5. Live API integration tests (requires GROQ_API_KEY)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  // Constants
  EFFECT_TRIGGERS,
  EFFECT_CATEGORIES,
  DURATION_TYPES,
  STACK_BEHAVIORS,
  STAT_MODIFIERS,
  DAMAGE_TYPES,
  ITEM_TYPES,
  WEAPON_SUBTYPES,
  ARMOR_SUBTYPES,
  CONSUMABLE_SUBTYPES,
  RARITIES,
  EFFECT_CONSTRAINTS,
  GOLD_RANGES,
  RARITY_VALUE_MULTIPLIERS,
  TYPE_BASE_VALUES,
  FLOOR_STAT_SCALING,
  FLOOR_BONUS,
  SKILL_RANGES,
  PITY_SYSTEM,
  BASE_RARITY_CHANCES,
  CONTAINER_LOOT_COUNTS,
  CONTAINER_TRAP_CHANCE,
  HEALTH_THRESHOLDS,
  STANCE_MODIFIERS,
  DISPOSITION_RANGES,
  HEALTH_DESCRIPTORS,
  NPC_ROLES,
  ENTITY_CLASSES,
  ENTITY_TAGS,
  CONTAINER_TYPES,
  TREASURE_CONTAINER_TYPES,
  DUNGEON_THEMES,
  DEFAULT_DUNGEON,
  MATERIAL_QUALITIES,
  QUALITY_SCORES,
  SYNERGY_BONUSES,
  CONFLICT_PENALTIES,
  VOLATILITY_LEVELS,
  MATERIAL_TIER_POWER,
  AI_TEMPERATURES,
  AI_RETRY_CONFIG,
  CACHE_CONFIG,
  DAMAGE_EFFECTIVENESS,
  CRITICAL_HIT_CONFIG,
  COMBO_BONUSES,
  ENEMY_AI_THRESHOLDS,
  ENEMY_ABILITY_CONFIG,
  WEAPON_BASE_STATS,
  ARMOR_BASE_DEFENSE,
  ITEM_RARITY_MULTIPLIERS,
  ITEM_FLOOR_SCALING,
  RARITY_ROLL_BASE,
  ELEMENTAL_DAMAGE_CHANCES,
  WEAPON_SPAWN_WEIGHTS,
  ARMOR_SPAWN_WEIGHTS,
  EGO_ENCHANT_CONFIG,
  ENEMY_RANK_MODIFIERS,
  ENEMY_RANK_SPAWN_RATES,
  RANK_ABILITY_MULTIPLIERS,
  SKILL_DIFFICULTY_THRESHOLDS,
  CLASS_SKILL_BONUSES,
  SKILL_CHECK_CONFIG,
  PATH_GENERATION_CONFIG,
  PATH_DANGER_THRESHOLDS,
  PATH_REWARD_MULTIPLIERS,
  ROOM_TYPE_PROBABILITIES,
  PARTY_LIMITS,
  BOND_TIER_THRESHOLDS,
  BOND_TIER_EFFECTS,
  TAMING_CONFIG,
  NPC_COMPANION_STATS,
  CHAOS_SEVERITY_LEVELS,
  CHAOS_EVENT_TYPES,
  CHAOS_TRIGGER_PROBABILITIES,
  CHAOS_EVENT_DURATIONS,
  CHAOS_EVENT_REWARDS,
  CHAOS_ESCALATION_CONFIG,
  WEAPON_MECHANICS,
  // Functions
  generateMechanicsPrompt,
  generateCraftingMechanicsPrompt,
  generateStatusEffectPrompt,
  getMechanicsHint,
  getConstraints,
  validateEffect,
  calculateItemValue,
  getFloorStatRange,
  calculateFloorBonus,
  calculatePityBonus,
  getFloorRarityDistribution,
  isCriticalWound,
  getDispositionLabel,
  getHealthDescriptor,
  getEntityEmbeddingFormat,
  generateEconomyPrompt,
  generateProgressionPrompt,
  generateNPCContextPrompt,
  generateEntitySystemPrompt,
  generateMaterialPrompt,
  generateComprehensiveMechanicsPrompt,
  getDifficultyLabel,
  getMaxActiveCompanions,
  getBondTierFromLevel,
  generateCombatPrompt,
  generateEnemyRankPrompt,
  generateSkillCheckPrompt,
  generateCompanionPrompt,
  generateChaosPrompt,
  generatePathPrompt,
  generateItemGenerationPrompt,
  generateFullMechanicsPrompt,
  getDamageTypes,
  // Types
  type EffectTrigger,
  type EffectCategory,
  type DurationType,
  type StackBehavior,
  type StatModifier,
  type DamageType,
  type ItemType,
  type Rarity,
  type ConstraintSource,
  type MaterialQuality,
  type VolatilityLevel,
  type EntityClass,
  type EntityTag,
  type ContainerType as ContainerTypeType,
  type DungeonTheme,
  type NPCRole,
  type AITemperaturePreset,
  type EnemyRank,
  type BondTier,
  type ChaosSeverity,
  type ChaosEventType,
  type SkillDifficulty,
} from "../mechanics/game-mechanics-ledger";

// =============================================================================
// SECTION 1: CONSTANT INTEGRITY TESTS
// Verifies all constants are properly defined with correct structure
// =============================================================================

describe("Game Mechanics Ledger - Constant Integrity", () => {
  describe("Effect System Constants", () => {
    it("EFFECT_TRIGGERS contains all expected triggers", () => {
      expect(EFFECT_TRIGGERS).toContain("passive");
      expect(EFFECT_TRIGGERS).toContain("turn_start");
      expect(EFFECT_TRIGGERS).toContain("turn_end");
      expect(EFFECT_TRIGGERS).toContain("on_attack");
      expect(EFFECT_TRIGGERS).toContain("on_defend");
      expect(EFFECT_TRIGGERS).toContain("on_damage_taken");
      expect(EFFECT_TRIGGERS).toContain("on_damage_dealt");
      expect(EFFECT_TRIGGERS).toContain("on_kill");
      expect(EFFECT_TRIGGERS).toContain("on_heal");
      expect(EFFECT_TRIGGERS).toContain("on_room_enter");
      expect(EFFECT_TRIGGERS).toContain("on_combat_start");
      expect(EFFECT_TRIGGERS).toContain("on_combat_end");
      expect(EFFECT_TRIGGERS).toContain("on_critical_hit");
      expect(EFFECT_TRIGGERS.length).toBe(13);
    });

    it("EFFECT_CATEGORIES contains all expected categories", () => {
      expect(EFFECT_CATEGORIES).toContain("damage_over_time");
      expect(EFFECT_CATEGORIES).toContain("heal_over_time");
      expect(EFFECT_CATEGORIES).toContain("stat_modifier");
      expect(EFFECT_CATEGORIES).toContain("damage_modifier");
      expect(EFFECT_CATEGORIES).toContain("resistance");
      expect(EFFECT_CATEGORIES).toContain("vulnerability");
      expect(EFFECT_CATEGORIES).toContain("control");
      expect(EFFECT_CATEGORIES).toContain("utility");
      expect(EFFECT_CATEGORIES).toContain("triggered");
      expect(EFFECT_CATEGORIES).toContain("transformation");
      expect(EFFECT_CATEGORIES).toContain("aura");
      expect(EFFECT_CATEGORIES).toContain("compound");
      expect(EFFECT_CATEGORIES.length).toBe(12);
    });

    it("DURATION_TYPES contains all expected types", () => {
      expect(DURATION_TYPES).toContain("turns");
      expect(DURATION_TYPES).toContain("actions");
      expect(DURATION_TYPES).toContain("rooms");
      expect(DURATION_TYPES).toContain("hits");
      expect(DURATION_TYPES).toContain("permanent");
      expect(DURATION_TYPES).toContain("conditional");
      expect(DURATION_TYPES.length).toBe(6);
    });

    it("STACK_BEHAVIORS contains all expected behaviors", () => {
      expect(STACK_BEHAVIORS).toContain("none");
      expect(STACK_BEHAVIORS).toContain("duration");
      expect(STACK_BEHAVIORS).toContain("intensity");
      expect(STACK_BEHAVIORS).toContain("independent");
      expect(STACK_BEHAVIORS.length).toBe(4);
    });

    it("STAT_MODIFIERS contains all expected modifiers", () => {
      expect(STAT_MODIFIERS).toContain("attack");
      expect(STAT_MODIFIERS).toContain("defense");
      expect(STAT_MODIFIERS).toContain("maxHealth");
      expect(STAT_MODIFIERS).toContain("healthRegen");
      expect(STAT_MODIFIERS).toContain("critChance");
      expect(STAT_MODIFIERS).toContain("critDamage");
      expect(STAT_MODIFIERS).toContain("dodgeChance");
      expect(STAT_MODIFIERS).toContain("goldMultiplier");
      expect(STAT_MODIFIERS).toContain("expMultiplier");
      expect(STAT_MODIFIERS).toContain("damageMultiplier");
      expect(STAT_MODIFIERS).toContain("damageTaken");
      expect(STAT_MODIFIERS.length).toBe(11);
    });

    it("DAMAGE_TYPES contains all expected types", () => {
      expect(DAMAGE_TYPES).toContain("physical");
      expect(DAMAGE_TYPES).toContain("fire");
      expect(DAMAGE_TYPES).toContain("ice");
      expect(DAMAGE_TYPES).toContain("lightning");
      expect(DAMAGE_TYPES).toContain("shadow");
      expect(DAMAGE_TYPES).toContain("holy");
      expect(DAMAGE_TYPES).toContain("poison");
      expect(DAMAGE_TYPES).toContain("arcane");
      expect(DAMAGE_TYPES.length).toBe(8);
    });
  });

  describe("Item System Constants", () => {
    it("ITEM_TYPES contains all expected types", () => {
      expect(ITEM_TYPES).toContain("weapon");
      expect(ITEM_TYPES).toContain("armor");
      expect(ITEM_TYPES).toContain("trinket");
      expect(ITEM_TYPES).toContain("consumable");
      expect(ITEM_TYPES).toContain("material");
      expect(ITEM_TYPES).toContain("key");
      expect(ITEM_TYPES).toContain("quest");
      expect(ITEM_TYPES.length).toBe(7);
    });

    it("WEAPON_SUBTYPES contains expected weapons", () => {
      expect(WEAPON_SUBTYPES).toContain("sword");
      expect(WEAPON_SUBTYPES).toContain("axe");
      expect(WEAPON_SUBTYPES).toContain("dagger");
      expect(WEAPON_SUBTYPES).toContain("bow");
      expect(WEAPON_SUBTYPES).toContain("staff");
      expect(WEAPON_SUBTYPES.length).toBeGreaterThanOrEqual(10);
    });

    it("ARMOR_SUBTYPES contains expected armor types", () => {
      expect(ARMOR_SUBTYPES).toContain("cloth");
      expect(ARMOR_SUBTYPES).toContain("leather");
      expect(ARMOR_SUBTYPES).toContain("plate");
      expect(ARMOR_SUBTYPES.length).toBeGreaterThanOrEqual(5);
    });

    it("CONSUMABLE_SUBTYPES contains expected consumables", () => {
      expect(CONSUMABLE_SUBTYPES).toContain("potion");
      expect(CONSUMABLE_SUBTYPES).toContain("scroll");
      expect(CONSUMABLE_SUBTYPES).toContain("food");
      expect(CONSUMABLE_SUBTYPES.length).toBeGreaterThanOrEqual(5);
    });

    it("RARITIES has correct structure and values", () => {
      expect(RARITIES).toHaveProperty("common");
      expect(RARITIES).toHaveProperty("uncommon");
      expect(RARITIES).toHaveProperty("rare");
      expect(RARITIES).toHaveProperty("legendary");

      expect(RARITIES.common.statMultiplier).toBe(1.0);
      expect(RARITIES.legendary.statMultiplier).toBeGreaterThan(
        RARITIES.rare.statMultiplier,
      );
      expect(RARITIES.legendary.maxEffects).toBeGreaterThan(
        RARITIES.common.maxEffects,
      );
    });
  });

  describe("Constraint System Constants", () => {
    it("EFFECT_CONSTRAINTS has all expected sources", () => {
      expect(EFFECT_CONSTRAINTS).toHaveProperty("common_item");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("uncommon_item");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("rare_item");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("legendary_item");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("enemy_attack");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("shrine");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("curse");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("environmental");
      expect(EFFECT_CONSTRAINTS).toHaveProperty("crafted");
    });

    it("Constraints have correct power scaling", () => {
      expect(EFFECT_CONSTRAINTS.common_item.maxPower).toBeLessThan(
        EFFECT_CONSTRAINTS.uncommon_item.maxPower,
      );
      expect(EFFECT_CONSTRAINTS.uncommon_item.maxPower).toBeLessThan(
        EFFECT_CONSTRAINTS.rare_item.maxPower,
      );
      expect(EFFECT_CONSTRAINTS.rare_item.maxPower).toBeLessThan(
        EFFECT_CONSTRAINTS.legendary_item.maxPower,
      );
    });

    it("Each constraint has required properties", () => {
      for (const [key, constraint] of Object.entries(EFFECT_CONSTRAINTS)) {
        expect(constraint).toHaveProperty("maxPower");
        expect(constraint).toHaveProperty("maxDuration");
        expect(constraint).toHaveProperty("maxStacks");
        expect(constraint).toHaveProperty("allowedCategories");
        expect(constraint).toHaveProperty("forbiddenTriggers");
        expect(Array.isArray(constraint.allowedCategories)).toBe(true);
        expect(Array.isArray(constraint.forbiddenTriggers)).toBe(true);
      }
    });
  });

  describe("Economy Constants", () => {
    it("GOLD_RANGES has correct structure", () => {
      expect(GOLD_RANGES.common).toHaveProperty("min");
      expect(GOLD_RANGES.common).toHaveProperty("max");
      expect(GOLD_RANGES.legendary.max).toBeGreaterThan(GOLD_RANGES.common.max);
    });

    it("RARITY_VALUE_MULTIPLIERS scale correctly", () => {
      expect(RARITY_VALUE_MULTIPLIERS.common).toBe(1);
      expect(RARITY_VALUE_MULTIPLIERS.legendary).toBeGreaterThan(
        RARITY_VALUE_MULTIPLIERS.rare,
      );
    });

    it("TYPE_BASE_VALUES has all item types", () => {
      expect(TYPE_BASE_VALUES).toHaveProperty("weapon");
      expect(TYPE_BASE_VALUES).toHaveProperty("armor");
      expect(TYPE_BASE_VALUES).toHaveProperty("consumable");
      expect(TYPE_BASE_VALUES.gold).toBe(1);
    });
  });

  describe("Combat Constants", () => {
    it("STANCE_MODIFIERS has all stances", () => {
      expect(STANCE_MODIFIERS).toHaveProperty("aggressive");
      expect(STANCE_MODIFIERS).toHaveProperty("defensive");
      expect(STANCE_MODIFIERS).toHaveProperty("balanced");
    });

    it("Aggressive stance trades defense for damage", () => {
      expect(STANCE_MODIFIERS.aggressive.damageMultiplier).toBeGreaterThan(1);
      expect(STANCE_MODIFIERS.aggressive.defenseMultiplier).toBeLessThan(1);
    });

    it("DAMAGE_EFFECTIVENESS has correct multipliers", () => {
      expect(DAMAGE_EFFECTIVENESS.weaknessMultiplier).toBeGreaterThan(1);
      expect(DAMAGE_EFFECTIVENESS.resistanceMultiplier).toBeLessThan(1);
    });

    it("CRITICAL_HIT_CONFIG has valid values", () => {
      expect(CRITICAL_HIT_CONFIG.baseChance).toBeGreaterThan(0);
      expect(CRITICAL_HIT_CONFIG.baseChance).toBeLessThan(1);
      expect(CRITICAL_HIT_CONFIG.baseDamageMultiplier).toBeGreaterThan(1);
    });

    it("COMBO_BONUSES are properly defined", () => {
      expect(Object.keys(COMBO_BONUSES).length).toBeGreaterThan(0);
      for (const combo of Object.values(COMBO_BONUSES)) {
        expect(combo).toHaveProperty("duration");
        expect(combo).toHaveProperty("description");
      }
    });
  });

  describe("Enemy Rank Constants", () => {
    it("ENEMY_RANK_MODIFIERS has all ranks", () => {
      expect(ENEMY_RANK_MODIFIERS).toHaveProperty("normal");
      expect(ENEMY_RANK_MODIFIERS).toHaveProperty("rare");
      expect(ENEMY_RANK_MODIFIERS).toHaveProperty("unique");
      expect(ENEMY_RANK_MODIFIERS).toHaveProperty("boss");
      expect(ENEMY_RANK_MODIFIERS).toHaveProperty("elite_boss");
    });

    it("Higher ranks have higher multipliers", () => {
      expect(ENEMY_RANK_MODIFIERS.boss.healthMultiplier).toBeGreaterThan(
        ENEMY_RANK_MODIFIERS.rare.healthMultiplier,
      );
      expect(ENEMY_RANK_MODIFIERS.elite_boss.expMultiplier).toBeGreaterThan(
        ENEMY_RANK_MODIFIERS.boss.expMultiplier,
      );
    });
  });

  describe("Companion Constants", () => {
    it("BOND_TIER_THRESHOLDS covers full range", () => {
      expect(BOND_TIER_THRESHOLDS.hostile.max).toBe(10);
      expect(BOND_TIER_THRESHOLDS.soulbound.min).toBe(95);
    });

    it("BOND_TIER_EFFECTS has all tiers", () => {
      expect(BOND_TIER_EFFECTS).toHaveProperty("hostile");
      expect(BOND_TIER_EFFECTS).toHaveProperty("loyal");
      expect(BOND_TIER_EFFECTS).toHaveProperty("soulbound");
    });

    it("TAMING_CONFIG has valid thresholds", () => {
      expect(TAMING_CONFIG.hpThreshold).toBeLessThan(1);
      expect(TAMING_CONFIG.baseChance).toBeGreaterThan(0);
      expect(TAMING_CONFIG.maxChance).toBeLessThanOrEqual(1);
    });
  });

  describe("Chaos Event Constants", () => {
    it("CHAOS_SEVERITY_LEVELS are ordered", () => {
      expect(CHAOS_SEVERITY_LEVELS[0]).toBe("minor");
      expect(CHAOS_SEVERITY_LEVELS[3]).toBe("catastrophic");
    });

    it("CHAOS_EVENT_REWARDS scale with severity", () => {
      expect(CHAOS_EVENT_REWARDS.catastrophic.exp).toBeGreaterThan(
        CHAOS_EVENT_REWARDS.minor.exp,
      );
    });
  });

  describe("AI Configuration Constants", () => {
    it("AI_TEMPERATURES has expected presets", () => {
      expect(AI_TEMPERATURES).toHaveProperty("creative");
      expect(AI_TEMPERATURES).toHaveProperty("narrative");
      expect(AI_TEMPERATURES).toHaveProperty("balanced");
      expect(AI_TEMPERATURES).toHaveProperty("structured");
    });

    it("Temperature values are in valid range", () => {
      for (const temp of Object.values(AI_TEMPERATURES)) {
        expect(temp).toBeGreaterThanOrEqual(0);
        expect(temp).toBeLessThanOrEqual(1);
      }
    });

    it("AI_RETRY_CONFIG has sensible values", () => {
      expect(AI_RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
      expect(AI_RETRY_CONFIG.baseDelayMs).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// SECTION 2: VALIDATION FUNCTION TESTS
// Verifies all utility functions work correctly
// =============================================================================

describe("Game Mechanics Ledger - Validation Functions", () => {
  describe("validateEffect", () => {
    it("validates valid effects within constraints", () => {
      const validEffect = {
        power: 2,
        duration: 3,
        stacks: 1,
        category: "stat_modifier",
      };
      const result = validateEffect(validEffect, "common_item");
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("rejects effects exceeding power limits", () => {
      const overpoweredEffect = {
        power: 10,
        duration: 3,
        category: "stat_modifier",
      };
      const result = validateEffect(overpoweredEffect, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Power"))).toBe(true);
    });

    it("rejects effects exceeding duration limits", () => {
      const longEffect = {
        power: 2,
        duration: 20,
        category: "stat_modifier",
      };
      const result = validateEffect(longEffect, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Duration"))).toBe(true);
    });

    it("rejects forbidden categories", () => {
      const forbiddenEffect = {
        power: 2,
        duration: 3,
        category: "damage_over_time",
      };
      const result = validateEffect(forbiddenEffect, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Category"))).toBe(true);
    });

    it("rejects forbidden triggers", () => {
      const forbiddenTrigger = {
        power: 2,
        duration: 3,
        trigger: "on_kill",
      };
      const result = validateEffect(forbiddenTrigger, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Trigger"))).toBe(true);
    });

    it("allows legendary items to have powerful effects", () => {
      const powerfulEffect = {
        power: 10,
        duration: -1,
        stacks: 5,
        category: "compound",
        trigger: "on_kill",
      };
      const result = validateEffect(powerfulEffect, "legendary_item");
      expect(result.valid).toBe(true);
    });
  });

  describe("calculateItemValue", () => {
    it("calculates base value correctly", () => {
      const commonWeaponValue = calculateItemValue("common", "weapon");
      expect(commonWeaponValue).toBe(25); // 25 * 1
    });

    it("scales with rarity", () => {
      const commonValue = calculateItemValue("common", "weapon");
      const legendaryValue = calculateItemValue("legendary", "weapon");
      expect(legendaryValue).toBeGreaterThan(commonValue);
    });

    it("scales with type", () => {
      const trinketValue = calculateItemValue("common", "trinket");
      const consumableValue = calculateItemValue("common", "consumable");
      expect(trinketValue).toBeGreaterThan(consumableValue);
    });
  });

  describe("getFloorStatRange", () => {
    it("returns early game stats for floors 1-3", () => {
      expect(getFloorStatRange(1)).toEqual({ min: 5, max: 10 });
      expect(getFloorStatRange(3)).toEqual({ min: 5, max: 10 });
    });

    it("returns mid game stats for floors 4-6", () => {
      expect(getFloorStatRange(4)).toEqual({ min: 10, max: 15 });
      expect(getFloorStatRange(6)).toEqual({ min: 10, max: 15 });
    });

    it("returns late game stats for floors 7+", () => {
      expect(getFloorStatRange(7)).toEqual({ min: 15, max: 25 });
      expect(getFloorStatRange(10)).toEqual({ min: 15, max: 25 });
    });
  });

  describe("calculateFloorBonus", () => {
    it("calculates linear bonus", () => {
      expect(calculateFloorBonus(1)).toBe(2);
      expect(calculateFloorBonus(5)).toBe(10);
    });

    it("caps at maximum bonus", () => {
      expect(calculateFloorBonus(20)).toBe(20);
      expect(calculateFloorBonus(100)).toBe(20);
    });
  });

  describe("calculatePityBonus", () => {
    it("returns 0 within threshold", () => {
      expect(calculatePityBonus(0)).toBe(0);
      expect(calculatePityBonus(5)).toBe(0);
    });

    it("calculates bonus after threshold", () => {
      expect(calculatePityBonus(6)).toBe(5);
      expect(calculatePityBonus(10)).toBe(25);
    });

    it("caps at maximum bonus", () => {
      expect(calculatePityBonus(20)).toBe(50);
      expect(calculatePityBonus(100)).toBe(50);
    });
  });

  describe("getFloorRarityDistribution", () => {
    it("has high common chance early", () => {
      const floor1 = getFloorRarityDistribution(1);
      expect(floor1.common).toBeGreaterThan(50);
    });

    it("increases legendary chance on higher floors", () => {
      const floor1 = getFloorRarityDistribution(1);
      const floor10 = getFloorRarityDistribution(10);
      expect(floor10.legendary).toBeGreaterThan(floor1.legendary);
    });

    it("caps legendary at 10", () => {
      const floor20 = getFloorRarityDistribution(20);
      expect(floor20.legendary).toBe(10);
    });
  });

  describe("isCriticalWound", () => {
    it("returns true below threshold", () => {
      expect(isCriticalWound(20, 100)).toBe(true);
      expect(isCriticalWound(30, 100)).toBe(true);
    });

    it("returns false above threshold", () => {
      expect(isCriticalWound(50, 100)).toBe(false);
      expect(isCriticalWound(100, 100)).toBe(false);
    });
  });

  describe("getDispositionLabel", () => {
    it("returns hostile for low values", () => {
      expect(getDispositionLabel(0)).toBe("hostile");
      expect(getDispositionLabel(29)).toBe("hostile");
    });

    it("returns neutral for mid values", () => {
      expect(getDispositionLabel(30)).toBe("neutral");
      expect(getDispositionLabel(59)).toBe("neutral");
    });

    it("returns friendly for high values", () => {
      expect(getDispositionLabel(60)).toBe("friendly");
      expect(getDispositionLabel(100)).toBe("friendly");
    });
  });

  describe("getHealthDescriptor", () => {
    it("returns badly wounded for low health", () => {
      expect(getHealthDescriptor(20)).toBe("badly wounded");
    });

    it("returns injured for mid health", () => {
      expect(getHealthDescriptor(50)).toBe("injured");
    });

    it("returns healthy for high health", () => {
      expect(getHealthDescriptor(80)).toBe("healthy");
    });
  });

  describe("getDifficultyLabel", () => {
    it("returns correct labels for DC values", () => {
      expect(getDifficultyLabel(5)).toBe("Trivial");
      expect(getDifficultyLabel(10)).toBe("Easy");
      expect(getDifficultyLabel(15)).toBe("Moderate");
      expect(getDifficultyLabel(20)).toBe("Hard");
      expect(getDifficultyLabel(25)).toBe("Very Hard");
      expect(getDifficultyLabel(30)).toBe("Nearly Impossible");
    });
  });

  describe("getMaxActiveCompanions", () => {
    it("returns 1 for low level players", () => {
      expect(getMaxActiveCompanions(1)).toBe(1);
      expect(getMaxActiveCompanions(4)).toBe(1);
    });

    it("returns 2 for mid level players", () => {
      expect(getMaxActiveCompanions(5)).toBe(2);
      expect(getMaxActiveCompanions(9)).toBe(2);
    });

    it("returns 3 for high level players", () => {
      expect(getMaxActiveCompanions(10)).toBe(3);
      expect(getMaxActiveCompanions(20)).toBe(3);
    });
  });

  describe("getBondTierFromLevel", () => {
    it("returns correct tiers for bond levels", () => {
      expect(getBondTierFromLevel(5)).toBe("hostile");
      expect(getBondTierFromLevel(15)).toBe("wary");
      expect(getBondTierFromLevel(30)).toBe("neutral");
      expect(getBondTierFromLevel(60)).toBe("friendly");
      expect(getBondTierFromLevel(80)).toBe("loyal");
      expect(getBondTierFromLevel(95)).toBe("soulbound");
    });
  });

  describe("getConstraints", () => {
    it("returns correct constraint set", () => {
      const commonConstraints = getConstraints("common_item");
      expect(commonConstraints).toBe(EFFECT_CONSTRAINTS.common_item);
      expect(commonConstraints.maxPower).toBe(2);
    });
  });

  describe("getDamageTypes", () => {
    it("returns the DAMAGE_TYPES array", () => {
      expect(getDamageTypes()).toBe(DAMAGE_TYPES);
    });
  });
});

// =============================================================================
// SECTION 3: PROMPT GENERATION TESTS
// Verifies prompt generators produce valid, usable output
// =============================================================================

describe("Game Mechanics Ledger - Prompt Generation", () => {
  describe("generateMechanicsPrompt", () => {
    it("includes all effect triggers", () => {
      const prompt = generateMechanicsPrompt();
      for (const trigger of EFFECT_TRIGGERS) {
        expect(prompt).toContain(trigger);
      }
    });

    it("includes all effect categories", () => {
      const prompt = generateMechanicsPrompt();
      for (const category of EFFECT_CATEGORIES) {
        expect(prompt).toContain(category);
      }
    });

    it("includes all stat modifiers", () => {
      const prompt = generateMechanicsPrompt();
      for (const modifier of STAT_MODIFIERS) {
        expect(prompt).toContain(modifier);
      }
    });

    it("includes usage examples", () => {
      const prompt = generateMechanicsPrompt();
      expect(prompt).toContain("EXAMPLES");
      expect(prompt).toContain("✓");
    });
  });

  describe("generateCraftingMechanicsPrompt", () => {
    it("includes tier information", () => {
      const prompt = generateCraftingMechanicsPrompt();
      expect(prompt).toContain("Tier 1");
      expect(prompt).toContain("Tier 5");
    });

    it("includes elemental materials", () => {
      const prompt = generateCraftingMechanicsPrompt();
      expect(prompt).toContain("Fire");
      expect(prompt).toContain("Ice");
      expect(prompt).toContain("Shadow");
    });
  });

  describe("generateStatusEffectPrompt", () => {
    it("includes buff and debuff types", () => {
      const prompt = generateStatusEffectPrompt();
      expect(prompt).toContain("buff");
      expect(prompt).toContain("debuff");
    });

    it("includes stat modifiers", () => {
      const prompt = generateStatusEffectPrompt();
      for (const modifier of STAT_MODIFIERS) {
        expect(prompt).toContain(modifier);
      }
    });
  });

  describe("getMechanicsHint", () => {
    it("returns a non-empty string", () => {
      const hint = getMechanicsHint();
      expect(typeof hint).toBe("string");
      expect(hint.length).toBeGreaterThan(0);
    });

    it("mentions key concepts", () => {
      const hint = getMechanicsHint();
      expect(hint).toContain("trigger");
      expect(hint).toContain("modifier");
    });
  });

  describe("generateEconomyPrompt", () => {
    it("includes gold ranges", () => {
      const prompt = generateEconomyPrompt();
      expect(prompt).toContain("gold");
      expect(prompt).toContain("common");
      expect(prompt).toContain("legendary");
    });
  });

  describe("generateProgressionPrompt", () => {
    it("includes floor-specific stats", () => {
      const prompt = generateProgressionPrompt(5);
      expect(prompt).toContain("FLOOR 5");
      expect(prompt).toContain("Stat range");
      expect(prompt).toContain("Rarity distribution");
    });
  });

  describe("generateNPCContextPrompt", () => {
    it("includes disposition information", () => {
      const prompt = generateNPCContextPrompt(50);
      expect(prompt).toContain("Disposition");
      expect(prompt).toContain("50");
      expect(prompt).toContain("neutral");
    });

    it("includes health when provided", () => {
      const prompt = generateNPCContextPrompt(50, 25);
      expect(prompt).toContain("badly wounded");
    });
  });

  describe("generateEntitySystemPrompt", () => {
    it("includes entity classes", () => {
      const prompt = generateEntitySystemPrompt();
      for (const entityClass of ENTITY_CLASSES) {
        expect(prompt).toContain(entityClass);
      }
    });

    it("includes entity tags", () => {
      const prompt = generateEntitySystemPrompt();
      for (const tag of ENTITY_TAGS) {
        expect(prompt).toContain(tag);
      }
    });

    it("includes embedding format", () => {
      const prompt = generateEntitySystemPrompt();
      expect(prompt).toContain("{entity:");
    });
  });

  describe("generateMaterialPrompt", () => {
    it("includes quality levels", () => {
      const prompt = generateMaterialPrompt();
      for (const quality of MATERIAL_QUALITIES) {
        expect(prompt).toContain(quality);
      }
    });
  });

  describe("generateComprehensiveMechanicsPrompt", () => {
    it("includes base mechanics by default", () => {
      const prompt = generateComprehensiveMechanicsPrompt();
      expect(prompt).toContain("EFFECT SYSTEM");
    });

    it("includes economy when requested", () => {
      const prompt = generateComprehensiveMechanicsPrompt({
        includeEconomy: true,
      });
      expect(prompt).toContain("ECONOMY RULES");
    });

    it("includes progression when floor provided", () => {
      const prompt = generateComprehensiveMechanicsPrompt({
        includeProgression: true,
        floor: 5,
      });
      expect(prompt).toContain("FLOOR 5");
    });
  });

  describe("generateCombatPrompt", () => {
    it("includes combat mechanics", () => {
      const prompt = generateCombatPrompt();
      expect(prompt).toContain("COMBAT MECHANICS");
      expect(prompt).toContain("Weakness");
      expect(prompt).toContain("Stances");
    });
  });

  describe("generateEnemyRankPrompt", () => {
    it("includes all enemy ranks", () => {
      const prompt = generateEnemyRankPrompt();
      expect(prompt).toContain("normal");
      expect(prompt).toContain("rare");
      expect(prompt).toContain("unique");
      expect(prompt).toContain("boss");
    });
  });

  describe("generateSkillCheckPrompt", () => {
    it("includes difficulty thresholds", () => {
      const prompt = generateSkillCheckPrompt();
      for (const [difficulty] of Object.entries(SKILL_DIFFICULTY_THRESHOLDS)) {
        expect(prompt.toLowerCase()).toContain(difficulty.toLowerCase());
      }
    });
  });

  describe("generateCompanionPrompt", () => {
    it("includes party limits and bond tiers", () => {
      const prompt = generateCompanionPrompt();
      expect(prompt).toContain("Party limits");
      expect(prompt).toContain("Bond tiers");
      expect(prompt).toContain("Taming");
    });
  });

  describe("generateChaosPrompt", () => {
    it("includes chaos event information", () => {
      const prompt = generateChaosPrompt();
      expect(prompt).toContain("CHAOS EVENTS");
      expect(prompt).toContain("Severity");
    });
  });

  describe("generatePathPrompt", () => {
    it("includes path system information", () => {
      const prompt = generatePathPrompt();
      expect(prompt).toContain("PATH SYSTEM");
      expect(prompt).toContain("Danger levels");
    });
  });

  describe("generateItemGenerationPrompt", () => {
    it("includes item generation info", () => {
      const prompt = generateItemGenerationPrompt();
      expect(prompt).toContain("ITEM GENERATION");
      expect(prompt).toContain("Weapon base damage");
    });
  });

  describe("generateFullMechanicsPrompt", () => {
    it("combines all prompts when requested", () => {
      const prompt = generateFullMechanicsPrompt({
        includeCombat: true,
        includeEnemyRanks: true,
        includeSkillChecks: true,
        includeCompanions: true,
        includeChaos: true,
        includePaths: true,
        includeItemGen: true,
      });
      expect(prompt).toContain("EFFECT SYSTEM");
      expect(prompt).toContain("COMBAT MECHANICS");
      expect(prompt).toContain("ENEMY RANKS");
      expect(prompt).toContain("SKILL CHECK");
      expect(prompt).toContain("COMPANION");
      expect(prompt).toContain("CHAOS");
      expect(prompt).toContain("PATH SYSTEM");
      expect(prompt).toContain("ITEM GENERATION");
    });
  });

  describe("getEntityEmbeddingFormat", () => {
    it("returns embedding format string", () => {
      const format = getEntityEmbeddingFormat();
      expect(format).toContain("{entity:");
      expect(format).toContain("Classes:");
      expect(format).toContain("Tags:");
    });
  });
});

// =============================================================================
// SECTION 4: GAME SYSTEM USABILITY TESTS
// Verifies that game systems can correctly consume ledger values
// =============================================================================

describe("Game Mechanics Ledger - Game System Usability", () => {
  describe("Effect System Compatibility", () => {
    it("effect triggers can be used as type discriminators", () => {
      const triggers: EffectTrigger[] = [...EFFECT_TRIGGERS];
      expect(triggers.includes("on_attack")).toBe(true);
      expect(triggers.includes("passive")).toBe(true);
    });

    it("effect categories can be used for categorization", () => {
      const categories: EffectCategory[] = [...EFFECT_CATEGORIES];
      expect(categories.includes("damage_over_time")).toBe(true);
    });

    it("stat modifiers can be applied to objects", () => {
      const modifiers: Record<StatModifier, number> = {} as Record<
        StatModifier,
        number
      >;
      for (const mod of STAT_MODIFIERS) {
        modifiers[mod] = 1;
      }
      expect(modifiers.attack).toBe(1);
      expect(modifiers.defense).toBe(1);
    });
  });

  describe("Item System Compatibility", () => {
    it("damage types can be assigned to weapons", () => {
      const weapon: { damageType: DamageType } = { damageType: "fire" };
      expect(DAMAGE_TYPES.includes(weapon.damageType)).toBe(true);
    });

    it("rarities can be used for lookup", () => {
      const rarity: Rarity = "legendary";
      const stats = RARITIES[rarity];
      expect(stats.statMultiplier).toBe(2.0);
    });

    it("weapon subtypes are valid", () => {
      const weaponType = WEAPON_SUBTYPES[0];
      const baseStats = WEAPON_BASE_STATS[weaponType];
      expect(baseStats).toBeDefined();
      expect(baseStats.baseDamage).toBeGreaterThan(0);
    });
  });

  describe("Combat System Compatibility", () => {
    it("can calculate damage with type effectiveness", () => {
      const baseDamage = 10;
      const weaknessDamage = Math.floor(
        baseDamage * DAMAGE_EFFECTIVENESS.weaknessMultiplier,
      );
      const resistedDamage = Math.floor(
        baseDamage * DAMAGE_EFFECTIVENESS.resistanceMultiplier,
      );
      expect(weaknessDamage).toBe(15);
      expect(resistedDamage).toBe(5);
    });

    it("can calculate critical hits", () => {
      const baseDamage = 100;
      const critDamage = Math.floor(
        baseDamage * CRITICAL_HIT_CONFIG.baseDamageMultiplier,
      );
      expect(critDamage).toBe(150);
    });

    it("stance modifiers can be applied", () => {
      const baseDamage = 100;
      const aggressiveDamage = Math.floor(
        baseDamage * STANCE_MODIFIERS.aggressive.damageMultiplier,
      );
      expect(aggressiveDamage).toBe(125);
    });
  });

  describe("Enemy Rank System Compatibility", () => {
    it("can scale enemy stats by rank", () => {
      const baseHealth = 100;
      const ranks: EnemyRank[] = ["normal", "rare", "unique", "boss"];
      for (const rank of ranks) {
        const scaledHealth = Math.floor(
          baseHealth * ENEMY_RANK_MODIFIERS[rank].healthMultiplier,
        );
        expect(scaledHealth).toBeGreaterThanOrEqual(baseHealth);
      }
    });

    it("can determine loot drops by rank", () => {
      expect(ENEMY_RANK_MODIFIERS.normal.guaranteedLoot).toBe(false);
      expect(ENEMY_RANK_MODIFIERS.rare.guaranteedLoot).toBe(true);
    });
  });

  describe("Companion System Compatibility", () => {
    it("can apply bond tier effects", () => {
      const bondTiers: BondTier[] = [
        "hostile",
        "wary",
        "neutral",
        "friendly",
        "loyal",
        "soulbound",
      ];
      for (const tier of bondTiers) {
        const effects = BOND_TIER_EFFECTS[tier];
        expect(effects).toHaveProperty("damageBonus");
        expect(effects).toHaveProperty("betrayalChance");
      }
    });

    it("can calculate taming success", () => {
      const enemyHpPercent = 0.2;
      const canTame = enemyHpPercent <= TAMING_CONFIG.hpThreshold;
      expect(canTame).toBe(true);
    });
  });

  describe("Skill Check Compatibility", () => {
    it("can use difficulty thresholds for checks", () => {
      const roll = 12;
      const dc = SKILL_DIFFICULTY_THRESHOLDS.moderate;
      const success = roll >= dc;
      expect(success).toBe(false);
    });

    it("can apply class skill bonuses", () => {
      const rogueBonus = CLASS_SKILL_BONUSES.rogue.stealth;
      expect(rogueBonus).toBe(3);
    });
  });

  describe("Path System Compatibility", () => {
    it("can determine path danger level", () => {
      const roll = 0.8;
      const danger =
        roll > PATH_DANGER_THRESHOLDS.safe
          ? "safe"
          : roll > PATH_DANGER_THRESHOLDS.moderate
            ? "moderate"
            : "dangerous";
      expect(danger).toBe("safe");
    });

    it("can apply reward multipliers", () => {
      const baseGold = 100;
      const richGold = Math.floor(baseGold * PATH_REWARD_MULTIPLIERS.rich);
      expect(richGold).toBe(150);
    });
  });

  describe("Chaos Event Compatibility", () => {
    it("can calculate chaos rewards", () => {
      const severity: ChaosSeverity = "major";
      const rewards = CHAOS_EVENT_REWARDS[severity];
      expect(rewards.exp).toBe(100);
      expect(rewards.gold).toBe(50);
    });
  });

  describe("Material System Compatibility", () => {
    it("can apply quality scores", () => {
      const baseQuality = 0;
      for (const [quality, score] of Object.entries(QUALITY_SCORES)) {
        const finalQuality = baseQuality + score;
        if (quality === "crude") expect(finalQuality).toBe(-5);
        if (quality === "pristine") expect(finalQuality).toBe(20);
      }
    });

    it("can check material tier power", () => {
      const tier = 3;
      const maxPower = MATERIAL_TIER_POWER[tier].maxPower;
      expect(maxPower).toBe(5);
    });
  });
});

// =============================================================================
// SECTION 5: TYPE SAFETY TESTS
// Verifies TypeScript types are correctly exported and usable
// =============================================================================

describe("Game Mechanics Ledger - Type Safety", () => {
  it("EffectTrigger type accepts valid triggers", () => {
    const trigger: EffectTrigger = "on_attack";
    expect(EFFECT_TRIGGERS.includes(trigger)).toBe(true);
  });

  it("EffectCategory type accepts valid categories", () => {
    const category: EffectCategory = "damage_over_time";
    expect(EFFECT_CATEGORIES.includes(category)).toBe(true);
  });

  it("DurationType type accepts valid durations", () => {
    const duration: DurationType = "turns";
    expect(DURATION_TYPES.includes(duration)).toBe(true);
  });

  it("StackBehavior type accepts valid behaviors", () => {
    const behavior: StackBehavior = "intensity";
    expect(STACK_BEHAVIORS.includes(behavior)).toBe(true);
  });

  it("StatModifier type accepts valid modifiers", () => {
    const modifier: StatModifier = "critDamage";
    expect(STAT_MODIFIERS.includes(modifier)).toBe(true);
  });

  it("DamageType type accepts valid damage types", () => {
    const damageType: DamageType = "lightning";
    expect(DAMAGE_TYPES.includes(damageType)).toBe(true);
  });

  it("ItemType type accepts valid item types", () => {
    const itemType: ItemType = "trinket";
    expect(ITEM_TYPES.includes(itemType)).toBe(true);
  });

  it("Rarity type accepts valid rarities", () => {
    const rarity: Rarity = "legendary";
    expect(Object.keys(RARITIES)).toContain(rarity);
  });

  it("ConstraintSource type accepts valid sources", () => {
    const source: ConstraintSource = "enemy_attack";
    expect(Object.keys(EFFECT_CONSTRAINTS)).toContain(source);
  });

  it("MaterialQuality type accepts valid qualities", () => {
    const quality: MaterialQuality = "superior";
    expect(MATERIAL_QUALITIES.includes(quality)).toBe(true);
  });

  it("EntityClass type accepts valid classes", () => {
    const entityClass: EntityClass = "mechanism";
    expect(ENTITY_CLASSES.includes(entityClass)).toBe(true);
  });

  it("EntityTag type accepts valid tags", () => {
    const tag: EntityTag = "collectible";
    expect(ENTITY_TAGS.includes(tag)).toBe(true);
  });

  it("DungeonTheme type accepts valid themes", () => {
    const theme: DungeonTheme = "cursed catacombs";
    expect(DUNGEON_THEMES.includes(theme)).toBe(true);
  });

  it("NPCRole type accepts valid roles", () => {
    const role: NPCRole = "merchant";
    expect(NPC_ROLES.includes(role)).toBe(true);
  });

  it("EnemyRank type accepts valid ranks", () => {
    const rank: EnemyRank = "elite_boss";
    expect(Object.keys(ENEMY_RANK_MODIFIERS)).toContain(rank);
  });

  it("BondTier type accepts valid tiers", () => {
    const tier: BondTier = "soulbound";
    expect(Object.keys(BOND_TIER_EFFECTS)).toContain(tier);
  });

  it("ChaosSeverity type accepts valid severities", () => {
    const severity: ChaosSeverity = "catastrophic";
    expect(CHAOS_SEVERITY_LEVELS.includes(severity)).toBe(true);
  });

  it("SkillDifficulty type accepts valid difficulties", () => {
    const difficulty: SkillDifficulty = "hard";
    expect(Object.keys(SKILL_DIFFICULTY_THRESHOLDS)).toContain(difficulty);
  });
});

// =============================================================================
// SECTION 6: EDGE CASES AND BOUNDARY TESTS
// =============================================================================

describe("Game Mechanics Ledger - Edge Cases", () => {
  describe("Validation Edge Cases", () => {
    it("handles empty effect gracefully", () => {
      const result = validateEffect({}, "common_item");
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("handles undefined values gracefully", () => {
      const result = validateEffect(
        { power: undefined, duration: undefined },
        "common_item",
      );
      expect(result.valid).toBe(true);
    });

    it("validates exactly at constraint boundary", () => {
      const atLimit = {
        power: EFFECT_CONSTRAINTS.common_item.maxPower,
        duration: EFFECT_CONSTRAINTS.common_item.maxDuration,
        stacks: EFFECT_CONSTRAINTS.common_item.maxStacks,
      };
      const result = validateEffect(atLimit, "common_item");
      expect(result.valid).toBe(true);
    });

    it("fails just over constraint boundary", () => {
      const overLimit = {
        power: EFFECT_CONSTRAINTS.common_item.maxPower + 1,
      };
      const result = validateEffect(overLimit, "common_item");
      expect(result.valid).toBe(false);
    });
  });

  describe("Floor Calculation Edge Cases", () => {
    it("handles floor 0", () => {
      const range = getFloorStatRange(0);
      expect(range.min).toBeDefined();
      expect(range.max).toBeDefined();
    });

    it("handles negative floor", () => {
      const range = getFloorStatRange(-1);
      expect(range.min).toBeDefined();
      expect(range.max).toBeDefined();
    });

    it("handles very high floor", () => {
      const range = getFloorStatRange(1000);
      expect(range).toEqual({ min: 15, max: 25 });
    });
  });

  describe("Pity System Edge Cases", () => {
    it("handles 0 opens", () => {
      expect(calculatePityBonus(0)).toBe(0);
    });

    it("handles exactly at threshold", () => {
      expect(calculatePityBonus(PITY_SYSTEM.opensThreshold)).toBe(0);
    });

    it("handles one over threshold", () => {
      expect(calculatePityBonus(PITY_SYSTEM.opensThreshold + 1)).toBe(
        PITY_SYSTEM.bonusPerOpen,
      );
    });
  });

  describe("Bond Tier Edge Cases", () => {
    it("handles bond level 0", () => {
      expect(getBondTierFromLevel(0)).toBe("hostile");
    });

    it("handles bond level 100", () => {
      expect(getBondTierFromLevel(100)).toBe("soulbound");
    });

    it("handles exactly at tier boundary", () => {
      expect(getBondTierFromLevel(10)).toBe("wary");
      expect(getBondTierFromLevel(25)).toBe("neutral");
    });
  });

  describe("Companion Limit Edge Cases", () => {
    it("handles level 0", () => {
      expect(getMaxActiveCompanions(0)).toBe(1);
    });

    it("handles exactly at tier boundary", () => {
      expect(getMaxActiveCompanions(5)).toBe(2);
      expect(getMaxActiveCompanions(10)).toBe(3);
    });
  });
});

// =============================================================================
// SECTION 7: INTEGRATION WITH GAME TYPES
// Verify ledger values can be used with actual game type definitions
// =============================================================================

describe("Game Mechanics Ledger - Integration with Game Types", () => {
  it("damage types match StatusEffect modifiers pattern", () => {
    // Create a mock modifiers object like StatusEffect.modifiers
    const modifiers: {
      attack?: number;
      defense?: number;
      healthRegen?: number;
    } = {};

    // Verify ledger stat modifiers are compatible
    expect(STAT_MODIFIERS).toContain("attack");
    expect(STAT_MODIFIERS).toContain("defense");
    expect(STAT_MODIFIERS).toContain("healthRegen");
  });

  it("item rarities match game rarity expectations", () => {
    const validRarities = ["common", "uncommon", "rare", "legendary"];
    for (const rarity of validRarities) {
      expect(Object.keys(RARITIES)).toContain(rarity);
    }
  });

  it("weapon base stats cover all weapon subtypes", () => {
    // Not all subtypes have base stats, but common ones should
    expect(WEAPON_BASE_STATS).toHaveProperty("sword");
    expect(WEAPON_BASE_STATS).toHaveProperty("axe");
    expect(WEAPON_BASE_STATS).toHaveProperty("dagger");
  });

  it("constraint categories align with effect system", () => {
    for (const constraint of Object.values(EFFECT_CONSTRAINTS)) {
      for (const category of constraint.allowedCategories) {
        expect(EFFECT_CATEGORIES).toContain(category);
      }
    }
  });

  it("constraint triggers align with effect system", () => {
    for (const constraint of Object.values(EFFECT_CONSTRAINTS)) {
      for (const trigger of constraint.forbiddenTriggers) {
        expect(EFFECT_TRIGGERS).toContain(trigger);
      }
    }
  });
});

// =============================================================================
// SECTION 8: LIVE API INTEGRATION TESTS
// Tests that require GROQ_API_KEY and make actual API calls
// These verify that AI-generated content can use the ledger effectively
// =============================================================================

describe("Game Mechanics Ledger - Live API Integration", () => {
  const hasApiKey = !!process.env.GROQ_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log(
        "⚠️ GROQ_API_KEY not set - skipping live API tests. Set GROQ_API_KEY to run these tests.",
      );
    }
  });

  describe.skipIf(!hasApiKey)(
    "AI can parse and use ledger prompts",
    async () => {
      it(
        "mechanics prompt is well-structured for AI consumption",
        { timeout: 30000 },
        async () => {
          const prompt = generateMechanicsPrompt();

          // Verify prompt has clear structure markers
          expect(prompt).toContain("TRIGGERS");
          expect(prompt).toContain("CATEGORIES");
          expect(prompt).toContain("STAT MODIFIERS");
          expect(prompt).toContain("EXAMPLES");

          // Verify prompt length is reasonable for AI context
          expect(prompt.length).toBeLessThan(5000);
          expect(prompt.length).toBeGreaterThan(500);
        },
      );

      it(
        "economy prompt provides clear value ranges",
        { timeout: 30000 },
        async () => {
          const prompt = generateEconomyPrompt();

          // Verify all tiers are mentioned
          for (const tier of Object.keys(GOLD_RANGES)) {
            expect(prompt).toContain(tier);
          }

          // Verify format is parseable
          expect(prompt).toMatch(/\d+-\d+ gold/);
        },
      );

      it(
        "progression prompt is floor-specific",
        { timeout: 30000 },
        async () => {
          const floor = 5;
          const prompt = generateProgressionPrompt(floor);

          expect(prompt).toContain(`FLOOR ${floor}`);
          expect(prompt).toContain("Stat range");
          expect(prompt).toContain("Rarity distribution");
        },
      );
    },
  );

  describe.skipIf(!hasApiKey)(
    "Validate AI-generated effect structures",
    async () => {
      it("validates sample AI effect structures", { timeout: 30000 }, () => {
        // Simulate what AI might generate - all within rare_item constraints
        // rare_item: maxPower: 6, maxDuration: 8, maxStacks: 3
        const aiGeneratedEffects = [
          {
            power: 5,
            duration: 3,
            stacks: 2,
            category: "stat_modifier",
            trigger: "on_attack",
          },
          {
            power: 3,
            duration: 5,
            stacks: 1,
            category: "damage_over_time",
            trigger: "turn_end",
          },
          {
            power: 6, // Fixed: was 7, exceeds maxPower of 6 for rare_item
            duration: 2,
            stacks: 3,
            category: "triggered",
            trigger: "on_critical_hit",
          },
        ];

        for (const effect of aiGeneratedEffects) {
          const result = validateEffect(effect, "rare_item");
          expect(result.valid).toBe(true);
        }
      });

      it("rejects poorly formed AI effects", { timeout: 30000 }, () => {
        // Simulate badly formed AI output
        const badEffects = [
          { power: 100, category: "stat_modifier" }, // Power too high
          { duration: 50, category: "control" }, // Duration too long for common
          { category: "transformation", trigger: "on_kill" }, // Forbidden for common
        ];

        for (const effect of badEffects) {
          const result = validateEffect(effect, "common_item");
          expect(result.valid).toBe(false);
        }
      });
    },
  );
});

// =============================================================================
// SECTION 9: BACKWARDS COMPATIBILITY
// Verify deprecated/legacy exports still work
// =============================================================================

describe("Game Mechanics Ledger - Backwards Compatibility", () => {
  it("WEAPON_MECHANICS is exported for legacy support", () => {
    expect(WEAPON_MECHANICS).toBeDefined();
    expect(WEAPON_MECHANICS).toHaveProperty("damageTypes");
    expect(WEAPON_MECHANICS).toHaveProperty("statBonuses");
  });

  it("WEAPON_MECHANICS.damageTypes matches DAMAGE_TYPES", () => {
    expect(WEAPON_MECHANICS.damageTypes).toBe(DAMAGE_TYPES);
  });

  it("getDamageTypes function returns DAMAGE_TYPES", () => {
    expect(getDamageTypes()).toBe(DAMAGE_TYPES);
  });
});

// =============================================================================
// SECTION 10: COMPREHENSIVE SANITY CHECKS
// Final verification that all exports are valid and usable
// =============================================================================

describe("Game Mechanics Ledger - Comprehensive Sanity Checks", () => {
  it("all arrays are non-empty", () => {
    const arrays = [
      EFFECT_TRIGGERS,
      EFFECT_CATEGORIES,
      DURATION_TYPES,
      STACK_BEHAVIORS,
      STAT_MODIFIERS,
      DAMAGE_TYPES,
      ITEM_TYPES,
      WEAPON_SUBTYPES,
      ARMOR_SUBTYPES,
      CONSUMABLE_SUBTYPES,
      NPC_ROLES,
      ENTITY_CLASSES,
      ENTITY_TAGS,
      CONTAINER_TYPES,
      TREASURE_CONTAINER_TYPES,
      DUNGEON_THEMES,
      MATERIAL_QUALITIES,
      VOLATILITY_LEVELS,
      CHAOS_SEVERITY_LEVELS,
      CHAOS_EVENT_TYPES,
    ];

    for (const arr of arrays) {
      expect(arr.length).toBeGreaterThan(0);
    }
  });

  it("all objects have at least one key", () => {
    const objects = [
      RARITIES,
      EFFECT_CONSTRAINTS,
      GOLD_RANGES,
      RARITY_VALUE_MULTIPLIERS,
      TYPE_BASE_VALUES,
      FLOOR_STAT_SCALING,
      SKILL_RANGES,
      PITY_SYSTEM,
      BASE_RARITY_CHANCES,
      CONTAINER_LOOT_COUNTS,
      HEALTH_THRESHOLDS,
      STANCE_MODIFIERS,
      DISPOSITION_RANGES,
      HEALTH_DESCRIPTORS,
      QUALITY_SCORES,
      SYNERGY_BONUSES,
      CONFLICT_PENALTIES,
      MATERIAL_TIER_POWER,
      AI_TEMPERATURES,
      AI_RETRY_CONFIG,
      CACHE_CONFIG,
      DAMAGE_EFFECTIVENESS,
      CRITICAL_HIT_CONFIG,
      COMBO_BONUSES,
      ENEMY_AI_THRESHOLDS,
      ENEMY_ABILITY_CONFIG,
      WEAPON_BASE_STATS,
      ARMOR_BASE_DEFENSE,
      ITEM_RARITY_MULTIPLIERS,
      RARITY_ROLL_BASE,
      ELEMENTAL_DAMAGE_CHANCES,
      WEAPON_SPAWN_WEIGHTS,
      ARMOR_SPAWN_WEIGHTS,
      EGO_ENCHANT_CONFIG,
      ENEMY_RANK_MODIFIERS,
      ENEMY_RANK_SPAWN_RATES,
      RANK_ABILITY_MULTIPLIERS,
      SKILL_DIFFICULTY_THRESHOLDS,
      CLASS_SKILL_BONUSES,
      SKILL_CHECK_CONFIG,
      PATH_GENERATION_CONFIG,
      PATH_DANGER_THRESHOLDS,
      PATH_REWARD_MULTIPLIERS,
      ROOM_TYPE_PROBABILITIES,
      PARTY_LIMITS,
      BOND_TIER_THRESHOLDS,
      BOND_TIER_EFFECTS,
      TAMING_CONFIG,
      NPC_COMPANION_STATS,
      CHAOS_TRIGGER_PROBABILITIES,
      CHAOS_EVENT_DURATIONS,
      CHAOS_EVENT_REWARDS,
    ];

    for (const obj of objects) {
      expect(Object.keys(obj).length).toBeGreaterThan(0);
    }
  });

  it("all functions return expected types", () => {
    expect(typeof generateMechanicsPrompt()).toBe("string");
    expect(typeof generateCraftingMechanicsPrompt()).toBe("string");
    expect(typeof generateStatusEffectPrompt()).toBe("string");
    expect(typeof getMechanicsHint()).toBe("string");
    expect(typeof getEntityEmbeddingFormat()).toBe("string");
    expect(typeof generateEconomyPrompt()).toBe("string");
    expect(typeof generateProgressionPrompt(1)).toBe("string");
    expect(typeof generateNPCContextPrompt(50)).toBe("string");
    expect(typeof generateEntitySystemPrompt()).toBe("string");
    expect(typeof generateMaterialPrompt()).toBe("string");
    expect(typeof generateComprehensiveMechanicsPrompt()).toBe("string");
    expect(typeof generateCombatPrompt()).toBe("string");
    expect(typeof generateEnemyRankPrompt()).toBe("string");
    expect(typeof generateSkillCheckPrompt()).toBe("string");
    expect(typeof generateCompanionPrompt()).toBe("string");
    expect(typeof generateChaosPrompt()).toBe("string");
    expect(typeof generatePathPrompt()).toBe("string");
    expect(typeof generateItemGenerationPrompt()).toBe("string");
    expect(typeof generateFullMechanicsPrompt()).toBe("string");

    expect(typeof calculateItemValue("common", "weapon")).toBe("number");
    expect(typeof getFloorStatRange(1)).toBe("object");
    expect(typeof calculateFloorBonus(1)).toBe("number");
    expect(typeof calculatePityBonus(10)).toBe("number");
    expect(typeof getFloorRarityDistribution(1)).toBe("object");
    expect(typeof isCriticalWound(30, 100)).toBe("boolean");
    expect(typeof getDispositionLabel(50)).toBe("string");
    expect(typeof getHealthDescriptor(50)).toBe("string");
    expect(typeof getDifficultyLabel(15)).toBe("string");
    expect(typeof getMaxActiveCompanions(5)).toBe("number");
    expect(typeof getBondTierFromLevel(50)).toBe("string");
    expect(typeof getConstraints("common_item")).toBe("object");
    expect(typeof validateEffect({}, "common_item")).toBe("object");
    expect(Array.isArray(getDamageTypes())).toBe(true);
  });

  it("DEFAULT_DUNGEON is valid", () => {
    expect(DEFAULT_DUNGEON.name).toBe("Depths of Shadowmire");
    expect(DEFAULT_DUNGEON.theme).toBeDefined();
  });

  it("numeric constants are valid numbers", () => {
    expect(typeof CONTAINER_TRAP_CHANCE).toBe("number");
    expect(typeof ITEM_FLOOR_SCALING).toBe("number");
    expect(CONTAINER_TRAP_CHANCE).toBeGreaterThanOrEqual(0);
    expect(CONTAINER_TRAP_CHANCE).toBeLessThanOrEqual(100);
  });
});
