# Add New System

Guide for adding a new game system.

## Steps

1. Create `src/lib/<name>-system.ts`
2. Add types to `src/lib/game-types.ts`
3. Import and integrate in `src/components/dungeon-game.tsx`
4. Add UI component if needed in `src/components/`

## Template

```typescript
// src/lib/<name>-system.ts
import { GameState, Player } from './game-types';

export interface <Name>Config {
  // Configuration options
}

export function process<Name>(state: GameState): GameState {
  // Process logic
  return state;
}

export function apply<Name>Effect(player: Player, effect: unknown): Player {
  // Apply effect to player
  return player;
}
```

## Integration Points

- **State updates**: Add to GameState type if persistent
- **Turn processing**: Add to processTurnEffects in dungeon-game.tsx
- **Combat integration**: Add to playerAttack/enemyAttack handlers
- **UI display**: Create component in src/components/
