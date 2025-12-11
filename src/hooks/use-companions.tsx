"use client";

import { useCallback, type ReactNode } from "react";
import type {
  GameState,
  Enemy,
  Player,
  Boss,
  Combatant,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import {
  createInitialParty,
  getMaxActiveCompanions,
  addCompanionToParty,
  canTameEnemy,
  createBasicCompanionFromEnemy,
  selectCompanionAction,
  calculateCompanionDamage,
  getBondTier,
  getCompanionColor,
  modifyBond,
  useCompanionAbility,
  processCompanionCooldowns,
  removeCompanionFromParty,
} from "@/lib/entity/companion-system";
import { EntityText } from "@/components/narrative/entity-text";

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseCompanionsOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  enemyAttack: (enemy: Enemy | Boss, player: Player) => Promise<void>;
}

export interface ProcessCompanionTurnsResult {
  enemy: Combatant | null;
  party: Player["party"];
  playerHealed: number;
}

export async function processCompanionTurns(
  enemy: Combatant,
  player: Player,
  addLog: AddLogFn,
): Promise<ProcessCompanionTurnsResult> {
  const activeCompanions = player.party?.active || [];
  if (activeCompanions.length === 0) {
    return { enemy, party: player.party, playerHealed: 0 };
  }

  let currentEnemy: Combatant | null = enemy;
  let updatedParty = player.party;
  let totalPlayerHealed = 0;

  if (activeCompanions.filter((c) => c.alive).length > 0) {
    addLog(
      <span className="text-teal-400/80 text-xs uppercase tracking-wider">
        — Party Actions —
      </span>,
      "system",
    );
  }

  for (const companion of activeCompanions) {
    if (!currentEnemy || currentEnemy.health <= 0) break;
    if (!companion.alive) continue;

    const action = selectCompanionAction(companion, player, currentEnemy);
    let updatedCompanion = companion;
    let actionDescription = "";

    switch (action.action) {
      case "attack": {
        if (!currentEnemy) break;
        const damage = calculateCompanionDamage(companion);
        actionDescription = `attacked for ${damage} dmg`;
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
              <span className={colorClass}>{companion.name}</span> delivers the
              killing blow!
            </span>,
            "combat",
          );
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
          const damage = calculateCompanionDamage(companion, action.ability);
          actionDescription = `used ${action.ability.name} for ${damage} dmg`;
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
          actionDescription = `healed you for ${healing} HP`;
          totalPlayerHealed += healing;

          addLog(
            <span>
              <span className={colorClass}>{companion.name}</span> uses{" "}
              <span className="text-emerald-400">{action.ability.name}</span>!{" "}
              {action.ability.narration}{" "}
              <EntityText type="heal">(+{healing})</EntityText>
            </span>,
            "combat",
          );
          updatedCompanion = modifyBond(companion, 2, "Healed the player");
        } else if (action.ability.effect.type === "buff") {
          actionDescription = `used ${action.ability.name}`;
          addLog(
            <span>
              <span className={colorClass}>{companion.name}</span> uses{" "}
              <span className="text-cyan-400">{action.ability.name}</span>!{" "}
              {action.ability.narration}
            </span>,
            "combat",
          );
        } else if (action.ability.effect.type === "debuff" && currentEnemy) {
          actionDescription = `debuffed enemy with ${action.ability.name}`;
          addLog(
            <span>
              <span className={colorClass}>{companion.name}</span> uses{" "}
              <span className="text-purple-400">{action.ability.name}</span> on{" "}
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
        actionDescription = "took defensive stance";
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
        if (updatedParty) {
          updatedParty = removeCompanionFromParty(updatedParty, companion.id);
        }
        updatedCompanion = modifyBond(companion, -10, "Fled from battle");
        continue;
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
        if (updatedParty) {
          updatedParty = removeCompanionFromParty(updatedParty, companion.id);
        }
        totalPlayerHealed -= betrayDamage;
        continue;
      }

      default:
        actionDescription = "idle";
    }

    updatedCompanion = processCompanionCooldowns(updatedCompanion);
    updatedCompanion = {
      ...updatedCompanion,
      turnsWithPlayer: companion.turnsWithPlayer + 1,
      lastAction: actionDescription
        ? {
            type: action.action as
              | "attack"
              | "ability"
              | "heal"
              | "defend"
              | "flee"
              | "betray"
              | "idle",
            description: actionDescription,
            turn: 0,
          }
        : undefined,
    };

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
}

export function useCompanions({
  state,
  dispatch,
  addLog,
  isProcessing,
  setIsProcessing,
  enemyAttack,
}: UseCompanionsOptions) {
  const handleTameEnemy = useCallback(async () => {
    if (!state.currentEnemy || !state.inCombat || isProcessing) return;
    setIsProcessing(true);

    const tameCheck = canTameEnemy(state.currentEnemy, state.player);

    if (!tameCheck.canTame) {
      addLog(
        <span className="text-yellow-500">{tameCheck.reason}</span>,
        "system",
      );
      setIsProcessing(false);
      return;
    }

    const roll = Math.random();
    const success = roll < tameCheck.chance;

    if (success) {
      const newCompanion = createBasicCompanionFromEnemy(
        state.currentEnemy,
        "tame",
      );

      addLog(
        <span className="text-emerald-400">
          You reach out to the wounded{" "}
          <EntityText type="enemy">{state.currentEnemy.name}</EntityText>... It
          recognizes your intent and submits.{" "}
          <span className="font-bold">{newCompanion.name}</span> joins your
          party!
        </span>,
        "combat",
      );

      let updatedParty = state.player.party || createInitialParty();
      updatedParty = {
        ...updatedParty,
        maxActive: getMaxActiveCompanions(state.player.stats.level),
      };
      updatedParty = addCompanionToParty(
        updatedParty,
        newCompanion,
        updatedParty.active.length < updatedParty.maxActive,
      );

      const inActive = updatedParty.active.some(
        (c) => c.id === newCompanion.id,
      );
      if (inActive) {
        addLog(
          <span className="text-cyan-400">
            {newCompanion.name} joins your active party!
          </span>,
          "system",
        );
      } else {
        addLog(
          <span className="text-zinc-400">
            {newCompanion.name} waits in reserve (party full).
          </span>,
          "system",
        );
      }

      const tamedPlayer = {
        ...state.player,
        party: updatedParty,
      };
      dispatch({ type: "UPDATE_PLAYER", payload: tamedPlayer });
      dispatch({ type: "END_COMBAT" });
    } else {
      addLog(
        <span className="text-red-400">
          You attempt to tame the{" "}
          <EntityText type="enemy">{state.currentEnemy.name}</EntityText>, but
          it lashes out in defiance!
        </span>,
        "combat",
      );

      await enemyAttack(state.currentEnemy, state.player);
    }

    setIsProcessing(false);
  }, [state, isProcessing, addLog, enemyAttack, setIsProcessing, dispatch]);

  const processCompanionTurnsCallback = useCallback(
    async (enemy: Combatant, player: Player) => {
      return processCompanionTurns(enemy, player, addLog);
    },
    [addLog],
  );

  return {
    handleTameEnemy,
    processCompanionTurns: processCompanionTurnsCallback,
    party: state.player.party,
  };
}
