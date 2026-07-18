/**
 * Small color helpers for the premium gradient design language. Every module
 * carries one signature tint; these derive the lighter/darker stops, soft
 * tinted backgrounds and glow shadows from that single hex so a module's whole
 * look stays coherent from one value.
 */

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Mixes `hex` toward `target` by `amount` (0–1). */
function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

/** Two-stop gradient derived from a module tint: a brighter top-left flowing
 * into a deeper bottom-right, for hero cards, rings and FAB-like surfaces. */
export function tintGradient(hex: string): [string, string] {
  return [lighten(hex, 0.12), darken(hex, 0.24)];
}

/** Even richer three-stop gradient for large hero washes. */
export function tintGradientTriple(hex: string): [string, string, string] {
  return [lighten(hex, 0.18), hex, darken(hex, 0.28)];
}

/** Alpha-suffixed hex for subtle tinted fills (e.g. `${tint}1f`). `a` is 0–1. */
export function alpha(hex: string, a: number): string {
  const value = clamp(a * 255).toString(16).padStart(2, '0');
  return `${hex}${value}`;
}

/** Shared soft-glow shadow for elevated colored surfaces. */
export function glowShadow(hex: string, opacity = 0.35) {
  return {
    shadowColor: hex,
    shadowOpacity: opacity,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  } as const;
}
