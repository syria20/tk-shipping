// Mocked Supabase for Playwright. Every request to the project
// (auth, REST, RPC, storage) is answered locally; nothing reaches the network.
// Unknown external hosts are blocked. Calls are recorded for parity checks.
"use strict";
const path = require("path");
const fs = require("fs");
const { tables, CUSTOMER_ID, STAFF_ID } = require("./seed");

const PROJECT = "uvaugdqmktntmautneyp";
const SB = "https://" + PROJECT + ".supabase.co";
const SUPABASE_JS = process.env.TK_SUPABASE_JS; // local copy of supabase-js@2.45.4 (same version the app pins)
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

function fakeJwt(sub) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return b({ alg: "HS256", typ: "JWT" }) + "." + b({ sub, role: "authenticated", exp: 4102444800 }) + ".sig";
}
function sessionFor(who) {
  const id = who === "staff" ? STAFF_ID : CUSTOMER_ID;
  const email = who === "staff" ? "staff@example.test" : "kunde@example.test";
  const user = { id, aud: "authenticated", role: "authenticated", email, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  return { access_token: fakeJwt(id), refresh_token: "r-" + id, token_type: "bearer", expires_in: 3600 * 24 * 365 * 50, expires_at: 4102444800, user };
}

// Minimal PostgREST filter support: eq, in, not.is.null, order, limit.
function applyQuery(rows, params) {
  let out = rows.slice();
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset"].includes(k)) continue;
    if (v.startsWith("eq.")) out = out.filter((r) => String(r[k]) === v.slice(3));
    else if (v.startsWith("in.(")) { const set = v.slice(4, -1).split(",").map((x) => x.replace(/^"|"$/g, "")); out = out.filter((r) => set.includes(String(r[k]))); }
    else if (v === "not.is.null") out = out.filter((r) => r[k] != null);
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(",")[0].split(".");
    out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const lim = params.get("limit");
  if (lim) out = out.slice(0, +lim);
  return out;
}

const RPC = {
  wallet_balance: () => 42.5,
  chat_threads_list: () => [],
  default: () => null
};

async function install(context, opts) {
  const o = Object.assign({ who: "customer", role: "admin" }, opts || {});
  const db = tables(o.role);
  const calls = [];
  const blocked = [];

  if (SUPABASE_JS && fs.existsSync(SUPABASE_JS)) {
    await context.route("**/@supabase/supabase-js@2.45.4/dist/umd/supabase.js", (r) =>
      r.fulfill({ path: SUPABASE_JS, contentType: "application/javascript" }));
  }

  await context.route(SB + "/**", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname;
    const accept = req.headers()["accept"] || "";
    const json = (body, status) => route.fulfill({ status: status || 200, contentType: "application/json", body: JSON.stringify(body) });

    if (p.startsWith("/auth/v1/")) {
      calls.push({ kind: "auth", name: p.slice(9), method: req.method() });
      if (p === "/auth/v1/user") return json(o.who ? sessionFor(o.who).user : {}, o.who ? 200 : 401);
      if (p === "/auth/v1/token") return json(sessionFor(o.who || "customer"));
      return json({});
    }
    if (p.startsWith("/rest/v1/rpc/")) {
      const fn = p.slice(13);
      let body = null; try { body = req.postDataJSON(); } catch (e) {}
      calls.push({ kind: "rpc", name: fn, args: body });
      return json((RPC[fn] || RPC.default)(body));
    }
    if (p.startsWith("/rest/v1/")) {
      const t = p.slice(9);
      calls.push({ kind: "rest", name: t, method: req.method(), query: u.search });
      if (req.method() !== "GET" && req.method() !== "HEAD") return json([], 201); // writes are recorded, never applied
      const rows = applyQuery(db[t] || [], u.searchParams);
      if (accept.includes("vnd.pgrst.object")) return rows.length ? json(rows[0]) : json({ code: "PGRST116", message: "no rows" }, 406);
      return json(rows);
    }
    if (p.startsWith("/storage/v1/")) {
      calls.push({ kind: "storage", name: p.slice(12), method: req.method() });
      if (p.includes("/object/sign/")) {
        let body = {}; try { body = req.postDataJSON() || {}; } catch (e) {}
        const paths = body.paths || [];
        if (paths.length) return json(paths.map((x) => ({ path: x, signedURL: "/object/sign/mock/" + encodeURIComponent(x) + "?token=t", error: null })));
        return json({ signedURL: "/object/sign/mock/x?token=t" });
      }
      return route.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX });
    }
    calls.push({ kind: "other", name: p });
    return json({});
  });

  // Anything else external: allow Google Fonts (styling only), block the rest.
  await context.route(/^https?:\/\//, (route) => {
    const h = new URL(route.request().url()).hostname;
    if (h === "fonts.googleapis.com" || h === "fonts.gstatic.com") return route.continue();
    if (h.endsWith(".supabase.co")) return route.fallback();
    if (SUPABASE_JS && route.request().url().includes("/@supabase/supabase-js@2.45.4/")) return route.fallback();
    blocked.push(h);
    return route.abort();
  });

  if (o.who) {
    const key = "sb-" + PROJECT + "-auth-token";
    const sess = JSON.stringify(sessionFor(o.who));
    await context.addInitScript(([k, v, extra]) => {
      try {
        localStorage.setItem(k, v);
        for (const [a, b] of Object.entries(extra)) { if (b === null) localStorage.removeItem(a); else localStorage.setItem(a, b); }
      } catch (e) {}
    }, [key, sess, o.storage || {}]);
  } else if (o.storage) {
    await context.addInitScript((extra) => { try { for (const [a, b] of Object.entries(extra)) { if (b === null) localStorage.removeItem(a); else localStorage.setItem(a, b); } } catch (e) {} }, o.storage);
  }
  return { calls, blocked };
}

module.exports = { install, PROJECT };
