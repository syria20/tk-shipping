# Build plan: T.K Group customer + admin PWA on the new design system

Inputs: `replica/recon.md`, `replica/architecture.md`,
`replica/design/components.md`, `replica/design/tokens*.json`.
Status: **plan only.** No application code, database or deployment has been
touched. Every step that edits `index.html` / `admin.html` waits for your
approval.

## Your requirements, and how the plan meets each

| # | requirement | how |
| --- | --- | --- |
| 1 | keep the Supabase integration | same client (`supabase-js@2.45.4`), same project, same 13 tables and 22 RPCs. New screens call the existing functions with the same arguments. No new RPCs until `/replica-backend` and your DB approval. |
| 2 | keep all customer + admin features | every existing view is mapped to a screen below; each new screen must reach **parity** (same fields, same actions, same RPC calls) before its flag is turned on. The old view stays in the file as a fallback. |
| 3 | Arabic RTL + German LTR design system | `tokens.css` + components from `replica/design/`; new screens are written in logical CSS and use a real AR/DE/EN dictionary instead of translating Arabic text after render. |
| 4 | responsive iPhone + desktop | iPhone: safe areas, `100dvh`, 16px inputs (no iOS zoom), tab bar above the home indicator. Desktop: sidebar navigation, master-detail layouts, the 480px phone frame removed from 1024px up. |
| 5 | don't overwrite existing files | all new code goes in **new files** under `ui/`. Existing files only get small *added* hook lines (listed exactly below), never replaced or rewritten. |
| 6 | no DB changes, no deploy | nothing in this plan runs SQL or publishes. Work stays on branch `claude/wonderful-mendel-enctw2`; merging to `main` is your decision (check whether `main` auto-publishes). |

## What the app is today (measured 2026-11-24)

- `index.html`: 1,352 lines / 364 KB, one file: CSS, the inline logo, and
  18 views rendered as strings by one `draw()` function: home, send,
  eu2sy, sy2eu, recip, cart, pay, payc, paid, paidc, detail, chat, bills,
  wallet, points, refer, more, acct.
- Languages: copy is written in Arabic; German / English come from about
  730 dictionary entries applied to the rendered text (`tr()`), then
  `dir` switches to LTR.
- Themes: gold-on-black is the live default (`data-tk="1"`), plus light
  and dark variables.
- Layout: `#app` is capped at 480px, so desktop shows a phone column on
  black (see `replica/baseline-screens/index-desktop.png`).
- `admin.html`: 418 lines / 61 KB, Arabic only, gold theme, one 1040px
  column on desktop (`admin-desktop.png`).
- Baseline screenshots (iPhone 13 and 1440px, Supabase blocked, no
  console errors): `replica/baseline-screens/`.

## Approach: replace view by view behind a flag (recommended)

| | A. rewrite as a new app | **B. replace view by view behind a flag** |
| --- | --- | --- |
| how | new `app/` PWA, rebuild all 18 + admin views, switch at the end | new screens in `ui/`; `draw()` calls the new screen only when the flag is on, otherwise the old code runs unchanged |
| risk to live features | high: nothing ships until everything is redone | low: one view at a time, instant fallback |
| first visible result | weeks | first screen |
| edits to existing files | none until the switch, then all at once | a few added lines per file |
| verdict | | **recommended** |

The flag: `localStorage["tk-ui2"]="1"` or `?ui=2` turns new screens on for
one browser. Default stays off, so customers see today's app until you
choose to switch a screen on for everyone.

### New files (nothing existing is replaced)

```
ui/
  tokens.css            copy of replica/design/tokens.css (generated)
  tk-ui.css             primitives + responsive shell (from primitives.html)
  tk-ui.js              registry, flag, i18n t(), formatters (money in bdi), icons
  i18n/ar.js de.js en.js  fresh copy per screen (AR source, DE native)
  shell.js              customer + admin layout: tab bar (phone), sidebar (desktop)
  screens/
    shipments.js        S07 + S08 (first screen, see below)
    ...                 one file per screen
tests/
  harness/              Playwright: fake Supabase responses, seed data,
                        parity checks, screenshots at 390 and 1440
```

### The only edits to existing files (each needs your approval)

`index.html` and `admin.html`, additions only:
1. In `<head>`: `<link rel="stylesheet" href="ui/tokens.css">` and
   `<link rel="stylesheet" href="ui/tk-ui.css">`, plus
   `<script src="ui/tk-ui.js" defer></script>` (2-3 lines per file).
2. In `draw()`, once per migrated view, one guard line before the old
   branch:
   `if (TKUI.on("detail")) { h = TKUI.render("detail", s); } else` (old code unchanged)
3. Shell: one hook to wrap `#app` in the responsive frame when the flag is on.

Rollback for any screen = turn its flag off; for everything = remove the
3 head lines.

## Safety net first: the test harness (Step 0, no app code)

- Playwright loads the real `index.html` / `admin.html` from disk, serves
  the pinned `supabase-js` locally, and **intercepts every Supabase call**
  (auth, REST, RPC, storage) with seed data: one guest, one customer with
  shipments in all 7 steps, one business customer, one staff user per role.
  Nothing reaches the live project.
- For each view it records: what is shown, which buttons exist, and which
  RPCs are called with which arguments. A new screen passes **parity** only
  when it shows the same data and makes the same calls as the old one.
- Screenshots per screen at 390x844 (iPhone 13) and 1440x900, in AR and DE,
  gold theme, into `replica/clone-screens/`.
- Checks: no console errors, no horizontal scroll, keyboard path through
  the main action, contrast via tokens.

## Order of work (safest first)

Read-only screens before screens that write; customer before admin; screens
that need new database objects last (they wait for `/replica-backend` and
your DB approval).

| step | screens | existing view(s) | writes data? | needs DB change? |
| --- | --- | --- | --- | --- |
| 0 | test harness + seed data | none | no | no |
| 1 | tokens bridge: map old variables (`--bg`, `--card`, `--ink`, `--mut`, `--line`, `--brand`, `--yel`, `--ok`) to the new roles; fixes the 9 contrast failures across the app with no layout change | all | no | no |
| 2 | responsive shell: iPhone safe areas + desktop sidebar / master-detail frame, customer and admin | all | no | no |
| **3** | **S07 My shipments + S08 Shipment detail** | home list, detail | no | no |
| 4 | S16 tracking by number (customer's own shipments, as today) | home search | no | no (public PIN tracking needs the `track` function later) |
| 5 | S01 home + quick price, S02 options | home, send, eu2sy, sy2eu | no | no (price stays computed as today) |
| 6 | S10 bills, wallet, points, refer | bills, wallet, points, refer | no | no |
| 7 | S11 messages | chat | yes (chat_send) | no |
| 8 | S13 recipients, S14 account / settings, S03 sign in | recip, more, acct | yes (profile, auth) | no |
| 9 | S04 booking, S05 cart + pay, S06 confirmation | send, cart, pay, payc, paid, paidc | yes (create_shipment, uploads) | no |
| 10 | admin: S17 login, S18 dashboard, S20 shipment ops (intake, status, delivery proof), S23 payments, S25 documents, S26 chats, S27 team | all admin views | yes (staff RPCs) | no |
| 11 | new screens: S19 booking review, S21 rates, S22 quotes, S24 customers, S12 notification settings, S15 / S28 reports | none | yes | **yes: needs your approval of `replica/schema.sql`** |

Booking and payment (step 9) and admin writes (step 10) come after the
harness has proven parity on 6 read-mostly steps, because they are where a
mistake costs money or loses a shipment.

## First screen to build: S07 My shipments + S08 Shipment detail

Why this one:
- **Read-only.** It only reads `shipments`, `shipment_status_log`,
  `payments`, `invoices`, `shipment_docs`, `shipment_files` with the same
  queries as today. It cannot create, change or lose data.
- **The screen customers open most:** "where is my shipment?" is the app's
  headline.
- **Uses most of the design system:** status chips (7 steps), the milestone
  timeline, shipment cards, money (the Arabic bidi fix), documents list,
  empty/loading/error states, and RTL/LTR.
- **Best showcase for desktop:** list and detail side by side
  (master-detail) from 1024px; on iPhone, list -> detail with the existing
  view transition and a back button.

Spec:
- Layout: iPhone: header, filter chips (all / active / delivered), cards,
  tab bar. Desktop: sidebar, list column 400px, detail panel (flexible width).
- Detail: ID (copy), route, mode chip, status chip, route map card (current
  drawing), timeline with the actual times from `shipment_status_log`,
  items, recipient, payment state, invoice number and amount, documents
  with review status, delivery proof photos, "repeat shipment" and "rate"
  actions (same functions as today).
- States: no shipments, loading (skeleton cards), load error (retry),
  delivered, a 60-character recipient name, a long goods description,
  shipment with rejected document.
- Partial on purpose: "estimated vs actual" per step and exceptions need
  `tk_milestone_estimates` / `tk_exceptions` (DB, later). Until then the
  timeline shows actual times only and marks it `partial` in features.csv.
- Done when: parity with today's detail view in the harness (same data,
  same RPCs), screenshots at 390 and 1440 in AR and DE, keyboard path
  list -> detail -> back, no console errors, no horizontal scroll.

## Definition of done (every screen)

- [ ] parity with the old view: same data, same actions, same RPC calls
- [ ] every state: empty, loading, filled, error, no permission, long content
- [ ] 390px (iPhone) and 1440px (desktop), AR (RTL) and DE (LTR)
- [ ] keyboard-only path; visible focus; labels; screen reader names
- [ ] no console errors; no horizontal scroll
- [ ] copy written fresh in AR/DE/EN; nothing copied from any other platform
- [ ] tokens only (no raw hex / px in components)
- [ ] `features.csv` and `build-log.md` updated; screenshots saved
- [ ] one commit per screen: `build: S08 shipment detail`; nothing pushed
      without your OK

## Risks

- **German text that slips through.** New screens use real DE copy, but
  old screens still rely on post-render translation. Mixed views during
  migration must not double-translate: new screens mark their root
  `data-nt` (already respected by `tr()`).
- **Inline logo and 364 KB HTML.** iPhone first load is heavy. Moving the
  base64 logo to a file is a quick win, but it edits `index.html`, so it's
  listed for approval, not done.
- **Unknown deploy path.** No hosting config in the repo. If `main`
  auto-publishes (for example GitHub Pages), never merge until you sign
  off; the flag keeps customers on today's UI either way.
- **No real-device check here.** The harness emulates iPhone 13 in
  Chromium. Safari-specific issues (safe areas, standalone mode, date
  inputs) need a check on your iPhone before a flag is turned on for
  everyone.

## What I need from you

1. Approve approach B (new files in `ui/`, flag, small hook lines in
   `index.html` / `admin.html`).
2. Approve Step 0 (test harness, no app code) and Steps 1-3
   (tokens bridge, responsive shell, S07 + S08).
3. Optional: tell me whether `main` auto-deploys.
