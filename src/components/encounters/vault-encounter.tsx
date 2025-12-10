"use client"

import type { VaultInstance } from "@/lib/items/vault-system"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "@/components/character/stat-bar"
import { cn } from "@/lib/core/utils"

interface VaultEncounterProps {
  vault: VaultInstance
  onAction: (action: VaultAction) => void
  isProcessing?: boolean
  hasKey?: boolean
  keyType?: string
}

export type VaultAction =
  | { type: "unlock"; keyType: string }
  | { type: "enter" }
  | { type: "loot"; itemIndex: number }
  | { type: "loot_gold"; amount: number }
  | { type: "fight_guardian" }
  | { type: "advance_wave" }
  | { type: "leave" }
  | { type: "complete" }

const DANGER_COLORS = {
  1: "text-green-400",
  2: "text-yellow-400",
  3: "text-orange-400",
  4: "text-red-400",
  5: "text-purple-400",
} as const

const STATE_TEXT = {
  locked: "Sealed",
  active: "Active",
  completed: "Cleared",
  failed: "Failed",
  expired: "Collapsed",
} as const

export function VaultEncounter({ vault, onAction, isProcessing, hasKey, keyType }: VaultEncounterProps) {
  const { definition, state, turnsRemaining, currentWave, waves, availableLoot, totalGold, collectedGold, guardian, guardianDefeated } = vault
  const dangerColor = DANGER_COLORS[definition.dangerLevel]
  const remainingGold = totalGold - collectedGold
  const canUnlock = state === "locked" && hasKey && keyType === definition.keyType

  return (
    <div className="my-4 p-4 bg-purple-500/5 border border-purple-900/30 rounded-lg space-y-3">
      {/* Header */}
      <div className="text-center space-y-1">
        <EntityText type="special" className="text-lg">
          {definition.name}
        </EntityText>
        <p className="text-sm text-purple-300/80">{definition.description}</p>
        <div className="flex justify-center gap-3 text-xs">
          <span className={dangerColor}>
            Danger: {"★".repeat(definition.dangerLevel)}{"☆".repeat(5 - definition.dangerLevel)}
          </span>
          <span className="text-purple-400">
            Status: {STATE_TEXT[state]}
          </span>
        </div>
      </div>

      {/* Time limit display */}
      {turnsRemaining !== undefined && state === "active" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Time Remaining</span>
            <span className={cn(
              turnsRemaining <= 2 ? "text-red-400 animate-pulse" : "text-amber-400"
            )}>
              {turnsRemaining} turns
            </span>
          </div>
          <StatBar
            label="Time"
            current={turnsRemaining}
            max={definition.timeLimit || turnsRemaining}
            color="mana"
            compact
          />
        </div>
      )}

      {/* Wave display */}
      {waves && currentWave !== undefined && state === "active" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Wave Progress</span>
            <span className="text-red-400">
              Wave {currentWave + 1} / {waves.length}
            </span>
          </div>
          <div className="flex gap-1">
            {waves.map((wave, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2 rounded",
                  wave.completed ? "bg-green-500" :
                  i === currentWave ? "bg-red-500 animate-pulse" :
                  "bg-zinc-700"
                )}
                title={`Wave ${wave.waveNumber}${wave.completed ? " (Cleared)" : ""}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Guardian status */}
      {guardian && !guardianDefeated && state === "active" && (
        <div className="p-2 bg-red-900/20 border border-red-800/30 rounded text-sm">
          <span className="text-red-400">Guardian: </span>
          <EntityText type="enemy">{guardian.name}</EntityText>
          <span className="text-muted-foreground"> blocks the treasure!</span>
        </div>
      )}

      {/* Loot display */}
      {state === "active" && (guardianDefeated || !guardian) && (
        <div className="space-y-2">
          {remainingGold > 0 && (
            <div className="flex items-center justify-between p-2 bg-amber-900/20 border border-amber-800/30 rounded">
              <span className="text-amber-400">
                Gold Pile: {remainingGold}g
              </span>
              <button
                onClick={() => onAction({ type: "loot_gold", amount: remainingGold })}
                disabled={isProcessing}
                className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                Take All
              </button>
            </div>
          )}

          {availableLoot.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Available Loot:</span>
              <div className="grid gap-1">
                {availableLoot.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-zinc-800/50 border border-zinc-700/30 rounded"
                  >
                    <EntityText type="item" className="text-sm">
                      {item.name}
                    </EntityText>
                    <button
                      onClick={() => onAction({ type: "loot", itemIndex: idx })}
                      disabled={isProcessing}
                      className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      Take
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unique mechanic hint */}
      {definition.uniqueMechanic && (
        <p className="text-xs text-purple-400/70 italic">
          {definition.uniqueMechanic}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 flex-wrap">
        {/* Locked state - unlock button */}
        {state === "locked" && (
          <>
            {canUnlock ? (
              <button
                onClick={() => onAction({ type: "unlock", keyType: definition.keyType! })}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 text-sm rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors font-medium border border-amber-500/30"
              >
                Use {definition.keyType?.replace("key_", "")} Key
              </button>
            ) : (
              <div className="flex-1 px-3 py-2 text-sm rounded bg-zinc-800/50 text-zinc-500 text-center">
                Requires: {definition.keyType?.replace("key_", "")} key
              </div>
            )}
            <button
              onClick={() => onAction({ type: "leave" })}
              disabled={isProcessing}
              className="px-3 py-2 text-sm rounded bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Leave
            </button>
          </>
        )}

        {/* Active state with guardian - fight button */}
        {state === "active" && guardian && !guardianDefeated && (
          <>
            <button
              onClick={() => onAction({ type: "fight_guardian" })}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 text-sm rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-medium"
            >
              Fight Guardian
            </button>
            <button
              onClick={() => onAction({ type: "leave" })}
              disabled={isProcessing}
              className="px-3 py-2 text-sm rounded bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Flee
            </button>
          </>
        )}

        {/* Active state with waves - advance wave button */}
        {state === "active" && waves && currentWave !== undefined && (
          <>
            {waves[currentWave]?.completed ? (
              currentWave < waves.length - 1 ? (
                <button
                  onClick={() => onAction({ type: "advance_wave" })}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 text-sm rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors font-medium"
                >
                  Next Wave ({currentWave + 2}/{waves.length})
                </button>
              ) : (
                <button
                  onClick={() => onAction({ type: "complete" })}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 text-sm rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors font-medium"
                >
                  Claim Rewards
                </button>
              )
            ) : null}
            <button
              onClick={() => onAction({ type: "leave" })}
              disabled={isProcessing}
              className="px-3 py-2 text-sm rounded bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Leave
            </button>
          </>
        )}

        {/* Active state, cleared (no guardian or guardian defeated, no waves) - complete/leave */}
        {state === "active" && (guardianDefeated || !guardian) && !waves && (
          <>
            {availableLoot.length === 0 && remainingGold <= 0 ? (
              <button
                onClick={() => onAction({ type: "complete" })}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 text-sm rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors font-medium"
              >
                Leave Vault
              </button>
            ) : (
              <button
                onClick={() => onAction({ type: "leave" })}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 text-sm rounded bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Leave (abandon remaining loot)
              </button>
            )}
          </>
        )}

        {/* Completed/Failed/Expired - just shows status */}
        {(state === "completed" || state === "failed" || state === "expired") && (
          <div className={cn(
            "flex-1 px-3 py-2 text-sm rounded text-center",
            state === "completed" ? "bg-green-900/20 text-green-400" :
            state === "failed" ? "bg-red-900/20 text-red-400" :
            "bg-zinc-800/50 text-zinc-500"
          )}>
            Vault {STATE_TEXT[state]}
          </div>
        )}
      </div>
    </div>
  )
}
