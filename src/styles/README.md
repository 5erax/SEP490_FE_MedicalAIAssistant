# Styles Structure

- `index.css` is the global stylesheet entry imported by `src/index.css`.
- `base.css`, `tokens.css`, and `ux-foundation.css` hold app-wide foundations.
- `global.css` keeps legacy shared page styles until they can be split safely.
- `components/` contains styles owned by shared/global components.
- `features/` contains styles owned by route or feature areas.

Prefer feature or component CSS for new styles. Add to `global.css` only when a selector is intentionally shared across multiple feature areas.
