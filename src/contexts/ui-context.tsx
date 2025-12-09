"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ParsedNarrative } from "@/lib/game-types";

// ============================================================================
// UI STATE TYPES
// ============================================================================

interface LootContainer {
  id: string;
  name: string;
  contents: unknown[]; // Using unknown as the actual type may vary
  rarity?: string;
}

interface UIState {
  // Menu/modal states
  showMenu: boolean;
  showDevPanel: boolean;
  showClassSelect: boolean;

  // Encounter UI states
  activeLootContainer: LootContainer | null;
  npcDialogue: string;
  currentNarrative: ParsedNarrative | null;

  // Processing state
  isProcessing: boolean;

  // AI narration cache
  aiNarration: Record<string, string>;
}

interface UIContextValue extends UIState {
  // Menu toggles
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;

  // Dev panel toggles
  openDevPanel: () => void;
  closeDevPanel: () => void;
  toggleDevPanel: () => void;

  // Class select
  openClassSelect: () => void;
  closeClassSelect: () => void;

  // Loot container
  setActiveLootContainer: (container: LootContainer | null) => void;

  // NPC dialogue
  setNpcDialogue: (dialogue: string) => void;

  // Narrative
  setCurrentNarrative: (narrative: ParsedNarrative | null) => void;

  // Processing
  setIsProcessing: (isProcessing: boolean) => void;

  // AI narration
  setAiNarration: (key: string, value: string) => void;
  getAiNarration: (key: string) => string | undefined;
  clearAiNarration: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UIContext = createContext<UIContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  // Menu states
  const [showMenu, setShowMenu] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [showClassSelect, setShowClassSelect] = useState(false);

  // Encounter UI states
  const [activeLootContainer, setActiveLootContainer] =
    useState<LootContainer | null>(null);
  const [npcDialogue, setNpcDialogue] = useState("...");
  const [currentNarrative, setCurrentNarrative] =
    useState<ParsedNarrative | null>(null);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // AI narration cache
  const [aiNarration, setAiNarrationState] = useState<Record<string, string>>(
    {},
  );

  // Menu handlers
  const openMenu = useCallback(() => setShowMenu(true), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  const toggleMenu = useCallback(() => setShowMenu((prev) => !prev), []);

  // Dev panel handlers
  const openDevPanel = useCallback(() => setShowDevPanel(true), []);
  const closeDevPanel = useCallback(() => setShowDevPanel(false), []);
  const toggleDevPanel = useCallback(
    () => setShowDevPanel((prev) => !prev),
    [],
  );

  // Class select handlers
  const openClassSelect = useCallback(() => setShowClassSelect(true), []);
  const closeClassSelect = useCallback(() => setShowClassSelect(false), []);

  // AI narration handlers
  const setAiNarration = useCallback((key: string, value: string) => {
    setAiNarrationState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getAiNarration = useCallback(
    (key: string) => aiNarration[key],
    [aiNarration],
  );

  const clearAiNarration = useCallback(() => {
    setAiNarrationState({});
  }, []);

  const value: UIContextValue = {
    // State
    showMenu,
    showDevPanel,
    showClassSelect,
    activeLootContainer,
    npcDialogue,
    currentNarrative,
    isProcessing,
    aiNarration,

    // Menu
    openMenu,
    closeMenu,
    toggleMenu,

    // Dev panel
    openDevPanel,
    closeDevPanel,
    toggleDevPanel,

    // Class select
    openClassSelect,
    closeClassSelect,

    // Loot container
    setActiveLootContainer,

    // NPC dialogue
    setNpcDialogue,

    // Narrative
    setCurrentNarrative,

    // Processing
    setIsProcessing,

    // AI narration
    setAiNarration,
    getAiNarration,
    clearAiNarration,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}

// Convenience hooks for specific UI concerns
export function useMenu() {
  const { showMenu, openMenu, closeMenu, toggleMenu } = useUI();
  return { showMenu, openMenu, closeMenu, toggleMenu };
}

export function useDevPanel() {
  const { showDevPanel, openDevPanel, closeDevPanel, toggleDevPanel } = useUI();
  return { showDevPanel, openDevPanel, closeDevPanel, toggleDevPanel };
}

export function useClassSelect() {
  const { showClassSelect, openClassSelect, closeClassSelect } = useUI();
  return { showClassSelect, openClassSelect, closeClassSelect };
}

export function useProcessing() {
  const { isProcessing, setIsProcessing } = useUI();
  return { isProcessing, setIsProcessing };
}

export function useNarrative() {
  const { currentNarrative, setCurrentNarrative, aiNarration, setAiNarration } =
    useUI();
  return { currentNarrative, setCurrentNarrative, aiNarration, setAiNarration };
}
