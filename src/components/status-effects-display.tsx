"use client"

import type { StatusEffect } from "@/lib/game-types"
import { EntityText } from "./entity-text"
import { useEntityModal } from "./entity-modal-context"
import { cn } from "@/lib/utils"

interface StatusEffectsDisplayProps {
  effects: StatusEffect[]
  compact?: boolean
}

function CompactEffectBadge({ effect }: { effect: StatusEffect }) {
  const { openEntity } = useEntityModal()

  return (
    <button
      type="button"
      onClick={() => openEntity(effect)}
      className={cn(
        "px-1.5 py-0.5 text-xs rounded cursor-pointer hover:brightness-125 transition-all",
        effect.effectType === "buff" && "bg-sky-500/20 text-sky-400",
        effect.effectType === "debuff" && "bg-purple-500/20 text-purple-400",
        effect.effectType === "neutral" && "bg-zinc-500/20 text-zinc-400",
      )}
      title={`${effect.description || effect.name}${effect.duration > 0 ? ` (${effect.duration} turns)` : " (permanent)"}`}
    >
      {effect.name}
      {effect.duration > 0 && <span className="ml-1 opacity-60">{effect.duration}</span>}
    </button>
  )
}

export function StatusEffectsDisplay({ effects, compact = false }: StatusEffectsDisplayProps) {
  if (effects.length === 0) return null

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {effects.map((effect) => (
          <CompactEffectBadge key={effect.id} effect={effect} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Effects</div>
      {effects.map((effect) => (
        <div
          key={effect.id}
          className="flex items-center justify-between text-sm py-0.5"
        >
          <EntityText type={effect.effectType === "debuff" ? "curse" : "blessing"} entity={effect}>{effect.name}</EntityText>
          <span className="text-xs text-muted-foreground">{effect.duration === -1 ? "∞" : `${effect.duration}t`}</span>
        </div>
      ))}
    </div>
  )
}
