"use client";

import { useState, useCallback, useMemo } from "react";
import { useAlchemy } from "@/hooks/use-alchemy";
import type { Item, Player } from "@/lib/core/game-types";
import type { MaterialItem, MaterialTag } from "@/lib/materials/material-system";
import {
  createAlchemyWorkbench,
  workbenchAddMaterial,
  workbenchRemoveMaterial,
  getRecipeHints,
  calculateMaterialSynergy,
  type AlchemyWorkbench as WorkbenchState,
  type AlchemyResult,
} from "@/lib/ai/ai-alchemy-system";

// =============================================================================
// TYPES
// =============================================================================

interface AlchemyWorkbenchProps {
  player: Player;
  floor: number;
  materials: MaterialItem[];
  onExperimentComplete: (result: AlchemyResult | null, materialsUsed: string[]) => void;
  onClose?: () => void;
}

type WorkbenchTab = "combine" | "lore" | "salvage";

// =============================================================================
// CONSTANTS
// =============================================================================

const TAG_COLORS: Record<string, string> = {
  holy: "bg-yellow-900/30 text-yellow-400",
  dark: "bg-purple-900/30 text-purple-400",
  elemental_fire: "bg-orange-900/30 text-orange-400",
  elemental_ice: "bg-cyan-900/30 text-cyan-400",
  catalyst: "bg-pink-900/30 text-pink-400",
  organic: "bg-green-900/30 text-green-400",
  metallic: "bg-gray-900/30 text-gray-400",
  magical: "bg-indigo-900/30 text-indigo-400",
};

const QUALITY_COLORS: Record<string, string> = {
  crude: "text-stone-500",
  normal: "text-stone-400",
  fine: "text-green-400",
  superior: "text-blue-400",
  pristine: "text-purple-400",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AlchemyWorkbench({
  player,
  floor,
  materials,
  onExperimentComplete,
  onClose,
}: AlchemyWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("combine");
  const [workbench, setWorkbench] = useState<WorkbenchState>(createAlchemyWorkbench);
  const [selectedLoreItem, setSelectedLoreItem] = useState<Item | null>(null);
  const [selectedSalvageItem, setSelectedSalvageItem] = useState<Item | null>(null);
  const [lastResult, setLastResult] = useState<AlchemyResult | null>(null);

  const {
    performDiscovery,
    performLoreGeneration,
    performSalvageCalculation,
    isDiscovering,
    isGeneratingLore,
    isCalculatingSalvage,
  } = useAlchemy();

  // Calculate synergy for current workbench
  const synergy = useMemo(() => {
    if (workbench.selectedMaterials.length < 2) return null;
    return calculateMaterialSynergy(workbench.selectedMaterials);
  }, [workbench.selectedMaterials]);

  // Get recipe hints for current materials
  const hints = useMemo(() => {
    if (workbench.selectedMaterials.length < 2) return [];
    return getRecipeHints(workbench.selectedMaterials);
  }, [workbench.selectedMaterials]);

  // Add material to workbench
  const handleAddMaterial = useCallback((material: MaterialItem) => {
    setWorkbench((prev) => workbenchAddMaterial(prev, material));
  }, []);

  // Remove material from workbench by index
  const handleRemoveMaterial = useCallback((index: number) => {
    setWorkbench((prev) => workbenchRemoveMaterial(prev, index));
  }, []);

  // Clear workbench
  const handleClear = useCallback(() => {
    setWorkbench(createAlchemyWorkbench());
    setLastResult(null);
  }, []);

  // Perform experiment
  const handleExperiment = useCallback(async () => {
    if (workbench.selectedMaterials.length < 2) return;

    const result = await performDiscovery(workbench.selectedMaterials, {
      playerClass: player.class ?? undefined,
      floor,
    });

    setLastResult(result);
    onExperimentComplete(
      result,
      workbench.selectedMaterials.map((m) => m.id)
    );

    // Clear workbench on success
    if (result?.success) {
      setWorkbench(createAlchemyWorkbench());
    }
  }, [workbench.selectedMaterials, performDiscovery, player.class, floor, onExperimentComplete]);

  // Generate lore for item
  const handleGenerateLore = useCallback(async () => {
    if (!selectedLoreItem) return;
    await performLoreGeneration(selectedLoreItem);
  }, [selectedLoreItem, performLoreGeneration]);

  // Calculate salvage
  const handleCalculateSalvage = useCallback(async () => {
    if (!selectedSalvageItem) return;
    await performSalvageCalculation(selectedSalvageItem, {
      playerClass: player.class ?? undefined,
      floor,
    });
  }, [selectedSalvageItem, performSalvageCalculation, player.class, floor]);

  // Available materials (not on workbench)
  const availableMaterials = useMemo(() => {
    const workbenchIds = new Set(workbench.selectedMaterials.map((m) => m.id));
    return materials.filter((m) => !workbenchIds.has(m.id));
  }, [materials, workbench.selectedMaterials]);

  return (
    <div className="bg-stone-900/95 border border-amber-900/50 rounded-lg p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-900/40 flex items-center justify-center text-xl">
            ⚗️
          </div>
          <div>
            <h2 className="text-amber-300 font-semibold">Alchemy Workbench</h2>
            <p className="text-stone-500 text-xs">Combine materials to discover new creations</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xl">
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["combine", "lore", "salvage"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-sm rounded transition-colors ${
              activeTab === tab
                ? "bg-amber-900/50 text-amber-300"
                : "bg-stone-800/50 text-stone-400 hover:text-stone-300"
            }`}
          >
            {tab === "combine" && "Combine"}
            {tab === "lore" && "Identify"}
            {tab === "salvage" && "Salvage"}
          </button>
        ))}
      </div>

      {/* Combine Tab */}
      {activeTab === "combine" && (
        <div className="space-y-4">
          {/* Workbench Slots */}
          <div className="bg-stone-800/30 rounded p-3">
            <div className="text-stone-500 text-xs uppercase mb-2">
              Workbench ({workbench.selectedMaterials.length}/5)
            </div>
            <div className="flex gap-2 min-h-[60px] flex-wrap">
              {workbench.selectedMaterials.map((mat, index) => (
                <button
                  key={mat.id}
                  onClick={() => handleRemoveMaterial(index)}
                  className="px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded text-sm hover:bg-amber-800/40 transition-colors"
                  title="Click to remove"
                >
                  <div className={QUALITY_COLORS[mat.quality] || "text-stone-400"}>{mat.name}</div>
                  <div className="text-stone-500 text-xs">T{mat.tier} {mat.quality}</div>
                </button>
              ))}
              {workbench.selectedMaterials.length === 0 && (
                <div className="text-stone-500 text-sm flex items-center">
                  Add materials below to begin experimenting...
                </div>
              )}
            </div>
          </div>

          {/* Synergy Display */}
          {synergy !== null && (
            <div
              className={`flex items-center justify-between p-2 rounded ${
                synergy.score > 0
                  ? "bg-green-900/20 border border-green-800/30"
                  : synergy.score < 0
                    ? "bg-red-900/20 border border-red-800/30"
                    : "bg-stone-800/30"
              }`}
            >
              <span className="text-stone-400 text-sm">Material Synergy:</span>
              <span
                className={
                  synergy.score > 0 ? "text-green-400" : synergy.score < 0 ? "text-red-400" : "text-stone-400"
                }
              >
                {synergy.score > 0 ? "+" : ""}
                {synergy.score}%
              </span>
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className="bg-stone-800/30 rounded p-2">
              <div className="text-amber-400/70 text-xs">
                {hints.map((hint, i) => (
                  <div key={i}>{hint}</div>
                ))}
              </div>
            </div>
          )}

          {/* Available Materials */}
          <div>
            <div className="text-stone-500 text-xs uppercase mb-2">Available Materials</div>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {availableMaterials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => handleAddMaterial(mat)}
                  disabled={workbench.selectedMaterials.length >= 5}
                  className="p-2 bg-stone-800/40 border border-stone-700 rounded text-xs text-left hover:bg-stone-700/40 transition-colors disabled:opacity-50"
                >
                  <div className={QUALITY_COLORS[mat.quality] || "text-stone-400"}>{mat.name}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {mat.tags.slice(0, 2).map((tag: MaterialTag) => (
                      <span
                        key={tag}
                        className={`px-1 rounded text-[10px] ${TAG_COLORS[tag] || "bg-stone-700 text-stone-400"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {availableMaterials.length === 0 && (
                <div className="col-span-3 text-center py-4 text-stone-500 text-sm">
                  No materials available
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-stone-800/50 text-stone-400 hover:text-stone-300 rounded transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleExperiment}
              disabled={workbench.selectedMaterials.length < 2 || isDiscovering}
              className="flex-1 py-2 bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscovering ? "Experimenting..." : "Experiment"}
            </button>
          </div>

          {/* Result Display */}
          {lastResult && (
            <div
              className={`p-3 rounded border ${
                lastResult.success
                  ? "bg-green-900/20 border-green-800/30"
                  : "bg-red-900/20 border-red-800/30"
              }`}
            >
              {lastResult.success && lastResult.result ? (
                <div>
                  <div className="text-green-400 font-medium mb-1">Success!</div>
                  <div className="text-stone-300">{lastResult.result.name}</div>
                  <div className="text-stone-500 text-sm">{lastResult.result.description}</div>
                </div>
              ) : (
                <div>
                  <div className="text-red-400 font-medium mb-1">Failed</div>
                  <div className="text-stone-400 text-sm">{lastResult.failure?.reason}</div>
                  {lastResult.failure?.hint && (
                    <div className="text-amber-400/70 text-xs mt-1">Hint: {lastResult.failure.hint}</div>
                  )}
                </div>
              )}
              <div className="text-stone-500 text-xs mt-2 italic">{lastResult.lore}</div>
            </div>
          )}
        </div>
      )}

      {/* Lore Tab */}
      {activeTab === "lore" && (
        <div className="space-y-4">
          <p className="text-stone-400 text-sm">
            Select an item to uncover its hidden history and properties.
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {player.inventory.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLoreItem(item)}
                className={`p-2 rounded border text-xs text-left transition-colors ${
                  selectedLoreItem?.id === item.id
                    ? "bg-amber-900/40 border-amber-500"
                    : "bg-stone-800/30 border-stone-700 hover:border-stone-600"
                }`}
              >
                <div className="truncate">{item.name}</div>
                <div className="text-stone-500">{item.rarity}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerateLore}
            disabled={!selectedLoreItem || isGeneratingLore}
            className="w-full py-2 bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingLore ? "Divining..." : "Reveal Lore"}
          </button>
        </div>
      )}

      {/* Salvage Tab */}
      {activeTab === "salvage" && (
        <div className="space-y-4">
          <p className="text-stone-400 text-sm">
            Analyze an item to predict what materials it will yield when salvaged.
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {player.inventory.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSalvageItem(item)}
                className={`p-2 rounded border text-xs text-left transition-colors ${
                  selectedSalvageItem?.id === item.id
                    ? "bg-amber-900/40 border-amber-500"
                    : "bg-stone-800/30 border-stone-700 hover:border-stone-600"
                }`}
              >
                <div className="truncate">{item.name}</div>
                <div className="text-stone-500">{item.rarity}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleCalculateSalvage}
            disabled={!selectedSalvageItem || isCalculatingSalvage}
            className="w-full py-2 bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculatingSalvage ? "Analyzing..." : "Analyze Salvage"}
          </button>
        </div>
      )}
    </div>
  );
}
