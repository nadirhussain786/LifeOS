/**
 * LifeOS Design Tokens — the single source of truth for the native side.
 *
 * Philosophy: a Spatial Design System. Calm, spacious, premium. Depth comes
 * from layered surfaces + soft elevation, never from neomorphic bevels or
 * skeuomorphic texture. Chrome stays near-grayscale (with a whisper of the
 * emerald accent bias in the neutrals so nothing reads as "unconsidered gray").
 * Color is spent deliberately: one brand accent, one signature tint per life
 * module, and a strictly separate semantic (success/warning/error/info) system.
 *
 * Where you can use a NativeWind className, prefer it (bg-background,
 * text-muted-foreground, rounded-lg, …) — those resolve from global.css /
 * tailwind.config.js which mirror these values. Reach for this module only
 * where classNames can't: StatusBar, navigation theme objects, SVG charts,
 * Reanimated worklets, expo-linear-gradient stops, native shadow objects.
 *
 * See lib/color.ts for tint → gradient/glow derivation helpers used with the
 * per-module `MODULE_TINTS` below.
 */

// ---------------------------------------------------------------------------
// PRIMITIVES — the raw hex ramps. Never reference these from screens directly;
// they exist so the semantic tokens below stay coherent and easy to retune.
// ---------------------------------------------------------------------------

/** Neutrals carry a faint emerald bias (hue ~160, very low saturation) so the
 *  grayscale chrome reads as chosen and warm rather than clinical. The full
 *  ramp is documented for reference; screens consume the semantic tokens below,
 *  never these raw steps. */
export const neutral = {
  0: '#ffffff',
  50: '#f7faf8',
  100: '#eef3f0',
  200: '#e2e9e5',
  300: '#cdd6d1',
  400: '#9aa8a1',
  500: '#6d7a74',
  600: '#4d5852',
  700: '#343d39',
  800: '#252d29',
  900: '#161c19',
  950: '#0e1210',
} as const;

/** Emerald — the one brand accent. Growth, life, "go". */
const emerald = {
  light: '#188b61', // --accent (light)
  base: '#10b981',
  dark: '#47d19f', // --accent (dark)
  onLight: '#ffffff',
  onDark: '#0f241c',
  gradient: ['#22c58e', '#0b6b4f'] as const, // matches Button accent gradient
} as const;

// ---------------------------------------------------------------------------
// SEMANTIC COLOR — resolved per theme. Mirrors global.css CSS variables.
// ---------------------------------------------------------------------------

export const colors = {
  light: {
    // grounds & surfaces (the spatial stack: sunken → base → card → raised)
    background: '#f8fbf9',
    surface: '#eef3f0', // sunken wells, grouped-list backing, sub-sections
    card: '#ffffff',
    cardForeground: '#161c19',
    raised: '#ffffff', // cards that float (FAB-adjacent, popovers) — pair w/ elevation

    // text
    foreground: '#161c19',
    mutedForeground: '#6d7a74',
    subtleForeground: '#9aa8a1',

    // brand
    primary: '#161c19',
    primaryForeground: '#ffffff',
    accent: emerald.light,
    accentForeground: emerald.onLight,

    // lines
    border: '#e2e9e5',
    divider: '#eef3f0',
    input: '#e2e9e5',
    ring: emerald.light,

    // semantic — deliberately separate from module tints & brand accent
    success: '#16a34a',
    successForeground: '#ffffff',
    warning: '#d97706',
    warningForeground: '#ffffff',
    error: '#dc2626',
    errorForeground: '#ffffff',
    info: '#2563eb',
    infoForeground: '#ffffff',
  },
  dark: {
    background: '#0e1210',
    surface: '#161c19',
    card: '#1a201d',
    cardForeground: '#eef3f0',
    raised: '#202723',

    foreground: '#eef3f0',
    mutedForeground: '#9aa8a1',
    subtleForeground: '#6d7a74',

    primary: '#eef3f0',
    primaryForeground: '#161c19',
    accent: emerald.dark,
    accentForeground: emerald.onDark,

    border: '#2b332e',
    divider: '#202723',
    input: '#2b332e',
    ring: emerald.dark,

    success: '#4ade80',
    successForeground: '#052e16',
    warning: '#fbbf24',
    warningForeground: '#271900',
    error: '#f87171',
    errorForeground: '#2a0a0a',
    info: '#60a5fa',
    infoForeground: '#0a1a33',
  },
} as const;

export type ThemeName = keyof typeof colors;

// ---------------------------------------------------------------------------
// MODULE TINTS — one signature hue per life area. Used for that module's
// progress ring, hero wash, chart series and iconography. NOT for chrome.
// Cool family = structure & rest (calendar/water/sleep/journal); warm family =
// energy & aspiration (fitness/goals); emerald = the brand + growth (habits).
// Pass any of these through lib/color.ts (tintGradient / glowShadow) so a
// module's whole surface derives from the one value.
// ---------------------------------------------------------------------------

export const moduleTints = {
  habit: { light: '#10b981', dark: '#34d399' }, // emerald — growth, streaks
  calendar: { light: '#3b82f6', dark: '#60a5fa' }, // blue — structure, time
  water: { light: '#06b6d4', dark: '#22d3ee' }, // cyan — hydration, clarity
  sleep: { light: '#6366f1', dark: '#818cf8' }, // indigo — night, rest
  journal: { light: '#8b5cf6', dark: '#a78bfa' }, // violet — reflection
  fitness: { light: '#f97316', dark: '#fb923c' }, // orange — exertion, energy
  goals: { light: '#f43f5e', dark: '#fb7185' }, // rose — aspiration, achievement
  budget: { light: '#0d9488', dark: '#2dd4bf' }, // teal — balance, ledgers
  study: { light: '#7c3aed', dark: '#a78bfa' }, // deep violet — focus
} as const;

export type ModuleName = keyof typeof moduleTints;

/** Resolve a module tint for the active theme in one call. */
export function moduleTint(name: ModuleName, theme: ThemeName): string {
  return moduleTints[name][theme];
}

/** Categorical chart palette — ordered so adjacent series stay distinct.
 *  Feed the light or dark row to charts based on the active theme. */
export const chartSeries = {
  light: ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e', '#6366f1'],
  dark: ['#34d399', '#60a5fa', '#a78bfa', '#fb923c', '#22d3ee', '#fb7185', '#818cf8'],
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY — Sora for all chrome; Literata (serif) reserved for Journal's
// written content so writing reads literary rather than form-filling.
// Sizes in px; lineHeight in px; letterSpacing in px (RN units).
// ---------------------------------------------------------------------------

export const fontFamily = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
  serif: 'Literata_400Regular',
  serifItalic: 'Literata_400Regular_Italic',
  serifMedium: 'Literata_500Medium',
  serifSemibold: 'Literata_600SemiBold',
} as const;

/** The type scale. `family` names the intended Sora weight; `tracking` is in px
 *  (negative tightens display sizes, positive opens up small uppercase labels). */
export const typography = {
  display: { size: 40, lineHeight: 44, family: fontFamily.extrabold, tracking: -0.8 },
  h1: { size: 30, lineHeight: 36, family: fontFamily.extrabold, tracking: -0.5 },
  h2: { size: 24, lineHeight: 30, family: fontFamily.bold, tracking: -0.4 },
  h3: { size: 20, lineHeight: 26, family: fontFamily.semibold, tracking: -0.2 },
  title: { size: 17, lineHeight: 24, family: fontFamily.semibold, tracking: -0.1 },
  bodyLg: { size: 17, lineHeight: 26, family: fontFamily.regular, tracking: 0 },
  body: { size: 15, lineHeight: 23, family: fontFamily.regular, tracking: 0 },
  label: { size: 13, lineHeight: 18, family: fontFamily.semibold, tracking: 0 },
  caption: { size: 12, lineHeight: 16, family: fontFamily.regular, tracking: 0.1 },
  micro: { size: 11, lineHeight: 14, family: fontFamily.medium, tracking: 0.4 }, // uppercase eyebrows
  // Numeric readouts (streaks, water ml, stats) want tabular alignment & tight tracking.
  stat: { size: 34, lineHeight: 38, family: fontFamily.extrabold, tracking: -1 },
  statSm: { size: 22, lineHeight: 26, family: fontFamily.bold, tracking: -0.5 },
} as const;

// ---------------------------------------------------------------------------
// SPACING — 8-point rhythm on a 4px base. Keys are the multiple of 4px.
// ---------------------------------------------------------------------------

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Layout constants that repeat across screens. */
export const layout = {
  screenPaddingX: spacing[5], // 20 — comfortable gutters, thumb-safe
  cardPadding: spacing[4], // 16
  cardPaddingLg: spacing[5], // 20 — hero cards
  sectionGap: spacing[6], // 24 — between dashboard sections
  listRowGap: spacing[3], // 12
  fieldGap: spacing[4], // 16 — form rows
  sheetPadding: spacing[5], // 20
  tabBarHeight: 64,
  fabSize: 56,
  minTouchTarget: 44, // never smaller — accessibility floor
} as const;

// ---------------------------------------------------------------------------
// RADIUS — soft but not pill-everywhere. `full` reserved for buttons/pills/FAB.
// ---------------------------------------------------------------------------

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// ELEVATION — the spatial stack. Neutral shadows for chrome; use glowShadow()
// from lib/color.ts for colored/module surfaces. Values tuned to stay soft on
// light and to read as depth (not haze) on dark. `elevation` is Android-only.
// ---------------------------------------------------------------------------

export const elevation = {
  e0: { shadowColor: '#000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  e1: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  e2: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  e3: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  e4: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
} as const;

export type ElevationLevel = keyof typeof elevation;

// ---------------------------------------------------------------------------
// OPACITY — interaction & state.
// ---------------------------------------------------------------------------

export const opacity = {
  disabled: 0.4, // matches Button's disabled:opacity-40
  pressedOverlay: 0.08,
  muted: 0.6,
  scrim: 0.5, // modal / sheet backdrop
  ghostHover: 0.06,
} as const;

// ---------------------------------------------------------------------------
// MOTION — purpose before decoration. Durations in ms. Springs feed Reanimated
// withSpring; timings feed withTiming with the matching easing (see notes).
// Always gate celebratory / non-essential motion behind reduced-motion.
// ---------------------------------------------------------------------------

export const motion = {
  duration: {
    instant: 100, // state flips (checkbox tick, toggle)
    fast: 160, // press feedback, small fades
    base: 220, // most enter/exit, card expand
    slow: 320, // page transitions, sheet present
    slower: 480, // progress ring sweeps, celebratory reveals
  },
  /** Reanimated spring presets. `press` matches the Button press-in feel. */
  spring: {
    press: { damping: 16, stiffness: 400 }, // snappy tap-down
    release: { damping: 12, stiffness: 300 }, // soft settle back
    gentle: { damping: 18, stiffness: 180 }, // sheets, reorder
    bouncy: { damping: 10, stiffness: 220 }, // streak celebration only
  },
  /** Easing bezier control points — pair with react-native-reanimated Easing.bezier. */
  easing: {
    standard: [0.2, 0, 0, 1], // default enter+exit, "expressive standard"
    decelerate: [0, 0, 0, 1], // enter (comes to rest)
    accelerate: [0.3, 0, 1, 1], // exit (leaves screen)
  },
} as const;

// ---------------------------------------------------------------------------
// Convenience: the full token bundle for a given theme, for ergonomic imports
// in native code (`const t = tokens('dark')`).
// ---------------------------------------------------------------------------

export function tokens(theme: ThemeName) {
  return {
    colors: colors[theme],
    module: (name: ModuleName) => moduleTints[name][theme],
    chart: chartSeries[theme],
    typography,
    spacing,
    layout,
    radius,
    elevation,
    opacity,
    motion,
    fontFamily,
  } as const;
}
