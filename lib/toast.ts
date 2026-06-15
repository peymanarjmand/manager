import { create } from 'zustand';
import { newId } from './id';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string, duration: number) => string;
  dismiss: (id: string) => void;
}

/** Toast queue. The <Toaster /> (mounted once at the root) renders it. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message, duration) => {
    const id = newId();
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Errors linger longest; success is briefest.
const DEFAULT_MS: Record<ToastType, number> = { success: 3000, info: 3500, warning: 4500, error: 5000 };

const show = (type: ToastType) => (message: string, duration?: number) =>
  useToastStore.getState().push(type, message, duration ?? DEFAULT_MS[type]);

/**
 * Imperative toast API — call from anywhere (no hook needed), e.g.
 * `toast.error('...')`. Replaces native alert() with a themed, non-blocking
 * notification.
 */
export const toast = {
  success: show('success'),
  error: show('error'),
  info: show('info'),
  warning: show('warning'),
};
