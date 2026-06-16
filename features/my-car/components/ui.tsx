import React, { useEffect, useState } from 'react';
import { X, FileText, Paperclip } from 'lucide-react';
import { useImageUrl } from './VehicleImagePreview';
import JalaliDatePicker from '../../assets/components/JalaliDatePicker';
import { fileToImageRef } from '../shared';
import { toast } from '../../../lib/toast';

/**
 * Shared UI primitives for the My-Car feature.
 *
 * `Sheet` is a themed bottom-sheet that mirrors the app's ConfirmHost look
 * (rounded-t-3xl, slate-900, brand-tinted icon chip) and reuses the global
 * `lm-sheet-*` / `lm-backdrop-*` animations defined in index.css. Forms render
 * inside the scrollable body and submit via a footer button using the native
 * `form="<id>"` association, so the footer can stay pinned while the body scrolls.
 */

export const inputClass =
  'w-full bg-slate-950/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40 transition';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the desktop (centered) layout. */
  maxWidth?: string;
}

/** Themed bottom-sheet (mobile) / centered dialog (desktop ≥sm). Mount conditionally via `open`. */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'sm:max-w-lg',
}) => {
  // Keep a local copy so the sheet can animate out after `open` flips to false.
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
    } else if (shown) {
      setLeaving(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!shown || leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, leaving, onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${leaving ? 'lm-backdrop-out' : 'lm-backdrop-in'}`}
        onClick={onClose}
      />
      <div
        onAnimationEnd={() => {
          if (leaving) {
            setShown(false);
            setLeaving(false);
          }
        }}
        className={`relative w-full ${maxWidth} max-h-[92vh] flex flex-col bg-slate-900 ring-1 ring-white/10 shadow-2xl rounded-t-3xl sm:rounded-3xl ${leaving ? 'lm-sheet-out' : 'lm-sheet-in'}`}
      >
        {(title || icon) && (
          <div className="flex items-start gap-3 px-5 pt-5 pb-3.5 border-b border-white/10">
            {icon && (
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              {title && <h3 className="text-slate-100 font-bold text-base">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-slate-400 leading-6">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="shrink-0 p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-5 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/** Cancel + submit row for a Sheet footer. The submit button targets `formId`. */
export const SheetActions: React.FC<{
  formId: string;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
}> = ({ formId, onCancel, submitLabel, cancelLabel = 'انصراف' }) => (
  <div className="flex items-center gap-2.5">
    <button
      type="button"
      onClick={onCancel}
      className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] ring-1 ring-white/10 text-slate-200 text-sm font-medium hover:bg-white/10 transition"
    >
      {cancelLabel}
    </button>
    <button
      type="submit"
      form={formId}
      className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold bg-brand-600 hover:bg-brand-500 transition"
    >
      {submitLabel}
    </button>
  </div>
);

/** Labeled field wrapper. */
export const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, required, className = '', children }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">
      {label}
      {required && <span className="text-brand-300 mr-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500 leading-5">{hint}</p>}
  </div>
);

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => <input {...props} className={`${inputClass} ${className}`} />;

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  rows = 3,
  ...props
}) => <textarea rows={rows} {...props} className={`${inputClass} resize-none ${className}`} />;

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select {...props} className={`${inputClass} ${className}`}>
    {children}
  </select>
);

/** Selectable pill/chip (service items, categories, filter presets). */
export const Chip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'brand' | 'emerald';
}> = ({ active, onClick, children, tone = 'brand' }) => {
  const activeCls =
    tone === 'emerald'
      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
      : 'border-brand-400/60 bg-brand-500/15 text-brand-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
        active ? activeCls : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  );
};

/** Small empty-state used inside tabs. */
export const EmptyState: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] py-10 px-4 text-center">
    {icon && <div className="text-slate-600">{icon}</div>}
    <p className="text-sm text-slate-400 max-w-xs leading-7">{children}</p>
  </div>
);

/** Jalali (3-select) date field with a label. */
export const DateField: React.FC<{
  label: string;
  id: string;
  value?: string;
  onChange: (iso: string) => void;
  required?: boolean;
}> = ({ label, id, value, onChange, required }) => (
  <Field label={label} required={required}>
    <JalaliDatePicker id={id} value={value || new Date().toISOString()} onChange={onChange} />
  </Field>
);

/** File picker that uploads to storage and returns the resulting ref. */
export const AttachmentField: React.FC<{
  label: string;
  value?: string;
  onChange: (ref: string) => void;
  accept?: string;
}> = ({ label, value, onChange, accept = 'image/*,application/pdf' }) => {
  const [busy, setBusy] = useState(false);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-white/[0.05] ring-1 ring-white/10 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-white/10 transition">
          <Paperclip size={15} />
          <span>{busy ? 'در حال بارگذاری…' : value ? 'تغییر فایل' : 'انتخاب فایل'}</span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const ref = await fileToImageRef(file);
                onChange(ref);
              } catch {
                toast.error('بارگذاری فایل ناموفق بود.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value && <DocumentLink documentRef={value} label="مشاهده فایل" />}
      </div>
    </Field>
  );
};

/** Link that opens a stored attachment (image or PDF) in a new tab. */
export const DocumentLink: React.FC<{ documentRef?: string; label?: string }> = ({
  documentRef,
  label = 'مشاهده فایل',
}) => {
  const url = useImageUrl(documentRef);
  if (!documentRef) return null;
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition ${
        url ? 'text-brand-300 hover:text-brand-200' : 'text-slate-500 cursor-wait'
      }`}
    >
      <FileText size={14} />
      <span>{url ? label : 'در حال آماده‌سازی…'}</span>
    </a>
  );
};

/** Round icon action button (edit / delete on cards). */
export const IconButton: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  label: string;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}> = ({ onClick, label, tone = 'default', children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`p-2 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] transition hover:bg-white/10 ${
      tone === 'danger' ? 'text-rose-300 hover:text-rose-200' : 'text-slate-300 hover:text-brand-200'
    }`}
  >
    {children}
  </button>
);
