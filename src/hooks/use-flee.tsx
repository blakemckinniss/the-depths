"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Player } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import { EntityText } from "@/components/narrative/entity-text";
import type { AddLogFn, GenerateNarrativeFn } from "./types";

interface FleeResponse {
  fleeNarration: string;
}

interface UseFleeOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  updateRunStats: (updates: Partial<GameState["runStats"]>) => void;
  calculateDamage: (
    attacker: { attack: number },
    defender: { defense: number },
  ) => number;
  triggerDeath: (cause: string, killedBy?: string) => void;
  generateNarrative: GenerateNarrativeFn;
}

export function useFlee({
  state,
  dispatch,
  addLog,
  isProcessing,
  setIsProcessing,
  updateRunStats,
  calculateDamage,
  triggerDeath,
  generateNarrative,
}: UseFleeOptions) {
  const attemptFlee = useCallback(async () => {
    if (!state.currentEnemy || !state.inCombat || isProcessing) return;

    if (state.currentHazard?.effects.fleeDisabled) {
      addLog(
        <span className="text-red-400">
          The{" "}
          <EntityText type="curse">{state.currentHazard.name}</EntityText>{" "}
          prevents your escape!
        </span>,
        "system",
      );
      return;
    }

    setIsProcessing(true);

    const fleeChance = 0.4 + state.player.stats.level * 0.05;
    const success = Math.random() < fleeChance;

    const fleeResponse = await generateNarrative<FleeResponse>(
      success ? "flee_success" : "flee_fail",
      {
        enemyName: state.currentEnemy.name,
        damage: success ? 0 : undefined,
      },
    );

    if (success) {
      if (fleeResponse) {
        addLog(<span>{fleeResponse.fleeNarration}</span>, "combat");
      } else {
        addLog(
          <span>
            <EntityText type="player">You</EntityText> escape from the{" "}
            <EntityText type="enemy">{state.currentEnemy.name}</EntityText>!
          </span>,
          "combat",
        );
      }
      dispatch({ type: "END_COMBAT" });
    } else {
      const effectiveStats = calculateEffectiveStats(state.player);
      const damage = calculateDamage(state.currentEnemy, {
        defense: effectiveStats.defense,
      });
      const newHealth = state.player.stats.health - damage;

      updateRunStats({ damageTaken: state.runStats.damageTaken + damage });

      if (fleeResponse) {
        addLog(
          <span>
            {fleeResponse.fleeNarration}{" "}
            <EntityText type="damage">(-{damage})</EntityText>
          </span>,
          "combat",
        );
      } else {
        addLog(
          <span>
            Failed to flee! The{" "}
            <EntityText type="enemy">{state.currentEnemy.name}</EntityText>{" "}
            strikes for <EntityText type="damage">{damage}</EntityText> damage.
          </span>,
          "combat",
        );
      }

      if (newHealth <= 0) {
        triggerDeath("Slain while fleeing", state.currentEnemy.name);
        addLog(
          <span className="text-red-400">
            <EntityText type="player">You</EntityText> have fallen. The dungeon
            claims another soul.
          </span>,
          "system",
        );
      } else {
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
      }
    }
    setIsProcessing(false);
  }, [
    state,
    isProcessing,
    calculateDamage,
    addLog,
    updateRunStats,
    triggerDeath,
    dispatch,
    generateNarrative,
    setIsProcessing,
  ]);

  return { attemptFlee };
}
