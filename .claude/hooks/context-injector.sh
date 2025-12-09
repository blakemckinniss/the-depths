#!/bin/bash
# UserPromptSubmit hook: Inject relevant context based on keywords in prompt
# Helps Claude remember what exists before diving into implementation

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

CONTEXT=""

# Convert prompt to lowercase for matching
PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')

# Combat-related keywords
if echo "$PROMPT_LOWER" | grep -qE 'combat|attack|damage|ability|stance|enemy|boss|weakness'; then
  CONTEXT="$CONTEXT**Combat Systems:** combat-system.ts, ability-system.ts, sustained-ability-system.ts, effect-system.ts, effect-combo-system.ts\n"
  CONTEXT="$CONTEXT**Combat Components:** combat-display, ability-bar, stance-selector, combo-display, weakness-indicator\n"
  CONTEXT="$CONTEXT**Key Handlers:** handleUseAbility (994-1201), playerAttack (1321-1577), enemyAttack (1219-1318)\n\n"
fi

# Item-related keywords
if echo "$PROMPT_LOWER" | grep -qE 'item|inventory|loot|drop|equipment|weapon|armor|potion|consumable'; then
  CONTEXT="$CONTEXT**Item Systems:** item-generator.ts, smart-loot-system.ts, item-taxonomy.ts, consumable-system.ts, ego-item-system.ts, unknown-item-system.ts\n"
  CONTEXT="$CONTEXT**Item Components:** inventory-view, item-action-menu, loot-container-reveal\n\n"
fi

# Effect/status keywords
if echo "$PROMPT_LOWER" | grep -qE 'effect|buff|debuff|status|poison|burn|bleed|stun'; then
  CONTEXT="$CONTEXT**Effect Systems:** effect-system.ts, effect-factory.ts, effect-combo-system.ts\n"
  CONTEXT="$CONTEXT**Effect Components:** status-effects-display, enhanced-status-display, effect-combo-display\n"
  CONTEXT="$CONTEXT**Handler:** processTurnEffects (909-991)\n\n"
fi

# NPC/encounter keywords
if echo "$PROMPT_LOWER" | grep -qE 'npc|dialogue|shrine|trap|encounter|tavern|merchant'; then
  CONTEXT="$CONTEXT**Encounter Handlers:** handleNPCChoice (1918-2052), handleShrineAction (1768-1916), handleTrapAction (1628-1766)\n"
  CONTEXT="$CONTEXT**Encounter Components:** npc-dialogue, shrine-interaction, trap-encounter, tavern\n"
  CONTEXT="$CONTEXT**API Routes:** /api/npc-dialogue, /api/loot-container\n\n"
fi

# AI feature keywords
if echo "$PROMPT_LOWER" | grep -qE '\bai\b|groq|generate|procedural|dynamic|narrative'; then
  CONTEXT="$CONTEXT**AI Integration:** Uses @ai-sdk/groq with Zod schema validation (ai-schemas.ts)\n"
  CONTEXT="$CONTEXT**AI Hooks:** use-dungeon-master.ts, use-entity-generator.ts, use-event-chain.ts\n"
  CONTEXT="$CONTEXT**AI Routes:** /api/dungeon-master, /api/entity-generator, /api/event-chain, /api/drops\n"
  CONTEXT="$CONTEXT**Pattern:** Always validate AI responses with Zod, provide fallbacks\n\n"
fi

# Path/navigation keywords
if echo "$PROMPT_LOWER" | grep -qE 'path|room|floor|dungeon|navigation|explore|door'; then
  CONTEXT="$CONTEXT**Navigation Systems:** path-system.ts, environmental-system.ts, world-state.ts\n"
  CONTEXT="$CONTEXT**Handler:** handleSelectPath (522-726), exploreRoom (1579-1626)\n"
  CONTEXT="$CONTEXT**Components:** path-select, dungeon-select\n\n"
fi

# Type/interface keywords
if echo "$PROMPT_LOWER" | grep -qE 'type|interface|typescript|types'; then
  CONTEXT="$CONTEXT**All types are in:** src/lib/game-types.ts\n"
  CONTEXT="$CONTEXT**Key Types:** GameState, Player, Enemy, Item, StatusEffect, Ability, Companion, PathOption\n"
  CONTEXT="$CONTEXT**Pattern:** All entities use GameEntity interface with entityType discriminator\n\n"
fi

# Component keywords
if echo "$PROMPT_LOWER" | grep -qE 'component|ui|display|view|render|jsx'; then
  COMPONENT_COUNT=$(ls src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
  CONTEXT="$CONTEXT**UI Components:** $COMPONENT_COUNT components in src/components/\n"
  CONTEXT="$CONTEXT**Main orchestrator:** dungeon-game.tsx (render section starts ~line 2700)\n"
  CONTEXT="$CONTEXT**Pattern:** Props-based, no external state library\n\n"
fi

# Save/load keywords
if echo "$PROMPT_LOWER" | grep -qE 'save|load|persist|storage|localStorage'; then
  CONTEXT="$CONTEXT**Save System:** save-system.ts uses localStorage\n"
  CONTEXT="$CONTEXT**Handlers:** handleLoadSave (225-242), handleNewGame (244-251)\n\n"
fi

if [[ -n "$CONTEXT" ]]; then
  jq -n --arg ctx "**Relevant Context:**\n$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
