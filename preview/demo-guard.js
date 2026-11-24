/* T.K demo preview: disables every real action in the app UI.
 * Loaded at the END of preview/index.html, after the app's own scripts, so
 * it replaces the app's action functions with a "disabled in the demo"
 * notice. The fake client (demo-supabase.js) refuses writes as well, so this
 * is the friendly second layer, not the only one.
 */
(function () {
  "use strict";
  function msg() { return (window.__TK_DEMO && window.__TK_DEMO.message()) || "Demo"; }
  var toastEl;
  function notice() {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(136px + env(safe-area-inset-bottom,0px));z-index:9999;" +
        "max-width:480px;margin:0 auto;padding:12px 16px;border-radius:14px;background:#1b1e29;color:#f3ecd8;" +
        "border:1px solid #74622c;font:600 14px/1.5 Cairo,'IBM Plex Sans',system-ui,sans-serif;text-align:center;box-shadow:0 12px 32px rgba(0,0,0,.5);" +
        "transition:opacity .2s";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg();
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = "0"; }, 3200);
    return false;
  }

  // Booking + payment, cart payment, rating, chat, documents, repeat shipment,
  // wallet top-up / payout, account deletion, password reset/change, Google sign-in, sign-up.
  var BLOCK = ["doPay", "payCart", "sendRate", "chatSend", "docDel", "reorder", "reorderLast",
    "walTop", "walTake", "delDo", "resetPw", "saveNewPw", "socialLogin", "addFiles"];
  BLOCK.forEach(function (name) {
    try { window[name] = function () { notice(); return false; }; } catch (e) {}
  });
  // Sign-up stays visible but cannot create an account (the fake client refuses it too).
  var realAuth = window.auth;
  if (typeof realAuth === "function") {
    window.auth = function () {
      try { if (typeof s !== "undefined" && s.au && s.au.mode === "up") { notice(); return; } } catch (e) {}
      return realAuth.apply(this, arguments);
    };
  }
  // Document uploads use file inputs with listeners added by the app: stop them first.
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[type="file"]')) {
      e.stopImmediatePropagation(); e.preventDefault();
      try { t.value = ""; } catch (_) {}
      notice();
    }
  }, true);
  // Chat composer: Enter key and send button both end in chatSend (blocked above).

  // Demo badge
  var b = document.createElement("div");
  b.setAttribute("aria-hidden", "true");
  b.textContent = "DEMO · بيانات وهمية · Testdaten";
  // bottom corner, above the tab bar: never covers a screen title
  b.style.cssText = "position:fixed;bottom:calc(104px + env(safe-area-inset-bottom,0px));inset-inline-start:10px;z-index:9998;opacity:.92;" +
    "padding:2px 10px;border-radius:999px;background:#d4af37;color:#1a1405;font:700 11px/1.6 'IBM Plex Sans',Cairo,system-ui,sans-serif;pointer-events:none;letter-spacing:.02em";
  document.body.appendChild(b);
  window.__TK_DEMO_NOTICE = notice;
})();
