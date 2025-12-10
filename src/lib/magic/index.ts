/**
 * Magic System Module
 *
 * Comprehensive spell/skill system that enables:
 * - Learning spells from tomes, scrolls, shrines, NPCs, events
 * - Casting spells in combat, exploration, or on specific targets
 * - AI-driven spell generation within balanced constraints
 */

// Core spell definitions and types
export {
  type Spell,
  type SpellBook,
  type SpellSchool,
  type SpellUsageContext,
  type SpellEffectType,
  type SpellTargetType,
  type SpellSource,
  type SpellCastResult,
  type SpellGenerationConstraints,
  createSpell,
  validateSpell,
  canCastSpell,
  calculateSpellDamage,
  calculateSpellHealing,
  canLearnSpell,
  learnSpell,
  tickSpellCooldowns,
  createEmptySpellBook,
  getSpellsBySchool,
  getSpellsByContext,
  getSpellFromTemplate,
  generateSpellPrompt,
  SPELL_TEMPLATES,
  SPELL_CONSTRAINTS_BY_SOURCE,
} from "./spell-system"

// Spell acquisition from various sources
export {
  type TomeProps,
  type ShrineSpellGrant,
  type NPCSpellOffer,
  type SpellDiscoveryEvent,
  type SpellDiscovery,
  type QuestSpellReward,
  canTeachSpell,
  getItemSpell,
  learnSpellFromItem,
  generateShrineSpell,
  learnSpellFromShrine,
  generateNPCSpellOffers,
  learnSpellFromNPC,
  generateSpellDiscovery,
  applySpellDiscovery,
  generateQuestSpellReward,
  createSpellTome,
  createSpellScroll,
  generateRandomSpellTome,
} from "./spell-acquisition"

// Spell execution and combat integration
export {
  type CastContext,
  castSpell,
  applySpellCast,
  applySpellDamageToEnemy,
} from "./spell-execution"
