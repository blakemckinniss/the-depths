"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  Player,
  Enemy,
  Ability,
  CombatStance,
  StatusEffect,
  DamageType,
  Item,
} from "@/lib/game-types";
import {
  selectCompanionAction,
  calculateCompanionDamage,
  getBondTier,
  getCompanionColor,
  modifyBond,
  useCompanionAbility,
  processCompanionCooldowns,
  removeCompanionFromParty,
} from "@/lib/companion-system";
import { getBossVictoryRewards } from "@/lib/ai-drops-system";

// Response types for AI narrative generation
interface CombatResponse {
  attackNarration: string;
  enemyReaction: string;
}

interface VictoryResponse {
  deathNarration: string;
  spoilsNarration: string;
}
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
import type { GameLogger, LogCategory } from "@/lib/game-log-system";
import { EntityText } from "@/components/entity-text";

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

  // Enemy attack handler
  const enemyAttack = useCallback(
    async (enemy: typeof state.currentEnemy, player: Player) => {
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

        logger.enemyAttack(enemy, finalDamage);
      }

      // Apply damage taken multiplier from effects (e.g., "take 20% less damage")
      finalDamage = Math.floor(
        finalDamage * effectiveStats.damageTakenMultiplier,
      );

      updateRunStats({
        damageTaken: state.runStats.damageTaken + finalDamage,
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
        logger.heal(damageTakenTrigger.healToPlayer, "Reactive effect");
      }

      // Apply damage reflection to enemy
      let updatedEnemy = enemy;
      if (damageTakenTrigger.damageToEnemy > 0) {
        const reflectedHealth = enemy.health - damageTakenTrigger.damageToEnemy;
        updatedEnemy = { ...enemy, health: reflectedHealth };
        logger.playerAttack(enemy, damageTakenTrigger.damageToEnemy, {
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
          logger.enemySlain(enemy, goldGain, expGain);
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
    [addLog, updateRunStats, state.runStats.damageTaken, triggerDeath, dispatch, logger],
  );

  // Handle ability usage
  const handleUseAbility = useCallback(
    async (ability: Ability) => {
      if (!state.currentEnemy || isProcessing) return;

      setIsProcessing(true);
      const enemy = state.currentEnemy;

      const result = executeAbility(state.player, ability, enemy);

      if (!result.success) {
        addLog(
          <span className="text-red-400">{result.narration}</span>,
          "system",
        );
        setIsProcessing(false);
        return;
      }

      updateRunStats({ abilitiesUsed: state.runStats.abilitiesUsed + 1 });

      let updatedPlayer = {
        ...state.player,
        resources: {
          ...state.player.resources,
          current: state.player.resources.current - result.resourceSpent,
        },
        abilityCooldowns: {
          ...state.player.abilityCooldowns,
          [ability.id]: result.cooldownSet,
        },
      };

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
          damageDealt: state.runStats.damageDealt + finalDamage,
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
            enemiesSlain: state.runStats.enemiesSlain + 1,
            goldEarned: state.runStats.goldEarned + goldGain,
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
    [
      state,
      isProcessing,
      addLog,
      checkLevelUp,
      updateRunStats,
      dispatch,
      logger,
      enemyAttack,
      setIsProcessing,
    ],
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

  // Player basic attack
  const playerAttack = useCallback(async () => {
    if (!state.currentEnemy || !state.inCombat || isProcessing) return;
    setIsProcessing(true);

    const effectiveStats = calculateEffectiveStats(state.player);
    const baseDamage = calculateDamage(
      { attack: effectiveStats.attack },
      state.currentEnemy,
    );

    const weaponDamageType =
      state.player.equipment.weapon?.damageType || "physical";
    const { damage: rawDamage, effectiveness } = calculateDamageWithType(
      baseDamage,
      weaponDamageType,
      state.currentEnemy,
      state.player,
    );

    // Apply damage multiplier from effects (e.g., "deal 20% more damage")
    const damage = Math.floor(rawDamage * effectiveStats.damageMultiplier);

    updateRunStats({ damageDealt: state.runStats.damageDealt + damage });

    const newEnemyHealth = state.currentEnemy.health - damage;
    const isCritical = damage > effectiveStats.attack * 1.2;

    const comboResult = checkForCombo(state.player.combo, weaponDamageType);
    let updatedPlayer = { ...state.player, combo: comboResult.newCombo };

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
      enemy: state.currentEnemy,
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
      enemy: state.currentEnemy,
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
        enemy: state.currentEnemy,
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
    const actualNewEnemyHealth = state.currentEnemy.health - totalDamage;
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
        enemyName: state.currentEnemy.name,
        damage,
        playerWeapon: state.player.equipment.weapon?.name,
        enemyHealth: newEnemyHealth,
        enemyMaxHealth: state.currentEnemy.maxHealth,
        isCritical,
        damageType: weaponDamageType,
        effectiveness,
        playerStance: state.player.stance,
        combatRound: state.combatRound,
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
          <EntityText type="enemy" entity={state.currentEnemy}>
            {state.currentEnemy.name}
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
        enemy: state.currentEnemy,
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
        state.currentEnemy.expReward * effectiveStats.expMultiplier,
      );
      const goldGain = Math.floor(
        state.currentEnemy.goldReward * effectiveStats.goldMultiplier,
      );
      const loot = state.currentEnemy.loot;
      const materialDrops = state.currentEnemy.materialDrops || [];

      // Collect all items found (main loot + material drops)
      const allLoot: Item[] = [...(loot ? [loot] : []), ...materialDrops];

      updateRunStats({
        enemiesSlain: state.runStats.enemiesSlain + 1,
        goldEarned: state.runStats.goldEarned + goldGain,
        itemsFound: [...state.runStats.itemsFound, ...allLoot],
      });

      const victoryResponse = await generateNarrative<VictoryResponse>(
        "victory",
        {
          enemyName: state.currentEnemy.name,
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
            <EntityText type="enemy">{state.currentEnemy.name}</EntityText>{" "}
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
      if (state.currentEnemy.lastWords) {
        addLog(
          <span className="italic text-muted-foreground">
            &quot;{state.currentEnemy.lastWords}&quot;
          </span>,
          "narrative",
        );
      }

      // Check if this was a boss - generate special rewards
      const isBoss =
        state.currentEnemy.name.includes("Lord") ||
        state.currentEnemy.name.includes("King") ||
        state.currentEnemy.expReward > 100 ||
        state.currentEnemy.maxHealth > 150;

      if (isBoss) {
        // Fire-and-forget boss reward generation (non-blocking)
        getBossVictoryRewards(
          state.currentEnemy.name,
          undefined,
          state.currentEnemy.abilities?.map((a) => a.name),
          state.floor,
          state.player.className || undefined,
        )
          .then((reward) => {
            if (reward) {
              // Log boss rewards
              addLog(
                <span className="text-amber-400 font-medium">
                  The {state.currentEnemy!.name} yields legendary spoils!
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
        ...state.currentEnemy,
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
          enemiesSlain: state.runStats.enemiesSlain + 1,
          goldEarned: state.runStats.goldEarned + goldGain,
          itemsFound: [...state.runStats.itemsFound, ...allLoot],
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
    state,
    isProcessing,
    calculateDamage,
    addLog,
    checkLevelUp,
    enemyAttack,
    updateRunStats,
    processCompanionTurns,
    generateNarrative,
    dispatch,
    setIsProcessing,
  ]);

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

    // Constants
    STANCE_MODIFIERS,
  };
}
