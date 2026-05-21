# CSS Structure

`src/index.css` is the only stylesheet entrypoint imported by React. Keep cascade order there.

- `foundation.css`: reset, base element styles, focus states, reduced motion.
- `global.css`: legacy shared component/page styles from the original app.
- `user-workspace.css`: patient workspace shell and workspace-level layout.
- `auth-refresh.css`: authentication pages.
- `operator-workspace.css`: staff/admin workspace shell.
- `theme-stillpoint.css`: current visual skin inspired by the Stillpoint reference. Prefer changing colors, typography, card treatment, button treatment, and broad polish here.

Several older pages still contain local `<style>{styles}</style>` blocks. When changing those screens deeply, migrate their CSS into a page stylesheet and keep the Stillpoint visual overrides in `theme-stillpoint.css`.
