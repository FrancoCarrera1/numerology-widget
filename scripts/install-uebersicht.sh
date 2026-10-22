#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/uebersicht/DailyEnergy.widget"
DEST="$HOME/Library/Application Support/Übersicht/widgets"

if [ ! -d "/Applications/Übersicht.app" ]; then
  echo "Übersicht is not installed."
  echo "Install it with:  brew install --cask uebersicht"
  echo "Then run:         npm run install:uebersicht"
  exit 1
fi

if [ ! -f "$SRC/index.jsx" ]; then
  echo "Widget not built. Run: npm run build:uebersicht"
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST/DailyEnergy.widget"
cp -R "$SRC" "$DEST/DailyEnergy.widget"

echo "Installed DailyEnergy.widget to:"
echo "  $DEST/DailyEnergy.widget"
echo
echo "Übersicht reloads widgets automatically. If it does not appear,"
echo "choose 'Refresh all Widgets' from the Übersicht menu."
