#!/bin/bash
# PostToolUse hook: Run TypeScript type checking after file edits
# Catches type errors immediately after changes

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only process Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Only check TypeScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Run TypeScript check and capture errors related to src/ files
ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "^src/.*error TS" | head -10 || true)

if [[ -n "$ERRORS" ]]; then
  ERROR_COUNT=$(echo "$ERRORS" | wc -l | tr -d ' ')
  jq -n \
    --arg errors "$ERRORS" \
    --arg count "$ERROR_COUNT" \
    '{
      "continue": true,
      "systemMessage": "TypeScript found \($count) type error(s). Please fix:\n\($errors)"
    }'
else
  echo '{"continue": true}'
fi

exit 0
