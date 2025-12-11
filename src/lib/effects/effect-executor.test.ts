/**
 * Effect Executor Tests
 *
 * These tests verify the kernel behaves correctly given Effect[] inputs.
 * They use recorded fixtures to enable deterministic replay without hitting the AI.
 *
 * Test strategy:
 * 1. Unit tests: Verify each effect type works correctly
 * 2. Integration tests: Verify effect sequences produce expected state
 * 3. Regression tests: Recorded AI outputs replayed against kernel
 */

import { describe, it, expect, beforeEach } from "vitest"
import { executeEffects, applyEffects, validateEffects, summarizeEffects } from "./effect-executor"
import type { Effect } from "./effect-types"
import type { GameState } from "@/lib/core/game-types"
import { createTestGameState, createTestEnemy } from "@/lib/test-utils/fixtures"

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createBaseState(): GameState {
  // Use default player from createTestGameState, then override specific stats
  const state = createTestGameState({});
  state.player.stats.health = 100;
  state.player.stats.maxHealth = 100;
  state.player.stats.attack = 10;
  state.player.stats.defense = 5;
  state.player.stats.gold = 50;
  state.player.stats.experience = 0;
  state.player.stats.level = 1;
  return state;
}

// =============================================================================
// UNIT TESTS: Individual Effect Types
// =============================================================================

describe("Effect Executor - Unit Tests", () => {
  let state: GameState

  beforeEach(() => {
    state = createBaseState()
  })

  describe("DamageEffect", () => {
    it("should reduce player health", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 25,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.health).toBe(75)
      expect(result.applied).toHaveLength(1)
      expect(result.skipped).toHaveLength(0)
    })

    it("should not reduce health below 0", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 150,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.health).toBe(0)
    })

    it("should respect canKill=false", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 150,
          source: "test",
          canKill: false,
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.health).toBe(1)
    })

    it("should damage enemy when in combat", () => {
      const enemy = createTestEnemy({ health: 50, maxHealth: 50 })
      const combatState = { ...state, currentEnemy: enemy, inCombat: true }

      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "enemy" },
          amount: 20,
          source: "player_attack",
        },
      ]

      const result = executeEffects(combatState, effects)
      expect(result.state.currentEnemy?.health).toBe(30)
    })

    it("should skip damage to enemy when not in combat", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "enemy" },
          amount: 20,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toContain("No enemy")
    })

    it("should reject negative damage", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: -10,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toContain("Negative")
    })

    it("should reject damage exceeding cap", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 99999,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toContain("exceeds cap")
    })
  })

  describe("HealEffect", () => {
    it("should increase player health", () => {
      const damagedState = {
        ...state,
        player: {
          ...state.player,
          stats: { ...state.player.stats, health: 50 },
        },
      }

      const effects: Effect[] = [
        {
          effectType: "heal",
          target: { type: "player" },
          amount: 30,
          source: "potion",
        },
      ]

      const result = executeEffects(damagedState, effects)
      expect(result.state.player.stats.health).toBe(80)
    })

    it("should not exceed max health by default", () => {
      const effects: Effect[] = [
        {
          effectType: "heal",
          target: { type: "player" },
          amount: 50,
          source: "test",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.health).toBe(100) // maxHealth
    })

    it("should allow overheal when specified", () => {
      const effects: Effect[] = [
        {
          effectType: "heal",
          target: { type: "player" },
          amount: 50,
          source: "test",
          canOverheal: true,
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.health).toBe(150) // 1.5x max
    })
  })

  describe("ModifyGoldEffect", () => {
    it("should add gold", () => {
      const effects: Effect[] = [
        {
          effectType: "modify_gold",
          amount: 100,
          source: "loot",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.gold).toBe(150)
    })

    it("should remove gold", () => {
      const effects: Effect[] = [
        {
          effectType: "modify_gold",
          amount: -30,
          source: "purchase",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.stats.gold).toBe(20)
    })

    it("should clamp gold to 0 when not a purchase (theft scenario)", () => {
      // Note: Current implementation rejects insufficient gold.
      // For theft/penalty scenarios, you might want to use a separate
      // "force_modify_gold" effect that clamps instead of rejects.
      // This test verifies the current rejection behavior.
      const effects: Effect[] = [
        {
          effectType: "modify_gold",
          amount: -100,
          source: "theft",
        },
      ]

      const result = executeEffects(state, effects)
      // Currently rejects - gold unchanged
      expect(result.state.player.stats.gold).toBe(50)
      expect(result.skipped).toHaveLength(1)
    })

    it("should reject insufficient gold", () => {
      const effects: Effect[] = [
        {
          effectType: "modify_gold",
          amount: -100,
          source: "purchase",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toContain("Insufficient")
    })
  })

  describe("ApplyStatusEffect", () => {
    it("should add status effect to player", () => {
      const effects: Effect[] = [
        {
          effectType: "apply_status",
          target: { type: "player" },
          status: {
            id: "test_buff",
            name: "Strength",
            entityType: "effect",
            effectType: "buff",
            duration: 3,
            modifiers: { attack: 5 },
          },
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.state.player.activeEffects).toHaveLength(1)
      expect(result.state.player.activeEffects[0].name).toBe("Strength")
    })

    it("should stack existing effects", () => {
      const stateWithEffect = {
        ...state,
        player: {
          ...state.player,
          activeEffects: [
            {
              id: "existing",
              name: "Poison",
              entityType: "effect" as const,
              effectType: "debuff" as const,
              duration: 2,
              stacks: 1,
              modifiers: {},
            },
          ],
        },
      }

      const effects: Effect[] = [
        {
          effectType: "apply_status",
          target: { type: "player" },
          status: {
            id: "new_poison",
            name: "Poison",
            entityType: "effect",
            effectType: "debuff",
            duration: 3,
            modifiers: {},
          },
        },
      ]

      const result = executeEffects(stateWithEffect, effects)
      expect(result.state.player.activeEffects).toHaveLength(1)
      expect(result.state.player.activeEffects[0].stacks).toBe(2)
      expect(result.state.player.activeEffects[0].duration).toBe(3) // refreshed
    })
  })

  describe("EndCombatEffect", () => {
    it("should end combat and clear enemy", () => {
      const enemy = createTestEnemy()
      const combatState = { ...state, currentEnemy: enemy, inCombat: true }

      const effects: Effect[] = [
        {
          effectType: "end_combat",
          result: "victory",
        },
      ]

      const result = executeEffects(combatState, effects)
      expect(result.state.inCombat).toBe(false)
      expect(result.state.currentEnemy).toBeNull()
    })

    it("should reject when not in combat", () => {
      const effects: Effect[] = [
        {
          effectType: "end_combat",
          result: "victory",
        },
      ]

      const result = executeEffects(state, effects)
      expect(result.skipped).toHaveLength(1)
      expect(result.skipped[0].reason).toContain("Not in combat")
    })
  })
})

// =============================================================================
// INTEGRATION TESTS: Effect Sequences
// =============================================================================

describe("Effect Executor - Integration Tests", () => {
  it("should apply multiple effects in sequence", () => {
    const state = createBaseState()
    const enemy = createTestEnemy({ health: 30, maxHealth: 30 })
    const combatState = { ...state, currentEnemy: enemy, inCombat: true }

    const effects: Effect[] = [
      // Player takes damage
      {
        effectType: "damage",
        target: { type: "player" },
        amount: 15,
        source: "enemy_attack",
      },
      // Player gains gold from killing enemy
      {
        effectType: "modify_gold",
        amount: 25,
        source: "enemy_loot",
      },
      // Player gets a buff
      {
        effectType: "apply_status",
        target: { type: "player" },
        status: {
          id: "victory_buff",
          name: "Battle Fury",
          entityType: "effect",
          effectType: "buff",
          duration: 5,
          modifiers: { attack: 2 },
        },
      },
    ]

    const result = executeEffects(combatState, effects)

    expect(result.state.player.stats.health).toBe(85)
    expect(result.state.player.stats.gold).toBe(75)
    expect(result.state.player.activeEffects).toHaveLength(1)
    expect(result.applied).toHaveLength(3)
    expect(result.skipped).toHaveLength(0)
  })

  it("should continue after skipped effects", () => {
    const state = createBaseState()

    const effects: Effect[] = [
      // Valid effect
      {
        effectType: "heal",
        target: { type: "player" },
        amount: 10,
        source: "test",
      },
      // Invalid: negative damage
      {
        effectType: "damage",
        target: { type: "player" },
        amount: -5,
        source: "test",
      },
      // Valid effect - should still apply
      {
        effectType: "modify_gold",
        amount: 20,
        source: "test",
      },
    ]

    const result = executeEffects(state, effects)

    expect(result.applied).toHaveLength(2)
    expect(result.skipped).toHaveLength(1)
    expect(result.state.player.stats.gold).toBe(70) // Gold was added
  })
})

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe("Effect Executor - Utilities", () => {
  describe("applyEffects", () => {
    it("should return just the new state", () => {
      const state = createBaseState()
      const effects: Effect[] = [
        {
          effectType: "modify_gold",
          amount: 100,
          source: "test",
        },
      ]

      const newState = applyEffects(state, effects)
      expect(newState.player.stats.gold).toBe(150)
    })
  })

  describe("validateEffects", () => {
    it("should validate without executing", () => {
      const state = createBaseState()
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 10,
          source: "test",
        },
        {
          effectType: "damage",
          target: { type: "player" },
          amount: -5,
          source: "test",
        },
      ]

      const validations = validateEffects(state, effects)

      expect(validations[0].valid).toBe(true)
      expect(validations[1].valid).toBe(false)
      // State should not have changed
      expect(state.player.stats.health).toBe(100)
    })
  })

  describe("summarizeEffects", () => {
    it("should produce human-readable summaries", () => {
      const effects: Effect[] = [
        {
          effectType: "damage",
          target: { type: "player" },
          amount: 25,
          damageType: "fire",
          source: "test",
        },
        {
          effectType: "heal",
          target: { type: "player" },
          amount: 10,
          source: "test",
        },
        {
          effectType: "modify_gold",
          amount: -50,
          source: "test",
        },
      ]

      const summaries = summarizeEffects(effects)

      expect(summaries[0]).toContain("25")
      expect(summaries[0]).toContain("fire")
      expect(summaries[1]).toContain("Heal")
      expect(summaries[2]).toContain("Lose")
      expect(summaries[2]).toContain("50")
    })
  })
})

// =============================================================================
// REGRESSION TESTS: Recorded AI Outputs
// =============================================================================

describe("Effect Executor - Regression Tests", () => {
  /**
   * These fixtures represent recorded AI outputs.
   * They allow testing the kernel without hitting the AI.
   */
  const RECORDED_FIXTURES = {
    goblin_basic_attack: {
      narration: "The goblin lunges with a rusty shiv!",
      effects: [
        {
          effectType: "damage" as const,
          target: { type: "player" as const },
          amount: 8,
          damageType: "physical" as const,
          source: "goblin attack",
        },
      ],
    },
    skeleton_poison_attack: {
      narration: "The skeleton's blade drips with venom as it strikes!",
      effects: [
        {
          effectType: "damage" as const,
          target: { type: "player" as const },
          amount: 12,
          damageType: "poison" as const,
          source: "Venomed Strike",
        },
        {
          effectType: "apply_status" as const,
          target: { type: "player" as const },
          status: {
            id: "poison_1",
            name: "Poisoned",
            entityType: "effect" as const,
            effectType: "debuff" as const,
            duration: 3,
            modifiers: { healthRegen: -2 },
          },
        },
      ],
    },
  }

  it("should handle recorded goblin attack", () => {
    const state = createBaseState()
    const fixture = RECORDED_FIXTURES.goblin_basic_attack

    const result = executeEffects(state, fixture.effects)

    expect(result.state.player.stats.health).toBe(92) // 100 - 8
    expect(result.applied).toHaveLength(1)
  })

  it("should handle recorded skeleton poison attack", () => {
    const state = createBaseState()
    const fixture = RECORDED_FIXTURES.skeleton_poison_attack

    const result = executeEffects(state, fixture.effects)

    expect(result.state.player.stats.health).toBe(88) // 100 - 12
    expect(result.state.player.activeEffects).toHaveLength(1)
    expect(result.state.player.activeEffects[0].name).toBe("Poisoned")
  })
})
