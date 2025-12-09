/**
 * Smart Loot System
 *
 * Intelligent loot generation that considers:
 * - Player class and weapon/armor preferences
 * - Current equipment gaps
 * - Dungeon theme
 * - Recent loot history (pity system)
 * - Floor difficulty
 */

import type { Item, ItemRarity, Player, PlayerClass, DamageType, GameState } from "./game-types"
import {
  generateWeapon,
  generateArmor,
  rollRarity,
  WEAPON_PROFILES,
  ARMOR_PROFILES,
  type WeaponSubtype,
  type ArmorSubtype,
} from "./item-generator"
import { generateConsumable, type ConsumableSubtype } from "./consumable-system"
import { isEgoItem } from "./ego-item-system"

// =============================================================================
// TYPES
// =============================================================================

export interface LootContext {
  player: Player
  floor: number
  dungeonTheme?: string
  recentLoot?: Item[]
  source?: "enemy" | "chest" | "boss" | "shrine" | "vault"
  guaranteeUseful?: boolean
}

export interface LootResult {
  item: Item
  reason: string // Why this item was chosen
  isUpgrade: boolean
}

// =============================================================================
// CLASS PREFERENCES
// =============================================================================

interface ClassLootProfile {
  preferredWeapons: WeaponSubtype[]
  preferredArmor: ArmorSubtype[]
  preferredDamageTypes: DamageType[]
  preferredConsumables: ConsumableSubtype[]
  statPriority: ("attack" | "defense" | "health")[]
}

const CLASS_LOOT_PROFILES: Record<PlayerClass, ClassLootProfile> = {
  warrior: {
    preferredWeapons: ["sword", "axe", "greatsword", "mace"],
    preferredArmor: ["chest", "helmet", "shield"],
    preferredDamageTypes: ["physical", "fire"],
    preferredConsumables: ["health_potion", "strength_elixir", "resistance_potion"],
    statPriority: ["attack", "health", "defense"],
  },
  mage: {
    preferredWeapons: ["staff", "wand"],
    preferredArmor: ["cloak", "gloves"],
    preferredDamageTypes: ["arcane", "fire", "ice", "lightning"],
    preferredConsumables: ["mana_potion", "intelligence_elixir", "scroll"],
    statPriority: ["attack", "health", "defense"],
  },
  rogue: {
    preferredWeapons: ["dagger", "bow"],
    preferredArmor: ["cloak", "boots", "gloves"],
    preferredDamageTypes: ["physical", "poison", "shadow"],
    preferredConsumables: ["health_potion", "dexterity_elixir", "antidote"],
    statPriority: ["attack", "defense", "health"],
  },
  cleric: {
    preferredWeapons: ["mace", "staff", "wand"],
    preferredArmor: ["chest", "shield", "helmet"],
    preferredDamageTypes: ["holy", "physical"],
    preferredConsumables: ["health_potion", "mana_potion", "holy_water"],
    statPriority: ["health", "defense", "attack"],
  },
  ranger: {
    preferredWeapons: ["bow", "dagger", "spear"],
    preferredArmor: ["cloak", "boots", "gloves"],
    preferredDamageTypes: ["physical", "poison", "ice"],
    preferredConsumables: ["health_potion", "dexterity_elixir", "antidote"],
    statPriority: ["attack", "defense", "health"],
  },
  warlock: {
    preferredWeapons: ["staff", "wand", "scythe"],
    preferredArmor: ["cloak", "gloves"],
    preferredDamageTypes: ["shadow", "fire", "arcane"],
    preferredConsumables: ["mana_potion", "soul_shard", "scroll"],
    statPriority: ["attack", "health", "defense"],
  },
  paladin: {
    preferredWeapons: ["sword", "mace", "greatsword"],
    preferredArmor: ["chest", "shield", "helmet"],
    preferredDamageTypes: ["holy", "physical", "fire"],
    preferredConsumables: ["health_potion", "holy_water", "strength_elixir"],
    statPriority: ["health", "attack", "defense"],
  },
  necromancer: {
    preferredWeapons: ["staff", "scythe", "wand"],
    preferredArmor: ["cloak", "gloves"],
    preferredDamageTypes: ["shadow", "poison", "arcane"],
    preferredConsumables: ["mana_potion", "soul_shard", "scroll"],
    statPriority: ["attack", "health", "defense"],
  },
  barbarian: {
    preferredWeapons: ["axe", "greatsword", "mace"],
    preferredArmor: ["chest", "boots", "gloves"],
    preferredDamageTypes: ["physical", "fire"],
    preferredConsumables: ["health_potion", "strength_elixir", "rage_potion"],
    statPriority: ["attack", "health", "defense"],
  },
  monk: {
    preferredWeapons: ["dagger", "spear", "staff"],
    preferredArmor: ["gloves", "boots", "cloak"],
    preferredDamageTypes: ["physical", "holy", "lightning"],
    preferredConsumables: ["health_potion", "dexterity_elixir", "focus_tea"],
    statPriority: ["attack", "defense", "health"],
  },
}

// =============================================================================
// EQUIPMENT GAP ANALYSIS
// =============================================================================

interface EquipmentGap {
  slot: "weapon" | "armor"
  severity: "critical" | "significant" | "minor" | "none"
  currentPower: number
  expectedPower: number
}

function analyzeEquipmentGaps(player: Player, floor: number): EquipmentGap[] {
  const gaps: EquipmentGap[] = []

  // Expected power based on floor (rough baseline)
  const expectedWeaponPower = 5 + floor * 3
  const expectedArmorPower = 3 + floor * 2

  // Weapon gap
  const currentWeaponPower = player.equipment.weapon?.stats?.attack ?? 0
  const weaponDiff = expectedWeaponPower - currentWeaponPower
  gaps.push({
    slot: "weapon",
    severity: weaponDiff > 10 ? "critical" : weaponDiff > 5 ? "significant" : weaponDiff > 0 ? "minor" : "none",
    currentPower: currentWeaponPower,
    expectedPower: expectedWeaponPower,
  })

  // Armor gap
  const currentArmorPower = player.equipment.armor?.stats?.defense ?? 0
  const armorDiff = expectedArmorPower - currentArmorPower
  gaps.push({
    slot: "armor",
    severity: armorDiff > 8 ? "critical" : armorDiff > 4 ? "significant" : armorDiff > 0 ? "minor" : "none",
    currentPower: currentArmorPower,
    expectedPower: expectedArmorPower,
  })

  return gaps
}

function getWorstGap(gaps: EquipmentGap[]): EquipmentGap | null {
  const severityOrder = ["critical", "significant", "minor", "none"]

  for (const severity of severityOrder) {
    const gap = gaps.find(g => g.severity === severity)
    if (gap && gap.severity !== "none") return gap
  }

  return null
}

// =============================================================================
// PITY SYSTEM
// =============================================================================

interface PityState {
  dropsSinceRare: number
  dropsSinceLegendary: number
  dropsSinceUpgrade: number
}

function calculatePityBonus(recentLoot: Item[] = []): PityState {
  let dropsSinceRare = 0
  let dropsSinceLegendary = 0
  let dropsSinceUpgrade = 0

  for (let i = recentLoot.length - 1; i >= 0; i--) {
    const item = recentLoot[i]

    if (item.rarity === "rare" || item.rarity === "legendary") {
      break
    }
    dropsSinceRare++
  }

  for (let i = recentLoot.length - 1; i >= 0; i--) {
    const item = recentLoot[i]
    if (item.rarity === "legendary") break
    dropsSinceLegendary++
  }

  // Track upgrades separately (more complex - would need equipment comparison)
  dropsSinceUpgrade = Math.min(dropsSinceRare, 10)

  return { dropsSinceRare, dropsSinceLegendary, dropsSinceUpgrade }
}

function applyPityToRarity(baseRarity: ItemRarity, pity: PityState): ItemRarity {
  // Pity rare after 8 non-rare drops
  if (pity.dropsSinceRare >= 8 && baseRarity === "common") {
    return "uncommon"
  }
  if (pity.dropsSinceRare >= 12 && (baseRarity === "common" || baseRarity === "uncommon")) {
    return "rare"
  }

  // Pity legendary after 25 drops without one
  if (pity.dropsSinceLegendary >= 25 && baseRarity !== "legendary") {
    return Math.random() < 0.5 ? "rare" : "legendary"
  }

  return baseRarity
}

// =============================================================================
// DUNGEON THEME INFLUENCE
// =============================================================================

interface ThemeLootModifiers {
  preferredDamageTypes: DamageType[]
  rarityBonus: number
  specialItemChance: number
}

const THEME_MODIFIERS: Record<string, ThemeLootModifiers> = {
  "goblin warrens": {
    preferredDamageTypes: ["physical", "poison"],
    rarityBonus: -0.1,
    specialItemChance: 0.05,
  },
  "forgotten crypt": {
    preferredDamageTypes: ["holy", "fire", "shadow"],
    rarityBonus: 0,
    specialItemChance: 0.1,
  },
  "orc stronghold": {
    preferredDamageTypes: ["physical", "fire"],
    rarityBonus: 0.05,
    specialItemChance: 0.08,
  },
  "spider nest": {
    preferredDamageTypes: ["poison", "fire"],
    rarityBonus: 0,
    specialItemChance: 0.1,
  },
  "cult sanctum": {
    preferredDamageTypes: ["shadow", "holy", "fire"],
    rarityBonus: 0.1,
    specialItemChance: 0.15,
  },
  "golem foundry": {
    preferredDamageTypes: ["lightning", "fire", "physical"],
    rarityBonus: 0.1,
    specialItemChance: 0.12,
  },
  "shadow maze": {
    preferredDamageTypes: ["shadow", "arcane"],
    rarityBonus: 0.15,
    specialItemChance: 0.2,
  },
  "dragon's rest": {
    preferredDamageTypes: ["fire", "ice", "physical"],
    rarityBonus: 0.2,
    specialItemChance: 0.25,
  },
  "the hollow throne": {
    preferredDamageTypes: ["holy", "shadow"],
    rarityBonus: 0.25,
    specialItemChance: 0.3,
  },
  "abyssal rift": {
    preferredDamageTypes: ["shadow", "arcane", "poison"],
    rarityBonus: 0.3,
    specialItemChance: 0.35,
  },
  "malachar's domain": {
    preferredDamageTypes: ["shadow", "fire", "physical"],
    rarityBonus: 0.25,
    specialItemChance: 0.3,
  },
}

function getThemeModifiers(dungeonTheme?: string): ThemeLootModifiers {
  if (!dungeonTheme) {
    return { preferredDamageTypes: ["physical"], rarityBonus: 0, specialItemChance: 0.1 }
  }

  const normalizedTheme = dungeonTheme.toLowerCase()
  for (const [theme, mods] of Object.entries(THEME_MODIFIERS)) {
    if (normalizedTheme.includes(theme)) return mods
  }

  return { preferredDamageTypes: ["physical"], rarityBonus: 0, specialItemChance: 0.1 }
}

// =============================================================================
// SMART LOOT GENERATION
// =============================================================================

export function generateSmartLoot(context: LootContext): LootResult {
  const { player, floor, dungeonTheme, recentLoot = [], source = "enemy", guaranteeUseful = false } = context

  const classProfile = player.class ? CLASS_LOOT_PROFILES[player.class] : null
  const gaps = analyzeEquipmentGaps(player, floor)
  const pity = calculatePityBonus(recentLoot)
  const themeMods = getThemeModifiers(dungeonTheme)

  // Determine what type of item to drop
  const itemType = decideItemType(gaps, source, guaranteeUseful)

  // Calculate rarity with all modifiers
  let rarity = rollRarity(floor - 1)

  // Apply pity system
  rarity = applyPityToRarity(rarity, pity)

  // Apply theme bonus (bosses/vaults get extra)
  const sourceBonus = source === "boss" ? 0.2 : source === "vault" ? 0.15 : source === "chest" ? 0.05 : 0
  if (Math.random() < themeMods.rarityBonus + sourceBonus) {
    rarity = upgradeRarity(rarity)
  }

  // Generate the item
  let item: Item
  let reason: string

  if (itemType === "weapon") {
    const preferredSubtype = classProfile ? pickRandom(classProfile.preferredWeapons) : undefined
    const preferredDamageType = pickPreferredDamageType(classProfile, themeMods)

    item = generateWeapon({
      rarity,
      subtype: guaranteeUseful ? preferredSubtype : (Math.random() < 0.6 ? preferredSubtype : undefined),
      damageType: Math.random() < 0.4 ? preferredDamageType : undefined,
      floor,
      forClass: player.class ?? undefined,
    })

    reason = gaps.find(g => g.slot === "weapon")?.severity !== "none"
      ? "Filling weapon equipment gap"
      : classProfile && preferredSubtype
        ? `Class-appropriate ${preferredSubtype}`
        : "Random weapon drop"

  } else if (itemType === "armor") {
    const preferredSubtype = classProfile ? pickRandom(classProfile.preferredArmor) : undefined

    item = generateArmor({
      rarity,
      subtype: guaranteeUseful ? preferredSubtype : (Math.random() < 0.6 ? preferredSubtype : undefined),
      floor,
      forClass: player.class ?? undefined,
    })

    reason = gaps.find(g => g.slot === "armor")?.severity !== "none"
      ? "Filling armor equipment gap"
      : classProfile && preferredSubtype
        ? `Class-appropriate ${preferredSubtype}`
        : "Random armor drop"

  } else {
    // Consumable
    const preferredConsumable = classProfile ? pickRandom(classProfile.preferredConsumables) : undefined

    item = generateConsumable({
      rarity: rarity === "legendary" ? "rare" : rarity, // Cap consumable rarity
      subtype: Math.random() < 0.5 ? preferredConsumable : undefined,
      floor,
    })

    reason = "Consumable for sustain"
  }

  // Check if this is an upgrade
  const isUpgrade = checkIfUpgrade(item, player)

  return { item, reason, isUpgrade }
}

function decideItemType(gaps: EquipmentGap[], source: string, guaranteeUseful: boolean): "weapon" | "armor" | "consumable" {
  const worstGap = getWorstGap(gaps)

  // Boss/vault drops should prioritize equipment
  if (source === "boss" || source === "vault") {
    if (worstGap?.severity === "critical") return worstGap.slot
    return Math.random() < 0.7 ? (Math.random() < 0.5 ? "weapon" : "armor") : "consumable"
  }

  // If guaranteeing useful, fill gaps
  if (guaranteeUseful && worstGap && worstGap.severity !== "none") {
    return worstGap.slot
  }

  // Critical gaps should be addressed
  if (worstGap?.severity === "critical") {
    return Math.random() < 0.7 ? worstGap.slot : "consumable"
  }

  // Significant gaps have moderate priority
  if (worstGap?.severity === "significant") {
    return Math.random() < 0.5 ? worstGap.slot : (Math.random() < 0.6 ? "consumable" : (Math.random() < 0.5 ? "weapon" : "armor"))
  }

  // Default distribution
  const roll = Math.random()
  if (roll < 0.35) return "weapon"
  if (roll < 0.65) return "armor"
  return "consumable"
}

function pickPreferredDamageType(classProfile: ClassLootProfile | null, themeMods: ThemeLootModifiers): DamageType | undefined {
  // Combine class and theme preferences
  const options: DamageType[] = []

  if (classProfile) {
    options.push(...classProfile.preferredDamageTypes)
  }
  options.push(...themeMods.preferredDamageTypes)

  if (options.length === 0) return undefined

  return options[Math.floor(Math.random() * options.length)]
}

function upgradeRarity(rarity: ItemRarity): ItemRarity {
  switch (rarity) {
    case "common": return "uncommon"
    case "uncommon": return "rare"
    case "rare": return "legendary"
    case "legendary": return "legendary"
  }
}

function checkIfUpgrade(item: Item, player: Player): boolean {
  if (item.type === "weapon" && player.equipment.weapon) {
    const currentAttack = player.equipment.weapon.stats?.attack ?? 0
    const newAttack = item.stats?.attack ?? 0
    return newAttack > currentAttack
  }

  if (item.type === "armor" && player.equipment.armor) {
    const currentDefense = player.equipment.armor.stats?.defense ?? 0
    const newDefense = item.stats?.defense ?? 0
    return newDefense > currentDefense
  }

  // No current equipment = always an upgrade
  if ((item.type === "weapon" && !player.equipment.weapon) ||
      (item.type === "armor" && !player.equipment.armor)) {
    return true
  }

  return false
}

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

// =============================================================================
// BATCH LOOT GENERATION
// =============================================================================

export interface BatchLootOptions {
  count: number
  context: LootContext
  guaranteeOneUpgrade?: boolean
  guaranteeRarity?: ItemRarity
}

export function generateLootBatch(options: BatchLootOptions): LootResult[] {
  const { count, context, guaranteeOneUpgrade = false, guaranteeRarity } = options
  const results: LootResult[] = []

  for (let i = 0; i < count; i++) {
    const isLastItem = i === count - 1

    // If we need to guarantee an upgrade and haven't gotten one yet
    const needsUpgrade = guaranteeOneUpgrade && isLastItem && !results.some(r => r.isUpgrade)

    const modifiedContext: LootContext = {
      ...context,
      guaranteeUseful: needsUpgrade || context.guaranteeUseful,
      recentLoot: [...(context.recentLoot || []), ...results.map(r => r.item)],
    }

    const result = generateSmartLoot(modifiedContext)

    // Force rarity if specified (for boss drops, etc.)
    if (guaranteeRarity && result.item.rarity !== guaranteeRarity) {
      // Regenerate with forced rarity
      if (result.item.type === "weapon") {
        result.item = generateWeapon({
          rarity: guaranteeRarity,
          floor: context.floor,
          forClass: context.player.class ?? undefined,
        })
      } else if (result.item.type === "armor") {
        result.item = generateArmor({
          rarity: guaranteeRarity,
          floor: context.floor,
          forClass: context.player.class ?? undefined,
        })
      }
      result.reason = `Guaranteed ${guaranteeRarity} drop`
    }

    results.push(result)
  }

  return results
}

// =============================================================================
// SPECIAL DROP TABLES
// =============================================================================

export function generateBossLoot(context: LootContext): LootResult[] {
  return generateLootBatch({
    count: 2 + Math.floor(context.floor / 3),
    context: { ...context, source: "boss" },
    guaranteeOneUpgrade: true,
    guaranteeRarity: context.floor >= 5 ? "rare" : "uncommon",
  })
}

export function generateVaultLoot(context: LootContext, vaultTier: 1 | 2 | 3): LootResult[] {
  const counts = { 1: 2, 2: 3, 3: 5 }
  const minRarities: Record<number, ItemRarity> = { 1: "uncommon", 2: "rare", 3: "rare" }

  return generateLootBatch({
    count: counts[vaultTier],
    context: { ...context, source: "vault" },
    guaranteeOneUpgrade: vaultTier >= 2,
    guaranteeRarity: minRarities[vaultTier],
  })
}

export function generateMerchantInventory(context: LootContext): Item[] {
  const items: Item[] = []

  // Generate 3-5 items with guaranteed useful selection
  const count = 3 + Math.floor(Math.random() * 3)

  for (let i = 0; i < count; i++) {
    const result = generateSmartLoot({
      ...context,
      source: "chest", // Use chest rarity for merchants
      guaranteeUseful: true,
    })
    items.push(result.item)
  }

  // Always include at least one consumable
  const hasConsumable = items.some(i => i.type === "potion")
  if (!hasConsumable) {
    items.push(generateConsumable({ floor: context.floor }))
  }

  return items
}
