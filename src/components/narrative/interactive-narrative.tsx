"use client"

import { useState } from "react"
import { cn } from "@/lib/core/utils"
import type { ParsedNarrative, EnvironmentalEntity, Player } from "@/lib/core/game-types"
import { getAvailableInteractions, getEntityDisplayType, getDangerColor } from "@/lib/world/environmental-system"
import { EntityText } from "./entity-text"

interface InteractiveNarrativeProps {
  narrative: ParsedNarrative
  entities: EnvironmentalEntity[]
  player: Player
  onInteract: (entityId: string, interactionId: string) => void
  disabled?: boolean
}

export function InteractiveNarrative({
  narrative,
  entities,
  player,
  onInteract,
  disabled = false,
}: InteractiveNarrativeProps) {
  const [activeEntity, setActiveEntity] = useState<string | null>(null)
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  return (
    <span className="interactive-narrative">
      {narrative.segments.map((segment, idx) => {
        if (segment.type === "text") {
          return <span key={idx}>{segment.content}</span>
        }

        const entity = segment.entityRef ? entityMap.get(segment.entityRef) : null
        if (!entity || entity.consumed) {
          // Consumed entities show as faded text
          return (
            <span key={idx} className="text-muted-foreground/50 line-through">
              {segment.content}
            </span>
          )
        }

        const isActive = activeEntity === entity.id
        const displayType = getEntityDisplayType(entity.entityClass)

        return (
          <span key={idx} className="relative inline-block">
            <button
              onClick={() => setActiveEntity(isActive ? null : entity.id)}
              disabled={disabled}
              className={cn(
                "inline cursor-pointer hover:underline focus:outline-none transition-all duration-150",
                isActive && "underline",
              )}
            >
              <EntityText type={displayType}>{segment.content}</EntityText>
            </button>

            {/* Interaction popup */}
            {isActive && !disabled && (
              <InteractionPopup
                entity={entity}
                player={player}
                onInteract={(interactionId) => {
                  onInteract(entity.id, interactionId)
                  setActiveEntity(null)
                }}
                onClose={() => setActiveEntity(null)}
              />
            )}
          </span>
        )
      })}
    </span>
  )
}

interface InteractionPopupProps {
  entity: EnvironmentalEntity
  player: Player
  onInteract: (interactionId: string) => void
  onClose: () => void
}

function InteractionPopup({ entity, player, onInteract, onClose }: InteractionPopupProps) {
  const interactions = getAvailableInteractions(entity, player)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-background/95 backdrop-blur-sm border border-border/50 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="px-2 py-1.5 border-b border-border/30">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{entity.entityClass}</span>
        </div>

        <div className="py-1">
          {interactions.map(({ interaction, available, reason }) => (
            <button
              key={interaction.id}
              onClick={() => available && onInteract(interaction.id)}
              disabled={!available}
              className={cn(
                "w-full text-left px-2 py-1 text-sm flex items-center gap-2 transition-colors",
                available
                  ? "hover:bg-secondary/50 text-foreground"
                  : "opacity-40 cursor-not-allowed text-muted-foreground",
              )}
              title={reason}
            >
              <span className={cn("text-[10px]", getDangerColor(interaction.dangerLevel))}>
                {interaction.dangerLevel === "safe" && "●"}
                {interaction.dangerLevel === "risky" && "◆"}
                {interaction.dangerLevel === "dangerous" && "▲"}
              </span>
              <span>{interaction.label}</span>
              {interaction.hint && available && (
                <span className="ml-auto text-xs text-muted-foreground italic">{interaction.hint}</span>
              )}
              {!available && reason && <span className="ml-auto text-xs text-muted-foreground">[{reason}]</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// Simple narrative text with entity highlighting (non-interactive)
export function HighlightedNarrative({
  narrative,
  entities,
}: {
  narrative: ParsedNarrative
  entities: EnvironmentalEntity[]
}) {
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  return (
    <span>
      {narrative.segments.map((segment, idx) => {
        if (segment.type === "text") {
          return <span key={idx}>{segment.content}</span>
        }

        const entity = segment.entityRef ? entityMap.get(segment.entityRef) : null
        if (!entity) {
          return <span key={idx}>{segment.content}</span>
        }

        const displayType = getEntityDisplayType(entity.entityClass)
        return (
          <EntityText key={idx} type={displayType}>
            {segment.content}
          </EntityText>
        )
      })}
    </span>
  )
}
