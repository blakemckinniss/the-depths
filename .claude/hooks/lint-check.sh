#!/bin/bash
# PostToolUse hook: Run ESLint on modified TypeScript files
# Provides feedback to Claude if there are linting errors

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

# Only lint TypeScript/JavaScript source files
if [[ ! "$FILE_PATH" =~ ^.*src/.*\.(ts|tsx|js|jsx)$ ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Run ESLint on the specific file
LINT_OUTPUT=$(npx eslint "$FILE_PATH" --format compact 2>&1 || true)

# Check if there are errors (not just warnings)
if echo "$LINT_OUTPUT" | grep -q "Error -"; then
  ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "Error -" || echo "0")
  jq -n \
    --arg errors "$LINT_OUTPUT" \
    --arg count "$ERROR_COUNT" \
    '{
      "continue": true,
      "systemMessage": "ESLint found \($count) error(s) in the file. Please review and fix:\n\($errors)"
    }'
  exit 0
fi

echo '{"continue": true}'
exit 0
