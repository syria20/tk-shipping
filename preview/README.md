# preview/: safe demo of the T.K app (fake data, no network)

`preview/index.html` is a generated **copy** of the customer app for testing
the new UI on a phone without any real account or data.

| | |
| --- | --- |
| Data | invented customer "كريم حداد" and 8 invented shipments, held in the browser |
| Login | signed in automatically; any email/password signs in the demo customer again; nothing is sent anywhere |
| Supabase | **not contacted.** The real supabase-js library is replaced by `demo-supabase.js`, and the page's Content-Security-Policy has `connect-src 'none'`, so the browser refuses every fetch/XHR/WebSocket, to Supabase or anywhere else |
| Actions | booking, payment, cart payment, chat, ratings, document upload/delete, repeat shipment, wallet, account deletion, password reset/change, Google sign-in and sign-up are disabled with a notice (`demo-guard.js`), and the fake client refuses every write as a second layer |
| Home screen | no manifest and no service worker, so "Add to Home Screen" opens this demo, never the real app |
| New UI | on by default; `?ui=0` shows the old screens for comparison |

Rebuild after changes to `index.html` or `ui/`:

```
python3 preview/build_preview.py
node tests/harness/preview-check.js <preview url>   # 0 Supabase requests, all actions blocked
```

`index.html` and the live website are not affected by anything in this folder.
