/**
 * Game Reducer Tests
 * Tests for state management actions and transformations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, gameActions, type GameAction } from "./game-reducer";
import { createInitialGameState } from "./game-context";
import type { GameState, StatusEffect, Item, Ability, Companion } from "@/lib/core/game-types";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestState(): GameState {
  return createInitialGameState();
}

function createTestItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Item",
    description: "A test item",
    category: "weapon",
    rarity: "common",
    value: 10,
    stats: { attack: 5 },
    effects: [],
    requirements: {},
    ...overrides,
  } as Item;
}

function createTestEffect(overrides: Partial<StatusEffect> = {}): StatusEffect {
  return {
    id: `effect-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Effect",
    description: "A test effect",
    effectType: "buff",
    duration: 3,
    stacks: 1,
    modifiers: { attack: 2 },
    sourceType: "item",
    ...overrides,
  } as StatusEffect;
}

function createTestAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: `ability-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Ability",
    description: "A test ability",
    cooldown: 3,
    currentCooldown: 0,
    damage: 10,
    damageType: "physical",
    resourceCost: 20,
    tags: ["physical"],
    ...overrides,
  } as Ability;
}

function createTestCompanion(overrides: Partial<Companion> = {}): Companion {
  return {
    id: `companion-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Companion",
    class: "warrior",
    health: 50,
    maxHealth: 50,
    attack: 8,
    defense: 4,
    level: 1,
    loyalty: 50,
    abilities: [],
    activeEffects: [],
    inParty: true,
    ...overrides,
  } as Companion;
}

// =============================================================================
// PLAYER ACTIONS TESTS
// =============================================================================

describe("Player Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("UPDATE_PLAYER", () => {
    it("should update player name", () => {
      const newState = gameReducer(state, gameActions.updatePlayer({ name: "Hero" }));
      expect(newState.player.name).toBe("Hero");
    });

    it("should preserve other player properties", () => {
      const originalClass = state.player.class;
      const newState = gameReducer(state, gameActions.updatePlayer({ name: "Hero" }));
      expect(newState.player.class).toBe(originalClass);
    });
  });

  describe("UPDATE_PLAYER_STATS", () => {
    it("should update specific stats", () => {
      const newState = gameReducer(state, gameActions.updatePlayerStats({ attack: 20 }));
      expect(newState.player.stats.attack).toBe(20);
    });

    it("should preserve other stats", () => {
      const originalDefense = state.player.stats.defense;
      const newState = gameReducer(state, gameActions.updatePlayerStats({ attack: 20 }));
      expect(newState.player.stats.defense).toBe(originalDefense);
    });
  });

  describe("SET_PLAYER_HEALTH", () => {
    it("should set health to exact value", () => {
      const newState = gameReducer(state, gameActions.setPlayerHealth(50));
      expect(newState.player.stats.health).toBe(50);
    });

    it("should clamp health to max", () => {
      const maxHealth = state.player.stats.maxHealth;
      const newState = gameReducer(state, gameActions.setPlayerHealth(maxHealth + 100));
      expect(newState.player.stats.health).toBe(maxHealth);
    });

    it("should clamp health to minimum 0", () => {
      const newState = gameReducer(state, gameActions.setPlayerHealth(-50));
      expect(newState.player.stats.health).toBe(0);
    });
  });

  describe("MODIFY_PLAYER_HEALTH", () => {
    it("should add health", () => {
      // First increase maxHealth so we have room to add, then set current health
      state = gameReducer(state, gameActions.updatePlayerStats({ maxHealth: 100 }));
      state = gameReducer(state, gameActions.setPlayerHealth(50));
      const newState = gameReducer(state, gameActions.modifyPlayerHealth(20));
      expect(newState.player.stats.health).toBe(70);
    });

    it("should subtract health", () => {
      state = gameReducer(state, gameActions.setPlayerHealth(50));
      const newState = gameReducer(state, gameActions.modifyPlayerHealth(-20));
      expect(newState.player.stats.health).toBe(30);
    });

    it("should not go below 0", () => {
      state = gameReducer(state, gameActions.setPlayerHealth(10));
      const newState = gameReducer(state, gameActions.modifyPlayerHealth(-100));
      expect(newState.player.stats.health).toBe(0);
    });

    it("should not exceed max health", () => {
      // First set maxHealth via stats update, then set current health
      state = gameReducer(state, gameActions.updatePlayerStats({ maxHealth: 100 }));
      state = gameReducer(state, gameActions.setPlayerHealth(90));
      const newState = gameReducer(state, gameActions.modifyPlayerHealth(50));
      expect(newState.player.stats.health).toBe(100);
    });
  });

  describe("MODIFY_PLAYER_GOLD", () => {
    it("should add gold", () => {
      state = gameReducer(state, gameActions.updatePlayerStats({ gold: 100 }));
      const newState = gameReducer(state, gameActions.modifyPlayerGold(50));
      expect(newState.player.stats.gold).toBe(150);
    });

    it("should subtract gold", () => {
      state = gameReducer(state, gameActions.updatePlayerStats({ gold: 100 }));
      const newState = gameReducer(state, gameActions.modifyPlayerGold(-30));
      expect(newState.player.stats.gold).toBe(70);
    });

    it("should not go below 0", () => {
      state = gameReducer(state, gameActions.updatePlayerStats({ gold: 20 }));
      const newState = gameReducer(state, gameActions.modifyPlayerGold(-100));
      expect(newState.player.stats.gold).toBe(0);
    });
  });

  describe("ADD_EXPERIENCE", () => {
    it("should add experience", () => {
      state = gameReducer(state, gameActions.updatePlayerStats({ experience: 50 }));
      const newState = gameReducer(state, gameActions.addExperience(25));
      expect(newState.player.stats.experience).toBe(75);
    });
  });
});

// =============================================================================
// INVENTORY ACTIONS TESTS
// =============================================================================

describe("Inventory Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
    state.player.inventory = [];
  });

  describe("ADD_ITEM", () => {
    it("should add item to inventory", () => {
      const item = createTestItem();
      const newState = gameReducer(state, gameActions.addItem(item));
      expect(newState.player.inventory).toHaveLength(1);
      expect(newState.player.inventory[0].id).toBe(item.id);
    });
  });

  describe("REMOVE_ITEM", () => {
    it("should remove item from inventory", () => {
      const item = createTestItem();
      state.player.inventory = [item];
      const newState = gameReducer(state, gameActions.removeItem(item.id));
      expect(newState.player.inventory).toHaveLength(0);
    });

    it("should not affect other items", () => {
      const item1 = createTestItem({ name: "Item 1" });
      const item2 = createTestItem({ name: "Item 2" });
      state.player.inventory = [item1, item2];
      const newState = gameReducer(state, gameActions.removeItem(item1.id));
      expect(newState.player.inventory).toHaveLength(1);
      expect(newState.player.inventory[0].name).toBe("Item 2");
    });
  });

  describe("EQUIP_ITEM", () => {
    it("should equip weapon to weapon slot", () => {
      const weapon = createTestItem({ category: "weapon" });
      state.player.inventory = [weapon];
      const newState = gameReducer(state, gameActions.equipItem(weapon, "weapon"));
      expect(newState.player.equipment.weapon).toBeTruthy();
      expect(newState.player.equipment.weapon?.id).toBe(weapon.id);
    });

    it("should remove item from inventory when equipping", () => {
      const weapon = createTestItem({ category: "weapon" });
      state.player.inventory = [weapon];
      const newState = gameReducer(state, gameActions.equipItem(weapon, "weapon"));
      expect(newState.player.inventory.find((i) => i.id === weapon.id)).toBeUndefined();
    });

    it("should return previously equipped item to inventory", () => {
      const oldWeapon = createTestItem({ name: "Old Sword" });
      const newWeapon = createTestItem({ name: "New Sword" });
      state.player.equipment.weapon = oldWeapon;
      state.player.inventory = [newWeapon];

      const newState = gameReducer(state, gameActions.equipItem(newWeapon, "weapon"));
      expect(newState.player.inventory.find((i) => i.name === "Old Sword")).toBeTruthy();
    });
  });

  describe("UNEQUIP_ITEM", () => {
    it("should unequip item and add to inventory", () => {
      const weapon = createTestItem();
      state.player.equipment.weapon = weapon;
      const newState = gameReducer(state, gameActions.unequipItem("weapon"));
      expect(newState.player.equipment.weapon).toBeNull();
      expect(newState.player.inventory.find((i) => i.id === weapon.id)).toBeTruthy();
    });

    it("should do nothing if slot is empty", () => {
      state.player.equipment.weapon = null;
      const newState = gameReducer(state, gameActions.unequipItem("weapon"));
      expect(newState).toBe(state);
    });
  });
});

// =============================================================================
// EFFECT ACTIONS TESTS
// =============================================================================

describe("Effect Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
    state.player.activeEffects = [];
  });

  describe("ADD_EFFECT", () => {
    it("should add effect to active effects", () => {
      const effect = createTestEffect();
      const newState = gameReducer(state, gameActions.addEffect(effect));
      expect(newState.player.activeEffects).toHaveLength(1);
      expect(newState.player.activeEffects[0].id).toBe(effect.id);
    });
  });

  describe("REMOVE_EFFECT", () => {
    it("should remove effect by id", () => {
      const effect = createTestEffect();
      state.player.activeEffects = [effect];
      const newState = gameReducer(state, gameActions.removeEffect(effect.id));
      expect(newState.player.activeEffects).toHaveLength(0);
    });
  });

  describe("TICK_EFFECTS", () => {
    it("should decrement effect durations", () => {
      const effect = createTestEffect({ duration: 3 });
      state.player.activeEffects = [effect];
      const newState = gameReducer(state, gameActions.tickEffects());
      expect(newState.player.activeEffects[0].duration).toBe(2);
    });

    it("should remove expired effects (duration reaches 0)", () => {
      const effect = createTestEffect({ duration: 1 });
      state.player.activeEffects = [effect];
      const newState = gameReducer(state, gameActions.tickEffects());
      expect(newState.player.activeEffects).toHaveLength(0);
    });

    it("should not decrement permanent effects (duration -1)", () => {
      const effect = createTestEffect({ duration: -1 });
      state.player.activeEffects = [effect];
      const newState = gameReducer(state, gameActions.tickEffects());
      expect(newState.player.activeEffects[0].duration).toBe(-1);
    });

    it("should preserve permanent effects through multiple ticks", () => {
      const permanent = createTestEffect({ name: "Permanent", duration: -1 });
      const temporary = createTestEffect({ name: "Temporary", duration: 2 });
      state.player.activeEffects = [permanent, temporary];

      let newState = gameReducer(state, gameActions.tickEffects());
      newState = gameReducer(newState, gameActions.tickEffects());
      newState = gameReducer(newState, gameActions.tickEffects());

      expect(newState.player.activeEffects).toHaveLength(1);
      expect(newState.player.activeEffects[0].name).toBe("Permanent");
    });
  });
});

// =============================================================================
// COMBAT ACTIONS TESTS
// =============================================================================

describe("Combat Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("START_COMBAT", () => {
    it("should set combat state", () => {
      const enemy = { id: "enemy-1", name: "Goblin", health: 30, maxHealth: 30, attack: 5, defense: 2 };
      const newState = gameReducer(state, gameActions.startCombat(enemy as never));
      expect(newState.inCombat).toBe(true);
      expect(newState.currentEnemy).toBeTruthy();
      expect(newState.currentEnemy?.name).toBe("Goblin");
      expect(newState.combatRound).toBe(1);
      expect(newState.phase).toBe("combat");
    });
  });

  describe("END_COMBAT", () => {
    it("should clear combat state", () => {
      state.inCombat = true;
      state.currentEnemy = { id: "enemy-1", name: "Goblin", health: 30, maxHealth: 30, attack: 5, defense: 2 } as never;
      state.combatRound = 5;

      const newState = gameReducer(state, gameActions.endCombat());
      expect(newState.inCombat).toBe(false);
      expect(newState.currentEnemy).toBeNull();
      expect(newState.combatRound).toBe(0);
      expect(newState.phase).toBe("exploring");
    });
  });

  describe("DAMAGE_ENEMY", () => {
    it("should reduce enemy health", () => {
      state.currentEnemy = { id: "enemy-1", name: "Goblin", health: 30, maxHealth: 30, attack: 5, defense: 2 } as never;
      const newState = gameReducer(state, gameActions.damageEnemy(10));
      expect(newState.currentEnemy?.health).toBe(20);
    });

    it("should not reduce health below 0", () => {
      state.currentEnemy = { id: "enemy-1", name: "Goblin", health: 30, maxHealth: 30, attack: 5, defense: 2 } as never;
      const newState = gameReducer(state, gameActions.damageEnemy(100));
      expect(newState.currentEnemy?.health).toBe(0);
    });

    it("should return same state if no enemy", () => {
      state.currentEnemy = null;
      const newState = gameReducer(state, gameActions.damageEnemy(10));
      expect(newState).toBe(state);
    });
  });

  describe("SET_STANCE", () => {
    it("should change combat stance", () => {
      const newState = gameReducer(state, gameActions.setStance("aggressive"));
      expect(newState.player.stance).toBe("aggressive");
    });
  });
});

// =============================================================================
// NAVIGATION ACTIONS TESTS
// =============================================================================

describe("Navigation Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("SET_ROOM", () => {
    it("should set current room", () => {
      const newState = gameReducer(state, gameActions.setRoom(5));
      expect(newState.currentRoom).toBe(5);
    });
  });

  describe("SET_FLOOR", () => {
    it("should set current floor", () => {
      const newState = gameReducer(state, gameActions.setFloor(3));
      expect(newState.floor).toBe(3);
    });
  });

  describe("SET_PATH_OPTIONS", () => {
    it("should set available paths", () => {
      const paths = [
        { id: "path-1", direction: "left", roomType: "combat" },
        { id: "path-2", direction: "right", roomType: "treasure" },
      ] as never;
      const newState = gameReducer(state, gameActions.setPathOptions(paths));
      expect(newState.pathOptions).toHaveLength(2);
    });

    it("should clear paths when set to null", () => {
      state.pathOptions = [{ id: "path-1" }] as never;
      const newState = gameReducer(state, gameActions.setPathOptions(null));
      expect(newState.pathOptions).toBeNull();
    });
  });
});

// =============================================================================
// ENCOUNTER ACTIONS TESTS
// =============================================================================

describe("Encounter Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("SET_ACTIVE_NPC", () => {
    it("should set active NPC and change phase", () => {
      const npc = { id: "npc-1", name: "Merchant" } as never;
      const newState = gameReducer(state, gameActions.setActiveNPC(npc));
      expect(newState.activeNPC).toBeTruthy();
      expect(newState.phase).toBe("npc_interaction");
    });

    it("should clear NPC but preserve phase when set to null", () => {
      state.activeNPC = { id: "npc-1", name: "Merchant" } as never;
      state.phase = "exploring";
      const newState = gameReducer(state, gameActions.setActiveNPC(null));
      expect(newState.activeNPC).toBeNull();
      expect(newState.phase).toBe("exploring");
    });
  });

  describe("SET_ACTIVE_SHRINE", () => {
    it("should set active shrine and change phase", () => {
      const shrine = { id: "shrine-1", name: "Healing Shrine" } as never;
      const newState = gameReducer(state, gameActions.setActiveShrine(shrine));
      expect(newState.activeShrine).toBeTruthy();
      expect(newState.phase).toBe("shrine_choice");
    });
  });

  describe("SET_ACTIVE_TRAP", () => {
    it("should set active trap and change phase", () => {
      const trap = { id: "trap-1", name: "Spike Trap" } as never;
      const newState = gameReducer(state, gameActions.setActiveTrap(trap));
      expect(newState.activeTrap).toBeTruthy();
      expect(newState.phase).toBe("trap_encounter");
    });
  });
});

// =============================================================================
// COMPANION ACTIONS TESTS
// =============================================================================

describe("Companion Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
    state.player.party.active = [];
    state.player.party.reserve = [];
    state.player.party.maxActive = 2;
  });

  describe("ADD_COMPANION", () => {
    it("should add companion to active party when space available", () => {
      const companion = createTestCompanion();
      const newState = gameReducer(state, { type: "ADD_COMPANION", payload: companion });
      expect(newState.player.party.active).toHaveLength(1);
      expect(newState.player.party.active[0].id).toBe(companion.id);
    });

    it("should add to reserve when active party is full", () => {
      const comp1 = createTestCompanion({ name: "Comp 1" });
      const comp2 = createTestCompanion({ name: "Comp 2" });
      const comp3 = createTestCompanion({ name: "Comp 3" });
      state.player.party.active = [comp1, comp2];

      const newState = gameReducer(state, { type: "ADD_COMPANION", payload: comp3 });
      expect(newState.player.party.active).toHaveLength(2);
      expect(newState.player.party.reserve).toHaveLength(1);
      expect(newState.player.party.reserve[0].name).toBe("Comp 3");
    });
  });

  describe("REMOVE_COMPANION", () => {
    it("should remove companion from active party", () => {
      const companion = createTestCompanion();
      state.player.party.active = [companion];
      const newState = gameReducer(state, { type: "REMOVE_COMPANION", payload: companion.id });
      expect(newState.player.party.active).toHaveLength(0);
    });

    it("should remove companion from reserve", () => {
      const companion = createTestCompanion();
      state.player.party.reserve = [companion];
      const newState = gameReducer(state, { type: "REMOVE_COMPANION", payload: companion.id });
      expect(newState.player.party.reserve).toHaveLength(0);
    });
  });

  describe("MOVE_COMPANION_TO_RESERVE", () => {
    it("should move companion from active to reserve", () => {
      const companion = createTestCompanion();
      state.player.party.active = [companion];
      const newState = gameReducer(state, { type: "MOVE_COMPANION_TO_RESERVE", payload: companion.id });
      expect(newState.player.party.active).toHaveLength(0);
      expect(newState.player.party.reserve).toHaveLength(1);
    });
  });

  describe("MOVE_COMPANION_TO_ACTIVE", () => {
    it("should move companion from reserve to active when space available", () => {
      const companion = createTestCompanion();
      state.player.party.reserve = [companion];
      const newState = gameReducer(state, { type: "MOVE_COMPANION_TO_ACTIVE", payload: companion.id });
      expect(newState.player.party.reserve).toHaveLength(0);
      expect(newState.player.party.active).toHaveLength(1);
    });

    it("should not move if active party is full", () => {
      const comp1 = createTestCompanion({ name: "Active 1" });
      const comp2 = createTestCompanion({ name: "Active 2" });
      const reserveComp = createTestCompanion({ name: "Reserve" });
      state.player.party.active = [comp1, comp2];
      state.player.party.reserve = [reserveComp];

      const newState = gameReducer(state, { type: "MOVE_COMPANION_TO_ACTIVE", payload: reserveComp.id });
      expect(newState.player.party.active).toHaveLength(2);
      expect(newState.player.party.reserve).toHaveLength(1);
    });
  });
});

// =============================================================================
// PHASE ACTIONS TESTS
// =============================================================================

describe("Phase Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("SET_PHASE", () => {
    it("should set game phase", () => {
      const newState = gameReducer(state, gameActions.setPhase("combat"));
      expect(newState.phase).toBe("combat");
    });
  });

  describe("SET_GAME_OVER", () => {
    it("should set game over and change phase", () => {
      const newState = gameReducer(state, gameActions.setGameOver(true));
      expect(newState.gameOver).toBe(true);
      expect(newState.phase).toBe("game_over");
    });

    it("should unset game over but preserve phase", () => {
      state.gameOver = true;
      state.phase = "game_over";
      const newState = gameReducer(state, gameActions.setGameOver(false));
      expect(newState.gameOver).toBe(false);
      expect(newState.phase).toBe("game_over");
    });
  });
});

// =============================================================================
// META ACTIONS TESTS
// =============================================================================

describe("Meta Actions", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  describe("UPDATE_RUN_STATS", () => {
    it("should update run statistics", () => {
      const newState = gameReducer(state, gameActions.updateRunStats({ enemiesSlain: 5 }));
      expect(newState.runStats.enemiesSlain).toBe(5);
    });
  });

  describe("LOAD_STATE", () => {
    it("should replace entire state", () => {
      const newGameState = createTestState();
      newGameState.player.name = "Loaded Hero";
      newGameState.floor = 5;

      const newState = gameReducer(state, gameActions.loadState(newGameState));
      expect(newState.player.name).toBe("Loaded Hero");
      expect(newState.floor).toBe(5);
    });
  });

  describe("RESET_GAME", () => {
    it("should reset to initial state", () => {
      state.player.name = "Modified Hero";
      state.floor = 10;

      const initialState = createTestState();
      const newState = gameReducer(state, gameActions.resetGame(initialState));
      expect(newState.floor).toBe(1);
    });
  });
});

// =============================================================================
// IMMUTABILITY TESTS
// =============================================================================

describe("State Immutability", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  it("should not mutate original state on player update", () => {
    const originalHealth = state.player.stats.health;
    gameReducer(state, gameActions.modifyPlayerHealth(-10));
    expect(state.player.stats.health).toBe(originalHealth);
  });

  it("should not mutate original state on inventory change", () => {
    const item = createTestItem();
    const originalLength = state.player.inventory.length;
    gameReducer(state, gameActions.addItem(item));
    expect(state.player.inventory.length).toBe(originalLength);
  });

  it("should not mutate original state on effect change", () => {
    const effect = createTestEffect();
    const originalLength = state.player.activeEffects.length;
    gameReducer(state, gameActions.addEffect(effect));
    expect(state.player.activeEffects.length).toBe(originalLength);
  });

  it("should return same state reference for unknown action", () => {
    const newState = gameReducer(state, { type: "UNKNOWN_ACTION" } as unknown as GameAction);
    expect(newState).toBe(state);
  });
});

// =============================================================================
// EDGE CASES TESTS
// =============================================================================

describe("Edge Cases", () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  it("should handle empty inventory operations gracefully", () => {
    state.player.inventory = [];
    const newState = gameReducer(state, gameActions.removeItem("nonexistent"));
    expect(newState.player.inventory).toHaveLength(0);
  });

  it("should handle removing nonexistent effect", () => {
    state.player.activeEffects = [];
    const newState = gameReducer(state, gameActions.removeEffect("nonexistent"));
    expect(newState.player.activeEffects).toHaveLength(0);
  });

  it("should handle multiple rapid health modifications", () => {
    state.player.stats.health = 100;
    state.player.stats.maxHealth = 100;

    let newState = gameReducer(state, gameActions.modifyPlayerHealth(-30));
    newState = gameReducer(newState, gameActions.modifyPlayerHealth(-30));
    newState = gameReducer(newState, gameActions.modifyPlayerHealth(-30));
    newState = gameReducer(newState, gameActions.modifyPlayerHealth(-30));

    expect(newState.player.stats.health).toBe(0);
  });

  it("should handle equipping to empty slot", () => {
    state.player.equipment.weapon = null;
    const weapon = createTestItem();
    state.player.inventory = [weapon];

    const newState = gameReducer(state, gameActions.equipItem(weapon, "weapon"));
    expect(newState.player.equipment.weapon).toBeTruthy();
    expect(newState.player.inventory).toHaveLength(0);
  });
});

// =============================================================================
// ACTION CREATOR TESTS
// =============================================================================

describe("Action Creators", () => {
  it("should create correct UPDATE_PLAYER action", () => {
    const action = gameActions.updatePlayer({ name: "Hero" });
    expect(action.type).toBe("UPDATE_PLAYER");
    expect((action as { payload: unknown }).payload).toEqual({ name: "Hero" });
  });

  it("should create correct MODIFY_PLAYER_HEALTH action", () => {
    const action = gameActions.modifyPlayerHealth(-10);
    expect(action.type).toBe("MODIFY_PLAYER_HEALTH");
    expect((action as { payload: unknown }).payload).toBe(-10);
  });

  it("should create correct ADD_ITEM action", () => {
    const item = createTestItem();
    const action = gameActions.addItem(item);
    expect(action.type).toBe("ADD_ITEM");
    expect((action as { payload: unknown }).payload).toBe(item);
  });

  it("should create correct START_COMBAT action", () => {
    const enemy = { id: "enemy-1", name: "Goblin" } as never;
    const action = gameActions.startCombat(enemy);
    expect(action.type).toBe("START_COMBAT");
    expect((action as { payload: unknown }).payload).toBe(enemy);
  });
});
