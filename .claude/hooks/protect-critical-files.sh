#!/bin/bash
# PreToolUse hook: Protect critical files from full rewrites (Write tool)
# Allows Edit tool for modifications, but blocks Write tool on critical files

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Critical files that should be edited, not overwritten
CRITICAL_FILES=(
  "game-types.ts"
  "dungeon-game.tsx"
  "game-data.ts"
  "package.json"
  "tsconfig.json"
  "next.config.ts"
  "tailwind.config.ts"
)

# Only check Write tool (not Edit)
if [[ "$TOOL_NAME" != "Write" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Check if the file is in our critical list
for critical in "${CRITICAL_FILES[@]}"; do
  if [[ "$FILE_PATH" == *"$critical" ]]; then
    # Block the write with a helpful message
    jq -n \
      --arg file "$critical" \
      '{
        "decision": "block",
        "reason": "Protected file: Use Edit tool instead of Write for \($file) to avoid accidental full rewrites"
      }'
    exit 0
  fi
done

# Allow all other writes
echo '{"continue": true}'
exit 0
