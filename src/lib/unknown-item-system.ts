import type { UnknownItem, Item, EnvironmentalEntity, ItemRarity } from "./game-types"

// Generate unique ID
function genId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Create an unknown item from an environmental entity
export function createUnknownItem(
  entity: EnvironmentalEntity,
  collectionMethod: string,
  additionalContext?: string,
): UnknownItem {
  // Determine rarity based on entity class and tags
  let rarity: ItemRarity = "common"
  if (entity.interactionTags.includes("magical") || entity.entityClass === "magical") {
    rarity = "rare"
  } else if (entity.interactionTags.includes("dangerous")) {
    rarity = "uncommon"
  }
  if (entity.interactionTags.includes("ancient") || entity.interactionTags.includes("legendary")) {
    rarity = "legendary"
  }

  // Generate possible uses based on entity type
  const possibleUses = generatePossibleUses(entity)

  // Generate sensory hints
  const sensoryDetails = generateSensoryDetails(entity)

  // Generate AI hints based on entity
  const aiHints = generateHints(entity)

  return {
    id: genId(),
    name: entity.name,
    entityType: "item",
    type: "unknown",
    rarity,
    sourceEntity: entity.name,
    sourceContext: `Collected via ${collectionMethod}. ${additionalContext || entity.description}`,
    appearance: entity.description || `A mysterious ${entity.name}`,
    sensoryDetails,
    possibleUses,
    aiHints,
    value: rarity === "legendary" ? 100 : rarity === "rare" ? 50 : rarity === "uncommon" ? 20 : 5,
  }
}

function generatePossibleUses(entity: EnvironmentalEntity): string[] {
  const uses: string[] = []

  // Based on entity class
  switch (entity.entityClass) {
    case "substance":
      uses.push("drink", "apply to weapon", "pour out", "sell")
      if (entity.interactionTags.includes("collectible")) {
        uses.push("store for later")
      }
      break
    case "object":
      uses.push("examine closely", "break apart", "sell")
      if (entity.interactionTags.includes("readable")) {
        uses.push("read", "study")
      }
      if (entity.interactionTags.includes("consumable")) {
        uses.push("consume", "eat")
      }
      break
    case "magical":
      uses.push("attune", "absorb energy", "dispel", "sell")
      break
    case "creature":
      // Creature parts
      uses.push("consume raw", "cook", "use as reagent", "sell")
      break
    case "corpse":
      uses.push("search thoroughly", "harvest parts", "leave undisturbed")
      break
    default:
      uses.push("examine", "use", "discard", "sell")
  }

  return uses
}

function generateSensoryDetails(entity: EnvironmentalEntity): UnknownItem["sensoryDetails"] {
  const details: UnknownItem["sensoryDetails"] = {}

  // Generate based on tags and class
  if (entity.entityClass === "substance") {
    if (entity.interactionTags.includes("dangerous")) {
      details.smell = "acrid, burning scent"
      details.texture = "viscous and unnaturally cold"
    } else {
      details.smell = "faint, earthy aroma"
      details.texture = "smooth, slightly warm"
    }
  }

  if (entity.entityClass === "magical") {
    details.texture = "tingles against the skin"
    details.sound = "faint humming when held"
  }

  if (entity.interactionTags.includes("ancient")) {
    details.smell = "dust and forgotten ages"
    details.weight = "heavier than it appears"
  }

  return details
}

function generateHints(entity: EnvironmentalEntity): string[] {
  const hints: string[] = []

  if (entity.interactionTags.includes("dangerous")) {
    hints.push("Something about this feels... wrong.")
  }
  if (entity.interactionTags.includes("magical")) {
    hints.push("Faint magical residue clings to it.")
  }
  if (entity.interactionTags.includes("collectible")) {
    hints.push("Could be valuable to the right buyer.")
  }
  if (entity.entityClass === "substance") {
    hints.push("The color shifts slightly in different light.")
  }
  if (entity.interactionTags.includes("ancient")) {
    hints.push("This is very, very old.")
  }

  return hints
}

// Check if an item is an unknown item
export function isUnknownItem(item: Item | UnknownItem): item is UnknownItem {
  return item.type === "unknown"
}

// Convert unknown item to known item after AI determines effects
export function revealItem(unknown: UnknownItem, determinedProperties: Partial<Item>): Item {
  return {
    id: unknown.id,
    name: determinedProperties.name || unknown.name,
    entityType: "item",
    type: determinedProperties.type || "misc",
    rarity: determinedProperties.rarity || unknown.rarity,
    description: determinedProperties.description || unknown.appearance,
    lore: determinedProperties.lore || unknown.sourceContext,
    value: determinedProperties.value || unknown.value,
    stats: determinedProperties.stats,
    effects: determinedProperties.effects,
    damageType: determinedProperties.damageType,
    useText: determinedProperties.useText,
  }
}
