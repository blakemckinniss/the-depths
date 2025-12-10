"use client"

import type { NPC } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { cn } from "@/lib/core/utils"

interface NPCDialogueProps {
  npc: NPC
  dialogue: string
  options: Array<{
    id: string
    text: string
    action: "talk" | "trade" | "help" | "attack" | "leave"
    disabled?: boolean
    cost?: { gold?: number; item?: string }
  }>
  onChoice: (optionId: string) => void
  isProcessing?: boolean
}

export function NPCDialogue({ npc, dialogue, options, onChoice, isProcessing }: NPCDialogueProps) {
  return (
    <div className="my-4 pl-4 py-3 border-l-2 border-l-amber-500/50 space-y-3">
      <div className="flex items-center gap-2">
        <EntityText type="npc" entity={npc}>{npc.name}</EntityText>
        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">{npc.role}</span>
        {npc.disposition < 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">hostile</span>
        )}
        {npc.disposition > 70 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">friendly</span>
        )}
      </div>

      <p className="text-sm text-foreground/90 italic">&quot;{dialogue}&quot;</p>

      {npc.personality && <p className="text-xs text-muted-foreground">{npc.personality}</p>}

      <div className="flex flex-wrap gap-2 pt-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChoice(option.id)}
            disabled={isProcessing || option.disabled}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors",
              option.action === "attack" && "bg-red-500/20 text-red-400 hover:bg-red-500/30",
              option.action === "trade" && "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
              option.action === "help" && "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30",
              option.action === "talk" && "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700",
              option.action === "leave" && "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800",
              option.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {option.text}
            {option.cost?.gold && (
              <span className="ml-1 text-xs">
                (<EntityText type="gold">{option.cost.gold}g</EntityText>)
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
