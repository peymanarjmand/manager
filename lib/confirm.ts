import { create } from 'zustand';
import { newId } from './id';

export type ConfirmTone = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: string;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  current: ConfirmRequest | null;
  request: (opts: ConfirmOptions) => Promise<boolean>;
  resolve: (ok: boolean) => void;
}

/** Confirm-dialog request. The <ConfirmHost /> (mounted at the root) renders it. */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  request: (opts) =>
    new Promise<boolean>((resolve) => {
      // If one is somehow already open, treat it as cancelled before replacing.
      const prev = get().current;
      if (prev) prev.resolve(false);
      set({ current: { ...opts, id: newId(), resolve } });
    }),
  resolve: (ok) => {
    const cur = get().current;
    if (cur) cur.resolve(ok);
    set({ current: null });
  },
}));

/**
 * Themed async confirmation — replaces the blocking native confirm():
 *   if (await confirm({ message: '...', tone: 'danger' })) { ...delete... }
 */
export const confirm = (opts: ConfirmOptions) => useConfirmStore.getState().request(opts);
