"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Player, Combatant } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import { selectEnemyAbility, STANCE_MODIFIERS } from "@/lib/combat/combat-system";
import { triggerOnDamageTaken } from "@/lib/combat/effect-system";
import { processDamageSharing, hasDeathtouch } from "@/lib/ai/dm-combat-integration";
import { getXpModifier } from "@/lib/mechanics/game-mechanics-ledger";
import { EntityText } from "@/components/narrative/entity-text";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

function applyDeathtouch(
  attackerId: string,
  damage: number,
  targetHealth: number,
): number {
  if (damage > 0 && hasDeathtouch(attackerId)) {
    return targetHealth + 1;
  }
  return damage;
}

interface UseEnemyAIOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  logger: GameLogger;
  updateRunStats: (updates: Partial<GameState["runStats"]>) => void;
  triggerDeath: (cause: string, killedBy?: string) => void;
}

export function useEnemyAI({
  state,
  dispatch,
  addLog,
  logger,
  updateRunStats,
  triggerDeath,
}: UseEnemyAIOptions) {
  const enemyAttack = useCallback(
    async (enemy: Combatant | null, player: Player) => {
      if (!enemy) return;

      const effectiveStats = calculateEffectiveStats(player);

      if (Math.random() < player.stats.dodgeChance) {
        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            attacks but you <span className="text-cyan-400">dodge</span> the
            blow!
          </span>,
          "combat",
        );
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
        return;
      }

      const selectedAbility = selectEnemyAbility(
        enemy,
        player.stats.health,
        player.stats.maxHealth,
      );

      let finalDamage: number;
      let workingEnemy = enemy;

      if (selectedAbility) {
        const baseDamage = selectedAbility.damage || enemy.attack;
        finalDamage = Math.max(
          1,
          baseDamage -
            Math.floor(
              effectiveStats.defense *
                0.5 *
                STANCE_MODIFIERS[player.stance].defense,
            ),
        );

        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            uses <span className="text-red-400">{selectedAbility.name}</span>!{" "}
            {selectedAbility.narration}{" "}
            <EntityText type="damage">-{finalDamage}</EntityText>
          </span>,
          "combat",
        );

        if (selectedAbility.effect) {
          addLog(
            <span>
              You are afflicted with{" "}
              <EntityText type="curse" entity={selectedAbility.effect}>
                {selectedAbility.effect.name}
              </EntityText>
              !
            </span>,
            "effect",
          );
        }

        if (enemy.abilities) {
          workingEnemy = {
            ...enemy,
            abilities: enemy.abilities.map((a) =>
              a.id === selectedAbility.id
                ? { ...a, currentCooldown: a.cooldown }
                : a,
            ),
          };
        }
      } else {
        const enemyDamage = Math.max(
          1,
          enemy.attack -
            Math.floor(
              effectiveStats.defense *
                0.5 *
                STANCE_MODIFIERS[player.stance].defense,
            ),
        );
        const variance = Math.floor(Math.random() * 5) - 2;
        finalDamage = Math.max(1, enemyDamage + variance);

        logger.enemyAttack(enemy, finalDamage);
      }

      finalDamage = Math.floor(
        finalDamage * effectiveStats.damageTakenMultiplier,
      );

      finalDamage = applyDeathtouch(enemy.id, finalDamage, player.stats.health);

      updateRunStats({
        damageTaken: state.runStats.damageTaken + finalDamage,
      });

      const damageShares = processDamageSharing(player.id, finalDamage);
      for (const narrative of damageShares.narrative) {
        addLog(
          <span className="text-purple-400 italic">{narrative}</span>,
          "effect",
        );
      }

      const newHealth = player.stats.health - finalDamage;

      const damageTakenTrigger = triggerOnDamageTaken(player, {
        enemy,
        damageTaken: finalDamage,
      });
      let updatedPlayer = damageTakenTrigger.player;
      let actualNewHealth = newHealth;

      if (damageTakenTrigger.healToPlayer > 0) {
        actualNewHealth = Math.min(
          updatedPlayer.stats.maxHealth,
          newHealth + damageTakenTrigger.healToPlayer,
        );
        logger.heal(damageTakenTrigger.healToPlayer, "Reactive effect");
      }

      let updatedEnemy = workingEnemy;
      if (damageTakenTrigger.damageToEnemy > 0) {
        const reflectedHealth =
          workingEnemy.health - damageTakenTrigger.damageToEnemy;
        updatedEnemy = { ...workingEnemy, health: reflectedHealth };
        logger.playerAttack(enemy, damageTakenTrigger.damageToEnemy, {
          narration: "Thorns retaliate!",
        });
        if (reflectedHealth <= 0) {
          const reflectEffStats = calculateEffectiveStats(updatedPlayer);
          const reflectLevelXpMod = getXpModifier(
            updatedPlayer.stats.level,
            enemy.level,
          );
          const expGain = Math.floor(
            enemy.expReward * reflectEffStats.expMultiplier * reflectLevelXpMod,
          );
          const goldGain = Math.floor(
            enemy.goldReward *
              calculateEffectiveStats(updatedPlayer).goldMultiplier,
          );
          addLog(
            <span className="text-emerald-400 font-bold text-lg animate-pulse">
              ⚔ VICTORY! ⚔
            </span>,
            "system",
          );
          logger.enemySlain(enemy, goldGain, expGain);
          const victoriousPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              health: actualNewHealth,
              gold: updatedPlayer.stats.gold + goldGain,
              experience: updatedPlayer.stats.experience + expGain,
            },
          };
          dispatch({ type: "UPDATE_PLAYER", payload: victoriousPlayer });
          dispatch({ type: "END_COMBAT" });
          return;
        }
      }

      for (const narrative of damageTakenTrigger.narratives) {
        addLog(
          <span className="text-cyan-300 italic">{narrative}</span>,
          "effect",
        );
      }

      if (actualNewHealth <= 0) {
        triggerDeath("Slain in combat", enemy.name);
        addLog(
          <span className="text-red-500 font-bold">
            You have fallen in battle. Your adventure ends here.
          </span>,
          "system",
        );
      } else {
        const damagedPlayer = {
          ...updatedPlayer,
          stats: { ...updatedPlayer.stats, health: actualNewHealth },
          activeEffects: selectedAbility?.effect
            ? [...updatedPlayer.activeEffects, selectedAbility.effect]
            : updatedPlayer.activeEffects,
        };
        dispatch({ type: "UPDATE_PLAYER", payload: damagedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: updatedEnemy });
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
      }
    },
    [
      addLog,
      updateRunStats,
      state.runStats.damageTaken,
      triggerDeath,
      dispatch,
      logger,
    ],
  );

  return { enemyAttack };
}
