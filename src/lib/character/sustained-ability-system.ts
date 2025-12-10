/**
 * Sustained Ability System
 *
 * Toggle abilities that reserve resources while active, providing
 * constant effects at the cost of reduced resource pool.
 * Inspired by ToME's sustained abilities.
 */

import { generateId } from "@/lib/core/utils"
import type {
  Ability,
  StatusEffect,
  PlayerClass,
  DamageType,
  ResourceType,
  PlayerResources,
  AbilityCategory,
} from "@/lib/core/game-types"

// =============================================================================
// SUSTAINED ABILITY TYPES
// =============================================================================

export interface SustainedAbility extends Ability {
  isSustained: true
  sustained: {
    resourceReserve: number // Amount of max resource reserved while active
    healthReserve?: number // Some abilities reserve health instead
    activationCost: number // One-time cost to activate
    deactivationCost?: number // Cost to turn off (usually 0)
    tickEffect?: SustainedTickEffect // Effect applied each turn
    constantEffect: StatusEffect // Effect applied while sustained
    incompatibleWith?: string[] // Ability IDs that can't be active together
    maxDuration?: number // Auto-deactivates after N turns (undefined = permanent)
  }
  isActive: boolean
  turnsActive: number
}

export interface SustainedTickEffect {
  damage?: number
  damageType?: DamageType
  healing?: number
  resourceDrain?: number // Additional resource cost per turn
  healthDrain?: number
  targetType: "self" | "all_enemies" | "random_enemy"
  narration: string
}

// =============================================================================
// SUSTAINED STATE TRACKING
// =============================================================================

export interface SustainedState {
  activeAbilities: Map<string, SustainedAbility>
  totalResourceReserved: number
  totalHealthReserved: number
  effectiveMaxResource: number
  effectiveMaxHealth: number
}

/**
 * Calculate the current sustained state from active abilities
 */
export function calculateSustainedState(
  abilities: SustainedAbility[],
  baseMaxResource: number,
  baseMaxHealth: number
): SustainedState {
  const state: SustainedState = {
    activeAbilities: new Map(),
    totalResourceReserved: 0,
    totalHealthReserved: 0,
    effectiveMaxResource: baseMaxResource,
    effectiveMaxHealth: baseMaxHealth,
  }

  for (const ability of abilities) {
    if (ability.isActive) {
      state.activeAbilities.set(ability.id, ability)
      state.totalResourceReserved += ability.sustained.resourceReserve
      state.totalHealthReserved += ability.sustained.healthReserve || 0
    }
  }

  state.effectiveMaxResource = Math.max(0, baseMaxResource - state.totalResourceReserved)
  state.effectiveMaxHealth = Math.max(1, baseMaxHealth - state.totalHealthReserved)

  return state
}

// =============================================================================
// ACTIVATION / DEACTIVATION
// =============================================================================

export interface ActivationResult {
  success: boolean
  ability: SustainedAbility
  error?: string
  narration: string
  effectApplied?: StatusEffect
  resourceCost: number
}

/**
 * Check if a sustained ability can be activated
 */
export function canActivateSustained(
  ability: SustainedAbility,
  currentResource: number,
  maxResource: number,
  currentHealth: number,
  maxHealth: number,
  activeSustained: SustainedAbility[]
): { canActivate: boolean; reason?: string } {
  // Already active
  if (ability.isActive) {
    return { canActivate: false, reason: "Ability is already active." }
  }

  // Check resource for activation cost
  if (currentResource < ability.sustained.activationCost) {
    return {
      canActivate: false,
      reason: `Not enough ${ability.resourceType}. Need ${ability.sustained.activationCost}, have ${currentResource}.`,
    }
  }

  // Check if we can afford the reserve
  const currentReserved = activeSustained.reduce(
    (sum, a) => sum + (a.isActive ? a.sustained.resourceReserve : 0),
    0
  )
  const newReserve = currentReserved + ability.sustained.resourceReserve

  if (newReserve >= maxResource) {
    return {
      canActivate: false,
      reason: `Not enough ${ability.resourceType} capacity to sustain this ability.`,
    }
  }

  // Check health reserve
  if (ability.sustained.healthReserve) {
    const healthReserved = activeSustained.reduce(
      (sum, a) => sum + (a.isActive ? (a.sustained.healthReserve || 0) : 0),
      0
    )
    const newHealthReserve = healthReserved + ability.sustained.healthReserve

    if (newHealthReserve >= maxHealth - 1) {
      return {
        canActivate: false,
        reason: "Not enough health to sustain this ability.",
      }
    }
  }

  // Check incompatibilities
  for (const active of activeSustained) {
    if (!active.isActive) continue

    if (ability.sustained.incompatibleWith?.includes(active.id)) {
      return {
        canActivate: false,
        reason: `Cannot activate while ${active.name} is active.`,
      }
    }

    if (active.sustained.incompatibleWith?.includes(ability.id)) {
      return {
        canActivate: false,
        reason: `${active.name} prevents activation of this ability.`,
      }
    }
  }

  return { canActivate: true }
}

/**
 * Activate a sustained ability
 */
export function activateSustained(
  ability: SustainedAbility,
  currentResource: number,
  maxResource: number,
  currentHealth: number,
  maxHealth: number,
  activeSustained: SustainedAbility[]
): ActivationResult {
  const check = canActivateSustained(
    ability,
    currentResource,
    maxResource,
    currentHealth,
    maxHealth,
    activeSustained
  )

  if (!check.canActivate) {
    return {
      success: false,
      ability,
      error: check.reason,
      narration: `Failed to activate ${ability.name}: ${check.reason}`,
      resourceCost: 0,
    }
  }

  // Activate the ability
  const activatedAbility: SustainedAbility = {
    ...ability,
    isActive: true,
    turnsActive: 0,
  }

  return {
    success: true,
    ability: activatedAbility,
    narration: ability.castNarration || `You activate ${ability.name}. ${ability.sustained.constantEffect.description}`,
    effectApplied: ability.sustained.constantEffect,
    resourceCost: ability.sustained.activationCost,
  }
}

/**
 * Deactivate a sustained ability
 */
export function deactivateSustained(ability: SustainedAbility): {
  ability: SustainedAbility
  narration: string
  resourceCost: number
} {
  const deactivatedAbility: SustainedAbility = {
    ...ability,
    isActive: false,
    turnsActive: 0,
  }

  return {
    ability: deactivatedAbility,
    narration: `You release ${ability.name}. The effect fades.`,
    resourceCost: ability.sustained.deactivationCost || 0,
  }
}

// =============================================================================
// TURN PROCESSING
// =============================================================================

export interface SustainedTurnResult {
  ability: SustainedAbility
  tickEffect?: {
    damage?: number
    healing?: number
    resourceDrain?: number
    healthDrain?: number
    narration: string
  }
  autoDeactivated: boolean
  deactivationReason?: string
}

/**
 * Process a sustained ability at the start of a turn
 */
export function processSustainedTurn(
  ability: SustainedAbility,
  currentResource: number,
  currentHealth: number
): SustainedTurnResult {
  if (!ability.isActive) {
    return { ability, autoDeactivated: false }
  }

  const updatedAbility: SustainedAbility = {
    ...ability,
    turnsActive: ability.turnsActive + 1,
  }

  // Check max duration
  if (
    ability.sustained.maxDuration &&
    updatedAbility.turnsActive >= ability.sustained.maxDuration
  ) {
    return {
      ability: { ...updatedAbility, isActive: false, turnsActive: 0 },
      autoDeactivated: true,
      deactivationReason: `${ability.name} has reached its maximum duration.`,
    }
  }

  // Process tick effect
  if (ability.sustained.tickEffect) {
    const tick = ability.sustained.tickEffect

    // Check if we can afford the tick
    if (tick.resourceDrain && currentResource < tick.resourceDrain) {
      return {
        ability: { ...updatedAbility, isActive: false, turnsActive: 0 },
        autoDeactivated: true,
        deactivationReason: `Not enough ${ability.resourceType} to maintain ${ability.name}.`,
      }
    }

    if (tick.healthDrain && currentHealth <= tick.healthDrain) {
      return {
        ability: { ...updatedAbility, isActive: false, turnsActive: 0 },
        autoDeactivated: true,
        deactivationReason: `${ability.name} would be fatal to maintain.`,
      }
    }

    return {
      ability: updatedAbility,
      tickEffect: {
        damage: tick.damage,
        healing: tick.healing,
        resourceDrain: tick.resourceDrain,
        healthDrain: tick.healthDrain,
        narration: tick.narration,
      },
      autoDeactivated: false,
    }
  }

  return { ability: updatedAbility, autoDeactivated: false }
}

// =============================================================================
// SUSTAINED ABILITY TEMPLATES
// =============================================================================

export const SUSTAINED_ABILITY_TEMPLATES: Omit<SustainedAbility, "id">[] = [
  // WARRIOR
  {
    name: "Battle Stance",
    entityType: "ability",
    description: "A combat stance that increases damage but reduces defense.",
    category: "combat",
    damageType: "physical",
    resourceCost: 0,
    resourceType: "rage",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["warrior", "barbarian"],
    targetType: "self",
    isPassive: false,
    tags: ["stance", "sustained", "offensive"],
    isSustained: true,
    sustained: {
      resourceReserve: 15,
      activationCost: 10,
      constantEffect: {
        id: generateId(),
        name: "Battle Stance",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 5, defense: -3 },
        description: "Your aggressive stance increases attack but leaves you open.",
      },
      incompatibleWith: ["defensive_stance"],
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You shift into an aggressive battle stance, ready to strike.",
  },
  {
    name: "Defensive Stance",
    entityType: "ability",
    description: "A protective stance that reduces incoming damage.",
    category: "defensive",
    resourceCost: 0,
    resourceType: "rage",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["warrior", "paladin"],
    targetType: "self",
    isPassive: false,
    tags: ["stance", "sustained", "defensive"],
    isSustained: true,
    sustained: {
      resourceReserve: 15,
      activationCost: 10,
      constantEffect: {
        id: generateId(),
        name: "Defensive Stance",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { defense: 5, attack: -2 },
        description: "Your defensive posture reduces damage taken.",
      },
      incompatibleWith: ["battle_stance"],
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You raise your guard, focusing on defense.",
  },

  // MAGE
  {
    name: "Mana Shield",
    entityType: "ability",
    description: "Convert incoming damage to mana drain instead.",
    category: "defensive",
    damageType: "arcane",
    resourceCost: 0,
    resourceType: "mana",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["mage"],
    targetType: "self",
    isPassive: false,
    tags: ["shield", "sustained", "defensive", "magic"],
    isSustained: true,
    sustained: {
      resourceReserve: 25,
      activationCost: 15,
      constantEffect: {
        id: generateId(),
        name: "Mana Shield",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { defense: 3 },
        description: "A barrier of magical energy absorbs incoming attacks.",
      },
      tickEffect: {
        resourceDrain: 2,
        targetType: "self",
        narration: "The mana shield shimmers, draining your magical reserves.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You weave a shimmering barrier of pure magical energy around yourself.",
  },
  {
    name: "Arcane Concentration",
    entityType: "ability",
    description: "Focus your mind to enhance spell power.",
    category: "magic",
    damageType: "arcane",
    resourceCost: 0,
    resourceType: "mana",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 7,
    classRequired: ["mage", "warlock"],
    targetType: "self",
    isPassive: false,
    tags: ["concentration", "sustained", "buff", "magic"],
    isSustained: true,
    sustained: {
      resourceReserve: 30,
      activationCost: 20,
      constantEffect: {
        id: generateId(),
        name: "Arcane Concentration",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 8 },
        description: "Your focused mind amplifies magical damage.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You enter a state of deep magical concentration.",
  },

  // ROGUE
  {
    name: "Shadow Cloak",
    entityType: "ability",
    description: "Wrap yourself in shadows, harder to hit but costs energy.",
    category: "utility",
    damageType: "shadow",
    resourceCost: 0,
    resourceType: "energy",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 4,
    classRequired: ["rogue"],
    targetType: "self",
    isPassive: false,
    tags: ["stealth", "sustained", "defensive", "shadow"],
    isSustained: true,
    sustained: {
      resourceReserve: 20,
      activationCost: 15,
      constantEffect: {
        id: generateId(),
        name: "Shadow Cloak",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { defense: 4 },
        description: "Shadows cling to you, making you harder to target.",
      },
      tickEffect: {
        resourceDrain: 3,
        targetType: "self",
        narration: "Maintaining the shadow cloak drains your energy.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "Shadows rise and wrap around your form, concealing you.",
  },

  // CLERIC
  {
    name: "Divine Aura",
    entityType: "ability",
    description: "Radiate healing energy, slowly regenerating health.",
    category: "magic",
    damageType: "holy",
    resourceCost: 0,
    resourceType: "mana",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["cleric", "paladin"],
    targetType: "self",
    isPassive: false,
    tags: ["healing", "sustained", "buff", "holy"],
    isSustained: true,
    sustained: {
      resourceReserve: 20,
      activationCost: 15,
      constantEffect: {
        id: generateId(),
        name: "Divine Aura",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { healthRegen: 3 },
        description: "Holy light surrounds you, slowly healing wounds.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "Golden light emanates from within, suffusing you with healing energy.",
  },

  // WARLOCK
  {
    name: "Soul Link",
    entityType: "ability",
    description: "Link your soul to the darkness, gaining power at health cost.",
    category: "magic",
    damageType: "shadow",
    resourceCost: 0,
    resourceType: "souls",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 6,
    classRequired: ["warlock", "necromancer"],
    targetType: "self",
    isPassive: false,
    tags: ["dark", "sustained", "offensive", "shadow"],
    isSustained: true,
    sustained: {
      resourceReserve: 10,
      healthReserve: 15,
      activationCost: 5,
      constantEffect: {
        id: generateId(),
        name: "Soul Link",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 7 },
        description: "Dark power courses through you at the cost of your vitality.",
      },
      tickEffect: {
        healthDrain: 1,
        targetType: "self",
        narration: "The soul link slowly drains your life force.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You forge a dark pact, linking your soul to the shadows.",
  },

  // NECROMANCER
  {
    name: "Death Shroud",
    entityType: "ability",
    description: "Surround yourself with the essence of death.",
    category: "magic",
    damageType: "shadow",
    resourceCost: 0,
    resourceType: "souls",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 8,
    classRequired: ["necromancer"],
    targetType: "self",
    isPassive: false,
    tags: ["death", "sustained", "aura", "shadow"],
    isSustained: true,
    sustained: {
      resourceReserve: 15,
      activationCost: 10,
      constantEffect: {
        id: generateId(),
        name: "Death Shroud",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { defense: 3, attack: 3 },
        description: "An aura of death surrounds you, weakening nearby foes.",
      },
      tickEffect: {
        damage: 2,
        damageType: "shadow",
        targetType: "all_enemies",
        narration: "The death shroud saps life from nearby enemies.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "The cold embrace of death wraps around you like a shroud.",
  },

  // MONK
  {
    name: "Inner Focus",
    entityType: "ability",
    description: "Center your chi, enhancing reflexes and combat awareness.",
    category: "utility",
    resourceCost: 0,
    resourceType: "focus",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 4,
    classRequired: ["monk"],
    targetType: "self",
    isPassive: false,
    tags: ["chi", "sustained", "buff", "focus"],
    isSustained: true,
    sustained: {
      resourceReserve: 20,
      activationCost: 10,
      constantEffect: {
        id: generateId(),
        name: "Inner Focus",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 3, defense: 3 },
        description: "Your centered mind grants enhanced combat prowess.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You center your chi, achieving a state of perfect focus.",
  },

  // BARBARIAN
  {
    name: "Berserker Rage",
    entityType: "ability",
    description: "Enter a rage state, dealing more damage but taking more too.",
    category: "combat",
    damageType: "physical",
    resourceCost: 0,
    resourceType: "rage",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["barbarian"],
    targetType: "self",
    isPassive: false,
    tags: ["rage", "sustained", "offensive"],
    isSustained: true,
    sustained: {
      resourceReserve: 25,
      activationCost: 20,
      constantEffect: {
        id: generateId(),
        name: "Berserker Rage",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 10, defense: -5 },
        description: "Blind rage grants tremendous strength but leaves you vulnerable.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "A primal rage overtakes you, your eyes turn red with fury!",
  },

  // RANGER
  {
    name: "Hunter's Mark",
    entityType: "ability",
    description: "Focus on your prey, dealing extra damage to marked targets.",
    category: "combat",
    damageType: "physical",
    resourceCost: 0,
    resourceType: "focus",
    cooldown: 0,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["ranger"],
    targetType: "enemy",
    isPassive: false,
    tags: ["hunting", "sustained", "offensive"],
    isSustained: true,
    sustained: {
      resourceReserve: 15,
      activationCost: 10,
      constantEffect: {
        id: generateId(),
        name: "Hunter's Mark",
        entityType: "effect",
        effectType: "buff",
        duration: -1,
        modifiers: { attack: 4 },
        description: "Your trained eye tracks every movement of your prey.",
      },
    },
    isActive: false,
    turnsActive: 0,
    castNarration: "You mark your target, tracking their every move.",
  },
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a new sustained ability from a template
 */
export function createSustainedAbility(
  template: Omit<SustainedAbility, "id">
): SustainedAbility {
  return {
    ...template,
    id: generateId(),
    sustained: {
      ...template.sustained,
      constantEffect: {
        ...template.sustained.constantEffect,
        id: generateId(),
      },
    },
  }
}

/**
 * Get sustained abilities available for a class
 */
export function getSustainedAbilitiesForClass(
  playerClass: PlayerClass,
  playerLevel: number
): SustainedAbility[] {
  return SUSTAINED_ABILITY_TEMPLATES
    .filter((template) => {
      if (template.levelRequired > playerLevel) return false
      if (template.classRequired && !template.classRequired.includes(playerClass)) {
        return false
      }
      return true
    })
    .map(createSustainedAbility)
}

/**
 * Check if an ability is a sustained ability
 */
export function isSustainedAbility(ability: Ability): ability is SustainedAbility {
  return "isSustained" in ability && (ability as SustainedAbility).isSustained === true
}

/**
 * Get the effective resource after sustained reserves
 */
export function getEffectiveResources(
  resources: PlayerResources,
  sustainedAbilities: SustainedAbility[]
): { current: number; max: number; reserved: number } {
  const reserved = sustainedAbilities
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.sustained.resourceReserve, 0)

  return {
    current: Math.min(resources.current, resources.max - reserved),
    max: resources.max - reserved,
    reserved,
  }
}

/**
 * Deactivate all sustained abilities (e.g., on death or floor change)
 */
export function deactivateAllSustained(
  abilities: SustainedAbility[]
): SustainedAbility[] {
  return abilities.map((ability) => ({
    ...ability,
    isActive: false,
    turnsActive: 0,
  }))
}

/**
 * Get display color for sustained ability state
 */
export function getSustainedDisplayColor(ability: SustainedAbility): string {
  if (!ability.isActive) return "text-gray-400"

  // Color based on resource type
  switch (ability.resourceType) {
    case "mana":
      return "text-blue-400"
    case "rage":
      return "text-red-400"
    case "energy":
      return "text-yellow-400"
    case "focus":
      return "text-purple-400"
    case "souls":
      return "text-gray-200"
    default:
      return "text-green-400"
  }
}
