import { z } from "zod"
import { getMechanicsHint } from "./game-mechanics-ledger"

// Get mechanics hint for schema descriptions
const ITEM_DESC_HINT = getMechanicsHint()

// ============================================
// ENTITY GENERATOR SCHEMAS
// ============================================

export const itemSchema = z.object({
  name: z.string().describe("Evocative fantasy item name, 2-4 words"),
  description: z.string().describe(`Brief visceral description. ${ITEM_DESC_HINT}`),
  lore: z.string().describe("Dark fantasy backstory hint, 1 sentence"),
  useText: z.string().nullish().describe("What happens when used, 1 sentence"),
})

export const enemySchema = z.object({
  name: z.string().describe("Menacing enemy name, 1-3 words"),
  description: z.string().describe("Visceral appearance description, 1-2 sentences"),
  abilities: z.array(z.string()).describe("1-2 special abilities the enemy might use"),
  weakness: z.string().nullish().describe("A hint at vulnerability"),
  lastWords: z.string().nullish().describe("What it says/does when dying"),
})

export const npcSchema = z.object({
  name: z.string().describe("Character name"),
  personality: z.string().describe("Key personality traits, 2-3 words"),
  greeting: z.string().describe("Initial dialogue when met, 1-2 sentences"),
  backstory: z.string().describe("Brief hint at their story, 1 sentence"),
  motivation: z.string().describe("What they want, 1 sentence"),
})

export const trapSchema = z.object({
  name: z.string().describe("Trap name, 2-3 words"),
  description: z.string().describe("How it looks before triggered, 1 sentence"),
  triggerDescription: z.string().describe("What happens when triggered, 1 sentence"),
  disarmHint: z.string().describe("Subtle hint how to avoid/disarm, 1 sentence"),
})

export const shrineSchema = z.object({
  name: z.string().describe("Shrine name, 2-4 words"),
  description: z.string().describe("Atmospheric description, 1-2 sentences"),
  offeringPrompt: z.string().describe("What it seems to want, 1 sentence"),
  blessingDescription: z.string().describe("What blessing it might grant, 1 sentence"),
  curseWarning: z.string().describe("Hint of danger if wrong choice, 1 sentence"),
})

export const bossSchema = z.object({
  name: z.string().describe("Imposing boss name, 2-4 words"),
  title: z.string().describe("Intimidating title, 2-4 words"),
  description: z.string().describe("Terrifying appearance, 2-3 sentences"),
  introDialogue: z.string().describe("What boss says when encountered, 1-2 sentences"),
  phaseTransitions: z.array(z.string()).describe("2-3 lines for phase changes"),
  deathDialogue: z.string().describe("Final words upon defeat, 1-2 sentences"),
  specialAbility: z.string().describe("Signature attack or power"),
})

export const companionSchema = z.object({
  name: z.string().describe("Character name"),
  appearance: z.string().describe("Brief physical description, 1 sentence"),
  personality: z.string().describe("Key traits, 2-3 words"),
  backstory: z.string().describe("Why they're in the dungeon, 1-2 sentences"),
  combatStyle: z.string().describe("How they fight, 1 sentence"),
  loyaltyQuote: z.string().describe("Something they say when loyal, 1 sentence"),
  betrayalHint: z.string().nullish().describe("Subtle warning sign, 1 sentence"),
  deathQuote: z.string().describe("Final words if they die, 1 sentence"),
})

export const roomNarrationSchema = z.object({
  description: z.string().describe("Atmospheric room description, 1-2 sentences"),
  entityIntro: z.string().nullish().describe("How entity in room is introduced, 1 sentence"),
  environmentalDetail: z.string().describe("A small sensory detail, 1 sentence"),
  foreshadowing: z.string().nullish().describe("Hint at future danger or reward, 1 sentence"),
})

export const combatNarrationSchema = z.object({
  attackDescription: z.string().describe("Vivid attack description, 1 sentence"),
  impactDescription: z.string().describe("How the hit lands, 1 sentence"),
  victimReaction: z.string().describe("How the target reacts, 1 sentence"),
})

export const eventOutcomeSchema = z.object({
  narration: z.string().describe("What happens, 1-2 sentences"),
  consequence: z.string().describe("The immediate result, 1 sentence"),
  foreshadow: z.string().nullish().describe("Hint at lasting effect, 1 sentence"),
})

// ============================================
// EVENT CHAIN SCHEMAS
// ============================================

export const environmentalEntitySchema = z.object({
  name: z.string(),
  class: z.enum(["object", "substance", "creature", "mechanism", "magical", "corpse", "container"]),
  tags: z.array(z.string()),
  description: z.string().describe("Brief description for examine action"),
})

export const roomEventEnemySchema = z.object({
  name: z.string(),
  description: z.string(),
  tier: z.enum(["minion", "standard", "elite", "boss"]),
  abilities: z.array(z.string()),
  weakness: z.string().nullish(),
  battleCry: z.string().nullish(),
  deathCry: z.string().nullish(),
})

export const roomEventLootSchema = z.object({
  itemName: z.string(),
  itemDescription: z.string().describe(ITEM_DESC_HINT),
  itemLore: z.string(),
  discoveryNarration: z.string(),
})

export const roomEventTrapSchema = z.object({
  name: z.string(),
  appearance: z.string(),
  triggerEffect: z.string(),
  disarmHint: z.string(),
})

export const roomEventShrineSchema = z.object({
  name: z.string(),
  appearance: z.string(),
  aura: z.string(),
  offeringPrompt: z.string(),
  blessingHint: z.string(),
  curseWarning: z.string(),
})

export const roomEventNPCSchema = z.object({
  name: z.string(),
  appearance: z.string(),
  greeting: z.string(),
  personality: z.string(),
  motivation: z.string(),
  secret: z.string().nullish(),
})

export const roomEventSchema = z.object({
  roomDescription: z.string().describe("Atmospheric 1-2 sentence room description with {entity:name:class:tags} markers"),
  ambiance: z.string().describe("A sensory detail: sound, smell, or feeling"),
  entityType: z.enum(["enemy", "treasure", "trap", "shrine", "npc", "empty", "boss"]),
  environmentalEntities: z.array(environmentalEntitySchema).nullish(),
  enemy: roomEventEnemySchema.nullish(),
  loot: roomEventLootSchema.nullish(),
  trap: roomEventTrapSchema.nullish(),
  shrine: roomEventShrineSchema.nullish(),
  npc: roomEventNPCSchema.nullish(),
  foreshadow: z.string().nullish().describe("Subtle hint at future danger or reward"),
})

export const combatRoundSchema = z.object({
  playerAttack: z.object({
    narration: z.string().describe("Vivid 1-sentence attack"),
    impact: z.string().describe("How blow lands"),
    enemyReaction: z.string().describe("Enemy response"),
  }),
  enemyAttack: z.object({
    narration: z.string().describe("Menacing attack"),
    impact: z.string().describe("How player endures"),
    taunt: z.string().describe("Enemy taunt"),
  }),
  battleMomentum: z.enum(["player_advantage", "enemy_advantage", "stalemate", "desperate"]),
  tensionNote: z.string().describe("Brief atmospheric detail"),
})

export const victorySchema = z.object({
  deathBlow: z.string().describe("Dramatic killing blow"),
  enemyDeath: z.string().describe("How enemy falls"),
  aftermath: z.string().describe("Silence after battle"),
  lootReveal: z.object({
    discovery: z.string(),
    itemName: z.string(),
    itemDescription: z.string().describe(ITEM_DESC_HINT),
    itemLore: z.string(),
  }).nullish(),
  experienceNarration: z.string().describe("How player grows"),
})

export const companionRecruitSchema = z.object({
  name: z.string().describe("Unique name"),
  species: z.string().describe("What kind of creature"),
  origin: z.string().describe("How recruitable"),
  appearance: z.string().describe("2-3 sentence description"),
  personality: z.array(z.string()).describe("Personality traits"),
  quirk: z.string().describe("Memorable habit"),
  stats: z.object({
    health: z.number(),
    attack: z.number(),
    defense: z.number(),
    speed: z.number(),
  }),
  abilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    effectType: z.enum(["damage", "heal", "buff", "debuff", "utility", "special"]),
    target: z.enum(["enemy", "player", "self", "all_enemies", "all_allies"]),
    power: z.number(),
    cooldown: z.number(),
    narration: z.string().nullish(),
  })),
  combatStyle: z.enum(["aggressive", "defensive", "support", "tactical", "chaotic", "passive"]),
  combatPriority: z.string().describe("What they prioritize"),
  fleeThreshold: z.number().nullish().describe("HP percentage to flee"),
  bond: z.object({
    startingLevel: z.number(),
    initialMood: z.string(),
    firstMemory: z.string(),
  }),
  evolution: z.object({
    potential: z.string(),
    triggers: z.array(z.string()),
    evolvesInto: z.string(),
  }).nullish(),
  battleCry: z.string().nullish(),
  idleComment: z.string().nullish(),
  flags: z.array(z.string()).nullish(),
})

export const companionActionSchema = z.object({
  actionType: z.enum(["attack", "ability", "defend", "special", "betray", "flee"]),
  abilityUsed: z.string().nullish().describe("Ability name if used"),
  narration: z.string().describe("What companion does"),
  targetReaction: z.string().describe("How target reacts"),
  companionDialogue: z.string().describe("What they say"),
  bondChange: z.object({
    delta: z.number(),
    reason: z.string(),
  }).nullish(),
  moodShift: z.string().nullish().describe("New mood"),
})

export const companionMomentSchema = z.object({
  trigger: z.string().describe("What triggered this"),
  observation: z.string().describe("What companion notices"),
  reaction: z.string().describe("How they react"),
  dialogue: z.string().describe("What they say"),
  bondChange: z.object({
    delta: z.number(),
    reason: z.string(),
  }).nullish(),
})

export const pathPreviewSchema = z.object({
  paths: z.array(z.object({
    preview: z.string().describe("Atmospheric hint"),
    sensoryDetail: z.string().describe("What player senses"),
    dangerHint: z.string().describe("Danger indication"),
  })),
  ambiance: z.string().describe("Overall feeling"),
})

export const hazardNarrationSchema = z.object({
  introduction: z.string().describe("How hazard is noticed"),
  effect: z.string().describe("What it does"),
  survival: z.string().describe("How to endure"),
})

export const enhancedLootSchema = z.object({
  name: z.string().describe("Evocative item name"),
  lore: z.string().describe("Item history"),
  discoveryNarration: z.string().describe("How player finds it"),
  useHint: z.string().nullish().describe(`Hint about damage type or stat bonus. ${ITEM_DESC_HINT}`),
})

export const dungeonCardSchema = z.object({
  name: z.string().describe("Dungeon name 2-4 words"),
  theme: z.string().describe("Atmosphere, 1 sentence"),
  hook: z.string().describe("What draws adventurers, 1 sentence"),
  dangers: z.array(z.string()).describe("3 dangers"),
  rewards: z.array(z.string()).describe("2 rewards"),
  bossHint: z.string().describe("Cryptic hint about boss"),
  modifier: z.object({
    name: z.string(),
    effect: z.string(),
  }).nullish(),
})

export const deathNarrationSchema = z.object({
  deathScene: z.string().describe("Dramatic 2-3 sentence death description"),
  lastMoment: z.string().describe("Final thought or vision"),
  epitaph: z.string().describe("Brief epitaph for the fallen"),
})

export const environmentalInteractionSchema = z.object({
  narration: z.string().describe("1-2 sentence description of what happens"),
  outcome: z.enum(["success", "failure", "partial", "unexpected"]),
  rewards: z.object({
    item: z.object({
      name: z.string(),
      type: z.enum(["weapon", "armor", "potion", "misc", "key", "quest"]),
      rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
      description: z.string().describe(ITEM_DESC_HINT),
      lore: z.string(),
    }).nullish(),
    gold: z.number().nullish(),
    effect: z.object({
      name: z.string(),
      type: z.enum(["buff", "debuff"]),
      duration: z.number(),
      description: z.string(),
    }).nullish(),
    healing: z.number().nullish(),
    damage: z.number().nullish(),
    experience: z.number().nullish(),
  }).nullish(),
  consequences: z.object({
    entityConsumed: z.boolean().nullish(),
    spawnsEnemy: z.boolean().nullish(),
    triggersTrap: z.boolean().nullish(),
    revealsSecret: z.boolean().nullish(),
  }).nullish(),
  newEntity: environmentalEntitySchema.nullish(),
  companionReaction: z.string().nullish().describe("What companion says if present"),
})

export const unknownItemUseSchema = z.object({
  narration: z.string().describe("2-3 sentences describing what happens when item is used"),
  effectType: z.enum(["beneficial", "harmful", "mixed", "neutral", "transformative"]),
  skillCheck: z.object({
    required: z.boolean(),
    skill: z.enum(["wisdom", "intelligence", "dexterity", "strength", "perception"]),
    difficulty: z.number(),
    successBonus: z.string(),
    failurePenalty: z.string(),
  }).nullish(),
  immediateEffects: z.object({
    healing: z.number().nullish(),
    damage: z.number().nullish(),
    damageType: z.enum(["poison", "fire", "ice", "shadow", "holy", "arcane", "physical"]).nullish(),
    statusEffect: z.object({
      name: z.string(),
      effectType: z.enum(["buff", "debuff"]),
      duration: z.number(),
      description: z.string(),
      modifiers: z.object({
        attack: z.number().nullish(),
        defense: z.number().nullish(),
        maxHealth: z.number().nullish(),
        healthRegen: z.number().nullish(),
      }).nullish(),
    }).nullish(),
  }).nullish(),
  delayedEffects: z.object({
    turnsUntil: z.number(),
    narration: z.string(),
    effect: z.object({
      name: z.string(),
      effectType: z.enum(["buff", "debuff"]),
      duration: z.number(),
      description: z.string(),
    }),
  }).nullish(),
  permanentChanges: z.object({
    statChange: z.object({
      stat: z.enum(["maxHealth", "attack", "defense", "strength", "intelligence", "dexterity"]),
      change: z.number(),
    }).nullish(),
    abilityHint: z.string().nullish(),
    transformDescription: z.string().nullish(),
  }).nullish(),
  itemTransformation: z.object({
    name: z.string(),
    type: z.enum(["potion", "weapon", "armor", "misc"]),
    rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
    description: z.string().describe(ITEM_DESC_HINT),
    lore: z.string(),
    useText: z.string().nullish(),
    canReuse: z.boolean().nullish(),
    stats: z.object({
      attack: z.number().nullish(),
      defense: z.number().nullish(),
      health: z.number().nullish(),
    }).nullish(),
  }).nullish(),
  sideEffects: z.array(z.string()).nullish(),
  companionReaction: z.string().nullish(),
  worldReaction: z.string().nullish(),
})

export const generateEffectSchema = z.object({
  name: z.string().describe("Evocative effect name"),
  effectType: z.enum(["buff", "debuff", "neutral"]),
  description: z.string().describe("1-2 sentence atmospheric description"),
  category: z.enum([
    "damage_over_time", "heal_over_time", "stat_modifier", "damage_modifier",
    "resistance", "vulnerability", "control", "utility", "transformation",
    "triggered", "compound"
  ]),
  durationType: z.enum(["turns", "actions", "rooms", "hits", "permanent", "conditional"]),
  durationValue: z.number(),
  condition: z.string().nullish().describe("Condition for conditional duration"),
  triggers: z.array(z.enum([
    "turn_start", "turn_end", "on_attack", "on_defend", "on_damage_taken",
    "on_damage_dealt", "on_kill", "on_heal", "on_room_enter", "on_combat_start",
    "on_combat_end", "passive"
  ])),
  stackBehavior: z.enum(["none", "duration", "intensity", "independent"]),
  maxStacks: z.number().nullish(),
  stackModifier: z.number().nullish(),
  modifiers: z.object({
    attack: z.number().nullish(),
    defense: z.number().nullish(),
    maxHealth: z.number().nullish(),
    healthRegen: z.number().nullish(),
    goldMultiplier: z.number().nullish(),
    expMultiplier: z.number().nullish(),
  }).nullish(),
  powerLevel: z.number().describe("1-10 scale"),
  rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
  applyNarration: z.string().describe("What happens when effect is applied"),
  tickNarration: z.string().nullish().describe("What happens each tick"),
  expireNarration: z.string().describe("What happens when effect ends"),
  triggeredEffects: z.array(z.object({
    trigger: z.string(),
    chance: z.number(),
    narrative: z.string(),
    effectName: z.string(),
  })).nullish(),
  cleansable: z.boolean().nullish(),
  cleanseResistance: z.number().nullish(),
  animation: z.enum(["pulse", "shimmer", "flicker", "burn", "freeze", "poison", "holy", "dark"]).nullish(),
  color: z.string().nullish().describe("CSS color class"),
})

export const effectComboSchema = z.object({
  comboName: z.string().describe("Dramatic combo name"),
  narration: z.string().describe("2-3 sentence vivid description of the interaction"),
  visualEffect: z.string().describe("What it looks like"),
  soundEffect: z.string().describe("What it sounds like"),
  aftermath: z.string().describe("The lasting impression"),
})

export const ambientEffectSchema = z.object({
  introduction: z.string().describe("How the environmental effect manifests"),
  sensation: z.string().describe("What the player feels"),
  warning: z.string().nullish().describe("Any hint of what's to come"),
  resistanceNarration: z.string().nullish().describe("What happens if resisted"),
})

// ============================================
// DUNGEON MASTER SCHEMAS
// ============================================

export const roomSchema = z.object({
  roomDescription: z.string().describe("1-2 sentence atmospheric description"),
  eventNarration: z.string().describe("1 sentence what happens"),
})

export const enemyEncounterSchema = z.object({
  encounterNarration: z.string().describe("1-2 sentences how enemy appears"),
  enemyDescription: z.string().describe("Brief visceral description"),
})

export const playerAttackSchema = z.object({
  attackNarration: z.string().describe("1 sentence attack description"),
  enemyReaction: z.string().describe("1 sentence enemy response"),
})

export const enemyAttackSchema = z.object({
  attackNarration: z.string().describe("1 sentence attack description"),
  playerReaction: z.string().describe("1 sentence player response"),
})

export const dmVictorySchema = z.object({
  deathNarration: z.string().describe("1 sentence enemy defeat"),
  spoilsNarration: z.string().describe("1 sentence claiming rewards"),
})

export const lootSchema = z.object({
  discoveryNarration: z.string().describe("1 sentence finding treasure"),
  itemDescription: z.string().describe("Brief item description"),
})

export const goldDiscoverySchema = z.object({
  discoveryNarration: z.string().describe("1 sentence finding gold"),
  treasureDescription: z.string().describe("Brief treasure description"),
})

export const fleeSuccessSchema = z.object({
  fleeNarration: z.string().describe("1 sentence escape attempt"),
  outcome: z.string().describe("1 sentence result"),
})

export const fleeFailSchema = z.object({
  fleeNarration: z.string().describe("1 sentence escape attempt"),
  outcome: z.string().describe("1 sentence punishing result"),
})

export const playerDeathSchema = z.object({
  deathNarration: z.string().describe("2-3 sentences dramatic dark death"),
})

export const descendSchema = z.object({
  roomDescription: z.string().describe("1-2 sentence descent description"),
  eventNarration: z.string().describe("1 sentence what awaits"),
})

export const emptyRoomSchema = z.object({
  roomDescription: z.string().describe("1-2 sentence empty room"),
  eventNarration: z.string().describe("1 sentence atmosphere"),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type ItemGeneration = z.infer<typeof itemSchema>
export type EnemyGeneration = z.infer<typeof enemySchema>
export type NPCGeneration = z.infer<typeof npcSchema>
export type TrapGeneration = z.infer<typeof trapSchema>
export type ShrineGeneration = z.infer<typeof shrineSchema>
export type BossGeneration = z.infer<typeof bossSchema>
export type CompanionGeneration = z.infer<typeof companionSchema>
export type RoomEventGeneration = z.infer<typeof roomEventSchema>
export type CombatRoundGeneration = z.infer<typeof combatRoundSchema>
export type VictoryGeneration = z.infer<typeof victorySchema>
export type CompanionRecruitGeneration = z.infer<typeof companionRecruitSchema>
export type UnknownItemUseGeneration = z.infer<typeof unknownItemUseSchema>
export type GenerateEffectGeneration = z.infer<typeof generateEffectSchema>
