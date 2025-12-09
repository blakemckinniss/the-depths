import type { StatusEffect, Player, Enemy } from "./game-types"
import { generateEntityId } from "./entity-system"

// Duration types for flexible timing
export type DurationType =
  | "turns" // Decrements each turn in combat
  | "actions" // Decrements when player takes actions
  | "rooms" // Decrements when entering new rooms
  | "hits" // Decrements when taking/dealing damage
  | "permanent" // Lasts until cleansed
  | "conditional" // Removed when condition is met

// Effect trigger timing
export type EffectTrigger =
  | "turn_start"
  | "turn_end"
  | "on_attack"
  | "on_defend"
  | "on_damage_taken"
  | "on_damage_dealt"
  | "on_kill"
  | "on_heal"
  | "on_room_enter"
  | "on_combat_start"
  | "on_combat_end"
  | "passive" // Always active

// Effect categories for AI classification
export type EffectCategory =
  | "damage_over_time"
  | "heal_over_time"
  | "stat_modifier"
  | "damage_modifier"
  | "resistance"
  | "vulnerability"
  | "control" // stun, slow, blind
  | "utility" // gold bonus, exp bonus
  | "transformation" // temporary form changes
  | "triggered" // activates on specific events
  | "aura" // affects nearby entities
  | "compound" // multiple effects combined

// Stacking behavior
export type StackBehavior =
  | "none" // Cannot stack, refreshes duration
  | "duration" // Stacks add duration
  | "intensity" // Stacks increase power
  | "independent" // Each instance tracked separately

// Enhanced status effect interface
export interface EnhancedStatusEffect extends Omit<StatusEffect, "duration"> {
  // Duration configuration
  durationType: DurationType
  durationValue: number // -1 for permanent
  durationRemaining: number
  condition?: string // For conditional duration

  // Categorization
  category: EffectCategory
  triggers: EffectTrigger[]

  // Stacking
  stackBehavior: StackBehavior
  currentStacks: number
  maxStacks: number
  stackModifier: number // Multiplier per stack (e.g., 1.5 = 50% more per stack)

  // AI-generated flavor
  applyNarration?: string
  tickNarration?: string
  expireNarration?: string

  // Balance constraints (for AI generation)
  powerLevel: number // 1-10 scale for balancing
  rarity: "common" | "uncommon" | "rare" | "legendary"

  // Source tracking
  sourceId?: string
  sourceName?: string
  sourceType?: "item" | "ability" | "hazard" | "shrine" | "trap" | "enemy" | "environment" | "companion" | "ai_generated"

  // Visual
  icon?: string
  color?: string
  animation?: "pulse" | "shimmer" | "flicker" | "burn" | "freeze" | "poison" | "holy" | "dark"

  // Triggered effects
  triggeredEffects?: TriggeredEffect[]

  // Cleanse resistance
  cleansable: boolean
  cleanseResistance?: number // DC to cleanse
}

// For effects that trigger other effects
export interface TriggeredEffect {
  trigger: EffectTrigger
  chance: number // 0-1
  effect: Partial<EnhancedStatusEffect> | "remove_self" | "spread" | "explode"
  targetType?: "self" | "attacker" | "random_enemy" | "all_enemies"
  narrative?: string
}

// AI generation constraints for balanced effects
export interface EffectGenerationConstraints {
  maxPowerLevel: number
  allowedCategories: EffectCategory[]
  allowedDurationTypes: DurationType[]
  maxDuration: number
  maxStacks: number
  allowPermanent: boolean
  context: {
    source: string
    dungeonTheme?: string
    playerLevel: number
    currentFloor: number
  }
}

// Default balanced constraints by source
export const EFFECT_CONSTRAINTS: Record<string, EffectGenerationConstraints> = {
  common_item: {
    maxPowerLevel: 3,
    allowedCategories: ["stat_modifier", "heal_over_time", "utility"],
    allowedDurationTypes: ["turns", "rooms"],
    maxDuration: 5,
    maxStacks: 1,
    allowPermanent: false,
    context: { source: "common_item", playerLevel: 1, currentFloor: 1 },
  },
  rare_item: {
    maxPowerLevel: 6,
    allowedCategories: ["stat_modifier", "heal_over_time", "damage_over_time", "triggered", "utility"],
    allowedDurationTypes: ["turns", "rooms", "hits"],
    maxDuration: 10,
    maxStacks: 3,
    allowPermanent: false,
    context: { source: "rare_item", playerLevel: 1, currentFloor: 1 },
  },
  legendary_item: {
    maxPowerLevel: 9,
    allowedCategories: [
      "stat_modifier",
      "heal_over_time",
      "damage_over_time",
      "triggered",
      "transformation",
      "compound",
    ],
    allowedDurationTypes: ["turns", "rooms", "hits", "permanent", "conditional"],
    maxDuration: -1,
    maxStacks: 5,
    allowPermanent: true,
    context: { source: "legendary_item", playerLevel: 1, currentFloor: 1 },
  },
  enemy_attack: {
    maxPowerLevel: 5,
    allowedCategories: ["damage_over_time", "stat_modifier", "control", "vulnerability"],
    allowedDurationTypes: ["turns", "hits"],
    maxDuration: 4,
    maxStacks: 3,
    allowPermanent: false,
    context: { source: "enemy_attack", playerLevel: 1, currentFloor: 1 },
  },
  shrine: {
    maxPowerLevel: 7,
    allowedCategories: ["stat_modifier", "heal_over_time", "utility", "transformation", "compound"],
    allowedDurationTypes: ["rooms", "turns", "permanent"],
    maxDuration: 20,
    maxStacks: 1,
    allowPermanent: true,
    context: { source: "shrine", playerLevel: 1, currentFloor: 1 },
  },
  curse: {
    maxPowerLevel: 8,
    allowedCategories: ["damage_over_time", "stat_modifier", "vulnerability", "control", "triggered"],
    allowedDurationTypes: ["permanent", "conditional"],
    maxDuration: -1,
    maxStacks: 1,
    allowPermanent: true,
    context: { source: "curse", playerLevel: 1, currentFloor: 1 },
  },
  environmental: {
    maxPowerLevel: 4,
    allowedCategories: ["damage_over_time", "stat_modifier", "control"],
    allowedDurationTypes: ["turns", "rooms"],
    maxDuration: 3,
    maxStacks: 2,
    allowPermanent: false,
    context: { source: "environmental", playerLevel: 1, currentFloor: 1 },
  },
}

// Create an enhanced effect with defaults
export function createEnhancedEffect(
  partial: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" },
): EnhancedStatusEffect {
  const durationType = partial.durationType ?? "turns"
  const durationValue = partial.durationValue ?? 3

  return {
    id: generateEntityId("effect"),
    entityType: partial.effectType === "debuff" ? "curse" : partial.effectType === "buff" ? "blessing" : "effect",

    durationType,
    durationValue,
    durationRemaining: durationValue,
    condition: partial.condition,

    category: partial.category ?? "stat_modifier",
    triggers: partial.triggers ?? ["passive"],

    stackBehavior: partial.stackBehavior ?? "none",
    currentStacks: partial.currentStacks ?? 1,
    maxStacks: partial.maxStacks ?? 1,
    stackModifier: partial.stackModifier ?? 1,

    powerLevel: partial.powerLevel ?? 3,
    rarity: partial.rarity ?? "common",

    modifiers: partial.modifiers ?? {},

    cleansable: partial.cleansable ?? partial.effectType === "debuff",
    cleanseResistance: partial.cleanseResistance,

    sourceType: partial.sourceType ?? "ai_generated",

    ...partial,
  }
}

// Process effects for a specific trigger
export function processEffectTrigger(
  effects: EnhancedStatusEffect[],
  trigger: EffectTrigger,
  context: {
    player: Player
    enemy?: Enemy
    damageDealt?: number
    damageTaken?: number
    healAmount?: number
  },
): {
  effects: EnhancedStatusEffect[]
  damageToPlayer: number
  healToPlayer: number
  damageToEnemy: number
  narratives: string[]
  expiredEffects: EnhancedStatusEffect[]
  triggeredEffects: EnhancedStatusEffect[]
} {
  let damageToPlayer = 0
  let healToPlayer = 0
  const damageToEnemy = 0
  const narratives: string[] = []
  const expiredEffects: EnhancedStatusEffect[] = []
  const triggeredEffects: EnhancedStatusEffect[] = []

  const updatedEffects = effects
    .map((effect) => {
      // Check if this effect responds to this trigger
      if (!effect.triggers.includes(trigger) && !effect.triggers.includes("passive")) {
        return effect
      }

      // Calculate stack multiplier
      const stackMult =
        effect.stackBehavior === "intensity" ? 1 + (effect.currentStacks - 1) * (effect.stackModifier - 1) : 1

      // Apply effect based on category
      switch (effect.category) {
        case "damage_over_time":
          if (trigger === "turn_start" || trigger === "turn_end") {
            const dot = Math.floor((effect.modifiers.healthRegen ?? -3) * stackMult)
            if (dot < 0) {
              damageToPlayer += Math.abs(dot)
              if (effect.tickNarration) narratives.push(effect.tickNarration)
            }
          }
          break

        case "heal_over_time":
          if (trigger === "turn_start" || trigger === "turn_end") {
            const hot = Math.floor((effect.modifiers.healthRegen ?? 3) * stackMult)
            if (hot > 0) {
              healToPlayer += hot
              if (effect.tickNarration) narratives.push(effect.tickNarration)
            }
          }
          break

        case "triggered":
          // Check triggered effects
          if (effect.triggeredEffects) {
            for (const triggered of effect.triggeredEffects) {
              if (triggered.trigger === trigger && Math.random() < triggered.chance) {
                if (triggered.narrative) narratives.push(triggered.narrative)
                if (typeof triggered.effect === "object") {
                  triggeredEffects.push(
                    createEnhancedEffect({
                      name: `${effect.name} Trigger`,
                      effectType: effect.effectType,
                      ...triggered.effect,
                    }),
                  )
                }
              }
            }
          }
          break
      }

      // Decrement duration based on type
      let shouldDecrement = false
      switch (effect.durationType) {
        case "turns":
          shouldDecrement = trigger === "turn_end"
          break
        case "actions":
          shouldDecrement = ["on_attack", "on_defend", "on_heal"].includes(trigger)
          break
        case "rooms":
          shouldDecrement = trigger === "on_room_enter"
          break
        case "hits":
          shouldDecrement = trigger === "on_damage_taken" || trigger === "on_damage_dealt"
          break
        case "permanent":
          shouldDecrement = false
          break
        case "conditional":
          // AI would determine condition met
          shouldDecrement = false
          break
      }

      if (shouldDecrement && effect.durationRemaining > 0) {
        const newDuration = effect.durationRemaining - 1
        if (newDuration <= 0) {
          expiredEffects.push(effect)
          if (effect.expireNarration) narratives.push(effect.expireNarration)
          return null
        }
        return { ...effect, durationRemaining: newDuration, duration: newDuration }
      }

      return effect
    })
    .filter((e): e is EnhancedStatusEffect => e !== null)

  return {
    effects: [...updatedEffects, ...triggeredEffects],
    damageToPlayer,
    healToPlayer,
    damageToEnemy,
    narratives,
    expiredEffects,
    triggeredEffects,
  }
}

// Apply a new effect with stacking logic
export function applyEffect(
  currentEffects: EnhancedStatusEffect[],
  newEffect: EnhancedStatusEffect,
): { effects: EnhancedStatusEffect[]; narrative: string } {
  const existing = currentEffects.find((e) => e.name === newEffect.name)

  if (existing) {
    switch (newEffect.stackBehavior) {
      case "none":
        // Refresh duration
        return {
          effects: currentEffects.map((e) =>
            e.id === existing.id
              ? { ...e, durationRemaining: newEffect.durationValue, duration: newEffect.durationValue }
              : e,
          ),
          narrative: `${newEffect.name} refreshed.`,
        }

      case "duration":
        // Add duration
        return {
          effects: currentEffects.map((e) =>
            e.id === existing.id
              ? {
                  ...e,
                  durationRemaining: e.durationRemaining + newEffect.durationValue,
                  duration: e.durationRemaining + newEffect.durationValue,
                }
              : e,
          ),
          narrative: `${newEffect.name} extended by ${newEffect.durationValue}.`,
        }

      case "intensity":
        // Increase stacks
        if (existing.currentStacks < existing.maxStacks) {
          return {
            effects: currentEffects.map((e) =>
              e.id === existing.id
                ? {
                    ...e,
                    currentStacks: e.currentStacks + 1,
                    stacks: e.currentStacks + 1,
                    durationRemaining: Math.max(e.durationRemaining, newEffect.durationValue),
                  }
                : e,
            ),
            narrative: `${newEffect.name} intensifies! (${existing.currentStacks + 1}/${existing.maxStacks} stacks)`,
          }
        }
        // At max stacks, just refresh
        return {
          effects: currentEffects.map((e) =>
            e.id === existing.id ? { ...e, durationRemaining: newEffect.durationValue } : e,
          ),
          narrative: `${newEffect.name} at maximum intensity!`,
        }

      case "independent":
        // Add as new instance
        return {
          effects: [...currentEffects, newEffect],
          narrative: newEffect.applyNarration ?? `${newEffect.name} applied.`,
        }
    }
  }

  // New effect
  return {
    effects: [...currentEffects, newEffect],
    narrative: newEffect.applyNarration ?? `${newEffect.name} applied.`,
  }
}

// Remove/cleanse an effect
export function removeEffect(
  effects: EnhancedStatusEffect[],
  effectId: string,
  force = false,
): { effects: EnhancedStatusEffect[]; success: boolean; narrative: string } {
  const effect = effects.find((e) => e.id === effectId)

  if (!effect) {
    return { effects, success: false, narrative: "No such effect." }
  }

  if (!effect.cleansable && !force) {
    return { effects, success: false, narrative: `${effect.name} resists removal!` }
  }

  return {
    effects: effects.filter((e) => e.id !== effectId),
    success: true,
    narrative: effect.expireNarration ?? `${effect.name} fades away.`,
  }
}

// Calculate total stat modifiers from all effects
export function calculateEffectModifiers(effects: EnhancedStatusEffect[]): {
  attack: number
  defense: number
  maxHealth: number
  healthRegen: number
  goldMultiplier: number
  expMultiplier: number
  damageMultiplier: number
  damageTakenMultiplier: number
  critChance: number
  dodgeChance: number
} {
  const totals = {
    attack: 0,
    defense: 0,
    maxHealth: 0,
    healthRegen: 0,
    goldMultiplier: 1,
    expMultiplier: 1,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    critChance: 0,
    dodgeChance: 0,
  }

  for (const effect of effects) {
    const stackMult =
      effect.stackBehavior === "intensity" ? 1 + (effect.currentStacks - 1) * (effect.stackModifier - 1) : 1

    totals.attack += (effect.modifiers.attack ?? 0) * stackMult
    totals.defense += (effect.modifiers.defense ?? 0) * stackMult
    totals.maxHealth += (effect.modifiers.maxHealth ?? 0) * stackMult
    totals.goldMultiplier *= effect.modifiers.goldMultiplier ?? 1
    totals.expMultiplier *= effect.modifiers.expMultiplier ?? 1
  }

  return totals
}

// Predefined enhanced effects
export const ENHANCED_EFFECTS = {
  // Damage over time
  burning: (stacks = 1) =>
    createEnhancedEffect({
      name: "Burning",
      effectType: "debuff",
      category: "damage_over_time",
      durationType: "turns",
      durationValue: 3,
      triggers: ["turn_end"],
      stackBehavior: "intensity",
      currentStacks: stacks,
      maxStacks: 5,
      stackModifier: 1.5,
      modifiers: { healthRegen: -4 },
      powerLevel: 4,
      rarity: "common",
      animation: "burn",
      color: "text-orange-400",
      tickNarration: "Flames lick at your flesh.",
      expireNarration: "The flames finally die out.",
      cleansable: true,
    }),

  bleeding: (stacks = 1) =>
    createEnhancedEffect({
      name: "Bleeding",
      effectType: "debuff",
      category: "damage_over_time",
      durationType: "actions",
      durationValue: 4,
      triggers: ["on_attack", "on_defend"],
      stackBehavior: "intensity",
      currentStacks: stacks,
      maxStacks: 3,
      stackModifier: 1.3,
      modifiers: { healthRegen: -2 },
      powerLevel: 3,
      rarity: "common",
      color: "text-red-500",
      tickNarration: "Blood seeps from your wounds with each movement.",
      cleansable: true,
    }),

  poisoned: (stacks = 1) =>
    createEnhancedEffect({
      name: "Poisoned",
      effectType: "debuff",
      category: "damage_over_time",
      durationType: "turns",
      durationValue: 5,
      triggers: ["turn_start"],
      stackBehavior: "intensity",
      currentStacks: stacks,
      maxStacks: 4,
      stackModifier: 1.25,
      modifiers: { healthRegen: -3, attack: -1 },
      powerLevel: 5,
      rarity: "uncommon",
      animation: "poison",
      color: "text-green-500",
      tickNarration: "Venom courses through your veins.",
      cleansable: true,
    }),

  frostbitten: () =>
    createEnhancedEffect({
      name: "Frostbitten",
      effectType: "debuff",
      category: "compound",
      durationType: "rooms",
      durationValue: 2,
      triggers: ["passive", "turn_start"],
      stackBehavior: "none",
      modifiers: { defense: -3, healthRegen: -1 },
      powerLevel: 4,
      rarity: "uncommon",
      animation: "freeze",
      color: "text-cyan-400",
      applyNarration: "Cold seeps into your bones.",
      cleansable: true,
    }),

  // Heal over time
  regenerating: () =>
    createEnhancedEffect({
      name: "Regenerating",
      effectType: "buff",
      category: "heal_over_time",
      durationType: "turns",
      durationValue: 5,
      triggers: ["turn_end"],
      stackBehavior: "duration",
      modifiers: { healthRegen: 4 },
      powerLevel: 4,
      rarity: "uncommon",
      animation: "pulse",
      color: "text-emerald-400",
      tickNarration: "Your wounds knit together.",
      cleansable: false,
    }),

  // Stat modifiers
  empowered: () =>
    createEnhancedEffect({
      name: "Empowered",
      effectType: "buff",
      category: "stat_modifier",
      durationType: "hits",
      durationValue: 3,
      triggers: ["passive"],
      stackBehavior: "none",
      modifiers: { attack: 5 },
      powerLevel: 4,
      rarity: "uncommon",
      animation: "shimmer",
      color: "text-amber-400",
      applyNarration: "Power surges through you!",
      expireNarration: "The surge of power fades.",
      cleansable: false,
    }),

  shielded: (stacks = 1) =>
    createEnhancedEffect({
      name: "Shielded",
      effectType: "buff",
      category: "stat_modifier",
      durationType: "hits",
      durationValue: 5,
      triggers: ["passive"],
      stackBehavior: "intensity",
      currentStacks: stacks,
      maxStacks: 3,
      stackModifier: 1.5,
      modifiers: { defense: 4 },
      powerLevel: 4,
      rarity: "uncommon",
      animation: "pulse",
      color: "text-sky-400",
      applyNarration: "A protective barrier surrounds you.",
      cleansable: false,
    }),

  // Control effects
  stunned: () =>
    createEnhancedEffect({
      name: "Stunned",
      effectType: "debuff",
      category: "control",
      durationType: "turns",
      durationValue: 1,
      triggers: ["passive"],
      stackBehavior: "none",
      modifiers: { attack: -10, defense: -5 },
      powerLevel: 6,
      rarity: "rare",
      color: "text-yellow-400",
      applyNarration: "You reel, unable to act!",
      expireNarration: "You shake off the daze.",
      cleansable: true,
    }),

  blinded: () =>
    createEnhancedEffect({
      name: "Blinded",
      effectType: "debuff",
      category: "control",
      durationType: "turns",
      durationValue: 2,
      triggers: ["passive"],
      stackBehavior: "duration",
      modifiers: { attack: -6, defense: -3 },
      powerLevel: 5,
      rarity: "uncommon",
      animation: "flicker",
      color: "text-zinc-400",
      applyNarration: "Darkness clouds your vision!",
      cleansable: true,
    }),

  // Triggered effects
  thorns: () =>
    createEnhancedEffect({
      name: "Thorns",
      effectType: "buff",
      category: "triggered",
      durationType: "rooms",
      durationValue: 3,
      triggers: ["on_damage_taken"],
      stackBehavior: "none",
      powerLevel: 5,
      rarity: "rare",
      modifiers: {},
      color: "text-rose-400",
      triggeredEffects: [
        {
          trigger: "on_damage_taken",
          chance: 1,
          effect: { name: "Thorns Strike", effectType: "neutral" },
          targetType: "attacker",
          narrative: "Thorns retaliate against your attacker!",
        },
      ],
      applyNarration: "Thorny vines wrap around you protectively.",
      cleansable: false,
    }),

  vampiric: () =>
    createEnhancedEffect({
      name: "Vampiric",
      effectType: "buff",
      category: "triggered",
      durationType: "turns",
      durationValue: 5,
      triggers: ["on_damage_dealt"],
      stackBehavior: "none",
      powerLevel: 6,
      rarity: "rare",
      modifiers: {},
      color: "text-red-400",
      triggeredEffects: [
        {
          trigger: "on_damage_dealt",
          chance: 0.5,
          effect: "remove_self",
          narrative: "You drain life from your foe!",
        },
      ],
      applyNarration: "A dark hunger awakens within.",
      cleansable: false,
    }),

  // Curses (permanent until cleansed)
  cursed_weakness: () =>
    createEnhancedEffect({
      name: "Curse of Weakness",
      effectType: "debuff",
      category: "stat_modifier",
      durationType: "permanent",
      durationValue: -1,
      triggers: ["passive"],
      stackBehavior: "none",
      modifiers: { attack: -4, defense: -2 },
      powerLevel: 7,
      rarity: "rare",
      animation: "dark",
      color: "text-purple-500",
      applyNarration: "A terrible curse settles upon you!",
      cleansable: true,
      cleanseResistance: 15,
    }),

  doom: () =>
    createEnhancedEffect({
      name: "Doom",
      effectType: "debuff",
      category: "triggered",
      durationType: "turns",
      durationValue: 10,
      triggers: ["turn_end"],
      stackBehavior: "none",
      modifiers: {},
      powerLevel: 9,
      rarity: "legendary",
      animation: "dark",
      color: "text-purple-600",
      tickNarration: "Doom approaches...",
      triggeredEffects: [
        {
          trigger: "turn_end",
          chance: 1,
          effect: "explode",
          narrative: "DOOM consumes you!",
        },
      ],
      applyNarration: "The mark of DOOM appears on your soul.",
      cleansable: true,
      cleanseResistance: 20,
    }),

  // Utility
  fortunate: () =>
    createEnhancedEffect({
      name: "Fortune's Favor",
      effectType: "buff",
      category: "utility",
      durationType: "rooms",
      durationValue: 5,
      triggers: ["passive"],
      stackBehavior: "duration",
      modifiers: { goldMultiplier: 1.5, expMultiplier: 1.25 },
      powerLevel: 5,
      rarity: "rare",
      animation: "shimmer",
      color: "text-amber-300",
      applyNarration: "Luck smiles upon you!",
      cleansable: false,
    }),
}

// AI prompt template for generating balanced effects
export function getEffectGenerationPrompt(constraints: EffectGenerationConstraints): string {
  return `Generate a balanced status effect for a dungeon crawler RPG.

CONSTRAINTS:
- Power Level: 1-${constraints.maxPowerLevel} (${constraints.maxPowerLevel <= 3 ? "weak" : constraints.maxPowerLevel <= 6 ? "moderate" : "powerful"})
- Categories allowed: ${constraints.allowedCategories.join(", ")}
- Duration types: ${constraints.allowedDurationTypes.join(", ")}
- Max duration: ${constraints.maxDuration === -1 ? "permanent allowed" : constraints.maxDuration}
- Max stacks: ${constraints.maxStacks}
- Source: ${constraints.context.source}
- Dungeon theme: ${constraints.context.dungeonTheme ?? "generic"}
- Player level: ${constraints.context.playerLevel}
- Current floor: ${constraints.context.currentFloor}

BALANCE GUIDELINES:
- Power 1-3: Minor stat changes (+/-1-3), short duration (1-3)
- Power 4-6: Moderate changes (+/-4-6), medium duration (3-6), may stack
- Power 7-9: Major changes (+/-7-10), long/permanent, complex triggers
- Power 10: Legendary, game-changing effects

Respond with JSON matching EnhancedStatusEffect schema.`
}
