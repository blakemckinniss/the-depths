"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";

import type {
  GameState,
  LogEntry,
  GameChoice,
  Item,
  ItemRarity,
  Player,
  DungeonCard,
  DungeonKey,
  StatusEffect,
  Ability,
  PlayerClass,
  PathOption,
  CombatStance,
  RunSummary,
  EnvironmentalEntity,
  ParsedNarrative,
} from "@/lib/game-types";
import type { ChaosEvent } from "@/lib/chaos-system";
import {
  generateEnemy,
  generateWeapon,
  generateArmor,
  createDungeonKey,
  generateDungeonSelection,
  generateTrap,
  generateShrine,
  generateNPC,
  calculateDisarmChance,
  createInitialPlayer,
  createInitialRunStats,
} from "@/lib/game-data";
import { calculateEffectiveStats, STATUS_EFFECTS } from "@/lib/entity-system";
import {
  triggerTurnEnd,
  triggerOnAttack,
  triggerOnDamageDealt,
  triggerOnCriticalHit,
  triggerOnDamageTaken,
  triggerOnKill,
  triggerCombatStart,
  triggerCombatEnd,
  triggerRoomEnter,
} from "@/lib/effect-system";
import {
  initializePlayerClass,
  executeAbility,
  regenerateResource,
  tickCooldowns,
  getClassAbilitiesForLevel,
  CLASSES,
} from "@/lib/ability-system";
import {
  generatePathOptions,
  getPathRewardMultiplier,
} from "@/lib/path-system";
import {
  generateHazard,
  applyHazardToPlayer,
  applyHazardToEnemy,
  tickHazard,
  removeHazardEffects,
} from "@/lib/hazard-system";
import {
  calculateDamageWithType,
  checkForCombo,
  tickCombo,
  selectEnemyAbility,
  tickEnemyAbilities,
  generateEnemyAbility,
  STANCE_MODIFIERS,
} from "@/lib/combat-system";
import {
  getInteractionsForEntity,
  getAvailableInteractions,
} from "@/lib/environmental-system";
import {
  EntityText,
  EnemyText,
  ItemText,
  TrapText,
  ShrineText,
  NPCText,
} from "./entity-text";
// createGameLogger is provided via LogContext - see useLog() hook
import { GameLog } from "./game-log";
import { ChoiceButtons } from "./choice-buttons";
import { CombatDisplay } from "./combat-display";
import { SidebarInventory } from "./sidebar-inventory";
import { DungeonSelect } from "./dungeon-select";
import { SidebarKeys } from "./sidebar-keys";
import { ClassSelect } from "./class-select";
import { AbilityBar } from "./ability-bar";
import { PathSelect } from "./path-select";
import { HazardDisplay } from "./hazard-display";
import { TrapInteraction } from "./trap-interaction";
import { ShrineInteraction } from "./shrine-interaction";
import { NPCDialogue } from "./npc-dialogue";
import { Tavern } from "./tavern";
import { InteractiveNarrative } from "./interactive-narrative";
import { LootContainerReveal } from "./loot-container-reveal";
import { useSaveSystem, type SaveData } from "@/lib/save-system";
import { useGame } from "@/contexts/game-context";
import { useLog } from "@/contexts/log-context";
import { useUI } from "@/contexts/ui-context";
import { useGameFlow } from "@/hooks/use-game-flow";
import { useTavern } from "@/hooks/use-tavern";
import { useNavigation } from "@/hooks/use-navigation";
import { useEncounters } from "@/hooks/use-encounters";
import { useCombat } from "@/hooks/use-combat";
import { useDungeonMaster } from "@/lib/use-dungeon-master";
import {
  enhanceEnemyWithLore,
  generateFloorReward,
  getBossVictoryRewards,
  generateNPCDialogue,
  generateLootContainer,
  type LootContainer,
} from "@/lib/ai-drops-system";
import { GameMenu } from "./game-menu";
import { createWorldStateManager, type WorldState } from "@/lib/world-state";
import { DevPanel } from "./dev-panel";
import { SidebarStats } from "./sidebar-stats";
import {
  createInitialParty,
  getMaxActiveCompanions,
  addCompanionToParty,
  removeCompanionFromParty,
  swapCompanion,
  companionDeath,
  modifyBond,
  selectCompanionAction,
  calculateCompanionDamage,
  calculateCompanionDefense,
  processCompanionCooldowns,
  useCompanionAbility,
  canTameEnemy,
  canRescueNPC,
  createBasicCompanionFromEnemy,
  createBasicCompanionFromNPC,
  getBondTier,
  getCompanionColor,
} from "@/lib/companion-system";
import type { Companion, Enemy, SustainedAbility } from "@/lib/game-types";
import {
  activateSustained,
  deactivateSustained,
  processSustainedTurn,
  getEffectiveResources,
  getSustainedAbilitiesForClass,
} from "@/lib/sustained-ability-system";

// ... existing code (response interfaces) ...
interface RoomResponse {
  roomDescription: string;
  eventNarration: string;
}

interface CombatResponse {
  attackNarration: string;
  enemyReaction: string;
}

// Response interfaces - prefixed unused ones to satisfy linter
interface _EnemyEncounterResponse {
  encounterNarration: string;
  enemyDescription: string;
}

interface _LootResponse {
  discoveryNarration: string;
  itemDescription: string;
}

interface VictoryResponse {
  deathNarration: string;
  spoilsNarration: string;
}

interface FleeResponse {
  fleeNarration: string;
  outcome: string;
}

interface _DeathResponse {
  deathNarration: string;
}

const initialPlayer: Player = createInitialPlayer();

const initialState: GameState = {
  player: initialPlayer,
  currentRoom: 0,
  floor: 1,
  inCombat: false,
  currentEnemy: null,
  gameStarted: false,
  gameOver: false,
  phase: "title",
  availableDungeons: [],
  currentDungeon: null,
  currentBoss: null,
  activeNPC: null,
  activeShrine: null,
  activeTrap: null,
  eventHistory: [],
  roomEntities: [],
  turnCount: 0,
  currentHazard: null,
  pathOptions: null,
  combatRound: 1,
  runStats: createInitialRunStats(),
  roomEnvironmentalEntities: [], // added environmental entities to initial state
};

export function DungeonGame() {
  // =========================================================================
  // CONTEXT HOOKS - Primary state management via contexts
  // =========================================================================
  const { state: gameState, dispatch } = useGame();
  const { logs, addRawLog: addLog, clearLogs, logger: log } = useLog();
  const {
    showMenu,
    showDevPanel,
    showClassSelect,
    activeLootContainer,
    npcDialogue,
    currentNarrative,
    isProcessing,
    toggleMenu,
    toggleDevPanel,
    openMenu: setShowMenuTrue,
    closeMenu: setShowMenuFalse,
    openClassSelect,
    closeClassSelect,
    setActiveLootContainer,
    setNpcDialogue,
    setCurrentNarrative,
    setIsProcessing,
  } = useUI();

  // =========================================================================
  // LOCAL STATE - Only for things not in contexts
  // =========================================================================
  const [worldState, setWorldState] = useState<WorldState>(() =>
    createWorldStateManager().getState(),
  );
  const [chaosEvents, setChaosEvents] = useState<ChaosEvent[]>([]);
  const [hasExistingSaves, setHasExistingSaves] = useState(false); // Client-side only to avoid hydration mismatch

  const { autoSave, hasSaves, load, deserializeWorldState } = useSaveSystem();
  const { generate: generateNarrative, isGenerating: isAiGenerating } =
    useDungeonMaster();

  // =========================================================================
  // DOMAIN HOOKS - Game logic organized by domain
  // =========================================================================
  const gameFlow = useGameFlow({
    state: gameState,
    dispatch,
    logger: log,
    clearLogs,
  });

  // Check for saves only on client side to avoid hydration mismatch
  useEffect(() => {
    setHasExistingSaves(hasSaves());
  }, [hasSaves]);

  // Helper to add environmental entities (uses dispatch)
  const _addInteractiveLog = useCallback(
    (narrative: ParsedNarrative, entities: EnvironmentalEntity[]) => {
      setCurrentNarrative(narrative);
      dispatch({
        type: "SET_ROOM_ENTITIES",
        payload: [...gameState.roomEnvironmentalEntities, ...entities],
      });
    },
    [setCurrentNarrative, dispatch, gameState.roomEnvironmentalEntities],
  );

  // Helper to update run stats (uses dispatch)
  const updateRunStats = useCallback(
    (updates: Partial<RunSummary>) => {
      dispatch({ type: "UPDATE_RUN_STATS", payload: updates });
    },
    [dispatch],
  );

  // Additional domain hooks (after updateRunStats is defined)
  const tavern = useTavern({
    state: gameState,
    dispatch,
    logger: log,
    updateRunStats,
  });

  const navigation = useNavigation({
    state: gameState,
    dispatch,
    logger: log,
    setIsProcessing,
  });

  const encounters = useEncounters({
    state: gameState,
    dispatch,
    logger: log,
    updateRunStats,
    setIsProcessing,
  });

  const combat = useCombat({
    state: gameState,
    dispatch,
    logger: log,
    isProcessing,
    setIsProcessing,
    updateRunStats,
  });

  // =========================================================================
  // COMPATIBILITY SHIM: setGameState wrapper for incremental migration
  // This allows existing handlers to work while we migrate to pure dispatch
  // TODO: Remove once all handlers are migrated to use dispatch directly
  // =========================================================================
  const setGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      if (typeof updater === "function") {
        // For functional updates, we need to compute the new state
        // and dispatch LOAD_STATE with the full new state
        // This is not ideal but maintains compatibility
        const newState = updater(gameState);
        dispatch({ type: "LOAD_STATE", payload: newState });
      } else {
        dispatch({ type: "LOAD_STATE", payload: updater });
      }
    },
    [dispatch, gameState],
  );

  const turnCountRef = React.useRef(gameState.turnCount);
  turnCountRef.current = gameState.turnCount;

  useEffect(() => {
    if (
      gameState.gameStarted &&
      !gameState.gameOver &&
      turnCountRef.current > 0
    ) {
      autoSave(gameState, worldState, logs, chaosEvents);
    }
  }, [gameState, worldState, logs, chaosEvents, autoSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState.gameStarted && !gameState.gameOver) {
        toggleMenu();
      }
      // Toggle dev panel with backtick key
      if (e.key === "`") {
        e.preventDefault();
        toggleDevPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.gameStarted, gameState.gameOver, toggleMenu, toggleDevPanel]);

  // === SAVE/LOAD HANDLERS ===
  const handleLoadSave = useCallback(
    (data: SaveData) => {
      // Use gameFlow for state loading
      gameFlow.loadSavedGame(data.gameState as unknown as GameState);
      setWorldState(deserializeWorldState(data.worldState));
      setChaosEvents(data.chaosEvents || []);
      closeClassSelect();
      setShowMenuFalse();
    },
    [deserializeWorldState, gameFlow, closeClassSelect, setShowMenuFalse],
  );

  const handleNewGame = useCallback(() => {
    // Use gameFlow hook for new game
    gameFlow.startNewGame();
    setWorldState(createWorldStateManager().getState());
    setChaosEvents([]);
    closeClassSelect();
    setShowMenuFalse();
  }, [gameFlow, closeClassSelect, setShowMenuFalse]);

  const handleReturnToTitle = useCallback(() => {
    // Use gameFlow hook for return to title
    gameFlow.returnToTitle();
    setWorldState(createWorldStateManager().getState());
    setChaosEvents([]);
    closeClassSelect();
    setShowMenuFalse();
  }, [gameFlow, closeClassSelect, setShowMenuFalse]);

  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: { survivalTime: gameState.turnCount },
      });
    }
  }, [gameState.turnCount, gameState.gameStarted, gameState.gameOver, dispatch]);

  const handleChangeStance = useCallback(
    (stance: CombatStance) => {
      dispatch({ type: "SET_STANCE", payload: stance });
      const stanceNames = {
        balanced: "Balanced",
        aggressive: "Aggressive",
        defensive: "Defensive",
      };
      log.stanceChange(stanceNames[stance]);
    },
    [log, dispatch],
  );

  const handleEnvironmentalInteraction = useCallback(
    async (entityId: string, interactionId: string) => {
      if (isProcessing || isAiGenerating) return;
      setIsProcessing(true);

      const entity = gameState.roomEnvironmentalEntities.find(
        (e) => e.id === entityId,
      );
      if (!entity) {
        setIsProcessing(false);
        return;
      }

      const interaction = entity.possibleInteractions.find(
        (i) => i.id === interactionId,
      );
      if (!interaction) {
        setIsProcessing(false);
        return;
      }

      // Find if player has required item
      let itemUsed: string | undefined;
      if (interaction.requiresItem) {
        const foundItem = gameState.player.inventory.find((item) =>
          interaction.requiresItem!.some(
            (req) =>
              item.name.toLowerCase().includes(req.toLowerCase()) ||
              item.type.toLowerCase().includes(req.toLowerCase()),
          ),
        );
        itemUsed = foundItem?.name;
      }

      addLog(
        <span className="text-stone-400 italic">
          You {interaction.label.toLowerCase()} the{" "}
          <EntityText type="item">{entity.name}</EntityText>...
        </span>,
        "narrative",
      );

      // Generate AI outcome
      const result = (await generateNarrative<{
        narration: string;
        rewards: {
          gold?: number;
          healing?: number;
          damage?: number;
          experience?: number;
          item?: {
            name?: string;
            type?: string;
            rarity?: ItemRarity;
            description?: string;
            lore?: string;
          };
        };
        consequences: { entityConsumed: boolean };
        companionReaction?: string;
        newEntity?: {
          name: string;
          entityClass: string;
          description: string;
          interactionTags: string[];
        };
      }>("environmental_interaction", {
        entityName: entity.name,
        entityClass: entity.entityClass,
        entityDescription: entity.description,
        interactionAction: interaction.action,
        interactionLabel: interaction.label,
        dangerLevel: interaction.dangerLevel,
        itemUsed,
        playerLevel: gameState.player.stats.level,
        floor: gameState.floor,
      })) ?? {
        narration: "The object reacts to your interaction.",
        rewards: { gold: Math.floor(Math.random() * 10) + 1 },
        consequences: { entityConsumed: true },
      };

      if (result) {
        // Add narration
        addLog(<span>{result.narration}</span>, "narrative");

        // Process rewards
        if (result.rewards) {
          if (result.rewards.gold && result.rewards.gold > 0) {
            dispatch({ type: "MODIFY_PLAYER_GOLD", payload: result.rewards.gold });
            addLog(
              <span>
                Found{" "}
                <EntityText type="gold">{result.rewards.gold} gold</EntityText>.
              </span>,
              "loot",
            );
          }

          if (result.rewards.healing && result.rewards.healing > 0) {
            dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: result.rewards.healing });
            addLog(
              <span>
                Restored{" "}
                <EntityText type="heal">
                  {result.rewards.healing} health
                </EntityText>
                .
              </span>,
              "effect",
            );
          }

          if (result.rewards.damage && result.rewards.damage > 0) {
            dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -result.rewards.damage });
            addLog(
              <span>
                Took{" "}
                <EntityText type="damage">
                  {result.rewards.damage} damage
                </EntityText>
                !
              </span>,
              "combat",
            );
          }

          if (result.rewards.item) {
            const newItem: Item = {
              id: crypto.randomUUID(),
              name: result.rewards.item.name || "Mysterious Object",
              entityType: "item",
              type: (result.rewards.item.type as Item["type"]) || "misc",
              rarity: result.rewards.item.rarity || "common",
              value: 10,
              description: result.rewards.item.description,
              lore: result.rewards.item.lore,
            };
            dispatch({ type: "ADD_ITEM", payload: newItem });
            addLog(
              <span>
                Acquired{" "}
                <EntityText type={newItem.rarity}>{newItem.name}</EntityText>.
              </span>,
              "loot",
            );
          }

          if (result.rewards.experience && result.rewards.experience > 0) {
            dispatch({ type: "ADD_EXPERIENCE", payload: result.rewards.experience });
          }
        }

        // Process consequences
        if (result.consequences?.entityConsumed) {
          dispatch({
            type: "UPDATE_ROOM_ENTITY",
            payload: { id: entityId, changes: { consumed: true } },
          });
        }

        // Consume item if required
        if (interaction.consumesItem && itemUsed) {
          const itemToConsume = gameState.player.inventory.find(
            (i) => i.name === itemUsed,
          );
          if (itemToConsume) {
            dispatch({ type: "REMOVE_ITEM", payload: itemToConsume.id });
          }
          addLog(
            <span className="text-stone-500 text-sm">Used {itemUsed}.</span>,
            "system",
          );
        }

        // Companion reaction
        if (
          result.companionReaction &&
          gameState.player.party.active.length > 0
        ) {
          const companion = gameState.player.party.active[0];
          addLog(
            <span className="text-teal-400/80 italic">
              {companion.name}: &quot;{result.companionReaction}&quot;
            </span>,
            "dialogue",
          );
        }

        // Add new entity if spawned
        if (result.newEntity) {
          const newEnvEntity: EnvironmentalEntity = {
            id: crypto.randomUUID(),
            name: result.newEntity.name || "Something",
            description: result.newEntity.description || "",
            entityClass:
              (result.newEntity
                .entityClass as EnvironmentalEntity["entityClass"]) || "object",
            interactionTags: result.newEntity.interactionTags || [
              "interactive",
            ],
            possibleInteractions: [],
            consumed: false,
            revealed: true,
          };
          newEnvEntity.possibleInteractions =
            getInteractionsForEntity(newEnvEntity);
          dispatch({
            type: "SET_ROOM_ENTITIES",
            payload: [...gameState.roomEnvironmentalEntities, newEnvEntity],
          });
          addLog(
            <span>
              A <EntityText type="item">{newEnvEntity.name}</EntityText> is
              revealed.
            </span>,
            "narrative",
          );
        }
      }

      setIsProcessing(false);
    },
    [gameState, addLog, isProcessing, isAiGenerating], // Added missing dependencies
  );

  // === NAVIGATION HANDLERS ===
  const handleSelectPath = useCallback(
    async (path: PathOption) => {
      if (isProcessing) return;
      setIsProcessing(true);

      dispatch({ type: "SET_PATH_OPTIONS", payload: null });

      const rewardMult = getPathRewardMultiplier(path);
      const newRoom = gameState.currentRoom + 1;
      const dungeonTheme = gameState.currentDungeon?.theme || "ancient dungeon";

      let newHazard = gameState.currentHazard;
      if (
        (path.danger === "dangerous" || path.danger === "unknown") &&
        Math.random() < 0.4 &&
        !newHazard
      ) {
        newHazard = generateHazard(gameState.floor, dungeonTheme);
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
        const enemy = generateEnemy(gameState.floor);
        if (gameState.floor >= 2 && Math.random() < 0.5) {
          enemy.abilities = [generateEnemyAbility(enemy.name, gameState.floor)];
        }

        // Enhance elite/boss enemies with AI-generated lore (async, non-blocking)
        const isElite =
          enemy.name.includes("Elite") || enemy.name.includes("Champion");
        const isBoss = enemy.expReward > 100 || enemy.maxHealth > 150;
        if (isElite || isBoss) {
          enhanceEnemyWithLore(enemy, gameState.floor).then((enhanced) => {
            // Check if still fighting this enemy before updating
            dispatch({ type: "UPDATE_ENEMY", payload: enhanced });
          });
        }

        const buffedEnemy = newHazard
          ? applyHazardToEnemy(enemy, newHazard)
          : enemy;

        log.enemyEncounter(enemy);

        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "START_COMBAT", payload: buffedEnemy });
      } else if (path.roomType === "treasure") {
        // Generate AI loot container for gacha experience
        const isRare = path.danger === "dangerous" || gameState.floor > 3;
        const guaranteedRarity = isRare
          ? Math.random() < 0.3
            ? "epic"
            : "rare"
          : undefined;

        // Generate container with AI
        const container = await generateLootContainer(
          gameState.floor,
          gameState.currentDungeon?.theme,
          guaranteedRarity as
            | "common"
            | "uncommon"
            | "rare"
            | "epic"
            | "legendary"
            | undefined,
        );

        if (container) {
          log.lootContainerDiscovered(container.name, container.rarity);

          // Set active container - UI will render the reveal component
          setActiveLootContainer(container);

          dispatch({ type: "SET_ROOM", payload: newRoom });
          dispatch({ type: "SET_HAZARD", payload: newHazard });
        } else {
          // Fallback to static generation if AI fails
          const loot =
            Math.random() < 0.5
              ? generateWeapon(gameState.floor)
              : generateArmor(gameState.floor);
          const goldFound = Math.floor(
            (Math.random() * 20 * gameState.floor + 10) * rewardMult,
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
              goldEarned: gameState.runStats.goldEarned + goldFound,
              itemsFound: [...gameState.runStats.itemsFound, loot],
            },
          });
        }
      } else if (path.roomType === "trap") {
        const trap = generateTrap(gameState.floor);
        log.trapEncounter(trap);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "trap_encounter" });
        dispatch({ type: "SET_ACTIVE_TRAP", payload: trap });
      } else if (path.roomType === "shrine") {
        const shrine = generateShrine(gameState.floor);
        log.shrineEncounter(shrine);
        dispatch({ type: "SET_ROOM", payload: newRoom });
        dispatch({ type: "SET_HAZARD", payload: newHazard });
        dispatch({ type: "SET_PHASE", payload: "shrine_choice" });
        dispatch({ type: "SET_ACTIVE_SHRINE", payload: shrine });
      } else if (path.roomType === "npc") {
        const npc = generateNPC(gameState.floor);
        setNpcDialogue(npc.dialogue?.[0] || "...");
        log.npcEncounter(npc);
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
            dungeonName: gameState.currentDungeon?.name,
            dungeonTheme: gameState.currentDungeon?.theme,
            floor: gameState.floor,
            playerClass: gameState.player.className || undefined,
            playerHealth: Math.round(
              (gameState.player.stats.health /
                gameState.player.stats.maxHealth) *
                100,
            ),
          },
        )
          .then((aiDialogue) => {
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
    [gameState, isProcessing, addLog],
  );

  const handleSelectClass = useCallback(
    (classId: PlayerClass) => {
      const classDef = CLASSES[classId];
      // Use hook for state updates
      gameFlow.selectClass(classId);
      closeClassSelect();
      // Custom JSX logging (richer than hook's plain text)
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
    [addLog, closeClassSelect, gameFlow],
  );

  // ... existing code (enterDungeonSelect, selectDungeon, calculateDamage) ...

  const enterDungeonSelect = useCallback(() => {
    const dungeons = generateDungeonSelection();
    dispatch({ type: "SET_PHASE", payload: "dungeon_select" });
    dispatch({ type: "SET_GAME_STARTED", payload: true });
    // availableDungeons not in reducer yet - use shim
    setGameState((prev) => ({ ...prev, availableDungeons: dungeons }));
  }, [dispatch, setGameState]);

  const selectDungeon = useCallback(
    async (dungeon: DungeonCard, keyToUse: DungeonKey) => {
      setIsProcessing(true);

      // Remove key if consumed
      if (keyToUse.consumedOnUse) {
        dispatch({ type: "REMOVE_KEY", payload: keyToUse.id });
      }

      // Set dungeon state
      dispatch({ type: "SET_DUNGEON", payload: dungeon });
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ROOM", payload: 0 });
      dispatch({ type: "SET_HAZARD", payload: null });

      clearLogs(); // Clear logs for new dungeon

      if (dungeon.isMystery) {
        addLog(
          <span>
            <EntityText type="player">You</EntityText> use the{" "}
            <EntityText
              type={
                keyToUse.rarity === "legendary"
                  ? "legendary"
                  : keyToUse.rarity === "rare"
                    ? "rare"
                    : "item"
              }
            >
              {keyToUse.name}
            </EntityText>{" "}
            to unlock the <EntityText type="legendary">???</EntityText>{" "}
            dungeon...
          </span>,
          "system",
        );
        addLog(
          <span className="text-purple-400 italic">
            The door swings open to reveal...{" "}
            <EntityText type="location">{dungeon.name}</EntityText>!
          </span>,
          "narrative",
        );
      } else {
        addLog(
          <span>
            <EntityText type="player">You</EntityText> use the{" "}
            <EntityText
              type={
                keyToUse.rarity === "legendary"
                  ? "legendary"
                  : keyToUse.rarity === "rare"
                    ? "rare"
                    : "item"
              }
            >
              {keyToUse.name}
            </EntityText>{" "}
            to enter <EntityText type="location">{dungeon.name}</EntityText>.
          </span>,
          "system",
        );
      }

      if (keyToUse.consumedOnUse) {
        addLog(
          <span className="text-muted-foreground text-sm">
            The key crumbles to dust as the lock clicks open.
          </span>,
          "system",
        );
      }

      addLog(
        <span className="text-muted-foreground">
          A {dungeon.theme}. {dungeon.floors} floors of peril await.
        </span>,
        "narrative",
      );

      setIsProcessing(false);
    },
    [dispatch, clearLogs, addLog],
  );

  const calculateDamage = useCallback(
    (attacker: { attack: number }, defender: { defense: number }) => {
      const baseDamage = Math.max(
        1,
        attacker.attack - Math.floor(defender.defense * 0.5),
      );
      const variance = Math.floor(Math.random() * 5) - 2;
      return Math.max(1, baseDamage + variance);
    },
    [],
  );

  // === COMBAT HANDLERS ===
  // AI HINT: To add new class abilities, edit CLASSES in ability-system.ts. To add new combos, edit COMBO_DEFINITIONS in combat-system.ts
  const checkLevelUp = useCallback(() => {
    setGameState((prev) => {
      let player = prev.player;
      let levelsGained = 0;

      while (player.stats.experience >= player.stats.experienceToLevel) {
        player = {
          ...player,
          stats: {
            ...player.stats,
            experience:
              player.stats.experience - player.stats.experienceToLevel,
            level: player.stats.level + 1,
            maxHealth: player.stats.maxHealth + 10,
            health: player.stats.maxHealth + 10,
            attack: player.stats.attack + 2,
            defense: player.stats.defense + 1,
            strength: player.stats.strength + 1,
            intelligence: player.stats.intelligence + 1,
            dexterity: player.stats.dexterity + 1,
            experienceToLevel: Math.floor(player.stats.experienceToLevel * 1.5),
          },
          resources: {
            ...player.resources,
            max:
              player.resources.max +
              (player.class ? CLASSES[player.class].resourcePerLevel : 0),
            current:
              player.resources.current +
              (player.class ? CLASSES[player.class].resourcePerLevel : 0),
          },
        };
        levelsGained++;

        if (player.class) {
          const newAbilities = getClassAbilitiesForLevel(
            player.class,
            player.stats.level,
          );
          const currentIds = new Set(player.abilities.map((a) => a.id));
          const unlocked = newAbilities.filter((a) => !currentIds.has(a.id));
          if (unlocked.length > 0) {
            player = {
              ...player,
              abilities: [...player.abilities, ...unlocked],
            };
            // Log each new ability with the level up
            for (const ability of unlocked) {
              log.levelUp(player.stats.level, ability);
            }
          }
        }
      }

      // Only log level up without ability if no abilities were unlocked
      if (levelsGained > 0) {
        const hasNewAbilities =
          player.class &&
          getClassAbilitiesForLevel(player.class, player.stats.level).some(
            (a) =>
              !prev.player.abilities.some((existing) => existing.id === a.id),
          );
        if (!hasNewAbilities) {
          log.levelUp(player.stats.level);
        }
      }

      return { ...prev, player };
    });
  }, [log]);

  const processTurnEffects = useCallback(() => {
    // Use enhanced trigger system for turn_end effects
    const triggerResult = triggerTurnEnd(gameState.player);
    let player = triggerResult.player;
    const tickDamage = triggerResult.damageToPlayer;
    const tickHeal = triggerResult.healToPlayer;
    const expiredEffects = triggerResult.expiredEffects;

    // Log narratives from triggered effects
    for (const narrative of triggerResult.narratives) {
      log.narration(narrative);
    }

    let newHealth = player.stats.health;
    if (tickDamage > 0) {
      newHealth -= tickDamage;
      log.damageTaken(tickDamage, "Status effects");
      updateRunStats({
        damageTaken: gameState.runStats.damageTaken + tickDamage,
      });
    }
    if (tickHeal > 0) {
      newHealth = Math.min(player.stats.maxHealth, newHealth + tickHeal);
      log.heal(tickHeal, "Regeneration");
    }

    for (const effect of expiredEffects) {
      log.effectExpired(effect);
    }

    let hazardDamage = 0;
    let playerWithHazardEffects = player;
    if (gameState.currentHazard) {
      const hazardResult = applyHazardToPlayer(player, gameState.currentHazard);
      playerWithHazardEffects = hazardResult.player; // Player now has hazard effects in activeEffects
      hazardDamage = hazardResult.damage;
      if (hazardDamage > 0) {
        newHealth -= hazardDamage;
        log.damageTaken(
          hazardDamage,
          `${gameState.currentHazard.name}${hazardResult.narration ? ` - ${hazardResult.narration}` : ""}`,
        );
        updateRunStats({
          damageTaken: gameState.runStats.damageTaken + hazardDamage,
        });
      }
    }

    let updatedPlayer = {
      ...playerWithHazardEffects,
      stats: {
        ...playerWithHazardEffects.stats,
        health: Math.max(0, newHealth),
      },
      combo: tickCombo(playerWithHazardEffects.combo),
    };
    updatedPlayer = regenerateResource(updatedPlayer);
    updatedPlayer = tickCooldowns(updatedPlayer);

    const updatedHazard = gameState.currentHazard
      ? tickHazard(gameState.currentHazard)
      : null;

    // If hazard expired, remove its effects from the player
    if (gameState.currentHazard && !updatedHazard) {
      updatedPlayer = removeHazardEffects(
        updatedPlayer,
        gameState.currentHazard.id,
      );
      log.narration(`The ${gameState.currentHazard.name} fades away.`);
    }

    dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
    dispatch({ type: "SET_HAZARD", payload: updatedHazard });
    dispatch({ type: "INCREMENT_TURN" });

    return newHealth <= 0;
  }, [
    gameState.player,
    gameState.currentHazard,
    gameState.runStats.damageTaken,
    addLog,
    updateRunStats,
    dispatch,
  ]);

  // === SUSTAINED ABILITIES ===
  const handleToggleSustained = useCallback(
    (ability: SustainedAbility) => {
      const player = gameState.player;

      if (ability.isActive) {
        // Deactivate
        const result = deactivateSustained(ability);
        const updatedAbilities = player.sustainedAbilities.map((a) =>
          a.id === ability.id ? result.ability : a,
        );
        // Remove the constant effect
        const updatedEffects = player.activeEffects.filter(
          (e) => e.id !== ability.sustained.constantEffect.id,
        );

        const deactivatedPlayer = {
          ...player,
          sustainedAbilities: updatedAbilities,
          activeEffects: updatedEffects,
          resources: {
            ...player.resources,
            current: player.resources.current - result.resourceCost,
          },
        };
        dispatch({ type: "UPDATE_PLAYER", payload: deactivatedPlayer });

        addLog(
          <span className="text-stone-400">{result.narration}</span>,
          "combat",
        );
      } else {
        // Activate
        const result = activateSustained(
          ability,
          player.resources.current,
          player.resources.max,
          player.stats.health,
          player.stats.maxHealth,
          player.sustainedAbilities,
        );

        if (!result.success) {
          addLog(
            <span className="text-red-400">{result.error}</span>,
            "system",
          );
          return;
        }

        const updatedAbilities = player.sustainedAbilities.map((a) =>
          a.id === ability.id ? result.ability : a,
        );
        const updatedEffects = result.effectApplied
          ? [...player.activeEffects, result.effectApplied]
          : player.activeEffects;

        const activatedPlayer = {
          ...player,
          sustainedAbilities: updatedAbilities,
          activeEffects: updatedEffects,
          resources: {
            ...player.resources,
            current: player.resources.current - result.resourceCost,
          },
        };
        dispatch({ type: "UPDATE_PLAYER", payload: activatedPlayer });

        addLog(
          <span className="text-amber-400">{result.narration}</span>,
          "combat",
        );
      }
    },
    [gameState.player, addLog, dispatch],
  );

  // Process sustained abilities at turn start (called from processTurnEffects)
  const processSustainedAbilities = useCallback(
    (
      player: Player,
      enemy: Enemy | null,
    ): { player: Player; enemyDamage: number } => {
      let updatedPlayer = { ...player };
      let totalEnemyDamage = 0;
      const updatedSustained: SustainedAbility[] = [];

      for (const ability of player.sustainedAbilities) {
        if (!ability.isActive) {
          updatedSustained.push(ability);
          continue;
        }

        const result = processSustainedTurn(
          ability,
          updatedPlayer.resources.current,
          updatedPlayer.stats.health,
        );

        if (result.autoDeactivated) {
          // Remove the constant effect
          updatedPlayer = {
            ...updatedPlayer,
            activeEffects: updatedPlayer.activeEffects.filter(
              (e) => e.id !== ability.sustained.constantEffect.id,
            ),
          };
          addLog(
            <span className="text-stone-500">{result.deactivationReason}</span>,
            "effect",
          );
        }

        if (result.tickEffect) {
          // Apply tick effects
          if (result.tickEffect.resourceDrain) {
            updatedPlayer = {
              ...updatedPlayer,
              resources: {
                ...updatedPlayer.resources,
                current:
                  updatedPlayer.resources.current -
                  result.tickEffect.resourceDrain,
              },
            };
          }
          if (result.tickEffect.healthDrain) {
            updatedPlayer = {
              ...updatedPlayer,
              stats: {
                ...updatedPlayer.stats,
                health:
                  updatedPlayer.stats.health - result.tickEffect.healthDrain,
              },
            };
          }
          if (result.tickEffect.healing) {
            updatedPlayer = {
              ...updatedPlayer,
              stats: {
                ...updatedPlayer.stats,
                health: Math.min(
                  updatedPlayer.stats.maxHealth,
                  updatedPlayer.stats.health + result.tickEffect.healing,
                ),
              },
            };
          }
          if (result.tickEffect.damage && enemy) {
            totalEnemyDamage += result.tickEffect.damage;
          }

          addLog(
            <span className="text-stone-400 text-sm">
              {result.tickEffect.narration}
            </span>,
            "effect",
          );
        }

        updatedSustained.push(result.ability);
      }

      return {
        player: { ...updatedPlayer, sustainedAbilities: updatedSustained },
        enemyDamage: totalEnemyDamage,
      };
    },
    [addLog],
  );

  // ... existing code for handleUseAbility ...
  const handleUseAbility = useCallback(
    async (ability: Ability) => {
      if (!gameState.currentEnemy || isProcessing) return;

      setIsProcessing(true);
      const enemy = gameState.currentEnemy;
      const _effectiveStats = calculateEffectiveStats(gameState.player);

      const result = executeAbility(gameState.player, ability, enemy);

      if (!result.success) {
        addLog(
          <span className="text-red-400">{result.narration}</span>,
          "system",
        );
        setIsProcessing(false);
        return;
      }

      updateRunStats({ abilitiesUsed: gameState.runStats.abilitiesUsed + 1 });

      let updatedPlayer = {
        ...gameState.player,
        resources: {
          ...gameState.player.resources,
          current: gameState.player.resources.current - result.resourceSpent,
        },
        abilityCooldowns: {
          ...gameState.player.abilityCooldowns,
          [ability.id]: result.cooldownSet,
        },
      };

      // AI HINT: To add new damage types, update DamageType in game-types.ts and combat-system.ts damage modifiers
      if (ability.damageType) {
        const comboResult = checkForCombo(
          updatedPlayer.combo,
          ability.damageType,
        );
        updatedPlayer.combo = comboResult.newCombo;
        if (comboResult.triggered) {
          addLog(
            <span className="text-amber-400 font-bold">
              COMBO: {comboResult.triggered.name}! {comboResult.triggered.bonus}
            </span>,
            "combat",
          );
        }
      }

      if (ability.targetType === "self" && result.effectsApplied) {
        updatedPlayer = {
          ...updatedPlayer,
          activeEffects: [
            ...updatedPlayer.activeEffects,
            ...result.effectsApplied,
          ],
        };
      }

      if (result.healing && result.healing > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            health: Math.min(
              updatedPlayer.stats.maxHealth,
              updatedPlayer.stats.health + result.healing,
            ),
          },
        };
        addLog(
          <span>
            {ability.castNarration || `You use ${ability.name}!`} You recover{" "}
            <EntityText type="heal">{result.healing}</EntityText> health.
          </span>,
          "combat",
        );
      }

      if (result.damage && result.damage > 0) {
        const { damage: finalDamage, effectiveness } = calculateDamageWithType(
          result.damage,
          ability.damageType,
          enemy,
          updatedPlayer,
        );

        const newEnemyHealth = enemy.health - finalDamage;
        const isCrit = result.isCritical;

        updateRunStats({
          damageDealt: gameState.runStats.damageDealt + finalDamage,
        });

        let effectivenessText = "";
        if (effectiveness === "effective") {
          effectivenessText = " Super effective!";
        } else if (effectiveness === "resisted") {
          effectivenessText = " Resisted...";
        }

        addLog(
          <span>
            {result.narration}{" "}
            {isCrit && <span className="text-orange-400">CRITICAL! </span>}
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            takes <EntityText type="damage">{finalDamage}</EntityText> damage!
            {effectivenessText && (
              <span
                className={
                  effectiveness === "effective"
                    ? "text-emerald-400"
                    : "text-stone-500"
                }
              >
                {effectivenessText}
              </span>
            )}
          </span>,
          "combat",
        );

        if (result.effectsApplied && ability.targetType === "enemy") {
          for (const effect of result.effectsApplied) {
            addLog(
              <span>
                <EntityText type="enemy" entity={enemy}>
                  {enemy.name}
                </EntityText>{" "}
                is afflicted with{" "}
                <EntityText
                  type={effect.effectType === "buff" ? "blessing" : "curse"}
                  entity={effect}
                >
                  {effect.name}
                </EntityText>
                !
              </span>,
              "effect",
            );
          }
        }

        if (ability.lifeSteal && ability.lifeSteal > 0) {
          const stolen = Math.floor(finalDamage * ability.lifeSteal);
          updatedPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              health: Math.min(
                updatedPlayer.stats.maxHealth,
                updatedPlayer.stats.health + stolen,
              ),
            },
          };
          addLog(
            <span>
              You drain <EntityText type="heal">{stolen}</EntityText> life from
              your enemy.
            </span>,
            "combat",
          );
        }

        if (newEnemyHealth <= 0) {
          const expGain = enemy.expReward;
          const goldGain = enemy.goldReward;

          updateRunStats({
            enemiesSlain: gameState.runStats.enemiesSlain + 1,
            goldEarned: gameState.runStats.goldEarned + goldGain,
          });

          const victoriousPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              gold: updatedPlayer.stats.gold + goldGain,
              experience: updatedPlayer.stats.experience + expGain,
            },
          };
          dispatch({ type: "UPDATE_PLAYER", payload: victoriousPlayer });
          dispatch({ type: "END_COMBAT" });

          log.enemySlain(enemy, goldGain, expGain);

          if (enemy.loot) {
            dispatch({ type: "ADD_ITEM", payload: enemy.loot });
            dispatch({
              type: "UPDATE_RUN_STATS",
              payload: {
                itemsFound: [...gameState.runStats.itemsFound, enemy.loot],
              },
            });
            log.itemFound(enemy.loot);
          }

          checkLevelUp();
          setIsProcessing(false);
          return;
        }

        const tickedEnemy = tickEnemyAbilities({
          ...enemy,
          health: newEnemyHealth,
        });

        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: tickedEnemy });

        await enemyAttack(tickedEnemy, updatedPlayer);
      } else if (ability.targetType === "self") {
        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        await enemyAttack(enemy, updatedPlayer);
      }

      setIsProcessing(false);
    },
    [gameState, isProcessing, addLog, checkLevelUp, updateRunStats, dispatch],
  );

  const triggerDeath = useCallback(
    (causeOfDeath: string, killedBy?: string) => {
      dispatch({ type: "SET_PLAYER_HEALTH", payload: 0 });
      dispatch({ type: "SET_GAME_OVER", payload: true });
      dispatch({ type: "SET_PHASE", payload: "game_over" });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: {
          causeOfDeath,
          killedBy,
          floorsCleared: (gameState.floor - 1) * 5 + gameState.currentRoom,
        },
      });
    },
    [dispatch, gameState.floor, gameState.currentRoom],
  );

  const enemyAttack = useCallback(
    async (enemy: typeof gameState.currentEnemy, player: Player) => {
      if (!enemy) return;

      const effectiveStats = calculateEffectiveStats(player);

      if (Math.random() < player.stats.dodgeChance) {
        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            attacks but you <span className="text-cyan-400">dodge</span> the
            blow!
          </span>,
          "combat",
        );
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
        return;
      }

      const selectedAbility = selectEnemyAbility(
        enemy,
        player.stats.health,
        player.stats.maxHealth,
      );

      let finalDamage: number;
      let _damageType: string | undefined;

      if (selectedAbility) {
        const baseDamage = selectedAbility.damage || enemy.attack;
        finalDamage = Math.max(
          1,
          baseDamage -
            Math.floor(
              effectiveStats.defense *
                0.5 *
                STANCE_MODIFIERS[player.stance].defense,
            ),
        );
        _damageType = selectedAbility.damageType;

        addLog(
          <span>
            <EntityText type="enemy" entity={enemy}>
              {enemy.name}
            </EntityText>{" "}
            uses <span className="text-red-400">{selectedAbility.name}</span>!{" "}
            {selectedAbility.narration}{" "}
            <EntityText type="damage">-{finalDamage}</EntityText>
          </span>,
          "combat",
        );

        if (selectedAbility.effect) {
          addLog(
            <span>
              You are afflicted with{" "}
              <EntityText type="curse" entity={selectedAbility.effect}>
                {selectedAbility.effect.name}
              </EntityText>
              !
            </span>,
            "effect",
          );
        }

        if (enemy.abilities) {
          enemy = {
            ...enemy,
            abilities: enemy.abilities.map((a) =>
              a.id === selectedAbility.id
                ? { ...a, currentCooldown: a.cooldown }
                : a,
            ),
          };
        }
      } else {
        const enemyDamage = Math.max(
          1,
          enemy.attack -
            Math.floor(
              effectiveStats.defense *
                0.5 *
                STANCE_MODIFIERS[player.stance].defense,
            ),
        );
        const variance = Math.floor(Math.random() * 5) - 2;
        finalDamage = Math.max(1, enemyDamage + variance);

        log.enemyAttack(enemy, finalDamage);
      }

      // Apply damage taken multiplier from effects (e.g., "take 20% less damage")
      finalDamage = Math.floor(
        finalDamage * effectiveStats.damageTakenMultiplier,
      );

      updateRunStats({
        damageTaken: gameState.runStats.damageTaken + finalDamage,
      });

      const newHealth = player.stats.health - finalDamage;

      // Process on_damage_taken triggers
      const damageTakenTrigger = triggerOnDamageTaken(player, {
        enemy,
        damageTaken: finalDamage,
      });
      let updatedPlayer = damageTakenTrigger.player;
      let actualNewHealth = newHealth;

      // Apply healing from damage taken triggers (e.g., thorns that heal)
      if (damageTakenTrigger.healToPlayer > 0) {
        actualNewHealth = Math.min(
          updatedPlayer.stats.maxHealth,
          newHealth + damageTakenTrigger.healToPlayer,
        );
        log.heal(damageTakenTrigger.healToPlayer, "Reactive effect");
      }

      // Apply damage reflection to enemy
      let updatedEnemy = enemy;
      if (damageTakenTrigger.damageToEnemy > 0) {
        const reflectedHealth = enemy.health - damageTakenTrigger.damageToEnemy;
        updatedEnemy = { ...enemy, health: reflectedHealth };
        log.playerAttack(enemy, damageTakenTrigger.damageToEnemy, {
          narration: "Thorns retaliate!",
        });
        // Check if reflection killed the enemy
        if (reflectedHealth <= 0) {
          const expGain = Math.floor(
            enemy.expReward *
              calculateEffectiveStats(updatedPlayer).expMultiplier,
          );
          const goldGain = Math.floor(
            enemy.goldReward *
              calculateEffectiveStats(updatedPlayer).goldMultiplier,
          );
          log.enemySlain(enemy, goldGain, expGain);
          const victoriousPlayer = {
            ...updatedPlayer,
            stats: {
              ...updatedPlayer.stats,
              health: actualNewHealth,
              gold: updatedPlayer.stats.gold + goldGain,
              experience: updatedPlayer.stats.experience + expGain,
            },
          };
          dispatch({ type: "UPDATE_PLAYER", payload: victoriousPlayer });
          dispatch({ type: "END_COMBAT" });
          return;
        }
      }

      // Log trigger narratives
      for (const narrative of damageTakenTrigger.narratives) {
        addLog(
          <span className="text-cyan-300 italic">{narrative}</span>,
          "effect",
        );
      }

      if (actualNewHealth <= 0) {
        triggerDeath("Slain in combat", enemy.name);
        addLog(
          <span className="text-red-500 font-bold">
            You have fallen in battle. Your adventure ends here.
          </span>,
          "system",
        );
      } else {
        const damagedPlayer = {
          ...updatedPlayer,
          stats: { ...updatedPlayer.stats, health: actualNewHealth },
          activeEffects: selectedAbility?.effect
            ? [...updatedPlayer.activeEffects, selectedAbility.effect]
            : updatedPlayer.activeEffects,
        };
        dispatch({ type: "UPDATE_PLAYER", payload: damagedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: updatedEnemy });
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
      }
    },
    [addLog, updateRunStats, gameState.runStats.damageTaken, triggerDeath, dispatch],
  );

  // Process companion turns - returns updated enemy (or null if killed) and updated party
  const processCompanionTurns = useCallback(
    async (
      enemy: Enemy,
      player: Player,
    ): Promise<{
      enemy: Enemy | null;
      party: typeof player.party;
      playerHealed: number;
    }> => {
      const activeCompanions = player.party?.active || [];
      if (activeCompanions.length === 0) {
        return { enemy, party: player.party, playerHealed: 0 };
      }

      let currentEnemy: Enemy | null = enemy;
      let updatedParty = player.party;
      let totalPlayerHealed = 0;

      for (const companion of activeCompanions) {
        if (!currentEnemy || currentEnemy.health <= 0) break;
        if (!companion.alive) continue;

        const action = selectCompanionAction(companion, player, currentEnemy);
        let updatedCompanion = companion;

        switch (action.action) {
          case "attack": {
            if (!currentEnemy) break;
            const damage = calculateCompanionDamage(companion);
            const newHealth: number = currentEnemy.health - damage;
            const bondTier = getBondTier(companion.bond.level);
            const colorClass = getCompanionColor(companion);

            addLog(
              <span>
                <span className={colorClass}>{companion.name}</span> attacks{" "}
                <EntityText type="enemy" entity={currentEnemy}>
                  {currentEnemy.name}
                </EntityText>{" "}
                for <EntityText type="damage">{damage}</EntityText> damage!
              </span>,
              "combat",
            );

            // Bond bonus narration for high bond
            if (bondTier === "loyal" || bondTier === "soulbound") {
              addLog(
                <span className="text-xs text-muted-foreground italic">
                  {companion.name}&apos;s devotion empowers their strike!
                </span>,
                "combat",
              );
            }

            if (newHealth <= 0) {
              currentEnemy = null;
              addLog(
                <span>
                  <span className={colorClass}>{companion.name}</span> delivers
                  the killing blow!
                </span>,
                "combat",
              );
              // Bond increase for killing enemy
              updatedCompanion = modifyBond(companion, 3, "Killed an enemy");
            } else {
              currentEnemy = { ...currentEnemy, health: newHealth };
            }
            break;
          }

          case "ability": {
            if (!action.ability) break;
            const colorClass = getCompanionColor(companion);

            if (action.ability.effect.type === "damage" && currentEnemy) {
              const damage = calculateCompanionDamage(
                companion,
                action.ability,
              );
              const newHealth: number = currentEnemy.health - damage;

              addLog(
                <span>
                  <span className={colorClass}>{companion.name}</span> uses{" "}
                  <span className="text-amber-400">{action.ability.name}</span>!{" "}
                  {action.ability.narration}{" "}
                  <EntityText type="damage">(-{damage})</EntityText>
                </span>,
                "combat",
              );

              if (newHealth <= 0) {
                currentEnemy = null;
                updatedCompanion = modifyBond(
                  companion,
                  5,
                  "Killed enemy with ability",
                );
              } else {
                currentEnemy = { ...currentEnemy, health: newHealth };
              }
            } else if (action.ability.effect.type === "heal") {
              const healing = action.ability.effect.value || 10;
              totalPlayerHealed += healing;

              addLog(
                <span>
                  <span className={colorClass}>{companion.name}</span> uses{" "}
                  <span className="text-emerald-400">
                    {action.ability.name}
                  </span>
                  ! {action.ability.narration}{" "}
                  <EntityText type="heal">(+{healing})</EntityText>
                </span>,
                "combat",
              );
              updatedCompanion = modifyBond(companion, 2, "Healed the player");
            } else if (action.ability.effect.type === "buff") {
              addLog(
                <span>
                  <span className={colorClass}>{companion.name}</span> uses{" "}
                  <span className="text-cyan-400">{action.ability.name}</span>!{" "}
                  {action.ability.narration}
                </span>,
                "combat",
              );
            } else if (
              action.ability.effect.type === "debuff" &&
              currentEnemy
            ) {
              addLog(
                <span>
                  <span className={colorClass}>{companion.name}</span> uses{" "}
                  <span className="text-purple-400">{action.ability.name}</span>{" "}
                  on{" "}
                  <EntityText type="enemy" entity={currentEnemy}>
                    {currentEnemy.name}
                  </EntityText>
                  ! {action.ability.narration}
                </span>,
                "combat",
              );
            }

            updatedCompanion = useCompanionAbility(
              updatedCompanion,
              action.ability.id,
            );
            break;
          }

          case "defend": {
            const colorClass = getCompanionColor(companion);
            addLog(
              <span>
                <span className={colorClass}>{companion.name}</span> takes a
                defensive stance, protecting you!
              </span>,
              "combat",
            );
            break;
          }

          case "flee": {
            const colorClass = getCompanionColor(companion);
            addLog(
              <span className="text-yellow-500">
                <span className={colorClass}>{companion.name}</span> panics and
                flees from battle!
              </span>,
              "combat",
            );
            // Remove from active party
            if (updatedParty) {
              updatedParty = removeCompanionFromParty(
                updatedParty,
                companion.id,
              );
            }
            updatedCompanion = modifyBond(companion, -10, "Fled from battle");
            continue; // Skip updating this companion
          }

          case "betray": {
            const betrayDamage = Math.floor(companion.stats.attack * 0.5);
            addLog(
              <span className="text-red-500 font-bold">
                {companion.name} turns on you! They attack for{" "}
                <EntityText type="damage">{betrayDamage}</EntityText> damage!
              </span>,
              "combat",
            );
            // Remove from party and add to enemy side conceptually
            if (updatedParty) {
              updatedParty = removeCompanionFromParty(
                updatedParty,
                companion.id,
              );
            }
            // Return negative healing to indicate damage to player
            totalPlayerHealed -= betrayDamage;
            continue;
          }
        }

        // Process cooldowns and update companion in party
        updatedCompanion = processCompanionCooldowns(updatedCompanion);
        updatedCompanion = {
          ...updatedCompanion,
          turnsWithPlayer: companion.turnsWithPlayer + 1,
        };

        // Update the companion in the party
        if (updatedParty) {
          updatedParty = {
            ...updatedParty,
            active: updatedParty.active.map((c) =>
              c.id === companion.id ? updatedCompanion : c,
            ),
          };
        }
      }

      return {
        enemy: currentEnemy,
        party: updatedParty,
        playerHealed: totalPlayerHealed,
      };
    },
    [addLog],
  );

  const playerAttack = useCallback(async () => {
    if (!gameState.currentEnemy || !gameState.inCombat || isProcessing) return;
    setIsProcessing(true);

    const effectiveStats = calculateEffectiveStats(gameState.player);
    const baseDamage = calculateDamage(
      { attack: effectiveStats.attack },
      gameState.currentEnemy,
    );

    const weaponDamageType =
      gameState.player.equipment.weapon?.damageType || "physical";
    const { damage: rawDamage, effectiveness } = calculateDamageWithType(
      baseDamage,
      weaponDamageType,
      gameState.currentEnemy,
      gameState.player,
    );

    // Apply damage multiplier from effects (e.g., "deal 20% more damage")
    const damage = Math.floor(rawDamage * effectiveStats.damageMultiplier);

    updateRunStats({ damageDealt: gameState.runStats.damageDealt + damage });

    const newEnemyHealth = gameState.currentEnemy.health - damage;
    const isCritical = damage > effectiveStats.attack * 1.2;

    const comboResult = checkForCombo(gameState.player.combo, weaponDamageType);
    let updatedPlayer = { ...gameState.player, combo: comboResult.newCombo };

    if (comboResult.triggered) {
      addLog(
        <span className="text-amber-400 font-bold">
          COMBO: {comboResult.triggered.name}! {comboResult.triggered.bonus}
        </span>,
        "combat",
      );
    }

    // Process attack triggers (on_attack, on_damage_dealt, on_critical_hit)
    let bonusDamageToEnemy = 0;
    const attackTrigger = triggerOnAttack(updatedPlayer, {
      damageDealt: damage,
      isCritical,
      enemy: gameState.currentEnemy,
    });
    updatedPlayer = attackTrigger.player;
    bonusDamageToEnemy += attackTrigger.damageToEnemy;
    for (const narrative of attackTrigger.narratives) {
      addLog(
        <span className="text-amber-300 italic">{narrative}</span>,
        "effect",
      );
    }

    const damageTrigger = triggerOnDamageDealt(updatedPlayer, {
      damageDealt: damage,
      isCritical,
      enemy: gameState.currentEnemy,
    });
    updatedPlayer = damageTrigger.player;
    bonusDamageToEnemy += damageTrigger.damageToEnemy;
    for (const narrative of damageTrigger.narratives) {
      addLog(
        <span className="text-amber-300 italic">{narrative}</span>,
        "effect",
      );
    }

    // Critical hit triggers
    if (isCritical) {
      const critTrigger = triggerOnCriticalHit(updatedPlayer, {
        damageDealt: damage,
        enemy: gameState.currentEnemy,
      });
      updatedPlayer = critTrigger.player;
      bonusDamageToEnemy += critTrigger.damageToEnemy;
      if (critTrigger.healToPlayer > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            health: Math.min(
              updatedPlayer.stats.maxHealth,
              updatedPlayer.stats.health + critTrigger.healToPlayer,
            ),
          },
        };
        addLog(
          <span>
            Critical hit effect:{" "}
            <EntityText type="heal">+{critTrigger.healToPlayer}</EntityText> HP
          </span>,
          "effect",
        );
      }
      for (const narrative of critTrigger.narratives) {
        addLog(
          <span className="text-amber-300 italic">{narrative}</span>,
          "effect",
        );
      }
    }

    // Apply bonus damage from triggers
    const totalDamage = damage + bonusDamageToEnemy;
    const actualNewEnemyHealth = gameState.currentEnemy.health - totalDamage;
    if (bonusDamageToEnemy > 0) {
      addLog(
        <span>
          Triggered effects deal{" "}
          <EntityText type="damage">{bonusDamageToEnemy}</EntityText> bonus
          damage!
        </span>,
        "effect",
      );
    }

    const attackResponse = await generateNarrative<CombatResponse>(
      "player_attack",
      {
        enemyName: gameState.currentEnemy.name,
        damage,
        playerWeapon: gameState.player.equipment.weapon?.name,
        enemyHealth: newEnemyHealth,
        enemyMaxHealth: gameState.currentEnemy.maxHealth,
        isCritical,
        damageType: weaponDamageType,
        effectiveness,
        playerStance: gameState.player.stance,
        combatRound: gameState.combatRound,
      },
    );

    let effectivenessNote = "";
    if (effectiveness === "effective") effectivenessNote = " Super effective!";
    if (effectiveness === "resisted") effectivenessNote = " Resisted...";

    if (attackResponse) {
      addLog(
        <span>
          {attackResponse.attackNarration}{" "}
          <EntityText type="damage">(-{damage})</EntityText>
          {effectivenessNote && (
            <span
              className={
                effectiveness === "effective"
                  ? "text-emerald-400"
                  : "text-stone-500"
              }
            >
              {effectivenessNote}
            </span>
          )}
        </span>,
        "combat",
      );
    } else {
      addLog(
        <span>
          <EntityText type="player">You</EntityText> strike the{" "}
          <EntityText type="enemy" entity={gameState.currentEnemy}>
            {gameState.currentEnemy.name}
          </EntityText>{" "}
          for <EntityText type="damage">{damage}</EntityText> damage.
          {effectivenessNote && (
            <span
              className={
                effectiveness === "effective"
                  ? "text-emerald-400"
                  : "text-stone-500"
              }
            >
              {effectivenessNote}
            </span>
          )}
        </span>,
        "combat",
      );
    }

    if (actualNewEnemyHealth <= 0) {
      // Process on_kill triggers
      const killTrigger = triggerOnKill(updatedPlayer, {
        enemy: gameState.currentEnemy,
      });
      updatedPlayer = killTrigger.player;
      for (const narrative of killTrigger.narratives) {
        addLog(
          <span className="text-emerald-400 italic">{narrative}</span>,
          "effect",
        );
      }
      if (killTrigger.healToPlayer > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            health: Math.min(
              updatedPlayer.stats.maxHealth,
              updatedPlayer.stats.health + killTrigger.healToPlayer,
            ),
          },
        };
        addLog(
          <span>
            Kill effect:{" "}
            <EntityText type="heal">+{killTrigger.healToPlayer}</EntityText> HP
          </span>,
          "effect",
        );
      }

      const expGain = Math.floor(
        gameState.currentEnemy.expReward * effectiveStats.expMultiplier,
      );
      const goldGain = Math.floor(
        gameState.currentEnemy.goldReward * effectiveStats.goldMultiplier,
      );
      const loot = gameState.currentEnemy.loot;
      const materialDrops = gameState.currentEnemy.materialDrops || [];

      // Collect all items found (main loot + material drops)
      const allLoot: Item[] = [...(loot ? [loot] : []), ...materialDrops];

      updateRunStats({
        enemiesSlain: gameState.runStats.enemiesSlain + 1,
        goldEarned: gameState.runStats.goldEarned + goldGain,
        itemsFound: [...gameState.runStats.itemsFound, ...allLoot],
      });

      const victoryResponse = await generateNarrative<VictoryResponse>(
        "victory",
        {
          enemyName: gameState.currentEnemy.name,
          expGain,
          goldGain,
          lootName: loot?.name,
          lootRarity: loot?.rarity,
          leveledUp:
            updatedPlayer.stats.experience + expGain >=
            updatedPlayer.stats.experienceToLevel,
        },
      );

      if (victoryResponse) {
        addLog(<span>{victoryResponse.deathNarration}</span>, "combat");
        addLog(
          <span>
            {victoryResponse.spoilsNarration}{" "}
            <EntityText type="gold">+{goldGain}g</EntityText>{" "}
            <EntityText type="heal">+{expGain}xp</EntityText>
          </span>,
          "loot",
        );
      } else {
        addLog(
          <span>
            The{" "}
            <EntityText type="enemy">{gameState.currentEnemy.name}</EntityText>{" "}
            falls! You gain <EntityText type="gold">{goldGain} gold</EntityText>{" "}
            and <EntityText type="heal">{expGain} experience</EntityText>.
          </span>,
          "combat",
        );
      }

      if (loot) {
        addLog(
          <span>
            Found:{" "}
            <EntityText
              type={
                loot.rarity === "legendary"
                  ? "legendary"
                  : loot.rarity === "rare"
                    ? "rare"
                    : "item"
              }
            >
              {loot.name}
            </EntityText>
          </span>,
          "loot",
        );
      }

      // Log material drops if any
      if (materialDrops.length > 0) {
        addLog(
          <span>
            Materials:{" "}
            {materialDrops.map((mat, i) => (
              <span key={mat.id}>
                {i > 0 && ", "}
                <EntityText type={mat.rarity}>{mat.name}</EntityText>
              </span>
            ))}
          </span>,
          "loot",
        );
      }

      // Show AI-generated last words if enemy has them
      if (gameState.currentEnemy.lastWords) {
        addLog(
          <span className="italic text-muted-foreground">
            &quot;{gameState.currentEnemy.lastWords}&quot;
          </span>,
          "narrative",
        );
      }

      // Check if this was a boss - generate special rewards
      const isBoss =
        gameState.currentEnemy.name.includes("Lord") ||
        gameState.currentEnemy.name.includes("King") ||
        gameState.currentEnemy.expReward > 100 ||
        gameState.currentEnemy.maxHealth > 150;

      if (isBoss) {
        // Fire-and-forget boss reward generation (non-blocking)
        getBossVictoryRewards(
          gameState.currentEnemy.name,
          undefined,
          gameState.currentEnemy.abilities?.map((a) => a.name),
          gameState.floor,
          gameState.player.className || undefined,
        )
          .then((reward) => {
            if (reward) {
              // Log boss rewards
              addLog(
                <span className="text-amber-400 font-medium">
                  The {gameState.currentEnemy!.name} yields legendary spoils!
                </span>,
                "loot",
              );
              reward.items.forEach((item) => {
                addLog(
                  <span>
                    Boss Trophy:{" "}
                    <EntityText type={item.rarity}>{item.name}</EntityText>
                  </span>,
                  "loot",
                );
              });
              if (reward.lore) {
                addLog(
                  <span className="italic text-muted-foreground text-xs">
                    {reward.lore}
                  </span>,
                  "narrative",
                );
              }
              // Add to inventory via dispatch
              for (const item of reward.items) {
                dispatch({ type: "ADD_ITEM", payload: item });
              }
            }
          })
          .catch(() => {
            // Silent fail - regular loot already given
          });
      }

      updatedPlayer = {
        ...updatedPlayer,
        stats: {
          ...updatedPlayer.stats,
          gold: updatedPlayer.stats.gold + goldGain,
          experience: updatedPlayer.stats.experience + expGain,
        },
        inventory: [...updatedPlayer.inventory, ...allLoot],
      };

      checkLevelUp();

      dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
      dispatch({ type: "END_COMBAT" });
    } else {
      const tickedEnemy = tickEnemyAbilities({
        ...gameState.currentEnemy,
        health: actualNewEnemyHealth,
      });

      // Process companion turns after player attack
      const companionResult = await processCompanionTurns(
        tickedEnemy,
        updatedPlayer,
      );

      // Apply companion healing/damage to player
      if (companionResult.playerHealed !== 0) {
        const newPlayerHealth = Math.min(
          updatedPlayer.stats.maxHealth,
          Math.max(
            1,
            updatedPlayer.stats.health + companionResult.playerHealed,
          ),
        );
        updatedPlayer = {
          ...updatedPlayer,
          stats: { ...updatedPlayer.stats, health: newPlayerHealth },
          party: companionResult.party,
        };
      } else {
        updatedPlayer = { ...updatedPlayer, party: companionResult.party };
      }

      // Check if companions killed the enemy
      if (!companionResult.enemy) {
        // Victory! Enemy killed by companion
        const expGain = Math.floor(
          tickedEnemy.expReward *
            calculateEffectiveStats(updatedPlayer).expMultiplier,
        );
        const goldGain = Math.floor(
          tickedEnemy.goldReward *
            calculateEffectiveStats(updatedPlayer).goldMultiplier,
        );
        const loot = tickedEnemy.loot;
        const materialDrops = tickedEnemy.materialDrops || [];
        const allLoot: Item[] = [...(loot ? [loot] : []), ...materialDrops];

        updateRunStats({
          enemiesSlain: gameState.runStats.enemiesSlain + 1,
          goldEarned: gameState.runStats.goldEarned + goldGain,
          itemsFound: [...gameState.runStats.itemsFound, ...allLoot],
        });

        addLog(
          <span>
            Victory! Your companions have slain the{" "}
            <EntityText type="enemy">{tickedEnemy.name}</EntityText>! You gain{" "}
            <EntityText type="gold">{goldGain} gold</EntityText> and{" "}
            <EntityText type="heal">{expGain} experience</EntityText>.
          </span>,
          "combat",
        );

        if (loot) {
          addLog(
            <span>
              Found:{" "}
              <EntityText
                type={
                  loot.rarity === "legendary"
                    ? "legendary"
                    : loot.rarity === "rare"
                      ? "rare"
                      : "item"
                }
              >
                {loot.name}
              </EntityText>
            </span>,
            "loot",
          );
        }

        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            gold: updatedPlayer.stats.gold + goldGain,
            experience: updatedPlayer.stats.experience + expGain,
          },
          inventory: [...updatedPlayer.inventory, ...allLoot],
        };

        checkLevelUp();

        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        dispatch({ type: "END_COMBAT" });
      } else {
        // Enemy still alive - now enemy attacks
        dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
        dispatch({ type: "UPDATE_ENEMY", payload: companionResult.enemy });

        await enemyAttack(companionResult.enemy, updatedPlayer);
      }
    }
    setIsProcessing(false);
  }, [
    gameState,
    isProcessing,
    calculateDamage,
    addLog,
    checkLevelUp,
    enemyAttack,
    updateRunStats,
    processCompanionTurns,
  ]);

  // Attempt to tame an enemy as a companion
  const handleTameEnemy = useCallback(async () => {
    if (!gameState.currentEnemy || !gameState.inCombat || isProcessing) return;
    setIsProcessing(true);

    const tameCheck = canTameEnemy(gameState.currentEnemy, gameState.player);

    if (!tameCheck.canTame) {
      addLog(
        <span className="text-yellow-500">{tameCheck.reason}</span>,
        "system",
      );
      setIsProcessing(false);
      return;
    }

    const roll = Math.random();
    const success = roll < tameCheck.chance;

    if (success) {
      // Taming successful
      const newCompanion = createBasicCompanionFromEnemy(
        gameState.currentEnemy,
        "tame",
      );

      addLog(
        <span className="text-emerald-400">
          You reach out to the wounded{" "}
          <EntityText type="enemy">{gameState.currentEnemy.name}</EntityText>...
          It recognizes your intent and submits.{" "}
          <span className="font-bold">{newCompanion.name}</span> joins your
          party!
        </span>,
        "combat",
      );

      // Add to party
      let updatedParty = gameState.player.party || createInitialParty();
      updatedParty = {
        ...updatedParty,
        maxActive: getMaxActiveCompanions(gameState.player.stats.level),
      };
      updatedParty = addCompanionToParty(
        updatedParty,
        newCompanion,
        updatedParty.active.length < updatedParty.maxActive,
      );

      const inActive = updatedParty.active.some(
        (c) => c.id === newCompanion.id,
      );
      if (inActive) {
        addLog(
          <span className="text-cyan-400">
            {newCompanion.name} joins your active party!
          </span>,
          "system",
        );
      } else {
        addLog(
          <span className="text-zinc-400">
            {newCompanion.name} waits in reserve (party full).
          </span>,
          "system",
        );
      }

      // End combat
      const tamedPlayer = {
        ...gameState.player,
        party: updatedParty,
      };
      dispatch({ type: "UPDATE_PLAYER", payload: tamedPlayer });
      dispatch({ type: "END_COMBAT" });
    } else {
      // Taming failed - enemy attacks
      addLog(
        <span className="text-red-400">
          You attempt to tame the{" "}
          <EntityText type="enemy">{gameState.currentEnemy.name}</EntityText>,
          but it lashes out in defiance!
        </span>,
        "combat",
      );

      await enemyAttack(gameState.currentEnemy, gameState.player);
    }

    setIsProcessing(false);
  }, [gameState, isProcessing, addLog, enemyAttack]);

  const exploreRoom = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const playerDied = processTurnEffects();
    if (playerDied) {
      triggerDeath("Succumbed to effects", "Status effects");
      addLog(
        <span className="text-red-400">
          The poison claims your life. Darkness takes you.
        </span>,
        "system",
      );
      setIsProcessing(false);
      return;
    }

    const dungeonTheme = gameState.currentDungeon?.theme || "ancient dungeon";
    const dungeonName = gameState.currentDungeon?.name || "the depths";

    const paths = generatePathOptions(
      gameState.floor,
      gameState.currentRoom,
      dungeonTheme,
    );

    const roomResponse = await generateNarrative<RoomResponse>("room", {
      floor: gameState.floor,
      roomNumber: gameState.currentRoom + 1,
      playerHealth: gameState.player.stats.health,
      playerMaxHealth: gameState.player.stats.maxHealth,
      dungeonTheme,
      dungeonName,
      currentHazard: gameState.currentHazard?.name,
    });

    if (roomResponse) {
      addLog(<span>{roomResponse.roomDescription}</span>, "narrative");
    }

    dispatch({ type: "SET_PATH_OPTIONS", payload: paths });

    setIsProcessing(false);
  }, [gameState, isProcessing, addLog, processTurnEffects, triggerDeath, dispatch]);

  // === ENCOUNTER HANDLERS ===
  const handleTrapAction = useCallback(
    async (action: "disarm" | "trigger" | "avoid") => {
      if (!gameState.activeTrap || isProcessing) return;
      setIsProcessing(true);

      const trap = gameState.activeTrap;
      const disarmChance = calculateDisarmChance(gameState.player, trap);

      if (action === "disarm") {
        const success = Math.random() * 100 < disarmChance;

        if (success) {
          addLog(
            <span>
              You carefully disarm the{" "}
              <EntityText type="trap">{trap.name}</EntityText>.
              <EntityText type="heal"> Safe passage secured.</EntityText>
            </span>,
            "narrative",
          );
          dispatch({ type: "ADD_EXPERIENCE", payload: 5 });
          dispatch({ type: "SET_PHASE", payload: "dungeon" });
          dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
        } else {
          const damage = trap.damage || 10;
          const newHealth = gameState.player.stats.health - damage;

          updateRunStats({
            damageTaken: gameState.runStats.damageTaken + damage,
          });

          addLog(
            <span>
              Your disarm attempt fails! The{" "}
              <EntityText type="trap">{trap.name}</EntityText> activates!{" "}
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );

          const updatedEffects = [...gameState.player.activeEffects];
          if (trap.effect) {
            updatedEffects.push(trap.effect);
            addLog(
              <span>
                You are afflicted with{" "}
                <EntityText type="curse">{trap.effect.name}</EntityText>!
              </span>,
              "effect",
            );
          }

          if (newHealth <= 0) {
            triggerDeath("Killed by trap", trap.name);
            addLog(
              <span className="text-red-400">
                The trap proves fatal. Darkness claims you.
              </span>,
              "system",
            );
          } else {
            dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
            if (trap.effect) {
              dispatch({ type: "ADD_EFFECT", payload: trap.effect });
            }
            dispatch({ type: "SET_PHASE", payload: "dungeon" });
            dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
          }
        }
      } else if (action === "trigger") {
        const damage = trap.damage || 10;
        const newHealth = gameState.player.stats.health - damage;

        updateRunStats({
          damageTaken: gameState.runStats.damageTaken + damage,
        });

        addLog(
          <span>
            You deliberately trigger the{" "}
            <EntityText type="trap">{trap.name}</EntityText>.{" "}
            <EntityText type="damage">-{damage} HP</EntityText>
          </span>,
          "combat",
        );

        if (newHealth <= 0) {
          triggerDeath("Killed by trap", trap.name);
        } else {
          dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
          dispatch({ type: "SET_PHASE", payload: "dungeon" });
          dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
        }
      } else {
        const avoided = Math.random() < 0.5;

        if (avoided) {
          addLog(
            <span>
              You carefully edge past the{" "}
              <EntityText type="trap">{trap.name}</EntityText>.
            </span>,
            "narrative",
          );
          dispatch({ type: "SET_PHASE", payload: "dungeon" });
          dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
        } else {
          const damage = Math.floor((trap.damage || 10) * 0.7);
          const newHealth = gameState.player.stats.health - damage;

          updateRunStats({
            damageTaken: gameState.runStats.damageTaken + damage,
          });

          addLog(
            <span>
              You fail to avoid the{" "}
              <EntityText type="trap">{trap.name}</EntityText>!{" "}
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );

          if (newHealth <= 0) {
            triggerDeath("Killed by trap", trap.name);
          } else {
            dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
            dispatch({ type: "SET_PHASE", payload: "dungeon" });
            dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
          }
        }
      }

      setIsProcessing(false);
    },
    [gameState, isProcessing, addLog, updateRunStats, triggerDeath, dispatch],
  );

  const handleShrineAction = useCallback(
    async (action: "accept" | "decline" | "desecrate") => {
      if (!gameState.activeShrine || isProcessing) return;
      setIsProcessing(true);

      const shrine = gameState.activeShrine;

      if (action === "decline") {
        addLog(
          <span className="text-muted-foreground">
            You leave the <EntityText type="shrine">{shrine.name}</EntityText>{" "}
            undisturbed.
          </span>,
          "narrative",
        );
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
        setIsProcessing(false);
        return;
      }

      if (action === "desecrate" && shrine.shrineType === "dark") {
        const roll = Math.random();
        if (roll < 0.3) {
          const effect = STATUS_EFFECTS.bloodlust();
          addLog(
            <span>
              You desecrate the{" "}
              <EntityText type="shrine">{shrine.name}</EntityText>. Dark power
              floods through you!{" "}
              <EntityText type="blessing">{effect.name}</EntityText> gained!
            </span>,
            "effect",
          );
          dispatch({ type: "ADD_EFFECT", payload: effect });
          dispatch({ type: "SET_PHASE", payload: "dungeon" });
          dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
        } else if (roll < 0.7) {
          const curse = STATUS_EFFECTS.cursed();
          addLog(
            <span>
              The shrine&apos;s dark power lashes out!{" "}
              <EntityText type="curse">{curse.name}</EntityText> afflicts you!
            </span>,
            "effect",
          );
          dispatch({ type: "ADD_EFFECT", payload: curse });
          dispatch({ type: "SET_PHASE", payload: "dungeon" });
          dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
        } else {
          const damage = Math.floor(gameState.player.stats.maxHealth * 0.3);
          updateRunStats({
            damageTaken: gameState.runStats.damageTaken + damage,
          });
          addLog(
            <span>
              The shrine explodes with malevolent energy!{" "}
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );
          const newHealth = gameState.player.stats.health - damage;
          if (newHealth <= 0) {
            triggerDeath("Destroyed by shrine", shrine.name);
          } else {
            dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
            dispatch({ type: "SET_PHASE", payload: "dungeon" });
            dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
          }
        }
        setIsProcessing(false);
        return;
      }

      let canAfford = true;
      if (shrine.cost?.gold && gameState.player.stats.gold < shrine.cost.gold)
        canAfford = false;
      if (
        shrine.cost?.health &&
        gameState.player.stats.health <= shrine.cost.health
      )
        canAfford = false;

      if (!canAfford) {
        addLog(
          <span className="text-muted-foreground">
            You cannot afford this offering.
          </span>,
          "system",
        );
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
        setIsProcessing(false);
        return;
      }

      let newGold = gameState.player.stats.gold;
      let newHealth = gameState.player.stats.health;
      if (shrine.cost?.gold) {
        newGold -= shrine.cost.gold;
        updateRunStats({
          goldSpent: gameState.runStats.goldSpent + shrine.cost.gold,
        });
        addLog(
          <span>
            You offer{" "}
            <EntityText type="gold">{shrine.cost.gold} gold</EntityText> to the
            shrine.
          </span>,
          "narrative",
        );
      }
      if (shrine.cost?.health) {
        newHealth -= shrine.cost.health;
        addLog(
          <span>
            You sacrifice{" "}
            <EntityText type="damage">{shrine.cost.health} HP</EntityText> to
            the shrine.
          </span>,
          "narrative",
        );
      }

      let effect: StatusEffect | null = null;
      switch (shrine.shrineType) {
        case "health":
          effect = STATUS_EFFECTS.regeneration();
          break;
        case "power":
          effect = STATUS_EFFECTS.bloodlust();
          break;
        case "fortune":
          effect = STATUS_EFFECTS.fortunate();
          break;
        case "unknown":
          const effects = [
            STATUS_EFFECTS.blessed(),
            STATUS_EFFECTS.fortified(),
            STATUS_EFFECTS.regeneration(),
          ];
          effect = effects[Math.floor(Math.random() * effects.length)];
          break;
      }

      if (effect) {
        addLog(
          <span>
            The shrine bestows{" "}
            <EntityText type="blessing">{effect.name}</EntityText> upon you!
          </span>,
          "effect",
        );
      }

      // Apply costs and rewards
      if (newGold !== gameState.player.stats.gold) {
        dispatch({ type: "SET_PLAYER_GOLD", payload: newGold });
      }
      if (newHealth !== gameState.player.stats.health) {
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
      }
      if (effect) {
        dispatch({ type: "ADD_EFFECT", payload: effect });
      }
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });

      setIsProcessing(false);
    },
    [gameState, isProcessing, addLog, updateRunStats, triggerDeath, dispatch],
  );

  const handleNPCChoice = useCallback(
    async (optionId: string) => {
      if (!gameState.activeNPC || isProcessing) return;
      setIsProcessing(true);

      const npc = gameState.activeNPC;

      if (optionId === "leave") {
        addLog(
          <span className="text-muted-foreground">
            You nod to <EntityText type="npc">{npc.name}</EntityText> and
            continue on your way.
          </span>,
          "narrative",
        );
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_NPC", payload: null });
        setIsProcessing(false);
        return;
      }

      if (
        optionId === "trade" &&
        npc.role === "merchant" &&
        npc.inventory?.length
      ) {
        const item = npc.inventory[0];
        const cost = item.value;

        if (gameState.player.stats.gold >= cost) {
          updateRunStats({
            goldSpent: gameState.runStats.goldSpent + cost,
            itemsFound: [...gameState.runStats.itemsFound, item],
          });
          addLog(
            <span>
              You purchase{" "}
              <EntityText type={item.rarity}>{item.name}</EntityText> for{" "}
              <EntityText type="gold">{cost} gold</EntityText>.
            </span>,
            "loot",
          );
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });
          dispatch({ type: "ADD_ITEM", payload: item });
          dispatch({ type: "SET_ACTIVE_NPC", payload: { ...npc, inventory: npc.inventory?.slice(1) } });
        } else {
          addLog(
            <span className="text-muted-foreground">
              You don&apos;t have enough gold.
            </span>,
            "system",
          );
        }
        setIsProcessing(false);
        return;
      }

      if (optionId === "help" && npc.role === "trapped") {
        const roll = Math.random();
        if (roll < 0.3) {
          addLog(
            <span>
              <EntityText type="npc">{npc.name}</EntityText> is grateful.{" "}
              <EntityText type="companion">
                &quot;I&apos;ll remember this kindness!&quot;
              </EntityText>
            </span>,
            "dialogue",
          );
        }
        const goldReward = Math.floor(Math.random() * 30) + 20;
        updateRunStats({
          goldEarned: gameState.runStats.goldEarned + goldReward,
        });
        addLog(
          <span>
            <EntityText type="npc">{npc.name}</EntityText> thanks you and offers{" "}
            <EntityText type="gold">{goldReward} gold</EntityText>.
          </span>,
          "loot",
        );
        dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldReward });
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_NPC", payload: null });
        setIsProcessing(false);
        return;
      }

      if (optionId === "talk") {
        const generateEntity = async (
          entityType: string,
          _options: unknown,
        ) => {
          if (entityType === "npc") {
            return {
              greeting: "Greetings, traveler!",
              // ... other NPC properties
            };
          }
          return undefined;
        };
        const dialogue = await generateEntity("npc", {
          role: npc.role,
          floor: gameState.floor,
        });
        const newDialogue =
          dialogue?.greeting || "The dungeon holds many secrets...";
        setNpcDialogue(newDialogue);
        addLog(
          <span className="italic text-amber-200/80">
            &quot;{newDialogue}&quot;
          </span>,
          "dialogue",
        );
        setIsProcessing(false);
        return;
      }

      if (optionId === "attack") {
        const enemy: typeof gameState.currentEnemy = {
          id: npc.id,
          entityType: "enemy",
          name: npc.name,
          health: 20 + gameState.floor * 5,
          maxHealth: 20 + gameState.floor * 5,
          attack: 5 + gameState.floor * 2,
          defense: 3 + gameState.floor,
          expReward: 10,
          goldReward: Math.floor(Math.random() * 20) + 10,
        };
        addLog(
          <span>
            <EntityText type="npc">{npc.name}</EntityText> cries out as you
            attack! <EntityText type="enemy">They fight back!</EntityText>
          </span>,
          "combat",
        );
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_NPC", payload: null });
        dispatch({ type: "START_COMBAT", payload: enemy });
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
    },
    [gameState, isProcessing, addLog, updateRunStats, dispatch],
  );

  // Handler for loot container reveal completion
  const handleLootContainerComplete = useCallback(
    (items: Item[], curseTriggered?: boolean, curseEffect?: string) => {
      const goldFound = items.reduce((sum, item) => sum + (item.value || 0), 0);

      // Log collected items
      addLog(
        <span>
          Collected {items.length} item{items.length !== 1 ? "s" : ""}:{" "}
          {items.map((item, i) => (
            <span key={item.id}>
              {i > 0 && ", "}
              <ItemText item={item} />
            </span>
          ))}
          {goldFound > 0 && (
            <>
              {" "}
              worth <EntityText type="gold">{goldFound} gold</EntityText>
            </>
          )}
        </span>,
        "loot",
      );

      // Handle curse if triggered
      if (curseTriggered && curseEffect) {
        addLog(
          <span className="text-red-400">
            <EntityText type="damage">Cursed!</EntityText> {curseEffect}
          </span>,
          "combat",
        );
        // Apply curse damage
        const curseDamage = Math.floor(10 + gameState.floor * 3);
        const newHealth = Math.max(1, gameState.player.stats.health - curseDamage);
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
      }

      // Add items to inventory
      for (const item of items) {
        dispatch({ type: "ADD_ITEM", payload: item });
      }
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldFound });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: {
          goldEarned: gameState.runStats.goldEarned + goldFound,
          itemsFound: [...gameState.runStats.itemsFound, ...items],
        },
      });

      // Clear the active container
      setActiveLootContainer(null);
    },
    [gameState.floor, gameState.player.stats.health, gameState.runStats, addLog, dispatch],
  );

  // Handler for canceling loot container (leave without opening)
  const handleLootContainerCancel = useCallback(() => {
    addLog(
      <span className="text-muted-foreground italic">
        You decide to leave the container unopened...
      </span>,
      "narrative",
    );
    setActiveLootContainer(null);
  }, [addLog]);

  const descendFloor = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const maxFloors = gameState.currentDungeon?.floors || 5;
    const newFloor = gameState.floor + 1;

    if (newFloor > maxFloors) {
      const dungeonRarity: ItemRarity =
        gameState.currentDungeon?.rarity || "common";
      let rewardKey: DungeonKey | null = null;

      const keyRoll = Math.random();
      if (dungeonRarity === "legendary" || keyRoll < 0.3) {
        const rarities: ItemRarity[] = [
          "common",
          "uncommon",
          "rare",
          "legendary",
        ];
        const dungeonIndex = rarities.indexOf(dungeonRarity);
        const rewardIndex = Math.min(
          rarities.length - 1,
          dungeonIndex + (keyRoll < 0.1 ? 1 : 0),
        );
        rewardKey = createDungeonKey(rarities[rewardIndex]);
      }

      addLog(
        <span>
          <EntityText type="legendary">DUNGEON COMPLETE!</EntityText> You have
          conquered{" "}
          <EntityText type="location">
            {gameState.currentDungeon?.name}
          </EntityText>
          !
        </span>,
        "system",
      );

      // Generate AI-themed dungeon completion loot
      const floorRewards = await generateFloorReward(
        gameState.currentDungeon?.name || "Unknown Dungeon",
        gameState.currentDungeon?.theme || "ancient",
        gameState.floor,
        gameState.player.className || undefined,
      );

      if (floorRewards.length > 0) {
        addLog(
          <span>
            Dungeon treasures:{" "}
            {floorRewards.map((item, i) => (
              <span key={item.id}>
                {i > 0 && ", "}
                <EntityText type={item.rarity}>{item.name}</EntityText>
              </span>
            ))}
          </span>,
          "loot",
        );
      }

      if (rewardKey) {
        addLog(
          <span>
            Among the treasures, you find a{" "}
            <EntityText
              type={
                rewardKey.rarity === "legendary"
                  ? "legendary"
                  : rewardKey.rarity === "rare"
                    ? "rare"
                    : "item"
              }
            >
              {rewardKey.name}
            </EntityText>
            !
          </span>,
          "loot",
        );
      }

      const bonusGold = Math.floor(
        50 *
          (1 +
            ["common", "uncommon", "rare", "legendary"].indexOf(
              dungeonRarity as string,
            ) *
              0.5),
      );
      addLog(
        <span>
          Completion bonus:{" "}
          <EntityText type="gold">+{bonusGold} gold</EntityText>
        </span>,
        "loot",
      );

      updateRunStats({
        dungeonsCompleted: [
          ...gameState.runStats.dungeonsCompleted,
          gameState.currentDungeon?.name || "Unknown",
        ],
        goldEarned: gameState.runStats.goldEarned + bonusGold,
        floorsCleared: gameState.runStats.floorsCleared + gameState.currentRoom,
        itemsFound: [...gameState.runStats.itemsFound, ...floorRewards],
      });

      setTimeout(() => {
        dispatch({ type: "MODIFY_PLAYER_GOLD", payload: bonusGold });
        if (rewardKey) {
          dispatch({ type: "ADD_KEY", payload: rewardKey });
        }
        for (const item of floorRewards) {
          dispatch({ type: "ADD_ITEM", payload: item });
        }
        dispatch({ type: "SET_PHASE", payload: "tavern" });
        dispatch({ type: "CLEAR_DUNGEON" });
        clearLogs();
        addLog(
          <span className="text-muted-foreground">
            You return to the tavern, victorious. The fire crackles warmly as
            you enter...
          </span>,
          "system",
        );
      }, 2000);
    } else {
      const response = await generateNarrative<RoomResponse>("descend", {
        newFloor,
        roomsExplored: gameState.currentRoom,
        playerLevel: gameState.player.stats.level,
      });

      updateRunStats({
        floorsCleared: gameState.runStats.floorsCleared + gameState.currentRoom,
      });

      if (response) {
        addLog(<span>{response.roomDescription}</span>, "narrative");
      } else {
        addLog(
          <span>
            You descend to{" "}
            <EntityText type="location">Floor {newFloor}</EntityText>. The
            darkness grows deeper.
          </span>,
          "narrative",
        );
      }

      dispatch({ type: "SET_FLOOR", payload: newFloor });
      dispatch({ type: "SET_ROOM", payload: 0 });
      dispatch({ type: "SET_HAZARD", payload: null });
    }

    setIsProcessing(false);
  }, [gameState, isProcessing, addLog, updateRunStats, dispatch]);

  const attemptFlee = useCallback(async () => {
    if (!gameState.currentEnemy || !gameState.inCombat || isProcessing) return;

    if (gameState.currentHazard?.effects.fleeDisabled) {
      addLog(
        <span className="text-red-400">
          The{" "}
          <EntityText type="curse">{gameState.currentHazard.name}</EntityText>{" "}
          prevents your escape!
        </span>,
        "system",
      );
      return;
    }

    setIsProcessing(true);

    const fleeChance = 0.4 + gameState.player.stats.level * 0.05;
    const success = Math.random() < fleeChance;

    const fleeResponse = await generateNarrative<FleeResponse>(
      success ? "flee_success" : "flee_fail",
      {
        enemyName: gameState.currentEnemy.name,
        damage: success ? 0 : undefined,
      },
    );

    if (success) {
      if (fleeResponse) {
        addLog(<span>{fleeResponse.fleeNarration}</span>, "combat");
      } else {
        addLog(
          <span>
            <EntityText type="player">You</EntityText> escape from the{" "}
            <EntityText type="enemy">{gameState.currentEnemy.name}</EntityText>!
          </span>,
          "combat",
        );
      }
      dispatch({ type: "END_COMBAT" });
    } else {
      const effectiveStats = calculateEffectiveStats(gameState.player);
      const damage = calculateDamage(gameState.currentEnemy, {
        defense: effectiveStats.defense,
      });
      const newHealth = gameState.player.stats.health - damage;

      updateRunStats({ damageTaken: gameState.runStats.damageTaken + damage });

      if (fleeResponse) {
        addLog(
          <span>
            {fleeResponse.fleeNarration}{" "}
            <EntityText type="damage">(-{damage})</EntityText>
          </span>,
          "combat",
        );
      } else {
        addLog(
          <span>
            Failed to flee! The{" "}
            <EntityText type="enemy">{gameState.currentEnemy.name}</EntityText>{" "}
            strikes for <EntityText type="damage">{damage}</EntityText> damage.
          </span>,
          "combat",
        );
      }

      if (newHealth <= 0) {
        triggerDeath("Slain while fleeing", gameState.currentEnemy.name);
        addLog(
          <span className="text-red-400">
            <EntityText type="player">You</EntityText> have fallen. The dungeon
            claims another soul.
          </span>,
          "system",
        );
      } else {
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
        dispatch({ type: "INCREMENT_COMBAT_ROUND" });
      }
    }
    setIsProcessing(false);
  }, [
    gameState,
    isProcessing,
    calculateDamage,
    addLog,
    updateRunStats,
    triggerDeath,
    dispatch,
  ]);

  const consumePotion = useCallback(
    (potion: Item) => {
      if (potion.type !== "potion" || !potion.stats?.health) return;

      const healAmount = Math.min(
        potion.stats.health,
        gameState.player.stats.maxHealth - gameState.player.stats.health,
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
    [gameState.player.stats.maxHealth, gameState.player.stats.health, addLog, dispatch],
  );

  const equipItem = useCallback(
    (item: Item) => {
      if (item.type !== "weapon" && item.type !== "armor") return;

      const slot = item.type;
      const currentEquipped = gameState.player.equipment[slot];

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
    },
    [gameState.player.equipment, addLog, dispatch],
  );

  const _dropItem = useCallback(
    (item: Item) => {
      addLog(
        <span className="text-muted-foreground">
          Discarded <EntityText type="item">{item.name}</EntityText>.
        </span>,
        "system",
      );
      dispatch({ type: "REMOVE_ITEM", payload: item.id });
    },
    [addLog, dispatch],
  );

  const restartGame = useCallback(() => {
    // Use gameFlow hook for restart logic
    gameFlow.restartGame();
    openClassSelect();
    setShowMenuFalse();
  }, [gameFlow, openClassSelect, setShowMenuFalse]);

  const _returnToTavern = useCallback(() => {
    clearLogs();
    setGameState((prev) => ({
      ...prev,
      player: {
        ...createInitialPlayer(),
        // Preserve class if selected
        class: prev.player.class,
        className: prev.player.className,
        abilities: prev.player.class
          ? CLASSES[prev.player.class].startingAbilities
              .map((id) => {
                // Rebuild starting abilities
                const _allAbilities = Object.entries(CLASSES).flatMap(
                  ([, c]) =>
                    c.abilityUnlocks
                      .map((u) => u.abilityId)
                      .concat(c.startingAbilities),
                );
                return (
                  prev.player.abilities.find((a) => a.id === id) ||
                  prev.player.abilities[0]
                );
              })
              .filter(Boolean)
          : [],
        resources: prev.player.class
          ? {
              type: CLASSES[prev.player.class].resourceType,
              current: CLASSES[prev.player.class].baseResource,
              max: CLASSES[prev.player.class].baseResource,
            }
          : prev.player.resources,
      },
      gameOver: false,
      phase: "tavern",
      currentDungeon: null,
      currentEnemy: null,
      inCombat: false,
      runStats: createInitialRunStats(),
    }));
    addLog(
      <span className="text-stone-400">
        You awaken in the tavern. The nightmare fades, but the dungeons await...
      </span>,
      "system",
    );
    setShowMenuFalse();
  }, [addLog, clearLogs, setShowMenuFalse, setGameState]);

  const startGame = useCallback(() => {
    // Use gameFlow hook for new game logic
    gameFlow.startNewGame();
    openClassSelect();
    addLog(
      <span>
        You stand at the entrance to the dungeon depths. Choose your path
        wisely...
      </span>,
      "narrative",
    );
  }, [addLog, gameFlow, openClassSelect]);

  const handleRestoreHealth = useCallback(
    (cost: number, amount: number) => {
      if (gameState.player.stats.gold < cost) return;

      // Deduct gold
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });

      // Heal (capped at max)
      const newHealth = Math.min(
        gameState.player.stats.maxHealth,
        gameState.player.stats.health + amount,
      );
      dispatch({ type: "UPDATE_PLAYER_STATS", payload: { health: newHealth } });

      // Track gold spent
      updateRunStats({ goldSpent: gameState.runStats.goldSpent + cost });

      addLog(
        <span>
          Sister Meridia&apos;s healing light washes over you.{" "}
          <EntityText type="heal">+{amount} HP</EntityText>
        </span>,
        "system",
      );
    },
    [gameState.player.stats, gameState.runStats.goldSpent, dispatch, addLog, updateRunStats],
  );

  const handleBuyKey = useCallback(
    (keyRarity: "common" | "uncommon" | "rare") => {
      // Use tavern hook for the purchase logic
      const key = tavern.buyKey(keyRarity);
      if (!key) return; // Couldn't afford

      // Custom JSX logging (richer than hook's plain text)
      addLog(
        <span>
          You purchase a{" "}
          <EntityText type={keyRarity === "rare" ? "rare" : "item"}>
            {key.name}
          </EntityText>{" "}
          from Korvin.
        </span>,
        "system",
      );
    },
    [tavern, addLog],
  );

  const currentChoices = useMemo(() => {
    const potion = gameState.player.inventory.find((i) => i.type === "potion");

    if (gameState.gameOver) {
      return []; // Death screen handles this now
    }

    if (gameState.phase === "dungeon_select" || gameState.phase === "tavern") {
      return [];
    }

    if (
      gameState.phase === "trap_encounter" ||
      gameState.phase === "shrine_choice" ||
      gameState.phase === "npc_interaction"
    ) {
      return [];
    }

    if (gameState.pathOptions && gameState.pathOptions.length > 0) {
      return [];
    }

    if (gameState.inCombat && gameState.currentEnemy) {
      const choices: GameChoice[] = [
        {
          id: "attack",
          text: "Attack",
          action: playerAttack,
          disabled: isProcessing,
        },
        {
          id: "flee",
          text: gameState.currentHazard?.effects.fleeDisabled
            ? "Flee (Blocked)"
            : "Flee",
          action: attemptFlee,
          tooltip: gameState.currentHazard?.effects.fleeDisabled
            ? "Cannot flee due to hazard"
            : `~${Math.floor((0.4 + gameState.player.stats.level * 0.05) * 100)}%`,
          disabled:
            isProcessing || gameState.currentHazard?.effects.fleeDisabled,
        },
      ];

      if (
        potion &&
        gameState.player.stats.health < gameState.player.stats.maxHealth
      ) {
        choices.push({
          id: "potion",
          text: `Use ${potion.name}`,
          action: () => consumePotion(potion),
          disabled: isProcessing,
        });
      }

      // Taming option - available when enemy HP is low enough
      const tameCheck = canTameEnemy(gameState.currentEnemy, gameState.player);
      if (tameCheck.canTame) {
        choices.push({
          id: "tame",
          text: "Tame",
          action: handleTameEnemy,
          tooltip: `${Math.floor(tameCheck.chance * 100)}% success chance`,
          disabled: isProcessing,
        });
      }

      return choices;
    }

    if (!gameState.inCombat && gameState.currentDungeon) {
      const explorationChoices: GameChoice[] = [
        {
          id: "explore",
          text: "Explore Deeper",
          action: exploreRoom,
          disabled: isProcessing,
        },
      ];

      const maxFloors = gameState.currentDungeon.floors;
      if (gameState.currentRoom > 0 && gameState.currentRoom % 5 === 0) {
        const isLastFloor = gameState.floor >= maxFloors;
        explorationChoices.push({
          id: "descend",
          text: isLastFloor
            ? "Claim Victory & Exit"
            : `Descend to Floor ${gameState.floor + 1}`,
          action: descendFloor,
          disabled: isProcessing,
        });
      }

      if (
        potion &&
        gameState.player.stats.health < gameState.player.stats.maxHealth
      ) {
        explorationChoices.push({
          id: "heal",
          text: `Use ${potion.name}`,
          action: () => consumePotion(potion),
          disabled: isProcessing,
        });
      }

      return explorationChoices;
    }

    // Title screen choices are handled in the return statement now
    if (gameState.phase === "title") {
      return [];
    }

    return [];
  }, [
    gameState,
    isProcessing,
    playerAttack,
    attemptFlee,
    consumePotion,
    exploreRoom,
    descendFloor,
    restartGame,
    startGame,
    handleTameEnemy,
  ]);

  const npcOptions = useMemo(() => {
    if (!gameState.activeNPC) return [];
    const npc = gameState.activeNPC;
    const options: Array<{
      id: string;
      text: string;
      action: "talk" | "trade" | "help" | "attack" | "leave";
      disabled?: boolean;
      cost?: { gold?: number };
    }> = [];

    options.push({ id: "talk", text: "Talk", action: "talk" });

    if (npc.role === "merchant" && npc.inventory?.length) {
      const item = npc.inventory[0];
      options.push({
        id: "trade",
        text: `Buy ${item.name}`,
        action: "trade",
        cost: { gold: item.value },
        disabled: gameState.player.stats.gold < item.value,
      });
    }

    if (npc.role === "trapped") {
      options.push({ id: "help", text: "Free them", action: "help" });
    }

    options.push({ id: "attack", text: "Attack", action: "attack" });
    options.push({ id: "leave", text: "Leave", action: "leave" });

    return options;
  }, [gameState.activeNPC, gameState.player.stats.gold]);

  // === INVENTORY HANDLERS ===
  const handleEquipItem = useCallback(
    (item: Item) => {
      equipItem(item);
    },
    [equipItem],
  );

  const _handleUnequipItem = useCallback(
    (slot: "weapon" | "armor") => {
      const currentItem = gameState.player.equipment[slot];
      if (currentItem) {
        addLog(
          <span>
            You unequip <EntityText type="item">{currentItem.name}</EntityText>.
          </span>,
          "system",
        );
        setGameState((prev) => ({
          ...prev,
          player: {
            ...prev.player,
            equipment: { ...prev.player.equipment, [slot]: null },
            inventory: [
              ...prev.player.inventory,
              { ...currentItem, equipped: false },
            ],
          },
        }));
      }
    },
    [gameState.player.equipment, addLog],
  );

  // === RENDER HELPERS ===
  const renderInteractiveEntities = useCallback(() => {
    const activeEntities = gameState.roomEnvironmentalEntities.filter(
      (e) => !e.consumed,
    );
    if (activeEntities.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Nearby:
        </span>
        <div className="flex flex-wrap gap-2">
          {activeEntities.map((entity) => {
            const interactions = getAvailableInteractions(
              entity,
              gameState.player,
            );
            const hasAvailable = interactions.some((i) => i.available);

            return (
              <button
                key={entity.id}
                onClick={() => {
                  const available = interactions.find((i) => i.available);
                  if (available) {
                    handleEnvironmentalInteraction(
                      entity.id,
                      available.interaction.id,
                    );
                  }
                }}
                disabled={!hasAvailable || isProcessing}
                className={`
                  text-xs px-2 py-1 rounded transition-colors
                  ${
                    hasAvailable
                      ? "bg-secondary/30 hover:bg-secondary/50 text-foreground"
                      : "bg-secondary/10 text-muted-foreground cursor-not-allowed"
                  }
                `}
                title={entity.description || entity.name}
              >
                <EntityText type="item" noAnimation>
                  {entity.name}
                </EntityText>
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [
    gameState.roomEnvironmentalEntities,
    gameState.player,
    handleEnvironmentalInteraction,
    isProcessing,
  ]);

  // Fixed return statement and JSX structure for title screen
  if (gameState.phase === "title" && !showClassSelect) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-amber-100 tracking-wider">
              DEPTHS OF SHADOW
            </h1>
            <p className="text-stone-500 text-sm tracking-widest uppercase">
              A Text-Based Dungeon Crawler
            </p>
          </div>

          <div className="space-y-2 pt-4">
            {hasExistingSaves && (
              <button
                onClick={() => {
                  const data = load(0);
                  if (data) {
                    handleLoadSave(data);
                  } else {
                    setShowMenuTrue();
                  }
                }}
                className="block w-48 mx-auto px-6 py-3 bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-200 transition-colors"
              >
                Continue
              </button>
            )}

            <button
              onClick={openClassSelect}
              className="block w-48 mx-auto px-6 py-3 bg-amber-900/50 hover:bg-amber-800/50 text-amber-200 transition-colors"
            >
              New Game
            </button>

            {hasExistingSaves && (
              <button
                onClick={setShowMenuTrue}
                className="block w-48 mx-auto px-6 py-3 bg-stone-800/50 hover:bg-stone-700/50 text-stone-300 transition-colors"
              >
                Load Game
              </button>
            )}
          </div>

          <p className="text-stone-600 text-xs pt-8">
            Press any key or click to begin your descent...
          </p>
        </div>

        {showMenu && (
          <GameMenu
            isOpen={true}
            onClose={setShowMenuFalse}
            gameState={gameState}
            worldState={worldState}
            logs={logs}
            chaosEvents={chaosEvents}
            onLoad={handleLoadSave}
            onNewGame={handleNewGame}
            onReturnToTitle={handleReturnToTitle}
          />
        )}
      </div>
    );
  }

  // === MAIN RENDER ===
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DevPanel
        gameState={gameState}
        setGameState={setGameState}
        worldState={worldState}
        setWorldState={setWorldState}
        chaosEvents={chaosEvents}
        setChaosEvents={setChaosEvents}
        logs={logs}
        addLog={addLog}
        isOpen={showDevPanel}
        onClose={toggleDevPanel}
      />

      {/* Left Sidebar - Stats (shown after class select) */}
      {gameState.phase !== "title" && !showClassSelect && gameState.player && (
        <div className="hidden lg:block w-64 bg-stone-900/50 sticky top-0 h-screen overflow-y-auto">
          <SidebarStats
            player={gameState.player}
            floor={gameState.floor} // Corrected to gameState.floor
            currentRoom={gameState.currentRoom}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Menu button */}
        {gameState.gameStarted && !gameState.gameOver && (
          <button
            onClick={setShowMenuTrue}
            className="fixed top-4 right-4 z-30 px-3 py-1 bg-stone-800/80 hover:bg-stone-700 text-stone-400 text-sm transition-colors"
          >
            [ESC] Menu
          </button>
        )}

        {/* Game Menu */}
        <GameMenu
          isOpen={showMenu}
          onClose={setShowMenuFalse}
          gameState={gameState}
          worldState={worldState}
          logs={logs}
          chaosEvents={chaosEvents}
          onLoad={handleLoadSave}
          onNewGame={handleNewGame}
          onReturnToTitle={handleReturnToTitle}
        />

        {/* Class select */}
        {showClassSelect ? (
          <ClassSelect onSelectClass={handleSelectClass} />
        ) : gameState.phase === "tavern" ? (
          <Tavern
            player={gameState.player}
            onEnterDungeons={enterDungeonSelect}
            onRestoreHealth={handleRestoreHealth}
            onBuyKey={handleBuyKey}
            onManageParty={() => {}}
          />
        ) : gameState.phase === "dungeon_select" ? (
          <DungeonSelect
            dungeons={gameState.availableDungeons}
            player={gameState.player}
            onSelectDungeon={(dungeon, key) => {
              selectDungeon(dungeon, key);
            }}
            disabled={isProcessing}
          />
        ) : (
          <div className="flex-1 flex flex-col p-4">
            {/* Game Log */}
            <div className="flex-1 overflow-hidden">
              {currentNarrative ? (
                <InteractiveNarrative
                  narrative={currentNarrative}
                  entities={gameState.roomEnvironmentalEntities}
                  player={gameState.player}
                  onInteract={handleEnvironmentalInteraction}
                  disabled={isProcessing || isAiGenerating}
                />
              ) : (
                <GameLog logs={logs} />
              )}
            </div>

            {!gameState.inCombat && gameState.currentHazard && (
              <div className="mb-3">
                <HazardDisplay
                  hazard={gameState.currentHazard}
                  isMitigated={gameState.currentHazard.mitigatedBy?.includes(
                    gameState.player.class || "",
                  )}
                />
              </div>
            )}

            {gameState.phase === "trap_encounter" && gameState.activeTrap && (
              <TrapInteraction
                trap={gameState.activeTrap}
                player={gameState.player}
                onAction={handleTrapAction}
                disabled={isProcessing}
              />
            )}

            {gameState.phase === "shrine_choice" && gameState.activeShrine && (
              <ShrineInteraction
                shrine={gameState.activeShrine}
                player={gameState.player}
                onInteract={handleShrineAction}
                isProcessing={isProcessing}
              />
            )}

            {gameState.phase === "npc_interaction" && gameState.activeNPC && (
              <NPCDialogue
                npc={gameState.activeNPC}
                player={gameState.player}
                dialogue={npcDialogue}
                options={npcOptions}
                onChoice={handleNPCChoice}
                isProcessing={isProcessing}
              />
            )}

            {/* Gacha Loot Container Reveal */}
            {activeLootContainer && (
              <LootContainerReveal
                container={activeLootContainer}
                onComplete={handleLootContainerComplete}
                onCancel={handleLootContainerCancel}
              />
            )}

            {gameState.inCombat && gameState.currentEnemy && (
              <CombatDisplay
                enemy={gameState.currentEnemy}
                player={gameState.player}
                hazard={gameState.currentHazard}
                onChangeStance={handleChangeStance}
                combatRound={gameState.combatRound}
                disabled={isProcessing}
              />
            )}

            {gameState.inCombat &&
              gameState.currentEnemy &&
              gameState.player.abilities.length > 0 && (
                <div className="mt-4">
                  <AbilityBar
                    player={gameState.player}
                    currentEnemy={gameState.currentEnemy}
                    onUseAbility={handleUseAbility}
                    onToggleSustained={handleToggleSustained}
                    disabled={isProcessing}
                  />
                </div>
              )}

            {gameState.pathOptions && gameState.pathOptions.length > 0 && (
              <PathSelect
                paths={gameState.pathOptions}
                onSelectPath={handleSelectPath}
                disabled={isProcessing}
              />
            )}

            {!gameState.inCombat && renderInteractiveEntities()}

            <div className="mt-4">
              <ChoiceButtons choices={currentChoices} disabled={isProcessing} />
            </div>

            {isProcessing && (
              <div className="text-center text-stone-500 text-sm mt-2 animate-pulse">
                The dungeon stirs...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Inventory & Keys */}
      {gameState.phase !== "title" && !showClassSelect && gameState.player && (
        <div className="hidden lg:block w-64 bg-stone-900/50 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 space-y-6">
            <SidebarInventory
              player={gameState.player}
              onEquipItem={handleEquipItem}
            />
            <SidebarKeys keys={gameState.player.keys} />
          </div>
        </div>
      )}
    </div>
  );
}
