"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Enemy, Player, Boss } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import {
  createInitialParty,
  getMaxActiveCompanions,
  addCompanionToParty,
  canTameEnemy,
  createBasicCompanionFromEnemy,
} from "@/lib/entity/companion-system";
import { EntityText } from "@/components/narrative/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseCompanionsOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  enemyAttack: (enemy: Enemy | Boss, player: Player) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCompanions({
  state,
  dispatch,
  addLog,
  isProcessing,
  setIsProcessing,
  enemyAttack,
}: UseCompanionsOptions) {
  // Attempt to tame an enemy as a companion
  const handleTameEnemy = useCallback(async () => {
    if (!state.currentEnemy || !state.inCombat || isProcessing) return;
    setIsProcessing(true);

    const tameCheck = canTameEnemy(state.currentEnemy, state.player);

    if (!tameCheck.canTame) {
      addLog(
        <span className="text-yellow-500">{tameCheck.reason}</span>,
        "system",
      );
      setIsProcessing(false);
      return;
    }

    const roll = Math.random();
    const success = roll < tameCheck.chance;

    if (success) {
      // Taming successful
      const newCompanion = createBasicCompanionFromEnemy(
        state.currentEnemy,
        "tame",
      );

      addLog(
        <span className="text-emerald-400">
          You reach out to the wounded{" "}
          <EntityText type="enemy">{state.currentEnemy.name}</EntityText>...
          It recognizes your intent and submits.{" "}
          <span className="font-bold">{newCompanion.name}</span> joins your
          party!
        </span>,
        "combat",
      );

      // Add to party
      let updatedParty = state.player.party || createInitialParty();
      updatedParty = {
        ...updatedParty,
        maxActive: getMaxActiveCompanions(state.player.stats.level),
      };
      updatedParty = addCompanionToParty(
        updatedParty,
        newCompanion,
        updatedParty.active.length < updatedParty.maxActive,
      );

      const inActive = updatedParty.active.some(
        (c) => c.id === newCompanion.id,
      );
      if (inActive) {
        addLog(
          <span className="text-cyan-400">
            {newCompanion.name} joins your active party!
          </span>,
          "system",
        );
      } else {
        addLog(
          <span className="text-zinc-400">
            {newCompanion.name} waits in reserve (party full).
          </span>,
          "system",
        );
      }

      // End combat
      const tamedPlayer = {
        ...state.player,
        party: updatedParty,
      };
      dispatch({ type: "UPDATE_PLAYER", payload: tamedPlayer });
      dispatch({ type: "END_COMBAT" });
    } else {
      // Taming failed - enemy attacks
      addLog(
        <span className="text-red-400">
          You attempt to tame the{" "}
          <EntityText type="enemy">{state.currentEnemy.name}</EntityText>,
          but it lashes out in defiance!
        </span>,
        "combat",
      );

      await enemyAttack(state.currentEnemy, state.player);
    }

    setIsProcessing(false);
  }, [state, isProcessing, addLog, enemyAttack, setIsProcessing, dispatch]);

  return {
    // Actions
    handleTameEnemy,

    // State shortcuts
    party: state.player.party,
  };
}
