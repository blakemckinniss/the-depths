"use client"

import { useState, useCallback, type ReactNode, type Dispatch, type SetStateAction } from "react"
import type { GameState, Item, StatusEffect, DungeonKey } from "@/lib/game-types"
import type { WorldState } from "@/lib/world-state"
import type { ChaosEvent } from "@/lib/chaos-system"
import { generateEnemy, generateWeapon, generateArmor, generatePotion } from "@/lib/game-data"
import { BASE_ABILITIES } from "@/lib/ability-system"
import { createEnhancedEffect } from "@/lib/effect-system"
import { DevButton } from "./dev-button" // Declare the DevButton import

interface DevPanelProps {
  gameState: GameState
  setGameState: Dispatch<SetStateAction<GameState>>
  worldState: WorldState
  setWorldState: Dispatch<SetStateAction<WorldState>>
  chaosEvents: ChaosEvent[]
  setChaosEvents: Dispatch<SetStateAction<ChaosEvent[]>>
  logs: Array<{ id: string; content: ReactNode; timestamp: number }>
  addLog: (content: ReactNode) => void
  isOpen: boolean
  onClose: () => void
}

type DevTab = "player" | "items" | "enemies" | "effects" | "world" | "chaos" | "phase" | "ai" | "logs"

export function DevPanel({
  gameState,
  setGameState,
  worldState,
  setWorldState,
  chaosEvents,
  setChaosEvents,
  logs,
  addLog,
  isOpen,
  onClose,
}: DevPanelProps) {
  const [activeTab, setActiveTab] = useState<DevTab>("player")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [customCommand, setCustomCommand] = useState("")

  // Player stat modifiers
  const modifyStat = useCallback(
    (stat: string, value: number) => {
      setGameState((prev) => {
        const player = { ...prev.player }
        if (stat === "health") {
          player.stats = {
            ...player.stats,
            health: Math.max(0, Math.min(player.stats.maxHealth, player.stats.health + value)),
          }
        } else if (stat === "maxHealth") {
          player.stats = {
            ...player.stats,
            maxHealth: player.stats.maxHealth + value,
            health: Math.min(player.stats.health, player.stats.maxHealth + value),
          }
        } else if (stat === "gold") {
          player.stats = { ...player.stats, gold: Math.max(0, player.stats.gold + value) }
        } else if (stat === "exp") {
          player.stats = { ...player.stats, experience: Math.max(0, player.stats.experience + value) }
        } else if (stat === "level") {
          player.stats = { ...player.stats, level: Math.max(1, player.stats.level + value) }
        } else if (stat === "attack") {
          player.stats = { ...player.stats, attack: Math.max(1, player.stats.attack + value) }
        } else if (stat === "defense") {
          player.stats = { ...player.stats, defense: Math.max(0, player.stats.defense + value) }
        } else if (stat === "resource") {
          player.resources = {
            ...player.resources,
            current: Math.max(0, Math.min(player.resources.max, player.resources.current + value)),
          }
        }
        return { ...prev, player }
      })
      addLog(
        <span className="text-cyan-400">
          [DEV] Modified {stat} by {value > 0 ? "+" : ""}
          {value}
        </span>,
      )
      setCommandHistory((h) => [...h, `stat ${stat} ${value > 0 ? "+" : ""}${value}`])
    },
    [setGameState, addLog],
  )

  // Set stat to specific value (available for future use)
  const _setStat = useCallback(
    (stat: string, value: number) => {
      setGameState((prev) => {
        const player = { ...prev.player }
        if (stat === "health") {
          player.stats = { ...player.stats, health: Math.max(0, Math.min(player.stats.maxHealth, value)) }
        } else if (stat === "maxHealth") {
          player.stats = { ...player.stats, maxHealth: value }
        } else if (stat === "gold") {
          player.stats = { ...player.stats, gold: value }
        } else if (stat === "exp") {
          player.stats = { ...player.stats, experience: value }
        } else if (stat === "level") {
          player.stats = { ...player.stats, level: value }
        } else if (stat === "attack") {
          player.stats = { ...player.stats, attack: value }
        } else if (stat === "defense") {
          player.stats = { ...player.stats, defense: value }
        }
        return { ...prev, player }
      })
      addLog(
        <span className="text-cyan-400">
          [DEV] Set {stat} to {value}
        </span>,
      )
    },
    [setGameState, addLog],
  )

  // Add item to inventory
  const addItem = useCallback(
    (type: "weapon" | "armor" | "potion", rarity?: string) => {
      let item: Item
      if (type === "weapon") {
        item = generateWeapon(gameState.floor)
        if (rarity) item.rarity = rarity as Item["rarity"]
      } else if (type === "armor") {
        item = generateArmor(gameState.floor)
        if (rarity) item.rarity = rarity as Item["rarity"]
      } else {
        item = generatePotion()
      }

      setGameState((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          inventory: [...prev.player.inventory, item],
        },
      }))
      addLog(
        <span className="text-cyan-400">
          [DEV] Added {item.rarity} {item.name} to inventory
        </span>,
      )
      setCommandHistory((h) => [...h, `add ${type} ${rarity || ""}`])
    },
    [gameState.floor, setGameState, addLog],
  )

  // Spawn enemy
  const spawnEnemy = useCallback(
    (isBoss = false) => {
      const enemy = generateEnemy(gameState.floor, isBoss)
      setGameState((prev) => ({
        ...prev,
        currentEnemy: enemy,
        inCombat: true,
        phase: "combat",
      }))
      addLog(
        <span className="text-cyan-400">
          [DEV] Spawned {isBoss ? "boss" : "enemy"}: {enemy.name}
        </span>,
      )
      setCommandHistory((h) => [...h, `spawn ${isBoss ? "boss" : "enemy"}`])
    },
    [gameState.floor, setGameState, addLog],
  )

  // Kill current enemy
  const killEnemy = useCallback(() => {
    if (gameState.currentEnemy) {
      const enemy = gameState.currentEnemy
      setGameState((prev) => ({
        ...prev,
        currentEnemy: null,
        inCombat: false,
        phase: "exploring",
        player: {
          ...prev.player,
          stats: {
            ...prev.player.stats,
            experience: prev.player.stats.experience + enemy.expReward,
            gold: prev.player.stats.gold + enemy.goldReward,
          },
        },
      }))
      addLog(
        <span className="text-cyan-400">
          [DEV] Killed {enemy.name}, gained {enemy.expReward} XP and {enemy.goldReward} gold
        </span>,
      )
    }
  }, [gameState.currentEnemy, setGameState, addLog])

  // Add effect to player
  const addEffect = useCallback(
    (effectType: "buff" | "debuff", name: string, duration: number, modifiers: Record<string, number>) => {
      const effect = createEnhancedEffect({
        name,
        effectType,
        durationType: "turns",
        durationValue: duration,
        category: "stat_modifier",
        modifiers,
        sourceType: "ai_generated",
        powerLevel: 3,
        rarity: "uncommon",
      })

      setGameState((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          activeEffects: [...prev.player.activeEffects, effect as unknown as StatusEffect],
        },
      }))
      addLog(
        <span className="text-cyan-400">
          [DEV] Applied {effectType}: {name} for {duration} turns
        </span>,
      )
    },
    [setGameState, addLog],
  )

  // Clear all effects
  const clearEffects = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      player: {
        ...prev.player,
        activeEffects: [],
      },
    }))
    addLog(<span className="text-cyan-400">[DEV] Cleared all player effects</span>)
  }, [setGameState, addLog])

  // Change game phase
  const setPhase = useCallback(
    (phase: GameState["phase"]) => {
      setGameState((prev) => ({
        ...prev,
        phase,
        inCombat: phase === "combat",
      }))
      addLog(<span className="text-cyan-400">[DEV] Changed phase to: {phase}</span>)
    },
    [setGameState, addLog],
  )

  // Teleport to floor
  const teleportFloor = useCallback(
    (floor: number) => {
      setGameState((prev) => ({
        ...prev,
        floor,
        currentRoom: 0,
      }))
      addLog(<span className="text-cyan-400">[DEV] Teleported to floor {floor}</span>)
    },
    [setGameState, addLog],
  )

  // Grant ability (available for future use)
  const _grantAbility = useCallback(
    (abilityId: string) => {
      const ability = BASE_ABILITIES[abilityId]
      if (ability) {
        setGameState((prev) => {
          if (prev.player.abilities.some((a) => a.id === abilityId)) {
            return prev
          }
          return {
            ...prev,
            player: {
              ...prev.player,
              abilities: [...prev.player.abilities, { ...ability, currentCooldown: 0 }],
            },
          }
        })
        addLog(<span className="text-cyan-400">[DEV] Granted ability: {ability.name}</span>)
      }
    },
    [setGameState, addLog],
  )

  // Add dungeon key
  const addKey = useCallback(
    (keyType: "bronze" | "silver" | "golden") => {
      const keyData: Record<"bronze" | "silver" | "golden", Omit<DungeonKey, "id">> = {
        bronze: {
          name: "Bronze Key",
          rarity: "uncommon",
          opensRarity: ["uncommon"],
          consumedOnUse: true,
          description: "A simple bronze key that unlocks uncommon chests.",
        },
        silver: {
          name: "Silver Key",
          rarity: "rare",
          opensRarity: ["uncommon", "rare"],
          consumedOnUse: true,
          description: "A polished silver key that unlocks uncommon and rare chests.",
        },
        golden: {
          name: "Golden Key",
          rarity: "legendary",
          opensRarity: ["uncommon", "rare", "legendary"],
          consumedOnUse: true,
          description: "A radiant golden key that unlocks all chests.",
        },
      }

      const key: DungeonKey = {
        id: crypto.randomUUID(),
        ...keyData[keyType],
      }

      setGameState((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          keys: [...prev.player.keys, key],
        },
      }))
      addLog(<span className="text-cyan-400">[DEV] Added {key.name}</span>)
    },
    [setGameState, addLog],
  )

  // Modify world state
  const modifyMood = useCallback(
    (aspect: "hostility" | "awareness" | "corruption" | "activity", value: number) => {
      setWorldState((prev) => ({
        ...prev,
        dungeonMood: prev.dungeonMood
          ? {
              ...prev.dungeonMood,
              [aspect]: Math.max(0, Math.min(100, prev.dungeonMood[aspect] + value)),
            }
          : prev.dungeonMood,
      }))
      addLog(
        <span className="text-cyan-400">
          [DEV] Modified dungeon {aspect} by {value > 0 ? "+" : ""}
          {value}
        </span>,
      )
    },
    [setWorldState, addLog],
  )

  // Trigger chaos event
  const triggerChaos = useCallback(
    (eventName: string) => {
      // Import chaos events dynamically to avoid circular deps
      import("@/lib/chaos-system").then(({ CHAOS_EVENTS }) => {
        const template = CHAOS_EVENTS.find((e) => e.name === eventName)
        if (template) {
          const event: ChaosEvent = {
            ...template,
            id: crypto.randomUUID(),
            turnsActive: 0,
          }
          setChaosEvents((prev) => [...prev, event])
          addLog(<span className="text-red-400">[DEV] Triggered chaos: {event.name}</span>)
        }
      })
    },
    [setChaosEvents, addLog],
  )

  // Full heal
  const fullHeal = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      player: {
        ...prev.player,
        stats: {
          ...prev.player.stats,
          health: prev.player.stats.maxHealth,
        },
        resources: {
          ...prev.player.resources,
          current: prev.player.resources.max,
        },
      },
    }))
    addLog(<span className="text-cyan-400">[DEV] Full heal + resource restore</span>)
  }, [setGameState, addLog])

  // God mode toggle
  const [godMode, setGodMode] = useState(false)
  const toggleGodMode = useCallback(() => {
    setGodMode((prev) => !prev)
    if (!godMode) {
      setGameState((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          stats: {
            ...prev.player.stats,
            health: 9999,
            maxHealth: 9999,
            attack: 999,
            defense: 999,
          },
        },
      }))
      addLog(<span className="text-yellow-400">[DEV] GOD MODE ENABLED</span>)
    } else {
      addLog(<span className="text-yellow-400">[DEV] God mode disabled (stats remain)</span>)
    }
  }, [godMode, setGameState, addLog])

  if (!isOpen) return null

  const tabs: { id: DevTab; label: string }[] = [
    { id: "player", label: "Player" },
    { id: "items", label: "Items" },
    { id: "enemies", label: "Enemies" },
    { id: "effects", label: "Effects" },
    { id: "world", label: "World" },
    { id: "chaos", label: "Chaos" },
    { id: "phase", label: "Phase" },
    { id: "ai", label: "AI Test" },
    { id: "logs", label: "Logs" },
  ]

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-900/30 border-b border-yellow-700/50">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-sm">DEV PANEL</span>
            {godMode && <span className="text-xs bg-yellow-500 text-black px-1">GOD</span>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-2 py-1 bg-zinc-800/50 border-b border-zinc-700/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                activeTab === tab.id
                  ? "bg-yellow-900/50 text-yellow-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Player Tab */}
          {activeTab === "player" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Quick Actions */}
                <div className="space-y-2">
                  <h3 className="text-xs text-zinc-500 font-mono uppercase">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <DevButton onClick={fullHeal}>Full Heal</DevButton>
                    <DevButton onClick={toggleGodMode} variant={godMode ? "active" : "default"}>
                      God Mode
                    </DevButton>
                    <DevButton onClick={() => modifyStat("level", 1)}>Level Up</DevButton>
                    <DevButton onClick={() => modifyStat("gold", 1000)}>+1000 Gold</DevButton>
                    <DevButton onClick={() => modifyStat("exp", 500)}>+500 XP</DevButton>
                  </div>
                </div>

                {/* Current Stats */}
                <div className="space-y-2">
                  <h3 className="text-xs text-zinc-500 font-mono uppercase">Current Stats</h3>
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                    <span className="text-zinc-400">HP:</span>
                    <span className="text-green-400">
                      {gameState.player?.stats.health}/{gameState.player?.stats.maxHealth}
                    </span>
                    <span className="text-zinc-400">Level:</span>
                    <span className="text-amber-400">{gameState.player?.stats.level}</span>
                    <span className="text-zinc-400">XP:</span>
                    <span className="text-purple-400">{gameState.player?.stats.experience}</span>
                    <span className="text-zinc-400">Gold:</span>
                    <span className="text-yellow-400">{gameState.player?.stats.gold}</span>
                    <span className="text-zinc-400">Attack:</span>
                    <span className="text-red-400">{gameState.player?.stats.attack}</span>
                    <span className="text-zinc-400">Defense:</span>
                    <span className="text-blue-400">{gameState.player?.stats.defense}</span>
                  </div>
                </div>
              </div>

              {/* Stat Modifiers */}
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Modify Stats</h3>
                <div className="grid grid-cols-3 gap-2">
                  {["health", "maxHealth", "attack", "defense", "gold", "exp", "level", "resource"].map((stat) => (
                    <div key={stat} className="flex items-center gap-1">
                      <span className="text-xs text-zinc-400 w-16 truncate">{stat}</span>
                      <DevButton size="sm" onClick={() => modifyStat(stat, -10)}>
                        -10
                      </DevButton>
                      <DevButton size="sm" onClick={() => modifyStat(stat, -1)}>
                        -1
                      </DevButton>
                      <DevButton size="sm" onClick={() => modifyStat(stat, 1)}>
                        +1
                      </DevButton>
                      <DevButton size="sm" onClick={() => modifyStat(stat, 10)}>
                        +10
                      </DevButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keys */}
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Add Keys</h3>
                <div className="flex gap-2">
                  <DevButton onClick={() => addKey("bronze")}>+ Bronze Key</DevButton>
                  <DevButton onClick={() => addKey("silver")}>+ Silver Key</DevButton>
                  <DevButton onClick={() => addKey("golden")}>+ Golden Key</DevButton>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === "items" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Generate Items</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(["common", "uncommon", "rare", "legendary"] as const).map((rarity) => (
                    <div key={rarity} className="space-y-1">
                      <span
                        className={`text-xs font-mono ${
                          rarity === "common"
                            ? "text-zinc-400"
                            : rarity === "uncommon"
                              ? "text-green-400"
                              : rarity === "rare"
                                ? "text-blue-400"
                                : "text-amber-400"
                        }`}
                      >
                        {rarity}
                      </span>
                      <DevButton size="sm" onClick={() => addItem("weapon", rarity)}>
                        Weapon
                      </DevButton>
                      <DevButton size="sm" onClick={() => addItem("armor", rarity)}>
                        Armor
                      </DevButton>
                    </div>
                  ))}
                </div>
                <DevButton onClick={() => addItem("potion")}>+ Random Potion</DevButton>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">
                  Current Inventory ({gameState.player?.inventory.length || 0})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {gameState.player?.inventory.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs font-mono bg-zinc-800/50 px-2 py-1"
                    >
                      <span
                        className={
                          item.rarity === "common"
                            ? "text-zinc-400"
                            : item.rarity === "uncommon"
                              ? "text-green-400"
                              : item.rarity === "rare"
                                ? "text-blue-400"
                                : "text-amber-400"
                        }
                      >
                        {item.name}
                      </span>
                      <button
                        onClick={() => {
                          setGameState((prev) => ({
                            ...prev,
                            player: {
                              ...prev.player,
                              inventory: prev.player.inventory.filter((_, idx) => idx !== i),
                            },
                          }))
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enemies Tab */}
          {activeTab === "enemies" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Spawn</h3>
                <div className="flex gap-2">
                  <DevButton onClick={() => spawnEnemy(false)}>Spawn Enemy</DevButton>
                  <DevButton onClick={() => spawnEnemy(true)} variant="danger">
                    Spawn Boss
                  </DevButton>
                  {gameState.currentEnemy && (
                    <DevButton onClick={killEnemy} variant="success">
                      Kill Current
                    </DevButton>
                  )}
                </div>
              </div>

              {gameState.currentEnemy && (
                <div className="space-y-2">
                  <h3 className="text-xs text-zinc-500 font-mono uppercase">Current Enemy</h3>
                  <div className="bg-zinc-800/50 p-3 space-y-2">
                    <div className="text-red-400 font-mono">{gameState.currentEnemy.name}</div>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <span className="text-zinc-400">HP:</span>
                      <span>
                        {gameState.currentEnemy.health}/{gameState.currentEnemy.maxHealth}
                      </span>
                      <span className="text-zinc-400">ATK:</span>
                      <span>{gameState.currentEnemy.attack}</span>
                      <span className="text-zinc-400">DEF:</span>
                      <span>{gameState.currentEnemy.defense}</span>
                    </div>
                    <div className="flex gap-2">
                      <DevButton
                        size="sm"
                        onClick={() => {
                          setGameState((prev) => ({
                            ...prev,
                            currentEnemy: prev.currentEnemy
                              ? {
                                  ...prev.currentEnemy,
                                  health: Math.max(1, prev.currentEnemy.health - 50),
                                }
                              : null,
                          }))
                        }}
                      >
                        -50 HP
                      </DevButton>
                      <DevButton
                        size="sm"
                        onClick={() => {
                          setGameState((prev) => ({
                            ...prev,
                            currentEnemy: prev.currentEnemy
                              ? {
                                  ...prev.currentEnemy,
                                  health: 1,
                                }
                              : null,
                          }))
                        }}
                      >
                        Set 1 HP
                      </DevButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Effects Tab */}
          {activeTab === "effects" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Apply Effects</h3>
                <div className="grid grid-cols-2 gap-2">
                  <DevButton onClick={() => addEffect("buff", "Strength", 5, { attack: 10 })}>
                    +10 ATK (5 turns)
                  </DevButton>
                  <DevButton onClick={() => addEffect("buff", "Fortify", 5, { defense: 10 })}>
                    +10 DEF (5 turns)
                  </DevButton>
                  <DevButton onClick={() => addEffect("buff", "Regeneration", 10, { healthRegen: 5 })}>
                    Regen (10 turns)
                  </DevButton>
                  <DevButton onClick={() => addEffect("debuff", "Poison", 5, { healthRegen: -3 })} variant="danger">
                    Poison (5 turns)
                  </DevButton>
                  <DevButton onClick={() => addEffect("debuff", "Weakness", 5, { attack: -5 })} variant="danger">
                    -5 ATK (5 turns)
                  </DevButton>
                  <DevButton onClick={() => addEffect("debuff", "Vulnerability", 5, { defense: -5 })} variant="danger">
                    -5 DEF (5 turns)
                  </DevButton>
                </div>
                <DevButton onClick={clearEffects} variant="danger">
                  Clear All Effects
                </DevButton>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">
                  Active Effects ({gameState.player?.activeEffects.length || 0})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {gameState.player?.activeEffects.map((effect, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs font-mono bg-zinc-800/50 px-2 py-1"
                    >
                      <span className={effect.effectType === "buff" ? "text-green-400" : "text-red-400"}>
                        {effect.name} ({effect.duration}t)
                      </span>
                      <button
                        onClick={() => {
                          setGameState((prev) => ({
                            ...prev,
                            player: {
                              ...prev.player,
                              activeEffects: prev.player.activeEffects.filter((_, idx) => idx !== i),
                            },
                          }))
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* World Tab */}
          {activeTab === "world" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Dungeon Mood</h3>
                <div className="space-y-2">
                  {(["hostility", "awareness", "corruption", "activity"] as const).map((aspect) => (
                    <div key={aspect} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-20">{aspect}</span>
                      <div className="flex-1 h-2 bg-zinc-700 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            aspect === "hostility"
                              ? "bg-red-500"
                              : aspect === "awareness"
                                ? "bg-yellow-500"
                                : aspect === "corruption"
                                  ? "bg-purple-500"
                                  : "bg-blue-500"
                          }`}
                          style={{ width: `${worldState.dungeonMood?.[aspect] ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-8">{worldState.dungeonMood?.[aspect] ?? 0}</span>
                      <DevButton size="sm" onClick={() => modifyMood(aspect, -10)}>
                        -10
                      </DevButton>
                      <DevButton size="sm" onClick={() => modifyMood(aspect, 10)}>
                        +10
                      </DevButton>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Memories ({worldState.memories.length})</h3>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs font-mono">
                  {worldState.memories.slice(-10).map((m, i) => (
                    <div key={i} className="text-zinc-400 truncate">
                      {m.type}: {m.content.subject}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chaos Tab */}
          {activeTab === "chaos" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Trigger Chaos Event</h3>
                <div className="grid grid-cols-2 gap-2">
                  <DevButton onClick={() => triggerChaos("Tunnel Collapse")} variant="danger">
                    Tunnel Collapse
                  </DevButton>
                  <DevButton onClick={() => triggerChaos("Rising Waters")} variant="danger">
                    Rising Waters
                  </DevButton>
                  <DevButton onClick={() => triggerChaos("Monster Migration")} variant="danger">
                    Monster Migration
                  </DevButton>
                  <DevButton onClick={() => triggerChaos("Wild Magic Surge")} variant="danger">
                    Wild Magic Surge
                  </DevButton>
                  <DevButton onClick={() => triggerChaos("Blood Moon Rising")} variant="danger">
                    Blood Moon Rising
                  </DevButton>
                  <DevButton onClick={() => triggerChaos("The Nemesis Approaches")} variant="danger">
                    Nemesis
                  </DevButton>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Active Chaos ({chaosEvents.length})</h3>
                <div className="space-y-1">
                  {chaosEvents.map((event, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs font-mono bg-red-900/20 px-2 py-1"
                    >
                      <span className="text-red-400">{event.name}</span>
                      <span className="text-zinc-500">
                        {event.turnsActive}/{event.duration}t
                      </span>
                      <button
                        onClick={() => setChaosEvents((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Phase Tab */}
          {activeTab === "phase" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Current: {gameState.phase}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["title", "tavern", "dungeon_select", "exploring", "combat", "victory", "game_over"] as const).map(
                    (phase) => (
                      <DevButton
                        key={phase}
                        onClick={() => setPhase(phase)}
                        variant={gameState.phase === phase ? "active" : "default"}
                      >
                        {phase}
                      </DevButton>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Floor: {gameState.floor}</h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 10, 20].map((floor) => (
                    <DevButton key={floor} onClick={() => teleportFloor(floor)} size="sm">
                      F{floor}
                    </DevButton>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Room: {gameState.currentRoom}</h3>
                <div className="flex gap-2">
                  <DevButton onClick={() => setGameState((prev) => ({ ...prev, currentRoom: prev.currentRoom + 1 }))}>
                    Next Room
                  </DevButton>
                  <DevButton onClick={() => setGameState((prev) => ({ ...prev, currentRoom: 0 }))}>
                    Reset Room
                  </DevButton>
                </div>
              </div>
            </div>
          )}

          {/* AI Test Tab */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Test AI Generation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Room generation...</span>)}
                  >
                    Generate Room
                  </DevButton>
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Enemy generation...</span>)}
                  >
                    Generate Enemy
                  </DevButton>
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Item generation...</span>)}
                  >
                    Generate Item
                  </DevButton>
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Effect generation...</span>)}
                  >
                    Generate Effect
                  </DevButton>
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Companion generation...</span>)}
                  >
                    Generate Companion
                  </DevButton>
                  <DevButton
                    onClick={() => addLog(<span className="text-cyan-400">[AI TEST] Dungeon card generation...</span>)}
                  >
                    Generate Dungeon
                  </DevButton>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Custom Prompt</h3>
                <textarea
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  className="w-full h-24 bg-zinc-800 text-zinc-100 text-xs font-mono p-2 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                  placeholder="Enter custom AI prompt..."
                />
                <DevButton
                  onClick={() => {
                    addLog(<span className="text-cyan-400">[AI] Sending: {customCommand}</span>)
                    setCustomCommand("")
                  }}
                >
                  Send to AI
                </DevButton>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Game Logs ({logs.length})</h3>
                <DevButton
                  size="sm"
                  onClick={() => {
                    // Can't clear logs from here, just note
                    addLog(<span className="text-zinc-500">--- Log marker ---</span>)
                  }}
                >
                  Add Marker
                </DevButton>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 bg-zinc-800/50 p-2">
                {logs.slice(-50).map((log) => (
                  <div key={log.id} className="text-xs font-mono text-zinc-300">
                    <span className="text-zinc-600 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    {log.content}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs text-zinc-500 font-mono uppercase">Command History</h3>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs font-mono text-zinc-400">
                  {commandHistory.slice(-20).map((cmd, i) => (
                    <div key={i}>&gt; {cmd}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700/50 flex justify-between items-center">
          <span className="text-xs text-zinc-500 font-mono">
            Turn: {gameState.turnCount} | Floor: {gameState.floor} | Room: {gameState.currentRoom}
          </span>
          <span className="text-xs text-zinc-600 font-mono">Press ` to toggle</span>
        </div>
      </div>
    </div>
  )
}
