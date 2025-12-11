"use client";

import { useCallback, type ReactNode } from "react";
import type { GameState, SustainedAbility } from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import type { PlayerCapability } from "@/lib/mechanics/player-capabilities";
import {
  activateSustained,
  deactivateSustained,
} from "@/lib/character/sustained-ability-system";
import { EntityText } from "@/components/narrative/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface UseAbilitiesOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAbilities({ state, dispatch, addLog }: UseAbilitiesOptions) {
  // Toggle sustained abilities on/off
  const handleToggleSustained = useCallback(
    (ability: SustainedAbility) => {
      const player = state.player;

      if (ability.isActive) {
        // Deactivate
        const result = deactivateSustained(ability);
        const updatedAbilities = player.sustainedAbilities.map((a) =>
          a.id === ability.id ? result.ability : a,
        );
        // Remove the constant effect
        const updatedEffects = player.activeEffects.filter(
          (e) => e.id !== ability.sustained.constantEffect.id,
        );

        const deactivatedPlayer = {
          ...player,
          sustainedAbilities: updatedAbilities,
          activeEffects: updatedEffects,
          resources: {
            ...player.resources,
            current: player.resources.current - result.resourceCost,
          },
        };
        dispatch({ type: "UPDATE_PLAYER", payload: deactivatedPlayer });

        addLog(
          <span className="text-stone-400">{result.narration}</span>,
          "combat",
        );
      } else {
        // Activate
        const result = activateSustained(
          ability,
          player.resources.current,
          player.resources.max,
          player.stats.health,
          player.stats.maxHealth,
          player.sustainedAbilities,
        );

        if (!result.success) {
          addLog(
            <span className="text-red-400">{result.error}</span>,
            "system",
          );
          return;
        }

        const updatedAbilities = player.sustainedAbilities.map((a) =>
          a.id === ability.id ? result.ability : a,
        );
        const updatedEffects = result.effectApplied
          ? [...player.activeEffects, result.effectApplied]
          : player.activeEffects;

        const activatedPlayer = {
          ...player,
          sustainedAbilities: updatedAbilities,
          activeEffects: updatedEffects,
          resources: {
            ...player.resources,
            current: player.resources.current - result.resourceCost,
          },
        };
        dispatch({ type: "UPDATE_PLAYER", payload: activatedPlayer });

        addLog(
          <span className="text-amber-400">{result.narration}</span>,
          "combat",
        );
      }
    },
    [state.player, addLog, dispatch],
  );

  // Handle always-on utility capabilities (Teleport, etc.)
  const handleUtilityCapability = useCallback(
    (capability: PlayerCapability) => {
      if (!capability.available) return;

      // Handle spells
      if (capability.source === "spell" && state.player.spellBook) {
        const spell = state.player.spellBook.spells.find(
          (s) => s.id === capability.sourceId,
        );
        if (!spell) return;

        // Deduct resource cost if spell has one
        if (spell.resourceCost > 0 && state.player.resources) {
          const newResourceAmount = Math.max(
            0,
            state.player.resources.current - spell.resourceCost,
          );
          dispatch({
            type: "UPDATE_PLAYER",
            payload: {
              resources: {
                ...state.player.resources,
                current: newResourceAmount,
              },
            },
          });
        }

        // Set cooldown if spell has one
        if (spell.cooldown) {
          const newCooldowns = {
            ...state.player.spellBook.cooldowns,
            [spell.id]: spell.cooldown,
          };
          dispatch({
            type: "UPDATE_PLAYER",
            payload: {
              spellBook: {
                ...state.player.spellBook,
                cooldowns: newCooldowns,
              },
            },
          });
        }

        addLog(
          <span className="text-violet-400">
            You cast <EntityText type="rare">{spell.name}</EntityText>
            {capability.utilityType === "teleport" &&
              " and prepare to teleport..."}
          </span>,
          "effect",
        );

        // Handle specific utility types
        if (capability.utilityType === "teleport") {
          addLog(
            <span className="text-stone-400 text-sm">
              The spell awaits your destination choice...
            </span>,
            "system",
          );
        }
      }

      // Handle items
      if (capability.source === "item") {
        const item = state.player.inventory.find(
          (i) => i.id === capability.sourceId,
        );
        if (!item) return;

        addLog(
          <span className="text-amber-400">
            You use <EntityText type="uncommon">{item.name}</EntityText>
          </span>,
          "narrative",
        );

        // Consume if consumable
        if (item.category === "consumable") {
          dispatch({ type: "REMOVE_ITEM", payload: item.id });
        }
      }

      // Handle abilities
      if (capability.source === "ability") {
        const ability = state.player.abilities.find(
          (a) => a.id === capability.sourceId,
        );
        if (!ability) return;

        dispatch({ type: "USE_ABILITY", payload: ability.id });

        addLog(
          <span className="text-cyan-400">
            You activate <EntityText type="uncommon">{ability.name}</EntityText>
          </span>,
          "effect",
        );
      }
    },
    [state.player, addLog, dispatch],
  );

  return {
    // Actions
    handleToggleSustained,
    handleUtilityCapability,

    // State shortcuts
    sustainedAbilities: state.player.sustainedAbilities,
    abilities: state.player.abilities,
  };
}
