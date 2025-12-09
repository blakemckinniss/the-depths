#!/bin/bash
# UserPromptSubmit hook: Provide guidance when working with the main game file
# dungeon-game.tsx is 3000+ lines - remind about section markers and line ranges

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')

PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')

# Check if prompt mentions the monolith or main game logic
if echo "$PROMPT_LOWER" | grep -qE 'dungeon-game|main game|game component|monolith|handler'; then
  CONTEXT="**Working with dungeon-game.tsx (3024 lines):**

Use line-range reads instead of reading the whole file:
\`\`\`
Read dungeon-game.tsx lines X-Y
\`\`\`

**Section Markers** (search for \`// === SECTION ===\`):
- SAVE/LOAD - Persistence handlers
- COMBAT - Attack, ability, enemy turn
- NAVIGATION - Path selection, room exploration
- ENCOUNTERS - Trap, shrine, NPC handlers
- INVENTORY - Item management
- RENDER - JSX output (~line 2700+)

**Key Handler Lines:**
| Handler | Lines | Purpose |
|---------|-------|---------|
| handleUseAbility | 994-1201 | Ability execution |
| playerAttack | 1321-1577 | Basic attack flow |
| handleSelectPath | 522-726 | Room generation |
| handleNPCChoice | 1918-2052 | NPC dialogues |
| handleShrineAction | 1768-1916 | Shrine interactions |
| processTurnEffects | 909-991 | Status/hazard ticks |
"
  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
