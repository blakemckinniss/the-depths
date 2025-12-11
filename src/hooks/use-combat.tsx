"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  Player,
  Boss,
  Combatant,
  CombatStance,
  StatusEffect,
  DamageType,
} from "@/lib/core/game-types";
import { processCompanionTurns } from "./use-companions";
import { useAbilityExecution } from "./use-ability-execution";
import { useEnemyAI } from "./use-enemy-ai";
import { useFlee } from "./use-flee";
import { useTurnEffects } from "./use-turn-effects";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import {
  getClassAbilitiesForLevel,
  CLASSES,
  autoLevelAbilitiesOnLevelUp,
} from "@/lib/character/ability-system";
import {
  calculateDamageWithType,
  checkForCombo,
  selectEnemyAbility,
  STANCE_MODIFIERS,
} from "@/lib/combat/combat-system";
import { getXpModifier } from "@/lib/mechanics/game-mechanics-ledger";
import type { GameLogger, LogCategory } from "@/lib/ai/game-log-system";
import { EntityText } from "@/components/narrative/entity-text";
import {
  processEntityDeath,
  processCombatEnd,
} from "@/lib/ai/dm-combat-integration";
import { usePlayerAttack } from "./use-player-attack";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenerateNarrativeFn = <T>(type: string, context: any) => Promise<T | null>;

interface UseCombatOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
  addLog: AddLogFn;
  generateNarrative: GenerateNarrativeFn;
}

interface DamageResult {
  damage: number;
  effectiveness: "effective" | "resisted" | "normal";
  isCritical: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCombat({
  state,
  dispatch,
  logger,
  isProcessing,
  setIsProcessing,
  updateRunStats,
  addLog,
  generateNarrative,
}: UseCombatOptions) {
  // Calculate base damage between attacker and defender
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

  // Check and process level ups
  const checkLevelUp = useCallback(() => {
    let player = state.player;
    let levelsGained = 0;

    while (player.stats.experience >= player.stats.experienceToLevel) {
      const newLevel = player.stats.level + 1;
      const newMaxHealth = player.stats.maxHealth + 10;
      const resourceBonus = player.class
        ? CLASSES[player.class].resourcePerLevel
        : 0;

      player = {
        ...player,
        stats: {
          ...player.stats,
          experience: player.stats.experience - player.stats.experienceToLevel,
          level: newLevel,
          maxHealth: newMaxHealth,
          health: newMaxHealth,
          attack: player.stats.attack + 2,
          defense: player.stats.defense + 1,
          strength: player.stats.strength + 1,
          intelligence: player.stats.intelligence + 1,
          dexterity: player.stats.dexterity + 1,
          experienceToLevel: Math.floor(player.stats.experienceToLevel * 1.5),
        },
        resources: {
          ...player.resources,
          max: player.resources.max + resourceBonus,
          current: player.resources.current + resourceBonus,
        },
      };
      levelsGained++;

      if (player.class) {
        const newAbilities = getClassAbilitiesForLevel(player.class, newLevel);
        const currentIds = new Set(player.abilities.map((a) => a.id));
        const unlocked = newAbilities.filter((a) => !currentIds.has(a.id));
        if (unlocked.length > 0) {
          player = {
            ...player,
            abilities: [...player.abilities, ...unlocked],
          };
          for (const ability of unlocked) {
            logger.levelUp(newLevel, ability);
          }
        }

        // Auto-level existing abilities based on player level (every 3 levels = +1 ability level)
        player = autoLevelAbilitiesOnLevelUp(player);
      }
    }

    if (levelsGained > 0) {
      dispatch({ type: "UPDATE_PLAYER", payload: player });
      const hasNewAbilities =
        player.class &&
        getClassAbilitiesForLevel(player.class, player.stats.level).some(
          (a) =>
            !state.player.abilities.some((existing) => existing.id === a.id),
        );
      if (!hasNewAbilities) {
        logger.levelUp(player.stats.level);
      }
    }
  }, [state.player, dispatch, logger]);

  const { processTurnEffects } = useTurnEffects({
    state,
    dispatch,
    logger,
    updateRunStats,
  });

  // Change combat stance
  const changeStance = useCallback(
    (newStance: CombatStance) => {
      if (state.player.stance === newStance) return;

      dispatch({ type: "SET_STANCE", payload: newStance });
      logger.stanceChange(newStance);
    },
    [state.player.stance, dispatch, logger],
  );

  // Trigger player death
  const triggerDeath = useCallback(
    (causeOfDeath: string, killedBy?: string) => {
      dispatch({
        type: "UPDATE_PLAYER",
        payload: {
          stats: { ...state.player.stats, health: 0 },
        },
      });
      dispatch({ type: "SET_GAME_OVER", payload: true });
      dispatch({
        type: "UPDATE_RUN_STATS",
        payload: {
          causeOfDeath,
          killedBy,
          floorsCleared: (state.floor - 1) * 5 + state.currentRoom,
        },
      });
    },
    [state.player.stats, state.floor, state.currentRoom, dispatch],
  );

  // Handle enemy victory (reward processing)
  const handleEnemyDefeat = useCallback(
    (enemy: Combatant, player: Player) => {
      const effectiveStats = calculateEffectiveStats(player);
      const levelXpMod = getXpModifier(player.stats.level, enemy.level);
      const expGain = Math.floor(
        enemy.expReward * effectiveStats.expMultiplier * levelXpMod,
      );
      const goldGain = Math.floor(
        enemy.goldReward * effectiveStats.goldMultiplier,
      );

      updateRunStats({
        enemiesSlain: state.runStats.enemiesSlain + 1,
        goldEarned: state.runStats.goldEarned + goldGain,
      });

      // Prominent victory banner
      addLog(
        <span className="text-emerald-400 font-bold text-lg animate-pulse">
          ⚔ VICTORY! ⚔
        </span>,
        "system",
      );

      dispatch({
        type: "UPDATE_PLAYER",
        payload: {
          stats: {
            ...player.stats,
            gold: player.stats.gold + goldGain,
            experience: player.stats.experience + expGain,
          },
        },
      });
      dispatch({ type: "END_COMBAT" });

      logger.enemySlain(enemy, goldGain, expGain);

      // Process DM death triggers (soul bonds, phylacteries, etc.)
      const deathTriggers = processEntityDeath(enemy.id);
      for (const narrative of deathTriggers.narrative) {
        addLog(
          <span className="text-purple-400 italic">{narrative}</span>,
          "effect",
        );
      }

      // Process end of combat modifiers
      const expiredModifiers = processCombatEnd(player.id);
      for (const expiredMsg of expiredModifiers) {
        addLog(
          <span className="text-stone-400 text-sm">{expiredMsg}</span>,
          "effect",
        );
      }

      if (enemy.loot) {
        dispatch({ type: "ADD_ITEM", payload: enemy.loot });
        dispatch({
          type: "UPDATE_RUN_STATS",
          payload: {
            itemsFound: [...state.runStats.itemsFound, enemy.loot],
          },
        });
        logger.itemFound(enemy.loot);
      }

      checkLevelUp();
    },
    [state.runStats, dispatch, logger, updateRunStats, checkLevelUp, addLog],
  );

  // Apply effect to player
  const applyPlayerEffect = useCallback(
    (effect: StatusEffect) => {
      dispatch({ type: "ADD_EFFECT", payload: effect });
      logger.effectApplied(effect, "player");
    },
    [dispatch, logger],
  );

  // Get effective player stats (with all modifiers applied)
  const getEffectiveStats = useCallback(() => {
    return calculateEffectiveStats(state.player);
  }, [state.player]);

  // Calculate damage with type effectiveness
  const calculateTypedDamage = useCallback(
    (
      baseDamage: number,
      damageType: DamageType | undefined,
      target: Combatant,
      attacker: Player,
    ): DamageResult => {
      const { damage, effectiveness } = calculateDamageWithType(
        baseDamage,
        damageType,
        target,
        attacker,
      );
      const effectiveStats = calculateEffectiveStats(attacker);
      const finalDamage = Math.floor(damage * effectiveStats.damageMultiplier);
      const isCritical = finalDamage > effectiveStats.attack * 1.2;

      return { damage: finalDamage, effectiveness, isCritical };
    },
    [],
  );

  // Check for combos
  const checkCombo = useCallback(
    (damageType: string) => {
      return checkForCombo(state.player.combo, damageType);
    },
    [state.player.combo],
  );

  // Select best enemy ability
  const selectBestEnemyAbility = useCallback(
    (enemy: Combatant) => {
      return selectEnemyAbility(
        enemy,
        state.player.stats.health,
        state.player.stats.maxHealth,
      );
    },
    [state.player.stats.health, state.player.stats.maxHealth],
  );

  const { enemyAttack } = useEnemyAI({
    state,
    dispatch,
    addLog,
    logger,
    updateRunStats,
    triggerDeath,
  });

  const processCompanionTurnsCallback = useCallback(
    async (enemy: Combatant, player: Player) => {
      return processCompanionTurns(enemy, player, addLog);
    },
    [addLog],
  );

  const { handleUseAbility } = useAbilityExecution({
    state,
    dispatch,
    addLog,
    logger,
    isProcessing,
    setIsProcessing,
    updateRunStats,
    checkLevelUp,
    enemyAttack,
  });

  const { playerAttack } = usePlayerAttack({
    state,
    dispatch,
    addLog,
    isProcessing,
    setIsProcessing,
    updateRunStats,
    generateNarrative,
    calculateDamage,
    checkLevelUp,
    enemyAttack,
    processCompanionTurns: processCompanionTurnsCallback,
  });

  const { attemptFlee } = useFlee({
    state,
    dispatch,
    addLog,
    isProcessing,
    setIsProcessing,
    updateRunStats,
    calculateDamage,
    triggerDeath,
    generateNarrative,
  });

  // Boss encounter action handler
  const handleBossAction = useCallback(
    async (action: "attack" | "defend" | "flee" | "parley") => {
      if (isProcessing || !state.currentEnemy || state.currentEnemy.entityType !== "boss") return;

      switch (action) {
        case "attack":
          // Use existing attack flow
          await playerAttack();
          break;
        case "defend":
          // Set defensive stance and skip attack
          dispatch({ type: "SET_STANCE", payload: "defensive" });
          logger.stanceChange("Defensive");
          addLog(
            <span className="text-blue-400">
              You brace yourself for the boss&apos;s attack...
            </span>,
            "combat",
          );
          // Enemy still attacks
          if (state.currentEnemy) {
            await enemyAttack(state.currentEnemy, state.player);
          }
          break;
        case "flee":
          // Use existing flee logic
          await attemptFlee();
          break;
        case "parley":
          // Attempt to negotiate with the boss
          const boss = state.currentEnemy as Boss;
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
    [isProcessing, state.currentEnemy, state.player, playerAttack, enemyAttack, attemptFlee, dispatch, logger, addLog],
  );

  return {
    // Calculations
    calculateDamage,
    calculateTypedDamage,
    getEffectiveStats,
    checkCombo,
    selectBestEnemyAbility,

    // State mutations
    checkLevelUp,
    processTurnEffects,
    changeStance,
    triggerDeath,
    handleEnemyDefeat,
    applyPlayerEffect,
    enemyAttack,
    handleUseAbility,
    processCompanionTurns,
    playerAttack,
    attemptFlee,
    handleBossAction,

    // Constants
    STANCE_MODIFIERS,
  };
}
