import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * That the private space keeps its own visual language.
 *
 * The redesign exists because of a measurement, not a mood: 82 of 90 screens
 * opened with the same container and the app's one bordered card appeared 138
 * times, so the vault was the budget screen in a different colour. Nothing was
 * broken, which is exactly why it stayed that way.
 *
 * The failure mode this guards is not a bug either. It is somebody adding a
 * fifth private module by copying an existing app screen — reaching for
 * `bg-card`, `colors[scheme]` and `variant="caption"` because that is what
 * every other screen in the repo uses. One such screen does not look wrong on
 * its own; it just quietly returns the space to being nowhere.
 *
 * Read as source text, because these screens pull in expo-router, reanimated
 * and SecureStore, none of which render under Jest. What is being asked is
 * which styling vocabulary each file speaks, and that is answerable statically.
 */

const ROOT = join(__dirname, '..', '..');
const PRIVATE_DIRS = ['app/private', 'features/private'];

/** Files that legitimately keep app vocabulary, with the reason. */
const EXEMPT = new Set([
  // Pure logic and config — no styling at all.
  'features/private/config/private-modules.ts',
  'features/private/services',
  'features/private/store',
  'features/private/hooks',
  // The bridge itself: it defines the vault palette, so it names raw colours.
  'features/private/components/vault-theme.tsx',
  // Rendered OUTSIDE the private layout, over app screens, so it must use the
  // app's theme — a dark-only overlay on a light screen would be the bug.
  'features/private/components/secure-content-view.tsx',
]);

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) out.push(path);
    }
  };
  for (const dir of PRIVATE_DIRS) walk(join(ROOT, dir));
  return out.filter((path) => {
    const rel = path.slice(ROOT.length + 1);
    return ![...EXEMPT].some((ex) => rel === ex || rel.startsWith(`${ex}/`));
  });
}

/** Source with comments removed — these files discuss the app's tokens in prose
 *  precisely because they are explaining why they do not use them. */
const readCode = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

const rel = (path: string) => path.slice(ROOT.length + 1);

describe('the private space has its own ground', () => {
  it('has screens to check (guards against an empty sweep passing)', () => {
    expect(sourceFiles().length).toBeGreaterThan(8);
  });

  it('never renders on the app background', () => {
    // `bg-background` is white in light mode. A private screen wearing it is
    // the entire original problem in one class name.
    const offenders = sourceFiles()
      .filter((path) => /bg-background|bg-card|bg-surface/.test(readCode(path)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('never reaches for the app theme', () => {
    // `colors[scheme]` follows the user's light/dark setting; the vault does
    // not have one. Reading it here is how a screen starts inheriting again.
    const offenders = sourceFiles()
      .filter((path) => /colors\[scheme\]|useColorScheme/.test(readCode(path)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('does not use the app card', () => {
    // The 138-times shape: a lighter surface with a full border, lifted off the
    // page. Wells are darker and lit on one edge, which is the whole point.
    const offenders = sourceFiles()
      .filter((path) => /border border-border/.test(readCode(path)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('uses the vault palette instead', () => {
    // The positive form of the assertions above. Scoped to files that actually
    // paint something: the layout only *provides* the palette (and takes the
    // ground from VAULT_VOID), and secure-screen is a hook that renders nothing.
    const painting = sourceFiles().filter(
      (path) => path.endsWith('.tsx') && /backgroundColor|color:/.test(readCode(path)),
    );
    expect(painting.length).toBeGreaterThan(6);

    const offenders = painting
      .filter((path) => !/useVaultTheme|VAULT_VOID/.test(readCode(path)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

describe('the vault theme cannot follow the app', () => {
  const theme = readFileSync(join(ROOT, 'features/private/components/vault-theme.tsx'), 'utf8');

  it('offers no light variant to select between', () => {
    // If a light palette ever exists here, something will eventually select it
    // from the app's preference, and the space stops being a place you enter.
    expect(theme).not.toMatch(/light\s*:/);
    expect(theme).not.toContain('useColorScheme');
  });

  it('is darker than the app is in dark mode', () => {
    // `#080b0a` against the app's `#0e1210`. The drop in ground is what makes
    // the threshold visible even to a user who never leaves dark mode.
    const vaultVoid = /void:\s*'#([0-9a-f]{6})'/.exec(theme)?.[1];
    expect(vaultVoid).toBeDefined();

    const luminance = (hex: string) =>
      parseInt(hex.slice(0, 2), 16) + parseInt(hex.slice(2, 4), 16) + parseInt(hex.slice(4, 6), 16);
    // colors.dark.background in constants/design-tokens.ts
    expect(luminance(vaultVoid!)).toBeLessThan(luminance('0e1210'));
  });

  it('is applied to every private route by the layout', () => {
    // Per-screen application is a thing to remember, and the screen it is
    // forgotten on is the one somebody opens in front of another person.
    expect(readCode(join(ROOT, 'app/private/_layout.tsx'))).toContain('VaultThemeProvider');
  });
});
