# BB Engine: cast from the Hub, 6 October 2026

The prior-art gate, answered before a line was written.

**Has BB built this before?** In pieces. The Engine Room chat and `engine_full.py` (Aug 2026) computed
capacity and cost into PDFs. The Command Centre's monthly recap (`renderMonthlyRecap`) owns the
denominator law. The Digital Brain owns the publish-encrypted-on-GitHub-Pages design (SECURITY.md).
The finance scripts in `~/bb-consultancy/finance/` own every forecast number. Nothing LIVE joined them.

**Which build is the best one?** The Hub (`bb-client-os`): the only app on the stack standard with the
full gate (icons from licensed sets, pixel precision, a11y, every screen walked, click path, data laws)
and the installed-iPhone fixes. It is the mould. The Brain is the mould for the lock.

**What does the best one do that mine does not?** The Hub writes records (CRUD, drafts, outbox, tenant
wall). The Engine reads. Taken whole: shell, door, drawer, filter bar, more, bottom menu, icons
pipeline, theme, update stamp, selftest harness, every gate script, deploy and verify-live.

**What am I deliberately not taking, and why?** Each deleted module and what replaces it:

| Hub module | Decision | Replaced by |
|---|---|---|
| Library (month, videos, posts, docs, business) | Deleted. Client-facing content. | Output screen: what BB made this month, by client and by person |
| Sales (enquiries, pipeline board, customers, tasks, deals) | Deleted. The Engine does not run a client's sales. | Pipeline COUNT on the Machine screen, read from BB's own `pipeline` table |
| Casts per client, `casts/`, cast guard, onboard | Deleted. One tenant: Business Booster. | `engine/rules.json` and the two sealed documents |
| data.service (CRUD, outbox, device copy, drafts) | Deleted. Read only. | `engine.service` (unseal, hold, refresh) |
| ask.service (confirm dialogues) | Deleted. Nothing to confirm. | none |
| seen.service (what a client looked at) | Deleted. | none |
| API login by business and code; os_records store | Kept as the Node door for later hosting, re-pointed at the compute module | `apps/api` serves the same two documents when a Node host exists |
| Tenant wall script | Deleted. One tenant. | `engine/build-engine-data.mjs --selftest` re-adds every total |
| Demo seed, memory mode | Deleted. | the sealed real data; a `?demo` cast is NOT offered, the Engine is BB's own |

**Stack:** Angular 19 front, Node 22 build script, Next 15 API kept. `check_stack.py` must pass.

**The lock:** the team passcode opens capacity, output and renewals. Money opens only under a strong
phrase. On 6 Oct 2026 the team passcode is digits and short, so the owner document is held on the Mac
until Thulaib sets five random words in `~/.bb-brain-vault-pass`. The app says so on the Money screens.
