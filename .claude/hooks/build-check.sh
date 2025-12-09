#!/bin/bash
# Stop hook: Quick TypeScript check before ending session
# Warns if there are type errors that should be fixed

set -e

# Run TypeScript check
ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "error TS" | head -8 || true)

if [[ -n "$ERRORS" ]]; then
  ERROR_COUNT=$(echo "$ERRORS" | wc -l | tr -d ' ')
  jq -n \
    --arg errors "$ERRORS" \
    --arg count "$ERROR_COUNT" \
    '{
      "continue": true,
      "stopReason": "warning",
      "systemMessage": "Session ending with \($count) TypeScript error(s). Consider fixing:\n\($errors)"
    }'
else
  echo '{"continue": true}'
fi

exit 0
