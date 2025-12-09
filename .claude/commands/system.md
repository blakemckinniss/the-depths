# Read Game System

Read a specific game system file.

Usage: /system <name>

Available systems in src/lib/:
- ability-system: Class abilities, cooldowns, resources
- sustained-ability-system: Channeled/maintained abilities
- combat-system: Damage calc, stances, combos, enemy AI
- effect-system: Status effects, buffs/debuffs
- effect-combo-system: Effect interactions (fire+oil=explosion)
- effect-factory: Effect creation helpers
- entity-system: Entity processing, stat calculations
- entity-factory: Dynamic entity creation
- skill-check: Dice rolls, skill checks
- item-generator: Procedural item creation
- item-taxonomy: Item classification hierarchy
- item-sets-system: Set bonuses and tracking
- material-system: Material properties and crafting
- ego-item-system: Sentient/cursed items
- unknown-item-system: Unidentified item mechanics
- consumable-system: Potions, scrolls, food
- smart-loot-system: Context-aware drop generation
- vault-system: Persistent item storage
- transmogrification-system: Item appearance changes
- environmental-system: Room hazards, terrain effects
- environmental-effects: Environmental effect definitions
- hazard-system: Traps, environmental damage
- path-system: Dungeon path generation
- chaos-system: Random events, world mutations
- world-state: Global game state management
- companion-system: Party members, companion actions
- enemy-rank-system: Elite/champion/boss scaling
- race-system: Player/NPC race traits
- save-system: LocalStorage persistence
- game-types: All TypeScript types
- game-data: Entity generators, initial state

Read the requested system from src/lib/<name>.ts

Argument provided: $ARGUMENTS
