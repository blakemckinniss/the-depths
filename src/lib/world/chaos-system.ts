import type { DungeonMood, WorldStateContext } from "./world-state"
import type { Item, PlayerClass } from "@/lib/core/game-types"

export interface ChaosEvent {
  id: string
  name: string
  type: ChaosEventType
  severity: "minor" | "moderate" | "major" | "catastrophic"
  triggerConditions: ChaosTrigger[]
  duration: number // turns, -1 for permanent until resolved
  turnsActive: number
  effects: ChaosEffect[]
  resolution?: ChaosResolution
  narrative: ChaosNarrative
  chainEvents?: string[] // IDs of events this can trigger
}

export type ChaosEventType =
  | "environmental" // cave-in, flood, fire spread
  | "invasion" // monster migration, raid
  | "magical" // surge, rift, wild magic
  | "factional" // war, uprising, alliance
  | "cosmic" // eclipse, blood moon, planar bleed
  | "personal" // nemesis, stalker, curse manifest

export interface ChaosTrigger {
  type:
    | "turn_count" // every X turns
    | "kill_threshold" // killed X enemies
    | "floor_reached" // reached floor X
    | "mood_threshold" // dungeon mood above X
    | "faction_event" // faction state change
    | "player_action" // specific action taken
    | "random" // pure chance
    | "cascade" // triggered by another chaos event
  value: number | string
  probability: number // 0-1
}

export interface ChaosEffect {
  type: ChaosEffectType
  target: "player" | "enemies" | "room" | "floor" | "dungeon"
  value: number | string
  duration: number
  narration: string
}

export type ChaosEffectType =
  | "stat_modifier" // affects stats
  | "spawn_enemies" // adds enemies
  | "environmental_hazard" // creates hazard
  | "resource_drain" // drains gold/items
  | "faction_shift" // changes faction relations
  | "escape_route" // affects flee chance
  | "visibility" // affects perception
  | "mutation" // transforms entities
  | "temporal" // affects turn order/cooldowns
  | "planar" // weird dimensional effects

export interface ChaosResolution {
  type: "timed" | "kill_target" | "reach_location" | "use_item" | "player_death" | "natural"
  target?: string
  reward?: ChaosReward
}

export interface ChaosReward {
  experience?: number
  gold?: number
  item?: Partial<Item>
  title?: string
  factionBonus?: { factionId: string; amount: number }
  narrativeOutcome: string
}

export interface ChaosNarrative {
  announcement: string // When event starts
  ongoing: string[] // Periodic reminders
  escalation?: string[] // If event intensifies
  resolution: string // When event ends
  playerReaction?: { [key: string]: string } // Class-specific reactions
}

// Chaos event templates
export const CHAOS_EVENTS: Omit<ChaosEvent, "id" | "turnsActive">[] = [
  // Environmental Events
  {
    name: "Tunnel Collapse",
    type: "environmental",
    severity: "moderate",
    triggerConditions: [
      { type: "random", value: 0, probability: 0.03 },
      { type: "mood_threshold", value: 70, probability: 0.1 },
    ],
    duration: 5,
    effects: [
      {
        type: "escape_route",
        target: "room",
        value: "blocked",
        duration: 3,
        narration: "Rubble blocks the way you came.",
      },
      {
        type: "spawn_enemies",
        target: "floor",
        value: "cave_dweller",
        duration: 1,
        narration: "The noise attracts creatures from the depths.",
      },
    ],
    resolution: { type: "timed", reward: { narrativeOutcome: "The dust settles. You find a new path forward." } },
    narrative: {
      announcement: "The earth groans. CRACK! The ceiling gives way behind you!",
      ongoing: ["Dust continues to fall. The structure is unstable.", "You hear shifting stone in the distance."],
      resolution: "The tremors subside. The dungeon grows quiet once more.",
    },
  },
  {
    name: "Rising Waters",
    type: "environmental",
    severity: "major",
    triggerConditions: [
      { type: "random", value: 0, probability: 0.02 },
      { type: "floor_reached", value: 3, probability: 0.05 },
    ],
    duration: 10,
    effects: [
      {
        type: "environmental_hazard",
        target: "floor",
        value: "flooding",
        duration: 10,
        narration: "Cold water rises to your ankles... then your knees.",
      },
      { type: "stat_modifier", target: "player", value: -2, duration: 10, narration: "Movement becomes difficult." },
      {
        type: "escape_route",
        target: "dungeon",
        value: "urgent",
        duration: 10,
        narration: "You must find higher ground or drown.",
      },
    ],
    resolution: {
      type: "reach_location",
      target: "stairs",
      reward: { experience: 50, narrativeOutcome: "You escape the flood. For now." },
    },
    narrative: {
      announcement: "A distant BOOM. Then rushing water. The dungeon is flooding!",
      ongoing: [
        "The water rises faster now.",
        "You see debris floating past - remnants of less fortunate explorers.",
        "The current grows stronger. Swimming will soon be necessary.",
      ],
      escalation: ["The water reaches your chest. Time is running out.", "You can barely keep your head above water!"],
      resolution: "You reach dry ground, gasping. Below, the waters claim the depths.",
      playerReaction: {
        mage: "Your fire magic sputters uselessly against the endless water.",
        barbarian: "You fight the current with raw strength, but even you tire.",
        rogue: "You spot handholds along the wall and begin climbing.",
      },
    },
  },
  {
    name: "Spreading Fire",
    type: "environmental",
    severity: "moderate",
    triggerConditions: [
      { type: "player_action", value: "fire_spell", probability: 0.15 },
      { type: "cascade", value: "oil_spill", probability: 0.8 },
    ],
    duration: 8,
    effects: [
      {
        type: "environmental_hazard",
        target: "room",
        value: "fire",
        duration: 8,
        narration: "Flames lick the walls and spread across the floor.",
      },
      { type: "stat_modifier", target: "enemies", value: -10, duration: 8, narration: "Enemies panic in the flames." },
    ],
    resolution: { type: "timed", reward: { narrativeOutcome: "The fire burns itself out, leaving only ash." } },
    narrative: {
      announcement: "Flames erupt! The fire spreads with hungry speed!",
      ongoing: [
        "The heat is oppressive. Smoke stings your eyes.",
        "Wooden supports crackle and groan.",
        "The fire reaches something... there's a small explosion.",
      ],
      resolution: "The flames die down. Charred remains mark where the fire raged.",
    },
  },

  // Invasion Events
  {
    name: "Monster Migration",
    type: "invasion",
    severity: "major",
    triggerConditions: [
      { type: "turn_count", value: 50, probability: 0.1 },
      { type: "mood_threshold", value: 80, probability: 0.2 },
    ],
    duration: 15,
    effects: [
      {
        type: "spawn_enemies",
        target: "floor",
        value: "pack",
        duration: 15,
        narration: "A swarm of creatures pours through the corridors.",
      },
      {
        type: "faction_shift",
        target: "dungeon",
        value: "hostile",
        duration: 15,
        narration: "The native creatures are displaced, made desperate and aggressive.",
      },
    ],
    resolution: {
      type: "kill_target",
      target: "alpha",
      reward: { experience: 100, gold: 50, title: "Migration Survivor", narrativeOutcome: "The horde passes." },
    },
    narrative: {
      announcement:
        "The ground trembles. Not from magic, but from countless feet. Something is coming. Many somethings.",
      ongoing: [
        "You hear them in the walls. Skittering. Hungry.",
        "A scout creature spots you and shrieks - alerting the swarm.",
        "They're everywhere. Running is no longer an option.",
      ],
      resolution: "The alpha falls. Without leadership, the swarm scatters into the darkness.",
    },
  },
  {
    name: "Faction War",
    type: "factional",
    severity: "major",
    triggerConditions: [{ type: "faction_event", value: "at_war", probability: 0.3 }],
    duration: 20,
    effects: [
      { type: "spawn_enemies", target: "floor", value: "warband", duration: 20, narration: "War parties clash." },
      {
        type: "faction_shift",
        target: "dungeon",
        value: "chaos",
        duration: 20,
        narration: "Old alliances mean nothing. Everyone fights everyone.",
      },
    ],
    resolution: {
      type: "timed",
      reward: {
        experience: 150,
        title: "War Profiteer",
        narrativeOutcome: "One side retreats. The victor claims these halls.",
      },
    },
    narrative: {
      announcement: "War cries echo through the stone! Two factions have brought their conflict here!",
      ongoing: [
        "Bodies litter the corridors - from both sides.",
        "A dying warrior gasps out a plea... or a curse.",
        "The fighting intensifies. Neither side will retreat.",
      ],
      resolution: "Silence falls. The victors gather their dead. The losers are already gone.",
    },
  },

  // Magical Events
  {
    name: "Wild Magic Surge",
    type: "magical",
    severity: "moderate",
    triggerConditions: [
      { type: "player_action", value: "spell_cast", probability: 0.05 },
      { type: "mood_threshold", value: 60, probability: 0.08 },
    ],
    duration: 3,
    effects: [
      {
        type: "mutation",
        target: "room",
        value: "random",
        duration: 3,
        narration: "Reality warps. Things are... different.",
      },
      {
        type: "temporal",
        target: "player",
        value: "random_cooldowns",
        duration: 3,
        narration: "Time flows strangely.",
      },
    ],
    resolution: { type: "timed", reward: { narrativeOutcome: "The magical chaos subsides." } },
    narrative: {
      announcement: "The air CRACKLES! Wild magic erupts from nowhere!",
      ongoing: [
        "Colors shift. Up feels like down.",
        "Your reflection in a puddle winks at you.",
        "A nearby torch burns cold and black.",
      ],
      resolution: "Reality snaps back into place, leaving only fading afterimages.",
      playerReaction: {
        mage: "You struggle to control your own magic in the chaos.",
        warlock: "Your patron's voice laughs at the disorder.",
        cleric: "You pray for stability. Your god seems... amused.",
      },
    },
  },
  {
    name: "Planar Rift",
    type: "cosmic",
    severity: "catastrophic",
    triggerConditions: [
      { type: "random", value: 0, probability: 0.01 },
      { type: "floor_reached", value: 5, probability: 0.05 },
    ],
    duration: -1, // Until resolved
    effects: [
      {
        type: "planar",
        target: "room",
        value: "rift",
        duration: -1,
        narration: "A tear in reality bleeds otherworldly energy.",
      },
      {
        type: "spawn_enemies",
        target: "room",
        value: "void_creature",
        duration: -1,
        narration: "Things from beyond pour through.",
      },
      {
        type: "environmental_hazard",
        target: "room",
        value: "void",
        duration: -1,
        narration: "Standing near the rift drains your very essence.",
      },
    ],
    resolution: {
      type: "kill_target",
      target: "rift_anchor",
      reward: {
        experience: 200,
        item: { name: "Void Shard", rarity: "legendary" },
        title: "Rift Closer",
        narrativeOutcome: "The rift screams as it collapses. Reality mends.",
      },
    },
    narrative: {
      announcement: "Reality TEARS. A wound in existence opens before you, bleeding impossible colors.",
      ongoing: [
        "The rift pulses. Something on the other side notices you.",
        "Gravity fails near the rift. Objects float toward oblivion.",
        "You hear whispers in a language that predates language.",
      ],
      escalation: ["The rift grows. More things emerge.", "The walls themselves begin to dissolve into the void."],
      resolution: "The anchor shatters. The rift implodes with a sound like breaking glass and screaming stars.",
    },
  },

  // Cosmic Events
  {
    name: "Blood Moon Rising",
    type: "cosmic",
    severity: "major",
    triggerConditions: [{ type: "turn_count", value: 100, probability: 0.15 }],
    duration: 25,
    effects: [
      {
        type: "stat_modifier",
        target: "enemies",
        value: 25,
        duration: 25,
        narration: "Enemies grow stronger, more savage.",
      },
      {
        type: "mutation",
        target: "enemies",
        value: "frenzy",
        duration: 25,
        narration: "Red light gleams in their eyes.",
      },
      { type: "spawn_enemies", target: "dungeon", value: "werewolf", duration: 25, narration: "The afflicted emerge." },
    ],
    resolution: {
      type: "timed",
      reward: {
        experience: 100,
        title: "Blood Moon Survivor",
        narrativeOutcome: "The moon sets. The curse lifts. The survivors remember.",
      },
    },
    narrative: {
      announcement: "Even in the depths, you feel it. The Blood Moon has risen. Everything changes.",
      ongoing: [
        "Creatures that feared you now bare their fangs.",
        "You hear howling from somewhere... everywhere.",
        "The walls seem to bleed in the crimson light filtering through cracks.",
      ],
      resolution: "Dawn breaks somewhere above. The Blood Moon's influence fades like a nightmare.",
      playerReaction: {
        cleric: "Your holy symbols glow with protective light.",
        warlock: "Your patron revels in the chaos. You feel... stronger.",
        ranger: "Your beast companions grow restless, fighting their instincts.",
      },
    },
  },

  // Personal Events
  {
    name: "The Stalker",
    type: "personal",
    severity: "moderate",
    triggerConditions: [
      { type: "kill_threshold", value: 10, probability: 0.1 },
      { type: "floor_reached", value: 2, probability: 0.05 },
    ],
    duration: -1,
    effects: [
      {
        type: "spawn_enemies",
        target: "player",
        value: "stalker",
        duration: -1,
        narration: "Something has marked you. It follows.",
      },
      {
        type: "visibility",
        target: "player",
        value: "hunted",
        duration: -1,
        narration: "You can never quite see it. But you feel it watching.",
      },
    ],
    resolution: {
      type: "kill_target",
      target: "stalker",
      reward: {
        experience: 75,
        item: { name: "Stalker's Eye", rarity: "rare" },
        narrativeOutcome: "The hunter becomes the hunted. Then the dead.",
      },
    },
    narrative: {
      announcement: "You feel eyes on your back. Something has taken interest in you. Something patient.",
      ongoing: [
        "Shadows move when you're not looking.",
        "You find tracks behind you. They weren't there before.",
        "A sound behind you. Nothing there. It's always nothing there.",
      ],
      escalation: ["It's getting closer. You can smell it now.", "You glimpse it at last. You wish you hadn't."],
      resolution: "It dies with a sound like surprised laughter. Finally, silence.",
    },
  },
  {
    name: "Nemesis Returns",
    type: "personal",
    severity: "major",
    triggerConditions: [{ type: "cascade", value: "enemy_escaped", probability: 0.5 }],
    duration: -1,
    effects: [
      {
        type: "spawn_enemies",
        target: "floor",
        value: "nemesis",
        duration: -1,
        narration: "A familiar face. Scarred by your last encounter. Stronger now.",
      },
    ],
    resolution: {
      type: "kill_target",
      target: "nemesis",
      reward: {
        experience: 150,
        title: "Nemesis Slayer",
        narrativeOutcome: "This time, it stays dead.",
      },
    },
    narrative: {
      announcement: '"You." The voice is wrong - damaged. But you remember it. "I remember you too."',
      ongoing: [
        "It's been preparing. Training. Waiting for this moment.",
        "It knows your tactics now. It's adapted.",
        "There's something different about it. Something... evolved.",
      ],
      resolution: "It falls, and this time you make sure. No more returns.",
    },
  },
]

// Chaos Event Manager
export class ChaosEventManager {
  private activeEvents: ChaosEvent[] = []
  private eventHistory: string[] = []
  private cascadeQueue: string[] = []

  checkTriggers(context: ChaosCheckContext): ChaosEvent[] {
    const triggered: ChaosEvent[] = []

    for (const template of CHAOS_EVENTS) {
      // Skip if already active
      if (this.activeEvents.some((e) => e.name === template.name)) continue

      // Check each trigger condition
      for (const trigger of template.triggerConditions) {
        if (this.evaluateTrigger(trigger, context)) {
          const event = this.createEvent(template)
          triggered.push(event)
          this.activeEvents.push(event)
          break
        }
      }
    }

    return triggered
  }

  private evaluateTrigger(trigger: ChaosTrigger, context: ChaosCheckContext): boolean {
    if (Math.random() > trigger.probability) return false

    switch (trigger.type) {
      case "turn_count":
        return context.turnCount % (trigger.value as number) === 0
      case "kill_threshold":
        return context.totalKills >= (trigger.value as number)
      case "floor_reached":
        return context.currentFloor >= (trigger.value as number)
      case "mood_threshold":
        return (context.dungeonMood?.hostility ?? 0) >= (trigger.value as number)
      case "player_action":
        return context.lastAction === trigger.value
      case "cascade":
        return this.cascadeQueue.includes(trigger.value as string)
      case "random":
        return true // probability already checked
      default:
        return false
    }
  }

  private createEvent(template: Omit<ChaosEvent, "id" | "turnsActive">): ChaosEvent {
    return {
      ...template,
      id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      turnsActive: 0,
    }
  }

  processTurn(): ChaosEventUpdate {
    const updates: ChaosEventUpdate = {
      newEvents: [],
      escalations: [],
      resolutions: [],
      effects: [],
    }

    // Clear cascade queue
    this.cascadeQueue = []

    // Process active events
    this.activeEvents = this.activeEvents.filter((event) => {
      event.turnsActive++

      // Check for escalation
      if (event.narrative.escalation && event.turnsActive % 5 === 0) {
        const escIndex = Math.min(Math.floor(event.turnsActive / 5) - 1, event.narrative.escalation.length - 1)
        if (escIndex >= 0) {
          updates.escalations.push({
            event,
            message: event.narrative.escalation[escIndex],
          })
        }
      }

      // Check for natural resolution
      if (event.duration > 0 && event.turnsActive >= event.duration) {
        updates.resolutions.push(event)
        this.eventHistory.push(event.id)

        // Queue cascade events
        if (event.chainEvents) {
          this.cascadeQueue.push(...event.chainEvents)
        }

        return false
      }

      // Collect ongoing effects
      updates.effects.push(...event.effects.map((e) => ({ event, effect: e })))

      return true
    })

    return updates
  }

  resolveEvent(eventId: string, success: boolean): ChaosEvent | undefined {
    const index = this.activeEvents.findIndex((e) => e.id === eventId)
    if (index === -1) return undefined

    const event = this.activeEvents.splice(index, 1)[0]
    this.eventHistory.push(event.id)

    if (success && event.chainEvents) {
      this.cascadeQueue.push(...event.chainEvents)
    }

    return event
  }

  getActiveEvents(): ChaosEvent[] {
    return this.activeEvents
  }

  getOngoingNarrative(): string[] {
    return this.activeEvents.flatMap((e) => {
      const index = Math.min(e.turnsActive, e.narrative.ongoing.length - 1)
      return e.narrative.ongoing[index] ? [e.narrative.ongoing[index]] : []
    })
  }
}

export interface ChaosCheckContext {
  turnCount: number
  totalKills: number
  currentFloor: number
  dungeonMood: DungeonMood | null
  lastAction?: string
  factionStates: Map<string, string>
  playerClass?: PlayerClass
}

export interface ChaosEventUpdate {
  newEvents: ChaosEvent[]
  escalations: { event: ChaosEvent; message: string }[]
  resolutions: ChaosEvent[]
  effects: { event: ChaosEvent; effect: ChaosEffect }[]
}

// Generate AI-enhanced chaos narrative
export function getChaosPromptContext(
  event: ChaosEvent,
  worldContext: WorldStateContext,
  playerClass?: string,
): string {
  const classReaction =
    playerClass && event.narrative.playerReaction?.[playerClass]
      ? `\nClass-specific reaction: ${event.narrative.playerReaction[playerClass]}`
      : ""

  const recentMemories = worldContext.recentMemories
    .map((m) => `- ${m.content.action}: ${m.content.outcome}`)
    .join("\n")

  return `
CHAOS EVENT: ${event.name} (${event.severity})
Type: ${event.type}
Turns Active: ${event.turnsActive}
${classReaction}

Recent player history:
${recentMemories}

Player reputation: ${worldContext.reputation.titles.join(", ") || "Unknown"}
Faction standings: ${worldContext.factionStandings.map((f) => `${f.name}: ${f.disposition}`).join(", ")}

Generate contextual narration for this chaos event that references the player's history and reputation.
`
}
