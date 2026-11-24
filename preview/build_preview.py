#!/usr/bin/env python3
"""Build the safe demo preview: preview/index.html from ../index.html.

The demo is a COPY of the customer app with:
  - the real supabase-js library replaced by preview/demo-supabase.js
    (fake data, fake demo login, every write refused, no network)
  - a Content-Security-Policy with connect-src 'none', so the browser itself
    refuses every fetch/XHR/WebSocket, to Supabase or anywhere else
  - no web-app manifest and no service worker (so "Add to Home Screen"
    cannot open the real, non-demo app)
  - preview/demo-guard.js at the end, which disables booking, payment, chat,
    ratings, uploads and repeat shipment with a visible notice
  - the new UI switched on by default (open with ?ui=0 for the old screens)

index.html itself is not changed. Re-run after index.html or ui/ changes:
    python3 preview/build_preview.py
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "index.html")
OUT = os.path.join(HERE, "index.html")

CSP = ("default-src 'self'; "
       "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src https://fonts.gstatic.com data:; "
       "img-src 'self' data: blob:; "
       "media-src 'self' data: blob:; "
       "connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; "
       "form-action 'none'; base-uri 'none'")

HEAD_INSERT = (
    '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n'
    '<meta name="robots" content="noindex, nofollow">\n'
    '<script>/* demo: new UI on by default; ?ui=0 shows the old screens */'
    'try{if(!/[?&]ui=0/.test(location.search))localStorage.setItem("tk-ui2","1")}catch(e){}</script>\n'
)


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit("build_preview: expected exactly one %s, found %d" % (label, n))
    return text.replace(old, new, 1)


def main():
    t = open(SRC, encoding="utf-8").read()

    t = once(t, '<meta charset="utf-8">', '<meta charset="utf-8">\n' + HEAD_INSERT, "charset meta")
    t = once(t, '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>',
             '<script src="demo-supabase.js"></script>', "supabase-js script")
    t = once(t, '<link rel="manifest" href="manifest.json">', "", "manifest link")
    t = once(t, 'navigator.serviceWorker.register("sw.js")', "Promise.resolve()", "service worker registration")
    t = once(t, "</body>", '<script src="demo-guard.js"></script>\n</body>', "</body>")
    t = re.sub(r"<title>([^<]*)</title>", r"<title>[DEMO] \1</title>", t, count=1)

    # Relative links now live one folder up (ui/, icons, impressum, privacy).
    def fix(m):
        attr, url = m.group(1), m.group(2)
        if url in ("demo-supabase.js", "demo-guard.js"):
            return m.group(0)
        return '%s="../%s"' % (attr, url)
    t = re.sub(r'(href|src)="(?!https?:|data:|#|mailto:|tel:|javascript:|\$\{|/|\.\./)([^"]+\.(?:html|js|css|png|svg|jpg|json))"', fix, t)

    # Safety checks on the result
    assert "supabase-js@" not in t, "real supabase-js still referenced"
    assert 'rel="manifest"' not in t, "manifest still linked"
    assert "connect-src 'none'" in t
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(t)
    print("wrote preview/index.html (%d bytes)" % len(t.encode("utf-8")))


if __name__ == "__main__":
    main()
