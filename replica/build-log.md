# Build log

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| baseline | 2026-11-24 | done | n/a | The app is one 364 KB file rendering 18 views from one `draw()`; German/English are produced by translating rendered Arabic text (~730 entries). Desktop is a 480px phone column. Baseline screenshots in `replica/baseline-screens/` (iPhone 13 + 1440px, Supabase blocked, 0 console errors). |
| plan | 2026-11-24 | done | approval | Plan in `build-plan.md`. First screen: S07 + S08 (read-only). No app code changed yet. |
| step 0 harness | 2026-11-24 | done | real-device Safari check | Supabase fully mocked (auth, REST, RPC, storage); the app's CDN copy of supabase-js is served locally (same pinned 2.45.4). Compares the committed files, switch off, and switch on. |
| step 1 tokens bridge | 2026-11-24 | done | n/a | The live app is always gold (`data-tk="1"`) but borrows light-theme status/mode colours: 7 of them fail AA on gold cards. Bridge remaps them + input borders + focus ring, only with the switch on. |
| step 2 shell | 2026-11-24 | partial | admin sidebar | Customer: desktop sidebar (= the existing nav, restyled) + wide main; old views centred at 560px. Admin: tokens + contrast only; its layout is unchanged (admin shell planned with step 10). |
| S07 | 2026-11-24 | done | search inside S07 (old home search still works) | No standalone list existed (it was part of home); added as view `ships`, reached from detail "back" and the desktop split. |
| S08 | 2026-11-24 | partial | estimated dates, exceptions (need DB) | Reuses the app's own helpers for every action (rating, documents, proof, bank, invoice, repeat), so behaviour is identical; parity tested on 8 shipments x AR/DE. |
