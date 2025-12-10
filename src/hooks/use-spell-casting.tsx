"use client"

import { useCallback, type ReactNode } from "react"
import type { GameState, Enemy, Item, StatusEffect, Spell, SpellBook } from "@/lib/core/game-types"
import type { Dispatch } from "react"
import type { GameAction } from "@/contexts/game-reducer"
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system"
import { castSpell, applySpellCast, applySpellDamageToEnemy, type CastContext } from "@/lib/magic/spell-execution"
import { learnSpellFromItem, learnSpellFromShrine, type ShrineSpellGrant } from "@/lib/magic/spell-acquisition"
import { tickSpellCooldowns } from "@/lib/magic/spell-system"
import { EntityText } from "@/components/narrative/entity-text"

type AddLogFn = (message: ReactNode, category: LogCategory) => void

interface UseSpellCastingOptions {
  state: GameState
  dispatch: Dispatch<GameAction>
  logger: GameLogger
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void
  addLog: AddLogFn
}

export function useSpellCasting({
  state,
  dispatch,
  logger,
  updateRunStats,
  addLog,
}: UseSpellCastingOptions) {
  /**
   * Cast a spell in combat or exploration
   */
  const handleCastSpell = useCallback(
    (spell: Spell) => {
      const context: CastContext = {
        inCombat: state.inCombat,
        player: state.player,
        spellBook: state.player.spellBook,
        target: state.currentEnemy
          ? { type: "enemy", entity: state.currentEnemy }
          : { type: "self" },
        room: {
          hasTraps: !!state.activeTrap,
          isLit: true, // Could track room lighting state
          entities: state.roomEnvironmentalEntities,
        },
      }

      const result = castSpell(spell, context)

      // Log the result
      if (result.success) {
        addLog(
          <span>
            You cast <EntityText type="blessing">{spell.name}</EntityText>!{" "}
            <span className="text-stone-400">{result.narration}</span>
          </span>,
          "combat"
        )

        // Handle damage to enemy
        if (result.damage && state.currentEnemy) {
          const damageResult = applySpellDamageToEnemy(
            state.currentEnemy,
            result.damage,
            spell.damage?.type ?? "arcane",
            result.effectsApplied
          )

          for (const narrative of damageResult.narratives) {
            addLog(<span className="text-stone-400">{narrative}</span>, "combat")
          }

          addLog(
            <span>
              <EntityText type="enemy">{state.currentEnemy.name}</EntityText> takes{" "}
              <EntityText type="damage">{result.damage} damage</EntityText>!
            </span>,
            "combat"
          )

          // Update enemy state
          dispatch({ type: "UPDATE_ENEMY", payload: damageResult.enemy })

          // Check if enemy died
          if (damageResult.enemy.health <= 0) {
            updateRunStats({ enemiesSlain: state.runStats.enemiesSlain + 1 })
          }
        }

        // Handle healing
        if (result.healing) {
          addLog(
            <span>
              <EntityText type="heal">+{result.healing} health</EntityText> restored!
            </span>,
            "effect"
          )
        }

        // Apply effects to player
        const { player: updatedPlayer, spellBook: updatedSpellBook } = applySpellCast(
          state.player,
          state.player.spellBook,
          spell,
          result
        )

        dispatch({ type: "UPDATE_PLAYER", payload: { ...updatedPlayer, spellBook: updatedSpellBook } })

        // Handle utility effects
        if (result.utilityResult) {
          switch (result.utilityResult.type) {
            case "light":
              addLog(
                <span className="text-amber-200">
                  Light floods the area, revealing hidden details.
                </span>,
                "narrative"
              )
              break
            case "reveal_traps":
              if (result.utilityResult.trapRevealed && result.utilityResult.trapRevealed.length > 0) {
                addLog(
                  <span className="text-yellow-400">
                    Traps detected: {result.utilityResult.trapRevealed.join(", ")}
                  </span>,
                  "narrative"
                )
              }
              break
            case "teleport":
              addLog(
                <span className="text-violet-400">
                  Reality shifts as you teleport!
                </span>,
                "narrative"
              )
              break
            case "transmute":
              if (result.utilityResult.goldGained) {
                dispatch({ type: "MODIFY_PLAYER_GOLD", payload: result.utilityResult.goldGained })
                addLog(
                  <span>
                    Item transmuted into{" "}
                    <EntityText type="gold">{result.utilityResult.goldGained} gold</EntityText>!
                  </span>,
                  "loot"
                )
              }
              break
          }
        }

        // Handle control effects (charm, banish, etc. are in utilityResult)
        if (result.utilityResult?.npcCharmed) {
          addLog(
            <span className="text-pink-400">
              The target is charmed and becomes friendly!
            </span>,
            "effect"
          )
        }
        if (result.utilityResult?.enemyBanished) {
          addLog(
            <span className="text-pink-400">
              The enemy is banished from this realm!
            </span>,
            "effect"
          )
        }
      } else {
        addLog(
          <span className="text-red-400">
            Failed to cast {spell.name}: {result.reason}
          </span>,
          "system"
        )
      }
    },
    [state, dispatch, addLog, updateRunStats]
  )

  /**
   * Learn a spell from a tome or scroll item
   */
  const handleLearnFromItem = useCallback(
    (item: Item) => {
      const result = learnSpellFromItem(state.player, state.player.spellBook, item)

      if (result.success && result.spell) {
        addLog(
          <span>
            You study <EntityText type="item">{item.name}</EntityText> and learn{" "}
            <EntityText type="blessing">{result.spell.name}</EntityText>!
          </span>,
          "effect"
        )

        // Update spell book
        const updatedPlayer = {
          ...state.player,
          spellBook: {
            ...state.player.spellBook,
            spells: [...state.player.spellBook.spells, result.spell],
          },
        }
        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer })

        // Consume item if needed
        if (result.consumeItem) {
          dispatch({ type: "REMOVE_ITEM", payload: item.id })
          addLog(
            <span className="text-stone-500 text-sm">
              The {item.name} crumbles to dust after revealing its secrets.
            </span>,
            "narrative"
          )
        }
      } else {
        addLog(
          <span className="text-stone-400">
            {result.narration}
          </span>,
          "narrative"
        )
      }

      return result
    },
    [state.player, dispatch, addLog]
  )

  /**
   * Learn a spell from a shrine blessing
   */
  const handleLearnFromShrine = useCallback(
    (grant: ShrineSpellGrant) => {
      const result = learnSpellFromShrine(state.player, state.player.spellBook, grant)

      if (result.success && result.spell) {
        addLog(
          <span>
            The shrine bestows magical knowledge!{" "}
            <EntityText type="blessing">{result.spell.name}</EntityText> learned!
          </span>,
          "effect"
        )

        // Update spell book
        const updatedPlayer = {
          ...state.player,
          spellBook: {
            ...state.player.spellBook,
            spells: [...state.player.spellBook.spells, result.spell],
          },
        }

        // Apply costs
        if (grant.cost) {
          if (grant.cost.type === "gold" && grant.cost.amount) {
            dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -grant.cost.amount })
          } else if (grant.cost.type === "health" && grant.cost.amount) {
            dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -grant.cost.amount })
          }
        }

        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer })
      } else {
        addLog(
          <span className="text-stone-400">
            {result.narration}
          </span>,
          "narrative"
        )
      }

      return result
    },
    [state.player, dispatch, addLog]
  )

  /**
   * Tick spell cooldowns at turn end
   */
  const tickCooldowns = useCallback(() => {
    const updatedSpellBook = tickSpellCooldowns(state.player.spellBook)
    if (updatedSpellBook !== state.player.spellBook) {
      dispatch({
        type: "UPDATE_PLAYER",
        payload: { ...state.player, spellBook: updatedSpellBook },
      })
    }
  }, [state.player, dispatch])

  return {
    handleCastSpell,
    handleLearnFromItem,
    handleLearnFromShrine,
    tickCooldowns,
    spellBook: state.player.spellBook,
    hasSpells: state.player.spellBook.spells.length > 0,
  }
}
