import {
  colors,
  moduleTint,
  moduleTintText,
  moduleTints,
  readableTint,
  type ModuleName,
  type ThemeName,
} from '@/constants/design-tokens';
import { contrastRatio, readableOn, relativeLuminance } from '@/lib/color';
import { categoryColorPalette, priorityColors, habitDoneColor } from '@/constants/theme';

const MODULES = Object.keys(moduleTints) as ModuleName[];
const THEMES: ThemeName[] = ['light', 'dark'];

/** WCAG AA for body text; the bar every colored label in the app has to clear. */
const AA_TEXT = 4.5;
/** WCAG AA for graphics and large text — the bar for fills, rings and icons. */
const AA_GRAPHIC = 3;

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#10b981', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#10b981'),
      10,
    );
  });

  it('matches known reference values', () => {
    // Spot-checked against the WCAG formula; these are the ones that were
    // failing in the app before readableOn existed.
    expect(contrastRatio('#f59e0b', '#f8fbf9')).toBeCloseTo(2.06, 1);
    expect(contrastRatio('#eab308', '#ffffff')).toBeCloseTo(1.92, 1);
    expect(contrastRatio('#22c55e', '#ffffff')).toBeCloseTo(2.28, 1);
  });
});

describe('relativeLuminance', () => {
  it('bounds at black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
  });
});

describe('readableOn', () => {
  it('leaves a color alone when it already passes', () => {
    expect(readableOn('#000000', '#ffffff', AA_TEXT)).toBe('#000000');
  });

  it('darkens on light grounds and lightens on dark ones', () => {
    const onLight = readableOn('#eab308', '#ffffff', AA_TEXT);
    const onDark = readableOn('#4d7c0f', '#0e1210', AA_TEXT);
    expect(relativeLuminance(onLight)).toBeLessThan(relativeLuminance('#eab308'));
    expect(relativeLuminance(onDark)).toBeGreaterThan(relativeLuminance('#4d7c0f'));
  });

  it('reaches the requested ratio for every hue', () => {
    for (const hex of ['#eab308', '#22c55e', '#06b6d4', '#f97316', '#f43f5e', '#a3e635']) {
      for (const background of ['#ffffff', '#0e1210', '#1a201d', '#f8fbf9']) {
        expect(
          contrastRatio(readableOn(hex, background, AA_TEXT), background),
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });
});

describe('module tints', () => {
  it.each(THEMES)('fills clear the graphics bar on %s cards', (theme) => {
    for (const name of MODULES) {
      const ratio = contrastRatio(moduleTint(name, theme), colors[theme].card);
      expect({ name, theme, ratio }).toMatchObject({ name, theme });
      expect(ratio).toBeGreaterThanOrEqual(AA_GRAPHIC);
    }
  });

  it.each(THEMES)('text variants clear the body-text bar on %s cards', (theme) => {
    for (const name of MODULES) {
      const ratio = contrastRatio(moduleTintText(name, theme), colors[theme].card);
      // Named in the failure output so a regression says which module broke.
      expect(`${name}:${ratio.toFixed(2)}`).toBe(`${name}:${Math.max(ratio, AA_TEXT).toFixed(2)}`);
    }
  });

  it.each(THEMES)('text variants also clear it on the %s background', (theme) => {
    for (const name of MODULES) {
      const ratio = contrastRatio(moduleTintText(name, theme), colors[theme].background);
      expect(ratio).toBeGreaterThanOrEqual(AA_GRAPHIC);
    }
  });

  it('keeps every module hue distinguishable from its neighbours', () => {
    // Two modules that read as the same color defeat the point of having one
    // tint per life area.
    for (const theme of THEMES) {
      const seen = new Map<string, ModuleName>();
      for (const name of MODULES) {
        const hex = moduleTint(name, theme);
        expect(seen.has(hex)).toBe(false);
        seen.set(hex, name);
      }
    }
  });
});

describe('user-content palettes', () => {
  it('every category swatch has a legible text form in both themes', () => {
    for (const swatch of categoryColorPalette) {
      for (const theme of THEMES) {
        expect(
          contrastRatio(readableTint(swatch, theme), colors[theme].card),
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('priority colors are legible as text in both themes', () => {
    for (const hex of Object.values(priorityColors)) {
      for (const theme of THEMES) {
        expect(contrastRatio(readableTint(hex, theme), colors[theme].card)).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }
    }
  });

  it('habit-done green is legible as text in both themes', () => {
    for (const theme of THEMES) {
      expect(
        contrastRatio(readableTint(habitDoneColor, theme), colors[theme].card),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
