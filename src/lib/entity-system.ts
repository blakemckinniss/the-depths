import type {
  GameEntity,
  GameEvent,
  GameEventType,
  StatusEffect,
  NPC,
  Trap,
  Shrine,
  Companion,
  Boss,
  Room,
  DungeonModifier,
  Player,
  Item,
} from "./game-types"
import { checkEquippedSets, calculateSetBonuses } from "./item-sets-system"

// Unique ID generator
export function generateEntityId(prefix = "entity"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Entity factory functions
export function createStatusEffect(
  partial: Partial<StatusEffect> & { name: string; effectType: StatusEffect["effectType"] },
): StatusEffect {
  return {
    id: generateEntityId("effect"),
    entityType: partial.effectType === "debuff" ? "curse" : partial.effectType === "buff" ? "blessing" : "effect",
    duration: partial.duration ?? 3,
    modifiers: partial.modifiers ?? {},
    ...partial,
  }
}

/**
 * Converts a Partial<StatusEffect> (e.g., from AI generation) to a complete StatusEffect.
 * Provides sensible defaults for missing fields. Returns null if essential fields are missing.
 */
export function completePartialEffect(
  partial: Partial<StatusEffect>,
  sourceType?: StatusEffect["sourceType"],
): StatusEffect | null {
  // Must have at least a name or we can't create a valid effect
  if (!partial.name) return null

  // Infer effectType from modifiers if not provided
  let effectType = partial.effectType
  if (!effectType && partial.modifiers) {
    const mods = partial.modifiers
    const isDebuff =
      (mods.attack && mods.attack < 0) ||
      (mods.defense && mods.defense < 0) ||
      (mods.maxHealth && mods.maxHealth < 0) ||
      (mods.healthRegen && mods.healthRegen < 0) ||
      (mods.goldMultiplier && mods.goldMultiplier < 1) ||
      (mods.expMultiplier && mods.expMultiplier < 1)
    effectType = isDebuff ? "debuff" : "buff"
  }

  return createStatusEffect({
    name: partial.name,
    effectType: effectType ?? "neutral",
    duration: partial.duration ?? 3,
    modifiers: partial.modifiers ?? {},
    description: partial.description,
    sourceType: sourceType ?? partial.sourceType ?? "environment",
    sourceId: partial.sourceId,
    stacks: partial.stacks,
    onTurnStart: partial.onTurnStart,
    onExpire: partial.onExpire,
  })
}

export function createTrap(partial: Partial<Trap> & { name: string; trapType: Trap["trapType"] }): Trap {
  return {
    id: generateEntityId("trap"),
    entityType: "trap",
    disarmDC: partial.disarmDC ?? 10,
    triggered: false,
    hidden: partial.hidden ?? true,
    ...partial,
  }
}

export function createShrine(partial: Partial<Shrine> & { name: string; shrineType: Shrine["shrineType"] }): Shrine {
  return {
    id: generateEntityId("shrine"),
    entityType: "shrine",
    used: false,
    riskLevel: partial.riskLevel ?? "moderate",
    ...partial,
  }
}

export function createNPC(partial: Partial<NPC> & { name: string; role: NPC["role"] }): NPC {
  return {
    id: generateEntityId("npc"),
    entityType: "npc",
    disposition: partial.disposition ?? 50,
    ...partial,
  }
}

export function createCompanion(
  partial: Partial<Companion> & { name: string; role: Companion["role"]; stats: Companion["stats"] },
): Companion {
  return {
    id: generateEntityId("companion"),
    entityType: "companion",
    loyalty: partial.loyalty ?? 50,
    personality: partial.personality ?? "stoic",
    alive: true,
    origin: partial.origin ?? "unknown companion",
    species: partial.species ?? "unknown",
    abilities: partial.abilities ?? [],
    combatBehavior: partial.combatBehavior ?? { style: "support", priority: "protect player" },
    bond: partial.bond ?? { level: 50, mood: "neutral", memory: [] },
    appearance: partial.appearance ?? "",
    quirk: partial.quirk ?? "",
    inParty: partial.inParty ?? true,
    turnsWithPlayer: partial.turnsWithPlayer ?? 0,
    flags: partial.flags ?? [],
    ...partial,
  }
}

export function createBoss(
  partial: Partial<Boss> & {
    name: string
    health: number
    attack: number
    defense: number
  },
): Boss {
  return {
    id: generateEntityId("boss"),
    entityType: "boss",
    maxHealth: partial.maxHealth ?? partial.health,
    currentPhase: 0,
    phases: partial.phases ?? [
      { name: "Awakened", healthThreshold: 100, attackModifier: 1, defenseModifier: 1 },
      { name: "Enraged", healthThreshold: 50, attackModifier: 1.5, defenseModifier: 0.8 },
      { name: "Desperate", healthThreshold: 25, attackModifier: 2, defenseModifier: 0.5 },
    ],
    expReward: partial.expReward ?? 100,
    goldReward: partial.goldReward ?? 50,
    guaranteedLoot: partial.guaranteedLoot ?? [],
    ...partial,
  }
}

export function createRoom(
  floor: number,
  roomNumber: number,
  roomType: Room["roomType"],
  entities: GameEntity[] = [],
): Room {
  return {
    id: generateEntityId("room"),
    name: `Room ${roomNumber}`,
    entityType: "location",
    roomNumber,
    floor,
    roomType,
    entities,
    explored: false,
  }
}

// Event creation helper
export function createGameEvent(
  type: GameEventType,
  source: GameEntity | null,
  target: GameEntity | null,
  context: Record<string, unknown> = {},
): GameEvent {
  return {
    id: generateEntityId("event"),
    type,
    timestamp: Date.now(),
    source,
    target,
    context,
  }
}

// Status effect processing
export function processStatusEffects(player: Player): {
  player: Player
  expiredEffects: StatusEffect[]
  tickDamage: number
  tickHeal: number
} {
  const expiredEffects: StatusEffect[] = []
  let tickDamage = 0
  let tickHeal = 0

  const updatedEffects = player.activeEffects
    .map((effect) => {
      // Apply health regen/damage
      if (effect.modifiers.healthRegen) {
        if (effect.modifiers.healthRegen > 0) {
          tickHeal += effect.modifiers.healthRegen
        } else {
          tickDamage += Math.abs(effect.modifiers.healthRegen)
        }
      }

      // Reduce duration
      if (effect.duration > 0) {
        const newDuration = effect.duration - 1
        if (newDuration <= 0) {
          expiredEffects.push(effect)
          return null
        }
        return { ...effect, duration: newDuration }
      }
      return effect
    })
    .filter((e): e is StatusEffect => e !== null)

  return {
    player: { ...player, activeEffects: updatedEffects },
    expiredEffects,
    tickDamage,
    tickHeal,
  }
}

// Calculate total player stats with effects
export function calculateEffectiveStats(player: Player): {
  attack: number
  defense: number
  maxHealth: number
  goldMultiplier: number
  expMultiplier: number
  critChance: number
  critDamage: number
  dodgeChance: number
  healthRegen: number
  damageMultiplier: number
  damageTakenMultiplier: number
  setSpecials: string[]
} {
  let attack = player.stats.attack + (player.equipment.weapon?.stats?.attack ?? 0)
  let defense = player.stats.defense + (player.equipment.armor?.stats?.defense ?? 0)
  let maxHealth = player.stats.maxHealth
  let goldMultiplier = 1
  let expMultiplier = 1
  let critChance = player.stats.critChance ?? 0.05
  let critDamage = 0.5 // Base crit multiplier (1.5x damage)
  let dodgeChance = player.stats.dodgeChance ?? 0
  let healthRegen = 0
  let damageMultiplier = 1 // Outgoing damage multiplier
  let damageTakenMultiplier = 1 // Incoming damage multiplier
  const setSpecials: string[] = []

  // Apply status effects
  for (const effect of player.activeEffects) {
    attack += effect.modifiers.attack ?? 0
    defense += effect.modifiers.defense ?? 0
    maxHealth += effect.modifiers.maxHealth ?? 0
    goldMultiplier *= effect.modifiers.goldMultiplier ?? 1
    expMultiplier *= effect.modifiers.expMultiplier ?? 1
    critChance += effect.modifiers.critChance ?? 0
    critDamage += effect.modifiers.critDamage ?? 0
    dodgeChance += effect.modifiers.dodgeChance ?? 0
    healthRegen += effect.modifiers.healthRegen ?? 0
    damageMultiplier *= effect.modifiers.damageMultiplier ?? 1
    damageTakenMultiplier *= effect.modifiers.damageTaken ?? 1
  }

  // Apply set bonuses from equipped items
  const equippedItems: Item[] = []
  if (player.equipment.weapon) equippedItems.push(player.equipment.weapon)
  if (player.equipment.armor) equippedItems.push(player.equipment.armor)

  const equippedSets = checkEquippedSets(equippedItems)
  if (equippedSets.length > 0) {
    const setBonuses = calculateSetBonuses(equippedSets)
    attack += setBonuses.attack
    defense += setBonuses.defense
    maxHealth += setBonuses.maxHealth
    critChance += setBonuses.critChance
    critDamage += setBonuses.critDamage
    dodgeChance += setBonuses.dodgeChance
    healthRegen += setBonuses.healthRegen
    setSpecials.push(...setBonuses.specials)
  }

  // Apply companion bonuses if alive
  const activeCompanion = player.party?.active?.[0]
  if (activeCompanion?.alive) {
    if (activeCompanion.role === "fighter") attack += 3
    if (activeCompanion.role === "mage") attack += 2
  }

  return {
    attack,
    defense,
    maxHealth,
    goldMultiplier,
    expMultiplier,
    critChance,
    critDamage,
    dodgeChance,
    healthRegen,
    damageMultiplier,
    damageTakenMultiplier,
    setSpecials,
  }
}

// Room event determination with entity weights
export function determineRoomEvent(
  floor: number,
  roomNumber: number,
  dungeonModifiers?: DungeonModifier[],
): { type: Room["roomType"]; weight: number } {
  const weights = {
    enemy: 35,
    treasure: 20,
    empty: 25,
    trap: 10,
    shrine: 5,
    npc: 5,
    boss: 0,
    safe: 0,
  }

  // Apply dungeon modifiers
  if (dungeonModifiers) {
    for (const mod of dungeonModifiers) {
      if (mod.effect.trapFrequency) {
        weights.trap *= mod.effect.trapFrequency
        weights.empty -= (mod.effect.trapFrequency - 1) * 5
      }
      if (mod.effect.shrineFrequency) {
        weights.shrine *= mod.effect.shrineFrequency
      }
      if (mod.effect.npcFrequency) {
        weights.npc *= mod.effect.npcFrequency
      }
    }
  }

  // Boss room at specific intervals (every 5th room on floor 3+)
  if (roomNumber % 5 === 0 && floor >= 3) {
    return { type: "boss", weight: 100 }
  }

  // Calculate total and roll
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total

  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight
    if (roll <= 0) {
      return { type: type as Room["roomType"], weight }
    }
  }

  return { type: "empty", weight: weights.empty }
}

// Predefined status effects
export const STATUS_EFFECTS = {
  // Buffs
  blessed: () =>
    createStatusEffect({
      name: "Blessed",
      effectType: "buff",
      duration: 5,
      modifiers: { attack: 3, defense: 2 },
      description: "Divine favor strengthens your body and spirit.",
    }),

  fortified: () =>
    createStatusEffect({
      name: "Fortified",
      effectType: "buff",
      duration: 3,
      modifiers: { defense: 5, maxHealth: 10 },
      description: "Your skin hardens like stone.",
    }),

  bloodlust: () =>
    createStatusEffect({
      name: "Bloodlust",
      effectType: "buff",
      duration: 4,
      modifiers: { attack: 5, defense: -2 },
      description: "Rage courses through your veins.",
    }),

  fortunate: () =>
    createStatusEffect({
      name: "Fortune's Favor",
      effectType: "buff",
      duration: 10,
      modifiers: { goldMultiplier: 1.5, expMultiplier: 1.25 },
      description: "Luck smiles upon you.",
    }),

  regeneration: () =>
    createStatusEffect({
      name: "Regeneration",
      effectType: "buff",
      duration: 5,
      modifiers: { healthRegen: 3 },
      description: "Your wounds close unnaturally fast.",
    }),

  strengthened: () =>
    createStatusEffect({
      name: "Strengthened",
      effectType: "buff",
      duration: 3,
      modifiers: { attack: 4 },
      description: "Raw power surges through your muscles.",
    }),

  // Debuffs
  poisoned: () =>
    createStatusEffect({
      name: "Poisoned",
      effectType: "debuff",
      duration: 4,
      modifiers: { healthRegen: -3 },
      description: "Venom courses through your blood.",
    }),

  cursed: () =>
    createStatusEffect({
      name: "Cursed",
      effectType: "debuff",
      duration: -1, // permanent until removed
      modifiers: { attack: -3, defense: -2, goldMultiplier: 0.75 },
      description: "Dark magic weighs upon your soul.",
    }),

  weakened: () =>
    createStatusEffect({
      name: "Weakened",
      effectType: "debuff",
      duration: 3,
      modifiers: { attack: -4 },
      description: "Your strength fades.",
    }),

  marked: () =>
    createStatusEffect({
      name: "Marked for Death",
      effectType: "debuff",
      duration: 5,
      modifiers: { defense: -5 },
      description: "Enemies sense your vulnerability.",
    }),

  blinded: () =>
    createStatusEffect({
      name: "Blinded",
      effectType: "debuff",
      duration: 2,
      modifiers: { attack: -5, defense: -3 },
      description: "Darkness clouds your vision.",
    }),
}

// Predefined trap templates
export const TRAP_TEMPLATES = {
  spike: () =>
    createTrap({
      name: "Spike Trap",
      trapType: "damage",
      damage: 15,
      disarmDC: 8,
      description: "Rusted spikes burst from the floor.",
    }),

  poison_dart: () =>
    createTrap({
      name: "Poison Dart Trap",
      trapType: "poison",
      damage: 5,
      effect: STATUS_EFFECTS.poisoned(),
      disarmDC: 12,
      description: "A click, then needles fly from the walls.",
    }),

  curse_rune: () =>
    createTrap({
      name: "Cursed Rune",
      trapType: "curse",
      effect: STATUS_EFFECTS.cursed(),
      disarmDC: 15,
      description: "Malevolent symbols glow with dark energy.",
    }),

  alarm: () =>
    createTrap({
      name: "Alarm Trap",
      trapType: "alarm",
      disarmDC: 6,
      description: "A tripwire connected to rusted bells.",
    }),

  teleport: () =>
    createTrap({
      name: "Teleportation Circle",
      trapType: "teleport",
      disarmDC: 18,
      description: "Ancient runes flicker with unstable magic.",
    }),
}

// Predefined shrine templates
export const SHRINE_TEMPLATES = {
  health: () =>
    createShrine({
      name: "Shrine of Restoration",
      shrineType: "health",
      riskLevel: "safe",
      cost: { gold: 25 },
      reward: { effect: STATUS_EFFECTS.regeneration() },
      description: "A fountain of clear, glowing water.",
    }),

  power: () =>
    createShrine({
      name: "Altar of Might",
      shrineType: "power",
      riskLevel: "moderate",
      cost: { health: 10 },
      reward: { effect: STATUS_EFFECTS.bloodlust() },
      description: "A bloodstained altar pulses with violent energy.",
    }),

  fortune: () =>
    createShrine({
      name: "Idol of Fortune",
      shrineType: "fortune",
      riskLevel: "moderate",
      cost: { gold: 50 },
      reward: { effect: STATUS_EFFECTS.fortunate() },
      description: "A golden idol with gemstone eyes.",
    }),

  dark: () =>
    createShrine({
      name: "Dark Obelisk",
      shrineType: "dark",
      riskLevel: "dangerous",
      description: "A pillar of obsidian that drinks the light.",
    }),

  unknown: () =>
    createShrine({
      name: "Mysterious Shrine",
      shrineType: "unknown",
      riskLevel: "dangerous",
      description: "You cannot discern its purpose.",
    }),
}

// Dungeon modifiers
export const DUNGEON_MODIFIERS: Record<string, DungeonModifier> = {
  echoing: {
    id: "echoing",
    name: "The Echoing Halls",
    description: "Enemies call for reinforcements",
    effect: { enemyHealthMult: 0.8 },
  },
  fortified: {
    id: "fortified",
    name: "Fortified",
    description: "Enemies have increased defense",
    effect: { enemyDamageMult: 0.9 },
  },
  trapped: {
    id: "trapped",
    name: "Trap-Laden",
    description: "More traps await the unwary",
    effect: { trapFrequency: 2 },
  },
  sacred: {
    id: "sacred",
    name: "Sacred Grounds",
    description: "Shrines appear more frequently",
    effect: { shrineFrequency: 2 },
  },
  haunted: {
    id: "haunted",
    name: "Haunted",
    description: "Wandering spirits offer cryptic aid",
    effect: { npcFrequency: 1.5 },
  },
  bountiful: {
    id: "bountiful",
    name: "Bountiful",
    description: "Better loot awaits",
    effect: { lootRarityBonus: 1 },
  },
  deadly: {
    id: "deadly",
    name: "Deadly",
    description: "Enemies hit harder",
    effect: { enemyDamageMult: 1.3 },
  },
}
