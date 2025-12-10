"use client"

import type { DungeonCard, DungeonKey, Player } from "@/lib/core/game-types"
import { DungeonCardComponent } from "@/components/core/dungeon-card"

interface DungeonSelectProps {
  dungeons: DungeonCard[]
  player: Player
  onSelectDungeon: (dungeon: DungeonCard, key: DungeonKey) => void
  disabled?: boolean
}

export function DungeonSelect({ dungeons, player, onSelectDungeon, disabled }: DungeonSelectProps) {
  if (!player || !player.keys) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Preparing dungeon selection...</p>
      </div>
    )
  }

  // Group keys by rarity for display (available for future use)
  const _keysByRarity = player.keys.reduce(
    (acc, key) => {
      acc[key.rarity] = (acc[key.rarity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-3xl opacity-60">⚷</div>
        <h2 className="text-xl text-primary">Choose Your Descent</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Select a dungeon to explore. Rarer dungeons offer greater rewards but demand mightier keys.
        </p>
      </div>

      {/* Key inventory display */}
      <div className="flex justify-center gap-4 text-xs">
        {player.keys.some((k) => k.rarity === "master") && (
          <span className="flex items-center gap-1 text-amber-300">
            <span className="opacity-60">⚷</span>
            Master Key <span className="text-amber-400/60">∞</span>
          </span>
        )}
        {["uncommon", "rare", "legendary"].map((rarity) => {
          const count = player.keys.filter((k) => k.rarity === rarity).length
          if (count === 0) return null
          return (
            <span
              key={rarity}
              className={
                rarity === "legendary" ? "text-amber-400" : rarity === "rare" ? "text-sky-400" : "text-emerald-400"
              }
            >
              <span className="opacity-60">⚷</span>
              {count}x {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </span>
          )
        })}
      </div>

      {/* Dungeon cards grid */}
      <div className="grid gap-4 max-w-2xl mx-auto">
        {dungeons.map((dungeon) => (
          <DungeonCardComponent
            key={dungeon.id}
            dungeon={dungeon}
            keys={player.keys}
            onSelect={onSelectDungeon}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-muted-foreground/60">
        Mystery dungeons (???) hide their true nature until you enter...
      </p>
    </div>
  )
}
