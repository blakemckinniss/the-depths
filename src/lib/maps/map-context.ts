/**
 * Map Context System
 *
 * Provides thematic content for map-based dungeon generation:
 * - Biome-specific enemy archetypes
 * - Modifier-aware flavor text
 * - Boss theming hints
 * - Thematic loot bonuses
 */

import type { DungeonModifier } from "../core/game-types"

// =============================================================================
// BIOME ENEMY ARCHETYPES
// =============================================================================

export interface BiomeEnemyPool {
  commonEnemies: string[]
  eliteEnemies: string[]
  bossArchetypes: string[]
  bossNamePrefixes: string[]
  bossTitles: string[]
  ambientCreatures: string[]
  trapThemes: string[]
}

export const BIOME_ENEMY_POOLS: Record<string, BiomeEnemyPool> = {
  underground: {
    commonEnemies: [
      "Cave Crawler", "Tunnel Rat", "Blind Grub", "Stone Beetle",
      "Fungal Shambler", "Mole Digger", "Crystal Spider", "Deep Gnome",
    ],
    eliteEnemies: [
      "Cavern Stalker", "Quartz Golem", "Myconid Elder", "Burrowing Horror",
    ],
    bossArchetypes: ["ancient burrower", "crystal monarch", "fungal overmind", "stone titan"],
    bossNamePrefixes: ["Deep", "Ancient", "Primordial", "Forgotten"],
    bossTitles: ["the Buried", "Lord of Stone", "Keeper of the Depths", "the Unearthed"],
    ambientCreatures: ["blind fish", "cave moss", "dripping stalactites"],
    trapThemes: ["pit traps", "falling rocks", "gas vents", "unstable floors"],
  },
  void: {
    commonEnemies: [
      "Void Wisp", "Shadow Imp", "Null Walker", "Entropy Husk",
      "Rift Spawn", "Dark Echo", "Abyssal Leech", "Nether Shade",
    ],
    eliteEnemies: [
      "Void Knight", "Reality Bender", "Chaos Weaver", "Null Priest",
    ],
    bossArchetypes: ["reality anchor", "void monarch", "entropy incarnate", "cosmic horror"],
    bossNamePrefixes: ["Null", "Void", "Eternal", "Endless"],
    bossTitles: ["the Unmade", "Devourer of Light", "Herald of Nothing", "the Formless"],
    ambientCreatures: ["floating debris", "reality tears", "impossible geometry"],
    trapThemes: ["gravity wells", "reality rifts", "void portals", "mind traps"],
  },
  cursed: {
    commonEnemies: [
      "Cursed Wraith", "Blighted Peasant", "Tainted Spirit", "Hex Walker",
      "Doom Thrall", "Woe Bound", "Misery Shade", "Jinxed Soul",
    ],
    eliteEnemies: [
      "Curse Bearer", "Doom Prophet", "Blight Lord", "Woe Bringer",
    ],
    bossArchetypes: ["curse origin", "doom herald", "blight mother", "sorrow incarnate"],
    bossNamePrefixes: ["Cursed", "Doomed", "Blighted", "Forsaken"],
    bossTitles: ["the Accursed", "Bearer of Woe", "Font of Misery", "the Damned"],
    ambientCreatures: ["weeping walls", "cursed runes", "blackened vegetation"],
    trapThemes: ["curse triggers", "despair zones", "hex circles", "corruption pools"],
  },
  infernal: {
    commonEnemies: [
      "Fire Imp", "Ash Zombie", "Ember Sprite", "Cinder Wraith",
      "Magma Slime", "Hellhound Pup", "Flame Wisp", "Burning Skeleton",
    ],
    eliteEnemies: [
      "Infernal Knight", "Flame Djinn", "Ash Titan", "Ember Lord",
    ],
    bossArchetypes: ["fire elemental lord", "demon prince", "magma colossus", "flame archon"],
    bossNamePrefixes: ["Burning", "Scorched", "Infernal", "Blazing"],
    bossTitles: ["the Incinerator", "Lord of Flames", "Ashen King", "the Everburning"],
    ambientCreatures: ["lava bubbles", "ash clouds", "flickering flames"],
    trapThemes: ["fire jets", "lava pits", "explosive runes", "heat waves"],
  },
  frozen: {
    commonEnemies: [
      "Ice Imp", "Frost Zombie", "Snow Wraith", "Frozen Corpse",
      "Ice Spider", "Chill Shade", "Blizzard Wisp", "Permafrost Skeleton",
    ],
    eliteEnemies: [
      "Frost Giant", "Ice Elemental", "Blizzard Lord", "Frozen Knight",
    ],
    bossArchetypes: ["ice elemental lord", "frost wyrm", "blizzard archon", "frozen titan"],
    bossNamePrefixes: ["Frozen", "Glacial", "Bitter", "Eternal"],
    bossTitles: ["the Frigid", "Lord of Winter", "the Unthawed", "Heart of Ice"],
    ambientCreatures: ["icicles", "frozen corpses", "frost crystals"],
    trapThemes: ["ice floors", "freezing mist", "avalanches", "cryo vents"],
  },
  undead: {
    commonEnemies: [
      "Shambling Corpse", "Skeletal Warrior", "Ghoul", "Zombie",
      "Wight", "Specter", "Bone Crawler", "Rotting Husk",
    ],
    eliteEnemies: [
      "Death Knight", "Lich Acolyte", "Grave Lord", "Bone Colossus",
    ],
    bossArchetypes: ["lich king", "death lord", "necromancer supreme", "bone emperor"],
    bossNamePrefixes: ["Deathless", "Eternal", "Ancient", "Risen"],
    bossTitles: ["the Undying", "Lord of Bones", "Master of Death", "the Reanimated"],
    ambientCreatures: ["scattered bones", "grave dirt", "spectral lights"],
    trapThemes: ["coffin traps", "bone spikes", "necrotic gas", "soul snares"],
  },
  corrupted: {
    commonEnemies: [
      "Tainted Villager", "Corruption Spawn", "Blight Beast", "Dark Mutant",
      "Infected Rat", "Corrupt Hound", "Ooze", "Aberration",
    ],
    eliteEnemies: [
      "Corruption Champion", "Blight Knight", "Mutated Abomination", "Dark Emissary",
    ],
    bossArchetypes: ["corruption heart", "blight incarnate", "mutant overlord", "aberrant god"],
    bossNamePrefixes: ["Corrupted", "Tainted", "Mutated", "Aberrant"],
    bossTitles: ["the Infected", "Source of Blight", "Father of Mutations", "the Unclean"],
    ambientCreatures: ["pulsing growths", "corrupted pools", "mutant spores"],
    trapThemes: ["corruption zones", "mutation fields", "toxic clouds", "infection pools"],
  },
  ancient: {
    commonEnemies: [
      "Stone Guardian", "Ancient Sentinel", "Ruin Walker", "Temple Guard",
      "Forgotten Servant", "Dust Elemental", "Time-Lost Warrior", "Relic Golem",
    ],
    eliteEnemies: [
      "Temple Champion", "Ancient Construct", "Eternal Guardian", "Ruin Lord",
    ],
    bossArchetypes: ["ancient king", "temple guardian", "time lord", "relic emperor"],
    bossNamePrefixes: ["Ancient", "Eternal", "Ageless", "Timeless"],
    bossTitles: ["the Unchanging", "Guardian of Ages", "Lord of Ruins", "the Everlasting"],
    ambientCreatures: ["floating runes", "ancient glyphs", "dust motes"],
    trapThemes: ["pressure plates", "arrow traps", "collapsing floors", "magical wards"],
  },
  fey: {
    commonEnemies: [
      "Thorn Sprite", "Wisp", "Pixie Trickster", "Corrupted Dryad",
      "Fey Hound", "Dream Walker", "Glamour Ghost", "Twisted Treant",
    ],
    eliteEnemies: [
      "Fey Knight", "Dream Weaver", "Thorn Lord", "Wild Huntsman",
    ],
    bossArchetypes: ["fey monarch", "dream lord", "wild hunt leader", "nature's wrath"],
    bossNamePrefixes: ["Wild", "Dreaming", "Twisted", "Enchanted"],
    bossTitles: ["the Dreamer", "Lord of Thorns", "Master of Glamour", "the Wild One"],
    ambientCreatures: ["dancing lights", "singing flowers", "moving shadows"],
    trapThemes: ["illusion traps", "enchanted snares", "thorn walls", "sleep mist"],
  },
  demonic: {
    commonEnemies: [
      "Lesser Demon", "Imp", "Hellspawn", "Tormented Soul",
      "Demon Hound", "Sin Eater", "Damned Spirit", "Flesh Golem",
    ],
    eliteEnemies: [
      "Demon Knight", "Pit Fiend", "Sin Lord", "Hell Baron",
    ],
    bossArchetypes: ["demon lord", "archdevil", "sin incarnate", "hell prince"],
    bossNamePrefixes: ["Infernal", "Abyssal", "Damned", "Hellborn"],
    bossTitles: ["the Tormentor", "Prince of Sin", "Lord of the Pit", "the Corruptor"],
    ambientCreatures: ["screaming souls", "blood pools", "chains and hooks"],
    trapThemes: ["blood altars", "soul cages", "hellfire vents", "torment zones"],
  },
}

// Fallback pool for unknown biomes
const DEFAULT_ENEMY_POOL: BiomeEnemyPool = {
  commonEnemies: ["Dungeon Crawler", "Dark Creature", "Shadow Beast", "Ancient Horror"],
  eliteEnemies: ["Elite Guardian", "Dungeon Lord", "Dark Champion"],
  bossArchetypes: ["dungeon master", "ancient evil", "dark lord"],
  bossNamePrefixes: ["Dark", "Ancient", "Terrible", "Mighty"],
  bossTitles: ["the Destroyer", "Lord of Darkness", "Master of Evil"],
  ambientCreatures: ["shadows", "dripping water", "distant echoes"],
  trapThemes: ["spike traps", "poison darts", "pressure plates"],
}

export function getBiomeEnemyPool(biome?: string): BiomeEnemyPool {
  if (!biome) return DEFAULT_ENEMY_POOL
  const normalized = biome.toLowerCase()
  return BIOME_ENEMY_POOLS[normalized] ?? DEFAULT_ENEMY_POOL
}

// =============================================================================
// MODIFIER FLAVOR TEXT
// =============================================================================

export interface ModifierFlavorContext {
  atmosphereHints: string[]
  enemyBehaviorHints: string[]
  lootHints: string[]
  dialogueSnippets: string[]
}

const MODIFIER_FLAVOR: Record<string, ModifierFlavorContext> = {
  echoing: {
    atmosphereHints: [
      "Every footstep echoes endlessly",
      "Sounds carry unnaturally far",
      "Whispers seem to come from everywhere",
    ],
    enemyBehaviorHints: [
      "Enemies call for backup when injured",
      "Reinforcements arrive quickly",
      "Creatures hunt in coordinated packs",
    ],
    lootHints: ["Communication devices", "Horns and bells", "Scout gear"],
    dialogueSnippets: [
      "The walls carry your screams to every corner.",
      "They hear everything. They're already coming.",
      "Sound is your enemy here.",
    ],
  },
  fortified: {
    atmosphereHints: [
      "Thick-skinned creatures lurk here",
      "The air feels heavy and oppressive",
      "Everything seems hardened and resistant",
    ],
    enemyBehaviorHints: [
      "Enemies have enhanced defenses",
      "Creatures form defensive formations",
      "Armored variants are common",
    ],
    lootHints: ["Heavy armor", "Shields", "Defensive items"],
    dialogueSnippets: [
      "Your blades will dull against these hides.",
      "They've adapted to survive anything.",
      "Strength alone won't break them.",
    ],
  },
  trapped: {
    atmosphereHints: [
      "The floor seems unstable",
      "Suspicious mechanisms line the walls",
      "Every surface could be deadly",
    ],
    enemyBehaviorHints: [
      "Enemies lure you into traps",
      "Creatures avoid certain areas",
      "Ambushes near trap clusters",
    ],
    lootHints: ["Trap components", "Disarming tools", "Protective boots"],
    dialogueSnippets: [
      "Watch your step. Every step.",
      "The builders were paranoid... or brilliant.",
      "If it looks safe, it isn't.",
    ],
  },
  sacred: {
    atmosphereHints: [
      "Divine energy permeates the air",
      "Faint holy light flickers in alcoves",
      "Prayers echo from distant shrines",
    ],
    enemyBehaviorHints: [
      "Undead avoid certain areas",
      "Holy creatures patrol here",
      "Enemies are drawn to desecrate shrines",
    ],
    lootHints: ["Holy relics", "Blessed equipment", "Divine scrolls"],
    dialogueSnippets: [
      "The gods haven't abandoned this place entirely.",
      "Even in darkness, light finds a way.",
      "Seek the shrines. They will aid you.",
    ],
  },
  haunted: {
    atmosphereHints: [
      "Spectral whispers fill the air",
      "Translucent figures drift at the edge of vision",
      "The temperature drops inexplicably",
    ],
    enemyBehaviorHints: [
      "Spirits phase through walls",
      "Ghost allies may assist you",
      "The dead here are restless but some are friendly",
    ],
    lootHints: ["Spirit-touched items", "Ectoplasmic residue", "Ghost-forged gear"],
    dialogueSnippets: [
      "The dead walk here. Not all are hostile.",
      "Listen to the whispers. They remember secrets.",
      "Between life and death lies opportunity.",
    ],
  },
  bountiful: {
    atmosphereHints: [
      "Treasure glints in unexpected places",
      "The dungeon feels rich with potential",
      "Gold dust coats ancient surfaces",
    ],
    enemyBehaviorHints: [
      "Enemies guard treasure hoards",
      "Creatures carry valuable trinkets",
      "Greed has drawn powerful foes",
    ],
    lootHints: ["Enhanced drops", "Rare materials", "Valuable gems"],
    dialogueSnippets: [
      "Fortune favors the bold today.",
      "Riches beyond measure await.",
      "The dungeon rewards those who delve deep.",
    ],
  },
  deadly: {
    atmosphereHints: [
      "A palpable sense of danger fills the air",
      "Everything here is more lethal",
      "Death lurks around every corner",
    ],
    enemyBehaviorHints: [
      "Enemies hit significantly harder",
      "Creatures are more aggressive",
      "Lethal variants are common",
    ],
    lootHints: ["Deadly weapons", "Critical strike gear", "Damage enhancers"],
    dialogueSnippets: [
      "One mistake here means death.",
      "They've evolved to kill efficiently.",
      "Respect your enemies, or join the dead.",
    ],
  },
  resilient: {
    atmosphereHints: [
      "Creatures here have adapted to survive",
      "Life clings stubbornly to these halls",
      "Even the weakest foes refuse to fall easily",
    ],
    enemyBehaviorHints: [
      "Enemies have much more health",
      "Creatures regenerate slowly",
      "Prolonged fights are inevitable",
    ],
    lootHints: ["Endurance gear", "Regeneration items", "Sustained damage weapons"],
    dialogueSnippets: [
      "They don't die easily here.",
      "Patience will be your greatest weapon.",
      "Wear them down. It's the only way.",
    ],
  },
  treasureHoard: {
    atmosphereHints: [
      "Gold gleams from every shadow",
      "Ancient wealth lies forgotten",
      "Dragon-worthy hoards await",
    ],
    enemyBehaviorHints: [
      "Treasure guardians are especially fierce",
      "Greed-maddened creatures roam",
      "The most dangerous foes guard the best loot",
    ],
    lootHints: ["Legendary items", "Ancient artifacts", "Massive gold piles"],
    dialogueSnippets: [
      "Wealth beyond imagining. If you survive.",
      "Greed killed the last adventurers. Will it kill you?",
      "The greatest treasures demand the greatest sacrifices.",
    ],
  },
  corrupted: {
    atmosphereHints: [
      "Dark energy twists the very air",
      "Corruption spreads across every surface",
      "Reality feels unstable and wrong",
    ],
    enemyBehaviorHints: [
      "Enemies are empowered by dark energy",
      "Creatures have enhanced stats across the board",
      "Corruption grants unnatural strength",
    ],
    lootHints: ["Corrupted equipment", "Dark artifacts", "Tainted gems"],
    dialogueSnippets: [
      "The corruption strengthens them. Don't let it touch you.",
      "Power without cost is a lie. They paid the price.",
      "This darkness has a source. Find it.",
    ],
  },
  sanctuary: {
    atmosphereHints: [
      "Blessed calm fills certain chambers",
      "Ancient protections ward against traps",
      "Shrines are plentiful and welcoming",
    ],
    enemyBehaviorHints: [
      "Safe zones exist between battles",
      "Enemies respect certain boundaries",
      "Healing opportunities are common",
    ],
    lootHints: ["Protective talismans", "Healing items", "Warding charms"],
    dialogueSnippets: [
      "The builders left sanctuaries. Use them.",
      "Not all of this place is hostile.",
      "Rest when you can. The storms will come.",
    ],
  },
}

export function getModifierFlavor(modifierId: string): ModifierFlavorContext | null {
  return MODIFIER_FLAVOR[modifierId] ?? null
}

export function buildModifierContext(modifiers: DungeonModifier[]): string {
  if (!modifiers || modifiers.length === 0) return ""

  const lines: string[] = []
  lines.push("")
  lines.push("=== MAP MODIFIER EFFECTS (MANDATORY) ===")
  lines.push("These modifiers MUST influence ALL generated content:")
  lines.push("")

  for (const mod of modifiers) {
    lines.push(`**${mod.name}** - ${mod.description}`)
    const flavor = getModifierFlavor(mod.id)
    if (flavor) {
      lines.push(`  Atmosphere: ${flavor.atmosphereHints[0]}`)
      lines.push(`  Enemy behavior: ${flavor.enemyBehaviorHints[0]}`)
    }
    lines.push("")
  }

  lines.push("CRITICAL: Encounters, dialogue, and atmosphere MUST reflect these modifiers.")
  return lines.join("\n")
}

// =============================================================================
// BOSS GENERATION CONTEXT
// =============================================================================

export interface BossThemeContext {
  archetypePool: string[]
  namePrefixes: string[]
  titles: string[]
  phaseThemes: string[]
  deathQuotes: string[]
}

export function buildBossContext(
  biome: string,
  tier: number,
  modifiers: DungeonModifier[],
): BossThemeContext {
  const pool = getBiomeEnemyPool(biome)
  const tierDescriptor = tier <= 3 ? "lesser" : tier <= 6 ? "greater" : tier <= 9 ? "supreme" : "ultimate"

  // Build modifier-influenced death quotes
  const deathQuotes: string[] = []
  for (const mod of modifiers) {
    const flavor = getModifierFlavor(mod.id)
    if (flavor) {
      deathQuotes.push(flavor.dialogueSnippets[Math.floor(Math.random() * flavor.dialogueSnippets.length)])
    }
  }

  // Add default death quotes
  deathQuotes.push(
    "This is not the end...",
    "Others will finish what I started...",
    "You have only delayed the inevitable...",
  )

  return {
    archetypePool: pool.bossArchetypes.map((a) => `${tierDescriptor} ${a}`),
    namePrefixes: pool.bossNamePrefixes,
    titles: pool.bossTitles,
    phaseThemes: [
      `Phase 1: ${tierDescriptor} aggression`,
      `Phase 2: Desperate fury at 60% health`,
      `Phase 3: Final stand at 30% health`,
    ],
    deathQuotes,
  }
}

export function buildBossPromptSection(
  biome: string,
  tier: number,
  modifiers: DungeonModifier[],
): string {
  const ctx = buildBossContext(biome, tier, modifiers)
  const pool = getBiomeEnemyPool(biome)

  const lines: string[] = []
  lines.push("")
  lines.push("=== BOSS GENERATION GUIDELINES ===")
  lines.push(`Biome: ${biome} | Tier: ${tier}/10`)
  lines.push("")
  lines.push("**Archetype suggestions:** " + ctx.archetypePool.join(", "))
  lines.push("**Name prefixes:** " + ctx.namePrefixes.join(", "))
  lines.push("**Titles:** " + ctx.titles.join(", "))
  lines.push("")
  lines.push("**Boss must reflect active modifiers:**")

  for (const mod of modifiers) {
    const flavor = getModifierFlavor(mod.id)
    if (flavor) {
      lines.push(`- ${mod.name}: ${flavor.enemyBehaviorHints[0]}`)
    }
  }

  lines.push("")
  lines.push(`**Thematic attacks should use:** ${pool.trapThemes.join(", ")}`)

  return lines.join("\n")
}

// =============================================================================
// ENEMY SPAWN HINTS FOR AI
// =============================================================================

export function buildEnemySpawnHints(
  biome: string,
  tier: number,
  modifiers: DungeonModifier[],
): string {
  const pool = getBiomeEnemyPool(biome)

  const lines: string[] = []
  lines.push("")
  lines.push("=== ENEMY SPAWN POOLS ===")
  lines.push(`Use enemies thematic to the ${biome} biome.`)
  lines.push("")
  lines.push("**Common enemies:** " + pool.commonEnemies.slice(0, 6).join(", "))
  lines.push("**Elite enemies:** " + pool.eliteEnemies.join(", "))
  lines.push("")

  // Add modifier-specific enemy hints
  const hasDeadly = modifiers.some((m) => m.id === "deadly")
  const hasResilient = modifiers.some((m) => m.id === "resilient")
  const hasEchoing = modifiers.some((m) => m.id === "echoing")

  if (hasDeadly) {
    lines.push("**DEADLY modifier:** Describe enemies as more aggressive, vicious, empowered.")
  }
  if (hasResilient) {
    lines.push("**RESILIENT modifier:** Describe enemies as heavily armored, thick-skinned, stubborn.")
  }
  if (hasEchoing) {
    lines.push("**ECHOING modifier:** Groups attack together; injured enemies call for reinforcements.")
  }

  lines.push("")
  lines.push(`**Ambient details:** ${pool.ambientCreatures.join(", ")}`)
  lines.push(`**Trap themes:** ${pool.trapThemes.join(", ")}`)

  return lines.join("\n")
}

// =============================================================================
// LOOT MODIFIER BONUSES
// =============================================================================

export interface ModifierLootBonus {
  rarityBonus: number
  goldMultiplier: number
  specialDropChance: number
  preferredTypes: string[]
}

export function calculateModifierLootBonuses(modifiers: DungeonModifier[]): ModifierLootBonus {
  let rarityBonus = 0
  let goldMultiplier = 1.0
  let specialDropChance = 0
  const preferredTypes: string[] = []

  for (const mod of modifiers) {
    switch (mod.id) {
      case "bountiful":
        rarityBonus += 0.1
        goldMultiplier += 0.2
        break
      case "treasureHoard":
        rarityBonus += 0.25
        goldMultiplier += 0.5
        specialDropChance += 0.15
        break
      case "deadly":
        rarityBonus += 0.05 // Risk/reward
        preferredTypes.push("weapon")
        break
      case "resilient":
        preferredTypes.push("armor")
        break
      case "sacred":
        specialDropChance += 0.1
        preferredTypes.push("accessory")
        break
      case "corrupted":
        rarityBonus += 0.1
        specialDropChance += 0.05
        break
      case "haunted":
        specialDropChance += 0.08
        break
      case "sanctuary":
        preferredTypes.push("consumable")
        break
      // echoing, trapped, fortified don't directly affect loot
    }
  }

  return {
    rarityBonus: Math.min(rarityBonus, 0.5), // Cap at +50%
    goldMultiplier: Math.min(goldMultiplier, 2.0), // Cap at 2x
    specialDropChance: Math.min(specialDropChance, 0.4), // Cap at 40%
    preferredTypes,
  }
}

// =============================================================================
// FULL AI CONTEXT BUILDER
// =============================================================================

export function buildFullMapContext(
  biome: string,
  tier: number,
  modifiers: DungeonModifier[],
  options: {
    includeEnemyHints?: boolean
    includeBossHints?: boolean
    includeModifierFlavor?: boolean
  } = {},
): string {
  const parts: string[] = []

  if (options.includeModifierFlavor !== false && modifiers.length > 0) {
    parts.push(buildModifierContext(modifiers))
  }

  if (options.includeEnemyHints !== false) {
    parts.push(buildEnemySpawnHints(biome, tier, modifiers))
  }

  if (options.includeBossHints) {
    parts.push(buildBossPromptSection(biome, tier, modifiers))
  }

  return parts.join("\n")
}
