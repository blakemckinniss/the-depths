"use client"

import type { DungeonKey } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface SidebarKeysProps {
  keys: DungeonKey[]
}

const keyColors: Record<string, string> = {
  master: "text-amber-300",
  common: "text-stone-400",
  uncommon: "text-emerald-400",
  rare: "text-sky-400",
  legendary: "text-amber-400",
}

export function SidebarKeys({ keys }: SidebarKeysProps) {
  // Group keys by type
  const masterKey = keys.find((k) => k.rarity === "master")
  const consumableKeys = keys.filter((k) => k.consumedOnUse)

  // Count by rarity
  const keyCounts = consumableKeys.reduce(
    (acc, key) => {
      acc[key.rarity] = (acc[key.rarity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground/70">Keys</h3>

      <div className="space-y-1.5">
        {/* Master Key */}
        {masterKey && (
          <div className="flex items-center justify-between text-sm">
            <span className={cn("flex items-center gap-1.5", keyColors.master)}>
              <span className="opacity-70">⚷</span>
              {masterKey.name}
            </span>
            <span className="text-amber-400/60 text-xs">∞</span>
          </div>
        )}

        {/* Consumable keys */}
        {["legendary", "rare", "uncommon", "common"].map((rarity) => {
          const count = keyCounts[rarity]
          if (!count) return null
          const keyTemplate = consumableKeys.find((k) => k.rarity === rarity)
          if (!keyTemplate) return null

          return (
            <div key={rarity} className="flex items-center justify-between text-sm">
              <span className={cn("flex items-center gap-1.5", keyColors[rarity])}>
                <span className="opacity-70">⚷</span>
                {keyTemplate.name}
              </span>
              <span className="text-muted-foreground text-xs">×{count}</span>
            </div>
          )
        })}

        {consumableKeys.length === 0 && !masterKey && (
          <p className="text-xs text-muted-foreground/50 italic">No keys</p>
        )}
      </div>
    </div>
  )
}
