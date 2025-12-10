import type {
  GameState,
  Player,
  PlayerStats,
  Enemy,
  Combatant,
  Item,
  StatusEffect,
  NPC,
  Shrine,
  Trap,
  Boss,
  DungeonCard,
  GamePhase,
  PathOption,
  EnvironmentalHazard,
  EnvironmentalEntity,
  GameEvent,
  CombatStance,
  Ability,
  Companion,
  EventMemory,
  DungeonKey,
  RunSummary,
  EquipmentSlot,
} from "@/lib/core/game-types";
import type { MaterialItem as MaterialItemType } from "@/lib/materials/material-system";

// ============================================================================
// ACTION TYPES
// ============================================================================

// Player actions
type PlayerAction =
  | { type: "UPDATE_PLAYER"; payload: Partial<Player> }
  | { type: "UPDATE_PLAYER_STATS"; payload: Partial<PlayerStats> }
  | { type: "SET_PLAYER_HEALTH"; payload: number }
  | { type: "MODIFY_PLAYER_HEALTH"; payload: number } // Add/subtract from current health
  | { type: "SET_PLAYER_GOLD"; payload: number }
  | { type: "MODIFY_PLAYER_GOLD"; payload: number }
  | { type: "ADD_EXPERIENCE"; payload: number }
  | {
      type: "LEVEL_UP";
      payload: { newLevel: number; statIncreases: Partial<PlayerStats> };
    };

// Inventory actions
type InventoryAction =
  | { type: "ADD_ITEM"; payload: Item }
  | { type: "REMOVE_ITEM"; payload: string } // item ID
  | { type: "EQUIP_ITEM"; payload: { item: Item; slot: EquipmentSlot | "weapon" | "armor" } }
  | { type: "UNEQUIP_ITEM"; payload: EquipmentSlot | "weapon" | "armor" }
  | { type: "ADD_KEY"; payload: DungeonKey }
  | { type: "REMOVE_KEY"; payload: string } // key ID
  | { type: "ADD_ESSENCE"; payload: { type: string; amount: number } }
  | { type: "REMOVE_ESSENCE"; payload: { type: string; amount: number } }
  | { type: "SET_ESSENCE"; payload: Record<string, number> } // Set entire essence object
  | { type: "ADD_MATERIAL"; payload: MaterialItemType }
  | { type: "REMOVE_MATERIAL"; payload: string } // material ID
  | { type: "REMOVE_MATERIALS"; payload: string[] }; // multiple material IDs

// Effects actions
type EffectAction =
  | { type: "ADD_EFFECT"; payload: StatusEffect }
  | { type: "REMOVE_EFFECT"; payload: string } // effect ID
  | {
      type: "UPDATE_EFFECT";
      payload: { id: string; changes: Partial<StatusEffect> };
    }
  | { type: "TICK_EFFECTS" } // Decrement durations, remove expired
  | { type: "CLEAR_EFFECTS" };

// Ability actions
type AbilityAction =
  | { type: "USE_ABILITY"; payload: string } // ability ID - triggers cooldown
  | { type: "TICK_COOLDOWNS" }
  | { type: "RESET_COOLDOWNS" }
  | { type: "ADD_ABILITY"; payload: Ability }
  | { type: "REMOVE_ABILITY"; payload: string };

// Combat actions
type CombatAction =
  | { type: "START_COMBAT"; payload: Combatant }
  | { type: "END_COMBAT" }
  | { type: "UPDATE_ENEMY"; payload: Partial<Combatant> | null }
  | { type: "SET_ENEMY_HEALTH"; payload: number }
  | { type: "DAMAGE_ENEMY"; payload: number }
  | { type: "SET_STANCE"; payload: CombatStance }
  | { type: "INCREMENT_COMBAT_ROUND" }
  | { type: "RESET_COMBAT_ROUND" }
  | { type: "UPDATE_COMBO"; payload: string } // Add ability to combo tracker
  | { type: "CLEAR_COMBO" };

// Navigation actions
type NavigationAction =
  | { type: "SET_ROOM"; payload: number }
  | { type: "SET_FLOOR"; payload: number }
  | { type: "SET_PATH_OPTIONS"; payload: PathOption[] | null }
  | { type: "SET_DUNGEON"; payload: DungeonCard | null }
  | { type: "SET_AVAILABLE_DUNGEONS"; payload: DungeonCard[] }
  | { type: "CLEAR_DUNGEON" }
  | { type: "SET_HAZARD"; payload: EnvironmentalHazard | null };

// Encounter actions
type EncounterAction =
  | { type: "SET_ACTIVE_NPC"; payload: NPC | null }
  | { type: "SET_ACTIVE_SHRINE"; payload: Shrine | null }
  | { type: "SET_ACTIVE_TRAP"; payload: Trap | null }
  | { type: "SET_CURRENT_BOSS"; payload: Boss | null }
  | { type: "SET_ROOM_ENTITIES"; payload: EnvironmentalEntity[] }
  | {
      type: "UPDATE_ROOM_ENTITY";
      payload: { id: string; changes: Partial<EnvironmentalEntity> };
    }
  | { type: "REMOVE_ROOM_ENTITY"; payload: string }
  | { type: "SET_ACTIVE_VAULT"; payload: import("@/lib/items/vault-system").VaultInstance | null };

// Companion/party actions
type CompanionAction =
  | { type: "ADD_COMPANION"; payload: Companion }
  | { type: "REMOVE_COMPANION"; payload: string }
  | {
      type: "UPDATE_COMPANION";
      payload: { id: string; changes: Partial<Companion> };
    }
  | { type: "MOVE_COMPANION_TO_RESERVE"; payload: string }
  | { type: "MOVE_COMPANION_TO_ACTIVE"; payload: string };

// Phase/flow actions
type PhaseAction =
  | { type: "SET_PHASE"; payload: GamePhase }
  | { type: "SET_GAME_STARTED"; payload: boolean }
  | { type: "SET_GAME_OVER"; payload: boolean }
  | { type: "INCREMENT_TURN" };

// Meta/state actions
type MetaAction =
  | { type: "UPDATE_RUN_STATS"; payload: Partial<RunSummary> }
  | { type: "UPDATE_EVENT_MEMORY"; payload: EventMemory }
  | { type: "ADD_EVENT"; payload: GameEvent }
  | { type: "LOAD_STATE"; payload: GameState }
  | { type: "RESET_GAME"; payload: GameState }; // Reset to initial state

// Union of all actions
export type GameAction =
  | PlayerAction
  | InventoryAction
  | EffectAction
  | AbilityAction
  | CombatAction
  | NavigationAction
  | EncounterAction
  | CompanionAction
  | PhaseAction
  | MetaAction;

// ============================================================================
// REDUCER
// ============================================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // === PLAYER ACTIONS ===
    case "UPDATE_PLAYER":
      return {
        ...state,
        player: { ...state.player, ...action.payload },
      };

    case "UPDATE_PLAYER_STATS":
      return {
        ...state,
        player: {
          ...state.player,
          stats: { ...state.player.stats, ...action.payload },
        },
      };

    case "SET_PLAYER_HEALTH":
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            health: Math.max(
              0,
              Math.min(action.payload, state.player.stats.maxHealth),
            ),
          },
        },
      };

    case "MODIFY_PLAYER_HEALTH": {
      const newHealth = state.player.stats.health + action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            health: Math.max(
              0,
              Math.min(newHealth, state.player.stats.maxHealth),
            ),
          },
        },
      };
    }

    case "SET_PLAYER_GOLD":
      return {
        ...state,
        player: {
          ...state.player,
          stats: { ...state.player.stats, gold: Math.max(0, action.payload) },
        },
      };

    case "MODIFY_PLAYER_GOLD": {
      const newGold = state.player.stats.gold + action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          stats: { ...state.player.stats, gold: Math.max(0, newGold) },
        },
      };
    }

    case "ADD_EXPERIENCE":
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            experience: state.player.stats.experience + action.payload,
          },
        },
      };

    case "LEVEL_UP":
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            level: action.payload.newLevel,
            experience: 0,
            experienceToLevel: Math.floor(
              state.player.stats.experienceToLevel * 1.5,
            ),
            ...action.payload.statIncreases,
          },
        },
      };

    // === INVENTORY ACTIONS ===
    case "ADD_ITEM":
      return {
        ...state,
        player: {
          ...state.player,
          inventory: [...state.player.inventory, action.payload],
        },
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        player: {
          ...state.player,
          inventory: state.player.inventory.filter(
            (item) => item.id !== action.payload,
          ),
        },
      };

    case "EQUIP_ITEM": {
      const { item, slot } = action.payload;
      const currentEquipped = state.player.equipment[slot];

      // Remove item from inventory, add back currently equipped if any
      let newInventory = state.player.inventory.filter((i) => i.id !== item.id);
      if (currentEquipped) {
        newInventory = [
          ...newInventory,
          { ...currentEquipped, equipped: false },
        ];
      }

      return {
        ...state,
        player: {
          ...state.player,
          inventory: newInventory,
          equipment: {
            ...state.player.equipment,
            [slot]: { ...item, equipped: true },
          },
        },
      };
    }

    case "UNEQUIP_ITEM": {
      const slot = action.payload;
      const equippedItem = state.player.equipment[slot];
      if (!equippedItem) return state;

      return {
        ...state,
        player: {
          ...state.player,
          inventory: [
            ...state.player.inventory,
            { ...equippedItem, equipped: false },
          ],
          equipment: {
            ...state.player.equipment,
            [slot]: null,
          },
        },
      };
    }

    case "ADD_KEY":
      return {
        ...state,
        player: {
          ...state.player,
          keys: [...state.player.keys, action.payload],
        },
      };

    case "REMOVE_KEY":
      return {
        ...state,
        player: {
          ...state.player,
          keys: state.player.keys.filter((key) => key.id !== action.payload),
        },
      };

    case "ADD_ESSENCE": {
      const { type, amount } = action.payload;
      const currentAmount = state.player.essence[type] || 0;
      return {
        ...state,
        player: {
          ...state.player,
          essence: {
            ...state.player.essence,
            [type]: currentAmount + amount,
          },
        },
      };
    }

    case "REMOVE_ESSENCE": {
      const { type, amount } = action.payload;
      const currentAmount = state.player.essence[type] || 0;
      const newAmount = Math.max(0, currentAmount - amount);
      return {
        ...state,
        player: {
          ...state.player,
          essence: {
            ...state.player.essence,
            [type]: newAmount,
          },
        },
      };
    }

    case "SET_ESSENCE":
      return {
        ...state,
        player: {
          ...state.player,
          essence: action.payload,
        },
      };

    // === MATERIAL ACTIONS ===
    case "ADD_MATERIAL":
      return {
        ...state,
        player: {
          ...state.player,
          materials: [...state.player.materials, action.payload],
        },
      };

    case "REMOVE_MATERIAL":
      return {
        ...state,
        player: {
          ...state.player,
          materials: state.player.materials.filter((m) => m.id !== action.payload),
        },
      };

    case "REMOVE_MATERIALS":
      return {
        ...state,
        player: {
          ...state.player,
          materials: state.player.materials.filter((m) => !action.payload.includes(m.id)),
        },
      };

    // === EFFECT ACTIONS ===
    case "ADD_EFFECT":
      return {
        ...state,
        player: {
          ...state.player,
          activeEffects: [...state.player.activeEffects, action.payload],
        },
      };

    case "REMOVE_EFFECT":
      return {
        ...state,
        player: {
          ...state.player,
          activeEffects: state.player.activeEffects.filter(
            (effect) => effect.id !== action.payload,
          ),
        },
      };

    case "UPDATE_EFFECT":
      return {
        ...state,
        player: {
          ...state.player,
          activeEffects: state.player.activeEffects.map((effect) =>
            effect.id === action.payload.id
              ? { ...effect, ...action.payload.changes }
              : effect,
          ),
        },
      };

    case "TICK_EFFECTS": {
      const updatedEffects = state.player.activeEffects
        .map((effect) => ({
          ...effect,
          duration: effect.duration === -1 ? -1 : effect.duration - 1,
        }))
        .filter((effect) => effect.duration === -1 || effect.duration > 0);

      return {
        ...state,
        player: {
          ...state.player,
          activeEffects: updatedEffects,
        },
      };
    }

    case "CLEAR_EFFECTS":
      return {
        ...state,
        player: {
          ...state.player,
          activeEffects: [],
        },
      };

    // === ABILITY ACTIONS ===
    case "USE_ABILITY": {
      const abilityId = action.payload;
      const ability = state.player.abilities.find((a) => a.id === abilityId);
      if (!ability) return state;

      return {
        ...state,
        player: {
          ...state.player,
          abilityCooldowns: {
            ...state.player.abilityCooldowns,
            [abilityId]: ability.cooldown,
          },
          resources: {
            ...state.player.resources,
            current: Math.max(
              0,
              state.player.resources.current - ability.resourceCost,
            ),
          },
        },
      };
    }

    case "TICK_COOLDOWNS": {
      const updatedCooldowns: Record<string, number> = {};
      for (const [id, cd] of Object.entries(state.player.abilityCooldowns)) {
        if (cd > 0) {
          updatedCooldowns[id] = cd - 1;
        }
      }
      return {
        ...state,
        player: {
          ...state.player,
          abilityCooldowns: updatedCooldowns,
        },
      };
    }

    case "RESET_COOLDOWNS":
      return {
        ...state,
        player: {
          ...state.player,
          abilityCooldowns: {},
        },
      };

    case "ADD_ABILITY":
      return {
        ...state,
        player: {
          ...state.player,
          abilities: [...state.player.abilities, action.payload],
        },
      };

    case "REMOVE_ABILITY":
      return {
        ...state,
        player: {
          ...state.player,
          abilities: state.player.abilities.filter(
            (ability) => ability.id !== action.payload,
          ),
        },
      };

    // === COMBAT ACTIONS ===
    case "START_COMBAT":
      return {
        ...state,
        inCombat: true,
        currentEnemy: action.payload,
        combatRound: 1,
        phase: "combat",
      };

    case "END_COMBAT":
      return {
        ...state,
        inCombat: false,
        currentEnemy: null,
        combatRound: 0,
        phase: "exploring",
      };

    case "UPDATE_ENEMY":
      if (action.payload === null) {
        return { ...state, currentEnemy: null };
      }
      return {
        ...state,
        currentEnemy: state.currentEnemy
          ? ({ ...state.currentEnemy, ...action.payload } as Combatant)
          : null,
      };

    case "SET_ENEMY_HEALTH":
      if (!state.currentEnemy) return state;
      return {
        ...state,
        currentEnemy: {
          ...state.currentEnemy,
          health: Math.max(
            0,
            Math.min(action.payload, state.currentEnemy.maxHealth),
          ),
        },
      };

    case "DAMAGE_ENEMY":
      if (!state.currentEnemy) return state;
      return {
        ...state,
        currentEnemy: {
          ...state.currentEnemy,
          health: Math.max(0, state.currentEnemy.health - action.payload),
        },
      };

    case "SET_STANCE":
      return {
        ...state,
        player: {
          ...state.player,
          stance: action.payload,
        },
      };

    case "INCREMENT_COMBAT_ROUND":
      return {
        ...state,
        combatRound: state.combatRound + 1,
      };

    case "RESET_COMBAT_ROUND":
      return {
        ...state,
        combatRound: 0,
      };

    case "UPDATE_COMBO": {
      const lastAbilities = [
        ...state.player.combo.lastAbilities,
        action.payload,
      ].slice(-3);
      return {
        ...state,
        player: {
          ...state.player,
          combo: {
            ...state.player.combo,
            lastAbilities,
          },
        },
      };
    }

    case "CLEAR_COMBO":
      return {
        ...state,
        player: {
          ...state.player,
          combo: {
            lastAbilities: [],
            activeCombo: undefined,
          },
        },
      };

    // === NAVIGATION ACTIONS ===
    case "SET_ROOM":
      return {
        ...state,
        currentRoom: action.payload,
      };

    case "SET_FLOOR":
      return {
        ...state,
        floor: action.payload,
      };

    case "SET_PATH_OPTIONS":
      return {
        ...state,
        pathOptions: action.payload,
      };

    case "SET_DUNGEON":
      return {
        ...state,
        currentDungeon: action.payload,
      };

    case "SET_AVAILABLE_DUNGEONS":
      return {
        ...state,
        availableDungeons: action.payload,
      };

    case "CLEAR_DUNGEON":
      return {
        ...state,
        currentDungeon: null,
        floor: 1,
        currentRoom: 0,
        pathOptions: null,
      };

    case "SET_HAZARD":
      return {
        ...state,
        currentHazard: action.payload,
      };

    // === ENCOUNTER ACTIONS ===
    case "SET_ACTIVE_NPC":
      return {
        ...state,
        activeNPC: action.payload,
        phase: action.payload ? "npc_interaction" : state.phase,
      };

    case "SET_ACTIVE_SHRINE":
      return {
        ...state,
        activeShrine: action.payload,
        phase: action.payload ? "shrine_choice" : state.phase,
      };

    case "SET_ACTIVE_TRAP":
      return {
        ...state,
        activeTrap: action.payload,
        phase: action.payload ? "trap_encounter" : state.phase,
      };

    case "SET_ACTIVE_VAULT":
      return {
        ...state,
        activeVault: action.payload,
      };

    case "SET_CURRENT_BOSS":
      return {
        ...state,
        currentBoss: action.payload,
      };

    case "SET_ROOM_ENTITIES":
      return {
        ...state,
        roomEnvironmentalEntities: action.payload,
      };

    case "UPDATE_ROOM_ENTITY":
      return {
        ...state,
        roomEnvironmentalEntities: state.roomEnvironmentalEntities.map(
          (entity) =>
            entity.id === action.payload.id
              ? { ...entity, ...action.payload.changes }
              : entity,
        ),
      };

    case "REMOVE_ROOM_ENTITY":
      return {
        ...state,
        roomEnvironmentalEntities: state.roomEnvironmentalEntities.filter(
          (entity) => entity.id !== action.payload,
        ),
      };

    // === COMPANION ACTIONS ===
    case "ADD_COMPANION":
      return {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            active:
              state.player.party.active.length < state.player.party.maxActive
                ? [...state.player.party.active, action.payload]
                : state.player.party.active,
            reserve:
              state.player.party.active.length >= state.player.party.maxActive
                ? [...state.player.party.reserve, action.payload]
                : state.player.party.reserve,
          },
        },
      };

    case "REMOVE_COMPANION": {
      const id = action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            active: state.player.party.active.filter((c) => c.id !== id),
            reserve: state.player.party.reserve.filter((c) => c.id !== id),
          },
        },
      };
    }

    case "UPDATE_COMPANION":
      return {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            active: state.player.party.active.map((c) =>
              c.id === action.payload.id
                ? { ...c, ...action.payload.changes }
                : c,
            ),
            reserve: state.player.party.reserve.map((c) =>
              c.id === action.payload.id
                ? { ...c, ...action.payload.changes }
                : c,
            ),
          },
        },
      };

    case "MOVE_COMPANION_TO_RESERVE": {
      const companion = state.player.party.active.find(
        (c) => c.id === action.payload,
      );
      if (!companion) return state;
      return {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            active: state.player.party.active.filter(
              (c) => c.id !== action.payload,
            ),
            reserve: [...state.player.party.reserve, companion],
          },
        },
      };
    }

    case "MOVE_COMPANION_TO_ACTIVE": {
      const companion = state.player.party.reserve.find(
        (c) => c.id === action.payload,
      );
      if (
        !companion ||
        state.player.party.active.length >= state.player.party.maxActive
      ) {
        return state;
      }
      return {
        ...state,
        player: {
          ...state.player,
          party: {
            ...state.player.party,
            reserve: state.player.party.reserve.filter(
              (c) => c.id !== action.payload,
            ),
            active: [...state.player.party.active, companion],
          },
        },
      };
    }

    // === PHASE ACTIONS ===
    case "SET_PHASE":
      return {
        ...state,
        phase: action.payload,
      };

    case "SET_GAME_STARTED":
      return {
        ...state,
        gameStarted: action.payload,
      };

    case "SET_GAME_OVER":
      return {
        ...state,
        gameOver: action.payload,
        phase: action.payload ? "game_over" : state.phase,
      };

    case "INCREMENT_TURN":
      return {
        ...state,
        turnCount: state.turnCount + 1,
      };

    // === META ACTIONS ===
    case "UPDATE_RUN_STATS":
      return {
        ...state,
        runStats: { ...state.runStats, ...action.payload },
      };

    case "UPDATE_EVENT_MEMORY":
      return {
        ...state,
        eventMemory: action.payload,
      };

    case "ADD_EVENT":
      return {
        ...state,
        eventHistory: [...state.eventHistory, action.payload],
      };

    case "LOAD_STATE":
      return action.payload;

    case "RESET_GAME":
      return action.payload;

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS (optional helpers)
// ============================================================================

export const gameActions = {
  // Player
  updatePlayer: (payload: Partial<Player>): GameAction => ({
    type: "UPDATE_PLAYER",
    payload,
  }),
  updatePlayerStats: (payload: Partial<PlayerStats>): GameAction => ({
    type: "UPDATE_PLAYER_STATS",
    payload,
  }),
  setPlayerHealth: (health: number): GameAction => ({
    type: "SET_PLAYER_HEALTH",
    payload: health,
  }),
  modifyPlayerHealth: (delta: number): GameAction => ({
    type: "MODIFY_PLAYER_HEALTH",
    payload: delta,
  }),
  modifyPlayerGold: (delta: number): GameAction => ({
    type: "MODIFY_PLAYER_GOLD",
    payload: delta,
  }),
  addExperience: (exp: number): GameAction => ({
    type: "ADD_EXPERIENCE",
    payload: exp,
  }),

  // Inventory
  addItem: (item: Item): GameAction => ({ type: "ADD_ITEM", payload: item }),
  removeItem: (id: string): GameAction => ({
    type: "REMOVE_ITEM",
    payload: id,
  }),
  equipItem: (item: Item, slot: "weapon" | "armor"): GameAction => ({
    type: "EQUIP_ITEM",
    payload: { item, slot },
  }),
  unequipItem: (slot: "weapon" | "armor"): GameAction => ({
    type: "UNEQUIP_ITEM",
    payload: slot,
  }),
  addEssence: (type: string, amount: number): GameAction => ({
    type: "ADD_ESSENCE",
    payload: { type, amount },
  }),
  removeEssence: (type: string, amount: number): GameAction => ({
    type: "REMOVE_ESSENCE",
    payload: { type, amount },
  }),
  setEssence: (essence: Record<string, number>): GameAction => ({
    type: "SET_ESSENCE",
    payload: essence,
  }),

  // Materials
  addMaterial: (material: MaterialItemType): GameAction => ({
    type: "ADD_MATERIAL",
    payload: material,
  }),
  removeMaterial: (materialId: string): GameAction => ({
    type: "REMOVE_MATERIAL",
    payload: materialId,
  }),
  removeMaterials: (materialIds: string[]): GameAction => ({
    type: "REMOVE_MATERIALS",
    payload: materialIds,
  }),

  // Effects
  addEffect: (effect: StatusEffect): GameAction => ({
    type: "ADD_EFFECT",
    payload: effect,
  }),
  removeEffect: (id: string): GameAction => ({
    type: "REMOVE_EFFECT",
    payload: id,
  }),
  tickEffects: (): GameAction => ({ type: "TICK_EFFECTS" }),

  // Combat
  startCombat: (enemy: Combatant): GameAction => ({
    type: "START_COMBAT",
    payload: enemy,
  }),
  endCombat: (): GameAction => ({ type: "END_COMBAT" }),
  updateEnemy: (payload: Partial<Combatant> | null): GameAction => ({
    type: "UPDATE_ENEMY",
    payload,
  }),
  damageEnemy: (damage: number): GameAction => ({
    type: "DAMAGE_ENEMY",
    payload: damage,
  }),
  setStance: (stance: CombatStance): GameAction => ({
    type: "SET_STANCE",
    payload: stance,
  }),

  // Navigation
  setRoom: (room: number): GameAction => ({ type: "SET_ROOM", payload: room }),
  setFloor: (floor: number): GameAction => ({
    type: "SET_FLOOR",
    payload: floor,
  }),
  setPathOptions: (paths: PathOption[] | null): GameAction => ({
    type: "SET_PATH_OPTIONS",
    payload: paths,
  }),
  setDungeon: (dungeon: DungeonCard | null): GameAction => ({
    type: "SET_DUNGEON",
    payload: dungeon,
  }),
  setAvailableDungeons: (dungeons: DungeonCard[]): GameAction => ({
    type: "SET_AVAILABLE_DUNGEONS",
    payload: dungeons,
  }),

  // Encounters
  setActiveNPC: (npc: NPC | null): GameAction => ({
    type: "SET_ACTIVE_NPC",
    payload: npc,
  }),
  setActiveShrine: (shrine: Shrine | null): GameAction => ({
    type: "SET_ACTIVE_SHRINE",
    payload: shrine,
  }),
  setActiveTrap: (trap: Trap | null): GameAction => ({
    type: "SET_ACTIVE_TRAP",
    payload: trap,
  }),
  setActiveVault: (vault: import("@/lib/items/vault-system").VaultInstance | null): GameAction => ({
    type: "SET_ACTIVE_VAULT",
    payload: vault,
  }),

  // Phase
  setPhase: (phase: GamePhase): GameAction => ({
    type: "SET_PHASE",
    payload: phase,
  }),
  setGameOver: (isOver: boolean): GameAction => ({
    type: "SET_GAME_OVER",
    payload: isOver,
  }),

  // Meta
  updateRunStats: (stats: Partial<RunSummary>): GameAction => ({
    type: "UPDATE_RUN_STATS",
    payload: stats,
  }),
  updateEventMemory: (memory: EventMemory): GameAction => ({
    type: "UPDATE_EVENT_MEMORY",
    payload: memory,
  }),
  loadState: (state: GameState): GameAction => ({
    type: "LOAD_STATE",
    payload: state,
  }),
  resetGame: (initialState: GameState): GameAction => ({
    type: "RESET_GAME",
    payload: initialState,
  }),
};
