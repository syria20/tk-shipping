# Recon map: digital freight forwarding platform, customer + admin (web, mobile-first)

Scope: the shared customer + operator pattern of digital freight platforms
(Freightos, Flexport, Forto): quote -> book -> documents -> track milestones ->
invoice and pay -> support, plus the forwarder/admin side that prices quotes,
confirms bookings, updates milestones and collects payment.
Not a copy of any one product. Each row cites which platform shows it.

For: T.K Group's own business (tk-shipping): groupage road freight between
Germany, the Netherlands, France and Syria, with a hub in Herne. Arabic-first,
RTL, installable PWA, on Supabase.
Date: 2026-11-24

Method: public pages only, read through the session proxy at human pace. No
account was used, no login, no app code or network calls were looked at. No
screenshots were taken (no browser attached), so `replica/screens/` is empty;
add reference screenshots later from the public product pages if wanted.
Terms: nothing here used an account, so no account-terms issue applies.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site (Freightos) | https://www.freightos.com/ | product map: Marketplace, Rate Book & Manage, forwarder tools, calculators |
| 2 | product page: Marketplace | https://www.freightos.com/marketplace/ | shipper core loop: compare quotes by price, transit time, reviews; book; docs; messaging; support |
| 3 | product page: Rate, Book & Manage | https://www.freightos.com/enterprise/rate-book-manage/ | spot vs contract rates, centralized tracking and documents, approval audit trail |
| 4 | forwarder product: Rate & Quote | https://www.freightos.com/forwarders/rate-quote/ | admin side: rate management, surcharges, markup profiles, customer-specific rules, branded quotes |
| 5 | forwarder product: Sales Portal | https://www.freightos.com/forwarders/sales-portal/ | forwarder's self-service customer portal: quote, book, track, docs, comms; close rates, price sensitivity |
| 6 | forwarder product: Pay | https://www.freightos.com/forwarders/pay/ | payment by bank transfer, card or credit line; deposit funds; "pay what you see" |
| 7 | public API docs (Flexport) | https://developers.flexport.com/ | object list: bookings, commercial invoices, customs entries, documents, freight invoices, products, POs, shipments |
| 8 | API tutorial: Bookings | https://developers.flexport.com/tutorials/booking/ | booking request fields; async ops review; amendments; parties and locations pre-configured |
| 9 | API tutorial: Shipments | https://developers.flexport.com/tutorials/shipment-api-tutorial/ | shipment object: status, mode, incoterm, estimated/actual dates per milestone, parties, legs, docs |
| 10 | API tutorial: Documents | https://developers.flexport.com/tutorials/documents-api-tutorial/ | document fields and ~40 document types |
| 11 | API tutorial: Freight invoices | https://developers.flexport.com/tutorials/freight-invoices-api-tutorial/ | invoice fields, statuses (past_due, void seen), filters |
| 12 | product page: Ship by Forto | https://forto.com/en/solutions/platform/ | Ship it / Monitor it / Measure it; urgent issues first on login; reports |
| 13 | product page: Forto LCL | https://forto.com/en/solutions/lcl/ | small-volume consolidation (closest to T.K groupage); add-on services |
| 14 | product page: Forto Advanced Notifications | https://forto.com/en/advanced-notifications/ | notification events per stage; per-event and per-channel settings |
| 15 | own app (tk-shipping) | `index.html`, `admin.html` in this repo | what already exists; used for the `notes` column only |

Unavailable: help.freightos.com (403 from the site), help.flexport.com (no
response), developer.freightos.com (connection reset). Help-center detail
(settings screens, exact form validation) is therefore thinner than ideal.

## Core loop

A customer gets a price for moving goods from A to B, books it online, sends
the documents, follows every milestone until delivery, and pays the invoice,
without a single email. (Sources 2, 3, 12.)

## Screens

Customer side (S01-S16), operator/admin side (S17-S28). Admin screens of these
platforms are not public; their content is inferred from the forwarder product
pages (4, 5, 6) and the API's async ops-review model (8). Marked "inferred".

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home + quick quote | `/` | start a price search in one form | lane picker (origin, destination), mode, load type, weight/volume, ready date, CTA | empty, filled, invalid lane |
| S02 | Quote results | after S01 search | compare options side by side | option cards (price all-in, transit time, mode, service level, provider rating), sort by price/speed/CO2, filter | loading, results, no options for lane, expired quote |
| S03 | Sign up / log in | gate before booking | account to book and track | email/password, social, forgot password | default, error, verify email |
| S04 | Booking form | "Book" on an option | turn a quote into a booking request | parties (shipper, consignee), pickup and delivery addresses, cargo lines (units, count, weight, volume), goods description + HS code, DG/battery/magnet flags, cargo ready date, add-ons (pickup, export customs, import customs, insurance) | empty, partially filled, validation errors, saved draft |
| S05 | Review + pay | step after S04 | confirm totals and pay or choose payment method | price breakdown incl. surcharges, payment method (card, bank transfer, credit), promo code, T&C tick | default, payment failed, pending bank transfer |
| S06 | Booking confirmation | after S05 | booking received, what happens next | booking number, next steps, docs to upload, add to tracking | confirmed, pending ops review |
| S07 | Shipments dashboard | `/shipments` | all shipments, urgent first | issue banner, list/table (ref, lane, mode, status, ETA), filters (status, mode, date), search | empty (first-time), filled, filtered-empty, loading |
| S08 | Shipment detail | click a shipment | everything about one shipment | milestone timeline (estimated vs actual), status chip, cargo summary, parties, tabs: documents, invoices, messages, history | in progress, delayed, exception, delivered, cancelled |
| S09 | Documents | S08 tab, or `/documents` | upload and download shipment docs | upload by document type, file list, memo, download, archive | empty, uploading, uploaded, rejected (inferred) |
| S10 | Invoices | `/invoices` | see and pay what is owed | list with status (open, paid, past_due, void), due date, total, balance, filter by shipment/date, pay button, PDF | empty, open, past due, paid |
| S11 | Messages | S08 tab, or support entry | talk to the forwarder about a shipment | thread per shipment, composer, attachments, unread badge | empty, unread, sent, failed |
| S12 | Notifications centre + settings | bell icon; settings page | see alerts; choose which events and which channel | feed, per-event toggles, channel (in-app, email) | empty, unread, settings saved |
| S13 | Address book / parties | settings or inline in S04 | reuse shippers, consignees, locations | party list, add/edit form | empty, filled |
| S14 | Account, company and team | `/settings` | profile, company, users and roles | profile form, member list, invite, role select | default, invite pending |
| S15 | Reports | `/reports` | performance and emissions over time | charts, date range, export | empty, filled |
| S16 | Public tracking | `/track/:ref` (no login) | consignee checks status without an account | ref input, milestone timeline | not found, in transit, delivered |
| S17 | Staff log in | `/admin` | operator access | email/password | default, error, no permission |
| S18 | Ops dashboard (inferred) | after S17 | work queues | counters: new bookings, payments to confirm, docs to review, exceptions, unread chats | empty queues, busy |
| S19 | Booking review (inferred) | queue item | accept, amend or reject a booking request | booking detail, accept/reject, amendment diff | pending, accepted, rejected, amended |
| S20 | Shipment ops (inferred) | search or queue | move a shipment through milestones | set status/milestone, ETA, intake check (pieces, actual weight, photos), delivery proof (photo, signature, receiver name) | each status |
| S21 | Rate management | admin nav | the price list | rate sheets per lane/mode, surcharges, validity dates, markup profiles, customer-specific rules | empty, active, expired rates |
| S22 | Quote builder | admin nav / from a request | make a branded quote by hand for non-standard cargo | lane, cargo, rates applied, margin, PDF/send | draft, sent, accepted, expired |
| S23 | Payments + invoicing (inferred) | admin nav | issue invoices, confirm bank transfers/COD | invoice list, confirm payment, receipt view | pending, confirmed, rejected |
| S24 | Customers (inferred) | admin nav | customer accounts and their pricing | list, detail, assigned markup, credit | default |
| S25 | Document review (inferred) | queue item | check customer docs | doc preview, approve/reject with reason | pending, approved, rejected |
| S26 | Support inbox (inferred) | admin nav | answer customer threads | thread list, reply, mark read | unread, answered |
| S27 | Staff and roles (inferred) | admin nav | who can do what | member list, role assignment | default |
| S28 | Sales insights | admin nav | close rates, price sensitivity, online sales volume | KPIs, charts | empty, filled |

## Flows

```
F01 Customer gets an instant price
    S01 -> S02
    happy path clicks: 3 (fill lane, fill cargo, search)
    edge: lane not served; weight over limit; DG goods need manual quote (-> F07)

F02 Customer books a quoted option and pays
    S02 -> S03 (if not logged in) -> S04 -> S05 -> S06
    happy path clicks: ~6 with saved parties (choose option, pick shipper, pick consignee, confirm cargo, pick payment, pay)
    edge: quote expired while filling; payment fails; bank transfer pending; amendment after submit

F03 Ops confirms a booking (inferred from async review, source 8)
    S18 -> S19 -> accept -> customer notified (S12)
    edge: missing party/address; rate no longer valid -> amendment back to customer

F04 Customer uploads documents
    S08 -> S09 -> pick type -> upload
    edge: wrong file type; doc rejected by ops (S25) and re-upload

F05 Shipment moves through milestones
    S20 (ops sets milestone, ETA) -> S12 notification -> S08 timeline updates
    T.K stages today: booked -> received at Herne -> in T.K warehouse -> in transit -> customs -> arrived in destination country -> delivered
    edge: delay, cargo-ready-date change, rolled cargo, customs hold (Forto event list, source 14)

F06 Customer tracks without logging in
    S16 -> enter ref -> timeline
    happy path clicks: 2

F07 Manual quote for non-standard cargo
    customer request -> S22 builds quote -> customer accepts on S02/S05 -> F02

F08 Invoice and payment
    S23 issues invoice -> S10 customer pays (card) or uploads bank receipt -> S23 confirms -> status paid
    edge: past due; void; partial payment

F09 Support conversation
    S08/S11 customer writes -> S26 staff replies -> unread badges both sides

F10 Delivery with proof
    S20 delivery: photo, receiver name, signature -> S08 shows proof -> rating prompt

F11 Notification preferences
    S12 settings -> toggle events per channel
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger | default, hover, focus, disabled, loading | all |
| Lane picker | origin/destination with country + city | empty, filled, unsupported | S01, S04, S21, S22 |
| Cargo line editor | unit type, count, weight, volume, dims | empty, valid, error | S01, S04, S22 |
| Date picker | single date | default, disabled past dates | S01, S04, S20 |
| Quote option card | cheapest, fastest, recommended | default, selected, expired | S02 |
| Price breakdown | base, surcharges, add-ons, total | default | S02, S05, S22 |
| Stepper | 3-4 steps | current, done, error | S04, S05 |
| Status chip | one colour per milestone/status | n/a | S07, S08, S10, S19, S20 |
| Milestone timeline | vertical, estimated vs actual | done, current, upcoming, delayed | S08, S16 |
| Data table / list | sortable, filterable | loading, empty, filtered-empty | S07, S10, S18-S27 |
| File upload | by document type | idle, uploading, done, error | S09, S20, S25 |
| Chat thread | customer, staff | unread, sent, failed | S11, S26 |
| Notification item + toggle row | per event, per channel | read/unread, on/off | S12 |
| Modal / sheet | confirm, form | open, closed | many |
| Toast | success, error, info | n/a | all |
| Signature pad + photo capture | delivery proof | empty, captured | S20 |
| Empty state | per list | n/a | S07, S09, S10, S11, S12 |
| KPI tile + chart | count, money, trend | loading, empty | S15, S18, S28 |

## Inferred data model

```
Company     id, name, type (customer | business), credit_limit?, markup_profile_id?
            evidence: Freightos customer-specific pricing (4), credit lines (6), Flexport legal entities (8)
            confidence: medium

User        id, company_id, email, name, phone, role (customer | business | ops | support | accountant | admin), locale
            evidence: S14, S27; tk-shipping roles already exist
            confidence: high

Party       id, company_id, kind (shipper | consignee | buyer | seller | importer_of_record), name, contact, address
            evidence: Flexport booking requires shipper/consignee refs; shipment has shippers, consignees, buyers, sellers, importers_of_record (8, 9)
            confidence: high

Location    id, company_id, label, country, city, street, postcode, geo?
            evidence: origin_address_ref / destination_address_ref (8)
            confidence: high

Rate        id, lane_from, lane_to, mode, unit (kg | cbm | piece | pallet), price_per_unit, min_charge, valid_from, valid_to, kind (contract | spot)
            evidence: rate sheets, validity, spot vs contract (3, 4)
            confidence: medium

Surcharge   id, rate_id?, name, type (flat | per_unit | percent), amount
            evidence: "all surcharges and fees" (4, 6)
            confidence: medium

MarkupProfile id, name, percent, min_margin; CustomerRule (company_id, markup_profile_id, lane?)
            evidence: "default markup profiles and customer-specific commercial rules" (4)
            confidence: medium

Quote       id, company_id?, lane, mode, cargo (json), ready_date, options[], status (draft | sent | accepted | expired), valid_until
QuoteOption id, quote_id, price_total, breakdown (json), transit_days, service_level
            evidence: S02 compare by price and transit time (2); branded quotes (4)
            confidence: medium

Booking     id, quote_option_id?, company_id, shipper_party_id, consignee_party_id, origin_location_id, destination_location_id,
            cargo_ready_date, delivery_date?, wants_pickup, wants_export_customs, wants_import_customs, wants_insurance,
            status (requested | accepted | rejected | amended | cancelled)
            evidence: Flexport booking fields and async ops review (8)
            confidence: high

BookingAmendment id, booking_id, changes (json), status (pending | accepted | rejected)
            evidence: /booking_amendments (8)
            confidence: high

Shipment    id, booking_id, ref, mode (road | ocean | air | rail), freight_type, incoterm?, status, priority,
            pieces, calculated_weight, calculated_volume, actual_weight?,
            estimated_/actual_ departure, arrival, picked_up, delivered dates
            evidence: shipment object (9)
            confidence: high

CargoLine   id, booking_id, unit_type, count, weight_kg, volume_cbm, description, hs_code?, contains_dg, contains_li_ion, contains_magnets
            evidence: cargo.shipping_units, product_descriptions, DG flags (8)
            confidence: high

Leg         id, shipment_id, seq, from, to, mode, carrier?, etd, eta, atd, ata
            evidence: shipment.legs (9)
            confidence: medium

MilestoneEvent id, shipment_id, code, at, estimated (bool), by_user_id, note, location?
            evidence: estimated vs actual dates (9); milestone notifications (12, 14); tk shipment_status_log
            confidence: high

Document    id, shipment_id, type (commercial_invoice | packing_list | certificate_of_origin | proforma | ... ), file_name, mime_type, memo,
            uploaded_by, uploaded_at, review_status (pending | approved | rejected)?, archived_at
            evidence: documents API, ~40 types (10); review_status is a guess
            confidence: high (review_status: guess)

Invoice     id, number, company_id, shipment_id, issued_at, due_date, total, balance, currency, status (open | paid | past_due | void), voided_at, notes
            evidence: invoice object; statuses past_due, void seen (11); open/paid are a guess
            confidence: medium

Payment     id, invoice_id, method (card | bank_transfer | credit | cod | wallet), amount, status (pending | confirmed | rejected), receipt_file?, confirmed_by
            evidence: bank transfer, card, credit (6); cod/wallet from tk-shipping
            confidence: medium

MessageThread id, shipment_id?, company_id; Message id, thread_id, sender_id, body, attachments, read_at
            evidence: "communicate with providers" (2), "communicate ... with Forto customer service" (12)
            confidence: medium

Notification id, user_id, event, shipment_id?, channel, read_at
NotificationPreference user_id, event, in_app (bool), email (bool)
            evidence: per-event and per-channel settings; events: booking created/confirmed/cancelled, CRD change, rolled cargo, main carriage, customs, D&D (14)
            confidence: high
```

Relationships: Company 1-n User, Company 1-n Party, Company 1-n Location,
Quote 1-n QuoteOption, QuoteOption 1-0..1 Booking, Booking 1-n CargoLine,
Booking 1-n BookingAmendment, Booking 1-1 Shipment, Shipment 1-n Leg,
Shipment 1-n MilestoneEvent, Shipment 1-n Document, Shipment 1-n Invoice,
Invoice 1-n Payment, Shipment 1-0..1 MessageThread, User 1-n Notification.

## Feature matrix

See `features.csv`. Must: 28, should: 17, could: 9, skip: 9.

## Out of scope (cannot or should not be cloned)

- A marketplace of 30+ third-party forwarders and their reviews: that is a network, not a product feature (source 2).
- Live carrier/airline capacity and rates via carrier API connections, and 100+ logistics partner data feeds (sources 4, 6, 12).
- Proprietary market data: freight indices, Terminal benchmarking (source 1).
- Licensed customs brokerage (Clearit, US/CA) and insurance underwriting: regulated licences. T.K can offer its own customs service in its own name.
- Credit lines / trade finance: regulated lending.
- Each platform's brand, copy and illustrations.

## Size

Screens 28, flows 11, entities 20. Hard parts:
1. Pricing engine: rates per lane and unit, surcharges, minimums, markups, customer rules, quote validity.
2. Milestone tracking with estimated vs actual dates and the notification rules on top of it (manual ops updates for T.K, no carrier feeds).
3. Payments: card plus bank-transfer and COD confirmation, invoices with balances and past-due.
Also: documents and customs per lane (Syria rules), Arabic RTL + German/English, role-based admin.

Size: L (a quarter) from scratch. tk-shipping already covers much of the
customer loop, the status log, chat, docs, payments and staff roles, so the
real gap work (rates/quotes, invoices, notification settings, reports) is
closer to M.
