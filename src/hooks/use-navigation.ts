"use client";

import { useCallback } from "react";
import type {
  GameState,
  PathOption,
  DungeonCard,
  DungeonKey,
  EnvironmentalHazard,
} from "@/lib/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger } from "@/lib/game-log-system";
import { generatePathOptions } from "@/lib/path-system";
import { generateHazard } from "@/lib/hazard-system";
import { generateDungeonSelection } from "@/lib/game-data";

// ============================================================================
// TYPES
// ============================================================================

interface UseNavigationOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  setIsProcessing: (processing: boolean) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNavigation({
  state,
  dispatch,
  logger,
  setIsProcessing,
}: UseNavigationOptions) {
  // Generate path options for current location
  const generatePaths = useCallback(() => {
    if (!state.currentDungeon) return [];

    const paths = generatePathOptions(
      state.floor,
      state.currentRoom,
      state.currentDungeon.theme,
    );
    dispatch({ type: "SET_PATH_OPTIONS", payload: paths });
    return paths;
  }, [state.floor, state.currentRoom, state.currentDungeon, dispatch]);

  // Clear path options
  const clearPaths = useCallback(() => {
    dispatch({ type: "SET_PATH_OPTIONS", payload: null });
  }, [dispatch]);

  // Move to a new room
  const moveToRoom = useCallback(
    (roomNumber: number, hazard: EnvironmentalHazard | null = null) => {
      dispatch({ type: "SET_ROOM", payload: roomNumber });
      dispatch({ type: "SET_HAZARD", payload: hazard });
      dispatch({ type: "SET_PATH_OPTIONS", payload: null });
    },
    [dispatch],
  );

  // Descend to next floor
  const descendFloor = useCallback(() => {
    const newFloor = state.floor + 1;
    dispatch({ type: "SET_FLOOR", payload: newFloor });
    dispatch({ type: "SET_ROOM", payload: 0 });
    dispatch({ type: "SET_HAZARD", payload: null });
    dispatch({ type: "SET_PATH_OPTIONS", payload: null });

    logger.floorDescended(newFloor);

    return newFloor;
  }, [state.floor, dispatch, logger]);

  // Enter dungeon select phase
  const enterDungeonSelect = useCallback(() => {
    const dungeons = generateDungeonSelection();
    dispatch({ type: "SET_PHASE", payload: "dungeon_select" });
    dispatch({
      type: "UPDATE_PLAYER",
      payload: { ...state.player },
    });
    // Store available dungeons - this would need to be added to the reducer
    // For now, we'll use a different approach
    dispatch({ type: "SET_GAME_STARTED", payload: true });

    return dungeons;
  }, [state.player, dispatch]);

  // Select and enter a dungeon
  const selectDungeon = useCallback(
    (dungeon: DungeonCard, keyToUse: DungeonKey) => {
      setIsProcessing(true);

      // Remove key if it's consumed on use
      if (keyToUse.consumedOnUse) {
        dispatch({ type: "REMOVE_KEY", payload: keyToUse.id });
      }

      dispatch({ type: "SET_DUNGEON", payload: dungeon });
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ROOM", payload: 0 });
      dispatch({ type: "SET_HAZARD", payload: null });

      logger.dungeonEntered(dungeon.name);

      if (keyToUse.consumedOnUse) {
        logger.system("The key crumbles to dust as the lock clicks open.");
      }

      setIsProcessing(false);

      return dungeon;
    },
    [dispatch, logger, setIsProcessing],
  );

  // Complete current dungeon
  const completeDungeon = useCallback(() => {
    if (!state.currentDungeon) return;

    const dungeonName = state.currentDungeon.name;
    logger.dungeonComplete(dungeonName);

    dispatch({
      type: "UPDATE_RUN_STATS",
      payload: {
        dungeonsCompleted: [
          ...state.runStats.dungeonsCompleted,
          state.currentDungeon.id,
        ],
      },
    });

    dispatch({ type: "CLEAR_DUNGEON" });
    dispatch({ type: "SET_PHASE", payload: "tavern" });

    return dungeonName;
  }, [
    state.currentDungeon,
    state.runStats.dungeonsCompleted,
    dispatch,
    logger,
  ]);

  // Return to tavern
  const returnToTavern = useCallback(() => {
    dispatch({ type: "SET_PHASE", payload: "tavern" });
    dispatch({ type: "END_COMBAT" });
    dispatch({ type: "SET_ACTIVE_NPC", payload: null });
    dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
    dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
  }, [dispatch]);

  // Check if at floor boss
  const isAtFloorBoss = useCallback(() => {
    if (!state.currentDungeon) return false;
    const roomsPerFloor = 5;
    return state.currentRoom >= roomsPerFloor;
  }, [state.currentDungeon, state.currentRoom]);

  // Check if dungeon is complete
  const isDungeonComplete = useCallback(() => {
    if (!state.currentDungeon) return false;
    return state.floor >= state.currentDungeon.floors && isAtFloorBoss();
  }, [state.currentDungeon, state.floor, isAtFloorBoss]);

  // Generate a hazard for the current floor
  const generateFloorHazard = useCallback(() => {
    if (!state.currentDungeon) return null;
    return generateHazard(state.floor, state.currentDungeon.theme);
  }, [state.floor, state.currentDungeon]);

  return {
    // Actions
    generatePaths,
    clearPaths,
    moveToRoom,
    descendFloor,
    enterDungeonSelect,
    selectDungeon,
    completeDungeon,
    returnToTavern,
    generateFloorHazard,

    // Queries
    isAtFloorBoss,
    isDungeonComplete,

    // State
    currentRoom: state.currentRoom,
    currentFloor: state.floor,
    currentDungeon: state.currentDungeon,
    pathOptions: state.pathOptions,
    currentHazard: state.currentHazard,
  };
}
