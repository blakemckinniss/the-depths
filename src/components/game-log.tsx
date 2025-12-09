"use client"

import { useEffect, useRef } from "react"
import type { LogEntry } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface GameLogProps {
  entries?: LogEntry[]
  logs?: LogEntry[]
}

export function GameLog({ entries, logs }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const logEntries = entries ?? logs ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logEntries])

  return (
    <div className="flex flex-col gap-2 py-4">
      {logEntries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "animate-in fade-in slide-in-from-bottom-2 duration-300",
            entry.type === "combat" && "pl-2",
            entry.type === "system" && "text-muted-foreground text-sm italic",
            entry.type === "loot" && "py-1",
          )}
        >
          {entry.content}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
