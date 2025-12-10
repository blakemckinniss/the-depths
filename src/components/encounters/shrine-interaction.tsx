"use client"

import type { Shrine, Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { cn } from "@/lib/core/utils"
import { calculateForesight } from "@/lib/mechanics/foresight-system"

interface ShrineInteractionProps {
  shrine: Shrine
  player: Player
  onInteract: (choice: "accept" | "decline" | "desecrate" | "seek_blessing") => void
  isProcessing?: boolean
  aiDescription?: string
  onCreativeEvent?: () => void
}

export function ShrineInteraction({ shrine, player, onInteract, isProcessing, aiDescription, onCreativeEvent }: ShrineInteractionProps) {
  const canAffordGold = !shrine.cost?.gold || player.stats.gold >= shrine.cost.gold
  const canAffordHealth = !shrine.cost?.health || player.stats.health > shrine.cost.health
  const showCreativeOption = shrine.shrineType === "unknown" || shrine.shrineType === "dark"

  // Calculate foresight for shrine encounter
  const foresight = calculateForesight(
    player,
    "shrine_choice",
    "interact",
    ["shrine", shrine.shrineType, "magical"]
  )

  // Determine what to show based on foresight
  const showRiskLevel = foresight.level !== "hidden"
  const showOutcomeHint = foresight.level === "partial" || foresight.level === "full"

  return (
    <div className="my-4 pl-4 py-3 border-l-2 border-l-violet-500/50 space-y-3">
      <div className="flex items-center gap-2">
        <EntityText type="shrine">{shrine.name}</EntityText>
        {showRiskLevel ? (
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              shrine.riskLevel === "safe" && "bg-green-500/20 text-green-400",
              shrine.riskLevel === "moderate" && "bg-yellow-500/20 text-yellow-400",
              shrine.riskLevel === "dangerous" && "bg-orange-500/20 text-orange-400",
              shrine.riskLevel === "deadly" && "bg-red-500/20 text-red-400",
            )}
          >
            {shrine.riskLevel}
          </span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800/50 text-stone-500">
            ???
          </span>
        )}
        {/* Foresight source indicator */}
        {foresight.level !== "hidden" && foresight.source && (
          <span className={`text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
            foresight.level === "full" ? "bg-emerald-900/30 text-emerald-400" :
            foresight.level === "partial" ? "bg-purple-900/30 text-purple-400" :
            "bg-yellow-900/30 text-yellow-400"
          }`}>
            <span className="w-1 h-1 rounded-full bg-current" />
            {foresight.source === "racial" ? "Keen Senses" :
             foresight.source === "ability" ? "Divine Insight" :
             foresight.source === "effect" ? "Foresight" :
             foresight.source === "item" ? "Item" :
             "Arcana"}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{aiDescription || shrine.description}</p>

      {/* Foresight outcome hint */}
      {showOutcomeHint && foresight.outcomeHint && (
        <p className="text-xs text-purple-400/80 italic">
          {foresight.outcomeHint}
        </p>
      )}

      {shrine.cost && (
        <div className="text-sm">
          <span className="text-muted-foreground">Requires: </span>
          {shrine.cost.gold && (
            <EntityText type={canAffordGold ? "gold" : "damage"}>{shrine.cost.gold} gold</EntityText>
          )}
          {shrine.cost.gold && shrine.cost.health && " and "}
          {shrine.cost.health && (
            <EntityText type={canAffordHealth ? "heal" : "damage"}>{shrine.cost.health} HP</EntityText>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onInteract("accept")}
          disabled={isProcessing || !canAffordGold || !canAffordHealth}
          className={cn(
            "px-3 py-1.5 text-sm transition-colors",
            canAffordGold && canAffordHealth
              ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
              : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed",
          )}
        >
          Make Offering
        </button>

        {shrine.shrineType === "dark" && (
          <button
            onClick={() => onInteract("desecrate")}
            disabled={isProcessing}
            className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Desecrate
          </button>
        )}

        {(showCreativeOption || onCreativeEvent) && (
          <button
            onClick={() => onCreativeEvent ? onCreativeEvent() : onInteract("seek_blessing")}
            disabled={isProcessing}
            className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors border border-amber-500/30"
          >
            Commune
          </button>
        )}

        <button
          onClick={() => onInteract("decline")}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  )
}
