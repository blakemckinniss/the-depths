"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  Player,
  Ability,
  Combatant,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import { executeAbility } from "@/lib/character/ability-system";
import {
  calculateDamageWithType,
  checkForCombo,
  tickEnemyAbilities,
} from "@/lib/combat/combat-system";
import { getXpModifier } from "@/lib/mechanics/game-mechanics-ledger";
import { EntityText } from "@/components/narrative/entity-text";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseAbilityExecutionOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  logger: GameLogger;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  updateRunStats: (updates: Partial<GameState["runStats"]>) => void;
  checkLevelUp: () => void;
  enemyAttack: (enemy: Combatant, player: Player) => Promise<void>;
}

export function useAbilityExecution({
  state,
  dispatch,
  addLog,
  logger,
  isProcessing,
  setIsProcessing,
  updateRunStats,
  checkLevelUp,
  enemyAttack,
}: UseAbilityExecutionOptions) {
  const handleUseAbility = useCallback(
    async (ability: Ability) => {
      if (!state.currentEnemy || isProcessing) return;

      setIsProcessing(true);
      const enemy = state.currentEnemy;

      const result = executeAbility(state.player, ability, enemy);

      if (!result.success) {
        addLog(
          <span className="text-red-400">{result.narration}</span>,
          "system",
        );
        setIsProcessing(false);
        return;
      }

      updateRunStats({ abilitiesUsed: state.runStats.abilitiesUsed + 1 });

      let updatedPlayer = {
        ...state.player,
        resources: {
          ...state.player.resources,
          current: state.player.resources.current - result.resourceSpent,
        },
        abilityCooldowns: {
          ...state.player.abilityCooldowns,
          [ability.id]: result.cooldownSet,
        },
      };

      if (ability.damageType) {
        const comboResult = checkForCombo(
          updatedPlayer.combo,
          ability.damageType,
        );
        updatedPlayer.combo = comboResult.newCombo;
        if (comboResult.triggered) {
          addLog(
            <span className="text-amber-400 font-bold">
              COMBO: {comboResult.triggered.name}! {comboResult.triggered.bonus}
            </span>,
            "combat",
          );
        }
      }

      if (ability.targetType === "self" && result.effectsApplied) {
        updatedPlayer = {
          ...updatedPlayer,
          activeEffects: [
            ...updatedPlayer.activeEffects,
            ...result.effectsApplied,
          ],
        };
      }

      if (result.healing && result.healing > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            health: Math.min(
              updatedPlayer.stats.maxHealth,
              updatedPlayer.stats.health + result.healing,
            ),
          },
        };
        addLog(
          <span>
            {ability.castNarration || `You use ${ability.name}!`} You recover{" "}
            <EntityText type="heal">{result.healing}</EntityText> health.
          </span>,
          "combat",
        );
      }

      if (result.damage && result.damage > 0) {
        const { damage: finalDamage, effectiveness } = calculateDamageWithType(
          result.damage,
          ability.damageType,
          enemy,
          updatedPlayer,
        );

        const newEnemyHealth = enemy.health - finalDamage;
        const isCrit = result.isCritical;

        updateRunStats({
          damageDealt: state.runStats.damageDealt + finalDamage,
        });

        let effectivenessText = "";
        if (effectiveness === "effective") {
          effectivenessText = " Super effective!";
        } else if (effectiveness === "resisted") {
          effectivenessText = " Resisted...";
        }

        addLog(
          <span>
            {result.narration}{" "}
            {isCrit && <span className="text-orange-400">CRITICAL! </span>}
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            takes <EntityText type="damage">{finalDamage}</EntityText> damage!
            {effectivenessText && (
              <span
                className={
                  effectiveness === "effective"
                    ? "text-emerald-400"
                    : "text-stone-500"
                }
              >
                {effectivenessText}
              </span>
            )}
          </span>,
          "combat",
        );

        if (result.effectsApplied && ability.targetType === "enemy") {
          for (const effect of result.effectsApplied) {
            addLog(
              <span>
                <EntityText type="enemy" entity={enemy}>
                  {enemy.name}
                </EntityText>{" "}
                is afflicted with{" "}
                <EntityText
                  type={effect.effectType === "buff" ? "blessing" : "curse"}
                  entity={effect}
                >
                  {effect.name}
                </EntityText>
                !
              </span>,
              "effect",
            );
          }
        }

        if (ability.lifeSteal && ability.lifeSteal > 0) {
          const stolen = Math.floor(finalDamage * ability.lifeSteal);
          updatedPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              health: Math.min(
                updatedPlayer.stats.maxHealth,
                updatedPlayer.stats.health + stolen,
              ),
            },
          };
          addLog(
            <span>
              You drain <EntityText type="heal">{stolen}</EntityText> life from
              your enemy.
            </span>,
            "combat",
          );
        }

        if (newEnemyHealth <= 0) {
          const abilityKillEffStats = calculateEffectiveStats(updatedPlayer);
          const abilityKillLevelXpMod = getXpModifier(
            updatedPlayer.stats.level,
            enemy.level,
          );
          const expGain = Math.floor(
            enemy.expReward *
              abilityKillEffStats.expMultiplier *
              abilityKillLevelXpMod,
          );
          const goldGain = Math.floor(
            enemy.goldReward * abilityKillEffStats.goldMultiplier,
          );

          updateRunStats({
            enemiesSlain: state.runStats.enemiesSlain + 1,
            goldEarned: state.runStats.goldEarned + goldGain,
          });

          addLog(
            <span className="text-emerald-400 font-bold text-lg animate-pulse">
              ⚔ VICTORY! ⚔
            </span>,
            "system",
          );

          const victoriousPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              gold: updatedPlayer.stats.gold + goldGain,
              experience: updatedPlayer.stats.experience + expGain,
            },
          };
          dispatch({ type: "UPDATE_PLAYER", payload: victoriousPlayer });
          dispatch({ type: "END_COMBAT" });

          logger.enemySlain(enemy, goldGain, expGain);

          if (enemy.loot) {
            dispatch({ type: "ADD_ITEM", payload: enemy.loot });
            dispatch({
              type: "UPDATE_RUN_STATS",
              payload: {
                itemsFound: [...state.runStats.itemsFound, enemy.loot],
              },
            });
            logger.itemFound(enemy.loot);
          }

          checkLevelUp();
          setIsProcessing(false);
          return;
        }

        const tickedEnemy = tickEnemyAbilities({
          ...enemy,
          health: newEnemyHealth,
        });

        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: tickedEnemy });

        await enemyAttack(tickedEnemy, updatedPlayer);
      } else if (ability.targetType === "self") {
        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        await enemyAttack(enemy, updatedPlayer);
      }

      setIsProcessing(false);
    },
    [
      state,
      isProcessing,
      addLog,
      checkLevelUp,
      updateRunStats,
      dispatch,
      logger,
      enemyAttack,
      setIsProcessing,
    ],
  );

  return { handleUseAbility };
}
