"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Enemy } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import type { VaultAction } from "@/components/encounters/vault-encounter";
import { EntityText } from "@/components/narrative/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseVaultOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useVault({ state, dispatch, addLog, isProcessing }: UseVaultOptions) {
  const handleVaultAction = useCallback(
    (action: VaultAction) => {
      if (isProcessing || !state.activeVault) return;

      const vault = state.activeVault;

      switch (action.type) {
        case "unlock":
          // Remove key from inventory and unlock vault
          const keyItem = state.player.inventory.find(
            (item) => item.type === "key" && item.name.toLowerCase().includes(action.keyType.replace("key_", ""))
          );
          if (keyItem) {
            dispatch({ type: "REMOVE_ITEM", payload: keyItem.id });
            dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "active" } });
            addLog(
              <span className="text-amber-400">
                You use the key to unlock the {vault.definition.name}...
              </span>,
              "narrative"
            );
          }
          break;

        case "enter":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "active" } });
          addLog(
            <span className="text-purple-400">
              You enter the {vault.definition.name}...
            </span>,
            "narrative"
          );
          break;

        case "loot":
          const item = vault.availableLoot[action.itemIndex];
          if (item) {
            dispatch({ type: "ADD_ITEM", payload: item });
            const newAvailableLoot = [...vault.availableLoot];
            newAvailableLoot.splice(action.itemIndex, 1);
            const newCollectedLoot = [...vault.collectedLoot, item];
            dispatch({
              type: "SET_ACTIVE_VAULT",
              payload: { ...vault, availableLoot: newAvailableLoot, collectedLoot: newCollectedLoot }
            });
            addLog(
              <span>
                You take <EntityText type="item">{item.name}</EntityText> from the vault.
              </span>,
              "loot"
            );
          }
          break;

        case "loot_gold":
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: action.amount });
          dispatch({
            type: "SET_ACTIVE_VAULT",
            payload: { ...vault, collectedGold: vault.collectedGold + action.amount }
          });
          addLog(
            <span className="text-amber-400">
              You collect {action.amount} gold from the vault!
            </span>,
            "loot"
          );
          break;

        case "fight_guardian":
          if (vault.guardian) {
            // Start combat with guardian (RankedEnemy extends Enemy, cast is safe)
            dispatch({ type: "START_COMBAT", payload: vault.guardian as Enemy });
            addLog(
              <span className="text-red-400">
                The guardian attacks! Prepare for battle!
              </span>,
              "combat"
            );
          }
          break;

        case "advance_wave":
          if (vault.waves && vault.currentWave !== undefined) {
            const nextWave = vault.currentWave + 1;
            dispatch({
              type: "SET_ACTIVE_VAULT",
              payload: { ...vault, currentWave: nextWave }
            });
            addLog(
              <span className="text-red-400">
                Wave {nextWave + 1} begins!
              </span>,
              "combat"
            );
          }
          break;

        case "leave":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: null });
          addLog(
            <span className="text-zinc-400">
              You leave the vault behind.
            </span>,
            "narrative"
          );
          break;

        case "complete":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "completed" } });
          addLog(
            <span className="text-green-400">
              You have cleared the {vault.definition.name}!
            </span>,
            "narrative"
          );
          // Clear vault after a moment
          setTimeout(() => {
            dispatch({ type: "SET_ACTIVE_VAULT", payload: null });
          }, 1500);
          break;
      }
    },
    [isProcessing, state.activeVault, state.player.inventory, dispatch, addLog]
  );

  return {
    // Actions
    handleVaultAction,

    // State shortcuts
    activeVault: state.activeVault,
    hasActiveVault: !!state.activeVault,
  };
}
