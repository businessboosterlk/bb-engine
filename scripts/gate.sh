#!/usr/bin/env bash
# THE ENGINE GATE. Every check the Engine has, cheapest to fail first, each with its count. Nothing is
# published unless every line here is green.
#   bash scripts/gate.sh            build, then every check
#   bash scripts/gate.sh --quick    skip the long browser runs (walk, click path)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"; export PATH="$HOME/.local/node/bin:$PATH"
QUICK="${1:-}"; FAIL=0; N=0
run(){ local name="$1"; shift; N=$((N+1)); local out; out="$("$@" 2>&1)"; local code=$?
  local line; line="$(printf '%s\n' "$out" | grep -E 'RESULT|passed\.|^PASS|^FAIL|EVERY SCREEN|CLICK PATH:|SELFTEST:|stack standard|stamped|wrote' | tail -1)"
  if [ $code -eq 0 ]; then printf 'PASS  %-28s %s\n' "$name" "${line:0:150}"; else FAIL=$((FAIL+1)); printf 'FAIL  %-28s %s\n' "$name" "${line:0:150}"; printf '%s\n' "$out" | grep -E '^ *FAIL|NOT FOUND|rror' | head -12 | sed 's/^/        /'; fi; }
nonative(){ local hits; hits="$(grep -rnE '(^|[^.a-zA-Z])(confirm|prompt|alert)\(' apps/web/src/app --include='*.ts' || true)"; [ -z "$hits" ] && echo "PASS  the app asks its own questions: no browser confirm, prompt or alert in the source" || { echo "FAIL  browser boxes in the source:"; echo "$hits"; return 1; }; }
insets(){ local t b; t=$(grep -rhoE 'var\(--sat\)' apps/web/src | wc -l | tr -d ' '); b=$(grep -rhoE 'var\(--sab\)' apps/web/src | wc -l | tr -d ' '); [ "$t" -ge 6 ] && [ "$b" -ge 6 ] && echo "PASS  the insets are USED, not only declared: --sat $t times, --sab $b times" || { echo "FAIL  the insets are declared and barely used: --sat $t, --sab $b"; return 1; }; }
style(){ local out code n; n=$(wc -l < evidence/gallery/words.txt | tr -d ' '); [ "$n" -ge 60 ] || { echo "FAIL  only $n lines of words were read: the walk did not write them"; return 1; }
  out="$(python3 "$HOME/bb-consultancy/house_style.py" evidence/gallery/words.txt)"; code=$?; echo "$out" | grep -F '[FAIL]'; echo "$([ $code -eq 0 ] && echo PASS || echo FAIL)  $n lines a person can read, $(echo "$out" | grep -cF '[OK') of $(echo "$out" | grep -cE '^\[') house style rules hold"; return $code; }
firsttry(){ local out code; out="$(node "$HOME/bb-systems/qa/first-try.mjs" "$@")"; code=$?; echo "$out" | grep -E 'FAIL F'; echo "$([ $code -eq 0 ] && echo PASS || echo FAIL)  $(echo "$out" | grep -cE '  PASS') of $# files pass the first try rules, $(echo "$out" | grep -cE 'WARN') to read"; return $code; }
nomoney(){ node -e "const b=require('./apps/web/public/data/engine.enc.json'); const v=require('fs').readFileSync('./apps/web/public/data/vault.enc.json','utf8'); if(!b.ct||!b.salt) process.exit(1); if(/mrr|amount|billed/.test(v)&&v!=='null') process.exit(1); console.log('PASS  the published files are ciphertext: team box '+Math.round(b.ct.length/1024)+'KB, vault '+(v==='null'?'held':'sealed'))"; }

echo "THE ENGINE GATE  $(date '+%Y-%m-%d %H:%M')"
run "build stamp"            node scripts/stamp.mjs --check
run "icons from the sets"    node scripts/build-icons.mjs --check
run "icons on centre"        node scripts/icon-centre.mjs --check
run "no svg typed by hand"   node "$HOME/bb-systems/qa/hand-svg.mjs" apps/web/src --allow app/ui/icon.component.ts=1 --allow app/ui/chart.component.ts=1
run "stack standard"         python3 "$HOME/bb-systems/stack-standard/check_stack.py" .
run "data re-adds"           node engine/build-engine-data.mjs --selftest
run "published is sealed"    nomoney
run "first try: the page"    firsttry apps/web/src/index.html
run "first try: the engine"  firsttry engine/compute.mjs engine/fetch.mjs engine/build-engine-data.mjs
run "no browser boxes"       nonative
run "insets used"            insets
run "build"                  bash -c 'cd apps/web && npx ng build --configuration production 2>&1 | grep -E "rror|✘" && exit 1; echo "PASS  the app builds"'
run "self test"              node scripts/selftest-run.mjs
run "pixel precision"        node scripts/ui-precision.mjs
run "accessibility"          node scripts/a11y.mjs
if [ "$QUICK" != "--quick" ]; then
  run "every screen measured"  node scripts/ui-walk.mjs
  run "house style, the words" style
  run "click path"             node scripts/click-path.mjs
fi
echo "────────────────────────────────────────────"
[ $FAIL -eq 0 ] && echo "GATE: ALL $N GREEN" || { echo "GATE: $FAIL of $N RED"; exit 1; }
