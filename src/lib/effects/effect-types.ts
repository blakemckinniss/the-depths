/**
 * Effect Types - Atomic operations the game engine can execute
 *
 * This is the "instruction set" for the AI-as-code architecture.
 * AI generates Effect[] arrays, the kernel validates and executes them.
 *
 * Design principles:
 * 1. Each effect is a single, atomic operation
 * 2. Effects are pure data - no functions or callbacks
 * 3. All effects can be serialized to JSON for logging/replay
 * 4. The executor handles all validation and clamping
 */

import type {
  StatusEffect,
  Item,
  DamageType,
  CombatStance,
  Companion,
  GamePhase,
  PathOption,
  NPC,
  Shrine,
  Trap,
  Boss,
  Enemy,
  EnvironmentalHazard,
  EnvironmentalEntity,
  EnemyAbility,
  Ability,
} from "@/lib/core/game-types"

// =============================================================================
// TARGET IDENTIFIERS
// =============================================================================

export type EffectTarget =
  | { type: "player" }
  | { type: "enemy" }
  | { type: "companion"; id: string }
  | { type: "npc"; id: string }

// =============================================================================
// DAMAGE & HEALING EFFECTS
// =============================================================================

export interface DamageEffect {
  effectType: "damage"
  target: EffectTarget
  amount: number
  damageType?: DamageType
  source: string // "enemy_attack", "trap", "poison", etc.
  ignoreDefense?: boolean
  canKill?: boolean // default true, false prevents lethal damage
}

export interface HealEffect {
  effectType: "heal"
  target: EffectTarget
  amount: number
  source: string
  canOverheal?: boolean // default false
}

// =============================================================================
// RESOURCE EFFECTS
// =============================================================================

export interface ModifyGoldEffect {
  effectType: "modify_gold"
  amount: number // positive = gain, negative = spend
  source: string
}

export interface ModifyResourceEffect {
  effectType: "modify_resource"
  target: EffectTarget
  amount: number // mana, rage, energy, etc.
  source: string
}

export interface ModifyExperienceEffect {
  effectType: "modify_experience"
  amount: number
  source: string
}

// =============================================================================
// INVENTORY EFFECTS
// =============================================================================

export interface AddItemEffect {
  effectType: "add_item"
  item: Item
  source: string
}

export interface RemoveItemEffect {
  effectType: "remove_item"
  itemId: string
  source: string
}

export interface EquipItemEffect {
  effectType: "equip_item"
  itemId: string
  slot: string
}

export interface UnequipItemEffect {
  effectType: "unequip_item"
  slot: string
}

// =============================================================================
// STATUS EFFECT OPERATIONS
// =============================================================================

export interface ApplyStatusEffect {
  effectType: "apply_status"
  target: EffectTarget
  status: StatusEffect
}

export interface RemoveStatusEffect {
  effectType: "remove_status"
  target: EffectTarget
  statusId: string
}

export interface ModifyStatusEffect {
  effectType: "modify_status"
  target: EffectTarget
  statusId: string
  changes: {
    duration?: number // add to duration
    stacks?: number // add to stacks
  }
}

// =============================================================================
// COMBAT EFFECTS
// =============================================================================

export interface StartCombatEffect {
  effectType: "start_combat"
  enemy: {
    id: string
    name: string
    level: number
    health: number
    maxHealth: number
    attack: number
    defense: number
    expReward: number
    goldReward: number
    weakness?: DamageType
    resistance?: DamageType
  }
}

export interface EndCombatEffect {
  effectType: "end_combat"
  result: "victory" | "flee" | "death"
}

export interface SetStanceEffect {
  effectType: "set_stance"
  stance: CombatStance
}

export interface DamageEnemyEffect {
  effectType: "damage_enemy"
  amount: number
  damageType?: DamageType
  source: string
}

export interface UpdateEnemyEffect {
  effectType: "update_enemy"
  changes: {
    health?: number
    attack?: number
    defense?: number
  }
}

// =============================================================================
// COMPANION EFFECTS
// =============================================================================

export interface AddCompanionEffect {
  effectType: "add_companion"
  companion: Companion
}

export interface RemoveCompanionEffect {
  effectType: "remove_companion"
  companionId: string
  reason: "death" | "betrayal" | "dismissed" | "captured"
}

export interface DamageCompanionEffect {
  effectType: "damage_companion"
  companionId: string
  amount: number
  source: string
}

export interface HealCompanionEffect {
  effectType: "heal_companion"
  companionId: string
  amount: number
  source: string
}

// =============================================================================
// NAVIGATION EFFECTS
// =============================================================================

export interface SetPhaseEffect {
  effectType: "set_phase"
  phase: GamePhase
}

export interface SetRoomEffect {
  effectType: "set_room"
  room: number
}

export interface SetFloorEffect {
  effectType: "set_floor"
  floor: number
}

export interface SetPathOptionsEffect {
  effectType: "set_path_options"
  options: PathOption[]
}

// =============================================================================
// GAME STATE FLAGS
// =============================================================================

export interface SetFlagEffect {
  effectType: "set_flag"
  flag: string
  value: boolean | number | string
}

export interface TriggerEventEffect {
  effectType: "trigger_event"
  eventType: string
  data?: Record<string, unknown>
}

// =============================================================================
// NARRATIVE / LOGGING
// =============================================================================

export interface NarrativeEffect {
  effectType: "narrative"
  text: string
  category: "combat" | "exploration" | "dialogue" | "system" | "lore"
  style?: "normal" | "dramatic" | "whisper" | "warning"
}

// =============================================================================
// ABILITY EFFECTS
// =============================================================================

export interface UseAbilityEffect {
  effectType: "use_ability"
  abilityId: string
  target: EffectTarget
}

export interface TickCooldownsEffect {
  effectType: "tick_cooldowns"
}

export interface ResetCooldownEffect {
  effectType: "reset_cooldown"
  abilityId: string
}

// =============================================================================
// ENCOUNTER EFFECTS (Shrines, Traps, NPCs)
// =============================================================================

export interface SetActiveShrineEffect {
  effectType: "set_active_shrine"
  shrine: Shrine | null
}

export interface UseShrineEffect {
  effectType: "use_shrine"
  shrineId: string
  outcome: "blessing" | "curse" | "nothing"
}

export interface SetActiveTrapEffect {
  effectType: "set_active_trap"
  trap: Trap | null
}

export interface TriggerTrapEffect {
  effectType: "trigger_trap"
  trapId: string
  disarmAttempted: boolean
  success: boolean
}

export interface SetActiveNPCEffect {
  effectType: "set_active_npc"
  npc: NPC | null
}

export interface NPCDialogueEffect {
  effectType: "npc_dialogue"
  npcId: string
  dialogueText: string
  choices?: Array<{
    id: string
    text: string
    consequence?: string
  }>
}

export interface NPCChoiceEffect {
  effectType: "npc_choice"
  npcId: string
  choiceId: string
  outcome: string
}

// =============================================================================
// ROOM & ENTITY EFFECTS
// =============================================================================

export interface AddRoomEntityEffect {
  effectType: "add_room_entity"
  entity: EnvironmentalEntity
}

export interface RemoveRoomEntityEffect {
  effectType: "remove_room_entity"
  entityId: string
}

export interface InteractEntityEffect {
  effectType: "interact_entity"
  entityId: string
  interactionType: string
  result?: string
}

export interface SpawnEnemyEffect {
  effectType: "spawn_enemy"
  enemy: Enemy
  startCombat?: boolean
}

// =============================================================================
// LOOT & CONTAINER EFFECTS
// =============================================================================

export interface SpawnLootEffect {
  effectType: "spawn_loot"
  items: Item[]
  gold?: number
  source: string
}

export interface OpenContainerEffect {
  effectType: "open_container"
  containerId: string
  contents: {
    items: Item[]
    gold?: number
  }
}

export interface GenerateLootEffect {
  effectType: "generate_loot"
  source: "enemy" | "chest" | "boss" | "shrine" | "quest"
  context: {
    playerLevel: number
    floorLevel: number
    playerClass?: string
    luck?: number
  }
}

// =============================================================================
// BOSS EFFECTS
// =============================================================================

export interface SetBossEffect {
  effectType: "set_boss"
  boss: Boss | null
}

export interface BossPhaseEffect {
  effectType: "boss_phase"
  bossId: string
  phase: number
  phaseName?: string
  newAbilities?: EnemyAbility[]
}

export interface BossDialogueEffect {
  effectType: "boss_dialogue"
  bossId: string
  dialogueType: "intro" | "phase_change" | "low_health" | "victory" | "defeat"
  text: string
}

export interface BossMechanicEffect {
  effectType: "boss_mechanic"
  bossId: string
  mechanicType: string
  data?: Record<string, unknown>
}

// =============================================================================
// WORLD & DUNGEON EFFECTS
// =============================================================================

export interface SetDungeonEffect {
  effectType: "set_dungeon"
  dungeonId: string
  theme: string
}

export interface DescendFloorEffect {
  effectType: "descend_floor"
  newFloor: number
  narrative?: string
}

export interface RevealPathsEffect {
  effectType: "reveal_paths"
  paths: PathOption[]
}

export interface SetHazardEffect {
  effectType: "set_hazard"
  hazard: EnvironmentalHazard | null
}

export interface ModifyHazardEffect {
  effectType: "modify_hazard"
  hazardId: string
  changes: Partial<EnvironmentalHazard>
}

export interface TriggerChaosEventEffect {
  effectType: "trigger_chaos_event"
  eventType: string
  severity: "minor" | "moderate" | "major"
  description: string
}

// =============================================================================
// PLAYER STATE EFFECTS
// =============================================================================

export interface ModifyPlayerStatsEffect {
  effectType: "modify_player_stats"
  changes: {
    attack?: number
    defense?: number
    maxHealth?: number
    strength?: number
    intelligence?: number
    dexterity?: number
  }
  permanent: boolean
  source: string
}

export interface SetPlayerClassEffect {
  effectType: "set_player_class"
  classId: string
  abilities: Ability[]
}

export interface UnlockAbilityEffect {
  effectType: "unlock_ability"
  ability: Ability
}

export interface UpgradeAbilityEffect {
  effectType: "upgrade_ability"
  abilityId: string
  newLevel: number
}

// =============================================================================
// VAULT & PERSISTENCE EFFECTS
// =============================================================================

export interface AddToVaultEffect {
  effectType: "add_to_vault"
  item: Item
}

export interface RemoveFromVaultEffect {
  effectType: "remove_from_vault"
  itemId: string
}

export interface SetActiveVaultEffect {
  effectType: "set_active_vault"
  vaultId: string | null
}

// =============================================================================
// QUEST & PROGRESSION EFFECTS
// =============================================================================

export interface StartQuestEffect {
  effectType: "start_quest"
  questId: string
  questName: string
  description: string
  objectives: string[]
}

export interface UpdateQuestProgressEffect {
  effectType: "update_quest_progress"
  questId: string
  objectiveIndex: number
  completed: boolean
}

export interface CompleteQuestEffect {
  effectType: "complete_quest"
  questId: string
  rewards: {
    gold?: number
    experience?: number
    items?: Item[]
  }
}

// =============================================================================
// COMPOSITE EFFECT (for complex operations)
// =============================================================================

export interface CompositeEffect {
  effectType: "composite"
  effects: Effect[]
  description: string // for logging
}

// =============================================================================
// UNION TYPE
// =============================================================================

export type Effect =
  // Damage & Healing
  | DamageEffect
  | HealEffect
  // Resources
  | ModifyGoldEffect
  | ModifyResourceEffect
  | ModifyExperienceEffect
  // Inventory
  | AddItemEffect
  | RemoveItemEffect
  | EquipItemEffect
  | UnequipItemEffect
  // Status Effects
  | ApplyStatusEffect
  | RemoveStatusEffect
  | ModifyStatusEffect
  // Combat
  | StartCombatEffect
  | EndCombatEffect
  | SetStanceEffect
  | DamageEnemyEffect
  | UpdateEnemyEffect
  // Companions
  | AddCompanionEffect
  | RemoveCompanionEffect
  | DamageCompanionEffect
  | HealCompanionEffect
  // Navigation
  | SetPhaseEffect
  | SetRoomEffect
  | SetFloorEffect
  | SetPathOptionsEffect
  // Flags & Events
  | SetFlagEffect
  | TriggerEventEffect
  // Narrative
  | NarrativeEffect
  // Abilities
  | UseAbilityEffect
  | TickCooldownsEffect
  | ResetCooldownEffect
  // Encounters (Shrines, Traps, NPCs)
  | SetActiveShrineEffect
  | UseShrineEffect
  | SetActiveTrapEffect
  | TriggerTrapEffect
  | SetActiveNPCEffect
  | NPCDialogueEffect
  | NPCChoiceEffect
  // Room & Entities
  | AddRoomEntityEffect
  | RemoveRoomEntityEffect
  | InteractEntityEffect
  | SpawnEnemyEffect
  // Loot & Containers
  | SpawnLootEffect
  | OpenContainerEffect
  | GenerateLootEffect
  // Boss
  | SetBossEffect
  | BossPhaseEffect
  | BossDialogueEffect
  | BossMechanicEffect
  // World & Dungeon
  | SetDungeonEffect
  | DescendFloorEffect
  | RevealPathsEffect
  | SetHazardEffect
  | ModifyHazardEffect
  | TriggerChaosEventEffect
  // Player State
  | ModifyPlayerStatsEffect
  | SetPlayerClassEffect
  | UnlockAbilityEffect
  | UpgradeAbilityEffect
  // Vault & Persistence
  | AddToVaultEffect
  | RemoveFromVaultEffect
  | SetActiveVaultEffect
  // Quest & Progression
  | StartQuestEffect
  | UpdateQuestProgressEffect
  | CompleteQuestEffect
  // Composite
  | CompositeEffect

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isDamageEffect(e: Effect): e is DamageEffect {
  return e.effectType === "damage"
}

export function isHealEffect(e: Effect): e is HealEffect {
  return e.effectType === "heal"
}

export function isNarrativeEffect(e: Effect): e is NarrativeEffect {
  return e.effectType === "narrative"
}

export function isCompositeEffect(e: Effect): e is CompositeEffect {
  return e.effectType === "composite"
}

// =============================================================================
// AI DECISION OUTPUT TYPES
// =============================================================================

/**
 * The standard output format from AI decision calls.
 * AI produces narration + effects, kernel executes effects.
 *
 * @deprecated Use LegoTurnDecision for new code - AI should select pieceIds, not raw effects.
 */
export interface TurnDecision {
  narration: string
  effects: Effect[]
  metadata?: {
    confidence?: number // 0-1, how confident AI is in this decision
    reasoning?: string // for debugging
    alternatives?: string[] // other options considered
  }
}

/**
 * LEGO-powered AI decision format.
 * AI selects piece IDs from the registry, kernel resolves and executes them.
 *
 * This is the target format for all AI decisions going forward.
 */
export interface LegoTurnDecision {
  narration: string
  pieceIds: string[]
  powerLevel?: "light" | "medium" | "heavy" // For combat damage scaling
  metadata?: {
    confidence?: number
    reasoning?: string
    alternatives?: string[]
  }
}

/**
 * Shrine-specific decision with tier selection.
 */
export interface ShrineTurnDecision {
  narration: string
  outcome: "blessing" | "curse" | "nothing" | "mixed"
  blessingTier?: "minor" | "standard" | "major"
  curseTier?: "minor" | "standard" | "major"
  healTier?: "none" | "small" | "medium" | "large" // Kernel resolves to value
  goldTier?: "none" | "small" | "medium" | "large" // Kernel resolves to value
  pieceIds?: string[] // Additional effects via pieces
  metadata?: {
    confidence?: number
    reasoning?: string
  }
}

/**
 * NPC disposition change decision.
 */
export interface NPCTurnDecision {
  narration: string
  dispositionChange?: "slight" | "moderate" | "significant"
  dispositionDirection?: "positive" | "negative"
  dialogueOptions?: string[]
  pieceIds?: string[]
  metadata?: {
    confidence?: number
    reasoning?: string
  }
}

/**
 * Union of all LEGO decision types.
 */
export type AnyLegoDecision = LegoTurnDecision | ShrineTurnDecision | NPCTurnDecision

/**
 * Context provided to AI for making decisions.
 * This is the "world view" the AI sees.
 */
export interface DecisionContext {
  // Current game state (may be filtered/summarized for token efficiency)
  player: {
    health: number
    maxHealth: number
    attack: number
    defense: number
    level: number
    class?: string
    race?: string
    stance: CombatStance
    gold: number
    activeEffects: string[] // effect names only
    abilities: string[] // ability names only
  }

  // Combat context (if in combat)
  combat?: {
    enemy: {
      name: string
      health: number
      maxHealth: number
      attack: number
      defense: number
      weakness?: string
      resistance?: string
      abilities: string[]
    }
    round: number
    playerAdvantage: boolean
  }

  // Environment context
  environment: {
    dungeonTheme: string
    floor: number
    room: number
    hazards: string[]
  }

  // Recent history for narrative continuity
  recentEvents: string[]
}
