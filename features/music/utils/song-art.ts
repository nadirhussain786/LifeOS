/**
 * Generative per-song artwork. Device-imported songs carry no album art, so we
 * synthesize a unique, vibrant gradient identity from a stable seed (the song
 * id, or title as a fallback). Deterministic — a given song always renders the
 * same colors, everywhere it appears (rows, orbs, mini-player, queue).
 */

/** FNV-1a-ish string hash → unsigned 32-bit. Stable across launches. */
function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** HSL (h 0–360, s/l 0–1) → hex. */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** The song's base hue (0–360). */
export function songHue(seed: string): number {
  return hashString(seed) % 360;
}

/** The song's signature solid color — used to tint aurora washes & glows. */
export function songColor(seed: string): string {
  return hslToHex(songHue(seed), 0.7, 0.55);
}

/**
 * A vibrant three-stop gradient (two analogous hues) that reads like album art.
 * Feed to a LinearGradient top-left → bottom-right.
 */
export function songGradient(seed: string): [string, string, string] {
  const hash = hashString(seed);
  const base = hash % 360;
  const spread = 30 + (hash % 40); // 30–70° analogous spread
  return [
    hslToHex(base, 0.74, 0.62),
    hslToHex(base + spread / 2, 0.7, 0.5),
    hslToHex(base + spread, 0.76, 0.4),
  ];
}
