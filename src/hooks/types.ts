/**
 * Shared types for game hooks
 *
 * Centralizes common types used across multiple hooks to avoid
 * duplication and ensure type safety.
 */

import type { ReactNode } from "react";
import type { LogCategory } from "@/lib/ai/game-log-system";

/**
 * Context type for AI narrative generation.
 * Uses Record with specific value types instead of `any`.
 * Matches DungeonMasterContext signature.
 */
export type NarrativeContext = Record<
  string,
  string | number | boolean | undefined | object
>;

/**
 * Function type for generating AI narratives.
 * Used across combat, flee, environmental, and other hooks.
 */
export type GenerateNarrativeFn = <T>(
  type: string,
  context: NarrativeContext
) => Promise<T | null>;

/**
 * Function type for adding log entries.
 */
export type AddLogFn = (message: ReactNode, category: LogCategory) => void;

/**
 * Dynamic choice for exploration/interaction menus.
 */
export interface DynamicChoice {
  id: string;
  text: string;
  type: "explore" | "interact" | "investigate" | "rest" | "special";
  riskLevel?: "safe" | "risky" | "dangerous";
  hint?: string;
  entityTarget?: string;
}
