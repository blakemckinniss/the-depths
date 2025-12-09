"use client"

import { useState, useEffect } from "react"
import type { EffectCombo } from "@/lib/effect-combo-system"
import { cn } from "@/lib/utils"

interface EffectComboDisplayProps {
  combo: EffectCombo
  narration?: {
    comboName: string
    narration: string
    visualEffect: string
    soundEffect: string
    aftermath: string
  }
  onComplete?: () => void
}

export function EffectComboDisplay({ combo, narration, onComplete }: EffectComboDisplayProps) {
  const [phase, setPhase] = useState<"buildup" | "clash" | "result" | "fade">("buildup")

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("clash"), 600),
      setTimeout(() => setPhase("result"), 1200),
      setTimeout(() => setPhase("fade"), 3000),
      setTimeout(() => onComplete?.(), 3500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div
      className={cn(
        "relative my-4 overflow-hidden rounded-sm transition-all duration-500",
        phase === "buildup" && "bg-secondary/20",
        phase === "clash" && "bg-amber-500/20 animate-pulse",
        phase === "result" && "bg-primary/10",
        phase === "fade" && "opacity-50",
      )}
    >
      {/* Combo header */}
      <div className="flex items-center justify-center gap-3 py-2 border-b border-primary/20">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Elemental Reaction</span>
      </div>

      {/* Combo visualization */}
      <div className="flex items-center justify-center gap-4 py-4 px-3">
        {/* Effect 1 */}
        <div
          className={cn(
            "text-center transition-all duration-300",
            phase === "buildup" && "translate-x-4 opacity-70",
            phase === "clash" && "translate-x-0 scale-110",
            phase === "result" && "opacity-50 scale-90",
          )}
        >
          <div className="text-lg font-medium text-amber-400">{combo.trigger1.element || combo.trigger1.tag}</div>
        </div>

        {/* Clash indicator */}
        <div
          className={cn(
            "text-2xl transition-all duration-300",
            phase === "buildup" && "opacity-30",
            phase === "clash" && "text-amber-400 scale-150 animate-spin-slow",
            phase === "result" && "text-primary",
          )}
        >
          {phase === "clash" ? "⚡" : "+"}
        </div>

        {/* Effect 2 */}
        <div
          className={cn(
            "text-center transition-all duration-300",
            phase === "buildup" && "-translate-x-4 opacity-70",
            phase === "clash" && "translate-x-0 scale-110",
            phase === "result" && "opacity-50 scale-90",
          )}
        >
          <div className="text-lg font-medium text-cyan-400">{combo.trigger2.element || combo.trigger2.tag}</div>
        </div>
      </div>

      {/* Result */}
      <div
        className={cn(
          "text-center pb-3 transition-all duration-500",
          phase !== "result" && phase !== "fade" && "opacity-0 scale-90",
          (phase === "result" || phase === "fade") && "opacity-100 scale-100",
        )}
      >
        <div className="text-sm font-bold text-primary mb-1">{narration?.comboName || combo.name}</div>
        <div className="text-xs text-muted-foreground px-4 leading-relaxed">
          {narration?.narration || combo.narrative}
        </div>
      </div>
    </div>
  )
}

// Inline combo indicator for game log
export function InlineComboIndicator({
  comboName,
  elements,
}: {
  comboName: string
  elements: [string, string]
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded text-xs">
      <span className="text-amber-400">{elements[0]}</span>
      <span className="text-muted-foreground">+</span>
      <span className="text-cyan-400">{elements[1]}</span>
      <span className="text-muted-foreground">=</span>
      <span className="text-primary font-medium">{comboName}</span>
    </span>
  )
}
