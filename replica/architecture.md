# Architecture: T.K Group shipping platform (customer + admin), built on the existing tk-shipping app

Input: `replica/recon.md`, `replica/features.csv` (2026-11-24).
SQL: `replica/schema.sql` (additive, **not applied**).
Status: plan only. No existing code, table, function, policy or bucket is
changed by anything in `replica/`.

## Ground rules from you

1. Keep the existing Supabase project: database, Auth, bookings, admin panel.
2. Change nothing existing now. Every new thing sits next to the old one:
   new tables are prefixed `tk_`, new functions `tk_*`. Where an existing RPC
   needs extra behaviour, a `*_v2` wrapper calls the original instead of
   editing it. The client switches to a v2 behind a flag, so going back is
   one line.
3. Anything that would touch an existing object is listed separately under
   "Later, needs your approval".

## What exists today (read from index.html / admin.html)

| part | today |
| --- | --- |
| client | two static single-file apps: `index.html` (customer, Arabic RTL + DE/EN, PWA) and `admin.html` (staff); `web/index.html` German company site |
| auth | Supabase Auth: email + password, OAuth, password reset, local biometric unlock |
| tables (13) | profiles, shipments, shipment_items, shipment_status_log, shipment_docs, shipment_files, payments, invoices, wallet_ledger, referrals, notifications, chat_messages, seller |
| RPCs (22) | create_shipment, set_status, verify_intake, record_delivery, confirm_payment, review_doc, add_shipment_doc, delete_my_doc, add_shipment_file, delete_shipment_file, chat_send, chat_reply, chat_threads_list, chat_mark_read(_staff), rate_shipment, set_user_role, wallet_balance, delete_my_account, ... |
| storage | buckets `shipment-docs`, `shipment-files` |
| roles | customer, business, herne_staff, support, accountant, admin |
| statuses | 7 steps, stored as an index 0-6: booked, received in Herne, in T.K warehouse, in transit, customs, arrived in destination country, delivered |
| pricing | **in the browser**: `RATE` per goods type (EUR/kg), `MODES`, a 0.50 EUR/kg break over 1000 kg, a further 0.25 EUR/kg for business, 55 EUR per oil tin. `create_shipment` does not take a price, so the server computes one too (two copies of the price list). |
| payments | bank transfer (receipt + staff confirm), COD, wallet; "card" is offered but **no card processor is integrated** |
| notifications | `notifications` table read in-app; channel toggles (WhatsApp, SMS, email) live only in localStorage; **nothing sends email/WhatsApp/SMS/push** |
| saved recipients/addresses | localStorage only |
| schema source | **no migrations in the repo**; the schema lives only in Supabase |

## Stack

You already have a stack, so the plan keeps it (skill rule: use what the user
knows). No framework rewrite, one database, no microservices.

| layer | choice | why |
| --- | --- | --- |
| web | keep the static HTML/JS PWA (`index.html`, `admin.html`) | it works, ships with no build step, and you know it; new screens are added as views in the same files |
| styling | existing CSS, tokens from `/replica-design` | keeps the current RTL look consistent |
| database | existing Supabase Postgres + 21 new `tk_` tables | one database; RLS already used by the client |
| business logic | Postgres functions (RPC, `security definer`) | same pattern as today's 22 RPCs; one place for prices and permissions |
| server code | Supabase Edge Functions (Deno) | only for what SQL cannot do: Stripe, sending messages, PDFs, IP-based rate limit |
| auth | existing Supabase Auth | unchanged |
| payments | Stripe Checkout (card, SEPA debit, Apple/Google Pay) via an Edge Function; bank/COD/wallet stay as they are | hosted page = no card data on your site; **check Syria-related acceptance with Stripe first** (see "parts that bite") |
| email | Resend from an Edge Function | simple API, EU region available, DKIM on your domain |
| WhatsApp | WhatsApp Business Cloud API (Meta, official) | customers already use WhatsApp; needs approved Arabic templates |
| push | Web Push (VAPID) from the existing service worker | free; works for the installed PWA (iOS 16.4+ only when installed) |
| jobs | pg_cron (SQL jobs) + one scheduled Edge Function (`send-outbox`, every minute) | both built into Supabase |
| files | existing Storage buckets + new `invoices` bucket (private) | same signed-URL pattern as today |
| hosting | keep the current static host | nothing to move |
| migrations | Supabase CLI: `supabase db dump` once, then `supabase/migrations/*.sql` in the repo | today the schema exists only in the cloud; this makes it reviewable and repeatable |

## Schema

Tables: 21 new (`replica/schema.sql`). Access rules: Postgres RLS on every
new table; all writes to money, prices, reviews, invoices and audit go
through `security definer` functions that check `tk_has_role()` first.

| group | tables | covers |
| --- | --- | --- |
| pricing | tk_rates, tk_rate_breaks, tk_surcharges, tk_price_rules | S21; replaces the hard-coded price list; one `tk_price()` used everywhere |
| quotes | tk_quotes | S02, S22, F01, F07 |
| booking ops | tk_booking_reviews, tk_amendments | S19, F03 |
| tracking | tk_milestone_estimates, tk_exceptions | S07, S08, S16, F05 (actuals stay in `shipment_status_log`) |
| billing | tk_invoice_meta, tk_checkout_sessions, tk_webhook_events | S10, S23, F08 (1-1 extension of `invoices`) |
| notifications | tk_notification_prefs, tk_outbox, tk_push_subscriptions | S12, F11 (in-app rows still go to `notifications`) |
| account | tk_address_book, tk_orgs, tk_org_members, tk_org_shipments | S13, S14 |
| platform | tk_audit_log, tk_rate_limits | admin accountability, public-endpoint abuse |

Conventions: uuid keys, `created_at`/`updated_at` with a trigger, money as
integer cents + currency, `timestamptz`, check constraints on every status,
an index on every foreign key and filter column, an `on delete` rule on every
foreign key (cascade for child rows, restrict for invoices and payments,
set null for "who did it").

Hard constraints in the database, not the UI:
- one decision per booking: `tk_booking_reviews` primary key + "first decision wins" update; a second call raises `already reviewed`
- one active rate per lane + start date (partial unique index)
- one default address per kind per user (partial unique index)
- webhook replay: primary key `(provider, event_id)`
- duplicate messages: `tk_outbox.dedupe_key` unique
- double card submit: `tk_checkout_sessions.idempotency_key` unique
- a void invoice must carry `voided_at` (check)

**Verified:** `schema.sql` was applied to a throwaway Postgres 16 with
stand-in versions of profiles/shipments/invoices/notifications/status log.
Results: the price function returned the expected totals (5 kg = 30.00 EUR;
1,200 kg uses the weight break; a business rule adds a discount line;
optional pickup adds 15.00 EUR), quotes were saved, public tracking returned
milestones for the right PIN and refused a wrong one, and the booking review
wrote one audit row and one notification. A second review raised
`already reviewed` (that bug was found by the test and fixed). The temporary
database was deleted.

**Assumptions to check in Step 0** (from client code, not from the schema):
`shipments.id` is text, `invoices.id` is bigint, `shipments.owner` is the
customer's uuid, `shipments.pin` is plain text, `notifications` has
`(user_id, kind, payload)`. If any differs, adjust the FK types in
`schema.sql` before applying.

## API

Conventions: `rpc` = `supabase.rpc(name)` from the browser; `edge` =
Supabase Edge Function; `table` = direct select/insert under RLS.
"existing" = already in your app, unchanged.

### F01 Instant price / F07 manual quote

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc tk_quote_create | price a lane server-side and save the quote | anyone | direction, goods, mode, from, to, qty, addons[] | quote (ref, total, breakdown, days, valid_until) | F01 |
| table tk_rates / tk_surcharges (select) | public price list for the calculator UI | anyone | filters | rows | F01 |
| rpc tk_quote_manual_create | build a quote by hand for odd cargo | herne_staff, support | lane, cargo, lines[], valid_until | quote (draft) | F07 |
| rpc tk_quote_send | mark sent, notify customer | herne_staff, support | quote_id | quote (open) | F07 |
| rpc tk_quote_accept | customer accepts, goes to booking | quote owner | quote_ref | ok | F07 -> F02 |

### F02 Book and pay

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc create_shipment | existing booking (kept as is) | customer | existing params | shipment_id, pin | F02 |
| rpc tk_create_shipment_v2 | check quote is open and theirs, call `create_shipment`, record the quote's price, link quote, open a pending review, notify | customer | quote_ref, recipient, items[], addons[], pay method, idempotency_key | shipment_id, pin, total | F02 |
| edge POST /create-checkout | Stripe Checkout session for 1..n shipments | shipment owner | shipment_ids[], idempotency_key | redirect url | F02, F08 |
| edge POST /stripe-webhook | verify signature, store event once, mark session paid, insert `payments` row, mark invoice paid, notify | Stripe | Stripe event | 200 | F02, F08 |
| table tk_address_book | save/reuse senders and recipients | owner | row | row | F02 |

### F03 Ops confirms booking

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc tk_booking_queue | pending reviews, oldest first, with customer + goods | herne_staff, support | limit | rows | F03 |
| rpc tk_review_booking | accept / reject with reason (in schema.sql) | herne_staff, support | shipment_id, accept, reason | void | F03 |
| rpc tk_amendment_request | customer asks to change a booking | owner | shipment_id, changes | amendment | F03 |
| rpc tk_amendment_decide | accept / reject an amendment, reprice | herne_staff, support | amendment_id, accept | void | F03 |

### F04 Documents

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc add_shipment_doc / delete_my_doc | existing | owner | existing | existing | F04 |
| rpc tk_review_doc_v2 | call existing `review_doc`, then notify on rejection | herne_staff, support | doc_id, ok, why | void | F04 |

### F05 Milestones / F06 public tracking / F10 delivery

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc tk_set_status_v2 | refuse if the step moved since the screen loaded, call existing `set_status`, notify | herne_staff | shipment_id, new_step, expected_step | void | F05 |
| rpc tk_set_eta | upsert estimate per step, notify on change > 24 h | herne_staff | shipment_id, step, estimated_at, reason | void | F05 |
| rpc tk_exception_open / tk_exception_resolve | delay, customs hold, damage... | herne_staff, support | shipment_id, kind, note | id | F05 |
| rpc verify_intake / record_delivery | existing | herne_staff | existing | existing | F05, F10 |
| rpc tk_record_delivery_v2 | existing `record_delivery` + notify "delivered" + rating prompt | herne_staff | existing | void | F10 |
| edge GET /track?ref&pin | hash IP, call `tk_track_public` (service role), cache 60 s | anyone | ref, pin | milestones only | F06 |

### F08 Invoices and payments

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc tk_invoice_issue | create `invoices` row + meta (due date, cents), enqueue PDF, notify | accountant | shipment_id, due_days | invoice | F08 |
| rpc tk_invoice_void | void with reason (never delete) | accountant | invoice_id, reason | void | F08 |
| edge POST /invoice-pdf | render the PDF, save to `invoices` bucket | internal (outbox job) | invoice_id | path | F08 |
| rpc tk_my_invoices | invoices + status + balance for the caller | customer | filters | rows | F08 |
| rpc confirm_payment | existing bank/COD confirmation | accountant | existing | existing | F08 |
| rpc tk_confirm_payment_v2 | existing + update invoice balance/status + notify | accountant | shipment_id | void | F08 |

### F09 Support / F11 notification settings

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc chat_send / chat_reply / chat_threads_list / chat_mark_read* | existing | as today | existing | existing | F09 |
| realtime `chat_messages`, `notifications` | live updates instead of reload | owner / staff (RLS) | subscribe | changes | F09 |
| table tk_notification_prefs | per-event, per-channel toggles | owner | rows | rows | F11 |
| table tk_push_subscriptions | register this device for push | owner | endpoint, keys | row | F11 |

### Admin: rates, customers, team, reports

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc tk_rate_upsert / tk_rate_retire | edit price list; closes the old rate's `valid_to` instead of overwriting; audit row | admin, accountant | rate fields | rate | S21 |
| rpc tk_surcharge_upsert | edit add-ons and surcharges | admin, accountant | fields | row | S21 |
| rpc tk_price_rule_upsert | customer / business discounts | admin, accountant | fields | row | S21, S24 |
| rpc tk_customers | search customers with shipment count and balance | staff | q, page | rows | S24 |
| rpc set_user_role | existing | admin | existing | existing | S27 |
| rpc tk_org_create / tk_org_invite / tk_org_remove | company accounts and team | org owner | fields | org / member | S14 |
| rpc tk_ops_kpis | queue counters + volumes for a date range | staff | from, to | json | S18, S28 |
| rpc tk_my_report | customer's shipments, spend, on-time rate | customer | from, to | json | S15 |
| table tk_audit_log (select) | who changed what | admin | filters | rows | S27 |

Routes: 38 (11 existing kept, 27 new: 22 RPCs + 4 Edge Functions + realtime).

Webhooks in: Stripe (`checkout.session.completed`, `checkout.session.expired`,
`charge.refunded`), WhatsApp Cloud API status callbacks (delivered/failed,
optional). Webhooks out: none.

Jobs:
| name | schedule | what it does |
| --- | --- | --- |
| send-outbox (Edge, scheduled) | every minute | claims up to 50 `queued` rows (`for update skip locked`), sends email / WhatsApp / SMS / push, retries with backoff up to 5 times, marks `failed` after |
| tk-expire-quotes (pg_cron) | hourly at :15 | open quotes past `valid_until` -> expired |
| tk-past-due (pg_cron) | daily 06:05 UTC | open invoices past due date -> past_due + reminder via outbox |
| tk-rate-limit-gc (pg_cron) | hourly | drop old rate-limit windows |
| tk-stale-bookings (pg_cron) | every 2 h | bookings pending review > 24 h -> alert to support |

Only official APIs with your own keys: Stripe, Resend, WhatsApp Business
Cloud API, Web Push. Nothing from Freightos, Flexport or Forto is called.

## The parts that bite

- **Prices in two places.** Today the browser and `create_shipment` each hold a price list. Step 1 makes `tk_price()` the single source; the browser only displays what the server returns. Until cutover, a test compares old and new prices for every goods type, mode and weight band.
- **Time zones.** Customers are in Europe/Berlin (summer time changes) and Asia/Damascus. Store UTC (`timestamptz`), show each viewer's zone. Pickup slots (09-12, 12-16, 16-20) are local wall-clock times: store slot + date + zone, not a UTC instant.
- **Idempotency.** Stripe retries webhooks (PK on event id). The cart loop calls `create_shipment` once per item: v2 takes an idempotency key so a double tap or flaky network can't create two shipments. Outbox `dedupe_key` stops double WhatsApps.
- **Races.** Two staff updating the same shipment: `tk_set_status_v2` takes `expected_step` and refuses if it changed. Two decisions on one booking: first wins (tested). Bank-transfer confirm twice: v2 checks the current payment status in the same transaction.
- **Card payments and Syria.** Card processors apply sanctions screening, and routes to Syria can trigger reviews or refusal. Before building, confirm with Stripe (or Mollie/SumUp as alternatives) that T.K's business model is supported. Keep bank transfer and COD as fallbacks either way.
- **Sanctions and goods rules.** EU rules restrict some goods to Syria. The goods-type list and the customs-docs step are the natural control points; get legal advice on the rules. This plan only gives you the switch: `tk_rates.active` per goods type and direction.
- **GDPR vs. bookkeeping.** `delete_my_account` exists. German law requires keeping invoices and booking records for up to 10 years, so deletion should anonymise the profile (name, phone, email) and keep invoices. Check what the existing function does in Step 0.
- **Public tracking abuse.** Needs ref + PIN, returns no names, phones or addresses, limited to 10 lookups per minute per IP hash, and is only reachable through the Edge Function.
- **RLS on existing tables is unknown.** The anon key is in the page source, which is normal *only* if every existing table has correct RLS. Step 0 audits this; it is the biggest unknown in the plan.
- **File sizes.** Customer photos and documents from phones: compress images in the browser to ≤ 2 MB, cap uploads at 10 MB, allow pdf/jpg/png/heic only, and enforce the same limits in the bucket settings.
- **Realtime.** Chat and notifications switch from reload to Supabase Realtime subscriptions under the same RLS. Cap at one channel per open screen.
- **Offline at the Herne counter.** Intake on a weak connection: v2 intake calls are safe to retry (idempotent), and the UI queues them until online. Full offline sync is out of scope.
- **Email and WhatsApp delivery.** Email needs SPF + DKIM + DMARC on the sending domain. WhatsApp needs Meta business verification and pre-approved Arabic, German and English templates per event; plan two weeks for approval.
- **Multi-tenancy.** Business customers with teams: shipments are linked to orgs through `tk_org_shipments`, so the existing `shipments.owner` model is unchanged.
- **Search.** Admin search by shipment id, name or phone works at today's 300-row limit. Past a few thousand shipments, add trigram indexes (this touches existing tables, so it's under "Later, needs your approval").
- **Rate limits outbound.** WhatsApp and SMS providers cap messages per second; the outbox sends in batches of 50 per minute and backs off on 429 responses.

## Build order

### Step 0: safety first (no code changes)
- Take a backup / enable point-in-time recovery on the Supabase project.
- `supabase db dump --schema-only` into `supabase/schema-baseline.sql` (read-only; commit it so the schema is finally in git).
- Audit RLS on all 13 existing tables and the 2 buckets; list gaps.
- Confirm the assumptions above and the open questions below.
- Create a staging copy (Supabase branch or second project). Everything below lands on staging first.

### 1. Vertical slice: server-side pricing, end to end
Rates live in the database, staff can change a price, and the customer sees
and books at that price without the browser's price list.
- Screens: S21 (minimal rate table), S01 + S02 (calculator reads `tk_quote_create`), S06 (shows the server total)
- Tables: tk_rates, tk_rate_breaks, tk_surcharges, tk_price_rules, tk_quotes, tk_audit_log
- Routes: tk_quote_create, tk_rate_upsert, tk_create_shipment_v2 (behind a flag; v1 stays)
- Done when: changing a rate in S21 changes the next quote and booking, and the old-vs-new price comparison test passes for every goods type

### 2. Must-haves (by area, from features.csv)
- **Booking ops:** S18 queues, S19 review. Tables tk_booking_reviews. Routes tk_booking_queue, tk_review_booking, tk_ops_kpis.
- **Tracking:** S07 urgent-first, S08 estimated vs actual, S16 public tracking. Tables tk_milestone_estimates, tk_exceptions, tk_rate_limits. Routes tk_set_status_v2, tk_set_eta, tk_exception_*, edge /track.
- **Billing:** S10 invoices, S05 card pay, S23. Tables tk_invoice_meta, tk_checkout_sessions, tk_webhook_events. Routes tk_invoice_issue/void, tk_my_invoices, tk_confirm_payment_v2, edge /create-checkout, /stripe-webhook.
- **In-app notifications on every event:** S12 feed. Routes tk_notify (internal), v2 wrappers for docs and delivery.
- **Admin rates (full):** S21 surcharges and weight breaks. Route tk_surcharge_upsert.

### 3. Should-haves
Amendments (tk_amendments), add-on services at booking, server-side address
book (S13), email + WhatsApp + push via outbox with per-event settings (S12,
send-outbox job), invoice PDF, document archive, customer management (S24),
customer price rules (tk_price_rules UI), company accounts and teams (S14),
manual quote builder (S22), realtime chat.

### 4. Could-haves
Sales insights (S28), customer reports (S15), emissions per shipment, branded
quote PDF, spot vs contract rate validity, repeat-shipment and rating
improvements.

### 5. Fixes from /replica-entrepreneur
Not run yet. Its findings slot in after step 2.

## Later, needs your approval (touches existing objects)

- Switch `index.html` / `admin.html` calls from v1 to v2 RPCs (client change, one flag).
- Make `create_shipment` read `tk_price()` instead of its own price list, then delete the browser `RATE`/`MODES` constants.
- Trigram search indexes on `shipments` and `profiles`.
- Optional triggers on existing tables (e.g. `shipment_status_log` insert -> notify) as an alternative to v2 wrappers.
- Any RLS fixes the Step 0 audit finds.

## Open questions

1. Business discount: today it's 0.25 EUR/kg off over 1,000 kg, on top of the general 0.50 EUR/kg break. Keep it per-kg, or change to a percentage? (`tk_price_rules` does percent; a per-kg business break would be a second `tk_rate_breaks` row scoped to business.)
2. Olive oil: per kg (3.43 EUR) or per 16 L tin (55 EUR), or both depending on packing?
3. Transit days: today they're computed from distance in the browser. Fixed days per lane in `tk_rates`, or keep the distance formula server-side?
4. Card payments: Stripe, or a provider you already have a contract with?
5. Which channels first: WhatsApp, email, SMS, push?
