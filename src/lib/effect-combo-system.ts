import { createEnhancedEffect, type EnhancedStatusEffect } from "./effect-system"
import { generateEntityId } from "./entity-system"

// Effect element/tag types for interaction matching
export type EffectElement =
  | "fire"
  | "ice"
  | "lightning"
  | "water"
  | "poison"
  | "holy"
  | "dark"
  | "arcane"
  | "nature"
  | "blood"
  | "physical"
  | "psychic"

export type EffectTag =
  | "burning"
  | "wet"
  | "frozen"
  | "oiled"
  | "bleeding"
  | "shocked"
  | "blinded"
  | "cursed"
  | "blessed"
  | "ethereal"
  | "enraged"
  | "weakened"
  | "empowered"
  | "vulnerable"

// Combo definition: what happens when two effects meet
export interface EffectCombo {
  id: string
  name: string
  // Triggers - can match by element, tag, or specific effect names
  trigger1: { element?: EffectElement; tag?: EffectTag; effectName?: string }
  trigger2: { element?: EffectElement; tag?: EffectTag; effectName?: string }
  // Result
  result: ComboResult
  // Flavor
  narrative: string
  // Whether both source effects are consumed
  consumesTriggers: [boolean, boolean]
}

export type ComboResult =
  | {
      type: "new_effect"
      effect: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" }
    }
  | { type: "damage"; amount: number; damageType: string }
  | { type: "heal"; amount: number }
  | { type: "remove_both" }
  | {
      type: "transform"
      newEffect: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" }
    }
  | { type: "amplify"; multiplier: number; target: "first" | "second" | "both" }
  | { type: "spread"; radius: "self" | "enemy" | "all" }
  | {
      type: "chain"
      effects: Array<Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" }>
    }

// Predefined combos - these create emergent gameplay
export const EFFECT_COMBOS: EffectCombo[] = [
  // Fire + Oil = Explosion
  {
    id: "fire_oil_explosion",
    name: "Explosive Conflagration",
    trigger1: { element: "fire" },
    trigger2: { tag: "oiled" },
    result: {
      type: "chain",
      effects: [
        {
          name: "Explosion",
          effectType: "debuff",
          category: "damage_over_time",
          durationType: "turns",
          durationValue: 1,
          modifiers: { healthRegen: -15 },
          powerLevel: 7,
        },
        {
          name: "Singed",
          effectType: "debuff",
          category: "stat_modifier",
          durationType: "turns",
          durationValue: 3,
          modifiers: { defense: -3 },
          powerLevel: 3,
        },
      ],
    },
    narrative: "The flames ignite the oil—BOOM! An explosion engulfs everything!",
    consumesTriggers: [true, true],
  },

  // Water + Lightning = Amplified Shock
  {
    id: "wet_lightning_shock",
    name: "Conducting Surge",
    trigger1: { tag: "wet" },
    trigger2: { element: "lightning" },
    result: { type: "amplify", multiplier: 2.5, target: "second" },
    narrative: "Lightning courses through the water, amplifying its devastating power!",
    consumesTriggers: [true, false],
  },

  // Fire + Water = Steam (Blindness)
  {
    id: "fire_water_steam",
    name: "Scalding Steam",
    trigger1: { element: "fire" },
    trigger2: { element: "water" },
    result: {
      type: "new_effect",
      effect: {
        name: "Blinded by Steam",
        effectType: "debuff",
        category: "control",
        durationType: "turns",
        durationValue: 2,
        modifiers: { attack: -5 },
        powerLevel: 4,
        animation: "flicker",
      },
    },
    narrative: "Fire meets water in a hissing burst of scalding steam!",
    consumesTriggers: [true, true],
  },

  // Ice + Fire = Cancel
  {
    id: "ice_fire_cancel",
    name: "Elemental Neutralization",
    trigger1: { element: "ice" },
    trigger2: { element: "fire" },
    result: { type: "remove_both" },
    narrative: "Fire and ice clash, canceling each other out in a burst of mist.",
    consumesTriggers: [true, true],
  },

  // Frozen + Blunt = Shatter
  {
    id: "frozen_shatter",
    name: "Frozen Shatter",
    trigger1: { tag: "frozen" },
    trigger2: { element: "physical" },
    result: {
      type: "chain",
      effects: [
        {
          name: "Shattered",
          effectType: "debuff",
          category: "vulnerability",
          durationType: "turns",
          durationValue: 4,
          modifiers: { defense: -6 },
          powerLevel: 5,
        },
      ],
    },
    narrative: "The frozen form shatters under the impact, fragments flying!",
    consumesTriggers: [true, false],
  },

  // Poison + Blood = Sepsis
  {
    id: "poison_blood_sepsis",
    name: "Festering Sepsis",
    trigger1: { element: "poison" },
    trigger2: { tag: "bleeding" },
    result: {
      type: "transform",
      newEffect: {
        name: "Sepsis",
        effectType: "debuff",
        category: "damage_over_time",
        durationType: "turns",
        durationValue: 6,
        stackBehavior: "intensity",
        maxStacks: 3,
        modifiers: { healthRegen: -5, attack: -2, defense: -2 },
        powerLevel: 7,
        animation: "poison",
      },
    },
    narrative: "Poison seeps into open wounds, festering into deadly sepsis!",
    consumesTriggers: [true, true],
  },

  // Holy + Dark = Void Rift
  {
    id: "holy_dark_rift",
    name: "Reality Tear",
    trigger1: { element: "holy" },
    trigger2: { element: "dark" },
    result: {
      type: "chain",
      effects: [
        {
          name: "Reality Torn",
          effectType: "neutral",
          category: "triggered",
          durationType: "hits",
          durationValue: 3,
          powerLevel: 8,
          triggeredEffects: [
            {
              trigger: "on_damage_taken",
              chance: 0.3,
              effect: "explode",
              narrative: "The rift lashes out!",
            },
          ],
        },
      ],
    },
    narrative: "Light and shadow collide, tearing a rift in reality itself!",
    consumesTriggers: [true, true],
  },

  // Blessed + Cursed = Unstable
  {
    id: "blessed_cursed_unstable",
    name: "Spiritual Turmoil",
    trigger1: { tag: "blessed" },
    trigger2: { tag: "cursed" },
    result: {
      type: "new_effect",
      effect: {
        name: "Spiritually Unstable",
        effectType: "neutral",
        category: "triggered",
        durationType: "rooms",
        durationValue: 3,
        powerLevel: 6,
        triggeredEffects: [
          {
            trigger: "turn_start",
            chance: 0.5,
            effect: "explode",
            narrative: "Your spirit flickers between light and dark...",
          },
        ],
      },
    },
    narrative: "Blessing and curse war within you, creating spiritual chaos!",
    consumesTriggers: [true, true],
  },

  // Empowered + Enraged = Berserker
  {
    id: "empowered_enraged_berserk",
    name: "Berserker Fury",
    trigger1: { tag: "empowered" },
    trigger2: { tag: "enraged" },
    result: {
      type: "transform",
      newEffect: {
        name: "Berserker Fury",
        effectType: "buff",
        category: "transformation",
        durationType: "turns",
        durationValue: 4,
        modifiers: { attack: 10, defense: -4 },
        powerLevel: 8,
        animation: "pulse",
      },
    },
    narrative: "Power and rage fuse into unstoppable berserker fury!",
    consumesTriggers: [true, true],
  },

  // Nature + Poison = Toxic Growth
  {
    id: "nature_poison_growth",
    name: "Toxic Bloom",
    trigger1: { element: "nature" },
    trigger2: { element: "poison" },
    result: {
      type: "new_effect",
      effect: {
        name: "Toxic Spores",
        effectType: "debuff",
        category: "damage_over_time",
        durationType: "rooms",
        durationValue: 2,
        modifiers: { healthRegen: -2 },
        powerLevel: 4,
        stackBehavior: "intensity",
        maxStacks: 4,
      },
    },
    narrative: "Nature's growth feeds on the poison, blooming into toxic spores!",
    consumesTriggers: [false, true],
  },
]

// Effect element/tag mapping for existing effects
export function getEffectElements(effect: EnhancedStatusEffect): EffectElement[] {
  const elements: EffectElement[] = []
  const name = effect.name.toLowerCase()

  if (name.includes("burn") || name.includes("fire") || name.includes("flame") || name.includes("scorch"))
    elements.push("fire")
  if (name.includes("frost") || name.includes("ice") || name.includes("frozen") || name.includes("cold"))
    elements.push("ice")
  if (name.includes("shock") || name.includes("lightning") || name.includes("electric")) elements.push("lightning")
  if (name.includes("water") || name.includes("wet") || name.includes("drown") || name.includes("flood"))
    elements.push("water")
  if (name.includes("poison") || name.includes("venom") || name.includes("toxic")) elements.push("poison")
  if (name.includes("holy") || name.includes("divine") || name.includes("blessed") || name.includes("radiant"))
    elements.push("holy")
  if (name.includes("dark") || name.includes("shadow") || name.includes("curse") || name.includes("necrotic"))
    elements.push("dark")
  if (name.includes("arcane") || name.includes("magic") || name.includes("mana")) elements.push("arcane")
  if (name.includes("nature") || name.includes("growth") || name.includes("thorn") || name.includes("vine"))
    elements.push("nature")
  if (name.includes("blood") || name.includes("bleed") || name.includes("hemorrhage")) elements.push("blood")
  if (
    name.includes("strike") ||
    name.includes("bash") ||
    name.includes("crush") ||
    (effect.category === "damage_over_time" && !elements.length)
  )
    elements.push("physical")
  if (name.includes("fear") || name.includes("terror") || name.includes("madness") || name.includes("confusion"))
    elements.push("psychic")

  return elements.length ? elements : ["physical"] // default
}

export function getEffectTags(effect: EnhancedStatusEffect): EffectTag[] {
  const tags: EffectTag[] = []
  const name = effect.name.toLowerCase()

  if (name.includes("burn") || effect.animation === "burn") tags.push("burning")
  if (name.includes("wet") || name.includes("soak") || name.includes("drench")) tags.push("wet")
  if (name.includes("frozen") || name.includes("freeze") || effect.animation === "freeze") tags.push("frozen")
  if (name.includes("oil") || name.includes("grease")) tags.push("oiled")
  if (name.includes("bleed") || name.includes("hemorrhage") || name.includes("lacerat")) tags.push("bleeding")
  if (name.includes("shock") || name.includes("paralyz")) tags.push("shocked")
  if (name.includes("blind") || name.includes("darkness")) tags.push("blinded")
  if (effect.entityType === "curse" || name.includes("curse")) tags.push("cursed")
  if (effect.entityType === "blessing" || name.includes("bless")) tags.push("blessed")
  if (name.includes("ethereal") || name.includes("ghost") || name.includes("spirit")) tags.push("ethereal")
  if (name.includes("rage") || name.includes("fury") || name.includes("enrage")) tags.push("enraged")
  if (name.includes("weaken") || name.includes("exhaust") || name.includes("fatigue")) tags.push("weakened")
  if (name.includes("empower") || name.includes("strengthen") || name.includes("might")) tags.push("empowered")
  if (name.includes("vulnerable") || name.includes("exposed")) tags.push("vulnerable")

  return tags
}

// Check for and process effect combos
export function checkEffectCombos(
  effects: EnhancedStatusEffect[],
  newEffect: EnhancedStatusEffect,
): {
  comboTriggered: EffectCombo | null
  resultingEffects: EnhancedStatusEffect[]
  removedEffects: EnhancedStatusEffect[]
  damageDealt: number
  healingDone: number
  narrative: string
} {
  const newElements = getEffectElements(newEffect)
  const newTags = getEffectTags(newEffect)

  for (const combo of EFFECT_COMBOS) {
    // Check if new effect matches trigger1
    const newMatchesTrigger1 = matchesTrigger(newEffect, newElements, newTags, combo.trigger1)
    const newMatchesTrigger2 = matchesTrigger(newEffect, newElements, newTags, combo.trigger2)

    if (!newMatchesTrigger1 && !newMatchesTrigger2) continue

    // Find existing effect that matches the other trigger
    const triggerToFind = newMatchesTrigger1 ? combo.trigger2 : combo.trigger1
    const existingMatch = effects.find((e) => {
      const elements = getEffectElements(e)
      const tags = getEffectTags(e)
      return matchesTrigger(e, elements, tags, triggerToFind)
    })

    if (!existingMatch) continue

    // Combo triggered!
    return processCombo(combo, newEffect, existingMatch, effects, newMatchesTrigger1)
  }

  // No combo, just add the effect normally
  return {
    comboTriggered: null,
    resultingEffects: [...effects, newEffect],
    removedEffects: [],
    damageDealt: 0,
    healingDone: 0,
    narrative: "",
  }
}

function matchesTrigger(
  effect: EnhancedStatusEffect,
  elements: EffectElement[],
  tags: EffectTag[],
  trigger: { element?: EffectElement; tag?: EffectTag; effectName?: string },
): boolean {
  if (trigger.effectName && effect.name.toLowerCase().includes(trigger.effectName.toLowerCase())) return true
  if (trigger.element && elements.includes(trigger.element)) return true
  if (trigger.tag && tags.includes(trigger.tag)) return true
  return false
}

function processCombo(
  combo: EffectCombo,
  newEffect: EnhancedStatusEffect,
  existingEffect: EnhancedStatusEffect,
  allEffects: EnhancedStatusEffect[],
  newIsTrigger1: boolean,
): {
  comboTriggered: EffectCombo
  resultingEffects: EnhancedStatusEffect[]
  removedEffects: EnhancedStatusEffect[]
  damageDealt: number
  healingDone: number
  narrative: string
} {
  const removedEffects: EnhancedStatusEffect[] = []
  let resultingEffects = [...allEffects]
  let damageDealt = 0
  let healingDone = 0

  // Remove consumed triggers
  const [consumeFirst, consumeSecond] = combo.consumesTriggers
  const consumeNew = newIsTrigger1 ? consumeFirst : consumeSecond
  const consumeExisting = newIsTrigger1 ? consumeSecond : consumeFirst

  if (consumeExisting) {
    removedEffects.push(existingEffect)
    resultingEffects = resultingEffects.filter((e) => e.id !== existingEffect.id)
  }

  if (consumeNew) {
    removedEffects.push(newEffect)
    // Don't add new effect to results
  } else {
    resultingEffects.push(newEffect)
  }

  // Process combo result
  switch (combo.result.type) {
    case "new_effect":
      resultingEffects.push(createEnhancedEffect(combo.result.effect))
      break

    case "damage":
      damageDealt = combo.result.amount
      break

    case "heal":
      healingDone = combo.result.amount
      break

    case "remove_both":
      // Already handled above
      break

    case "transform":
      resultingEffects.push(createEnhancedEffect(combo.result.newEffect))
      break

    case "amplify": {
      if (combo.result.type === "amplify") {
        const { multiplier, target } = combo.result
        const targetEffect =
          target === "first"
            ? newIsTrigger1
              ? newEffect
              : existingEffect
            : newIsTrigger1
              ? existingEffect
              : newEffect

        if (!removedEffects.includes(targetEffect)) {
          const amplified = {
            ...targetEffect,
            id: generateEntityId("effect"),
            name: `Amplified ${targetEffect.name}`,
            powerLevel: Math.min(10, targetEffect.powerLevel * multiplier),
            modifiers: Object.fromEntries(
              Object.entries(targetEffect.modifiers).map(([k, v]) => [
                k,
                typeof v === "number" ? Math.floor(v * multiplier) : v,
              ]),
            ),
          }
          resultingEffects = resultingEffects.filter((e) => e.id !== targetEffect.id)
          resultingEffects.push(amplified as EnhancedStatusEffect)
        }
      }
      break
    }

    case "chain":
      for (const effect of combo.result.effects) {
        resultingEffects.push(createEnhancedEffect(effect))
      }
      break
  }

  return {
    comboTriggered: combo,
    resultingEffects,
    removedEffects,
    damageDealt,
    healingDone,
    narrative: combo.narrative,
  }
}

// Check for passive combo interactions each turn
export function processPassiveCombos(effects: EnhancedStatusEffect[]): {
  updatedEffects: EnhancedStatusEffect[]
  comboNarratives: string[]
  damageDealt: number
  healingDone: number
} {
  const comboNarratives: string[] = []
  let damageDealt = 0
  let healingDone = 0
  let currentEffects = [...effects]

  // Check each pair of effects for passive interactions
  for (let i = 0; i < currentEffects.length; i++) {
    for (let j = i + 1; j < currentEffects.length; j++) {
      const effect1 = currentEffects[i]
      const effect2 = currentEffects[j]

      const elements1 = getEffectElements(effect1)
      const elements2 = getEffectElements(effect2)
      const tags1 = getEffectTags(effect1)
      const tags2 = getEffectTags(effect2)

      for (const combo of EFFECT_COMBOS) {
        const match1to1 = matchesTrigger(effect1, elements1, tags1, combo.trigger1)
        const match1to2 = matchesTrigger(effect1, elements1, tags1, combo.trigger2)
        const match2to1 = matchesTrigger(effect2, elements2, tags2, combo.trigger1)
        const match2to2 = matchesTrigger(effect2, elements2, tags2, combo.trigger2)

        if ((match1to1 && match2to2) || (match1to2 && match2to1)) {
          // Passive combo triggered
          const result = processCombo(combo, effect1, effect2, currentEffects, match1to1)
          currentEffects = result.resultingEffects
          damageDealt += result.damageDealt
          healingDone += result.healingDone
          comboNarratives.push(result.narrative)
          break
        }
      }
    }
  }

  return {
    updatedEffects: currentEffects,
    comboNarratives,
    damageDealt,
    healingDone,
  }
}
