#!/bin/bash
# PreToolUse hook: Warn about console.log statements in production code
# Helps keep production code clean

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""')

# Only process Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Skip non-source files
if [[ ! "$FILE_PATH" =~ ^.*src/.*\.(ts|tsx|js|jsx)$ ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Allow console statements in dev-panel.tsx (it's a debug component)
if [[ "$FILE_PATH" == *"dev-panel"* ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Check for console.log, console.debug, console.info (allow console.error/warn)
if echo "$CONTENT" | grep -qE 'console\.(log|debug|info)\('; then
  jq -n '{
    "continue": true,
    "systemMessage": "Detected console.log/debug/info - consider removing before committing or wrap in dev-only condition:\nif (process.env.NODE_ENV === \"development\") { console.log(...) }"
  }'
else
  echo '{"continue": true}'
fi

exit 0
