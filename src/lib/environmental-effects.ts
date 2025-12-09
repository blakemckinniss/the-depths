import type { EnhancedStatusEffect } from "./effect-system"
import type { DungeonCard } from "./game-types"
import { createEnhancedEffect } from "./effect-system"
import { generateEntityId } from "./entity-system"

// Environment types that can apply effects
export type EnvironmentType =
  | "crypt"
  | "swamp"
  | "volcano"
  | "ice_cave"
  | "abyss"
  | "temple"
  | "ruins"
  | "forest"
  | "mine"
  | "tower"
  | "sewer"
  | "library"
  | "battlefield"
  | "nightmare"

// Ambient effect that persists in an area
export interface AmbientEffect {
  id: string
  name: string
  description: string
  environmentType: EnvironmentType
  // How it applies
  applicationTrigger: "on_enter" | "per_turn" | "on_combat_start" | "continuous"
  applicationChance: number // 0-1
  // The effect it applies
  effect: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" }
  // Mitigation
  resistedBy?: string[] // class names, items, or effects that prevent it
  mitigatedBy?: string[] // reduce severity
  // Stacking
  canStack: boolean
  maxStacks: number
}

// Room-specific hazard zones
export interface EffectZone {
  id: string
  name: string
  description: string
  // Area definition
  affectsPlayer: boolean
  affectsEnemies: boolean
  affectsCompanions: boolean
  // The persistent effect
  effect: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" }
  // Duration in the room
  persistsForTurns: number // -1 for entire room
  // Can be dispelled/destroyed?
  destructible: boolean
  destroyedBy?: string[] // elements or ability types that destroy it
}

// Dungeon theme to ambient effects mapping
export const DUNGEON_AMBIENT_EFFECTS: Record<string, AmbientEffect[]> = {
  crypt: [
    {
      id: "crypt_chill",
      name: "Grave Chill",
      description: "The cold of the dead seeps into your bones",
      environmentType: "crypt",
      applicationTrigger: "per_turn",
      applicationChance: 0.15,
      effect: {
        name: "Grave Chill",
        effectType: "debuff",
        category: "stat_modifier",
        durationType: "rooms",
        durationValue: 1,
        modifiers: { attack: -1, defense: -1 },
        powerLevel: 2,
        animation: "freeze",
      },
      resistedBy: ["Paladin", "Cleric", "Holy Amulet"],
      mitigatedBy: ["torch", "warm_cloak"],
      canStack: true,
      maxStacks: 3,
    },
    {
      id: "crypt_whispers",
      name: "Whispers of the Dead",
      description: "Voices of the departed echo in your mind",
      environmentType: "crypt",
      applicationTrigger: "on_enter",
      applicationChance: 0.25,
      effect: {
        name: "Haunted",
        effectType: "debuff",
        category: "control",
        durationType: "rooms",
        durationValue: 2,
        modifiers: {},
        powerLevel: 3,
        animation: "flicker",
      },
      resistedBy: ["Cleric", "Monk", "Mental Ward"],
      canStack: false,
      maxStacks: 1,
    },
  ],

  swamp: [
    {
      id: "swamp_miasma",
      name: "Swamp Miasma",
      description: "Toxic fumes rise from the murky waters",
      environmentType: "swamp",
      applicationTrigger: "per_turn",
      applicationChance: 0.2,
      effect: {
        name: "Poisoned Air",
        effectType: "debuff",
        category: "damage_over_time",
        durationType: "turns",
        durationValue: 3,
        modifiers: { healthRegen: -2 },
        powerLevel: 3,
        animation: "poison",
      },
      resistedBy: ["Ranger", "Druid", "Poison Immunity"],
      mitigatedBy: ["antidote", "mask"],
      canStack: true,
      maxStacks: 2,
    },
    {
      id: "swamp_leeches",
      name: "Bloodleeches",
      description: "Parasites lurk beneath the water's surface",
      environmentType: "swamp",
      applicationTrigger: "on_combat_start",
      applicationChance: 0.3,
      effect: {
        name: "Leeched",
        effectType: "debuff",
        category: "damage_over_time",
        durationType: "hits",
        durationValue: 4,
        modifiers: { healthRegen: -1 },
        powerLevel: 2,
      },
      resistedBy: ["heavy_armor", "Barbarian"],
      canStack: true,
      maxStacks: 5,
    },
  ],

  volcano: [
    {
      id: "volcano_heat",
      name: "Searing Heat",
      description: "The oppressive heat saps your strength",
      environmentType: "volcano",
      applicationTrigger: "continuous",
      applicationChance: 1.0,
      effect: {
        name: "Heat Exhaustion",
        effectType: "debuff",
        category: "stat_modifier",
        durationType: "permanent",
        durationValue: -1,
        modifiers: { maxHealth: -5 },
        powerLevel: 4,
      },
      resistedBy: ["fire_immunity", "Warlock"],
      mitigatedBy: ["cooling_potion", "fire_resistance"],
      canStack: false,
      maxStacks: 1,
    },
    {
      id: "volcano_embers",
      name: "Floating Embers",
      description: "Hot ash and embers fill the air",
      environmentType: "volcano",
      applicationTrigger: "per_turn",
      applicationChance: 0.25,
      effect: {
        name: "Ember Burns",
        effectType: "debuff",
        category: "damage_over_time",
        durationType: "turns",
        durationValue: 2,
        modifiers: { healthRegen: -3 },
        powerLevel: 3,
        animation: "burn",
      },
      resistedBy: ["fire_immunity"],
      canStack: true,
      maxStacks: 3,
    },
  ],

  ice_cave: [
    {
      id: "ice_frostbite",
      name: "Creeping Frostbite",
      description: "The cold threatens to claim your extremities",
      environmentType: "ice_cave",
      applicationTrigger: "per_turn",
      applicationChance: 0.2,
      effect: {
        name: "Frostbite",
        effectType: "debuff",
        category: "compound",
        durationType: "rooms",
        durationValue: 2,
        modifiers: { attack: -2, defense: -1 },
        powerLevel: 4,
        animation: "freeze",
      },
      resistedBy: ["cold_immunity", "Barbarian"],
      mitigatedBy: ["warm_cloak", "fire_spell"],
      canStack: true,
      maxStacks: 3,
    },
    {
      id: "ice_slick",
      name: "Treacherous Ice",
      description: "The floor is dangerously slick",
      environmentType: "ice_cave",
      applicationTrigger: "on_combat_start",
      applicationChance: 0.35,
      effect: {
        name: "Unsteady Footing",
        effectType: "debuff",
        category: "control",
        durationType: "turns",
        durationValue: 2,
        modifiers: { defense: -3 },
        powerLevel: 3,
      },
      resistedBy: ["Monk", "Rogue", "ice_cleats"],
      canStack: false,
      maxStacks: 1,
    },
  ],

  abyss: [
    {
      id: "abyss_madness",
      name: "Abyssal Whispers",
      description: "Something ancient speaks from the darkness",
      environmentType: "abyss",
      applicationTrigger: "per_turn",
      applicationChance: 0.15,
      effect: {
        name: "Creeping Madness",
        effectType: "debuff",
        category: "triggered",
        durationType: "permanent",
        durationValue: -1,
        stackBehavior: "intensity",
        maxStacks: 5,
        modifiers: { attack: 2, defense: -3 },
        powerLevel: 6,
        animation: "dark",
      },
      resistedBy: ["Paladin", "Monk", "sanity_ward"],
      canStack: true,
      maxStacks: 5,
    },
    {
      id: "abyss_corruption",
      name: "Abyssal Corruption",
      description: "Dark energy seeps into your soul",
      environmentType: "abyss",
      applicationTrigger: "on_enter",
      applicationChance: 0.4,
      effect: {
        name: "Soul Taint",
        effectType: "debuff",
        category: "vulnerability",
        durationType: "conditional",
        durationValue: -1,
        condition: "cleansed_at_shrine",
        modifiers: {},
        powerLevel: 5,
        animation: "dark",
      },
      resistedBy: ["holy_symbol", "Paladin"],
      canStack: false,
      maxStacks: 1,
    },
  ],

  temple: [
    {
      id: "temple_sanctity",
      name: "Sacred Ground",
      description: "Divine power infuses this holy place",
      environmentType: "temple",
      applicationTrigger: "on_enter",
      applicationChance: 0.5,
      effect: {
        name: "Sanctified",
        effectType: "buff",
        category: "stat_modifier",
        durationType: "rooms",
        durationValue: 3,
        modifiers: { defense: 2, healthRegen: 1 },
        powerLevel: 3,
        animation: "holy",
      },
      resistedBy: ["Warlock", "Necromancer"],
      canStack: false,
      maxStacks: 1,
    },
  ],

  nightmare: [
    {
      id: "nightmare_fear",
      name: "Manifested Terror",
      description: "Your deepest fears take form",
      environmentType: "nightmare",
      applicationTrigger: "on_combat_start",
      applicationChance: 0.4,
      effect: {
        name: "Terror",
        effectType: "debuff",
        category: "control",
        durationType: "turns",
        durationValue: 2,
        modifiers: { attack: -4, defense: -2 },
        powerLevel: 5,
        animation: "flicker",
      },
      resistedBy: ["Barbarian", "fearless_trait", "Monk"],
      canStack: false,
      maxStacks: 1,
    },
    {
      id: "nightmare_reality",
      name: "Unstable Reality",
      description: "Nothing is as it seems",
      environmentType: "nightmare",
      applicationTrigger: "per_turn",
      applicationChance: 0.2,
      effect: {
        name: "Reality Shift",
        effectType: "neutral",
        category: "triggered",
        durationType: "turns",
        durationValue: 1,
        modifiers: {},
        powerLevel: 4,
        triggeredEffects: [{ trigger: "turn_start", chance: 0.5, effect: "spread", narrative: "Reality warps around you..." }],
      },
      canStack: false,
      maxStacks: 1,
    },
  ],
}

// Map dungeon themes to environment types
export function getEnvironmentType(dungeonTheme: string): EnvironmentType {
  const theme = dungeonTheme.toLowerCase()

  if (theme.includes("crypt") || theme.includes("tomb") || theme.includes("grave") || theme.includes("undead"))
    return "crypt"
  if (theme.includes("swamp") || theme.includes("bog") || theme.includes("marsh") || theme.includes("fen"))
    return "swamp"
  if (theme.includes("volcano") || theme.includes("fire") || theme.includes("lava") || theme.includes("inferno"))
    return "volcano"
  if (theme.includes("ice") || theme.includes("frost") || theme.includes("frozen") || theme.includes("glacier"))
    return "ice_cave"
  if (theme.includes("abyss") || theme.includes("void") || theme.includes("chaos") || theme.includes("demonic"))
    return "abyss"
  if (theme.includes("temple") || theme.includes("shrine") || theme.includes("holy") || theme.includes("sacred"))
    return "temple"
  if (theme.includes("nightmare") || theme.includes("dream") || theme.includes("illusion") || theme.includes("psychic"))
    return "nightmare"
  if (theme.includes("ruin") || theme.includes("ancient")) return "ruins"
  if (theme.includes("forest") || theme.includes("wood") || theme.includes("jungle")) return "forest"
  if (theme.includes("mine") || theme.includes("cave") || theme.includes("underground")) return "mine"
  if (theme.includes("tower") || theme.includes("spire") || theme.includes("wizard")) return "tower"
  if (theme.includes("sewer") || theme.includes("tunnel")) return "sewer"
  if (theme.includes("library") || theme.includes("archive")) return "library"
  if (theme.includes("battle") || theme.includes("war")) return "battlefield"

  return "ruins" // default
}

// Get ambient effects for a dungeon
export function getDungeonAmbientEffects(dungeon: DungeonCard): AmbientEffect[] {
  const envType = getEnvironmentType(dungeon.theme)
  return DUNGEON_AMBIENT_EFFECTS[envType] || []
}

// Check if player resists an ambient effect
export function checkResistance(
  effect: AmbientEffect,
  playerClass: string,
  inventory: { name: string }[],
  activeEffects: { name: string }[],
): { resisted: boolean; mitigated: boolean } {
  const resistedBy = effect.resistedBy || []
  const mitigatedBy = effect.mitigatedBy || []

  const allPlayerThings = [playerClass, ...inventory.map((i) => i.name), ...activeEffects.map((e) => e.name)].map((s) =>
    s.toLowerCase(),
  )

  const resisted = resistedBy.some((r) => allPlayerThings.some((p) => p.includes(r.toLowerCase())))

  const mitigated = mitigatedBy.some((m) => allPlayerThings.some((p) => p.includes(m.toLowerCase())))

  return { resisted, mitigated }
}

// Roll for ambient effect application
export function rollAmbientEffect(
  effect: AmbientEffect,
  playerClass: string,
  inventory: { name: string }[],
  activeEffects: EnhancedStatusEffect[],
  currentStacks: number,
): {
  applied: boolean
  effect: EnhancedStatusEffect | null
  narrative: string
} {
  // Check resistance first
  const { resisted, mitigated } = checkResistance(effect, playerClass, inventory, activeEffects)

  if (resisted) {
    return {
      applied: false,
      effect: null,
      narrative: `Your ${playerClass} training helps you resist the ${effect.name}.`,
    }
  }

  // Check stack limit
  if (effect.canStack && currentStacks >= effect.maxStacks) {
    return {
      applied: false,
      effect: null,
      narrative: "",
    }
  }

  // Roll for application
  const roll = Math.random()
  const adjustedChance = mitigated ? effect.applicationChance * 0.5 : effect.applicationChance

  if (roll > adjustedChance) {
    return {
      applied: false,
      effect: null,
      narrative: "",
    }
  }

  // Apply the effect
  const newEffect = createEnhancedEffect({
    ...effect.effect,
    sourceType: "environment",
    sourceName: effect.name,
  })

  // Reduce severity if mitigated
  if (mitigated && newEffect.modifiers) {
    for (const key of Object.keys(newEffect.modifiers)) {
      const val = newEffect.modifiers[key as keyof typeof newEffect.modifiers]
      if (typeof val === "number") {
        ;(newEffect.modifiers as Record<string, number>)[key] = Math.floor(val * 0.5)
      }
    }
  }

  return {
    applied: true,
    effect: newEffect,
    narrative: mitigated
      ? `The ${effect.name} affects you, though your protection lessens its impact.`
      : `${effect.description}. You are afflicted with ${effect.effect.name}!`,
  }
}

// Process all ambient effects for a trigger
export function processAmbientEffects(
  trigger: AmbientEffect["applicationTrigger"],
  dungeonTheme: string,
  playerClass: string,
  inventory: { name: string }[],
  activeEffects: EnhancedStatusEffect[],
): {
  newEffects: EnhancedStatusEffect[]
  narratives: string[]
} {
  const envType = getEnvironmentType(dungeonTheme)
  const ambientEffects = DUNGEON_AMBIENT_EFFECTS[envType] || []

  const newEffects: EnhancedStatusEffect[] = []
  const narratives: string[] = []

  for (const ambient of ambientEffects) {
    if (ambient.applicationTrigger !== trigger && ambient.applicationTrigger !== "continuous") {
      continue
    }

    // Count current stacks of this effect
    const currentStacks = activeEffects.filter(
      (e) => e.sourceName === ambient.name || e.name === ambient.effect.name,
    ).length

    const result = rollAmbientEffect(ambient, playerClass, inventory, activeEffects, currentStacks)

    if (result.applied && result.effect) {
      newEffects.push(result.effect)
    }
    if (result.narrative) {
      narratives.push(result.narrative)
    }
  }

  return { newEffects, narratives }
}

// Create effect zone from AI description
export function createEffectZone(
  name: string,
  description: string,
  effect: Partial<EnhancedStatusEffect> & { name: string; effectType: "buff" | "debuff" | "neutral" },
  options: Partial<EffectZone> = {},
): EffectZone {
  return {
    id: generateEntityId("zone"),
    name,
    description,
    affectsPlayer: options.affectsPlayer ?? true,
    affectsEnemies: options.affectsEnemies ?? false,
    affectsCompanions: options.affectsCompanions ?? true,
    effect,
    persistsForTurns: options.persistsForTurns ?? -1,
    destructible: options.destructible ?? false,
    destroyedBy: options.destroyedBy,
  }
}

// Predefined effect zones that AI can reference
export const EFFECT_ZONE_TEMPLATES: Record<string, Omit<EffectZone, "id">> = {
  healing_spring: {
    name: "Healing Spring",
    description: "Crystal clear water bubbles up from the ground, glowing with restorative energy",
    affectsPlayer: true,
    affectsEnemies: false,
    affectsCompanions: true,
    effect: {
      name: "Spring's Blessing",
      effectType: "buff",
      category: "heal_over_time",
      durationType: "turns",
      durationValue: 3,
      modifiers: { healthRegen: 5 },
      powerLevel: 4,
      animation: "pulse",
    },
    persistsForTurns: -1,
    destructible: false,
  },

  cursed_ground: {
    name: "Cursed Ground",
    description: "Dark energy seeps from cracks in the floor, twisting and corrupting",
    affectsPlayer: true,
    affectsEnemies: false,
    affectsCompanions: true,
    effect: {
      name: "Ground Curse",
      effectType: "debuff",
      category: "damage_over_time",
      durationType: "turns",
      durationValue: 2,
      modifiers: { healthRegen: -3 },
      powerLevel: 4,
      animation: "dark",
    },
    persistsForTurns: -1,
    destructible: true,
    destroyedBy: ["holy", "light", "purify"],
  },

  fire_pit: {
    name: "Burning Ground",
    description: "Flames lick up from fissures in the stone floor",
    affectsPlayer: true,
    affectsEnemies: true,
    affectsCompanions: true,
    effect: {
      name: "Standing in Fire",
      effectType: "debuff",
      category: "damage_over_time",
      durationType: "turns",
      durationValue: 1,
      modifiers: { healthRegen: -8 },
      powerLevel: 5,
      animation: "burn",
    },
    persistsForTurns: 5,
    destructible: true,
    destroyedBy: ["water", "ice", "frost"],
  },

  arcane_field: {
    name: "Arcane Resonance Field",
    description: "Magical energy crackles in the air, enhancing spellwork",
    affectsPlayer: true,
    affectsEnemies: true,
    affectsCompanions: true,
    effect: {
      name: "Arcane Resonance",
      effectType: "buff",
      category: "stat_modifier",
      durationType: "turns",
      durationValue: 99,
      modifiers: { attack: 3 },
      powerLevel: 3,
      animation: "shimmer",
    },
    persistsForTurns: -1,
    destructible: false,
  },
}
