# BB Engine

The live instrument of the agency. One screen that answers "how is the machine running" without
anybody asking: clients, capacity seat by seat, what was made against what was promised, which
contracts end, and, for the owner only, every rupee and the 2027 forecast. Cast from the Hub on the
BB stack standard: Node 22 build, Next.js API, Angular 19 front, published on GitHub Pages as
sealed data the page cannot read without a passcode.

```
engine/rules.json                the capacity rules (BB-METRICS section 11), one source
engine/fetch.mjs                 reads the Command Centre's database, paged, named columns
engine/compute.mjs               the arithmetic: rows in, TEAM and OWNER documents out
engine/build-engine-data.mjs     fetch, compute, self test, seal, write; refuses on any total that does not re-add
engine/forecast.json             written by ~/bb-consultancy/finance/export_engine_forecast.py (gitignored)
engine/local/                    the plain documents, this Mac only (gitignored)
apps/web                         Angular: the door, the shell, five Engine screens, three Owner screens, the 3D machine
apps/api                         Next.js: the same two documents over HTTP, for the day a Node host exists
```

## The lock
Two files sit beside the page. `data/engine.enc.json` holds the team document, sealed under the team
passcode (`~/.bb-brain-pass`, the Brain's). `data/vault.enc.json` holds the owner document and is
written ONLY under a phrase `~/bb-brain/lock-policy.js` calls strong (`~/.bb-brain-vault-pass`, five
random words); until then it is `null` and the owner screens say the money is kept on the Mac. The
browser derives a key from the phrase (PBKDF2, 310,000 rounds) and remembers the key, never the phrase.

## Run it
```bash
python3 ~/bb-consultancy/finance/export_engine_forecast.py   # the forecast the owner screens show
node engine/build-engine-data.mjs                             # live read, 13 self test lines, seal, write
npm install && cd apps/web && npx ng build                    # the app
node scripts/serve.mjs 4682                                   # http://127.0.0.1:4682/bb-engine/
```
Money tables (`costs`, `invoices`, `pipeline`) are authenticated-only in the database. With
`BB_SUPABASE_SERVICE` in `~/.bb-secrets/engine.env` the build reads them live; without it, it uses
`engine/local/money-snapshot.json` and says so.

## The gate
```bash
bash scripts/gate.sh             # every check, cheapest first, each with its count
bash scripts/deploy-pages.sh     # stamp, gate, publish, read the live files back
```
Build stamp · icons from Lucide and Simple Icons, on centre · no svg typed by hand (the chart is the
one named exception) · stack standard · data re-adds · published files are ciphertext · first-try rules ·
no browser boxes · insets used · build · self test on every screen · pixel precision · accessibility ·
every screen measured and photographed at three widths in day and night · house style on every word ·
click path, every action pressed, Back once and twice · and the 3D machine checked as an instrument
(HOME, SELECT, SWITCH, RESET by `window.__m3d.step()`), never by eye alone.
