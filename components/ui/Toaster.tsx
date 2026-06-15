import React, { useEffect, useState, useCallback } from 'react';
import { CircleCheck, CircleX, CircleAlert, Info, X } from 'lucide-react';
import { useToastStore, ToastItem, ToastType } from '../../lib/toast';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

const ICON: Record<ToastType, IconCmp> = {
  success: CircleCheck,
  error: CircleX,
  warning: CircleAlert,
  info: Info,
};
const ACCENT: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
};
const RING: Record<ToastType, string> = {
  success: 'ring-emerald-500/25',
  error: 'ring-rose-500/25',
  warning: 'ring-amber-500/25',
  info: 'ring-sky-500/25',
};

const ToastRow = ({ t }: { t: ToastItem }) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);
  const close = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    const timer = setTimeout(close, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, close]);

  const Icon = ICON[t.type];
  return (
    <div
      role="status"
      onAnimationEnd={() => { if (leaving) dismiss(t.id); }}
      className={`pointer-events-auto flex items-start gap-3 w-full rounded-2xl bg-slate-900/90 backdrop-blur-xl ring-1 ${RING[t.type]} shadow-2xl shadow-black/40 px-4 py-3 ${leaving ? 'lm-toast-out' : 'lm-toast-in'}`}
    >
      <Icon size={20} className={`${ACCENT[t.type]} shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm text-slate-100 leading-6 break-words">{t.message}</p>
      <button type="button" onClick={close} aria-label="بستن" className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

/** Renders the toast queue. Mount once at the app root. */
export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[150] flex justify-center px-3 pt-safe-top pointer-events-none" dir="rtl">
      <div className="w-full max-w-sm flex flex-col gap-2 pt-3">
        {toasts.map((t) => <ToastRow key={t.id} t={t} />)}
      </div>
    </div>
  );
};
