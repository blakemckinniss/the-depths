import type React from "react"
// Save/Load system for full game state persistence

import { debugLog } from "@/lib/debug/debug"
import type {
  GameState,
  Player,
  DungeonCard,
  Enemy,
  Boss,
  NPC,
  Shrine,
  Trap,
  LogEntry,
  PathOption,
  EnvironmentalHazard,
  EnvironmentalEntity,
} from "@/lib/core/game-types"
import type {
  WorldState,
  WorldMemory,
  EntityRelationship,
  Faction,
  RoomState,
  DungeonMood,
  PlayerReputation,
  NarrativeThread,
  PendingConsequence,
  LoreEntry,
} from "@/lib/world/world-state"
import type { ChaosEvent } from "@/lib/world/chaos-system"

// Save file metadata
export interface SaveMetadata {
  id: string
  slotNumber: number
  playerName: string
  className: string
  level: number
  floor: number
  dungeon: string | null
  playtime: number // in seconds
  createdAt: number
  updatedAt: number
  version: string
  thumbnail?: string // base64 encoded preview
}

// Full save data structure
export interface SaveData {
  metadata: SaveMetadata
  gameState: SerializedGameState
  worldState: SerializedWorldState
  logs: SerializedLogEntry[]
  chaosEvents: ChaosEvent[]
  settings: GameSettings
}

// Serialized versions that can be JSON stringified
export interface SerializedGameState {
  player: Player
  currentRoom: number
  floor: number
  inCombat: boolean
  currentEnemy: Enemy | Boss | null
  gameStarted: boolean
  gameOver: boolean
  phase: string
  availableDungeons: DungeonCard[]
  currentDungeon: DungeonCard | null
  currentBoss: Boss | null
  activeNPC: NPC | null
  activeShrine: Shrine | null
  activeTrap: Trap | null
  eventHistory: Array<{ type: string; data: unknown }>
  roomEntities: Array<{ type: string; data: unknown }>
  turnCount: number
  currentHazard: EnvironmentalHazard | null
  pathOptions: PathOption[] | null
  combatRound: number
  runStats: {
    enemiesSlain: number
    goldEarned: number
    goldSpent: number
    damageDealt: number
    damageTaken: number
    itemsFound: number
    dungeonsCompleted: number
    floorsCleared: number
    survivalTime: number
    bossesDefeated: number
    abilitiesUsed: number
    potionsConsumed: number
    companionsRecruited: number
    companionsLost: number
  }
  roomEnvironmentalEntities: EnvironmentalEntity[]
  eventMemory: {
    history: Array<{ type: string; room: number; floor: number }>
    typeLastSeen: Array<[string, number]> // Map converted to array
    combatStreak: number
    roomsSinceReward: number
  }
}

export interface SerializedWorldState {
  memories: WorldMemory[]
  relationships: EntityRelationship[]
  factions: Faction[]
  roomStates: Array<[string, RoomState]> // Map converted to array
  dungeonMood: DungeonMood | null
  playerReputation: PlayerReputation
  activeNarrativeThreads: NarrativeThread[]
  pendingConsequences: PendingConsequence[]
  discoveredLore: LoreEntry[]
  killCount: Record<string, number>
  totalTurns: number
}

export interface SerializedLogEntry {
  id: string
  type: string
  timestamp: number
  textContent: string // React nodes converted to text
}

export interface GameSettings {
  autoSave: boolean
  autoSaveInterval: number // in turns
  narrativeSpeed: "instant" | "fast" | "normal" | "slow"
  showDamageNumbers: boolean
  compactMode: boolean
  soundEnabled: boolean
}

// Constants
const SAVE_VERSION = "1.0.0"
const STORAGE_KEY_PREFIX = "dungeon_crawler_save_"
const SETTINGS_KEY = "dungeon_crawler_settings"
const MAX_SAVE_SLOTS = 5
const AUTO_SAVE_SLOT = 0

// Default settings
export const defaultSettings: GameSettings = {
  autoSave: true,
  autoSaveInterval: 5,
  narrativeSpeed: "normal",
  showDamageNumbers: true,
  compactMode: false,
  soundEnabled: true,
}

// Save system manager
export class SaveSystem {
  private static instance: SaveSystem
  private settings: GameSettings
  private turnsSinceAutoSave = 0

  private constructor() {
    this.settings = this.loadSettings()
  }

  static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem()
    }
    return SaveSystem.instance
  }

  // Settings management
  loadSettings(): GameSettings {
    if (typeof window === "undefined") return defaultSettings

    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) }
      }
    } catch (e) {
      debugLog("Failed to load settings", e, { level: "error" })
    }
    return defaultSettings
  }

  saveSettings(settings: Partial<GameSettings>): GameSettings {
    this.settings = { ...this.settings, ...settings }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
      } catch (e) {
        debugLog("Failed to save settings", e, { level: "error" })
      }
    }

    return this.settings
  }

  getSettings(): GameSettings {
    return this.settings
  }

  // Save slot management
  getSaveSlots(): (SaveMetadata | null)[] {
    const slots: (SaveMetadata | null)[] = []

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      slots.push(this.getSaveMetadata(i))
    }

    return slots
  }

  getSaveMetadata(slot: number): SaveMetadata | null {
    if (typeof window === "undefined") return null

    try {
      const key = `${STORAGE_KEY_PREFIX}${slot}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const data: SaveData = JSON.parse(saved)
        return data.metadata
      }
    } catch (e) {
      debugLog(`Failed to load save metadata for slot ${slot}`, e, { level: "error" })
    }

    return null
  }

  // Core save functionality
  save(
    slot: number,
    gameState: GameState,
    worldState: WorldState,
    logs: LogEntry[],
    chaosEvents: ChaosEvent[] = [],
    playerName?: string,
  ): boolean {
    if (typeof window === "undefined") return false

    try {
      const serializedGame = this.serializeGameState(gameState)
      const serializedWorld = this.serializeWorldState(worldState)
      const serializedLogs = this.serializeLogs(logs)

      const existingMeta = this.getSaveMetadata(slot)
      const now = Date.now()

      const metadata: SaveMetadata = {
        id: existingMeta?.id || `save_${now}_${Math.random().toString(36).substr(2, 9)}`,
        slotNumber: slot,
        playerName: playerName || gameState.player?.name || "Adventurer",
        className: gameState.player?.className || "Unknown",
        level: gameState.player?.stats?.level || 1,
        floor: gameState.floor,
        dungeon: gameState.currentDungeon?.name || null,
        playtime: existingMeta ? existingMeta.playtime + Math.floor((now - existingMeta.updatedAt) / 1000) : 0,
        createdAt: existingMeta?.createdAt || now,
        updatedAt: now,
        version: SAVE_VERSION,
      }

      const saveData: SaveData = {
        metadata,
        gameState: serializedGame,
        worldState: serializedWorld,
        logs: serializedLogs,
        chaosEvents,
        settings: this.settings,
      }

      const key = `${STORAGE_KEY_PREFIX}${slot}`
      localStorage.setItem(key, JSON.stringify(saveData))

      return true
    } catch (e) {
      debugLog(`Failed to save game to slot ${slot}`, e, { level: "error" })
      return false
    }
  }

  // Quick save to auto-save slot
  autoSave(gameState: GameState, worldState: WorldState, logs: LogEntry[], chaosEvents: ChaosEvent[] = []): boolean {
    if (!this.settings.autoSave) return false

    this.turnsSinceAutoSave++

    if (this.turnsSinceAutoSave >= this.settings.autoSaveInterval) {
      this.turnsSinceAutoSave = 0
      return this.save(AUTO_SAVE_SLOT, gameState, worldState, logs, chaosEvents)
    }

    return false
  }

  // Force auto-save (for critical moments)
  forceAutoSave(
    gameState: GameState,
    worldState: WorldState,
    logs: LogEntry[],
    chaosEvents: ChaosEvent[] = [],
  ): boolean {
    this.turnsSinceAutoSave = 0
    return this.save(AUTO_SAVE_SLOT, gameState, worldState, logs, chaosEvents)
  }

  // Core load functionality
  load(slot: number): SaveData | null {
    if (typeof window === "undefined") return null

    try {
      const key = `${STORAGE_KEY_PREFIX}${slot}`
      const saved = localStorage.getItem(key)

      if (!saved) return null

      const data: SaveData = JSON.parse(saved)

      // Version migration if needed
      if (data.metadata.version !== SAVE_VERSION) {
        return this.migrateSaveData(data)
      }

      return data
    } catch (e) {
      debugLog(`Failed to load save from slot ${slot}`, e, { level: "error" })
      return null
    }
  }

  // Delete save
  deleteSave(slot: number): boolean {
    if (typeof window === "undefined") return false

    try {
      const key = `${STORAGE_KEY_PREFIX}${slot}`
      localStorage.removeItem(key)
      return true
    } catch (e) {
      debugLog(`Failed to delete save from slot ${slot}`, e, { level: "error" })
      return false
    }
  }

  // Check if any saves exist
  hasSaves(): boolean {
    return this.getSaveSlots().some((slot) => slot !== null)
  }

  // Serialization helpers
  private serializeGameState(state: GameState): SerializedGameState {
    return {
      player: state.player,
      currentRoom: state.currentRoom,
      floor: state.floor,
      inCombat: state.inCombat,
      currentEnemy: state.currentEnemy,
      gameStarted: state.gameStarted,
      gameOver: state.gameOver,
      phase: state.phase,
      availableDungeons: state.availableDungeons,
      currentDungeon: state.currentDungeon,
      currentBoss: state.currentBoss,
      activeNPC: state.activeNPC,
      activeShrine: state.activeShrine,
      activeTrap: state.activeTrap,
      eventHistory: state.eventHistory.map((e) => ({ type: e.type || "event", data: e })),
      roomEntities: state.roomEntities.map((e) => ({ type: e.entityType, data: e })),
      turnCount: state.turnCount,
      currentHazard: state.currentHazard,
      pathOptions: state.pathOptions,
      combatRound: state.combatRound,
      runStats: {
        enemiesSlain: state.runStats.enemiesSlain,
        goldEarned: state.runStats.goldEarned,
        goldSpent: state.runStats.goldSpent,
        damageDealt: state.runStats.damageDealt,
        damageTaken: state.runStats.damageTaken,
        itemsFound: state.runStats.itemsFound.length,
        dungeonsCompleted: state.runStats.dungeonsCompleted.length,
        floorsCleared: state.runStats.floorsCleared,
        survivalTime: state.runStats.survivalTime,
        bossesDefeated: state.runStats.bossesDefeated,
        abilitiesUsed: state.runStats.abilitiesUsed,
        potionsConsumed: state.runStats.potionsConsumed,
        companionsRecruited: state.runStats.companionsRecruited,
        companionsLost: state.runStats.companionsLost.length,
      },
      roomEnvironmentalEntities: state.roomEnvironmentalEntities,
      eventMemory: {
        history: state.eventMemory.history,
        typeLastSeen: Array.from(state.eventMemory.typeLastSeen.entries()),
        combatStreak: state.eventMemory.combatStreak,
        roomsSinceReward: state.eventMemory.roomsSinceReward,
      },
    }
  }

  private serializeWorldState(state: WorldState): SerializedWorldState {
    return {
      memories: state.memories,
      relationships: state.relationships,
      factions: state.factions,
      roomStates: Array.from(state.roomStates.entries()),
      dungeonMood: state.dungeonMood,
      playerReputation: state.playerReputation,
      activeNarrativeThreads: state.activeNarrativeThreads,
      pendingConsequences: state.pendingConsequences,
      discoveredLore: state.discoveredLore,
      killCount: state.killCount,
      totalTurns: state.totalTurns,
    }
  }

  private serializeLogs(logs: LogEntry[]): SerializedLogEntry[] {
    // Only keep last 100 logs to save space
    return logs.slice(-100).map((log) => ({
      id: log.id,
      type: log.type,
      timestamp: log.timestamp,
      textContent: this.extractTextFromReactNode(log.content),
    }))
  }

  private extractTextFromReactNode(node: React.ReactNode): string {
    if (typeof node === "string") return node
    if (typeof node === "number") return String(node)
    if (!node) return ""

    // For React elements, try to extract text content
    if (typeof node === "object" && "props" in node) {
      const props = node.props as { children?: React.ReactNode }
      if (props.children) {
        if (Array.isArray(props.children)) {
          return props.children.map((c) => this.extractTextFromReactNode(c)).join("")
        }
        return this.extractTextFromReactNode(props.children)
      }
    }

    return "[Complex content]"
  }

  // Deserialization helpers
  deserializeWorldState(serialized: SerializedWorldState): WorldState {
    return {
      ...serialized,
      roomStates: new Map(serialized.roomStates),
    }
  }

  deserializeGameState(serialized: SerializedGameState): GameState {
    return {
      ...serialized,
      phase: serialized.phase as GameState["phase"],
      eventHistory: serialized.eventHistory as unknown as GameState["eventHistory"],
      roomEntities: serialized.roomEntities as unknown as GameState["roomEntities"],
      runStats: {
        ...serialized.runStats,
        itemsFound: [], // Items are not fully serialized
        dungeonsCompleted: [], // Dungeons are not fully serialized
        companionsLost: [], // Companions are not fully serialized
        causeOfDeath: "", // Reset on load
      },
      eventMemory: {
        history: serialized.eventMemory?.history || [],
        typeLastSeen: new Map(serialized.eventMemory?.typeLastSeen || []),
        combatStreak: serialized.eventMemory?.combatStreak || 0,
        roomsSinceReward: serialized.eventMemory?.roomsSinceReward || 0,
      },
      activeVault: null, // Vaults are not persisted across saves
    } as GameState
  }

  // Version migration
  private migrateSaveData(data: SaveData): SaveData {
    // Add migration logic here for future versions
    debugLog(`Migrating save from version ${data.metadata.version} to ${SAVE_VERSION}`, null, { level: "info" })

    // Update version
    data.metadata.version = SAVE_VERSION

    return data
  }

  // Export/Import for backup
  exportSave(slot: number): string | null {
    const data = this.load(slot)
    if (!data) return null

    return btoa(JSON.stringify(data))
  }

  importSave(slot: number, encodedData: string): boolean {
    try {
      const data: SaveData = JSON.parse(atob(encodedData))

      // Validate basic structure
      if (!data.metadata || !data.gameState || !data.worldState) {
        throw new Error("Invalid save data structure")
      }

      // Update slot number
      data.metadata.slotNumber = slot
      data.metadata.updatedAt = Date.now()

      const key = `${STORAGE_KEY_PREFIX}${slot}`
      localStorage.setItem(key, JSON.stringify(data))

      return true
    } catch (e) {
      debugLog("Failed to import save", e, { level: "error" })
      return false
    }
  }

  // Get total storage used
  getStorageUsage(): { used: number; total: number; percentage: number } {
    if (typeof window === "undefined") return { used: 0, total: 0, percentage: 0 }

    let used = 0

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const key = `${STORAGE_KEY_PREFIX}${i}`
      const data = localStorage.getItem(key)
      if (data) {
        used += data.length * 2 // UTF-16 characters are 2 bytes
      }
    }

    // localStorage typically has 5-10MB limit
    const total = 5 * 1024 * 1024

    return {
      used,
      total,
      percentage: (used / total) * 100,
    }
  }
}

// React hook for save system
export function useSaveSystem() {
  const saveSystem = SaveSystem.getInstance()

  return {
    save: saveSystem.save.bind(saveSystem),
    load: saveSystem.load.bind(saveSystem),
    autoSave: saveSystem.autoSave.bind(saveSystem),
    forceAutoSave: saveSystem.forceAutoSave.bind(saveSystem),
    deleteSave: saveSystem.deleteSave.bind(saveSystem),
    getSaveSlots: saveSystem.getSaveSlots.bind(saveSystem),
    hasSaves: saveSystem.hasSaves.bind(saveSystem),
    exportSave: saveSystem.exportSave.bind(saveSystem),
    importSave: saveSystem.importSave.bind(saveSystem),
    getSettings: saveSystem.getSettings.bind(saveSystem),
    saveSettings: saveSystem.saveSettings.bind(saveSystem),
    deserializeWorldState: saveSystem.deserializeWorldState.bind(saveSystem),
    deserializeGameState: saveSystem.deserializeGameState.bind(saveSystem),
    getStorageUsage: saveSystem.getStorageUsage.bind(saveSystem),
  }
}

// Utility to format playtime
export function formatPlaytime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Utility to format save date
export function formatSaveDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
