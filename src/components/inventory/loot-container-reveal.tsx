"use client"

import { useState, useEffect } from "react"
import { EntityText } from "@/components/narrative/entity-text"
import type { Item } from "@/lib/core/game-types"
import {
  type LootContainer,
  type ContainerOpenResult,
  type ContainerLootItem,
  openContainer,
  containerLootToItems,
  getRarityColor,
} from "@/lib/ai/ai-drops-system"

interface LootContainerRevealProps {
  container: LootContainer
  onComplete: (items: Item[], goldAmount: number, curseTriggered?: boolean, curseEffect?: string) => void
  onCancel: () => void
}

type Phase = "sealed" | "opening" | "revealed"

export function LootContainerReveal({ container, onComplete, onCancel }: LootContainerRevealProps) {
  const [phase, setPhase] = useState<Phase>("sealed")
  const [openResult, setOpenResult] = useState<ContainerOpenResult | null>(null)
  const [revealedIndex, setRevealedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [pickedIndices, setPickedIndices] = useState<Set<number>>(new Set())
  const [goldPicked, setGoldPicked] = useState(false)

  // Auto-reveal items one by one
  useEffect(() => {
    if (phase === "revealed" && openResult && revealedIndex < openResult.contents.length) {
      const timer = setTimeout(() => {
        setRevealedIndex(prev => prev + 1)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [phase, revealedIndex, openResult])

  const handleOpen = async () => {
    setIsLoading(true)
    setPhase("opening")
    const result = await openContainer(container)
    setOpenResult(result)
    setIsLoading(false)
    setTimeout(() => {
      setPhase("revealed")
      setRevealedIndex(0)
    }, 500)
  }

  const handlePickItem = (index: number) => {
    setPickedIndices(prev => new Set([...prev, index]))
  }

  const handlePickGold = () => {
    setGoldPicked(true)
  }

  const handleCollectAll = () => {
    if (openResult) {
      const items = containerLootToItems(openResult.contents)
      onComplete(items, openResult.goldAmount || 0, openResult.curseTriggered, openResult.curseEffect)
    }
  }

  const handleDone = () => {
    if (openResult) {
      // Only collect picked items
      const pickedContents = openResult.contents.filter((_, i) => pickedIndices.has(i))
      const items = containerLootToItems(pickedContents)
      const gold = goldPicked ? (openResult.goldAmount || 0) : 0
      onComplete(items, gold, openResult.curseTriggered, openResult.curseEffect)
    }
  }

  const allRevealed = openResult && revealedIndex >= openResult.contents.length - 1
  const allPicked = openResult && pickedIndices.size === openResult.contents.length && (openResult.goldAmount === 0 || goldPicked)
  const somePicked = pickedIndices.size > 0 || goldPicked

  const rarityColor = getRarityColor(container.rarity)

  return (
    <div className="space-y-3 p-3 bg-background/80 rounded-lg border border-border/50">
      {/* Container Header */}
      <div className={`text-center ${rarityColor}`}>
        <div className="text-base font-medium">{container.name}</div>
        <div className="text-xs text-muted-foreground capitalize">{container.rarity} {container.type}</div>
      </div>

      {/* Phase: Sealed */}
      {phase === "sealed" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {container.locked && <span className="text-amber-400">🔒 Locked</span>}
            {container.hints.aura && <span className="text-purple-400">✨ Magical</span>}
            {container.curseHint && <span className="text-red-400">⚠️ Ominous</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpen}
              disabled={isLoading}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors disabled:opacity-50
                ${container.rarity === "legendary" ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-300" :
                  container.rarity === "epic" ? "bg-purple-500/30 hover:bg-purple-500/50 text-purple-300" :
                  "bg-primary/30 hover:bg-primary/50 text-primary"}`}
            >
              {isLoading ? "Opening..." : "Open"}
            </button>
            <button onClick={onCancel} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/20 rounded">
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Phase: Opening */}
      {phase === "opening" && (
        <div className="py-3 text-center">
          <div className={`animate-pulse ${rarityColor}`}>Opening...</div>
        </div>
      )}

      {/* Phase: Revealed - Items persist and are clickable */}
      {phase === "revealed" && openResult && (
        <div className="space-y-2">
          {/* Gold - clickable */}
          {openResult.goldAmount > 0 && (
            <button
              onClick={handlePickGold}
              disabled={goldPicked}
              className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-all
                ${goldPicked
                  ? "opacity-40 bg-secondary/20 line-through"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer"}`}
            >
              <span>💰</span>
              <span>{openResult.goldAmount} gold</span>
              {goldPicked && <span className="ml-auto text-xs text-green-400">✓</span>}
            </button>
          )}

          {/* Items - clickable to pick individually */}
          {openResult.contents.map((item, index) => {
            const isRevealed = index <= revealedIndex
            const isPicked = pickedIndices.has(index)

            return (
              <button
                key={index}
                onClick={() => handlePickItem(index)}
                disabled={!isRevealed || isPicked}
                className={`w-full flex items-center gap-2 p-2 rounded text-sm text-left transition-all duration-300
                  ${!isRevealed ? "opacity-0" : ""}
                  ${isPicked ? "opacity-40 line-through" : "hover:brightness-110 cursor-pointer"}
                  ${item.rarity === "legendary" ? "bg-amber-500/10 text-amber-300" :
                    item.rarity === "epic" ? "bg-purple-500/10 text-purple-300" :
                    item.rarity === "rare" ? "bg-blue-500/10 text-blue-300" :
                    "bg-secondary/30"}`}
              >
                <span>
                  {item.type === "weapon" ? "⚔" :
                   item.type === "armor" ? "🛡" :
                   item.type === "trinket" ? "💍" :
                   item.type === "consumable" ? "🧪" :
                   item.type === "material" ? "💎" :
                   item.type === "artifact" ? "✨" :
                   item.type === "cursed" ? "💀" : "◆"}
                </span>
                <EntityText type={item.rarity === "epic" ? "legendary" : item.rarity}>
                  {item.name}
                </EntityText>
                {"attack" in item && item.attack && (
                  <span className="text-xs text-red-400">+{item.attack} ATK</span>
                )}
                {"defense" in item && item.defense && (
                  <span className="text-xs text-blue-400">+{item.defense} DEF</span>
                )}
                {"healing" in item && item.healing && (
                  <span className="text-xs text-green-400">+{item.healing} HP</span>
                )}
                {isPicked && <span className="ml-auto text-xs text-green-400">✓</span>}
              </button>
            )
          })}

          {/* Curse warning - prominent with animation */}
          {openResult.curseTriggered && allRevealed && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded animate-pulse">
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <span className="text-lg">💀</span>
                <span>CURSED!</span>
              </div>
              <div className="text-sm text-red-300/80 mt-1">{openResult.curseEffect}</div>
            </div>
          )}

          {/* Actions - show once all revealed */}
          {allRevealed && (
            <div className="flex gap-2 pt-1">
              {!somePicked ? (
                <>
                  <button
                    onClick={handleCollectAll}
                    className="flex-1 px-3 py-2 text-sm font-medium rounded bg-primary/30 hover:bg-primary/50 text-primary"
                  >
                    Take All
                  </button>
                  <button
                    onClick={onCancel}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/20 rounded"
                  >
                    Leave
                  </button>
                </>
              ) : (
                <button
                  onClick={allPicked ? handleCollectAll : handleDone}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded bg-primary/30 hover:bg-primary/50 text-primary"
                >
                  {allPicked ? "Done" : `Done (${pickedIndices.size}${goldPicked ? "+gold" : ""})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
