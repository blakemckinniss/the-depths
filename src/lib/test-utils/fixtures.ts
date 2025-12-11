/**
 * Test fixtures and factories for The Depths game
 * Creates mock game objects for deterministic testing
 */

import type {
  Player,
  Enemy,
  Boss,
  Item,
  StatusEffect,
  Ability,
  CombatStance,
  ComboTracker,
  PlayerStats,
  PlayerEquipment,
  DamageType,
  EnemyAbility,
} from "@/lib/core/game-types";

// =============================================================================
// PLAYER FIXTURES
// =============================================================================

export function createMockPlayerStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    level: 1,
    experience: 0,
    experienceToLevel: 100,
    gold: 0,
    strength: 10,
    intelligence: 10,
    dexterity: 10,
    critChance: 0.05,
    critDamage: 1.5,
    dodgeChance: 0,
    luck: 0,
    speed: 10,
    vampirism: 0,
    thorns: 0,
    blockChance: 0,
    magicFind: 0,
    expBonus: 0,
    healthRegen: 0,
    resourceRegen: 0,
    ...overrides,
  };
}

export function createMockEquipment(overrides: Partial<PlayerEquipment> = {}): PlayerEquipment {
  return {
    mainHand: null,
    offHand: null,
    head: null,
    chest: null,
    legs: null,
    feet: null,
    hands: null,
    ring1: null,
    ring2: null,
    amulet: null,
    cloak: null,
    belt: null,
    // Legacy aliases
    weapon: null,
    armor: null,
    ...overrides,
  };
}

export function createMockComboTracker(overrides: Partial<ComboTracker> = {}): ComboTracker {
  return {
    lastAbilities: [],
    activeCombo: undefined,
    ...overrides,
  };
}

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    name: "Test Hero",
    class: "warrior",
    race: "human",
    stats: createMockPlayerStats(overrides.stats),
    equipment: createMockEquipment(overrides.equipment),
    inventory: [],
    gold: 100,
    keys: [],
    activeEffects: [],
    abilities: [],
    abilityCooldowns: {},
    stance: "balanced" as CombatStance,
    combo: createMockComboTracker(overrides.combo),
    spellBook: {
      knownSpells: [],
      preparedSpells: [],
      maxPrepared: 3,
    },
    party: {
      active: [],
      reserve: [],
      graveyard: [],
      maxPartySize: 1,
    },
    resources: {
      mana: 50,
      maxMana: 50,
      rage: 0,
      maxRage: 100,
      energy: 100,
      maxEnergy: 100,
    },
    essence: {},
    materials: [],
    ...overrides,
  } as Player;
}

// =============================================================================
// ENEMY FIXTURES
// =============================================================================

export function createMockEnemyAbility(overrides: Partial<EnemyAbility> = {}): EnemyAbility {
  return {
    id: `ability-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Attack",
    description: "A test ability",
    damage: 10,
    damageType: "physical",
    cooldown: 2,
    currentCooldown: 0,
    chance: 0.3,
    narration: "The enemy attacks!",
    ...overrides,
  };
}

export function createMockEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: `enemy-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Goblin",
    description: "A test enemy",
    health: 50,
    maxHealth: 50,
    attack: 8,
    defense: 3,
    level: 1,
    weakness: undefined,
    resistance: undefined,
    abilities: [],
    aiPattern: "random",
    loot: [],
    expReward: 25,
    goldReward: 10,
    rank: "normal",
    ...overrides,
  } as Enemy;
}

export function createMockBoss(overrides: Partial<Boss> = {}): Boss {
  return {
    id: `boss-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Dragon",
    description: "A fearsome test boss",
    health: 200,
    maxHealth: 200,
    attack: 20,
    defense: 10,
    level: 5,
    weakness: "ice",
    resistance: "fire",
    abilities: [createMockEnemyAbility({ name: "Fire Breath", damageType: "fire", damage: 25 })],
    phases: [],
    currentPhase: 0,
    expReward: 500,
    goldReward: 100,
    loot: [],
    dialogue: {
      intro: "You dare challenge me?",
      phaseTransitions: [],
      death: "Impossible...",
    },
    ...overrides,
  } as Boss;
}

// =============================================================================
// ITEM FIXTURES
// =============================================================================

export function createMockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Sword",
    description: "A basic test weapon",
    category: "weapon",
    rarity: "common",
    value: 25,
    stats: { attack: 5 },
    effects: [],
    requirements: {},
    ...overrides,
  } as Item;
}

export function createMockWeapon(
  rarity: "common" | "uncommon" | "rare" | "legendary" = "common",
  damageType?: DamageType,
): Item {
  const rarityMultipliers = { common: 1, uncommon: 1.4, rare: 2, legendary: 3.5 };
  const baseAttack = Math.floor(6 * rarityMultipliers[rarity]);

  return createMockItem({
    name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Sword`,
    category: "weapon",
    subtype: "sword",
    rarity,
    stats: { attack: baseAttack },
    damageType,
    value: Math.floor(25 * rarityMultipliers[rarity]),
  });
}

export function createMockArmor(
  slot: "head" | "chest" | "legs" | "feet" | "hands" = "chest",
  rarity: "common" | "uncommon" | "rare" | "legendary" = "common",
): Item {
  const baseDefense = { head: 3, chest: 6, legs: 4, feet: 2, hands: 2 };
  const rarityMultipliers = { common: 1, uncommon: 1.4, rare: 2, legendary: 3.5 };

  return createMockItem({
    name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${slot.charAt(0).toUpperCase() + slot.slice(1)} Armor`,
    category: "armor",
    subtype: slot,
    rarity,
    stats: { defense: Math.floor(baseDefense[slot] * rarityMultipliers[rarity]) },
    value: Math.floor(30 * rarityMultipliers[rarity]),
  });
}

// =============================================================================
// EFFECT FIXTURES
// =============================================================================

export function createMockStatusEffect(overrides: Partial<StatusEffect> = {}): StatusEffect {
  return {
    id: `effect-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Buff",
    description: "A test status effect",
    effectType: "buff",
    duration: 3,
    stacks: 1,
    modifiers: { attack: 2 },
    sourceType: "item",
    ...overrides,
  } as StatusEffect;
}

export function createBurnEffect(power: number = 3, duration: number = 3): StatusEffect {
  return createMockStatusEffect({
    name: "Burning",
    description: "Taking fire damage over time",
    effectType: "debuff",
    duration,
    modifiers: { healthRegen: -power },
    sourceType: "enemy",
  });
}

export function createPoisonEffect(power: number = 2, duration: number = 4): StatusEffect {
  return createMockStatusEffect({
    name: "Poisoned",
    description: "Taking poison damage over time",
    effectType: "debuff",
    duration,
    modifiers: { healthRegen: -power },
    sourceType: "enemy",
  });
}

export function createAttackBuff(bonus: number = 5, duration: number = 3): StatusEffect {
  return createMockStatusEffect({
    name: "Empowered",
    description: "Attack increased",
    effectType: "buff",
    duration,
    modifiers: { attack: bonus },
    sourceType: "shrine",
  });
}

export function createDefenseDebuff(penalty: number = 3, duration: number = 2): StatusEffect {
  return createMockStatusEffect({
    name: "Weakened Armor",
    description: "Defense reduced",
    effectType: "debuff",
    duration,
    modifiers: { defense: -penalty },
    sourceType: "enemy",
  });
}

// =============================================================================
// ABILITY FIXTURES
// =============================================================================

export function createMockAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: `ability-${Math.random().toString(36).slice(2, 9)}`,
    entityType: "ability",
    name: "Test Strike",
    description: "A basic test ability",
    category: "combat",
    cooldown: 2,
    currentCooldown: 0,
    baseDamage: 15,
    damageType: "physical",
    resourceCost: 20,
    resourceType: "energy",
    levelRequired: 1,
    targetType: "enemy",
    ...overrides,
  } as Ability;
}

export function createFireAbility(): Ability {
  return createMockAbility({
    name: "Fireball",
    description: "Launch a ball of fire",
    category: "magic",
    baseDamage: 20,
    damageType: "fire",
    resourceCost: 25,
    resourceType: "mana",
    cooldown: 3,
  });
}

export function createIceAbility(): Ability {
  return createMockAbility({
    name: "Ice Shard",
    description: "Hurl a shard of ice",
    category: "magic",
    baseDamage: 15,
    damageType: "ice",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 2,
  });
}

// =============================================================================
// SCENARIO BUILDERS
// =============================================================================

/**
 * Create a combat scenario with player and enemy at specific configurations
 */
export function createCombatScenario(config: {
  playerLevel?: number;
  playerHealth?: number;
  playerAttack?: number;
  playerDefense?: number;
  playerStance?: CombatStance;
  enemyLevel?: number;
  enemyHealth?: number;
  enemyAttack?: number;
  enemyDefense?: number;
  enemyWeakness?: DamageType;
  enemyResistance?: DamageType;
}) {
  const player = createMockPlayer({
    stats: createMockPlayerStats({
      level: config.playerLevel ?? 1,
      health: config.playerHealth ?? 100,
      maxHealth: config.playerHealth ?? 100,
      attack: config.playerAttack ?? 10,
      defense: config.playerDefense ?? 5,
    }),
    stance: config.playerStance ?? "balanced",
  });

  const enemy = createMockEnemy({
    level: config.enemyLevel ?? 1,
    health: config.enemyHealth ?? 50,
    maxHealth: config.enemyHealth ?? 50,
    attack: config.enemyAttack ?? 8,
    defense: config.enemyDefense ?? 3,
    weakness: config.enemyWeakness,
    resistance: config.enemyResistance,
  });

  return { player, enemy };
}

/**
 * Create a boss encounter scenario
 */
export function createBossScenario(config: {
  playerLevel?: number;
  bossLevel?: number;
  bossWeakness?: DamageType;
  bossResistance?: DamageType;
}) {
  const player = createMockPlayer({
    stats: createMockPlayerStats({
      level: config.playerLevel ?? 5,
      health: 150,
      maxHealth: 150,
      attack: 20,
      defense: 12,
    }),
  });

  const boss = createMockBoss({
    level: config.bossLevel ?? 5,
    weakness: config.bossWeakness ?? "ice",
    resistance: config.bossResistance ?? "fire",
  });

  return { player, boss };
}
