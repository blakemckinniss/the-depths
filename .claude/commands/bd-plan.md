# Plan Work with Beads

Break down a task into tracked issues with dependencies.

1. First, understand the task from user input: $ARGUMENTS

2. Show current issues for context:
```bash
bd list
```

3. Create issues for each step of the work. For each issue:
```bash
bd create "Issue title"
```

4. Add dependencies between issues:
```bash
bd dep add <child-id> --blocked-by <parent-id>
```

5. Show the dependency tree:
```bash
bd dep tree <root-id>
```

6. Start work on the first ready issue:
```bash
bd ready
bd update <id> --status in_progress
```

If no argument provided, ask the user what they want to plan.
