// ════════════════════════════════════════════════
//  Design Tokens — MediMate AI
//  src/styles/tokens.js
// ════════════════════════════════════════════════

export const C = {
  bg:       "#F7F8F3",       // nền kem nhẹ — ấm hơn trắng thuần
  paper:    "#FFFFFF",
  dark:     "#111412",       // near-black cho card tối
  navy:     "#0B1829",
  navy70:   "rgba(11,24,41,.7)",
  navy40:   "rgba(11,24,41,.4)",
  navy12:   "rgba(11,24,41,.1)",
  navy06:   "rgba(11,24,41,.06)",

  // Accent — lime/mint: y tế nhưng tươi, không lạnh như teal
  lime:     "#AAED63",       // primary accent
  limeDk:   "#7EC832",       // hover state
  limeLt:   "#EEF8DC",       // bg tint

  teal:     "#0891B2",       // secondary (badge, link)
  tealLt:   "#E0F2FE",

  green:    "#059669",
  greenLt:  "#D1FAE5",
  amber:    "#B45309",
  amberLt:  "#FEF3C7",
  red:      "#DC2626",

  line:     "#E4E7DE",
  lineDk:   "#C8CCBF",
};

export const FONT = {
  body:    "'Be Vietnam Pro', sans-serif",
  display: "'Be Vietnam Pro', sans-serif",
};

// px — dùng trong media query string nếu cần
export const BP = {
  sm:  480,
  md:  768,
  lg:  1024,
  xl:  1200,
};
