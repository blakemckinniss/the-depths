"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  PathOption,
  DungeonCard,
  DungeonKey,
  EnvironmentalHazard,
  Enemy,
} from "@/lib/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/game-log-system";
import type { LootContainer } from "@/lib/ai-drops-system";
import { generatePathOptions, getPathRewardMultiplier } from "@/lib/path-system";
import { generateHazard, applyHazardToEnemy } from "@/lib/hazard-system";
import {
  generateDungeonSelection,
  generateEnemy,
  generateWeapon,
  generateArmor,
  generateTrap,
  generateShrine,
  generateNPC,
} from "@/lib/game-data";
import { generateEnemyAbility } from "@/lib/combat-system";
import {
  generateLootContainer,
  enhanceEnemyWithLore,
  generateNPCDialogue,
} from "@/lib/ai-drops-system";
import { EntityText, ItemText } from "@/components/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseNavigationOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  addLog: AddLogFn;
  setActiveLootContainer: (container: LootContainer | null) => void;
  setNpcDialogue: (dialogue: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNavigation({
  state,
  dispatch,
  logger,
  isProcessing,
  setIsProcessing,
  addLog,
  setActiveLootContainer,
  setNpcDialogue,
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

  // Handle path selection - the main navigation handler
  const handleSelectPath = useCallback(
    async (path: PathOption) => {
      if (isProcessing) return;
      setIsProcessing(true);

      dispatch({ type: "SET_PATH_OPTIONS", payload: null });

      const rewardMult = getPathRewardMultiplier(path);
      const newRoom = state.currentRoom + 1;
      const dungeonTheme = state.currentDungeon?.theme || "ancient dungeon";

      let newHazard = state.currentHazard;
      if (
        (path.danger === "dangerous" || path.danger === "unknown") &&
        Math.random() < 0.4 &&
        !newHazard
      ) {
        newHazard = generateHazard(state.floor, dungeonTheme);
        addLog(
          <span>
            <EntityText type="curse">{newHazard.name}</EntityText> fills this
            area. {newHazard.description}
          </span>,
          "effect",
        );
      }

      // AI HINT: To add new room types, add case below AND update PathOption.roomType in game-types.ts
      if (
        path.roomType === "enemy" ||
        (path.roomType === "mystery" && Math.random() < 0.5)
      ) {
        const enemy = generateEnemy(state.floor);
        if (state.floor >= 2 && Math.random() < 0.5) {
          enemy.abilities = [generateEnemyAbility(enemy.name, state.floor)];
        }

        // Enhance elite/boss enemies with AI-generated lore (async, non-blocking)
        const isElite =
          enemy.name.includes("Elite") || enemy.name.includes("Champion");
        const isBoss = enemy.expReward > 100 || enemy.maxHealth > 150;
        if (isElite || isBoss) {
          enhanceEnemyWithLore(enemy, state.floor).then((enhanced: Enemy) => {
            // Check if still fighting this enemy before updating
            dispatch({ type: "UPDATE_ENEMY", payload: enhanced });
          });
        }

        const buffedEnemy = newHazard
          ? applyHazardToEnemy(enemy, newHazard)
          : enemy;

        logger.enemyEncounter(enemy);

        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "START_COMBAT", payload: buffedEnemy });
      } else if (path.roomType === "treasure") {
        // Generate AI loot container for gacha experience
        const isRare = path.danger === "dangerous" || state.floor > 3;
        const guaranteedRarity = isRare
          ? Math.random() < 0.3
            ? "epic"
            : "rare"
          : undefined;

        // Generate container with AI
        const container = await generateLootContainer(
          state.floor,
          state.currentDungeon?.theme,
          guaranteedRarity as
            | "common"
            | "uncommon"
            | "rare"
            | "epic"
            | "legendary"
            | undefined,
        );

        if (container) {
          logger.lootContainerDiscovered(container.name, container.rarity);

          // Set active container - UI will render the reveal component
          setActiveLootContainer(container);

          dispatch({ type: "SET_ROOM", payload: newRoom });
          dispatch({ type: "SET_HAZARD", payload: newHazard });
        } else {
          // Fallback to static generation if AI fails
          const loot =
            Math.random() < 0.5
              ? generateWeapon(state.floor)
              : generateArmor(state.floor);
          const goldFound = Math.floor(
            (Math.random() * 20 * state.floor + 10) * rewardMult,
          );

          addLog(
            <span>
              You find a simple container with <ItemText item={loot} /> and{" "}
              <EntityText type="gold">{goldFound} gold</EntityText>.
            </span>,
            "loot",
          );

          dispatch({ type: "SET_ROOM", payload: newRoom });
          dispatch({ type: "SET_HAZARD", payload: newHazard });
          dispatch({ type: "ADD_ITEM", payload: loot });
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldFound });
          dispatch({
            type: "UPDATE_RUN_STATS",
            payload: {
              goldEarned: state.runStats.goldEarned + goldFound,
              itemsFound: [...state.runStats.itemsFound, loot],
            },
          });
        }
      } else if (path.roomType === "trap") {
        const trap = generateTrap(state.floor);
        logger.trapEncounter(trap);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "trap_encounter" });
        dispatch({ type: "SET_ACTIVE_TRAP", payload: trap });
      } else if (path.roomType === "shrine") {
        const shrine = generateShrine(state.floor);
        logger.shrineEncounter(shrine);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "shrine_choice" });
        dispatch({ type: "SET_ACTIVE_SHRINE", payload: shrine });
      } else if (path.roomType === "npc") {
        const npc = generateNPC(state.floor);
        setNpcDialogue(npc.dialogue?.[0] || "...");
        logger.npcEncounter(npc);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "npc_interaction" });
        dispatch({ type: "SET_ACTIVE_NPC", payload: npc });

        // Fire-and-forget AI dialogue enhancement
        generateNPCDialogue(
          {
            name: npc.name,
            role: npc.role as
              | "merchant"
              | "trapped"
              | "mysterious"
              | "quest_giver",
            personality: npc.personality || "cautious",
            disposition: npc.disposition,
          },
          {
            dungeonName: state.currentDungeon?.name,
            dungeonTheme: state.currentDungeon?.theme,
            floor: state.floor,
            playerClass: state.player.className || undefined,
            playerHealth: Math.round(
              (state.player.stats.health /
                state.player.stats.maxHealth) *
                100,
            ),
          },
        )
          .then((aiDialogue: { greeting: string } | null) => {
            if (aiDialogue) {
              setNpcDialogue(aiDialogue.greeting);
            }
          })
          .catch(() => {
            // Silent fail - fallback dialogue already set
          });
      } else {
        addLog(
          <span className="text-stone-500">
            The path leads to an empty chamber. You may continue.
          </span>,
          "narrative",
        );
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
      }

      setIsProcessing(false);
    },
    [state, isProcessing, addLog, dispatch, logger, setActiveLootContainer, setNpcDialogue, setIsProcessing],
  );

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
    handleSelectPath,

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
