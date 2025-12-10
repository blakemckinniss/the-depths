"use client"

import { useState, useEffect } from "react"
import type { ChaosEvent, ChaosEffect } from "@/lib/world/chaos-system"
import { cn } from "@/lib/core/utils"

interface ChaosEventDisplayProps {
  event: ChaosEvent
  isNew?: boolean
}

const severityColors = {
  minor: "text-amber-400 border-amber-400/30 bg-amber-950/20",
  moderate: "text-orange-400 border-orange-400/30 bg-orange-950/20",
  major: "text-red-400 border-red-400/30 bg-red-950/20",
  catastrophic: "text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-950/30 animate-pulse",
}

const typeIcons: Record<string, string> = {
  environmental: "🌋",
  invasion: "⚔️",
  magical: "✨",
  factional: "⚔️",
  cosmic: "🌑",
  personal: "👁️",
}

export function ChaosEventDisplay({ event, isNew }: ChaosEventDisplayProps) {
  const [expanded, setExpanded] = useState(isNew)
  const [showEffects, setShowEffects] = useState(false)

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setExpanded(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <div
      className={cn(
        "border rounded px-3 py-2 transition-all duration-500",
        severityColors[event.severity],
        isNew && "animate-in slide-in-from-top-4 duration-700",
        expanded ? "max-h-96" : "max-h-12 overflow-hidden",
      )}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[event.type]}</span>
          <span className="font-medium text-sm">{event.name}</span>
          <span className="text-xs opacity-60 uppercase">{event.severity}</span>
        </div>
        <div className="flex items-center gap-2">
          {event.duration > 0 && <span className="text-xs opacity-60">{event.duration - event.turnsActive} turns</span>}
          <span className="text-xs opacity-40">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          <p className="italic opacity-80">
            {isNew
              ? event.narrative.announcement
              : event.narrative.ongoing[Math.min(event.turnsActive, event.narrative.ongoing.length - 1)]}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowEffects(!showEffects)
            }}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            {showEffects ? "Hide Effects" : "Show Effects"}
          </button>

          {showEffects && (
            <div className="space-y-1 pl-2 border-l border-current/20">
              {event.effects.map((effect, i) => (
                <ChaosEffectLine key={i} effect={effect} />
              ))}
            </div>
          )}

          {event.resolution && (
            <div className="text-xs opacity-60 mt-2">
              Resolution:{" "}
              {event.resolution.type === "timed"
                ? "Wait it out"
                : event.resolution.type === "kill_target"
                  ? `Slay ${event.resolution.target}`
                  : event.resolution.type === "reach_location"
                    ? `Reach ${event.resolution.target}`
                    : "Unknown"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChaosEffectLine({ effect }: { effect: ChaosEffect }) {
  const effectColors: Record<string, string> = {
    stat_modifier: "text-blue-400",
    spawn_enemies: "text-red-400",
    environmental_hazard: "text-orange-400",
    resource_drain: "text-amber-400",
    faction_shift: "text-purple-400",
    escape_route: "text-yellow-400",
    visibility: "text-gray-400",
    mutation: "text-green-400",
    temporal: "text-cyan-400",
    planar: "text-fuchsia-400",
  }

  return (
    <div className={cn("text-xs", effectColors[effect.type] || "text-foreground/60")}>
      <span className="opacity-60">[{effect.target}]</span> {effect.narration}
    </div>
  )
}

// Compact chaos indicator for sidebar
export function ChaosIndicator({ events }: { events: ChaosEvent[] }) {
  if (events.length === 0) return null

  const worstSeverity = events.reduce(
    (worst, e) => {
      const order = ["minor", "moderate", "major", "catastrophic"]
      return order.indexOf(e.severity) > order.indexOf(worst) ? e.severity : worst
    },
    "minor" as ChaosEvent["severity"],
  )

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1 rounded text-xs", severityColors[worstSeverity])}>
      <span className="animate-pulse">⚠</span>
      <span>
        {events.length} Active Event{events.length > 1 ? "s" : ""}
      </span>
    </div>
  )
}

// Full chaos panel for displaying all active events
export function ChaosPanel({
  events,
  ongoingNarrative,
}: {
  events: ChaosEvent[]
  ongoingNarrative: string[]
}) {
  if (events.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Chaos</div>

      {events.map((event) => (
        <ChaosEventDisplay key={event.id} event={event} />
      ))}

      {ongoingNarrative.length > 0 && (
        <div className="text-xs text-muted-foreground/60 italic pl-2 border-l border-muted-foreground/20">
          {ongoingNarrative[ongoingNarrative.length - 1]}
        </div>
      )}
    </div>
  )
}
