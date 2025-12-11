"use client";

import type {
  GameState,
  Boss,
  PathOption,
  Item,
  GameChoice,
  Ability,
  SustainedAbility,
  Spell,
  LogEntry,
  ParsedNarrative,
  CombatStance,
} from "@/lib/core/game-types";
import type { LootContainer } from "@/lib/ai/ai-drops-system";
import type { PlayerCapabilities, PlayerCapability } from "@/lib/mechanics/player-capabilities";
import { GameLog } from "./game-log";
import { ChoiceButtons } from "@/components/narrative/choice-buttons";
import { CombatDisplay } from "@/components/combat/combat-display";
import { BossEncounter } from "@/components/encounters/boss-encounter";
import { VaultEncounter, type VaultAction } from "@/components/encounters/vault-encounter";
import { AbilityBar } from "@/components/combat/ability-bar";
import { ComboDisplay } from "@/components/combat/combo-display";
import { SpellBar } from "@/components/combat/spell-bar";
import { PathSelect } from "@/components/world/path-select";
import { LocationHeader } from "@/components/world/location-header";
import { InteractiveEntities } from "@/components/world/interactive-entities";
import { UtilityBar } from "@/components/world/utility-bar";
import { HazardDisplay } from "@/components/world/hazard-display";
import { EnvironmentalIndicator } from "@/components/world/environmental-indicator";
import { StatusEffectsDisplay } from "@/components/effects/status-effects-display";
import { TrapInteraction } from "@/components/encounters/trap-interaction";
import { ShrineInteraction } from "@/components/encounters/shrine-interaction";
import { NPCDialogue } from "@/components/encounters/npc-dialogue";
import { InteractiveNarrative } from "@/components/narrative/interactive-narrative";
import { LootContainerReveal } from "@/components/inventory/loot-container-reveal";

interface NPCOption {
  id: string;
  text: string;
  action: "talk" | "trade" | "help" | "attack" | "leave";
  disabled?: boolean;
  cost?: { gold?: number };
}

interface DungeonContentProps {
  // Core state
  gameState: GameState;
  logs: LogEntry[];
  isProcessing: boolean;
  isAiGenerating: boolean;

  // Narrative
  currentNarrative: ParsedNarrative | null;
  currentChoices: GameChoice[];
  choiceAtmosphere: string | null;

  // Encounters
  activeLootContainer: LootContainer | null;
  npcDialogue: string | null;
  npcOptions: NPCOption[];

  // Capabilities
  playerCapabilities: PlayerCapabilities;
  hasSpells: boolean;

  // Combat handlers
  onChangeStance: (stance: CombatStance) => void;
  onUseAbility: (ability: Ability) => void;
  onToggleSustained: (ability: SustainedAbility) => void;
  onCastSpell: (spell: Spell) => void;
  onBossAction: (choice: "attack" | "defend" | "flee" | "parley") => void;

  // Encounter handlers
  onTrapAction: (action: "disarm" | "trigger" | "avoid") => void;
  onShrineAction: (choice: "accept" | "decline" | "desecrate" | "seek_blessing") => void;
  onNPCChoice: (optionId: string) => void;
  onLootContainerComplete: (items: Item[], goldAmount: number, curseTriggered?: boolean, curseEffect?: string) => void;
  onLootContainerCancel: () => void;
  onVaultAction: (action: VaultAction) => void;

  // Navigation handlers
  onSelectPath: (path: PathOption) => void;

  // Interaction handlers
  onEnvironmentalInteraction: (entityId: string, action: string) => void;
  onUtilityCapability: (capability: PlayerCapability) => void;
}

export function DungeonContent({
  gameState,
  logs,
  isProcessing,
  isAiGenerating,
  currentNarrative,
  currentChoices,
  choiceAtmosphere,
  activeLootContainer,
  npcDialogue,
  npcOptions,
  playerCapabilities,
  hasSpells,
  onChangeStance,
  onUseAbility,
  onToggleSustained,
  onCastSpell,
  onBossAction,
  onTrapAction,
  onShrineAction,
  onNPCChoice,
  onLootContainerComplete,
  onLootContainerCancel,
  onVaultAction,
  onSelectPath,
  onEnvironmentalInteraction,
  onUtilityCapability,
}: DungeonContentProps) {
  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Location Header */}
      {gameState.currentDungeon && (
        <LocationHeader
          dungeon={gameState.currentDungeon}
          floor={gameState.floor}
          currentRoom={gameState.currentRoom}
        />
      )}

      {/* Environmental Indicator - shows dungeon theme hazards */}
      {gameState.currentDungeon && !gameState.inCombat && (
        <EnvironmentalIndicator
          dungeon={gameState.currentDungeon}
          activeEffects={gameState.player.activeEffects}
          className="mb-3"
        />
      )}

      {/* Persistent Status Effects - ALWAYS visible in main area */}
      {gameState.player.activeEffects.length > 0 && (
        <div className="mb-3 p-2 bg-stone-800/60 rounded border border-stone-700/50">
          <div className="text-xs text-muted-foreground mb-1">Active Effects</div>
          <StatusEffectsDisplay effects={gameState.player.activeEffects} compact />
        </div>
      )}

      {/* Game Log + Choices */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-sm leading-snug">
        {currentNarrative ? (
          <InteractiveNarrative
            narrative={currentNarrative}
            entities={gameState.roomEnvironmentalEntities}
            player={gameState.player}
            onInteract={onEnvironmentalInteraction}
            disabled={isProcessing || isAiGenerating}
          />
        ) : (
          <GameLog logs={logs} />
        )}

        {/* Choices flow directly after narrative */}
        {currentChoices.length > 0 && (
          <div className="mt-4">
            <ChoiceButtons
              choices={currentChoices}
              disabled={isProcessing}
              atmosphere={gameState.inCombat ? null : choiceAtmosphere}
            />
          </div>
        )}

        {isProcessing && !gameState.inCombat && (
          <div className="text-center text-stone-500 text-sm mt-2 animate-pulse">
            The dungeon stirs...
          </div>
        )}

        {!gameState.inCombat && gameState.currentHazard && (
          <div className="mb-3">
            <HazardDisplay
              hazard={gameState.currentHazard}
              isMitigated={gameState.currentHazard.mitigatedBy?.includes(
                gameState.player.class || "",
              )}
            />
          </div>
        )}

        {gameState.phase === "trap_encounter" && gameState.activeTrap && (
          <TrapInteraction
            trap={gameState.activeTrap}
            player={gameState.player}
            onAction={onTrapAction}
            disabled={isProcessing}
          />
        )}

        {gameState.phase === "shrine_choice" && gameState.activeShrine && (
          <ShrineInteraction
            shrine={gameState.activeShrine}
            player={gameState.player}
            onInteract={onShrineAction}
            isProcessing={isProcessing}
          />
        )}

        {gameState.phase === "npc_interaction" && gameState.activeNPC && (
          <NPCDialogue
            npc={gameState.activeNPC}
            dialogue={npcDialogue ?? ""}
            options={npcOptions}
            onChoice={onNPCChoice}
            isProcessing={isProcessing}
          />
        )}

        {/* Gacha Loot Container Reveal */}
        {activeLootContainer && (
          <LootContainerReveal
            container={activeLootContainer}
            onComplete={onLootContainerComplete}
            onCancel={onLootContainerCancel}
          />
        )}

        {gameState.inCombat && gameState.currentEnemy && (
          gameState.currentEnemy.entityType === "boss" ? (
            <BossEncounter
              boss={gameState.currentEnemy as Boss}
              onAction={onBossAction}
              isProcessing={isProcessing}
              currentPhaseNarration={undefined}
            />
          ) : (
            <CombatDisplay
              enemy={gameState.currentEnemy}
              player={gameState.player}
              hazard={gameState.currentHazard}
              onChangeStance={onChangeStance}
              combatRound={gameState.combatRound}
              disabled={isProcessing}
            />
          )
        )}

        {/* Active Combo Display */}
        {gameState.inCombat && gameState.player.combo?.activeCombo && (
          <div className="mt-2">
            <ComboDisplay combo={gameState.player.combo} />
          </div>
        )}

        {gameState.inCombat &&
          gameState.currentEnemy &&
          gameState.player.abilities.length > 0 && (
            <div className="mt-4">
              <AbilityBar
                player={gameState.player}
                onUseAbility={onUseAbility}
                onToggleSustained={onToggleSustained}
                disabled={isProcessing}
              />
            </div>
          )}

        {/* Spell Bar - shown in combat if player has spells */}
        {gameState.inCombat && gameState.currentEnemy && hasSpells && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Spells
            </div>
            <SpellBar
              player={gameState.player}
              spellBook={gameState.player.spellBook}
              onCastSpell={onCastSpell}
              inCombat={true}
              disabled={isProcessing}
              currentEnemy={gameState.currentEnemy}
            />
          </div>
        )}

        {/* Vault Encounter - shown when activeVault is set */}
        {gameState.activeVault && !gameState.inCombat && (
          <VaultEncounter
            vault={gameState.activeVault}
            onAction={onVaultAction}
            isProcessing={isProcessing}
            hasKey={gameState.player.inventory.some(
              (item) => item.type === "key" &&
                item.name.toLowerCase().includes(
                  (gameState.activeVault?.definition.keyType || "").replace("key_", "")
                )
            )}
            keyType={gameState.activeVault.definition.keyType}
          />
        )}

        {gameState.pathOptions && gameState.pathOptions.length > 0 && !gameState.activeVault && !activeLootContainer && (
          <PathSelect
            paths={gameState.pathOptions}
            onSelectPath={onSelectPath}
            disabled={isProcessing}
          />
        )}

        {/* Utility bar for always-on capabilities (Teleport, etc.) */}
        {!gameState.inCombat && playerCapabilities.always.length > 0 && (
          <UtilityBar
            capabilities={playerCapabilities.always}
            onUse={onUtilityCapability}
            disabled={isProcessing}
          />
        )}

        {!gameState.inCombat && (
          <InteractiveEntities
            entities={gameState.roomEnvironmentalEntities}
            player={gameState.player}
            playerCapabilities={playerCapabilities}
            isProcessing={isProcessing}
            onInteraction={onEnvironmentalInteraction}
          />
        )}
      </div>
    </div>
  );
}
