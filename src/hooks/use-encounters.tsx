"use client";

import { useCallback, useMemo, type ReactNode } from "react";
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
import { calculateEntityLevel } from "@/lib/mechanics/game-mechanics-ledger";
import { EntityText, ItemText } from "@/components/narrative/entity-text";
import { decideShrineAction, type ShrineInteractionContext } from "./shrine-decision";
import { decideTrapAction, type TrapInteractionContext, type TrapOutcome } from "./trap-decision";
import { decideNPCAction, type NPCInteractionContext } from "./npc-decision";
import { executeEffects, type Effect } from "@/lib/effects";
import type { ShrineTurnDecision } from "@/lib/effects/effect-types";
import {
  BLESSING_TIERS,
  CURSE_TIERS,
  resolvePieces,
  resolveRewardTier,
} from "@/lib/lego";

// ============================================================================
// SHRINE DECISION RESOLVER
// ============================================================================

/**
 * Resolve a ShrineTurnDecision into Effect[] array.
 * AI selects tiers and pieceIds, this function builds actual effects.
 */
function resolveShrineDecision(decision: ShrineTurnDecision): Effect[] {
  const effects: Effect[] = [];

  // Resolve blessing tier to status effect
  if (decision.blessingTier && (decision.outcome === "blessing" || decision.outcome === "mixed")) {
    const tier = BLESSING_TIERS[decision.blessingTier];
    const blessingStatus: StatusEffect = {
      id: `shrine_blessing_${Date.now()}`,
      name: `Shrine Blessing (${decision.blessingTier})`,
      entityType: "blessing",
      effectType: "buff",
      duration: tier.duration,
      modifiers: {
        attack: tier.attack,
        defense: tier.defense,
      },
      description: "The shrine's power flows through you.",
      sourceType: "shrine",
    };
    effects.push({
      effectType: "apply_status",
      target: { type: "player" },
      status: blessingStatus,
    });
  }

  // Resolve curse tier to status effect
  if (decision.curseTier && (decision.outcome === "curse" || decision.outcome === "mixed")) {
    const tier = CURSE_TIERS[decision.curseTier];
    const curseStatus: StatusEffect = {
      id: `shrine_curse_${Date.now()}`,
      name: `Shrine Curse (${decision.curseTier})`,
      entityType: "curse",
      effectType: "debuff",
      duration: tier.duration,
      modifiers: {
        attack: tier.attack,
        defense: tier.defense,
      },
      description: "Dark energy clings to your soul.",
      sourceType: "shrine",
    };
    effects.push({
      effectType: "apply_status",
      target: { type: "player" },
      status: curseStatus,
    });
  }

  // Healing via tier resolution
  if (decision.healTier && decision.healTier !== "none") {
    const healAmount = resolveRewardTier("healing", decision.healTier);
    effects.push({
      effectType: "heal",
      target: { type: "player" },
      amount: healAmount,
      source: "shrine",
    });
  }

  // Gold via tier resolution
  if (decision.goldTier && decision.goldTier !== "none") {
    const goldAmount = resolveRewardTier("gold", decision.goldTier);
    effects.push({
      effectType: "modify_gold",
      amount: goldAmount,
      source: "shrine",
    });
  }

  // Resolve any additional pieceIds
  if (decision.pieceIds && decision.pieceIds.length > 0) {
    const pieceResolution = resolvePieces(decision.pieceIds);
    if (pieceResolution.success) {
      effects.push(...pieceResolution.effects);
    } else {
      console.warn("Shrine piece resolution failed:", pieceResolution.errors);
    }
  }

  return effects;
}

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

  // === AI-AS-CODE: Trap interactions ===
  // Kernel: disarm chance calculation, damage, success/fail rolls
  // AI: narration for each outcome
  const handleTrapAction = useCallback(
    async (action: "disarm" | "trigger" | "avoid") => {
      if (!state.activeTrap || isProcessing) return;
      setIsProcessing(true);

      const trap = state.activeTrap;
      const disarmChance = calculateDisarmChance(state.player, trap);

      // === KERNEL: Determine outcome based on action ===
      let outcome: TrapOutcome;
      let damageDealt = 0;
      let effectApplied: string | undefined;

      if (action === "disarm") {
        const success = Math.random() * 100 < disarmChance;
        outcome = success ? "success" : "failure";
        if (!success) {
          damageDealt = trap.damage || 10;
          effectApplied = trap.effect?.name;
        }
      } else if (action === "trigger") {
        outcome = "failure";
        damageDealt = trap.damage || 10;
        effectApplied = trap.effect?.name;
      } else {
        // avoid action - 50% chance of partial
        const avoided = Math.random() < 0.5;
        outcome = avoided ? "success" : "partial";
        if (!avoided) {
          damageDealt = Math.floor((trap.damage || 10) * 0.7);
        }
      }

      // === AI: Get trap narration (NO FALLBACK) ===
      const trapContext: TrapInteractionContext = {
        player: {
          name: state.player.name || "Adventurer",
          class: state.player.class ?? undefined,
          level: state.player.stats.level,
          health: state.player.stats.health,
          maxHealth: state.player.stats.maxHealth,
          dexterity: state.player.stats.dexterity,
        },
        trap: {
          id: trap.id,
          name: trap.name,
          trapType: trap.trapType,
          description: trap.description,
          damage: trap.damage,
          disarmDC: trap.disarmDC,
          hidden: trap.hidden,
        },
        action,
        outcome,
        damageDealt: damageDealt > 0 ? damageDealt : undefined,
        effectApplied,
        floor: state.floor,
      };

      const decision = await decideTrapAction(trapContext);

      // Log the AI-generated narration
      addLog(
        <span className={outcome === "success" ? "text-emerald-400" : outcome === "failure" ? "text-red-400" : "text-amber-400"}>
          {decision.narration}
        </span>,
        outcome === "success" ? "narrative" : "combat",
      );

      // === KERNEL: Apply damage and effects based on outcome ===
      if (damageDealt > 0) {
        const newHealth = state.player.stats.health - damageDealt;
        updateRunStats({
          damageTaken: state.runStats.damageTaken + damageDealt,
        });
        addLog(
          <span>
            <EntityText type="damage">-{damageDealt} HP</EntityText>
          </span>,
          "combat",
        );

        if (newHealth <= 0) {
          triggerDeath("Killed by trap", trap.name);
          setIsProcessing(false);
          return;
        }
        dispatch({ type: "SET_PLAYER_HEALTH", payload: newHealth });
      }

      // Apply trap effect on failure
      if (outcome === "failure" && trap.effect) {
        dispatch({ type: "ADD_EFFECT", payload: trap.effect });
        addLog(
          <span>
            You are afflicted with{" "}
            <EntityText type="curse">{trap.effect.name}</EntityText>!
          </span>,
          "effect",
        );
      }

      // Grant XP for successful disarm
      if (action === "disarm" && outcome === "success") {
        dispatch({ type: "ADD_EXPERIENCE", payload: 5 });
        addLog(
          <span>
            <EntityText type="heal">+5 XP</EntityText>
          </span>,
          "system",
        );
      }

      // Execute any narrative effects from AI
      if (decision.effects.length > 0) {
        executeEffects(state, decision.effects);
      }

      // Clean up trap state
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ACTIVE_TRAP", payload: null });
      setIsProcessing(false);
    },
    [state, isProcessing, addLog, updateRunStats, triggerDeath, dispatch, setIsProcessing],
  );

  // === AI-AS-CODE: Shrine interactions ===
  // Kernel: cost validation, stat modifications
  // AI: decides outcome, narration, blessing/curse effects
  const handleShrineAction = useCallback(
    async (action: "accept" | "decline" | "desecrate" | "seek_blessing") => {
      if (!state.activeShrine || isProcessing) return;
      setIsProcessing(true);

      const shrine = state.activeShrine;

      // === KERNEL: Calculate affordability ===
      let canAfford = true;
      if (shrine.cost?.gold && state.player.stats.gold < shrine.cost.gold) {
        canAfford = false;
      }
      if (shrine.cost?.health && state.player.stats.health <= shrine.cost.health) {
        canAfford = false;
      }

      // === AI: Get shrine decision (NO FALLBACK) ===
      const shrineContext: ShrineInteractionContext = {
        player: {
          name: state.player.name || "Adventurer",
          class: state.player.class ?? undefined,
          level: state.player.stats.level,
          health: state.player.stats.health,
          maxHealth: state.player.stats.maxHealth,
          gold: state.player.stats.gold,
        },
        shrine: {
          id: shrine.id,
          name: shrine.name,
          shrineType: shrine.shrineType,
          description: shrine.description,
          cost: shrine.cost,
          riskLevel: shrine.riskLevel,
        },
        action,
        canAfford,
        floor: state.floor,
      };

      const decision = await decideShrineAction(shrineContext);

      // === KERNEL: Apply costs BEFORE effects (only for accept action) ===
      if (action === "accept" && canAfford) {
        if (shrine.cost?.gold) {
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: -shrine.cost.gold });
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
          dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -shrine.cost.health });
          addLog(
            <span>
              You sacrifice{" "}
              <EntityText type="damage">{shrine.cost.health} HP</EntityText> to
              the shrine.
            </span>,
            "narrative",
          );
        }
      }

      // Log the AI-generated narration
      addLog(
        <span className="text-violet-300">{decision.narration}</span>,
        "narrative",
      );

      // === KERNEL: Resolve LEGO decision to effects ===
      const resolvedEffects = resolveShrineDecision(decision);

      // === KERNEL: Execute resolved effects ===
      const executionResult = executeEffects(state, resolvedEffects);

      // Process each applied effect
      for (const effect of executionResult.applied) {
        if (effect.effectType === "apply_status") {
          const statusEffect = effect.status;
          dispatch({ type: "ADD_EFFECT", payload: statusEffect });
          const isBlessing = statusEffect.effectType === "buff";
          addLog(
            <span>
              {isBlessing ? "The shrine bestows " : "The shrine inflicts "}
              <EntityText type={isBlessing ? "blessing" : "curse"}>
                {statusEffect.name}
              </EntityText>
              {isBlessing ? " upon you!" : "!"}
            </span>,
            "effect",
          );
        } else if (effect.effectType === "damage") {
          const damage = effect.amount;
          const newHealth = state.player.stats.health - damage;
          updateRunStats({
            damageTaken: state.runStats.damageTaken + damage,
          });
          addLog(
            <span>
              <EntityText type="damage">-{damage} HP</EntityText>
            </span>,
            "combat",
          );
          if (newHealth <= 0) {
            triggerDeath("Destroyed by shrine", shrine.name);
            setIsProcessing(false);
            return;
          }
          dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damage });
        } else if (effect.effectType === "heal") {
          dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: effect.amount });
          addLog(
            <span>
              <EntityText type="heal">+{effect.amount} HP</EntityText>
            </span>,
            "effect",
          );
        } else if (effect.effectType === "modify_gold") {
          dispatch({ type: "MODIFY_PLAYER_GOLD", payload: effect.amount });
          updateRunStats({
            goldEarned: state.runStats.goldEarned + effect.amount,
          });
          addLog(
            <span>
              <EntityText type="gold">+{effect.amount} gold</EntityText>
            </span>,
            "loot",
          );
        }
      }

      // Mark shrine as used and return to dungeon
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: { ...shrine, used: true } });
      dispatch({ type: "SET_PHASE", payload: "dungeon" });
      dispatch({ type: "SET_ACTIVE_SHRINE", payload: null });

      setIsProcessing(false);
    },
    [state, isProcessing, addLog, updateRunStats, triggerDeath, dispatch, setIsProcessing],
  );

  // === AI-AS-CODE: NPC interactions ===
  // Kernel: trade costs, gold rewards, enemy conversion
  // AI: dialogue generation, reaction narration
  const handleNPCChoice = useCallback(
    async (optionId: string) => {
      if (!state.activeNPC || isProcessing) return;
      setIsProcessing(true);

      const npc = state.activeNPC;

      // Build NPC context for AI
      const npcContext: NPCInteractionContext = {
        player: {
          name: state.player.name || "Adventurer",
          class: state.player.class ?? undefined,
          level: state.player.stats.level,
          gold: state.player.stats.gold,
        },
        npc: {
          id: npc.id,
          name: npc.name,
          role: npc.role,
          description: npc.description,
          disposition: npc.disposition,
          personality: npc.personality,
          hasInventory: Boolean(npc.inventory?.length),
          questId: npc.questId,
        },
        action: optionId as "talk" | "trade" | "help" | "attack" | "leave",
        floor: state.floor,
      };

      if (optionId === "leave") {
        npcContext.action = "leave";
        const decision = await decideNPCAction(npcContext);
        addLog(
          <span className="text-muted-foreground">
            {decision.narration}
          </span>,
          "narrative",
        );
        dispatch({ type: "SET_PHASE", payload: "dungeon" });
        dispatch({ type: "SET_ACTIVE_NPC", payload: null });
        setIsProcessing(false);
        return;
      }

      if (optionId === "trade" && npc.role === "merchant" && npc.inventory?.length) {
        const item = npc.inventory[0];
        const cost = item.value;
        const canAfford = state.player.stats.gold >= cost;

        npcContext.action = "trade";
        npcContext.actionContext = {
          itemName: item.name,
          itemCost: cost,
          tradedSuccessfully: canAfford,
        };

        const decision = await decideNPCAction(npcContext);

        if (canAfford) {
          updateRunStats({
            goldSpent: state.runStats.goldSpent + cost,
            itemsFound: [...state.runStats.itemsFound, item],
          });
          addLog(
            <span>
              {decision.narration} You purchase{" "}
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
              {decision.narration}
            </span>,
            "system",
          );
        }

        setIsProcessing(false);
        return;
      }

      if (optionId === "help" && npc.role === "trapped") {
        // === KERNEL: Calculate gold reward ===
        const goldReward = Math.floor(Math.random() * 30) + 20;

        npcContext.action = "help";
        npcContext.actionContext = {
          goldReward,
          helpedSuccessfully: true,
        };

        const decision = await decideNPCAction(npcContext);

        updateRunStats({
          goldEarned: state.runStats.goldEarned + goldReward,
        });

        addLog(
          <span>
            {decision.narration}
          </span>,
          "narrative",
        );

        addLog(
          <span>
            <EntityText type="npc">{npc.name}</EntityText> offers{" "}
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
        npcContext.action = "talk";
        const decision = await decideNPCAction(npcContext);

        setNpcDialogue(decision.narration);
        addLog(
          <span className="italic text-amber-200/80">
            &quot;{decision.narration}&quot;
          </span>,
          "dialogue",
        );

        setIsProcessing(false);
        return;
      }

      if (optionId === "attack") {
        npcContext.action = "attack";
        const decision = await decideNPCAction(npcContext);

        // === KERNEL: Convert NPC to enemy ===
        const enemy: Enemy = {
          id: npc.id,
          entityType: "enemy",
          name: npc.name,
          level: calculateEntityLevel(state.floor, "normal"),
          health: 20 + state.floor * 5,
          maxHealth: 20 + state.floor * 5,
          attack: 5 + state.floor * 2,
          defense: 3 + state.floor,
          expReward: 10,
          goldReward: Math.floor(Math.random() * 20) + 10,
        };

        addLog(
          <span>
            {decision.narration}{" "}
            <EntityText type="enemy">Combat begins!</EntityText>
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
    (items: Item[], goldAmount: number, curseTriggered?: boolean, curseEffect?: string) => {
      // Gold now comes directly from container, not from item values
      const totalGold = goldAmount;

      addLog(
        <span>
          {totalGold > 0 && (
            <>
              Found <EntityText type="gold">{totalGold} gold</EntityText>
              {items.length > 0 && " and "}
            </>
          )}
          {items.length > 0 && (
            <>
              {items.length} item{items.length !== 1 ? "s" : ""}:{" "}
              {items.map((item, i) => (
                <span key={item.id}>
                  {i > 0 && ", "}
                  <ItemText item={item} />
                </span>
              ))}
            </>
          )}
        </span>,
        "loot",
      );

      if (curseTriggered && curseEffect) {
        addLog(
          <span className="text-red-400 animate-pulse">
            <EntityText type="damage">💀 CURSED!</EntityText> {curseEffect}
          </span>,
          "combat",
        );
        // Create a proper curse status effect that persists
        const curseStatusEffect: StatusEffect = {
          id: `curse_container_${Date.now()}`,
          entityType: "curse",
          name: "Container Curse",
          description: curseEffect,
          effectType: "debuff",
          duration: -1, // Permanent until cured
          modifiers: {
            // Apply a gold drain modifier (checked on room enter)
            goldMultiplier: 0.9, // 10% gold penalty as representation
          },
          sourceType: "ai_generated",
        };
        dispatch({ type: "ADD_EFFECT", payload: curseStatusEffect });
      }

      for (const item of items) {
        dispatch({ type: "ADD_ITEM", payload: item });
      }
      if (totalGold > 0) {
        dispatch({ type: "MODIFY_PLAYER_GOLD", payload: totalGold });
      }
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: {
          goldEarned: state.runStats.goldEarned + totalGold,
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

  // NPC dialogue options based on current NPC state
  const npcOptions = useMemo(() => {
    if (!state.activeNPC) return [];
    const npc = state.activeNPC;
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
        disabled: state.player.stats.gold < item.value,
      });
    }

    if (npc.role === "trapped") {
      options.push({ id: "help", text: "Free them", action: "help" });
    }

    options.push({ id: "attack", text: "Attack", action: "attack" });
    options.push({ id: "leave", text: "Leave", action: "leave" });

    return options;
  }, [state.activeNPC, state.player.stats.gold]);

  return {
    // NPC
    startNPCInteraction,
    endNPCInteraction,
    tradeWithNPC,
    activeNPC: state.activeNPC,
    npcOptions,

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
