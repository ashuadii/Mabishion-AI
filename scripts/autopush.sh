#!/bin/bash
# Mabishion AI — daily git auto-snapshot push (Owner Decision 2026-07-15)
# Safety net: commits any uncommitted changes on dev and pushes to GitHub.
REPO="/home/admin-ubuntu/Desktop/Mabishion-AI/Mabishion Software"
cd "$REPO" || exit 1

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "dev" ]; then
  echo "[autopush] Skipped: on branch '$BRANCH', only dev is auto-pushed."
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: auto-snapshot $(date '+%Y-%m-%d %H:%M')"
fi

git push origin dev 2>&1
