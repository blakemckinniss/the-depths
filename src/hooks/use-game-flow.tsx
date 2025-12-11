"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, PlayerClass, PlayerRace } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { createInitialGameState } from "@/contexts/game-context";
import { initializePlayerClass, CLASSES } from "@/lib/character/ability-system";
import { initializePlayerRace, RACE_DEFINITIONS } from "@/lib/character/race-system";
import { createInitialPlayer, createInitialRunStats, generateDungeonSelection } from "@/lib/core/game-data";
import { EntityText } from "@/components/narrative/entity-text";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

// ============================================================================
// TYPES
// ============================================================================

interface UseGameFlowOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  addLog: AddLogFn;
  clearLogs: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useGameFlow({
  state,
  dispatch,
  logger,
  addLog,
  clearLogs,
}: UseGameFlowOptions) {
  // Start a new game
  const startNewGame = useCallback(() => {
    const initialState = createInitialGameState();
    dispatch({ type: "RESET_GAME", payload: initialState });
    clearLogs();
    logger.system("A new adventure begins...");
  }, [dispatch, clearLogs, logger]);

  // Select a race (called first, before class)
  const selectRace = useCallback(
    (raceId: PlayerRace) => {
      const raceDef = RACE_DEFINITIONS[raceId];
      const initializedPlayer = initializePlayerRace(state.player, raceId);

      dispatch({ type: "UPDATE_PLAYER", payload: initializedPlayer });
      dispatch({ type: "SET_PHASE", payload: "class_select" });

      addLog(
        <span>
          You are a <EntityText type="uncommon">{raceDef.name}</EntityText>.{" "}
          {raceDef.description}
        </span>,
        "system",
      );
    },
    [state.player, dispatch, addLog],
  );

  // Select a class and begin
  const selectClass = useCallback(
    (classId: PlayerClass) => {
      const classDef = CLASSES[classId];
      const initializedPlayer = initializePlayerClass(state.player, classId);

      dispatch({ type: "UPDATE_PLAYER", payload: initializedPlayer });
      dispatch({ type: "SET_PHASE", payload: "tavern" });

      addLog(
        <span>
          You have chosen the path of the{" "}
          <EntityText type="rare">{classDef.name}</EntityText>. {classDef.lore}
        </span>,
        "system",
      );
      addLog(
        <span className="text-stone-400 text-sm italic">
          Starting abilities:{" "}
          {classDef.startingAbilities.map((id) => id.split("_")[1]).join(", ")}
        </span>,
        "system",
      );
    },
    [state.player, dispatch, addLog],
  );

  // Return to title screen
  const returnToTitle = useCallback(() => {
    const initialState = createInitialGameState();
    dispatch({ type: "RESET_GAME", payload: initialState });
    clearLogs();
  }, [dispatch, clearLogs]);

  // Restart after death
  const restartGame = useCallback(() => {
    const freshPlayer = createInitialPlayer();
    const freshRunStats = createInitialRunStats();

    dispatch({
      type: "UPDATE_PLAYER",
      payload: freshPlayer,
    });
    dispatch({ type: "SET_PHASE", payload: "title" });
    dispatch({ type: "SET_GAME_OVER", payload: false });
    dispatch({ type: "SET_GAME_STARTED", payload: false });
    dispatch({
      type: "UPDATE_RUN_STATS",
      payload: freshRunStats,
    });
    dispatch({ type: "END_COMBAT" });
    dispatch({ type: "CLEAR_DUNGEON" });

    clearLogs();
    logger.system("A new adventure awaits...");
  }, [dispatch, clearLogs, logger]);

  // Load a saved game
  const loadSavedGame = useCallback(
    (savedState: GameState) => {
      dispatch({ type: "LOAD_STATE", payload: savedState });
      logger.system("Game loaded successfully.");
    },
    [dispatch, logger],
  );

  // Check if game is in progress
  const isGameInProgress = useCallback(() => {
    return state.gameStarted && !state.gameOver;
  }, [state.gameStarted, state.gameOver]);

  // Check if player can access certain phases
  const canAccessTavern = useCallback(() => {
    return state.player.class !== null;
  }, [state.player.class]);

  const canAccessDungeonSelect = useCallback(() => {
    return state.player.class !== null && state.player.keys.length > 0;
  }, [state.player.class, state.player.keys.length]);

  // Get current game phase info
  const getPhaseInfo = useCallback(() => {
    return {
      phase: state.phase,
      isTitle: state.phase === "title",
      isTavern: state.phase === "tavern",
      isDungeonSelect: state.phase === "dungeon_select",
      isDungeon: state.phase === "dungeon",
      isCombat: state.phase === "combat" || state.inCombat,
      isGameOver: state.gameOver,
      isExploring: state.phase === "exploring",
    };
  }, [state.phase, state.inCombat, state.gameOver]);

  // Enter dungeon selection phase
  const enterDungeonSelect = useCallback(() => {
    const dungeons = generateDungeonSelection();
    dispatch({ type: "SET_PHASE", payload: "dungeon_select" });
    dispatch({ type: "SET_GAME_STARTED", payload: true });
    dispatch({ type: "SET_AVAILABLE_DUNGEONS", payload: dungeons });
  }, [dispatch]);

  // Return to tavern after death (without full restart)
  const returnToTavern = useCallback(() => {
    dispatch({ type: "SET_GAME_OVER", payload: false });
    dispatch({ type: "SET_PHASE", payload: "tavern" });
    addLog(
      <span className="text-amber-400">You drag yourself back to the tavern...</span>,
      "narrative",
    );
  }, [dispatch, addLog]);

  return {
    // Actions
    startNewGame,
    selectRace,
    selectClass,
    returnToTitle,
    restartGame,
    loadSavedGame,
    enterDungeonSelect,
    returnToTavern,

    // Queries
    isGameInProgress,
    canAccessTavern,
    canAccessDungeonSelect,
    getPhaseInfo,

    // State
    phase: state.phase,
    gameStarted: state.gameStarted,
    gameOver: state.gameOver,
    runStats: state.runStats,
  };
}
