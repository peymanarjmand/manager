import React, { useId, useRef, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, X, ExternalLink } from "lucide-react";
import moment from "jalali-moment";
import { copyValue } from "./clipboard";
import { jalaliToDate } from "../customers/domain";

export const inputClass =
  "w-full rounded-xl bg-slate-950/60 border border-slate-600 px-3 py-2.5 text-white outline-none focus:border-teal-400 min-w-0";
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-3 py-2.5 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm";
export const primaryClass = `${buttonClass} bg-teal-700 border-teal-600 hover:bg-teal-600`;
export function ErrorText({ children }: { children?: React.ReactNode }) {
  return children ? (
    <p
      role="alert"
      className="rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200"
    >
      {children}
    </p>
  ) : null;
}
export function CopyButton({
  value,
  secret = false,
}: {
  value?: string;
  secret?: boolean;
}) {
  return (
    <button
      type="button"
      className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-25 shrink-0"
      disabled={!value}
      aria-label="کپی مقدار"
      onClick={() => void copyValue(value!, secret)}
    >
      <Copy size={17} />
    </button>
  );
}
export function Field({
  label,
  value = "",
  onChange,
  secret = false,
  multiline = false,
  type = "text",
  required = false,
  dir = "auto",
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  secret?: boolean;
  multiline?: boolean;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl" | "auto";
}) {
  const id = useId(),
    [show, setShow] = useState(false);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm text-slate-300 mb-1.5">
        {label}
        {required && " *"}
      </label>
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          {multiline && (!secret || show) ? (
            <textarea
              id={id}
              dir={dir}
              className={inputClass}
              rows={3}
              value={value}
              readOnly={!onChange}
              onChange={(e) => onChange?.(e.target.value)}
              required={required}
              autoComplete="off"
              spellCheck={false}
            />
          ) : (
            <input
              id={id}
              dir={dir}
              className={inputClass}
              value={value}
              readOnly={!onChange || (secret && multiline && !show)}
              onChange={(e) => onChange?.(e.target.value)}
              type={secret && !show ? "password" : type}
              required={required}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>
        {secret && (
          <button
            type="button"
            className="p-2 mt-1"
            aria-label={show ? "پنهان کردن" : "نمایش مقدار"}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {!onChange && !secret && /^https?:\/\/\S+$/.test(value) && (
          <a
            className="p-2 mt-1"
            aria-label="باز کردن پیوند"
            href={value}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={17} />
          </a>
        )}
        <CopyButton value={value} secret={secret} />
      </div>
      {onChange && secret && multiline && !show && (
        <p className="text-xs text-slate-400 mt-1">
          برای واردکردن یا ویرایش متن چندخطی، نمایش را بزنید.
        </p>
      )}
    </div>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function DateField({
  label,
  value = "",
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  // Convert the saved date once. While typing, the parent can contain the
  // "invalid" marker, which must never be passed back to the date formatter.
  const [draft, setDraft] = useState(() => {
    if (!value || value === "invalid") return "";
    try {
      const date = moment(value, "YYYY-MM-DD", true);
      return date.isValid() ? date.format("jYYYY/jMM/jDD") : value;
    } catch {
      return value;
    }
  });
  const invalid = !!draft && !jalaliToDate(draft);
  return (
    <div>
      <Field
        label={`${label} (شمسی، مانند ۱۳۷۰/۰۱/۱۵)`}
        value={draft}
        onChange={(text) => {
          setDraft(text);
          onChange(text ? jalaliToDate(text) || "invalid" : "");
        }}
        dir="ltr"
      />
      {invalid && (
        <p className="text-rose-300 text-xs">تاریخ معتبر وارد کنید.</p>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="bg-slate-900 text-white rounded-2xl p-0 w-[calc(100%-1rem)] max-w-3xl max-h-[92dvh] backdrop:bg-black/80"
      dir="rtl"
    >
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
        <h2 id={id} className="font-bold text-lg">
          {title}
        </h2>
        <button
          type="button"
          className={buttonClass}
          aria-label="بستن"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </dialog>
  );
}
