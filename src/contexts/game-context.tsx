"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import type { GameState } from "@/lib/game-types";
import { gameReducer, type GameAction, gameActions } from "./game-reducer";
import { createInitialPlayer, createInitialRunStats } from "@/lib/game-data";

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialGameState(): GameState {
  return {
    player: createInitialPlayer(),
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
    roomEnvironmentalEntities: [],
  };
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  // Convenience action dispatchers
  actions: typeof boundActions;
}

// Pre-bound action creators for convenience
const boundActions = {
  // These will be populated by the provider with dispatch bound
} as ReturnType<typeof createBoundActions>;

function createBoundActions(dispatch: Dispatch<GameAction>) {
  return {
    // Player
    updatePlayer: (payload: Parameters<typeof gameActions.updatePlayer>[0]) =>
      dispatch(gameActions.updatePlayer(payload)),
    updatePlayerStats: (
      payload: Parameters<typeof gameActions.updatePlayerStats>[0],
    ) => dispatch(gameActions.updatePlayerStats(payload)),
    setPlayerHealth: (health: number) =>
      dispatch(gameActions.setPlayerHealth(health)),
    modifyPlayerHealth: (delta: number) =>
      dispatch(gameActions.modifyPlayerHealth(delta)),
    modifyPlayerGold: (delta: number) =>
      dispatch(gameActions.modifyPlayerGold(delta)),
    addExperience: (exp: number) => dispatch(gameActions.addExperience(exp)),

    // Inventory
    addItem: (item: Parameters<typeof gameActions.addItem>[0]) =>
      dispatch(gameActions.addItem(item)),
    removeItem: (id: string) => dispatch(gameActions.removeItem(id)),
    equipItem: (
      item: Parameters<typeof gameActions.equipItem>[0],
      slot: Parameters<typeof gameActions.equipItem>[1],
    ) => dispatch(gameActions.equipItem(item, slot)),
    unequipItem: (slot: "weapon" | "armor") =>
      dispatch(gameActions.unequipItem(slot)),

    // Effects
    addEffect: (effect: Parameters<typeof gameActions.addEffect>[0]) =>
      dispatch(gameActions.addEffect(effect)),
    removeEffect: (id: string) => dispatch(gameActions.removeEffect(id)),
    tickEffects: () => dispatch(gameActions.tickEffects()),

    // Combat
    startCombat: (enemy: Parameters<typeof gameActions.startCombat>[0]) =>
      dispatch(gameActions.startCombat(enemy)),
    endCombat: () => dispatch(gameActions.endCombat()),
    updateEnemy: (payload: Parameters<typeof gameActions.updateEnemy>[0]) =>
      dispatch(gameActions.updateEnemy(payload)),
    damageEnemy: (damage: number) => dispatch(gameActions.damageEnemy(damage)),
    setStance: (stance: Parameters<typeof gameActions.setStance>[0]) =>
      dispatch(gameActions.setStance(stance)),

    // Navigation
    setRoom: (room: number) => dispatch(gameActions.setRoom(room)),
    setFloor: (floor: number) => dispatch(gameActions.setFloor(floor)),
    setPathOptions: (paths: Parameters<typeof gameActions.setPathOptions>[0]) =>
      dispatch(gameActions.setPathOptions(paths)),
    setDungeon: (dungeon: Parameters<typeof gameActions.setDungeon>[0]) =>
      dispatch(gameActions.setDungeon(dungeon)),

    // Encounters
    setActiveNPC: (npc: Parameters<typeof gameActions.setActiveNPC>[0]) =>
      dispatch(gameActions.setActiveNPC(npc)),
    setActiveShrine: (
      shrine: Parameters<typeof gameActions.setActiveShrine>[0],
    ) => dispatch(gameActions.setActiveShrine(shrine)),
    setActiveTrap: (trap: Parameters<typeof gameActions.setActiveTrap>[0]) =>
      dispatch(gameActions.setActiveTrap(trap)),

    // Phase
    setPhase: (phase: Parameters<typeof gameActions.setPhase>[0]) =>
      dispatch(gameActions.setPhase(phase)),
    setGameOver: (isOver: boolean) => dispatch(gameActions.setGameOver(isOver)),

    // Meta
    updateRunStats: (stats: Parameters<typeof gameActions.updateRunStats>[0]) =>
      dispatch(gameActions.updateRunStats(stats)),
    loadState: (state: GameState) => dispatch(gameActions.loadState(state)),
    resetGame: () => dispatch(gameActions.resetGame(createInitialGameState())),
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

const GameContext = createContext<GameContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface GameProviderProps {
  children: ReactNode;
  initialState?: GameState;
}

export function GameProvider({ children, initialState }: GameProviderProps) {
  const [state, dispatch] = useReducer(
    gameReducer,
    initialState ?? createInitialGameState(),
  );

  // Create bound actions that are stable across renders
  const actions = useCallback(() => createBoundActions(dispatch), [])();

  return (
    <GameContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </GameContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

// Convenience hook for just the state (common pattern)
export function useGameState() {
  const { state } = useGame();
  return state;
}

// Convenience hook for just dispatch (rare but useful)
export function useGameDispatch() {
  const { dispatch } = useGame();
  return dispatch;
}

// Convenience hook for bound actions
export function useGameActions() {
  const { actions } = useGame();
  return actions;
}

// ============================================================================
// SELECTORS (for derived state)
// ============================================================================

export const gameSelectors = {
  // Player selectors
  playerHealth: (state: GameState) => state.player.stats.health,
  playerMaxHealth: (state: GameState) => state.player.stats.maxHealth,
  playerHealthPercent: (state: GameState) =>
    (state.player.stats.health / state.player.stats.maxHealth) * 100,
  playerGold: (state: GameState) => state.player.stats.gold,
  playerLevel: (state: GameState) => state.player.stats.level,
  playerInventory: (state: GameState) => state.player.inventory,
  playerEquipment: (state: GameState) => state.player.equipment,
  playerActiveEffects: (state: GameState) => state.player.activeEffects,
  playerAbilities: (state: GameState) => state.player.abilities,
  playerStance: (state: GameState) => state.player.stance,

  // Combat selectors
  isInCombat: (state: GameState) => state.inCombat,
  currentEnemy: (state: GameState) => state.currentEnemy,
  enemyHealth: (state: GameState) => state.currentEnemy?.health ?? 0,
  enemyHealthPercent: (state: GameState) =>
    state.currentEnemy
      ? (state.currentEnemy.health / state.currentEnemy.maxHealth) * 100
      : 0,
  combatRound: (state: GameState) => state.combatRound,

  // Navigation selectors
  currentRoom: (state: GameState) => state.currentRoom,
  currentFloor: (state: GameState) => state.floor,
  currentDungeon: (state: GameState) => state.currentDungeon,
  pathOptions: (state: GameState) => state.pathOptions,
  hasPathOptions: (state: GameState) =>
    state.pathOptions !== null && state.pathOptions.length > 0,

  // Encounter selectors
  activeNPC: (state: GameState) => state.activeNPC,
  activeShrine: (state: GameState) => state.activeShrine,
  activeTrap: (state: GameState) => state.activeTrap,
  currentHazard: (state: GameState) => state.currentHazard,
  hasActiveEncounter: (state: GameState) =>
    state.activeNPC !== null ||
    state.activeShrine !== null ||
    state.activeTrap !== null,

  // Phase selectors
  phase: (state: GameState) => state.phase,
  isGameOver: (state: GameState) => state.gameOver,
  isGameStarted: (state: GameState) => state.gameStarted,
  isTitleScreen: (state: GameState) => state.phase === "title",
  isTavern: (state: GameState) => state.phase === "tavern",
  isDungeonSelect: (state: GameState) => state.phase === "dungeon_select",
  isExploring: (state: GameState) =>
    state.phase === "dungeon" || state.phase === "exploring",

  // Party selectors
  activeCompanions: (state: GameState) => state.player.party.active,
  reserveCompanions: (state: GameState) => state.player.party.reserve,
  hasCompanions: (state: GameState) => state.player.party.active.length > 0,
  canAddCompanion: (state: GameState) =>
    state.player.party.active.length < state.player.party.maxActive,

  // Resource selectors
  playerResources: (state: GameState) => state.player.resources,
  resourcePercent: (state: GameState) =>
    state.player.resources.max > 0
      ? (state.player.resources.current / state.player.resources.max) * 100
      : 0,

  // Stats
  runStats: (state: GameState) => state.runStats,
  turnCount: (state: GameState) => state.turnCount,
};
