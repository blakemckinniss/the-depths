"use client"

import type { GameChoice, ForesightResult, ForesightLevel } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"

interface ChoiceButtonsProps {
  choices: GameChoice[]
  disabled?: boolean
  atmosphere?: string | null
}

// Get border color based on risk level (supports both foresight and dynamic choice risk)
type RiskLevel = "safe" | "risky" | "dangerous"
function getRiskBorderClass(riskLevel: RiskLevel | undefined): string {
  switch (riskLevel) {
    case "safe":
      return "border-l-2 border-l-green-500/60"
    case "risky":
      return "border-l-2 border-l-yellow-500/60"
    case "dangerous":
      return "border-l-2 border-l-red-500/60"
    default:
      return ""
  }
}

// Get foresight indicator icon
function ForesightIndicator({ level, source }: { level: ForesightLevel; source?: string }) {
  const eyeClasses = {
    hidden: "opacity-20",
    risk: "opacity-40 text-yellow-400",
    type: "opacity-60 text-blue-400",
    partial: "opacity-80 text-purple-400",
    full: "opacity-100 text-emerald-400",
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs", eyeClasses[level])}
      title={source ? `Revealed by: ${source}` : "Outcome unknown"}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    </span>
  )
}

export function ChoiceButtons({ choices, disabled, atmosphere }: ChoiceButtonsProps) {
  if (choices.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 py-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Atmosphere text from AI */}
      {atmosphere && (
        <span className="text-muted-foreground/70 text-xs italic mb-2">
          {atmosphere}
        </span>
      )}
      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
        {disabled ? <span className="animate-pulse">The dungeon stirs...</span> : "What do you do?"}
      </span>
      {choices.map((choice, index) => {
        const foresight = choice.foresight
        const hasInsight = foresight && foresight.level !== "hidden"
        // Use direct riskLevel from choice or from foresight
        const riskLevel = (choice as { riskLevel?: RiskLevel }).riskLevel || foresight?.riskLevel

        return (
          <button
            key={choice.id}
            onClick={choice.action}
            disabled={choice.disabled || disabled}
            title={choice.tooltip || foresight?.outcomeHint}
            className={cn(
              "text-left px-3 py-2 text-sm transition-all duration-200",
              "bg-secondary/30 hover:bg-secondary/60",
              "text-foreground hover:text-primary",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary/30",
              "focus:outline-none focus:ring-1 focus:ring-primary/50",
              // Risk level border (from dynamic choice or foresight)
              getRiskBorderClass(riskLevel),
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-muted-foreground mr-2">[{index + 1}]</span>
                {choice.text}

                {/* Outcome hint text for partial+ foresight */}
                {hasInsight && foresight.outcomeHint && (
                  <div className="text-xs text-muted-foreground/80 mt-0.5 italic pl-6">
                    {foresight.outcomeHint}
                  </div>
                )}
              </div>

              {/* Foresight indicator */}
              {foresight && (
                <ForesightIndicator level={foresight.level} source={foresight.sourceName} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
