"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";

import type {
  GameState,
  GameChoice,
  Item,
  ItemRarity,
  Player,
  DungeonCard,
  DungeonKey,
  PlayerClass,
  PlayerRace,
  CombatStance,
  RunSummary,
  EnvironmentalEntity,
  ParsedNarrative,
  Boss,
  Combatant,
  MapItem,
  MapTier,
  CraftingCurrency,
} from "@/lib/core/game-types";
import type { ChaosEvent } from "@/lib/world/chaos-system";
import {
  createDungeonKey,
  generateDungeonSelection,
  createInitialPlayer,
  createInitialRunStats,
  createDungeonFromMap,
} from "@/lib/core/game-data";
import { generateMap } from "@/lib/items/map-generator";
import { createCurrency, applyCurrencyToMap } from "@/lib/items/currency-generator";
import { calculateEffectiveStats, STATUS_EFFECTS } from "@/lib/entity/entity-system";
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
} from "@/lib/combat/effect-system";
import {
  initializePlayerClass,
  executeAbility,
  regenerateResource,
  tickCooldowns,
  getClassAbilitiesForLevel,
  CLASSES,
  autoLevelAbilitiesOnLevelUp,
  levelUpAbility,
} from "@/lib/character/ability-system";
import {
  initializePlayerRace,
  RACE_DEFINITIONS,
} from "@/lib/character/race-system";
import {
  generatePathOptions,
  getPathRewardMultiplier,
} from "@/lib/world/path-system";
import {
  generateHazard,
  applyHazardToPlayer,
  applyHazardToEnemy,
  tickHazard,
  removeHazardEffects,
} from "@/lib/world/hazard-system";
import {
  calculateDamageWithType,
  checkForCombo,
  tickCombo,
  selectEnemyAbility,
  tickEnemyAbilities,
  generateEnemyAbility,
  STANCE_MODIFIERS,
} from "@/lib/combat/combat-system";
import {
  getInteractionsForEntity,
  getAvailableInteractions,
  getAllInteractionsForEntity,
} from "@/lib/world/environmental-system";
import { executeItemUse } from "@/lib/items/item-execution";
import type { EssenceCraftRecipe } from "@/lib/items/transmogrification-system";
import type { AlchemyResult } from "@/lib/ai/ai-alchemy-system";
import { gameActions } from "@/contexts/game-reducer";
import { calculateForesight } from "@/lib/mechanics/foresight-system";
import { cn } from "@/lib/core/utils";
import {
  EntityText,
  EnemyText,
  ItemText,
  TrapText,
  ShrineText,
  NPCText,
} from "@/components/narrative/entity-text";
// createGameLogger is provided via LogContext - see useLog() hook
import { GameLog } from "./game-log";
import { ChoiceButtons } from "@/components/narrative/choice-buttons";
import { CombatDisplay } from "@/components/combat/combat-display";
import { BossEncounter } from "@/components/encounters/boss-encounter";
import { VaultEncounter, type VaultAction } from "@/components/encounters/vault-encounter";
import { SidebarInventory } from "@/components/inventory/sidebar-inventory";
import { DungeonSelect } from "@/components/world/dungeon-select";
import { ClassSelect } from "@/components/character/class-select";
import { RaceSelect } from "@/components/character/race-select";
import { DeathScreen } from "@/components/character/death-screen";
import { AbilityBar } from "@/components/combat/ability-bar";
import { ComboDisplay } from "@/components/combat/combo-display";
import { SpellBar } from "@/components/combat/spell-bar";
import { PathSelect } from "@/components/world/path-select";
import { UtilityBar } from "@/components/world/utility-bar";
import { HazardDisplay } from "@/components/world/hazard-display";
import { EnvironmentalIndicator } from "@/components/world/environmental-indicator";
import { extractPlayerCapabilities } from "@/lib/mechanics/player-capabilities";
import { TrapInteraction } from "@/components/encounters/trap-interaction";
import { ShrineInteraction } from "@/components/encounters/shrine-interaction";
import { NPCDialogue } from "@/components/encounters/npc-dialogue";
import { Tavern } from "@/components/encounters/tavern";
import { InteractiveNarrative } from "@/components/narrative/interactive-narrative";
import { LootContainerReveal } from "@/components/inventory/loot-container-reveal";
import { useSaveSystem, type SaveData } from "@/lib/persistence/save-system";
import { useGame } from "@/contexts/game-context";
import { useLog } from "@/contexts/log-context";
import { useUI } from "@/contexts/ui-context";
import { useEntityModal } from "@/components/modals/entity-modal-context";
import { useGameFlow } from "@/hooks/use-game-flow";
import { useTavern } from "@/hooks/use-tavern";
import { useNavigation } from "@/hooks/use-navigation";
import { useEncounters } from "@/hooks/use-encounters";
import { useCombat } from "@/hooks/use-combat";
import { useSpellCasting } from "@/hooks/use-spell-casting";
import { useDungeonMaster } from "@/lib/hooks/use-dungeon-master";
import {
  enhanceEnemyWithLore,
  generateFloorReward,
  getBossVictoryRewards,
  generateNPCDialogue,
  generateLootContainer,
  type LootContainer,
} from "@/lib/ai/ai-drops-system";
import { GameMenu } from "./game-menu";
import { createWorldStateManager, type WorldState } from "@/lib/world/world-state";
import { DevPanel } from "@/components/dev/dev-panel";
import { SidebarStats } from "@/components/character/sidebar-stats";
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
} from "@/lib/entity/companion-system";
import type { Companion, Enemy, SustainedAbility, EquipmentSlot } from "@/lib/core/game-types";
import { generateId } from "@/lib/core/utils";
import {
  activateSustained,
  deactivateSustained,
  processSustainedTurn,
  getEffectiveResources,
  getSustainedAbilitiesForClass,
} from "@/lib/character/sustained-ability-system";

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
  eventMemory: {
    history: [],
    typeLastSeen: new Map(),
    combatStreak: 0,
    roomsSinceReward: 0,
  },
  activeVault: null,
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
    showRaceSelect,
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
    openRaceSelect,
    closeRaceSelect,
    setActiveLootContainer,
    setNpcDialogue,
    setCurrentNarrative,
    setIsProcessing,
  } = useUI();
  const { setActions: setEntityModalActions } = useEntityModal();

  // =========================================================================
  // LOCAL STATE - Only for things not in contexts
  // =========================================================================
  const [worldState, setWorldState] = useState<WorldState>(() =>
    createWorldStateManager().getState(),
  );
  const [chaosEvents, setChaosEvents] = useState<ChaosEvent[]>([]);
  const [hasExistingSaves, setHasExistingSaves] = useState(false); // Client-side only to avoid hydration mismatch
  const [selectedRace, setSelectedRace] = useState<PlayerRace | null>(null); // Store selected race before class selection

  // Dynamic AI-generated exploration choices
  interface DynamicChoice {
    id: string;
    text: string;
    type: "explore" | "interact" | "investigate" | "rest" | "special";
    riskLevel: "safe" | "risky" | "dangerous";
    entityTarget?: string | null;
    hint?: string | null;
  }
  const [dynamicChoices, setDynamicChoices] = useState<DynamicChoice[]>([]);
  const [choiceAtmosphere, setChoiceAtmosphere] = useState<string | null>(null);
  const [lastChoiceFetchRoom, setLastChoiceFetchRoom] = useState<string | null>(null);

  const { autoSave, hasSaves, load, deserializeWorldState, deserializeGameState } = useSaveSystem();
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
    isProcessing,
    setIsProcessing,
    addLog,
    clearLogs,
    setActiveLootContainer,
    setNpcDialogue,
  });

  // Destructure navigation handlers from hook
  const { handleSelectPath } = navigation;

  const combat = useCombat({
    state: gameState,
    dispatch,
    logger: log,
    isProcessing,
    setIsProcessing,
    updateRunStats,
    addLog,
    generateNarrative,
  });

  // Destructure combat handlers from hook
  const { enemyAttack, handleUseAbility, processCompanionTurns, playerAttack } = combat;

  // Spell casting hook
  const spellCasting = useSpellCasting({
    state: gameState,
    dispatch,
    logger: log,
    updateRunStats,
    addLog,
  });

  const { handleCastSpell, handleLearnFromItem, hasSpells } = spellCasting;

  // DevPanel-only: wrapper to provide setState-style API for dev tools
  const setGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      const newState = typeof updater === "function" ? updater(gameState) : updater;
      dispatch({ type: "LOAD_STATE", payload: newState });
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
      // Use gameFlow for state loading with proper deserialization (handles Map reconstruction)
      const gameState = deserializeGameState(data.gameState);
      gameFlow.loadSavedGame(gameState);
      setWorldState(deserializeWorldState(data.worldState));
      setChaosEvents(data.chaosEvents || []);
      closeClassSelect();
      setShowMenuFalse();
    },
    [deserializeGameState, deserializeWorldState, gameFlow, closeClassSelect, setShowMenuFalse],
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

  // Fetch dynamic exploration choices from AI
  const fetchDynamicChoices = useCallback(async () => {
    const roomKey = `${gameState.floor}-${gameState.currentRoom}`;
    // Don't re-fetch for same room unless forced
    if (lastChoiceFetchRoom === roomKey) return;

    const result = await generateNarrative<{
      choices: DynamicChoice[];
      atmosphere: string;
    }>("exploration_choices", {
      floor: gameState.floor,
      roomNumber: gameState.currentRoom,
      dungeonName: gameState.currentDungeon?.name,
      dungeonTheme: gameState.currentDungeon?.theme,
      playerLevel: gameState.player.stats.level,
      playerClass: gameState.player.className || undefined,
      playerHealth: gameState.player.stats.health,
      maxHealth: gameState.player.stats.maxHealth,
      hasPotion: gameState.player.inventory.some((i) => i.type === "potion"),
      lowHealth: gameState.player.stats.health < gameState.player.stats.maxHealth * 0.5,
      entities: gameState.roomEnvironmentalEntities.filter((e) => !e.consumed).map((e) => ({
        name: e.name,
        entityClass: e.entityClass,
        interactionTags: e.interactionTags,
      })),
      roomNarrative: currentNarrative?.segments.map((s) => s.content).join(" "),
    });

    if (result?.choices) {
      setDynamicChoices(result.choices);
      setChoiceAtmosphere(result.atmosphere || null);
      setLastChoiceFetchRoom(roomKey);
    }
  }, [
    gameState.floor,
    gameState.currentRoom,
    gameState.currentDungeon,
    gameState.player,
    gameState.roomEnvironmentalEntities,
    currentNarrative,
    lastChoiceFetchRoom,
    generateNarrative,
  ]);

  // Fetch choices when entering exploration (not in combat, dungeon active)
  useEffect(() => {
    if (
      gameState.currentDungeon &&
      !gameState.inCombat &&
      !gameState.gameOver &&
      gameState.phase !== "trap_encounter" &&
      gameState.phase !== "shrine_choice" &&
      gameState.phase !== "npc_interaction" &&
      !gameState.pathOptions?.length &&
      !gameState.activeVault
    ) {
      fetchDynamicChoices();
    }
  }, [
    gameState.currentDungeon,
    gameState.inCombat,
    gameState.gameOver,
    gameState.phase,
    gameState.pathOptions,
    gameState.activeVault,
    gameState.currentRoom,
    fetchDynamicChoices,
  ]);

  // Clear dynamic choices when room changes or combat starts
  useEffect(() => {
    if (gameState.inCombat || gameState.phase === "trap_encounter") {
      setDynamicChoices([]);
      setChoiceAtmosphere(null);
    }
  }, [gameState.inCombat, gameState.phase]);

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

      // Handle capability-based interactions (spells, tool items, abilities)
      if (interaction.requiresCapability) {
        const capId = interaction.requiresCapability;

        // Check if it's a spell
        if (interaction.action === "cast_spell" && capId.startsWith("spell_")) {
          const spellId = capId.replace("spell_", "");
          const spell = gameState.player.spellBook?.spells.find(s => s.id === spellId);

          if (spell) {
            // Consume resources and set cooldown via UPDATE_PLAYER
            const newResources = { ...gameState.player.resources };
            newResources.current = Math.max(0, newResources.current - spell.resourceCost);

            const newCooldowns = { ...gameState.player.spellBook?.cooldowns };
            if (spell.cooldown > 0) {
              newCooldowns[spell.id] = spell.cooldown;
            }

            dispatch({
              type: "UPDATE_PLAYER",
              payload: {
                resources: newResources,
                spellBook: {
                  ...gameState.player.spellBook!,
                  cooldowns: newCooldowns,
                },
              },
            });

            addLog(
              <span className="text-violet-400">
                You cast <EntityText type="rare">{spell.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "effect",
            );
          }
        }

        // Check if it's a tool item
        if (interaction.action === "use_item" && capId.startsWith("item_")) {
          const itemId = capId.replace("item_", "");
          const item = gameState.player.inventory.find(i => i.id === itemId);

          if (item) {
            addLog(
              <span className="text-amber-400">
                You use your <EntityText type="uncommon">{item.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "narrative",
            );

            // Consume consumable tools (torches, etc.)
            const consumableTools = ["torch", "holy_water"];
            if (item.subtype && consumableTools.includes(item.subtype as string)) {
              dispatch({ type: "REMOVE_ITEM", payload: item.id });
              addLog(
                <span className="text-stone-500 text-sm">
                  {item.name} was consumed.
                </span>,
                "system",
              );
            }
          }
        }

        // Check if it's an ability
        if (interaction.action === "use_ability" && capId.startsWith("ability_")) {
          const abilityId = capId.replace("ability_", "");
          const ability = gameState.player.abilities.find(a => a.id === abilityId);

          if (ability) {
            // Use existing USE_ABILITY action for cooldown and resource
            dispatch({ type: "USE_ABILITY", payload: ability.id });

            addLog(
              <span className="text-cyan-400">
                You use <EntityText type="uncommon">{ability.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "effect",
            );
          }
        }
      }

      // Find if player has required item (for non-capability interactions)
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
        entityTags: entity.interactionTags, // For impact validation
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
              id: generateId(),
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
            id: generateId(),
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


  // Handle race selection - store race and proceed to class select
  const handleSelectRace = useCallback(
    (raceId: PlayerRace) => {
      const raceDef = RACE_DEFINITIONS[raceId];
      setSelectedRace(raceId);
      closeRaceSelect();
      openClassSelect();
      addLog(
        <span>
          You are a <EntityText type="uncommon">{raceDef.name}</EntityText>.{" "}
          {raceDef.description}
        </span>,
        "system",
      );
    },
    [addLog, closeRaceSelect, openClassSelect],
  );

  const handleSelectClass = useCallback(
    (classId: PlayerClass) => {
      const classDef = CLASSES[classId];
      // Apply race first if selected
      if (selectedRace) {
        const racedPlayer = initializePlayerRace(gameState.player, selectedRace);
        dispatch({ type: "UPDATE_PLAYER", payload: racedPlayer });
      }
      // Use hook for state updates
      gameFlow.selectClass(classId);
      closeClassSelect();
      setSelectedRace(null); // Clear race selection after use
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
    [addLog, closeClassSelect, gameFlow, selectedRace, gameState.player, dispatch],
  );

  // ... existing code (enterDungeonSelect, selectDungeon, calculateDamage) ...

  const enterDungeonSelect = useCallback(() => {
    const dungeons = generateDungeonSelection();
    dispatch({ type: "SET_PHASE", payload: "dungeon_select" });
    dispatch({ type: "SET_GAME_STARTED", payload: true });
    dispatch({ type: "SET_AVAILABLE_DUNGEONS", payload: dungeons });
  }, [dispatch]);

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
    // Compute level-up state changes, then dispatch full state update
    const computeLevelUp = (prev: GameState): GameState => {
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

          // Auto-level existing abilities based on player level (every 3 levels = +1 ability level)
          player = autoLevelAbilitiesOnLevelUp(player);
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
    };
    const newState = computeLevelUp(gameState);
    dispatch({ type: "LOAD_STATE", payload: newState });
  }, [log, gameState, dispatch]);

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
      enemy: Combatant | null,
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

  // Initialize encounter handlers (after triggerDeath is defined)
  const encounters = useEncounters({
    state: gameState,
    dispatch,
    logger: log,
    updateRunStats,
    isProcessing,
    setIsProcessing,
    addLog,
    triggerDeath,
    setNpcDialogue,
    setActiveLootContainer,
  });

  // Destructure encounter handlers from hook
  const {
    handleTrapAction,
    handleShrineAction,
    handleNPCChoice,
    handleLootContainerComplete,
    handleLootContainerCancel,
  } = encounters;

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

  // Boss encounter action handler
  const handleBossAction = useCallback(
    async (action: "attack" | "defend" | "flee" | "parley") => {
      if (isProcessing || !gameState.currentEnemy || gameState.currentEnemy.entityType !== "boss") return;

      switch (action) {
        case "attack":
          // Use existing attack flow
          await playerAttack();
          break;
        case "defend":
          // Set defensive stance and skip attack
          dispatch({ type: "SET_STANCE", payload: "defensive" });
          log.stanceChange("Defensive");
          addLog(
            <span className="text-blue-400">
              You brace yourself for the boss&apos;s attack...
            </span>,
            "combat",
          );
          // Enemy still attacks
          if (gameState.currentEnemy) {
            await enemyAttack(gameState.currentEnemy, gameState.player);
          }
          break;
        case "flee":
          // Use existing flee logic
          await attemptFlee();
          break;
        case "parley":
          // Attempt to negotiate with the boss
          const boss = gameState.currentEnemy as Boss;
          if (boss.dialogue?.lowHealth && boss.health <= boss.maxHealth * 0.5) {
            addLog(
              <span className="text-amber-400 italic">
                &quot;{boss.dialogue.lowHealth}&quot;
              </span>,
              "dialogue",
            );
          } else if (boss.dialogue?.intro) {
            addLog(
              <span className="text-amber-400 italic">
                The {boss.name} considers your words...
              </span>,
              "dialogue",
            );
          }
          break;
      }
    },
    [isProcessing, gameState.currentEnemy, gameState.player, playerAttack, enemyAttack, attemptFlee, dispatch, log, addLog],
  );

  // Vault encounter action handler
  const handleVaultAction = useCallback(
    (action: VaultAction) => {
      if (isProcessing || !gameState.activeVault) return;

      const vault = gameState.activeVault;

      switch (action.type) {
        case "unlock":
          // Remove key from inventory and unlock vault
          const keyItem = gameState.player.inventory.find(
            (item) => item.type === "key" && item.name.toLowerCase().includes(action.keyType.replace("key_", ""))
          );
          if (keyItem) {
            dispatch({ type: "REMOVE_ITEM", payload: keyItem.id });
            dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "active" } });
            addLog(
              <span className="text-amber-400">
                You use the key to unlock the {vault.definition.name}...
              </span>,
              "narrative"
            );
          }
          break;

        case "enter":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "active" } });
          addLog(
            <span className="text-purple-400">
              You enter the {vault.definition.name}...
            </span>,
            "narrative"
          );
          break;

        case "loot":
          const item = vault.availableLoot[action.itemIndex];
          if (item) {
            dispatch({ type: "ADD_ITEM", payload: item });
            const newAvailableLoot = [...vault.availableLoot];
            newAvailableLoot.splice(action.itemIndex, 1);
            const newCollectedLoot = [...vault.collectedLoot, item];
            dispatch({
              type: "SET_ACTIVE_VAULT",
              payload: { ...vault, availableLoot: newAvailableLoot, collectedLoot: newCollectedLoot }
            });
            addLog(
              <span>
                You take <EntityText type="item">{item.name}</EntityText> from the vault.
              </span>,
              "loot"
            );
          }
          break;

        case "loot_gold":
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: action.amount });
          dispatch({
            type: "SET_ACTIVE_VAULT",
            payload: { ...vault, collectedGold: vault.collectedGold + action.amount }
          });
          addLog(
            <span className="text-amber-400">
              You collect {action.amount} gold from the vault!
            </span>,
            "loot"
          );
          break;

        case "fight_guardian":
          if (vault.guardian) {
            // Start combat with guardian (RankedEnemy extends Enemy, cast is safe)
            dispatch({ type: "START_COMBAT", payload: vault.guardian as Enemy });
            addLog(
              <span className="text-red-400">
                The guardian attacks! Prepare for battle!
              </span>,
              "combat"
            );
          }
          break;

        case "advance_wave":
          if (vault.waves && vault.currentWave !== undefined) {
            const nextWave = vault.currentWave + 1;
            dispatch({
              type: "SET_ACTIVE_VAULT",
              payload: { ...vault, currentWave: nextWave }
            });
            addLog(
              <span className="text-red-400">
                Wave {nextWave + 1} begins!
              </span>,
              "combat"
            );
          }
          break;

        case "leave":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: null });
          addLog(
            <span className="text-zinc-400">
              You leave the vault behind.
            </span>,
            "narrative"
          );
          break;

        case "complete":
          dispatch({ type: "SET_ACTIVE_VAULT", payload: { ...vault, state: "completed" } });
          addLog(
            <span className="text-green-400">
              You have cleared the {vault.definition.name}!
            </span>,
            "narrative"
          );
          // Clear vault after a moment
          setTimeout(() => {
            dispatch({ type: "SET_ACTIVE_VAULT", payload: null });
          }, 1500);
          break;
      }
    },
    [isProcessing, gameState.activeVault, gameState.player.inventory, dispatch, addLog]
  );

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
            slot = gameState.player.equipment.ring1 ? "ring2" : "ring1";
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

  // === MAP SYSTEM HANDLERS ===

  const handleBuyMap = useCallback(
    (tier: MapTier, price: number) => {
      if (gameState.player.stats.gold < price) return;

      const map = generateMap({ tier, rarity: "common" });
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -price });
      dispatch({ type: "ADD_ITEM", payload: map });
      updateRunStats({ goldSpent: gameState.runStats.goldSpent + price });

      addLog(
        <span>
          You purchase a <EntityText type="item">{map.name}</EntityText> from Theron the Cartographer.
        </span>,
        "system",
      );
    },
    [gameState.player.stats.gold, gameState.runStats.goldSpent, dispatch, addLog, updateRunStats],
  );

  const handleBuyCurrency = useCallback(
    (currencyId: string, price: number) => {
      if (gameState.player.stats.gold < price) return;

      const currency = createCurrency(currencyId);
      if (!currency) return;

      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -price });
      dispatch({ type: "ADD_ITEM", payload: currency });
      updateRunStats({ goldSpent: gameState.runStats.goldSpent + price });

      addLog(
        <span>
          You purchase an <EntityText type="item">{currency.name}</EntityText> from Theron.
        </span>,
        "system",
      );
    },
    [gameState.player.stats.gold, gameState.runStats.goldSpent, dispatch, addLog, updateRunStats],
  );

  const handleActivateMap = useCallback(
    (map: MapItem) => {
      // Create dungeon from map
      const dungeon = createDungeonFromMap(map);

      // Remove map from inventory (consumed)
      dispatch({ type: "REMOVE_ITEM", payload: map.id });

      // Initialize dungeon run (dungeon.floors contains the total floor count)
      dispatch({
        type: "LOAD_STATE",
        payload: {
          ...gameState,
          phase: "exploring",
          currentDungeon: dungeon,
          floor: 1,
          player: {
            ...gameState.player,
            inventory: gameState.player.inventory.filter((i) => i.id !== map.id),
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
    [gameState, dispatch, addLog],
  );

  const handleApplyCurrency = useCallback(
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
            ...gameState,
            player: {
              ...gameState.player,
              inventory: gameState.player.inventory.map((i) =>
                i.id === currency.id ? updatedCurrency : i.id === map.id ? result.map! : i
              ),
            },
          },
        });
      } else {
        dispatch({
          type: "LOAD_STATE",
          payload: {
            ...gameState,
            player: {
              ...gameState.player,
              inventory: gameState.player.inventory
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
    [gameState, dispatch, addLog],
  );

  const handleLevelUpAbility = useCallback(
    (abilityId: string) => {
      const updatedPlayer = levelUpAbility(gameState.player, abilityId);
      if (!updatedPlayer) return;

      const ability = updatedPlayer.abilities.find((a) => a.id === abilityId);
      const newLevel = ability?.level || 1;

      dispatch({ type: "LOAD_STATE", payload: { ...gameState, player: updatedPlayer } });

      addLog(
        <span>
          Gregor guides your training.{" "}
          <EntityText type="ability">{ability?.name}</EntityText>{" "}
          improved to level <span className="text-amber-400">{newLevel}</span>!
        </span>,
        "system",
      );
    },
    [gameState, dispatch, addLog],
  );

  const handleTransmogrify = useCallback(
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

  const handleCraftFromEssence = useCallback(
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

  const handleAlchemyExperiment = useCallback(
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
      const explorationChoices: GameChoice[] = [];

      // Use AI-generated dynamic choices if available
      if (dynamicChoices.length > 0) {
        for (const choice of dynamicChoices) {
          // Map AI choice types to game actions
          let action: () => void;
          let tooltip: string | undefined;

          switch (choice.type) {
            case "explore":
              action = exploreRoom;
              break;
            case "interact":
              // Find entity to interact with
              if (choice.entityTarget) {
                const entity = gameState.roomEnvironmentalEntities.find(
                  (e) => e.name.toLowerCase().includes(choice.entityTarget!.toLowerCase()) ||
                         e.id === choice.entityTarget
                );
                if (entity && !entity.consumed) {
                  action = () => handleEnvironmentalInteraction(entity.id, entity.possibleInteractions?.[0]?.action || "examine");
                } else {
                  action = exploreRoom; // Fallback
                }
              } else {
                action = exploreRoom;
              }
              break;
            case "investigate":
              action = exploreRoom; // Investigation triggers room exploration
              break;
            case "rest":
              if (potion) {
                action = () => consumePotion(potion);
              } else {
                action = exploreRoom;
              }
              break;
            case "special":
            default:
              action = exploreRoom;
          }

          // Add risk hint as tooltip
          if (choice.hint) {
            tooltip = choice.hint;
          }

          explorationChoices.push({
            id: choice.id,
            text: choice.text,
            action,
            tooltip,
            disabled: isProcessing,
            riskLevel: choice.riskLevel,
          });
        }
      } else {
        // Fallback to static choice while AI is loading
        explorationChoices.push({
          id: "explore",
          text: isAiGenerating ? "..." : "Explore Deeper",
          action: exploreRoom,
          disabled: isProcessing || isAiGenerating,
        });
      }

      // Always add descend option when available (not AI-dependent)
      const maxFloors = gameState.currentDungeon.floors;
      if (gameState.currentRoom > 0 && gameState.currentRoom % 5 === 0) {
        const isLastFloor = gameState.floor >= maxFloors;
        // Only add if not already present from AI
        if (!explorationChoices.some((c) => c.id === "descend")) {
          explorationChoices.push({
            id: "descend",
            text: isLastFloor
              ? "Claim Victory & Exit"
              : `Descend to Floor ${gameState.floor + 1}`,
            action: descendFloor,
            disabled: isProcessing,
          });
        }
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
    isAiGenerating,
    dynamicChoices,
    playerAttack,
    attemptFlee,
    consumePotion,
    exploreRoom,
    descendFloor,
    restartGame,
    startGame,
    handleTameEnemy,
    handleEnvironmentalInteraction,
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

  // Extract player capabilities for utility bar (always-on spells like Teleport)
  const playerCapabilities = useMemo(() => {
    if (!gameState.player) return { always: [], situational: [], all: [], utilityTypes: [], summary: "" };
    return extractPlayerCapabilities(gameState.player, { inCombat: gameState.inCombat });
  }, [gameState.player, gameState.inCombat]);

  // Handler for always-on utility capabilities (Teleport, etc.)
  const handleUtilityCapability = useCallback((capability: import("@/lib/mechanics/player-capabilities").PlayerCapability) => {
    if (!capability.available) return;

    // Handle spells
    if (capability.source === "spell" && gameState.player.spellBook) {
      const spell = gameState.player.spellBook.spells.find(s => s.id === capability.sourceId);
      if (!spell) return;

      // Deduct resource cost if spell has one
      if (spell.resourceCost > 0 && gameState.player.resources) {
        const newResourceAmount = Math.max(0, gameState.player.resources.current - spell.resourceCost);
        dispatch({
          type: "UPDATE_PLAYER",
          payload: {
            resources: {
              ...gameState.player.resources,
              current: newResourceAmount,
            },
          },
        });
      }

      // Set cooldown if spell has one
      if (spell.cooldown) {
        const newCooldowns = {
          ...gameState.player.spellBook.cooldowns,
          [spell.id]: spell.cooldown,
        };
        dispatch({
          type: "UPDATE_PLAYER",
          payload: {
            spellBook: {
              ...gameState.player.spellBook,
              cooldowns: newCooldowns,
            },
          },
        });
      }

      addLog(
        <span className="text-violet-400">
          You cast <EntityText type="rare">{spell.name}</EntityText>
          {capability.utilityType === "teleport" && " and prepare to teleport..."}
        </span>,
        "effect",
      );

      // Handle specific utility types
      if (capability.utilityType === "teleport") {
        // For now, teleport triggers path selection refresh
        // Future: could open a destination selector
        addLog(
          <span className="text-stone-400 text-sm">
            The spell awaits your destination choice...
          </span>,
          "system",
        );
      }
    }

    // Handle items
    if (capability.source === "item") {
      const item = gameState.player.inventory.find(i => i.id === capability.sourceId);
      if (!item) return;

      addLog(
        <span className="text-amber-400">
          You use <EntityText type="uncommon">{item.name}</EntityText>
        </span>,
        "narrative",
      );

      // Consume if consumable
      if (item.category === "consumable") {
        dispatch({ type: "REMOVE_ITEM", payload: item.id });
      }
    }

    // Handle abilities
    if (capability.source === "ability") {
      const ability = gameState.player.abilities.find(a => a.id === capability.sourceId);
      if (!ability) return;

      dispatch({ type: "USE_ABILITY", payload: ability.id });

      addLog(
        <span className="text-cyan-400">
          You activate <EntityText type="uncommon">{ability.name}</EntityText>
        </span>,
        "effect",
      );
    }
  }, [gameState.player, gameState.inCombat, addLog, dispatch]);

  // === INVENTORY HANDLERS ===
  const handleEquipItem = useCallback(
    (item: Item) => {
      equipItem(item);
    },
    [equipItem],
  );

  const handleUseItem = useCallback(
    (item: Item) => {
      const result = executeItemUse(item, gameState);

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
    [gameState, dispatch, addLog],
  );

  const handleDropItem = useCallback(
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

  const handleReturnToTavern = useCallback(() => {
    dispatch({ type: "SET_GAME_OVER", payload: false });
    dispatch({ type: "SET_PHASE", payload: "tavern" });
    setCurrentNarrative(null);
    addLog(
      <span className="text-amber-400">You drag yourself back to the tavern...</span>,
      "narrative",
    );
  }, [dispatch, addLog]);

  // Sync entity modal actions with current handlers
  useEffect(() => {
    setEntityModalActions({
      onEquipItem: handleEquipItem,
      onUseItem: handleUseItem,
      onDropItem: handleDropItem,
      onActivateMap: handleActivateMap,
      canActivateMap: gameState.phase === "tavern",
      inCombat: gameState.inCombat,
    });
  }, [setEntityModalActions, handleEquipItem, handleUseItem, handleDropItem, handleActivateMap, gameState.phase, gameState.inCombat]);

  // === RENDER HELPERS ===
  const renderInteractiveEntities = useCallback(() => {
    const activeEntities = gameState.roomEnvironmentalEntities.filter(
      (e) => !e.consumed,
    );
    if (activeEntities.length === 0) return null;

    // Risk border classes for foresight
    const getRiskBorder = (riskLevel: "safe" | "risky" | "dangerous" | undefined) => {
      switch (riskLevel) {
        case "safe": return "border-l-2 border-l-green-500/60";
        case "risky": return "border-l-2 border-l-yellow-500/60";
        case "dangerous": return "border-l-2 border-l-red-500/60";
        default: return "";
      }
    };

    // Color for capability source
    const getCapabilityColor = (action: string) => {
      if (action === "cast_spell") return "text-violet-400";
      if (action === "use_item") return "text-amber-400";
      if (action === "use_ability") return "text-cyan-400";
      return "text-stone-300";
    };

    return (
      <div className="mt-2 space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Nearby:
        </span>
        <div className="space-y-2">
          {activeEntities.map((entity) => {
            // Get all interactions including capability-based ones (spells, items, abilities)
            const allInteractions = getAllInteractionsForEntity(entity, playerCapabilities);

            // Filter to available interactions
            const templateInteractions = getAvailableInteractions(entity, gameState.player);
            const availableTemplateIds = new Set(
              templateInteractions.filter(i => i.available).map(i => i.interaction.id)
            );

            // Combine: template interactions (filtered) + capability interactions (with availability)
            const availableInteractions = allInteractions.filter(interaction => {
              // Template interactions: check against filtered list
              if (!interaction.requiresCapability) {
                return availableTemplateIds.has(interaction.id);
              }
              // Capability interactions: check disabled flag
              return !interaction.disabled;
            });

            if (availableInteractions.length === 0) return null;

            // If only one interaction, show compact view
            if (availableInteractions.length === 1) {
              const interaction = availableInteractions[0];
              const foresight = calculateForesight(
                gameState.player,
                "environmental_interaction",
                interaction.action,
                entity.interactionTags || [],
              );
              const tooltip = interaction.hint || entity.description || entity.name;

              return (
                <button
                  key={entity.id}
                  onClick={() => handleEnvironmentalInteraction(entity.id, interaction.id)}
                  disabled={isProcessing}
                  className={`
                    text-xs px-2 py-1 rounded transition-colors
                    bg-secondary/30 hover:bg-secondary/50 text-foreground
                    ${foresight?.riskLevel ? getRiskBorder(foresight.riskLevel) : ""}
                  `}
                  title={tooltip}
                >
                  <EntityText type="item" noAnimation>{entity.name}</EntityText>
                  {interaction.requiresCapability && (
                    <span className={`ml-1 ${getCapabilityColor(interaction.action)}`}>
                      ({interaction.label})
                    </span>
                  )}
                </button>
              );
            }

            // Multiple interactions: show entity with expandable options
            return (
              <div key={entity.id} className="bg-stone-800/30 rounded p-2 space-y-1">
                <div className="text-xs text-stone-400">
                  <EntityText type="item" noAnimation>{entity.name}</EntityText>
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableInteractions.map((interaction) => {
                    const foresight = calculateForesight(
                      gameState.player,
                      "environmental_interaction",
                      interaction.action,
                      entity.interactionTags || [],
                    );
                    const isCapability = !!interaction.requiresCapability;

                    return (
                      <button
                        key={interaction.id}
                        onClick={() => handleEnvironmentalInteraction(entity.id, interaction.id)}
                        disabled={isProcessing}
                        className={`
                          text-xs px-2 py-0.5 rounded transition-colors
                          ${isCapability
                            ? "bg-stone-700/50 hover:bg-stone-600/50 border border-stone-600/50"
                            : "bg-secondary/30 hover:bg-secondary/50"
                          }
                          ${foresight?.riskLevel ? getRiskBorder(foresight.riskLevel) : ""}
                        `}
                        title={interaction.hint || interaction.label}
                      >
                        <span className={isCapability ? getCapabilityColor(interaction.action) : ""}>
                          {interaction.label}
                        </span>
                        {foresight && foresight.level !== "hidden" && (
                          <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                            foresight.level === "full" ? "bg-emerald-400" :
                            foresight.level === "partial" ? "bg-purple-400" :
                            foresight.level === "type" ? "bg-blue-400" :
                            "bg-yellow-400"
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [
    gameState.roomEnvironmentalEntities,
    gameState.player,
    playerCapabilities,
    handleEnvironmentalInteraction,
    isProcessing,
  ]);

  // Fixed return statement and JSX structure for title screen
  if (gameState.phase === "title" && !showRaceSelect && !showClassSelect) {
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
              onClick={openRaceSelect}
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
          <SidebarStats player={gameState.player} />
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
          onReturnToTitle={handleReturnToTitle}
        />

        {/* Death Screen */}
        {gameState.gameOver ? (
          <DeathScreen
            player={gameState.player}
            runStats={gameState.runStats}
            onRestart={handleReturnToTitle}
            onReturnToTavern={handleReturnToTavern}
          />
        ) : /* Race/Class select */
        showRaceSelect ? (
          <RaceSelect onSelectRace={handleSelectRace} />
        ) : showClassSelect ? (
          <ClassSelect onSelectClass={handleSelectClass} />
        ) : gameState.phase === "tavern" ? (
          <Tavern
            player={gameState.player}
            floor={gameState.floor}
            onEnterDungeons={enterDungeonSelect}
            onRestoreHealth={handleRestoreHealth}
            onBuyKey={handleBuyKey}
            onBuyMap={handleBuyMap}
            onBuyCurrency={handleBuyCurrency}
            onActivateMap={handleActivateMap}
            onApplyCurrency={handleApplyCurrency}
            onLevelUpAbility={handleLevelUpAbility}
            onTransmogrify={handleTransmogrify}
            onCraftFromEssence={handleCraftFromEssence}
            onAlchemyExperiment={handleAlchemyExperiment}
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
            {/* Location Header */}
            {gameState.currentDungeon && (
              <div className="mb-3 pb-2 border-b border-border/30">
                {/* Primary info row */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    <EntityText type="location">{gameState.currentDungeon.name}</EntityText>
                  </span>
                  {/* Map tier badge */}
                  {gameState.currentDungeon.mapMetadata && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      gameState.currentDungeon.mapMetadata.tier <= 3
                        ? "text-stone-400 border-stone-600/50 bg-stone-800/30"
                        : gameState.currentDungeon.mapMetadata.tier <= 6
                          ? "text-amber-400 border-amber-600/50 bg-amber-900/20"
                          : gameState.currentDungeon.mapMetadata.tier <= 10
                            ? "text-red-400 border-red-600/50 bg-red-900/20"
                            : "text-purple-400 border-purple-600/50 bg-purple-900/20"
                    )}>
                      T{gameState.currentDungeon.mapMetadata.tier}
                      {gameState.currentDungeon.mapMetadata.quality > 0 && (
                        <span className="text-entity-item ml-1">+{gameState.currentDungeon.mapMetadata.quality}%</span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Floor <EntityText type="location">{gameState.floor}</EntityText>
                    <span className="text-stone-600">/{gameState.currentDungeon.floors}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Room <span className="text-foreground">{gameState.currentRoom}</span>
                  </span>
                </div>
                {/* Active modifiers row */}
                {gameState.currentDungeon.modifiers && gameState.currentDungeon.modifiers.length > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    {gameState.currentDungeon.modifiers.map((mod) => (
                      <span
                        key={mod.id}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-700/40"
                        title={mod.description}
                      >
                        {mod.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Environmental Indicator - shows dungeon theme hazards */}
            {gameState.currentDungeon && !gameState.inCombat && (
              <EnvironmentalIndicator
                dungeon={gameState.currentDungeon}
                activeEffects={gameState.player.activeEffects}
                className="mb-3"
              />
            )}

            {/* Game Log + Choices */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
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

              {/* Choices flow directly after narrative */}
              {!gameState.inCombat && currentChoices.length > 0 && (
                <div className="mt-4 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
                  <ChoiceButtons
                    choices={currentChoices}
                    disabled={isProcessing}
                    atmosphere={choiceAtmosphere}
                  />
                </div>
              )}

              {isProcessing && !gameState.inCombat && (
                <div className="text-center text-stone-500 text-sm mt-2 animate-pulse">
                  The dungeon stirs...
                </div>
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
              gameState.currentEnemy.entityType === "boss" ? (
                <BossEncounter
                  boss={gameState.currentEnemy as Boss}
                  onAction={handleBossAction}
                  isProcessing={isProcessing}
                  currentPhaseNarration={undefined}
                />
              ) : (
                <CombatDisplay
                  enemy={gameState.currentEnemy}
                  player={gameState.player}
                  hazard={gameState.currentHazard}
                  onChangeStance={handleChangeStance}
                  combatRound={gameState.combatRound}
                  disabled={isProcessing}
                />
              )
            )}

            {/* Active Combo Display */}
            {gameState.inCombat && gameState.player.combo?.activeCombo && (
              <div className="mt-2">
                <ComboDisplay combo={gameState.player.combo} />
              </div>
            )}

            {gameState.inCombat &&
              gameState.currentEnemy &&
              gameState.player.abilities.length > 0 && (
                <div className="mt-4">
                  <AbilityBar
                    player={gameState.player}
                    onUseAbility={handleUseAbility}
                    onToggleSustained={handleToggleSustained}
                    disabled={isProcessing}
                  />
                </div>
              )}

            {/* Spell Bar - shown in combat if player has spells */}
            {gameState.inCombat && gameState.currentEnemy && hasSpells && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Spells
                </div>
                <SpellBar
                  player={gameState.player}
                  spellBook={gameState.player.spellBook}
                  onCastSpell={handleCastSpell}
                  inCombat={true}
                  disabled={isProcessing}
                  currentEnemy={gameState.currentEnemy}
                />
              </div>
            )}

            {/* Vault Encounter - shown when activeVault is set */}
            {gameState.activeVault && !gameState.inCombat && (
              <VaultEncounter
                vault={gameState.activeVault}
                onAction={handleVaultAction}
                isProcessing={isProcessing}
                hasKey={gameState.player.inventory.some(
                  (item) => item.type === "key" &&
                    item.name.toLowerCase().includes(
                      (gameState.activeVault?.definition.keyType || "").replace("key_", "")
                    )
                )}
                keyType={gameState.activeVault.definition.keyType}
              />
            )}

            {gameState.pathOptions && gameState.pathOptions.length > 0 && !gameState.activeVault && (
              <PathSelect
                paths={gameState.pathOptions}
                onSelectPath={handleSelectPath}
                disabled={isProcessing}
              />
            )}

            {/* Utility bar for always-on capabilities (Teleport, etc.) */}
            {!gameState.inCombat && playerCapabilities.always.length > 0 && (
              <UtilityBar
                capabilities={playerCapabilities.always}
                onUse={handleUtilityCapability}
                disabled={isProcessing}
              />
            )}

            {!gameState.inCombat && renderInteractiveEntities()}
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
              onUseItem={handleUseItem}
              onDropItem={handleDropItem}
              onActivateMap={handleActivateMap}
              inCombat={gameState.inCombat}
              canActivateMap={gameState.phase === "tavern"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
