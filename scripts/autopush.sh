#!/bin/bash
# Mabishion AI — daily git auto-snapshot push (Owner Decision 2026-07-15)
# Safety net: commits any uncommitted changes on main and pushes to GitHub.
# Single-branch repo since 2026-07-16 (owner decision) — main is the only branch.
REPO="/home/admin-ubuntu/Desktop/Mabishion-AI/Mabishion Software"
cd "$REPO" || exit 1

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "[autopush] Skipped: on branch '$BRANCH', only main is auto-pushed."
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: auto-snapshot $(date '+%Y-%m-%d %H:%M')"
fi

git push origin main 2>&1
