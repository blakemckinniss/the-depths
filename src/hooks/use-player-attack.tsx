"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, Player, Enemy, Combatant, Item } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { calculateEffectiveStats } from "@/lib/entity/entity-system";
import {
  calculateDamageWithType,
  checkForCombo,
  tickEnemyAbilities,
} from "@/lib/combat/combat-system";
import {
  triggerOnAttack,
  triggerOnDamageDealt,
  triggerOnCriticalHit,
  triggerOnKill,
} from "@/lib/combat/effect-system";
import { getXpModifier } from "@/lib/mechanics/game-mechanics-ledger";
import type { LogCategory } from "@/lib/ai/game-log-system";
import { EntityText } from "@/components/narrative/entity-text";
import { getBossVictoryRewards } from "@/lib/ai/ai-drops-system";
import {
  hasDeathtouch,
  hasRegenerate,
  hasIndestructible,
  useModifier,
  getLifelinkRatio,
} from "@/lib/ai/dm-combat-integration";

interface DeathCheckResult {
  shouldDie: boolean;
  resurrected: boolean;
  narrative: string | null;
}

function checkEntityDeath(entityId: string, currentHealth: number): DeathCheckResult {
  if (currentHealth > 0) {
    return { shouldDie: false, resurrected: false, narrative: null };
  }
  if (hasIndestructible(entityId)) {
    return { shouldDie: false, resurrected: false, narrative: "An unnatural force prevents the killing blow!" };
  }
  if (hasRegenerate(entityId)) {
    if (useModifier(entityId, "REGENERATE")) {
      return { shouldDie: false, resurrected: true, narrative: "Dark energy surges as the creature refuses to stay dead!" };
    }
  }
  return { shouldDie: true, resurrected: false, narrative: null };
}

function applyDeathtouch(attackerId: string, damage: number, targetHealth: number): number {
  if (damage > 0 && hasDeathtouch(attackerId)) {
    return targetHealth + 1;
  }
  return damage;
}

interface CombatResponse {
  attackNarration: string;
  enemyReaction: string;
}

interface VictoryResponse {
  deathNarration: string;
  spoilsNarration: string;
}

type AddLogFn = (message: ReactNode, category: LogCategory) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenerateNarrativeFn = <T>(type: string, context: any) => Promise<T | null>;

interface UsePlayerAttackOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  updateRunStats: (updates: Partial<GameState["runStats"]>) => void;
  generateNarrative: GenerateNarrativeFn;
  calculateDamage: (attacker: { attack: number }, defender: Combatant) => number;
  checkLevelUp: () => void;
  enemyAttack: (enemy: Combatant, player: Player) => Promise<void>;
  processCompanionTurns: (
    enemy: Combatant,
    player: Player,
  ) => Promise<{
    enemy: Combatant | null;
    party: Player["party"];
    playerHealed: number;
  }>;
}

export function usePlayerAttack({
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
  processCompanionTurns,
}: UsePlayerAttackOptions) {
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

    let damage = Math.floor(rawDamage * effectiveStats.damageMultiplier);
    damage = applyDeathtouch(state.player.id, damage, state.currentEnemy.health);
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

    // Process attack triggers
    let bonusDamageToEnemy = 0;
    const attackTrigger = triggerOnAttack(updatedPlayer, {
      damageDealt: damage,
      isCritical,
      enemy: state.currentEnemy,
    });
    updatedPlayer = attackTrigger.player;
    bonusDamageToEnemy += attackTrigger.damageToEnemy;
    for (const narrative of attackTrigger.narratives) {
      addLog(<span className="text-amber-300 italic">{narrative}</span>, "effect");
    }

    const damageTrigger = triggerOnDamageDealt(updatedPlayer, {
      damageDealt: damage,
      isCritical,
      enemy: state.currentEnemy,
    });
    updatedPlayer = damageTrigger.player;
    bonusDamageToEnemy += damageTrigger.damageToEnemy;
    for (const narrative of damageTrigger.narratives) {
      addLog(<span className="text-amber-300 italic">{narrative}</span>, "effect");
    }

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
            Critical hit effect: <EntityText type="heal">+{critTrigger.healToPlayer}</EntityText> HP
          </span>,
          "effect",
        );
      }
      for (const narrative of critTrigger.narratives) {
        addLog(<span className="text-amber-300 italic">{narrative}</span>, "effect");
      }
    }

    const totalDamage = damage + bonusDamageToEnemy;
    const actualNewEnemyHealth = state.currentEnemy.health - totalDamage;
    if (bonusDamageToEnemy > 0) {
      addLog(
        <span>
          Triggered effects deal <EntityText type="damage">{bonusDamageToEnemy}</EntityText> bonus damage!
        </span>,
        "effect",
      );
    }

    // Apply LIFELINK
    const lifelinkRatio = getLifelinkRatio(state.player.id);
    if (lifelinkRatio > 0 && totalDamage > 0) {
      const lifelinkHeal = Math.floor(totalDamage * lifelinkRatio);
      if (lifelinkHeal > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          stats: {
            ...updatedPlayer.stats,
            health: Math.min(
              updatedPlayer.stats.maxHealth,
              updatedPlayer.stats.health + lifelinkHeal,
            ),
          },
        };
        addLog(
          <span className="text-purple-400">
            Lifelink: <EntityText type="heal">+{lifelinkHeal}</EntityText> HP
          </span>,
          "effect",
        );
      }
    }

    const attackResponse = await generateNarrative<CombatResponse>("player_attack", {
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
    });

    let effectivenessNote = "";
    if (effectiveness === "effective") effectivenessNote = " Super effective!";
    if (effectiveness === "resisted") effectivenessNote = " Resisted...";

    if (attackResponse) {
      addLog(
        <span>
          {attackResponse.attackNarration} <EntityText type="damage">(-{damage})</EntityText>
          {effectivenessNote && (
            <span className={effectiveness === "effective" ? "text-emerald-400" : "text-stone-500"}>
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
          <EntityText type="enemy" entity={state.currentEnemy}>{state.currentEnemy.name}</EntityText>{" "}
          for <EntityText type="damage">{damage}</EntityText> damage.
          {effectivenessNote && (
            <span className={effectiveness === "effective" ? "text-emerald-400" : "text-stone-500"}>
              {effectivenessNote}
            </span>
          )}
        </span>,
        "combat",
      );
    }

    const deathCheck = checkEntityDeath(state.currentEnemy.id, actualNewEnemyHealth);
    if (deathCheck.narrative) {
      addLog(<span className="text-purple-400 italic">{deathCheck.narrative}</span>, "effect");
    }

    if (deathCheck.resurrected) {
      const restoredHealth = Math.floor(state.currentEnemy.maxHealth * 0.25);
      dispatch({ type: "UPDATE_ENEMY", payload: { health: restoredHealth } });
      dispatch({ type: "UPDATE_PLAYER", payload: updatedPlayer });
      await enemyAttack({ ...state.currentEnemy, health: restoredHealth }, updatedPlayer);
      setIsProcessing(false);
      return;
    }

    if (deathCheck.shouldDie) {
      // Process on_kill triggers
      const killTrigger = triggerOnKill(updatedPlayer, { enemy: state.currentEnemy });
      updatedPlayer = killTrigger.player;
      for (const narrative of killTrigger.narratives) {
        addLog(<span className="text-emerald-400 italic">{narrative}</span>, "effect");
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
          <span>Kill effect: <EntityText type="heal">+{killTrigger.healToPlayer}</EntityText> HP</span>,
          "effect",
        );
      }

      const abilityVictoryLevelXpMod = getXpModifier(state.player.stats.level, state.currentEnemy.level);
      const expGain = Math.floor(
        state.currentEnemy.expReward * effectiveStats.expMultiplier * abilityVictoryLevelXpMod,
      );
      const goldGain = Math.floor(state.currentEnemy.goldReward * effectiveStats.goldMultiplier);
      const loot = state.currentEnemy.loot;
      const materialDrops = state.currentEnemy.materialDrops || [];
      const allLoot: Item[] = [...(loot ? [loot] : []), ...materialDrops];

      updateRunStats({
        enemiesSlain: state.runStats.enemiesSlain + 1,
        goldEarned: state.runStats.goldEarned + goldGain,
        itemsFound: [...state.runStats.itemsFound, ...allLoot],
      });

      addLog(
        <span className="text-emerald-400 font-bold text-lg animate-pulse">⚔ VICTORY! ⚔</span>,
        "system",
      );

      const victoryResponse = await generateNarrative<VictoryResponse>("victory", {
        enemyName: state.currentEnemy.name,
        expGain,
        goldGain,
        lootName: loot?.name,
        lootRarity: loot?.rarity,
        leveledUp: updatedPlayer.stats.experience + expGain >= updatedPlayer.stats.experienceToLevel,
      });

      if (victoryResponse) {
        addLog(<span>{victoryResponse.deathNarration}</span>, "combat");
        addLog(
          <span>
            {victoryResponse.spoilsNarration} <EntityText type="gold">+{goldGain}g</EntityText>{" "}
            <EntityText type="heal">+{expGain}xp</EntityText>
          </span>,
          "loot",
        );
      } else {
        addLog(
          <span>
            The <EntityText type="enemy">{state.currentEnemy.name}</EntityText> falls! You gain{" "}
            <EntityText type="gold">{goldGain} gold</EntityText> and{" "}
            <EntityText type="heal">{expGain} experience</EntityText>.
          </span>,
          "combat",
        );
      }

      if (loot) {
        addLog(
          <span>
            Found:{" "}
            <EntityText type={loot.rarity === "legendary" ? "legendary" : loot.rarity === "rare" ? "rare" : "item"}>
              {loot.name}
            </EntityText>
          </span>,
          "loot",
        );
      }

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

      if (state.currentEnemy.lastWords) {
        addLog(
          <span className="italic text-muted-foreground">&quot;{state.currentEnemy.lastWords}&quot;</span>,
          "narrative",
        );
      }

      const isBoss =
        state.currentEnemy.name.includes("Lord") ||
        state.currentEnemy.name.includes("King") ||
        state.currentEnemy.expReward > 100 ||
        state.currentEnemy.maxHealth > 150;

      if (isBoss) {
        getBossVictoryRewards(
          state.currentEnemy.name,
          undefined,
          state.currentEnemy.abilities?.map((a) => a.name),
          state.floor,
          state.player.className || undefined,
        )
          .then((reward) => {
            if (reward) {
              addLog(
                <span className="text-amber-400 font-medium">
                  The {state.currentEnemy!.name} yields legendary spoils!
                </span>,
                "loot",
              );
              reward.items.forEach((item) => {
                addLog(
                  <span>Boss Trophy: <EntityText type={item.rarity}>{item.name}</EntityText></span>,
                  "loot",
                );
              });
              if (reward.lore) {
                addLog(
                  <span className="italic text-muted-foreground text-xs">{reward.lore}</span>,
                  "narrative",
                );
              }
              for (const item of reward.items) {
                dispatch({ type: "ADD_ITEM", payload: item });
              }
            }
          })
          .catch(() => {});
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
      // Enemy survives
      const survivingHealth = Math.max(1, actualNewEnemyHealth);
      const tickedEnemy = tickEnemyAbilities({ ...state.currentEnemy, health: survivingHealth });

      const companionResult = await processCompanionTurns(tickedEnemy, updatedPlayer);

      if (companionResult.playerHealed !== 0) {
        const newPlayerHealth = Math.min(
          updatedPlayer.stats.maxHealth,
          Math.max(1, updatedPlayer.stats.health + companionResult.playerHealed),
        );
        updatedPlayer = {
          ...updatedPlayer,
          stats: { ...updatedPlayer.stats, health: newPlayerHealth },
          party: companionResult.party,
        };
      } else {
        updatedPlayer = { ...updatedPlayer, party: companionResult.party };
      }

      if (!companionResult.enemy) {
        // Companions killed the enemy
        const expGain = Math.floor(
          tickedEnemy.expReward * calculateEffectiveStats(updatedPlayer).expMultiplier,
        );
        const goldGain = Math.floor(
          tickedEnemy.goldReward * calculateEffectiveStats(updatedPlayer).goldMultiplier,
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
          <span className="text-emerald-400 font-bold text-lg animate-pulse">⚔ VICTORY! ⚔</span>,
          "system",
        );
        addLog(
          <span>
            Your companions have slain the <EntityText type="enemy">{tickedEnemy.name}</EntityText>! You gain{" "}
            <EntityText type="gold">{goldGain} gold</EntityText> and{" "}
            <EntityText type="heal">{expGain} experience</EntityText>.
          </span>,
          "combat",
        );

        if (loot) {
          addLog(
            <span>
              Found:{" "}
              <EntityText type={loot.rarity === "legendary" ? "legendary" : loot.rarity === "rare" ? "rare" : "item"}>
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

  return { playerAttack };
}
