# Monolith Navigation Guide

The main game file is src/components/dungeon-game.tsx (3000+ lines).

## Section Markers

The file uses `// === SECTION NAME ===` comments:
- SAVE/LOAD (225) - Persistence handlers
- NAVIGATION (523) - Path selection, room exploration
- COMBAT (848) - Attack, ability, enemy turn handlers
- ENCOUNTER (1629) - Trap, shrine, NPC handlers
- INVENTORY (2696) - Item management
- RENDER (2727+2835) - JSX output

## Quick Navigation

To find a section:
```bash
grep -n "// ===" src/components/dungeon-game.tsx
```

## AI Editing Pattern

Always read specific line ranges, never the whole file:
```
Read dungeon-game.tsx lines 994-1201  # handleUseAbility
Read dungeon-game.tsx lines 522-726   # handleSelectPath
```

Use /handler <name> to read a specific handler.
