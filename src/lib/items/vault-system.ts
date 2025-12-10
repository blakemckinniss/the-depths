/**
 * Vault System
 *
 * Special optional rooms with unique mechanics and enhanced rewards.
 * Vaults are risky but offer the best loot in the game.
 */

import type { Item, StatusEffect } from "@/lib/core/game-types"
import type { RankedEnemy, EnemyRank } from "@/lib/entity/enemy-rank-system"
import { generateId } from "@/lib/core/utils"

// =============================================================================
// VAULT TYPES
// =============================================================================

export type VaultType =
  | "sealed_vault" // Requires key, contains rare loot
  | "demon_rift" // Wave survival, scaling rewards
  | "time_locked" // Limited turns to grab everything
  | "cursed_treasury" // Great loot but everything is cursed
  | "ancient_armory" // Weapon/armor focused
  | "alchemist_lab" // Consumables and materials
  | "trial_chamber" // Skill challenge, ability rewards
  | "void_pocket" // Random chaos, anything can happen
  | "dragon_hoard" // Ultimate reward, ultimate danger

export type VaultState = "locked" | "active" | "completed" | "failed" | "expired"

// =============================================================================
// VAULT DEFINITIONS
// =============================================================================

export interface VaultDefinition {
  type: VaultType
  name: string
  description: string
  dangerLevel: 1 | 2 | 3 | 4 | 5 // 1 = moderate, 5 = extreme
  minFloor: number // minimum floor to spawn
  spawnWeight: number // relative chance to spawn
  requiresKey?: boolean
  keyType?: string // specific key required
  timeLimit?: number // turns before vault expires/closes
  waveCount?: number // for wave-based vaults
  curseChance?: number // 0-1, chance items are cursed
  lootMultiplier: number // multiplier on loot quality/quantity
  enemyRankMin: EnemyRank // minimum enemy rank in vault
  uniqueMechanic?: string // description of special mechanic
}

export const VAULT_DEFINITIONS: Record<VaultType, VaultDefinition> = {
  sealed_vault: {
    type: "sealed_vault",
    name: "Sealed Vault",
    description: "An ancient vault sealed with powerful magic. A key is required to enter.",
    dangerLevel: 2,
    minFloor: 2,
    spawnWeight: 15,
    requiresKey: true,
    keyType: "key_ornate",
    lootMultiplier: 2.0,
    enemyRankMin: "rare",
    uniqueMechanic: "Contains 2-4 guaranteed rare+ items. Single guardian.",
  },
  demon_rift: {
    type: "demon_rift",
    name: "Demon Rift",
    description: "A tear in reality spewing forth demonic entities. Survive the waves for increasing rewards.",
    dangerLevel: 4,
    minFloor: 3,
    spawnWeight: 10,
    waveCount: 5,
    lootMultiplier: 3.0,
    enemyRankMin: "rare",
    uniqueMechanic: "5 waves of enemies. Each completed wave increases reward tier. Can leave between waves.",
  },
  time_locked: {
    type: "time_locked",
    name: "Time-Locked Chamber",
    description: "A pocket of frozen time. You have limited turns before reality reasserts itself.",
    dangerLevel: 2,
    minFloor: 2,
    spawnWeight: 12,
    timeLimit: 8,
    lootMultiplier: 2.5,
    enemyRankMin: "normal",
    uniqueMechanic: "8 turns to loot everything. No combat. Choose wisely what to grab.",
  },
  cursed_treasury: {
    type: "cursed_treasury",
    name: "Cursed Treasury",
    description: "Immense wealth protected by ancient curses. Everything you take comes with a price.",
    dangerLevel: 3,
    minFloor: 3,
    spawnWeight: 8,
    curseChance: 0.8,
    lootMultiplier: 4.0,
    enemyRankMin: "unique",
    uniqueMechanic: "80% of items are cursed. Legendary items guaranteed. Single cursed guardian.",
  },
  ancient_armory: {
    type: "ancient_armory",
    name: "Ancient Armory",
    description: "A forgotten armory filled with weapons and armor of a lost civilization.",
    dangerLevel: 2,
    minFloor: 2,
    spawnWeight: 12,
    lootMultiplier: 2.0,
    enemyRankMin: "rare",
    uniqueMechanic: "Only weapons and armor. Higher chance of enchanted items. Animated armor guardians.",
  },
  alchemist_lab: {
    type: "alchemist_lab",
    name: "Abandoned Alchemist Lab",
    description: "A mad alchemist's laboratory, filled with potions and rare reagents.",
    dangerLevel: 2,
    minFloor: 1,
    spawnWeight: 15,
    lootMultiplier: 1.8,
    enemyRankMin: "normal",
    uniqueMechanic: "Consumables and materials only. May find rare recipes. Chance of volatile explosion.",
  },
  trial_chamber: {
    type: "trial_chamber",
    name: "Trial Chamber",
    description: "An ancient testing ground. Prove your worth to receive power.",
    dangerLevel: 3,
    minFloor: 3,
    spawnWeight: 8,
    lootMultiplier: 1.5,
    enemyRankMin: "unique",
    uniqueMechanic: "Skill challenge. Success grants ability point or rare skill book. Failure deals damage.",
  },
  void_pocket: {
    type: "void_pocket",
    name: "Void Pocket",
    description: "A bubble of unreality where the rules don't apply. Anything could happen.",
    dangerLevel: 5,
    minFloor: 4,
    spawnWeight: 5,
    lootMultiplier: 5.0,
    enemyRankMin: "unique",
    uniqueMechanic: "Random effects each turn. Could be helpful or harmful. Ultimate risk/reward.",
  },
  dragon_hoard: {
    type: "dragon_hoard",
    name: "Dragon's Hoard",
    description: "The treasure hoard of an ancient dragon. Unimaginable wealth... if you survive.",
    dangerLevel: 5,
    minFloor: 5,
    spawnWeight: 3,
    lootMultiplier: 10.0,
    enemyRankMin: "elite_boss",
    uniqueMechanic: "Elite boss dragon. Defeat grants access to legendary treasure pile.",
  },
}

// =============================================================================
// VAULT INSTANCE
// =============================================================================

export interface VaultReward {
  items: Item[]
  gold: number
  experience: number
  abilityPoints?: number
  recipes?: string[]
  loreUnlocks?: string[]
}

export interface VaultWave {
  waveNumber: number
  enemies: RankedEnemy[]
  completed: boolean
  reward?: Partial<VaultReward>
}

export interface VaultInstance {
  id: string
  definition: VaultDefinition
  state: VaultState
  turnsRemaining?: number
  currentWave?: number
  waves?: VaultWave[]
  availableLoot: Item[]
  collectedLoot: Item[]
  totalGold: number
  collectedGold: number
  guardian?: RankedEnemy
  guardianDefeated: boolean
  cursesApplied: StatusEffect[]
  specialEvents: VaultEvent[]
  enteredAt: number // turn number when entered
}

// =============================================================================
// VAULT EVENTS
// =============================================================================

export type VaultEventType =
  | "trap_triggered"
  | "curse_activated"
  | "bonus_loot"
  | "enemy_spawn"
  | "time_warning"
  | "chaos_effect"
  | "blessing_received"
  | "secret_found"

export interface VaultEvent {
  id: string
  type: VaultEventType
  description: string
  resolved: boolean
  effect?: {
    damage?: number
    healing?: number
    statusEffect?: StatusEffect
    itemGained?: Item
    goldChange?: number
  }
}

// =============================================================================
// VAULT GENERATION
// =============================================================================

/**
 * Roll for vault spawn based on floor
 */
export function shouldSpawnVault(floor: number): boolean {
  // Base 15% chance, +3% per floor
  const chance = 0.15 + (floor * 0.03)
  return Math.random() < Math.min(chance, 0.40) // cap at 40%
}

/**
 * Select vault type based on floor and weights
 */
export function selectVaultType(floor: number): VaultType {
  const eligibleVaults = Object.values(VAULT_DEFINITIONS)
    .filter(v => v.minFloor <= floor)

  // Calculate total weight
  const totalWeight = eligibleVaults.reduce((sum, v) => sum + v.spawnWeight, 0)

  // Weighted random selection
  let roll = Math.random() * totalWeight
  for (const vault of eligibleVaults) {
    roll -= vault.spawnWeight
    if (roll <= 0) return vault.type
  }

  return "sealed_vault" // fallback
}

/**
 * Generate a vault instance
 */
export function generateVault(floor: number, forceType?: VaultType): VaultInstance {
  const vaultType = forceType ?? selectVaultType(floor)
  const definition = VAULT_DEFINITIONS[vaultType]

  const vault: VaultInstance = {
    id: generateId(),
    definition,
    state: definition.requiresKey ? "locked" : "active",
    availableLoot: [], // populated by loot generator
    collectedLoot: [],
    totalGold: Math.floor(50 * floor * definition.lootMultiplier),
    collectedGold: 0,
    guardianDefeated: false,
    cursesApplied: [],
    specialEvents: [],
    enteredAt: 0,
  }

  // Add time limit if applicable
  if (definition.timeLimit) {
    vault.turnsRemaining = definition.timeLimit
  }

  // Add waves if applicable
  if (definition.waveCount) {
    vault.waves = []
    vault.currentWave = 0
    for (let i = 0; i < definition.waveCount; i++) {
      vault.waves.push({
        waveNumber: i + 1,
        enemies: [], // populated when wave starts
        completed: false,
      })
    }
  }

  return vault
}

// =============================================================================
// VAULT MECHANICS
// =============================================================================

/**
 * Attempt to unlock a vault with a key
 */
export function unlockVault(vault: VaultInstance, keyType: string): { success: boolean; message: string } {
  if (vault.state !== "locked") {
    return { success: false, message: "This vault is not locked." }
  }

  if (vault.definition.keyType && vault.definition.keyType !== keyType) {
    return { success: false, message: `This vault requires a ${vault.definition.keyType}.` }
  }

  vault.state = "active"
  return { success: true, message: `The ${vault.definition.name} opens with a grinding of ancient mechanisms.` }
}

/**
 * Process a turn in a time-locked vault
 */
export function tickVaultTimer(vault: VaultInstance): { expired: boolean; warning?: string } {
  if (!vault.turnsRemaining) {
    return { expired: false }
  }

  vault.turnsRemaining--

  if (vault.turnsRemaining <= 0) {
    vault.state = "expired"
    return { expired: true }
  }

  if (vault.turnsRemaining === 3) {
    return { expired: false, warning: "Reality begins to reassert itself. 3 turns remain!" }
  }

  if (vault.turnsRemaining === 1) {
    return { expired: false, warning: "The chamber shudders violently. 1 turn remains!" }
  }

  return { expired: false }
}

/**
 * Advance to next wave in wave-based vault
 */
export function advanceVaultWave(vault: VaultInstance): { complete: boolean; nextWave?: VaultWave } {
  if (!vault.waves || vault.currentWave === undefined) {
    return { complete: true }
  }

  // Mark current wave as complete
  if (vault.currentWave > 0 && vault.waves[vault.currentWave - 1]) {
    vault.waves[vault.currentWave - 1].completed = true
  }

  vault.currentWave++

  if (vault.currentWave > vault.waves.length) {
    vault.state = "completed"
    return { complete: true }
  }

  return { complete: false, nextWave: vault.waves[vault.currentWave - 1] }
}

/**
 * Collect loot from vault
 */
export function collectVaultLoot(vault: VaultInstance, itemIndex: number): { item: Item | null; curse?: StatusEffect } {
  if (itemIndex < 0 || itemIndex >= vault.availableLoot.length) {
    return { item: null }
  }

  const item = vault.availableLoot.splice(itemIndex, 1)[0]
  vault.collectedLoot.push(item)

  // Check for curse
  if (vault.definition.curseChance && Math.random() < vault.definition.curseChance) {
    const curse = generateVaultCurse(item.name)
    vault.cursesApplied.push(curse)
    return { item, curse }
  }

  return { item }
}

/**
 * Collect gold from vault
 */
export function collectVaultGold(vault: VaultInstance, amount: number): number {
  const collected = Math.min(amount, vault.totalGold - vault.collectedGold)
  vault.collectedGold += collected
  return collected
}

/**
 * Complete a vault (successfully or by leaving)
 */
export function completeVault(vault: VaultInstance, success: boolean): VaultReward {
  vault.state = success ? "completed" : "failed"

  return {
    items: vault.collectedLoot,
    gold: vault.collectedGold,
    experience: success ? Math.floor(100 * vault.definition.dangerLevel) : 0,
  }
}

// =============================================================================
// VAULT CURSES
// =============================================================================

/**
 * Generate a curse for cursed treasury items
 */
function generateVaultCurse(itemName: string): StatusEffect {
  const curses: Array<() => StatusEffect> = [
    () => ({
      id: generateId(),
      name: "Greed's Price",
      entityType: "curse" as const,
      effectType: "debuff" as const,
      duration: -1, // permanent until cleansed
      modifiers: { goldMultiplier: 0.5 },
      description: `The ${itemName} was claimed with greed. Gold earned is halved.`,
    }),
    () => ({
      id: generateId(),
      name: "Weight of Avarice",
      entityType: "curse" as const,
      effectType: "debuff" as const,
      duration: -1,
      modifiers: { defense: -3 },
      description: `The ${itemName} weighs heavily on your soul.`,
    }),
    () => ({
      id: generateId(),
      name: "Thief's Mark",
      entityType: "curse" as const,
      effectType: "debuff" as const,
      duration: -1,
      modifiers: { attack: -2, defense: -2 },
      description: `The ${itemName}'s previous owner left a mark upon you.`,
    }),
    () => ({
      id: generateId(),
      name: "Hungering Darkness",
      entityType: "curse" as const,
      effectType: "debuff" as const,
      duration: -1,
      modifiers: { healthRegen: -2 },
      description: `The ${itemName} slowly drains your life force.`,
    }),
  ]

  return curses[Math.floor(Math.random() * curses.length)]()
}

// =============================================================================
// VOID POCKET CHAOS EFFECTS
// =============================================================================

export interface ChaosEffect {
  name: string
  description: string
  isPositive: boolean
  apply: () => {
    damage?: number
    healing?: number
    goldChange?: number
    statusEffect?: Partial<StatusEffect>
  }
}

export const CHAOS_EFFECTS: ChaosEffect[] = [
  {
    name: "Reality Stabilizes",
    description: "A moment of calm in the chaos.",
    isPositive: true,
    apply: () => ({ healing: 15 }),
  },
  {
    name: "Void Eruption",
    description: "Raw void energy tears at your form.",
    isPositive: false,
    apply: () => ({ damage: 20 }),
  },
  {
    name: "Fortune's Whim",
    description: "Gold materializes from nothing.",
    isPositive: true,
    apply: () => ({ goldChange: Math.floor(Math.random() * 100) + 50 }),
  },
  {
    name: "Entropy's Toll",
    description: "Your possessions crumble.",
    isPositive: false,
    apply: () => ({ goldChange: -Math.floor(Math.random() * 30) }),
  },
  {
    name: "Temporal Blessing",
    description: "Time flows strangely, hastening your actions.",
    isPositive: true,
    apply: () => ({
      statusEffect: {
        name: "Temporal Haste",
        effectType: "buff" as const,
        duration: 5,
        modifiers: { attack: 5 },
      },
    }),
  },
  {
    name: "Dimensional Sickness",
    description: "Reality disagrees with your biology.",
    isPositive: false,
    apply: () => ({
      statusEffect: {
        name: "Void Sickness",
        effectType: "debuff" as const,
        duration: 3,
        modifiers: { attack: -3, defense: -3 },
      },
    }),
  },
]

/**
 * Roll a random chaos effect for void pocket
 */
export function rollChaosEffect(): ChaosEffect {
  return CHAOS_EFFECTS[Math.floor(Math.random() * CHAOS_EFFECTS.length)]
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get vault danger color
 */
export function getVaultDangerColor(dangerLevel: number): string {
  switch (dangerLevel) {
    case 1: return "text-green-400"
    case 2: return "text-yellow-400"
    case 3: return "text-orange-400"
    case 4: return "text-red-400"
    case 5: return "text-purple-500"
    default: return "text-gray-400"
  }
}

/**
 * Get vault state display
 */
export function getVaultStateDisplay(state: VaultState): { text: string; color: string } {
  switch (state) {
    case "locked": return { text: "Locked", color: "text-gray-500" }
    case "active": return { text: "Active", color: "text-green-400" }
    case "completed": return { text: "Completed", color: "text-blue-400" }
    case "failed": return { text: "Failed", color: "text-red-400" }
    case "expired": return { text: "Expired", color: "text-orange-400" }
  }
}

/**
 * Check if player can enter vault
 */
export function canEnterVault(vault: VaultInstance, hasKey: boolean, keyType?: string): { canEnter: boolean; reason?: string } {
  if (vault.state === "completed" || vault.state === "failed" || vault.state === "expired") {
    return { canEnter: false, reason: "This vault is no longer accessible." }
  }

  if (vault.state === "locked") {
    if (!hasKey) {
      return { canEnter: false, reason: `Requires ${vault.definition.keyType || "a key"} to enter.` }
    }
    if (vault.definition.keyType && keyType !== vault.definition.keyType) {
      return { canEnter: false, reason: `Requires ${vault.definition.keyType}, not ${keyType}.` }
    }
  }

  return { canEnter: true }
}
