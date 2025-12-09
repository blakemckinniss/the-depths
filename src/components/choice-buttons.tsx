"use client"

import type { GameChoice } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface ChoiceButtonsProps {
  choices: GameChoice[]
  disabled?: boolean
}

export function ChoiceButtons({ choices, disabled }: ChoiceButtonsProps) {
  if (choices.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 py-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
        {disabled ? <span className="animate-pulse">The dungeon stirs...</span> : "What do you do?"}
      </span>
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          onClick={choice.action}
          disabled={choice.disabled || disabled}
          title={choice.tooltip}
          className={cn(
            "text-left px-3 py-2 text-sm transition-all duration-200",
            "bg-secondary/30 hover:bg-secondary/60",
            "text-foreground hover:text-primary",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary/30",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
          )}
        >
          <span className="text-muted-foreground mr-2">[{index + 1}]</span>
          {choice.text}
        </button>
      ))}
    </div>
  )
}
