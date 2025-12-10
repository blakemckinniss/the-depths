import type {
  Ability,
  PlayerClass,
  ClassDefinition,
  Player,
  Enemy,
  Combatant,
  StatusEffect,
  ResourceType,
} from "@/lib/core/game-types"

export type { PlayerClass }
import { STATUS_EFFECTS } from "@/lib/entity/entity-system"
import { getSustainedAbilitiesForClass } from "./sustained-ability-system"

// ============================================================================
// CLASS DEFINITIONS
// ============================================================================

export const CLASSES: Record<PlayerClass, ClassDefinition> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "A master of martial combat who excels in direct confrontation.",
    lore: "Forged in countless battles, warriors rely on strength and endurance to overcome any foe.",
    statBonuses: { health: 20, attack: 5, defense: 3 },
    resourceType: "rage",
    baseResource: 50,
    resourcePerLevel: 5,
    resourceRegen: 10, // gains rage when attacking/taking damage
    startingAbilities: ["warrior_strike", "warrior_defend"],
    abilityUnlocks: [
      { level: 3, abilityId: "warrior_cleave" },
      { level: 5, abilityId: "warrior_battlecry" },
      { level: 8, abilityId: "warrior_execute" },
    ],
    passives: { critBonus: 0.05, resistances: [{ type: "physical", reduction: 0.1 }] },
    color: "text-red-400",
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "A wielder of arcane forces capable of devastating magical attacks.",
    lore: "Through years of study, mages unlock the secrets of the elements and bend reality to their will.",
    statBonuses: { health: -10, attack: 2, defense: -2 },
    resourceType: "mana",
    baseResource: 100,
    resourcePerLevel: 10,
    resourceRegen: 15,
    startingAbilities: ["mage_firebolt", "mage_frostshield"],
    abilityUnlocks: [
      { level: 3, abilityId: "mage_lightning" },
      { level: 4, abilityId: "mage_arcane_analysis" }, // Foresight: reveals magical effects
      { level: 5, abilityId: "mage_blizzard" },
      { level: 8, abilityId: "mage_meteor" },
    ],
    passives: { damageTypeBonus: { type: "arcane", bonus: 0.2 } },
    color: "text-blue-400",
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "A cunning fighter who strikes from the shadows with deadly precision.",
    lore: "Rogues live by their wits, preferring a quick blade to brute force.",
    statBonuses: { health: -5, attack: 3, defense: 0 },
    resourceType: "energy",
    baseResource: 80,
    resourcePerLevel: 5,
    resourceRegen: 20,
    startingAbilities: ["rogue_backstab", "rogue_evade"],
    abilityUnlocks: [
      { level: 3, abilityId: "rogue_poison" },
      { level: 3, abilityId: "rogue_trap_sense" }, // Foresight: reveals trap mechanics
      { level: 5, abilityId: "rogue_shadowstep" },
      { level: 8, abilityId: "rogue_assassinate" },
    ],
    passives: { critBonus: 0.15, dodgeBonus: 0.1 },
    color: "text-purple-400",
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "A holy warrior who channels divine power to heal and smite.",
    lore: "Blessed by the gods, clerics serve as beacons of hope in the darkest dungeons.",
    statBonuses: { health: 10, attack: 0, defense: 2 },
    resourceType: "focus",
    baseResource: 80,
    resourcePerLevel: 8,
    resourceRegen: 12,
    startingAbilities: ["cleric_smite", "cleric_heal"],
    abilityUnlocks: [
      { level: 3, abilityId: "cleric_sanctuary" },
      { level: 4, abilityId: "cleric_divine_insight" }, // Foresight: reveals shrine/NPC intentions
      { level: 5, abilityId: "cleric_holyfire" },
      { level: 8, abilityId: "cleric_resurrection" },
    ],
    passives: {
      damageTypeBonus: { type: "holy", bonus: 0.15 },
      resistances: [{ type: "shadow", reduction: 0.2 }],
    },
    color: "text-yellow-400",
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "A skilled hunter who strikes from afar and commands nature's aid.",
    lore: "Rangers are one with the wild, their arrows finding their mark with supernatural accuracy.",
    statBonuses: { health: 5, attack: 4, defense: 0 },
    resourceType: "focus",
    baseResource: 70,
    resourcePerLevel: 6,
    resourceRegen: 15,
    startingAbilities: ["ranger_shoot", "ranger_trap"],
    abilityUnlocks: [
      { level: 3, abilityId: "ranger_multishot" },
      { level: 3, abilityId: "ranger_hunts_instinct" }, // Foresight: reveals enemy intentions
      { level: 5, abilityId: "ranger_companion" },
      { level: 8, abilityId: "ranger_deadeye" },
    ],
    passives: { critBonus: 0.1, dodgeBonus: 0.05 },
    color: "text-green-400",
  },
  warlock: {
    id: "warlock",
    name: "Warlock",
    description: "A dark caster who bargains with forbidden powers for devastating magic.",
    lore: "Warlocks trade pieces of their soul for power beyond mortal comprehension.",
    statBonuses: { health: -5, attack: 3, defense: -1 },
    resourceType: "souls",
    baseResource: 60,
    resourcePerLevel: 5,
    resourceRegen: 5, // gains souls on kills
    startingAbilities: ["warlock_drain", "warlock_curse"],
    abilityUnlocks: [
      { level: 3, abilityId: "warlock_hellfire" },
      { level: 5, abilityId: "warlock_summon" },
      { level: 8, abilityId: "warlock_doom" },
    ],
    passives: {
      damageTypeBonus: { type: "shadow", bonus: 0.25 },
      resistances: [{ type: "holy", reduction: -0.2 }], // weakness
    },
    color: "text-violet-400",
  },
  paladin: {
    id: "paladin",
    name: "Paladin",
    description: "A holy knight who combines martial prowess with divine protection.",
    lore: "Paladins are champions of justice, their faith made manifest in steel and light.",
    statBonuses: { health: 15, attack: 2, defense: 4 },
    resourceType: "focus",
    baseResource: 60,
    resourcePerLevel: 6,
    resourceRegen: 10,
    startingAbilities: ["paladin_strike", "paladin_shield"],
    abilityUnlocks: [
      { level: 3, abilityId: "paladin_layonhands" },
      { level: 5, abilityId: "paladin_consecrate" },
      { level: 8, abilityId: "paladin_divine" },
    ],
    passives: {
      resistances: [
        { type: "shadow", reduction: 0.15 },
        { type: "holy", reduction: 0.15 },
      ],
    },
    color: "text-amber-300",
  },
  necromancer: {
    id: "necromancer",
    name: "Necromancer",
    description: "A master of death magic who commands the fallen and drains life.",
    lore: "Necromancers walk the line between life and death, wielding both as weapons.",
    statBonuses: { health: -10, attack: 2, defense: 0 },
    resourceType: "souls",
    baseResource: 80,
    resourcePerLevel: 8,
    resourceRegen: 3, // gains souls on kills and from abilities
    startingAbilities: ["necro_bolt", "necro_leech"],
    abilityUnlocks: [
      { level: 3, abilityId: "necro_raise" },
      { level: 5, abilityId: "necro_plague" },
      { level: 8, abilityId: "necro_army" },
    ],
    passives: {
      damageTypeBonus: { type: "shadow", bonus: 0.2 },
      resistances: [{ type: "poison", reduction: 0.3 }],
    },
    color: "text-emerald-600",
  },
  barbarian: {
    id: "barbarian",
    name: "Barbarian",
    description: "A primal warrior who channels fury into devastating attacks.",
    lore: "Barbarians fight with wild abandon, their rage making them nearly unstoppable.",
    statBonuses: { health: 30, attack: 6, defense: -2 },
    resourceType: "rage",
    baseResource: 100,
    resourcePerLevel: 10,
    resourceRegen: 5, // gains rage from damage taken
    startingAbilities: ["barb_slam", "barb_roar"],
    abilityUnlocks: [
      { level: 3, abilityId: "barb_frenzy" },
      { level: 5, abilityId: "barb_whirlwind" },
      { level: 8, abilityId: "barb_rampage" },
    ],
    passives: { critBonus: 0.1 },
    color: "text-orange-500",
  },
  monk: {
    id: "monk",
    name: "Monk",
    description: "A disciplined fighter who channels inner energy through martial arts.",
    lore: "Monks have perfected their bodies through meditation, achieving superhuman feats.",
    statBonuses: { health: 5, attack: 3, defense: 2 },
    resourceType: "energy",
    baseResource: 100,
    resourcePerLevel: 8,
    resourceRegen: 25,
    startingAbilities: ["monk_strike", "monk_meditate"],
    abilityUnlocks: [
      { level: 3, abilityId: "monk_flurry" },
      { level: 5, abilityId: "monk_palm" },
      { level: 8, abilityId: "monk_transcend" },
    ],
    passives: { dodgeBonus: 0.15, critBonus: 0.05 },
    color: "text-cyan-400",
  },
}

// ============================================================================
// BASE ABILITIES
// ============================================================================

export const BASE_ABILITIES: Record<string, Ability> = {
  // ---- WARRIOR ABILITIES ----
  warrior_strike: {
    id: "warrior_strike",
    entityType: "ability",
    name: "Heroic Strike",
    description: "A powerful overhead strike that deals bonus damage.",
    category: "combat",
    damageType: "physical",
    resourceCost: 15,
    resourceType: "rage",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 8,
    damageScaling: { stat: "strength", ratio: 1.2 },
    levelRequired: 1,
    classRequired: ["warrior"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    castNarration: "You raise your weapon high...",
    hitNarration: "The blow lands with crushing force!",
    tags: ["melee", "single-target", "burst"],
  },
  warrior_defend: {
    id: "warrior_defend",
    entityType: "ability",
    name: "Shield Wall",
    description: "Raise your defenses, reducing incoming damage.",
    category: "defensive",
    damageType: "physical",
    resourceCost: 20,
    resourceType: "rage",
    cooldown: 2,
    currentCooldown: 0,
    levelRequired: 1,
    classRequired: ["warrior"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [STATUS_EFFECTS.fortified()],
    castNarration: "You brace yourself behind your shield.",
    tags: ["defensive", "buff"],
  },
  warrior_cleave: {
    id: "warrior_cleave",
    entityType: "ability",
    name: "Cleave",
    description: "A sweeping attack that strikes all enemies.",
    category: "combat",
    damageType: "physical",
    resourceCost: 30,
    resourceType: "rage",
    cooldown: 3,
    currentCooldown: 0,
    baseDamage: 12,
    damageScaling: { stat: "strength", ratio: 0.8 },
    levelRequired: 3,
    classRequired: ["warrior"],
    targetType: "all_enemies",
    isPassive: false,
    canCritical: true,
    castNarration: "You swing your weapon in a wide arc!",
    hitNarration: "Your blade carves through everything in its path!",
    tags: ["melee", "aoe", "burst"],
  },
  warrior_battlecry: {
    id: "warrior_battlecry",
    entityType: "ability",
    name: "Battle Cry",
    description: "Let loose a fierce cry that empowers you and intimidates foes.",
    category: "utility",
    damageType: "physical",
    resourceCost: 25,
    resourceType: "rage",
    cooldown: 4,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["warrior"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [{ ...STATUS_EFFECTS.strengthened(), duration: 3, modifiers: { attack: 5 } }],
    castNarration: "You unleash a thunderous battle cry!",
    tags: ["buff", "intimidate"],
  },
  warrior_execute: {
    id: "warrior_execute",
    entityType: "ability",
    name: "Execute",
    description: "A finishing blow that deals massive damage to wounded enemies.",
    category: "ultimate",
    damageType: "physical",
    resourceCost: 50,
    resourceType: "rage",
    cooldown: 5,
    currentCooldown: 0,
    baseDamage: 25,
    damageScaling: { stat: "strength", ratio: 2.0 },
    levelRequired: 8,
    classRequired: ["warrior"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    ignoresDefense: true,
    castNarration: "You see the opening and strike with all your might!",
    hitNarration: "The killing blow lands! Your enemy crumbles!",
    tags: ["melee", "execute", "finisher"],
  },

  // ---- MAGE ABILITIES ----
  mage_firebolt: {
    id: "mage_firebolt",
    entityType: "ability",
    name: "Firebolt",
    description: "Launch a bolt of searing flame at your target.",
    category: "magic",
    damageType: "fire",
    resourceCost: 15,
    resourceType: "mana",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 10,
    damageScaling: { stat: "intelligence", ratio: 1.5 },
    levelRequired: 1,
    classRequired: ["mage"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    castNarration: "Flames gather in your palm...",
    hitNarration: "The firebolt explodes on impact!",
    tags: ["ranged", "fire", "single-target"],
  },
  mage_frostshield: {
    id: "mage_frostshield",
    entityType: "ability",
    name: "Frost Shield",
    description: "Encase yourself in protective ice.",
    category: "defensive",
    damageType: "ice",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 3,
    currentCooldown: 0,
    levelRequired: 1,
    classRequired: ["mage"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [{ ...STATUS_EFFECTS.fortified(), duration: 2, modifiers: { defense: 8 } }],
    castNarration: "Ice crystallizes around you in a protective shell.",
    tags: ["defensive", "ice", "buff"],
  },
  mage_lightning: {
    id: "mage_lightning",
    entityType: "ability",
    name: "Chain Lightning",
    description: "Call down lightning that arcs between enemies.",
    category: "magic",
    damageType: "lightning",
    resourceCost: 35,
    resourceType: "mana",
    cooldown: 2,
    currentCooldown: 0,
    baseDamage: 15,
    damageScaling: { stat: "intelligence", ratio: 1.3 },
    levelRequired: 3,
    classRequired: ["mage"],
    targetType: "all_enemies",
    isPassive: false,
    canCritical: true,
    castNarration: "You raise your hand to the sky...",
    hitNarration: "Lightning crashes down, arcing through your foes!",
    tags: ["ranged", "lightning", "aoe", "chain"],
  },
  mage_blizzard: {
    id: "mage_blizzard",
    entityType: "ability",
    name: "Blizzard",
    description: "Summon a raging blizzard that damages and slows enemies.",
    category: "magic",
    damageType: "ice",
    resourceCost: 45,
    resourceType: "mana",
    cooldown: 4,
    currentCooldown: 0,
    baseDamage: 12,
    damageScaling: { stat: "intelligence", ratio: 1.2 },
    levelRequired: 5,
    classRequired: ["mage"],
    targetType: "all_enemies",
    isPassive: false,
    appliesEffects: [STATUS_EFFECTS.weakened()],
    castNarration: "The temperature plummets as you channel frozen fury...",
    hitNarration: "A devastating blizzard engulfs your enemies!",
    tags: ["ranged", "ice", "aoe", "debuff"],
  },
  mage_meteor: {
    id: "mage_meteor",
    entityType: "ability",
    name: "Meteor",
    description: "Call down a blazing meteor from the heavens.",
    category: "ultimate",
    damageType: "fire",
    resourceCost: 70,
    resourceType: "mana",
    cooldown: 6,
    currentCooldown: 0,
    baseDamage: 40,
    damageScaling: { stat: "intelligence", ratio: 2.5 },
    levelRequired: 8,
    classRequired: ["mage"],
    targetType: "all_enemies",
    isPassive: false,
    canCritical: true,
    castNarration: "You tear a hole in the sky itself...",
    hitNarration: "A METEOR CRASHES DOWN WITH APOCALYPTIC FORCE!",
    tags: ["ranged", "fire", "aoe", "ultimate"],
  },

  // ---- ROGUE ABILITIES ----
  rogue_backstab: {
    id: "rogue_backstab",
    entityType: "ability",
    name: "Backstab",
    description: "Strike from the shadows for massive critical damage.",
    category: "combat",
    damageType: "physical",
    resourceCost: 20,
    resourceType: "energy",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 12,
    damageScaling: { stat: "dexterity", ratio: 1.8 },
    levelRequired: 1,
    classRequired: ["rogue"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    castNarration: "You slip into the shadows...",
    hitNarration: "Your blade finds the perfect opening!",
    tags: ["melee", "stealth", "burst"],
  },
  rogue_evade: {
    id: "rogue_evade",
    entityType: "ability",
    name: "Evade",
    description: "Become impossible to hit for a short time.",
    category: "defensive",
    damageType: "physical",
    resourceCost: 25,
    resourceType: "energy",
    cooldown: 3,
    currentCooldown: 0,
    levelRequired: 1,
    classRequired: ["rogue"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [
      {
        ...STATUS_EFFECTS.blessed(),
        name: "Evasion",
        description: "Dodging all attacks",
        duration: 1,
        modifiers: { defense: 50 },
      },
    ],
    castNarration: "You become a blur of motion.",
    tags: ["defensive", "dodge"],
  },
  rogue_poison: {
    id: "rogue_poison",
    entityType: "ability",
    name: "Envenom",
    description: "Coat your blade in deadly poison.",
    category: "utility",
    damageType: "poison",
    resourceCost: 30,
    resourceType: "energy",
    cooldown: 2,
    currentCooldown: 0,
    baseDamage: 5,
    levelRequired: 3,
    classRequired: ["rogue"],
    targetType: "enemy",
    isPassive: false,
    appliesEffects: [STATUS_EFFECTS.poisoned()],
    castNarration: "Venom drips from your blade...",
    hitNarration: "The poison seeps into their bloodstream!",
    tags: ["poison", "dot", "debuff"],
  },
  rogue_shadowstep: {
    id: "rogue_shadowstep",
    entityType: "ability",
    name: "Shadowstep",
    description: "Teleport through shadows and gain guaranteed critical hit.",
    category: "utility",
    damageType: "physical",
    resourceCost: 40,
    resourceType: "energy",
    cooldown: 4,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["rogue"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [
      {
        ...STATUS_EFFECTS.blessed(),
        name: "Shadow Shroud",
        description: "Next attack is guaranteed critical",
        duration: 1,
        modifiers: {},
      },
    ],
    castNarration: "You dissolve into shadow...",
    tags: ["mobility", "buff", "stealth"],
  },
  rogue_assassinate: {
    id: "rogue_assassinate",
    entityType: "ability",
    name: "Assassinate",
    description: "A lethal strike that deals extreme damage from stealth.",
    category: "ultimate",
    damageType: "physical",
    resourceCost: 60,
    resourceType: "energy",
    cooldown: 5,
    currentCooldown: 0,
    baseDamage: 35,
    damageScaling: { stat: "dexterity", ratio: 2.5 },
    levelRequired: 8,
    classRequired: ["rogue"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    ignoresDefense: true,
    castNarration: "Death itself guides your hand...",
    hitNarration: "ASSASSINATED! Your target never saw it coming!",
    tags: ["melee", "stealth", "execute", "ultimate"],
  },

  // ---- CLERIC ABILITIES ----
  cleric_smite: {
    id: "cleric_smite",
    entityType: "ability",
    name: "Holy Smite",
    description: "Strike with divine wrath.",
    category: "combat",
    damageType: "holy",
    resourceCost: 15,
    resourceType: "focus",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 8,
    damageScaling: { stat: "intelligence", ratio: 1.3 },
    levelRequired: 1,
    classRequired: ["cleric"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    castNarration: "Divine light gathers around your weapon...",
    hitNarration: "Holy light sears your foe!",
    tags: ["holy", "single-target"],
  },
  cleric_heal: {
    id: "cleric_heal",
    entityType: "ability",
    name: "Healing Light",
    description: "Channel divine energy to restore health.",
    category: "defensive",
    damageType: "holy",
    resourceCost: 20,
    resourceType: "focus",
    cooldown: 1,
    currentCooldown: 0,
    baseHealing: 25,
    healingScaling: { stat: "intelligence", ratio: 1.5 },
    levelRequired: 1,
    classRequired: ["cleric"],
    targetType: "self",
    isPassive: false,
    castNarration: "Warm light envelops you...",
    tags: ["heal", "self"],
  },
  cleric_sanctuary: {
    id: "cleric_sanctuary",
    entityType: "ability",
    name: "Sanctuary",
    description: "Create a protective barrier of holy light.",
    category: "defensive",
    damageType: "holy",
    resourceCost: 30,
    resourceType: "focus",
    cooldown: 4,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["cleric"],
    targetType: "self",
    isPassive: false,
    appliesEffects: [STATUS_EFFECTS.fortified(), STATUS_EFFECTS.regeneration()],
    castNarration: "A dome of golden light surrounds you.",
    tags: ["defensive", "holy", "buff"],
  },
  cleric_holyfire: {
    id: "cleric_holyfire",
    entityType: "ability",
    name: "Holy Fire",
    description: "Unleash cleansing flames upon the unholy.",
    category: "magic",
    damageType: "holy",
    resourceCost: 40,
    resourceType: "focus",
    cooldown: 3,
    currentCooldown: 0,
    baseDamage: 20,
    damageScaling: { stat: "intelligence", ratio: 1.8 },
    levelRequired: 5,
    classRequired: ["cleric"],
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    castNarration: "Sacred flames ignite at your command!",
    hitNarration: "Holy fire purges the darkness!",
    tags: ["holy", "fire", "burst"],
  },
  cleric_resurrection: {
    id: "cleric_resurrection",
    entityType: "ability",
    name: "Divine Intervention",
    description: "Call upon the gods to fully restore your health.",
    category: "ultimate",
    damageType: "holy",
    resourceCost: 70,
    resourceType: "focus",
    cooldown: 8,
    currentCooldown: 0,
    levelRequired: 8,
    classRequired: ["cleric"],
    targetType: "self",
    isPassive: false,
    baseHealing: 999, // full heal
    healingScaling: { stat: "maxHealth", ratio: 1.0 },
    appliesEffects: [STATUS_EFFECTS.blessed()],
    castNarration: "The heavens answer your prayer!",
    tags: ["heal", "ultimate", "holy"],
  },

  // ---- WARLOCK ABILITIES ----
  warlock_drain: {
    id: "warlock_drain",
    entityType: "ability",
    name: "Soul Drain",
    description: "Drain life force from your enemy.",
    category: "magic",
    damageType: "shadow",
    resourceCost: 10,
    resourceType: "souls",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 8,
    damageScaling: { stat: "intelligence", ratio: 1.2 },
    levelRequired: 1,
    classRequired: ["warlock"],
    targetType: "enemy",
    isPassive: false,
    lifeSteal: 0.5,
    castNarration: "Dark tendrils reach toward your foe...",
    hitNarration: "Their life essence flows into you!",
    tags: ["shadow", "lifesteal", "drain"],
  },
  warlock_curse: {
    id: "warlock_curse",
    entityType: "ability",
    name: "Curse of Agony",
    description: "Afflict your enemy with a painful curse.",
    category: "magic",
    damageType: "shadow",
    resourceCost: 15,
    resourceType: "souls",
    cooldown: 2,
    currentCooldown: 0,
    baseDamage: 3,
    levelRequired: 1,
    classRequired: ["warlock"],
    targetType: "enemy",
    isPassive: false,
    appliesEffects: [STATUS_EFFECTS.cursed()],
    castNarration: "You speak words of ancient malice...",
    hitNarration: "The curse takes hold!",
    tags: ["shadow", "curse", "dot"],
  },
  warlock_hellfire: {
    id: "warlock_hellfire",
    entityType: "ability",
    name: "Hellfire",
    description: "Unleash infernal flames that damage all, including yourself.",
    category: "magic",
    damageType: "fire",
    resourceCost: 25,
    resourceType: "souls",
    cooldown: 3,
    currentCooldown: 0,
    baseDamage: 25,
    damageScaling: { stat: "intelligence", ratio: 1.5 },
    levelRequired: 3,
    classRequired: ["warlock"],
    targetType: "all_enemies",
    isPassive: false,
    canCritical: true,
    castNarration: "You call upon hellish flames, heedless of the cost!",
    hitNarration: "Hellfire erupts, consuming everything!",
    tags: ["fire", "aoe", "self-damage"],
  },
  warlock_summon: {
    id: "warlock_summon",
    entityType: "ability",
    name: "Summon Imp",
    description: "Summon a demonic imp to fight alongside you.",
    category: "utility",
    damageType: "shadow",
    resourceCost: 35,
    resourceType: "souls",
    cooldown: 5,
    currentCooldown: 0,
    levelRequired: 5,
    classRequired: ["warlock"],
    targetType: "self",
    isPassive: false,
    castNarration: "A portal to the nether realm tears open...",
    tags: ["summon", "demon", "pet"],
  },
  warlock_doom: {
    id: "warlock_doom",
    entityType: "ability",
    name: "Doom",
    description: "Mark an enemy for death. After 3 turns, they take massive damage.",
    category: "ultimate",
    damageType: "shadow",
    resourceCost: 50,
    resourceType: "souls",
    cooldown: 6,
    currentCooldown: 0,
    baseDamage: 50,
    damageScaling: { stat: "intelligence", ratio: 3.0 },
    levelRequired: 8,
    classRequired: ["warlock"],
    targetType: "enemy",
    isPassive: false,
    ignoresDefense: true,
    castNarration: "You inscribe the rune of absolute doom upon your foe...",
    hitNarration: "DOOM claims its victim!",
    tags: ["shadow", "delayed", "ultimate"],
  },

  // ---- FORESIGHT ABILITIES ----
  // These abilities grant temporary status effects that reveal outcomes

  ranger_hunts_instinct: {
    id: "ranger_hunts_instinct",
    entityType: "ability",
    name: "Hunt's Instinct",
    description: "Focus your predator's instincts to sense your enemy's next move. Reveals enemy ability and damage range for 1 turn.",
    category: "utility",
    resourceCost: 15,
    resourceType: "focus",
    cooldown: 3,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["ranger"],
    targetType: "self",
    isPassive: false,
    statusEffect: {
      name: "Hunt's Instinct",
      effectType: "buff",
      duration: 1,
      description: "Your predator's instincts reveal enemy intentions",
      grantsForesight: { context: "combat", level: "partial" },
    },
    castNarration: "You still your breath and let your hunter's instincts take over...",
    tags: ["utility", "foresight", "combat-insight"],
  },

  rogue_trap_sense: {
    id: "rogue_trap_sense",
    entityType: "ability",
    name: "Trap Sense",
    description: "Your experience with traps lets you perceive their mechanisms. Reveals full trap details and grants disarm bonus for 3 turns.",
    category: "utility",
    resourceCost: 10,
    resourceType: "energy",
    cooldown: 4,
    currentCooldown: 0,
    levelRequired: 3,
    classRequired: ["rogue"],
    targetType: "self",
    isPassive: false,
    statusEffect: {
      name: "Trap Sense",
      effectType: "buff",
      duration: 3,
      description: "Your trap expertise reveals hidden mechanisms (+3 to disarm)",
      grantsForesight: { context: "trap_encounter", level: "full" },
    },
    castNarration: "You attune your senses to the subtle signs of hidden dangers...",
    tags: ["utility", "foresight", "trap-insight"],
  },

  mage_arcane_analysis: {
    id: "mage_arcane_analysis",
    entityType: "ability",
    name: "Arcane Analysis",
    description: "Channel your arcane knowledge to perceive magical energies. Reveals magical effects on shrines and enchanted objects for 2 turns.",
    category: "utility",
    resourceCost: 20,
    resourceType: "mana",
    cooldown: 5,
    currentCooldown: 0,
    levelRequired: 4,
    classRequired: ["mage"],
    targetType: "self",
    isPassive: false,
    statusEffect: {
      name: "Arcane Analysis",
      effectType: "buff",
      duration: 2,
      description: "Magical energies become visible to your sight",
      grantsForesight: { contexts: ["shrine_choice", "environmental_interaction"], level: "full", tagFilter: ["magical", "enchanted"] },
    },
    castNarration: "You open your third eye to the flows of arcane energy...",
    tags: ["utility", "foresight", "magical-insight"],
  },

  cleric_divine_insight: {
    id: "cleric_divine_insight",
    entityType: "ability",
    name: "Divine Insight",
    description: "Pray for divine guidance to perceive the true nature of shrines and the intentions of others. Lasts 2 turns.",
    category: "utility",
    resourceCost: 25,
    resourceType: "faith",
    cooldown: 5,
    currentCooldown: 0,
    levelRequired: 4,
    classRequired: ["cleric"],
    targetType: "self",
    isPassive: false,
    statusEffect: {
      name: "Divine Insight",
      effectType: "buff",
      duration: 2,
      description: "Divine wisdom illuminates hidden truths",
      grantsForesight: { contexts: ["shrine_choice", "npc_interaction"], level: "full" },
    },
    castNarration: "You bow your head in silent prayer, and clarity washes over you...",
    tags: ["utility", "foresight", "divine-insight"],
  },

  // ---- UNIVERSAL / BASIC ATTACK ----
  basic_attack: {
    id: "basic_attack",
    entityType: "ability",
    name: "Attack",
    description: "A basic weapon attack.",
    category: "combat",
    damageType: "physical",
    resourceCost: 0,
    resourceType: "energy",
    cooldown: 0,
    currentCooldown: 0,
    baseDamage: 0, // uses weapon damage
    damageScaling: { stat: "attack", ratio: 1.0 },
    levelRequired: 1,
    targetType: "enemy",
    isPassive: false,
    canCritical: true,
    tags: ["basic", "melee"],
  },
}

// ============================================================================
// ABILITY EXECUTION
// ============================================================================

export interface AbilityResult {
  success: boolean
  damage?: number
  healing?: number
  isCritical?: boolean
  resourceSpent: number
  effectsApplied?: StatusEffect[]
  cooldownSet: number
  narration: string
}

export function canUseAbility(player: Player, ability: Ability): { canUse: boolean; reason?: string } {
  // Check resource
  if (player.resources.current < ability.resourceCost) {
    return { canUse: false, reason: `Not enough ${ability.resourceType} (need ${ability.resourceCost})` }
  }

  // Check cooldown
  const cooldownRemaining = player.abilityCooldowns[ability.id] || 0
  if (cooldownRemaining > 0) {
    return { canUse: false, reason: `On cooldown (${cooldownRemaining} turns)` }
  }

  // Check level
  if (player.stats.level < ability.levelRequired) {
    return { canUse: false, reason: `Requires level ${ability.levelRequired}` }
  }

  // Check class
  if (ability.classRequired && player.class && !ability.classRequired.includes(player.class)) {
    return { canUse: false, reason: `Requires ${ability.classRequired.join(" or ")} class` }
  }

  return { canUse: true }
}

export function calculateAbilityDamage(
  player: Player,
  ability: Ability,
  target: Combatant,
): { damage: number; isCritical: boolean } {
  if (!ability.baseDamage && !ability.damageScaling) {
    return { damage: 0, isCritical: false }
  }

  let baseDamage = ability.baseDamage || 0

  // Apply scaling
  if (ability.damageScaling) {
    const statValue =
      ability.damageScaling.stat === "attack"
        ? player.stats.attack
        : ability.damageScaling.stat === "strength"
          ? player.stats.strength
          : ability.damageScaling.stat === "intelligence"
            ? player.stats.intelligence
            : ability.damageScaling.stat === "level"
              ? player.stats.level
              : player.stats.dexterity
    baseDamage += Math.floor(statValue * ability.damageScaling.ratio)
  }

  // Apply defense reduction (unless ignores defense)
  if (!ability.ignoresDefense) {
    baseDamage = Math.max(1, baseDamage - Math.floor(target.defense * 0.4))
  }

  // Check for critical
  let isCritical = false
  if (ability.canCritical) {
    const critChance = player.stats.critChance
    isCritical = Math.random() < critChance
  }

  const critMultiplier = isCritical ? 1.5 : 1
  const finalDamage = Math.max(1, Math.floor(baseDamage * critMultiplier))

  return { damage: finalDamage, isCritical }
}

export function calculateAbilityHealing(player: Player, ability: Ability): number {
  if (!ability.baseHealing && !ability.healingScaling) {
    return 0
  }

  let healing = ability.baseHealing || 0

  if (ability.healingScaling) {
    const statValue =
      ability.healingScaling.stat === "intelligence"
        ? player.stats.intelligence
        : ability.healingScaling.stat === "level"
          ? player.stats.level
          : player.stats.maxHealth
    healing += Math.floor(statValue * ability.healingScaling.ratio)
  }

  // Cap at max health
  const maxHeal = player.stats.maxHealth - player.stats.health
  return Math.min(healing, maxHeal)
}

export function executeAbility(player: Player, ability: Ability, target?: Combatant): AbilityResult {
  const canUse = canUseAbility(player, ability)
  if (!canUse.canUse) {
    return {
      success: false,
      resourceSpent: 0,
      cooldownSet: 0,
      narration: canUse.reason || "Cannot use ability",
    }
  }

  let damage: number | undefined
  let healing: number | undefined
  let isCritical = false

  // Calculate damage
  if (target && (ability.baseDamage || ability.damageScaling)) {
    const result = calculateAbilityDamage(player, ability, target)
    damage = result.damage
    isCritical = result.isCritical
  }

  // Calculate healing
  if (ability.targetType === "self" && (ability.baseHealing || ability.healingScaling)) {
    healing = calculateAbilityHealing(player, ability)
  }

  // Build narration
  let narration = ability.castNarration || `You use ${ability.name}!`
  if (damage && damage > 0) {
    narration = isCritical
      ? `CRITICAL! ${ability.hitNarration || `${ability.name} deals ${damage} damage!`}`
      : ability.hitNarration || `${ability.name} deals ${damage} damage!`
  }

  return {
    success: true,
    damage,
    healing,
    isCritical,
    resourceSpent: ability.resourceCost,
    effectsApplied: ability.appliesEffects,
    cooldownSet: ability.cooldown,
    narration,
  }
}

// ============================================================================
// CLASS INITIALIZATION
// ============================================================================

export function initializePlayerClass(player: Player, classId: PlayerClass): Player {
  const classDef = CLASSES[classId]
  if (!classDef) return player

  const startingAbilities = classDef.startingAbilities.map((id) => BASE_ABILITIES[id]).filter(Boolean)
  const sustainedAbilities = getSustainedAbilitiesForClass(classId, 1) // Get level 1 sustained abilities

  return {
    ...player,
    class: classId,
    className: classDef.name,
    stats: {
      ...player.stats,
      maxHealth: player.stats.maxHealth + classDef.statBonuses.health,
      health: player.stats.health + classDef.statBonuses.health,
      attack: player.stats.attack + classDef.statBonuses.attack,
      defense: player.stats.defense + classDef.statBonuses.defense,
      critChance: player.stats.critChance + (classDef.passives.critBonus || 0),
      dodgeChance: player.stats.dodgeChance + (classDef.passives.dodgeBonus || 0),
    },
    abilities: startingAbilities,
    sustainedAbilities,
    resources: {
      type: classDef.resourceType,
      current: classDef.baseResource,
      max: classDef.baseResource,
    },
    abilityCooldowns: {},
  }
}

export function getClassAbilitiesForLevel(classId: PlayerClass, level: number): Ability[] {
  const classDef = CLASSES[classId]
  if (!classDef) return []

  const availableAbilityIds = [
    ...classDef.startingAbilities,
    ...classDef.abilityUnlocks.filter((unlock) => unlock.level <= level).map((unlock) => unlock.abilityId),
  ]

  return availableAbilityIds.map((id) => BASE_ABILITIES[id]).filter(Boolean)
}

export function regenerateResource(player: Player): Player {
  const classDef = player.class ? CLASSES[player.class] : null
  if (!classDef) return player

  const newCurrent = Math.min(player.resources.max, player.resources.current + classDef.resourceRegen)

  return {
    ...player,
    resources: {
      ...player.resources,
      current: newCurrent,
    },
  }
}

export function tickCooldowns(player: Player): Player {
  const newCooldowns: Record<string, number> = {}

  for (const [abilityId, turns] of Object.entries(player.abilityCooldowns)) {
    if (turns > 1) {
      newCooldowns[abilityId] = turns - 1
    }
  }

  return {
    ...player,
    abilityCooldowns: newCooldowns,
  }
}

// Get resource color for UI
export function getResourceColor(resourceType: ResourceType): string {
  switch (resourceType) {
    case "mana":
      return "text-blue-400"
    case "rage":
      return "text-red-400"
    case "energy":
      return "text-yellow-400"
    case "focus":
      return "text-amber-300"
    case "souls":
      return "text-violet-400"
    default:
      return "text-gray-400"
  }
}
