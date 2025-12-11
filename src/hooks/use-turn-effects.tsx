"use client";

import { useCallback } from "react";
import type { GameState, Player } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger } from "@/lib/ai/game-log-system";
import { regenerateResource, tickCooldowns } from "@/lib/character/ability-system";
import { tickCombo } from "@/lib/combat/combat-system";
import { triggerTurnEnd } from "@/lib/combat/effect-system";
import {
  applyHazardToPlayer,
  tickHazard,
  removeHazardEffects,
} from "@/lib/world/hazard-system";

interface UseTurnEffectsOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  updateRunStats: (updates: Partial<GameState["runStats"]>) => void;
}

export function useTurnEffects({
  state,
  dispatch,
  logger,
  updateRunStats,
}: UseTurnEffectsOptions) {
  // Process turn effects (status effects, hazards, regeneration)
  const processTurnEffects = useCallback((): boolean => {
    const triggerResult = triggerTurnEnd(state.player);
    let player = triggerResult.player;
    const tickDamage = triggerResult.damageToPlayer;
    const tickHeal = triggerResult.healToPlayer;
    const expiredEffects = triggerResult.expiredEffects;

    for (const narrative of triggerResult.narratives) {
      logger.narration(narrative);
    }

    let newHealth = player.stats.health;
    if (tickDamage > 0) {
      newHealth -= tickDamage;
      logger.damageTaken(tickDamage, "Status effects");
      updateRunStats({
        damageTaken: state.runStats.damageTaken + tickDamage,
      });
    }
    if (tickHeal > 0) {
      newHealth = Math.min(player.stats.maxHealth, newHealth + tickHeal);
      logger.heal(tickHeal, "Regeneration");
    }

    for (const effect of expiredEffects) {
      logger.effectExpired(effect);
    }

    let hazardDamage = 0;
    let playerWithHazardEffects = player;
    if (state.currentHazard) {
      const hazardResult = applyHazardToPlayer(player, state.currentHazard);
      playerWithHazardEffects = hazardResult.player;
      hazardDamage = hazardResult.damage;
      if (hazardDamage > 0) {
        newHealth -= hazardDamage;
        logger.damageTaken(
          hazardDamage,
          `${state.currentHazard.name}${hazardResult.narration ? ` - ${hazardResult.narration}` : ""}`,
        );
        updateRunStats({
          damageTaken: state.runStats.damageTaken + hazardDamage,
        });
      }
    }

    let updatedPlayer = {
      ...playerWithHazardEffects,
      stats: {
        ...playerWithHazardEffects.stats,
        health: Math.max(0, newHealth),
      },
      combo: tickCombo(playerWithHazardEffects.combo),
    };
    updatedPlayer = regenerateResource(updatedPlayer);
    updatedPlayer = tickCooldowns(updatedPlayer);

    const updatedHazard = state.currentHazard
      ? tickHazard(state.currentHazard)
      : null;

    if (state.currentHazard && !updatedHazard) {
      updatedPlayer = removeHazardEffects(
        updatedPlayer,
        state.currentHazard.id,
      );
      logger.narration(`The ${state.currentHazard.name} fades away.`);
    }

    dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
    dispatch({ type: "SET_HAZARD", payload: updatedHazard });
    dispatch({ type: "INCREMENT_TURN" });

    return newHealth <= 0;
  }, [state, dispatch, logger, updateRunStats]);

  return { processTurnEffects };
}
