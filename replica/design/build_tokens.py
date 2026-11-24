#!/usr/bin/env python3
"""Build T.K Group design tokens. Standard library only.

One source of truth for the three existing T.K themes (light, dark, gold).
Writes:
    tokens.json        light theme (default) + shared scales
    tokens.dark.json   dark theme colours + pairs
    tokens.gold.json   gold "premium" theme colours + pairs
    tokens.css         CSS custom properties for all themes, RTL/LTR fonts

Values are T.K's own brand (measured from index.html / admin.html on
2026-11-24) with the smallest shade changes needed to pass WCAG AA.
Every change from the live app is listed in CHANGES below.

    python3 replica/design/build_tokens.py
    python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# --------------------------------------------------------------------------
# Colour roles per theme. Names are roles; replica-brand changes values only.
# --------------------------------------------------------------------------
THEMES = {
    "light": {
        "bg": "#f2f5fa",            # app background (live --bg)
        "surface": "#ffffff",       # cards, sheets (live --card)
        "surface-raised": "#ffffff",
        "header": "#02183c",        # navy header / hero band (live --navy)
        "on-header": "#ffffff",
        "on-header-muted": "#c9d6ef",
        "border": "#e0e7f2",        # decorative dividers only (live --line)
        "border-input": "#6d8ec2",  # NEW: inputs, checkboxes, radios (3:1)
        "text": "#0b1b3a",          # live --ink / --tx
        "text-muted": "#5a6a8a",    # live --mut
        "accent": "#0a2f6b",        # T.K navy (live --brand)
        "on-accent": "#ffffff",
        "highlight": "#ffd400",     # T.K yellow (live --yel): FILL ONLY
        "on-highlight": "#07204a",  # live CTA text
        "focus": "#0a2f6b",         # CHANGED: yellow ring failed 3:1 on light bg
        "danger": "#c73f2c",        # live --err #d1432f, darkened for AA on bg
        "on-danger": "#ffffff",
        "success": "#117e54",       # live --ok #16a06a failed AA as text
        "on-success": "#ffffff",
        "warning": "#aa5a06",       # live --st0, darkened slightly for bg
        "info": "#1d62c9",
        # shipment status, index = existing 7 steps
        "status-0": "#aa5a06",      # booked
        "status-1": "#0a2f6b",      # received in Herne
        "status-2": "#0a2f6b",      # in T.K warehouse
        "status-3": "#1d62c9",      # in transit
        "status-4": "#7a3fc4",      # customs
        "status-5": "#0a817d",      # arrived in destination country (live #0b8a86 failed)
        "status-6": "#167e4e",      # delivered
        # transport mode
        "mode-road": "#8e672b",
        "mode-air": "#0d7bb8",      # live #0e86c9 failed
        "mode-sea": "#1a8466",      # live #1b8a6b failed
    },
    "dark": {
        "bg": "#07142e",
        "surface": "#0e2247",
        "surface-raised": "#132b57",
        "header": "#02183c",
        "on-header": "#ffffff",
        "on-header-muted": "#c9d6ef",
        "border": "#2b4a86",
        "border-input": "#4470c4",  # live #2b4a86 failed 3:1 on bg
        "text": "#eef2fb",
        "text-muted": "#a9bbdd",
        "accent": "#8db4f5",
        "on-accent": "#07142e",
        "highlight": "#ffd400",
        "on-highlight": "#07204a",
        "focus": "#ffd400",
        "danger": "#ff6b5a",
        "on-danger": "#07142e",
        "success": "#4ade80",
        "on-success": "#07142e",
        "warning": "#f0a04b",
        "info": "#7fb0ff",
        "status-0": "#f0a04b", "status-1": "#8db4f5", "status-2": "#8db4f5",
        "status-3": "#7fb0ff", "status-4": "#c39bff", "status-5": "#4fd1c5",
        "status-6": "#4ade80",
        "mode-road": "#d9a85c", "mode-air": "#5cc0f2", "mode-sea": "#4fcf9f",
    },
    "gold": {
        "bg": "#0a0b10",
        "surface": "#13151d",
        "surface-raised": "#1b1e29",
        "header": "#08090d",
        "on-header": "#f3ecd8",
        "on-header-muted": "#c9c4b3",
        "border": "#4d4325",        # live rgba(212,175,55,.3) over surface
        "border-input": "#74622c",  # live rgba(212,175,55,.33) failed 3:1
        "text": "#f3ecd8",
        "text-muted": "#c9c4b3",
        "accent": "#e6c66b",
        "on-accent": "#1a1405",
        "highlight": "#d4af37",
        "on-highlight": "#1a1405",
        "focus": "#e6c66b",
        "danger": "#ff6b5a",
        "on-danger": "#1a1405",
        "success": "#4ade80",
        "on-success": "#0a0b10",
        "warning": "#f0a04b",
        "info": "#7fb0ff",
        "status-0": "#f0a04b", "status-1": "#e6c66b", "status-2": "#e6c66b",
        "status-3": "#7fb0ff", "status-4": "#c39bff", "status-5": "#4fd1c5",
        "status-6": "#4ade80",
        "mode-road": "#d9a85c", "mode-air": "#5cc0f2", "mode-sea": "#4fcf9f",
    },
}

TINTED = ["status-%d" % i for i in range(7)] + ["success", "danger", "warning", "info",
                                                 "mode-road", "mode-air", "mode-sea"]
TINT_ALPHA = 0.14  # chip background = role colour at 14% over surface


def mix(fg, bg, a):
    f = [int(fg[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(bg[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(round(x * a + y * (1 - a)) for x, y in zip(f, b))


def _lum(h):
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def _ratio(a, b):
    x, y = sorted((_lum(a), _lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def ink_for(fg, bg, need=4.6):
    """Nearest shade of fg (same hue) that reaches `need` on bg."""
    import colorsys
    r, g, b = (int(fg[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    step = -0.005 if _lum(bg) > 0.3 else 0.005
    out = fg
    while _ratio(out, bg) < need and 0 < l < 1:
        l += step
        out = "#%02x%02x%02x" % tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, l, s))
    return out


def build_colours(name):
    c = dict(THEMES[name])
    for k in TINTED:
        c[k + "-tint"] = mix(c[k], c["surface"], TINT_ALPHA)
        c[k + "-on-tint"] = ink_for(c[k], c[k + "-tint"])   # chip text
    return c


def pairs(c):
    p = [
        ["text", "bg"], ["text", "surface"], ["text", "surface-raised"],
        ["text-muted", "bg"], ["text-muted", "surface"], ["text-muted", "surface-raised"],
        ["accent", "bg"], ["accent", "surface"],
        ["on-accent", "accent"],
        ["on-highlight", "highlight"],
        ["on-header", "header"], ["on-header-muted", "header"],
        ["on-danger", "danger"], ["on-success", "success"],
        ["danger", "bg"], ["danger", "surface"],
        ["success", "bg"], ["success", "surface"],
        ["warning", "surface"], ["info", "surface"],
        ["border-input", "bg", "ui"], ["border-input", "surface", "ui"],
        ["focus", "bg", "ui"], ["focus", "surface", "ui"],
        ["highlight", "header", "ui"],     # yellow price / ring on navy hero
    ]
    for k in TINTED:
        p.append([k + "-on-tint", k + "-tint"])   # chip text on its own tint
        p.append([k, "surface"])            # dot / icon / label on cards
    return p


SCALES = {
    "font": {
        "sans-ar": "'Cairo', 'IBM Plex Sans Arabic', Tahoma, system-ui, sans-serif",
        "sans-latin": "'IBM Plex Sans', 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        "display-ar": "'Amiri', 'Cairo', serif",
        "display-latin": "'Cormorant Garamond', Georgia, serif",
        "mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
        "_licences": "Cairo, IBM Plex Sans Arabic, IBM Plex Sans, Amiri, Cormorant Garamond: all SIL Open Font License (Google Fonts)."
    },
    "type": {
        "xs":      {"size": 12, "line": 18, "weight": 600},
        "sm":      {"size": 14, "line": 22, "weight": 500},
        "base":    {"size": 16, "line": 26, "weight": 500},
        "md":      {"size": 18, "line": 28, "weight": 700},
        "lg":      {"size": 20, "line": 30, "weight": 700},
        "xl":      {"size": 24, "line": 34, "weight": 800},
        "2xl":     {"size": 30, "line": 40, "weight": 800},
        "display": {"size": 36, "line": 46, "weight": 800},
        "_note": "Arabic needs ~1.6 line height; Latin uses the same box so DE/AR swap without layout shift. Numbers: tabular lining figures."
    },
    "space": [0, 4, 8, 12, 16, 20, 24, 32, 48, 64],
    "radius": {"sm": 8, "md": 12, "lg": 16, "xl": 20, "pill": 999},
    "shadow": {
        "light": {
            "card": "0 6px 22px rgba(8,30,70,.10)",
            "pop": "0 16px 40px rgba(8,30,70,.18)",
            "cta": "0 8px 20px rgba(255,212,0,.28)"
        },
        "dark": {"card": "none", "pop": "0 16px 40px rgba(0,0,0,.5)", "cta": "none"},
        "gold": {
            "card": "0 10px 30px rgba(0,0,0,.5)",
            "pop": "0 22px 40px rgba(0,0,0,.5)",
            "cta": "0 8px 20px rgba(212,175,55,.3), inset 0 1px 0 rgba(255,255,255,.5)"
        }
    },
    "motion": {"fast": "120ms", "base": "200ms", "slow": "400ms",
               "ease": "cubic-bezier(.2,.8,.2,1)",
               "_reduced": "prefers-reduced-motion: all durations 0ms, no splash/map animation"},
    "layout": {
        "gutter": 16,
        "customer-max": 560,
        "admin-max": 1200,
        "header-h": 64,
        "tabbar-h": 64,
        "admin-sidebar": 248,
        "touch-min": 44,
        "breakpoints": {"sm": 480, "md": 768, "lg": 1024, "xl": 1280}
    },
    "z": {"base": 0, "sticky": 10, "tabbar": 20, "sheet": 40, "modal": 50, "toast": 60}
}

CHANGES = [
    "border-input (new role): light #6d8ec2, dark #4470c4, gold #74622c. Live inputs used the decorative --line colour, which failed 3:1.",
    "focus (light): yellow #ffd400 ring -> navy #0a2f6b. Yellow on #f2f5fa was 1.4:1.",
    "highlight (yellow) is fill-only on light surfaces. The yellow total price on white cards (1.4:1) becomes accent navy; yellow text stays on the navy hero and in dark themes.",
    "success: #16a06a -> #117e54 (light) for text. Fills can keep the brighter green with white text only if 4.5:1; use on-success on success.",
    "danger: #d1432f -> #c73f2c (light).",
    "status-5 (arrived): #0b8a86 -> #0a817d; status-0/warning: #b45f06 -> #aa5a06 (light).",
    "mode-air #0e86c9 -> #0d7bb8, mode-sea #1b8a6b -> #1a8466, mode-road #946b2d -> #8e672b (light).",
    "type: 24 live font sizes snapped to 8 steps; 19 radii snapped to 5.",
]


def write(path, data):
    with open(os.path.join(HERE, path), "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def css_vars(c, indent="  "):
    return "\n".join("%s--c-%s: %s;" % (indent, k, v) for k, v in c.items())


def build_css(cols):
    s = SCALES
    out = ["/* T.K Group design tokens. Generated by build_tokens.py, do not edit by hand. */", ""]
    out.append(":root {")
    out.append(css_vars(cols["light"]))
    for k, v in s["font"].items():
        if not k.startswith("_"):
            out.append("  --font-%s: %s;" % (k, v))
    for k, v in s["type"].items():
        if k.startswith("_"):
            continue
        out.append("  --text-%s: %spx; --leading-%s: %spx; --weight-%s: %s;" % (
            k, v["size"], k, v["line"], k, v["weight"]))
    for i, v in enumerate(s["space"]):
        out.append("  --space-%d: %spx;" % (i, v))
    for k, v in s["radius"].items():
        out.append("  --radius-%s: %spx;" % (k, v))
    for k, v in s["shadow"]["light"].items():
        out.append("  --shadow-%s: %s;" % (k, v))
    for k, v in s["motion"].items():
        if not k.startswith("_"):
            out.append("  --motion-%s: %s;" % (k, v))
    for k, v in s["layout"].items():
        if isinstance(v, int):
            out.append("  --layout-%s: %spx;" % (k, v))
    for k, v in s["z"].items():
        out.append("  --z-%s: %s;" % (k, v))
    out.append("  --font-ui: var(--font-sans-ar);")
    out.append("  --font-display: var(--font-display-ar);")
    out.append("  color-scheme: light;")
    out.append("}")
    out.append("")

    def theme_block(sel, name):
        lines = [sel + " {", css_vars(cols[name])]
        for k, v in s["shadow"][name].items():
            lines.append("  --shadow-%s: %s;" % (k, v))
        lines.append("  color-scheme: dark;")
        lines.append("}")
        return lines

    out += ["@media (prefers-color-scheme: dark) {"]
    out += ["  " + l for l in theme_block(':root:not([data-theme="light"]):not([data-theme="gold"])', "dark")]
    out += ["}", ""]
    out += theme_block(':root[data-theme="dark"]', "dark") + [""]
    # The live T.K app forces the gold look with data-tk="1" on <html>; the
    # id-free :not(#tk) raises specificity above the dark-mode media block.
    out += theme_block(':root[data-theme="gold"], :root[data-tk="1"]:not(#tk), :root.tku-gold:not(#tk)', "gold") + [""]
    out += [
        "/* Language: Arabic is RTL and the default; German / English are LTR. */",
        ':root[lang="de"], :root[lang="en"] {',
        "  --font-ui: var(--font-sans-latin);",
        "  --font-display: var(--font-display-latin);",
        "}",
        "",
        "@media (prefers-reduced-motion: reduce) {",
        "  :root { --motion-fast: 0ms; --motion-base: 0ms; --motion-slow: 0ms; }",
        "}",
        "",
    ]
    return "\n".join(out)


def main():
    cols = {n: build_colours(n) for n in THEMES}
    light = {"_about": "T.K Group design tokens, light theme (default). Generated by build_tokens.py. "
                       "Dark and gold themes: tokens.dark.json, tokens.gold.json. Check: "
                       "python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json",
             "_changes_from_live_app": CHANGES,
             "color": cols["light"], "pairs": pairs(cols["light"])}
    light.update(SCALES)
    write("tokens.json", light)
    for n in ("dark", "gold"):
        write("tokens.%s.json" % n, {"_about": "T.K Group %s theme colours. Scales live in tokens.json." % n,
                                     "color": cols[n], "pairs": pairs(cols[n])})
    css = build_css(cols)
    with open(os.path.join(HERE, "tokens.css"), "w", encoding="utf-8") as fh:
        fh.write(css)
    # Runtime copy for the app (ui/ at the repo root). Same content.
    ui = os.path.join(HERE, "..", "..", "ui")
    if os.path.isdir(ui):
        with open(os.path.join(ui, "tokens.css"), "w", encoding="utf-8") as fh:
            fh.write(css)
    print("wrote tokens.json, tokens.dark.json, tokens.gold.json, tokens.css" + (" (+ ui/tokens.css)" if os.path.isdir(ui) else ""))


if __name__ == "__main__":
    main()
