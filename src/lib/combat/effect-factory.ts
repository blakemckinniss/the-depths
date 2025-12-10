import type { EnhancedStatusEffect, DurationType } from "./effect-system"
import type { GeneratedEffectResponse } from "@/lib/hooks/use-event-chain"
import { generateEntityId } from "@/lib/entity/entity-system"

// Convert AI-generated effect response into a proper EnhancedStatusEffect
export function createEffectFromAI(
  aiEffect: GeneratedEffectResponse,
  sourceId?: string,
  sourceName?: string,
): EnhancedStatusEffect {
  // Validate and clamp values for safety
  const powerLevel = Math.min(10, Math.max(1, aiEffect.powerLevel || 5))
  const durationValue = aiEffect.durationType === "permanent" ? -1 : Math.max(1, aiEffect.durationValue || 3)
  const maxStacks = Math.min(10, Math.max(1, aiEffect.maxStacks || 1))

  // Clamp modifiers based on power level to prevent OP effects
  const maxModifier = powerLevel * 2
  const clampModifier = (val: number | undefined) =>
    val !== undefined ? Math.min(maxModifier, Math.max(-maxModifier, val)) : undefined

  return {
    id: generateEntityId("effect"),
    entityType: aiEffect.effectType === "debuff" ? "curse" : aiEffect.effectType === "buff" ? "blessing" : "effect",
    name: aiEffect.name,
    description: aiEffect.description,
    effectType: aiEffect.effectType,

    // Duration
    durationType: aiEffect.durationType || "turns",
    durationValue,
    durationRemaining: durationValue,
    condition: aiEffect.condition,

    // Category & triggers
    category: aiEffect.category || "stat_modifier",
    triggers: aiEffect.triggers || ["passive"],

    // Stacking
    stackBehavior: aiEffect.stackBehavior || "none",
    currentStacks: 1,
    stacks: 1, // backwards compat
    maxStacks,
    stackModifier: Math.min(2, Math.max(1, aiEffect.stackModifier || 1)),

    // Balance
    powerLevel,
    rarity: aiEffect.rarity || "common",

    // Modifiers (clamped)
    modifiers: {
      attack: clampModifier(aiEffect.modifiers?.attack),
      defense: clampModifier(aiEffect.modifiers?.defense),
      maxHealth: clampModifier(aiEffect.modifiers?.maxHealth),
      healthRegen: clampModifier(aiEffect.modifiers?.healthRegen),
      goldMultiplier: aiEffect.modifiers?.goldMultiplier
        ? Math.min(3, Math.max(0.25, aiEffect.modifiers.goldMultiplier))
        : undefined,
      expMultiplier: aiEffect.modifiers?.expMultiplier
        ? Math.min(3, Math.max(0.25, aiEffect.modifiers.expMultiplier))
        : undefined,
    },

    // Narration
    applyNarration: aiEffect.applyNarration,
    tickNarration: aiEffect.tickNarration,
    expireNarration: aiEffect.expireNarration,

    // Triggered effects
    triggeredEffects: aiEffect.triggeredEffects?.map((t) => ({
      trigger: t.trigger,
      chance: Math.min(1, Math.max(0, t.chance)),
      narrative: t.narrative,
      effect:
        t.effectName === "remove_self"
          ? "remove_self"
          : { name: t.effectName || "Triggered", effectType: "neutral" as const },
    })),

    // Cleansing
    cleansable: aiEffect.cleansable ?? aiEffect.effectType === "debuff",
    cleanseResistance: aiEffect.cleanseResistance,

    // Source tracking
    sourceId,
    sourceName,
    sourceType: "ai_generated",

    // Visual
    animation: aiEffect.animation,
    color: aiEffect.color,
  }
}

// Quick effect creators for common scenarios
export function createQuickBuff(
  name: string,
  modifiers: Partial<EnhancedStatusEffect["modifiers"]>,
  duration = 5,
  durationType: DurationType = "turns",
): EnhancedStatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: "blessing",
    name,
    effectType: "buff",
    durationType,
    durationValue: duration,
    durationRemaining: duration,
    category: "stat_modifier",
    triggers: ["passive"],
    stackBehavior: "none",
    currentStacks: 1,
    stacks: 1,
    maxStacks: 1,
    stackModifier: 1,
    powerLevel: 3,
    rarity: "common",
    modifiers,
    cleansable: false,
    sourceType: "ai_generated",
  }
}

export function createQuickDebuff(
  name: string,
  modifiers: Partial<EnhancedStatusEffect["modifiers"]>,
  duration = 3,
  durationType: DurationType = "turns",
): EnhancedStatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: "curse",
    name,
    effectType: "debuff",
    durationType,
    durationValue: duration,
    durationRemaining: duration,
    category: "stat_modifier",
    triggers: ["passive"],
    stackBehavior: "none",
    currentStacks: 1,
    stacks: 1,
    maxStacks: 1,
    stackModifier: 1,
    powerLevel: 3,
    rarity: "common",
    modifiers,
    cleansable: true,
    sourceType: "ai_generated",
  }
}

export function createDoT(
  name: string,
  damagePerTick: number,
  duration = 4,
  stacks = 1,
  maxStacks = 5,
): EnhancedStatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: "curse",
    name,
    effectType: "debuff",
    durationType: "turns",
    durationValue: duration,
    durationRemaining: duration,
    category: "damage_over_time",
    triggers: ["turn_end"],
    stackBehavior: "intensity",
    currentStacks: stacks,
    stacks,
    maxStacks,
    stackModifier: 1.5,
    powerLevel: 4,
    rarity: "uncommon",
    modifiers: { healthRegen: -damagePerTick },
    cleansable: true,
    sourceType: "ai_generated",
  }
}

export function createHoT(name: string, healPerTick: number, duration = 5): EnhancedStatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: "blessing",
    name,
    effectType: "buff",
    durationType: "turns",
    durationValue: duration,
    durationRemaining: duration,
    category: "heal_over_time",
    triggers: ["turn_end"],
    stackBehavior: "duration",
    currentStacks: 1,
    stacks: 1,
    maxStacks: 1,
    stackModifier: 1,
    powerLevel: 4,
    rarity: "uncommon",
    modifiers: { healthRegen: healPerTick },
    cleansable: false,
    sourceType: "ai_generated",
  }
}

// Create effect from unknown item use result
export function createEffectFromItemUse(
  itemResult: {
    name: string
    effectType: "buff" | "debuff"
    duration: number
    description: string
    modifiers?: Record<string, number>
  },
  itemName: string,
): EnhancedStatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: itemResult.effectType === "debuff" ? "curse" : "blessing",
    name: itemResult.name,
    description: itemResult.description,
    effectType: itemResult.effectType,
    durationType: "turns",
    durationValue: itemResult.duration,
    durationRemaining: itemResult.duration,
    category: "stat_modifier",
    triggers: ["passive"],
    stackBehavior: "none",
    currentStacks: 1,
    stacks: 1,
    maxStacks: 1,
    stackModifier: 1,
    powerLevel: 5,
    rarity: "uncommon",
    modifiers: {
      attack: itemResult.modifiers?.attack,
      defense: itemResult.modifiers?.defense,
      maxHealth: itemResult.modifiers?.maxHealth,
      healthRegen: itemResult.modifiers?.healthRegen,
    },
    applyNarration: `The ${itemName} takes effect.`,
    cleansable: itemResult.effectType === "debuff",
    sourceName: itemName,
    sourceType: "item",
  }
}
