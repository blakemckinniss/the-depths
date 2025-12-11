"use client";

import type { GameState, LogEntry } from "@/lib/core/game-types";
import type { WorldState } from "@/lib/world/world-state";
import type { ChaosEvent } from "@/lib/world/chaos-system";
import type { SaveData } from "@/lib/persistence/save-system";
import { GameMenu } from "./game-menu";

interface TitleScreenProps {
  hasExistingSaves: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onLoadGame: () => void;
  showMenu: boolean;
  onMenuClose: () => void;
  gameState: GameState;
  worldState: WorldState;
  logs: LogEntry[];
  chaosEvents: ChaosEvent[];
  onLoad: (data: SaveData) => void;
  onReturnToTitle: () => void;
}

export function TitleScreen({
  hasExistingSaves,
  onContinue,
  onNewGame,
  onLoadGame,
  showMenu,
  onMenuClose,
  gameState,
  worldState,
  logs,
  chaosEvents,
  onLoad,
  onReturnToTitle,
}: TitleScreenProps) {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-amber-100 tracking-wider">
            DEPTHS OF SHADOW
          </h1>
          <p className="text-stone-500 text-sm tracking-widest uppercase">
            A Text-Based Dungeon Crawler
          </p>
        </div>

        <div className="space-y-2 pt-4">
          {hasExistingSaves && (
            <button
              onClick={onContinue}
              className="block w-48 mx-auto px-6 py-3 bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-200 transition-colors"
            >
              Continue
            </button>
          )}

          <button
            onClick={onNewGame}
            className="block w-48 mx-auto px-6 py-3 bg-amber-900/50 hover:bg-amber-800/50 text-amber-200 transition-colors"
          >
            New Game
          </button>

          {hasExistingSaves && (
            <button
              onClick={onLoadGame}
              className="block w-48 mx-auto px-6 py-3 bg-stone-800/50 hover:bg-stone-700/50 text-stone-300 transition-colors"
            >
              Load Game
            </button>
          )}
        </div>

        <p className="text-stone-600 text-xs pt-8">
          Press any key or click to begin your descent...
        </p>
      </div>

      {showMenu && (
        <GameMenu
          isOpen={true}
          onClose={onMenuClose}
          gameState={gameState}
          worldState={worldState}
          logs={logs}
          chaosEvents={chaosEvents}
          onLoad={onLoad}
          onReturnToTitle={onReturnToTitle}
        />
      )}
    </div>
  );
}
