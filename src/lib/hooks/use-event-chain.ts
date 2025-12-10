"use client"

import { useState, useCallback } from "react"
import { debugLog } from "@/lib/debug/debug"
import type { GameState, EnvironmentalInteractionResult, SkillType } from "@/lib/core/game-types"
import type { EffectCategory, DurationType, EffectTrigger, StackBehavior } from "@/lib/combat/effect-system"
import { extractPlayerCapabilities, buildCapabilityContextForAI } from "@/lib/mechanics/player-capabilities"

// Event chain types that can be requested
export type EventChainType =
  | "room_event"
  | "combat_round"
  | "victory"
  | "interaction"
  | "boss_encounter"
  | "dungeon_card"
  | "companion_recruit"
  | "companion_action"
  | "companion_moment"
  | "environmental_interaction"
  | "unknown_item_use"
  | "generate_effect"
  | "effect_combo"
  | "ambient_effect"

// Room event response with all possible entities
export interface RoomEventResponse {
  roomDescription: string
  ambiance: string
  entityType: "enemy" | "treasure" | "trap" | "shrine" | "npc" | "empty" | "boss"
  foreshadow?: string
  environmentalEntities?: Array<{
    name: string
    class: string
    tags: string[]
    description: string
  }>

  enemy?: {
    name: string
    description: string
    tier: "minion" | "standard" | "elite" | "boss"
    abilities: string[]
    weakness?: string
    battleCry: string
    deathCry: string
  }

  loot?: {
    itemName: string
    itemDescription: string
    itemLore: string
    discoveryNarration: string
  }

  trap?: {
    name: string
    appearance: string
    triggerEffect: string
    disarmHint: string
  }

  shrine?: {
    name: string
    appearance: string
    aura: string
    offeringPrompt: string
    blessingHint: string
    curseWarning: string
  }

  npc?: {
    name: string
    appearance: string
    greeting: string
    personality: string
    motivation: string
    secret?: string
  }
}

export interface CombatRoundResponse {
  playerAttack: {
    narration: string
    impact: string
    enemyReaction: string
  }
  enemyAttack?: {
    narration: string
    impact: string
    taunt?: string
  }
  battleMomentum: "player_advantage" | "enemy_advantage" | "stalemate" | "desperate"
  tensionNote: string
}

export interface VictoryResponse {
  deathBlow: string
  enemyDeath: string
  aftermath: string
  lootReveal?: {
    discovery: string
    itemName: string
    itemDescription: string
    itemLore: string
  }
  experienceNarration: string
}

export interface InteractionResponse {
  action: string
  immediateResult: string
  consequence: string
  entityReaction?: string
  newEntitySpawned?: {
    type: "item" | "enemy" | "effect" | "companion"
    name: string
    description: string
  }
}

export interface BossEncounterResponse {
  entrance: {
    environmentShift: string
    bossReveal: string
    bossName: string
    bossTitle: string
    bossDescription: string
    introDialogue: string
  }
  phases: Array<{
    name: string
    transitionNarration: string
    newAbility: string
    bossDialogue: string
  }>
  deathSequence: {
    finalBlow: string
    deathThroes: string
    lastWords: string
    aftermath: string
  }
}

export interface DungeonCardResponse {
  name: string
  theme: string
  hook: string
  dangers: string[]
  rewards: string[]
  bossHint: string
  modifier?: {
    name: string
    effect: string
  }
}

export interface CompanionRecruitResponse {
  name: string
  species: string
  origin: string
  appearance: string
  personality: string[]
  quirk: string
  stats: {
    health: number
    attack: number
    defense: number
    speed: number
  }
  abilities: Array<{
    name: string
    description: string
    effectType: "damage" | "heal" | "buff" | "debuff" | "utility" | "special"
    target: "enemy" | "player" | "self" | "all_enemies" | "all_allies"
    power: number
    cooldown: number
    narration: string
  }>
  combatStyle: "aggressive" | "defensive" | "support" | "tactical" | "chaotic" | "passive"
  combatPriority: string
  fleeThreshold?: number
  bond: {
    startingLevel: number
    initialMood: string
    firstMemory: string
  }
  evolution?: {
    potential: string
    triggers: string[]
    evolvesInto?: string
  }
  battleCry?: string
  idleComment?: string
  flags: string[]
}

export interface CompanionActionResponse {
  actionType: "attack" | "ability" | "defend" | "special" | "betray" | "flee"
  abilityUsed?: string
  narration: string
  targetReaction?: string
  companionDialogue?: string
  bondChange?: {
    delta: number
    reason: string
  }
  moodShift?: string
}

export interface CompanionMomentResponse {
  trigger: string
  observation: string
  reaction: string
  dialogue?: string
  bondChange?: {
    delta: number
    reason: string
  }
}

// Build context from game state for AI
function buildContext(state: GameState, extras: Record<string, unknown> = {}) {
  const activeCompanions = state.player.party?.active || []

  // Serialize eventMemory for API (Map -> Object)
  const eventMemorySerialized = state.eventMemory
    ? {
        history: state.eventMemory.history,
        typeLastSeen: Object.fromEntries(state.eventMemory.typeLastSeen),
        combatStreak: state.eventMemory.combatStreak,
        roomsSinceReward: state.eventMemory.roomsSinceReward,
      }
    : null

  // Extract player capabilities for AI context
  const capabilities = extractPlayerCapabilities(state.player, { inCombat: state.inCombat })
  const playerCapabilities = buildCapabilityContextForAI(capabilities)

  return {
    playerLevel: state.player.stats.level,
    playerHealth: state.player.stats.health,
    maxHealth: state.player.stats.maxHealth,
    playerClass: state.player.className,
    playerInventory: state.player.inventory.map((i) => `${i.name} (${i.type})`).join(", ") || "basic gear",
    playerCapabilities,
    floor: state.floor,
    room: state.currentRoom,
    dungeonName: state.currentDungeon?.name,
    dungeonTheme: state.currentDungeon?.theme,
    dungeonRarity: state.currentDungeon?.rarity,
    biome: state.currentDungeon?.biome,
    dungeonModifiers: state.currentDungeon?.modifiers?.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
    })),
    mapMetadata: state.currentDungeon?.mapMetadata,
    playerWeapon: state.player.equipment.weapon?.name,
    playerArmor: state.player.equipment.armor?.name,
    companions: activeCompanions.map((c) => c.name).join(", ") || "none",
    companionName: activeCompanions[0]?.name,
    existingCompanions: activeCompanions.length + (state.player.party?.reserve.length || 0),
    turnCount: state.turnCount,
    eventMemory: eventMemorySerialized,
    ...extras,
  }
}

export interface UnknownItemUseResponse {
  narration: string
  effectType: "beneficial" | "harmful" | "mixed" | "neutral" | "transformative"
  skillCheck?: {
    required: boolean
    skill: SkillType
    difficulty: number
    successBonus?: string
    failurePenalty?: string
  }
  immediateEffects?: {
    healing?: number
    damage?: number
    damageType?: string
    statusEffect?: {
      name: string
      effectType: "buff" | "debuff"
      duration: number
      description: string
      modifiers?: Record<string, number>
    }
  }
  delayedEffects?: {
    turnsUntil: number
    narration: string
    effect: {
      name: string
      effectType: "buff" | "debuff"
      duration: number
      description: string
    }
  }
  permanentChanges?: {
    statChange?: { stat: string; change: number }
    abilityHint?: string
    transformDescription?: string
  }
  itemTransformation?: {
    name: string
    type: string
    rarity: string
    description: string
    lore: string
    useText?: string
    canReuse?: boolean
    stats?: Record<string, number>
  }
  sideEffects?: string[]
  companionReaction?: string
  worldReaction?: string
}

export interface GeneratedEffectResponse {
  name: string
  effectType: "buff" | "debuff" | "neutral"
  description: string
  category: EffectCategory
  durationType: DurationType
  durationValue: number
  condition?: string
  triggers: EffectTrigger[]
  stackBehavior: StackBehavior
  maxStacks: number
  stackModifier: number
  modifiers: {
    attack?: number
    defense?: number
    maxHealth?: number
    healthRegen?: number
    goldMultiplier?: number
    expMultiplier?: number
  }
  powerLevel: number
  rarity: "common" | "uncommon" | "rare" | "legendary"
  applyNarration?: string
  tickNarration?: string
  expireNarration?: string
  triggeredEffects?: Array<{
    trigger: EffectTrigger
    chance: number
    narrative?: string
    effectName?: string
  }>
  cleansable: boolean
  cleanseResistance?: number
  animation?: "pulse" | "shimmer" | "flicker" | "burn" | "freeze" | "poison" | "holy" | "dark"
  color?: string
}

export interface EffectGenerationContext {
  source: string
  sourceType?: "item" | "ability" | "enemy" | "environment" | "shrine" | "companion" | "curse"
  intendedType?: "buff" | "debuff" | "neutral"
  maxPowerLevel?: number
  allowedCategories?: EffectCategory[]
  maxDuration?: number
  maxStacks?: number
  allowPermanent?: boolean
  themeHints?: string
  situation?: string
}

export interface EffectComboNarrationResponse {
  comboName: string
  narration: string
  visualEffect: string
  soundEffect: string
  aftermath: string
}

export interface AmbientEffectNarrationResponse {
  introduction: string
  sensation: string
  warning?: string
  resistanceNarration?: string
}

export function useEventChain() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const generateEvent = useCallback(
    async (eventType: EventChainType, state: GameState, extras: Record<string, unknown> = {}): Promise<any | null> => {
      setIsGenerating(true)
      setLastError(null)

      try {
        const response = await fetch("/api/event-chain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType,
            context: buildContext(state, extras),
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          setLastError(error)
          debugLog("Event chain generation failed", { error }, { level: "error" })
          return null
        }

        const data = await response.json()
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        setLastError(message)
        debugLog("Event chain error", error, { level: "error" })
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [],
  )

  // Convenience methods for specific event types
  const generateRoomEvent = useCallback(
    (state: GameState, forceType?: RoomEventResponse["entityType"]) =>
      generateEvent("room_event", state, { forceType }),
    [generateEvent],
  )

  const generateCombatRound = useCallback(
    (
      state: GameState,
      combatContext: {
        enemyName: string
        playerDamage: number
        enemyHealth: number
        enemyMaxHealth: number
        enemyDamage?: number
        enemyAbilities?: string[]
        isCritical?: boolean
        isKillingBlow?: boolean
        enemyAttacks?: boolean
        roundNumber?: number
      },
    ) => generateEvent("combat_round", state, combatContext),
    [generateEvent],
  )

  const generateVictory = useCallback(
    (
      state: GameState,
      victoryContext: {
        enemyName: string
        roundsFought: number
        goldGain: number
        expGain: number
        lootName?: string
        lootRarity?: string
        lootType?: string
        leveledUp?: boolean
        wasClose?: boolean
      },
    ) => generateEvent("victory", state, victoryContext),
    [generateEvent],
  )

  const generateInteraction = useCallback(
    (
      state: GameState,
      interactionContext: {
        entityName: string
        entityType: string
        action: string
        success: boolean
        cost?: string
        damage?: number
        effectName?: string
      },
    ) => generateEvent("interaction", state, interactionContext),
    [generateEvent],
  )

  const generateBossEncounter = useCallback(
    (
      state: GameState,
      bossContext: {
        bossHealth: number
        bossAttack: number
        bossDef: number
      },
    ) => generateEvent("boss_encounter", state, bossContext),
    [generateEvent],
  )

  const generateDungeonCard = useCallback(
    (
      state: GameState,
      cardContext: {
        rarity: string
        floors: number
        isMystery?: boolean
        themeHints?: string
      },
    ) => generateEvent("dungeon_card", state, cardContext),
    [generateEvent],
  )

  const generateCompanionRecruit = useCallback(
    (
      state: GameState,
      recruitContext: {
        recruitMethod: "tame" | "rescue" | "summon" | "hatch" | "bind" | "purchase" | "befriend" | "awaken"
        sourceEntity?: { name: string; description?: string }
      },
    ): Promise<CompanionRecruitResponse | null> => generateEvent("companion_recruit", state, recruitContext),
    [generateEvent],
  )

  const generateCompanionAction = useCallback(
    (
      state: GameState,
      actionContext: {
        companionName: string
        companionSpecies: string
        personality: string[]
        combatStyle: string
        mood: string
        bondLevel: number
        bondTier: string
        actionType: string
        abilityName?: string
        abilityDescription?: string
        enemyName?: string
        companionHealth: number
        companionMaxHealth: number
      },
    ): Promise<CompanionActionResponse | null> => generateEvent("companion_action", state, actionContext),
    [generateEvent],
  )

  const generateCompanionMoment = useCallback(
    (
      state: GameState,
      momentContext: {
        companionName: string
        companionSpecies: string
        personality: string[]
        quirk: string
        mood: string
        bondLevel: number
        situation: string
        recentEvent?: string
        environment?: string
      },
    ): Promise<CompanionMomentResponse | null> => generateEvent("companion_moment", state, momentContext),
    [generateEvent],
  )

  const generateEnvironmentalInteraction = useCallback(
    (
      state: GameState,
      interactionContext: {
        entityName: string
        entityClass: string
        entityDescription?: string
        interactionAction: string
        interactionLabel: string
        dangerLevel: "safe" | "risky" | "dangerous"
        itemUsed?: string
      },
    ): Promise<EnvironmentalInteractionResult | null> =>
      generateEvent("environmental_interaction", state, interactionContext),
    [generateEvent],
  )

  const generateUnknownItemUse = useCallback(
    (
      state: GameState,
      itemContext: {
        itemName: string
        itemAppearance: string
        itemSource: string
        sensoryDetails?: string
        itemHints?: string
        useMethod: string
        target?: string
        situation?: string
      },
    ): Promise<UnknownItemUseResponse | null> =>
      generateEvent("unknown_item_use", state, {
        ...itemContext,
        activeEffects: state.player.activeEffects.map((e) => e.name).join(", ") || "none",
        companionPresent: (state.player.party?.active?.length || 0) > 0,
        companionName: state.player.party?.active?.[0]?.name,
      }),
    [generateEvent],
  )

  // AI-powered effect generation method
  const generateEffect = useCallback(
    (state: GameState, effectContext: EffectGenerationContext): Promise<GeneratedEffectResponse | null> =>
      generateEvent("generate_effect", state, effectContext as unknown as Record<string, unknown>),
    [generateEvent],
  )

  const generateComboNarration = useCallback(
    (
      state: GameState,
      comboContext: {
        effect1Name: string
        effect1Element: string
        effect2Name: string
        effect2Element: string
        comboName: string
        resultType: string
        damage?: number
        newEffectName?: string
      },
    ): Promise<EffectComboNarrationResponse | null> => generateEvent("effect_combo", state, comboContext),
    [generateEvent],
  )

  const generateAmbientNarration = useCallback(
    (
      state: GameState,
      ambientContext: {
        environmentType: string
        effectName: string
        effectDescription: string
        wasResisted?: boolean
        wasMitigated?: boolean
      },
    ): Promise<AmbientEffectNarrationResponse | null> => generateEvent("ambient_effect", state, ambientContext),
    [generateEvent],
  )

  return {
    isGenerating,
    lastError,
    generateEvent,
    generateRoomEvent,
    generateCombatRound,
    generateVictory,
    generateInteraction,
    generateBossEncounter,
    generateDungeonCard,
    generateCompanionRecruit,
    generateCompanionAction,
    generateCompanionMoment,
    generateEnvironmentalInteraction,
    generateUnknownItemUse,
    generateEffect,
    generateComboNarration,
    generateAmbientNarration,
  }
}
