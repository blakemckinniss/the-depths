"use client";

import type { DungeonCard } from "@/lib/core/game-types";
import { EntityText } from "@/components/narrative/entity-text";
import { cn } from "@/lib/core/utils";

interface LocationHeaderProps {
  dungeon: DungeonCard;
  floor: number;
  currentRoom: number;
}

export function LocationHeader({ dungeon, floor, currentRoom }: LocationHeaderProps) {
  return (
    <div className="mb-3 pb-2 border-b border-border/30">
      {/* Primary info row */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground">
          <EntityText type="location">{dungeon.name}</EntityText>
        </span>
        {/* Map tier badge */}
        {dungeon.mapMetadata && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border",
            dungeon.mapMetadata.tier <= 3
              ? "text-stone-400 border-stone-600/50 bg-stone-800/30"
              : dungeon.mapMetadata.tier <= 6
                ? "text-amber-400 border-amber-600/50 bg-amber-900/20"
                : dungeon.mapMetadata.tier <= 10
                  ? "text-red-400 border-red-600/50 bg-red-900/20"
                  : "text-purple-400 border-purple-600/50 bg-purple-900/20"
          )}>
            T{dungeon.mapMetadata.tier}
            {dungeon.mapMetadata.quality > 0 && (
              <span className="text-entity-item ml-1">+{dungeon.mapMetadata.quality}%</span>
            )}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Floor <EntityText type="location">{floor}</EntityText>
          <span className="text-stone-600">/{dungeon.floors}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Room <span className="text-foreground">{currentRoom}</span>
        </span>
      </div>
      {/* Active modifiers row */}
      {dungeon.modifiers && dungeon.modifiers.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
          {dungeon.modifiers.map((mod) => (
            <span
              key={mod.id}
              className="text-[9px] px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-700/40"
              title={mod.description}
            >
              {mod.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
