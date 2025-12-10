"use client"

import { useState, useEffect } from "react"
import { useSaveSystem, formatPlaytime, formatSaveDate, type SaveMetadata, type SaveData } from "@/lib/persistence/save-system"
import type { GameState, LogEntry } from "@/lib/core/game-types"
import type { WorldState } from "@/lib/world/world-state"
import type { ChaosEvent } from "@/lib/world/chaos-system"

interface SaveLoadMenuProps {
  isOpen: boolean
  onClose: () => void
  mode: "save" | "load"
  gameState: GameState
  worldState: WorldState
  logs: LogEntry[]
  chaosEvents?: ChaosEvent[]
  onLoad: (data: SaveData) => void
}

export function SaveLoadMenu({
  isOpen,
  onClose,
  mode,
  gameState,
  worldState,
  logs,
  chaosEvents = [],
  onLoad,
}: SaveLoadMenuProps) {
  const { save, load, deleteSave, getSaveSlots, exportSave, importSave, getStorageUsage } = useSaveSystem()

  const [slots, setSlots] = useState<(SaveMetadata | null)[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 })

  useEffect(() => {
    if (isOpen) {
      setSlots(getSaveSlots())
      setStorageUsage(getStorageUsage())
      setSelectedSlot(null)
      setConfirmDelete(null)
      setMessage(null)
    }
  }, [isOpen, getSaveSlots, getStorageUsage])

  const handleSave = (slot: number) => {
    const success = save(slot, gameState, worldState, logs, chaosEvents)
    if (success) {
      setMessage({ type: "success", text: `Game saved to Slot ${slot}` })
      setSlots(getSaveSlots())
      setStorageUsage(getStorageUsage())
    } else {
      setMessage({ type: "error", text: "Failed to save game" })
    }
  }

  const handleLoad = (slot: number) => {
    const data = load(slot)
    if (data) {
      onLoad(data)
      setMessage({ type: "success", text: "Game loaded" })
      onClose()
    } else {
      setMessage({ type: "error", text: "Failed to load save" })
    }
  }

  const handleDelete = (slot: number) => {
    if (confirmDelete === slot) {
      const success = deleteSave(slot)
      if (success) {
        setMessage({ type: "success", text: `Slot ${slot} deleted` })
        setSlots(getSaveSlots())
        setStorageUsage(getStorageUsage())
      } else {
        setMessage({ type: "error", text: "Failed to delete save" })
      }
      setConfirmDelete(null)
    } else {
      setConfirmDelete(slot)
    }
  }

  const handleExport = (slot: number) => {
    const data = exportSave(slot)
    if (data) {
      navigator.clipboard.writeText(data)
      setMessage({ type: "success", text: "Save copied to clipboard" })
    } else {
      setMessage({ type: "error", text: "Failed to export save" })
    }
  }

  const handleImport = () => {
    if (selectedSlot === null) {
      setMessage({ type: "error", text: "Select a slot first" })
      return
    }

    const success = importSave(selectedSlot, importData)
    if (success) {
      setMessage({ type: "success", text: `Save imported to Slot ${selectedSlot}` })
      setSlots(getSaveSlots())
      setShowImport(false)
      setImportData("")
    } else {
      setMessage({ type: "error", text: "Invalid save data" })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-lg bg-stone-900 p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-amber-100">{mode === "save" ? "Save Game" : "Load Game"}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
            [X]
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-2 text-sm ${
              message.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save slots */}
        <div className="space-y-2 mb-6">
          {slots.map((slot, index) => (
            <div
              key={index}
              className={`p-3 transition-all cursor-pointer ${
                selectedSlot === index
                  ? "bg-amber-900/30 ring-1 ring-amber-600/50"
                  : "bg-stone-800/50 hover:bg-stone-800"
              }`}
              onClick={() => setSelectedSlot(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-stone-500 text-sm w-16">{index === 0 ? "Auto" : `Slot ${index}`}</span>

                  {slot ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-200 font-medium">{slot.playerName}</span>
                        <span className="text-stone-500">-</span>
                        <span className="text-purple-400 text-sm">{slot.className}</span>
                        <span className="text-stone-500 text-sm">Lv.{slot.level}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span>Floor {slot.floor}</span>
                        {slot.dungeon && (
                          <>
                            <span>-</span>
                            <span className="text-teal-400">{slot.dungeon}</span>
                          </>
                        )}
                        <span>-</span>
                        <span>{formatPlaytime(slot.playtime)}</span>
                        <span>-</span>
                        <span>{formatSaveDate(slot.updatedAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-stone-600 italic">Empty</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {slot && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExport(index)
                        }}
                        className="text-xs text-stone-500 hover:text-stone-300 px-2 py-1"
                        title="Export"
                      >
                        [^]
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(index)
                        }}
                        className={`text-xs px-2 py-1 ${
                          confirmDelete === index ? "text-red-400" : "text-stone-500 hover:text-red-400"
                        }`}
                      >
                        {confirmDelete === index ? "[Confirm?]" : "[X]"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {mode === "save" ? (
            <button
              onClick={() => selectedSlot !== null && handleSave(selectedSlot)}
              disabled={selectedSlot === null}
              className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-amber-100 transition-colors"
            >
              Save to {selectedSlot !== null ? (selectedSlot === 0 ? "Auto Slot" : `Slot ${selectedSlot}`) : "..."}
            </button>
          ) : (
            <button
              onClick={() => selectedSlot !== null && handleLoad(selectedSlot)}
              disabled={selectedSlot === null || !slots[selectedSlot]}
              className="flex-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-700 disabled:text-stone-500 text-emerald-100 transition-colors"
            >
              Load {selectedSlot !== null && slots[selectedSlot] ? `"${slots[selectedSlot]?.playerName}"` : "..."}
            </button>
          )}

          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
          >
            Import
          </button>
        </div>

        {/* Import section */}
        {showImport && (
          <div className="mt-4 p-3 bg-stone-800/50">
            <p className="text-xs text-stone-500 mb-2">Paste exported save data below:</p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full h-20 bg-stone-900 text-stone-300 text-xs p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-600/50"
              placeholder="Paste save data here..."
            />
            <button
              onClick={handleImport}
              disabled={!importData || selectedSlot === null}
              className="mt-2 px-3 py-1 text-sm bg-purple-700 hover:bg-purple-600 disabled:bg-stone-700 disabled:text-stone-500 text-purple-100 transition-colors"
            >
              Import to {selectedSlot !== null ? (selectedSlot === 0 ? "Auto Slot" : `Slot ${selectedSlot}`) : "..."}
            </button>
          </div>
        )}

        {/* Storage usage */}
        <div className="mt-4 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Storage Used</span>
            <span>
              {(storageUsage.used / 1024).toFixed(1)} KB / {(storageUsage.total / 1024 / 1024).toFixed(0)} MB (
              {storageUsage.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-1 h-1 bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all"
              style={{ width: `${Math.min(100, storageUsage.percentage)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
