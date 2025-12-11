/**
 * Ability Execution Hook - AI-as-Code Refactored Version
 *
 * Uses the Effect-based AI decision pattern for ability narration.
 *
 * Architecture:
 * - KERNEL: executeAbility() calculates damage, healing, effects (deterministic)
 * - AI: Cast narration, victory narration (creative)
 */

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

// AI-as-code imports
import {
  decideAbilityCast,
  decideAbilityVictory,
  type AbilityCastContext,
  type AbilityVictoryContext,
} from "./ability-decision";
import { executeEffects } from "@/lib/effects";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseAbilityExecutionV2Options {
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

export function useAbilityExecutionV2({
  state,
  dispatch,
  addLog,
  logger,
  isProcessing,
  setIsProcessing,
  updateRunStats,
  checkLevelUp,
  enemyAttack,
}: UseAbilityExecutionV2Options) {
  const handleUseAbility = useCallback(
    async (ability: Ability) => {
      if (!state.currentEnemy || isProcessing) return;

      setIsProcessing(true);
      const enemy = state.currentEnemy;

      // === KERNEL: Execute ability mechanics deterministically ===
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

      // === KERNEL: Update player resources and cooldowns ===
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

      // === KERNEL: Process combo system ===
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

      // === KERNEL: Apply self-targeted effects ===
      if (ability.targetType === "self" && result.effectsApplied) {
        updatedPlayer = {
          ...updatedPlayer,
          activeEffects: [
            ...updatedPlayer.activeEffects,
            ...result.effectsApplied,
          ],
        };
      }

      // === AI: Get cast narration (NO FALLBACK) ===
      const castContext: AbilityCastContext = {
        player: {
          name: state.player.name,
          class: state.player.class ?? undefined,
          level: state.player.stats.level,
        },
        ability: {
          name: ability.name,
          description: ability.description,
          damageType: ability.damageType,
          targetType: ability.targetType,
          damage: result.damage,
          healing: result.healing,
          isCritical: result.isCritical,
          effectsApplied: result.effectsApplied?.map(e => e.name),
        },
        enemy: {
          name: enemy.name,
          health: enemy.health,
          maxHealth: enemy.maxHealth,
        },
      };

      // Handle healing abilities
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

        const healDecision = await decideAbilityCast(castContext);

        // Execute any narrative effects
        if (healDecision.effects.length > 0) {
          executeEffects(state, healDecision.effects);
        }

        addLog(
          <span>
            {healDecision.narration} You recover{" "}
            <EntityText type="heal">{result.healing}</EntityText> health.
          </span>,
          "combat",
        );
      }

      // Handle damaging abilities
      if (result.damage && result.damage > 0) {
        const { damage: finalDamage, effectiveness } = calculateDamageWithType(
          result.damage,
          ability.damageType,
          enemy,
          updatedPlayer,
        );

        // Update context with effectiveness
        castContext.effectiveness = effectiveness;

        const castDecision = await decideAbilityCast(castContext);

        // Execute any narrative effects
        if (castDecision.effects.length > 0) {
          executeEffects(state, castDecision.effects);
        }

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
            {castDecision.narration}{" "}
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

        // Log applied effects
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

        // Handle life steal
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

        // === VICTORY CHECK ===
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

          // === AI: Get victory narration (NO FALLBACK) ===
          const victoryContext: AbilityVictoryContext = {
            player: {
              class: state.player.class ?? undefined,
              level: state.player.stats.level,
            },
            ability: {
              name: ability.name,
              damageType: ability.damageType,
            },
            enemy: {
              name: enemy.name,
              level: enemy.level,
            },
            rewards: {
              gold: goldGain,
              experience: expGain,
              lootName: enemy.loot?.name,
            },
          };

          const victoryDecision = await decideAbilityVictory(victoryContext);

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

          addLog(
            <span>
              {victoryDecision.narration}{" "}
              <EntityText type="gold">+{goldGain}g</EntityText>{" "}
              <EntityText type="heal">+{expGain}xp</EntityText>
            </span>,
            "combat",
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

        // === ENEMY SURVIVES ===
        const tickedEnemy = tickEnemyAbilities({
          ...enemy,
          health: newEnemyHealth,
        });

        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: tickedEnemy });

        await enemyAttack(tickedEnemy, updatedPlayer);
      } else if (ability.targetType === "self") {
        // Self-buff ability with no damage
        const selfDecision = await decideAbilityCast(castContext);

        if (selfDecision.effects.length > 0) {
          executeEffects(state, selfDecision.effects);
        }

        addLog(
          <span>{selfDecision.narration}</span>,
          "combat",
        );

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
