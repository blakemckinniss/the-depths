#!/bin/bash
# Stop hook: Check for uncommitted changes before Claude stops working
# Reminds to commit if there are pending changes

set -e

# Read JSON input from stdin
INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

# Check if we're in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
  echo '{"continue": true}'
  exit 0
fi

# Check for uncommitted changes (staged or unstaged)
UNCOMMITTED=$(git status --porcelain 2>/dev/null || echo "")

if [[ -n "$UNCOMMITTED" ]]; then
  # Count modified files
  MODIFIED_COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d ' ')

  # Get list of changed files (first 5)
  CHANGED_FILES=$(echo "$UNCOMMITTED" | head -5 | awk '{print $2}' | tr '\n' ', ' | sed 's/,$//')

  jq -n \
    --arg count "$MODIFIED_COUNT" \
    --arg files "$CHANGED_FILES" \
    '{
      "continue": true,
      "systemMessage": "Note: There are \($count) uncommitted file(s): \($files). Consider committing these changes if the work is complete."
    }'
  exit 0
fi

echo '{"continue": true}'
exit 0
