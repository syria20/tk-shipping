// Turns replica/test-results.json into replica/test-report.md
"use strict";
const fs = require("fs");
const path = require("path");
const R = JSON.parse(fs.readFileSync(path.join(__dirname, "../../replica/test-results.json"), "utf8"));
const L = [];
const ok = (b) => (b ? "pass" : "**FAIL**");
const VIEW_NAMES = {
  home: "Home (tracking search, active shipment, services, shipments list)", send: "Send: route, goods, weight", eu2sy: "Send EU → Syria", sy2eu: "Send Syria → EU",
  recip: "Recipient, mode, hand-over", cart: "Cart", pay: "Payment", payc: "Cart payment", paid: "Booking confirmed", paidc: "Cart confirmed",
  detail: "Shipment detail", chat: "Support chat", bills: "Invoices", wallet: "Wallet", points: "Points", refer: "Referral", more: "Settings / more", acct: "Account / sign in"
};

L.push("# Test report: old vs new screens (T.K UI v2, steps 0-3)", "");
L.push("Run: " + R.started + " → " + R.finished + ". Supabase fully mocked (tests/harness), nothing reached the live project.");
L.push("Blocked external hosts during the run: " + (R.blocked.length ? R.blocked.join(", ") : "none") + ".", "");
L.push("Variants: **orig** = index.html / admin.html exactly as committed; **off** = current files with the hook lines, switch off (what customers get); **on** = switch on (`?ui=2`).", "");

/* network */
L.push("## 1. Supabase calls on load (customer signed in)", "");
const base = JSON.stringify(R.network.find((n) => n.variant === "orig").calls);
L.push("| variant | calls | same as orig | writes during load | page errors |", "| --- | --- | --- | --- | --- |");
R.network.forEach((n) => L.push(`| ${n.variant} | ${n.calls.length} | ${ok(JSON.stringify(n.calls) === base)} | ${n.writes.length ? n.writes.join(", ") : "none"} | ${n.errors.length} |`));
L.push("");

/* views */
L.push("## 2. Every existing customer view (iPhone 13)", "");
L.push("“off = orig” compares visible text and every action handler (onclick / onchange / oninput) on the screen. “on” is either the new screen (S07/S08) or the old view unchanged.", "");
L.push("| lang | view | off = orig | on | errors orig / off / on |", "| --- | --- | --- | --- | --- |");
R.views.forEach((v) => {
  const on = v.onReplaced ? "new " + v.on.tku : ok(v.onSameAsOrig) + " (old view)";
  L.push(`| ${v.lang} | ${v.view}: ${VIEW_NAMES[v.view] || ""} | ${ok(v.offSameAsOrig)} | ${on} | ${v.orig.errors.length} / ${v.off.errors.length} / ${v.on.errors.length} |`);
});
const vFail = R.views.filter((v) => !v.offSameAsOrig || (!v.onReplaced && !v.onSameAsOrig) || v.on.errors.length > v.orig.errors.length);
L.push("", vFail.length ? "Differences: " + vFail.map((v) => v.lang + "/" + v.view).join(", ") : "No differences: with the switch off every view is identical to the original; with it on, every view except detail is unchanged.", "");

/* parity */
L.push("## 3. S08 Shipment detail: new vs old, per shipment", "");
L.push("Data = shipment ID, recipient, description, delivered-to name. Actions = every handler the old detail offers (rate, documents upload/delete, proof photos, bank details copy, invoice print, repeat...).", "");
L.push("| lang | shipment | step | data missing in new | actions missing in new | new extra actions | file inputs old/new | status times old/new | new Supabase calls | errors |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
R.parity.forEach((p) => L.push(`| ${p.lang} | ${p.id} | ${p.step} | ${p.missingData.length ? p.missingData.join("; ") : "none"} | ${p.missingActions.length ? p.missingActions.join(", ") : "none"} | ${p.extraActions.join(", ") || "none"} | ${p.fileInputs.join(" / ")} | ${p.timesShownOld} / ${p.timesShown} | ${p.newNetworkCalls} | ${p.errors.length} |`));
L.push("");

/* layout */
L.push("## 4. Layout: iPhone 13 (390px) and desktop (1440px)", "");
L.push("| screen | variant | lang | viewport | horizontal overflow (px) | errors |", "| --- | --- | --- | --- | --- | --- |");
R.layout.forEach((x) => L.push(`| ${x.screen} | ${x.variant} | ${x.lang} | ${x.vp} | ${x.overflow != null ? x.overflow : "n/a"} | ${(x.errors || []).length} |`));
L.push("");

/* keyboard */
L.push("## 5. Keyboard only (desktop, German, switch on)", "");
R.keyboard.forEach((k) => {
  L.push("- " + k.steps.join("; "));
  L.push("- focus ring on the focused card: " + k.focusRing);
  L.push("- Enter opens the detail: " + ok(k.openedDetail) + "; Shift+Tab reaches Back, Enter returns to the list: " + ok(k.backToList));
  L.push("- errors: " + k.errors.length);
});
L.push("");

/* admin */
L.push("## 6. Admin panel (admin.html)", "");
L.push("| state | viewport | same text orig / off / on | errors orig / off / on | overflow on |", "| --- | --- | --- | --- | --- |");
R.admin.forEach((a) => L.push(`| ${a.who} | ${a.vp} | ${ok(a.sameText)} | ${a.orig.errors.length} / ${a.off.errors.length} / ${a.on.errors.length} | ${a.on.overflow} |`));
L.push("");

fs.writeFileSync(path.join(__dirname, "../../replica/test-report.md"), L.join("\n") + "\n");
console.log("wrote replica/test-report.md");
