import type {
  GameEvent,
  GameEventType,
  GameEntity,
  EventOutcome,
  EventResult,
  GameState,
  Player,
  LogEntry,
} from "@/lib/core/game-types"
import { generateEntityId } from "@/lib/entity/entity-system"
import type React from "react"

// Event context that AI uses to generate content
export interface EventContext {
  player: Player
  floor: number
  room: number
  dungeonTheme?: string
  dungeonName?: string
  currentEntities: GameEntity[]
  recentEvents: GameEvent[]
  turnCount: number
}

// AI generation request structure
export interface AIEntityRequest {
  entityType: "enemy" | "item" | "npc" | "trap" | "shrine" | "companion" | "boss" | "effect" | "room" | "loot"
  context: EventContext
  constraints?: {
    rarity?: string
    theme?: string
    difficulty?: number
    role?: string
  }
}

// Event handler signature
export type EventHandler = (
  event: GameEvent,
  state: GameState,
  addLog: (content: React.ReactNode, type: LogEntry["type"]) => void,
) => Promise<EventResult>

// Event queue for processing
export class EventQueue {
  private queue: GameEvent[] = []
  private processing = false

  enqueue(event: GameEvent): void {
    this.queue.push(event)
  }

  dequeue(): GameEvent | undefined {
    return this.queue.shift()
  }

  isEmpty(): boolean {
    return this.queue.length === 0
  }

  peek(): GameEvent | undefined {
    return this.queue[0]
  }

  clear(): void {
    this.queue = []
  }

  get length(): number {
    return this.queue.length
  }
}

// Create an event with full context
export function createEvent(
  type: GameEventType,
  source: GameEntity | null,
  target: GameEntity | null,
  context: Record<string, unknown> = {},
): GameEvent {
  return {
    id: generateEntityId("evt"),
    type,
    timestamp: Date.now(),
    source,
    target,
    context,
  }
}

// Event outcome builder
export function createOutcome(partial: Partial<EventOutcome> = {}): EventOutcome {
  return {
    success: partial.success ?? true,
    damage: partial.damage,
    healing: partial.healing,
    goldChange: partial.goldChange,
    expChange: partial.expChange,
    itemsGained: partial.itemsGained ?? [],
    itemsLost: partial.itemsLost ?? [],
    effectsApplied: partial.effectsApplied ?? [],
    effectsRemoved: partial.effectsRemoved ?? [],
    stateChanges: partial.stateChanges ?? {},
  }
}

// Combine multiple outcomes
export function mergeOutcomes(...outcomes: EventOutcome[]): EventOutcome {
  const merged: EventOutcome = {
    success: outcomes.every((o) => o.success),
    damage: outcomes.reduce((sum, o) => sum + (o.damage ?? 0), 0) || undefined,
    healing: outcomes.reduce((sum, o) => sum + (o.healing ?? 0), 0) || undefined,
    goldChange: outcomes.reduce((sum, o) => sum + (o.goldChange ?? 0), 0) || undefined,
    expChange: outcomes.reduce((sum, o) => sum + (o.expChange ?? 0), 0) || undefined,
    itemsGained: outcomes.flatMap((o) => o.itemsGained ?? []),
    itemsLost: outcomes.flatMap((o) => o.itemsLost ?? []),
    effectsApplied: outcomes.flatMap((o) => o.effectsApplied ?? []),
    effectsRemoved: outcomes.flatMap((o) => o.effectsRemoved ?? []),
    stateChanges: outcomes.reduce((acc, o) => ({ ...acc, ...o.stateChanges }), {}),
  }
  return merged
}

// Apply outcome to player state
export function applyOutcomeToPlayer(player: Player, outcome: EventOutcome): Player {
  const updated = { ...player }

  // Apply damage/healing
  if (outcome.damage) {
    updated.stats = {
      ...updated.stats,
      health: Math.max(0, updated.stats.health - outcome.damage),
    }
  }
  if (outcome.healing) {
    updated.stats = {
      ...updated.stats,
      health: Math.min(updated.stats.maxHealth, updated.stats.health + outcome.healing),
    }
  }

  // Apply gold/exp
  if (outcome.goldChange) {
    updated.stats = {
      ...updated.stats,
      gold: Math.max(0, updated.stats.gold + outcome.goldChange),
    }
  }
  if (outcome.expChange) {
    updated.stats = {
      ...updated.stats,
      experience: updated.stats.experience + outcome.expChange,
    }
  }

  // Add items
  if (outcome.itemsGained && outcome.itemsGained.length > 0) {
    updated.inventory = [...updated.inventory, ...outcome.itemsGained]
  }

  // Remove items
  if (outcome.itemsLost && outcome.itemsLost.length > 0) {
    const lostIds = new Set(outcome.itemsLost.map((i) => i.id))
    updated.inventory = updated.inventory.filter((i) => !lostIds.has(i.id))
  }

  // Apply effects
  if (outcome.effectsApplied && outcome.effectsApplied.length > 0) {
    updated.activeEffects = [...updated.activeEffects, ...outcome.effectsApplied]
  }

  // Remove effects
  if (outcome.effectsRemoved && outcome.effectsRemoved.length > 0) {
    const removedIds = new Set(outcome.effectsRemoved)
    updated.activeEffects = updated.activeEffects.filter((e) => !removedIds.has(e.id))
  }

  return updated
}

// Calculate damage between entities
export function calculateCombatDamage(
  attacker: { attack: number },
  defender: { defense: number },
  bonusDamage = 0,
): { damage: number; isCritical: boolean } {
  const baseDamage = Math.max(1, attacker.attack - Math.floor(defender.defense * 0.5))
  const variance = Math.floor(Math.random() * 5) - 2
  const critRoll = Math.random()
  const isCritical = critRoll < 0.1
  const critMultiplier = isCritical ? 1.5 : 1
  const finalDamage = Math.max(1, Math.floor((baseDamage + variance + bonusDamage) * critMultiplier))

  return { damage: finalDamage, isCritical }
}

// Check for level up
export function checkLevelUp(player: Player): { player: Player; levelsGained: number } {
  const updated = { ...player }
  let levelsGained = 0

  while (updated.stats.experience >= updated.stats.experienceToLevel) {
    updated.stats.experience -= updated.stats.experienceToLevel
    updated.stats.level += 1
    updated.stats.maxHealth += 10
    updated.stats.health = updated.stats.maxHealth
    updated.stats.attack += 2
    updated.stats.defense += 1
    updated.stats.experienceToLevel = Math.floor(updated.stats.experienceToLevel * 1.5)
    levelsGained++
  }

  return { player: updated, levelsGained }
}

// Build event context for AI
export function buildEventContext(state: GameState): EventContext {
  return {
    player: state.player,
    floor: state.floor,
    room: state.currentRoom,
    dungeonTheme: state.currentDungeon?.theme,
    dungeonName: state.currentDungeon?.name,
    currentEntities: state.roomEntities,
    recentEvents: state.eventHistory.slice(-10),
    turnCount: state.turnCount,
  }
}

// Determine room event type with weighted probability
export function rollRoomEvent(
  floor: number,
  room: number,
  dungeonRarity: string,
): "enemy" | "treasure" | "trap" | "shrine" | "npc" | "empty" | "boss" {
  // Boss every 5 rooms starting floor 2
  if (room > 0 && room % 5 === 0 && floor >= 2) {
    return "boss"
  }

  // Weights adjusted by dungeon rarity
  const rarityMod = dungeonRarity === "legendary" ? 1.5 : dungeonRarity === "rare" ? 1.3 : 1
  const weights = {
    enemy: 32,
    treasure: 18 * rarityMod,
    trap: 12,
    shrine: 8,
    npc: 8,
    empty: 22 / rarityMod,
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total

  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight
    if (roll <= 0) {
      return type as "enemy" | "treasure" | "trap" | "shrine" | "npc" | "empty"
    }
  }

  return "empty"
}

// Entity relationship tracking for narrative callbacks
export interface EntityRelation {
  sourceId: string
  targetId: string
  relationType: "killed_by" | "traded_with" | "allied_with" | "cursed_by" | "blessed_by" | "fled_from"
  timestamp: number
  context?: string
}

export class EntityRelationTracker {
  private relations: EntityRelation[] = []

  addRelation(
    sourceId: string,
    targetId: string,
    relationType: EntityRelation["relationType"],
    context?: string,
  ): void {
    this.relations.push({
      sourceId,
      targetId,
      relationType,
      timestamp: Date.now(),
      context,
    })
  }

  getRelationsFor(entityId: string): EntityRelation[] {
    return this.relations.filter((r) => r.sourceId === entityId || r.targetId === entityId)
  }

  hasRelation(sourceId: string, targetId: string, relationType?: EntityRelation["relationType"]): boolean {
    return this.relations.some(
      (r) =>
        r.sourceId === sourceId &&
        r.targetId === targetId &&
        (relationType === undefined || r.relationType === relationType),
    )
  }

  getRecentRelations(count = 5): EntityRelation[] {
    return this.relations.slice(-count)
  }
}
