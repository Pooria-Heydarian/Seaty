#!/usr/bin/env bash
# Commits the city data (web/data, reports, data) and pushes it to main.
# If someone pushed to main while the run was working, it rebases on top and tries again.
#
#   bash .github/scripts/commit-data.sh "City update 2026-11-14"
set -uo pipefail

message="${1:-City update $(date -u +%F)}"

git config user.name "seaty-bot"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add web/data reports data 2>/dev/null || true
if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi
git commit -q -m "$message"

for attempt in 1 2 3 4 5; do
  git fetch -q origin main
  if ! git rebase -q origin/main; then
    files=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
    git rebase --abort
    echo "::error title=Could not save the city data::Someone changed the same file(s) on main while this run was working: ${files}. Run the workflow again (Actions -> Daily city update -> Run workflow)."
    exit 1
  fi
  if git push -q origin HEAD:main; then
    echo "Pushed: $message"
    exit 0
  fi
  echo "Push rejected (main moved on). Retrying in $((attempt * 5))s…"
  sleep $((attempt * 5))
done

echo "::error title=Could not save the city data::Pushing to main failed 5 times. Run the workflow again."
exit 1
