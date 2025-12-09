# Manage Issue Dependencies

View and manage dependencies between issues.

Show dependency tree for an issue:
```bash
bd dep tree $ARGUMENTS
```

Add a blocking dependency (issue blocks another):
```bash
bd dep add <issue-id> --blocks <blocked-issue-id>
```

Add a blocked-by dependency:
```bash
bd dep add <issue-id> --blocked-by <blocking-issue-id>
```

List all dependencies:
```bash
bd dep list
```

If no argument provided, show dependency overview for all issues.
