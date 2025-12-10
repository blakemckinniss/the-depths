export interface WorldMemory {
  id: string
  type: MemoryType
  timestamp: number // game turn
  floor: number
  room: number
  importance: number // 1-10, affects recall priority
  decay: number // how fast this memory fades (0-1 per turn)
  tags: string[]
  content: MemoryContent
  consequences: string[] // IDs of events this memory triggered
}

export type MemoryType =
  | "kill"
  | "spare"
  | "theft"
  | "trade"
  | "discovery"
  | "conversation"
  | "betrayal"
  | "rescue"
  | "destruction"
  | "creation"
  | "oath"
  | "curse"
  | "blessing"
  | "death"
  | "resurrection"
  | "evolution"

export interface MemoryContent {
  subject: string // who/what is remembered
  action: string // what happened
  target?: string // who was affected
  outcome: string // how it resolved
  emotional?: "positive" | "negative" | "neutral" | "complex"
  witnessed?: string[] // who saw this happen
}

// Relationship tracking
export interface EntityRelationship {
  entityId: string
  entityName: string
  entityType: "enemy" | "npc" | "companion" | "faction"
  disposition: number // -100 to 100
  trust: number // 0 to 100
  fear: number // 0 to 100
  respect: number // 0 to 100
  history: RelationshipEvent[]
  flags: string[] // "enemy_of_my_enemy", "owes_debt", "sworn_vengeance", "romantic_interest"
  lastInteraction: number // turn number
}

export interface RelationshipEvent {
  turn: number
  action: string
  dispositionChange: number
  narration: string
}

// Faction system
export interface Faction {
  id: string
  name: string
  description: string
  disposition: number // -100 to 100
  influence: number // 0 to 100, affects encounter frequency
  allies: string[] // faction IDs
  enemies: string[] // faction IDs
  memberTypes: string[] // enemy types that belong to this faction
  territory: string[] // dungeon themes they dominate
  currentState: FactionState
}

export type FactionState = "thriving" | "expanding" | "stable" | "declining" | "at_war" | "scattered" | "destroyed"

// Room state persistence
export interface RoomState {
  roomId: string
  floor: number
  room: number
  dungeonId: string
  visited: boolean
  visitCount: number
  lastVisit: number
  entities: string[] // entity IDs present
  bloodStains: BloodStain[]
  corpses: Corpse[]
  spilledSubstances: SpilledSubstance[]
  structuralDamage: string[]
  activeEffects: RoomEffect[]
  playerActions: string[] // what player did here
  ambushPotential: number // 0-1, increases with corpses/blood
}

export interface BloodStain {
  source: string // who bled
  amount: "drops" | "pool" | "splatter" | "flood"
  age: number // turns since created
  attractsCreatures: string[] // creature types drawn to it
}

export interface Corpse {
  entityId: string
  name: string
  type: "enemy" | "npc" | "companion"
  causeOfDeath: string
  turnKilled: number
  lootable: boolean
  riseChance: number // chance to become undead
  decay: number // 0-1, 1 = fully decayed
}

export interface SpilledSubstance {
  name: string
  type: "potion" | "poison" | "oil" | "water" | "acid" | "blood" | "magical"
  effect?: string
  duration: number
  dangerous: boolean
}

export interface RoomEffect {
  id: string
  name: string
  description: string
  duration: number
  source: string
  affectsPlayer: boolean
  affectsEnemies: boolean
  modifier?: Partial<{ attack: number; defense: number; speed: number }>
}

// Dungeon mood system
export interface DungeonMood {
  dungeonId: string
  hostility: number // 0-100, affects enemy aggression
  awareness: number // 0-100, affects trap frequency and ambushes
  corruption: number // 0-100, affects curse/dark magic frequency
  activity: number // 0-100, affects random encounters
  modifiers: MoodModifier[]
}

export interface MoodModifier {
  source: string // what caused this modifier
  effect: Partial<DungeonMood>
  duration: number
  narration: string
}

// World state container
export interface WorldState {
  memories: WorldMemory[]
  relationships: EntityRelationship[]
  factions: Faction[]
  roomStates: Map<string, RoomState>
  dungeonMood: DungeonMood | null
  playerReputation: PlayerReputation
  activeNarrativeThreads: NarrativeThread[]
  pendingConsequences: PendingConsequence[]
  discoveredLore: LoreEntry[]
  killCount: Record<string, number> // enemy type -> count
  totalTurns: number
}

export interface PlayerReputation {
  titles: string[] // "Goblin Slayer", "Curse Bearer", "Merchant Friend"
  infamy: number // 0-100, criminal reputation
  heroism: number // 0-100, heroic reputation
  mysticism: number // 0-100, magical reputation
  wealth: number // perceived wealth level
  knownFor: string[] // specific deeds people remember
}

export interface NarrativeThread {
  id: string
  name: string
  description: string
  status: "active" | "dormant" | "resolved" | "failed"
  priority: number
  triggerConditions: string[]
  nextBeat?: string // what should happen next
  involvedEntities: string[]
  playerChoicesMade: string[]
}

export interface PendingConsequence {
  id: string
  sourceMemory: string // memory ID that triggered this
  triggerCondition: string // when this activates
  consequence: ConsequenceType
  countdown?: number // turns until trigger
  probability: number // 0-1
  narrationHint: string
}

export type ConsequenceType =
  | { type: "enemy_spawn"; enemyType: string; reason: string }
  | { type: "faction_change"; factionId: string; change: number }
  | { type: "npc_arrival"; npcRole: string; purpose: string }
  | { type: "item_delivery"; itemHint: string; fromWhom: string }
  | { type: "ambush"; scale: "small" | "medium" | "large" }
  | { type: "reward"; rewardType: string; fromWhom: string }
  | { type: "curse"; curseType: string; reason: string }
  | { type: "blessing"; blessingType: string; reason: string }
  | { type: "story_beat"; threadId: string; beat: string }

export interface LoreEntry {
  id: string
  category: "enemy" | "location" | "item" | "faction" | "history" | "magic"
  title: string
  content: string
  discoveredAt: { floor: number; room: number; turn: number }
  relatedEntities: string[]
}

// World state manager
export class WorldStateManager {
  private state: WorldState

  constructor(initialState?: Partial<WorldState>) {
    this.state = {
      memories: [],
      relationships: [],
      factions: this.initializeFactions(),
      roomStates: new Map(),
      dungeonMood: null,
      playerReputation: {
        titles: [],
        infamy: 0,
        heroism: 0,
        mysticism: 0,
        wealth: 0,
        knownFor: [],
      },
      activeNarrativeThreads: [],
      pendingConsequences: [],
      discoveredLore: [],
      killCount: {},
      totalTurns: 0,
      ...initialState,
    }
  }

  private initializeFactions(): Faction[] {
    return [
      {
        id: "goblin_horde",
        name: "The Goblin Horde",
        description: "Scattered tribes of goblins fighting for territory",
        disposition: -30,
        influence: 60,
        allies: [],
        enemies: ["undead_legion", "holy_order"],
        memberTypes: ["goblin", "hobgoblin", "bugbear"],
        territory: ["caves", "ruins"],
        currentState: "stable",
      },
      {
        id: "undead_legion",
        name: "The Risen",
        description: "Mindless undead controlled by dark forces",
        disposition: -80,
        influence: 40,
        allies: ["cult_of_shadow"],
        enemies: ["goblin_horde", "holy_order"],
        memberTypes: ["skeleton", "zombie", "wraith", "ghoul"],
        territory: ["crypt", "tomb", "graveyard"],
        currentState: "expanding",
      },
      {
        id: "merchant_guild",
        name: "The Golden Compass",
        description: "Network of dungeon merchants and traders",
        disposition: 20,
        influence: 30,
        allies: [],
        enemies: [],
        memberTypes: ["merchant", "trader"],
        territory: [],
        currentState: "thriving",
      },
      {
        id: "cult_of_shadow",
        name: "Cult of the Void",
        description: "Worshippers of dark entities from beyond",
        disposition: -60,
        influence: 25,
        allies: ["undead_legion"],
        enemies: ["holy_order"],
        memberTypes: ["cultist", "dark_priest", "void_touched"],
        territory: ["temple", "void"],
        currentState: "stable",
      },
      {
        id: "holy_order",
        name: "Order of the Dawn",
        description: "Paladins and clerics fighting darkness",
        disposition: 30,
        influence: 20,
        allies: [],
        enemies: ["undead_legion", "cult_of_shadow"],
        memberTypes: ["paladin", "cleric", "templar"],
        territory: ["temple", "sanctum"],
        currentState: "declining",
      },
    ]
  }

  // Memory management
  recordMemory(memory: Omit<WorldMemory, "id" | "timestamp">): WorldMemory {
    const newMemory: WorldMemory = {
      ...memory,
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: this.state.totalTurns,
    }
    this.state.memories.push(newMemory)

    // Check for consequence triggers
    this.checkConsequenceTriggers(newMemory)

    return newMemory
  }

  recallMemories(filter: Partial<WorldMemory>, limit = 10): WorldMemory[] {
    return this.state.memories
      .filter((m) => {
        if (filter.type && m.type !== filter.type) return false
        if (filter.tags && !filter.tags.some((t) => m.tags.includes(t))) return false
        return true
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit)
  }

  // Relationship management
  updateRelationship(
    entityId: string,
    entityName: string,
    entityType: EntityRelationship["entityType"],
    event: Omit<RelationshipEvent, "turn">,
  ): EntityRelationship {
    let relationship = this.state.relationships.find((r) => r.entityId === entityId)

    if (!relationship) {
      relationship = {
        entityId,
        entityName,
        entityType,
        disposition: 0,
        trust: 50,
        fear: 0,
        respect: 0,
        history: [],
        flags: [],
        lastInteraction: this.state.totalTurns,
      }
      this.state.relationships.push(relationship)
    }

    relationship.disposition = Math.max(-100, Math.min(100, relationship.disposition + event.dispositionChange))
    relationship.history.push({ ...event, turn: this.state.totalTurns })
    relationship.lastInteraction = this.state.totalTurns

    return relationship
  }

  // Faction management
  updateFaction(factionId: string, dispositionChange: number, reason: string): Faction | undefined {
    const faction = this.state.factions.find((f) => f.id === factionId)
    if (!faction) return undefined

    faction.disposition = Math.max(-100, Math.min(100, faction.disposition + dispositionChange))

    // Record as memory
    this.recordMemory({
      type: dispositionChange > 0 ? "blessing" : "curse",
      floor: 0,
      room: 0,
      importance: Math.abs(dispositionChange) / 10,
      decay: 0.01,
      tags: ["faction", factionId],
      content: {
        subject: faction.name,
        action: reason,
        outcome: `Disposition changed by ${dispositionChange}`,
        emotional: dispositionChange > 0 ? "positive" : "negative",
      },
      consequences: [],
    })

    return faction
  }

  // Room state management
  getRoomState(dungeonId: string, floor: number, room: number): RoomState {
    const key = `${dungeonId}_${floor}_${room}`
    let state = this.state.roomStates.get(key)

    if (!state) {
      state = {
        roomId: key,
        floor,
        room,
        dungeonId,
        visited: false,
        visitCount: 0,
        lastVisit: 0,
        entities: [],
        bloodStains: [],
        corpses: [],
        spilledSubstances: [],
        structuralDamage: [],
        activeEffects: [],
        playerActions: [],
        ambushPotential: 0,
      }
      this.state.roomStates.set(key, state)
    }

    return state
  }

  updateRoomState(dungeonId: string, floor: number, room: number, updates: Partial<RoomState>): RoomState {
    const state = this.getRoomState(dungeonId, floor, room)
    Object.assign(state, updates)

    // Recalculate ambush potential
    state.ambushPotential = this.calculateAmbushPotential(state)

    return state
  }

  private calculateAmbushPotential(room: RoomState): number {
    let potential = 0
    potential += room.bloodStains.length * 0.1
    potential += room.corpses.filter((c) => c.decay < 0.5).length * 0.15
    potential += room.visitCount > 1 ? 0.1 : 0
    return Math.min(1, potential)
  }

  // Dungeon mood
  setDungeonMood(dungeonId: string, initialMood?: Partial<DungeonMood>): DungeonMood {
    this.state.dungeonMood = {
      dungeonId,
      hostility: 30,
      awareness: 20,
      corruption: 10,
      activity: 50,
      modifiers: [],
      ...initialMood,
    }
    return this.state.dungeonMood
  }

  modifyDungeonMood(modifier: MoodModifier): void {
    if (!this.state.dungeonMood) return

    this.state.dungeonMood.modifiers.push(modifier)

    // Apply modifier effects
    if (modifier.effect.hostility) {
      this.state.dungeonMood.hostility = Math.max(
        0,
        Math.min(100, this.state.dungeonMood.hostility + modifier.effect.hostility),
      )
    }
    if (modifier.effect.awareness) {
      this.state.dungeonMood.awareness = Math.max(
        0,
        Math.min(100, this.state.dungeonMood.awareness + modifier.effect.awareness),
      )
    }
    if (modifier.effect.corruption) {
      this.state.dungeonMood.corruption = Math.max(
        0,
        Math.min(100, this.state.dungeonMood.corruption + modifier.effect.corruption),
      )
    }
    if (modifier.effect.activity) {
      this.state.dungeonMood.activity = Math.max(
        0,
        Math.min(100, this.state.dungeonMood.activity + modifier.effect.activity),
      )
    }
  }

  // Consequence management
  addConsequence(consequence: Omit<PendingConsequence, "id">): PendingConsequence {
    const newConsequence: PendingConsequence = {
      ...consequence,
      id: `consequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    this.state.pendingConsequences.push(newConsequence)
    return newConsequence
  }

  private checkConsequenceTriggers(memory: WorldMemory): void {
    // Check if any pending consequences should trigger
    const triggered = this.state.pendingConsequences.filter((c) => {
      if (c.countdown !== undefined && c.countdown > 0) return false
      if (Math.random() > c.probability) return false

      // Check trigger condition matches memory
      if (c.triggerCondition.includes(memory.type)) return true
      if (memory.tags.some((t) => c.triggerCondition.includes(t))) return true

      return false
    })

    // Mark triggered consequences
    triggered.forEach((c) => {
      memory.consequences.push(c.id)
    })
  }

  processTurn(): { consequences: PendingConsequence[]; moodChanges: string[] } {
    this.state.totalTurns++

    const triggered: PendingConsequence[] = []
    const moodChanges: string[] = []

    // Decay memories
    this.state.memories = this.state.memories.filter((m) => {
      m.importance -= m.decay
      return m.importance > 0
    })

    // Process countdown consequences
    this.state.pendingConsequences = this.state.pendingConsequences.filter((c) => {
      if (c.countdown !== undefined) {
        c.countdown--
        if (c.countdown <= 0 && Math.random() <= c.probability) {
          triggered.push(c)
          return false
        }
      }
      return true
    })

    // Decay dungeon mood modifiers
    if (this.state.dungeonMood) {
      this.state.dungeonMood.modifiers = this.state.dungeonMood.modifiers.filter((m) => {
        m.duration--
        return m.duration > 0
      })
    }

    // Decay room effects
    this.state.roomStates.forEach((room) => {
      // Age blood stains
      room.bloodStains.forEach((b) => b.age++)

      // Decay corpses
      room.corpses.forEach((c) => {
        c.decay = Math.min(1, c.decay + 0.05)
      })

      // Remove old substances
      room.spilledSubstances = room.spilledSubstances.filter((s) => {
        s.duration--
        return s.duration > 0
      })
    })

    return { consequences: triggered, moodChanges }
  }

  // Reputation management
  addTitle(title: string): void {
    if (!this.state.playerReputation.titles.includes(title)) {
      this.state.playerReputation.titles.push(title)
    }
  }

  modifyReputation(type: "infamy" | "heroism" | "mysticism", amount: number, deed?: string): void {
    this.state.playerReputation[type] = Math.max(0, Math.min(100, this.state.playerReputation[type] + amount))

    if (deed && !this.state.playerReputation.knownFor.includes(deed)) {
      this.state.playerReputation.knownFor.push(deed)
    }
  }

  // Kill tracking for nemesis system
  recordKill(enemyType: string): number {
    this.state.killCount[enemyType] = (this.state.killCount[enemyType] || 0) + 1
    return this.state.killCount[enemyType]
  }

  // Get context for AI
  getAIContext(): WorldStateContext {
    return {
      recentMemories: this.recallMemories({}, 5),
      activeRelationships: this.state.relationships.filter((r) => Math.abs(r.disposition) > 30),
      factionStandings: this.state.factions.map((f) => ({
        name: f.name,
        disposition: f.disposition,
        state: f.currentState,
      })),
      dungeonMood: this.state.dungeonMood,
      reputation: this.state.playerReputation,
      killCounts: this.state.killCount,
      activeThreads: this.state.activeNarrativeThreads.filter((t) => t.status === "active"),
    }
  }

  getState(): WorldState {
    return this.state
  }
}

export interface WorldStateContext {
  recentMemories: WorldMemory[]
  activeRelationships: EntityRelationship[]
  factionStandings: { name: string; disposition: number; state: FactionState }[]
  dungeonMood: DungeonMood | null
  reputation: PlayerReputation
  killCounts: Record<string, number>
  activeThreads: NarrativeThread[]
}

// Factory for creating world state from game state
export function createWorldStateManager(): WorldStateManager {
  return new WorldStateManager()
}
