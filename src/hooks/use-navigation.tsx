"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  PathOption,
  DungeonCard,
  DungeonKey,
  EnvironmentalHazard,
  Enemy,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import type { LootContainer } from "@/lib/ai/ai-drops-system";
import { generatePathOptions, getPathRewardMultiplier } from "@/lib/world/path-system";
import { generateHazard, applyHazardToEnemy } from "@/lib/world/hazard-system";
import {
  generateDungeonSelection,
  generateEnemy,
  generateWeapon,
  generateArmor,
  generateTrap,
  generateShrine,
  generateNPC,
} from "@/lib/core/game-data";
import { generateEnemyAbility } from "@/lib/combat/combat-system";
import {
  generateLootContainer,
  enhanceEnemyWithLore,
  generateNPCDialogue,
} from "@/lib/ai/ai-drops-system";
import { EntityText, ItemText } from "@/components/narrative/entity-text";
import {
  orchestrateEvent,
  updateEventMemory,
  EVENT_MODIFIERS,
  EVENT_TWISTS,
  type EventType,
  type EventMemory,
} from "@/lib/mechanics/game-mechanics-ledger";

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

      // ========================================================================
      // EVENT ORCHESTRATION
      // Use the orchestrator to add variety via modifiers/twists
      // Path hints remain respected, but surprises happen
      // ========================================================================
      const playerHealthPercent = Math.round(
        (state.player.stats.health / state.player.stats.maxHealth) * 100
      );

      // Map path.roomType to EventType for orchestration
      const pathToEventType = (roomType: string | undefined): EventType | undefined => {
        if (!roomType) return undefined;
        const mapping: Record<string, EventType> = {
          enemy: "combat",
          combat: "combat",
          treasure: "treasure",
          trap: "trap",
          shrine: "shrine",
          npc: "npc",
          rest: "rest",
          boss: "boss",
          // mystery has no forced type - orchestrator picks freely
        };
        return mapping[roomType];
      };

      // Cast eventMemory to ledger's EventMemory type (compatible structure)
      const eventMemory: EventMemory = {
        history: state.eventMemory.history.map((h) => ({
          type: h.type as EventType,
          room: h.room,
          floor: h.floor,
        })),
        typeLastSeen: state.eventMemory.typeLastSeen as Map<EventType, number>,
        combatStreak: state.eventMemory.combatStreak,
        roomsSinceReward: state.eventMemory.roomsSinceReward,
      };

      const orchestrated = orchestrateEvent({
        floor: state.floor,
        room: newRoom,
        playerHealthPercent,
        playerGold: state.player.stats.gold,
        hasWeapon: state.player.equipment.weapon !== null,
        hasArmor: state.player.equipment.armor !== null,
        dungeonTheme,
        memory: eventMemory,
        forcedType: pathToEventType(path.roomType),
      });

      // Determine final event type - twists can transform the event
      let finalEventType: EventType = orchestrated.type;

      // Handle transformative twists (twist is a key like "mimic", "ambush", etc.)
      if (orchestrated.twist) {
        const twistKey = orchestrated.twist;
        const twistData = EVENT_TWISTS[twistKey];

        // Only some twists have transformsTo - check the specific ones
        if ("transformsTo" in twistData && twistData.transformsTo) {
          // Mimic transforms treasure to combat, betrayal transforms npc to combat, etc.
          finalEventType = twistData.transformsTo as EventType;

          // Log the twist narratively
          if (twistKey === "mimic") {
            addLog(
              <span className="text-amber-400">
                Something feels wrong about this treasure...
              </span>,
              "narrative"
            );
          } else if (twistKey === "ambush") {
            addLog(
              <span className="text-red-400">
                Shadows move! You've walked into an ambush!
              </span>,
              "combat"
            );
          } else if (twistKey === "betrayal") {
            addLog(
              <span className="text-red-500">
                Their eyes flash with malice. It was a trap all along!
              </span>,
              "combat"
            );
          }
        }

        // Handle non-transformative twists
        if (twistKey === "bonanza") {
          addLog(
            <span className="text-yellow-400">
              Fortune smiles upon you today!
            </span>,
            "loot"
          );
        } else if (twistKey === "revelation") {
          addLog(
            <span className="text-purple-400">
              A hidden truth reveals itself...
            </span>,
            "narrative"
          );
        }
      }

      // Log modifiers narratively (modifier is a key like "guarded", "trapped", etc.)
      if (orchestrated.modifier) {
        const modKey = orchestrated.modifier;
        if (modKey === "guarded") {
          addLog(
            <span className="text-orange-400">
              Something guards this place...
            </span>,
            "narrative"
          );
        } else if (modKey === "trapped") {
          addLog(
            <span className="text-yellow-600">
              You sense danger lurking in the shadows.
            </span>,
            "narrative"
          );
        } else if (modKey === "cursed") {
          addLog(
            <span className="text-purple-600">
              A dark aura permeates this chamber.
            </span>,
            "effect"
          );
        } else if (modKey === "blessed") {
          addLog(
            <span className="text-cyan-400">
              Divine light flickers at the edges of your vision.
            </span>,
            "effect"
          );
        } else if (modKey === "mysterious") {
          addLog(
            <span className="text-indigo-400">
              Reality seems uncertain here...
            </span>,
            "narrative"
          );
        }
      }

      // Update event memory with this event
      const updatedMemory = updateEventMemory(
        eventMemory,
        finalEventType,
        newRoom,
        state.floor
      );
      dispatch({ type: "UPDATE_EVENT_MEMORY", payload: updatedMemory });

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

      // Apply trapped modifier - add trap damage before primary event
      if (orchestrated.modifier === "trapped" && finalEventType !== "trap") {
        const trapDamage = Math.floor(5 + state.floor * 2 + Math.random() * 5);
        dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -trapDamage });
        addLog(
          <span>
            <EntityText type="damage">
              A hidden trap springs! You take {trapDamage} damage!
            </EntityText>
          </span>,
          "combat"
        );
      }

      // ========================================================================
      // EVENT HANDLING (uses finalEventType from orchestrator)
      // ========================================================================
      if (finalEventType === "combat") {
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
      } else if (finalEventType === "treasure") {
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
      } else if (finalEventType === "trap") {
        const trap = generateTrap(state.floor);
        logger.trapEncounter(trap);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "trap_encounter" });
        dispatch({ type: "SET_ACTIVE_TRAP", payload: trap });
      } else if (finalEventType === "shrine") {
        const shrine = generateShrine(state.floor);
        logger.shrineEncounter(shrine);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "shrine_choice" });
        dispatch({ type: "SET_ACTIVE_SHRINE", payload: shrine });
      } else if (finalEventType === "npc") {
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
      } else if (finalEventType === "rest") {
        // Rest room - heal and recover
        const healAmount = Math.floor(state.player.stats.maxHealth * 0.25);
        dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: healAmount });
        addLog(
          <span className="text-green-400">
            You find a quiet alcove to rest. You recover{" "}
            <EntityText type="heal">{healAmount} health</EntityText>.
          </span>,
          "effect"
        );
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
      } else if (finalEventType === "boss") {
        // Boss encounter - stronger enemy
        const boss = generateEnemy(state.floor + 2); // Boss is tougher
        boss.name = `${dungeonTheme} Guardian`;
        boss.maxHealth = Math.floor(boss.maxHealth * 1.5);
        boss.health = boss.maxHealth;
        boss.attack = Math.floor(boss.attack * 1.3);
        boss.expReward = Math.floor(boss.expReward * 2);
        boss.goldReward = Math.floor(boss.goldReward * 2);
        boss.abilities = [generateEnemyAbility(boss.name, state.floor + 1)];

        enhanceEnemyWithLore(boss, state.floor).then((enhanced: Enemy) => {
          dispatch({ type: "UPDATE_ENEMY", payload: enhanced });
        });

        const buffedBoss = newHazard ? applyHazardToEnemy(boss, newHazard) : boss;

        addLog(
          <span className="text-red-500 font-bold">
            A powerful guardian blocks your path!
          </span>,
          "combat"
        );
        logger.enemyEncounter(boss);

        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "START_COMBAT", payload: buffedBoss });
      } else if (finalEventType === "mystery") {
        // Mystery event - random outcome
        const mysteryRoll = Math.random();
        if (mysteryRoll < 0.3) {
          // Good outcome - treasure
          const goldFound = Math.floor(20 + state.floor * 10 + Math.random() * 30);
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldFound });
          addLog(
            <span className="text-yellow-400">
              The mystery reveals a hidden cache!{" "}
              <EntityText type="gold">{goldFound} gold</EntityText> found!
            </span>,
            "loot"
          );
        } else if (mysteryRoll < 0.5) {
          // Healing outcome
          const healAmount = Math.floor(state.player.stats.maxHealth * 0.3);
          dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: healAmount });
          addLog(
            <span className="text-cyan-400">
              Mystical energies restore you.{" "}
              <EntityText type="heal">{healAmount} health</EntityText> recovered.
            </span>,
            "effect"
          );
        } else if (mysteryRoll < 0.7) {
          // Nothing happens
          addLog(
            <span className="text-indigo-400">
              The mystery fades, leaving only silence...
            </span>,
            "narrative"
          );
        } else {
          // Bad outcome - damage
          const damage = Math.floor(5 + state.floor * 3);
          dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
          addLog(
            <span className="text-purple-500">
              Dark energies lash out!{" "}
              <EntityText type="damage">You take {damage} damage!</EntityText>
            </span>,
            "combat"
          );
        }
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
      } else {
        // Fallback - empty room
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
