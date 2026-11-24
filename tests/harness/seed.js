// Seed data for the mocked Supabase project. Shapes follow the columns the
// app selects (read from index.html / admin.html). Fictional people only.
"use strict";

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const STAFF_ID = "22222222-2222-4222-8222-222222222222";
const T0 = Date.parse("2026-11-01T08:00:00Z");
const iso = (h) => new Date(T0 + h * 3600e3).toISOString();

// One shipment per status step (0..6) plus edge cases.
const SHIPMENTS = [
  { id: "TK100000", status: 0, dir: "eu2sy", goods: "newc", from_place: "برلين", to_place: "دمشق", weight_kg: 25, mode: "road", price: 150, recipient_name: "سامر الحلبي", recipient_phone: "+963944000001", description: "", city: "", created_at: iso(200) },
  { id: "TK100001", status: 1, dir: "eu2sy", goods: "elec", from_place: "هامبورغ", to_place: "حلب", weight_kg: 40, mode: "road", price: 200, recipient_name: "ليلى حداد", recipient_phone: "+963944000002", description: "تلفاز وغسالة", city: "", created_at: iso(170) },
  { id: "TK100002", status: 2, dir: "eu2sy", goods: "tools", from_place: "بافاريا", to_place: "حمص", weight_kg: 120, mode: "sea", price: 600, recipient_name: "يوسف خليل", recipient_phone: "+963944000003", description: "", city: "", created_at: iso(150) },
  { id: "TK100003", status: 3, dir: "eu2sy", goods: "used", from_place: "برلين", to_place: "اللاذقية", weight_kg: 1200, mode: "road", price: 6600, discount: 300, promo_code: "TK10", recipient_name: "محمد عبد الرحمن بن سليمان الشامي الدمشقي المقيم في حي المزة الغربي", recipient_phone: "+963944000004", description: "", city: "", created_at: iso(120) },
  { id: "TK100004", status: 4, dir: "eu2sy", goods: "mnew", from_place: "هيسن", to_place: "طرطوس", weight_kg: 800, mode: "sea", price: 4000, recipient_name: "رنا سعيد", recipient_phone: "+963944000005", description: "آلة خياطة صناعية مع قطع الغيار الأصلية وكتيب التشغيل باللغة الألمانية والعربية، مغلفة على منصة خشبية", city: "", created_at: iso(90) },
  { id: "TK100005", status: 5, dir: "eu2sy", goods: "newc", from_place: "بريمن", to_place: "دمشق", weight_kg: 10, mode: "air", price: 60, recipient_name: "عمر ناصر", recipient_phone: "+963944000006", description: "", city: "", created_at: iso(60) },
  { id: "TK100006", status: 6, dir: "eu2sy", goods: "newc", from_place: "برلين", to_place: "دمشق", weight_kg: 30, mode: "road", price: 180, recipient_name: "هبة يوسف", recipient_phone: "+963944000007", description: "", city: "", pod_by: "هبة يوسف", delivered_at: iso(40), rating: 5, created_at: iso(10) },
  { id: "TK100007", status: 6, dir: "sy2eu", goods: "mn", from_place: "دمشق", to_place: "برلين", weight_kg: 15, mode: "road", price: 90, recipient_name: "Anna Schmidt", recipient_phone: "+4915100000008", description: "", city: "", pod_by: "Anna Schmidt", delivered_at: iso(30), created_at: iso(5) }
].map((r) => Object.assign({ owner: CUSTOMER_ID, discount: 0, promo_code: null, rating: null, pod_by: null, delivered_at: null, pin: "4821" }, r));

const STATUS_LOG = [];
SHIPMENTS.forEach((r) => { for (let i = 0; i <= r.status; i++) STATUS_LOG.push({ shipment_id: r.id, status: i, at: new Date(Date.parse(r.created_at) + i * 26 * 3600e3).toISOString() }); });

const PAYMENTS = SHIPMENTS.map((r, i) => ({ id: i + 1, shipment_id: r.id, method: i === 0 ? "bank" : i === 1 ? "cod" : "card", status: i <= 1 ? "pending" : "paid", kind: "main", amount: r.price, created_at: r.created_at, paid_at: i <= 1 ? null : r.created_at }));
const INVOICES = SHIPMENTS.filter((r) => r.status >= 1).map((r, i) => ({ id: i + 1, shipment_id: r.id, number: "RE-2026-" + String(101 + i), issued_at: r.created_at, amount: r.price }));
const ITEMS = [
  { id: 1, shipment_id: "TK100001", name: "تلفاز", qty: 1, value_eur: 300 },
  { id: 2, shipment_id: "TK100001", name: "غسالة", qty: 1, value_eur: 250 },
  { id: 3, shipment_id: "TK100004", name: "آلة خياطة", qty: 1, value_eur: 2400 }
];
const DOCS = [
  { id: 1, shipment_id: "TK100004", name: "فاتورة الشراء.pdf", status: "rejected", why: "الصورة غير واضحة", file_path: CUSTOMER_ID + "/TK100004/invoice.pdf" },
  { id: 2, shipment_id: "TK100004", name: "شهادة المنشأ.pdf", status: "approved", why: null, file_path: CUSTOMER_ID + "/TK100004/origin.pdf" }
];
const FILES = [
  { id: 1, shipment_id: "TK100006", kind: "delivery_photo", path: "TK100006/delivery.png", created_at: iso(40) },
  { id: 2, shipment_id: "TK100006", kind: "signature", path: "TK100006/signature.png", created_at: iso(40) }
];

function profiles(role) {
  return [
    { id: CUSTOMER_ID, name: "Ahmad Test", phone: "+4917700000000", email: "kunde@example.test", role: "customer", ref_code: "TKREF1", company: null, vat_id: null },
    { id: STAFF_ID, name: "Staff Test", phone: "+4917700000001", email: "staff@example.test", role: role || "admin", ref_code: null, company: null, vat_id: null }
  ];
}

function tables(role) {
  const P = profiles(role);
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  return {
    profiles: P,
    shipments: SHIPMENTS.map((r) => Object.assign({}, r, { profiles: { name: byId[r.owner].name, phone: byId[r.owner].phone, email: byId[r.owner].email } })),
    shipment_status_log: STATUS_LOG,
    payments: PAYMENTS,
    invoices: INVOICES,
    shipment_items: ITEMS,
    shipment_docs: DOCS,
    shipment_files: FILES,
    wallet_ledger: [{ id: 1, user_id: CUSTOMER_ID, kind: "top", amount: 50, ref: "", note: "", created_at: iso(1) }],
    referrals: [],
    notifications: [{ id: 1, user_id: CUSTOMER_ID, kind: "status", payload: { shipment_id: "TK100003", status: 3 }, created_at: iso(121) }],
    chat_messages: [],
    seller: [{ id: 1, name: "T.K Group", street: "Teststraße 1", city: "Herne", phone: "+49 000 000", tax_no: "000/000/00000", vat_id: "DE000000000" }]
  };
}

module.exports = { CUSTOMER_ID, STAFF_ID, SHIPMENTS, tables };
