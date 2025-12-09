"use client";

import { useCallback } from "react";
import type {
  GameState,
  NPC,
  Shrine,
  Trap,
  Item,
  StatusEffect,
  Enemy,
} from "@/lib/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger } from "@/lib/game-log-system";
import { calculateDisarmChance } from "@/lib/game-data";

// ============================================================================
// TYPES
// ============================================================================

interface UseEncountersOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
  setIsProcessing: (processing: boolean) => void;
}

interface TrapResult {
  success: boolean;
  damage?: number;
  effect?: StatusEffect;
}

interface ShrineResult {
  success: boolean;
  effect?: StatusEffect;
  item?: Item;
  gold?: number;
  healthCost?: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEncounters({
  state,
  dispatch,
  logger,
  updateRunStats,
  setIsProcessing,
}: UseEncountersOptions) {
  // ========== NPC ENCOUNTERS ==========

  // Start NPC interaction
  const startNPCInteraction = useCallback(
    (npc: NPC) => {
      dispatch({ type: "SET_ACTIVE_NPC", payload: npc });
      dispatch({ type: "SET_PHASE", payload: "npc_interaction" });
      logger.npcEncounter(npc);
    },
    [dispatch, logger],
  );

  // End NPC interaction
  const endNPCInteraction = useCallback(() => {
    const npc = state.activeNPC;
    dispatch({ type: "SET_ACTIVE_NPC", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (npc) {
      logger.npcIgnored(npc);
    }
  }, [state.activeNPC, dispatch, logger]);

  // Trade with NPC
  const tradeWithNPC = useCallback(
    (item: Item, cost: number) => {
      const npc = state.activeNPC;
      if (!npc) return false;

      if (state.player.stats.gold < cost) {
        return false;
      }

      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });
      dispatch({ type: "ADD_ITEM", payload: item });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: { goldSpent: state.runStats.goldSpent + cost },
      });

      logger.npcTrade(npc, item, cost);

      return true;
    },
    [
      state.activeNPC,
      state.player.stats.gold,
      state.runStats.goldSpent,
      dispatch,
      logger,
    ],
  );

  // ========== SHRINE ENCOUNTERS ==========

  // Start shrine interaction
  const startShrineInteraction = useCallback(
    (shrine: Shrine) => {
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: shrine });
      dispatch({ type: "SET_PHASE", payload: "shrine_choice" });
      logger.shrineEncounter(shrine);
    },
    [dispatch, logger],
  );

  // Interact with shrine (accept blessing)
  const acceptShrineBlessing = useCallback((): ShrineResult => {
    const shrine = state.activeShrine;
    if (!shrine || shrine.used) {
      return { success: false };
    }

    const result: ShrineResult = { success: true };

    // Pay costs
    if (shrine.cost?.health) {
      dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -shrine.cost.health });
      result.healthCost = shrine.cost.health;
    }
    if (shrine.cost?.gold) {
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -shrine.cost.gold });
    }

    // Receive rewards
    if (shrine.reward?.effect) {
      dispatch({ type: "ADD_EFFECT", payload: shrine.reward.effect });
      result.effect = shrine.reward.effect;
      logger.shrineBlessing(shrine, shrine.reward.effect);
    }
    if (shrine.reward?.item) {
      dispatch({ type: "ADD_ITEM", payload: shrine.reward.item });
      result.item = shrine.reward.item;
    }
    if (shrine.reward?.gold) {
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: shrine.reward.gold });
      result.gold = shrine.reward.gold;
    }

    // Mark shrine as used
    dispatch({
      type: "SET_ACTIVE_SHRINE",
      payload: { ...shrine, used: true },
    });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    return result;
  }, [state.activeShrine, dispatch, logger]);

  // Leave shrine without interacting
  const ignoreSshrine = useCallback(() => {
    const shrine = state.activeShrine;
    dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (shrine) {
      logger.shrineIgnored(shrine);
    }
  }, [state.activeShrine, dispatch, logger]);

  // ========== TRAP ENCOUNTERS ==========

  // Start trap encounter
  const startTrapEncounter = useCallback(
    (trap: Trap) => {
      dispatch({ type: "SET_ACTIVE_TRAP", payload: trap });
      dispatch({ type: "SET_PHASE", payload: "trap_encounter" });
      logger.trapEncounter(trap);
    },
    [dispatch, logger],
  );

  // Attempt to disarm trap
  const attemptDisarm = useCallback((): TrapResult => {
    const trap = state.activeTrap;
    if (!trap) return { success: false };

    const disarmChance = calculateDisarmChance(state.player, trap);
    const roll = Math.random();
    const success = roll < disarmChance;

    if (success) {
      dispatch({
        type: "SET_ACTIVE_TRAP",
        payload: { ...trap, triggered: true },
      });
      dispatch({ type: "SET_PHASE", payload: "exploring" });
      logger.trapDisarmed(trap);
      return { success: true };
    } else {
      // Failed disarm triggers the trap
      const damage = trap.damage || 0;
      dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
      dispatch({
        type: "SET_ACTIVE_TRAP",
        payload: { ...trap, triggered: true },
      });
      dispatch({ type: "SET_PHASE", payload: "exploring" });

      if (trap.effect) {
        dispatch({ type: "ADD_EFFECT", payload: trap.effect });
      }

      updateRunStats({ damageTaken: state.runStats.damageTaken + damage });
      logger.trapTriggered(trap, damage);

      return { success: false, damage, effect: trap.effect };
    }
  }, [
    state.activeTrap,
    state.player,
    state.runStats.damageTaken,
    dispatch,
    logger,
    updateRunStats,
  ]);

  // Avoid trap (go around)
  const avoidTrap = useCallback(() => {
    const trap = state.activeTrap;
    dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (trap) {
      logger.trapAvoided(trap);
    }
  }, [state.activeTrap, dispatch, logger]);

  // Trigger trap (walk through)
  const triggerTrap = useCallback((): TrapResult => {
    const trap = state.activeTrap;
    if (!trap) return { success: false };

    const damage = trap.damage || 0;
    dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
    dispatch({
      type: "SET_ACTIVE_TRAP",
      payload: { ...trap, triggered: true },
    });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (trap.effect) {
      dispatch({ type: "ADD_EFFECT", payload: trap.effect });
    }

    updateRunStats({ damageTaken: state.runStats.damageTaken + damage });
    logger.trapTriggered(trap, damage);

    return { success: false, damage, effect: trap.effect };
  }, [
    state.activeTrap,
    state.runStats.damageTaken,
    dispatch,
    logger,
    updateRunStats,
  ]);

  // ========== COMBAT ENCOUNTERS ==========

  // Start combat with enemy
  const startCombat = useCallback(
    (enemy: Enemy) => {
      dispatch({ type: "START_COMBAT", payload: enemy });
      logger.enemyEncounter(enemy);
    },
    [dispatch, logger],
  );

  // End combat
  const endCombat = useCallback(() => {
    dispatch({ type: "END_COMBAT" });
  }, [dispatch]);

  // ========== QUERIES ==========

  const hasActiveEncounter = useCallback(() => {
    return (
      state.activeNPC !== null ||
      state.activeShrine !== null ||
      state.activeTrap !== null
    );
  }, [state.activeNPC, state.activeShrine, state.activeTrap]);

  return {
    // NPC
    startNPCInteraction,
    endNPCInteraction,
    tradeWithNPC,
    activeNPC: state.activeNPC,

    // Shrine
    startShrineInteraction,
    acceptShrineBlessing,
    ignoreShrine: ignoreSshrine,
    activeShrine: state.activeShrine,

    // Trap
    startTrapEncounter,
    attemptDisarm,
    avoidTrap,
    triggerTrap,
    activeTrap: state.activeTrap,

    // Combat
    startCombat,
    endCombat,
    inCombat: state.inCombat,
    currentEnemy: state.currentEnemy,

    // Queries
    hasActiveEncounter,
  };
}
