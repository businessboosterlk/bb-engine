#!/bin/bash
# THE ENGINE'S OWN REFRESH (Thulaib said yes, 7 Oct 2026: "wire everything").
# Runs from ~/bb-intelligence-backup/bb-end.sh every 6 hours. Reads the live tables, seals them, runs the full
# gate and publishes ONLY on green. A red gate or a database that does not answer keeps the last good Engine
# live and writes ~/bb-systems/bb-engine/ENGINE-FAILING.txt with the reason. Never bypass the gate here.
export PATH="$HOME/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
cd "$(dirname "$0")/.." || exit 1
LOG=engine/local/refresh.log; mkdir -p engine/local
STAMP="$(date '+%Y-%m-%d %H:%M')"
# 1. the forecast file from the finance scripts (Python stays the source of every forecast number)
python3 "$HOME/bb-consultancy/finance/export_engine_forecast.py" >/dev/null 2>&1 || true
# 2. read the live tables, re-add every total, seal; 3. stamp, full gate, publish, read the live files back
if OUT="$( { node engine/build-engine-data.mjs && bash scripts/deploy-pages.sh; } 2>&1)"; then
  rm -f ENGINE-FAILING.txt
  echo "$STAMP ok $(printf '%s' "$OUT" | grep -E 'published|verified|LIVE' | tail -1 | cut -c1-140)" >> "$LOG"
  echo "engine refreshed and published"
else
  printf '%s\nThe Engine did not refresh. The last good version is still live.\n\n%s\n' "$STAMP" "$(printf '%s' "$OUT" | grep -E 'FAIL|RED|NOT PUBLISHED|did not answer|HTTP' | head -12)" > ENGINE-FAILING.txt
  echo "$STAMP FAILED $(printf '%s' "$OUT" | grep -E 'NOT PUBLISHED|RED' | tail -1)" >> "$LOG"
  echo "engine NOT refreshed: see ~/bb-systems/bb-engine/ENGINE-FAILING.txt"; exit 1
fi
