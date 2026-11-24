# Test report: old vs new screens (T.K UI v2, steps 0-3)

## Summary

- **Result: 0 failures.** With the switch **off** (what customers get), all 18 customer views in Arabic and German and the admin panel are identical to the committed original: same text, same actions, same Supabase calls, 0 errors.
- With the switch **on**, only the shipment detail is replaced (new S08) and S07 is added; the other 17 views are unchanged.
- **S08 parity:** on all 8 test shipments (every status step, long names, long description, rejected document, delivered with rating) the new detail shows the same data and offers every action the old one did, and makes **no extra Supabase calls**.
- **Layout:** no horizontal scrolling at iPhone 13 (390px) or desktop (1440px), in RTL and LTR.
- **Keyboard:** list → detail → back works with Tab / Enter only, with a visible focus ring.
- **Not tested here:** a real iPhone (Safari), and live Supabase (all calls were mocked on purpose).

## Deployment check (GitHub)

- The repo publishes with **GitHub Pages** (`pages-build-deployment`, built in by GitHub). All 38 runs were triggered by commits on **`main`**, including the merge of PR #1.
- **Merging to `main` publishes the website automatically.** The working branch `claude/wonderful-mendel-enctw2` has never triggered a deployment.
- Pages serves the whole repo, so a merge would also publish `replica/`, `tests/` and `.claude/` unless they are left out.

Run: 2026-11-24T19:30:06.103Z → 2026-11-24T19:34:21.444Z. Supabase fully mocked (tests/harness), nothing reached the live project.
Blocked external hosts during the run: none.

Variants: **orig** = index.html / admin.html exactly as committed; **off** = current files with the hook lines, switch off (what customers get); **on** = switch on (`?ui=2`).

## 1. Supabase calls on load (customer signed in)

| variant | calls | same as orig | writes during load | page errors |
| --- | --- | --- | --- | --- |
| orig | 32 | pass | none | 0 |
| off | 32 | pass | none | 0 |
| on | 32 | pass | none | 0 |

## 2. Every existing customer view (iPhone 13)

“off = orig” compares visible text and every action handler (onclick / onchange / oninput) on the screen. “on” is either the new screen (S07/S08) or the old view unchanged.

| lang | view | off = orig | on | errors orig / off / on |
| --- | --- | --- | --- | --- |
| ar | home: Home (tracking search, active shipment, services, shipments list) | pass | pass (old view) | 0 / 0 / 0 |
| ar | send: Send: route, goods, weight | pass | pass (old view) | 0 / 0 / 0 |
| ar | eu2sy: Send EU → Syria | pass | pass (old view) | 0 / 0 / 0 |
| ar | sy2eu: Send Syria → EU | pass | pass (old view) | 0 / 0 / 0 |
| ar | recip: Recipient, mode, hand-over | pass | pass (old view) | 0 / 0 / 0 |
| ar | cart: Cart | pass | pass (old view) | 0 / 0 / 0 |
| ar | pay: Payment | pass | pass (old view) | 0 / 0 / 0 |
| ar | payc: Cart payment | pass | pass (old view) | 0 / 0 / 0 |
| ar | paid: Booking confirmed | pass | pass (old view) | 0 / 0 / 0 |
| ar | paidc: Cart confirmed | pass | pass (old view) | 0 / 0 / 0 |
| ar | detail: Shipment detail | pass | new S08 | 0 / 0 / 0 |
| ar | chat: Support chat | pass | pass (old view) | 0 / 0 / 0 |
| ar | bills: Invoices | pass | pass (old view) | 0 / 0 / 0 |
| ar | wallet: Wallet | pass | pass (old view) | 0 / 0 / 0 |
| ar | points: Points | pass | pass (old view) | 0 / 0 / 0 |
| ar | refer: Referral | pass | pass (old view) | 0 / 0 / 0 |
| ar | more: Settings / more | pass | pass (old view) | 0 / 0 / 0 |
| ar | acct: Account / sign in | pass | pass (old view) | 0 / 0 / 0 |
| de | home: Home (tracking search, active shipment, services, shipments list) | pass | pass (old view) | 0 / 0 / 0 |
| de | send: Send: route, goods, weight | pass | pass (old view) | 0 / 0 / 0 |
| de | eu2sy: Send EU → Syria | pass | pass (old view) | 0 / 0 / 0 |
| de | sy2eu: Send Syria → EU | pass | pass (old view) | 0 / 0 / 0 |
| de | recip: Recipient, mode, hand-over | pass | pass (old view) | 0 / 0 / 0 |
| de | cart: Cart | pass | pass (old view) | 0 / 0 / 0 |
| de | pay: Payment | pass | pass (old view) | 0 / 0 / 0 |
| de | payc: Cart payment | pass | pass (old view) | 0 / 0 / 0 |
| de | paid: Booking confirmed | pass | pass (old view) | 0 / 0 / 0 |
| de | paidc: Cart confirmed | pass | pass (old view) | 0 / 0 / 0 |
| de | detail: Shipment detail | pass | new S08 | 0 / 0 / 0 |
| de | chat: Support chat | pass | pass (old view) | 0 / 0 / 0 |
| de | bills: Invoices | pass | pass (old view) | 0 / 0 / 0 |
| de | wallet: Wallet | pass | pass (old view) | 0 / 0 / 0 |
| de | points: Points | pass | pass (old view) | 0 / 0 / 0 |
| de | refer: Referral | pass | pass (old view) | 0 / 0 / 0 |
| de | more: Settings / more | pass | pass (old view) | 0 / 0 / 0 |
| de | acct: Account / sign in | pass | pass (old view) | 0 / 0 / 0 |

No differences: with the switch off every view is identical to the original; with it on, every view except detail is unchanged.

## 3. S08 Shipment detail: new vs old, per shipment

Data = shipment ID, recipient, description, delivered-to name. Actions = every handler the old detail offers (rate, documents upload/delete, proof photos, bank details copy, invoice print, repeat...).

| lang | shipment | step | data missing in new | actions missing in new | new extra actions | file inputs old/new | status times old/new | new Supabase calls | errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ar | TK100000 | 0 | none | none | none | 1 / 1 | 1 / 1 | 0 | 0 |
| ar | TK100001 | 1 | none | none | none | 1 / 1 | 2 / 2 | 0 | 0 |
| ar | TK100002 | 2 | none | none | none | 1 / 1 | 3 / 3 | 0 | 0 |
| ar | TK100003 | 3 | none | none | none | 1 / 1 | 4 / 4 | 0 | 0 |
| ar | TK100004 | 4 | none | none | none | 1 / 1 | 5 / 5 | 0 | 0 |
| ar | TK100005 | 5 | none | none | none | 1 / 1 | 6 / 6 | 0 | 0 |
| ar | TK100006 | 6 | none | none | none | 0 / 0 | 8 / 8 | 0 | 0 |
| ar | TK100007 | 6 | none | none | none | 0 / 0 | 8 / 8 | 0 | 0 |
| de | TK100000 | 0 | none | none | none | 1 / 1 | 1 / 1 | 0 | 0 |
| de | TK100001 | 1 | none | none | none | 1 / 1 | 2 / 2 | 0 | 0 |
| de | TK100002 | 2 | none | none | none | 1 / 1 | 3 / 3 | 0 | 0 |
| de | TK100003 | 3 | none | none | none | 1 / 1 | 4 / 4 | 0 | 0 |
| de | TK100004 | 4 | none | none | none | 1 / 1 | 5 / 5 | 0 | 0 |
| de | TK100005 | 5 | none | none | none | 1 / 1 | 6 / 6 | 0 | 0 |
| de | TK100006 | 6 | none | none | none | 0 / 0 | 8 / 8 | 0 | 0 |
| de | TK100007 | 6 | none | none | none | 0 / 0 | 8 / 8 | 0 | 0 |

## 4. Layout: iPhone 13 (390px) and desktop (1440px)

| screen | variant | lang | viewport | horizontal overflow (px) | errors |
| --- | --- | --- | --- | --- | --- |
| old detail | off | ar | iphone | 0 | 0 |
| S07 | on | ar | iphone | 0 | 0 |
| S08 | on | ar | iphone | 0 | 0 |
| old detail | off | de | iphone | 0 | 0 |
| S07 | on | de | iphone | 0 | 0 |
| S08 | on | de | iphone | 0 | 0 |
| old detail | off | ar | desktop | 0 | 0 |
| home (shell) | off | ar | desktop | 0 | 0 |
| S07 | on | ar | desktop | 0 | 0 |
| S08 | on | ar | desktop | 0 | 0 |
| home (shell) | on | ar | desktop | 0 | 0 |
| old detail | off | de | desktop | 0 | 0 |
| home (shell) | off | de | desktop | 0 | 0 |
| S07 | on | de | desktop | 0 | 0 |
| S08 | on | de | desktop | 0 | 0 |
| home (shell) | on | de | desktop | 0 | 0 |
| S07 guest | on | ar | iphone | 0 | 0 |
| S07 empty/loading + S08 not found | on | de | iphone | n/a | 0 |

## 5. Keyboard only (desktop, German, switch on)

- card focused after 5 Tab; back button reached
- focus ring on the focused card: solid
- Enter opens the detail: pass; Shift+Tab reaches Back, Enter returns to the list: pass
- errors: 0

## 6. Admin panel (admin.html)

| state | viewport | same text orig / off / on | errors orig / off / on | overflow on |
| --- | --- | --- | --- | --- |
| signed out | iphone | pass | 0 / 0 / 0 | 0 |
| signed out | desktop | pass | 0 / 0 / 0 | 0 |
| staff | iphone | pass | 0 / 0 / 0 | 0 |
| staff | desktop | pass | 0 / 0 / 0 | 0 |

