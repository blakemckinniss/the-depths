"use client"

import { useState, useEffect } from "react"
import { EntityText } from "./entity-text"
import type { Item } from "@/lib/game-types"
import {
  type LootContainer,
  type ContainerExamineResult,
  type ContainerOpenResult,
  examineContainer,
  openContainer,
  containerLootToItems,
  getRarityColor,
  getRarityGlow,
} from "@/lib/ai-drops-system"

interface LootContainerRevealProps {
  container: LootContainer
  onComplete: (items: Item[], curseTriggered?: boolean, curseEffect?: string) => void
  onCancel: () => void
}

type Phase = "sealed" | "examining" | "examined" | "opening" | "revealing" | "complete"

export function LootContainerReveal({ container, onComplete, onCancel }: LootContainerRevealProps) {
  const [phase, setPhase] = useState<Phase>("sealed")
  const [examineResult, setExamineResult] = useState<ContainerExamineResult | null>(null)
  const [openResult, setOpenResult] = useState<ContainerOpenResult | null>(null)
  const [revealedIndex, setRevealedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)

  // Auto-reveal items one by one
  useEffect(() => {
    if (phase === "revealing" && openResult && revealedIndex < openResult.contents.length) {
      const timer = setTimeout(() => {
        setRevealedIndex(prev => prev + 1)
      }, 600) // Delay between reveals
      return () => clearTimeout(timer)
    } else if (phase === "revealing" && openResult && revealedIndex >= openResult.contents.length) {
      // All items revealed
      setTimeout(() => setPhase("complete"), 500)
    }
  }, [phase, revealedIndex, openResult])

  const handleExamine = async () => {
    setIsLoading(true)
    setPhase("examining")
    const result = await examineContainer(container)
    setExamineResult(result)
    setPhase("examined")
    setIsLoading(false)
  }

  const handleOpen = async () => {
    setIsLoading(true)
    setPhase("opening")
    const result = await openContainer(container)
    setOpenResult(result)
    setIsLoading(false)
    // Start reveal sequence
    setTimeout(() => {
      setPhase("revealing")
      setRevealedIndex(0)
    }, 1500) // Let opening narrative sink in
  }

  const handleCollect = () => {
    if (openResult) {
      const items = containerLootToItems(openResult.contents)
      onComplete(items, openResult.curseTriggered, openResult.curseEffect)
    }
  }

  const rarityColor = getRarityColor(container.rarity)
  const rarityGlow = getRarityGlow(container.rarity)

  return (
    <div className="space-y-4 p-4 bg-background/80 rounded-lg border border-border/50">
      {/* Container Header */}
      <div className={`text-center ${rarityColor}`}>
        <div className={`text-lg font-medium ${rarityGlow ? `shadow-lg ${rarityGlow}` : ""}`}>
          {container.name}
        </div>
        <div className="text-xs text-muted-foreground capitalize">{container.rarity} {container.type}</div>
      </div>

      {/* Phase: Sealed Container */}
      {(phase === "sealed" || phase === "examining") && (
        <div className="space-y-3">
          <p className="text-sm text-foreground/80 italic">{container.appearance}</p>

          {/* Hints */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Weight: {container.hints.weight}</div>
            <div>Sound: {container.hints.sound}</div>
            {container.hints.smell && <div>Smell: {container.hints.smell}</div>}
            {container.hints.aura && <div className="text-purple-400">Aura: {container.hints.aura}</div>}
          </div>

          {container.locked && (
            <div className="text-amber-400 text-xs">Locked: {container.lockDescription}</div>
          )}

          {container.curseHint && (
            <div className="text-red-400/70 text-xs italic">{container.curseHint}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExamine}
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm bg-secondary/40 hover:bg-secondary/60
                rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? "Examining..." : "Examine Closely"}
            </button>
            <button
              onClick={handleOpen}
              disabled={isLoading}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors disabled:opacity-50
                ${container.rarity === "legendary"
                  ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-300"
                  : container.rarity === "epic"
                    ? "bg-purple-500/30 hover:bg-purple-500/50 text-purple-300"
                    : "bg-primary/30 hover:bg-primary/50 text-primary"
                }`}
            >
              Open Now!
            </button>
          </div>

          <button
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Leave it alone
          </button>
        </div>
      )}

      {/* Phase: Examined (shows anticipation) */}
      {phase === "examined" && examineResult && (
        <div className="space-y-3">
          <p className="text-sm text-foreground/90">{examineResult.detailedDescription}</p>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Estimated value:</span>
            <span className={`text-sm font-medium ${
              examineResult.qualityHint === "priceless" ? "text-amber-400" :
              examineResult.qualityHint === "precious" ? "text-purple-400" :
              examineResult.qualityHint === "valuable" ? "text-blue-400" :
              examineResult.qualityHint === "modest" ? "text-green-400" :
              "text-zinc-500"
            }`}>
              {examineResult.qualityHint}
            </span>
          </div>

          {examineResult.dangerWarning && (
            <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded">
              {examineResult.dangerWarning}
            </div>
          )}

          {examineResult.loreFragment && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {examineResult.loreFragment}
            </p>
          )}

          <p className={`text-sm font-medium ${rarityColor}`}>
            {examineResult.anticipationText}
          </p>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleOpen}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded transition-all disabled:opacity-50
                ${container.rarity === "legendary"
                  ? "bg-amber-500/40 hover:bg-amber-500/60 text-amber-200 hover:scale-[1.02]"
                  : container.rarity === "epic"
                    ? "bg-purple-500/40 hover:bg-purple-500/60 text-purple-200"
                    : "bg-primary/40 hover:bg-primary/60 text-primary-foreground"
                }`}
            >
              OPEN THE {container.type.toUpperCase()}!
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Phase: Opening (suspense) */}
      {phase === "opening" && (
        <div className="space-y-4 py-6 text-center">
          <div className={`text-2xl animate-pulse ${rarityColor}`}>
            {container.rarity === "legendary" ? "..." :
             container.rarity === "epic" ? "..." : "..."}
          </div>
          <p className="text-sm text-foreground/70 italic">
            {isLoading ? "The moment of truth approaches..." : openResult?.openingNarrative}
          </p>
        </div>
      )}

      {/* Phase: Revealing (items appear one by one) */}
      {phase === "revealing" && openResult && (
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 italic text-center">
            {openResult.revealMoment}
          </p>

          {/* Jackpot celebration */}
          {openResult.jackpotMoment && revealedIndex > 0 && (
            <div className="text-center py-2 bg-amber-500/20 rounded animate-pulse">
              <span className="text-amber-400 font-bold">{openResult.jackpotMoment}</span>
            </div>
          )}

          {/* Items revealed one by one */}
          <div className="space-y-2">
            {openResult.contents.map((item, index) => (
              <div
                key={index}
                className={`transition-all duration-500 ${
                  index <= revealedIndex
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {index <= revealedIndex && (
                  <div className={`flex items-center gap-3 p-2 rounded
                    ${item.isJackpot ? "bg-amber-500/20 border border-amber-500/40" :
                      item.rarity === "legendary" ? "bg-amber-500/10" :
                      item.rarity === "epic" ? "bg-purple-500/10" :
                      item.rarity === "rare" ? "bg-blue-500/10" :
                      "bg-secondary/30"
                    }`}
                  >
                    <span className="text-lg">
                      {item.type === "weapon" ? "⚔" :
                       item.type === "armor" ? "🛡" :
                       item.type === "gold" ? "💰" :
                       item.type === "gem" ? "💎" :
                       item.type === "artifact" ? "✨" :
                       item.type === "cursed" ? "💀" : "◆"}
                    </span>
                    <div className="flex-1">
                      <EntityText type={item.rarity === "epic" ? "legendary" : item.rarity}>
                        {item.name}
                      </EntityText>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="text-xs text-entity-gold">{item.value}g</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Curse trigger */}
          {openResult.curseTriggered && revealedIndex >= openResult.contents.length - 1 && (
            <div className="text-center py-2 bg-red-500/20 rounded border border-red-500/40">
              <span className="text-red-400">{openResult.curseEffect}</span>
            </div>
          )}
        </div>
      )}

      {/* Phase: Complete */}
      {phase === "complete" && openResult && (
        <div className="space-y-4">
          <p className="text-sm text-center text-muted-foreground italic">
            {openResult.afterglow}
          </p>

          {/* Summary */}
          <div className="text-center text-xs text-muted-foreground">
            Found {openResult.contents.length} item{openResult.contents.length !== 1 ? "s" : ""}
            {openResult.contents.some(i => i.isJackpot) && " including a jackpot!"}
          </div>

          <button
            onClick={handleCollect}
            className={`w-full px-4 py-3 text-sm font-medium rounded transition-colors
              ${container.rarity === "legendary"
                ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-300"
                : "bg-primary/30 hover:bg-primary/50 text-primary"
              }`}
          >
            Collect All
          </button>
        </div>
      )}
    </div>
  )
}
