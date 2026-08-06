import { create } from 'zustand';

/**
 * Confirmations and action menus, as the app's own UI rather than the OS's.
 *
 * `Alert.alert` was doing both jobs in 57 places, and it is the one piece of
 * this app that ignores every decision the rest of it makes. It renders in the
 * system font, in the system's light or dark, with the system's corner radius
 * and button order — so the app's typography, tokens and spacing stop at the
 * dialog's edge. It looks materially different on iOS and Android, which makes
 * "how does this read" unanswerable from one device. It cannot show an icon or
 * a module tint, so a destructive confirmation looks exactly like an
 * informational one. And its Android implementation caps out at three buttons
 * and drops the rest silently.
 *
 * RTL is the part that actually breaks rather than merely looks wrong: Arabic
 * and Urdu are two of the four shipped locales, and the native dialog lays its
 * buttons out by platform convention rather than by the app's direction.
 *
 * ## Why imperative, and why a store
 *
 * The call sites read almost exactly as they did — `await confirm({…})` where
 * `Alert.alert(…)` was — so migrating 57 of them is a mechanical change rather
 * than 57 opportunities to introduce a state bug. A component-per-dialog
 * approach means every screen grows `useState` for open/closed plus a pending
 * action, which is the same code written 57 times.
 *
 * Promise-based because that is what the call sites want: the question is
 * always "did they agree", and a callback forces the answer inside-out.
 *
 * Kept in a store for the same reason the toast is: a confirmation raised by a
 * delete on a detail screen has to outlive the `router.back()` that follows it.
 */

export type DialogAction = {
  /** Returned by `chooseAction` when this row is picked. */
  id: string;
  label: string;
  /** Rendered in the error tone, and separated from the rest. */
  destructive?: boolean;
};

export type ConfirmRequest = {
  title: string;
  message?: string;
  /** Defaults to the translated "OK" at the call site; there is no fallback
   *  here, because a dialog labelled by a hardcoded English string is exactly
   *  the bug this file's RTL note is about. */
  confirmLabel: string;
  /** Omitted for a one-button notice — see `notify`. */
  cancelLabel?: string;
  destructive?: boolean;
};

export type ChooseRequest = {
  title: string;
  message?: string;
  actions: DialogAction[];
  cancelLabel: string;
};

type Pending =
  | { kind: 'confirm'; request: ConfirmRequest; resolve: (ok: boolean) => void }
  | { kind: 'choose'; request: ChooseRequest; resolve: (id: string | null) => void };

type DialogState = {
  pending: Pending | null;
  /** Resolves the open dialog and clears it. Idempotent: a double tap, or a
   *  dismiss racing a button, must not resolve the same promise twice — the
   *  second call would leave the caller's `await` hanging forever. */
  settle: (value: boolean | string | null) => void;
  request: (pending: Pending) => void;
};

export const useDialogStore = create<DialogState>((set, get) => ({
  pending: null,

  request: (pending) => {
    // A second dialog opening over a first would strand the first's promise.
    // Resolving it as "cancelled" is the honest outcome: the user never saw it.
    const existing = get().pending;
    if (existing) {
      if (existing.kind === 'confirm') existing.resolve(false);
      else existing.resolve(null);
    }
    set({ pending });
  },

  settle: (value) => {
    const pending = get().pending;
    if (!pending) return;
    set({ pending: null });
    if (pending.kind === 'confirm') pending.resolve(value === true);
    else pending.resolve(typeof value === 'string' ? value : null);
  },
}));

/** Asks a yes/no question. Resolves false on cancel, back-button or dismiss. */
export function confirm(request: ConfirmRequest): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().request({ kind: 'confirm', request, resolve });
  });
}

/**
 * A one-button notice. Resolves when it is acknowledged or dismissed.
 *
 * For the cases a toast cannot carry: an instruction the user has to act on
 * ("enable notifications in system settings"), or a failure whose explanation
 * does not fit in two lines. Everything shorter should be a toast — a modal
 * that stops the world to report something the user already knows they did is
 * the habit lib/toast-store.ts exists to break, and fifteen of these were still
 * doing exactly that.
 */
export function notify(request: Omit<ConfirmRequest, 'cancelLabel'>): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().request({ kind: 'confirm', request, resolve });
  });
}

/**
 * Offers a short list of actions. Resolves the chosen `id`, or null.
 *
 * Use this rather than a confirm with extra buttons — the native alert's
 * three-button ceiling is what forced menus into that shape, and it is not a
 * constraint here.
 */
export function chooseAction(request: ChooseRequest): Promise<string | null> {
  return new Promise((resolve) => {
    useDialogStore.getState().request({ kind: 'choose', request, resolve });
  });
}
