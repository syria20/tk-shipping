/* T.K demo preview: in-browser fake of the Supabase client.
 *
 * Loaded by preview/index.html INSTEAD of the real supabase-js library, so
 * `window.supabase.createClient(...)` in the app returns this fake. It:
 *   - signs in a fictional demo customer automatically (no real account)
 *   - answers every read from fake data held in memory
 *   - refuses every write (insert/update/delete, write RPCs, uploads)
 *   - makes NO network requests; fetch / XHR / beacons to anywhere are
 *     answered locally or refused (and the page's CSP blocks them too)
 * All people, phone numbers and shipments below are invented.
 */
(function () {
  "use strict";

  var LOG = (window.__TK_DEMO_LOG = { reads: [], blockedWrites: [], blockedNetwork: [] });
  function lang() { try { return localStorage.getItem("tk-lang") || "ar"; } catch (e) { return "ar"; } }
  var MSG = {
    ar: "هذه نسخة تجريبية: الحجز والدفع والمحادثة والتقييم ورفع الملفات معطّلة.",
    de: "Demo-Version: Buchen, Bezahlen, Chat, Bewertungen und Uploads sind deaktiviert.",
    en: "Demo version: booking, payment, chat, ratings and uploads are disabled."
  };
  function demoMsg() { return MSG[lang()] || MSG.ar; }
  function demoError(what) { LOG.blockedWrites.push(what); return { message: demoMsg(), code: "DEMO", details: what }; }

  /* ---------------- no network at all ---------------- */
  var SB_HOST = /\.supabase\.co/i;
  var realFetch = window.fetch;
  window.fetch = function (input) {
    var url = String(input && input.url || input);
    LOG.blockedNetwork.push(url);
    if (SB_HOST.test(url) && /\/auth\/v1\/settings/.test(url)) {
      // the app asks which sign-in providers exist; answer locally
      return Promise.resolve(new Response(JSON.stringify({ external: { email: true, google: false, apple: false } }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.reject(new TypeError("Demo preview: network requests are disabled"));
  };
  void realFetch;
  var XO = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
  if (XO) window.XMLHttpRequest.prototype.open = function (m, u) { LOG.blockedNetwork.push(String(u)); throw new Error("Demo preview: network requests are disabled"); };
  if (navigator.sendBeacon) navigator.sendBeacon = function (u) { LOG.blockedNetwork.push(String(u)); return false; };
  try { window.WebSocket = function (u) { LOG.blockedNetwork.push(String(u)); throw new Error("Demo preview: network requests are disabled"); }; } catch (e) {}

  /* ---------------- fake data ---------------- */
  var UID = "d3m0c0de-0000-4000-8000-000000000001";
  var now = Date.now(), DAY = 864e5;
  function ago(days, hours) { return new Date(now - days * DAY + (hours || 0) * 36e5).toISOString(); }

  var shipments = [
    { id: "TK482915", status: 3, dir: "eu2sy", goods: "used", from_place: "شمال الراين-فستفاليا", to_place: "دمشق", weight_kg: 46, mode: "road", price: 276, recipient_name: "سامر الحلبي", recipient_phone: "+963 944 120 455", description: "ملابس شتوية وأحذية للأطفال", created_at: ago(6) },
    { id: "TK482871", status: 4, dir: "eu2sy", goods: "elec", from_place: "هامبورغ", to_place: "حلب", weight_kg: 62, mode: "road", price: 310, recipient_name: "ليلى حداد", recipient_phone: "+963 933 778 201", description: "غسالة أوتوماتيكية وتلفاز 55 بوصة", created_at: ago(9) },
    { id: "TK482640", status: 1, dir: "eu2sy", goods: "newc", from_place: "برلين", to_place: "اللاذقية", weight_kg: 18, mode: "road", price: 108, recipient_name: "يوسف خليل", recipient_phone: "+963 955 300 812", description: "", created_at: ago(2) },
    { id: "TK482599", status: 0, dir: "eu2sy", goods: "tools", from_place: "بافاريا", to_place: "حمص", weight_kg: 120, mode: "sea", price: 600, recipient_name: "ورشة الأمل للنجارة", recipient_phone: "+963 31 245 8800", description: "عدة نجارة كهربائية جديدة مع كفالة", created_at: ago(1) },
    { id: "TK482333", status: 5, dir: "eu2sy", goods: "mnew", from_place: "هيسن", to_place: "طرطوس", weight_kg: 840, mode: "sea", price: 4200, recipient_name: "محمد عبد الرحمن بن سليمان الشامي، شركة الساحل للخياطة", recipient_phone: "+963 43 221 9070", description: "آلة خياطة صناعية مع قطع الغيار الأصلية وكتيّب التشغيل، مغلّفة على منصة خشبية", created_at: ago(24) },
    { id: "TK481990", status: 2, dir: "eu2sy", goods: "newc", from_place: "بريمن", to_place: "دمشق", weight_kg: 9, mode: "air", price: 54, recipient_name: "رنا سعيد", recipient_phone: "+963 944 556 017", description: "", created_at: ago(3) },
    { id: "TK481502", status: 6, dir: "eu2sy", goods: "newc", from_place: "برلين", to_place: "دمشق", weight_kg: 30, mode: "road", price: 180, recipient_name: "هبة يوسف", recipient_phone: "+963 999 410 266", description: "هدايا عيد", created_at: ago(40), pod_by: "هبة يوسف", delivered_at: ago(29), rating: 5 },
    { id: "TK481377", status: 6, dir: "sy2eu", goods: "mn", from_place: "دمشق", to_place: "برلين", weight_kg: 15, mode: "road", price: 90, recipient_name: "Anna Schneider", recipient_phone: "+49 151 2345 6789", description: "زيتون ومكدوس وزعتر", created_at: ago(55), pod_by: "Anna Schneider", delivered_at: ago(44) }
  ].map(function (r) {
    return Object.assign({ owner: UID, discount: 0, promo_code: null, rating: null, pod_by: null, delivered_at: null, city: "", pin: "" }, r);
  });

  var log = [];
  shipments.forEach(function (r) {
    for (var i = 0; i <= r.status; i++) log.push({ shipment_id: r.id, status: i, at: new Date(Date.parse(r.created_at) + i * 1.6 * DAY + 3 * 36e5).toISOString() });
  });
  var payments = shipments.map(function (r, i) {
    var unpaid = r.status === 0;
    return { id: i + 1, shipment_id: r.id, method: unpaid ? "bank" : i % 3 === 0 ? "card" : i % 3 === 1 ? "bank" : "cod", status: unpaid ? "pending" : "paid", kind: "main", amount: r.price, created_at: r.created_at, paid_at: unpaid ? null : r.created_at };
  });
  var invoices = shipments.filter(function (r) { return r.status >= 1; }).map(function (r, i) {
    return { id: i + 1, shipment_id: r.id, number: "TK-RE-2026-" + String(1180 + i), issued_at: r.created_at, amount: r.price };
  });
  var tables = {
    profiles: [{ id: UID, name: "كريم حداد", phone: "+49 176 0000 1234", email: "demo@tk-preview.invalid", role: "customer", ref_code: "KARIM7", company: null, vat_id: null }],
    shipments: shipments,
    shipment_status_log: log,
    payments: payments,
    invoices: invoices,
    shipment_items: [
      { id: 1, shipment_id: "TK482871", name: "غسالة أوتوماتيكية", qty: 1, value_eur: 380 },
      { id: 2, shipment_id: "TK482871", name: "تلفاز 55 بوصة", qty: 1, value_eur: 420 },
      { id: 3, shipment_id: "TK482333", name: "آلة خياطة صناعية", qty: 1, value_eur: 2600 }
    ],
    shipment_docs: [
      { id: 1, shipment_id: "TK482333", name: "فاتورة الشراء.pdf", status: "rejected", why: "الصورة غير واضحة، يرجى رفع نسخة أوضح", file_path: "demo/invoice.pdf" },
      { id: 2, shipment_id: "TK482333", name: "شهادة المنشأ.pdf", status: "approved", why: null, file_path: "demo/origin.pdf" }
    ],
    shipment_files: [
      { id: 1, shipment_id: "TK481502", kind: "delivery_photo", path: "demo/delivery.svg", created_at: ago(29) },
      { id: 2, shipment_id: "TK481502", kind: "signature", path: "demo/signature.svg", created_at: ago(29) }
    ],
    wallet_ledger: [
      { id: 2, user_id: UID, kind: "pay", amount: -54, ref: "TK481990", note: "", created_at: ago(3) },
      { id: 1, user_id: UID, kind: "top", amount: 100, ref: "", note: "شحن رصيد", created_at: ago(12) }
    ],
    referrals: [{ id: 1, referrer: UID, rewarded: true }],
    notifications: [
      { id: 3, user_id: UID, kind: "status", payload: { shipment_id: "TK482871", status: 4 }, created_at: ago(1) },
      { id: 2, user_id: UID, kind: "status", payload: { shipment_id: "TK482915", status: 3 }, created_at: ago(2) },
      { id: 1, user_id: UID, kind: "status", payload: { shipment_id: "TK481502", status: 6 }, created_at: ago(29) }
    ],
    chat_messages: [
      { id: 1, thread_id: 1, user_id: UID, from_staff: false, body: "مرحباً، متى تصل شحنة حلب؟", at: ago(1, -5), read_by_user: true },
      { id: 2, thread_id: 1, user_id: UID, from_staff: true, body: "أهلاً كريم! الشحنة الآن في التخليص الجمركي، ونتوقع وصولها خلال 3–4 أيام.", at: ago(1, -4), read_by_user: true }
    ],
    seller: [{ id: 1, name: "T.K Group (Demo)", street: "Musterstraße 1", city: "Herne", phone: "+49 000 000000", tax_no: "000/000/00000", vat_id: "DE000000000" }]
  };
  var RPC_READ = {
    wallet_balance: function () { return 46; },
    chat_mark_read: function () { return null; },
    chat_threads_list: function () { return []; }
  };

  /* ---------------- query builder (reads only) ---------------- */
  function Query(table) {
    this.t = table; this.f = []; this.o = null; this.lim = null; this.mode = "many"; this.write = null;
  }
  Query.prototype.select = function () { return this; };
  Query.prototype.eq = function (c, v) { this.f.push(function (r) { return String(r[c]) === String(v); }); return this; };
  Query.prototype.neq = function (c, v) { this.f.push(function (r) { return String(r[c]) !== String(v); }); return this; };
  Query.prototype.in = function (c, vs) { var s = (vs || []).map(String); this.f.push(function (r) { return s.indexOf(String(r[c])) >= 0; }); return this; };
  Query.prototype.is = function (c, v) { this.f.push(function (r) { return v === null ? r[c] == null : r[c] === v; }); return this; };
  Query.prototype.not = function (c, op, v) { if (op === "is" && v === null) this.f.push(function (r) { return r[c] != null; }); return this; };
  Query.prototype.filter = function (c, op, v) {
    if (op === "eq") return this.eq(c, v);
    if (op === "is" && (v === null || v === "null")) return this.is(c, null);
    return this;
  };
  Query.prototype.order = function (c, o) { this.o = { c: c, asc: !(o && o.ascending === false) }; return this; };
  Query.prototype.limit = function (n) { this.lim = n; return this; };
  Query.prototype.range = function () { return this; };
  Query.prototype.single = function () { this.mode = "single"; return this; };
  Query.prototype.maybeSingle = function () { this.mode = "maybe"; return this; };
  ["insert", "update", "upsert", "delete"].forEach(function (w) {
    Query.prototype[w] = function () { this.write = w; return this; };
  });
  Query.prototype._run = function () {
    if (this.write) return { data: null, error: demoError(this.write + " " + this.t) };
    LOG.reads.push(this.t);
    var rows = (tables[this.t] || []).filter(function (r) { return this.f.every(function (fn) { return fn(r); }); }, this);
    if (this.o) { var o = this.o; rows = rows.slice().sort(function (a, b) { return (a[o.c] > b[o.c] ? 1 : a[o.c] < b[o.c] ? -1 : 0) * (o.asc ? 1 : -1); }); }
    if (this.lim != null) rows = rows.slice(0, this.lim);
    rows = JSON.parse(JSON.stringify(rows));
    if (this.mode === "single") return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "not found", code: "PGRST116" } };
    if (this.mode === "maybe") return { data: rows[0] || null, error: null };
    return { data: rows, error: null, count: rows.length };
  };
  Query.prototype.then = function (ok, bad) { var r = this._run(); return Promise.resolve(r).then(ok, bad); };

  /* ---------------- placeholder images for proof of delivery ---------------- */
  function svg(label) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="#13151d"/>' +
      '<rect x="8" y="8" width="304" height="224" rx="14" fill="none" stroke="#d4af37" stroke-opacity=".5"/>' +
      '<text x="160" y="128" fill="#e6c66b" font-family="sans-serif" font-size="18" text-anchor="middle">' + label + "</text></svg>");
  }

  /* ---------------- auth ---------------- */
  var user = { id: UID, aud: "authenticated", role: "authenticated", email: "demo@tk-preview.invalid", app_metadata: { provider: "email" }, user_metadata: { name: "كريم حداد" }, created_at: ago(300) };
  var session = { access_token: "demo", refresh_token: "demo", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, user: user };
  var signedIn = true, listeners = [];
  function emit(ev) { var s = signedIn ? session : null; listeners.slice().forEach(function (cb) { setTimeout(function () { try { cb(ev, s); } catch (e) { console.error(e); } }, 0); }); }

  var auth = {
    getSession: function () { return Promise.resolve({ data: { session: signedIn ? session : null }, error: null }); },
    getUser: function () { return Promise.resolve({ data: { user: signedIn ? user : null }, error: null }); },
    onAuthStateChange: function (cb) {
      listeners.push(cb);
      setTimeout(function () { try { cb("INITIAL_SESSION", signedIn ? session : null); } catch (e) { console.error(e); } }, 0);
      return { data: { subscription: { unsubscribe: function () { listeners = listeners.filter(function (x) { return x !== cb; }); } } } };
    },
    // Any email/password signs in the demo customer. Nothing is sent anywhere.
    signInWithPassword: function () { signedIn = true; emit("SIGNED_IN"); return Promise.resolve({ data: { session: session, user: user }, error: null }); },
    signUp: function () { return Promise.resolve({ data: { user: null, session: null }, error: demoError("auth.signUp") }); },
    signOut: function () { signedIn = false; emit("SIGNED_OUT"); return Promise.resolve({ error: null }); },
    signInWithOAuth: function () { return Promise.resolve({ data: null, error: demoError("auth.signInWithOAuth") }); },
    resetPasswordForEmail: function () { return Promise.resolve({ data: null, error: demoError("auth.resetPasswordForEmail") }); },
    updateUser: function () { return Promise.resolve({ data: null, error: demoError("auth.updateUser") }); },
    refreshSession: function () { return auth.getSession(); }
  };

  var client = {
    auth: auth,
    from: function (t) { return new Query(t); },
    rpc: function (fn) {
      if (RPC_READ[fn]) { LOG.reads.push("rpc:" + fn); return Promise.resolve({ data: RPC_READ[fn](), error: null }); }
      return Promise.resolve({ data: null, error: demoError("rpc " + fn) });
    },
    storage: {
      from: function (bucket) {
        return {
          createSignedUrls: function (paths) { return Promise.resolve({ data: (paths || []).map(function (p) { return { path: p, signedUrl: svg(/signature/.test(p) ? "Signatur (Demo)" : "Foto (Demo)"), error: null }; }), error: null }); },
          createSignedUrl: function (p) { return Promise.resolve({ data: { signedUrl: svg("Demo") }, error: null }); },
          getPublicUrl: function () { return { data: { publicUrl: svg("Demo") } }; },
          upload: function () { return Promise.resolve({ data: null, error: demoError("storage.upload " + bucket) }); },
          remove: function () { return Promise.resolve({ data: null, error: demoError("storage.remove " + bucket) }); }
        };
      }
    },
    channel: function () { var c = { on: function () { return c; }, subscribe: function () { return c; }, unsubscribe: function () {} }; return c; },
    removeChannel: function () {}
  };

  window.supabase = { createClient: function () { return client; } };
  window.__TK_DEMO = { message: demoMsg };
})();
