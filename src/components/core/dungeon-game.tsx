"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";

import type {
  GameState,
  PlayerClass,
  PlayerRace,
  RunSummary,
} from "@/lib/core/game-types";
import type { ChaosEvent } from "@/lib/world/chaos-system";
import { initializePlayerRace } from "@/lib/character/race-system";
import { SidebarInventory } from "@/components/inventory/sidebar-inventory";
import { DungeonSelect } from "@/components/world/dungeon-select";
import { ClassSelect } from "@/components/character/class-select";
import { RaceSelect } from "@/components/character/race-select";
import { DeathScreen } from "@/components/character/death-screen";
import { extractPlayerCapabilities } from "@/lib/mechanics/player-capabilities";
import { Tavern } from "@/components/encounters/tavern";
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
import { useEnvironmental } from "@/hooks/use-environmental";
import { useInventory } from "@/hooks/use-inventory";
import { useVault } from "@/hooks/use-vault";
import { useAbilities } from "@/hooks/use-abilities";
import { useCompanions } from "@/hooks/use-companions";
import { useChoices } from "@/hooks/use-choices";
import { useDungeonMaster } from "@/lib/hooks/use-dungeon-master";
import { GameMenu } from "./game-menu";
import { TitleScreen } from "./title-screen";
import { DungeonContent } from "./dungeon-content";
import { createWorldStateManager, type WorldState } from "@/lib/world/world-state";
import { DevPanel } from "@/components/dev/dev-panel";
import { SidebarStats } from "@/components/character/sidebar-stats";
import { generateId } from "@/lib/core/utils";

export function DungeonGame() {
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

  const [worldState, setWorldState] = useState<WorldState>(() =>
    createWorldStateManager().getState(),
  );
  const [chaosEvents, setChaosEvents] = useState<ChaosEvent[]>([]);
  const [hasExistingSaves, setHasExistingSaves] = useState(false);
  const [selectedRace, setSelectedRace] = useState<PlayerRace | null>(null);

  const { autoSave, hasSaves, load, deserializeWorldState, deserializeGameState } = useSaveSystem();
  const { generate: generateNarrative, isGenerating: isAiGenerating } =
    useDungeonMaster();

  const gameFlow = useGameFlow({
    state: gameState,
    dispatch,
    logger: log,
    addLog,
    clearLogs,
  });

  useEffect(() => {
    setHasExistingSaves(hasSaves());
  }, [hasSaves]);
  const updateRunStats = useCallback(
    (updates: Partial<RunSummary>) => {
      dispatch({ type: "UPDATE_RUN_STATS", payload: updates });
    },
    [dispatch],
  );
  const tavern = useTavern({
    state: gameState,
    dispatch,
    logger: log,
    addLog,
    updateRunStats,
  });
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
  const {
    enemyAttack,
    handleUseAbility,
    playerAttack,
    processTurnEffects,
    triggerDeath,
    changeStance,
    attemptFlee,
    handleBossAction,
  } = combat;
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
    generateNarrative,
    updateRunStats,
    processTurnEffects,
    triggerDeath,
  });
  const { handleSelectPath, selectDungeon, descendFloor, exploreRoom } = navigation;
  const companions = useCompanions({
    state: gameState,
    dispatch,
    addLog,
    isProcessing,
    setIsProcessing,
    enemyAttack,
  });
  const { handleTameEnemy } = companions;
  const spellCasting = useSpellCasting({
    state: gameState,
    dispatch,
    logger: log,
    updateRunStats,
    addLog,
  });
  const { handleCastSpell, hasSpells } = spellCasting;
  const environmental = useEnvironmental({
    state: gameState,
    dispatch,
    addLog,
    isProcessing,
    setIsProcessing,
    isAiGenerating,
    generateNarrative,
    currentNarrative,
    generateId,
  });
  const { handleEnvironmentalInteraction, dynamicChoices, choiceAtmosphere } = environmental;

  const inventory = useInventory({
    state: gameState,
    dispatch,
    addLog,
  });
  const { consumePotion, equipItem, dropItem, useItem } = inventory;

  const vault = useVault({
    state: gameState,
    dispatch,
    addLog,
    isProcessing,
  });
  const { handleVaultAction } = vault;

  const abilities = useAbilities({
    state: gameState,
    dispatch,
    addLog,
  });
  const { handleToggleSustained, handleUtilityCapability } = abilities;

  const { currentChoices } = useChoices({
    gameState,
    isProcessing,
    isAiGenerating,
    dynamicChoices,
    playerAttack,
    attemptFlee,
    consumePotion,
    exploreRoom,
    descendFloor,
    handleTameEnemy,
    handleEnvironmentalInteraction,
  });

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
      if (e.key === "`") {
        e.preventDefault();
        toggleDevPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.gameStarted, gameState.gameOver, toggleMenu, toggleDevPanel]);

  const handleLoadSave = useCallback(
    (data: SaveData) => {
      const gameState = deserializeGameState(data.gameState);
      gameFlow.loadSavedGame(gameState);
      setWorldState(deserializeWorldState(data.worldState));
      setChaosEvents(data.chaosEvents || []);
      closeClassSelect();
      setShowMenuFalse();
    },
    [deserializeGameState, deserializeWorldState, gameFlow, closeClassSelect, setShowMenuFalse],
  );

  const handleReturnToTitle = useCallback(() => {
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

  const handleSelectRace = useCallback(
    (raceId: PlayerRace) => {
      setSelectedRace(raceId);
      gameFlow.selectRace(raceId);
      closeRaceSelect();
      openClassSelect();
    },
    [gameFlow, closeRaceSelect, openClassSelect],
  );

  const handleSelectClass = useCallback(
    (classId: PlayerClass) => {
      if (selectedRace) {
        const racedPlayer = initializePlayerRace(gameState.player, selectedRace);
        dispatch({ type: "UPDATE_PLAYER", payload: racedPlayer });
      }
      gameFlow.selectClass(classId);
      closeClassSelect();
      setSelectedRace(null);
    },
    [gameFlow, closeClassSelect, selectedRace, gameState.player, dispatch],
  );

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

  const {
    handleTrapAction,
    handleShrineAction,
    handleNPCChoice,
    handleLootContainerComplete,
    handleLootContainerCancel,
    npcOptions,
  } = encounters;

  const playerCapabilities = useMemo(() => {
    if (!gameState.player) return { always: [], situational: [], all: [], utilityTypes: [], summary: "" };
    return extractPlayerCapabilities(gameState.player, { inCombat: gameState.inCombat });
  }, [gameState.player, gameState.inCombat]);

  const handleReturnToTavern = useCallback(() => {
    gameFlow.returnToTavern();
    setCurrentNarrative(null);
  }, [gameFlow, setCurrentNarrative]);

  useEffect(() => {
    setEntityModalActions({
      onEquipItem: equipItem,
      onUseItem: useItem,
      onDropItem: dropItem,
      onActivateMap: tavern.activateMap,
      canActivateMap: gameState.phase === "tavern",
      inCombat: gameState.inCombat,
    });
  }, [setEntityModalActions, equipItem, useItem, dropItem, tavern.activateMap, gameState.phase, gameState.inCombat]);

  if (gameState.phase === "title" && !showRaceSelect && !showClassSelect) {
    return (
      <TitleScreen
        hasExistingSaves={hasExistingSaves}
        onContinue={() => {
          const data = load(0);
          if (data) {
            handleLoadSave(data);
          } else {
            setShowMenuTrue();
          }
        }}
        onNewGame={openRaceSelect}
        onLoadGame={setShowMenuTrue}
        showMenu={showMenu}
        onMenuClose={setShowMenuFalse}
        gameState={gameState}
        worldState={worldState}
        logs={logs}
        chaosEvents={chaosEvents}
        onLoad={handleLoadSave}
        onReturnToTitle={handleReturnToTitle}
      />
    );
  }

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
            onEnterDungeons={gameFlow.enterDungeonSelect}
            onRestoreHealth={tavern.restoreHealth}
            onBuyKey={tavern.buyKey}
            onBuyMap={tavern.buyMap}
            onBuyCurrency={tavern.buyCurrency}
            onActivateMap={tavern.activateMap}
            onApplyCurrency={tavern.applyCurrency}
            onLevelUpAbility={tavern.levelUpPlayerAbility}
            onTransmogrify={tavern.transmogrify}
            onCraftFromEssence={tavern.craftFromEssence}
            onAlchemyExperiment={tavern.alchemyExperiment}
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
          <DungeonContent
            gameState={gameState}
            logs={logs}
            isProcessing={isProcessing}
            isAiGenerating={isAiGenerating}
            currentNarrative={currentNarrative}
            currentChoices={currentChoices}
            choiceAtmosphere={choiceAtmosphere}
            activeLootContainer={activeLootContainer}
            npcDialogue={npcDialogue}
            npcOptions={npcOptions}
            playerCapabilities={playerCapabilities}
            hasSpells={hasSpells}
            onChangeStance={changeStance}
            onUseAbility={handleUseAbility}
            onToggleSustained={handleToggleSustained}
            onCastSpell={handleCastSpell}
            onBossAction={handleBossAction}
            onTrapAction={handleTrapAction}
            onShrineAction={handleShrineAction}
            onNPCChoice={handleNPCChoice}
            onLootContainerComplete={handleLootContainerComplete}
            onLootContainerCancel={handleLootContainerCancel}
            onVaultAction={handleVaultAction}
            onSelectPath={handleSelectPath}
            onEnvironmentalInteraction={handleEnvironmentalInteraction}
            onUtilityCapability={handleUtilityCapability}
          />
        )}
      </div>

      {/* Right Sidebar - Inventory & Keys */}
      {gameState.phase !== "title" && !showClassSelect && gameState.player && (
        <div className="hidden lg:block w-64 bg-stone-900/50 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 space-y-6">
            <SidebarInventory
              player={gameState.player}
              onEquipItem={equipItem}
              onUseItem={useItem}
              onDropItem={dropItem}
              onActivateMap={tavern.activateMap}
              inCombat={gameState.inCombat}
              canActivateMap={gameState.phase === "tavern"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
