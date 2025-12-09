/**
 * Race/Species System
 *
 * Player races with unique stat bonuses, racial abilities,
 * resistances, and lore. Races complement classes.
 */

import type {
  StatusEffect,
  DamageType,
  ResourceType,
  PlayerClass,
  Ability,
} from "./game-types"

// =============================================================================
// RACE TYPES
// =============================================================================

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

export type RaceCategory = "mortal" | "celestial" | "infernal" | "undead" | "beastkin" | "elemental"

// =============================================================================
// RACIAL ABILITY INTERFACE
// =============================================================================

export interface RacialAbility {
  id: string
  name: string
  description: string
  isPassive: boolean
  cooldown?: number // For active abilities
  currentCooldown?: number
  effect?: RacialAbilityEffect
  unlockLevel: number // Level when this ability becomes available
}

export interface RacialAbilityEffect {
  type: "damage" | "heal" | "buff" | "debuff" | "utility" | "transformation"
  damageType?: DamageType
  damage?: number
  healing?: number
  statusEffect?: Partial<StatusEffect>
  duration?: number
  special?: string // AI-defined special effect
}

// =============================================================================
// RACE DEFINITION
// =============================================================================

export interface RaceDefinition {
  id: PlayerRace
  name: string
  category: RaceCategory
  description: string
  lore: string

  // Base stat modifiers (added to base stats)
  statBonuses: {
    health: number
    attack: number
    defense: number
    strength?: number
    intelligence?: number
    dexterity?: number
    critChance?: number
    dodgeChance?: number
  }

  // Resource modifiers
  resourceModifiers?: {
    type?: ResourceType // Preferred resource type
    bonus?: number // Bonus to max resource
    regenBonus?: number // Bonus to resource regen
  }

  // Damage resistances and weaknesses
  resistances: { type: DamageType; reduction: number }[]
  weaknesses: { type: DamageType; increase: number }[]

  // Racial abilities (passive and active)
  abilities: RacialAbility[]

  // Class synergies (bonus when combining with these classes)
  classSynergies?: { class: PlayerClass; bonus: string }[]

  // Restrictions (if any)
  classRestrictions?: PlayerClass[] // Classes this race CANNOT be

  // Visual
  color: string // For entity text display
  icon?: string
}

// =============================================================================
// RACE DEFINITIONS
// =============================================================================

export const RACE_DEFINITIONS: Record<PlayerRace, RaceDefinition> = {
  // ===== MORTAL RACES =====
  human: {
    id: "human",
    name: "Human",
    category: "mortal",
    description: "Versatile and adaptable, humans excel at whatever they put their mind to.",
    lore: "The most numerous of the mortal races, humans are known for their ambition and adaptability. What they lack in innate magical talent, they make up for with determination and ingenuity.",
    statBonuses: {
      health: 5,
      attack: 2,
      defense: 2,
      strength: 1,
      intelligence: 1,
      dexterity: 1,
    },
    resourceModifiers: {
      bonus: 5,
    },
    resistances: [],
    weaknesses: [],
    abilities: [
      {
        id: "human_adaptability",
        name: "Adaptability",
        description: "Gain bonus experience from all sources.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Adaptable",
            effectType: "buff",
            duration: -1,
            modifiers: { expMultiplier: 0.1 },
          },
        },
      },
      {
        id: "human_determination",
        name: "Determination",
        description: "Once per floor, survive a fatal blow with 1 HP.",
        isPassive: true,
        unlockLevel: 5,
        effect: {
          type: "utility",
          special: "Survive fatal damage once per floor",
        },
      },
    ],
    classSynergies: [
      { class: "paladin", bonus: "+5% healing received" },
      { class: "warrior", bonus: "+2 attack" },
    ],
    color: "text-amber-300",
  },

  elf: {
    id: "elf",
    name: "Elf",
    category: "mortal",
    description: "Graceful and long-lived, elves possess natural magical affinity.",
    lore: "Born of ancient forests and moonlit glades, elves have walked the world since before human memory. Their connection to nature grants them innate magical abilities and supernatural grace.",
    statBonuses: {
      health: -5,
      attack: 3,
      defense: 0,
      intelligence: 3,
      dexterity: 3,
      critChance: 3,
    },
    resourceModifiers: {
      type: "mana",
      bonus: 10,
      regenBonus: 1,
    },
    resistances: [{ type: "arcane", reduction: 15 }],
    weaknesses: [{ type: "fire", increase: 10 }],
    abilities: [
      {
        id: "elf_keen_senses",
        name: "Keen Senses",
        description: "Detect traps and hidden enemies more easily.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "utility",
          special: "Traps are revealed before triggering",
        },
      },
      {
        id: "elf_nature_blessing",
        name: "Nature's Blessing",
        description: "Heal a small amount each turn in natural environments.",
        isPassive: true,
        unlockLevel: 3,
        effect: {
          type: "heal",
          healing: 2,
          statusEffect: {
            name: "Nature's Blessing",
            effectType: "buff",
            duration: -1,
            modifiers: { healthRegen: 1 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "mage", bonus: "+10 max mana" },
      { class: "ranger", bonus: "+5% crit chance" },
    ],
    color: "text-emerald-400",
  },

  dark_elf: {
    id: "dark_elf",
    name: "Dark Elf",
    category: "mortal",
    description: "Dwelling in shadow, dark elves master forbidden arts.",
    lore: "Exiled to the depths long ago, the dark elves adapted to the eternal darkness. Their pale skin and silver hair mark them as outcasts, but their mastery of shadow magic makes them formidable.",
    statBonuses: {
      health: -3,
      attack: 4,
      defense: 1,
      intelligence: 2,
      dexterity: 4,
      dodgeChance: 5,
    },
    resourceModifiers: {
      type: "mana",
      bonus: 5,
    },
    resistances: [
      { type: "shadow", reduction: 25 },
      { type: "poison", reduction: 15 },
    ],
    weaknesses: [{ type: "holy", increase: 20 }],
    abilities: [
      {
        id: "dark_elf_shadowmeld",
        name: "Shadowmeld",
        description: "Become invisible for 2 turns, gaining guaranteed critical on first attack.",
        isPassive: false,
        cooldown: 8,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "buff",
          duration: 2,
          statusEffect: {
            name: "Shadowmelded",
            effectType: "buff",
            duration: 2,
            modifiers: { dodgeChance: 50 },
          },
        },
      },
      {
        id: "dark_elf_poison_blood",
        name: "Poison Blood",
        description: "Attackers take poison damage when striking you in melee.",
        isPassive: true,
        unlockLevel: 4,
        effect: {
          type: "damage",
          damageType: "poison",
          damage: 3,
        },
      },
    ],
    classSynergies: [
      { class: "rogue", bonus: "+10% dodge chance" },
      { class: "warlock", bonus: "+15% shadow damage" },
    ],
    color: "text-purple-400",
  },

  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    category: "mortal",
    description: "Stout and sturdy, dwarves are masters of craft and war.",
    lore: "From their mountain halls, dwarves have shaped stone and steel for millennia. Their legendary resilience and craftsmanship are matched only by their stubbornness and love of ale.",
    statBonuses: {
      health: 15,
      attack: 2,
      defense: 5,
      strength: 3,
      dexterity: -2,
    },
    resourceModifiers: {
      type: "rage",
      bonus: 10,
    },
    resistances: [
      { type: "poison", reduction: 30 },
      { type: "physical", reduction: 10 },
    ],
    weaknesses: [],
    abilities: [
      {
        id: "dwarf_stone_skin",
        name: "Stone Skin",
        description: "Reduce all physical damage taken.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Stone Skin",
            effectType: "buff",
            duration: -1,
            modifiers: { defense: 3 },
          },
        },
      },
      {
        id: "dwarf_ancestral_fury",
        name: "Ancestral Fury",
        description: "Enter a rage, gaining massive attack but losing defense.",
        isPassive: false,
        cooldown: 10,
        currentCooldown: 0,
        unlockLevel: 6,
        effect: {
          type: "buff",
          duration: 4,
          statusEffect: {
            name: "Ancestral Fury",
            effectType: "buff",
            duration: 4,
            modifiers: { attack: 10, defense: -5 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "warrior", bonus: "+10 max health" },
      { class: "paladin", bonus: "+5 defense" },
    ],
    color: "text-orange-400",
  },

  orc: {
    id: "orc",
    name: "Orc",
    category: "mortal",
    description: "Brutal and powerful, orcs live for battle.",
    lore: "Forged in the crucible of endless warfare, orcs are a proud warrior race. They value strength above all else and see combat as the highest form of expression.",
    statBonuses: {
      health: 10,
      attack: 6,
      defense: 0,
      strength: 5,
      intelligence: -2,
      dexterity: 1,
      critChance: 5,
    },
    resourceModifiers: {
      type: "rage",
      bonus: 15,
      regenBonus: 2,
    },
    resistances: [{ type: "physical", reduction: 10 }],
    weaknesses: [{ type: "arcane", increase: 10 }],
    abilities: [
      {
        id: "orc_bloodlust",
        name: "Bloodlust",
        description: "Gain attack when health drops below 50%.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Bloodlust",
            effectType: "buff",
            duration: -1,
            modifiers: { attack: 5 },
          },
        },
      },
      {
        id: "orc_war_cry",
        name: "Orcish War Cry",
        description: "Terrify enemies, reducing their attack.",
        isPassive: false,
        cooldown: 6,
        currentCooldown: 0,
        unlockLevel: 3,
        effect: {
          type: "debuff",
          duration: 3,
          statusEffect: {
            name: "Terrified",
            effectType: "debuff",
            duration: 3,
            modifiers: { attack: -4, defense: -2 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "barbarian", bonus: "+20% rage generation" },
      { class: "warrior", bonus: "+5 attack" },
    ],
    color: "text-green-500",
  },

  halfling: {
    id: "halfling",
    name: "Halfling",
    category: "mortal",
    description: "Small but lucky, halflings survive through wit and fortune.",
    lore: "Often overlooked by the larger races, halflings have turned their small stature into an advantage. Their legendary luck and nimble fingers have saved them from countless dangers.",
    statBonuses: {
      health: -10,
      attack: 1,
      defense: 0,
      dexterity: 5,
      dodgeChance: 10,
      critChance: 5,
    },
    resourceModifiers: {
      type: "energy",
      bonus: 10,
      regenBonus: 2,
    },
    resistances: [],
    weaknesses: [],
    abilities: [
      {
        id: "halfling_luck",
        name: "Halfling Luck",
        description: "Small chance to completely avoid any attack.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "utility",
          special: "5% chance to avoid any damage",
        },
      },
      {
        id: "halfling_nimble_escape",
        name: "Nimble Escape",
        description: "Guaranteed escape from combat.",
        isPassive: false,
        cooldown: 15,
        currentCooldown: 0,
        unlockLevel: 5,
        effect: {
          type: "utility",
          special: "Automatically flee combat",
        },
      },
    ],
    classSynergies: [
      { class: "rogue", bonus: "+15% dodge chance" },
      { class: "ranger", bonus: "+10% crit chance" },
    ],
    color: "text-yellow-300",
  },

  gnome: {
    id: "gnome",
    name: "Gnome",
    category: "mortal",
    description: "Brilliant inventors with innate magical resistance.",
    lore: "Masters of both magic and machinery, gnomes blend arcane knowledge with technological innovation. Their curious nature drives them to understand how everything works.",
    statBonuses: {
      health: -5,
      attack: 1,
      defense: 2,
      intelligence: 5,
      dexterity: 2,
    },
    resourceModifiers: {
      type: "mana",
      bonus: 15,
      regenBonus: 2,
    },
    resistances: [
      { type: "arcane", reduction: 20 },
    ],
    weaknesses: [
      { type: "lightning", increase: 15 },
    ],
    abilities: [
      {
        id: "gnome_arcane_resistance",
        name: "Arcane Fortitude",
        description: "Strong resistance to magical effects.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Arcane Fortitude",
            effectType: "buff",
            duration: -1,
            modifiers: { defense: 2 },
          },
        },
      },
      {
        id: "gnome_tinker",
        name: "Tinker",
        description: "Improve a piece of equipment temporarily.",
        isPassive: false,
        cooldown: 12,
        currentCooldown: 0,
        unlockLevel: 4,
        effect: {
          type: "buff",
          duration: 5,
          special: "Boost equipped weapon or armor stats by 25%",
        },
      },
    ],
    classSynergies: [
      { class: "mage", bonus: "+15 max mana" },
    ],
    color: "text-cyan-400",
  },

  half_giant: {
    id: "half_giant",
    name: "Half-Giant",
    category: "mortal",
    description: "Towering warriors with immense strength.",
    lore: "Born of forbidden unions between humans and giants, half-giants are feared for their raw physical power. Though often shunned, they prove invaluable in battle.",
    statBonuses: {
      health: 30,
      attack: 8,
      defense: 3,
      strength: 8,
      intelligence: -3,
      dexterity: -4,
      dodgeChance: -10,
    },
    resourceModifiers: {
      type: "rage",
      bonus: 20,
    },
    resistances: [{ type: "physical", reduction: 15 }],
    weaknesses: [{ type: "arcane", increase: 15 }],
    abilities: [
      {
        id: "half_giant_mighty_blow",
        name: "Mighty Blow",
        description: "A devastating attack that deals massive damage.",
        isPassive: false,
        cooldown: 5,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "damage",
          damageType: "physical",
          damage: 20,
        },
      },
      {
        id: "half_giant_thick_skin",
        name: "Thick Skin",
        description: "Naturally tough hide reduces all damage.",
        isPassive: true,
        unlockLevel: 3,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Thick Skin",
            effectType: "buff",
            duration: -1,
            modifiers: { defense: 5 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "barbarian", bonus: "+15 max health" },
      { class: "warrior", bonus: "+8 attack" },
    ],
    classRestrictions: ["rogue", "mage"],
    color: "text-stone-400",
  },

  // ===== CELESTIAL RACES =====
  angel: {
    id: "angel",
    name: "Fallen Angel",
    category: "celestial",
    description: "A divine being cast down, seeking redemption or revenge.",
    lore: "Once servants of the higher powers, fallen angels retain echoes of their celestial nature. Whether they fell through pride, love, or tragedy, they now walk among mortals.",
    statBonuses: {
      health: 5,
      attack: 4,
      defense: 3,
      intelligence: 3,
      dexterity: 2,
    },
    resourceModifiers: {
      type: "mana",
      bonus: 20,
      regenBonus: 2,
    },
    resistances: [
      { type: "holy", reduction: 50 },
      { type: "shadow", reduction: 10 },
    ],
    weaknesses: [{ type: "shadow", increase: 0 }], // Conflicted nature
    abilities: [
      {
        id: "angel_divine_light",
        name: "Divine Light",
        description: "Heal yourself and damage undead enemies.",
        isPassive: false,
        cooldown: 6,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "heal",
          healing: 15,
          damageType: "holy",
          damage: 10,
        },
      },
      {
        id: "angel_wings",
        name: "Celestial Wings",
        description: "Manifest wings to dodge the next attack.",
        isPassive: false,
        cooldown: 8,
        currentCooldown: 0,
        unlockLevel: 5,
        effect: {
          type: "buff",
          duration: 2,
          statusEffect: {
            name: "Winged",
            effectType: "buff",
            duration: 2,
            modifiers: { dodgeChance: 30 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "cleric", bonus: "+25% healing" },
      { class: "paladin", bonus: "+20% holy damage" },
    ],
    classRestrictions: ["necromancer", "warlock"],
    color: "text-yellow-200",
  },

  // ===== INFERNAL RACES =====
  demon: {
    id: "demon",
    name: "Demon",
    category: "infernal",
    description: "A creature of the abyss, wielding hellfire and shadow.",
    lore: "Born in the infernal pits, demons are entities of pure malevolence. Some have escaped their masters to seek their own destiny in the mortal realm.",
    statBonuses: {
      health: 10,
      attack: 6,
      defense: 2,
      strength: 4,
      intelligence: 2,
    },
    resourceModifiers: {
      type: "souls",
      bonus: 15,
      regenBonus: 1,
    },
    resistances: [
      { type: "fire", reduction: 40 },
      { type: "shadow", reduction: 20 },
    ],
    weaknesses: [{ type: "holy", increase: 30 }],
    abilities: [
      {
        id: "demon_hellfire",
        name: "Hellfire",
        description: "Unleash demonic flames that burn over time.",
        isPassive: false,
        cooldown: 4,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "damage",
          damageType: "fire",
          damage: 12,
          statusEffect: {
            name: "Hellfire Burn",
            effectType: "debuff",
            duration: 3,
            modifiers: { healthRegen: -5 },
          },
        },
      },
      {
        id: "demon_soul_harvest",
        name: "Soul Harvest",
        description: "Killing enemies restores health.",
        isPassive: true,
        unlockLevel: 4,
        effect: {
          type: "heal",
          healing: 10,
          special: "Heal on kill",
        },
      },
    ],
    classSynergies: [
      { class: "warlock", bonus: "+20% fire damage" },
      { class: "necromancer", bonus: "+15% soul gain" },
    ],
    classRestrictions: ["cleric", "paladin"],
    color: "text-red-500",
  },

  tiefling: {
    id: "tiefling",
    name: "Tiefling",
    category: "infernal",
    description: "Human with demonic ancestry, marked by their heritage.",
    lore: "Descended from humans who made pacts with demons, tieflings bear the visible marks of their infernal heritage. Horns, tails, and unusual eyes mark them as outsiders.",
    statBonuses: {
      health: 0,
      attack: 3,
      defense: 1,
      intelligence: 3,
      dexterity: 2,
      critChance: 3,
    },
    resourceModifiers: {
      type: "mana",
      bonus: 10,
    },
    resistances: [{ type: "fire", reduction: 25 }],
    weaknesses: [{ type: "holy", increase: 10 }],
    abilities: [
      {
        id: "tiefling_infernal_legacy",
        name: "Infernal Legacy",
        description: "Cast a burst of hellfire once per combat.",
        isPassive: false,
        cooldown: 10,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "damage",
          damageType: "fire",
          damage: 15,
        },
      },
      {
        id: "tiefling_dark_vision",
        name: "Darkvision",
        description: "See perfectly in darkness, negating vision penalties.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "utility",
          special: "Immune to darkness vision penalties",
        },
      },
    ],
    classSynergies: [
      { class: "warlock", bonus: "+10% spell damage" },
      { class: "rogue", bonus: "+5% crit damage" },
    ],
    color: "text-rose-400",
  },

  // ===== UNDEAD RACES =====
  undead: {
    id: "undead",
    name: "Undead",
    category: "undead",
    description: "A reanimated corpse given unholy life.",
    lore: "Whether raised by a necromancer or cursed to walk eternally, the undead exist between life and death. They feel neither pain nor fear, making them terrifying opponents.",
    statBonuses: {
      health: 20,
      attack: 3,
      defense: 4,
      strength: 2,
      intelligence: -2,
      dexterity: -1,
    },
    resourceModifiers: {
      type: "souls",
      bonus: 20,
    },
    resistances: [
      { type: "poison", reduction: 100 },
      { type: "shadow", reduction: 30 },
    ],
    weaknesses: [
      { type: "holy", increase: 40 },
      { type: "fire", increase: 20 },
    ],
    abilities: [
      {
        id: "undead_unliving",
        name: "Unliving",
        description: "Immune to poison and bleed effects.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "utility",
          special: "Immune to poison and bleed",
        },
      },
      {
        id: "undead_rise_again",
        name: "Rise Again",
        description: "Once per dungeon, return from death with half health.",
        isPassive: true,
        unlockLevel: 7,
        effect: {
          type: "utility",
          special: "Resurrect once per dungeon",
        },
      },
    ],
    classSynergies: [
      { class: "necromancer", bonus: "+25% to undead summons" },
      { class: "warrior", bonus: "+10 max health" },
    ],
    classRestrictions: ["cleric", "paladin"],
    color: "text-gray-400",
  },

  vampire: {
    id: "vampire",
    name: "Vampire",
    category: "undead",
    description: "An immortal blood-drinker with dark powers.",
    lore: "Cursed with eternal hunger, vampires are among the most powerful undead. They possess supernatural speed and strength, but must consume blood to survive.",
    statBonuses: {
      health: 5,
      attack: 5,
      defense: 2,
      strength: 3,
      dexterity: 4,
      critChance: 8,
    },
    resourceModifiers: {
      type: "souls",
      bonus: 10,
    },
    resistances: [
      { type: "shadow", reduction: 35 },
      { type: "poison", reduction: 50 },
    ],
    weaknesses: [
      { type: "holy", increase: 35 },
      { type: "fire", increase: 15 },
    ],
    abilities: [
      {
        id: "vampire_blood_drain",
        name: "Blood Drain",
        description: "Attack that heals you for damage dealt.",
        isPassive: false,
        cooldown: 4,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "damage",
          damageType: "shadow",
          damage: 10,
          healing: 10,
        },
      },
      {
        id: "vampire_mist_form",
        name: "Mist Form",
        description: "Become intangible, avoiding all damage for 1 turn.",
        isPassive: false,
        cooldown: 10,
        currentCooldown: 0,
        unlockLevel: 6,
        effect: {
          type: "buff",
          duration: 1,
          statusEffect: {
            name: "Mist Form",
            effectType: "buff",
            duration: 1,
            modifiers: { dodgeChance: 100 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "rogue", bonus: "+15% life steal" },
      { class: "warlock", bonus: "+20% shadow damage" },
    ],
    classRestrictions: ["cleric", "paladin"],
    color: "text-red-300",
  },

  // ===== BEASTKIN RACES =====
  dragonborn: {
    id: "dragonborn",
    name: "Dragonborn",
    category: "beastkin",
    description: "Draconic humanoids with breath weapons and scales.",
    lore: "Created by dragons or born from draconic bloodlines, dragonborn combine humanoid form with draconic power. Their breath weapons and scales make them formidable warriors.",
    statBonuses: {
      health: 15,
      attack: 5,
      defense: 4,
      strength: 4,
      intelligence: 1,
    },
    resourceModifiers: {
      type: "rage",
      bonus: 10,
    },
    resistances: [{ type: "fire", reduction: 30 }],
    weaknesses: [{ type: "ice", increase: 15 }],
    abilities: [
      {
        id: "dragonborn_breath",
        name: "Breath Weapon",
        description: "Unleash a cone of elemental damage.",
        isPassive: false,
        cooldown: 5,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "damage",
          damageType: "fire",
          damage: 18,
        },
      },
      {
        id: "dragonborn_scales",
        name: "Draconic Scales",
        description: "Natural armor provides constant defense.",
        isPassive: true,
        unlockLevel: 1,
        effect: {
          type: "buff",
          statusEffect: {
            name: "Draconic Scales",
            effectType: "buff",
            duration: -1,
            modifiers: { defense: 4 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "warrior", bonus: "+10% breath damage" },
      { class: "barbarian", bonus: "+5 defense" },
    ],
    color: "text-amber-500",
  },

  werewolf: {
    id: "werewolf",
    name: "Werewolf",
    category: "beastkin",
    description: "A cursed shapeshifter torn between human and beast.",
    lore: "Afflicted with lycanthropy, werewolves struggle to control the beast within. In battle, they can unleash their feral nature for devastating effect.",
    statBonuses: {
      health: 10,
      attack: 4,
      defense: 2,
      strength: 4,
      dexterity: 3,
      critChance: 5,
    },
    resourceModifiers: {
      type: "rage",
      bonus: 15,
      regenBonus: 3,
    },
    resistances: [{ type: "physical", reduction: 10 }],
    weaknesses: [],
    abilities: [
      {
        id: "werewolf_transform",
        name: "Bestial Transformation",
        description: "Transform into wolf form, gaining massive stats.",
        isPassive: false,
        cooldown: 12,
        currentCooldown: 0,
        unlockLevel: 1,
        effect: {
          type: "transformation",
          duration: 4,
          statusEffect: {
            name: "Wolf Form",
            effectType: "buff",
            duration: 4,
            modifiers: { attack: 8, defense: -3, healthRegen: 3 },
          },
        },
      },
      {
        id: "werewolf_regeneration",
        name: "Lycanthropic Regeneration",
        description: "Rapidly heal wounds over time.",
        isPassive: true,
        unlockLevel: 4,
        effect: {
          type: "heal",
          statusEffect: {
            name: "Lycanthropic Regeneration",
            effectType: "buff",
            duration: -1,
            modifiers: { healthRegen: 2 },
          },
        },
      },
    ],
    classSynergies: [
      { class: "barbarian", bonus: "+25% transformation duration" },
      { class: "ranger", bonus: "+10% attack in wolf form" },
    ],
    classRestrictions: ["mage"],
    color: "text-amber-600",
  },
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a race definition by ID
 */
export function getRaceDefinition(race: PlayerRace): RaceDefinition {
  return RACE_DEFINITIONS[race]
}

/**
 * Get all races in a category
 */
export function getRacesByCategory(category: RaceCategory): RaceDefinition[] {
  return Object.values(RACE_DEFINITIONS).filter((r) => r.category === category)
}

/**
 * Check if a race can be a specific class
 */
export function canRaceBeClass(race: PlayerRace, playerClass: PlayerClass): boolean {
  const raceDef = RACE_DEFINITIONS[race]
  if (!raceDef.classRestrictions) return true
  return !raceDef.classRestrictions.includes(playerClass)
}

/**
 * Get valid classes for a race
 */
export function getValidClassesForRace(
  race: PlayerRace,
  allClasses: PlayerClass[]
): PlayerClass[] {
  const raceDef = RACE_DEFINITIONS[race]
  if (!raceDef.classRestrictions) return allClasses
  return allClasses.filter((c) => !raceDef.classRestrictions!.includes(c))
}

/**
 * Get racial abilities available at a level
 */
export function getAvailableRacialAbilities(
  race: PlayerRace,
  level: number
): RacialAbility[] {
  const raceDef = RACE_DEFINITIONS[race]
  return raceDef.abilities.filter((a) => a.unlockLevel <= level)
}

/**
 * Calculate total stat bonuses including racial synergies
 */
export function calculateRacialBonuses(
  race: PlayerRace,
  playerClass: PlayerClass
): RaceDefinition["statBonuses"] {
  const raceDef = RACE_DEFINITIONS[race]
  const bonuses = { ...raceDef.statBonuses }

  // Check for class synergies
  const synergy = raceDef.classSynergies?.find((s) => s.class === playerClass)
  if (synergy) {
    // Parse synergy bonus (e.g., "+5% healing received" or "+2 attack")
    const match = synergy.bonus.match(/\+(\d+)\s*(max\s*)?(\w+)/)
    if (match) {
      const value = parseInt(match[1], 10)
      const stat = match[3].toLowerCase()

      if (stat === "health" && "health" in bonuses) {
        bonuses.health = (bonuses.health || 0) + value
      } else if (stat === "attack" && "attack" in bonuses) {
        bonuses.attack = (bonuses.attack || 0) + value
      } else if (stat === "defense" && "defense" in bonuses) {
        bonuses.defense = (bonuses.defense || 0) + value
      }
    }
  }

  return bonuses
}

/**
 * Get display color for a race
 */
export function getRaceColor(race: PlayerRace): string {
  return RACE_DEFINITIONS[race].color
}

/**
 * Get all races
 */
export function getAllRaces(): RaceDefinition[] {
  return Object.values(RACE_DEFINITIONS)
}

/**
 * Check if race has resistance to a damage type
 */
export function getRaceResistance(race: PlayerRace, damageType: DamageType): number {
  const raceDef = RACE_DEFINITIONS[race]
  const resistance = raceDef.resistances.find((r) => r.type === damageType)
  return resistance?.reduction || 0
}

/**
 * Check if race has weakness to a damage type
 */
export function getRaceWeakness(race: PlayerRace, damageType: DamageType): number {
  const raceDef = RACE_DEFINITIONS[race]
  const weakness = raceDef.weaknesses.find((w) => w.type === damageType)
  return weakness?.increase || 0
}

/**
 * Calculate damage modifier based on race resistances/weaknesses
 */
export function calculateRaceDamageModifier(
  race: PlayerRace,
  damageType: DamageType
): number {
  const resistance = getRaceResistance(race, damageType)
  const weakness = getRaceWeakness(race, damageType)

  // Resistance reduces damage (0.7 = 30% reduction)
  // Weakness increases damage (1.3 = 30% increase)
  return 1 - resistance / 100 + weakness / 100
}
