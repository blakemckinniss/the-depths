/**
 * Entity System Tests
 * Tests for entity creation, status effects, and stat calculations
 */

import { describe, it, expect } from "vitest";
import {
  generateEntityId,
  createStatusEffect,
  completePartialEffect,
  createTrap,
  createShrine,
  createNPC,
  createCompanion,
  createBoss,
  processStatusEffects,
  calculateEffectiveStats,
  STATUS_EFFECTS,
} from "./entity-system";
import {
  createMockPlayer,
  createMockPlayerStats,
  createMockEquipment,
  createMockStatusEffect,
  createMockItem,
} from "@/lib/test-utils/fixtures";

// =============================================================================
// ID GENERATION TESTS
// =============================================================================

describe("Entity ID Generation", () => {
  describe("generateEntityId()", () => {
    it("should generate unique IDs", () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();
      expect(id1).not.toBe(id2);
    });

    it("should use provided prefix", () => {
      const id = generateEntityId("enemy");
      expect(id.startsWith("enemy_")).toBe(true);
    });

    it("should use default prefix when not provided", () => {
      const id = generateEntityId();
      expect(id.startsWith("entity_")).toBe(true);
    });

    it("should include timestamp and random component", () => {
      const id = generateEntityId("test");
      const parts = id.split("_");
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// =============================================================================
// STATUS EFFECT CREATION TESTS
// =============================================================================

describe("Status Effect Creation", () => {
  describe("createStatusEffect()", () => {
    it("should create effect with required fields", () => {
      const effect = createStatusEffect({
        name: "Test Buff",
        effectType: "buff",
        duration: 3,
        description: "A test effect",
      });

      expect(effect.id).toBeDefined();
      expect(effect.name).toBe("Test Buff");
      expect(effect.effectType).toBe("buff");
      expect(effect.duration).toBe(3);
    });

    it("should apply modifiers correctly", () => {
      const effect = createStatusEffect({
        name: "Attack Boost",
        effectType: "buff",
        duration: 3,
        modifiers: { attack: 5, defense: 2 },
        description: "Increases stats",
      });

      expect(effect.modifiers?.attack).toBe(5);
      expect(effect.modifiers?.defense).toBe(2);
    });

    it("should default duration to 3 when not provided", () => {
      const effect = createStatusEffect({
        name: "Basic Effect",
        effectType: "buff",
      });

      expect(effect.duration).toBe(3);
    });

    it("should set entityType based on effectType", () => {
      const buff = createStatusEffect({ name: "Buff", effectType: "buff" });
      const debuff = createStatusEffect({ name: "Debuff", effectType: "debuff" });

      expect(buff.entityType).toBe("blessing");
      expect(debuff.entityType).toBe("curse");
    });
  });

  describe("completePartialEffect()", () => {
    it("should return null if name is missing", () => {
      const result = completePartialEffect({});
      expect(result).toBeNull();
    });

    it("should fill in missing fields with defaults", () => {
      const complete = completePartialEffect({ name: "Partial Effect" });

      expect(complete).not.toBeNull();
      expect(complete!.id).toBeDefined();
      expect(complete!.name).toBe("Partial Effect");
      expect(complete!.duration).toBe(3);
    });

    it("should infer buff from positive modifiers", () => {
      const complete = completePartialEffect({
        name: "Positive Effect",
        modifiers: { attack: 5 },
      });

      expect(complete!.effectType).toBe("buff");
    });

    it("should infer debuff from negative modifiers", () => {
      const complete = completePartialEffect({
        name: "Negative Effect",
        modifiers: { attack: -3 },
      });

      expect(complete!.effectType).toBe("debuff");
    });

    it("should default to neutral when effectType cannot be inferred", () => {
      const complete = completePartialEffect({ name: "Neutral Effect" });

      expect(complete!.effectType).toBe("neutral");
    });

    it("should preserve provided values", () => {
      const complete = completePartialEffect({
        name: "Custom Effect",
        effectType: "debuff",
        duration: 5,
        modifiers: { attack: -3 },
      });

      expect(complete!.effectType).toBe("debuff");
      expect(complete!.duration).toBe(5);
      expect(complete!.modifiers?.attack).toBe(-3);
    });
  });
});

// =============================================================================
// ENTITY FACTORY TESTS
// =============================================================================

describe("Entity Factories", () => {
  describe("createTrap()", () => {
    it("should create trap with required fields", () => {
      const trap = createTrap({
        name: "Spike Trap",
        trapType: "damage",
      });

      expect(trap.id).toBeDefined();
      expect(trap.name).toBe("Spike Trap");
      expect(trap.trapType).toBe("damage");
      expect(trap.entityType).toBe("trap");
    });

    it("should set default disarmDC", () => {
      const trap = createTrap({
        name: "Simple Trap",
        trapType: "damage",
      });

      expect(trap.disarmDC).toBe(10);
    });

    it("should default to hidden", () => {
      const trap = createTrap({
        name: "Hidden Trap",
        trapType: "alarm",
      });

      expect(trap.hidden).toBe(true);
    });

    it("should not be triggered by default", () => {
      const trap = createTrap({
        name: "New Trap",
        trapType: "damage",
      });

      expect(trap.triggered).toBe(false);
    });
  });

  describe("createShrine()", () => {
    it("should create shrine with required fields", () => {
      const shrine = createShrine({
        name: "Altar of Power",
        shrineType: "power",
      });

      expect(shrine.id).toBeDefined();
      expect(shrine.name).toBe("Altar of Power");
      expect(shrine.shrineType).toBe("power");
      expect(shrine.entityType).toBe("shrine");
    });

    it("should default to moderate risk", () => {
      const shrine = createShrine({
        name: "Test Shrine",
        shrineType: "health",
      });

      expect(shrine.riskLevel).toBe("moderate");
    });

    it("should not be used by default", () => {
      const shrine = createShrine({
        name: "Fresh Shrine",
        shrineType: "fortune",
      });

      expect(shrine.used).toBe(false);
    });
  });

  describe("createNPC()", () => {
    it("should create NPC with required fields", () => {
      const npc = createNPC({
        name: "Mysterious Stranger",
        role: "merchant",
      });

      expect(npc.id).toBeDefined();
      expect(npc.name).toBe("Mysterious Stranger");
      expect(npc.role).toBe("merchant");
      expect(npc.entityType).toBe("npc");
    });

    it("should default disposition to 50", () => {
      const npc = createNPC({
        name: "Neutral NPC",
        role: "mysterious",
      });

      expect(npc.disposition).toBe(50);
    });
  });

  describe("createCompanion()", () => {
    it("should create companion with required fields", () => {
      const companion = createCompanion({
        name: "Loyal Wolf",
        role: "fighter",
        stats: { health: 30, maxHealth: 30, attack: 8, defense: 4, speed: 5, level: 1 },
      });

      expect(companion.id).toBeDefined();
      expect(companion.name).toBe("Loyal Wolf");
      expect(companion.stats.health).toBe(30);
      expect(companion.stats.attack).toBe(8);
      expect(companion.entityType).toBe("companion");
    });

    it("should default loyalty to 50", () => {
      const companion = createCompanion({
        name: "Test Companion",
        role: "healer",
        stats: { health: 20, maxHealth: 20, attack: 5, defense: 2, speed: 4, level: 1 },
      });

      expect(companion.loyalty).toBe(50);
    });

    it("should be in party by default", () => {
      const companion = createCompanion({
        name: "New Companion",
        role: "scout",
        stats: { health: 25, maxHealth: 25, attack: 10, defense: 3, speed: 7, level: 1 },
      });

      expect(companion.inParty).toBe(true);
    });
  });

  describe("createBoss()", () => {
    it("should create boss with required fields", () => {
      const boss = createBoss({
        name: "Ancient Dragon",
        health: 500,
        attack: 30,
        defense: 20,
      });

      expect(boss.id).toBeDefined();
      expect(boss.name).toBe("Ancient Dragon");
      expect(boss.health).toBe(500);
      expect(boss.attack).toBe(30);
      expect(boss.entityType).toBe("boss");
    });

    it("should set maxHealth to health if not provided", () => {
      const boss = createBoss({
        name: "Test Boss",
        health: 200,
        attack: 20,
        defense: 10,
      });

      expect(boss.maxHealth).toBe(200);
    });

    it("should have default phases", () => {
      const boss = createBoss({
        name: "Phase Boss",
        health: 200,
        attack: 20,
        defense: 10,
      });

      expect(boss.phases).toBeDefined();
      expect(boss.phases!.length).toBeGreaterThan(0);
    });

    it("should use custom phases when provided", () => {
      const customPhases = [
        { name: "Phase 1", healthThreshold: 100, attackModifier: 1, defenseModifier: 1 },
        { name: "Phase 2", healthThreshold: 50, attackModifier: 1.5, defenseModifier: 0.8 },
      ];

      const boss = createBoss({
        name: "Custom Boss",
        health: 200,
        attack: 20,
        defense: 10,
        phases: customPhases,
      });

      expect(boss.phases).toHaveLength(2);
      expect(boss.phases![0].name).toBe("Phase 1");
    });
  });
});

// =============================================================================
// STATUS EFFECT PROCESSING TESTS
// =============================================================================

describe("Status Effect Processing", () => {
  describe("processStatusEffects()", () => {
    it("should tick down effect durations", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({ duration: 3 }),
          createMockStatusEffect({ duration: 2 }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.player.activeEffects[0].duration).toBe(2);
      expect(result.player.activeEffects[1].duration).toBe(1);
    });

    it("should remove expired effects", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({ name: "Expiring", duration: 1 }),
          createMockStatusEffect({ name: "Lasting", duration: 5 }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.player.activeEffects).toHaveLength(1);
      expect(result.player.activeEffects[0].name).toBe("Lasting");
      expect(result.expiredEffects).toHaveLength(1);
      expect(result.expiredEffects[0].name).toBe("Expiring");
    });

    it("should calculate tick heal from positive healthRegen", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({
            name: "Regeneration",
            duration: 3,
            modifiers: { healthRegen: 5 },
          }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.tickHeal).toBe(5);
      expect(result.tickDamage).toBe(0);
    });

    it("should calculate tick damage from negative healthRegen", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({
            name: "Burning",
            duration: 2,
            modifiers: { healthRegen: -3 },
          }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.tickDamage).toBe(3);
      expect(result.tickHeal).toBe(0);
    });

    it("should stack multiple health effects", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({ duration: 3, modifiers: { healthRegen: 5 } }),
          createMockStatusEffect({ duration: 3, modifiers: { healthRegen: -2 } }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.tickHeal).toBe(5);
      expect(result.tickDamage).toBe(2);
    });

    it("should handle empty effects array", () => {
      const player = createMockPlayer({ activeEffects: [] });

      const result = processStatusEffects(player);

      expect(result.player.activeEffects).toHaveLength(0);
      expect(result.tickHeal).toBe(0);
      expect(result.tickDamage).toBe(0);
    });

    it("should preserve effects with 0 duration (permanent)", () => {
      const player = createMockPlayer({
        activeEffects: [
          createMockStatusEffect({ name: "Permanent", duration: 0 }),
        ],
      });

      const result = processStatusEffects(player);

      expect(result.player.activeEffects).toHaveLength(1);
      expect(result.expiredEffects).toHaveLength(0);
    });
  });
});

// =============================================================================
// EFFECTIVE STATS CALCULATION TESTS
// =============================================================================

describe("Effective Stats Calculation", () => {
  describe("calculateEffectiveStats()", () => {
    it("should return base stats with no equipment or effects", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({
          attack: 10,
          defense: 5,
          maxHealth: 100,
        }),
        activeEffects: [],
        equipment: createMockEquipment(),
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.attack).toBe(10);
      expect(effective.defense).toBe(5);
      expect(effective.maxHealth).toBe(100);
    });

    it("should apply weapon attack bonus", () => {
      const weapon = createMockItem({
        category: "weapon",
        stats: { attack: 8 },
      });

      const player = createMockPlayer({
        stats: createMockPlayerStats({ attack: 10 }),
        equipment: createMockEquipment({ weapon }),
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.attack).toBe(18); // 10 + 8
    });

    it("should apply armor defense bonus", () => {
      const armor = createMockItem({
        category: "armor",
        stats: { defense: 6 },
      });

      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 5 }),
        equipment: createMockEquipment({ armor }),
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.defense).toBe(11); // 5 + 6
    });

    it("should apply buff modifiers from active effects", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ attack: 10, defense: 5 }),
        activeEffects: [
          createMockStatusEffect({ duration: 3, modifiers: { attack: 5 } }),
        ],
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.attack).toBe(15); // 10 + 5
    });

    it("should apply debuff modifiers from active effects", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ defense: 8 }),
        activeEffects: [
          createMockStatusEffect({ duration: 2, modifiers: { defense: -3 } }),
        ],
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.defense).toBe(5); // 8 - 3
    });

    it("should stack multiple effect modifiers", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ attack: 10, defense: 10 }),
        activeEffects: [
          createMockStatusEffect({ duration: 3, modifiers: { attack: 5 } }),
          createMockStatusEffect({ duration: 3, modifiers: { attack: 3 } }),
          createMockStatusEffect({ duration: 3, modifiers: { defense: -2 } }),
        ],
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.attack).toBe(18); // 10 + 5 + 3
      expect(effective.defense).toBe(8); // 10 - 2
    });

    it("should allow negative attack from debuffs (game handles clamping elsewhere)", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ attack: 5 }),
        activeEffects: [
          createMockStatusEffect({ duration: 3, modifiers: { attack: -10 } }),
        ],
      });

      const effective = calculateEffectiveStats(player);

      // calculateEffectiveStats returns raw calculation; combat system clamps at damage time
      expect(effective.attack).toBe(-5);
    });

    it("should apply crit chance modifiers", () => {
      const player = createMockPlayer({
        stats: createMockPlayerStats({ critChance: 0.05 }),
        activeEffects: [
          createMockStatusEffect({ duration: 3, modifiers: { critChance: 0.1 } }),
        ],
      });

      const effective = calculateEffectiveStats(player);

      expect(effective.critChance).toBeCloseTo(0.15);
    });
  });
});

// =============================================================================
// PREDEFINED EFFECTS TESTS
// =============================================================================

describe("Predefined Status Effects", () => {
  it("should have weakened effect factory defined", () => {
    expect(STATUS_EFFECTS.weakened).toBeDefined();
    const effect = STATUS_EFFECTS.weakened();
    expect(effect.effectType).toBe("debuff");
    expect(effect.modifiers?.attack).toBeLessThan(0);
  });

  it("should have poisoned effect factory defined", () => {
    expect(STATUS_EFFECTS.poisoned).toBeDefined();
    const effect = STATUS_EFFECTS.poisoned();
    expect(effect.effectType).toBe("debuff");
  });

  it("should have blessed effect factory defined", () => {
    expect(STATUS_EFFECTS.blessed).toBeDefined();
    const effect = STATUS_EFFECTS.blessed();
    expect(effect.effectType).toBe("buff");
  });

  it("should have all effect factories producing valid effects", () => {
    for (const [name, factory] of Object.entries(STATUS_EFFECTS)) {
      const effect = (factory as () => ReturnType<typeof createStatusEffect>)();
      expect(effect.name, `${name} should have name`).toBeDefined();
      expect(effect.effectType, `${name} should have effectType`).toBeDefined();
      // Duration can be -1 for permanent effects (e.g., cursed) or >= 0 for timed effects
      expect(effect.duration, `${name} should have valid duration`).toBeGreaterThanOrEqual(-1);
    }
  });
});
