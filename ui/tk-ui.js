/* T.K UI v2 runtime. Loaded (synchronously) by index.html and admin.html.
 *
 * Feature switch
 *   ?ui=2  -> turn on for this browser (stored in localStorage "tk-ui2")
 *   ?ui=0  -> turn off
 *   Default: OFF. With the switch off this file only defines window.TKUI and
 *   TKUI.on() always returns false, so the app renders exactly as before.
 *
 * Per-screen switches: localStorage "tk-ui2-off" = "detail,ships" disables
 * single new screens while the rest stay on.
 *
 * Contract with the existing app (index.html draw()):
 *   if (window.TKUI && TKUI.on(v) && (h = TKUI.render(v, s))) {} else <old code>
 * If a new screen throws or returns "", the old view renders instead.
 *
 * New screens never call Supabase themselves. They read the state the app
 * already loaded (s.ships, s.user, ...) and reuse the app's own helpers
 * (podCard, rateCard, invBtns, ...) for every action, so behaviour is the
 * same as today.
 */
(function () {
  "use strict";
  var KEY = "tk-ui2", OFF_KEY = "tk-ui2-off";

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  try {
    var q = new URLSearchParams(location.search).get("ui");
    if (q === "2") lsSet(KEY, "1");
    else if (q === "0") lsSet(KEY, null);
  } catch (e) {}

  var enabled = lsGet(KEY) === "1";
  var off = (lsGet(OFF_KEY) || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  var screens = {};
  var ui = { filter: "all" };   // view state owned by the new screens

  if (enabled) {
    var root = document.documentElement;
    root.classList.add("tk-ui2");
    // admin.html has no data-tk attribute but always shows the gold look
    var isAdmin = /admin\.html?$/.test(location.pathname);
    root.classList.add(isAdmin ? "tku-admin" : "tku-customer");
    if (!root.hasAttribute("data-tk") && isAdmin) root.classList.add("tku-gold");
  }

  /* ---------- i18n: fresh copy, Arabic source, German native ---------- */
  var DICT = {
    ar: {
      myShipments: "شحناتي", shipments1: "شحنة واحدة", shipmentsN: "{n} شحنات", shipments2: "شحنتان",
      all: "الكل", active: "قيد الشحن", delivered: "تم تسليمها",
      back: "رجوع", detail: "تفاصيل الشحنة", copy: "نسخ", copied: "تم النسخ",
      eta: "الوصول المتوقع خلال {a}–{b} أيام", etaShort: "{a}–{b} أيام", deliveredDone: "وصلت الشحنة إلى المستلم",
      timeline: "مسار الشحنة", pending: "لم يتم بعد",
      details: "معلومات الشحنة", route: "المسار", city: "المدينة", goods: "البضاعة", weight: "الوزن", qty: "الكمية",
      mode: "طريقة الشحن", handover: "التسليم", dropoff: "في نقطة T.K · هيرنه", pickup: "استلام من العنوان",
      pickupTime: "موعد الاستلام", pickupAddr: "عنوان الاستلام", sender: "المرسل", recipient: "المستلم",
      desc: "الوصف", booked: "تاريخ الحجز", amount: "المبلغ", payState: "الدفع", paid: "مدفوع", unpaid: "بانتظار الدفع",
      invoice: "الفاتورة", family: "أفراد العائلة", report: "رقم المحضر", crossing: "الاستلام حضورياً من معبر {c}",
      docs: "المستندات", docsVal: "فواتير وشهادة منشأ", customs: "الجمارك", exempt: "إعفاء: {e}", onCustomer: "على العميل",
      files: "الملفات المرفوعة", accepted: "مقبولة", inReview: "قيد المراجعة",
      dropTitle: "سلّم الشحنة في نقطة T.K · هيرنه", dropSub: "أعطِ الموظف رقم الشحنة وهذا الرمز",
      repeat: "كرر هذه الشحنة", send: "أرسل شحنة",
      emptyT: "لا توجد شحنات بعد", emptyD: "احجز أول شحنة وستظهر هنا مع كل مراحلها.",
      filteredT: "لا توجد شحنات في هذا التصنيف", showAll: "عرض الكل",
      guestT: "سجّل دخولك لرؤية شحناتك", guestD: "شحناتك محفوظة في حسابك وتظهر على كل أجهزتك.", signIn: "تسجيل الدخول",
      pick: "اختر شحنة من القائمة لعرض تفاصيلها", notFound: "لم نجد هذه الشحنة في حسابك",
      steps: ["تم الحجز", "استُلمت في هيرنه", "في مستودع T.K", "في الطريق", "في التخليص الجمركي", "وصلت إلى بلد الوجهة", "تم التسليم"],
      modes: { road: "بري", sea: "بحري", air: "جوي" }
    },
    de: {
      myShipments: "Meine Sendungen", shipments1: "1 Sendung", shipmentsN: "{n} Sendungen", shipments2: "2 Sendungen",
      all: "Alle", active: "Unterwegs", delivered: "Zugestellt",
      back: "Zurück", detail: "Sendungsdetails", copy: "Kopieren", copied: "Kopiert",
      eta: "Ankunft voraussichtlich in {a}–{b} Tagen", etaShort: "{a}–{b} Tage", deliveredDone: "Die Sendung wurde zugestellt",
      timeline: "Sendungsverlauf", pending: "Noch offen",
      details: "Angaben zur Sendung", route: "Strecke", city: "Stadt", goods: "Ware", weight: "Gewicht", qty: "Menge",
      mode: "Versandart", handover: "Übergabe", dropoff: "Bei T.K in Herne", pickup: "Abholung an der Adresse",
      pickupTime: "Abholtermin", pickupAddr: "Abholadresse", sender: "Absender", recipient: "Empfänger",
      desc: "Beschreibung", booked: "Gebucht am", amount: "Betrag", payState: "Zahlung", paid: "Bezahlt", unpaid: "Offen",
      invoice: "Rechnung", family: "Familienmitglieder", report: "Protokollnummer", crossing: "Persönliche Abholung am Grenzübergang {c}",
      docs: "Dokumente", docsVal: "Rechnungen und Ursprungszeugnis", customs: "Zoll", exempt: "Befreiung: {e}", onCustomer: "Trägt der Kunde",
      files: "Hochgeladene Dateien", accepted: "Angenommen", inReview: "In Prüfung",
      dropTitle: "Sendung bei T.K in Herne abgeben", dropSub: "Nenne dem Team die Sendungsnummer und diese PIN",
      repeat: "Sendung wiederholen", send: "Sendung aufgeben",
      emptyT: "Noch keine Sendungen", emptyD: "Buche deine erste Sendung – sie erscheint hier mit jedem Schritt.",
      filteredT: "Keine Sendungen in dieser Auswahl", showAll: "Alle anzeigen",
      guestT: "Melde dich an, um deine Sendungen zu sehen", guestD: "Deine Sendungen sind in deinem Konto gespeichert und auf allen Geräten sichtbar.", signIn: "Anmelden",
      pick: "Wähle links eine Sendung, um die Details zu sehen", notFound: "Diese Sendung ist nicht in deinem Konto",
      steps: ["Gebucht", "In Herne angenommen", "Im T.K-Lager", "Unterwegs", "In der Zollabfertigung", "Im Zielland angekommen", "Zugestellt"],
      modes: { road: "Straße", sea: "See", air: "Luft" }
    },
    en: {
      myShipments: "My shipments", shipments1: "1 shipment", shipmentsN: "{n} shipments", shipments2: "2 shipments",
      all: "All", active: "On the way", delivered: "Delivered",
      back: "Back", detail: "Shipment details", copy: "Copy", copied: "Copied",
      eta: "Expected in {a}–{b} days", etaShort: "{a}–{b} days", deliveredDone: "Delivered to the recipient",
      timeline: "Shipment history", pending: "Not yet",
      details: "About this shipment", route: "Route", city: "City", goods: "Goods", weight: "Weight", qty: "Quantity",
      mode: "Transport", handover: "Hand-over", dropoff: "At T.K in Herne", pickup: "Collected from your address",
      pickupTime: "Pick-up time", pickupAddr: "Pick-up address", sender: "Sender", recipient: "Recipient",
      desc: "Description", booked: "Booked on", amount: "Amount", payState: "Payment", paid: "Paid", unpaid: "Open",
      invoice: "Invoice", family: "Family members", report: "Report number", crossing: "Collected in person at {c}",
      docs: "Documents", docsVal: "Invoices and certificate of origin", customs: "Customs", exempt: "Exemption: {e}", onCustomer: "Paid by customer",
      files: "Uploaded files", accepted: "Accepted", inReview: "In review",
      dropTitle: "Drop off at T.K in Herne", dropSub: "Give the team your shipment number and this PIN",
      repeat: "Repeat this shipment", send: "Send a shipment",
      emptyT: "No shipments yet", emptyD: "Book your first shipment and follow every step here.",
      filteredT: "No shipments in this view", showAll: "Show all",
      guestT: "Sign in to see your shipments", guestD: "Your shipments are saved in your account on every device.", signIn: "Sign in",
      pick: "Choose a shipment to see its details", notFound: "This shipment isn't in your account",
      steps: ["Booked", "Received in Herne", "In T.K warehouse", "On the way", "In customs", "Arrived in destination country", "Delivered"],
      modes: { road: "Road", sea: "Sea", air: "Air" }
    }
  };
  function lang() { try { return (typeof LANG !== "undefined" && DICT[LANG]) ? LANG : "ar"; } catch (e) { return "ar"; } }
  function t(k, vars) {
    var d = DICT[lang()], v = d[k] != null ? d[k] : DICT.ar[k];
    if (typeof v === "string" && vars) v = v.replace(/\{(\w+)\}/g, function (_, n) { return vars[n] != null ? vars[n] : ""; });
    return v;
  }
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* Money: isolated LTR run so Arabic shows "150,00 €", never "€ 150,00". */
  function money(n) {
    var v = Number(n) || 0, l = lang();
    var s = v.toLocaleString(l === "de" ? "de-DE" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '<bdi class="tku-money" dir="ltr">' + (v < 0 ? "−" : "") + s.replace("-", "") + " €</bdi>";
  }
  function ltr(x) { return '<bdi dir="ltr" data-nt>' + esc(x) + "</bdi>"; }

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="tku-flip"><path d="m15 18-6-6 6-6"/></svg>',
    box: '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    user: '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  window.TKUI = {
    version: "0.1.0",
    enabled: enabled,
    register: function (view, fn) { screens[view] = fn; },
    on: function (view) { return enabled && !!screens[view] && off.indexOf(view) < 0; },
    render: function (view, state) {
      try { return screens[view](state, ui) || ""; }
      catch (e) { try { console.warn("[TKUI] screen '" + view + "' failed, using the old view:", e); } catch (_) {} return ""; }
    },
    /* small UI actions; they only change view state, then reuse the app's draw() */
    setFilter: function (f) { ui.filter = f; if (typeof draw === "function") draw(); },
    copy: function (txt, btn) {
      try { navigator.clipboard.writeText(txt); if (btn) { btn.textContent = t("copied"); } } catch (e) {}
    },
    t: t, esc: esc, money: money, ltr: ltr, icon: ICON, lang: lang,
    _ui: ui
  };
})();
