// T.K Group Tailwind preset. Optional: the app today uses plain CSS with
// tokens.css. If Tailwind is ever added, use this preset so classes read
// roles (bg-surface, text-muted, border-input), never raw hex.
// Colours come from tokens.css custom properties, so themes (light, dark,
// gold) and RTL/LTR switch without rebuilding.
const role = (n) => `var(--c-${n})`;
const roles = [
  'bg', 'surface', 'surface-raised', 'header', 'on-header', 'on-header-muted',
  'border', 'border-input', 'text', 'text-muted', 'accent', 'on-accent',
  'highlight', 'on-highlight', 'focus', 'danger', 'on-danger', 'success',
  'on-success', 'warning', 'info',
];
const tinted = [0, 1, 2, 3, 4, 5, 6].map((i) => `status-${i}`)
  .concat(['success', 'danger', 'warning', 'info', 'mode-road', 'mode-air', 'mode-sea']);

const colors = Object.fromEntries(roles.map((r) => [r, role(r)]));
for (const t of tinted) {
  colors[t] = role(t);
  colors[`${t}-tint`] = role(`${t}-tint`);
  colors[`${t}-on-tint`] = role(`${t}-on-tint`);
}

module.exports = {
  theme: {
    colors: { transparent: 'transparent', current: 'currentColor', ...colors },
    fontFamily: { ui: 'var(--font-ui)', display: 'var(--font-display)', mono: 'var(--font-mono)' },
    fontSize: Object.fromEntries(['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'display'].map(
      (k) => [k, [`var(--text-${k})`, { lineHeight: `var(--leading-${k})`, fontWeight: `var(--weight-${k})` }]])),
    spacing: Object.fromEntries([0, 4, 8, 12, 16, 20, 24, 32, 48, 64].map((v, i) => [i, `${v}px`])),
    borderRadius: { none: '0', sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-pill)' },
    boxShadow: { none: 'none', card: 'var(--shadow-card)', pop: 'var(--shadow-pop)', cta: 'var(--shadow-cta)' },
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      maxWidth: { customer: 'var(--layout-customer-max)', admin: 'var(--layout-admin-max)' },
      transitionDuration: { fast: 'var(--motion-fast)', base: 'var(--motion-base)', slow: 'var(--motion-slow)' },
      transitionTimingFunction: { tk: 'var(--motion-ease)' },
      zIndex: { sticky: 'var(--z-sticky)', tabbar: 'var(--z-tabbar)', sheet: 'var(--z-sheet)', modal: 'var(--z-modal)', toast: 'var(--z-toast)' },
    },
  },
  // Use logical utilities only (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start)
  // so Arabic RTL and German LTR share one markup.
};
