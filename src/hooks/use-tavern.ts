"use client";

import { useCallback } from "react";
import type { GameState, DungeonKey, KeyRarity } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger } from "@/lib/ai/game-log-system";
import { createDungeonKey } from "@/lib/core/game-data";

// ============================================================================
// CONSTANTS
// ============================================================================

const KEY_PRICES: Record<KeyRarity, number> = {
  common: 25,
  uncommon: 50,
  rare: 100,
  legendary: 250,
  master: 500,
};

const HEAL_COST_PER_HP = 0.5;

// ============================================================================
// TYPES
// ============================================================================

interface UseTavernOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTavern({
  state,
  dispatch,
  logger,
  updateRunStats,
}: UseTavernOptions) {
  // Calculate healing cost
  const getHealingCost = useCallback(() => {
    const missingHealth =
      state.player.stats.maxHealth - state.player.stats.health;
    return Math.ceil(missingHealth * HEAL_COST_PER_HP);
  }, [state.player.stats.health, state.player.stats.maxHealth]);

  // Restore health at tavern
  const restoreHealth = useCallback(() => {
    const cost = getHealingCost();
    if (cost <= 0) return false;
    if (state.player.stats.gold < cost) return false;

    const healAmount = state.player.stats.maxHealth - state.player.stats.health;

    dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });
    dispatch({
      type: "UPDATE_PLAYER_STATS",
      payload: { health: state.player.stats.maxHealth },
    });

    updateRunStats({ goldSpent: state.runStats.goldSpent + cost });
    logger.heal(healAmount, "Tavern rest");

    return true;
  }, [
    state.player.stats,
    state.runStats.goldSpent,
    dispatch,
    logger,
    updateRunStats,
    getHealingCost,
  ]);

  // Get key price
  const getKeyPrice = useCallback((rarity: KeyRarity) => {
    return KEY_PRICES[rarity];
  }, []);

  // Check if player can afford a key
  const canAffordKey = useCallback(
    (rarity: KeyRarity) => {
      return state.player.stats.gold >= KEY_PRICES[rarity];
    },
    [state.player.stats.gold],
  );

  // Buy a dungeon key
  const buyKey = useCallback(
    (rarity: KeyRarity) => {
      const cost = KEY_PRICES[rarity];
      if (state.player.stats.gold < cost) return null;

      const newKey = createDungeonKey(rarity);

      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });
      dispatch({ type: "ADD_KEY", payload: newKey });
      updateRunStats({ goldSpent: state.runStats.goldSpent + cost });

      logger.system(`Purchased ${newKey.name} for ${cost} gold.`);

      return newKey;
    },
    [
      state.player.stats.gold,
      state.runStats.goldSpent,
      dispatch,
      logger,
      updateRunStats,
    ],
  );

  // Check if player needs healing
  const needsHealing = useCallback(() => {
    return state.player.stats.health < state.player.stats.maxHealth;
  }, [state.player.stats.health, state.player.stats.maxHealth]);

  // Check if player can afford healing
  const canAffordHealing = useCallback(() => {
    const cost = getHealingCost();
    return cost > 0 && state.player.stats.gold >= cost;
  }, [state.player.stats.gold, getHealingCost]);

  // Get available key rarities for purchase
  const getAvailableKeyRarities = useCallback((): KeyRarity[] => {
    return (["common", "uncommon", "rare", "legendary"] as KeyRarity[]).filter(
      (rarity) => canAffordKey(rarity),
    );
  }, [canAffordKey]);

  // Full rest (restore health and clear some debuffs)
  const fullRest = useCallback(() => {
    // Clear negative effects
    const clearedEffects = state.player.activeEffects.filter(
      (e) => e.effectType === "debuff",
    );

    if (clearedEffects.length > 0) {
      dispatch({ type: "CLEAR_EFFECTS" });
      // Re-add buffs
      const buffs = state.player.activeEffects.filter(
        (e) => e.effectType !== "debuff",
      );
      for (const buff of buffs) {
        dispatch({ type: "ADD_EFFECT", payload: buff });
      }
    }

    // Restore health if can afford
    restoreHealth();
  }, [state.player.activeEffects, dispatch, restoreHealth]);

  return {
    // Actions
    restoreHealth,
    buyKey,
    fullRest,

    // Queries
    getHealingCost,
    getKeyPrice,
    canAffordKey,
    canAffordHealing,
    needsHealing,
    getAvailableKeyRarities,

    // Constants
    KEY_PRICES,
    HEAL_COST_PER_HP,
  };
}
