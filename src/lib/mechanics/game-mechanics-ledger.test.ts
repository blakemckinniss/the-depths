/**
 * Game Mechanics Ledger Tests
 * Tests for core game constants, constraints, and validation functions
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  EFFECT_TRIGGERS,
  EFFECT_CATEGORIES,
  DURATION_TYPES,
  STACK_BEHAVIORS,
  STAT_MODIFIERS,
  DAMAGE_TYPES,
  RARITIES,
  EFFECT_CONSTRAINTS,
  GOLD_RANGES,
  PITY_SYSTEM,
  FLOOR_BONUS,
  HEALTH_THRESHOLDS,
  STANCE_MODIFIERS,
  LEVEL_COMBAT_SCALING,
  // Functions
  validateEffect,
  calculatePityBonus,
  calculateFloorBonus,
  getFloorRarityDistribution,
  isCriticalWound,
  getDispositionLabel,
  getHealthDescriptor,
  calculateItemValue,
  getFloorStatRange,
  getLevelDamageModifier,
  canInteractionHaveImpact,
  getPossibleImpacts,
} from "./game-mechanics-ledger";

// =============================================================================
// CONSTANT INTEGRITY TESTS
// Ensures constants haven't been accidentally modified
// =============================================================================

describe("Effect System Constants", () => {
  it("should have all required effect triggers", () => {
    expect(EFFECT_TRIGGERS).toContain("passive");
    expect(EFFECT_TRIGGERS).toContain("turn_start");
    expect(EFFECT_TRIGGERS).toContain("turn_end");
    expect(EFFECT_TRIGGERS).toContain("on_attack");
    expect(EFFECT_TRIGGERS).toContain("on_damage_taken");
    expect(EFFECT_TRIGGERS).toContain("on_kill");
    expect(EFFECT_TRIGGERS).toContain("on_critical_hit");
    expect(EFFECT_TRIGGERS.length).toBeGreaterThanOrEqual(12);
  });

  it("should have all required effect categories", () => {
    expect(EFFECT_CATEGORIES).toContain("damage_over_time");
    expect(EFFECT_CATEGORIES).toContain("heal_over_time");
    expect(EFFECT_CATEGORIES).toContain("stat_modifier");
    expect(EFFECT_CATEGORIES).toContain("control");
    expect(EFFECT_CATEGORIES).toContain("utility");
    expect(EFFECT_CATEGORIES.length).toBeGreaterThanOrEqual(10);
  });

  it("should have all required stat modifiers", () => {
    expect(STAT_MODIFIERS).toContain("attack");
    expect(STAT_MODIFIERS).toContain("defense");
    expect(STAT_MODIFIERS).toContain("maxHealth");
    expect(STAT_MODIFIERS).toContain("healthRegen");
    expect(STAT_MODIFIERS).toContain("critChance");
    expect(STAT_MODIFIERS).toContain("damageMultiplier");
  });

  it("should have all damage types", () => {
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

// =============================================================================
// RARITY SYSTEM TESTS
// =============================================================================

describe("Rarity System", () => {
  it("should have correct stat multipliers per rarity", () => {
    expect(RARITIES.common.statMultiplier).toBe(1.0);
    expect(RARITIES.uncommon.statMultiplier).toBe(1.2);
    expect(RARITIES.rare.statMultiplier).toBe(1.5);
    expect(RARITIES.legendary.statMultiplier).toBe(2.0);
  });

  it("should have correct max effects per rarity", () => {
    expect(RARITIES.common.maxEffects).toBe(0);
    expect(RARITIES.uncommon.maxEffects).toBe(1);
    expect(RARITIES.rare.maxEffects).toBe(2);
    expect(RARITIES.legendary.maxEffects).toBe(3);
  });

  it("should scale rarity power progressively", () => {
    const rarityOrder = ["common", "uncommon", "rare", "legendary"] as const;
    for (let i = 1; i < rarityOrder.length; i++) {
      const prev = RARITIES[rarityOrder[i - 1]];
      const curr = RARITIES[rarityOrder[i]];
      expect(curr.statMultiplier).toBeGreaterThan(prev.statMultiplier);
      expect(curr.maxEffects).toBeGreaterThanOrEqual(prev.maxEffects);
    }
  });
});

// =============================================================================
// EFFECT CONSTRAINT VALIDATION TESTS
// =============================================================================

describe("Effect Constraint Validation", () => {
  describe("validateEffect()", () => {
    it("should pass valid common item effects", () => {
      const result = validateEffect(
        { power: 2, duration: 3, stacks: 1, category: "stat_modifier" },
        "common_item"
      );
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should fail when power exceeds max for common items", () => {
      const result = validateEffect({ power: 5 }, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations).toContain("Power 5 exceeds max 2 for common_item");
    });

    it("should fail when duration exceeds max", () => {
      const result = validateEffect({ duration: 10 }, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Duration"))).toBe(true);
    });

    it("should fail when stacks exceed max", () => {
      const result = validateEffect({ stacks: 5 }, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Stacks"))).toBe(true);
    });

    it("should fail when category is not allowed", () => {
      const result = validateEffect({ category: "damage_over_time" }, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Category"))).toBe(true);
    });

    it("should fail when trigger is forbidden", () => {
      const result = validateEffect({ trigger: "on_kill" }, "common_item");
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes("Trigger"))).toBe(true);
    });

    it("should allow legendary items to have high power", () => {
      const result = validateEffect({ power: 10, duration: 100 }, "legendary_item");
      expect(result.valid).toBe(true);
    });

    it("should accumulate multiple violations", () => {
      const result = validateEffect(
        { power: 10, duration: 20, stacks: 10, category: "transformation", trigger: "on_kill" },
        "common_item"
      );
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });
  });

  describe("Constraint Source Specific Rules", () => {
    it("should enforce enemy_attack constraints", () => {
      const valid = validateEffect(
        { power: 5, duration: 4, category: "damage_over_time" },
        "enemy_attack"
      );
      expect(valid.valid).toBe(true);

      const invalid = validateEffect({ trigger: "on_kill" }, "enemy_attack");
      expect(invalid.valid).toBe(false);
    });

    it("should allow shrine effects with high power", () => {
      const result = validateEffect(
        { power: 7, duration: 10, category: "stat_modifier" },
        "shrine"
      );
      expect(result.valid).toBe(true);
    });

    it("should allow curse effects with permanent duration", () => {
      // Duration -1 means permanent, maxDuration -1 allows it
      const result = validateEffect({ power: 6, category: "damage_over_time" }, "curse");
      expect(result.valid).toBe(true);
    });

    it("should enforce environmental effect restrictions", () => {
      // Environmental can't have on_kill or on_combat_end triggers
      const result = validateEffect({ trigger: "on_combat_end" }, "environmental");
      expect(result.valid).toBe(false);
    });
  });
});

// =============================================================================
// LEVEL SCALING TESTS
// =============================================================================

describe("Level Damage Scaling", () => {
  describe("getLevelDamageModifier()", () => {
    it("should return 1.0 for same level combatants", () => {
      expect(getLevelDamageModifier(5, 5)).toBe(1.0);
      expect(getLevelDamageModifier(1, 1)).toBe(1.0);
      expect(getLevelDamageModifier(10, 10)).toBe(1.0);
    });

    it("should give bonus when attacker is higher level", () => {
      // +5% per level above
      const mod = getLevelDamageModifier(3, 1);
      expect(mod).toBeCloseTo(1.10); // 2 levels = +10%
    });

    it("should give penalty when attacker is lower level", () => {
      // -3% per level below
      const mod = getLevelDamageModifier(1, 3);
      expect(mod).toBeCloseTo(0.94); // 2 levels = -6%
    });

    it("should cap bonus at +50% (10 levels above)", () => {
      const mod = getLevelDamageModifier(15, 1);
      expect(mod).toBe(1.5); // Capped at +50%
    });

    it("should cap penalty at -30% (minimum 70% damage)", () => {
      const mod = getLevelDamageModifier(1, 15);
      expect(mod).toBe(0.7); // Capped at -30%
    });

    it("should scale linearly within caps", () => {
      // Verify +5% per level
      expect(getLevelDamageModifier(2, 1)).toBeCloseTo(1.05);
      expect(getLevelDamageModifier(6, 1)).toBeCloseTo(1.25);
      expect(getLevelDamageModifier(11, 1)).toBeCloseTo(1.5); // Capped
    });
  });

  describe("LEVEL_COMBAT_SCALING constants", () => {
    it("should have correct scaling values", () => {
      expect(LEVEL_COMBAT_SCALING.damagePerLevelAdvantage).toBe(0.05);
      expect(LEVEL_COMBAT_SCALING.damagePerLevelDisadvantage).toBe(0.03);
      expect(LEVEL_COMBAT_SCALING.maxDamageBonus).toBe(0.50);
      expect(LEVEL_COMBAT_SCALING.maxDamagePenalty).toBe(0.30);
    });
  });
});

// =============================================================================
// PITY SYSTEM TESTS
// =============================================================================

describe("Pity System", () => {
  describe("calculatePityBonus()", () => {
    it("should return 0 bonus for first 5 opens", () => {
      expect(calculatePityBonus(0)).toBe(0);
      expect(calculatePityBonus(3)).toBe(0);
      expect(calculatePityBonus(5)).toBe(0);
    });

    it("should give +5% per open after threshold", () => {
      expect(calculatePityBonus(6)).toBe(5); // 1 over threshold
      expect(calculatePityBonus(7)).toBe(10); // 2 over threshold
      expect(calculatePityBonus(10)).toBe(25); // 5 over threshold
    });

    it("should cap bonus at 50%", () => {
      expect(calculatePityBonus(15)).toBe(50);
      expect(calculatePityBonus(20)).toBe(50);
      expect(calculatePityBonus(100)).toBe(50);
    });

    it("should reach cap at exactly 15 opens", () => {
      // 15 - 5 threshold = 10 extra * 5% = 50%
      expect(calculatePityBonus(15)).toBe(50);
    });
  });

  describe("PITY_SYSTEM constants", () => {
    it("should have correct configuration", () => {
      expect(PITY_SYSTEM.opensThreshold).toBe(5);
      expect(PITY_SYSTEM.bonusPerOpen).toBe(5);
      expect(PITY_SYSTEM.maxBonus).toBe(50);
    });
  });
});

// =============================================================================
// FLOOR PROGRESSION TESTS
// =============================================================================

describe("Floor Progression", () => {
  describe("calculateFloorBonus()", () => {
    it("should return floor * 2 bonus", () => {
      expect(calculateFloorBonus(1)).toBe(2);
      expect(calculateFloorBonus(5)).toBe(10);
      expect(calculateFloorBonus(10)).toBe(20);
    });

    it("should cap at 20", () => {
      expect(calculateFloorBonus(11)).toBe(20);
      expect(calculateFloorBonus(15)).toBe(20);
      expect(calculateFloorBonus(100)).toBe(20);
    });
  });

  describe("getFloorStatRange()", () => {
    it("should return early game range for floors 1-3", () => {
      expect(getFloorStatRange(1)).toEqual({ min: 5, max: 10 });
      expect(getFloorStatRange(3)).toEqual({ min: 5, max: 10 });
    });

    it("should return mid game range for floors 4-6", () => {
      expect(getFloorStatRange(4)).toEqual({ min: 10, max: 15 });
      expect(getFloorStatRange(6)).toEqual({ min: 10, max: 15 });
    });

    it("should return late game range for floors 7+", () => {
      expect(getFloorStatRange(7)).toEqual({ min: 15, max: 25 });
      expect(getFloorStatRange(10)).toEqual({ min: 15, max: 25 });
    });
  });

  describe("getFloorRarityDistribution()", () => {
    it("should favor common items on early floors", () => {
      const floor1 = getFloorRarityDistribution(1);
      expect(floor1.common).toBeGreaterThan(floor1.uncommon);
      expect(floor1.common).toBeGreaterThan(floor1.rare);
      expect(floor1.legendary).toBe(1);
    });

    it("should shift toward rarer items on later floors", () => {
      const floor1 = getFloorRarityDistribution(1);
      const floor10 = getFloorRarityDistribution(10);

      expect(floor10.common).toBeLessThan(floor1.common);
      expect(floor10.uncommon).toBeGreaterThan(floor1.uncommon);
      expect(floor10.rare).toBeGreaterThan(floor1.rare);
      expect(floor10.legendary).toBeGreaterThan(floor1.legendary);
    });

    it("should cap rarity values", () => {
      const floor20 = getFloorRarityDistribution(20);
      expect(floor20.common).toBeGreaterThanOrEqual(0);
      expect(floor20.rare).toBeLessThanOrEqual(25);
      expect(floor20.legendary).toBeLessThanOrEqual(10);
    });
  });
});

// =============================================================================
// COMBAT HEALTH THRESHOLD TESTS
// =============================================================================

describe("Health Thresholds", () => {
  describe("isCriticalWound()", () => {
    it("should return true when below 30% health", () => {
      expect(isCriticalWound(29, 100)).toBe(true);
      expect(isCriticalWound(15, 100)).toBe(true);
      expect(isCriticalWound(1, 100)).toBe(true);
    });

    it("should return true when exactly at 30%", () => {
      expect(isCriticalWound(30, 100)).toBe(true);
    });

    it("should return false when above 30%", () => {
      expect(isCriticalWound(31, 100)).toBe(false);
      expect(isCriticalWound(50, 100)).toBe(false);
      expect(isCriticalWound(100, 100)).toBe(false);
    });
  });

  describe("HEALTH_THRESHOLDS constants", () => {
    it("should have correct threshold values", () => {
      expect(HEALTH_THRESHOLDS.criticalWound).toBe(0.3);
      expect(HEALTH_THRESHOLDS.lowHealth).toBe(0.5);
      expect(HEALTH_THRESHOLDS.fullHealth).toBe(1.0);
    });
  });
});

// =============================================================================
// STANCE MODIFIER TESTS
// =============================================================================

describe("Combat Stances", () => {
  it("should have balanced stance at 1.0 multipliers", () => {
    expect(STANCE_MODIFIERS.balanced.damageMultiplier).toBe(1.0);
    expect(STANCE_MODIFIERS.balanced.defenseMultiplier).toBe(1.0);
  });

  it("should have aggressive stance favor damage over defense", () => {
    expect(STANCE_MODIFIERS.aggressive.damageMultiplier).toBe(1.25);
    expect(STANCE_MODIFIERS.aggressive.defenseMultiplier).toBe(0.75);
  });

  it("should have defensive stance favor defense over damage", () => {
    expect(STANCE_MODIFIERS.defensive.damageMultiplier).toBe(0.75);
    expect(STANCE_MODIFIERS.defensive.defenseMultiplier).toBe(1.25);
  });

  it("should have symmetric stance trade-offs", () => {
    // Aggressive gains what defensive loses and vice versa
    expect(STANCE_MODIFIERS.aggressive.damageMultiplier).toBe(
      STANCE_MODIFIERS.defensive.defenseMultiplier
    );
    expect(STANCE_MODIFIERS.aggressive.defenseMultiplier).toBe(
      STANCE_MODIFIERS.defensive.damageMultiplier
    );
  });
});

// =============================================================================
// DISPOSITION AND HEALTH DESCRIPTOR TESTS
// =============================================================================

describe("NPC Disposition", () => {
  describe("getDispositionLabel()", () => {
    it("should return hostile for low disposition", () => {
      expect(getDispositionLabel(0)).toBe("hostile");
      expect(getDispositionLabel(15)).toBe("hostile");
      expect(getDispositionLabel(29)).toBe("hostile");
    });

    it("should return neutral for mid disposition", () => {
      expect(getDispositionLabel(30)).toBe("neutral");
      expect(getDispositionLabel(45)).toBe("neutral");
      expect(getDispositionLabel(59)).toBe("neutral");
    });

    it("should return friendly for high disposition", () => {
      expect(getDispositionLabel(60)).toBe("friendly");
      expect(getDispositionLabel(80)).toBe("friendly");
      expect(getDispositionLabel(100)).toBe("friendly");
    });
  });
});

describe("Health Descriptors", () => {
  describe("getHealthDescriptor()", () => {
    it("should return badly wounded for low health", () => {
      expect(getHealthDescriptor(0)).toBe("badly wounded");
      expect(getHealthDescriptor(15)).toBe("badly wounded");
      expect(getHealthDescriptor(29)).toBe("badly wounded");
    });

    it("should return injured for mid health", () => {
      expect(getHealthDescriptor(30)).toBe("injured");
      expect(getHealthDescriptor(45)).toBe("injured");
      expect(getHealthDescriptor(59)).toBe("injured");
    });

    it("should return healthy for high health", () => {
      expect(getHealthDescriptor(60)).toBe("healthy");
      expect(getHealthDescriptor(80)).toBe("healthy");
      expect(getHealthDescriptor(100)).toBe("healthy");
    });
  });
});

// =============================================================================
// ITEM VALUE CALCULATION TESTS
// =============================================================================

describe("Item Value Calculation", () => {
  describe("calculateItemValue()", () => {
    it("should calculate base value for common items", () => {
      expect(calculateItemValue("common", "weapon")).toBe(25);
      expect(calculateItemValue("common", "armor")).toBe(30);
      expect(calculateItemValue("common", "consumable")).toBe(15);
    });

    it("should scale value with rarity", () => {
      const weaponBase = 25;
      expect(calculateItemValue("uncommon", "weapon")).toBe(Math.floor(weaponBase * 2.5));
      expect(calculateItemValue("rare", "weapon")).toBe(Math.floor(weaponBase * 6));
      expect(calculateItemValue("legendary", "weapon")).toBe(Math.floor(weaponBase * 15));
    });

    it("should respect type base values", () => {
      // All common rarity to isolate type differences
      expect(calculateItemValue("common", "trinket")).toBe(35);
      expect(calculateItemValue("common", "material")).toBe(10);
      expect(calculateItemValue("common", "key")).toBe(50);
    });
  });
});

// =============================================================================
// GOLD RANGE TESTS
// =============================================================================

describe("Gold Ranges", () => {
  it("should have increasing ranges by tier", () => {
    expect(GOLD_RANGES.common.min).toBeLessThan(GOLD_RANGES.uncommon.min);
    expect(GOLD_RANGES.uncommon.min).toBeLessThan(GOLD_RANGES.rare.min);
    expect(GOLD_RANGES.rare.min).toBeLessThan(GOLD_RANGES.epic.min);
    expect(GOLD_RANGES.epic.min).toBeLessThan(GOLD_RANGES.legendary.min);
  });

  it("should have valid min/max for each tier", () => {
    for (const tier of Object.values(GOLD_RANGES)) {
      expect(tier.min).toBeLessThan(tier.max);
      expect(tier.min).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// ENTITY IMPACT SYSTEM TESTS
// =============================================================================

describe("Entity Impact System", () => {
  describe("canInteractionHaveImpact()", () => {
    it("should return true for valid action/tag combinations", () => {
      expect(canInteractionHaveImpact("loot", ["lootable"])).toBe(true);
      expect(canInteractionHaveImpact("collect", ["collectible"])).toBe(true);
      expect(canInteractionHaveImpact("consume", ["consumable"])).toBe(true);
    });

    it("should return true when action has inherent impacts", () => {
      // 'loot' always has impacts regardless of tags
      expect(canInteractionHaveImpact("loot", [])).toBe(true);
    });

    it("should be conservative and return true when entity has no recognized tags", () => {
      // Function is conservative - allows interaction when entity has no recognized tags
      expect(canInteractionHaveImpact("examine", [])).toBe(true);
    });

    it("should return false when action/tag impacts don't overlap", () => {
      // 'examine' can produce: reveal_secret, advance_quest, apply_buff
      // 'dangerous' enables: damage_player, apply_debuff, trigger_trap, spawn_enemy
      // No overlap = no valid impact
      expect(canInteractionHaveImpact("examine", ["dangerous"])).toBe(false);
    });
  });

  describe("getPossibleImpacts()", () => {
    it("should return combined impacts from action and tags", () => {
      const impacts = getPossibleImpacts("loot", ["lootable", "trapped"]);
      expect(impacts).toContain("grant_item");
      expect(impacts).toContain("grant_gold");
      expect(impacts).toContain("trigger_trap");
    });

    it("should deduplicate impacts", () => {
      const impacts = getPossibleImpacts("loot", ["lootable"]);
      const uniqueImpacts = [...new Set(impacts)];
      expect(impacts.length).toBe(uniqueImpacts.length);
    });
  });
});
