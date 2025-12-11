"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  DungeonKey,
  KeyRarity,
  MapTier,
  MapItem,
  CraftingCurrency,
  Item,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { gameActions } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { createDungeonKey, createDungeonFromMap } from "@/lib/core/game-data";
import { generateMap } from "@/lib/items/map-generator";
import { createCurrency, applyCurrencyToMap } from "@/lib/items/currency-generator";
import { levelUpAbility } from "@/lib/character/ability-system";
import type { EssenceCraftRecipe } from "@/lib/items/transmogrification-system";
import type { AlchemyResult } from "@/lib/ai/ai-alchemy-system";
import { EntityText } from "@/components/narrative/entity-text";

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

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseTavernOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  addLog: AddLogFn;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTavern({
  state,
  dispatch,
  logger,
  addLog,
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

  // ==========================================================================
  // MAP SYSTEM HANDLERS
  // ==========================================================================

  const buyMap = useCallback(
    (tier: MapTier, price: number) => {
      if (state.player.stats.gold < price) return;

      const map = generateMap({ tier, rarity: "common" });
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -price });
      dispatch({ type: "ADD_ITEM", payload: map });
      updateRunStats({ goldSpent: state.runStats.goldSpent + price });

      addLog(
        <span>
          You purchase a <EntityText type="item">{map.name}</EntityText> from Theron the Cartographer.
        </span>,
        "system",
      );
    },
    [state.player.stats.gold, state.runStats.goldSpent, dispatch, addLog, updateRunStats],
  );

  const buyCurrency = useCallback(
    (currencyId: string, price: number) => {
      if (state.player.stats.gold < price) return;

      const currency = createCurrency(currencyId);
      if (!currency) return;

      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -price });
      dispatch({ type: "ADD_ITEM", payload: currency });
      updateRunStats({ goldSpent: state.runStats.goldSpent + price });

      addLog(
        <span>
          You purchase an <EntityText type="item">{currency.name}</EntityText> from Theron.
        </span>,
        "system",
      );
    },
    [state.player.stats.gold, state.runStats.goldSpent, dispatch, addLog, updateRunStats],
  );

  const activateMap = useCallback(
    (map: MapItem) => {
      // Create dungeon from map
      const dungeon = createDungeonFromMap(map);

      // Remove map from inventory (consumed)
      dispatch({ type: "REMOVE_ITEM", payload: map.id });

      // Initialize dungeon run
      dispatch({
        type: "LOAD_STATE",
        payload: {
          ...state,
          phase: "exploring",
          currentDungeon: dungeon,
          floor: 1,
          player: {
            ...state.player,
            inventory: state.player.inventory.filter((i) => i.id !== map.id),
          },
        },
      });

      addLog(
        <span>
          You activate the <EntityText type="rare">{map.name}</EntityText>. The portal shimmers to life...
        </span>,
        "system",
      );
    },
    [state, dispatch, addLog],
  );

  const applyCurrency = useCallback(
    (currency: CraftingCurrency, map: MapItem) => {
      const result = applyCurrencyToMap(currency, map);

      if (!result.success) {
        addLog(<span className="text-red-400">{result.message}</span>, "system");
        return;
      }

      // Remove one currency from stack (or remove item if stack=1)
      const currentStack = currency.stackSize ?? 1;
      if (currentStack > 1) {
        const updatedCurrency = { ...currency, stackSize: currentStack - 1 };
        dispatch({
          type: "LOAD_STATE",
          payload: {
            ...state,
            player: {
              ...state.player,
              inventory: state.player.inventory.map((i) =>
                i.id === currency.id ? updatedCurrency : i.id === map.id ? result.map! : i
              ),
            },
          },
        });
      } else {
        dispatch({
          type: "LOAD_STATE",
          payload: {
            ...state,
            player: {
              ...state.player,
              inventory: state.player.inventory
                .filter((i) => i.id !== currency.id)
                .map((i) => (i.id === map.id ? result.map! : i)),
            },
          },
        });
      }

      addLog(
        <span>
          <EntityText type="item">{currency.name}</EntityText> applied: {result.message}
        </span>,
        "system",
      );
    },
    [state, dispatch, addLog],
  );

  const levelUpPlayerAbility = useCallback(
    (abilityId: string) => {
      const updatedPlayer = levelUpAbility(state.player, abilityId);
      if (!updatedPlayer) return;

      const ability = updatedPlayer.abilities.find((a) => a.id === abilityId);
      const newLevel = ability?.level || 1;

      dispatch({ type: "LOAD_STATE", payload: { ...state, player: updatedPlayer } });

      addLog(
        <span>
          Gregor guides your training.{" "}
          <EntityText type="ability">{ability?.name}</EntityText>{" "}
          improved to level <span className="text-amber-400">{newLevel}</span>!
        </span>,
        "system",
      );
    },
    [state, dispatch, addLog],
  );

  const transmogrify = useCallback(
    (itemIds: string[], narrations: string[]) => {
      // Remove the sacrificed items from inventory
      for (const itemId of itemIds) {
        dispatch({ type: "REMOVE_ITEM", payload: itemId });
      }

      // Log the narrations
      if (narrations.length > 0) {
        addLog(
          <span>
            The altar pulses with energy. {narrations[0]}
          </span>,
          "system",
        );
      } else {
        addLog(
          <span>
            The altar pulses with energy. Essence extracted from {itemIds.length} item{itemIds.length > 1 ? "s" : ""}.
          </span>,
          "system",
        );
      }
    },
    [dispatch, addLog],
  );

  const craftFromEssence = useCallback(
    (recipe: EssenceCraftRecipe, result: Item | null) => {
      if (result) {
        // Add the crafted item
        dispatch({ type: "ADD_ITEM", payload: result });

        addLog(
          <span>
            The altar glows as essence coalesces.{" "}
            <EntityText type={result.rarity} entity={result}>
              {result.name}
            </EntityText>{" "}
            materializes from pure essence!
          </span>,
          "system",
        );
      } else {
        addLog(
          <span className="text-red-400">
            The essence dissipates. The crafting of {recipe.name} failed.
          </span>,
          "system",
        );
      }
    },
    [dispatch, addLog],
  );

  const alchemyExperiment = useCallback(
    (result: AlchemyResult | null, materialsUsed: string[]) => {
      // Remove used materials
      dispatch(gameActions.removeMaterials(materialsUsed));

      if (result?.success && result.result) {
        // Map alchemy result type to Item type
        const typeMap: Record<string, Item["type"]> = {
          weapon: "weapon",
          armor: "armor",
          consumable: "potion",
          trinket: "misc",
          tool: "misc",
          material: "misc",
        };

        // Convert alchemy result to full Item with required fields
        const item: Item = {
          name: result.result.name,
          type: typeMap[result.result.type] || "misc",
          subtype: result.result.subtype,
          rarity: result.result.rarity,
          description: result.result.description,
          stats: result.result.stats,
          id: `alchemy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entityType: "item",
          value: Math.floor(10 * (["common", "uncommon", "rare", "epic", "legendary"].indexOf(result.result.rarity) + 1)),
        };

        // Add the created item
        dispatch({ type: "ADD_ITEM", payload: item });

        addLog(
          <span>
            Vesper nods approvingly.{" "}
            <EntityText type={item.rarity} entity={item}>
              {item.name}
            </EntityText>{" "}
            created!
          </span>,
          "system",
        );
      } else if (result?.failure) {
        addLog(
          <span className="text-red-400">
            The experiment fails. {result.failure.reason}
            {result.failure.hint && (
              <span className="text-amber-400/70"> Hint: {result.failure.hint}</span>
            )}
          </span>,
          "system",
        );
      }
    },
    [dispatch, addLog],
  );

  return {
    // Actions
    restoreHealth,
    buyKey,
    fullRest,

    // Map System Actions
    buyMap,
    buyCurrency,
    activateMap,
    applyCurrency,
    levelUpPlayerAbility,
    transmogrify,
    craftFromEssence,
    alchemyExperiment,

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
