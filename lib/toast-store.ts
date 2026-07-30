import { create } from 'zustand';

/**
 * The app's transient-feedback channel.
 *
 * Before this there wasn't one. Every confirmation went through `Alert.alert`,
 * including the purely informational ones ("Invitation sent", "Test notification
 * sent", "Saved to feed") — a modal that stops the world and demands a tap to
 * acknowledge something the user already knows they did. And every destructive
 * action was confirm-then-gone, with no undo anywhere in the app except tapping
 * the last water glass. On a journal and a shared ledger, a mis-tapped delete
 * was unrecoverable.
 *
 * A toast fixes both ends: success reports itself without blocking, and a
 * delete can complete immediately while offering a few seconds to take it back
 * — which is both faster and safer than a confirmation dialog, because
 * confirmations are dismissed reflexively and undo is not.
 *
 * Kept in a store rather than a React context so repositories, mutation
 * handlers and other non-render code can raise one directly.
 */

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  /** Milliseconds on screen. Undo needs longer than an acknowledgement. */
  durationMs: number;
};

type ToastState = {
  current: Toast | null;
  show: (toast: Omit<Toast, 'id'>) => number;
  dismiss: (id?: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: (toast) => {
    const id = nextId++;
    // One at a time. A queue sounds tidier but in practice means a user tapping
    // delete three times waits through three sequential undo windows, by which
    // point the first is long gone — replacing is the honest behaviour.
    set({ current: { ...toast, id } });
    return id;
  },
  dismiss: (id) => {
    const current = get().current;
    if (!current) return;
    if (id !== undefined && current.id !== id) return;
    set({ current: null });
  },
}));

const DEFAULT_MS = 3200;
/** Long enough to notice, read and reach — the standard undo affordance. */
const UNDO_MS = 6000;

/** Imperative API. Callable from anywhere, including outside React. */
export const toast = {
  success(message: string, action?: ToastAction) {
    return useToastStore
      .getState()
      .show({ message, variant: 'success', action, durationMs: action ? UNDO_MS : DEFAULT_MS });
  },
  error(message: string, action?: ToastAction) {
    return useToastStore
      .getState()
      .show({ message, variant: 'error', action, durationMs: action ? UNDO_MS : 4200 });
  },
  info(message: string, action?: ToastAction) {
    return useToastStore
      .getState()
      .show({ message, variant: 'info', action, durationMs: action ? UNDO_MS : DEFAULT_MS });
  },
  /**
   * "Deleted — Undo". The delete has already happened; `onUndo` puts it back.
   * Prefer this over a confirmation dialog for anything cheaply reversible.
   */
  undo(message: string, undoLabel: string, onUndo: () => void) {
    return useToastStore.getState().show({
      message,
      variant: 'info',
      action: { label: undoLabel, onPress: onUndo },
      durationMs: UNDO_MS,
    });
  },
  dismiss(id?: number) {
    useToastStore.getState().dismiss(id);
  },
};
