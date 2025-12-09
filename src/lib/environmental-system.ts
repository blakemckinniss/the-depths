import type {
  EntityType,
  EnvironmentalEntity,
  EnvironmentalInteraction,
  ParsedNarrative,
  NarrativeSegment,
  Player,
} from "./game-types"

// Generate a unique ID
function genId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Interaction templates based on entity class and tags
const INTERACTION_TEMPLATES: Record<string, EnvironmentalInteraction[]> = {
  // Collectible substances
  "substance:collectible": [
    {
      id: "collect",
      action: "collect",
      label: "Collect",
      requiresItem: ["container", "vial", "waterskin", "flask", "bottle", "jar"],
      dangerLevel: "safe",
      hint: "Store in a container",
    },
    {
      id: "taste",
      action: "taste",
      label: "Taste",
      dangerLevel: "risky",
      hint: "Might be unwise...",
    },
  ],
  // Dangerous substances
  "substance:dangerous": [
    {
      id: "avoid",
      action: "examine",
      label: "Keep distance",
      dangerLevel: "safe",
    },
    {
      id: "collect_careful",
      action: "collect",
      label: "Carefully collect",
      requiresItem: ["container", "vial", "flask"],
      dangerLevel: "risky",
      hint: "Handle with care",
    },
  ],
  // Containers
  "container:lootable": [
    {
      id: "open",
      action: "loot",
      label: "Open",
      dangerLevel: "risky",
      hint: "Could be trapped",
    },
    {
      id: "examine_first",
      action: "examine",
      label: "Inspect carefully",
      dangerLevel: "safe",
    },
    {
      id: "smash",
      action: "break",
      label: "Smash open",
      dangerLevel: "risky",
      hint: "Quick but loud",
    },
  ],
  // Mechanisms
  "mechanism:interactive": [
    {
      id: "activate",
      action: "touch",
      label: "Activate",
      dangerLevel: "risky",
    },
    {
      id: "examine_mech",
      action: "examine",
      label: "Study mechanism",
      dangerLevel: "safe",
    },
    {
      id: "disable",
      action: "break",
      label: "Disable",
      requiresAbility: ["tinker", "sabotage", "mechanical"],
      dangerLevel: "risky",
    },
  ],
  // Magical entities
  "magical:interactive": [
    {
      id: "attune",
      action: "touch",
      label: "Attune",
      requiresClass: ["mage", "warlock", "necromancer", "cleric"],
      dangerLevel: "risky",
      hint: "Channel your power",
    },
    {
      id: "dispel",
      action: "use_ability",
      label: "Dispel",
      requiresAbility: ["dispel", "holy", "arcane"],
      dangerLevel: "safe",
    },
    {
      id: "absorb",
      action: "touch",
      label: "Absorb energy",
      dangerLevel: "dangerous",
      hint: "Power at a cost",
    },
  ],
  // Corpses
  "corpse:lootable": [
    {
      id: "search",
      action: "loot",
      label: "Search body",
      dangerLevel: "safe",
    },
    {
      id: "reanimate",
      action: "use_ability",
      label: "Reanimate",
      requiresClass: ["necromancer"],
      dangerLevel: "risky",
      hint: "Bind to your will",
    },
    {
      id: "bury",
      action: "touch",
      label: "Give rest",
      requiresClass: ["cleric", "paladin"],
      dangerLevel: "safe",
      hint: "Earn blessing",
    },
  ],
  // Readable objects
  "object:readable": [
    {
      id: "read",
      action: "examine",
      label: "Read",
      dangerLevel: "safe",
    },
    {
      id: "take",
      action: "collect",
      label: "Take",
      dangerLevel: "safe",
    },
  ],
  // Breakable objects
  "object:breakable": [
    {
      id: "break",
      action: "break",
      label: "Smash",
      dangerLevel: "risky",
      hint: "Might contain something",
    },
    {
      id: "examine_obj",
      action: "examine",
      label: "Examine",
      dangerLevel: "safe",
    },
  ],
  // Consumable items in environment
  "object:consumable": [
    {
      id: "consume",
      action: "consume",
      label: "Consume",
      dangerLevel: "risky",
      hint: "Risk vs reward",
    },
    {
      id: "collect_consumable",
      action: "collect",
      label: "Pocket for later",
      dangerLevel: "safe",
    },
  ],
  // Creatures (non-hostile)
  "creature:tameable": [
    {
      id: "tame",
      action: "tame",
      label: "Attempt to tame",
      requiresClass: ["ranger"],
      dangerLevel: "risky",
    },
    {
      id: "feed",
      action: "use_item",
      label: "Offer food",
      requiresItem: ["food", "meat", "rations"],
      consumesItem: true,
      dangerLevel: "safe",
      hint: "Build trust",
    },
    {
      id: "approach",
      action: "touch",
      label: "Approach slowly",
      dangerLevel: "risky",
    },
  ],
  // Default fallback
  default: [
    {
      id: "examine_default",
      action: "examine",
      label: "Examine",
      dangerLevel: "safe",
    },
  ],
}

// Determine interactions based on entity class and tags
export function getInteractionsForEntity(entity: EnvironmentalEntity): EnvironmentalInteraction[] {
  const interactions: EnvironmentalInteraction[] = []
  const seenActions = new Set<string>()

  // Check each tag combination
  for (const tag of entity.interactionTags) {
    const key = `${entity.entityClass}:${tag}`
    const templates = INTERACTION_TEMPLATES[key]
    if (templates) {
      for (const t of templates) {
        if (!seenActions.has(t.action)) {
          interactions.push({ ...t, id: `${entity.id}_${t.id}` })
          seenActions.add(t.action)
        }
      }
    }
  }

  // Add default examine if nothing else
  if (interactions.length === 0) {
    interactions.push({
      id: `${entity.id}_examine`,
      action: "examine",
      label: "Examine",
      dangerLevel: "safe",
    })
  }

  return interactions
}

// Filter interactions based on player capabilities
export function getAvailableInteractions(
  entity: EnvironmentalEntity,
  player: Player,
): { interaction: EnvironmentalInteraction; available: boolean; reason?: string }[] {
  const results: { interaction: EnvironmentalInteraction; available: boolean; reason?: string }[] = []

  for (const interaction of entity.possibleInteractions) {
    let available = true
    let reason: string | undefined

    // Check item requirements
    if (interaction.requiresItem && interaction.requiresItem.length > 0) {
      const hasItem = player.inventory.some((item) =>
        interaction.requiresItem!.some(
          (req) =>
            item.name.toLowerCase().includes(req.toLowerCase()) ||
            item.type.toLowerCase().includes(req.toLowerCase()) ||
            (item.description?.toLowerCase().includes(req.toLowerCase()) ?? false),
        ),
      )
      if (!hasItem) {
        available = false
        reason = `Requires: ${interaction.requiresItem.join(" or ")}`
      }
    }

    // Check ability requirements
    if (interaction.requiresAbility && interaction.requiresAbility.length > 0) {
      const hasAbility = player.abilities.some((ability) =>
        interaction.requiresAbility!.some(
          (req) =>
            ability.name.toLowerCase().includes(req.toLowerCase()) ||
            ability.tags.some((tag) => tag.toLowerCase().includes(req.toLowerCase())),
        ),
      )
      if (!hasAbility) {
        available = false
        reason = `Requires ability: ${interaction.requiresAbility.join(" or ")}`
      }
    }

    // Check class requirements
    if (interaction.requiresClass && interaction.requiresClass.length > 0) {
      if (!player.class || !interaction.requiresClass.includes(player.class)) {
        available = false
        reason = `Requires class: ${interaction.requiresClass.join(" or ")}`
      }
    }

    results.push({ interaction, available, reason })
  }

  return results
}

// Parse AI narrative and extract entity markers
// Format: {entity:name:class:tag1,tag2}
export function parseNarrativeWithEntities(text: string): ParsedNarrative {
  const segments: NarrativeSegment[] = []
  const entities: EnvironmentalEntity[] = []

  // Match {entity:name:class:tags} pattern
  const entityPattern = /\{entity:([^:}]+):([^:}]+):([^}]*)\}/g
  let lastIndex = 0
  let match

  while ((match = entityPattern.exec(text)) !== null) {
    // Add text before entity
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      })
    }

    const [, name, entityClass, tagsStr] = match
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const entityId = genId()

    // Create entity
    const entity: EnvironmentalEntity = {
      id: entityId,
      name: name.trim(),
      description: "", // Will be filled by AI or context
      entityClass: entityClass.trim() as EnvironmentalEntity["entityClass"],
      interactionTags: tags.length > 0 ? tags : ["interactive"],
      possibleInteractions: [],
      consumed: false,
      revealed: true,
    }
    entity.possibleInteractions = getInteractionsForEntity(entity)
    entities.push(entity)

    // Add entity segment
    segments.push({
      type: "entity",
      content: name.trim(),
      entityRef: entityId,
      entityType: "environmental",
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    })
  }

  // If no entities found, return plain text
  if (segments.length === 0) {
    segments.push({ type: "text", content: text })
  }

  return { segments, entities }
}

// Convert entity class to display style
export function getEntityDisplayType(entityClass: EnvironmentalEntity["entityClass"]): EntityType {
  switch (entityClass) {
    case "substance":
      return "potion"
    case "container":
      return "item"
    case "mechanism":
      return "trap"
    case "magical":
      return "shrine"
    case "corpse":
      return "enemy"
    case "creature":
      return "companion"
    case "object":
    default:
      return "item"
  }
}

// Get danger color
export function getDangerColor(danger: EnvironmentalInteraction["dangerLevel"]): string {
  switch (danger) {
    case "safe":
      return "text-emerald-400"
    case "risky":
      return "text-amber-400"
    case "dangerous":
      return "text-red-400"
    default:
      return "text-muted-foreground"
  }
}
