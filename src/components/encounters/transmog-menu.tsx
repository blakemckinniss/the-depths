"use client";

import { useState, useCallback, useMemo } from "react";
import type { Item, Player } from "@/lib/core/game-types";
import {
  transmogrifyItem,
  batchTransmogrify,
  getEssenceRecipes,
  canCraftRecipe,
  craftFromEssence,
  type EssenceType,
  type MagicalEssence,
  type TransmogResult,
  type EssenceCraftRecipe,
} from "@/lib/items/transmogrification-system";

// =============================================================================
// TYPES
// =============================================================================

interface TransmogMenuProps {
  player: Player;
  onTransmogrify: (itemIds: string[], narrations: string[]) => void;
  onCraftFromEssence: (recipe: EssenceCraftRecipe, result: Item | null) => void;
  onClose?: () => void;
}

type TransmogTab = "transmog" | "essence" | "recipes";

// =============================================================================
// CONSTANTS
// =============================================================================

const ESSENCE_COLORS: Record<EssenceType, string> = {
  arcane: "text-purple-400 bg-purple-900/30",
  primal: "text-green-400 bg-green-900/30",
  shadow: "text-gray-400 bg-gray-900/30",
  elemental: "text-orange-400 bg-orange-900/30",
  martial: "text-red-400 bg-red-900/30",
  vital: "text-pink-400 bg-pink-900/30",
  void: "text-indigo-400 bg-indigo-900/30",
};

const ESSENCE_ICONS: Record<EssenceType, string> = {
  arcane: "✨",
  primal: "🌿",
  shadow: "🌑",
  elemental: "🔥",
  martial: "⚔️",
  vital: "💗",
  void: "🕳️",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-stone-400 border-stone-600",
  uncommon: "text-green-400 border-green-600",
  rare: "text-blue-400 border-blue-600",
  legendary: "text-amber-400 border-amber-600",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function TransmogMenu({
  player,
  onTransmogrify,
  onCraftFromEssence,
  onClose,
}: TransmogMenuProps) {
  const [activeTab, setActiveTab] = useState<TransmogTab>("transmog");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastNarrations, setLastNarrations] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Convert player essence to Map for recipe checking
  const essenceMap = useMemo(() => {
    const map = new Map<EssenceType, MagicalEssence>();
    for (const [type, amount] of Object.entries(player.essence)) {
      if (amount > 0) {
        map.set(type as EssenceType, {
          id: type,
          type: type as EssenceType,
          amount,
          purity: 3, // Default purity
          sourceRarity: "uncommon",
        });
      }
    }
    return map;
  }, [player.essence]);

  // Get available recipes
  const recipes = useMemo(() => getEssenceRecipes(), []);

  // Get equipped item IDs to exclude
  const equippedIds = useMemo(() => {
    const ids = new Set<string>();
    const eq = player.equipment;
    if (eq.mainHand) ids.add(eq.mainHand.id);
    if (eq.offHand) ids.add(eq.offHand.id);
    if (eq.head) ids.add(eq.head.id);
    if (eq.chest) ids.add(eq.chest.id);
    if (eq.legs) ids.add(eq.legs.id);
    if (eq.feet) ids.add(eq.feet.id);
    if (eq.hands) ids.add(eq.hands.id);
    return ids;
  }, [player.equipment]);

  // Transmog-eligible items (not equipped)
  const eligibleItems = useMemo(() => {
    return player.inventory.filter((item) => !equippedIds.has(item.id));
  }, [player.inventory, equippedIds]);

  // Handle item selection toggle
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Handle select all
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(eligibleItems.map((i) => i.id)));
  }, [eligibleItems]);

  // Handle clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Handle transmogrification
  const handleTransmogrify = useCallback(() => {
    if (selectedItems.size === 0) return;

    setIsProcessing(true);

    const itemsToTransmog = eligibleItems.filter((i) => selectedItems.has(i.id));

    if (itemsToTransmog.length === 1) {
      const result = transmogrifyItem(itemsToTransmog[0]);
      setLastNarrations([result.narration]);
      onTransmogrify([itemsToTransmog[0].id], [result.narration]);
    } else {
      const batchResult = batchTransmogrify(itemsToTransmog);
      setLastNarrations(batchResult.narrations);
      onTransmogrify(
        itemsToTransmog.map((i) => i.id),
        batchResult.narrations
      );
    }

    setSelectedItems(new Set());
    setIsProcessing(false);
  }, [selectedItems, eligibleItems, onTransmogrify]);

  // Handle recipe crafting
  const handleCraft = useCallback(
    (recipe: EssenceCraftRecipe) => {
      if (!canCraftRecipe(recipe, essenceMap)) return;

      const result = craftFromEssence(recipe, essenceMap);
      if (result.success && result.result) {
        onCraftFromEssence(recipe, result.result as Item);
      }
    },
    [essenceMap, onCraftFromEssence]
  );

  // Calculate total essence from selection
  const selectionPreview = useMemo(() => {
    if (selectedItems.size === 0) return null;

    const items = eligibleItems.filter((i) => selectedItems.has(i.id));
    const totalValue = items.reduce((sum, item) => {
      const rarityMult =
        item.rarity === "legendary" ? 20 : item.rarity === "rare" ? 8 : item.rarity === "uncommon" ? 3 : 1;
      return sum + rarityMult;
    }, 0);

    return {
      itemCount: items.length,
      estimatedEssence: totalValue,
    };
  }, [selectedItems, eligibleItems]);

  return (
    <div className="bg-stone-900/95 border border-purple-900/50 rounded-lg p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center text-xl">
            🔮
          </div>
          <div>
            <h2 className="text-purple-300 font-semibold">Transmogrification Altar</h2>
            <p className="text-stone-500 text-xs">Convert items to essence and craft powerful artifacts</p>
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
        {(["transmog", "essence", "recipes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-sm rounded transition-colors ${
              activeTab === tab
                ? "bg-purple-900/50 text-purple-300"
                : "bg-stone-800/50 text-stone-400 hover:text-stone-300"
            }`}
          >
            {tab === "transmog" && "Transmog"}
            {tab === "essence" && "Essence"}
            {tab === "recipes" && "Recipes"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "transmog" && (
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={selectAll}
              className="px-2 py-1 bg-stone-800/50 text-stone-400 hover:text-stone-300 rounded"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-2 py-1 bg-stone-800/50 text-stone-400 hover:text-stone-300 rounded"
            >
              Clear
            </button>
            <span className="text-stone-500 ml-auto">
              {selectedItems.size} / {eligibleItems.length} selected
            </span>
          </div>

          {/* Item Grid */}
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
            {eligibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItemSelection(item.id)}
                className={`p-2 rounded border text-xs text-left transition-colors ${
                  selectedItems.has(item.id)
                    ? "bg-purple-900/40 border-purple-500"
                    : `bg-stone-800/30 ${RARITY_COLORS[item.rarity] || "border-stone-700"}`
                }`}
              >
                <div className="truncate">{item.name}</div>
                <div className="text-stone-500 text-[10px]">{item.rarity}</div>
              </button>
            ))}
            {eligibleItems.length === 0 && (
              <div className="col-span-4 text-center py-8 text-stone-500">
                No items available for transmogrification
              </div>
            )}
          </div>

          {/* Selection Preview */}
          {selectionPreview && (
            <div className="bg-stone-800/30 rounded p-3 text-sm">
              <div className="flex justify-between text-stone-400">
                <span>Items to transmog:</span>
                <span className="text-purple-300">{selectionPreview.itemCount}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Estimated essence:</span>
                <span className="text-purple-300">~{selectionPreview.estimatedEssence}</span>
              </div>
            </div>
          )}

          {/* Transmog Button */}
          <button
            onClick={handleTransmogrify}
            disabled={selectedItems.size === 0 || isProcessing}
            className="w-full py-3 bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : `Transmogrify ${selectedItems.size} Item(s)`}
          </button>

          {/* Last Results */}
          {lastNarrations.length > 0 && (
            <div className="bg-stone-800/30 rounded p-3 space-y-2">
              <div className="text-stone-500 text-xs uppercase">Results</div>
              {lastNarrations.slice(0, 3).map((narration, i) => (
                <div key={i} className="text-sm text-green-400">
                  {narration}
                </div>
              ))}
              {lastNarrations.length > 3 && (
                <div className="text-stone-500 text-xs">...and {lastNarrations.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "essence" && (
        <div className="space-y-4">
          <div className="text-stone-400 text-sm mb-2">Your collected essence:</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(player.essence) as [EssenceType, number][])
              .filter(([, amount]) => amount > 0)
              .map(([type, amount]) => (
                <div
                  key={type}
                  className={`flex items-center gap-2 p-2 rounded ${ESSENCE_COLORS[type]}`}
                >
                  <span className="text-lg">{ESSENCE_ICONS[type]}</span>
                  <div>
                    <div className="capitalize text-sm">{type}</div>
                    <div className="text-xs opacity-70">{amount} units</div>
                  </div>
                </div>
              ))}
            {Object.values(player.essence).every((v) => !v || v === 0) && (
              <div className="col-span-2 text-center py-8 text-stone-500">
                No essence collected. Transmogrify items to gain essence.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "recipes" && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recipes.map((recipe) => {
            const canCraft = canCraftRecipe(recipe, essenceMap);
            return (
              <div
                key={recipe.id}
                className={`p-3 rounded border ${
                  canCraft ? "bg-stone-800/40 border-purple-700/50" : "bg-stone-900/30 border-stone-800"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className={canCraft ? "text-purple-300" : "text-stone-400"}>
                      {recipe.name}
                    </div>
                    <div className="text-stone-500 text-xs">{recipe.description}</div>
                  </div>
                  <button
                    onClick={() => handleCraft(recipe)}
                    disabled={!canCraft}
                    className="px-3 py-1 text-xs bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Craft
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {recipe.requirements.map((req, i) => {
                    const hasEnough = (player.essence[req.type] || 0) >= req.amount;
                    return (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded ${
                          hasEnough ? ESSENCE_COLORS[req.type] : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {ESSENCE_ICONS[req.type]} {req.amount} {req.type}
                        {req.minPurity && ` (${req.minPurity}★)`}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
