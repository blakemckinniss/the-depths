#!/bin/bash
# UserPromptSubmit hook: Remind about existing patterns when adding new features
# Prevents reinventing the wheel

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')
CONTEXT=""

# Adding new system
if echo "$PROMPT_LOWER" | grep -qE 'add.*system|create.*system|new.*system|implement.*system'; then
  EXISTING=$(ls src/lib/*-system.ts 2>/dev/null | sed 's|src/lib/||g' | tr '\n' ', ' | sed 's/,$//')
  CONTEXT="$CONTEXT**Before creating a new system, check existing ones:**\n$EXISTING\n\n"
  CONTEXT="$CONTEXT**System Pattern:** Create \`src/lib/<name>-system.ts\`, add types to game-types.ts, integrate in dungeon-game.tsx\n\n"
fi

# Adding new component
if echo "$PROMPT_LOWER" | grep -qE 'add.*component|create.*component|new.*component'; then
  CONTEXT="$CONTEXT**Component Pattern:**\n"
  CONTEXT="$CONTEXT- Create in \`src/components/<name>.tsx\`\n"
  CONTEXT="$CONTEXT- Use props (no external state library)\n"
  CONTEXT="$CONTEXT- Import and use in dungeon-game.tsx render section\n\n"
fi

# Adding new API route
if echo "$PROMPT_LOWER" | grep -qE 'add.*api|create.*api|new.*route|add.*endpoint'; then
  EXISTING_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null | sed 's|src/app/api/||g' | sed 's|/route.ts||g' | tr '\n' ', ' | sed 's/,$//')
  CONTEXT="$CONTEXT**Existing API Routes:** $EXISTING_ROUTES\n\n"
  CONTEXT="$CONTEXT**AI Route Pattern:**\n"
  CONTEXT="$CONTEXT1. Create \`src/app/api/<name>/route.ts\`\n"
  CONTEXT="$CONTEXT2. Define Zod schema in ai-schemas.ts\n"
  CONTEXT="$CONTEXT3. Create React hook \`src/lib/use-<name>.ts\`\n"
  CONTEXT="$CONTEXT4. Use @ai-sdk/groq with schema validation\n\n"
fi

# Adding new effect/status
if echo "$PROMPT_LOWER" | grep -qE 'add.*effect|new.*effect|create.*buff|create.*debuff|new.*status'; then
  CONTEXT="$CONTEXT**Effect System Pattern:**\n"
  CONTEXT="$CONTEXT- Effects defined in effect-system.ts\n"
  CONTEXT="$CONTEXT- Use effect-factory.ts for creation helpers\n"
  CONTEXT="$CONTEXT- Effect combos in effect-combo-system.ts (e.g., fire+oil=explosion)\n"
  CONTEXT="$CONTEXT- Tick processing in processTurnEffects (lines 909-991)\n\n"
fi

# Adding new ability
if echo "$PROMPT_LOWER" | grep -qE 'add.*ability|new.*ability|create.*ability|new.*skill'; then
  CONTEXT="$CONTEXT**Ability System Pattern:**\n"
  CONTEXT="$CONTEXT- Abilities in ability-system.ts\n"
  CONTEXT="$CONTEXT- Sustained abilities in sustained-ability-system.ts\n"
  CONTEXT="$CONTEXT- Ability types in game-types.ts (Ability interface)\n"
  CONTEXT="$CONTEXT- Execution in handleUseAbility (lines 994-1201)\n\n"
fi

# Adding new enemy type
if echo "$PROMPT_LOWER" | grep -qE 'add.*enemy|new.*enemy|create.*enemy|new.*monster|add.*boss'; then
  CONTEXT="$CONTEXT**Enemy System Pattern:**\n"
  CONTEXT="$CONTEXT- Enemy generators in game-data.ts\n"
  CONTEXT="$CONTEXT- Rank scaling in enemy-rank-system.ts (elite/champion/boss)\n"
  CONTEXT="$CONTEXT- AI generation via /api/entity-generator\n"
  CONTEXT="$CONTEXT- Combat AI in combat-system.ts\n\n"
fi

if [[ -n "$CONTEXT" ]]; then
  jq -n --arg ctx "**Implementation Guidance:**\n$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
