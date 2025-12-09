#!/bin/bash
# SessionStart hook: Load persistent project memory and recent session context
# Provides Claude with notes from previous sessions and ongoing context

set -e

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$PROJECT_DIR" 2>/dev/null || cd .

MEMORY_FILE=".claude/memory.md"
SESSION_LOG=".claude/session-log.md"
CONTEXT=""

# Load persistent memory notes (things to remember across sessions)
if [[ -f "$MEMORY_FILE" ]]; then
  MEMORY_CONTENT=$(cat "$MEMORY_FILE" 2>/dev/null | head -100)
  if [[ -n "$MEMORY_CONTENT" ]]; then
    CONTEXT="## Project Memory\n$MEMORY_CONTENT\n\n"
  fi
fi

# Load recent session log entries (last 20 lines)
if [[ -f "$SESSION_LOG" ]]; then
  RECENT_LOG=$(tail -30 "$SESSION_LOG" 2>/dev/null)
  if [[ -n "$RECENT_LOG" ]]; then
    CONTEXT="$CONTEXT## Recent Session Activity\n$RECENT_LOG\n\n"
  fi
fi

# Add current session start marker to log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "\n---\n### Session: $TIMESTAMP" >> "$SESSION_LOG" 2>/dev/null || true

if [[ -n "$CONTEXT" ]]; then
  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
