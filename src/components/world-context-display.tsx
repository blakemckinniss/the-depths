"use client"

import type { WorldStateContext, WorldMemory, PlayerReputation } from "@/lib/world-state"
import { cn } from "@/lib/utils"

interface WorldContextDisplayProps {
  context: WorldStateContext
  compact?: boolean
}

export function WorldContextDisplay({ context, compact }: WorldContextDisplayProps) {
  if (compact) {
    return <CompactWorldContext context={context} />
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Reputation */}
      <ReputationDisplay reputation={context.reputation} />

      {/* Active Relationships */}
      {context.activeRelationships.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notable Relationships</div>
          <div className="space-y-1">
            {context.activeRelationships.slice(0, 5).map((rel) => (
              <div key={rel.entityId} className="flex justify-between items-center">
                <span className={cn(rel.disposition > 0 ? "text-emerald-400" : "text-red-400")}>{rel.entityName}</span>
                <span className="text-xs text-muted-foreground">
                  {rel.disposition > 50
                    ? "Allied"
                    : rel.disposition > 0
                      ? "Friendly"
                      : rel.disposition > -50
                        ? "Hostile"
                        : "Enemy"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faction Standings */}
      {context.factionStandings.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Faction Standing</div>
          <div className="space-y-1">
            {context.factionStandings.map((faction) => (
              <div key={faction.name} className="flex justify-between items-center">
                <span className="text-foreground/80">{faction.name}</span>
                <div className="flex items-center gap-2">
                  <FactionBar value={faction.disposition} />
                  <span className="text-xs text-muted-foreground w-16 text-right">{faction.state}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Memories */}
      {context.recentMemories.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recent History</div>
          <div className="space-y-1">
            {context.recentMemories.slice(0, 3).map((memory) => (
              <MemoryLine key={memory.id} memory={memory} />
            ))}
          </div>
        </div>
      )}

      {/* Dungeon Mood */}
      {context.dungeonMood && (
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Dungeon State</div>
          <DungeonMoodDisplay mood={context.dungeonMood} />
        </div>
      )}
    </div>
  )
}

function CompactWorldContext({ context }: { context: WorldStateContext }) {
  return (
    <div className="space-y-2">
      {/* Titles */}
      {context.reputation.titles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {context.reputation.titles.slice(0, 3).map((title) => (
            <span key={title} className="text-xs px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded">
              {title}
            </span>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        {context.reputation.heroism > 30 && <span className="text-emerald-400">Hero {context.reputation.heroism}</span>}
        {context.reputation.infamy > 30 && <span className="text-red-400">Infamy {context.reputation.infamy}</span>}
        {context.reputation.mysticism > 30 && (
          <span className="text-purple-400">Mystic {context.reputation.mysticism}</span>
        )}
      </div>

      {/* Mood indicator */}
      {context.dungeonMood && context.dungeonMood.hostility > 50 && (
        <div className="text-xs text-red-400/60">The dungeon grows hostile...</div>
      )}
    </div>
  )
}

function ReputationDisplay({ reputation }: { reputation: PlayerReputation }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Reputation</div>

      {reputation.titles.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {reputation.titles.map((title) => (
            <span key={title} className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-full">
              {title}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <ReputationBar label="Heroism" value={reputation.heroism} color="emerald" />
        <ReputationBar label="Infamy" value={reputation.infamy} color="red" />
        <ReputationBar label="Mysticism" value={reputation.mysticism} color="purple" />
      </div>

      {reputation.knownFor.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">Known for: {reputation.knownFor.slice(-2).join(", ")}</div>
      )}
    </div>
  )
}

function ReputationBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    emerald: "bg-emerald-400",
    red: "bg-red-400",
    purple: "bg-purple-400",
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`text-${color}-400`}>{value}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClasses[color as keyof typeof colorClasses])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function FactionBar({ value }: { value: number }) {
  const normalized = (value + 100) / 2 // -100 to 100 -> 0 to 100

  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full transition-all",
          value > 30 ? "bg-emerald-400" : value > -30 ? "bg-amber-400" : "bg-red-400",
        )}
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}

function MemoryLine({ memory }: { memory: WorldMemory }) {
  const emotionColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-muted-foreground",
    complex: "text-purple-400",
  }

  return (
    <div
      className={cn(
        "text-xs pl-2 border-l-2",
        emotionColors[memory.content.emotional || "neutral"],
        memory.content.emotional === "positive"
          ? "border-emerald-400/30"
          : memory.content.emotional === "negative"
            ? "border-red-400/30"
            : "border-muted-foreground/30",
      )}
    >
      <span className="opacity-60">[{memory.type}]</span> {memory.content.subject}: {memory.content.action}
    </div>
  )
}

function DungeonMoodDisplay({ mood }: { mood: NonNullable<WorldStateContext["dungeonMood"]> }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <MoodBar label="Hostility" value={mood.hostility} color="red" />
      <MoodBar label="Awareness" value={mood.awareness} color="amber" />
      <MoodBar label="Corruption" value={mood.corruption} color="purple" />
      <MoodBar label="Activity" value={mood.activity} color="blue" />
    </div>
  )
}

function MoodBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-400",
    amber: "bg-amber-400",
    purple: "bg-purple-400",
    blue: "bg-blue-400",
  }

  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground/60">{value}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", colors[color])} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
