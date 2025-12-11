# The Depths - Dungeon Crawler RPG

**Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Groq AI**

---

## AI-as-LEGO-Composer Architecture

> **Core Principle:** AI composes and flavors the game using the LEGO pieces we define — the Engine enforces reality and rules.

This game uses the **AI as LEGO Composer** architecture. Claude must treat the AI as a **creative orchestrator**, not a rules engine.

### Ownership Boundaries

| Owner | Responsibility |
|-------|----------------|
| **Engine** | All mechanics and state: damage, success/fail, HP, resources, loot, turn flow, deterministic formulas |
| **LEGO Library** | Predefined mechanic atoms and reusable templates (damage, status, spawn, modify_resource, traps, blessings, abilities) |
| **AI** | Composition of LEGO pieces into encounters, shrines, traps, room events, ability choices; flavor (names, descriptions, narration, option labels, thematic dressing) |

### What AI Does NOT Do

- Invent rules or new mechanics
- Output raw numbers (damage, gold, HP)
- Directly mutate GameState
- Decide success/failure (RNG owned by engine)

### What AI DOES Do

- Select from predefined LEGO pieces under constraints (difficulty budget, biome tags, rarity rules)
- Choose power levels (`light`/`medium`/`heavy`) and tiers (`minor`/`standard`/`major`)
- Provide vivid narration and thematic flavor
- Output structured data validated via Zod schemas

### Execution Flow

```
AI Decision → Zod Validation → Piece Resolution → Effect Executor → GameState
```

### Safety Guarantees

- All AI output validated via schemas before processing
- Invalid/impossible output is clamped, sanitized, or fails visibly (NO silent fallbacks)
- Narrative is never mechanical truth—flavor text may dramatize, but only the engine defines what actually happened

**Result:** Creativity, coherence, replayability, and mechanical fairness while allowing dynamic encounter design and storytelling without compromising determinism or game balance.

---

## Task Management with Beads

**Use `bd` (beads) for ALL task tracking.** Do NOT use TodoWrite.

```bash
bd ready                             # Find unblocked work
bd create "Task description"         # Create new issue
bd update <id> --status in_progress  # Start working
bd close <id> --reason "Done"        # Complete issue
bd list                              # View all issues
```

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

### The LEGO Layer (`src/lib/lego/`)

The heart of the AI integration pattern:

| File | Purpose |
|------|---------|
| `effect-atoms.ts` | Safe constructors for Effect types |
| `pieces.ts` | Predefined pieces with cost budgets |
| `registry.ts` | Query functions, manifest generation |
| `executor.ts` | Piece resolution, validation, clamping |
| `index.ts` | Public API exports |

**Key exports:**
```typescript
import {
  validateAndResolve,    // Resolve pieceIds[] → Effect[]
  calculateBudget,       // Floor-based power budget
  getPieceManifest,      // Generate AI prompt manifest
  POWER_MULTIPLIERS,     // light=0.6x, medium=1.0x, heavy=1.5x
  BLESSING_TIERS,        // minor/standard/major → stat values
  CURSE_TIERS,           // minor/standard/major → penalties
} from "@/lib/lego";
```

### Effect Execution Layer (`src/lib/effects/`)

| File | Purpose |
|------|---------|
| `effect-types.ts` | Effect, LegoTurnDecision, ShrineTurnDecision types |
| `effect-executor.ts` | `executeEffects(state, effects[])` → new state |
| `index.ts` | Public exports |

### AI Decision Modules (`src/hooks/*-decision.ts`)

Each decision module follows the LEGO pattern:

| Module | Returns |
|--------|---------|
| `enemy-ai-decision.ts` | `pieceIds[]` + `powerLevel` |
| `shrine-decision.ts` | `outcome` + `blessingTier`/`curseTier` |
| `npc-decision.ts` | `dispositionChange` + `pieceIds[]` |
| `trap-decision.ts` | `pieceIds[]` + `powerLevel` |
| `room-decision.ts` | Room composition with pieces |
| `loot-decision.ts` | Loot table selection |
| `path-decision.ts` | Path generation choices |
| `ability-decision.ts` | Ability piece selection |
| `environmental-decision.ts` | Environmental effects |
| `boss-decision.ts` | Boss encounter composition |
| `companion-decision.ts` | Companion action selection |
| `player-attack-decision.ts` | Player attack composition |

### Core Data

| File | Purpose |
|------|---------|
| `src/lib/core/game-types.ts` | All TypeScript types |
| `src/lib/core/game-data.ts` | Entity generators, initial state |

### The Monolith

`src/components/core/dungeon-game.tsx` - Main game orchestrator.

**AI Editing Pattern:** Use line-range reads, edit specific handlers.

---

## Systems (`src/lib/`)

```
lib/
├── core/        game-types, game-data, utils
├── lego/        effect-atoms, pieces, registry, executor (LEGO layer)
├── effects/     effect-types, effect-executor (execution layer)
├── combat/      combat-system, effect-system, effect-combo-system, skill-check
├── entity/      entity-system, entity-factory, enemy-rank-system, companion-system
├── character/   ability-system, sustained-ability-system, race-system
├── items/       item-taxonomy, item-generator, consumable-system, smart-loot-system, vault-system
├── materials/   material-system
├── world/       world-state, environmental-system, hazard-system, path-system, chaos-system
├── magic/       spell system
├── maps/        map generation
├── ai/          ai-schemas, ai-utils, game-log-system, event-engine
├── persistence/ save-system
├── mechanics/   game-mechanics-ledger
└── debug/       debug utilities
```

---

## Hooks (`src/hooks/`)

### Decision Modules (AI → LEGO pieces)
```
*-decision.ts     # AI decision functions returning pieceIds/tiers
```

### React Hooks (game logic)
```
use-combat.tsx           # Combat orchestration
use-enemy-ai.tsx         # Enemy turn execution (LEGO pattern)
use-encounters.tsx       # Encounter handlers
use-abilities.tsx        # Ability system
use-companions.tsx       # Party management
use-navigation.tsx       # Dungeon navigation
use-inventory.tsx        # Item management
use-tavern.tsx           # Town/rest mechanics
use-turn-effects.tsx     # Status effect processing
use-flee.tsx             # Escape mechanics
use-environmental.tsx    # Environmental interactions
use-vault.tsx            # Persistent storage
```

---

## API Routes (`src/app/api/`)

| Route | Purpose |
|-------|---------|
| `decide/` | AI decision endpoint (LEGO pattern) |
| `dungeon-master/` | AI narrative generation |
| `dm-operations/` | Dungeon master operations |
| `entity-generator/` | Dynamic entity creation |
| `event-chain/` | AI event sequencing |
| `alchemy/` | AI alchemy recipes |
| `drops/` | AI loot generation |
| `identify/` | Item identification |
| `loot-container/` | Container contents |
| `npc-dialogue/` | AI NPC conversations |

---

## Key Types

```typescript
// LEGO Decision Types
LegoTurnDecision     // { pieceIds[], powerLevel, narration }
ShrineTurnDecision   // { outcome, blessingTier?, curseTier?, narration }
NPCTurnDecision      // { dispositionChange, pieceIds?, narration }
Effect               // { type, target, value, ... }

// Game Types
GameState            // Root state object
Player               // Player stats, inventory, abilities
Combatant            // Enemy/boss entities
StatusEffect         // Buffs/debuffs with duration
Ability              // Class abilities with cooldowns
```

---

## Adding New AI Features

### New LEGO Piece

1. Add piece definition in `src/lib/lego/pieces.ts`:
```typescript
new_piece: {
  id: "new_piece",
  name: "New Piece",
  category: "attack",
  cost: 4,
  tags: ["fire", "damage"],
  atoms: [atoms.damage(targets.player(), 15, "enemy_attack", { damageType: "fire" })],
}
```

2. Registry auto-discovers it—no other changes needed

### New Decision Module

1. Create `src/hooks/<context>-decision.ts`
2. Define Zod schema for AI output
3. Build prompt with piece manifest from registry
4. Return structured decision (pieceIds, tiers, narration)
5. Create executor that resolves pieces via `validateAndResolve()`

### Schema Pattern

```typescript
const decisionSchema = z.object({
  narration: z.string().max(200),
  pieceIds: z.array(z.string()).max(3),
  powerLevel: z.enum(["light", "medium", "heavy"]),
});
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

### NO FALLBACKS Philosophy

If AI fails (invalid pieces, budget exceeded, schema validation), the game fails visibly:

```typescript
// WRONG - hides AI failures
if (!result.success) {
  return { effects: [defaultAttack] };
}

// CORRECT - fail visibly
if (!result.success) {
  throw new Error(`LEGO resolution failed: ${result.errors}`);
}
```

### Power Scaling

AI selects intensity, kernel applies multipliers:

| Level | Multiplier | Use Case |
|-------|------------|----------|
| light | 0.6x | Glancing blow, weak attack |
| medium | 1.0x | Standard attack |
| heavy | 1.5x | Critical hit, devastating blow |

### Tier Systems

AI selects tier, kernel looks up values:

| Blessing Tier | Attack | Defense | Duration |
|---------------|--------|---------|----------|
| minor | +2 | +1 | 3 turns |
| standard | +4 | +3 | 5 turns |
| major | +7 | +5 | 8 turns |

---

## Local `.claude/` Override

If you have a global `~/.claude/` setup:

```bash
# Ignore local .claude/ changes
git ls-files .claude/ | xargs git update-index --skip-worktree
echo ".claude/" >> .git/info/exclude
```
