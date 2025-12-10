import type {
  GameEvent,
  GameEventType,
  GameEntity,
  EventOutcome,
  EventResult,
  GameState,
  Player,
  LogEntry,
  Enemy,
  Companion,
  StatusEffect,
} from "@/lib/core/game-types"
import { generateEntityId } from "@/lib/entity/entity-system"
import type React from "react"
import {
  type DMOperation,
  type DMOperationRequest,
  type EntityLink,
  type EntityLinkType,
  type ActiveRuleModifier,
  type RuleModifierKey,
  type EntityMutation,
  type EntityComposition,
  ENTITY_TRANSFORMATION_MATRIX,
  RULE_MODIFIERS,
  MUTATION_EFFECTS,
  isValidTransformation,
  isValidLinkForEntities,
  canMergeEntities,
} from "@/lib/mechanics/game-mechanics-ledger"

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

// =============================================================================
// ENTITY LINK MANAGER
// Manages active mechanical bonds between entities
// =============================================================================

export class EntityLinkManager {
  private links: Map<string, EntityLink> = new Map()

  createLink(
    linkType: EntityLinkType,
    sourceId: string,
    targetId: string,
    options: Partial<Omit<EntityLink, "id" | "linkType" | "sourceId" | "targetId">> = {}
  ): EntityLink {
    const link: EntityLink = {
      id: generateEntityId("link"),
      linkType,
      sourceId,
      targetId,
      bidirectional: options.bidirectional ?? false,
      strength: options.strength ?? 100,
      condition: options.condition,
      effect: options.effect,
      narrativeHook: options.narrativeHook,
      createdBy: options.createdBy ?? "unknown",
      permanent: options.permanent ?? false,
      breakCondition: options.breakCondition,
    }
    this.links.set(link.id, link)
    return link
  }

  breakLink(linkId: string): boolean {
    return this.links.delete(linkId)
  }

  getLinksForEntity(entityId: string): EntityLink[] {
    return Array.from(this.links.values()).filter(
      (link) => link.sourceId === entityId || (link.bidirectional && link.targetId === entityId)
    )
  }

  getLinksOfType(linkType: EntityLinkType): EntityLink[] {
    return Array.from(this.links.values()).filter((link) => link.linkType === linkType)
  }

  getLinkBetween(entityA: string, entityB: string): EntityLink | undefined {
    return Array.from(this.links.values()).find(
      (link) =>
        (link.sourceId === entityA && link.targetId === entityB) ||
        (link.bidirectional && link.sourceId === entityB && link.targetId === entityA)
    )
  }

  // Process link effects when source entity dies
  processDeathTriggers(deadEntityId: string): { affectedEntities: string[]; effects: string[] } {
    const affectedEntities: string[] = []
    const effects: string[] = []

    for (const link of this.links.values()) {
      if (link.sourceId === deadEntityId) {
        // Source died - check for death triggers on target
        if (link.linkType === "soul_bound") {
          affectedEntities.push(link.targetId)
          effects.push(`Soul-bound entity ${link.targetId} perishes`)
        } else if (link.linkType === "death_trigger" && link.effect?.onSourceDeath) {
          affectedEntities.push(link.targetId)
          effects.push(link.effect.onSourceDeath)
        } else if (link.linkType === "power_source") {
          affectedEntities.push(link.targetId)
          effects.push(`${link.targetId} loses its power source`)
        }
      }

      if (link.targetId === deadEntityId && link.effect?.onTargetDeath) {
        affectedEntities.push(link.sourceId)
        effects.push(link.effect.onTargetDeath)
      }
    }

    return { affectedEntities, effects }
  }

  // Process damage sharing
  processDamageShare(entityId: string, damage: number): { sharedWith: string; sharedDamage: number }[] {
    const shares: { sharedWith: string; sharedDamage: number }[] = []

    for (const link of this.links.values()) {
      if (link.linkType === "damage_share" && link.sourceId === entityId) {
        const shareRatio = link.effect?.damageShare ?? 0.5
        shares.push({
          sharedWith: link.targetId,
          sharedDamage: Math.floor(damage * shareRatio),
        })
      }
      if (link.linkType === "life_linked" && (link.sourceId === entityId || link.targetId === entityId)) {
        const other = link.sourceId === entityId ? link.targetId : link.sourceId
        shares.push({
          sharedWith: other,
          sharedDamage: Math.floor(damage * (link.strength / 100)),
        })
      }
    }

    return shares
  }

  getAllLinks(): EntityLink[] {
    return Array.from(this.links.values())
  }

  clear(): void {
    this.links.clear()
  }

  serialize(): EntityLink[] {
    return Array.from(this.links.values())
  }

  deserialize(links: EntityLink[]): void {
    this.links.clear()
    for (const link of links) {
      this.links.set(link.id, link)
    }
  }
}

// =============================================================================
// RULE MODIFIER MANAGER
// Manages active TCG-style rule modifiers on entities
// =============================================================================

export class RuleModifierManager {
  private modifiers: Map<string, ActiveRuleModifier[]> = new Map() // entityId -> modifiers

  grantModifier(
    entityId: string,
    key: RuleModifierKey,
    source: string,
    sourceType: ActiveRuleModifier["sourceType"],
    duration: ActiveRuleModifier["duration"],
    options: Partial<Pick<ActiveRuleModifier, "usesRemaining" | "conditions" | "narrativeHook">> = {}
  ): ActiveRuleModifier {
    const modifier: ActiveRuleModifier = {
      key,
      source,
      sourceType,
      duration,
      usesRemaining: options.usesRemaining,
      conditions: options.conditions,
      narrativeHook: options.narrativeHook,
    }

    const existing = this.modifiers.get(entityId) ?? []
    existing.push(modifier)
    this.modifiers.set(entityId, existing)

    return modifier
  }

  revokeModifier(entityId: string, key: RuleModifierKey): boolean {
    const existing = this.modifiers.get(entityId)
    if (!existing) return false

    const index = existing.findIndex((m) => m.key === key)
    if (index === -1) return false

    existing.splice(index, 1)
    return true
  }

  revokeAllFromSource(entityId: string, source: string): number {
    const existing = this.modifiers.get(entityId)
    if (!existing) return 0

    const before = existing.length
    const filtered = existing.filter((m) => m.source !== source)
    this.modifiers.set(entityId, filtered)
    return before - filtered.length
  }

  getModifiersForEntity(entityId: string): ActiveRuleModifier[] {
    return this.modifiers.get(entityId) ?? []
  }

  hasModifier(entityId: string, key: RuleModifierKey): boolean {
    const mods = this.modifiers.get(entityId)
    return mods?.some((m) => m.key === key) ?? false
  }

  getModifierEffect(entityId: string, key: RuleModifierKey): typeof RULE_MODIFIERS[RuleModifierKey] | undefined {
    if (this.hasModifier(entityId, key)) {
      return RULE_MODIFIERS[key]
    }
    return undefined
  }

  // Check if entity has any modifier that grants a specific effect
  hasEffect(entityId: string, effectKey: string): boolean {
    const mods = this.modifiers.get(entityId) ?? []
    return mods.some((m) => {
      const def = RULE_MODIFIERS[m.key]
      return effectKey in def.effect
    })
  }

  // Decrement turn-based durations, remove expired
  processTurnEnd(entityId: string): RuleModifierKey[] {
    const expired: RuleModifierKey[] = []
    const mods = this.modifiers.get(entityId)
    if (!mods) return expired

    const remaining = mods.filter((m) => {
      if (typeof m.duration === "number") {
        m.duration--
        if (m.duration <= 0) {
          expired.push(m.key)
          return false
        }
      }
      return true
    })

    this.modifiers.set(entityId, remaining)
    return expired
  }

  // Remove combat-only modifiers
  processCombatEnd(entityId: string): RuleModifierKey[] {
    const expired: RuleModifierKey[] = []
    const mods = this.modifiers.get(entityId)
    if (!mods) return expired

    const remaining = mods.filter((m) => {
      if (m.duration === "combat") {
        expired.push(m.key)
        return false
      }
      return true
    })

    this.modifiers.set(entityId, remaining)
    return expired
  }

  // Use a limited-use modifier
  useModifier(entityId: string, key: RuleModifierKey): boolean {
    const mods = this.modifiers.get(entityId)
    const mod = mods?.find((m) => m.key === key)
    if (!mod || mod.usesRemaining === undefined) return false

    mod.usesRemaining--
    if (mod.usesRemaining <= 0) {
      this.revokeModifier(entityId, key)
    }
    return true
  }

  clear(): void {
    this.modifiers.clear()
  }

  serialize(): Record<string, ActiveRuleModifier[]> {
    return Object.fromEntries(this.modifiers)
  }

  deserialize(data: Record<string, ActiveRuleModifier[]>): void {
    this.modifiers = new Map(Object.entries(data))
  }
}

// =============================================================================
// DM OPERATION EXECUTOR
// Executes DM operations and produces game state changes
// =============================================================================

export interface DMOperationResult {
  success: boolean
  error?: string
  outcome?: EventOutcome
  narrative?: string
  entitiesAffected: string[]
  linksCreated?: EntityLink[]
  linksRemoved?: string[]
  modifiersGranted?: { entityId: string; modifier: ActiveRuleModifier }[]
  modifiersRevoked?: { entityId: string; key: RuleModifierKey }[]
  entitiesTransformed?: { entityId: string; fromType: string; toType: string }[]
  entitiesSpawned?: GameEntity[]
  entitiesRemoved?: string[]
}

export class DMOperationExecutor {
  constructor(
    private linkManager: EntityLinkManager,
    private ruleManager: RuleModifierManager
  ) {}

  execute(request: DMOperationRequest, state: GameState): DMOperationResult {
    const result: DMOperationResult = {
      success: false,
      entitiesAffected: [],
    }

    try {
      switch (request.operation) {
        case "transform_entity":
          return this.executeTransformEntity(request, state)
        case "create_link":
          return this.executeCreateLink(request, state)
        case "break_link":
          return this.executeBreakLink(request, state)
        case "grant_rule_modifier":
          return this.executeGrantRuleModifier(request, state)
        case "revoke_rule_modifier":
          return this.executeRevokeRuleModifier(request, state)
        case "spawn_entity":
          return this.executeSpawnEntity(request, state)
        case "banish_entity":
          return this.executeBanishEntity(request, state)
        case "merge_entities":
          return this.executeMergeEntities(request, state)
        case "evolve_entity":
          return this.executeEvolveEntity(request, state)
        case "corrupt_entity":
          return this.executeCorruptEntity(request, state)
        case "purify_entity":
          return this.executePurifyEntity(request, state)
        default:
          return {
            success: false,
            error: `Unknown operation: ${request.operation}`,
            entitiesAffected: [],
          }
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error"
      return result
    }
  }

  private executeTransformEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const toType = request.parameters.toType as string

    // Find entity in room entities or current enemy
    const entity = this.findEntity(targetId, state)
    if (!entity) {
      return { success: false, error: `Entity ${targetId} not found`, entitiesAffected: [] }
    }

    const fromType = entity.entityType
    if (!isValidTransformation(fromType, toType)) {
      return {
        success: false,
        error: `Cannot transform ${fromType} to ${toType}`,
        entitiesAffected: [],
      }
    }

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [targetId],
      entitiesTransformed: [{ entityId: targetId, fromType, toType }],
    }
  }

  private executeCreateLink(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [sourceId, targetId] = request.targets
    const linkType = request.parameters.linkType as EntityLinkType

    const source = this.findEntity(sourceId, state)
    const target = this.findEntity(targetId, state)

    if (!source || !target) {
      return { success: false, error: "Source or target entity not found", entitiesAffected: [] }
    }

    if (!isValidLinkForEntities(linkType, source.entityType, target.entityType)) {
      return {
        success: false,
        error: `Invalid link type ${linkType} for ${source.entityType} -> ${target.entityType}`,
        entitiesAffected: [],
      }
    }

    const link = this.linkManager.createLink(linkType, sourceId, targetId, {
      strength: (request.parameters.strength as number) ?? 100,
      bidirectional: request.parameters.bidirectional as boolean,
      createdBy: request.source,
      narrativeHook: request.narrative,
      permanent: request.constraints?.reversible === false,
      effect: request.parameters.effect as EntityLink["effect"],
    })

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [sourceId, targetId],
      linksCreated: [link],
    }
  }

  private executeBreakLink(request: DMOperationRequest, state: GameState): DMOperationResult {
    const linkId = request.parameters.linkId as string

    if (this.linkManager.breakLink(linkId)) {
      return {
        success: true,
        narrative: request.narrative,
        entitiesAffected: request.targets,
        linksRemoved: [linkId],
      }
    }

    return { success: false, error: `Link ${linkId} not found`, entitiesAffected: [] }
  }

  private executeGrantRuleModifier(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const modifierKey = request.parameters.modifierKey as RuleModifierKey

    if (!RULE_MODIFIERS[modifierKey]) {
      return { success: false, error: `Unknown modifier: ${modifierKey}`, entitiesAffected: [] }
    }

    const duration = request.constraints?.duration ?? "combat"
    const modifier = this.ruleManager.grantModifier(
      targetId,
      modifierKey,
      request.source,
      (request.parameters.sourceType as ActiveRuleModifier["sourceType"]) ?? "event",
      duration as ActiveRuleModifier["duration"],
      { narrativeHook: request.narrative }
    )

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [targetId],
      modifiersGranted: [{ entityId: targetId, modifier }],
    }
  }

  private executeRevokeRuleModifier(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const modifierKey = request.parameters.modifierKey as RuleModifierKey

    if (this.ruleManager.revokeModifier(targetId, modifierKey)) {
      return {
        success: true,
        narrative: request.narrative,
        entitiesAffected: [targetId],
        modifiersRevoked: [{ entityId: targetId, key: modifierKey }],
      }
    }

    return { success: false, error: `Modifier ${modifierKey} not found on ${targetId}`, entitiesAffected: [] }
  }

  private executeSpawnEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const entityData = request.parameters.entity as GameEntity
    if (!entityData) {
      return { success: false, error: "No entity data provided", entitiesAffected: [] }
    }

    // Ensure entity has an ID
    if (!entityData.id) {
      entityData.id = generateEntityId(entityData.entityType)
    }

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [entityData.id],
      entitiesSpawned: [entityData],
    }
  }

  private executeBanishEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const entity = this.findEntity(targetId, state)

    if (!entity) {
      return { success: false, error: `Entity ${targetId} not found`, entitiesAffected: [] }
    }

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [targetId],
      entitiesRemoved: [targetId],
    }
  }

  private executeMergeEntities(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [baseId, ...mergeIds] = request.targets
    const base = this.findEntity(baseId, state)

    if (!base) {
      return { success: false, error: `Base entity ${baseId} not found`, entitiesAffected: [] }
    }

    for (const mergeId of mergeIds) {
      const mergeEntity = this.findEntity(mergeId, state)
      if (!mergeEntity) {
        return { success: false, error: `Merge entity ${mergeId} not found`, entitiesAffected: [] }
      }
      if (!canMergeEntities(base.entityType, mergeEntity.entityType)) {
        return {
          success: false,
          error: `Cannot merge ${base.entityType} with ${mergeEntity.entityType}`,
          entitiesAffected: [],
        }
      }
    }

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [baseId, ...mergeIds],
      entitiesRemoved: mergeIds,
      // The actual merge creates a transformed base entity
      entitiesTransformed: [{ entityId: baseId, fromType: base.entityType, toType: base.entityType }],
    }
  }

  private executeEvolveEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const entity = this.findEntity(targetId, state)

    if (!entity) {
      return { success: false, error: `Entity ${targetId} not found`, entitiesAffected: [] }
    }

    const evolution = request.parameters.evolution as { toType: string; mutations: EntityMutation[] }

    return {
      success: true,
      narrative: request.narrative,
      entitiesAffected: [targetId],
      entitiesTransformed: evolution?.toType
        ? [{ entityId: targetId, fromType: entity.entityType, toType: evolution.toType }]
        : undefined,
    }
  }

  private executeCorruptEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const entity = this.findEntity(targetId, state)

    if (!entity) {
      return { success: false, error: `Entity ${targetId} not found`, entitiesAffected: [] }
    }

    // Corruption applies the "corrupted" mutation effects
    const corruptionEffects = MUTATION_EFFECTS.corrupted

    return {
      success: true,
      narrative: request.narrative ?? `${entity.name} is corrupted by dark energy`,
      entitiesAffected: [targetId],
      outcome: {
        success: true,
        effectsApplied: [
          {
            id: generateEntityId("effect"),
            name: "Corruption",
            entityType: "curse",
            effectType: "debuff",
            duration: -1, // Permanent until purified
            modifiers: { attack: corruptionEffects.statMods.attack ?? 0 },
            description: corruptionEffects.description,
          } as StatusEffect,
        ],
        stateChanges: { [`${targetId}_corrupted`]: true },
      },
    }
  }

  private executePurifyEntity(request: DMOperationRequest, state: GameState): DMOperationResult {
    const [targetId] = request.targets
    const entity = this.findEntity(targetId, state)

    if (!entity) {
      return { success: false, error: `Entity ${targetId} not found`, entitiesAffected: [] }
    }

    return {
      success: true,
      narrative: request.narrative ?? `${entity.name} is cleansed of corruption`,
      entitiesAffected: [targetId],
      outcome: {
        success: true,
        effectsRemoved: ["Corruption"],
        stateChanges: { [`${targetId}_corrupted`]: false },
      },
    }
  }

  private findEntity(entityId: string, state: GameState): GameEntity | undefined {
    // Check player
    if (state.player.id === entityId) return state.player

    // Check current enemy
    if (state.currentEnemy?.id === entityId) return state.currentEnemy

    // Check current boss
    if (state.currentBoss?.id === entityId) return state.currentBoss

    // Check room entities
    const roomEntity = state.roomEntities.find((e) => e.id === entityId)
    if (roomEntity) return roomEntity

    // Check companions
    const companion = state.player.party?.active?.find((c) => c.id === entityId)
    if (companion) return companion

    // Check active NPC/Shrine/Trap
    if (state.activeNPC?.id === entityId) return state.activeNPC
    if (state.activeShrine?.id === entityId) return state.activeShrine
    if (state.activeTrap?.id === entityId) return state.activeTrap

    return undefined
  }
}

// =============================================================================
// DM CONTEXT - Extended event context with DM capabilities
// =============================================================================

export interface DMContext extends EventContext {
  linkManager: EntityLinkManager
  ruleManager: RuleModifierManager
  executor: DMOperationExecutor
  activeLinks: EntityLink[]
  activeModifiers: Record<string, ActiveRuleModifier[]>
}

export function buildDMContext(
  state: GameState,
  linkManager: EntityLinkManager,
  ruleManager: RuleModifierManager,
  executor: DMOperationExecutor
): DMContext {
  return {
    ...buildEventContext(state),
    linkManager,
    ruleManager,
    executor,
    activeLinks: linkManager.getAllLinks(),
    activeModifiers: ruleManager.serialize(),
  }
}

// =============================================================================
// GLOBAL DM INSTANCE (singleton for game session)
// =============================================================================

let dmLinkManager: EntityLinkManager | null = null
let dmRuleManager: RuleModifierManager | null = null
let dmExecutor: DMOperationExecutor | null = null

export function initializeDMSystem(): {
  linkManager: EntityLinkManager
  ruleManager: RuleModifierManager
  executor: DMOperationExecutor
} {
  dmLinkManager = new EntityLinkManager()
  dmRuleManager = new RuleModifierManager()
  dmExecutor = new DMOperationExecutor(dmLinkManager, dmRuleManager)

  return {
    linkManager: dmLinkManager,
    ruleManager: dmRuleManager,
    executor: dmExecutor,
  }
}

export function getDMSystem(): {
  linkManager: EntityLinkManager
  ruleManager: RuleModifierManager
  executor: DMOperationExecutor
} | null {
  if (!dmLinkManager || !dmRuleManager || !dmExecutor) return null
  return {
    linkManager: dmLinkManager,
    ruleManager: dmRuleManager,
    executor: dmExecutor,
  }
}

export function resetDMSystem(): void {
  dmLinkManager?.clear()
  dmRuleManager?.clear()
  dmLinkManager = null
  dmRuleManager = null
  dmExecutor = null
}
