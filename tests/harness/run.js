// T.K UI v2 test run: old vs new, mocked Supabase, AR/DE, iPhone/desktop.
//
//   TK_SUPABASE_JS=/path/to/supabase.js node tests/harness/run.js
//
// Variants
//   orig : index.html / admin.html exactly as committed (git HEAD), no ui/
//   off  : current files (hook lines added), feature switch OFF
//   on   : current files, feature switch ON (?ui=2 stored in localStorage)
// Output: replica/test-results.json, replica/clone-screens/*.png
"use strict";
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { install } = require("./mock-supabase");
const { SHIPMENTS } = require("./seed");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "replica");
const SHOTS = path.join(OUT, "clone-screens");
const ORIG = fs.mkdtempSync(path.join(require("os").tmpdir(), "tk-orig-"));
fs.mkdirSync(SHOTS, { recursive: true });
for (const f of ["index.html", "admin.html"]) fs.writeFileSync(path.join(ORIG, f), execSync("git show HEAD:" + f, { cwd: ROOT, maxBuffer: 64e6 }));

const VIEWPORTS = { iphone: devices["iPhone 13"], desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } };
const VIEWS = ["home", "send", "eu2sy", "sy2eu", "recip", "cart", "pay", "payc", "paid", "paidc", "detail", "chat", "bills", "wallet", "points", "refer", "more", "acct"];
const SPLASH_MS = 6800;

const results = { started: new Date().toISOString(), loads: [], parity: [], views: [], network: [], layout: [], keyboard: [], admin: [], blocked: [] };

function file(variant, name) { return "file://" + (variant === "orig" ? path.join(ORIG, name) : path.join(ROOT, name)); }
function storageFor(variant, lang) {
  const st = { "tk-ob": "1", "tk-lang": lang };
  st["tk-ui2"] = variant === "on" ? "1" : null;
  return st;
}

async function open(browser, { variant, lang, vp, who, page: pageName }) {
  const ctx = await browser.newContext(Object.assign({}, VIEWPORTS[vp], { locale: lang === "de" ? "de-DE" : "ar" }));
  const mock = await install(ctx, { who, role: "admin", storage: storageFor(variant, lang) });
  const page = await ctx.newPage();
  const errors = [], consoleErr = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") consoleErr.push(m.text()); });
  await page.goto(file(variant, pageName || "index.html"), { waitUntil: "load" });
  await page.waitForTimeout(pageName === "admin.html" ? 2500 : SPLASH_MS);
  return { ctx, page, mock, errors, consoleErr };
}

// What a screen shows and offers, independent of styling.
async function facts(page) {
  return page.evaluate(() => {
    const m = document.getElementById("main") || document.getElementById("app");
    const html = m ? m.innerHTML : "";
    const handlers = new Set();
    (m ? m.querySelectorAll("[onclick],[onchange],[oninput]") : []).forEach((el) => {
      ["onclick", "onchange", "oninput"].forEach((a) => {
        const v = el.getAttribute(a); if (!v) return;
        (v.match(/[A-Za-z_$][\w$.]*(?=\()/g) || []).forEach((f) => { if (!/^(TKUI\.|event\.|this\.|Math\.|String|Number|parseInt|parseFloat|encodeURIComponent)/.test(f)) handlers.add(f.split(".").pop() === f ? f : f); });
      });
    });
    return {
      text: (m ? m.innerText : "").replace(/\s+/g, " ").trim(),
      handlers: [...handlers].sort(),
      fileInputs: m ? m.querySelectorAll("input[type=file]").length : 0,
      links: m ? [...m.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).sort() : [],
      empty: html.trim().length < 20,
      tku: m ? (m.querySelector("[data-tku]") || {}).dataset?.tku || null : null
    };
  });
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

(async () => {
  const browser = await chromium.launch();

  /* 1. Network parity on load: same REST/RPC/storage calls in orig, off and on */
  for (const variant of ["orig", "off", "on"]) {
    const r = await open(browser, { variant, lang: "ar", vp: "iphone", who: "customer" });
    const sig = r.mock.calls.filter((c) => c.kind !== "auth").map((c) => c.kind + ":" + c.name + (c.kind === "rest" ? ":" + c.method : "")).sort();
    results.network.push({ variant, calls: sig, writes: r.mock.calls.filter((c) => (c.kind === "rest" && c.method !== "GET") || (c.kind === "rpc" && !["wallet_balance", "chat_mark_read"].includes(c.name))).map((c) => c.name), errors: r.errors });
    results.blocked.push(...r.mock.blocked);
    await r.ctx.close();
  }

  /* 2. Every existing view: renders, no new errors, same text/actions with the switch OFF */
  for (const lang of ["ar", "de"]) {
    const sessions = {};
    for (const variant of ["orig", "off", "on"]) sessions[variant] = await open(browser, { variant, lang, vp: "iphone", who: "customer" });
    for (const v of VIEWS) {
      const row = { lang, view: v };
      for (const variant of ["orig", "off", "on"]) {
        const { page, errors } = sessions[variant];
        const before = errors.length;
        await page.evaluate(([view, id]) => { try { go(view, view === "detail" ? id : undefined); } catch (e) { window.__goErr = String(e); } }, [v, SHIPMENTS[3].id]);
        await page.waitForTimeout(250);
        const f = await facts(page);
        row[variant] = { errors: errors.slice(before), empty: f.empty, handlers: f.handlers, fileInputs: f.fileInputs, tku: f.tku, textLen: f.text.length, text: f.text };
      }
      row.offSameAsOrig = row.off.text === row.orig.text && JSON.stringify(row.off.handlers) === JSON.stringify(row.orig.handlers);
      row.onReplaced = !!row.on.tku;
      if (!row.onReplaced) row.onSameAsOrig = row.on.text === row.orig.text && JSON.stringify(row.on.handlers) === JSON.stringify(row.orig.handlers);
      for (const k of ["orig", "off", "on"]) delete row[k].text;
      results.views.push(row);
    }
    for (const k in sessions) await sessions[k].ctx.close();
  }

  /* 3. S08 parity per shipment: new detail vs old detail */
  for (const lang of ["ar", "de"]) {
    const old = await open(browser, { variant: "off", lang, vp: "iphone", who: "customer" });
    const neu = await open(browser, { variant: "on", lang, vp: "iphone", who: "customer" });
    for (const sh of SHIPMENTS) {
      const go = (p) => p.evaluate((id) => go("detail", id), sh.id).then(() => p.waitForTimeout(250));
      await go(old.page); await go(neu.page);
      const a = await facts(old.page), b = await facts(neu.page);
      const callsBefore = neu.mock.calls.length;
      const ownData = [sh.id, sh.recipient_name, sh.description, sh.pod_by].filter(Boolean);
      const missingData = ownData.filter((d) => !b.text.includes(d));
      const missingInOld = ownData.filter((d) => !a.text.includes(d));
      const missingActions = a.handlers.filter((h) => !b.handlers.includes(h) && h !== "go");
      results.parity.push({
        lang, id: sh.id, step: sh.status, newScreen: b.tku,
        missingData, missingInOld, missingActions,
        extraActions: b.handlers.filter((h) => !a.handlers.includes(h)),
        fileInputs: [a.fileInputs, b.fileInputs],
        timesShown: SHIPMENTS.length && (b.text.match(/\d\d\.\d\d · \d\d:\d\d/g) || []).length,
        timesShownOld: (a.text.match(/\d\d\.\d\d · \d\d:\d\d/g) || []).length,
        newNetworkCalls: neu.mock.calls.length - callsBefore,
        errors: neu.errors.slice()
      });
    }
    await old.ctx.close(); await neu.ctx.close();
  }

  /* 4. Screenshots + layout checks: S07/S08 new vs old detail, AR/DE x iPhone/desktop */
  for (const vp of ["iphone", "desktop"]) {
    for (const lang of ["ar", "de"]) {
      for (const variant of ["off", "on"]) {
        const r = await open(browser, { variant, lang, vp, who: "customer" });
        const shots = [];
        if (variant === "on") {
          await r.page.evaluate(() => go("ships")); await r.page.waitForTimeout(300);
          await r.page.screenshot({ path: path.join(SHOTS, `S07-${lang}-${vp}.png`) }); shots.push("S07");
          results.layout.push({ screen: "S07", variant, lang, vp, overflow: await overflow(r.page) });
        }
        await r.page.evaluate((id) => go("detail", id), SHIPMENTS[4].id); await r.page.waitForTimeout(300);
        const name = variant === "on" ? `S08-${lang}-${vp}.png` : `old-detail-${lang}-${vp}.png`;
        await r.page.screenshot({ path: path.join(SHOTS, name), fullPage: vp === "iphone" ? false : false });
        results.layout.push({ screen: variant === "on" ? "S08" : "old detail", variant, lang, vp, overflow: await overflow(r.page), errors: r.errors.slice() });
        if (variant === "on" && vp === "iphone") {
          await r.page.evaluate(() => { const m = document.getElementById("main"); m.scrollTop = m.scrollHeight; });
          await r.page.waitForTimeout(200);
          await r.page.screenshot({ path: path.join(SHOTS, `S08-${lang}-${vp}-bottom.png`) });
        }
        // home on desktop: shows the shell around old views
        if (vp === "desktop") {
          await r.page.evaluate(() => go("home")); await r.page.waitForTimeout(300);
          await r.page.screenshot({ path: path.join(SHOTS, `${variant === "on" ? "shell" : "old"}-home-${lang}-desktop.png`) });
          results.layout.push({ screen: "home (shell)", variant, lang, vp, overflow: await overflow(r.page) });
        }
        await r.ctx.close();
      }
    }
  }

  /* 5. Empty / guest / loading states for S07 */
  {
    const g = await open(browser, { variant: "on", lang: "ar", vp: "iphone", who: null });
    await g.page.evaluate(() => go("ships")); await g.page.waitForTimeout(300);
    const f = await facts(g.page);
    await g.page.screenshot({ path: path.join(SHOTS, "S07-ar-iphone-guest.png") });
    results.layout.push({ screen: "S07 guest", variant: "on", lang: "ar", vp: "iphone", overflow: await overflow(g.page), guestPrompt: f.handlers.includes("go"), errors: g.errors.slice() });
    await g.ctx.close();
    const e = await open(browser, { variant: "on", lang: "de", vp: "iphone", who: "customer" });
    await e.page.evaluate(() => { s.ships = []; go("ships"); }); await e.page.waitForTimeout(200);
    await e.page.screenshot({ path: path.join(SHOTS, "S07-de-iphone-empty.png") });
    await e.page.evaluate(() => { s.sk = true; draw(); }); await e.page.waitForTimeout(200);
    await e.page.screenshot({ path: path.join(SHOTS, "S07-de-iphone-loading.png") });
    await e.page.evaluate(() => { s.sel = "TK999999"; s.sk = false; go("detail", "TK999999"); }); await e.page.waitForTimeout(200);
    const nf = await facts(e.page);
    results.layout.push({ screen: "S07 empty/loading + S08 not found", variant: "on", lang: "de", vp: "iphone", notFoundShown: nf.tku === "S08", errors: e.errors.slice() });
    await e.ctx.close();
  }

  /* 6. Keyboard: list -> detail -> back, desktop, switch on */
  {
    const k = await open(browser, { variant: "on", lang: "de", vp: "desktop", who: "customer" });
    await k.page.evaluate(() => go("ships")); await k.page.waitForTimeout(300);
    const res = { steps: [] };
    // tab until a shipment card has focus
    for (let i = 0; i < 40; i++) {
      await k.page.keyboard.press("Tab");
      const cls = await k.page.evaluate(() => document.activeElement && document.activeElement.className);
      if (/tku-ship/.test(cls || "")) { res.steps.push("card focused after " + (i + 1) + " Tab"); break; }
    }
    const ring = await k.page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    res.focusRing = ring;
    await k.page.keyboard.press("Enter"); await k.page.waitForTimeout(300);
    res.openedDetail = await k.page.evaluate(() => s.view === "detail");
    // back button is the first control in the bar
    for (let i = 0; i < 40; i++) {
      await k.page.keyboard.press("Shift+Tab");
      const lab = await k.page.evaluate(() => document.activeElement && document.activeElement.getAttribute("aria-label"));
      if (lab === "Zurück") { res.steps.push("back button reached"); break; }
    }
    await k.page.keyboard.press("Enter"); await k.page.waitForTimeout(300);
    res.backToList = await k.page.evaluate(() => s.view === "ships");
    res.errors = k.errors.slice();
    results.keyboard.push(res);
    await k.ctx.close();
  }

  /* 7. Admin: orig / off / on load, login screen and staff dashboard */
  for (const who of [null, "staff"]) {
    for (const vp of ["iphone", "desktop"]) {
      const row = { who: who || "signed out", vp };
      for (const variant of ["orig", "off", "on"]) {
        const r = await open(browser, { variant, lang: "ar", vp, who, page: "admin.html" });
        const txt = await r.page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
        row[variant] = { errors: r.errors.slice(), textLen: txt.length, overflow: await overflow(r.page), hash: require("crypto").createHash("sha1").update(txt).digest("hex").slice(0, 10) };
        if (vp === "desktop" && variant !== "off") await r.page.screenshot({ path: path.join(SHOTS, `admin-${who ? "dashboard" : "login"}-${variant}-desktop.png`) });
        await r.ctx.close();
      }
      row.sameText = row.orig.hash === row.off.hash && row.off.hash === row.on.hash;
      results.admin.push(row);
    }
  }

  await browser.close();
  results.finished = new Date().toISOString();
  results.blocked = [...new Set(results.blocked)];
  fs.writeFileSync(path.join(OUT, "test-results.json"), JSON.stringify(results, null, 2));
  fs.rmSync(ORIG, { recursive: true, force: true });
  console.log("done", results.finished);
})().catch((e) => { console.error(e); process.exit(1); });
