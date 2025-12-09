# Create Beads Issue

Create a new issue to track work. The argument after the command is the issue title.

```bash
bd create "$ARGUMENTS"
```

After creating, the issue ID will be shown. Use this ID to:
- Start work: `bd update <id> --status in_progress`
- Add dependencies: `bd dep add <id> --blocks <other-id>`
- Close when done: `bd close <id> --reason "completed"`

If no argument provided, ask the user what issue to create.
