/**
 * Raw color values mirrored from global.css HSL variables.
 * Use these only where NativeWind classNames can't reach (e.g. native
 * components like StatusBar, or navigation theme objects). Everywhere else,
 * prefer the Tailwind tokens (bg-background, text-foreground, etc).
 */
export const colors = {
  light: {
    background: '#ffffff',
    foreground: '#171717',
    card: '#ffffff',
    primary: '#171717',
    primaryForeground: '#ffffff',
    muted: '#f5f5f5',
    mutedForeground: '#737373',
    border: '#e5e5e5',
    destructive: '#dc2828',
    accent: '#188b61',
    accentForeground: '#ffffff',
  },
  dark: {
    background: '#121212',
    foreground: '#f5f5f5',
    card: '#1a1a1a',
    primary: '#f5f5f5',
    primaryForeground: '#171717',
    muted: '#262626',
    mutedForeground: '#a3a3a3',
    border: '#333333',
    destructive: '#a62626',
    accent: '#47d19f',
    accentForeground: '#0f241c',
  },
} as const;

export type ThemeName = keyof typeof colors;

/**
 * Small curated palette for user-created content color-coding (task
 * categories, and later note folders/calendar colors) — a deliberate,
 * scoped exception to the app's own grayscale chrome, not a general accent
 * palette. Same set in both themes; these are chosen to read clearly on
 * both light and dark backgrounds.
 */
export const categoryColorPalette = [
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;

/**
 * Task priority as a traffic-light ladder (calm blue → amber caution → red
 * urgent) rather than a single accent — priority is its own semantic system,
 * deliberately distinct from the brand accent so "urgent" always reads as
 * urgent regardless of theme. High reuses the app's existing destructive
 * red so "urgent" and "destructive" share one consistent red language.
 */
export const priorityColors = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#dc2828',
} as const;

/**
 * "Done today" for habits, deliberately not the brand accent — the accent is
 * already the app's generic CTA color (buttons, FAB, pin), so reusing it here
 * would make a completed habit read as "tap me" instead of "already done."
 * Same green as the category palette's "green" swatch, promoted to a named
 * semantic token since habit completion needs it in more than one component.
 */
export const habitDoneColor = '#22c55e';
