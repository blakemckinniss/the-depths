"use client";

import { useCallback } from "react";
import type { GameState, Item, StatusEffect } from "@/lib/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger } from "@/lib/game-log-system";

// ============================================================================
// TYPES
// ============================================================================

interface UseInventoryOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useInventory({
  state,
  dispatch,
  logger,
  updateRunStats,
}: UseInventoryOptions) {
  // Equip an item to a slot
  const equipItem = useCallback(
    (item: Item, slot: "weapon" | "armor") => {
      dispatch({ type: "EQUIP_ITEM", payload: { item, slot } });
      logger.itemEquipped(item);
    },
    [dispatch, logger],
  );

  // Unequip an item from a slot
  const unequipItem = useCallback(
    (slot: "weapon" | "armor") => {
      const currentItem = state.player.equipment[slot];
      if (!currentItem) return;

      dispatch({ type: "UNEQUIP_ITEM", payload: slot });
    },
    [state.player.equipment, dispatch],
  );

  // Consume a potion
  const consumePotion = useCallback(
    (item: Item) => {
      if (item.type !== "potion") return;

      const healAmount = item.stats?.health || 20;
      const newHealth = Math.min(
        state.player.stats.maxHealth,
        state.player.stats.health + healAmount,
      );

      dispatch({ type: "REMOVE_ITEM", payload: item.id });
      dispatch({
        type: "UPDATE_PLAYER_STATS",
        payload: { health: newHealth },
      });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: { potionsConsumed: state.runStats.potionsConsumed + 1 },
      });

      logger.potionUsed(item, healAmount);

      // Apply any effects the potion has
      if (item.effects && item.effects.length > 0) {
        for (const effect of item.effects) {
          dispatch({ type: "ADD_EFFECT", payload: effect });
          logger.effectApplied(effect, "player");
        }
      }
    },
    [state.player.stats, state.runStats.potionsConsumed, dispatch, logger],
  );

  // Drop/discard an item
  const dropItem = useCallback(
    (item: Item) => {
      dispatch({ type: "REMOVE_ITEM", payload: item.id });
      logger.itemDiscarded(item);
    },
    [dispatch, logger],
  );

  // Add item to inventory
  const addItem = useCallback(
    (item: Item) => {
      dispatch({ type: "ADD_ITEM", payload: item });
      logger.itemFound(item);
      updateRunStats({
        itemsFound: [...state.runStats.itemsFound, item],
      });
    },
    [dispatch, logger, updateRunStats, state.runStats.itemsFound],
  );

  // Get inventory categorized by type
  const getCategorizedInventory = useCallback(() => {
    const weapons = state.player.inventory.filter((i) => i.type === "weapon");
    const armor = state.player.inventory.filter((i) => i.type === "armor");
    const potions = state.player.inventory.filter((i) => i.type === "potion");
    const misc = state.player.inventory.filter(
      (i) => !["weapon", "armor", "potion"].includes(i.type),
    );

    return { weapons, armor, potions, misc };
  }, [state.player.inventory]);

  // Check if inventory has room
  const hasInventorySpace = useCallback(
    (maxItems = 20) => {
      return state.player.inventory.length < maxItems;
    },
    [state.player.inventory.length],
  );

  // Get total inventory value
  const getInventoryValue = useCallback(() => {
    return state.player.inventory.reduce((sum, item) => sum + item.value, 0);
  }, [state.player.inventory]);

  return {
    // Actions
    equipItem,
    unequipItem,
    consumePotion,
    dropItem,
    addItem,

    // Queries
    getCategorizedInventory,
    hasInventorySpace,
    getInventoryValue,

    // Direct access
    inventory: state.player.inventory,
    equipment: state.player.equipment,
    keys: state.player.keys,
  };
}
