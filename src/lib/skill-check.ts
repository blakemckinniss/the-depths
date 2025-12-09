import type { Player, SkillType, SkillCheck } from "./game-types"

// Calculate modifier from player stats and class
export function getSkillModifier(player: Player, skill: SkillType): number {
  const { stats } = player
  let base = 0

  // Base stat mappings
  switch (skill) {
    case "strength":
      base = Math.floor((stats.strength - 10) / 2)
      break
    case "dexterity":
      base = Math.floor((stats.dexterity - 10) / 2)
      break
    case "intelligence":
      base = Math.floor((stats.intelligence - 10) / 2)
      break
    case "wisdom":
    case "perception":
    case "survival":
    case "medicine":
      base = Math.floor((stats.intelligence - 10) / 2) // Use int as wisdom proxy
      break
    case "charisma":
      base = Math.floor(stats.level / 3) // Level-based charisma
      break
    case "stealth":
      base = Math.floor((stats.dexterity - 10) / 2)
      break
    case "arcana":
      base = Math.floor((stats.intelligence - 10) / 2)
      break
  }

  // Class bonuses
  if (player.class) {
    switch (player.class) {
      case "rogue":
        if (skill === "stealth" || skill === "dexterity") base += 3
        if (skill === "perception") base += 2
        break
      case "mage":
      case "warlock":
      case "necromancer":
        if (skill === "arcana" || skill === "intelligence") base += 3
        break
      case "cleric":
      case "paladin":
        if (skill === "wisdom" || skill === "medicine") base += 3
        break
      case "ranger":
        if (skill === "survival" || skill === "perception") base += 3
        if (skill === "stealth") base += 2
        break
      case "barbarian":
      case "warrior":
        if (skill === "strength") base += 3
        break
      case "monk":
        if (skill === "wisdom" || skill === "dexterity") base += 2
        break
    }
  }

  // Level scaling
  base += Math.floor(stats.level / 4)

  return base
}

// Roll a d20 and determine result
export function rollSkillCheck(player: Player, skill: SkillType, difficulty: number): SkillCheck {
  const modifier = getSkillModifier(player, skill)
  const roll = Math.floor(Math.random() * 20) + 1
  const total = roll + modifier

  let result: SkillCheck["result"]
  if (roll === 20) {
    result = "critical_success"
  } else if (roll === 1) {
    result = "critical_failure"
  } else if (total >= difficulty) {
    result = "success"
  } else {
    result = "failure"
  }

  return {
    skill,
    difficulty,
    modifier,
    roll,
    result,
  }
}

// Get difficulty description
export function getDifficultyLabel(dc: number): string {
  if (dc <= 5) return "Trivial"
  if (dc <= 10) return "Easy"
  if (dc <= 15) return "Moderate"
  if (dc <= 20) return "Hard"
  if (dc <= 25) return "Very Hard"
  return "Nearly Impossible"
}

// Format skill check for display
export function formatSkillCheck(check: SkillCheck): string {
  const modStr = check.modifier >= 0 ? `+${check.modifier}` : `${check.modifier}`
  const total = (check.roll || 0) + check.modifier

  switch (check.result) {
    case "critical_success":
      return `Natural 20! (${check.roll}${modStr} = ${total} vs DC ${check.difficulty})`
    case "critical_failure":
      return `Critical failure! (${check.roll}${modStr} = ${total} vs DC ${check.difficulty})`
    case "success":
      return `Success! (${check.roll}${modStr} = ${total} vs DC ${check.difficulty})`
    case "failure":
      return `Failed. (${check.roll}${modStr} = ${total} vs DC ${check.difficulty})`
    default:
      return `DC ${check.difficulty} ${getDifficultyLabel(check.difficulty)}`
  }
}
