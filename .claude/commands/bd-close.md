# Close Issue

Close an issue as completed. The argument is the issue ID.

First, show current in-progress issues:

```bash
bd list --json | jq '.[] | select(.status == "in_progress")'
```

Then close the specified issue:

```bash
bd close $ARGUMENTS --reason "completed"
```

If no argument provided, show in-progress issues and ask the user which to close and why.
