import type React from "react"
import type {
  ItemCategory,
  WeaponType,
  ArmorSlot,
  ArmorWeight,
  ConsumableType,
  ContainerType,
  MaterialType,
  ToolType,
  TomeType,
  TrinketType,
  KeyType,
  RelicType,
  CurrencyType,
  Enchantment,
} from "@/lib/items/item-taxonomy"
import type { EntityImpact } from "@/lib/mechanics/game-mechanics-ledger"
import type { MaterialItem } from "@/lib/materials/material-system"

export type EntityType =
  | "enemy"
  | "item"
  | "gold"
  | "weapon"
  | "armor"
  | "potion"
  | "location"
  | "player"
  | "damage"
  | "heal"
  | "rare"
  | "legendary"
  | "npc"
  | "trap"
  | "shrine"
  | "curse"
  | "blessing"
  | "boss"
  | "companion"
  | "effect"
  | "ability"
  | "environmental"
  | "unknown"

export type ItemRarity = "common" | "uncommon" | "rare" | "legendary"
export type KeyRarity = "master" | "common" | "uncommon" | "rare" | "legendary"

export type GameEventType =
  | "room_enter"
  | "enemy_encounter"
  | "combat_player_attack"
  | "combat_enemy_attack"
  | "combat_victory"
  | "combat_flee"
  | "loot_discovery"
  | "trap_triggered"
  | "trap_disarmed"
  | "shrine_found"
  | "shrine_interact"
  | "npc_encounter"
  | "npc_dialogue"
  | "npc_trade"
  | "boss_encounter"
  | "boss_phase"
  | "player_death"
  | "floor_descend"
  | "dungeon_complete"
  | "effect_applied"
  | "effect_removed"
  | "companion_join"
  | "companion_action"
  | "companion_death"
  | "environment_hazard"
  | "trap_encounter"
  | "ability_used"
  | "ability_learned"
  | "ability_upgraded"
  | "class_selected"
  | "resource_spent"
  | "resource_gained"
  | "environmental_interaction"

// Base entity interface - all game entities extend this
export interface GameEntity {
  id: string
  name: string
  entityType: EntityType
  description?: string
  aiGenerated?: boolean
}

// Status effects that can apply to entities
export interface StatusEffect extends GameEntity {
  entityType: "effect" | "curse" | "blessing"
  effectType: "buff" | "debuff" | "neutral"
  duration: number // -1 for permanent
  stacks?: number
  modifiers: {
    attack?: number
    defense?: number
    maxHealth?: number
    healthRegen?: number
    goldMultiplier?: number
    expMultiplier?: number
    dodgeChance?: number
    critChance?: number
    critDamage?: number
    damageMultiplier?: number
    damageTaken?: number // Incoming damage multiplier (< 1 = resistance, > 1 = vulnerability)
  }
  onTurnStart?: string // AI-generated flavor text
  onExpire?: string
  sourceId?: string // ID of entity that created this effect (hazard, item, ability, etc.)
  sourceType?: "item" | "ability" | "hazard" | "shrine" | "trap" | "enemy" | "environment" | "companion" | "ai_generated"
}

// Extended Item with more properties
export interface Item extends GameEntity {
  entityType: "item" | "weapon" | "armor" | "potion"
  type: "weapon" | "armor" | "potion" | "misc" | "key" | "quest" // legacy field for compatibility
  rarity: ItemRarity
  stats?: {
    attack?: number
    defense?: number
    health?: number
  }
  value: number
  equipped?: boolean
  effects?: StatusEffect[]
  lore?: string // AI-generated item lore
  useText?: string // AI-generated use description
  damageType?: DamageType
  bonusVs?: EntityType[] // bonus damage vs certain enemy types
  onHitEffect?: StatusEffect

  // === NEW TAXONOMY FIELDS ===
  // Primary category from item-taxonomy.ts
  category?: ItemCategory

  // Specific subtype within the category
  subtype?:
    | WeaponType
    | ArmorSlot
    | ConsumableType
    | ContainerType
    | MaterialType
    | ToolType
    | TomeType
    | TrinketType
    | KeyType
    | RelicType
    | CurrencyType
    | string // allow AI to extend with custom subtypes

  // Weapon-specific properties
  weaponProps?: {
    twoHanded?: boolean
    range?: "melee" | "ranged" | "magic"
    attackSpeed?: "slow" | "normal" | "fast"
    critChance?: number
    critDamage?: number
  }

  // Armor-specific properties
  armorProps?: {
    slot?: ArmorSlot
    weight?: ArmorWeight
    movementPenalty?: number
    magicPenalty?: number
  }

  // Container-specific properties
  containerProps?: {
    slots?: number
    contents?: Item[]
    locked?: boolean
    keyRequired?: string
  }

  // Material-specific properties
  materialProps?: {
    tier?: 1 | 2 | 3 | 4 | 5
    materialCategory?: "metal" | "gem" | "organic" | "animal" | "monster" | "magical" | "mundane"
  }

  // Tome-specific properties
  tomeProps?: {
    teaches?: string // ability ID to learn
    recipes?: string[] // recipe IDs contained
    loreUnlocks?: string[] // lore entries to unlock
  }

  // Enchantments applied to this item
  enchantments?: Enchantment[]

  // Stackable items
  stackSize?: number
  maxStack?: number

  // For unknown/unidentified items
  identifiedAs?: string // what this item becomes when identified
  identificationHint?: string // clue about what it might be
}

// NPC entity for encounters
export interface NPC extends GameEntity {
  entityType: "npc"
  role: "merchant" | "quest_giver" | "mysterious" | "trapped" | "hostile_neutral"
  disposition: number // -100 to 100
  dialogue?: string[]
  inventory?: Item[]
  questId?: string
  personality?: string // AI-generated personality traits
}

// Trap entity for dungeon hazards
export interface Trap extends GameEntity {
  entityType: "trap"
  trapType: "damage" | "poison" | "curse" | "teleport" | "alarm"
  damage?: number
  effect?: StatusEffect
  disarmDC: number // difficulty check
  triggered: boolean
  hidden: boolean
}

// Shrine entity for risk/reward choices
export interface Shrine extends GameEntity {
  entityType: "shrine"
  shrineType: "health" | "power" | "fortune" | "dark" | "unknown"
  cost?: { health?: number; gold?: number; item?: string }
  reward?: { effect?: StatusEffect; item?: Item; gold?: number }
  used: boolean
  riskLevel: "safe" | "moderate" | "dangerous" | "deadly"
}

// Companion entity - Flexible structure for AI-populated creatures, NPCs, spirits, constructs, etc.
export interface Companion extends GameEntity {
  entityType: "companion"

  // Legacy properties for backward compatibility
  role?: "fighter" | "healer" | "scout" | "mage"
  loyalty?: number
  combatStyle?: string

  // Core identity - AI generates freely
  origin: string // "tamed beast", "rescued prisoner", "bound spirit", "awakened construct", etc.
  species: string // "wolf", "goblin", "flame wisp", "clockwork automaton", etc.
  personality: string | string[] // ["loyal", "mischievous", "bloodthirsty", "cautious"] or single string

  // Flexible stats - scaled by AI generation context
  stats: {
    health: number
    maxHealth: number
    attack: number
    defense: number
    speed: number // turn order modifier
    level: number // companion level (inherited from source, does not change)
  }

  // AI-generated abilities (1-4)
  abilities: CompanionAbility[]

  // Behavioral tags that affect combat AI
  combatBehavior: CompanionBehavior

  // Relationship system
  bond: {
    level: number // 0-100, affects all interactions
    mood: string // AI-generated current mood
    memory: string[] // Key moments the companion remembers
  }

  // Evolution/growth potential (AI can define paths)
  evolution?: {
    potential: string // "This creature could become something more..."
    triggers: string[] // ["reach bond 80", "slay a dragon", "visit the void shrine"]
    evolvesInto?: string // hint at evolution form
  }

  // Visual/flavor
  appearance: string // Detailed AI description
  quirk: string // A memorable behavioral quirk
  battleCry?: string
  idleComment?: string // Random things they say while exploring

  // Status
  alive: boolean
  inParty: boolean // active vs in storage
  turnsWithPlayer: number

  // Special flags for unique companions
  flags: string[] // ["cannot_die", "betrayal_chance", "evolving", "temporary", "summon"]

  // === PLAYER-EQUIVALENT FIELDS (for future playable companions) ===
  // Equipment - companions can equip gear
  equipment?: {
    weapon: Item | null
    armor: Item | null
    accessory?: Item | null // companions get 1 accessory slot
  }

  // Inventory - companions can carry items
  inventory?: Item[]

  // Active status effects
  activeEffects?: StatusEffect[]

  // Resource system (mana/stamina equivalent)
  resources?: {
    current: number
    max: number
    type: string // "mana", "rage", "focus", etc.
    regenPerTurn: number
  }

  // Ability cooldowns (redundant with CompanionAbility.currentCooldown but useful for uniformity)
  abilityCooldowns?: Record<string, number>
}

export interface CompanionAbility {
  id: string
  name: string
  description: string
  cooldown: number
  currentCooldown: number
  effect: CompanionAbilityEffect
  narration: string // AI-generated use description
}

export interface CompanionAbilityEffect {
  type: "damage" | "heal" | "buff" | "debuff" | "utility" | "special"
  target: "enemy" | "player" | "self" | "all_enemies" | "all_allies"
  value?: number // damage/heal amount
  statusEffect?: StatusEffect // proper effect object to apply
  statusEffectChance?: number // 0-1 chance to apply the effect (defaults to 1.0)
  special?: string // AI-defined special effect description
}

export interface CompanionBehavior {
  style: "aggressive" | "defensive" | "support" | "tactical" | "chaotic" | "passive"
  priority: string // "protect player", "finish weakened enemies", "heal first", etc.
  fleeThreshold?: number // HP% at which they might flee (cowardly companions)
  betrayalCondition?: string // "if bond falls below 20...", etc.
}

// Companion recruitment context for AI generation
export interface CompanionRecruitContext {
  method: "tame" | "rescue" | "summon" | "hatch" | "bind" | "purchase" | "befriend" | "awaken"
  sourceEntity?: GameEntity // the entity being converted
  dungeonTheme: string
  floor: number
  playerClass?: string
  existingCompanions: number
}

// Party management
export interface PartyState {
  active: Companion[] // companions in combat (max based on level)
  reserve: Companion[] // stored companions
  maxActive: number // scales with level: 1 at start, 2 at level 5, 3 at level 10
  graveyard: Companion[] // fallen companions (for necromancer resurrection, memories, etc.)
}

// Boss entity with phases - extends Enemy properties for compatibility
export interface Boss extends GameEntity {
  entityType: "boss"
  level: number // Boss level for scaling
  health: number
  maxHealth: number
  attack: number
  defense: number
  phases: BossPhase[]
  currentPhase: number
  expReward: number
  goldReward: number
  guaranteedLoot: Item[]
  loot?: Item // Optional additional loot
  materialDrops?: Item[] // Materials dropped on death (from material-system)
  abilities?: EnemyAbility[] // Boss can use abilities like enemies
  weakness?: DamageType
  resistance?: DamageType
  stance?: CombatStance // Combat stance for compatibility
  aiPattern?: "random" | "smart" | "ability_focused" | "defensive_until_low"
  lastWords?: string // Final words on death
  dialogue?: {
    intro: string
    phase_transitions: string[]
    death: string
    lowHealth?: string
  }
}

export interface BossPhase {
  name: string
  healthThreshold: number // percentage to trigger
  attackModifier: number
  defenseModifier: number
  specialAbility?: string
  narration?: string
}

// Room entity with more detail
export interface Room extends GameEntity {
  entityType: "location"
  roomNumber: number
  floor: number
  roomType: "empty" | "enemy" | "treasure" | "trap" | "shrine" | "npc" | "boss" | "safe"
  entities: GameEntity[]
  explored: boolean
  description?: string
  environmentalHazard?: EnvironmentalHazard
}

// Game Event structure for the event pipeline
export interface GameEvent {
  id: string
  type: GameEventType
  timestamp: number
  source: GameEntity | null
  target: GameEntity | null
  context: Record<string, unknown>
  outcome?: EventOutcome
  narration?: string // AI-generated narration
}

export interface EventOutcome {
  success: boolean
  damage?: number
  healing?: number
  goldChange?: number
  expChange?: number
  itemsGained?: Item[]
  itemsLost?: Item[]
  effectsApplied?: StatusEffect[]
  effectsRemoved?: string[]
  entitySpawned?: GameEntity
  entityRemoved?: string
  stateChanges?: Record<string, unknown>
}

// Event handler result
export interface EventResult {
  events: GameEvent[]
  logs: Array<{
    content: React.ReactNode
    type: "narrative" | "combat" | "loot" | "system" | "choice" | "dialogue" | "effect"
  }>
  stateUpdates: Partial<GameState>
}

export interface DungeonKey {
  id: string
  rarity: KeyRarity
  name: string
  description: string
  consumedOnUse: boolean
  opensRarity: KeyRarity[]
}

export interface DungeonCard {
  id: string
  name: string
  rarity: ItemRarity
  theme: string
  biome?: string                  // Biome for thematic enemy/boss generation
  dangers: string[]
  rewards: string[]
  floors: number
  isMystery: boolean
  requiredKeyRarity: KeyRarity[]  // Legacy - will be removed with key system
  modifiers?: DungeonModifier[]
  mapMetadata?: MapMetadata       // Present when dungeon was created from a map
}

export interface DungeonModifier {
  id: string
  name: string
  description: string
  effect: {
    enemyHealthMult?: number
    enemyDamageMult?: number
    lootRarityBonus?: number
    trapFrequency?: number
    shrineFrequency?: number
    npcFrequency?: number
  }
}

// =============================================================================
// MAP SYSTEM (PoE-style dungeon maps)
// =============================================================================

/**
 * Map tier determines base difficulty (T1-T10)
 */
export type MapTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Map-specific properties
 */
export interface MapProps {
  tier: MapTier
  theme: string                    // "Goblin Warrens", "Shadow Maze", etc.
  biome: string                    // "underground", "void", "cursed", etc.
  floors: number                   // 3-10 based on tier
  modifiers: DungeonModifier[]     // Active modifiers on this map
  modSlots: number                 // Max modifiers (determined by rarity)
  quality: number                  // 0-20% bonus to loot/exp
  identified: boolean              // Hide mods if unidentified
}

/**
 * Map item - consumable dungeon portal
 * Replaces the key system for dungeon entry
 */
export interface MapItem extends Item {
  category: "consumable"
  subtype: "map"
  mapProps: MapProps
  consumedOnUse: true
}

/**
 * Currency effect types for map crafting
 */
export type CurrencyEffect =
  | "transmute"        // Normal → Magic
  | "alteration"       // Reroll magic mods
  | "augmentation"     // Add 1 mod to magic
  | "alchemy"          // Normal → Rare
  | "chaos"            // Reroll rare mods
  | "scouring"         // Strip all mods → Normal
  | "blessed"          // Add quality
  | "divine"           // Reroll mod values
  | "exalted"          // Add high-tier mod to rare

/**
 * Currency item properties
 */
export interface CurrencyProps {
  effect: CurrencyEffect
  targetType: "map" | "equipment" | "any"
  description: string
}

/**
 * Crafting currency item for modifying maps
 */
export interface CraftingCurrency extends Item {
  category: "currency"
  currencyProps: CurrencyProps
}

/**
 * Extended DungeonCard with map metadata
 */
export interface MapMetadata {
  tier: MapTier
  quality: number
  sourceMapId?: string  // ID of the map item that created this dungeon
}

export interface PlayerStats {
  maxHealth: number
  health: number
  attack: number
  defense: number
  level: number
  experience: number
  experienceToLevel: number
  gold: number
  strength: number
  intelligence: number
  dexterity: number
  critChance: number
  critDamage: number
  dodgeChance: number
  luck: number
  speed: number
  vampirism: number
  thorns: number
  blockChance: number
  magicFind: number
  expBonus: number
  healthRegen: number
  resourceRegen: number
}

export type EquipmentSlot =
  | "mainHand"
  | "offHand"
  | "head"
  | "chest"
  | "legs"
  | "feet"
  | "hands"
  | "ring1"
  | "ring2"
  | "amulet"
  | "cloak"
  | "belt"

export interface PlayerEquipment {
  // Primary slots (canonical names)
  mainHand: Item | null
  offHand: Item | null
  head: Item | null
  chest: Item | null
  legs: Item | null
  feet: Item | null
  hands: Item | null
  ring1: Item | null
  ring2: Item | null
  amulet: Item | null
  cloak: Item | null
  belt: Item | null
  // Legacy aliases for backwards compatibility
  weapon: Item | null  // Alias for mainHand (used by older components)
  armor: Item | null   // Alias for chest (used by older components)
}

export interface Player extends GameEntity {
  entityType: "player"
  stats: PlayerStats
  inventory: Item[]
  equipment: PlayerEquipment
  keys: DungeonKey[]
  activeEffects: StatusEffect[]
  party: PartyState // replaced single companion with party system
  class: PlayerClass | null
  className: string | null
  race: PlayerRace | null // Player race for stat bonuses and racial abilities
  raceName: string | null
  abilities: Ability[]
  racialAbilities: RacialAbilityInstance[] // Racial abilities (passive and active)
  resources: PlayerResources
  abilityCooldowns: Record<string, number> // abilityId -> turns remaining
  stance: CombatStance
  combo: ComboTracker
  sustainedAbilities: SustainedAbility[] // Toggle abilities that reserve resources while active
  spellBook: SpellBook // Learned spells from tomes, events, etc.
  essence: Record<string, number> // Essence storage for transmogrification system (EssenceType -> amount)
  materials: MaterialItem[] // Crafting materials for alchemy system
}

// Player race type - matches race-system.ts
export type PlayerRace =
  | "human"
  | "elf"
  | "dark_elf"
  | "dwarf"
  | "orc"
  | "halfling"
  | "demon"
  | "angel"
  | "undead"
  | "dragonborn"
  | "tiefling"
  | "gnome"
  | "half_giant"
  | "vampire"
  | "werewolf"

// Instance of a racial ability on the player
export interface RacialAbilityInstance {
  id: string
  name: string
  description: string
  isPassive: boolean
  cooldown?: number
  currentCooldown?: number
  unlockLevel: number
}

// Spell Book - player's collection of learned spells
export interface SpellBook {
  spells: Spell[]
  favorites: string[] // Quick-access spell IDs
  recentlyCast: string[] // Last 5 spells cast
  cooldowns: Record<string, number> // spellId -> turns remaining
}

// Re-export Spell type (actual implementation in magic/spell-system.ts)
export interface Spell extends GameEntity {
  entityType: "ability"
  school: SpellSchool
  usageContext: SpellUsageContext
  effectType: SpellEffectType
  targetType: SpellTargetType
  requiresTarget: boolean
  resourceCost: number
  resourceType: ResourceType
  healthCost?: number
  cooldown: number
  damage?: { base: number; scaling?: { stat: "attack" | "intelligence" | "level"; ratio: number }; type: DamageType }
  healing?: { base: number; scaling?: { stat: "intelligence" | "level" | "maxHealth"; ratio: number } }
  appliesEffects?: StatusEffect[]
  utilityEffect?: { type: SpellUtilityType; value?: number; duration?: number }
  levelRequired: number
  source?: SpellSource
  powerLevel: number
  rarity: ItemRarity
  tags: string[]
  incantation?: string
  castNarration?: string
}

export type SpellSchool = "fire" | "ice" | "lightning" | "earth" | "holy" | "shadow" | "nature" | "spirit" | "arcane" | "illusion" | "enchantment" | "transmutation" | "blood" | "void" | "temporal" | "universal"
export type SpellUsageContext = "combat_only" | "exploration" | "anytime" | "targeted"
export type SpellEffectType = "damage" | "heal" | "buff" | "debuff" | "summon" | "utility" | "transmute" | "control" | "ward"
export type SpellTargetType = "self" | "enemy" | "ally" | "all_enemies" | "all_allies" | "item" | "npc" | "environment" | "location"
export type SpellSource = "tome" | "scroll_study" | "shrine" | "npc" | "event" | "discovery" | "quest" | "innate" | "curse" | "artifact"
export type SpellUtilityType = "light" | "reveal_traps" | "reveal_secrets" | "teleport" | "unlock" | "identify" | "transmute_gold" | "transmute_item" | "charm" | "dominate" | "fear" | "ward_area" | "summon_companion" | "banish" | "dispel" | "scry" | "restore_item"

// Re-export for convenience (actual type is in sustained-ability-system.ts)
import type { SustainedAbility } from "@/lib/character/sustained-ability-system"
export type { SustainedAbility }

export interface PlayerResources {
  current: number
  max: number
  type: ResourceType
}

export type AbilityCategory = "combat" | "magic" | "utility" | "defensive" | "ultimate"
export type DamageType = "physical" | "fire" | "ice" | "lightning" | "shadow" | "holy" | "poison" | "arcane"
export type ResourceType = "mana" | "rage" | "energy" | "focus" | "souls" | "faith"
export type CombatStance = "balanced" | "aggressive" | "defensive"

export interface Ability extends GameEntity {
  entityType: "ability"
  category: AbilityCategory
  damageType?: DamageType

  // Costs and cooldowns
  resourceCost: number
  resourceType: ResourceType
  cooldown: number // turns
  currentCooldown: number

  // Effects
  baseDamage?: number
  baseHealing?: number
  damageScaling?: { stat: "attack" | "defense" | "level" | "intelligence" | "strength" | "dexterity"; ratio: number }
  healingScaling?: { stat: "level" | "intelligence" | "maxHealth"; ratio: number }

  // Status effects this ability applies
  appliesEffects?: StatusEffect[]
  statusEffect?: Partial<StatusEffect> & { grantsForesight?: ForesightGrant } // Single effect shorthand for utility abilities

  // Requirements
  levelRequired: number
  classRequired?: PlayerClass[]

  // Ability progression
  level?: number // Current ability level (1-5), affects damage/healing scaling
  maxLevel?: number // Maximum level this ability can reach (default 5)

  // AI-generated flavor
  castNarration?: string // "You channel flames into your palms..."
  hitNarration?: string // "The fireball engulfs the enemy in searing heat!"
  missNarration?: string // "The flames scatter harmlessly against the stone."

  // Targeting
  targetType: "self" | "enemy" | "ally" | "all_enemies" | "all_allies" | "random"
  aoeRadius?: number // for area effects

  // Passive abilities
  isPassive: boolean
  passiveBonus?: {
    attack?: number
    defense?: number
    maxHealth?: number
    maxResource?: number
    critChance?: number
    dodgeChance?: number
  }

  // Special flags
  canCritical?: boolean
  ignoresDefense?: boolean
  lifeSteal?: number // percentage
  tags: string[] // for AI context: ["fire", "aoe", "burst", "dot"]
}

export type PlayerClass =
  | "warrior"
  | "mage"
  | "rogue"
  | "cleric"
  | "ranger"
  | "warlock"
  | "paladin"
  | "necromancer"
  | "barbarian"
  | "monk"

export interface ClassDefinition {
  id: PlayerClass
  name: string
  description: string
  lore: string

  // Starting stats modifiers
  statBonuses: {
    health: number
    attack: number
    defense: number
  }

  // Resource system
  resourceType: ResourceType
  baseResource: number
  resourcePerLevel: number
  resourceRegen: number // per turn

  // Abilities
  startingAbilities: string[] // ability IDs
  abilityUnlocks: { level: number; abilityId: string }[]

  // Passive bonuses
  passives: {
    critBonus?: number
    dodgeBonus?: number
    damageTypeBonus?: { type: DamageType; bonus: number }
    resistances?: { type: DamageType; reduction: number }[]
  }

  // Visual
  color: string // for entity text
  icon?: string
}

export interface LogEntry {
  id: string
  content: React.ReactNode
  type: "narrative" | "combat" | "loot" | "system" | "choice" | "dialogue" | "effect"
  timestamp: number
  entityRefs?: string[] // IDs of entities mentioned
}

export type GamePhase =
  | "title"
  | "race_select"
  | "class_select"
  | "tavern"
  | "dungeon_select"
  | "dungeon"
  | "game_over"
  | "npc_interaction"
  | "shrine_choice"
  | "trap_encounter"
  | "environmental_interaction"
  | "combat"
  | "exploring"
  | "victory"

// Foresight System - Outcome visibility as earned game mechanic
export type ForesightLevel = "hidden" | "risk" | "type" | "partial" | "full"

export type ForesightSource =
  | "perception" // High perception skill
  | "arcana" // High arcana skill (magical effects)
  | "wisdom" // High wisdom skill (NPC intentions)
  | "racial" // Elf Keen Senses, etc.
  | "ability" // Class abilities (Hunt's Instinct, Trap Sense, etc.)
  | "effect" // Status effects (Prophetic Vision, Third Eye, Foresight)
  | "item" // Equipment/consumables (Oracle's Amulet, Seer's Draught)

export interface ForesightResult {
  level: ForesightLevel
  source: ForesightSource
  sourceName?: string // "Keen Senses", "Hunt's Instinct", etc.
  revealedImpacts?: EntityImpact[] // Which impacts the player can see
  outcomeHint?: string // Thematic hint text shown to player
  riskLevel?: "safe" | "risky" | "dangerous" // For 'risk' level visibility
}

// Foresight grant metadata for abilities/effects/items
export interface ForesightGrant {
  context?: string // Single context (e.g., "combat", "trap_encounter")
  contexts?: string[] // Multiple contexts
  level: ForesightLevel
  tagFilter?: string[] // Only apply to entities with these tags
}

export interface GameChoice {
  id: string
  text: string
  action: () => void
  disabled?: boolean
  tooltip?: string
  foresight?: ForesightResult // What the player can see about this choice's outcome
  riskLevel?: "safe" | "risky" | "dangerous" // Direct risk level from AI choices
}

export interface GameState {
  player: Player
  currentRoom: number
  floor: number
  inCombat: boolean
  currentEnemy: Enemy | Boss | null
  gameStarted: boolean
  gameOver: boolean
  phase: GamePhase
  availableDungeons: DungeonCard[]
  currentDungeon: DungeonCard | null
  currentBoss: Boss | null
  activeNPC: NPC | null
  activeShrine: Shrine | null
  activeTrap: Trap | null
  activeVault: import("@/lib/items/vault-system").VaultInstance | null
  eventHistory: GameEvent[]
  roomEntities: GameEntity[]
  turnCount: number
  currentHazard: EnvironmentalHazard | null
  pathOptions: PathOption[] | null
  combatRound: number
  runStats: RunSummary
  roomEnvironmentalEntities: EnvironmentalEntity[] // added field
  eventMemory: EventMemory // Event orchestration memory for cooldowns/streaks
}

// Event memory for orchestration system (imported from ledger at runtime)
export interface EventMemory {
  history: Array<{ type: string; room: number; floor: number }>
  typeLastSeen: Map<string, number>
  combatStreak: number
  roomsSinceReward: number
}

export interface Enemy extends GameEntity {
  entityType: "enemy"
  level: number // Entity level for combat/XP scaling
  health: number
  maxHealth: number
  attack: number
  defense: number
  expReward: number
  goldReward: number
  loot?: Item
  materialDrops?: Item[] // Materials dropped on death (from material-system)
  abilities?: EnemyAbility[]
  weakness?: DamageType
  resistance?: DamageType
  lastWords?: string
  stance?: CombatStance // enemy combat stance
  aiPattern?: "random" | "smart" | "ability_focused" | "defensive_until_low"
  monsterTier?: number // For material drop scaling
}

// Union type for any entity the player can fight
export type Combatant = Enemy | Boss

export interface EnemyAbility {
  id: string
  name: string
  description: string
  damage?: number
  damageType?: DamageType
  cooldown: number
  currentCooldown: number
  effect?: StatusEffect
  chance: number // 0-1, chance to use when available
  narration: string
}

export interface EnvironmentalHazard {
  id: string
  name: string
  description: string
  type: "fire" | "ice" | "poison" | "darkness" | "holy" | "arcane" | "flooding" | "crumbling" | "haunted"
  effects: {
    damagePerTurn?: number
    damageType?: DamageType
    statModifier?: { stat: keyof PlayerStats; modifier: number }
    disablesAbilities?: string[] // ability tags disabled
    enemyBuff?: { attack?: number; defense?: number; health?: number }
    playerDebuff?: { attack?: number; defense?: number }
    visionReduced?: boolean
    fleeDisabled?: boolean
  }
  duration: number | "permanent" // turns or until floor change
  narrationOnTick?: string
  mitigatedBy?: string[] // class names or item types that reduce effect
}

export interface PathOption {
  id: string
  preview: string // AI-generated preview hint
  danger: "safe" | "moderate" | "dangerous" | "unknown"
  reward: "poor" | "standard" | "rich" | "unknown"
  roomType?: "enemy" | "treasure" | "trap" | "shrine" | "npc" | "boss" | "mystery" | "vault"
  environmentHint?: string
  vault?: import("@/lib/items/vault-system").VaultInstance // Vault encounter data
}

export interface ComboTracker {
  lastAbilities: string[] // last 3 ability IDs used
  activeCombo?: {
    name: string
    bonus: string
    turnsRemaining: number
  }
}

export interface RunSummary {
  floorsCleared: number
  enemiesSlain: number
  goldEarned: number
  goldSpent: number
  damageDealt: number
  damageTaken: number
  itemsFound: Item[]
  dungeonsCompleted: string[]
  causeOfDeath: string
  killedBy?: string
  survivalTime: number // turns
  abilitiesUsed: number
  bossesDefeated: number
  potionsConsumed: number
  companionsRecruited: number
  companionsLost: string[]
}

// Environmental entity system for interactive narrative elements
export interface EnvironmentalEntity {
  id: string
  name: string
  description: string
  entityClass: "object" | "substance" | "creature" | "mechanism" | "magical" | "corpse" | "container"
  interactionTags: string[] // e.g., ["collectible", "container", "dangerous", "breakable", "readable", "consumable"]
  possibleInteractions: EnvironmentalInteraction[]
  consumed: boolean // removed from scene after interaction
  revealed: boolean // hidden until player discovers
}

export interface EnvironmentalInteraction {
  id: string
  action: string // "collect", "examine", "break", "read", "drink", "loot", "touch", "use_item", "cast_spell", "use_ability"
  label: string // display text for the interaction button
  requiresItem?: string[] // item tags that enable this interaction (e.g., ["container", "waterskin"])
  requiresAbility?: string[] // ability tags needed
  requiresClass?: PlayerClass[]
  requiresCapability?: string // capability ID for spell/item/ability-based interactions
  consumesItem?: boolean // does the required item get used up
  dangerLevel: "safe" | "risky" | "dangerous"
  hint?: string // subtle hint about what might happen
  disabled?: boolean // interaction visible but not usable
  disabledReason?: string // why the interaction is disabled
}

export interface EnvironmentalInteractionResult {
  narration: string
  outcome: "success" | "failure" | "partial" | "unexpected"
  rewards?: {
    item?: Partial<Item>
    gold?: number
    effect?: Partial<StatusEffect>
    healing?: number
    damage?: number
    experience?: number
  }
  consequences?: {
    entityConsumed?: boolean
    spawnsEnemy?: boolean
    triggersTrap?: boolean
    revealsSecret?: boolean
    modifiesEntity?: { entityId: string; changes: Partial<EnvironmentalEntity> }
  }
  newEntity?: Partial<EnvironmentalEntity> // interaction creates new entity
  companionReaction?: string // if companion has something to say
}

// Parsed narrative with embedded entities
export interface ParsedNarrative {
  segments: NarrativeSegment[]
  entities: EnvironmentalEntity[]
}

export interface NarrativeSegment {
  type: "text" | "entity"
  content: string
  entityRef?: string // entity ID if type is "entity"
  entityType?: EntityType | "environmental"
}

export interface UnknownItem extends GameEntity {
  entityType: "item"
  type: "unknown" // Special type for AI-determined items
  rarity: ItemRarity
  sourceEntity: string // What environmental entity this came from
  sourceContext: string // Description of how it was obtained
  appearance: string // Visual description
  sensoryDetails: {
    smell?: string
    texture?: string
    sound?: string
    taste?: string // if player already tasted
    weight?: string
  }
  possibleUses: string[] // AI-suggested uses: ["drink", "apply to weapon", "throw", "sell"]
  determinedEffects?: Item // Once used, becomes a real item with known effects
  aiHints: string[] // Subtle hints about what it might do
  value: number // Estimated value
}

export interface SkillCheck {
  skill: SkillType
  difficulty: number // DC 5-25
  modifier: number // player bonus
  roll?: number // 1-20
  result?: "critical_success" | "success" | "failure" | "critical_failure"
  narration?: string
}

export type SkillType =
  | "strength"
  | "dexterity"
  | "intelligence"
  | "wisdom"
  | "charisma"
  | "perception"
  | "stealth"
  | "arcana"
  | "survival"
  | "medicine"

export interface ItemUseContext {
  item: UnknownItem | Item
  useMethod: string // "drink", "apply", "throw", "read", "break", etc.
  target?: "self" | "enemy" | "companion" | "environment"
  playerState: {
    health: number
    maxHealth: number
    level: number
    class: string
    activeEffects: string[]
  }
  environmentContext: string // Current room/situation
  recentEvents: string[] // What happened recently
}

export interface ItemEffectResult {
  narration: string
  effectType: "beneficial" | "harmful" | "mixed" | "neutral" | "transformative"
  immediateEffects: {
    healing?: number
    damage?: number
    damageType?: DamageType
    statusEffect?: Partial<StatusEffect>
    goldChange?: number
    expChange?: number
  }
  delayedEffects?: {
    turnsUntil: number
    effect: Partial<StatusEffect>
    narration: string
  }
  permanentChanges?: {
    statChange?: { stat: keyof PlayerStats; change: number }
    abilityGained?: string
    abilityLost?: string
    transformDescription?: string
  }
  itemTransformation?: {
    becomesItem: Partial<Item> // The unknown item now has known properties
    lore: string
  }
  sideEffects?: string[] // Flavor text for minor effects
  companionReaction?: string
  skillCheckRequired?: SkillCheck // If a check is needed for full effect
}
