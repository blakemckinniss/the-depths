/**
 * Spell Acquisition System
 *
 * Handles how players learn spells from various sources:
 * - Tomes/Spellbooks (items)
 * - Scrolls (study to learn permanently)
 * - Shrine blessings
 * - NPC teaching
 * - Quest rewards
 * - Events/Discovery
 */

import type { Item, Player, NPC } from "@/lib/core/game-types"
import type {
  Spell,
  SpellBook,
  SpellSource,
  SpellSchool,
  LearnSpellResult,
} from "./spell-system"
import {
  createSpell,
  learnSpell,
  canLearnSpell,
  getSpellFromTemplate,
  SPELL_TEMPLATES,
  SPELL_CONSTRAINTS_BY_SOURCE,
} from "./spell-system"
import { generateEntityId } from "@/lib/entity/entity-system"

// =============================================================================
// ITEM-BASED LEARNING (Tomes, Scrolls)
// =============================================================================

export interface TomeProps {
  teaches: string // Spell template ID or spell name
  school?: SpellSchool
  isConsumed?: boolean // True for scrolls that are used up
  studyTime?: number // Turns required to learn (0 = instant)
  prerequisiteSpells?: string[]
  levelRequired?: number
}

/**
 * Check if an item can teach a spell
 */
export function canTeachSpell(item: Item): boolean {
  // Check item category (tome or consumable scroll)
  if (item.category !== "tome" && item.subtype !== "scroll") {
    return false
  }

  // Check if it has teaching properties
  const tomeProps = (item as unknown as { tomeProps?: TomeProps }).tomeProps
  return !!tomeProps?.teaches
}

/**
 * Get what spell an item teaches
 */
export function getItemSpell(item: Item): Spell | null {
  const tomeProps = (item as unknown as { tomeProps?: TomeProps }).tomeProps
  if (!tomeProps?.teaches) return null

  // Try to get from templates
  const templateSpell = getSpellFromTemplate(tomeProps.teaches)
  if (templateSpell) {
    return {
      ...templateSpell,
      levelRequired: tomeProps.levelRequired ?? templateSpell.levelRequired,
      prerequisites: tomeProps.prerequisiteSpells
        ? { spells: tomeProps.prerequisiteSpells }
        : templateSpell.prerequisites,
    }
  }

  // Item might have the spell embedded
  const embeddedSpell = (item as unknown as { spell?: Spell }).spell
  if (embeddedSpell) {
    return embeddedSpell
  }

  return null
}

/**
 * Learn a spell from an item (tome or scroll)
 */
export function learnSpellFromItem(
  player: Player,
  spellBook: SpellBook,
  item: Item
): LearnSpellResult & { consumeItem: boolean } {
  if (!canTeachSpell(item)) {
    return {
      success: false,
      reason: "This item cannot teach spells",
      narration: `The ${item.name} contains no teachable magic.`,
      consumeItem: false,
    }
  }

  const spell = getItemSpell(item)
  if (!spell) {
    return {
      success: false,
      reason: "Could not determine spell",
      narration: `The magical text is too corrupted to read.`,
      consumeItem: false,
    }
  }

  const tomeProps = (item as unknown as { tomeProps?: TomeProps }).tomeProps

  // Check prerequisites
  const canLearn = canLearnSpell(player, spell, spellBook)
  if (!canLearn.canLearn) {
    return {
      success: false,
      reason: canLearn.reason,
      narration: `You study the ${item.name}, but ${canLearn.reason?.toLowerCase()}.`,
      consumeItem: false,
    }
  }

  // Determine source type
  const source: SpellSource = item.subtype === "scroll" ? "scroll_study" : "tome"

  // Learn the spell
  const result = learnSpell(player, spell, spellBook, source, item.id)

  // Determine if item is consumed
  const consumeItem = tomeProps?.isConsumed ?? item.subtype === "scroll"

  return {
    ...result,
    consumeItem,
    narration: result.success
      ? consumeItem
        ? `The ${item.name} crumbles to dust as you absorb its knowledge. ${spell.name} is now yours!`
        : `You carefully study the ${item.name}. ${spell.name} is now etched in your mind!`
      : result.narration,
  }
}

// =============================================================================
// SHRINE-BASED LEARNING
// =============================================================================

export interface ShrineSpellGrant {
  spellId: string
  school: SpellSchool
  description: string
  cost?: {
    type: "gold" | "health" | "sacrifice_item"
    amount?: number
    itemType?: string
  }
}

/**
 * Generate a spell grant for a shrine based on its type
 */
export function generateShrineSpell(
  shrineType: string,
  playerLevel: number
): ShrineSpellGrant | null {
  // Map shrine types to schools
  const shrineSchoolMap: Record<string, SpellSchool[]> = {
    "shrine of light": ["holy"],
    "shrine of darkness": ["shadow", "void"],
    "shrine of nature": ["nature"],
    "shrine of fire": ["fire"],
    "shrine of frost": ["ice"],
    "shrine of storms": ["lightning"],
    "shrine of spirits": ["spirit"],
    "shrine of knowledge": ["arcane", "transmutation"],
    "shrine of time": ["temporal"],
    "dark altar": ["blood", "shadow"],
    altar: ["holy", "nature"],
    shrine: ["universal", "arcane"],
  }

  // Find matching schools
  const lowerType = shrineType.toLowerCase()
  let schools: SpellSchool[] = ["universal"]
  for (const [key, value] of Object.entries(shrineSchoolMap)) {
    if (lowerType.includes(key)) {
      schools = value
      break
    }
  }

  const school = schools[Math.floor(Math.random() * schools.length)]

  // Find spells of this school appropriate for player level
  const candidates = Object.entries(SPELL_TEMPLATES)
    .filter(([, template]) => {
      return (
        template.school === school &&
        (template.levelRequired ?? 1) <= playerLevel + 2 &&
        (template.powerLevel ?? 5) <= Math.min(7, 3 + playerLevel)
      )
    })
    .map(([id]) => id)

  if (candidates.length === 0) return null

  const spellId = candidates[Math.floor(Math.random() * candidates.length)]
  const spell = getSpellFromTemplate(spellId)
  if (!spell) return null

  return {
    spellId,
    school,
    description: `The shrine offers to teach you ${spell.name}.`,
    cost:
      spell.powerLevel > 4
        ? { type: "gold", amount: spell.powerLevel * 20 }
        : undefined,
  }
}

/**
 * Learn a spell from a shrine
 */
export function learnSpellFromShrine(
  player: Player,
  spellBook: SpellBook,
  grant: ShrineSpellGrant
): LearnSpellResult {
  const spell = getSpellFromTemplate(grant.spellId)
  if (!spell) {
    return {
      success: false,
      reason: "Unknown spell",
      narration: "The shrine's magic fades before you can grasp it.",
    }
  }

  // Check if player can afford cost
  if (grant.cost) {
    switch (grant.cost.type) {
      case "gold":
        if (player.stats.gold < (grant.cost.amount ?? 0)) {
          return {
            success: false,
            reason: `Requires ${grant.cost.amount} gold`,
            narration: `The shrine demands ${grant.cost.amount} gold as an offering.`,
          }
        }
        break
      case "health":
        if (player.stats.health <= (grant.cost.amount ?? 0)) {
          return {
            success: false,
            reason: "Not enough health",
            narration: "The shrine's price would be your life.",
          }
        }
        break
    }
  }

  return learnSpell(player, spell, spellBook, "shrine", grant.spellId)
}

// =============================================================================
// NPC TEACHING
// =============================================================================

export interface NPCSpellOffer {
  spellId: string
  npcId: string
  npcName: string
  cost?: number // Gold cost
  reputation?: number // Minimum disposition required
  questRequired?: string // Quest ID that must be complete
  dialogue: string
}

/**
 * Generate spells an NPC can teach based on their type
 */
export function generateNPCSpellOffers(
  npc: NPC,
  playerLevel: number
): NPCSpellOffer[] {
  const offers: NPCSpellOffer[] = []

  // Determine what schools this NPC might teach based on their role/description
  const npcSchools: SpellSchool[] = []
  const description = (npc.description ?? "").toLowerCase()
  const name = npc.name.toLowerCase()

  if (description.includes("wizard") || description.includes("mage") || name.includes("mage")) {
    npcSchools.push("arcane", "fire", "ice")
  }
  if (description.includes("priest") || description.includes("cleric") || name.includes("priest")) {
    npcSchools.push("holy", "spirit")
  }
  if (description.includes("druid") || description.includes("nature")) {
    npcSchools.push("nature")
  }
  if (description.includes("warlock") || description.includes("dark")) {
    npcSchools.push("shadow", "blood")
  }
  if (description.includes("enchant")) {
    npcSchools.push("enchantment", "transmutation")
  }

  // Default if no match
  if (npcSchools.length === 0) {
    npcSchools.push("universal")
  }

  // Find teachable spells
  for (const school of npcSchools) {
    const candidates = Object.entries(SPELL_TEMPLATES)
      .filter(([, template]) => {
        return (
          template.school === school &&
          (template.levelRequired ?? 1) <= playerLevel + 1 &&
          (template.powerLevel ?? 5) <= 6
        )
      })
      .slice(0, 2) // Max 2 spells per school

    for (const [spellId, template] of candidates) {
      offers.push({
        spellId,
        npcId: npc.id,
        npcName: npc.name,
        cost: (template.powerLevel ?? 3) * 25,
        reputation: 40,
        dialogue: `"I can teach you ${template.name} for ${(template.powerLevel ?? 3) * 25} gold."`,
      })
    }
  }

  return offers
}

/**
 * Learn a spell from an NPC
 */
export function learnSpellFromNPC(
  player: Player,
  spellBook: SpellBook,
  offer: NPCSpellOffer
): LearnSpellResult & { goldCost: number } {
  const spell = getSpellFromTemplate(offer.spellId)
  if (!spell) {
    return {
      success: false,
      reason: "Unknown spell",
      narration: `${offer.npcName} seems confused about what they were going to teach.`,
      goldCost: 0,
    }
  }

  // Check gold
  const cost = offer.cost ?? 0
  if (player.stats.gold < cost) {
    return {
      success: false,
      reason: `Need ${cost} gold`,
      narration: `"Come back when you have ${cost} gold," ${offer.npcName} says.`,
      goldCost: 0,
    }
  }

  const result = learnSpell(player, spell, spellBook, "npc", offer.npcId)

  return {
    ...result,
    goldCost: result.success ? cost : 0,
    narration: result.success
      ? `${offer.npcName} spends time teaching you the intricacies of ${spell.name}. You have mastered it!`
      : result.narration,
  }
}

// =============================================================================
// EVENT-BASED LEARNING
// =============================================================================

export type SpellDiscoveryEvent =
  | "ancient_inscription" // Found writing that teaches spell
  | "dream_vision" // Learned in a dream
  | "divine_revelation" // God/spirit grants knowledge
  | "curse_inflicted" // Cursed with dark knowledge
  | "artifact_bond" // Bonded with magical artifact
  | "near_death" // Learned at death's door
  | "meditation" // Deep focus revealed spell
  | "enemy_absorbed" // Absorbed from defeated magical foe

export interface SpellDiscovery {
  eventType: SpellDiscoveryEvent
  spell: Spell
  narration: string
  sideEffects?: {
    type: "damage" | "heal" | "effect" | "gold"
    value?: number
    effect?: string
  }
}

/**
 * Generate a spell discovery for an event
 */
export function generateSpellDiscovery(
  eventType: SpellDiscoveryEvent,
  playerLevel: number,
  context?: { theme?: string; school?: SpellSchool }
): SpellDiscovery | null {
  // Map event types to appropriate schools and power levels
  const eventConfig: Record<
    SpellDiscoveryEvent,
    { schools: SpellSchool[]; maxPower: number; source: SpellSource }
  > = {
    ancient_inscription: {
      schools: ["arcane", "transmutation", "universal"],
      maxPower: 5,
      source: "discovery",
    },
    dream_vision: {
      schools: ["spirit", "illusion", "temporal"],
      maxPower: 6,
      source: "event",
    },
    divine_revelation: {
      schools: ["holy", "nature", "spirit"],
      maxPower: 7,
      source: "event",
    },
    curse_inflicted: {
      schools: ["shadow", "blood", "void"],
      maxPower: 7,
      source: "curse",
    },
    artifact_bond: {
      schools: ["arcane", "enchantment", "void"],
      maxPower: 8,
      source: "artifact",
    },
    near_death: {
      schools: ["shadow", "spirit", "blood"],
      maxPower: 6,
      source: "event",
    },
    meditation: {
      schools: ["universal", "nature", "spirit"],
      maxPower: 4,
      source: "discovery",
    },
    enemy_absorbed: {
      schools: ["shadow", "arcane", "blood"],
      maxPower: 6,
      source: "event",
    },
  }

  const config = eventConfig[eventType]
  const schools = context?.school ? [context.school] : config.schools
  const school = schools[Math.floor(Math.random() * schools.length)]

  // Find appropriate spell
  const candidates = Object.entries(SPELL_TEMPLATES).filter(([, template]) => {
    return (
      template.school === school &&
      (template.levelRequired ?? 1) <= playerLevel + 2 &&
      (template.powerLevel ?? 5) <= config.maxPower
    )
  })

  if (candidates.length === 0) return null

  const [spellId] = candidates[Math.floor(Math.random() * candidates.length)]
  const spell = getSpellFromTemplate(spellId)
  if (!spell) return null

  // Set source
  spell.source = config.source

  // Generate narration
  const narrations: Record<SpellDiscoveryEvent, string> = {
    ancient_inscription: `Ancient runes glow with power as you trace them. The spell ${spell.name} burns itself into your mind!`,
    dream_vision: `In a vivid dream, a voice teaches you the secrets of ${spell.name}. You wake with new knowledge.`,
    divine_revelation: `A divine presence touches your mind, granting you the power of ${spell.name}.`,
    curse_inflicted: `Dark energy forces its way into your mind. You now know ${spell.name}, but at what cost?`,
    artifact_bond: `The artifact pulses with power, sharing its knowledge of ${spell.name} with you.`,
    near_death: `At death's door, understanding floods your mind. You grasp ${spell.name} with desperate clarity.`,
    meditation: `Deep in meditation, the pattern of ${spell.name} reveals itself to your inner eye.`,
    enemy_absorbed: `As your foe falls, their magical essence flows into you. You absorb knowledge of ${spell.name}.`,
  }

  // Determine side effects for dangerous sources
  const sideEffects: SpellDiscovery["sideEffects"] =
    eventType === "curse_inflicted"
      ? { type: "effect", effect: "Cursed" }
      : eventType === "near_death"
        ? { type: "damage", value: 5 }
        : undefined

  return {
    eventType,
    spell,
    narration: narrations[eventType],
    sideEffects,
  }
}

/**
 * Apply a spell discovery to the player
 */
export function applySpellDiscovery(
  player: Player,
  spellBook: SpellBook,
  discovery: SpellDiscovery
): LearnSpellResult {
  return {
    ...learnSpell(player, discovery.spell, spellBook, discovery.spell.source ?? "event"),
    narration: discovery.narration,
  }
}

// =============================================================================
// QUEST REWARDS
// =============================================================================

export interface QuestSpellReward {
  questId: string
  spellId: string
  isGuaranteed: boolean // Always grant, or just unlock for purchase
}

/**
 * Generate a spell reward for completing a quest
 */
export function generateQuestSpellReward(
  questTheme: string,
  playerLevel: number
): QuestSpellReward | null {
  // Determine school based on quest theme
  const themeSchoolMap: Record<string, SpellSchool[]> = {
    undead: ["holy", "shadow"],
    demon: ["holy", "fire"],
    dragon: ["fire", "ice"],
    nature: ["nature"],
    arcane: ["arcane", "transmutation"],
    dark: ["shadow", "blood"],
    holy: ["holy", "spirit"],
    mystery: ["arcane", "illusion"],
    ancient: ["arcane", "temporal"],
  }

  let schools: SpellSchool[] = ["universal"]
  const lowerTheme = questTheme.toLowerCase()
  for (const [key, value] of Object.entries(themeSchoolMap)) {
    if (lowerTheme.includes(key)) {
      schools = value
      break
    }
  }

  const school = schools[Math.floor(Math.random() * schools.length)]

  // Quest rewards can be more powerful
  const candidates = Object.entries(SPELL_TEMPLATES).filter(([, template]) => {
    return (
      template.school === school &&
      (template.levelRequired ?? 1) <= playerLevel + 3 &&
      (template.powerLevel ?? 5) >= 4 // Quest rewards are at least moderate power
    )
  })

  if (candidates.length === 0) return null

  const [spellId] = candidates[Math.floor(Math.random() * candidates.length)]

  return {
    questId: generateEntityId("quest"),
    spellId,
    isGuaranteed: true,
  }
}

// =============================================================================
// SPELL ITEM GENERATION
// =============================================================================

/**
 * Create a tome item that teaches a specific spell
 */
export function createSpellTome(
  spellId: string,
  rarity: "common" | "uncommon" | "rare" | "legendary" = "uncommon"
): Item | null {
  const spell = getSpellFromTemplate(spellId)
  if (!spell) return null

  const rarityValues = {
    common: 25,
    uncommon: 75,
    rare: 200,
    legendary: 500,
  }

  return {
    id: generateEntityId("item"),
    name: `${spell.school.charAt(0).toUpperCase() + spell.school.slice(1)} Tome: ${spell.name}`,
    entityType: "item",
    type: "misc", // Legacy type field
    category: "tome",
    subtype: `spellbook_${spell.school}` as const,
    rarity,
    description: `A tome teaching the ${spell.school} spell "${spell.name}". ${spell.description}`,
    value: rarityValues[rarity],
    stats: {},
    tomeProps: {
      teaches: spellId,
      school: spell.school,
      isConsumed: false,
      levelRequired: spell.levelRequired,
    },
  } as Item
}

/**
 * Create a scroll item that teaches a spell (consumed on use)
 */
export function createSpellScroll(spellId: string): Item | null {
  const spell = getSpellFromTemplate(spellId)
  if (!spell) return null

  return {
    id: generateEntityId("item"),
    name: `Scroll of ${spell.name}`,
    entityType: "item",
    type: "misc", // Legacy type field
    category: "consumable",
    subtype: "scroll",
    rarity: spell.rarity,
    description: `A scroll containing the spell "${spell.name}". Study it to permanently learn the spell.`,
    value: (spell.powerLevel ?? 3) * 15,
    stats: {},
    tomeProps: {
      teaches: spellId,
      school: spell.school,
      isConsumed: true,
      levelRequired: spell.levelRequired,
    },
  } as Item
}

/**
 * Generate a random spell tome appropriate for the floor
 */
export function generateRandomSpellTome(floor: number): Item | null {
  const maxPower = Math.min(8, 2 + floor)

  const candidates = Object.entries(SPELL_TEMPLATES).filter(([, template]) => {
    return (
      (template.levelRequired ?? 1) <= floor + 3 &&
      (template.powerLevel ?? 5) <= maxPower
    )
  })

  if (candidates.length === 0) return null

  const [spellId] = candidates[Math.floor(Math.random() * candidates.length)]

  // Rarity based on spell power
  const spell = getSpellFromTemplate(spellId)
  const rarity: "common" | "uncommon" | "rare" | "legendary" =
    (spell?.powerLevel ?? 3) >= 7
      ? "legendary"
      : (spell?.powerLevel ?? 3) >= 5
        ? "rare"
        : (spell?.powerLevel ?? 3) >= 3
          ? "uncommon"
          : "common"

  return createSpellTome(spellId, rarity)
}
