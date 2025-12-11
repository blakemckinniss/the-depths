"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Item, EquipmentSlot } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import { EntityText } from "@/components/narrative/entity-text";
import { executeItemUse } from "@/lib/items/item-execution";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseInventoryOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
}

// ============================================================================
// HOOK
// ============================================================================

export function useInventory({ state, dispatch, addLog }: UseInventoryOptions) {
  // Consume a potion
  const consumePotion = useCallback(
    (potion: Item) => {
      if (potion.type !== "potion" || !potion.stats?.health) return;

      const healAmount = Math.min(
        potion.stats.health,
        state.player.stats.maxHealth - state.player.stats.health,
      );

      addLog(
        <span>
          <EntityText type="player">You</EntityText> consume{" "}
          <EntityText type="potion">{potion.name}</EntityText>.{" "}
          <EntityText type="heal">+{healAmount} health</EntityText>.
        </span>,
        "system",
      );

      dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: healAmount });
      dispatch({ type: "REMOVE_ITEM", payload: potion.id });
    },
    [state.player.stats.maxHealth, state.player.stats.health, addLog, dispatch],
  );

  // Equip an item to appropriate slot
  const equipItem = useCallback(
    (item: Item) => {
      // Determine the equipment slot based on item properties
      let slot: EquipmentSlot | "weapon" | "armor" | null = null;

      if (item.type === "weapon" || item.category === "weapon") {
        // Check if it's a shield (goes to offHand)
        if (item.subtype === "shield" || item.armorProps?.slot === "shield") {
          slot = "offHand";
        } else {
          slot = "mainHand";
        }
      } else if (item.type === "armor" || item.category === "armor") {
        // Use armorProps.slot if available, otherwise map from subtype
        const armorSlot = item.armorProps?.slot || item.subtype;
        switch (armorSlot) {
          case "head": slot = "head"; break;
          case "chest": slot = "chest"; break;
          case "legs": slot = "legs"; break;
          case "feet": slot = "feet"; break;
          case "hands": slot = "hands"; break;
          case "shield": slot = "offHand"; break;
          case "cloak": slot = "cloak"; break;
          case "belt": slot = "belt"; break;
          default: slot = "chest"; // Default armor to chest
        }
      } else if (item.category === "trinket") {
        // Trinkets go to appropriate accessory slot
        const trinketType = item.subtype;
        switch (trinketType) {
          case "ring":
            // Use ring1 if empty, else ring2
            slot = state.player.equipment.ring1 ? "ring2" : "ring1";
            break;
          case "amulet":
          case "necklace":
            slot = "amulet";
            break;
          case "cloak":
            slot = "cloak";
            break;
          default:
            slot = "amulet"; // Default trinkets to amulet
        }
      }

      // Legacy fallback for old items
      if (!slot) {
        if (item.type === "weapon") slot = "mainHand";
        else if (item.type === "armor") slot = "chest";
        else return; // Can't equip this item
      }

      addLog(
        <span>
          <EntityText type="player">You</EntityText> equip{" "}
          <EntityText
            type={
              item.rarity === "legendary"
                ? "legendary"
                : item.rarity === "rare"
                  ? "rare"
                  : "item"
            }
          >
            {item.name}
          </EntityText>
          .
        </span>,
        "system",
      );

      dispatch({ type: "EQUIP_ITEM", payload: { item, slot } });

      // Also update legacy aliases for backwards compatibility
      if (slot === "mainHand") {
        dispatch({ type: "EQUIP_ITEM", payload: { item, slot: "weapon" } });
      } else if (slot === "chest") {
        dispatch({ type: "EQUIP_ITEM", payload: { item, slot: "armor" } });
      }
    },
    [state.player.equipment, addLog, dispatch],
  );

  // Drop an item
  const dropItem = useCallback(
    (item: Item) => {
      dispatch({ type: "REMOVE_ITEM", payload: item.id });
      addLog(
        <span className="text-stone-500">
          Dropped <EntityText type={item.rarity}>{item.name}</EntityText>.
        </span>,
        "system",
      );
    },
    [dispatch, addLog],
  );

  // Use an item (consumables, scrolls, etc.)
  const useItem = useCallback(
    (item: Item) => {
      const result = executeItemUse(item, state);

      // Dispatch all actions
      for (const action of result.actions) {
        dispatch(action);
      }

      // Log the result
      if (result.narration) {
        addLog(
          <span>
            <EntityText type="potion">{item.name}</EntityText>:{" "}
            <EntityText type={result.success ? "heal" : "damage"}>
              {result.narration}
            </EntityText>
          </span>,
          result.success ? "loot" : "system"
        );
      }

      // Log effects applied
      for (const effect of result.effectsApplied) {
        addLog(
          <span>
            <EntityText type="blessing">+ {effect.name}</EntityText>: {effect.description}
          </span>,
          "effect"
        );
      }
    },
    [state, dispatch, addLog],
  );

  return {
    // Actions
    consumePotion,
    equipItem,
    dropItem,
    useItem,

    // State shortcuts
    inventory: state.player.inventory,
    equipment: state.player.equipment,
    gold: state.player.stats.gold,
  };
}
