#!/bin/bash
# PostToolUse hook: Detect potential React state mutations
# Catches common anti-patterns that cause bugs in React

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

# Only check TypeScript/React files
if [[ ! "$FILE_PATH" =~ \.(tsx?)$ ]]; then
  echo '{"continue": true}'
  exit 0
fi

WARNINGS=""

# Check for array mutation methods
if echo "$CONTENT" | grep -qE '\.(push|pop|shift|unshift|splice|sort|reverse)\s*\('; then
  # Exclude cases where it's clearly on a new array (e.g., [...arr].sort())
  if ! echo "$CONTENT" | grep -qE '\[\.\.\.[^]]+\]\.(sort|reverse)\('; then
    WARNINGS="$WARNINGS- Array mutation detected (.push/.pop/.splice/etc). Use spread: [...array, newItem]\n"
  fi
fi

# Check for direct property assignment that might be state mutation
# Look for patterns like: state.property = value or obj.field = value inside set functions
if echo "$CONTENT" | grep -qE 'set[A-Z][a-zA-Z]*\([^)]*\.[a-zA-Z]+\s*='; then
  WARNINGS="$WARNINGS- Possible state mutation in setter. Use spread: setState({...prev, key: value})\n"
fi

if [[ -n "$WARNINGS" ]]; then
  jq -n \
    --arg w "$WARNINGS" \
    '{
      "continue": true,
      "systemMessage": "Potential state mutation patterns detected:\n\($w)\nUse immutable updates for React state to ensure proper re-renders."
    }'
else
  echo '{"continue": true}'
fi

exit 0
