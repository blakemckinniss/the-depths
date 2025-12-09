#!/bin/bash
# SessionStart hook: Verify environment and provide project context
# Checks for required dependencies and environment variables

set -e

# Read JSON input from stdin
INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // "."')

cd "$PROJECT_DIR" 2>/dev/null || cd .

WARNINGS=""
CONTEXT=""

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
  WARNINGS="$WARNINGS- Dependencies not installed. Run 'npm install' first.\n"
fi

# Check for .env.local with GROQ_API_KEY
if [[ -f ".env.local" ]]; then
  if grep -q "GROQ_API_KEY" .env.local 2>/dev/null; then
    CONTEXT="$CONTEXT- GROQ_API_KEY configured for AI features\n"
  else
    WARNINGS="$WARNINGS- GROQ_API_KEY not found in .env.local (AI features won't work)\n"
  fi
else
  WARNINGS="$WARNINGS- No .env.local file found (copy from .env.example if it exists)\n"
fi

# Check if Next.js dev server might already be running
if lsof -i:3000 &>/dev/null 2>&1; then
  CONTEXT="$CONTEXT- Port 3000 is in use (dev server may already be running)\n"
fi

# Build the output message
MESSAGE=""
if [[ -n "$WARNINGS" ]]; then
  MESSAGE="Setup Warnings:\n$WARNINGS"
fi
if [[ -n "$CONTEXT" ]]; then
  MESSAGE="$MESSAGE\nEnvironment:\n$CONTEXT"
fi

if [[ -n "$MESSAGE" ]]; then
  jq -n \
    --arg msg "$MESSAGE" \
    '{
      "continue": true,
      "additionalContext": $msg
    }'
else
  echo '{"continue": true}'
fi

exit 0
