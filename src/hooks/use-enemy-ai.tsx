/**
 * Enemy AI Hook - AI-as-LEGO-Composer Version
 *
 * This hook implements the LEGO composer pattern:
 * 1. AI decides which pieces to use → returns pieceIds[]
 * 2. Kernel resolves pieces to Effect[] → validates budget
 * 3. Kernel executes effects → applies to game state
 *
 * KEY INSIGHT: AI never outputs raw damage numbers.
 * AI selects from predefined pieces, kernel applies power scaling.
 *
 * NO FALLBACKS - if AI outputs invalid pieces, game fails visibly.
 */

"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Player, Combatant } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import { STANCE_MODIFIERS } from "@/lib/combat/combat-system";
import { triggerOnDamageTaken } from "@/lib/combat/effect-system";
import { EntityText } from "@/components/narrative/entity-text";

// Effect execution
import { executeEffects } from "@/lib/effects";

// AI decision module (returns LegoTurnDecision with pieceIds)
import { decideEnemyTurn, type EnemyTurnContext } from "./enemy-ai-decision";

// LEGO layer - piece resolution
import {
  validateAndResolve,
  calculateBudget,
  type PowerLevel,
} from "@/lib/lego";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

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
  /**
   * Main enemy attack function - LEGO composer pattern.
   *
   * Flow:
   * 1. Check for dodge (RNG owned by kernel)
   * 2. Build context for AI decision
   * 3. AI decides action → returns pieceIds[] + powerLevel
   * 4. Kernel resolves pieces → Effect[]
   * 5. Kernel executes effects → new GameState
   * 6. Handle death/victory conditions
   * 7. Dispatch final state
   */
  const enemyAttack = useCallback(
    async (enemy: Combatant | null, player: Player) => {
      if (!enemy) return;

      const effectiveStats = calculateEffectiveStats(player);

      // === STEP 1: Dodge check (RNG owned by kernel, not AI) ===
      if (Math.random() < player.stats.dodgeChance) {
        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            attacks but you <span className="text-cyan-400">dodge</span> the blow!
          </span>,
          "combat",
        );
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
        return;
      }

      // === STEP 2: Build context for AI decision ===
      const context: EnemyTurnContext = {
        enemy: {
          id: enemy.id,
          name: enemy.name,
          health: enemy.health,
          maxHealth: enemy.maxHealth,
          attack: enemy.attack,
          defense: enemy.defense,
          abilities: enemy.abilities || [],
          aiPattern: enemy.aiPattern || "random",
          weakness: enemy.weakness,
          resistance: enemy.resistance,
        },
        player: {
          health: player.stats.health,
          maxHealth: player.stats.maxHealth,
          defense: effectiveStats.defense,
          stance: player.stance,
          stanceDefenseMod: STANCE_MODIFIERS[player.stance].defense,
          activeEffects: player.activeEffects.map(e => e.name),
        },
        combatRound: state.combatRound || 1,
        dungeonFloor: state.floor,
      };

      // === STEP 3: Get AI decision (returns pieceIds + powerLevel) ===
      // NO FALLBACK - AI failure = game failure
      const decision = await decideEnemyTurn(context);

      // === STEP 4: Resolve LEGO pieces to Effect[] ===
      const budget = calculateBudget(state.floor, "enemy");
      const resolution = validateAndResolve(
        decision.pieceIds,
        budget,
        decision.powerLevel as PowerLevel | undefined,
      );

      // Validation failed - log error and show to player
      if (!resolution.success) {
        const errorMsg = resolution.errors.join(", ");
        console.error(`LEGO resolution failed: ${errorMsg}`);
        addLog(
          <span className="text-red-500">
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            attempts to attack but their power fizzles! ({errorMsg})
          </span>,
          "combat",
        );
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
        return;
      }

      // === STEP 5: Execute resolved effects through kernel ===
      const executionResult = executeEffects(state, resolution.effects);

      // Log any skipped effects (execution-time validation failures)
      for (const { effect, reason } of executionResult.skipped) {
        console.warn(`Effect skipped: ${effect.effectType} - ${reason}`);
      }

      // === STEP 6: Display narration ===
      if (decision.narration) {
        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            <span className="text-stone-300">{decision.narration}</span>
          </span>,
          "combat",
        );
      }

      // Display damage from effects
      const damageEffects = resolution.effects.filter(
        e => e.effectType === "damage" || e.effectType === "damage_enemy"
      );
      for (const dmgEffect of damageEffects) {
        if (dmgEffect.effectType === "damage") {
          addLog(
            <span>
              <EntityText type="damage">-{dmgEffect.amount}</EntityText> damage from{" "}
              {dmgEffect.source}
            </span>,
            "combat",
          );
        }
      }

      // === STEP 7: Handle post-execution triggers ===
      const newState = executionResult.state;
      const newPlayerHealth = newState.player.stats.health;

      // Calculate actual damage taken for stats
      const totalDamage = player.stats.health - newPlayerHealth;
      if (totalDamage > 0) {
        updateRunStats({
          damageTaken: state.runStats.damageTaken + totalDamage,
        });

        // Trigger on-damage-taken effects (reactive abilities)
        const damageTakenTrigger = triggerOnDamageTaken(newState.player, {
          enemy,
          damageTaken: totalDamage,
        });

        // Apply reactive healing
        let finalHealth = newPlayerHealth;
        if (damageTakenTrigger.healToPlayer > 0) {
          finalHealth = Math.min(
            newState.player.stats.maxHealth,
            newPlayerHealth + damageTakenTrigger.healToPlayer,
          );
          logger.heal(damageTakenTrigger.healToPlayer, "Reactive effect");
        }

        // Log reactive effect narratives
        for (const narrative of damageTakenTrigger.narratives) {
          addLog(
            <span className="text-cyan-300 italic">{narrative}</span>,
            "effect",
          );
        }

        // === STEP 8: Check death condition ===
        if (finalHealth <= 0) {
          triggerDeath("Slain in combat", enemy.name);
          addLog(
            <span className="text-red-500 font-bold">
              You have fallen in battle. Your adventure ends here.
            </span>,
            "system",
          );
          return;
        }

        // === STEP 9: Dispatch final state ===
        dispatch({
          type: "UPDATE_PLAYER",
          payload: {
            ...newState.player,
            stats: {
              ...newState.player.stats,
              health: finalHealth,
            },
          },
        });
      }

      // Update enemy state (for cooldowns, etc.)
      if (newState.currentEnemy) {
        dispatch({ type: "UPDATE_ENEMY", payload: newState.currentEnemy });
      }

      dispatch({ type: "INCREMENT_COMBAT_ROUND" });
    },
    [
      addLog,
      updateRunStats,
      state,
      triggerDeath,
      dispatch,
      logger,
    ],
  );

  return { enemyAttack };
}

