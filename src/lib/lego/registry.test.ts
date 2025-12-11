/**
 * LEGO Registry Tests
 *
 * Tests tier resolution functions - critical path for game economy.
 * If these break, rewards/blessings/curses all fail.
 */

import { describe, it, expect } from "vitest"
import {
  resolveRewardTier,
  getDispositionDelta,
  getBlessingStats,
  getCurseStats,
  getPowerMultiplier,
} from "./registry"
import { REWARD_TIERS, BLESSING_TIERS, CURSE_TIERS, DISPOSITION_CHANGES } from "./pieces"

describe("resolveRewardTier", () => {
  it("returns_zero_when_tier_is_none", () => {
    // Arrange
    const tier = "none" as const

    // Act
    const goldResult = resolveRewardTier("gold", tier)
    const healResult = resolveRewardTier("healing", tier)
    const damageResult = resolveRewardTier("damage", tier)
    const xpResult = resolveRewardTier("experience", tier)

    // Assert
    expect(goldResult).toBe(0)
    expect(healResult).toBe(0)
    expect(damageResult).toBe(0)
    expect(xpResult).toBe(0)
  })

  it("returns_value_within_range_when_tier_is_small", () => {
    // Arrange
    const tier = "small" as const
    const goldRange = REWARD_TIERS.gold.small as { min: number; max: number }

    // Act - run multiple times to test range
    const results: number[] = []
    for (let i = 0; i < 20; i++) {
      results.push(resolveRewardTier("gold", tier))
    }

    // Assert - all values should be within range
    expect(results.every((v) => v >= goldRange.min && v <= goldRange.max)).toBe(true)
  })

  it("returns_value_within_range_when_tier_is_large", () => {
    // Arrange
    const tier = "large" as const
    const healRange = REWARD_TIERS.healing.large as { min: number; max: number }

    // Act
    const results: number[] = []
    for (let i = 0; i < 20; i++) {
      results.push(resolveRewardTier("healing", tier))
    }

    // Assert
    expect(results.every((v) => v >= healRange.min && v <= healRange.max)).toBe(true)
  })

  it("returns_integer_values_only", () => {
    // Arrange
    const tier = "medium" as const

    // Act
    const results: number[] = []
    for (let i = 0; i < 20; i++) {
      results.push(resolveRewardTier("damage", tier))
    }

    // Assert - all values should be integers
    expect(results.every((v) => Number.isInteger(v))).toBe(true)
  })
})

describe("getDispositionDelta", () => {
  it("returns_5_when_change_is_slight", () => {
    // Arrange
    const change = "slight" as const

    // Act
    const result = getDispositionDelta(change)

    // Assert
    expect(result).toBe(DISPOSITION_CHANGES.slight)
    expect(result).toBe(5)
  })

  it("returns_15_when_change_is_moderate", () => {
    // Arrange
    const change = "moderate" as const

    // Act
    const result = getDispositionDelta(change)

    // Assert
    expect(result).toBe(DISPOSITION_CHANGES.moderate)
    expect(result).toBe(15)
  })

  it("returns_30_when_change_is_significant", () => {
    // Arrange
    const change = "significant" as const

    // Act
    const result = getDispositionDelta(change)

    // Assert
    expect(result).toBe(DISPOSITION_CHANGES.significant)
    expect(result).toBe(30)
  })
})

describe("getBlessingStats", () => {
  it("returns_minor_stats_when_tier_is_minor", () => {
    // Arrange
    const tier = "minor" as const

    // Act
    const result = getBlessingStats(tier)

    // Assert
    expect(result).toEqual(BLESSING_TIERS.minor)
    expect(result.attack).toBe(2)
    expect(result.defense).toBe(1)
  })

  it("returns_major_stats_when_tier_is_major", () => {
    // Arrange
    const tier = "major" as const

    // Act
    const result = getBlessingStats(tier)

    // Assert
    expect(result).toEqual(BLESSING_TIERS.major)
    expect(result.attack).toBe(7)
    expect(result.defense).toBe(5)
  })
})

describe("getCurseStats", () => {
  it("returns_negative_stats_when_tier_is_minor", () => {
    // Arrange
    const tier = "minor" as const

    // Act
    const result = getCurseStats(tier)

    // Assert
    expect(result).toEqual(CURSE_TIERS.minor)
    expect(result.attack).toBe(-2)
    expect(result.defense).toBe(-1)
  })

  it("returns_severe_penalties_when_tier_is_major", () => {
    // Arrange
    const tier = "major" as const

    // Act
    const result = getCurseStats(tier)

    // Assert
    expect(result).toEqual(CURSE_TIERS.major)
    expect(result.attack).toBe(-7)
    expect(result.defense).toBe(-5)
  })
})

describe("getPowerMultiplier", () => {
  it("returns_0.6_when_level_is_light", () => {
    // Act
    const result = getPowerMultiplier("light")

    // Assert
    expect(result).toBe(0.6)
  })

  it("returns_1.0_when_level_is_medium", () => {
    // Act
    const result = getPowerMultiplier("medium")

    // Assert
    expect(result).toBe(1.0)
  })

  it("returns_1.5_when_level_is_heavy", () => {
    // Act
    const result = getPowerMultiplier("heavy")

    // Assert
    expect(result).toBe(1.5)
  })
})
