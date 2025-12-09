"use client";

import { useCallback } from "react";
import type {
  GameState,
  Player,
  Enemy,
  Ability,
  CombatStance,
  StatusEffect,
  DamageType,
} from "@/lib/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { calculateEffectiveStats } from "@/lib/entity-system";
import {
  executeAbility,
  regenerateResource,
  tickCooldowns,
  getClassAbilitiesForLevel,
  CLASSES,
} from "@/lib/ability-system";
import {
  calculateDamageWithType,
  checkForCombo,
  tickCombo,
  selectEnemyAbility,
  tickEnemyAbilities,
  STANCE_MODIFIERS,
} from "@/lib/combat-system";
import {
  triggerTurnEnd,
  triggerOnAttack,
  triggerOnDamageDealt,
  triggerOnCriticalHit,
  triggerOnDamageTaken,
  triggerOnKill,
} from "@/lib/effect-system";
import {
  applyHazardToPlayer,
  tickHazard,
  removeHazardEffects,
} from "@/lib/hazard-system";
import type { GameLogger } from "@/lib/game-log-system";

// ============================================================================
// TYPES
// ============================================================================

interface UseCombatOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  logger: GameLogger;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  updateRunStats: (stats: Partial<GameState["runStats"]>) => void;
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

  // Process turn effects (status effects, hazards, regeneration)
  const processTurnEffects = useCallback((): boolean => {
    const triggerResult = triggerTurnEnd(state.player);
    let player = triggerResult.player;
    const tickDamage = triggerResult.damageToPlayer;
    const tickHeal = triggerResult.healToPlayer;
    const expiredEffects = triggerResult.expiredEffects;

    for (const narrative of triggerResult.narratives) {
      logger.narration(narrative);
    }

    let newHealth = player.stats.health;
    if (tickDamage > 0) {
      newHealth -= tickDamage;
      logger.damageTaken(tickDamage, "Status effects");
      updateRunStats({
        damageTaken: state.runStats.damageTaken + tickDamage,
      });
    }
    if (tickHeal > 0) {
      newHealth = Math.min(player.stats.maxHealth, newHealth + tickHeal);
      logger.heal(tickHeal, "Regeneration");
    }

    for (const effect of expiredEffects) {
      logger.effectExpired(effect);
    }

    let hazardDamage = 0;
    let playerWithHazardEffects = player;
    if (state.currentHazard) {
      const hazardResult = applyHazardToPlayer(player, state.currentHazard);
      playerWithHazardEffects = hazardResult.player;
      hazardDamage = hazardResult.damage;
      if (hazardDamage > 0) {
        newHealth -= hazardDamage;
        logger.damageTaken(
          hazardDamage,
          `${state.currentHazard.name}${hazardResult.narration ? ` - ${hazardResult.narration}` : ""}`,
        );
        updateRunStats({
          damageTaken: state.runStats.damageTaken + hazardDamage,
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

    const updatedHazard = state.currentHazard
      ? tickHazard(state.currentHazard)
      : null;

    if (state.currentHazard && !updatedHazard) {
      updatedPlayer = removeHazardEffects(
        updatedPlayer,
        state.currentHazard.id,
      );
      logger.narration(`The ${state.currentHazard.name} fades away.`);
    }

    dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
    dispatch({ type: "SET_HAZARD", payload: updatedHazard });
    dispatch({ type: "INCREMENT_TURN" });

    return newHealth <= 0;
  }, [state, dispatch, logger, updateRunStats]);

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
    (enemy: Enemy, player: Player) => {
      const effectiveStats = calculateEffectiveStats(player);
      const expGain = Math.floor(
        enemy.expReward * effectiveStats.expMultiplier,
      );
      const goldGain = Math.floor(
        enemy.goldReward * effectiveStats.goldMultiplier,
      );

      updateRunStats({
        enemiesSlain: state.runStats.enemiesSlain + 1,
        goldEarned: state.runStats.goldEarned + goldGain,
      });

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
    [state.runStats, dispatch, logger, updateRunStats, checkLevelUp],
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
      target: Enemy,
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
    (enemy: Enemy) => {
      return selectEnemyAbility(
        enemy,
        state.player.stats.health,
        state.player.stats.maxHealth,
      );
    },
    [state.player.stats.health, state.player.stats.maxHealth],
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

    // Constants
    STANCE_MODIFIERS,
  };
}
