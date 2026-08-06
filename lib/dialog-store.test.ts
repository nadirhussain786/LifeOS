import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { chooseAction, confirm, notify, useDialogStore } from '@/lib/dialog-store';

const ROOT = join(__dirname, '..');

function sourceFiles(...directories: string[]): string[] {
  const out: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
    }
  };
  for (const directory of directories) walk(join(ROOT, directory));
  return out;
}

/** Source with comments stripped — these assertions are about calls, and the
 *  files discuss `Alert.alert` in prose at length. */
const readCode = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

describe('dialog store', () => {
  beforeEach(() => useDialogStore.setState({ pending: null }));

  it('resolves true only when confirmed', async () => {
    const answer = confirm({ title: 'T', confirmLabel: 'Yes', cancelLabel: 'No' });
    useDialogStore.getState().settle(true);
    await expect(answer).resolves.toBe(true);
  });

  it('treats dismissal as a no', async () => {
    // The back button and the scrim both route here. Anything other than an
    // explicit yes has to be a no: these dialogs guard deletes.
    const answer = confirm({ title: 'T', confirmLabel: 'Yes', cancelLabel: 'No' });
    useDialogStore.getState().settle(false);
    await expect(answer).resolves.toBe(false);
  });

  it('settles once, however many times it is told to', async () => {
    // A double tap, or a dismiss racing a button. The second settle must not
    // resolve an already-resolved promise or throw on a null pending.
    const answer = confirm({ title: 'T', confirmLabel: 'Yes', cancelLabel: 'No' });
    const store = useDialogStore.getState();
    store.settle(true);
    expect(() => store.settle(false)).not.toThrow();
    await expect(answer).resolves.toBe(true);
    expect(useDialogStore.getState().pending).toBeNull();
  });

  it('cancels a dialog that a second one replaces', async () => {
    // Otherwise the first caller's `await` never returns, and whatever it was
    // guarding is wedged for the rest of the session.
    const first = confirm({ title: 'first', confirmLabel: 'Yes', cancelLabel: 'No' });
    const second = confirm({ title: 'second', confirmLabel: 'Yes', cancelLabel: 'No' });
    await expect(first).resolves.toBe(false);
    useDialogStore.getState().settle(true);
    await expect(second).resolves.toBe(true);
  });

  it('returns the chosen action id, and null for none', async () => {
    const actions = [{ id: 'report', label: 'Report' }];
    const picked = chooseAction({ title: 'T', actions, cancelLabel: 'Cancel' });
    useDialogStore.getState().settle('report');
    await expect(picked).resolves.toBe('report');

    const dismissed = chooseAction({ title: 'T', actions, cancelLabel: 'Cancel' });
    useDialogStore.getState().settle(null);
    await expect(dismissed).resolves.toBeNull();
  });

  it('gives a notice no cancel label, so the host renders one button', async () => {
    const answer = notify({ title: 'T', confirmLabel: 'OK' });
    const pending = useDialogStore.getState().pending;
    expect(pending?.kind).toBe('confirm');
    expect(pending && 'cancelLabel' in pending.request && pending.request.cancelLabel).toBeFalsy();
    useDialogStore.getState().settle(true);
    await expect(answer).resolves.toBe(true);
  });
});

describe('no screen falls back to the OS dialog', () => {
  it('has no Alert.alert call sites left', () => {
    // 56 of them, replaced. `Alert.alert` ignores the app's typography, tokens,
    // spacing and layout direction, renders differently on each platform, and
    // silently drops buttons past the third on Android. One left behind is a
    // screen that looks like a different app.
    const offenders = sourceFiles('app', 'features', 'components')
      .filter((path) => /\bAlert\.alert\s*\(/.test(readCode(path)))
      .map((path) => path.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });

  it('mounts the host that renders them', () => {
    expect(readCode(join(ROOT, 'app/_layout.tsx'))).toContain('DialogHost');
  });

  it('labels every button through i18n', () => {
    // The bug this caught: sign-up shipped `{ text: 'OK' }` — a hardcoded
    // English button in an app whose other three locales are Arabic, Hindi and
    // Urdu. A literal here is invisible until somebody reads that screen in
    // that language.
    const offenders: string[] = [];
    for (const path of sourceFiles('app', 'features', 'components')) {
      const source = readCode(path);
      for (const match of source.matchAll(/(confirmLabel|cancelLabel):\s*([^,\n]+)/g)) {
        const value = match[2].trim();
        // `i18n.t(` as well as the hook's `t(`: code outside a component (the
        // biometric prompt's own options) translates through the instance, and
        // that is just as translated.
        if (!/^(i18n\.)?t\(/.test(value)) {
          offenders.push(`${path.slice(ROOT.length + 1)}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
