# Architecture Overview

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
- Zod schemas validate all AI responses (ai-schemas.ts)
- Graceful fallbacks when AI fails
