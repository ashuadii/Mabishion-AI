#!/bin/bash
# Mabishion AI — off-machine backup copy (Owner Decision 2026-07-16)
#
# Copies the newest DB backup into the MEGA sync folder so business data survives
# a dead/stolen laptop. The app itself does NOT do this: writing outside its own
# data dir would require granting it write access to the whole home directory.
#
# REQUIREMENT: MEGAsync must be installed AND syncing ~/MEGA, otherwise this only
# makes a second local copy and provides NO off-machine protection.

SRC="$HOME/.local/share/com.mabishion.factory/backups"
DEST="$HOME/MEGA/mabishion-backups"
KEEP=7   # ~869 KB each → about 6 MB total

if [ ! -d "$SRC" ]; then
  echo "[mega-backup] Source not found: $SRC — has the app ever run?"
  exit 1
fi

LATEST=$(ls -1t "$SRC"/mabishion_db_*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "[mega-backup] No backup files found in $SRC"
  exit 1
fi

mkdir -p "$DEST" || exit 1
cp -n "$LATEST" "$DEST/" 2>/dev/null
echo "[mega-backup] Copied $(basename "$LATEST") -> $DEST"

# Keep only the newest $KEEP copies
ls -1t "$DEST"/mabishion_db_*.json 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "[mega-backup] Pruned $(basename "$old")"
done

# Loud warning: without a running sync client this is NOT an off-machine backup.
if ! pgrep -x megasync > /dev/null 2>&1; then
  echo "[mega-backup] WARNING: MEGAsync is not running — this copy is still only on this laptop."
fi
