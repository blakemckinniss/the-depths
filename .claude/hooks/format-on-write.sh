#!/bin/bash
# PostToolUse hook: Auto-format TypeScript/JS files after Write or Edit
# Uses Prettier if available, otherwise skips silently

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only process Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Only format TypeScript, JavaScript, JSON, CSS files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|css)$ ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Skip node_modules and build directories
if [[ "$FILE_PATH" == *"node_modules"* || "$FILE_PATH" == *".next"* ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Try to format with Prettier (fail silently if not available)
if command -v npx &> /dev/null && [[ -f "$FILE_PATH" ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

echo '{"continue": true}'
exit 0
