import type { EnvironmentalHazard, Player, Enemy, StatusEffect } from "./game-types"
import { createStatusEffect, generateEntityId } from "./entity-system"

// Predefined hazard templates
export const HAZARD_TEMPLATES: Record<string, Omit<EnvironmentalHazard, "id">> = {
  inferno: {
    name: "Raging Inferno",
    description: "Flames lick the walls, the air itself burns.",
    type: "fire",
    effects: {
      damagePerTurn: 5,
      damageType: "fire",
      disablesAbilities: ["ice"],
    },
    duration: "permanent",
    narrationOnTick: "The flames sear your flesh.",
    mitigatedBy: ["mage", "warlock"],
  },
  freezing: {
    name: "Bitter Cold",
    description: "Frost coats every surface. Your breath crystallizes.",
    type: "ice",
    effects: {
      damagePerTurn: 3,
      damageType: "ice",
      playerDebuff: { attack: -3 },
    },
    duration: "permanent",
    narrationOnTick: "The cold saps your strength.",
    mitigatedBy: ["barbarian", "monk"],
  },
  toxic_mist: {
    name: "Toxic Miasma",
    description: "A sickly green fog hangs heavy in the air.",
    type: "poison",
    effects: {
      damagePerTurn: 4,
      damageType: "poison",
      statModifier: { stat: "maxHealth", modifier: -10 },
    },
    duration: "permanent",
    narrationOnTick: "The poison eats at your vitality.",
    mitigatedBy: ["cleric", "paladin"],
  },
  darkness: {
    name: "Impenetrable Darkness",
    description: "Light refuses to exist here. Something watches.",
    type: "darkness",
    effects: {
      visionReduced: true,
      playerDebuff: { attack: -5, defense: -3 },
      enemyBuff: { attack: 5 },
    },
    duration: "permanent",
    narrationOnTick: "The darkness presses in on your mind.",
    mitigatedBy: ["cleric", "paladin", "warlock"],
  },
  flooded: {
    name: "Rising Waters",
    description: "Cold water rushes in, already waist-deep.",
    type: "flooding",
    effects: {
      fleeDisabled: true,
      disablesAbilities: ["fire"],
      playerDebuff: { defense: -4 },
    },
    duration: 8,
    narrationOnTick: "The water continues to rise.",
    mitigatedBy: ["ranger", "rogue"],
  },
  crumbling: {
    name: "Unstable Ground",
    description: "The floor shakes. Stones fall from above.",
    type: "crumbling",
    effects: {
      damagePerTurn: 6,
      damageType: "physical",
    },
    duration: 5,
    narrationOnTick: "Debris crashes down around you.",
    mitigatedBy: ["warrior", "barbarian"],
  },
  haunted: {
    name: "Restless Spirits",
    description: "Ghostly wails echo. The dead do not rest here.",
    type: "haunted",
    effects: {
      damagePerTurn: 3,
      damageType: "shadow",
      enemyBuff: { health: 20 },
    },
    duration: "permanent",
    narrationOnTick: "Spectral claws rake at your soul.",
    mitigatedBy: ["cleric", "necromancer", "paladin"],
  },
  sanctified: {
    name: "Holy Ground",
    description: "Divine light suffuses this chamber.",
    type: "holy",
    effects: {
      enemyBuff: { defense: -5, attack: -3 }, // actually a debuff for enemies
    },
    duration: "permanent",
    narrationOnTick: "The sacred light shields you.",
    mitigatedBy: [], // helps everyone
  },
  arcane_storm: {
    name: "Arcane Maelstrom",
    description: "Raw magical energy crackles and sparks unpredictably.",
    type: "arcane",
    effects: {
      damagePerTurn: 4,
      damageType: "arcane",
      statModifier: { stat: "intelligence", modifier: 5 }, // boost magic but take damage
    },
    duration: "permanent",
    narrationOnTick: "Wild magic surges through you.",
    mitigatedBy: ["mage", "warlock", "necromancer"],
  },
}

export function generateHazard(floor: number, dungeonTheme?: string): EnvironmentalHazard {
  const templates = Object.entries(HAZARD_TEMPLATES)

  // Weight selection by dungeon theme if provided
  let weighted = templates
  if (dungeonTheme) {
    const themeLC = dungeonTheme.toLowerCase()
    if (themeLC.includes("fire") || themeLC.includes("volcano") || themeLC.includes("infern")) {
      weighted = templates.filter(([k]) => k === "inferno" || k === "crumbling")
    } else if (themeLC.includes("ice") || themeLC.includes("frost") || themeLC.includes("frozen")) {
      weighted = templates.filter(([k]) => k === "freezing")
    } else if (themeLC.includes("crypt") || themeLC.includes("tomb") || themeLC.includes("grave")) {
      weighted = templates.filter(([k]) => k === "haunted" || k === "darkness")
    } else if (themeLC.includes("swamp") || themeLC.includes("poison") || themeLC.includes("bog")) {
      weighted = templates.filter(([k]) => k === "toxic_mist" || k === "flooded")
    } else if (themeLC.includes("holy") || themeLC.includes("temple") || themeLC.includes("sanctu")) {
      weighted = templates.filter(([k]) => k === "sanctified")
    } else if (themeLC.includes("arcane") || themeLC.includes("magic") || themeLC.includes("wizard")) {
      weighted = templates.filter(([k]) => k === "arcane_storm")
    }
    if (weighted.length === 0) weighted = templates
  }

  const [key, template] = weighted[Math.floor(Math.random() * weighted.length)]

  // Scale damage with floor
  const scaledEffects = { ...template.effects }
  if (scaledEffects.damagePerTurn) {
    scaledEffects.damagePerTurn = Math.floor(scaledEffects.damagePerTurn * (1 + floor * 0.1))
  }

  return {
    id: crypto.randomUUID(),
    ...template,
    effects: scaledEffects,
  }
}

/**
 * Creates StatusEffect objects from hazard effects.
 * These are proper effect objects that integrate with the effect system.
 */
export function createHazardEffects(hazard: EnvironmentalHazard, mitigationFactor: number = 1.0): StatusEffect[] {
  const effects: StatusEffect[] = []

  // Create debuff effect for player stat modifiers
  if (hazard.effects.playerDebuff) {
    const debuff = hazard.effects.playerDebuff
    effects.push(
      createStatusEffect({
        name: `${hazard.name} Debuff`,
        effectType: "debuff",
        duration: 1, // Reapplied each turn while in hazard
        modifiers: {
          attack: debuff.attack ? Math.floor(debuff.attack * mitigationFactor) : undefined,
          defense: debuff.defense ? Math.floor(debuff.defense * mitigationFactor) : undefined,
        },
        description: `Weakened by ${hazard.name}.`,
        sourceId: hazard.id,
        sourceType: "hazard",
      }),
    )
  }

  // Create effect for stat modifiers (like maxHealth reduction)
  if (hazard.effects.statModifier) {
    const mod = hazard.effects.statModifier
    const modifiers: StatusEffect["modifiers"] = {}
    if (mod.stat === "maxHealth") modifiers.maxHealth = Math.floor(mod.modifier * mitigationFactor)
    if (mod.stat === "attack") modifiers.attack = Math.floor(mod.modifier * mitigationFactor)
    if (mod.stat === "defense") modifiers.defense = Math.floor(mod.modifier * mitigationFactor)

    effects.push(
      createStatusEffect({
        name: `${hazard.name} Aura`,
        effectType: mod.modifier < 0 ? "debuff" : "buff",
        duration: 1, // Reapplied each turn while in hazard
        modifiers,
        description: `${hazard.name} affects your vitality.`,
        sourceId: hazard.id,
        sourceType: "hazard",
      }),
    )
  }

  // Create damage-over-time effect if hazard deals damage
  if (hazard.effects.damagePerTurn) {
    const damage = Math.floor(hazard.effects.damagePerTurn * mitigationFactor)
    effects.push(
      createStatusEffect({
        name: `${hazard.name} Burn`,
        effectType: "debuff",
        duration: 1, // Single tick, reapplied each turn
        modifiers: {
          healthRegen: -damage, // Negative health regen = damage per turn
        },
        description: hazard.narrationOnTick || `${hazard.name} burns you.`,
        sourceId: hazard.id,
        sourceType: "hazard",
        onTurnStart: hazard.narrationOnTick,
      }),
    )
  }

  return effects
}

export function applyHazardToPlayer(
  player: Player,
  hazard: EnvironmentalHazard,
): { player: Player; damage: number; narration: string; effects: StatusEffect[] } {
  // Check if player's class mitigates this hazard
  const isMitigated = hazard.mitigatedBy?.includes(player.class || "") || false
  const mitigationFactor = isMitigated ? 0.5 : 1.0

  // Create proper StatusEffect objects for all hazard effects
  const effects = createHazardEffects(hazard, mitigationFactor)

  // Calculate direct damage (for immediate feedback - the DoT effect handles ongoing damage)
  let damage = 0
  if (hazard.effects.damagePerTurn) {
    damage = Math.floor(hazard.effects.damagePerTurn * mitigationFactor)
  }

  const narration = isMitigated
    ? `Your ${player.className} training lessens the ${hazard.name}'s effect.`
    : hazard.narrationOnTick || `The ${hazard.name} affects you.`

  // Remove any existing effects from this hazard before adding new ones
  const existingEffectsRemoved = player.activeEffects.filter((e) => e.sourceId !== hazard.id)

  const newPlayer = {
    ...player,
    activeEffects: [...existingEffectsRemoved, ...effects],
  }

  return { player: newPlayer, damage, narration, effects }
}

export function applyHazardToEnemy(enemy: Enemy, hazard: EnvironmentalHazard): Enemy {
  const buffs = hazard.effects.enemyBuff
  if (!buffs) return enemy

  return {
    ...enemy,
    attack: enemy.attack + (buffs.attack || 0),
    defense: enemy.defense + (buffs.defense || 0),
    maxHealth: enemy.maxHealth + (buffs.health || 0),
    health: enemy.health + (buffs.health || 0),
  }
}

export function tickHazard(hazard: EnvironmentalHazard): EnvironmentalHazard | null {
  if (hazard.duration === "permanent") return hazard

  const newDuration = hazard.duration - 1
  if (newDuration <= 0) return null

  return { ...hazard, duration: newDuration }
}

/**
 * Removes all StatusEffects that originated from a specific hazard.
 * Call this when a hazard expires or the player leaves the hazard area.
 */
export function removeHazardEffects(player: Player, hazardId: string): Player {
  return {
    ...player,
    activeEffects: player.activeEffects.filter((e) => e.sourceId !== hazardId),
  }
}

/**
 * Removes all hazard-sourced effects from the player.
 * Call this when transitioning to a new room/floor.
 */
export function clearAllHazardEffects(player: Player): Player {
  return {
    ...player,
    activeEffects: player.activeEffects.filter((e) => e.sourceType !== "hazard"),
  }
}

export function isAbilityDisabledByHazard(ability: { tags: string[] }, hazard: EnvironmentalHazard | null): boolean {
  if (!hazard || !hazard.effects.disablesAbilities) return false
  return ability.tags.some((tag) => hazard.effects.disablesAbilities?.includes(tag))
}
