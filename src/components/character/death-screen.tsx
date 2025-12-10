"use client"

import { useState, useEffect } from "react"
import type { Player, RunSummary } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { useDungeonMaster } from "@/lib/hooks/use-dungeon-master"

interface DeathScreenProps {
  player: Player
  runStats: RunSummary
  onRestart: () => void
  onReturnToTavern: () => void
}

export function DeathScreen({ player, runStats, onRestart, onReturnToTavern }: DeathScreenProps) {
  const [deathNarration, setDeathNarration] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(false)
  const { generate } = useDungeonMaster()

  useEffect(() => {
    const fetchNarration = async () => {
      const response = await generate<{ deathNarration: string }>("player_death", {
        playerName: player.name,
        playerClass: player.className ?? "adventurer",
        level: player.stats.level,
        causeOfDeath: runStats.causeOfDeath,
        killedBy: runStats.killedBy,
        floorsCleared: runStats.floorsCleared,
        enemiesSlain: runStats.enemiesSlain,
      })
      if (response?.deathNarration) {
        setDeathNarration(response.deathNarration)
      }
      setTimeout(() => setShowStats(true), 1500)
    }
    fetchNarration()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Death Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-red-500 animate-pulse">YOU HAVE FALLEN</h1>
          <p className="text-stone-500 text-sm">
            {player.className && (
              <span>
                A level {player.stats.level} <EntityText type="rare">{player.className}</EntityText>
              </span>
            )}
          </p>
        </div>

        {/* AI Death Narration */}
        <div className="text-center">
          {deathNarration ? (
            <p className="text-stone-300 italic leading-relaxed">{deathNarration}</p>
          ) : (
            <p className="text-stone-500 animate-pulse">The darkness speaks...</p>
          )}
        </div>

        {/* Cause of Death */}
        <div className="text-center p-3 bg-red-900/20 rounded">
          <span className="text-stone-400 text-sm">Slain by </span>
          <EntityText type="enemy">{runStats.killedBy || runStats.causeOfDeath}</EntityText>
        </div>

        {/* Run Stats */}
        {showStats && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-stone-400 text-center text-sm uppercase tracking-wider">Final Tally</h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Floors Cleared</div>
                <div className="text-lg text-amber-400">{runStats.floorsCleared}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Enemies Slain</div>
                <div className="text-lg text-red-400">{runStats.enemiesSlain}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Gold Earned</div>
                <div className="text-lg text-yellow-400">{runStats.goldEarned}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Damage Dealt</div>
                <div className="text-lg text-orange-400">{runStats.damageDealt}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Turns Survived</div>
                <div className="text-lg text-cyan-400">{runStats.survivalTime}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500">Abilities Used</div>
                <div className="text-lg text-violet-400">{runStats.abilitiesUsed}</div>
              </div>
            </div>

            {/* Noteworthy Items Found */}
            {runStats.itemsFound.filter((i) => i.rarity === "rare" || i.rarity === "legendary").length > 0 && (
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500 text-sm mb-2">Notable Finds (Lost)</div>
                <div className="flex flex-wrap gap-2">
                  {runStats.itemsFound
                    .filter((i) => i.rarity === "rare" || i.rarity === "legendary")
                    .map((item) => (
                      <EntityText key={item.id} type={item.rarity === "legendary" ? "legendary" : "rare"}>
                        {item.name}
                      </EntityText>
                    ))}
                </div>
              </div>
            )}

            {/* Fallen Companions */}
            {runStats.companionsLost.length > 0 && (
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500 text-sm mb-2">Companions Lost</div>
                <div className="flex flex-wrap gap-2">
                  {runStats.companionsLost.map((name, i) => (
                    <EntityText key={i} type="companion">
                      {name}
                    </EntityText>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {showStats && (
          <div className="flex flex-col gap-3 pt-4 animate-in fade-in duration-500 delay-300">
            <button
              onClick={onReturnToTavern}
              className="px-6 py-3 bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 rounded transition-colors"
            >
              Return to Tavern
            </button>
            <button
              onClick={onRestart}
              className="px-6 py-3 bg-stone-800/50 hover:bg-stone-700/50 text-stone-300 rounded transition-colors"
            >
              Begin Anew
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
