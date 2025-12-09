# The Depths - Handler Quick Reference

**Monolith:** `src/components/dungeon-game.tsx` (3024 lines)

## Handler Line Numbers

| Handler | Lines | Purpose |
|---------|-------|---------|
| `handleLoadSave` | 225-242 | Load saved game |
| `handleNewGame` | 244-251 | Start fresh game |
| `handleReturnToTitle` | 253-269 | Return to title |
| `handleChangeStance` | 271-308 | Combat stance |
| `handleEnvironmentalInteraction` | 310-520 | Room objects |
| `handleSelectPath` | 522-726 | Path/room generation |
| `handleSelectClass` | 728-846 | Class selection |
| `checkLevelUp` | 848-907 | Level up |
| `processTurnEffects` | 909-991 | Status/hazards |
| `handleUseAbility` | 994-1201 | Abilities |
| `triggerDeath` | 1204-1217 | Death |
| `enemyAttack` | 1219-1318 | Enemy turn |
| `playerAttack` | 1321-1577 | Basic attack |
| `exploreRoom` | 1579-1626 | Exploration |
| `handleTrapAction` | 1628-1766 | Traps |
| `handleShrineAction` | 1768-1916 | Shrines |
| `handleNPCChoice` | 1918-2052 | NPC dialogue |
| `handleLootContainerComplete` | 2054-2108 | Loot |
| `handleRestoreHealth` | 2504-2527 | Tavern heal |
| `handleBuyKey` | 2529-2693 | Key purchase |
| `handleEquipItem` | 2695-2700 | Equipping |

## Section Markers

```bash
grep "// ===" src/components/dungeon-game.tsx
```

- `SAVE/LOAD` (225) - Persistence
- `NAVIGATION` (523) - Path selection
- `COMBAT` (848) - Combat handlers
- `ENCOUNTER` (1629) - Trap/shrine/NPC
- `INVENTORY` (2696) - Items
- `RENDER` (2727+2835) - UI output

## Quick Commands

```bash
npm run typecheck  # Fast type check (~2s)
npm run build      # Full build (~15s)
npm run dev        # Dev server
```

## AI Editing Pattern

```
Read dungeon-game.tsx lines 994-1201  # handleUseAbility
Read dungeon-game.tsx lines 522-726   # handleSelectPath
```
