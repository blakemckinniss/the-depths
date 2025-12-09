# Read Handler from Monolith

Read a specific handler from dungeon-game.tsx by name.

Usage: /handler <name>

Available handlers and their line ranges:
- handleLoadSave: 225-242
- handleNewGame: 244-251
- handleReturnToTitle: 253-269
- handleChangeStance: 271-308
- handleEnvironmentalInteraction: 310-520
- handleSelectPath: 522-726
- handleSelectClass: 728-846
- checkLevelUp: 848-907
- processTurnEffects: 909-991
- handleUseAbility: 994-1201
- triggerDeath: 1204-1217
- enemyAttack: 1219-1318
- playerAttack: 1321-1577
- exploreRoom: 1579-1626
- handleTrapAction: 1628-1766
- handleShrineAction: 1768-1916
- handleNPCChoice: 1918-2052
- handleLootContainerComplete: 2054-2108
- handleRestoreHealth: 2504-2527
- handleBuyKey: 2529-2693
- handleEquipItem: 2695-2700

Read the requested handler from src/components/dungeon-game.tsx using the line range above.

Argument provided: $ARGUMENTS
