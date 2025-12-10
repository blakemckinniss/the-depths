"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/core/utils"

interface StatBarProps {
  label: string
  current: number
  max: number
  color?: "health" | "exp" | "enemy"
  compact?: boolean // Added compact prop for sidebar display
}

const colorStyles = {
  health: "bg-entity-heal",
  exp: "bg-entity-gold",
  enemy: "bg-entity-enemy",
}

export function StatBar({ label, current, max, color = "health", compact }: StatBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100))
  const prevValue = useRef(current)
  const [animClass, setAnimClass] = useState<"bar-damage" | "bar-heal" | null>(null)

  useEffect(() => {
    if (current !== prevValue.current) {
      // Only animate health bars (not XP)
      if (color === "health" || color === "enemy") {
        if (current < prevValue.current) {
          setAnimClass("bar-damage")
        } else if (current > prevValue.current) {
          setAnimClass("bar-heal")
        }
        // Clear animation after it completes
        const timeout = setTimeout(() => setAnimClass(null), 500)
        prevValue.current = current
        return () => clearTimeout(timeout)
      }
      prevValue.current = current
    }
  }, [current, color])

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground font-mono">
            {current}/{max}
          </span>
        </div>
        <div className={cn("h-1 bg-secondary/50 overflow-hidden", animClass)}>
          <div
            className={cn("h-full transition-all duration-300", colorStyles[color], animClass === "bar-heal" && "bar-heal")}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-12">{label}</span>
      <div className={cn("flex-1 h-1.5 bg-secondary/50 overflow-hidden", animClass === "bar-damage" && "bar-damage")}>
        <div
          className={cn("h-full transition-all duration-300", colorStyles[color], animClass === "bar-heal" && "bar-heal")}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-muted-foreground w-16 text-right font-mono">
        {current}/{max}
      </span>
    </div>
  )
}
