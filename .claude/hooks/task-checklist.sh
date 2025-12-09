#!/bin/bash
# UserPromptSubmit hook: Static task checklist injector
# Provides a consistent order of operations checklist for every task

set -e

# Read stdin but we don't need to parse it - this is a static injection
cat > /dev/null

# Output static checklist as additional context
cat << 'EOF'
{
  "continue": true,
  "additionalContext": "## Task Checklist - Order of Operations\n\n**Before starting, ask yourself:**\n\n- [ ] **Research needed?** Should I use WebSearch/WebFetch to find current docs, patterns, or solutions?\n- [ ] **Existing functionality?** Does this already exist in the codebase? Check with Grep/Glob first.\n- [ ] **Use an agent?** Would Task(Explore), Task(Plan), or another subagent complete this faster/better?\n- [ ] **Anti-patterns?** Will this introduce complexity, tight coupling, or violate existing patterns?\n- [ ] **Slash commands?** Check `/home/blake/workspace/the-depths/.claude/commands/` for: bd-*, add-ai, add-system, component, handler, monolith, system, types\n- [ ] **Track with beads?** Should I use `bd create` or `bd update` to track this task?\n- [ ] **Parallelize?** Can I create a script or use multiple agents to complete this faster?\n- [ ] **Speed vs quality?** What's the fastest path that maintains code quality?\n\n**After completing:**\n\n- [ ] **Next steps?** Should I suggest follow-up actions to the user?\n- [ ] **Tests needed?** Should I create or update tests for this change?\n- [ ] **Validate?** Did I verify the change works (build, lint, typecheck)?\n- [ ] **Tech debt?** Did I clean up any related issues I noticed?\n- [ ] **Inform user?** Is there anything important the user should know?"
}
EOF

exit 0
