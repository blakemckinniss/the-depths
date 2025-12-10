"use client";

import { useState, useCallback } from "react";
import {
  discoverRecipe,
  generateItemLore,
  calculateSalvage,
  suggestEnchantments,
  type AlchemyResult,
  type ItemLore,
  type SalvageResult,
  type EnchantmentSuggestion,
  type AlchemyContext,
} from "@/lib/ai/ai-alchemy-system";
import type { Item } from "@/lib/core/game-types";
import type { MaterialItem } from "@/lib/materials/material-system";

// ============================================================================
// TYPES
// ============================================================================

interface UseAlchemyReturn {
  // State
  isDiscovering: boolean;
  isGeneratingLore: boolean;
  isCalculatingSalvage: boolean;
  isSuggestingEnchantments: boolean;

  // Actions
  performDiscovery: (
    materials: MaterialItem[],
    context?: AlchemyContext
  ) => Promise<AlchemyResult | null>;

  performLoreGeneration: (item: Item) => Promise<ItemLore | null>;

  performSalvageCalculation: (
    item: Item,
    context?: AlchemyContext
  ) => Promise<SalvageResult | null>;

  performEnchantmentSuggestion: (
    materials: MaterialItem[],
    context?: AlchemyContext
  ) => Promise<EnchantmentSuggestion | null>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for AI-powered alchemy operations
 * Wraps the ai-alchemy-system functions with loading state management
 */
export function useAlchemy(): UseAlchemyReturn {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [isCalculatingSalvage, setIsCalculatingSalvage] = useState(false);
  const [isSuggestingEnchantments, setIsSuggestingEnchantments] = useState(false);

  // Discover recipe from materials
  const performDiscovery = useCallback(
    async (materials: MaterialItem[], context?: AlchemyContext) => {
      setIsDiscovering(true);
      try {
        const result = await discoverRecipe(materials, context);
        return result;
      } catch (error) {
        console.error("Alchemy discovery failed:", error);
        return null;
      } finally {
        setIsDiscovering(false);
      }
    },
    []
  );

  // Generate lore for an item
  const performLoreGeneration = useCallback(async (item: Item) => {
    setIsGeneratingLore(true);
    try {
      const result = await generateItemLore(item);
      return result;
    } catch (error) {
      console.error("Lore generation failed:", error);
      return null;
    } finally {
      setIsGeneratingLore(false);
    }
  }, []);

  // Calculate salvage results
  const performSalvageCalculation = useCallback(
    async (item: Item, context?: AlchemyContext) => {
      setIsCalculatingSalvage(true);
      try {
        const result = await calculateSalvage(item, context);
        return result;
      } catch (error) {
        console.error("Salvage calculation failed:", error);
        return null;
      } finally {
        setIsCalculatingSalvage(false);
      }
    },
    []
  );

  // Suggest enchantments
  const performEnchantmentSuggestion = useCallback(
    async (materials: MaterialItem[], context?: AlchemyContext) => {
      setIsSuggestingEnchantments(true);
      try {
        const result = await suggestEnchantments(materials, context);
        return result;
      } catch (error) {
        console.error("Enchantment suggestion failed:", error);
        return null;
      } finally {
        setIsSuggestingEnchantments(false);
      }
    },
    []
  );

  return {
    // State
    isDiscovering,
    isGeneratingLore,
    isCalculatingSalvage,
    isSuggestingEnchantments,

    // Actions
    performDiscovery,
    performLoreGeneration,
    performSalvageCalculation,
    performEnchantmentSuggestion,
  };
}
