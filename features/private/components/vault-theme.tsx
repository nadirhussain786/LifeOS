import { createContext, useContext, type ReactNode } from 'react';

/**
 * The private space has its own ground, and does not inherit the app's theme.
 *
 * This is the cheapest thing in the redesign and the one that does the most
 * work. Every other screen in LifeOS renders on `bg-background`, which is white
 * in light mode — so the vault used to look exactly like the budget screen with
 * different words on it, and crossing into it registered as a navigation push
 * rather than as going somewhere.
 *
 * Here it is always dark, and darker than the app's own dark: `void` sits below
 * `colors.dark.background`, so even a user who never leaves dark mode sees the
 * ground drop when the space opens. That difference is doing trust work no copy
 * can do — you can tell you are somewhere else before reading a word.
 *
 * ## Why a palette rather than a theme override
 *
 * NativeWind classes resolve against the app's theme at build time, so there is
 * no runtime switch that would make `bg-card` mean something different in here.
 * Rather than fight that, the private screens read these values explicitly.
 * The constraint turns out to be the feature: a private screen cannot
 * accidentally pick up an app surface, because it has to name a vault one.
 *
 * ## Surfaces are recessed, not raised
 *
 * The app stacks upward — background, card, raised — with borders and shadows
 * that lift content toward the reader. The vault goes the other way: `well` is
 * *darker* than the ground it sits on, lit by a hairline along its top edge as
 * though from above. A vault holds things; it does not display them.
 */

export type VaultPalette = {
  /** The ground. Deeper than the app's dark background, deliberately. */
  void: string;
  /** Slightly lifted ground, for headers and sheets. */
  ground: string;
  /** Recessed container — darker than `void`, with a lit top edge. */
  well: string;
  /** The hairline that reads as light catching the lip of a well. */
  wellEdge: string;
  /** Hairlines and dividers. */
  line: string;
  ink: string;
  mute: string;
  faint: string;
  /** Error tone that works on near-black without shouting. */
  alarm: string;
};

const VAULT: VaultPalette = {
  void: '#080b0a',
  ground: '#0e1210',
  well: '#05070699',
  wellEdge: '#ffffff0f',
  line: '#1e2622',
  ink: '#eef3f0',
  mute: '#8b978f',
  faint: '#5f6b65',
  alarm: '#f87171',
};

/** The ground, for the one caller that needs it before the provider exists:
 *  the navigator's `contentStyle`, which sets the colour behind a screen during
 *  a transition. Repeating the hex there would be a second source of truth for
 *  the most load-bearing value in the space. */
export const VAULT_VOID = VAULT.void;

const VaultThemeContext = createContext<VaultPalette>(VAULT);

/**
 * Wraps the private routes. Provides the palette and nothing else — there is no
 * light variant to select between, which is the whole point.
 */
export function VaultThemeProvider({ children }: { children: ReactNode }) {
  return <VaultThemeContext.Provider value={VAULT}>{children}</VaultThemeContext.Provider>;
}

export function useVaultTheme(): VaultPalette {
  return useContext(VaultThemeContext);
}

/**
 * `color` at `alpha`, as an 8-digit hex.
 *
 * The module tints are the only colour in the space, and they are used at low
 * opacity far more often than at full strength — a glyph plate, a lamp, a
 * selected chip. Written out rather than reached for from lib/color because
 * these all sit on near-black, where a percentage behaves differently than it
 * does on the app's lighter grounds.
 */
export function tinted(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const byte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${byte}`;
}
