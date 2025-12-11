/**
 * LEGO Pieces - Reusable mechanic bundles for AI composition
 *
 * Each piece is a predefined combination of effect atoms with metadata.
 * AI selects piece IDs, kernel resolves them to Effect[] arrays.
 *
 * Design principles:
 * 1. Pieces are immutable data, not functions
 * 2. Cost represents power budget (1-10 scale)
 * 3. Tags enable contextual filtering
 * 4. AI never invents new pieces at runtime
 */

import type { Effect } from "@/lib/effects/effect-types"
import { atoms, statusTemplates, targets } from "./effect-atoms"

// =============================================================================
// TYPES
// =============================================================================

export type PieceCategory = "attack" | "defense" | "utility" | "buff" | "debuff"
export type PieceRarity = "common" | "uncommon" | "rare" | "legendary"

export interface LegoPiece {
  id: string
  name: string
  category: PieceCategory
  rarity: PieceRarity
  cost: number // Power budget (1-10)
  tags: string[]
  atoms: Effect[]
  narrationHints: string
}

// =============================================================================
// POWER LEVEL MULTIPLIERS
// =============================================================================

/**
 * When AI selects a power level, these multipliers are applied.
 * The base damage/heal values in pieces assume "medium" power.
 */
export const POWER_MULTIPLIERS = {
  light: 0.6,
  medium: 1.0,
  heavy: 1.5,
} as const

export type PowerLevel = keyof typeof POWER_MULTIPLIERS

// =============================================================================
// BLESSING/CURSE TIER DEFINITIONS
// =============================================================================

export const BLESSING_TIERS = {
  minor: { attack: 2, defense: 1, duration: 3 },
  standard: { attack: 4, defense: 3, duration: 5 },
  major: { attack: 7, defense: 5, duration: 8 },
} as const

export const CURSE_TIERS = {
  minor: { attack: -2, defense: -1, duration: 3 },
  standard: { attack: -4, defense: -3, duration: 5 },
  major: { attack: -7, defense: -5, duration: 8 },
} as const

export type BlessingTier = keyof typeof BLESSING_TIERS
export type CurseTier = keyof typeof CURSE_TIERS

// =============================================================================
// DISPOSITION CHANGE DEFINITIONS
// =============================================================================

export const DISPOSITION_CHANGES = {
  slight: 5,
  moderate: 15,
  significant: 30,
} as const

export type DispositionChange = keyof typeof DISPOSITION_CHANGES

// =============================================================================
// REWARD TIER DEFINITIONS (for shrines, environmental, etc.)
// =============================================================================

export const REWARD_TIERS = {
  gold: {
    none: 0,
    small: { min: 5, max: 15 },
    medium: { min: 20, max: 50 },
    large: { min: 75, max: 150 },
  },
  healing: {
    none: 0,
    small: { min: 5, max: 15 },
    medium: { min: 20, max: 40 },
    large: { min: 50, max: 80 },
  },
  damage: {
    none: 0,
    small: { min: 3, max: 8 },
    medium: { min: 10, max: 20 },
    large: { min: 25, max: 40 },
  },
  experience: {
    none: 0,
    small: { min: 5, max: 15 },
    medium: { min: 20, max: 40 },
    large: { min: 50, max: 100 },
  },
} as const

export type RewardTier = "none" | "small" | "medium" | "large"
export type RewardType = keyof typeof REWARD_TIERS

// =============================================================================
// PIECE REGISTRY
// =============================================================================

export const PIECES: Record<string, LegoPiece> = {
  // ===========================================================================
  // ATTACK PIECES - Physical
  // ===========================================================================

  basic_strike: {
    id: "basic_strike",
    name: "Basic Strike",
    category: "attack",
    rarity: "common",
    cost: 2,
    tags: ["physical", "melee", "damage"],
    atoms: [atoms.damage(targets.player(), 10, "enemy_attack", { damageType: "physical" })],
    narrationHints: "Simple swing, slash, or thrust",
  },

  heavy_blow: {
    id: "heavy_blow",
    name: "Heavy Blow",
    category: "attack",
    rarity: "uncommon",
    cost: 4,
    tags: ["physical", "melee", "damage", "heavy"],
    atoms: [atoms.damage(targets.player(), 20, "enemy_attack", { damageType: "physical" })],
    narrationHints: "Powerful overhead strike, crushing impact",
  },

  savage_rend: {
    id: "savage_rend",
    name: "Savage Rend",
    category: "attack",
    rarity: "rare",
    cost: 6,
    tags: ["physical", "melee", "damage", "bleed"],
    atoms: [
      atoms.damage(targets.player(), 15, "enemy_attack", { damageType: "physical" }),
      atoms.applyStatus(targets.player(), statusTemplates.bleeding(2)),
    ],
    narrationHints: "Tearing claws, serrated blade, leaves deep wounds",
  },

  // ===========================================================================
  // ATTACK PIECES - Fire
  // ===========================================================================

  flame_lick: {
    id: "flame_lick",
    name: "Flame Lick",
    category: "attack",
    rarity: "common",
    cost: 3,
    tags: ["fire", "magical", "damage"],
    atoms: [atoms.damage(targets.player(), 12, "enemy_attack", { damageType: "fire" })],
    narrationHints: "Small flames, sparks, heat wave",
  },

  fireball: {
    id: "fireball",
    name: "Fireball",
    category: "attack",
    rarity: "uncommon",
    cost: 5,
    tags: ["fire", "magical", "damage", "dot"],
    atoms: [
      atoms.damage(targets.player(), 18, "enemy_attack", { damageType: "fire" }),
      atoms.applyStatus(targets.player(), statusTemplates.burning(1)),
    ],
    narrationHints: "Blazing sphere, explosion, engulfing flames",
  },

  inferno_blast: {
    id: "inferno_blast",
    name: "Inferno Blast",
    category: "attack",
    rarity: "rare",
    cost: 7,
    tags: ["fire", "magical", "damage", "dot", "heavy"],
    atoms: [
      atoms.damage(targets.player(), 25, "enemy_attack", { damageType: "fire" }),
      atoms.applyStatus(targets.player(), statusTemplates.burning(2)),
    ],
    narrationHints: "Roaring flames, consuming fire, hellish heat",
  },

  // ===========================================================================
  // ATTACK PIECES - Ice
  // ===========================================================================

  frost_touch: {
    id: "frost_touch",
    name: "Frost Touch",
    category: "attack",
    rarity: "common",
    cost: 3,
    tags: ["ice", "magical", "damage"],
    atoms: [atoms.damage(targets.player(), 10, "enemy_attack", { damageType: "ice" })],
    narrationHints: "Icy grip, freezing cold, numbing chill",
  },

  ice_shard: {
    id: "ice_shard",
    name: "Ice Shard",
    category: "attack",
    rarity: "uncommon",
    cost: 5,
    tags: ["ice", "magical", "damage", "slow"],
    atoms: [
      atoms.damage(targets.player(), 15, "enemy_attack", { damageType: "ice" }),
      atoms.applyStatus(targets.player(), statusTemplates.chilled()),
    ],
    narrationHints: "Razor-sharp ice, frozen spike, glacial strike",
  },

  blizzard_strike: {
    id: "blizzard_strike",
    name: "Blizzard Strike",
    category: "attack",
    rarity: "rare",
    cost: 7,
    tags: ["ice", "magical", "damage", "slow", "heavy"],
    atoms: [
      atoms.damage(targets.player(), 22, "enemy_attack", { damageType: "ice" }),
      atoms.applyStatus(targets.player(), statusTemplates.chilled()),
      atoms.applyStatus(targets.player(), statusTemplates.vulnerable()),
    ],
    narrationHints: "Howling blizzard, encasing ice, bitter cold",
  },

  // ===========================================================================
  // ATTACK PIECES - Shadow
  // ===========================================================================

  shadow_strike: {
    id: "shadow_strike",
    name: "Shadow Strike",
    category: "attack",
    rarity: "common",
    cost: 3,
    tags: ["shadow", "magical", "damage"],
    atoms: [atoms.damage(targets.player(), 12, "enemy_attack", { damageType: "shadow" })],
    narrationHints: "Dark tendrils, shadow blade, void touch",
  },

  soul_drain: {
    id: "soul_drain",
    name: "Soul Drain",
    category: "attack",
    rarity: "uncommon",
    cost: 5,
    tags: ["shadow", "magical", "damage", "drain"],
    atoms: [
      atoms.damage(targets.player(), 14, "enemy_attack", { damageType: "shadow" }),
      atoms.applyStatus(targets.player(), statusTemplates.weakened()),
    ],
    narrationHints: "Life force draining, essence stealing, dark magic",
  },

  void_eruption: {
    id: "void_eruption",
    name: "Void Eruption",
    category: "attack",
    rarity: "rare",
    cost: 8,
    tags: ["shadow", "magical", "damage", "curse", "heavy"],
    atoms: [
      atoms.damage(targets.player(), 28, "enemy_attack", { damageType: "shadow" }),
      atoms.applyStatus(targets.player(), statusTemplates.cursed()),
    ],
    narrationHints: "Reality tearing, void rifts, absolute darkness",
  },

  // ===========================================================================
  // ATTACK PIECES - Lightning
  // ===========================================================================

  spark: {
    id: "spark",
    name: "Spark",
    category: "attack",
    rarity: "common",
    cost: 2,
    tags: ["lightning", "magical", "damage"],
    atoms: [atoms.damage(targets.player(), 8, "enemy_attack", { damageType: "lightning" })],
    narrationHints: "Crackling spark, static discharge",
  },

  lightning_bolt: {
    id: "lightning_bolt",
    name: "Lightning Bolt",
    category: "attack",
    rarity: "uncommon",
    cost: 5,
    tags: ["lightning", "magical", "damage", "stun"],
    atoms: [
      atoms.damage(targets.player(), 16, "enemy_attack", { damageType: "lightning" }),
      atoms.applyStatus(targets.player(), statusTemplates.stunned()),
    ],
    narrationHints: "Blinding flash, thunderclap, electric surge",
  },

  // ===========================================================================
  // ATTACK PIECES - Poison
  // ===========================================================================

  venomous_bite: {
    id: "venomous_bite",
    name: "Venomous Bite",
    category: "attack",
    rarity: "common",
    cost: 3,
    tags: ["poison", "physical", "damage", "dot"],
    atoms: [
      atoms.damage(targets.player(), 6, "enemy_attack", { damageType: "poison" }),
      atoms.applyStatus(targets.player(), statusTemplates.poisoned(1)),
    ],
    narrationHints: "Fangs sink in, venom flows, toxic wound",
  },

  toxic_cloud: {
    id: "toxic_cloud",
    name: "Toxic Cloud",
    category: "attack",
    rarity: "uncommon",
    cost: 5,
    tags: ["poison", "magical", "damage", "dot"],
    atoms: [
      atoms.damage(targets.player(), 8, "enemy_attack", { damageType: "poison" }),
      atoms.applyStatus(targets.player(), statusTemplates.poisoned(2)),
    ],
    narrationHints: "Noxious fumes, choking gas, spreading poison",
  },

  // ===========================================================================
  // DEBUFF PIECES
  // ===========================================================================

  weaken: {
    id: "weaken",
    name: "Weaken",
    category: "debuff",
    rarity: "common",
    cost: 2,
    tags: ["debuff", "stat_reduce"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.weakened())],
    narrationHints: "Saps strength, drains power, enfeebling magic",
  },

  expose: {
    id: "expose",
    name: "Expose",
    category: "debuff",
    rarity: "common",
    cost: 2,
    tags: ["debuff", "stat_reduce"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.vulnerable())],
    narrationHints: "Breaks guard, opens defenses, leaves unprotected",
  },

  curse: {
    id: "curse",
    name: "Curse",
    category: "debuff",
    rarity: "rare",
    cost: 5,
    tags: ["debuff", "curse", "shadow"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.cursed())],
    narrationHints: "Dark words, malevolent hex, lingering darkness",
  },

  // ===========================================================================
  // BUFF PIECES (for friendly/shrine effects)
  // ===========================================================================

  minor_blessing: {
    id: "minor_blessing",
    name: "Minor Blessing",
    category: "buff",
    rarity: "common",
    cost: 2,
    tags: ["buff", "shrine", "holy"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.blessed())],
    narrationHints: "Warm glow, gentle light, divine favor",
  },

  fortify: {
    id: "fortify",
    name: "Fortify",
    category: "buff",
    rarity: "uncommon",
    cost: 3,
    tags: ["buff", "defense", "shrine"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.fortified())],
    narrationHints: "Skin hardens, resolve strengthens, stone-like",
  },

  empower: {
    id: "empower",
    name: "Empower",
    category: "buff",
    rarity: "uncommon",
    cost: 3,
    tags: ["buff", "attack", "shrine"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.empowered())],
    narrationHints: "Surge of power, muscles swell, energy crackles",
  },

  regenerate: {
    id: "regenerate",
    name: "Regenerate",
    category: "buff",
    rarity: "uncommon",
    cost: 3,
    tags: ["buff", "heal", "shrine"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.regenerating())],
    narrationHints: "Wounds close, flesh knits, vitality restored",
  },

  // ===========================================================================
  // UTILITY PIECES
  // ===========================================================================

  minor_heal: {
    id: "minor_heal",
    name: "Minor Heal",
    category: "utility",
    rarity: "common",
    cost: 2,
    tags: ["heal", "shrine"],
    atoms: [atoms.heal(targets.player(), 15, "shrine")],
    narrationHints: "Soothing warmth, gentle restoration",
  },

  standard_heal: {
    id: "standard_heal",
    name: "Standard Heal",
    category: "utility",
    rarity: "uncommon",
    cost: 4,
    tags: ["heal", "shrine"],
    atoms: [atoms.heal(targets.player(), 30, "shrine")],
    narrationHints: "Healing light, wounds close, pain fades",
  },

  major_heal: {
    id: "major_heal",
    name: "Major Heal",
    category: "utility",
    rarity: "rare",
    cost: 6,
    tags: ["heal", "shrine"],
    atoms: [atoms.heal(targets.player(), 50, "shrine")],
    narrationHints: "Radiant energy, complete restoration, divine touch",
  },

  cleanse: {
    id: "cleanse",
    name: "Cleanse",
    category: "utility",
    rarity: "uncommon",
    cost: 3,
    tags: ["utility", "remove_debuff", "shrine"],
    atoms: [
      atoms.removeStatus(targets.player(), "poisoned"),
      atoms.removeStatus(targets.player(), "burning"),
      atoms.removeStatus(targets.player(), "bleeding"),
    ],
    narrationHints: "Purifying light, cleansing wash, impurities fade",
  },

  gold_boon: {
    id: "gold_boon",
    name: "Gold Boon",
    category: "utility",
    rarity: "uncommon",
    cost: 3,
    tags: ["utility", "gold", "shrine"],
    atoms: [atoms.modifyGold(50, "shrine_blessing")],
    narrationHints: "Coins materialize, gold glitters, fortune smiles",
  },

  // ===========================================================================
  // DEFENSE PIECES
  // ===========================================================================

  defensive_stance: {
    id: "defensive_stance",
    name: "Defensive Stance",
    category: "defense",
    rarity: "common",
    cost: 1,
    tags: ["defense", "stance"],
    atoms: [atoms.setStance("defensive")],
    narrationHints: "Raises guard, tightens defense, braces for impact",
  },

  // ===========================================================================
  // TRAP DAMAGE PIECES
  // ===========================================================================

  trap_spike: {
    id: "trap_spike",
    name: "Spike Trap",
    category: "attack",
    rarity: "common",
    cost: 3,
    tags: ["trap", "physical", "damage"],
    atoms: [atoms.damage(targets.player(), 15, "trap", { damageType: "physical" })],
    narrationHints: "Spikes burst from floor, impaling pain",
  },

  trap_poison_dart: {
    id: "trap_poison_dart",
    name: "Poison Dart Trap",
    category: "attack",
    rarity: "uncommon",
    cost: 4,
    tags: ["trap", "poison", "damage", "dot"],
    atoms: [
      atoms.damage(targets.player(), 5, "trap", { damageType: "poison" }),
      atoms.applyStatus(targets.player(), statusTemplates.poisoned(2)),
    ],
    narrationHints: "Darts whistle, sharp sting, spreading numbness",
  },

  trap_curse_rune: {
    id: "trap_curse_rune",
    name: "Curse Rune Trap",
    category: "debuff",
    rarity: "rare",
    cost: 5,
    tags: ["trap", "curse", "shadow"],
    atoms: [atoms.applyStatus(targets.player(), statusTemplates.cursed())],
    narrationHints: "Runes flare, dark energy, soul-chilling cold",
  },

  trap_fire: {
    id: "trap_fire",
    name: "Fire Trap",
    category: "attack",
    rarity: "uncommon",
    cost: 4,
    tags: ["trap", "fire", "damage", "dot"],
    atoms: [
      atoms.damage(targets.player(), 10, "trap", { damageType: "fire" }),
      atoms.applyStatus(targets.player(), statusTemplates.burning(1)),
    ],
    narrationHints: "Flames erupt, searing heat, fire engulfs",
  },
}

// =============================================================================
// PIECE LOOKUP HELPERS
// =============================================================================

export function getPiece(id: string): LegoPiece | undefined {
  return PIECES[id]
}

export function getPieceOrThrow(id: string): LegoPiece {
  const piece = PIECES[id]
  if (!piece) {
    throw new Error(`Unknown LEGO piece: ${id}`)
  }
  return piece
}

export function getAllPieceIds(): string[] {
  return Object.keys(PIECES)
}

export function getPiecesByCategory(category: PieceCategory): LegoPiece[] {
  return Object.values(PIECES).filter((p) => p.category === category)
}

export function getPiecesByTag(tag: string): LegoPiece[] {
  return Object.values(PIECES).filter((p) => p.tags.includes(tag))
}

export default PIECES
