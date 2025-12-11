"use client";

import { useCallback, useState, useEffect, type ReactNode } from "react";
import type {
  GameState,
  Item,
  ItemRarity,
  EnvironmentalEntity,
  ParsedNarrative,
} from "@/lib/core/game-types";
import type { Dispatch } from "react";
import type { GameAction } from "@/contexts/game-reducer";
import type { LogCategory } from "@/lib/ai/game-log-system";
import { getInteractionsForEntity } from "@/lib/world/environmental-system";
import { EntityText } from "@/components/narrative/entity-text";

// ============================================================================
// TYPES
// ============================================================================

type AddLogFn = (message: ReactNode, category: LogCategory) => void;

interface DynamicChoice {
  id: string;
  text: string;
  type: "explore" | "interact" | "investigate" | "rest" | "special";
  riskLevel?: "safe" | "risky" | "dangerous";
  hint?: string;
  entityTarget?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenerateNarrativeFn = <T>(type: string, context: any) => Promise<T | null>;

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

      // Generate AI outcome
      const result = (await generateNarrative<{
        narration: string;
        rewards: {
          gold?: number;
          healing?: number;
          damage?: number;
          experience?: number;
          item?: {
            name?: string;
            type?: string;
            rarity?: ItemRarity;
            description?: string;
            lore?: string;
          };
        };
        consequences: { entityConsumed: boolean };
        companionReaction?: string;
        newEntity?: {
          name: string;
          entityClass: string;
          description: string;
          interactionTags: string[];
        };
      }>("environmental_interaction", {
        entityName: entity.name,
        entityClass: entity.entityClass,
        entityDescription: entity.description,
        entityTags: entity.interactionTags,
        interactionAction: interaction.action,
        interactionLabel: interaction.label,
        dangerLevel: interaction.dangerLevel,
        itemUsed,
        playerLevel: state.player.stats.level,
        floor: state.floor,
      })) ?? {
        narration: "The object reacts to your interaction.",
        rewards: { gold: Math.floor(Math.random() * 10) + 1 },
        consequences: { entityConsumed: true },
      };

      if (result) {
        addLog(<span>{result.narration}</span>, "narrative");

        // Process rewards
        if (result.rewards) {
          if (result.rewards.gold && result.rewards.gold > 0) {
            dispatch({ type: "MODIFY_PLAYER_GOLD", payload: result.rewards.gold });
            addLog(
              <span>
                Found <EntityText type="gold">{result.rewards.gold} gold</EntityText>.
              </span>,
              "loot",
            );
          }

          if (result.rewards.healing && result.rewards.healing > 0) {
            dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: result.rewards.healing });
            addLog(
              <span>
                Restored <EntityText type="heal">{result.rewards.healing} health</EntityText>.
              </span>,
              "effect",
            );
          }

          if (result.rewards.damage && result.rewards.damage > 0) {
            dispatch({ type: "MODIFY_PLAYER_HEALTH", payload: -result.rewards.damage });
            addLog(
              <span>
                Took <EntityText type="damage">{result.rewards.damage} damage</EntityText>!
              </span>,
              "combat",
            );
          }

          if (result.rewards.item) {
            const newItem: Item = {
              id: generateId(),
              name: result.rewards.item.name || "Mysterious Object",
              entityType: "item",
              type: (result.rewards.item.type as Item["type"]) || "misc",
              rarity: result.rewards.item.rarity || "common",
              value: 10,
              description: result.rewards.item.description,
              lore: result.rewards.item.lore,
            };
            dispatch({ type: "ADD_ITEM", payload: newItem });
            addLog(
              <span>
                Acquired <EntityText type={newItem.rarity}>{newItem.name}</EntityText>.
              </span>,
              "loot",
            );
          }

          if (result.rewards.experience && result.rewards.experience > 0) {
            dispatch({ type: "ADD_EXPERIENCE", payload: result.rewards.experience });
          }
        }

        // Process consequences
        if (result.consequences?.entityConsumed) {
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

        // Companion reaction
        if (result.companionReaction && state.player.party.active.length > 0) {
          const companion = state.player.party.active[0];
          addLog(
            <span className="text-teal-400/80 italic">
              {companion.name}: &quot;{result.companionReaction}&quot;
            </span>,
            "dialogue",
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
