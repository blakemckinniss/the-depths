#!/bin/bash
# Stop hook: Add session end marker and summary prompt
# Helps maintain continuity between sessions

set -e

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

SESSION_LOG=".claude/session-log.md"

# Add session end marker
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "\n**Session ended:** $TIMESTAMP\n" >> "$SESSION_LOG" 2>/dev/null || true

# Check for uncommitted changes to remind about
UNCOMMITTED=""
if git rev-parse --git-dir &> /dev/null; then
  UNCOMMITTED=$(git status --porcelain 2>/dev/null || echo "")
fi

if [[ -n "$UNCOMMITTED" ]]; then
  MODIFIED_COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d ' ')
  jq -n \
    --arg count "$MODIFIED_COUNT" \
    '{
      "continue": true,
      "systemMessage": "Session ending with \($count) uncommitted file(s). Consider: 1) Committing changes, 2) Adding notes to .claude/memory.md for next session."
    }'
else
  jq -n '{
    "continue": true,
    "systemMessage": "Tip: Add important context or decisions to .claude/memory.md for future sessions."
  }'
fi

exit 0
