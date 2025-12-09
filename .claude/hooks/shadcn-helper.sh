#!/bin/bash
# UserPromptSubmit hook: Guide proper shadcn/ui component usage
# Helps with correct imports and patterns

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')

PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')

# Check if prompt mentions UI components or shadcn
if echo "$PROMPT_LOWER" | grep -qE 'shadcn|ui component|add.*button|add.*dialog|add.*modal|add.*tooltip|add.*card|add.*dropdown|add.*select|add.*input|add.*form|radix'; then

  # List existing UI components
  UI_COMPONENTS=$(ls src/components/ui/*.tsx 2>/dev/null | xargs -I {} basename {} .tsx | tr '\n' ', ' | sed 's/,$//' || echo "none")

  CONTEXT="**shadcn/ui Pattern:**

**Import Format:**
\`\`\`typescript
import { Button } from \"@/components/ui/button\"
import { Dialog, DialogContent, DialogTrigger } from \"@/components/ui/dialog\"
\`\`\`

**Add New Components:**
\`\`\`bash
npx shadcn@latest add <component-name>
\`\`\`

**Existing UI Components:** $UI_COMPONENTS

**Notes:**
- Components use Radix UI primitives under the hood
- Styling via Tailwind v4 + class-variance-authority
- Customize in \`src/components/ui/<component>.tsx\`
- Use \`cn()\` utility from \`@/lib/utils\` for conditional classes"

  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
