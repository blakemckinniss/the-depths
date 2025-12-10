"use client"

import type { PathOption } from "@/lib/core/game-types"
import { cn } from "@/lib/core/utils"

interface PathSelectProps {
  paths: PathOption[]
  onSelectPath: (path: PathOption) => void
  disabled?: boolean
}

const dangerColors: Record<PathOption["danger"], string> = {
  safe: "text-emerald-400",
  moderate: "text-amber-400",
  dangerous: "text-red-400",
  unknown: "text-purple-400",
}

export function PathSelect({ paths, onSelectPath, disabled }: PathSelectProps) {
  return (
    <div className="space-y-1">
      {paths.map((path, index) => (
        <button
          key={path.id}
          onClick={() => onSelectPath(path)}
          disabled={disabled}
          className={cn(
            "w-full text-left px-3 py-2 text-sm transition-all duration-200",
            "bg-secondary/30 hover:bg-secondary/60",
            "text-foreground hover:text-primary",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary/30",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
          )}
        >
          <span className="text-muted-foreground mr-2">[{index + 1}]</span>
          <span>
            {path.roomType === "mystery" ? (
              <span className="text-purple-400 animate-pulse">??? Unknown path</span>
            ) : path.preview.length > 50 ? (
              path.preview.slice(0, 50) + "..."
            ) : (
              path.preview
            )}
          </span>
          <span className={cn("ml-2", dangerColors[path.danger])}>•</span>
        </button>
      ))}
    </div>
  )
}
