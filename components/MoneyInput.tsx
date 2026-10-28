import React, { useLayoutEffect, useRef, useState } from "react";
import { groupMoney, normalizeMoney } from "../lib/money";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "type"
> & {
  value?: string | number;
  type?: string;
};

/** Displays grouping while change handlers receive an ungrouped value snapshot. */
export function MoneyInput({
  value,
  onChange,
  onKeyDown,
  type: _type,
  ...props
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => groupMoney(value));
  const lastValue = useRef(value);
  const selection = useRef<number | null>(null);
  const rawRef = useRef(normalizeMoney(draft) || "");
  if (lastValue.current !== value) {
    lastValue.current = value;
    const raw = normalizeMoney(String(value ?? ""));
    // Numeric callers may round-trip 12.00 as 12; keep the user's decimal draft.
    const equivalent =
      raw === rawRef.current ||
      (typeof value === "number" &&
        ((raw !== "" &&
          rawRef.current !== "" &&
          Number(raw) === Number(rawRef.current)) ||
          (Number.isNaN(value) && ["-", ".", "-."].includes(rawRef.current))));
    if (!equivalent) {
      const next = groupMoney(value);
      rawRef.current = normalizeMoney(next) || "";
      if (next !== draft) setDraft(next);
    }
  }
  useLayoutEffect(() => {
    const n = Number(rawRef.current);
    const tooSmall =
      props.min !== undefined && rawRef.current !== "" && n < Number(props.min);
    const tooLarge =
      props.max !== undefined && rawRef.current !== "" && n > Number(props.max);
    const step = Number(props.step ?? 1);
    const steps = (n - Number(props.min ?? 0)) / step;
    const offStep =
      _type === "number" &&
      props.step !== "any" &&
      rawRef.current !== "" &&
      Number.isFinite(steps) &&
      Math.abs(steps - Math.round(steps)) > 1e-8;
    ref.current?.setCustomValidity(
      tooSmall
        ? `مبلغ باید حداقل ${groupMoney(props.min)} باشد.`
        : tooLarge
          ? `مبلغ باید حداکثر ${groupMoney(props.max)} باشد.`
          : offStep
            ? "تعداد رقم‌های اعشار مبلغ معتبر نیست."
            : "",
    );
    if (selection.current !== null && document.activeElement === ref.current) {
      ref.current?.setSelectionRange(selection.current, selection.current);
      selection.current = null;
    }
  });
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const raw = normalizeMoney(text);
    if (raw === null) {
      e.target.value = draft;
      return;
    }
    const before =
      normalizeMoney(text.slice(0, e.target.selectionStart ?? text.length)) ||
      "";
    const formatted = groupMoney(raw);
    let count = 0,
      caret = 0;
    while (caret < formatted.length && count < before.length) {
      if (formatted[caret] !== ",") count++;
      caret++;
    }
    selection.current = caret;
    rawRef.current = raw;
    setDraft(formatted);
    // Snapshot the raw value so deferred React state updaters cannot read commas.
    const target = new Proxy(e.target, {
      get(element, key) {
        if (key === "value") return raw;
        if (key === "valueAsNumber") return raw === "" ? NaN : Number(raw);
        const result = Reflect.get(element, key, element);
        return typeof result === "function" ? result.bind(element) : result;
      },
    });
    const event = Object.create(e);
    Object.defineProperties(event, {
      target: { value: target },
      currentTarget: { value: target },
    });
    onChange?.(event);
  };
  return (
    <input
      {...props}
      className={
        props.className ||
        "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-slate-100 outline-none focus:border-brand-500"
      }
      ref={ref}
      type="text"
      inputMode="decimal"
      dir="ltr"
      value={draft}
      onChange={change}
      autoComplete="off"
      pattern="-?[0-9,]+([.][0-9]+)?"
      onKeyDown={(e) => {
        onKeyDown?.(e);
        const input = e.currentTarget;
        const caret = input.selectionStart ?? 0;
        if (!e.defaultPrevented && input.selectionEnd === caret) {
          if (e.key === "Backspace" && input.value[caret - 1] === ",")
            input.setSelectionRange(caret - 1, caret - 1);
          if (e.key === "Delete" && input.value[caret] === ",")
            input.setSelectionRange(caret + 1, caret + 1);
        }
      }}
    />
  );
}
