#!/bin/bash
# UserPromptSubmit hook: Inject context when discussing AI/Groq features
# Ensures consistent patterns for AI integration

set -e

INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""')

PROMPT_LOWER=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]')

# Check if prompt mentions AI-related features
if echo "$PROMPT_LOWER" | grep -qE 'groq|ai api|ai route|llm|narrative|dungeon master|entity generator|ai.generat|generateobject|generatetext'; then
  CONTEXT="**Groq AI Integration Pattern:**

- Use \`@ai-sdk/groq\` with Vercel AI SDK
- Structured output: \`generateObject({ model, schema, prompt })\`
- Always define Zod schema in \`src/lib/ai-schemas.ts\`
- Handle errors gracefully with fallback content
- Mark AI-generated entities with \`aiGenerated: true\`

**Models:**
- \`compound-beta\` - Complex reasoning tasks
- \`llama-3.3-70b-versatile\` - General purpose

**Existing AI Routes:**
- /api/dungeon-master - Narrative generation
- /api/entity-generator - Dynamic entity creation
- /api/npc-dialogue - NPC conversations
- /api/drops - AI loot generation
- /api/alchemy - Recipe generation
- /api/identify - Item identification
- /api/loot-container - Container contents
- /api/event-chain - Event sequencing"

  jq -n --arg ctx "$CONTEXT" '{"continue": true, "additionalContext": $ctx}'
else
  echo '{"continue": true}'
fi

exit 0
