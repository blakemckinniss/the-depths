"use client"

import type { Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "./stat-bar"

interface StatsViewProps {
  player: Player
  floor: number
  currentRoom: number
}

export function StatsView({ player, floor, currentRoom }: StatsViewProps) {
  const { stats, equipment } = player
  const totalAttack = stats.attack + (equipment.weapon?.stats?.attack || 0)
  const totalDefense = stats.defense + (equipment.armor?.stats?.defense || 0)

  return (
    <div className="py-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg text-primary mb-4">{player.name}</h2>
        <div className="space-y-3">
          <StatBar label="Health" current={stats.health} max={stats.maxHealth} color="health" />
          <StatBar label="Experience" current={stats.experience} max={stats.experienceToLevel} color="exp" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-muted-foreground text-sm">Level</span>
          <div className="text-2xl">
            <EntityText type="player">{stats.level}</EntityText>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Gold</span>
          <div className="text-2xl">
            <EntityText type="gold">{stats.gold}</EntityText>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-muted-foreground mb-3">Combat Statistics</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Attack</span>
            <span>{stats.attack}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weapon Bonus</span>
            <span className="text-entity-weapon">+{equipment.weapon?.stats?.attack || 0}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Attack</span>
            <EntityText type="damage">{totalAttack}</EntityText>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Defense</span>
            <span>{stats.defense}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Armor Bonus</span>
            <span className="text-entity-armor">+{equipment.armor?.stats?.defense || 0}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Defense</span>
            <EntityText type="armor">{totalDefense}</EntityText>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-muted-foreground mb-3">Dungeon Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Floor</span>
            <EntityText type="location">{floor}</EntityText>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rooms Explored</span>
            <span>{currentRoom}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
