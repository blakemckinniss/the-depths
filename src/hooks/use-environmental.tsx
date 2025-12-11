"use client";

import { useCallback, useState, useEffect } from "react";
import type {
  GameState,
  Item,
  ItemRarity,
  EnvironmentalEntity,
  ParsedNarrative,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import { getInteractionsForEntity } from "@/lib/world/environmental-system";
import { EntityText } from "@/components/narrative/entity-text";
import {
  decideEnvironmentalInteraction,
  decideExplorationChoices,
  resolveRewardTier,
  calculateItemValue,
  type EnvironmentalInteractionContext,
  type ExplorationChoicesContext,
} from "@/hooks/environmental-decision";
import type { AddLogFn, GenerateNarrativeFn, DynamicChoice } from "./types";

interface UseEnvironmentalOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  addLog: AddLogFn;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isAiGenerating: boolean;
  generateNarrative: GenerateNarrativeFn;
  currentNarrative: ParsedNarrative | null;
  generateId: () => string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEnvironmental({
  state,
  dispatch,
  addLog,
  isProcessing,
  setIsProcessing,
  isAiGenerating,
  generateNarrative,
  currentNarrative,
  generateId,
}: UseEnvironmentalOptions) {
  // Dynamic choices state
  const [dynamicChoices, setDynamicChoices] = useState<DynamicChoice[]>([]);
  const [choiceAtmosphere, setChoiceAtmosphere] = useState<string | null>(null);
  const [lastChoiceFetchRoom, setLastChoiceFetchRoom] = useState<string>("");

  // Fetch dynamic exploration choices from AI
  const fetchDynamicChoices = useCallback(async () => {
    const roomKey = `${state.floor}-${state.currentRoom}`;
    if (lastChoiceFetchRoom === roomKey) return;

    const result = await generateNarrative<{
      choices: DynamicChoice[];
      atmosphere: string;
    }>("exploration_choices", {
      floor: state.floor,
      roomNumber: state.currentRoom,
      dungeonName: state.currentDungeon?.name,
      dungeonTheme: state.currentDungeon?.theme,
      playerLevel: state.player.stats.level,
      playerClass: state.player.className || undefined,
      playerHealth: state.player.stats.health,
      maxHealth: state.player.stats.maxHealth,
      hasPotion: state.player.inventory.some((i) => i.type === "potion"),
      lowHealth: state.player.stats.health < state.player.stats.maxHealth * 0.5,
      entities: state.roomEnvironmentalEntities.filter((e) => !e.consumed).map((e) => ({
        name: e.name,
        entityClass: e.entityClass,
        interactionTags: e.interactionTags,
      })),
      roomNarrative: currentNarrative?.segments.map((s) => s.content).join(" "),
    });

    if (result?.choices) {
      setDynamicChoices(result.choices);
      setChoiceAtmosphere(result.atmosphere || null);
      setLastChoiceFetchRoom(roomKey);
    }
  }, [
    state.floor,
    state.currentRoom,
    state.currentDungeon,
    state.player,
    state.roomEnvironmentalEntities,
    currentNarrative,
    lastChoiceFetchRoom,
    generateNarrative,
  ]);

  // Fetch choices when entering exploration
  useEffect(() => {
    if (
      state.currentDungeon &&
      !state.inCombat &&
      !state.gameOver &&
      state.phase !== "trap_encounter" &&
      state.phase !== "shrine_choice" &&
      state.phase !== "npc_interaction" &&
      !state.pathOptions?.length &&
      !state.activeVault
    ) {
      fetchDynamicChoices();
    }
  }, [
    state.currentDungeon,
    state.inCombat,
    state.gameOver,
    state.phase,
    state.pathOptions,
    state.activeVault,
    state.currentRoom,
    fetchDynamicChoices,
  ]);

  // Clear dynamic choices when room changes or combat starts
  useEffect(() => {
    if (state.inCombat || state.phase === "trap_encounter") {
      setDynamicChoices([]);
      setChoiceAtmosphere(null);
    }
  }, [state.inCombat, state.phase]);

  // Handle environmental interaction
  const handleEnvironmentalInteraction = useCallback(
    async (entityId: string, interactionId: string) => {
      if (isProcessing || isAiGenerating) return;
      setIsProcessing(true);

      const entity = state.roomEnvironmentalEntities.find(
        (e) => e.id === entityId,
      );
      if (!entity) {
        setIsProcessing(false);
        return;
      }

      const interaction = entity.possibleInteractions.find(
        (i) => i.id === interactionId,
      );
      if (!interaction) {
        setIsProcessing(false);
        return;
      }

      // Handle capability-based interactions (spells, tool items, abilities)
      if (interaction.requiresCapability) {
        const capId = interaction.requiresCapability;

        // Check if it's a spell
        if (interaction.action === "cast_spell" && capId.startsWith("spell_")) {
          const spellId = capId.replace("spell_", "");
          const spell = state.player.spellBook?.spells.find(s => s.id === spellId);

          if (spell) {
            const newResources = { ...state.player.resources };
            newResources.current = Math.max(0, newResources.current - spell.resourceCost);

            const newCooldowns = { ...state.player.spellBook?.cooldowns };
            if (spell.cooldown > 0) {
              newCooldowns[spell.id] = spell.cooldown;
            }

            dispatch({
              type: "UPDATE_PLAYER",
              payload: {
                resources: newResources,
                spellBook: {
                  ...state.player.spellBook!,
                  cooldowns: newCooldowns,
                },
              },
            });

            addLog(
              <span className="text-violet-400">
                You cast <EntityText type="rare">{spell.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "effect",
            );
          }
        }

        // Check if it's a tool item
        if (interaction.action === "use_item" && capId.startsWith("item_")) {
          const itemId = capId.replace("item_", "");
          const item = state.player.inventory.find(i => i.id === itemId);

          if (item) {
            addLog(
              <span className="text-amber-400">
                You use your <EntityText type="uncommon">{item.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "narrative",
            );

            const consumableTools = ["torch", "holy_water"];
            if (item.subtype && consumableTools.includes(item.subtype as string)) {
              dispatch({ type: "REMOVE_ITEM", payload: item.id });
              addLog(
                <span className="text-stone-500 text-sm">
                  {item.name} was consumed.
                </span>,
                "system",
              );
            }
          }
        }

        // Check if it's an ability
        if (interaction.action === "use_ability" && capId.startsWith("ability_")) {
          const abilityId = capId.replace("ability_", "");
          const ability = state.player.abilities.find(a => a.id === abilityId);

          if (ability) {
            dispatch({ type: "USE_ABILITY", payload: ability.id });
            addLog(
              <span className="text-cyan-400">
                You use <EntityText type="uncommon">{ability.name}</EntityText> on the{" "}
                <EntityText type="item">{entity.name}</EntityText>...
              </span>,
              "effect",
            );
          }
        }
      }

      // Find if player has required item (for non-capability interactions)
      let itemUsed: string | undefined;
      if (interaction.requiresItem) {
        const foundItem = state.player.inventory.find((item) =>
          interaction.requiresItem!.some(
            (req) =>
              item.name.toLowerCase().includes(req.toLowerCase()) ||
              item.type.toLowerCase().includes(req.toLowerCase()),
          ),
        );
        itemUsed = foundItem?.name;
      }

      addLog(
        <span className="text-stone-400 italic">
          You {interaction.label.toLowerCase()} the{" "}
          <EntityText type="item">{entity.name}</EntityText>...
        </span>,
        "narrative",
      );

      // Generate AI outcome - NO FALLBACKS
      const interactionContext: EnvironmentalInteractionContext = {
        entity: {
          name: entity.name,
          entityClass: entity.entityClass as EnvironmentalInteractionContext["entity"]["entityClass"],
          description: entity.description,
          interactionTags: entity.interactionTags,
        },
        interaction: {
          action: interaction.action as EnvironmentalInteractionContext["interaction"]["action"],
          label: interaction.label,
          dangerLevel: interaction.dangerLevel as "safe" | "risky" | "dangerous" | undefined,
        },
        player: {
          class: state.player.className || undefined,
          level: state.player.stats.level,
          healthPercent: Math.round((state.player.stats.health / state.player.stats.maxHealth) * 100),
        },
        floor: state.floor,
        dungeonTheme: state.currentDungeon?.theme,
        itemUsed,
      };

      const result = await decideEnvironmentalInteraction(interactionContext);

      // Log the narration
      addLog(<span>{result.narration}</span>, "narrative");

      // Resolve tiers to actual values and apply effects (LEGO pattern)
      const { rewardTiers, item } = result;

      // Apply gold from tier
      if (rewardTiers.gold !== "none") {
        const goldAmount = resolveRewardTier("gold", rewardTiers.gold);
        dispatch({ type: "MODIFY_PLAYER_GOLD", payload: goldAmount });
        addLog(
          <span>
            Found <EntityText type="gold">{goldAmount} gold</EntityText>.
          </span>,
          "loot",
        );
      }

      // Apply healing from tier
      if (rewardTiers.healing !== "none") {
        const healAmount = resolveRewardTier("healing", rewardTiers.healing);
        dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: healAmount });
        addLog(
          <span>
            Restored <EntityText type="heal">{healAmount} health</EntityText>.
          </span>,
          "effect",
        );
      }

      // Apply damage from tier
      if (rewardTiers.damage !== "none") {
        const damageAmount = resolveRewardTier("damage", rewardTiers.damage);
        dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -damageAmount });
        addLog(
          <span>
            Took <EntityText type="damage">{damageAmount} damage</EntityText>!
          </span>,
          "combat",
        );
      }

      // Apply experience from tier
      if (rewardTiers.experience !== "none") {
        const xpAmount = resolveRewardTier("experience", rewardTiers.experience);
        dispatch({ type: "ADD_EXPERIENCE", payload: xpAmount });
      }

      // Add item if present
      if (item) {
        const newItem: Item = {
          id: `env_item_${Date.now()}`,
          name: item.name,
          entityType: item.type === "weapon" ? "weapon" : item.type === "armor" ? "armor" : "item",
          type: item.type,
          rarity: item.rarity,
          value: calculateItemValue(item.rarity, item.type),
          description: item.description,
          lore: item.lore,
          aiGenerated: true,
        };
        dispatch({ type: "ADD_ITEM", payload: newItem });
        addLog(
          <span>
            Acquired <EntityText type={item.rarity}>{item.name}</EntityText>.
          </span>,
          "loot",
        );
      }

      // Process any narrative effects (companion reactions)
      for (const effect of result.effects) {
        if (effect.effectType === "narrative") {
          const companion = state.player.party.active[0];
          if (companion) {
            addLog(
              <span className="text-teal-400/80 italic">
                {companion.name}: &quot;{effect.text}&quot;
              </span>,
              "dialogue",
            );
          }
        }
      }

      // Process entity consumption
      if (result.entityConsumed) {
        dispatch({
          type: "UPDATE_ROOM_ENTITY",
          payload: { id: entityId, changes: { consumed: true } },
        });
      }

      // Consume item if required
      if (interaction.consumesItem && itemUsed) {
        const itemToConsume = state.player.inventory.find(
          (i) => i.name === itemUsed,
        );
        if (itemToConsume) {
          dispatch({ type: "REMOVE_ITEM", payload: itemToConsume.id });
        }
        addLog(
          <span className="text-stone-500 text-sm">Used {itemUsed}.</span>,
          "system",
        );
      }

      // Add new entity if spawned
      if (result.newEntity) {
        const newEnvEntity: EnvironmentalEntity = {
          id: generateId(),
          name: result.newEntity.name || "Something",
          description: result.newEntity.description || "",
          entityClass: (result.newEntity.entityClass as EnvironmentalEntity["entityClass"]) || "object",
          interactionTags: result.newEntity.interactionTags || ["interactive"],
          possibleInteractions: [],
          consumed: false,
          revealed: true,
        };
        newEnvEntity.possibleInteractions = getInteractionsForEntity(newEnvEntity);
        dispatch({
          type: "SET_ROOM_ENTITIES",
          payload: [...state.roomEnvironmentalEntities, newEnvEntity],
        });
        addLog(
          <span>
            A <EntityText type="item">{newEnvEntity.name}</EntityText> is revealed.
          </span>,
          "narrative",
        );
      }

      setIsProcessing(false);
    },
    [state, addLog, isProcessing, isAiGenerating, setIsProcessing, dispatch, generateNarrative, generateId],
  );

  return {
    // State
    dynamicChoices,
    choiceAtmosphere,

    // Actions
    handleEnvironmentalInteraction,
    fetchDynamicChoices,

    // State setters (for external control)
    setDynamicChoices,
    setChoiceAtmosphere,
  };
}
