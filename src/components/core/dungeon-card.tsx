"use client"

import type { DungeonCard, DungeonKey, ItemRarity, KeyRarity } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"

interface DungeonCardProps {
  dungeon: DungeonCard
  keys: DungeonKey[]
  onSelect: (dungeon: DungeonCard, keyToUse: DungeonKey) => void
  disabled?: boolean
}

const rarityColors: Record<ItemRarity, string> = {
  common: "text-stone-400",
  uncommon: "text-emerald-400",
  rare: "text-sky-400",
  legendary: "text-amber-400",
}

const rarityBg: Record<ItemRarity, string> = {
  common: "bg-stone-900/30",
  uncommon: "bg-emerald-900/20",
  rare: "bg-sky-900/20",
  legendary: "bg-amber-900/20",
}

const rarityBorder: Record<ItemRarity, string> = {
  common: "border-stone-700/30",
  uncommon: "border-emerald-700/30",
  rare: "border-sky-700/30",
  legendary: "border-amber-700/30 shadow-amber-900/20 shadow-lg",
}

export function DungeonCardComponent({ dungeon, keys, onSelect, disabled }: DungeonCardProps) {
  // Find a valid key that can open this dungeon
  const validKey = keys.find((key) => {
    if (key.rarity === "master") {
      return dungeon.rarity === "common"
    }
    return key.opensRarity.includes(dungeon.rarity as KeyRarity)
  })

  const canEnter = !!validKey && !disabled

  const handleClick = () => {
    if (canEnter && validKey) {
      onSelect(dungeon, validKey)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!canEnter}
      className={cn(
        "w-full text-left p-4 rounded transition-all duration-200",
        "border",
        rarityBg[dungeon.rarity],
        rarityBorder[dungeon.rarity],
        canEnter ? "hover:scale-[1.02] hover:brightness-110 cursor-pointer" : "opacity-50 cursor-not-allowed",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={cn("font-medium", dungeon.isMystery ? "text-purple-400" : rarityColors[dungeon.rarity])}>
          {dungeon.name}
        </h3>
        <span className={cn("text-xs uppercase tracking-wide", rarityColors[dungeon.rarity])}>{dungeon.rarity}</span>
      </div>

      {/* Theme */}
      <p className="text-sm text-muted-foreground mb-3 italic">
        {dungeon.isMystery ? `"${dungeon.theme}"` : `A ${dungeon.theme}.`}
      </p>

      {/* Dangers */}
      <div className="mb-2">
        <span className="text-xs text-red-400/70 uppercase tracking-wide">Dangers</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {dungeon.dangers.map((danger, i) => (
            <span key={i} className="text-xs text-red-300/80 bg-red-900/20 px-1.5 py-0.5 rounded">
              {danger}
            </span>
          ))}
        </div>
      </div>

      {/* Rewards */}
      <div className="mb-3">
        <span className="text-xs text-emerald-400/70 uppercase tracking-wide">Rewards</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {dungeon.rewards.map((reward, i) => (
            <span key={i} className="text-xs text-emerald-300/80 bg-emerald-900/20 px-1.5 py-0.5 rounded">
              {reward}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20">
        <span className="text-muted-foreground">{dungeon.floors} floors</span>
        {validKey ? (
          <span
            className={cn(
              "flex items-center gap-1",
              validKey.rarity === "master"
                ? "text-amber-300"
                : validKey.rarity === "legendary"
                  ? "text-amber-400"
                  : validKey.rarity === "rare"
                    ? "text-sky-400"
                    : validKey.rarity === "uncommon"
                      ? "text-emerald-400"
                      : "text-stone-400",
            )}
          >
            <span className="opacity-60">⚷</span>
            {validKey.name}
            {!validKey.consumedOnUse && <span className="text-amber-400 text-[10px]">∞</span>}
          </span>
        ) : (
          <span className="text-red-400/70">No valid key</span>
        )}
      </div>
    </button>
  )
}
