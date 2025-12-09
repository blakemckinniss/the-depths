#!/bin/bash
# PostToolUse hook: Validate AI schemas after editing ai-schemas.ts
# Reminds about schema consistency across the codebase

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only process Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Only check ai-schemas.ts
if [[ "$FILE_PATH" != *"ai-schemas.ts" ]]; then
  echo '{"continue": true}'
  exit 0
fi

# Find API routes that might use these schemas
API_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null | sed 's|src/app/api/||g' | sed 's|/route.ts||g' | tr '\n' ', ' | sed 's/,$//' || echo "none found")

jq -n \
  --arg routes "$API_ROUTES" \
  '{
    "continue": true,
    "systemMessage": "Edited ai-schemas.ts. Verification checklist:\n1. All AI routes using updated schemas: \($routes)\n2. Schema matches expected AI response structure\n3. Optional fields have .optional() or .default()\n4. Run `npm run typecheck` to verify schema usage"
  }'

exit 0
