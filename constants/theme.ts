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
  },
} as const;

export type ThemeName = keyof typeof colors;
