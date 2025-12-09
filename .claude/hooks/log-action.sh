#!/bin/bash
# PostToolUse hook: Log significant file modifications to session log
# Creates a trail of what was changed for future reference

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

SESSION_LOG=".claude/session-log.md"

# Only log Write and Edit operations on source files
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Only log src/ changes (skip config files, etc.)
if [[ ! "$FILE_PATH" =~ ^.*src/.* ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Extract relative path
REL_PATH=$(echo "$FILE_PATH" | sed "s|$PROJECT_DIR/||g")

# Log the action
TIMESTAMP=$(date '+%H:%M:%S')
echo "- [$TIMESTAMP] $TOOL_NAME: \`$REL_PATH\`" >> "$SESSION_LOG" 2>/dev/null || true

echo '{"continue": true}'
exit 0
