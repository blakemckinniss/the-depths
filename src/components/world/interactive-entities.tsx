"use client";

import type { Player, EnvironmentalEntity } from "@/lib/core/game-types";
import type { PlayerCapabilities } from "@/lib/mechanics/player-capabilities";
import { EntityText } from "@/components/narrative/entity-text";
import {
  getAvailableInteractions,
  getAllInteractionsForEntity,
} from "@/lib/world/environmental-system";
import { calculateForesight } from "@/lib/mechanics/foresight-system";

interface InteractiveEntitiesProps {
  entities: EnvironmentalEntity[];
  player: Player;
  playerCapabilities: PlayerCapabilities;
  isProcessing: boolean;
  onInteraction: (entityId: string, interactionId: string) => void;
}

// Risk border classes for foresight
function getRiskBorder(riskLevel: "safe" | "risky" | "dangerous" | undefined) {
  switch (riskLevel) {
    case "safe": return "border-l-2 border-l-green-500/60";
    case "risky": return "border-l-2 border-l-yellow-500/60";
    case "dangerous": return "border-l-2 border-l-red-500/60";
    default: return "";
  }
}

// Color for capability source
function getCapabilityColor(action: string) {
  if (action === "cast_spell") return "text-violet-400";
  if (action === "use_item") return "text-amber-400";
  if (action === "use_ability") return "text-cyan-400";
  return "text-stone-300";
}

export function InteractiveEntities({
  entities,
  player,
  playerCapabilities,
  isProcessing,
  onInteraction,
}: InteractiveEntitiesProps) {
  const activeEntities = entities.filter((e) => !e.consumed);
  if (activeEntities.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        Nearby:
      </span>
      <div className="space-y-2">
        {activeEntities.map((entity) => {
          // Get all interactions including capability-based ones (spells, items, abilities)
          const allInteractions = getAllInteractionsForEntity(entity, playerCapabilities);

          // Filter to available interactions
          const templateInteractions = getAvailableInteractions(entity, player);
          const availableTemplateIds = new Set(
            templateInteractions.filter(i => i.available).map(i => i.interaction.id)
          );

          // Combine: template interactions (filtered) + capability interactions (with availability)
          const availableInteractions = allInteractions.filter(interaction => {
            // Template interactions: check against filtered list
            if (!interaction.requiresCapability) {
              return availableTemplateIds.has(interaction.id);
            }
            // Capability interactions: check disabled flag
            return !interaction.disabled;
          });

          if (availableInteractions.length === 0) return null;

          // If only one interaction, show compact view
          if (availableInteractions.length === 1) {
            const interaction = availableInteractions[0];
            const foresight = calculateForesight(
              player,
              "environmental_interaction",
              interaction.action,
              entity.interactionTags || [],
            );
            const tooltip = interaction.hint || entity.description || entity.name;

            return (
              <button
                key={entity.id}
                onClick={() => onInteraction(entity.id, interaction.id)}
                disabled={isProcessing}
                className={`
                  text-xs px-2 py-1 rounded transition-colors
                  bg-secondary/30 hover:bg-secondary/50 text-foreground
                  ${foresight?.riskLevel ? getRiskBorder(foresight.riskLevel) : ""}
                `}
                title={tooltip}
              >
                <EntityText type="item" noAnimation>{entity.name}</EntityText>
                {interaction.requiresCapability && (
                  <span className={`ml-1 ${getCapabilityColor(interaction.action)}`}>
                    ({interaction.label})
                  </span>
                )}
              </button>
            );
          }

          // Multiple interactions: show entity with expandable options
          return (
            <div key={entity.id} className="bg-stone-800/30 rounded p-2 space-y-1">
              <div className="text-xs text-stone-400">
                <EntityText type="item" noAnimation>{entity.name}</EntityText>
              </div>
              <div className="flex flex-wrap gap-1">
                {availableInteractions.map((interaction) => {
                  const foresight = calculateForesight(
                    player,
                    "environmental_interaction",
                    interaction.action,
                    entity.interactionTags || [],
                  );
                  const isCapability = !!interaction.requiresCapability;

                  return (
                    <button
                      key={interaction.id}
                      onClick={() => onInteraction(entity.id, interaction.id)}
                      disabled={isProcessing}
                      className={`
                        text-xs px-2 py-0.5 rounded transition-colors
                        ${isCapability
                          ? "bg-stone-700/50 hover:bg-stone-600/50 border border-stone-600/50"
                          : "bg-secondary/30 hover:bg-secondary/50"
                        }
                        ${foresight?.riskLevel ? getRiskBorder(foresight.riskLevel) : ""}
                      `}
                      title={interaction.hint || interaction.label}
                    >
                      <span className={isCapability ? getCapabilityColor(interaction.action) : ""}>
                        {interaction.label}
                      </span>
                      {foresight && foresight.level !== "hidden" && (
                        <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                          foresight.level === "full" ? "bg-emerald-400" :
                          foresight.level === "partial" ? "bg-purple-400" :
                          foresight.level === "type" ? "bg-blue-400" :
                          "bg-yellow-400"
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
