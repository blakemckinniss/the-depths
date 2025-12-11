# AI-as-LEGO-Composer Architecture

## Overview

The Depths uses an **AI-as-LEGO-Composer** architecture where the AI acts as a creative deckbuilder selecting from predefined game mechanics, rather than inventing rules or outputting raw numbers.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    pieceIds[]     ┌─────────────┐    Effect[]      │
│  │             │ ──────────────────>│             │ ──────────────>  │
│  │   AI (LLM)  │    powerLevel     │   KERNEL    │    GameState     │
│  │  "Composer" │                   │  "Executor" │                   │
│  │             │<──────────────────│             │                   │
│  └─────────────┘   piece manifest  └─────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. AI Never Outputs Raw Numbers

**Before (Anti-pattern):**
```typescript
// AI returns damage directly - can hallucinate broken values
const decision = { damage: 9999, narration: "..." }
```

**After (LEGO Pattern):**
```typescript
// AI selects from predefined pieces - kernel controls values
const decision = {
  pieceIds: ["fireball", "weaken"],
  powerLevel: "heavy",
  narration: "..."
}
```

### 2. AI Never Decides Success/Failure

- RNG (dodge, crit, disarm) is owned by the kernel
- AI provides narration for outcomes determined by kernel
- AI cannot grant "you automatically win"

### 3. AI Never Invents New Mechanics

- All effects come from the LEGO piece registry
- New mechanics require code changes, not prompt changes
- This prevents prompt injection attacks from creating broken abilities

## The LEGO Layer

Located in `src/lib/lego/`:

### Effect Atoms (`effect-atoms.ts`)

Smallest building blocks - safe constructors for Effect types:

```typescript
import { atoms, targets, statusTemplates } from "@/lib/lego"

// Create a damage effect
atoms.damage(targets.player(), 10, "enemy_attack", { damageType: "fire" })

// Create a status effect
atoms.applyStatus(targets.player(), statusTemplates.burning(2))
```

### Pieces (`pieces.ts`)

Pre-composed bundles of atoms with metadata:

```typescript
export interface LegoPiece {
  id: string           // "fireball"
  name: string         // "Fireball"
  category: PieceCategory  // "attack" | "defense" | "utility" | "buff" | "debuff"
  rarity: PieceRarity     // "common" | "uncommon" | "rare" | "legendary"
  cost: number         // 1-10 power budget
  tags: string[]       // ["fire", "magical", "damage", "dot"]
  atoms: Effect[]      // The actual effects
  narrationHints: string  // Hints for AI narration
}
```

Example piece:
```typescript
fireball: {
  id: "fireball",
  name: "Fireball",
  category: "attack",
  rarity: "uncommon",
  cost: 5,
  tags: ["fire", "magical", "damage", "dot"],
  atoms: [
    atoms.damage(targets.player(), 18, "enemy_attack", { damageType: "fire" }),
    atoms.applyStatus(targets.player(), statusTemplates.burning(1)),
  ],
  narrationHints: "Blazing sphere, explosion, engulfing flames",
}
```

### Registry (`registry.ts`)

Query functions for AI prompt building:

```typescript
// Get pieces for enemy combat (within budget)
const pieces = getEnemyAttackPieces(maxBudget)

// Generate manifest for AI prompt
const manifest = getPieceManifest(pieces)
// Output: "- fireball (cost: 5, tags: fire, magical, damage, dot)"
```

### Executor (`executor.ts`)

Resolves piece IDs to Effects with validation:

```typescript
// Resolve with power scaling
const result = validateAndResolve(
  ["fireball", "weaken"],  // pieceIds from AI
  budget,                   // max cost (e.g., 6)
  "heavy"                   // power level (1.5x damage)
)

if (!result.success) {
  console.error(result.errors)  // ["Budget exceeded: 7 > 6"]
}

// result.effects is Effect[] ready for execution
```

## Power Scaling

AI selects a power level, kernel applies multipliers:

| Level  | Multiplier | Use Case |
|--------|------------|----------|
| light  | 0.6x       | Glancing blow, weak attack |
| medium | 1.0x       | Standard attack |
| heavy  | 1.5x       | Critical hit, devastating blow |

## Tier Systems

### Blessing Tiers (Shrines)

AI selects tier, kernel looks up stat values:

| Tier     | Attack | Defense | Duration |
|----------|--------|---------|----------|
| minor    | +2     | +1      | 3 turns  |
| standard | +4     | +3      | 5 turns  |
| major    | +7     | +5      | 8 turns  |

### Curse Tiers (Shrines)

| Tier     | Attack | Defense | Duration |
|----------|--------|---------|----------|
| minor    | -2     | -1      | 3 turns  |
| standard | -4     | -3      | 5 turns  |
| major    | -7     | -5      | 8 turns  |

### Disposition Changes (NPCs)

| Level       | Change |
|-------------|--------|
| slight      | ±5     |
| moderate    | ±15    |
| significant | ±30    |

## Decision Flow

### Enemy Combat Turn

```
1. Kernel: Check dodge (RNG)
2. Kernel: Build context (HP%, abilities, AI pattern)
3. Kernel: Calculate budget based on floor
4. Kernel: Build piece manifest for prompt
5. AI: Select pieceIds[] and powerLevel
6. Kernel: Validate pieces exist
7. Kernel: Validate budget not exceeded
8. Kernel: Resolve pieces to Effect[]
9. Kernel: Apply power scaling
10. Kernel: Execute effects on GameState
```

### Shrine Interaction

```
1. Kernel: Validate player can afford cost
2. Kernel: Apply cost (gold/health)
3. AI: Select outcome (blessing/curse/nothing/mixed)
4. AI: Select tier if applicable
5. AI: Optionally select bonus pieceIds
6. Kernel: Resolve tier to stat values
7. Kernel: Resolve pieceIds to effects
8. Kernel: Execute all effects
```

## Adding New Pieces

1. Add piece definition in `pieces.ts`:
```typescript
new_piece: {
  id: "new_piece",
  name: "New Piece",
  category: "attack",
  rarity: "uncommon",
  cost: 4,
  tags: ["fire", "damage"],
  atoms: [atoms.damage(targets.player(), 15, "enemy_attack", { damageType: "fire" })],
  narrationHints: "Description for AI",
}
```

2. No other changes needed - registry auto-discovers it

## Validation Layers

### 1. Schema Validation (Zod)

AI output validated against schema before processing:
- `pieceIds` must be string[]
- `powerLevel` must be "light" | "medium" | "heavy"
- `narration` must be string

### 2. Piece Existence Check

```typescript
// In executor.ts
if (!PIECES[id]) {
  errors.push(`Unknown piece: ${id}`)
}
```

### 3. Budget Validation

```typescript
// Prevent AI from selecting too many expensive pieces
if (totalCost > maxBudget) {
  errors.push(`Budget exceeded: ${totalCost} > ${maxBudget}`)
}
```

### 4. Effect Clamping

```typescript
// Safety net for misconfigured pieces
clampEffects(effects)  // Damage: 1-999, Gold: -9999 to 9999
```

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/lego/effect-atoms.ts` | Safe effect constructors |
| `src/lib/lego/pieces.ts` | Piece definitions and registry |
| `src/lib/lego/registry.ts` | Query and manifest functions |
| `src/lib/lego/executor.ts` | Resolution and validation |
| `src/lib/lego/index.ts` | Public API exports |
| `src/lib/effects/effect-types.ts` | Effect and decision types |
| `src/lib/ai/ai-schemas.ts` | Zod schemas for AI output |
| `src/hooks/enemy-ai-decision.ts` | Enemy AI decision module |
| `src/hooks/shrine-decision.ts` | Shrine decision module |
| `src/hooks/use-enemy-ai-v2.tsx` | Enemy turn executor with LEGO |
| `src/hooks/use-encounters.tsx` | Encounter handlers with LEGO |

## NO FALLBACKS Philosophy

If AI fails (invalid pieces, budget exceeded, schema validation), the game fails visibly:

```typescript
// DO NOT add fallbacks like this:
if (!result.success) {
  return { effects: [defaultAttack] }  // WRONG - hides AI failures
}

// Instead, let it fail:
if (!result.success) {
  throw new Error(`LEGO resolution failed: ${result.errors}`)
}
```

This ensures AI issues are noticed and fixed, not silently papered over.
