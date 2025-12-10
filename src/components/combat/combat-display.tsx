"use client"

import type { Enemy, Player, EnvironmentalHazard } from "@/lib/core/game-types"
import { getLevelDiffColor } from "@/lib/mechanics/game-mechanics-ledger"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "@/components/character/stat-bar"
import { WeaknessIndicator } from "./weakness-indicator"
import { EnemyAbilityWarn } from "./enemy-ability-warn"
import { StanceSelector } from "./stance-selector"
import { ComboDisplay } from "./combo-display"
import { HazardDisplay } from "@/components/world/hazard-display"
import { getRankColor, getRankDisplayName, type RankedEnemy } from "@/lib/entity/enemy-rank-system"

interface CombatDisplayProps {
  enemy: Enemy
  player: Player
  hazard?: EnvironmentalHazard | null
  onChangeStance?: (stance: "balanced" | "aggressive" | "defensive") => void
  combatRound?: number
  disabled?: boolean
}

export function CombatDisplay({
  enemy,
  player,
  hazard,
  onChangeStance,
  combatRound = 1,
  disabled,
}: CombatDisplayProps) {
  // Check if enemy is preparing an ability (cooldown === 1 means it fires next turn)
  const preparingAbility = enemy.abilities?.find((a) => a.currentCooldown === 1)

  return (
    <div className="py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Combat Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Combat</span>
          <span className="text-xs text-stone-600">Round {combatRound}</span>
        </div>
        {onChangeStance && (
          <StanceSelector currentStance={player.stance} onChangeStance={onChangeStance} disabled={disabled} />
        )}
      </div>

      {/* Active Combo */}
      {player.combo?.activeCombo && <ComboDisplay combo={player.combo} />}

      {/* Environmental Hazard */}
      {hazard && <HazardDisplay hazard={hazard} isMitigated={hazard.mitigatedBy?.includes(player.class || "")} />}

      {/* Enemy Info */}
      <div className="py-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EntityText type="enemy" className="text-lg" entity={enemy}>
              {enemy.name}
            </EntityText>
            <span className={`text-xs ${getLevelDiffColor(player.stats.level, enemy.level)}`}>
              Lv.{enemy.level}
            </span>
            {(enemy as RankedEnemy).rank && (enemy as RankedEnemy).rank !== "normal" && (
              <span className={`text-xs px-1.5 py-0.5 rounded bg-black/30 ${getRankColor((enemy as RankedEnemy).rank)}`}>
                {getRankDisplayName((enemy as RankedEnemy).rank)}
              </span>
            )}
          </div>
          <WeaknessIndicator weakness={enemy.weakness} resistance={enemy.resistance} />
        </div>

        <StatBar label="HP" current={enemy.health} max={enemy.maxHealth} color="enemy" />

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            ATK <EntityText type="damage">{enemy.attack}</EntityText>
          </span>
          <span>
            DEF <span className="text-stone-400">{enemy.defense}</span>
          </span>
          {enemy.stance && (
            <span className="text-amber-400/70">
              {enemy.stance === "aggressive" ? "Enraged" : enemy.stance === "defensive" ? "Guarding" : "Berserk"}
            </span>
          )}
        </div>

        {/* Enemy Abilities */}
        {enemy.abilities && enemy.abilities.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {enemy.abilities.map((ability) => (
              <EntityText
                key={ability.id}
                type="ability"
                entity={ability}
                className={`text-xs px-2 py-0.5 rounded ${
                  ability.currentCooldown === 0 ? "bg-red-500/20 text-red-300" : "bg-stone-700/50 text-stone-500"
                }`}
              >
                {ability.name}
                {ability.currentCooldown > 0 && (
                  <span className="ml-1 text-stone-600">({ability.currentCooldown})</span>
                )}
              </EntityText>
            ))}
          </div>
        )}
      </div>

      {/* Enemy Ability Warning */}
      {preparingAbility && <EnemyAbilityWarn ability={preparingAbility} enemyName={enemy.name} />}
    </div>
  )
}
