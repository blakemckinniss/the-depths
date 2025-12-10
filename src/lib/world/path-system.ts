import type { PathOption } from "@/lib/core/game-types"
import { generateId } from "@/lib/core/utils"
import { shouldSpawnVault, generateVault, type VaultInstance } from "@/lib/items/vault-system"

// Generate branching path options for the next room
export function generatePathOptions(floor: number, currentRoom: number, dungeonTheme?: string): PathOption[] {
  const numPaths = 2 + Math.floor(Math.random() * 2) // 2-3 paths
  const paths: PathOption[] = []

  // Ensure at least one "safer" option
  const guaranteedSafe = Math.random() < 0.7

  for (let i = 0; i < numPaths; i++) {
    const isSafeOption = i === 0 && guaranteedSafe
    paths.push(generateSinglePath(floor, currentRoom, isSafeOption, dungeonTheme))
  }

  // Check for vault spawn (small chance on one path)
  if (shouldSpawnVault(floor) && paths.length > 0) {
    // Replace a random path with a vault path
    const vaultIndex = Math.floor(Math.random() * paths.length)
    const vault = generateVault(floor)

    paths[vaultIndex] = {
      id: generateId(),
      preview: vault.definition.requiresKey
        ? `A sealed vault door etched with ancient runes...`
        : `${vault.definition.name} - ${vault.definition.description}`,
      danger: vault.definition.dangerLevel >= 4 ? "dangerous" : vault.definition.dangerLevel >= 3 ? "moderate" : "safe",
      reward: vault.definition.lootMultiplier >= 3 ? "rich" : "standard",
      roomType: "vault",
      environmentHint: vault.definition.uniqueMechanic || "A special chamber awaits...",
      vault,
    }
  }

  // Occasionally add a mystery path
  if (Math.random() < 0.2) {
    paths.push({
      id: generateId(),
      preview: "???",
      danger: "unknown",
      reward: "unknown",
      roomType: "mystery",
      environmentHint: "An impossible doorway shimmers before you...",
    })
  }

  return paths
}

function generateSinglePath(floor: number, room: number, forceSafe: boolean, theme?: string): PathOption {
  // Higher floors have more dangerous options
  const dangerRoll = forceSafe ? 0.8 : Math.random()
  let danger: PathOption["danger"]
  let reward: PathOption["reward"]
  let roomType: PathOption["roomType"]

  if (dangerRoll > 0.7) {
    danger = "safe"
    reward = "poor"
    roomType = Math.random() < 0.5 ? "treasure" : Math.random() < 0.5 ? "shrine" : "npc"
  } else if (dangerRoll > 0.4) {
    danger = "moderate"
    reward = "standard"
    roomType = Math.random() < 0.6 ? "enemy" : Math.random() < 0.5 ? "trap" : "treasure"
  } else if (dangerRoll > 0.15) {
    danger = "dangerous"
    reward = "rich"
    roomType = Math.random() < 0.7 ? "enemy" : "trap"
  } else {
    danger = "dangerous"
    reward = "rich"
    roomType = "boss"
  }

  // Generate preview hints
  const previews = generatePreviewHints(danger, roomType, theme)

  return {
    id: generateId(),
    preview: previews[Math.floor(Math.random() * previews.length)],
    danger,
    reward,
    roomType,
    environmentHint: generateEnvironmentHint(danger, theme),
  }
}

function generatePreviewHints(
  danger: PathOption["danger"],
  roomType: PathOption["roomType"],
  theme?: string,
): string[] {
  const hints: Record<string, string[]> = {
    enemy: [
      "Growling echoes from within...",
      "The stench of blood seeps through.",
      "Something moves in the darkness.",
      "Claws scrape against stone.",
      "A guttural voice chants ahead.",
    ],
    combat: [
      "Growling echoes from within...",
      "The stench of blood seeps through.",
      "Something moves in the darkness.",
      "Claws scrape against stone.",
      "A guttural voice chants ahead.",
    ],
    treasure: [
      "A faint golden gleam catches your eye.",
      "The air smells of old coins.",
      "Something glitters in the darkness.",
      "Ancient chests line the walls.",
      "Valuable relics seem to await.",
    ],
    trap: [
      "The floor seems... wrong.",
      "You notice scratches on the walls.",
      "A tripwire glints faintly.",
      "The corridor feels too quiet.",
      "Scorch marks line the passage.",
    ],
    shrine: [
      "Divine light flickers ahead.",
      "An altar stands in shadow.",
      "Incense smoke drifts toward you.",
      "You feel a presence watching.",
      "Candles burn without wax melting.",
    ],
    npc: [
      "You hear a voice calling out.",
      "Torchlight dances ahead.",
      "Someone... or something... waits.",
      "The sound of commerce echoes.",
      "A figure stands in the distance.",
    ],
    rest: [
      "The air feels calmer here.",
      "A gentle breeze carries the scent of moss.",
      "Soft light filters through cracks above.",
      "The stone here is worn smooth by travelers.",
      "A moment of peace seems possible.",
    ],
    boss: [
      "Immense power emanates from beyond.",
      "The very walls tremble with dread.",
      "A throne room awaits its challenger.",
      "Death itself seems to breathe here.",
      "This is no ordinary chamber.",
    ],
    mystery: ["???", "Reality bends here...", "The unknown beckons."],
  }

  return hints[roomType || "enemy"] || hints.enemy
}

function generateEnvironmentHint(danger: PathOption["danger"], theme?: string): string {
  const baseHints: Record<string, string[]> = {
    safe: ["The passage seems well-lit.", "A calm breeze flows through.", "The stones here are stable."],
    moderate: ["Shadows pool in the corners.", "The air grows thick.", "Moisture drips from above."],
    dangerous: ["The walls seem to close in.", "An oppressive aura hangs here.", "Your instincts scream danger."],
    unknown: ["Reality itself seems uncertain.", "The laws of nature bend here.", "You cannot trust your senses."],
  }

  const hints = baseHints[danger] || baseHints.moderate
  return hints[Math.floor(Math.random() * hints.length)]
}

// Calculate rewards based on path choice and danger
export function getPathRewardMultiplier(path: PathOption): number {
  switch (path.reward) {
    case "rich":
      return 1.5
    case "standard":
      return 1.0
    case "poor":
      return 0.6
    case "unknown":
      return Math.random() < 0.3 ? 2.0 : 0.8
    default:
      return 1.0
  }
}

// Check if a path leads to a boss (for floor completion)
export function isPathBoss(path: PathOption): boolean {
  return path.roomType === "boss"
}
