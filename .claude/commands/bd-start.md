# Start Working on Issue

Mark an issue as in progress. The argument is the issue ID.

First, show current ready issues:

```bash
bd ready
```

Then mark the specified issue (or ask user which one) as in progress:

```bash
bd update $ARGUMENTS --status in_progress
```

If no argument provided, show ready issues and ask the user which to start.
