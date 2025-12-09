"use client"

import type { AmbientEffect } from "@/lib/environmental-effects"
import type { EnhancedStatusEffect } from "@/lib/effect-system"
import { cn } from "@/lib/utils"

interface AmbientEffectDisplayProps {
  ambientEffect: AmbientEffect
  appliedEffect?: EnhancedStatusEffect
  narration?: {
    introduction: string
    sensation: string
    warning?: string
    resistanceNarration?: string
  }
  wasResisted?: boolean
  wasMitigated?: boolean
}

export function AmbientEffectDisplay({
  ambientEffect,
  appliedEffect,
  narration,
  wasResisted,
  wasMitigated,
}: AmbientEffectDisplayProps) {
  const getEnvironmentIcon = (envType: string) => {
    switch (envType) {
      case "crypt":
        return "💀"
      case "swamp":
        return "🌿"
      case "volcano":
        return "🔥"
      case "ice_cave":
        return "❄️"
      case "abyss":
        return "👁️"
      case "temple":
        return "✨"
      case "nightmare":
        return "🌙"
      default:
        return "⚠️"
    }
  }

  return (
    <div
      className={cn(
        "my-2 px-3 py-2 rounded-sm border-l-2 transition-all",
        wasResisted && "border-l-emerald-500/50 bg-emerald-500/5",
        wasMitigated && "border-l-amber-500/50 bg-amber-500/5",
        !wasResisted && !wasMitigated && "border-l-red-500/50 bg-red-500/5",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{getEnvironmentIcon(ambientEffect.environmentType)}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {ambientEffect.environmentType.replace("_", " ")}
        </span>
        {wasResisted && <span className="ml-auto text-xs text-emerald-400">Resisted</span>}
        {wasMitigated && !wasResisted && <span className="ml-auto text-xs text-amber-400">Mitigated</span>}
      </div>

      {/* Effect name */}
      <div className="text-sm font-medium text-foreground mb-1">{ambientEffect.name}</div>

      {/* Narration */}
      <div className="text-xs text-muted-foreground leading-relaxed">
        {wasResisted
          ? narration?.resistanceNarration || `Your training helps you resist the ${ambientEffect.name.toLowerCase()}.`
          : narration?.introduction || ambientEffect.description}
      </div>

      {/* Applied effect indicator */}
      {appliedEffect && !wasResisted && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded",
              appliedEffect.effectType === "debuff" && "bg-red-500/20 text-red-400",
              appliedEffect.effectType === "buff" && "bg-emerald-500/20 text-emerald-400",
            )}
          >
            {appliedEffect.name}
          </span>
          {appliedEffect.durationRemaining > 0 && (
            <span className="text-muted-foreground">
              {appliedEffect.durationRemaining} {appliedEffect.durationType}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for sidebar
export function AmbientEffectBadge({
  environmentType,
  effectCount,
}: {
  environmentType: string
  effectCount: number
}) {
  if (effectCount === 0) return null

  const getColor = (envType: string) => {
    switch (envType) {
      case "crypt":
        return "text-purple-400"
      case "swamp":
        return "text-green-400"
      case "volcano":
        return "text-orange-400"
      case "ice_cave":
        return "text-cyan-400"
      case "abyss":
        return "text-violet-400"
      case "temple":
        return "text-amber-400"
      case "nightmare":
        return "text-pink-400"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className={cn("text-xs flex items-center gap-1", getColor(environmentType))}>
      <span className="opacity-70">{environmentType.replace("_", " ")}</span>
      <span className="bg-current/20 px-1 rounded text-[10px]">{effectCount}</span>
    </div>
  )
}
