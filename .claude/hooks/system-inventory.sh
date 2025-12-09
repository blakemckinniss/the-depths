#!/bin/bash
# SessionStart hook: Inventory existing systems and components
# Reminds Claude what's already built and available for reuse

set -e

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$PROJECT_DIR" 2>/dev/null || cd .

CONTEXT=""

# List all game systems (src/lib/*-system.ts)
if [[ -d "src/lib" ]]; then
  SYSTEMS=$(ls src/lib/*-system.ts 2>/dev/null | sed 's|src/lib/||g' | sed 's|-system.ts||g' | tr '\n' ', ' | sed 's/,$//')
  if [[ -n "$SYSTEMS" ]]; then
    CONTEXT="## Available Systems\n**Game Systems:** $SYSTEMS\n\n"
  fi

  # List hooks
  HOOKS=$(ls src/lib/use-*.ts 2>/dev/null | sed 's|src/lib/||g' | tr '\n' ', ' | sed 's/,$//')
  if [[ -n "$HOOKS" ]]; then
    CONTEXT="$CONTEXT**React Hooks:** $HOOKS\n\n"
  fi
fi

# List UI components (src/components/*.tsx)
if [[ -d "src/components" ]]; then
  COMPONENT_COUNT=$(ls src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
  # Group by category based on naming
  COMBAT_COMPS=$(ls src/components/*.tsx 2>/dev/null | xargs -I{} basename {} .tsx | grep -E 'combat|ability|stance|combo|enemy|weakness' | tr '\n' ', ' | sed 's/,$//')
  ITEM_COMPS=$(ls src/components/*.tsx 2>/dev/null | xargs -I{} basename {} .tsx | grep -E 'item|inventory|loot' | tr '\n' ', ' | sed 's/,$//')
  ENCOUNTER_COMPS=$(ls src/components/*.tsx 2>/dev/null | xargs -I{} basename {} .tsx | grep -E 'npc|shrine|trap|tavern|boss' | tr '\n' ', ' | sed 's/,$//')

  CONTEXT="$CONTEXT## UI Components ($COMPONENT_COUNT total)\n"
  [[ -n "$COMBAT_COMPS" ]] && CONTEXT="$CONTEXT**Combat:** $COMBAT_COMPS\n"
  [[ -n "$ITEM_COMPS" ]] && CONTEXT="$CONTEXT**Items:** $ITEM_COMPS\n"
  [[ -n "$ENCOUNTER_COMPS" ]] && CONTEXT="$CONTEXT**Encounters:** $ENCOUNTER_COMPS\n"
  CONTEXT="$CONTEXT\n"
fi

# List API routes
if [[ -d "src/app/api" ]]; then
  API_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null | sed 's|src/app/api/||g' | sed 's|/route.ts||g' | tr '\n' ', ' | sed 's/,$//')
  if [[ -n "$API_ROUTES" ]]; then
    CONTEXT="$CONTEXT## API Routes\n$API_ROUTES\n\n"
  fi
fi

# Show key types from game-types.ts (if it has exports)
if [[ -f "src/lib/game-types.ts" ]]; then
  KEY_TYPES=$(grep -E "^export (type|interface)" src/lib/game-types.ts 2>/dev/null | sed 's/export type //g' | sed 's/export interface //g' | sed 's/ =.*//g' | sed 's/ {.*//g' | head -15 | tr '\n' ', ' | sed 's/,$//')
  if [[ -n "$KEY_TYPES" ]]; then
    CONTEXT="$CONTEXT## Key Types (game-types.ts)\n$KEY_TYPES\n\n"
  fi
fi

# Check for TODO/FIXME comments in source
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" src/ 2>/dev/null | wc -l | tr -d ' ')
if [[ "$TODO_COUNT" -gt 0 ]]; then
  TOP_TODOS=$(grep -rn "TODO\|FIXME" src/ 2>/dev/null | head -5 | sed 's|src/||g')
  CONTEXT="$CONTEXT## Open TODOs ($TODO_COUNT total)\n\`\`\`\n$TOP_TODOS\n\`\`\`\n\n"
fi

if [[ -n "$CONTEXT" ]]; then
  CONTEXT="$CONTEXT**Reminder:** Check existing systems before creating new ones. Reuse patterns from the codebase.\n"
  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
