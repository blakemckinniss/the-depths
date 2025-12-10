import type { Player, Enemy, CombatStance, DamageType, EnemyAbility, ComboTracker, StatusEffect } from "@/lib/core/game-types"
import { calculateEffectiveStats, STATUS_EFFECTS, createStatusEffect } from "@/lib/entity/entity-system"
import { generateId } from "@/lib/core/utils"

// Stance modifiers
export const STANCE_MODIFIERS: Record<CombatStance, { attack: number; defense: number; resourceCost: number }> = {
  balanced: { attack: 1.0, defense: 1.0, resourceCost: 1.0 },
  aggressive: { attack: 1.3, defense: 0.7, resourceCost: 0.8 },
  defensive: { attack: 0.7, defense: 1.4, resourceCost: 1.2 },
}

// Damage type effectiveness
const WEAKNESS_MULTIPLIER = 1.5
const RESISTANCE_MULTIPLIER = 0.5

// Combo definitions - sequences that trigger bonuses
export const COMBO_DEFINITIONS: Record<
  string,
  { sequence: string[]; name: string; bonus: string; effect: ComboEffect }
> = {
  fire_burst: {
    sequence: ["fire", "fire", "fire"],
    name: "Inferno",
    bonus: "+50% fire damage for 2 turns",
    effect: { damageTypeBoost: { type: "fire", bonus: 0.5 }, duration: 2 },
  },
  shadow_chain: {
    sequence: ["shadow", "shadow", "physical"],
    name: "Shadowstrike",
    bonus: "Next attack ignores defense",
    effect: { ignoreDefense: true, duration: 1 },
  },
  holy_shield: {
    sequence: ["holy", "defensive", "holy"],
    name: "Divine Aegis",
    bonus: "Block next attack completely",
    effect: { blockNextAttack: true, duration: 1 },
  },
  frost_lock: {
    sequence: ["ice", "ice"],
    name: "Frozen",
    bonus: "Enemy slowed, -30% attack",
    effect: { enemyDebuff: { attack: -0.3 }, duration: 2 },
  },
  berserker_rage: {
    sequence: ["physical", "physical", "physical"],
    name: "Berserker",
    bonus: "+25% damage, -15% defense for 3 turns",
    effect: { damageBoost: 0.25, defenseReduction: 0.15, duration: 3 },
  },
}

interface ComboEffect {
  damageTypeBoost?: { type: DamageType; bonus: number }
  damageBoost?: number
  defenseReduction?: number
  ignoreDefense?: boolean
  blockNextAttack?: boolean
  enemyDebuff?: { attack?: number; defense?: number }
  duration: number
}

export function calculateDamageWithType(
  baseDamage: number,
  damageType: DamageType | undefined,
  enemy: Enemy,
  player: Player,
): { damage: number; effectiveness: "normal" | "effective" | "resisted" } {
  let damage = baseDamage
  let effectiveness: "normal" | "effective" | "resisted" = "normal"

  // Apply stance modifier
  const stanceMod = STANCE_MODIFIERS[player.stance]
  damage = Math.floor(damage * stanceMod.attack)

  // Apply combo bonus if active
  if (player.combo.activeCombo) {
    const comboDef = Object.values(COMBO_DEFINITIONS).find((c) => c.name === player.combo.activeCombo?.name)
    if (comboDef?.effect.damageBoost) {
      damage = Math.floor(damage * (1 + comboDef.effect.damageBoost))
    }
    if (comboDef?.effect.damageTypeBoost && damageType === comboDef.effect.damageTypeBoost.type) {
      damage = Math.floor(damage * (1 + comboDef.effect.damageTypeBoost.bonus))
    }
  }

  // Apply weakness/resistance
  if (damageType && enemy.weakness === damageType) {
    damage = Math.floor(damage * WEAKNESS_MULTIPLIER)
    effectiveness = "effective"
  } else if (damageType && enemy.resistance === damageType) {
    damage = Math.floor(damage * RESISTANCE_MULTIPLIER)
    effectiveness = "resisted"
  }

  return { damage, effectiveness }
}

export function checkForCombo(
  combo: ComboTracker,
  newAbilityTag: string,
): { newCombo: ComboTracker; triggered?: { name: string; bonus: string } } {
  const lastAbilities = [...combo.lastAbilities, newAbilityTag].slice(-3)

  // Check if any combo is triggered
  for (const [key, def] of Object.entries(COMBO_DEFINITIONS)) {
    const seqLength = def.sequence.length
    const recentTags = lastAbilities.slice(-seqLength)

    if (
      recentTags.length === seqLength &&
      recentTags.every((tag, i) => tag === def.sequence[i] || def.sequence[i] === "any")
    ) {
      return {
        newCombo: {
          lastAbilities,
          activeCombo: {
            name: def.name,
            bonus: def.bonus,
            turnsRemaining: def.effect.duration,
          },
        },
        triggered: { name: def.name, bonus: def.bonus },
      }
    }
  }

  return {
    newCombo: {
      lastAbilities,
      activeCombo: combo.activeCombo
        ? {
            ...combo.activeCombo,
            turnsRemaining: combo.activeCombo.turnsRemaining - 1,
          }
        : undefined,
    },
  }
}

export function tickCombo(combo: ComboTracker): ComboTracker {
  if (!combo.activeCombo || combo.activeCombo.turnsRemaining <= 0) {
    return { ...combo, activeCombo: undefined }
  }
  return {
    ...combo,
    activeCombo: {
      ...combo.activeCombo,
      turnsRemaining: combo.activeCombo.turnsRemaining - 1,
    },
  }
}

export function selectEnemyAbility(enemy: Enemy, playerHealth: number, playerMaxHealth: number): EnemyAbility | null {
  if (!enemy.abilities || enemy.abilities.length === 0) return null

  const availableAbilities = enemy.abilities.filter((a) => a.currentCooldown === 0)
  if (availableAbilities.length === 0) return null

  const playerHealthPercent = playerHealth / playerMaxHealth
  const enemyHealthPercent = enemy.health / enemy.maxHealth

  // AI patterns for ability selection
  switch (enemy.aiPattern) {
    case "ability_focused":
      // Always use ability if available
      return availableAbilities[Math.floor(Math.random() * availableAbilities.length)]

    case "defensive_until_low":
      // Use abilities more when health is low
      if (enemyHealthPercent < 0.4 && Math.random() < 0.8) {
        return availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
      }
      return Math.random() < 0.3 ? availableAbilities[Math.floor(Math.random() * availableAbilities.length)] : null

    case "smart":
      // Use finishing moves when player is low
      if (playerHealthPercent < 0.3) {
        const finisher = availableAbilities.find((a) => a.damage && a.damage > enemy.attack)
        if (finisher && Math.random() < 0.7) return finisher
      }
      // Use debuffs early
      if (playerHealthPercent > 0.6) {
        const debuff = availableAbilities.find((a) => a.effect)
        if (debuff && Math.random() < 0.5) return debuff
      }
      return Math.random() < 0.4 ? availableAbilities[Math.floor(Math.random() * availableAbilities.length)] : null

    default: // random
      for (const ability of availableAbilities) {
        if (Math.random() < ability.chance) return ability
      }
      return null
  }
}

export function tickEnemyAbilities(enemy: Enemy): Enemy {
  if (!enemy.abilities) return enemy

  return {
    ...enemy,
    abilities: enemy.abilities.map((a) => ({
      ...a,
      currentCooldown: Math.max(0, a.currentCooldown - 1),
    })),
  }
}

export function calculateIncomingDamage(
  baseDamage: number,
  damageType: DamageType | undefined,
  player: Player,
): number {
  const effectiveStats = calculateEffectiveStats(player)
  const stanceMod = STANCE_MODIFIERS[player.stance]

  // Base reduction from defense
  const damage = Math.max(1, baseDamage - Math.floor(effectiveStats.defense * 0.5 * stanceMod.defense))

  // Check for combo block
  if (player.combo.activeCombo) {
    const comboDef = Object.values(COMBO_DEFINITIONS).find((c) => c.name === player.combo.activeCombo?.name)
    if (comboDef?.effect.blockNextAttack) {
      return 0
    }
  }

  return damage
}

// Effect factories for enemy abilities based on damage type
function getEffectForDamageType(damageType: DamageType | undefined, sourceEnemyName: string): StatusEffect | undefined {
  switch (damageType) {
    case "poison":
      return createStatusEffect({
        name: "Venomed",
        effectType: "debuff",
        duration: 3,
        modifiers: { healthRegen: -2 },
        description: `Poison from ${sourceEnemyName} courses through your veins.`,
        sourceType: "enemy",
      })
    case "ice":
      return createStatusEffect({
        name: "Chilled",
        effectType: "debuff",
        duration: 2,
        modifiers: { attack: -2, defense: -1 },
        description: `The cold from ${sourceEnemyName}'s attack slows your movements.`,
        sourceType: "enemy",
      })
    case "fire":
      return createStatusEffect({
        name: "Burning",
        effectType: "debuff",
        duration: 2,
        modifiers: { healthRegen: -3 },
        description: `Flames from ${sourceEnemyName} continue to burn.`,
        sourceType: "enemy",
      })
    case "shadow":
      return createStatusEffect({
        name: "Shadowed",
        effectType: "debuff",
        duration: 2,
        modifiers: { attack: -3 },
        description: `Dark energy from ${sourceEnemyName} clouds your senses.`,
        sourceType: "enemy",
      })
    case "arcane":
      return createStatusEffect({
        name: "Arcane Disruption",
        effectType: "debuff",
        duration: 2,
        modifiers: { defense: -2 },
        description: `Arcane energy from ${sourceEnemyName} destabilizes your defenses.`,
        sourceType: "enemy",
      })
    default:
      return undefined // Physical attacks typically don't apply effects
  }
}

// Generate a contextual enemy ability based on enemy type and floor
export function generateEnemyAbility(enemyName: string, floor: number): EnemyAbility {
  const baseId = generateId()
  const damage = Math.floor(5 + floor * 3 + Math.random() * 5)

  // Ability templates with effects tied to damage types
  const templates: (Partial<EnemyAbility> & { effectChance?: number })[] = [
    { name: "Savage Strike", damage: damage * 1.5, damageType: "physical", chance: 0.3, effectChance: 0 },
    { name: "Poison Spit", damage: damage * 0.8, damageType: "poison", chance: 0.4, effectChance: 0.7 },
    { name: "Dark Bolt", damage: damage * 1.2, damageType: "shadow", chance: 0.35, effectChance: 0.5 },
    { name: "Flame Breath", damage: damage * 1.4, damageType: "fire", chance: 0.25, effectChance: 0.6 },
    { name: "Frost Touch", damage: damage * 0.9, damageType: "ice", chance: 0.4, effectChance: 0.6 },
    { name: "Arcane Blast", damage: damage * 1.1, damageType: "arcane", chance: 0.35, effectChance: 0.5 },
  ]

  const template = templates[Math.floor(Math.random() * templates.length)]

  // Determine if this ability should apply an effect (based on effectChance)
  const shouldHaveEffect = Math.random() < (template.effectChance || 0)
  const effect = shouldHaveEffect ? getEffectForDamageType(template.damageType, enemyName) : undefined

  return {
    id: baseId,
    name: template.name || "Attack",
    description: effect
      ? `A ${template.damageType || "physical"} attack that may inflict ${effect.name}.`
      : `A powerful ${template.damageType || "physical"} attack.`,
    damage: template.damage,
    damageType: template.damageType,
    effect,
    cooldown: 2 + Math.floor(Math.random() * 2),
    currentCooldown: 0,
    chance: template.chance || 0.3,
    narration: `The ${enemyName} unleashes ${template.name}!`,
  }
}
