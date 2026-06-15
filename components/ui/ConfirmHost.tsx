import React, { useEffect, useState } from 'react';
import { TriangleAlert, Info, CircleCheck } from 'lucide-react';
import { useConfirmStore, ConfirmRequest, ConfirmTone } from '../../lib/confirm';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

const TONE: Record<ConfirmTone, { icon: IconCmp; accent: string; chip: string; btn: string }> = {
  danger:  { icon: TriangleAlert, accent: 'text-rose-400',    chip: 'bg-rose-500/15',    btn: 'bg-rose-600 hover:bg-rose-500' },
  warning: { icon: TriangleAlert, accent: 'text-amber-400',   chip: 'bg-amber-500/15',   btn: 'bg-amber-600 hover:bg-amber-500' },
  info:    { icon: Info,          accent: 'text-sky-400',     chip: 'bg-sky-500/15',     btn: 'bg-brand-600 hover:bg-brand-500' },
  success: { icon: CircleCheck,   accent: 'text-emerald-400', chip: 'bg-emerald-500/15', btn: 'bg-emerald-600 hover:bg-emerald-500' },
};

/** Renders the active confirm request as a themed bottom-sheet. Mount once at root. */
export const ConfirmHost = () => {
  const current = useConfirmStore((s) => s.current);
  const resolve = useConfirmStore((s) => s.resolve);
  // Keep a local copy so the sheet can animate out after the store clears.
  const [shown, setShown] = useState<ConfirmRequest | null>(current);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (current) { setShown(current); setLeaving(false); }
    else if (shown) { setLeaving(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Esc cancels (never confirm-on-Enter — too easy to delete by accident).
  useEffect(() => {
    if (!shown || leaving) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') resolve(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, leaving, resolve]);

  if (!shown) return null;
  const tone = TONE[shown.tone ?? 'warning'];
  const Icon = tone.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" dir="rtl">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${leaving ? 'lm-backdrop-out' : 'lm-backdrop-in'}`}
        onClick={() => resolve(false)}
      />
      <div
        onAnimationEnd={() => { if (leaving) { setShown(null); setLeaving(false); } }}
        className={`relative w-full sm:max-w-md bg-slate-900 ring-1 ring-white/10 shadow-2xl rounded-t-3xl sm:rounded-3xl px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-5 ${leaving ? 'lm-sheet-out' : 'lm-sheet-in'}`}
      >
        <div className="flex items-start gap-3.5">
          <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${tone.chip}`}>
            <Icon size={22} className={tone.accent} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-slate-100 font-bold text-base">{shown.title ?? 'تایید عملیات'}</h3>
            <p className="mt-1.5 text-sm text-slate-300 leading-7 break-words">{shown.message}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => resolve(false)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] ring-1 ring-white/10 text-slate-200 text-sm font-medium hover:bg-white/10 transition"
          >
            {shown.cancelText ?? 'لغو'}
          </button>
          <button
            type="button"
            onClick={() => resolve(true)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition ${tone.btn}`}
          >
            {shown.confirmText ?? 'تایید'}
          </button>
        </div>
      </div>
    </div>
  );
};
