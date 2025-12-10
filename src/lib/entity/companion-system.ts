import type { Companion, CompanionAbility, PartyState, Player, Enemy, NPC, Combatant } from "@/lib/core/game-types"
import { generateEntityId } from "./entity-system"

// ============================================================================
// PARTY MANAGEMENT
// ============================================================================

export function createInitialParty(): PartyState {
  return {
    active: [],
    reserve: [],
    maxActive: 1,
    graveyard: [],
  }
}

export function getMaxActiveCompanions(playerLevel: number): number {
  if (playerLevel >= 10) return 3
  if (playerLevel >= 5) return 2
  return 1
}

export function canRecruitCompanion(party: PartyState): boolean {
  return party.active.length + party.reserve.length < 10 // max total companions
}

export function addCompanionToParty(party: PartyState, companion: Companion, toActive: boolean): PartyState {
  if (toActive && party.active.length < party.maxActive) {
    return {
      ...party,
      active: [...party.active, { ...companion, inParty: true }],
    }
  }
  return {
    ...party,
    reserve: [...party.reserve, { ...companion, inParty: false }],
  }
}

export function removeCompanionFromParty(party: PartyState, companionId: string): PartyState {
  return {
    ...party,
    active: party.active.filter((c) => c.id !== companionId),
    reserve: party.reserve.filter((c) => c.id !== companionId),
  }
}

export function swapCompanion(party: PartyState, activeId: string, reserveId: string): PartyState {
  const activeComp = party.active.find((c) => c.id === activeId)
  const reserveComp = party.reserve.find((c) => c.id === reserveId)

  if (!activeComp || !reserveComp) return party

  return {
    ...party,
    active: [...party.active.filter((c) => c.id !== activeId), { ...reserveComp, inParty: true }],
    reserve: [...party.reserve.filter((c) => c.id !== reserveId), { ...activeComp, inParty: false }],
  }
}

export function companionDeath(party: PartyState, companionId: string): PartyState {
  const deadCompanion = party.active.find((c) => c.id === companionId)
  if (!deadCompanion) return party

  return {
    ...party,
    active: party.active.filter((c) => c.id !== companionId),
    graveyard: [...party.graveyard, { ...deadCompanion, alive: false, inParty: false }],
  }
}

// ============================================================================
// BOND SYSTEM
// ============================================================================

export function modifyBond(companion: Companion, delta: number, reason: string): Companion {
  const newLevel = Math.max(0, Math.min(100, companion.bond.level + delta))
  const memory = delta !== 0 ? [...companion.bond.memory.slice(-4), reason] : companion.bond.memory

  return {
    ...companion,
    bond: {
      ...companion.bond,
      level: newLevel,
      memory,
    },
  }
}

export function getBondTier(bondLevel: number): "hostile" | "wary" | "neutral" | "friendly" | "loyal" | "soulbound" {
  if (bondLevel < 10) return "hostile"
  if (bondLevel < 25) return "wary"
  if (bondLevel < 50) return "neutral"
  if (bondLevel < 75) return "friendly"
  if (bondLevel < 95) return "loyal"
  return "soulbound"
}

export function getBondEffects(bondLevel: number): {
  damageBonus: number
  defenseBonus: number
  betrayalChance: number
} {
  const tier = getBondTier(bondLevel)
  switch (tier) {
    case "hostile":
      return { damageBonus: -0.5, defenseBonus: -0.5, betrayalChance: 0.3 }
    case "wary":
      return { damageBonus: -0.2, defenseBonus: -0.2, betrayalChance: 0.1 }
    case "neutral":
      return { damageBonus: 0, defenseBonus: 0, betrayalChance: 0.02 }
    case "friendly":
      return { damageBonus: 0.1, defenseBonus: 0.1, betrayalChance: 0 }
    case "loyal":
      return { damageBonus: 0.25, defenseBonus: 0.25, betrayalChance: 0 }
    case "soulbound":
      return { damageBonus: 0.5, defenseBonus: 0.5, betrayalChance: 0 }
  }
}

// ============================================================================
// COMBAT INTEGRATION
// ============================================================================

export function calculateCompanionDamage(companion: Companion, ability?: CompanionAbility): number {
  const baseDamage = ability?.effect.value || companion.stats.attack
  const bondEffects = getBondEffects(companion.bond.level)
  return Math.floor(baseDamage * (1 + bondEffects.damageBonus))
}

export function calculateCompanionDefense(companion: Companion): number {
  const bondEffects = getBondEffects(companion.bond.level)
  return Math.floor(companion.stats.defense * (1 + bondEffects.defenseBonus))
}

export function selectCompanionAction(
  companion: Companion,
  player: Player,
  enemy: Combatant | null,
): { action: "attack" | "ability" | "defend" | "flee" | "betray"; ability?: CompanionAbility } {
  const bondEffects = getBondEffects(companion.bond.level)

  // Check for betrayal
  if (bondEffects.betrayalChance > 0 && Math.random() < bondEffects.betrayalChance) {
    return { action: "betray" }
  }

  // Check for flee (cowardly companions)
  if (companion.combatBehavior.fleeThreshold) {
    const hpPercent = companion.stats.health / companion.stats.maxHealth
    if (hpPercent * 100 <= companion.combatBehavior.fleeThreshold) {
      return { action: "flee" }
    }
  }

  // Find available ability
  const availableAbility = companion.abilities.find((a) => a.currentCooldown === 0)

  // Behavior-based action selection
  switch (companion.combatBehavior.style) {
    case "support":
      // Heal player if they're low
      if (player.stats.health < player.stats.maxHealth * 0.5 && availableAbility?.effect.type === "heal") {
        return { action: "ability", ability: availableAbility }
      }
      break

    case "aggressive":
      // Always use damage abilities
      if (availableAbility?.effect.type === "damage") {
        return { action: "ability", ability: availableAbility }
      }
      break

    case "defensive":
      // Protect when player is low
      if (player.stats.health < player.stats.maxHealth * 0.3) {
        return { action: "defend" }
      }
      break

    case "tactical":
      // Use debuffs first, then damage
      const debuffAbility = companion.abilities.find((a) => a.currentCooldown === 0 && a.effect.type === "debuff")
      if (debuffAbility) {
        return { action: "ability", ability: debuffAbility }
      }
      break

    case "chaotic":
      // Random action
      const roll = Math.random()
      if (roll < 0.4 && availableAbility) {
        return { action: "ability", ability: availableAbility }
      } else if (roll < 0.8) {
        return { action: "attack" }
      }
      return { action: "defend" }
  }

  // Default to basic attack
  return { action: "attack" }
}

export function processCompanionCooldowns(companion: Companion): Companion {
  return {
    ...companion,
    abilities: companion.abilities.map((a) => ({
      ...a,
      currentCooldown: Math.max(0, a.currentCooldown - 1),
    })),
  }
}

export function useCompanionAbility(companion: Companion, abilityId: string): Companion {
  return {
    ...companion,
    abilities: companion.abilities.map((a) => (a.id === abilityId ? { ...a, currentCooldown: a.cooldown } : a)),
  }
}

// ============================================================================
// TAMING / RECRUITMENT
// ============================================================================

export function canTameEnemy(enemy: Combatant, player: Player): { canTame: boolean; chance: number; reason?: string } {
  // Must be below 25% HP
  const hpPercent = enemy.health / enemy.maxHealth
  if (hpPercent > 0.25) {
    return { canTame: false, chance: 0, reason: "Enemy is too healthy to tame" }
  }

  // Base chance
  let chance = 0.3

  // Ranger bonus
  if (player.class === "ranger") {
    chance += 0.25
  }

  // Level difference penalty - use actual enemy level
  const levelDiff = enemy.level - player.stats.level
  if (levelDiff > 0) {
    chance -= levelDiff * 0.1 // -10% per level above player
  }

  chance = Math.max(0.05, Math.min(0.9, chance))

  return { canTame: true, chance }
}

export function canRescueNPC(npc: NPC): boolean {
  return npc.role === "trapped" && npc.disposition > 0
}

// ============================================================================
// FALLBACK GENERATION (when AI is unavailable)
// ============================================================================

export function createBasicCompanionFromEnemy(enemy: Combatant, method: string): Companion {
  return {
    id: generateEntityId("companion"),
    entityType: "companion",
    name: enemy.name,
    description: enemy.description || `A tamed ${enemy.name}`,
    origin: method,
    species: enemy.name.toLowerCase(),
    personality: ["tamed", "wary"],
    stats: {
      health: Math.floor(enemy.maxHealth * 0.8),
      maxHealth: Math.floor(enemy.maxHealth * 0.8),
      attack: Math.floor(enemy.attack * 0.9),
      defense: Math.floor(enemy.defense * 0.9),
      speed: 5,
      level: enemy.level, // Inherit level from enemy
    },
    abilities: [
      {
        id: `${enemy.id}_basic`,
        name: "Basic Attack",
        description: "A simple attack",
        cooldown: 0,
        currentCooldown: 0,
        effect: {
          type: "damage",
          target: "enemy",
          value: Math.floor(enemy.attack * 0.8),
        },
        narration: `${enemy.name} strikes!`,
      },
    ],
    combatBehavior: {
      style: "aggressive",
      priority: "attack nearest enemy",
    },
    bond: {
      level: 30,
      mood: "cautious",
      memory: [`Was tamed by the player`],
    },
    appearance: enemy.description || `A battle-scarred ${enemy.name}`,
    quirk: "Still adjusting to its new role",
    alive: true,
    inParty: false,
    turnsWithPlayer: 0,
    flags: [],
  }
}

export function createBasicCompanionFromNPC(npc: NPC, playerLevel = 1): Companion {
  const roleStats = {
    merchant: { health: 20, attack: 3, defense: 2, style: "passive" as const },
    quest_giver: { health: 25, attack: 5, defense: 3, style: "support" as const },
    trapped: { health: 30, attack: 6, defense: 4, style: "defensive" as const },
    mysterious: { health: 25, attack: 7, defense: 3, style: "tactical" as const },
    hostile_neutral: { health: 35, attack: 8, defense: 5, style: "aggressive" as const },
  }

  const stats = roleStats[npc.role] || roleStats.trapped

  // Rescued NPCs are player level - 1 (minimum 1)
  const level = Math.max(1, playerLevel - 1)

  return {
    id: generateEntityId("companion"),
    entityType: "companion",
    name: npc.name,
    description: npc.description || `A grateful survivor`,
    origin: "rescue",
    species: "human",
    personality: ["grateful", "determined"],
    stats: {
      health: stats.health,
      maxHealth: stats.health,
      attack: stats.attack,
      defense: stats.defense,
      speed: 5,
      level,
    },
    abilities: [
      {
        id: `${npc.id}_help`,
        name: "Assist",
        description: "Helps in combat",
        cooldown: 2,
        currentCooldown: 0,
        effect: {
          type: "damage",
          target: "enemy",
          value: stats.attack,
        },
        narration: `${npc.name} joins the fight!`,
      },
    ],
    combatBehavior: {
      style: stats.style,
      priority: "support the player",
    },
    bond: {
      level: 60,
      mood: "grateful",
      memory: [`Was rescued from the dungeon`],
    },
    appearance: npc.description || "A weary but determined adventurer",
    quirk: npc.personality || "Owes their life to you",
    alive: true,
    inParty: false,
    turnsWithPlayer: 0,
    flags: [],
  }
}

// ============================================================================
// COMPANION ENTITY COLORS
// ============================================================================

export function getCompanionColor(companion: Companion): string {
  const bondTier = getBondTier(companion.bond.level)

  // Bond-based coloring
  switch (bondTier) {
    case "hostile":
      return "text-red-500"
    case "wary":
      return "text-orange-400"
    case "neutral":
      return "text-zinc-400"
    case "friendly":
      return "text-emerald-400"
    case "loyal":
      return "text-cyan-400"
    case "soulbound":
      return "text-violet-400"
  }
}
