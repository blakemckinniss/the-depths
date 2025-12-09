#!/bin/bash
# SessionStart hook: Provide git history context for grounding
# Shows recent commits, current branch state, and uncommitted work

set -e

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')
cd "$PROJECT_DIR" 2>/dev/null || cd .

# Check if we're in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
  echo '{"continue": true}'
  exit 0
fi

CONTEXT=""

# Current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CONTEXT="## Git Context\n**Branch:** \`$BRANCH\`\n\n"

# Recent commits (last 10) with files changed
RECENT_COMMITS=$(git log --oneline --no-decorate -10 2>/dev/null || echo "")
if [[ -n "$RECENT_COMMITS" ]]; then
  CONTEXT="$CONTEXT### Recent Commits\n\`\`\`\n$RECENT_COMMITS\n\`\`\`\n\n"
fi

# Files changed in last 5 commits (to understand recent work areas)
RECENT_FILES=$(git diff --name-only HEAD~5..HEAD 2>/dev/null | sort -u | head -20 || echo "")
if [[ -n "$RECENT_FILES" ]]; then
  CONTEXT="$CONTEXT### Recently Modified Files\n\`\`\`\n$RECENT_FILES\n\`\`\`\n\n"
fi

# Current uncommitted changes summary
UNCOMMITTED=$(git status --porcelain 2>/dev/null || echo "")
if [[ -n "$UNCOMMITTED" ]]; then
  UNCOMMITTED_COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d ' ')
  UNCOMMITTED_FILES=$(echo "$UNCOMMITTED" | head -10 | awk '{print $1, $2}')
  CONTEXT="$CONTEXT### Uncommitted Changes ($UNCOMMITTED_COUNT files)\n\`\`\`\n$UNCOMMITTED_FILES\n\`\`\`\n\n"
fi

# Stashed work (often forgotten)
STASH_COUNT=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
if [[ "$STASH_COUNT" -gt 0 ]]; then
  STASH_LIST=$(git stash list 2>/dev/null | head -3)
  CONTEXT="$CONTEXT### Stashed Work ($STASH_COUNT entries)\n\`\`\`\n$STASH_LIST\n\`\`\`\n\n"
fi

if [[ -n "$CONTEXT" ]]; then
  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
