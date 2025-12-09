#!/bin/bash
# Pre-commit hook: Run build to catch type errors before committing

echo "Running type check..."
npm run build --quiet

if [ $? -ne 0 ]; then
    echo "Build failed. Fix errors before committing."
    exit 1
fi

echo "Build passed."
exit 0
