# The Depths - Dungeon Crawler RPG

**Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Groq AI**

---

## Task Management with Beads

**IMPORTANT: Use `bd` (beads) for ALL task and issue management.** Do NOT use TodoWrite for task tracking - use beads instead.

### Required Workflow

1. **Before starting work:** Check for existing issues with `bd list` or `bd ready`
2. **Starting a task:** Create or claim an issue with `bd create` or `bd update <id> --status in_progress`
3. **During work:** Update issues as you discover blockers or sub-tasks
4. **Completing work:** Close issues with `bd close <id> --reason "description"`

### Essential Commands

```bash
bd list                              # View all issues
bd ready                             # Find unblocked work (issues with no dependencies)
bd create "Task description"         # Create new issue
bd show <id>                         # View issue details
bd update <id> --status in_progress  # Start working on issue
bd close <id> --reason "Done"        # Complete and close issue
bd dep add <id> --blocks <other>     # Add dependency between issues
bd dep tree <id>                     # Visualize dependency graph
bd sync                              # Sync with git
```

### For AI Agents

```bash
bd ready --json | jq '.[0]'          # Get next actionable issue as JSON
bd update <id> --status in_progress --json
bd list --json                       # Machine-readable output
```

### Issue States

- `open` - Not yet started
- `in_progress` - Currently being worked on
- `blocked` - Waiting on dependencies
- `done` - Completed

---

## Quick Reference

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

**Environment:** Requires `GROQ_API_KEY` for AI features.

---

## Architecture

### The Monolith

`src/components/core/dungeon-game.tsx` (2165 lines) - Main game orchestrator. **For AI editing, use line-range reads.**

#### Handler Reference

| Handler | Lines | Purpose |
|---------|-------|---------|
| `handleLoadSave` | 225-242 | Load saved game |
| `handleNewGame` | 244-251 | Start fresh game |
| `handleReturnToTitle` | 253-269 | Return to title screen |
| `handleChangeStance` | 271-308 | Combat stance switching |
| `handleEnvironmentalInteraction` | 310-520 | Room object interactions |
| `handleSelectPath` | 522-726 | Path selection, room generation, encounters |
| `handleSelectClass` | 728-846 | Class selection and player init |
| `checkLevelUp` | 848-907 | Level up processing |
| `processTurnEffects` | 909-991 | Status effects, hazards, regen |
| `handleUseAbility` | 994-1201 | Ability execution, damage, effects |
| `triggerDeath` | 1204-1217 | Death handling |
| `enemyAttack` | 1219-1318 | Enemy turn execution |
| `playerAttack` | 1321-1577 | Basic attack flow |
| `exploreRoom` | 1579-1626 | Room exploration |
| `handleTrapAction` | 1628-1766 | Trap encounters |
| `handleShrineAction` | 1768-1916 | Shrine interactions |
| `handleNPCChoice` | 1918-2052 | NPC dialogue choices |
| `handleLootContainerComplete` | 2054-2108 | Loot container resolution |
| `handleRestoreHealth` | 2504-2527 | Tavern healing |
| `handleBuyKey` | 2529-2693 | Key purchases |
| `handleEquipItem` | 2695-2700 | Item equipping |

#### Section Markers

The file uses `// === SECTION NAME ===` comments for navigation:
- `SAVE/LOAD` - Persistence handlers
- `COMBAT` - Attack, ability, enemy turn handlers
- `NAVIGATION` - Path selection, room exploration
- `ENCOUNTERS` - Trap, shrine, NPC handlers
- `INVENTORY` - Item management
- `RENDER` - JSX output

**AI Editing Pattern:**
```
Read dungeon-game.tsx lines 994-1201  # Read handleUseAbility
Edit the specific logic needed
```

### Core Data

| File | Purpose |
|------|---------|
| `src/lib/core/game-types.ts` | All TypeScript types |
| `src/lib/core/game-data.ts` | Entity generators, initial state |

---

## Systems (`src/lib/`)

```
lib/
├── core/        game-types, game-data, utils
├── combat/      combat-system, effect-system, effect-combo-system, effect-factory, skill-check
├── entity/      entity-system, entity-factory, enemy-rank-system, companion-system
├── character/   ability-system, sustained-ability-system, race-system
├── items/       item-taxonomy, item-generator, consumable-system, item-sets-system, ego-item-system,
│                unknown-item-system, smart-loot-system, vault-system, transmogrification-system
├── materials/   material-system
├── world/       world-state, environmental-system, environmental-effects, hazard-system, path-system, chaos-system
├── ai/          ai-schemas, ai-utils, ai-alchemy-system, ai-drops-system, game-log-system, event-engine
├── hooks/       use-event-chain, use-dungeon-master, use-entity-generator
├── persistence/ save-system
├── debug/       debug
└── mechanics/   game-mechanics-ledger
```

### core/
| System | Responsibility |
|--------|----------------|
| `game-types` | All TypeScript type definitions |
| `game-data` | Entity generators, initial state |
| `utils` | Shared utilities (cn helper) |

### combat/
| System | Responsibility |
|--------|----------------|
| `combat-system` | Damage calc, stances, combos, enemy AI |
| `effect-system` | Status effects, buffs/debuffs |
| `effect-combo-system` | Effect interactions (fire+oil=explosion) |
| `effect-factory` | Effect creation helpers |
| `skill-check` | Dice rolls, skill checks |

### entity/
| System | Responsibility |
|--------|----------------|
| `entity-system` | Entity processing, stat calculations |
| `entity-factory` | Dynamic entity creation |
| `enemy-rank-system` | Elite/champion/boss scaling |
| `companion-system` | Party members, companion actions |

### character/
| System | Responsibility |
|--------|----------------|
| `ability-system` | Class abilities, cooldowns, resources |
| `sustained-ability-system` | Channeled/maintained abilities |
| `race-system` | Player/NPC race traits |

### items/
| System | Responsibility |
|--------|----------------|
| `item-taxonomy` | Item classification hierarchy |
| `item-generator` | Procedural item creation |
| `consumable-system` | Potions, scrolls, food |
| `item-sets-system` | Set bonuses and tracking |
| `ego-item-system` | Sentient/cursed items |
| `unknown-item-system` | Unidentified item mechanics |
| `smart-loot-system` | Context-aware drop generation |
| `vault-system` | Persistent item storage |
| `transmogrification-system` | Item conversion system |

### materials/
| System | Responsibility |
|--------|----------------|
| `material-system` | Material properties and crafting |

### world/
| System | Responsibility |
|--------|----------------|
| `world-state` | Global game state management |
| `environmental-system` | Room hazards, terrain effects |
| `environmental-effects` | Environmental effect definitions |
| `hazard-system` | Traps, environmental damage |
| `path-system` | Dungeon path generation |
| `chaos-system` | Random events, world mutations |

### ai/
| System | Responsibility |
|--------|----------------|
| `ai-schemas` | Zod schemas for AI responses |
| `ai-utils` | AI helper functions |
| `ai-alchemy-system` | AI-powered alchemy recipes |
| `ai-drops-system` | AI-generated loot |
| `game-log-system` | Structured event logging with JSX |
| `event-engine` | Event dispatching |

### hooks/
| Hook | Purpose |
|------|---------|
| `use-dungeon-master` | AI narrative generation |
| `use-entity-generator` | Dynamic entity creation |
| `use-event-chain` | AI event sequencing |

### persistence/
| System | Responsibility |
|--------|----------------|
| `save-system` | LocalStorage persistence |

### mechanics/
| System | Responsibility |
|--------|----------------|
| `game-mechanics-ledger` | Engine constraints, validation, constants (1969 lines)

---

## API Routes (`src/app/api/`)

| Route | Purpose |
|-------|---------|
| `dungeon-master/` | AI narrative generation |
| `entity-generator/` | Dynamic entity creation |
| `event-chain/` | AI event sequencing |
| `alchemy/` | AI alchemy recipes |
| `drops/` | AI loot generation |
| `identify/` | Item identification |
| `loot-container/` | Container contents |
| `npc-dialogue/` | AI NPC conversations |

---

## UI Components (`src/components/`)

```
components/
├── core/        dungeon-game, dungeon-card, providers, error-boundary, game-menu, game-log
├── combat/      combat-display, ability-bar, stance-selector, combo-display, weakness-indicator, enemy-ability-warn
├── character/   class-select, stats-view, sidebar-stats, stat-bar, inline-stats, death-screen
├── inventory/   inventory-view, inline-inventory, sidebar-inventory, sidebar-keys, item-action-menu,
│                unknown-item-use, loot-container-reveal
├── party/       companion-display, party-panel
├── encounters/  boss-encounter, npc-dialogue, shrine-interaction, trap-encounter, trap-interaction, tavern, skill-check-display
├── world/       path-select, dungeon-select, environmental-indicator, hazard-display, world-context-display, chaos-event-display
├── effects/     status-effects-display, enhanced-status-display, effect-combo-display, ambient-effect-display
├── narrative/   interactive-narrative, entity-text, choice-buttons
├── modals/      entity-detail-modal, entity-modal-context
├── persistence/ save-load-menu
├── dev/         dev-panel, dev-button
└── ui/          dialog (shadcn/ui primitives)
```

---

## Type System

All types in `src/lib/core/game-types.ts`. Key types:

```typescript
GameState        // Root state object
Player           // Player stats, inventory, abilities
Enemy            // Combat entities
Item             // Weapons, armor, consumables
StatusEffect     // Buffs/debuffs with duration
Ability          // Class abilities with cooldowns
Companion        // Party member entities
ChaosEvent       // Random world events
PathOption       // Dungeon navigation
CombatStance     // Offensive/Defensive/Balanced
```

---

## Game Flow

```
ClassSelect → DungeonSelect → PathSelect → [Room Loop]
                                              ↓
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
               Combat              Encounter (NPC/Shrine/Trap)     Loot/Rest
                    ↓                         ↓                         ↓
              Victory/Flee              Interact/Leave              Continue
                    └─────────────────────────┼─────────────────────────┘
                                              ↓
                                    FloorComplete → NextFloor
                                              ↓
                                    DungeonComplete → Tavern
```

---

## Key Patterns

### State Management
- Single `GameState` object passed through props
- Immutable updates via spread operators
- No external state library (React useState)

### Entity System
- All game objects implement `GameEntity` interface
- `entityType` discriminator for type narrowing
- AI-generated entities marked with `aiGenerated: true`

### Combat
- Turn-based with stance modifiers
- Combo system tracks recent actions
- Enemy abilities have warning indicators
- Weakness/resistance damage multipliers

### Effects
- Duration-based (tick on turn end)
- Stackable with `stacks` property
- Effect combos trigger on specific combinations

### AI Integration
- Uses `@ai-sdk/groq` with Vercel AI SDK
- Zod schemas validate all AI responses (`ai-schemas.ts`)
- Graceful fallbacks when AI fails

---

## Adding New Features

### New System
1. Create `src/lib/<category>/<name>-system.ts` (choose appropriate subdirectory)
2. Add types to `src/lib/core/game-types.ts`
3. Import and integrate in `src/components/core/dungeon-game.tsx`
4. Add UI component in appropriate `src/components/<category>/` subdirectory

### New AI Feature
1. Create API route in `src/app/api/<name>/route.ts`
2. Define Zod schema in `src/lib/ai/ai-schemas.ts`
3. Create React hook in `src/lib/hooks/use-<name>.ts`
4. Integrate in game component

---

## Local `.claude/` Override

The repo includes a `.claude/` config for contributors. If you have a global `~/.claude/` setup and want to use that instead:

```bash
# Ignore local .claude/ changes (run once after clone)
git ls-files .claude/ | xargs git update-index --skip-worktree
echo ".claude/" >> .git/info/exclude
```

To pull `.claude/` updates from GitHub later:
```bash
git ls-files .claude/ | xargs git update-index --no-skip-worktree
git pull
git ls-files .claude/ | xargs git update-index --skip-worktree
```
