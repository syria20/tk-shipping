# T.K Group design system: components and screens

Customer app (`index.html`) and staff panel (`admin.html`), Arabic RTL first,
German and English LTR. Built on T.K's own brand: navy `#0a2f6b` / `#02183c`,
T.K yellow `#ffd400`, and the premium gold-on-black theme. Nothing here
copies Freightos, Flexport or Forto: the recon gave the flows and patterns
(quote cards, milestone timeline, work queues), not their look, copy or assets.

Files:
- `tokens.json` (light + scales), `tokens.dark.json`, `tokens.gold.json`: roles and values
- `tokens.css`: CSS custom properties (`--c-*`, `--text-*`, `--space-*`, ...)
- `tailwind.preset.cjs`: optional mapping if Tailwind is adopted
- `build_tokens.py`: the single source; edit there, then rebuild
- `primitives.html`: every component in isolation, all themes, AR and DE
- `contrast-report.txt`: WCAG results (0 failures)

Status: specification only. The live app is unchanged. Adopting the tokens
in `index.html` / `admin.html` is a later step that needs your approval.

## 1. Principles

1. **One markup for both directions.** Only logical CSS: `margin-inline-start`,
   `padding-inline-end`, `inset-inline-start`, `text-align: start`. Never
   `left`/`right`. `<html lang="ar" dir="rtl">` or `<html lang="de" dir="ltr">`.
   Direction-bound icons (back arrow, chevron, "next") flip with
   `transform: scaleX(-1)` under `[dir=rtl]`; clocks, checkmarks, the truck
   on the map and logos never flip.
2. **Numbers stay Western digits** (0-9) in both languages, with
   `font-variant-numeric: lining-nums tabular-nums`, because shipment IDs,
   phones, prices and weights are copied and compared. Phone numbers, IDs,
   IBANs and emails are wrapped in `<bdi dir="ltr">` inside Arabic text.
3. **Money:** always `formatEUR(cents, locale)`: `1.234,50 €` in DE,
   `1,234.50 €` in AR/EN. Currency symbol after the amount in all three.
   Every amount, weight and signed number is an isolated LTR run
   (`<bdi dir="ltr">` or `direction:ltr; unicode-bidi:isolate`). Without it,
   Arabic layout shows `150,00 €` as `€ 150,00` and `−10,00 €` as
   `10,00−` (seen in the primitives screenshots; worth checking in the live
   app's price and breakdown views).
4. **Dates:** `Intl.DateTimeFormat` per locale, Gregorian calendar, the
   viewer's time zone; pickup slots show the local wall-clock window.
5. **Roles, not colours.** Components use `var(--c-accent)`, never hex.
   The theme switch (light / dark / gold) only swaps variables.
6. **Yellow is a fill.** `highlight` is for the primary CTA, the price band
   on the navy hero and selected states, always with `on-highlight` text.
   It is never text on a light surface.
7. **Touch first.** Minimum target 44 x 44 px; primary actions sit in the
   thumb zone above the tab bar; one primary button per screen.
8. **States are part of the spec.** Every list has empty, loading, error and
   filtered-empty. Every action has loading and failure.
9. **Accessibility floor:** WCAG 2.2 AA (contrast checked), visible focus
   ring (`--c-focus`, 2px + 2px offset), labels on every input, errors linked
   with `aria-describedby`, live regions for toasts and status changes,
   `prefers-reduced-motion` respected.

## 2. Foundations

| token group | values |
| --- | --- |
| colour roles | bg, surface, surface-raised, header, on-header, on-header-muted, border (decorative), border-input, text, text-muted, accent, on-accent, highlight, on-highlight, focus, danger, success, warning, info (+ `on-*`) |
| status (7 steps) | status-0 booked, 1 received in Herne, 2 in T.K warehouse, 3 in transit, 4 customs, 5 arrived, 6 delivered; each with `-tint` (chip fill) and `-on-tint` (chip text) |
| mode | mode-road, mode-air, mode-sea (+ tint, on-tint) |
| fonts | Arabic UI: Cairo -> IBM Plex Sans Arabic; Latin UI: IBM Plex Sans -> Cairo; display: Amiri (AR) / Cormorant Garamond (DE/EN), gold theme and headers only. All SIL OFL. |
| type | xs 12/18, sm 14/22, base 16/26, md 18/28, lg 20/30, xl 24/34, 2xl 30/40, display 36/46 (px size / line) |
| space | 0, 4, 8, 12, 16, 20, 24, 32, 48, 64 |
| radius | sm 8 (chips, small buttons), md 12 (inputs, buttons), lg 16 (CTA, option cards), xl 20 (cards, sheets), pill |
| shadow | card, pop, cta (per theme; dark theme uses borders instead of shadows) |
| motion | fast 120ms (press), base 200ms (sheets, tabs), slow 400ms (timeline fill); ease `cubic-bezier(.2,.8,.2,1)` |
| layout | gutter 16; customer column max 560; admin content max 1200; header 64; tab bar 64 + safe area; admin sidebar 248 from `lg` (1024) |

Changes from the live app (all for contrast or consistency) are listed in
`tokens.json > _changes_from_live_app`.

## 3. Components

```
Button
  variants  primary (highlight fill, on-highlight text, shadow cta)
            secondary (accent fill, on-accent text)
            ghost (transparent, border-input, text)
            danger (danger fill, on-danger text)
            success (success fill, on-success text; staff "confirm" actions)
  sizes     sm 36px / radius sm / type sm-600, md 44px / radius md / type base-700,
            lg 52px / radius lg / type md-800 (customer CTA, full width)
  states    default, hover (8% darker overlay), active (scale .98, motion fast),
            focus-visible (2px ring focus, offset 2px), disabled (40% opacity,
            not focusable via aria-disabled when it needs a tooltip), loading
            (spinner at inline-start, label kept, aria-busy=true)
  a11y      real <button>; icon-only buttons need aria-label; loading never
            removes the text from the accessibility tree
  used on   all screens

Icon button
  sizes     44px (default), 36px (dense admin tables)
  tokens    radius md, border, bg surface; icon 20px currentColor
  a11y      aria-label required; tooltip on hover/focus in admin
  icons     Lucide (ISC licence) or the app's existing inline set. No icons
            taken from any freight platform.

Text field / textarea / select
  anatomy   label (sm-600, text) above; field 48px; helper or error below (xs)
  tokens    bg bg (on cards) or surface (on bg), border 1px border-input,
            radius md, padding 12/14, type base-500, text
  states    default, hover (border accent), focus (border accent + ring focus),
            filled, error (border danger, error text danger, icon), disabled
            (bg border, text-muted), read-only (no border, bg transparent)
  rtl       text-align start; phone, email, ID, IBAN inputs dir="ltr"
            inputmode set (tel, decimal, email)
  a11y      <label for>, aria-invalid, aria-describedby -> error id
  used on   S01, S03, S04, S13, S14, S19, S20, S21, S22, S27

Weight / quantity stepper
  anatomy   [-] numeric field [+], unit suffix ("kg", "تنكة")
  states    default, min reached (minus disabled), max reached, invalid
  behaviour step grows with size: 1 below 20, 5 to 100, 10 to 1000, 100 above
            (matches the live app); long-press repeats
  a11y      role=spinbutton semantics via <input type=number>, buttons labelled
  used on   S01, S04

Lane picker (route)
  anatomy   origin select, swap button (round, 44px), destination select;
            direction label (EU -> Syria / Syria -> EU)
  states    empty, filled, unsupported lane (inline danger message, CTA disabled)
  rtl       the arrow between origin and destination follows reading direction
  used on   S01, S04, S21, S22

Option group (segmented / card radios)
  variants  2-up, 3-up (mode: road / sea / air; goods types grid)
  tokens    surface, border 1.5px, radius lg; selected = accent border 2px +
            accent 8% fill + check icon at inline-end
  states    default, hover, selected, disabled (lane not served), focus
  a11y      role=radiogroup, arrow keys move selection
  used on   S01, S04, S05 (payment method)

Quote option card
  anatomy   mode icon + name, transit "5 - 8 days", all-in price (xl-800),
            per-kg rate (sm muted), badges (cheapest / fastest), select button
  states    default, selected, expired (muted + "price expired, refresh"),
            loading skeleton
  used on   S02

Price breakdown
  anatomy   rows: freight, discount (success, minus sign), surcharges/add-ons,
            dashed divider, total (lg-800). Amounts aligned at inline-end,
            tabular numbers
  used on   S02, S05, S06, S22, S10 (invoice detail)

Stepper (progress)
  anatomy   3-4 bars or numbered dots, current label
  states    done (accent), current (highlight), upcoming (border)
  a11y      aria-current="step"; text "Step 2 of 4"
  used on   S04, S05

Status chip
  anatomy   dot + label, pill, type xs-600
  tokens    bg status-N-tint, text status-N-on-tint
  variants  status-0..6, success, danger, warning, info, mode-road/air/sea,
            review: pending (warning), accepted (success), rejected (danger)
  a11y      the colour is never the only signal: label always present
  used on   S07, S08, S10, S16, S18, S19, S20, S23, S25

Milestone timeline
  anatomy   vertical list of the 7 steps: node, label, actual date/time;
            estimated date in muted with "expected"; delay note in warning
  states    done (node accent, solid line), current (node highlight with
            pulse unless reduced motion), upcoming (node border, dashed line),
            delayed (warning icon + reason), exception (danger banner on top)
  a11y      <ol>, each item states "done", "current" or "expected <date>"
  variant   compact horizontal (4 key nodes) = the existing route map card
  used on   S08, S16

Shipment card (list item)
  anatomy   ID (mono, bdi ltr), route "Berlin -> Damascus", mode chip,
            status chip, ETA, price; chevron at inline-end
  states    default, pressed, urgent (warning or danger inline-start bar 4px)
  used on   S07, S18

Data table (admin)
  anatomy   sticky header, sortable columns (aria-sort), row actions menu,
            bulk-select checkbox, pagination or "load more"
  responsive below md: becomes stacked cards (same fields, labels inline)
  states    loading (5 skeleton rows), empty, filtered-empty (+ "clear filters"),
            error (+ retry)
  used on   S18-S28

Filter bar
  anatomy   search field, chips (status, mode, date range), "clear" link
  used on   S07, S10, S19-S28

File upload
  anatomy   drop zone (desktop) / camera + file buttons (mobile), document
            type select, list of files with size, progress and remove
  rules     pdf, jpg, png, heic; max 10 MB; images compressed to <= 2 MB
            in the browser before upload
  states    idle, dragging, uploading (progress), done, rejected (reason from
            staff, danger), error (retry)
  a11y      the real <input type=file> stays focusable; progress announced
  used on   S09, S20, S25

Photo capture + signature pad (staff)
  anatomy   camera button, thumbnails grid; signature canvas 100% x 180px,
            clear / save, receiver name field
  states    empty, captured, saving, saved
  used on   S20

Chat thread
  anatomy   bubbles: customer at inline-end (accent fill / on-accent),
            staff at inline-start (surface / text); time + read tick;
            composer with attach and send
  states    empty ("ask us anything"), unread divider, sending, failed (retry)
  a11y      role=log, aria-live=polite for new messages
  used on   S11, S26

Notification item
  anatomy   icon by event, title, body (muted), time, unread dot
  states    unread (surface-raised + dot), read
  used on   S12

Toggle row (notification settings)
  anatomy   event label on start, channel toggles (in-app, WhatsApp, email,
            SMS, push) on end; on mobile, one row per event opens a sheet
  a11y      role=switch, aria-checked
  used on   S12

Modal / bottom sheet
  variants  bottom sheet on mobile (radius xl top), centred modal from md
  anatomy   title, body, actions (primary at inline-end on desktop,
            full-width stacked on mobile)
  behaviour focus trapped, Esc / swipe-down closes, scroll locked behind,
            returns focus to the trigger
  used on   confirmations, filters, booking review, rate edit

Toast
  variants  success, error, info; auto-hide 4s (errors stay until closed)
  position  above the tab bar on mobile, bottom inline-end on desktop
  a11y      role=status (success/info), role=alert (error)

Empty state
  anatomy   simple line illustration (own, not traced), title, one sentence,
            one action
  used on   S07, S09, S10, S11, S12, S13, and every admin queue

Skeleton
  surface-raised blocks with shimmer (static under reduced motion)

App header (customer)
  anatomy   navy header band, T.K logo, page title, language switch (ع / DE),
            notifications bell with count
  tokens    bg header, text on-header; gold theme: gradient + gold hairline

Tab bar (customer, mobile)
  items     Home, Ship, Track, Messages, Account (5 max), icon + label
  tokens    surface, border-top border, active = accent icon + label xs-700
  behaviour fixed, safe-area padding, hides on keyboard open
  a11y      <nav aria-label>, aria-current="page"

Admin shell
  mobile    top bar (title, search, account) + bottom tabs (role-dependent)
  lg+       sidebar 248px (logo, nav grouped: Operations / Finance / Support /
            Settings, counts as badges), content max 1200, top bar with
            global search (ID, name, phone) and the staff member's role chip
  role nav  herne_staff: Intake, Shipments, Bookings; support: Chats,
            Documents, Bookings; accountant: Payments, Invoices, Rates;
            admin: everything + Team, Audit

KPI tile
  anatomy   label (sm muted), value (2xl-800, tabular), delta vs previous
            period (success / danger), optional sparkline
  used on   S15, S18, S28
```

## 4. Customer screens (mobile first, 560px column on desktop)

| ID | layout | primary action | notes |
| --- | --- | --- | --- |
| S01 Home + quick quote | navy hero with "where is your shipment?" tracking field; calculator card: direction toggle, lane picker, goods grid, mode option group, weight stepper; price band (yellow on navy) | Get price | guest can price; services row; how-it-works |
| S02 Quote results | sticky summary (lane, kg); option cards (road / sea / air) sorted by price; breakdown expander | Book this option | expired quote -> refresh banner |
| S03 Sign in / up | tabs Sign in / New account; Google button; biometric unlock button if enabled | Continue | errors inline; "browse prices as guest" link |
| S04 Booking form | stepper: 1 sender, 2 recipient (address book picker), 3 goods (items, value, photos, customs docs by goods type), 4 pickup or drop-off (date + slot) | Continue | saved draft; exemption / family-return conditions as expandable notices |
| S05 Review + pay | summary card, breakdown, promo code field, payment method option group (card, bank transfer, wallet, COD), terms checkbox | Pay / Confirm booking | bank transfer shows "account details follow"; card opens checkout |
| S06 Confirmation | success illustration, booking ID (copy), PIN, next steps checklist, upload-docs CTA | Track shipment | "pending review" chip until staff accept |
| S07 My shipments | urgent banner (exceptions), filter chips, shipment cards | Open shipment | empty: "send your first shipment" |
| S08 Shipment detail | header (ID, route, status chip), route map card, milestone timeline (estimated vs actual), tabs: Details / Documents / Invoices / Messages, proof of delivery | contextual (upload, pay, message) | repeat shipment; rate after delivery |
| S09 Documents | grouped by type, upload component, rejected docs first with reason | Upload | |
| S10 Invoices | filter (open / paid / past due), list rows with status chip, amount, due date | Pay / Download PDF | past due in danger |
| S11 Messages | thread list (per shipment + general), chat thread | Send | WhatsApp hand-off link |
| S12 Notifications | feed; settings sheet with toggle rows per event x channel | Mark all read | |
| S13 Address book | segmented: senders / recipients / pickup addresses; cards with default star | Add address | |
| S14 Account | profile, language, theme (light / dark / gold / system), biometric, company & team, referral, delete account (danger zone) | Save | |
| S15 Reports | date range, KPI tiles (shipments, kg, spend, on-time %), monthly bars | Export CSV | could-have |
| S16 Public tracking | standalone page, no tab bar: ID + PIN fields, timeline only (no names or phones) | Track | rate-limited message on too many tries |

## 5. Admin screens (staff, `admin.html`)

| ID | layout | primary action | role |
| --- | --- | --- | --- |
| S17 Staff sign in | centred card, email + password | Sign in | all staff |
| S18 Ops dashboard | KPI tiles = queue counts (new bookings, intake today, payments to confirm, docs to review, unread chats, open exceptions); "latest shipments" table; each tile links to its queue | Open queue | all, tiles filtered by role |
| S19 Booking review | queue table (oldest first) + detail panel (customer, goods, docs, price breakdown); Accept / Reject with reason (sheet) | Accept | herne_staff, support |
| S20 Shipment ops | header with status chip and "next step: X" button; intake check (ID + PIN, pieces, actual weight, condition, photos); ETA editor per step; exceptions; delivery proof (photos, receiver, signature) | Move to next step | herne_staff |
| S21 Rates | table per direction: goods x mode, rate/kg, min charge, weight breaks, validity, active toggle; edit in sheet with "applies from" date; surcharges tab; customer rules tab; change history | Save rate | admin, accountant |
| S22 Quote builder | two-column on lg: form (lane, cargo, lines) and live branded preview; send to customer | Send quote | herne_staff, support |
| S23 Payments + invoices | tabs: to confirm (bank receipts with image preview), invoices (status filter), issue invoice | Confirm payment | accountant |
| S24 Customers | searchable table: name, phone, role, shipments, balance; detail with price rules and history | Open customer | support, accountant, admin |
| S25 Document review | queue; large preview (pdf / image) + approve / reject with reason | Approve | support, herne_staff |
| S26 Support inbox | two-pane on lg: threads (unread first) + chat; customer context side panel (latest shipment, status) | Reply | support |
| S27 Team + roles | staff list with role chips; add / change role by email; audit log tab | Save role | admin |
| S28 Insights | KPI tiles + charts: bookings per week, revenue, close rate of quotes, average review time | (read only) | admin |

## 6. Content rules (fresh copy, AR / DE / EN)

- Arabic is the source language; German is written natively, not machine
  translated; English is a fallback.
- Short, direct verbs on buttons: "احصل على السعر" / "Preis berechnen",
  "احجز" / "Buchen", "تتبّع" / "Verfolgen".
- Status names are the 7 existing T.K steps; never import another
  platform's milestone names.
- Errors say what happened and what to do: "الرمز غير صحيح. تحقق من رسالة
  الحجز." / "PIN falsch. Bitte prüfe deine Buchungsbestätigung."

## 7. Build order for the design system

1. Load `tokens.css` and map today's variables to roles (one alias block:
   `--bg: var(--c-bg); --ink: var(--c-text); ...`) so the live app keeps
   working while components migrate. Needs approval: touches `index.html`.
2. Primitives as in `primitives.html`: button, field, option group, chip,
   timeline, card, sheet, toast, table.
3. Customer screens S01-S08, then admin S18-S20 (the must-haves from
   `architecture.md` step 2), then the rest.
