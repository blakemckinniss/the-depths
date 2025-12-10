"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  NPC,
  Shrine,
  Trap,
  Item,
  StatusEffect,
  Enemy,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import type { LootContainer } from "@/lib/ai/ai-drops-system";
import { calculateDisarmChance } from "@/lib/core/game-data";
import { STATUS_EFFECTS } from "@/lib/entity/entity-system";
import { EntityText, ItemText } from "@/components/narrative/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseEncountersOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  addLog: AddLogFn;
  triggerDeath: (reason: string, killedBy: string) => void;
  setNpcDialogue: (dialogue: string) => void;
  setActiveLootContainer: (container: LootContainer | null) => void;
}

interface TrapResult {
  success: boolean;
  damage?: number;
  effect?: StatusEffect;
}

interface ShrineResult {
  success: boolean;
  effect?: StatusEffect;
  item?: Item;
  gold?: number;
  healthCost?: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEncounters({
  state,
  dispatch,
  logger,
  updateRunStats,
  isProcessing,
  setIsProcessing,
  addLog,
  triggerDeath,
  setNpcDialogue,
  setActiveLootContainer,
}: UseEncountersOptions) {
  // ========== NPC ENCOUNTERS ==========

  // Start NPC interaction
  const startNPCInteraction = useCallback(
    (npc: NPC) => {
      dispatch({ type: "SET_ACTIVE_NPC", payload: npc });
      dispatch({ type: "SET_PHASE", payload: "npc_interaction" });
      logger.npcEncounter(npc);
    },
    [dispatch, logger],
  );

  // End NPC interaction
  const endNPCInteraction = useCallback(() => {
    const npc = state.activeNPC;
    dispatch({ type: "SET_ACTIVE_NPC", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (npc) {
      logger.npcIgnored(npc);
    }
  }, [state.activeNPC, dispatch, logger]);

  // Trade with NPC
  const tradeWithNPC = useCallback(
    (item: Item, cost: number) => {
      const npc = state.activeNPC;
      if (!npc) return false;

      if (state.player.stats.gold < cost) {
        return false;
      }

      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -cost });
      dispatch({ type: "ADD_ITEM", payload: item });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: { goldSpent: state.runStats.goldSpent + cost },
      });

      logger.npcTrade(npc, item, cost);

      return true;
    },
    [
      state.activeNPC,
      state.player.stats.gold,
      state.runStats.goldSpent,
      dispatch,
      logger,
    ],
  );

  // ========== SHRINE ENCOUNTERS ==========

  // Start shrine interaction
  const startShrineInteraction = useCallback(
    (shrine: Shrine) => {
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: shrine });
      dispatch({ type: "SET_PHASE", payload: "shrine_choice" });
      logger.shrineEncounter(shrine);
    },
    [dispatch, logger],
  );

  // Interact with shrine (accept blessing)
  const acceptShrineBlessing = useCallback((): ShrineResult => {
    const shrine = state.activeShrine;
    if (!shrine || shrine.used) {
      return { success: false };
    }

    const result: ShrineResult = { success: true };

    // Pay costs
    if (shrine.cost?.health) {
      dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -shrine.cost.health });
      result.healthCost = shrine.cost.health;
    }
    if (shrine.cost?.gold) {
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -shrine.cost.gold });
    }

    // Receive rewards
    if (shrine.reward?.effect) {
      dispatch({ type: "ADD_EFFECT", payload: shrine.reward.effect });
      result.effect = shrine.reward.effect;
      logger.shrineBlessing(shrine, shrine.reward.effect);
    }
    if (shrine.reward?.item) {
      dispatch({ type: "ADD_ITEM", payload: shrine.reward.item });
      result.item = shrine.reward.item;
    }
    if (shrine.reward?.gold) {
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: shrine.reward.gold });
      result.gold = shrine.reward.gold;
    }

    // Mark shrine as used
    dispatch({
      type: "SET_ACTIVE_SHRINE",
      payload: { ...shrine, used: true },
    });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    return result;
  }, [state.activeShrine, dispatch, logger]);

  // Leave shrine without interacting
  const ignoreSshrine = useCallback(() => {
    const shrine = state.activeShrine;
    dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (shrine) {
      logger.shrineIgnored(shrine);
    }
  }, [state.activeShrine, dispatch, logger]);

  // ========== TRAP ENCOUNTERS ==========

  // Start trap encounter
  const startTrapEncounter = useCallback(
    (trap: Trap) => {
      dispatch({ type: "SET_ACTIVE_TRAP", payload: trap });
      dispatch({ type: "SET_PHASE", payload: "trap_encounter" });
      logger.trapEncounter(trap);
    },
    [dispatch, logger],
  );

  // Attempt to disarm trap
  const attemptDisarm = useCallback((): TrapResult => {
    const trap = state.activeTrap;
    if (!trap) return { success: false };

    const disarmChance = calculateDisarmChance(state.player, trap);
    const roll = Math.random();
    const success = roll < disarmChance;

    if (success) {
      dispatch({
        type: "SET_ACTIVE_TRAP",
        payload: { ...trap, triggered: true },
      });
      dispatch({ type: "SET_PHASE", payload: "exploring" });
      logger.trapDisarmed(trap);
      return { success: true };
    } else {
      // Failed disarm triggers the trap
      const damage = trap.damage || 0;
      dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
      dispatch({
        type: "SET_ACTIVE_TRAP",
        payload: { ...trap, triggered: true },
      });
      dispatch({ type: "SET_PHASE", payload: "exploring" });

      if (trap.effect) {
        dispatch({ type: "ADD_EFFECT", payload: trap.effect });
      }

      updateRunStats({ damageTaken: state.runStats.damageTaken + damage });
      logger.trapTriggered(trap, damage);

      return { success: false, damage, effect: trap.effect };
    }
  }, [
    state.activeTrap,
    state.player,
    state.runStats.damageTaken,
    dispatch,
    logger,
    updateRunStats,
  ]);

  // Avoid trap (go around)
  const avoidTrap = useCallback(() => {
    const trap = state.activeTrap;
    dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (trap) {
      logger.trapAvoided(trap);
    }
  }, [state.activeTrap, dispatch, logger]);

  // Trigger trap (walk through)
  const triggerTrap = useCallback((): TrapResult => {
    const trap = state.activeTrap;
    if (!trap) return { success: false };

    const damage = trap.damage || 0;
    dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
    dispatch({
      type: "SET_ACTIVE_TRAP",
      payload: { ...trap, triggered: true },
    });
    dispatch({ type: "SET_PHASE", payload: "exploring" });

    if (trap.effect) {
      dispatch({ type: "ADD_EFFECT", payload: trap.effect });
    }

    updateRunStats({ damageTaken: state.runStats.damageTaken + damage });
    logger.trapTriggered(trap, damage);

    return { success: false, damage, effect: trap.effect };
  }, [
    state.activeTrap,
    state.runStats.damageTaken,
    dispatch,
    logger,
    updateRunStats,
  ]);

  // ========== COMBAT ENCOUNTERS ==========

  // Start combat with enemy
  const startCombat = useCallback(
    (enemy: Enemy) => {
      dispatch({ type: "START_COMBAT", payload: enemy });
      logger.enemyEncounter(enemy);
    },
    [dispatch, logger],
  );

  // End combat
  const endCombat = useCallback(() => {
    dispatch({ type: "END_COMBAT" });
  }, [dispatch]);

  // ========== QUERIES ==========

  const hasActiveEncounter = useCallback(() => {
    return (
      state.activeNPC !== null ||
      state.activeShrine !== null ||
      state.activeTrap !== null
    );
  }, [state.activeNPC, state.activeShrine, state.activeTrap]);

  // ========== FULL ENCOUNTER HANDLERS ==========

  const handleTrapAction = useCallback(
    async (action: "disarm" | "trigger" | "avoid") => {
      if (!state.activeTrap || isProcessing) return;
      setIsProcessing(true);

      const trap = state.activeTrap;
      const disarmChance = calculateDisarmChance(state.player, trap);

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
          const newHealth = state.player.stats.health - damage;

          updateRunStats({
            damageTaken: state.runStats.damageTaken + damage,
          });

          addLog(
            <span>
              Your disarm attempt fails! The{" "}
              <EntityText type="trap">{trap.name}</EntityText> activates!{" "}
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );

          const updatedEffects = [...state.player.activeEffects];
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
        const newHealth = state.player.stats.health - damage;

        updateRunStats({
          damageTaken: state.runStats.damageTaken + damage,
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
          const newHealth = state.player.stats.health - damage;

          updateRunStats({
            damageTaken: state.runStats.damageTaken + damage,
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
    [state, isProcessing, addLog, updateRunStats, triggerDeath, dispatch, setIsProcessing],
  );

  const handleShrineAction = useCallback(
    async (action: "accept" | "decline" | "desecrate") => {
      if (!state.activeShrine || isProcessing) return;
      setIsProcessing(true);

      const shrine = state.activeShrine;

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
          const damage = Math.floor(state.player.stats.maxHealth * 0.3);
          updateRunStats({
            damageTaken: state.runStats.damageTaken + damage,
          });
          addLog(
            <span>
              The shrine explodes with malevolent energy!{" "}
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );
          const newHealth = state.player.stats.health - damage;
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
      if (shrine.cost?.gold && state.player.stats.gold < shrine.cost.gold)
        canAfford = false;
      if (
        shrine.cost?.health &&
        state.player.stats.health <= shrine.cost.health
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

      let newGold = state.player.stats.gold;
      let newHealth = state.player.stats.health;
      if (shrine.cost?.gold) {
        newGold -= shrine.cost.gold;
        updateRunStats({
          goldSpent: state.runStats.goldSpent + shrine.cost.gold,
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
      if (newGold !== state.player.stats.gold) {
        dispatch({ type: "SET_PLAYER_GOLD", payload: newGold });
      }
      if (newHealth !== state.player.stats.health) {
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
      }
      if (effect) {
        dispatch({ type: "ADD_EFFECT", payload: effect });
      }
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });

      setIsProcessing(false);
    },
    [state, isProcessing, addLog, updateRunStats, triggerDeath, dispatch, setIsProcessing],
  );

  const handleNPCChoice = useCallback(
    async (optionId: string) => {
      if (!state.activeNPC || isProcessing) return;
      setIsProcessing(true);

      const npc = state.activeNPC;

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

        if (state.player.stats.gold >= cost) {
          updateRunStats({
            goldSpent: state.runStats.goldSpent + cost,
            itemsFound: [...state.runStats.itemsFound, item],
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
          goldEarned: state.runStats.goldEarned + goldReward,
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
            };
          }
          return undefined;
        };
        const dialogue = await generateEntity("npc", {
          role: npc.role,
          floor: state.floor,
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
        const enemy: Enemy = {
          id: npc.id,
          entityType: "enemy",
          name: npc.name,
          health: 20 + state.floor * 5,
          maxHealth: 20 + state.floor * 5,
          attack: 5 + state.floor * 2,
          defense: 3 + state.floor,
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
    [state, isProcessing, addLog, updateRunStats, dispatch, setNpcDialogue, setIsProcessing],
  );

  const handleLootContainerComplete = useCallback(
    (items: Item[], curseTriggered?: boolean, curseEffect?: string) => {
      const goldFound = items.reduce((sum, item) => sum + (item.value || 0), 0);

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

      if (curseTriggered && curseEffect) {
        addLog(
          <span className="text-red-400">
            <EntityText type="damage">Cursed!</EntityText> {curseEffect}
          </span>,
          "combat",
        );
        const curseDamage = Math.floor(10 + state.floor * 3);
        const newHealth = Math.max(1, state.player.stats.health - curseDamage);
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
      }

      for (const item of items) {
        dispatch({ type: "ADD_ITEM", payload: item });
      }
      dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldFound });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: {
          goldEarned: state.runStats.goldEarned + goldFound,
          itemsFound: [...state.runStats.itemsFound, ...items],
        },
      });

      setActiveLootContainer(null);
    },
    [state.floor, state.player.stats.health, state.runStats, addLog, dispatch, setActiveLootContainer],
  );

  const handleLootContainerCancel = useCallback(() => {
    addLog(
      <span className="text-muted-foreground italic">
        You decide to leave the container unopened...
      </span>,
      "narrative",
    );
    setActiveLootContainer(null);
  }, [addLog, setActiveLootContainer]);

  return {
    // NPC
    startNPCInteraction,
    endNPCInteraction,
    tradeWithNPC,
    activeNPC: state.activeNPC,

    // Shrine
    startShrineInteraction,
    acceptShrineBlessing,
    ignoreShrine: ignoreSshrine,
    activeShrine: state.activeShrine,

    // Trap
    startTrapEncounter,
    attemptDisarm,
    avoidTrap,
    triggerTrap,
    activeTrap: state.activeTrap,

    // Combat
    startCombat,
    endCombat,
    inCombat: state.inCombat,
    currentEnemy: state.currentEnemy,

    // Queries
    hasActiveEncounter,

    // Full encounter handlers
    handleTrapAction,
    handleShrineAction,
    handleNPCChoice,
    handleLootContainerComplete,
    handleLootContainerCancel,
  };
}
