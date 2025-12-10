"use client"

import type { Shrine, Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { cn } from "@/lib/core/utils"

interface ShrineInteractionProps {
  shrine: Shrine
  player: Player
  onInteract: (choice: "accept" | "decline" | "desecrate") => void
  isProcessing?: boolean
  aiDescription?: string
}

export function ShrineInteraction({ shrine, player, onInteract, isProcessing, aiDescription }: ShrineInteractionProps) {
  const canAffordGold = !shrine.cost?.gold || player.stats.gold >= shrine.cost.gold
  const canAffordHealth = !shrine.cost?.health || player.stats.health > shrine.cost.health

  return (
    <div className="my-4 pl-4 py-3 border-l-2 border-l-violet-500/50 space-y-3">
      <div className="flex items-center gap-2">
        <EntityText type="shrine">{shrine.name}</EntityText>
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
      </div>

      <p className="text-sm text-muted-foreground">{aiDescription || shrine.description}</p>

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
