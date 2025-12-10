/**
 * Map Generator - Creates PoE-style map items for dungeon entry
 *
 * Maps replace the key system. Each map has:
 * - Tier (T1-T10): Base difficulty
 * - Rarity: Determines modifier slot count
 * - Theme: Visual/narrative identity
 * - Modifiers: Mechanical effects (reuses DungeonModifier)
 * - Quality: Bonus loot/exp percentage
 */

import type { MapItem, MapTier, MapProps, ItemRarity, DungeonModifier } from "@/lib/core/game-types"
import { generateId } from "@/lib/core/utils"
import { DUNGEON_MODIFIERS } from "@/lib/entity/entity-system"

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

/**
 * Map themes organized by tier bracket
 */
const MAP_THEMES: Record<"low" | "mid" | "high" | "endgame", string[]> = {
  low: [
    "Goblin Warrens",
    "Rat King's Den",
    "Forgotten Crypt",
    "Flooded Sewers",
    "Abandoned Mine",
    "Mossy Caverns",
  ],
  mid: [
    "Orc Stronghold",
    "Spider Nest",
    "Cult Sanctum",
    "Frozen Depths",
    "Volcanic Tunnels",
    "Haunted Library",
  ],
  high: [
    "Golem Foundry",
    "Shadow Maze",
    "Dragon's Rest",
    "Demon Pit",
    "Crystal Palace",
    "Necropolis",
  ],
  endgame: [
    "The Hollow Throne",
    "Abyssal Rift",
    "Malachar's Domain",
    "Void Nexus",
    "Primordial Chaos",
    "The Final Descent",
  ],
}

/**
 * Map theme to biome mapping for AI context
 */
const THEME_BIOMES: Record<string, string> = {
  // Low tier
  "Goblin Warrens": "underground",
  "Rat King's Den": "underground",
  "Forgotten Crypt": "cursed",
  "Flooded Sewers": "underground",
  "Abandoned Mine": "underground",
  "Mossy Caverns": "underground",
  // Mid tier
  "Orc Stronghold": "fortress",
  "Spider Nest": "underground",
  "Cult Sanctum": "cursed",
  "Frozen Depths": "frozen",
  "Volcanic Tunnels": "volcanic",
  "Haunted Library": "cursed",
  // High tier
  "Golem Foundry": "mechanical",
  "Shadow Maze": "void",
  "Dragon's Rest": "volcanic",
  "Demon Pit": "infernal",
  "Crystal Palace": "magical",
  "Necropolis": "cursed",
  // Endgame
  "The Hollow Throne": "void",
  "Abyssal Rift": "void",
  "Malachar's Domain": "cursed",
  "Void Nexus": "void",
  "Primordial Chaos": "void",
  "The Final Descent": "void",
}

// =============================================================================
// GENERATION OPTIONS
// =============================================================================

export interface GenerateMapOptions {
  tier: MapTier
  rarity?: ItemRarity
  theme?: string
  forceModifiers?: DungeonModifier[]
  quality?: number
  identified?: boolean
}

// =============================================================================
// CORE GENERATION
// =============================================================================

/**
 * Generate a new map item
 */
export function generateMap(options: GenerateMapOptions): MapItem {
  const { tier, identified = true } = options
  const rarity = options.rarity ?? rollMapRarity(tier)
  const theme = options.theme ?? selectMapTheme(tier, rarity)
  const biome = THEME_BIOMES[theme] ?? "dark_fantasy"

  // Calculate floors: T1=3-4, T5=6-7, T10=9-10
  const baseFloors = 3 + Math.floor(tier / 2)
  const floors = baseFloors + Math.floor(Math.random() * 2)

  // Generate modifiers based on rarity
  const modSlots = getModifierSlots(rarity)
  const modifiers = options.forceModifiers ?? generateMapModifiers(modSlots, tier)

  // Quality (0-20, usually starts at 0)
  const quality = options.quality ?? 0

  const mapProps: MapProps = {
    tier,
    theme,
    biome,
    floors,
    modifiers,
    modSlots,
    quality,
    identified,
  }

  return {
    id: generateId(),
    name: identified ? `${theme} Map` : "Unidentified Map",
    entityType: "item",
    type: "misc",
    category: "consumable",
    subtype: "map",
    rarity,
    value: calculateMapValue(tier, rarity, modifiers.length, quality),
    description: generateMapDescription(mapProps, identified),
    stackSize: 1,
    maxStack: 1,
    mapProps,
    consumedOnUse: true,
  }
}

/**
 * Generate multiple maps (for loot drops, vendor stock)
 */
export function generateMaps(count: number, options: Partial<GenerateMapOptions> & { tier: MapTier }): MapItem[] {
  return Array.from({ length: count }, () => generateMap(options))
}

// =============================================================================
// RARITY & MODIFIER LOGIC
// =============================================================================

/**
 * Modifier slots by rarity
 */
function getModifierSlots(rarity: ItemRarity): number {
  switch (rarity) {
    case "common": return 0
    case "uncommon": return 2
    case "rare": return 5
    case "legendary": return 6
  }
}

/**
 * Roll map rarity with tier bonus
 */
function rollMapRarity(tier: MapTier): ItemRarity {
  // Higher tiers have better rarity rolls
  const tierBonus = tier / 20  // T10 = +0.5
  const roll = Math.random() + tierBonus

  if (roll < 0.55) return "common"
  if (roll < 0.82) return "uncommon"
  if (roll < 0.96) return "rare"
  return "legendary"
}

/**
 * Generate modifiers for a map
 */
function generateMapModifiers(count: number, tier: MapTier): DungeonModifier[] {
  if (count === 0) return []

  const availableMods = Object.values(DUNGEON_MODIFIERS)
  const selected: DungeonModifier[] = []
  const usedIds = new Set<string>()

  // Higher tiers can roll stronger modifier values
  const tierMultiplier = 1 + (tier - 1) * 0.1  // T1=1.0, T10=1.9

  while (selected.length < count && selected.length < availableMods.length) {
    const mod = availableMods[Math.floor(Math.random() * availableMods.length)]
    if (!usedIds.has(mod.id)) {
      // Scale modifier effects by tier
      const scaledMod = scaleModifier(mod, tierMultiplier)
      selected.push(scaledMod)
      usedIds.add(mod.id)
    }
  }

  return selected
}

/**
 * Scale modifier effects by tier multiplier
 */
function scaleModifier(mod: DungeonModifier, multiplier: number): DungeonModifier {
  const scaledEffect = { ...mod.effect }

  // Scale numerical effects
  if (scaledEffect.enemyHealthMult) {
    scaledEffect.enemyHealthMult = 1 + (scaledEffect.enemyHealthMult - 1) * multiplier
  }
  if (scaledEffect.enemyDamageMult) {
    scaledEffect.enemyDamageMult = 1 + (scaledEffect.enemyDamageMult - 1) * multiplier
  }
  if (scaledEffect.lootRarityBonus) {
    scaledEffect.lootRarityBonus = Math.round(scaledEffect.lootRarityBonus * multiplier)
  }

  return {
    ...mod,
    effect: scaledEffect,
  }
}

// =============================================================================
// THEME SELECTION
// =============================================================================

/**
 * Select theme based on tier bracket
 */
function selectMapTheme(tier: MapTier, _rarity: ItemRarity): string {
  const bracket = getTierBracket(tier)
  const themes = MAP_THEMES[bracket]
  return themes[Math.floor(Math.random() * themes.length)]
}

/**
 * Get tier bracket for theme selection
 */
function getTierBracket(tier: MapTier): "low" | "mid" | "high" | "endgame" {
  if (tier <= 3) return "low"
  if (tier <= 6) return "mid"
  if (tier <= 9) return "high"
  return "endgame"
}

// =============================================================================
// VALUE & DESCRIPTION
// =============================================================================

/**
 * Calculate map gold value
 */
function calculateMapValue(
  tier: MapTier,
  rarity: ItemRarity,
  modCount: number,
  quality: number
): number {
  const baseValue = tier * 15
  const rarityMult = { common: 1, uncommon: 2, rare: 4, legendary: 8 }[rarity]
  const modBonus = modCount * 10
  const qualityBonus = quality * 2

  return baseValue * rarityMult + modBonus + qualityBonus
}

/**
 * Generate map description text
 */
function generateMapDescription(props: MapProps, identified: boolean): string {
  if (!identified) {
    return "An unidentified map. Use an Orb of Wisdom to reveal its properties."
  }

  const parts: string[] = []
  parts.push(`Tier ${props.tier} map.`)
  parts.push(`${props.floors} floors.`)

  if (props.modifiers.length > 0) {
    parts.push(`${props.modifiers.length} modifier${props.modifiers.length !== 1 ? "s" : ""}.`)
  }

  if (props.quality > 0) {
    parts.push(`+${props.quality}% quality.`)
  }

  return parts.join(" ")
}

// =============================================================================
// MAP MANIPULATION (for crafting)
// =============================================================================

/**
 * Add quality to a map
 */
export function addMapQuality(map: MapItem, amount: number): MapItem {
  const newQuality = Math.min(20, map.mapProps.quality + amount)
  return {
    ...map,
    mapProps: { ...map.mapProps, quality: newQuality },
    value: calculateMapValue(
      map.mapProps.tier,
      map.rarity,
      map.mapProps.modifiers.length,
      newQuality
    ),
    description: generateMapDescription({ ...map.mapProps, quality: newQuality }, map.mapProps.identified),
  }
}

/**
 * Add a modifier to a map (if space available)
 */
export function addMapModifier(map: MapItem, modifier?: DungeonModifier): MapItem | null {
  const { mapProps } = map
  if (mapProps.modifiers.length >= mapProps.modSlots) {
    return null  // No space
  }

  const usedIds = new Set(mapProps.modifiers.map(m => m.id))
  const availableMods = Object.values(DUNGEON_MODIFIERS).filter(m => !usedIds.has(m.id))

  if (availableMods.length === 0) {
    return null  // All mods already on map
  }

  const newMod = modifier ?? availableMods[Math.floor(Math.random() * availableMods.length)]
  const scaledMod = scaleModifier(newMod, 1 + (mapProps.tier - 1) * 0.1)

  const newModifiers = [...mapProps.modifiers, scaledMod]

  return {
    ...map,
    mapProps: { ...mapProps, modifiers: newModifiers },
    value: calculateMapValue(mapProps.tier, map.rarity, newModifiers.length, mapProps.quality),
    description: generateMapDescription({ ...mapProps, modifiers: newModifiers }, mapProps.identified),
  }
}

/**
 * Reroll all modifiers on a map
 */
export function rerollMapModifiers(map: MapItem): MapItem {
  const { mapProps } = map
  const newModifiers = generateMapModifiers(mapProps.modifiers.length, mapProps.tier)

  return {
    ...map,
    mapProps: { ...mapProps, modifiers: newModifiers },
    description: generateMapDescription({ ...mapProps, modifiers: newModifiers }, mapProps.identified),
  }
}

/**
 * Strip all modifiers from a map (→ common)
 */
export function scourMap(map: MapItem): MapItem {
  return {
    ...map,
    rarity: "common",
    mapProps: {
      ...map.mapProps,
      modifiers: [],
      modSlots: 0,
    },
    value: calculateMapValue(map.mapProps.tier, "common", 0, map.mapProps.quality),
    description: generateMapDescription(
      { ...map.mapProps, modifiers: [] },
      map.mapProps.identified
    ),
  }
}

/**
 * Upgrade map rarity (transmute: common→uncommon, alchemy: common→rare)
 */
export function upgradeMapRarity(
  map: MapItem,
  targetRarity: "uncommon" | "rare"
): MapItem {
  if (map.rarity !== "common") {
    return map  // Can only upgrade common maps
  }

  const newSlots = getModifierSlots(targetRarity)
  const modCount = targetRarity === "uncommon"
    ? 1 + Math.floor(Math.random() * 2)  // 1-2 mods
    : 3 + Math.floor(Math.random() * 3)  // 3-5 mods

  const newModifiers = generateMapModifiers(Math.min(modCount, newSlots), map.mapProps.tier)

  return {
    ...map,
    rarity: targetRarity,
    mapProps: {
      ...map.mapProps,
      modifiers: newModifiers,
      modSlots: newSlots,
    },
    value: calculateMapValue(map.mapProps.tier, targetRarity, newModifiers.length, map.mapProps.quality),
    description: generateMapDescription(
      { ...map.mapProps, modifiers: newModifiers, modSlots: newSlots },
      map.mapProps.identified
    ),
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  MAP_THEMES,
  THEME_BIOMES,
  getModifierSlots,
  rollMapRarity,
  getTierBracket,
}
