/* S07 My shipments + S08 Shipment detail (read-only screens).
 *
 * Data: only what index.html already loaded into `s` (s.user, s.ships, s.sel,
 * s.sk). No Supabase calls here.
 * Actions: every button calls the app's existing functions (go, reorder,
 * podCard, rateCard, bankCard, dkDoc, plDoc, invBtns, invDoc, pinOf,
 * trackMap), so rating, document upload/delete, proof of delivery, bank
 * details and invoices behave exactly as in the old detail view.
 * If one of those helpers is missing or throws, render() throws and TKUI
 * falls back to the old view (no silent loss of a feature).
 */
(function () {
  "use strict";
  if (!window.TKUI) return;
  var T = window.TKUI, t = T.t, esc = T.esc, money = T.money, ltr = T.ltr;

  function g(name) {               // a global from index.html (const/let or window)
    try { return (0, eval)(name); } catch (e) { return undefined; }
  }
  function need(name) {            // an app helper we rely on: must exist
    var f = window[name] || g(name);
    if (typeof f !== "function") throw new Error("missing helper " + name);
    return f;
  }
  function legacy(name, x) {       // render an existing action section unchanged
    return need(name)(x) || "";
  }

  function stepOf(x) { var n = +x.step; return n >= 0 && n <= 6 ? n : 0; }
  function place(i) { var C = g("C"); return C && C[i] ? C[i][0] : ""; }      // Arabic city name; tr() translates it for DE/EN like today
  function goodsName(x) { var TY = g("TYPES"); return TY && TY[x.f.type] ? TY[x.f.type][0] : ""; }
  function weight(x) { return need("wt")(x.f); }
  function isDelivered(x) { return stepOf(x) === 6; }

  function chipStatus(x) { var n = stepOf(x); return '<span class="tku-chip" data-s="' + n + '">' + esc(t("steps")[n]) + "</span>"; }
  function chipMode(x) { var m = x.f.mode; return '<span class="tku-chip" data-m="' + esc(m) + '">' + esc((t("modes") || {})[m] || m) + "</span>"; }
  function countLabel(n) { return n === 1 ? t("shipments1") : n === 2 ? t("shipments2") : t("shipmentsN", { n: n }); }

  function bar(title, sub, back) {
    return '<header class="tku-bar">' +
      (back ? '<button class="tku-iconbtn" onclick="' + back + '" aria-label="' + esc(t("back")) + '">' + T.icon.back + "</button>" : "") +
      "<h1>" + esc(title) + (sub ? "<small>" + sub + "</small>" : "") + "</h1></header>";
  }

  /* ---------------- S07 list ---------------- */
  function filtered(ships, f) {
    if (f === "active") return ships.filter(function (x) { return !isDelivered(x); });
    if (f === "delivered") return ships.filter(isDelivered);
    return ships;
  }

  function shipCard(x, current) {
    var n = stepOf(x), pc = Math.max(6, Math.round(n / 6 * 100));
    var meta = goodsName(x) + " · " + weight(x) + (isDelivered(x) ? "" : " · " + t("etaShort", { a: x.q.a, b: x.q.b }));
    return '<button class="tku-ship" data-s="' + n + '"' + (current ? ' aria-current="true"' : "") +
      " onclick=\"go('detail','" + esc(x.id) + "')\">" +
      '<i class="tku-rail" aria-hidden="true"></i>' +
      "<div style=\"min-width:0\">" +
        '<div class="tku-id">' + ltr(x.id) + "</div>" +
        '<div class="tku-route">' + esc(place(x.f.from)) + " ← " + esc(place(x.f.to)) + "</div>" +
        '<div class="tku-meta">' + esc(meta) + "</div>" +
        '<div class="tku-progress" role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="' + n + '"><i style="inline-size:' + pc + '%"></i></div>' +
      "</div>" +
      '<div class="tku-end">' + chipStatus(x) + chipMode(x) + "</div>" +
      "</button>";
  }

  function listPane(s, ui, currentId) {
    var f = ui.filter || "all";
    if (!s.user) {
      return '<div class="tku-body"><div class="tku-card tku-empty">' + T.icon.user +
        "<b>" + esc(t("guestT")) + "</b><span>" + esc(t("guestD")) + "</span>" +
        '<div style="margin-top:var(--space-4)"><button class="tku-btn secondary" onclick="go(\'acct\')">' + esc(t("signIn")) + "</button></div></div></div>";
    }
    var all = s.ships || [];
    var head = '<div class="tku-filters" role="group" aria-label="' + esc(t("myShipments")) + '">' +
      ["all", "active", "delivered"].map(function (k) {
        var n = filtered(all, k).length;
        return '<button aria-pressed="' + (f === k) + '" onclick="TKUI.setFilter(\'' + k + '\')">' + esc(t(k)) +
          ' <span class="tku-count tku-num">' + n + "</span></button>";
      }).join("") + "</div>";
    var body;
    if (s.sk) body = '<div class="tku-skel"></div><div class="tku-skel"></div><div class="tku-skel"></div>';
    else if (!all.length) body = '<div class="tku-card tku-empty">' + T.icon.box + "<b>" + esc(t("emptyT")) + "</b><span>" + esc(t("emptyD")) +
      '</span><div style="margin-top:var(--space-4)"><button class="tku-btn primary" onclick="go(\'send\')">' + esc(t("send")) + "</button></div></div>";
    else {
      var list = filtered(all, f);
      body = list.length ? list.map(function (x) { return shipCard(x, x.id === currentId); }).join("")
        : '<div class="tku-card tku-empty"><b>' + esc(t("filteredT")) + '</b><div style="margin-top:var(--space-3)"><button class="tku-btn ghost" onclick="TKUI.setFilter(\'all\')">' + esc(t("showAll")) + "</button></div></div>";
    }
    return '<div class="tku-body">' + head + '<div class="tku-list">' + body + "</div></div>";
  }

  /* ---------------- S08 detail ---------------- */
  function row(label, valueHtml) { return "<div><dt>" + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>"; }

  function detailPane(s, x) {
    var n = stepOf(x);
    var STEPS = t("steps");
    var payPaid = !!x.bpaid;

    var summary = '<section class="tku-card" aria-labelledby="tku-sum">' +
      '<div class="tku-sum-top"><div class="tku-sum-id" id="tku-sum">' + ltr(x.id) +
        '<button class="tku-copy" onclick="TKUI.copy(\'' + esc(x.id) + '\',this)">' + esc(t("copy")) + "</button></div>" +
        '<div class="tku-actions">' + chipStatus(x) + chipMode(x) + "</div></div>" +
      '<div class="tku-route-big">' + esc(place(x.f.from)) + " ← " + esc(place(x.f.to)) + "</div>" +
      '<div class="tku-sub">' + esc(isDelivered(x) ? t("deliveredDone") : t("eta", { a: x.q.a, b: x.q.b })) + "</div>" +
      '<div class="tku-map">' + need("trackMap")(x) + "</div>" +
      "</section>";

    var timeline = '<section class="tku-card"><h2>' + esc(t("timeline")) + '</h2><ol class="tku-tl">' +
      STEPS.map(function (label, i) {
        var cls = i < n || n === 6 ? "done" : i === n ? "cur" : "";
        var when = (x.times && x.times[i]) || "";
        return '<li class="' + cls + '"' + (i === n && n < 6 ? ' aria-current="step"' : "") + "><b>" + esc(label) + "</b>" +
          (when ? "<time>" + ltr(when) + "</time>" : "<span>" + esc(t("pending")) + "</span>") + "</li>";
      }).join("") + "</ol></section>";

    var drop = (n === 0 && x.how === "drop") ? '<section class="tku-card"><h2>' + esc(t("dropTitle")) + '</h2><p class="tku-sub">' +
      esc(t("dropSub")) + '</p><div class="tku-pin">' + ltr(need("pinOf")(x.id)) + "</div></section>" : "";

    var SL = g("SL") || [];
    var slot = x.sched ? ((SL.find(function (z) { return z[0] === x.sched.slot; }) || [0, ""])[1]) : "";
    var rows = [
      row(t("route"), esc(place(x.f.from)) + " ← " + esc(place(x.f.to))),
      x.city ? row(t("city"), '<span data-nt>' + esc(x.city) + "</span>") : "",
      row(t("goods"), esc(goodsName(x))),
      row(need("isCan")(x.f) ? t("qty") : t("weight"), esc(weight(x))),
      row(t("mode"), esc((t("modes") || {})[x.f.mode] || x.f.mode)),
      row(t("handover"), esc(x.how === "drop" ? t("dropoff") : t("pickup"))),
      x.sched ? row(t("pickupTime"), ltr(String(x.sched.date || "").split("-").reverse().join(".")) + " · " + esc(slot)) : "",
      x.sched ? row(t("pickupAddr"), '<span data-nt>' + esc(x.sched.addr) + "</span>") : "",
      x.sender ? row(t("sender"), '<span data-nt>' + esc(x.sender.name) + "</span>") : "",
      row(t("recipient"), '<span data-nt>' + esc(x.name) + "</span>"),
      x.desc ? row(t("desc"), '<span data-nt>' + esc(x.desc) + "</span>") : "",
      x.fam ? row(t("family"), '<span data-nt>' + esc(x.fam.n) + "</span>") + row(t("report"), '<span data-nt>' + esc(x.fam.rep) + "</span>") +
        row(t("handover"), esc(t("crossing", { c: x.fam.cross }))) : "",
      x.mach ? row(t("docs"), esc(t("docsVal"))) + row(t("customs"), esc(x.mach.cus === "ex" ? t("exempt", { e: x.mach.ex }) : t("onCustomer"))) : "",
      row(t("amount"), money(x.price)),
      row(t("payState"), esc(payPaid ? t("paid") : t("unpaid"))),
      x.inv ? row(t("invoice"), ltr(x.inv)) : "",
      row(t("booked"), ltr(x.date || ""))
    ].join("");
    var details = '<section class="tku-card"><h2>' + esc(t("details")) + '</h2><dl class="tku-rows">' + rows + "</dl></section>";

    var files = (x.files && x.files.length) ? '<section class="tku-card"><h2>' + esc(t("files")) + '</h2><dl class="tku-rows">' +
      x.files.map(function (f) { return row(f.n, esc(n >= 1 ? t("accepted") : t("inReview"))); }).join("") + "</dl></section>" : "";

    // Existing action sections, unchanged: proof of delivery + customer documents (podCard),
    // rating (rateCard), bank transfer details (bankCard), printable docs / invoice (dkDoc, plDoc, invBtns, invDoc).
    var actions = '<div class="tku-legacy">' + legacy("podCard", x) + legacy("rateCard", x) + "</div>";
    var money2 = '<div class="tku-legacy">' + legacy("bankCard", x) + legacy("dkDoc", x) + legacy("plDoc", x) +
      (x.inv ? need("invBtns")(x) + need("invDoc")(x) : "") + "</div>";

    var repeat = '<button class="tku-btn ghost block" onclick="reorder(\'' + esc(x.id) + '\')">' + esc(t("repeat")) + "</button>";

    return '<div class="tku-body"><div class="tku-cols">' +
      '<div class="tku-col">' + summary + drop + timeline + repeat + "</div>" +
      '<div class="tku-col">' + details + files + actions + money2 + "</div>" +
      "</div></div>";
  }

  function backAction() { return TKUI.on("ships") ? "go('ships')" : "go('home')"; }

  /* view "ships": S07 (list; on desktop with an empty detail pane) */
  TKUI.register("ships", function (s, ui) {
    return '<div class="tku" data-tku="S07">' + bar(t("myShipments"), s.user ? esc(countLabel((s.ships || []).length)) : "", "go('home')") +
      '<div class="tku-split" data-v="ships"><div class="tku-pane-list">' + listPane(s, ui, null) + "</div>" +
      '<div class="tku-pane-detail"><div class="tku-empty"><span>' + esc(t("pick")) + "</span></div></div></div></div>";
  });

  /* view "detail": S08 (on desktop with the S07 list beside it) */
  TKUI.register("detail", function (s, ui) {
    var x = (s.ships || []).find(function (z) { return z.id == s.sel; });
    var inner;
    if (!x) inner = '<div class="tku-body"><div class="tku-card tku-empty">' + T.icon.box + "<b>" + esc(t("notFound")) +
      '</b><div style="margin-top:var(--space-4)"><button class="tku-btn secondary" onclick="' + backAction() + '">' + esc(t("back")) + "</button></div></div></div>";
    else inner = detailPane(s, x);
    return '<div class="tku" data-tku="S08">' + bar(t("detail"), x ? ltr(x.id) : "", backAction()) +
      '<div class="tku-split" data-v="detail"><div class="tku-pane-list">' + listPane(s, ui, x && x.id) + "</div>" +
      '<div class="tku-pane-detail">' + inner + "</div></div></div>";
  });
})();
