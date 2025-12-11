"use client";

import { useMemo } from "react";
import type { GameState, GameChoice, Enemy, Item } from "@/lib/core/game-types";
import { canTameEnemy } from "@/lib/entity/companion-system";

// DynamicChoice type matches use-environmental.tsx
interface DynamicChoice {
  id: string;
  text: string;
  type: "explore" | "interact" | "investigate" | "rest" | "special";
  riskLevel?: "safe" | "risky" | "dangerous";
  hint?: string;
  entityTarget?: string;
}

interface UseChoicesOptions {
  gameState: GameState;
  isProcessing: boolean;
  isAiGenerating: boolean;
  dynamicChoices: DynamicChoice[];
  // Action callbacks
  playerAttack: () => void;
  attemptFlee: () => void;
  consumePotion: (potion: Item) => void;
  exploreRoom: () => void;
  descendFloor: () => void;
  handleTameEnemy: () => void;
  handleEnvironmentalInteraction: (entityId: string, action: string) => void;
}

export function useChoices({
  gameState,
  isProcessing,
  isAiGenerating,
  dynamicChoices,
  playerAttack,
  attemptFlee,
  consumePotion,
  exploreRoom,
  descendFloor,
  handleTameEnemy,
  handleEnvironmentalInteraction,
}: UseChoicesOptions) {
  const currentChoices = useMemo(() => {
    const potion = gameState.player.inventory.find((i) => i.type === "potion");

    if (gameState.gameOver) {
      return []; // Death screen handles this now
    }

    if (gameState.phase === "dungeon_select" || gameState.phase === "tavern") {
      return [];
    }

    if (
      gameState.phase === "trap_encounter" ||
      gameState.phase === "shrine_choice" ||
      gameState.phase === "npc_interaction"
    ) {
      return [];
    }

    if (gameState.pathOptions && gameState.pathOptions.length > 0) {
      return [];
    }

    if (gameState.inCombat && gameState.currentEnemy) {
      const choices: GameChoice[] = [
        {
          id: "attack",
          text: "Attack",
          action: playerAttack,
          disabled: isProcessing,
        },
        {
          id: "flee",
          text: gameState.currentHazard?.effects.fleeDisabled
            ? "Flee (Blocked)"
            : "Flee",
          action: attemptFlee,
          tooltip: gameState.currentHazard?.effects.fleeDisabled
            ? "Cannot flee due to hazard"
            : `~${Math.floor((0.4 + gameState.player.stats.level * 0.05) * 100)}%`,
          disabled:
            isProcessing || gameState.currentHazard?.effects.fleeDisabled,
        },
      ];

      if (
        potion &&
        gameState.player.stats.health < gameState.player.stats.maxHealth
      ) {
        choices.push({
          id: "potion",
          text: `Use ${potion.name}`,
          action: () => consumePotion(potion),
          disabled: isProcessing,
        });
      }

      // Taming option - available when enemy HP is low enough
      const tameCheck = canTameEnemy(gameState.currentEnemy as Enemy, gameState.player);
      if (tameCheck.canTame) {
        choices.push({
          id: "tame",
          text: "Tame",
          action: handleTameEnemy,
          tooltip: `${Math.floor(tameCheck.chance * 100)}% success chance`,
          disabled: isProcessing,
        });
      }

      return choices;
    }

    if (!gameState.inCombat && gameState.currentDungeon) {
      const explorationChoices: GameChoice[] = [];

      // Use AI-generated dynamic choices if available
      if (dynamicChoices.length > 0) {
        for (const choice of dynamicChoices) {
          // Map AI choice types to game actions
          let action: () => void;
          let tooltip: string | undefined;

          switch (choice.type) {
            case "explore":
              action = exploreRoom;
              break;
            case "interact":
              // Find entity to interact with
              if (choice.entityTarget) {
                const entity = gameState.roomEnvironmentalEntities.find(
                  (e) => e.name.toLowerCase().includes(choice.entityTarget!.toLowerCase()) ||
                         e.id === choice.entityTarget
                );
                if (entity && !entity.consumed) {
                  action = () => handleEnvironmentalInteraction(entity.id, entity.possibleInteractions?.[0]?.action || "examine");
                } else {
                  action = exploreRoom; // Fallback
                }
              } else {
                action = exploreRoom;
              }
              break;
            case "investigate":
              action = exploreRoom; // Investigation triggers room exploration
              break;
            case "rest":
              if (potion) {
                action = () => consumePotion(potion);
              } else {
                action = exploreRoom;
              }
              break;
            case "special":
            default:
              action = exploreRoom;
          }

          // Add risk hint as tooltip
          if (choice.hint) {
            tooltip = choice.hint;
          }

          explorationChoices.push({
            id: choice.id,
            text: choice.text,
            action,
            tooltip,
            disabled: isProcessing,
            riskLevel: choice.riskLevel,
          });
        }
      } else {
        // Fallback to static choice while AI is loading
        explorationChoices.push({
          id: "explore",
          text: isAiGenerating ? "..." : "Explore Deeper",
          action: exploreRoom,
          disabled: isProcessing || isAiGenerating,
        });
      }

      // Always add descend option when available (not AI-dependent)
      const maxFloors = gameState.currentDungeon.floors;
      if (gameState.currentRoom > 0 && gameState.currentRoom % 5 === 0) {
        const isLastFloor = gameState.floor >= maxFloors;
        // Only add if not already present from AI
        if (!explorationChoices.some((c) => c.id === "descend")) {
          explorationChoices.push({
            id: "descend",
            text: isLastFloor
              ? "Claim Victory & Exit"
              : `Descend to Floor ${gameState.floor + 1}`,
            action: descendFloor,
            disabled: isProcessing,
          });
        }
      }

      return explorationChoices;
    }

    // Title screen choices are handled in the return statement now
    if (gameState.phase === "title") {
      return [];
    }

    return [];
  }, [
    gameState,
    isProcessing,
    isAiGenerating,
    dynamicChoices,
    playerAttack,
    attemptFlee,
    consumePotion,
    exploreRoom,
    descendFloor,
    handleTameEnemy,
    handleEnvironmentalInteraction,
  ]);

  return { currentChoices };
}
