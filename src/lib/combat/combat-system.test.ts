/**
 * Combat System Tests
 * Tests for damage calculation, stances, combos, and enemy AI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDamageWithType,
  calculateIncomingDamage,
  checkForCombo,
  tickCombo,
  selectEnemyAbility,
  tickEnemyAbilities,
  STANCE_MODIFIERS,
  COMBO_DEFINITIONS,
} from "./combat-system";
import {
  createMockPlayer,
  createMockEnemy,
  createMockEnemyAbility,
  createMockComboTracker,
  createMockPlayerStats,
  createCombatScenario,
} from "@/lib/test-utils/fixtures";

// =============================================================================
// DAMAGE CALCULATION TESTS
// =============================================================================

describe("Damage Calculation", () => {
  describe("calculateDamageWithType()", () => {
    it("should apply base damage with balanced stance", () => {
      const { player, enemy } = createCombatScenario({
        playerLevel: 1,
        enemyLevel: 1,
        playerStance: "balanced",
      });

      const result = calculateDamageWithType(10, "physical", enemy, player);

      expect(result.damage).toBe(10);
      expect(result.effectiveness).toBe("normal");
      expect(result.levelModifier).toBe(1.0);
    });

    it("should apply aggressive stance damage multiplier (1.3x)", () => {
      const player = createMockPlayer({ stance: "aggressive" });
      const enemy = createMockEnemy({ level: 1 });

      const result = calculateDamageWithType(10, "physical", enemy, player);

      expect(result.damage).toBe(13); // 10 * 1.3 = 13
    });

    it("should apply defensive stance damage multiplier (0.7x)", () => {
      const player = createMockPlayer({ stance: "defensive" });
      const enemy = createMockEnemy({ level: 1 });

      const result = calculateDamageWithType(10, "physical", enemy, player);

      expect(result.damage).toBe(7); // 10 * 0.7 = 7
    });

    it("should apply weakness multiplier (1.5x)", () => {
      const player = createMockPlayer();
      const enemy = createMockEnemy({ weakness: "fire" });

      const result = calculateDamageWithType(10, "fire", enemy, player);

      expect(result.damage).toBe(15); // 10 * 1.5 = 15
      expect(result.effectiveness).toBe("effective");
    });

    it("should apply resistance multiplier (0.5x)", () => {
      const player = createMockPlayer();
      const enemy = createMockEnemy({ resistance: "fire" });

      const result = calculateDamageWithType(10, "fire", enemy, player);

      expect(result.damage).toBe(5); // 10 * 0.5 = 5
      expect(result.effectiveness).toBe("resisted");
    });

    it("should not apply weakness/resistance for undefined damage type", () => {
      const player = createMockPlayer();
      const enemy = createMockEnemy({ weakness: "fire", resistance: "ice" });

      const result = calculateDamageWithType(10, undefined, enemy, player);

      expect(result.damage).toBe(10);
      expect(result.effectiveness).toBe("normal");
    });

    it("should stack stance and weakness multipliers", () => {
      const player = createMockPlayer({ stance: "aggressive" });
      const enemy = createMockEnemy({ weakness: "fire" });

      const result = calculateDamageWithType(10, "fire", enemy, player);

      // 10 * 1.3 (stance) = 13, floored
      // 13 * 1.5 (weakness) = 19.5, floored to 19
      expect(result.damage).toBe(19);
      expect(result.effectiveness).toBe("effective");
    });

    describe("Level Scaling", () => {
      it("should give bonus damage when player is higher level", () => {
        const { player, enemy } = createCombatScenario({
          playerLevel: 5,
          enemyLevel: 1,
        });

        const result = calculateDamageWithType(10, "physical", enemy, player);

        // 4 levels above = +20% (4 * 0.05)
        expect(result.levelModifier).toBeCloseTo(1.2);
        expect(result.damage).toBe(12); // 10 * 1.2 = 12
      });

      it("should give penalty when player is lower level", () => {
        const { player, enemy } = createCombatScenario({
          playerLevel: 1,
          enemyLevel: 5,
        });

        const result = calculateDamageWithType(10, "physical", enemy, player);

        // 4 levels below = -12% (4 * 0.03)
        expect(result.levelModifier).toBeCloseTo(0.88);
        expect(result.damage).toBe(8); // 10 * 0.88 = 8.8, floored to 8
      });

      it("should cap bonus at +50%", () => {
        const { player, enemy } = createCombatScenario({
          playerLevel: 20,
          enemyLevel: 1,
        });

        const result = calculateDamageWithType(10, "physical", enemy, player);

        expect(result.levelModifier).toBe(1.5);
        expect(result.damage).toBe(15);
      });

      it("should cap penalty at -30%", () => {
        const { player, enemy } = createCombatScenario({
          playerLevel: 1,
          enemyLevel: 20,
        });

        const result = calculateDamageWithType(10, "physical", enemy, player);

        expect(result.levelModifier).toBe(0.7);
        expect(result.damage).toBe(7);
      });
    });
  });

  describe("calculateIncomingDamage()", () => {
    it("should reduce damage by defense * 0.5", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 10 }),
      });

      const result = calculateIncomingDamage(20, "physical", player);

      // 20 - (10 * 0.5) = 20 - 5 = 15
      expect(result.damage).toBe(15);
    });

    it("should apply defensive stance defense multiplier", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 10 }),
        stance: "defensive",
      });

      const result = calculateIncomingDamage(20, "physical", player);

      // Defense effective = 10 * 1.4 = 14
      // 20 - (14 * 0.5) = 20 - 7 = 13
      expect(result.damage).toBe(13);
    });

    it("should apply aggressive stance defense penalty", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 10 }),
        stance: "aggressive",
      });

      const result = calculateIncomingDamage(20, "physical", player);

      // Defense effective = 10, stance multiplier = 0.7
      // Reduction = floor(10 * 0.5 * 0.7) = floor(3.5) = 3
      // 20 - 3 = 17
      expect(result.damage).toBe(17);
    });

    it("should ensure minimum 1 damage", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 100 }),
      });

      const result = calculateIncomingDamage(10, "physical", player);

      expect(result.damage).toBeGreaterThanOrEqual(1);
    });

    it("should apply level scaling from enemy", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ level: 1, defense: 0 }),
      });

      const result = calculateIncomingDamage(10, "physical", player, 5);

      // Enemy 4 levels above = +20% damage
      expect(result.levelModifier).toBeCloseTo(1.2);
    });

    it("should return 0 damage when holy_shield combo blocks", () => {
      const player = createMockPlayer({
        combo: createMockComboTracker({
          lastAbilities: [],
          activeCombo: {
            name: "Divine Aegis",
            bonus: "Block next attack completely",
            turnsRemaining: 1,
          },
        }),
      });

      const result = calculateIncomingDamage(100, "physical", player);

      expect(result.damage).toBe(0);
    });
  });
});

// =============================================================================
// STANCE MODIFIER TESTS
// =============================================================================

describe("Stance Modifiers", () => {
  it("should have correct balanced stance values", () => {
    expect(STANCE_MODIFIERS.balanced.attack).toBe(1.0);
    expect(STANCE_MODIFIERS.balanced.defense).toBe(1.0);
    expect(STANCE_MODIFIERS.balanced.resourceCost).toBe(1.0);
  });

  it("should have correct aggressive stance values", () => {
    expect(STANCE_MODIFIERS.aggressive.attack).toBe(1.3);
    expect(STANCE_MODIFIERS.aggressive.defense).toBe(0.7);
    expect(STANCE_MODIFIERS.aggressive.resourceCost).toBe(0.8);
  });

  it("should have correct defensive stance values", () => {
    expect(STANCE_MODIFIERS.defensive.attack).toBe(0.7);
    expect(STANCE_MODIFIERS.defensive.defense).toBe(1.4);
    expect(STANCE_MODIFIERS.defensive.resourceCost).toBe(1.2);
  });
});

// =============================================================================
// COMBO SYSTEM TESTS
// =============================================================================

describe("Combo System", () => {
  describe("COMBO_DEFINITIONS", () => {
    it("should have fire_burst combo requiring 3 fire attacks", () => {
      expect(COMBO_DEFINITIONS.fire_burst.sequence).toEqual(["fire", "fire", "fire"]);
      expect(COMBO_DEFINITIONS.fire_burst.effect.damageTypeBoost).toEqual({
        type: "fire",
        bonus: 0.5,
      });
    });

    it("should have frost_lock combo requiring 2 ice attacks", () => {
      expect(COMBO_DEFINITIONS.frost_lock.sequence).toEqual(["ice", "ice"]);
      expect(COMBO_DEFINITIONS.frost_lock.effect.enemyDebuff?.attack).toBe(-0.3);
    });

    it("should have berserker_rage requiring 3 physical attacks", () => {
      expect(COMBO_DEFINITIONS.berserker_rage.sequence).toEqual([
        "physical",
        "physical",
        "physical",
      ]);
      expect(COMBO_DEFINITIONS.berserker_rage.effect.damageBoost).toBe(0.25);
      expect(COMBO_DEFINITIONS.berserker_rage.effect.defenseReduction).toBe(0.15);
    });
  });

  describe("checkForCombo()", () => {
    it("should not trigger combo with insufficient abilities", () => {
      const combo = createMockComboTracker({ lastAbilities: ["fire"] });

      const result = checkForCombo(combo, "fire");

      expect(result.triggered).toBeUndefined();
      expect(result.newCombo.lastAbilities).toEqual(["fire", "fire"]);
    });

    it("should trigger fire_burst with 3 fire abilities", () => {
      const combo = createMockComboTracker({ lastAbilities: ["fire", "fire"] });

      const result = checkForCombo(combo, "fire");

      expect(result.triggered).toBeDefined();
      expect(result.triggered?.name).toBe("Inferno");
      expect(result.newCombo.activeCombo).toBeDefined();
      expect(result.newCombo.activeCombo?.turnsRemaining).toBe(2);
    });

    it("should trigger frost_lock with 2 ice abilities", () => {
      const combo = createMockComboTracker({ lastAbilities: ["ice"] });

      const result = checkForCombo(combo, "ice");

      expect(result.triggered?.name).toBe("Frozen");
    });

    it("should trigger berserker_rage with 3 physical abilities", () => {
      const combo = createMockComboTracker({
        lastAbilities: ["physical", "physical"],
      });

      const result = checkForCombo(combo, "physical");

      expect(result.triggered?.name).toBe("Berserker");
    });

    it("should track only last 3 abilities", () => {
      const combo = createMockComboTracker({
        lastAbilities: ["fire", "ice", "shadow"],
      });

      const result = checkForCombo(combo, "holy");

      expect(result.newCombo.lastAbilities).toEqual(["ice", "shadow", "holy"]);
    });

    it("should decrement active combo duration when no new combo triggered", () => {
      const combo = createMockComboTracker({
        lastAbilities: [],
        activeCombo: { name: "Inferno", bonus: "+50% fire", turnsRemaining: 2 },
      });

      const result = checkForCombo(combo, "ice");

      expect(result.newCombo.activeCombo?.turnsRemaining).toBe(1);
    });
  });

  describe("tickCombo()", () => {
    it("should decrement combo turns remaining", () => {
      const combo = createMockComboTracker({
        activeCombo: { name: "Test", bonus: "test", turnsRemaining: 3 },
      });

      const result = tickCombo(combo);

      expect(result.activeCombo?.turnsRemaining).toBe(2);
    });

    it("should remove combo when turns reach 0", () => {
      const combo = createMockComboTracker({
        activeCombo: { name: "Test", bonus: "test", turnsRemaining: 1 },
      });

      const ticked = tickCombo(combo);
      const expired = tickCombo(ticked);

      expect(expired.activeCombo).toBeUndefined();
    });

    it("should preserve combo tracker without active combo", () => {
      const combo = createMockComboTracker({ lastAbilities: ["fire", "ice"] });

      const result = tickCombo(combo);

      expect(result.lastAbilities).toEqual(["fire", "ice"]);
      expect(result.activeCombo).toBeUndefined();
    });
  });
});

// =============================================================================
// ENEMY AI TESTS
// =============================================================================

describe("Enemy AI", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random");
  });

  describe("selectEnemyAbility()", () => {
    it("should return null when enemy has no abilities", () => {
      const enemy = createMockEnemy({ abilities: [] });

      const result = selectEnemyAbility(enemy, 100, 100);

      expect(result).toBeNull();
    });

    it("should return null when all abilities are on cooldown", () => {
      const enemy = createMockEnemy({
        abilities: [
          createMockEnemyAbility({ currentCooldown: 2 }),
          createMockEnemyAbility({ currentCooldown: 3 }),
        ],
      });

      const result = selectEnemyAbility(enemy, 100, 100);

      expect(result).toBeNull();
    });

    it("should select ability based on chance for random AI", () => {
      vi.mocked(Math.random).mockReturnValue(0.1); // Below 0.3 chance
      const ability = createMockEnemyAbility({ chance: 0.3, currentCooldown: 0 });
      const enemy = createMockEnemy({ abilities: [ability], aiPattern: "random" });

      const result = selectEnemyAbility(enemy, 100, 100);

      expect(result).toBe(ability);
    });

    it("should always use ability for ability_focused AI", () => {
      vi.mocked(Math.random).mockReturnValue(0.5);
      const ability = createMockEnemyAbility({ currentCooldown: 0 });
      const enemy = createMockEnemy({ abilities: [ability], aiPattern: "ability_focused" });

      const result = selectEnemyAbility(enemy, 100, 100);

      expect(result).toBe(ability);
    });

    describe("defensive_until_low AI", () => {
      it("should use abilities more when enemy health is low", () => {
        vi.mocked(Math.random).mockReturnValue(0.5); // Below 0.8 threshold
        const ability = createMockEnemyAbility({ currentCooldown: 0 });
        const enemy = createMockEnemy({
          abilities: [ability],
          aiPattern: "defensive_until_low",
          health: 30,
          maxHealth: 100,
        });

        const result = selectEnemyAbility(enemy, 100, 100);

        expect(result).toBe(ability);
      });
    });

    describe("smart AI", () => {
      it("should prefer finishing moves when player health is low", () => {
        vi.mocked(Math.random).mockReturnValue(0.3); // Below 0.7 finisher chance
        const finisher = createMockEnemyAbility({
          name: "Finisher",
          damage: 50,
          currentCooldown: 0,
        });
        const enemy = createMockEnemy({
          abilities: [finisher],
          aiPattern: "smart",
          attack: 10,
        });

        // Player at 20% health
        const result = selectEnemyAbility(enemy, 20, 100);

        expect(result).toBe(finisher);
      });

      it("should prefer debuffs early in combat", () => {
        vi.mocked(Math.random).mockReturnValue(0.3); // Below 0.5 debuff chance
        const debuff = createMockEnemyAbility({
          name: "Poison",
          effect: { name: "Poisoned" } as any,
          currentCooldown: 0,
        });
        const enemy = createMockEnemy({
          abilities: [debuff],
          aiPattern: "smart",
        });

        // Player at 80% health (early combat)
        const result = selectEnemyAbility(enemy, 80, 100);

        expect(result).toBe(debuff);
      });
    });
  });

  describe("tickEnemyAbilities()", () => {
    it("should reduce all ability cooldowns by 1", () => {
      const enemy = createMockEnemy({
        abilities: [
          createMockEnemyAbility({ currentCooldown: 3 }),
          createMockEnemyAbility({ currentCooldown: 1 }),
        ],
      });

      const result = tickEnemyAbilities(enemy);

      expect(result.abilities?.[0].currentCooldown).toBe(2);
      expect(result.abilities?.[1].currentCooldown).toBe(0);
    });

    it("should not reduce cooldown below 0", () => {
      const enemy = createMockEnemy({
        abilities: [createMockEnemyAbility({ currentCooldown: 0 })],
      });

      const result = tickEnemyAbilities(enemy);

      expect(result.abilities?.[0].currentCooldown).toBe(0);
    });

    it("should handle enemy without abilities", () => {
      const enemy = createMockEnemy({ abilities: undefined });

      const result = tickEnemyAbilities(enemy);

      expect(result).toEqual(enemy);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS - FULL COMBAT SCENARIOS
// =============================================================================

describe("Combat Integration Scenarios", () => {
  it("should calculate correct damage for aggressive player vs weak enemy", () => {
    const player = createMockPlayer({
      stats: createMockPlayerStats({ level: 5, attack: 20 }),
      stance: "aggressive",
    });
    const enemy = createMockEnemy({
      level: 3,
      weakness: "fire",
    });

    const result = calculateDamageWithType(20, "fire", enemy, player);

    // Base: 20
    // Stance: 20 * 1.3 = 26
    // Level (+2): 26 * 1.1 = 28.6 → 28
    // Weakness: 28 * 1.5 = 42
    expect(result.damage).toBe(42);
    expect(result.effectiveness).toBe("effective");
  });

  it("should calculate correct damage for defensive player vs resistant enemy", () => {
    const player = createMockPlayer({
      stats: createMockPlayerStats({ level: 3 }),
      stance: "defensive",
    });
    const enemy = createMockEnemy({
      level: 5,
      resistance: "ice",
    });

    const result = calculateDamageWithType(20, "ice", enemy, player);

    // Base: 20
    // Stance: 20 * 0.7 = 14
    // Level (-2): 14 * 0.94 = 13.16 → 13
    // Resistance: 13 * 0.5 = 6.5 → 6
    expect(result.damage).toBe(6);
    expect(result.effectiveness).toBe("resisted");
  });

  it("should maintain combo through multiple attacks", () => {
    let combo = createMockComboTracker();

    // First fire attack
    let result = checkForCombo(combo, "fire");
    expect(result.triggered).toBeUndefined();
    combo = result.newCombo;

    // Second fire attack
    result = checkForCombo(combo, "fire");
    expect(result.triggered).toBeUndefined();
    combo = result.newCombo;

    // Third fire attack - triggers Inferno
    result = checkForCombo(combo, "fire");
    expect(result.triggered?.name).toBe("Inferno");
    expect(result.newCombo.activeCombo?.turnsRemaining).toBe(2);
  });
});
