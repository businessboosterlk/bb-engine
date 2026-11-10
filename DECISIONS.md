# BB Engine: decisions

Each choice, what was rejected and why. Newest first.

## 10 Nov 2026: a client is "status active and has a package"; the Engine stops reading the fee

**Choice.** The Engine counts a client when `status` is `active` and `package` is not empty
(`isClient` in `engine/compute.mjs`). The roster is sorted by name. `mrr` is no longer in the
clients column list in `engine/fetch.mjs`. Every figure that came from the fee (monthly fees,
average fee, the fee on each client, the value of contracts ending soon, profit on fees alone) is
`null` in the owner document and reads "Not available" on the Money screen, never 0.

**Why.** The fee column is locked to the public key. Naming it made the whole clients request
fail ("permission denied for table clients"), so the Engine stopped refreshing. Owner's decision:
keep the column locked.

**Rejected.**
- Reading the fee through an owner-only (service) key. It would put a key that bypasses every
  row and column lock on this Mac's refresh path to recover one number and a leaked or misused
  key exposes far more than fees.
- Unlocking the column for the public key. Every BB front end ships that key, so the fee of every
  client would become readable by anyone holding a BB app. The lock exists on purpose.
- Showing 0 where the fee was. A 0 reads as a real figure (the denominator law in `compute.mjs`).

**Known gap.** Billed, paid, costs and "left" still come from invoices and costs, so the owner's
money picture holds; only the fee-based lines are blank until a fee source the owner approves exists.

## 10 Nov 2026: two gate reds that came from the first live alert count, not from a drawing

**Tab bar icon 5.** Measured, the alert icon sits dead on centre (dx 0, dy 0). The miss was the alert dot beside
it, which overlaps the icon's corner on purpose and was read as the icon's ink. `scripts/ui-precision.mjs` now hides
that dot for the tab readings only. The 0.5px limit is unchanged. **Rejected:** nudging the icon to cancel the dot,
which would put a centred icon off centre whenever the dot is absent.

**The alert count on the desk rail (`.nb`).** White on the night red read 2.77 to 1; small type needs 4.5. New token
`--on-red` (white by day, near black by night), used by `.nb` and `.btn.danger-solid`. **Rejected:** darkening the
night `--red`, which every red word on a dark card also reads and which would dim them.

## 10 Nov 2026: Hithesh counts as 8 clients of capacity

Owner's decision. `rules.person_caps.Hithesh` goes from 0 (his October learning month) to 8, the book he has held
since 5 Nov. Social media capacity becomes 12 + 12 + 8 = 32. **Rejected:** 12, a full seat, until he has run a
full book for a while; and leaving 0, which showed a team with a third SMM as nearly full.
