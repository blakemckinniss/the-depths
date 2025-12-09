#!/bin/bash
# UserPromptSubmit hook: Remind Claude to use beads for task management
# Triggers on task-related keywords to reinforce beads usage

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

# Convert prompt to lowercase for matching
PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')

CONTEXT=""

# Check for task/planning related keywords
if echo "$PROMPT_LOWER" | grep -qE 'task|todo|plan|implement|feature|bug|fix|add|create|build|refactor|update|change|modify|issue|track|work on|start'; then
  # Get current beads status for context
  if command -v bd &> /dev/null; then
    OPEN_COUNT=$(bd list --json 2>/dev/null | jq 'map(select(.status != "done")) | length' 2>/dev/null || echo "0")
    IN_PROGRESS=$(bd list --json 2>/dev/null | jq 'map(select(.status == "in_progress")) | length' 2>/dev/null || echo "0")
    READY_COUNT=$(bd ready --json 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

    CONTEXT="**REMINDER: Use beads (bd) for task management, NOT TodoWrite.**\n"
    CONTEXT="$CONTEXT- Open issues: $OPEN_COUNT | In progress: $IN_PROGRESS | Ready: $READY_COUNT\n"
    CONTEXT="$CONTEXT- Check existing: \`bd list\` or \`bd ready\`\n"
    CONTEXT="$CONTEXT- Create issue: \`bd create \"description\"\`\n"
    CONTEXT="$CONTEXT- Start work: \`bd update <id> --status in_progress\`\n"
    CONTEXT="$CONTEXT- Complete: \`bd close <id> --reason \"done\"\`\n"
  fi
fi

if [[ -n "$CONTEXT" ]]; then
  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
