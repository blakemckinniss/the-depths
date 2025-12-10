import type {
  Enemy,
  Item,
  ItemRarity,
  DungeonKey,
  DungeonCard,
  KeyRarity,
  Boss,
  NPC,
  Trap,
  Shrine,
  Companion,
  Player,
  RunSummary,
} from "./game-types"
import { createNPC, createCompanion, createBoss, TRAP_TEMPLATES, SHRINE_TEMPLATES } from "@/lib/entity/entity-system"

// Import new item generation systems
import {
  generateWeapon as generateWeaponNew,
  generateArmor as generateArmorNew,
  rollRarity as rollRarityNew,
  type GenerateWeaponOptions,
  type GenerateArmorOptions,
} from "@/lib/items/item-generator"
import { generateConsumable } from "@/lib/items/consumable-system"

// Re-export rollRarity for backward compatibility
export function rollRarity(): ItemRarity {
  return rollRarityNew(0)
}

// Wrapper for new weapon generator (backward compatible)
export function generateWeapon(floorBonus = 0): Item {
  return generateWeaponNew({ floor: floorBonus + 1 })
}

// Wrapper for new armor generator (backward compatible)
export function generateArmor(floorBonus = 0): Item {
  return generateArmorNew({ floor: floorBonus + 1 })
}

// Wrapper for new consumable generator (backward compatible)
export function generatePotion(): Item {
  return generateConsumable({ subtype: "health_potion" })
}

const enemyTemplates = [
  { name: "Cave Rat", baseHealth: 12, baseAttack: 3, baseDefense: 1, expMult: 1, goldMult: 1 },
  { name: "Goblin Scout", baseHealth: 18, baseAttack: 5, baseDefense: 2, expMult: 1.2, goldMult: 1.3 },
  { name: "Skeletal Warrior", baseHealth: 25, baseAttack: 6, baseDefense: 4, expMult: 1.5, goldMult: 1.5 },
  { name: "Orc Brute", baseHealth: 35, baseAttack: 8, baseDefense: 5, expMult: 2, goldMult: 2 },
  { name: "Dark Cultist", baseHealth: 22, baseAttack: 10, baseDefense: 3, expMult: 1.8, goldMult: 1.7 },
  { name: "Venomous Spider", baseHealth: 20, baseAttack: 9, baseDefense: 2, expMult: 1.4, goldMult: 1.2 },
  { name: "Stone Golem", baseHealth: 50, baseAttack: 7, baseDefense: 8, expMult: 2.5, goldMult: 2.5 },
  { name: "Shadow Wraith", baseHealth: 30, baseAttack: 12, baseDefense: 4, expMult: 2.2, goldMult: 2 },
]

const bossTemplates = [
  { name: "The Hollow King", baseHealth: 80, baseAttack: 14, baseDefense: 8, expMult: 5, goldMult: 5 },
  { name: "Dreadlord Malachar", baseHealth: 100, baseAttack: 16, baseDefense: 10, expMult: 6, goldMult: 6 },
  { name: "Abyssal Hydra", baseHealth: 120, baseAttack: 18, baseDefense: 7, expMult: 7, goldMult: 7 },
]

export function generateEnemy(floor: number, isBoss = false): Enemy {
  const templates = isBoss ? bossTemplates : enemyTemplates
  const template = templates[Math.floor(Math.random() * templates.length)]
  const floorScale = 1 + (floor - 1) * 0.15

  // Calculate monster tier based on floor and boss status
  const monsterTier = Math.min(5, Math.floor(floor / 2) + 1 + (isBoss ? 1 : 0))

  const enemy: Enemy = {
    id: crypto.randomUUID(),
    entityType: "enemy",
    name: template.name,
    health: Math.floor(template.baseHealth * floorScale),
    maxHealth: Math.floor(template.baseHealth * floorScale),
    attack: Math.floor(template.baseAttack * floorScale),
    defense: Math.floor(template.baseDefense * floorScale),
    expReward: Math.floor(15 * template.expMult * floorScale),
    goldReward: Math.floor((5 + Math.random() * 10) * template.goldMult * floorScale),
    monsterTier,
  }

  if (Math.random() < (isBoss ? 0.8 : 0.25)) {
    enemy.loot = Math.random() < 0.5 ? generateWeapon(floor - 1) : generateArmor(floor - 1)
  }

  // Generate material drops (70% chance for bosses, 40% for regular enemies)
  if (Math.random() < (isBoss ? 0.7 : 0.4)) {
    try {
      const { generateMonsterMaterialDrops } = require("./material-system")
      enemy.materialDrops = generateMonsterMaterialDrops(template.name, monsterTier, floor)
    } catch {
      // Material system not available, skip
    }
  }

  // Apply enemy rank system - chance for Rare/Unique/etc enemies
  const { createRankedEnemy } = require("./enemy-rank-system")
  return createRankedEnemy(enemy, floor)
}

export function generateBoss(floor: number): Boss {
  const templates = bossTemplates
  const template = templates[Math.floor(Math.random() * templates.length)]
  const floorScale = 1 + (floor - 1) * 0.2

  const health = Math.floor(template.baseHealth * floorScale)
  const attack = Math.floor(template.baseAttack * floorScale)
  const defense = Math.floor(template.baseDefense * floorScale)

  return createBoss({
    name: template.name,
    health,
    maxHealth: health,
    attack,
    defense,
    expReward: Math.floor(50 * template.expMult * floorScale),
    goldReward: Math.floor(30 * template.goldMult * floorScale),
    guaranteedLoot: [generateWeapon(floor), Math.random() < 0.5 ? generateArmor(floor) : generatePotion()],
    phases: [
      { name: "Awakened", healthThreshold: 100, attackModifier: 1, defenseModifier: 1 },
      {
        name: "Enraged",
        healthThreshold: 60,
        attackModifier: 1.3,
        defenseModifier: 0.9,
        specialAbility: "Devastating Strike",
      },
      {
        name: "Desperate",
        healthThreshold: 30,
        attackModifier: 1.6,
        defenseModifier: 0.7,
        specialAbility: "Death Throes",
      },
    ],
  })
}

export function generateTrap(floor: number): Trap {
  const trapTypes = Object.keys(TRAP_TEMPLATES) as Array<keyof typeof TRAP_TEMPLATES>
  const trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)]
  const baseTrap = TRAP_TEMPLATES[trapType]()

  const floorScale = 1 + (floor - 1) * 0.1
  if (baseTrap.damage) {
    baseTrap.damage = Math.floor(baseTrap.damage * floorScale)
  }
  baseTrap.disarmDC = Math.floor(baseTrap.disarmDC + floor * 0.5)

  return baseTrap
}

export function generateShrine(floor: number): Shrine {
  const shrineTypes = Object.keys(SHRINE_TEMPLATES) as Array<keyof typeof SHRINE_TEMPLATES>
  const shrineType = shrineTypes[Math.floor(Math.random() * shrineTypes.length)]
  const shrine = SHRINE_TEMPLATES[shrineType]()

  if (shrine.cost?.gold) {
    shrine.cost.gold = Math.floor(shrine.cost.gold * (1 + floor * 0.2))
  }

  return shrine
}

const npcTemplates = {
  merchant: [
    { name: "Grizzled Trader", personality: "Pragmatic and suspicious" },
    { name: "Hooded Peddler", personality: "Nervous and secretive" },
    { name: "Dwarven Merchant", personality: "Gruff but fair" },
  ],
  trapped: [
    { name: "Wounded Adventurer", personality: "Desperate and grateful" },
    { name: "Caged Prisoner", personality: "Fearful and distrustful" },
    { name: "Lost Scholar", personality: "Confused but knowledgeable" },
  ],
  mysterious: [
    { name: "Cloaked Figure", personality: "Cryptic and all-knowing" },
    { name: "Ghostly Shade", personality: "Melancholic and prophetic" },
    { name: "Ancient Keeper", personality: "Weary but wise" },
  ],
  quest_giver: [
    { name: "Dying Knight", personality: "Honorable and urgent" },
    { name: "Vengeful Spirit", personality: "Bitter but purposeful" },
    { name: "Cult Defector", personality: "Paranoid but determined" },
  ],
  hostile_neutral: [
    { name: "Wary Outcast", personality: "Distrustful and aggressive" },
    { name: "Territorial Hunter", personality: "Protective and volatile" },
    { name: "Madman", personality: "Unstable and dangerous" },
  ],
}

export function generateNPC(floor: number, forceRole?: NPC["role"]): NPC {
  const roles: NPC["role"][] = ["merchant", "trapped", "mysterious", "quest_giver"]
  const role = forceRole || roles[Math.floor(Math.random() * roles.length)]
  const templates = npcTemplates[role]
  const template = templates[Math.floor(Math.random() * templates.length)]

  const npc = createNPC({
    name: template.name,
    role,
    personality: template.personality,
    disposition: role === "merchant" ? 60 : role === "trapped" ? 70 : 50,
  })

  if (role === "merchant") {
    npc.inventory = [
      generatePotion(),
      generatePotion(),
      Math.random() < 0.5 ? generateWeapon(floor) : generateArmor(floor),
    ]
  }

  return npc
}

const companionTemplates = {
  fighter: [
    { name: "Sir Aldric", personality: "Stoic and brave" },
    { name: "Grunt", personality: "Simple but loyal" },
    { name: "Vera Ironside", personality: "Fierce and protective" },
  ],
  healer: [
    { name: "Sister Miriam", personality: "Gentle and devout" },
    { name: "Old Herbalist", personality: "Eccentric but caring" },
    { name: "Sylvan Druid", personality: "Calm and nurturing" },
  ],
  scout: [
    { name: "Shadow", personality: "Silent and observant" },
    { name: "Quickfingers", personality: "Sly but useful" },
    { name: "The Kid", personality: "Eager and resourceful" },
  ],
  mage: [
    { name: "Theron the Grey", personality: "Aloof and powerful" },
    { name: "Ember", personality: "Volatile and curious" },
    { name: "Void-Touched One", personality: "Unstable but mighty" },
  ],
}

export function generateCompanion(floor: number, forceRole?: Companion["role"]): Companion {
  const roles: Companion["role"][] = ["fighter", "healer", "scout", "mage"]
  const role = forceRole ?? roles[Math.floor(Math.random() * roles.length)]
  const templates = role ? companionTemplates[role] : companionTemplates["fighter"]
  const template = templates[Math.floor(Math.random() * templates.length)]

  const baseStats = {
    fighter: { health: 40, attack: 8, defense: 6, speed: 5 },
    healer: { health: 25, attack: 3, defense: 4, speed: 6 },
    scout: { health: 30, attack: 6, defense: 3, speed: 8 },
    mage: { health: 20, attack: 10, defense: 2, speed: 4 },
  }

  const stats = role ? baseStats[role] : baseStats["fighter"]
  const floorScale = 1 + (floor - 1) * 0.1

  return createCompanion({
    name: template.name,
    role,
    personality: template.personality,
    stats: {
      health: Math.floor(stats.health * floorScale),
      maxHealth: Math.floor(stats.health * floorScale),
      attack: Math.floor(stats.attack * floorScale),
      defense: Math.floor(stats.defense * floorScale),
      speed: Math.floor(stats.speed * floorScale),
    },
    loyalty: 50 + Math.floor(Math.random() * 20),
    combatStyle:
      role === "fighter"
        ? "Charges into battle, drawing enemy attention"
        : role === "healer"
          ? "Stays back, mending wounds between blows"
          : role === "scout"
            ? "Strikes from shadows, revealing weaknesses"
            : "Unleashes devastating magical attacks",
  })
}

export function calculateDisarmChance(
  player: { stats: { attack: number; defense: number; level: number } },
  trap: Trap,
): number {
  const baseChance = 50
  const levelBonus = player.stats.level * 5
  const dcPenalty = trap.disarmDC * 3
  return Math.min(95, Math.max(5, baseChance + levelBonus - dcPenalty))
}

const dungeonThemes = {
  common: [
    {
      name: "Goblin Warrens",
      theme: "cramped tunnels infested with goblins",
      dangers: ["Goblin Scouts", "Cave Traps", "Poison Gas"],
      rewards: ["Iron equipment", "Small gold caches"],
    },
    {
      name: "Forgotten Crypt",
      theme: "dusty tombs of forgotten nobles",
      dangers: ["Skeletal Warriors", "Cursed Coffins", "Spectral Echoes"],
      rewards: ["Ancient coins", "Burial trinkets"],
    },
    {
      name: "Rat King's Den",
      theme: "a maze of sewers ruled by vermin",
      dangers: ["Giant Rats", "Diseased Bites", "Collapsing Floors"],
      rewards: ["Scavenged goods", "Lost treasures"],
    },
  ],
  uncommon: [
    {
      name: "Orc Stronghold",
      theme: "a fortified cave system held by orcs",
      dangers: ["Orc Brutes", "War Drums", "Pit Fighters"],
      rewards: ["Orcish weapons", "Raided goods", "Battle trophies"],
    },
    {
      name: "Spider Nest",
      theme: "web-covered caverns of giant arachnids",
      dangers: ["Venomous Spiders", "Web Traps", "Egg Sacs"],
      rewards: ["Spider silk", "Cocooned victims' gear", "Venom vials"],
    },
    {
      name: "Cult Sanctum",
      theme: "a hidden temple of dark worshippers",
      dangers: ["Dark Cultists", "Blood Rituals", "Summoned Horrors"],
      rewards: ["Ritual artifacts", "Forbidden tomes"],
    },
  ],
  rare: [
    {
      name: "Golem Foundry",
      theme: "an ancient dwarven workshop gone wrong",
      dangers: ["Stone Golems", "Magma Vents", "Haywire Constructs"],
      rewards: ["Rare metals", "Dwarven crafts", "Power cores"],
    },
    {
      name: "Shadow Maze",
      theme: "a dimension-warped labyrinth",
      dangers: ["Shadow Wraiths", "Reality Shifts", "Mirror Selves"],
      rewards: ["Shadow essence", "Dimensional gear", "Lost memories"],
    },
    {
      name: "Dragon's Rest",
      theme: "the lair of a slumbering wyrm",
      dangers: ["Drake Spawn", "Fire Traps", "Treasure Guardians"],
      rewards: ["Dragon scales", "Hoarded gold", "Ancient artifacts"],
    },
  ],
  legendary: [
    {
      name: "The Hollow Throne",
      theme: "seat of the Hollow King's power",
      dangers: ["Elite Undead", "Soul Traps", "The Hollow King"],
      rewards: ["Legendary arms", "King's treasury", "Crown jewels"],
    },
    {
      name: "Abyssal Rift",
      theme: "a tear into the void itself",
      dangers: ["Void Spawn", "Sanity Drain", "Reality Collapse"],
      rewards: ["Void-touched gear", "Eldritch knowledge", "Infinite power"],
    },
    {
      name: "Malachar's Domain",
      theme: "fortress of the Dreadlord",
      dangers: ["Death Knights", "Torture Chambers", "Dreadlord Malachar"],
      rewards: ["Dreadlord's arsenal", "Soul gems", "Ultimate power"],
    },
  ],
}

const mysteryDungeonHints = [
  "Whispers speak of untold riches...",
  "None who entered have returned to tell the tale.",
  "The walls bleed with ancient power.",
  "Reality bends at its threshold.",
  "Fortune favors the bold... or the foolish.",
]

export function generateDungeonCard(rarity: ItemRarity, forceMystery = false): DungeonCard {
  const isMystery = forceMystery || Math.random() < 0.15
  const themes = dungeonThemes[rarity]
  const theme = themes[Math.floor(Math.random() * themes.length)]

  const floorsByRarity: Record<ItemRarity, [number, number]> = {
    common: [3, 5],
    uncommon: [4, 6],
    rare: [5, 8],
    legendary: [6, 10],
  }
  const [minFloors, maxFloors] = floorsByRarity[rarity]
  const floors = Math.floor(Math.random() * (maxFloors - minFloors + 1)) + minFloors

  const rarityOrder: KeyRarity[] = ["common", "uncommon", "rare", "legendary"]
  const requiredIndex = rarityOrder.indexOf(rarity as KeyRarity)
  const requiredKeyRarity = rarityOrder.slice(requiredIndex) as KeyRarity[]
  requiredKeyRarity.push("master")

  return {
    id: crypto.randomUUID(),
    name: isMystery ? "???" : theme.name,
    rarity,
    theme: isMystery ? mysteryDungeonHints[Math.floor(Math.random() * mysteryDungeonHints.length)] : theme.theme,
    dangers: isMystery ? ["???", "???", "???"] : theme.dangers,
    rewards: isMystery ? ["???"] : theme.rewards,
    floors,
    isMystery,
    requiredKeyRarity: rarity === "common" ? [...requiredKeyRarity] : requiredKeyRarity.filter((k) => k !== "master"),
  }
}

export function generateDungeonSelection(): DungeonCard[] {
  const numDungeons = Math.floor(Math.random() * 4) + 2
  const dungeons: DungeonCard[] = []

  dungeons.push(generateDungeonCard("common"))

  const remaining = numDungeons - 1
  for (let i = 0; i < remaining; i++) {
    const roll = Math.random()
    let rarity: ItemRarity
    if (roll < 0.4) rarity = "common"
    else if (roll < 0.7) rarity = "uncommon"
    else if (roll < 0.9) rarity = "rare"
    else rarity = "legendary"

    const forceMystery = rarity !== "common" && Math.random() < 0.2
    dungeons.push(generateDungeonCard(rarity, forceMystery))
  }

  return dungeons.sort(() => Math.random() - 0.5)
}

export const roomDescriptions = [
  "A damp corridor stretches before you, water dripping from the ceiling.",
  "Ancient runes glow faintly on the moss-covered walls.",
  "The smell of decay hangs heavy in this forgotten chamber.",
  "Broken columns line a once-grand hallway, now in ruins.",
  "A faint breeze carries whispers from deeper within.",
  "Bones crunch underfoot as you enter a grim ossuary.",
  "Flickering torches cast dancing shadows across the stone.",
  "A collapsed ceiling reveals glimpses of twisted roots above.",
  "The air grows cold. Something watches from the darkness.",
  "Old bloodstains mark the floor of this cursed room.",
]

export const treasureDescriptions = [
  "A dusty chest sits in the corner, its lock rusted away.",
  "You notice something gleaming beneath a pile of rubble.",
  "An ancient skeleton clutches a pouch in its bony fingers.",
  "A hidden alcove reveals a forgotten cache.",
]

export const emptyRoomEvents = [
  "The room appears empty. Only silence greets you.",
  "Nothing of interest here. The dungeon continues.",
  "Dust motes drift through stale air. The path ahead beckons.",
  "A dead end. You must find another way forward.",
]

export function createMasterKey(): DungeonKey {
  return {
    id: "master-key",
    rarity: "master",
    name: "Master Key",
    description: "An eternal key that opens common dungeons. Never consumed.",
    consumedOnUse: false,
    opensRarity: ["common"],
  }
}

export function createDungeonKey(rarity: KeyRarity): DungeonKey {
  const keyData: Record<Exclude<KeyRarity, "master">, { name: string; description: string; opens: KeyRarity[] }> = {
    common: {
      name: "Iron Key",
      description: "A simple iron key for common dungeons.",
      opens: ["common"],
    },
    uncommon: {
      name: "Bronze Key",
      description: "A sturdy bronze key that opens uncommon and lesser dungeons.",
      opens: ["common", "uncommon"],
    },
    rare: {
      name: "Silver Key",
      description: "A gleaming silver key for rare dungeons and below.",
      opens: ["common", "uncommon", "rare"],
    },
    legendary: {
      name: "Golden Key",
      description: "A legendary golden key that opens any dungeon.",
      opens: ["common", "uncommon", "rare", "legendary"],
    },
  }

  const data = keyData[rarity as Exclude<KeyRarity, "master">]
  return {
    id: crypto.randomUUID(),
    rarity,
    name: data.name,
    description: data.description,
    consumedOnUse: true,
    opensRarity: data.opens,
  }
}

export const createInitialPlayer = (): Player => ({
  id: "player",
  name: "Adventurer",
  entityType: "player",
  stats: {
    maxHealth: 50,
    health: 50,
    attack: 8,
    defense: 3,
    level: 1,
    experience: 0,
    experienceToLevel: 30,
    gold: 0,
    strength: 10,
    intelligence: 10,
    dexterity: 10,
    critChance: 0.05,
    dodgeChance: 0.05,
  },
  inventory: [],
  equipment: {
    weapon: null,
    armor: null,
  },
  keys: [createMasterKey(), createDungeonKey("uncommon"), createDungeonKey("uncommon"), createDungeonKey("uncommon")],
  activeEffects: [],
  party: {
    active: [],
    reserve: [],
    maxActive: 1,
    graveyard: [],
  },
  class: null,
  className: null,
  abilities: [],
  resources: {
    type: "energy",
    current: 0,
    max: 0,
  },
  abilityCooldowns: {},
  stance: "balanced",
  combo: {
    lastAbilities: [],
    activeCombo: undefined,
  },
  sustainedAbilities: [],
})

export const createInitialRunStats = (): RunSummary => ({
  floorsCleared: 0,
  enemiesSlain: 0,
  goldEarned: 0,
  goldSpent: 0,
  damageDealt: 0,
  damageTaken: 0,
  itemsFound: [],
  dungeonsCompleted: [],
  causeOfDeath: "",
  killedBy: undefined,
  survivalTime: 0,
  abilitiesUsed: 0,
  bossesDefeated: 0,
  potionsConsumed: 0,
  companionsRecruited: 0,
  companionsLost: [],
})
