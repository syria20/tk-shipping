// Checks the demo preview (preview/index.html) with NO request mocking:
// records every request the browser makes, CSP violations, page errors,
// and confirms every real action is blocked.
//
//   node tests/harness/preview-check.js http://localhost:8765/preview/index.html
//   node tests/harness/preview-check.js https://raw.githack.com/<owner>/<repo>/<sha>/preview/index.html
"use strict";
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL0 = process.argv[2];
const SHOTS = process.argv[3] || null;
if (!URL0) { console.error("usage: preview-check.js <preview url> [screenshot dir]"); process.exit(2); }

(async () => {
  const browser = await chromium.launch();
  const out = { url: URL0, runs: [] };
  for (const [lang, vp] of [["ar", "iphone"], ["de", "iphone"], ["de", "desktop"]]) {
    const ctx = await browser.newContext(vp === "iphone" ? devices["iPhone 13"] : { viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((l) => { try { localStorage.setItem("tk-lang", l); } catch (e) {} }, lang);
    const page = await ctx.newPage();
    const run = { lang, vp, requests: [], supabaseRequests: [], cspViolations: [], errors: [], checks: {} };
    page.on("request", (r) => { run.requests.push(r.url()); if (/supabase\.co/i.test(r.url())) run.supabaseRequests.push(r.url()); });
    page.on("pageerror", (e) => run.errors.push(e.message));
    await page.exposeFunction("__cspv", (v) => run.cspViolations.push(v));
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => window.__cspv && window.__cspv(e.violatedDirective + " " + e.blockedURI)));

    // githack shows a one-click notice before HTML; click through like a person would
    await page.goto(URL0, { waitUntil: "domcontentloaded" });
    if (/External Content Notice/i.test(await page.title())) {
      await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), page.click("text=Open the page")]);
    }
    await page.waitForTimeout(7500); // splash + onboarding timers

    // skip the first-run onboarding if shown (it is part of the app, not the demo)
    await page.evaluate(() => { try { localStorage.setItem("tk-ob", "1"); if (typeof s !== "undefined") { s.ob = null; draw(); } } catch (e) {} });
    run.checks.demoClient = await page.evaluate(() => !!window.__TK_DEMO_LOG);
    run.checks.uiFlag = await page.evaluate(() => document.documentElement.classList.contains("tk-ui2"));
    run.checks.signedInAs = await page.evaluate(() => s.user && s.user.name);
    run.checks.shipments = await page.evaluate(() => s.ships.length);
    if (SHOTS && lang === "ar" && vp === "iphone") await page.screenshot({ path: path.join(SHOTS, "preview-home-ar-iphone.png") });

    await page.evaluate(() => go("ships")); await page.waitForTimeout(300);
    run.checks.S07 = await page.evaluate(() => (document.querySelector("[data-tku]") || {}).dataset?.tku);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `preview-S07-${lang}-${vp}.png`) });
    await page.evaluate(() => go("detail", "TK482871")); await page.waitForTimeout(300);
    run.checks.S08 = await page.evaluate(() => (document.querySelector("[data-tku]") || {}).dataset?.tku);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `preview-S08-${lang}-${vp}.png`) });

    // Real buttons on S08: repeat shipment
    const before = await page.evaluate(() => ({ view: s.view, ships: s.ships.length, cart: (s.cart || []).length }));
    await page.click("button:has-text('" + (lang === "ar" ? "كرر هذه الشحنة" : "Sendung wiederholen") + "')");
    await page.waitForTimeout(300);
    run.checks.repeatBlocked = await page.evaluate((b) => s.view === b.view && s.ships.length === b.ships && (s.cart || []).length === b.cart, before);
    run.checks.noticeShown = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].some((e) => /Demo|تجريبية/.test(e.textContent)));
    if (SHOTS && lang === "de" && vp === "iphone") await page.screenshot({ path: path.join(SHOTS, "preview-notice-de-iphone.png") });

    // Every write path, called directly
    run.checks.actions = await page.evaluate(async () => {
      const r = {};
      const n0 = s.ships.length;
      for (const f of ["doPay", "payCart", "sendRate", "chatSend", "docDel", "reorder", "reorderLast", "walTop", "walTake", "delDo", "resetPw", "saveNewPw", "socialLogin", "addFiles"]) {
        try { const v = window[f] && window[f]("TK482871", 5); r[f] = v === false ? "blocked" : "ran"; } catch (e) { r[f] = "error " + e.message; }
      }
      // and the fake client refuses writes even if something bypassed the UI
      const sbc = window.__sb;
      const w1 = await sbc.rpc("create_shipment", {});
      const w2 = await sbc.from("shipments").update({ status: 6 }).eq("id", "TK482871");
      const w3 = await sbc.storage.from("shipment-docs").upload("x", new Blob(["x"]));
      r.clientWrites = [w1, w2, w3].every((x) => x.error && x.error.code === "DEMO") ? "refused" : "NOT refused";
      r.shipmentsUnchanged = s.ships.length === n0;
      r.blockedWritesLogged = window.__TK_DEMO_LOG.blockedWrites.length;
      return r;
    });
    // A file input change (document upload) is stopped before the app sees it
    run.checks.uploadBlocked = await page.evaluate(() => {
      const i = document.createElement("input"); i.type = "file"; i.className = "dfile"; document.body.appendChild(i);
      let reached = false; i.addEventListener("change", () => { reached = true; });
      i.dispatchEvent(new Event("change", { bubbles: true })); i.remove(); return !reached;
    });
    // Sign out and sign in again with made-up credentials: still no network
    run.checks.relogin = await page.evaluate(async () => {
      await window.__sb.auth.signOut(); await new Promise((r) => setTimeout(r, 300));
      const out = !s.user;
      const r = await window.__sb.auth.signInWithPassword({ email: "nobody@example.invalid", password: "not-a-real-password" });
      await new Promise((r) => setTimeout(r, 500));
      return out && !r.error && !!s.user;
    });
    run.checks.oldUiStillThere = await page.evaluate(() => typeof draw === "function");
    run.externalHosts = [...new Set(run.requests.map((u) => { try { return new URL(u).hostname; } catch (e) { return u.slice(0, 20); } }))];
    run.requestCount = run.requests.length;
    delete run.requests;
    out.runs.push(run);
    await ctx.close();
  }
  await browser.close();
  out.ok = out.runs.every((r) => r.supabaseRequests.length === 0 && r.errors.length === 0 && r.checks.S07 === "S07" && r.checks.S08 === "S08" &&
    r.checks.repeatBlocked && r.checks.uploadBlocked && r.checks.relogin && r.checks.actions.clientWrites === "refused" && r.checks.actions.shipmentsUnchanged);
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
