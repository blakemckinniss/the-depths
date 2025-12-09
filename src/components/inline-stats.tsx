"use client"

import type { Player } from "@/lib/game-types"
import { EntityText } from "./entity-text"
import { StatBar } from "./stat-bar"

interface InlineStatsProps {
  player: Player
}

export function InlineStats({ player }: InlineStatsProps) {
  const { stats, equipment } = player
  const totalAttack = stats.attack + (equipment.weapon?.stats?.attack || 0)
  const totalDefense = stats.defense + (equipment.armor?.stats?.defense || 0)

  return (
    <div className="py-3 space-y-2 animate-in fade-in duration-300">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">— Status —</div>
      <StatBar label="HP" current={stats.health} max={stats.maxHealth} color="health" />
      <StatBar label="EXP" current={stats.experience} max={stats.experienceToLevel} color="exp" />
      <div className="flex gap-4 text-sm pt-1">
        <span>
          <span className="text-muted-foreground">LVL</span> <EntityText type="player">{stats.level}</EntityText>
        </span>
        <span>
          <span className="text-muted-foreground">ATK</span> <EntityText type="damage">{totalAttack}</EntityText>
        </span>
        <span>
          <span className="text-muted-foreground">DEF</span> <EntityText type="armor">{totalDefense}</EntityText>
        </span>
        <span>
          <span className="text-muted-foreground">GOLD</span> <EntityText type="gold">{stats.gold}</EntityText>
        </span>
      </div>
    </div>
  )
}
