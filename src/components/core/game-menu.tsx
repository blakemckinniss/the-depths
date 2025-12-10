"use client"

import { useState } from "react"
import { SaveLoadMenu } from "@/components/persistence/save-load-menu"
import { useSaveSystem, type SaveData, type GameSettings, defaultSettings } from "@/lib/persistence/save-system"
import type { GameState, LogEntry } from "@/lib/core/game-types"
import type { WorldState } from "@/lib/world/world-state"
import type { ChaosEvent } from "@/lib/world/chaos-system"

interface GameMenuProps {
  isOpen: boolean
  onClose: () => void
  gameState: GameState
  worldState: WorldState
  logs: LogEntry[]
  chaosEvents?: ChaosEvent[]
  onLoad: (data: SaveData) => void
  onReturnToTitle: () => void
}

export function GameMenu({
  isOpen,
  onClose,
  gameState,
  worldState,
  logs,
  chaosEvents = [],
  onLoad,
  onReturnToTitle,
}: GameMenuProps) {
  const { getSettings, saveSettings, forceAutoSave } = useSaveSystem()

  const [showSaveLoad, setShowSaveLoad] = useState<"save" | "load" | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(getSettings())
  const [confirmQuit, setConfirmQuit] = useState(false)

  const handleSettingChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const handleQuickSave = () => {
    forceAutoSave(gameState, worldState, logs, chaosEvents)
    onClose()
  }

  const handleQuit = () => {
    if (confirmQuit) {
      onReturnToTitle()
      onClose()
    } else {
      setConfirmQuit(true)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-sm bg-stone-900 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-amber-100">Menu</h2>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
              [ESC]
            </button>
          </div>

          {showSettings ? (
            // Settings panel
            <div className="space-y-4">
              <button
                onClick={() => setShowSettings(false)}
                className="text-sm text-stone-500 hover:text-stone-300 mb-4"
              >
                &larr; Back
              </button>

              <div className="space-y-3">
                {/* Auto-save toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Auto-save</span>
                  <button
                    onClick={() => handleSettingChange("autoSave", !settings.autoSave)}
                    className={`px-3 py-1 text-sm ${
                      settings.autoSave ? "bg-emerald-700 text-emerald-100" : "bg-stone-700 text-stone-400"
                    }`}
                  >
                    {settings.autoSave ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Auto-save interval */}
                {settings.autoSave && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">Save every</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleSettingChange("autoSaveInterval", Math.max(1, settings.autoSaveInterval - 1))
                        }
                        className="px-2 py-1 bg-stone-700 text-stone-300 hover:bg-stone-600"
                      >
                        -
                      </button>
                      <span className="text-amber-200 w-12 text-center">{settings.autoSaveInterval} turns</span>
                      <button
                        onClick={() =>
                          handleSettingChange("autoSaveInterval", Math.min(20, settings.autoSaveInterval + 1))
                        }
                        className="px-2 py-1 bg-stone-700 text-stone-300 hover:bg-stone-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Narrative speed */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Text Speed</span>
                  <div className="flex gap-1">
                    {(["instant", "fast", "normal", "slow"] as const).map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSettingChange("narrativeSpeed", speed)}
                        className={`px-2 py-1 text-xs ${
                          settings.narrativeSpeed === speed
                            ? "bg-amber-700 text-amber-100"
                            : "bg-stone-700 text-stone-400 hover:bg-stone-600"
                        }`}
                      >
                        {speed.charAt(0).toUpperCase() + speed.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Damage numbers */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Damage Numbers</span>
                  <button
                    onClick={() => handleSettingChange("showDamageNumbers", !settings.showDamageNumbers)}
                    className={`px-3 py-1 text-sm ${
                      settings.showDamageNumbers ? "bg-emerald-700 text-emerald-100" : "bg-stone-700 text-stone-400"
                    }`}
                  >
                    {settings.showDamageNumbers ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Compact mode */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Compact Mode</span>
                  <button
                    onClick={() => handleSettingChange("compactMode", !settings.compactMode)}
                    className={`px-3 py-1 text-sm ${
                      settings.compactMode ? "bg-emerald-700 text-emerald-100" : "bg-stone-700 text-stone-400"
                    }`}
                  >
                    {settings.compactMode ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Reset to defaults */}
              <button
                onClick={() => {
                  setSettings(defaultSettings)
                  saveSettings(defaultSettings)
                }}
                className="w-full mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 text-sm transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          ) : (
            // Main menu
            <div className="space-y-2">
              <button
                onClick={handleQuickSave}
                className="w-full px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-left transition-colors"
              >
                <span className="text-stone-500 mr-2">[Q]</span>
                Quick Save
              </button>

              <button
                onClick={() => setShowSaveLoad("save")}
                className="w-full px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-left transition-colors"
              >
                <span className="text-stone-500 mr-2">[S]</span>
                Save Game
              </button>

              <button
                onClick={() => setShowSaveLoad("load")}
                className="w-full px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-left transition-colors"
              >
                <span className="text-stone-500 mr-2">[L]</span>
                Load Game
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-left transition-colors"
              >
                <span className="text-stone-500 mr-2">[O]</span>
                Settings
              </button>

              <div className="h-px bg-stone-800 my-2" />

              <button
                onClick={handleQuit}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  confirmQuit ? "bg-red-900/30 text-red-400" : "bg-stone-800 hover:bg-stone-700 text-stone-300"
                }`}
              >
                <span className="text-stone-500 mr-2">[X]</span>
                {confirmQuit ? "Confirm Quit? (Unsaved progress will be lost)" : "Return to Title"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save/Load modal */}
      {showSaveLoad && (
        <SaveLoadMenu
          isOpen={true}
          onClose={() => setShowSaveLoad(null)}
          mode={showSaveLoad}
          gameState={gameState}
          worldState={worldState}
          logs={logs}
          chaosEvents={chaosEvents}
          onLoad={onLoad}
        />
      )}
    </>
  )
}
