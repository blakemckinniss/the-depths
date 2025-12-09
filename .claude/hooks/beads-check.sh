#!/bin/bash
# SessionStart hook: Verify beads is installed and initialized
# BLOCKS session start if beads is not available

set -e

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

# Check if bd command is available
if ! command -v bd &> /dev/null; then
  jq -n '{
    "continue": false,
    "reason": "BLOCKED: beads (bd) is not installed.\n\nInstall with: npm install -g @beads/bd\n\nBeads is REQUIRED for task management in this project. See CLAUDE.md for details."
  }'
  exit 0
fi

# Check if beads is initialized in this project
if [[ ! -d ".beads" ]]; then
  jq -n '{
    "continue": false,
    "reason": "BLOCKED: beads is not initialized in this project.\n\nRun: bd init\n\nBeads is REQUIRED for task management. See CLAUDE.md for details."
  }'
  exit 0
fi

# Check if database exists
if [[ ! -f ".beads/beads.db" ]]; then
  jq -n '{
    "continue": false,
    "reason": "BLOCKED: beads database not found.\n\nRun: bd init\n\nBeads is REQUIRED for task management. See CLAUDE.md for details."
  }'
  exit 0
fi

# Beads is available - provide status context
VERSION=$(bd --version 2>/dev/null | head -1 || echo "unknown")
OPEN_COUNT=$(bd list --json 2>/dev/null | jq 'map(select(.status != "done")) | length' 2>/dev/null || echo "0")
IN_PROGRESS=$(bd list --json 2>/dev/null | jq 'map(select(.status == "in_progress")) | length' 2>/dev/null || echo "0")
READY_COUNT=$(bd ready --json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

CONTEXT="**Beads Task Management Active** ($VERSION)\n"
CONTEXT="$CONTEXT- Open issues: $OPEN_COUNT | In progress: $IN_PROGRESS | Ready to work: $READY_COUNT\n"
CONTEXT="$CONTEXT- Use \`bd list\` to see all issues, \`bd ready\` for actionable tasks\n"
CONTEXT="$CONTEXT- **Do NOT use TodoWrite** - use beads commands instead\n"

jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
exit 0
