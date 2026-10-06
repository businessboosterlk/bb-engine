# BB Engine: where the build stopped, 6 October 2026 (usage limit)

## Done and proven
- `engine/compute.mjs`, `fetch.mjs`, `seal.mjs`, `build-engine-data.mjs`, `rules.json`: live read of the
  Command Centre, two documents (team, owner), 13 of 13 self test lines pass, the lock proven both ways.
- `~/bb-consultancy/finance/export_engine_forecast.py` writes `engine/forecast.json` (9 scenarios).
- Angular core: `core/models.ts`, `core/vault.ts` (WebCrypto unseal), `core/engine.service.ts`,
  `core/session.service.ts`, `core/selftest.ts`, `app.config.ts`, `app.routes.ts`, `app.component.ts`,
  `pages/login.component.ts` (team passcode door), `shell/shell.component.ts` (Engine and Owner groups),
  `ui/chart.component.ts` (bars, stack, lines).
- `CAST-LOG.md` answers the prior-art gate and lists every deleted Hub module.

## Facts found that change the design
- `costs`, `invoices` and `pipeline` are AUTHENTICATED-ONLY (pg_policies). The public key reads nothing
  from them. The build falls back to `engine/local/money-snapshot.json` (not yet written: the MCP
  export is in the tool-results file of the session) until `BB_SUPABASE_SERVICE` is added to
  `~/.bb-secrets/engine.env`. Thulaib's hands: Supabase dashboard, Project Settings, API, service_role.
- `graphic_projects` with `select=*` times out (base64 images). `fetch.mjs` now names its columns.
- The team passcode in `~/.bb-brain-pass` is short digits: lock-policy calls it weak, so the OWNER document
  stays on the Mac (`vault.enc.json` is null) until five random words sit in `~/.bb-brain-vault-pass`.
- `smm_shoots` holds 2 shoot days for October against a 16 day plan: the Engine reports the table, not the plan.

## Still to write (in order)
1. Pages: `pages/engine/{machine,clients,capacity,output,alerts}.component.ts`,
   `pages/owner/{money,people,forecast}.component.ts`. Shapes are in `core/models.ts`; the shell's bottom
   menus already name their query params (`view=3d`, `f=soon`, `m=this|last`, `s=<scenario>`).
2. Icons: add gauge, activity, clapperboard, wallet, rotate3d (rotate-3d), copy, printer, calendar,
   camera, palette to `scripts/build-icons.mjs` LINE table; run build-icons then icon-centre.
3. `scripts/lib/world.mjs`: serve under `/bb-engine/`, signIn fills `#pass` with the phrase read from
   `~/.bb-brain-pass` (never printed). Rewrite ui-walk, a11y, click-path, ui-precision, selftest-run for the
   Engine's screens. gate.sh: drop casts and tenant wall, add `node engine/build-engine-data.mjs --selftest`,
   allow `app/ui/chart.component.ts` in hand-svg.
4. 3D machine view (`pages/engine/machine3d.component.ts`, lazy `import('three')`): one gear per seat,
   radius = capacity, ring = load, DOM labels, dbg() and step() per bb-3d-ux gate 7. Flat view stays the door.
5. `apps/api`: re-point login and add `/api/engine` and `/api/engine/owner` on the compute module.
6. `index.html` title and manifest to The Engine; `sw.js` fresh list adds `/data/`.
7. GitHub repo `businessboosterlk/bb-engine`, deploy-pages.sh with the new name, verify-live.
8. MODULE-REGISTRY row, memory, learnings, the architecture PDF (Brain, Engine, Hub, products).
