import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  FilePlus2,
  HandCoins,
  Scale,
} from "lucide-react";
import { amount, toman } from "./domain";
import type { LedgerEntry } from "./types";

const styles = {
  receipt: {
    label: "دریافت از مشتری",
    effect: "ورود وجه؛ کاهش طلب من یا افزایش اعتبار مشتری",
    text: "text-green-300",
    badge: "bg-green-950/50 border-green-800",
    border: "border-r-green-400",
    Icon: ArrowDownLeft,
  },
  expense: {
    label: "هزینه برای مشتری",
    effect: "خروج وجه برای مشتری؛ افزایش طلب من",
    text: "text-red-300",
    badge: "bg-red-950/50 border-red-800",
    border: "border-r-red-400",
    Icon: ArrowUpRight,
  },
  payment: {
    label: "پرداخت به مشتری",
    effect: "خروج وجه؛ کاهش بدهی من یا افزایش طلب من",
    text: "text-red-300",
    badge: "bg-red-950/50 border-red-800",
    border: "border-r-red-400",
    Icon: ArrowUpRight,
  },
  charge: {
    label: "طلب از مشتری",
    effect: "افزایش طلب من؛ بدون جابه‌جایی وجه",
    text: "text-blue-300",
    badge: "bg-blue-950/50 border-blue-800",
    border: "border-r-blue-400",
    Icon: FilePlus2,
  },
  owe: {
    label: "بدهی من به مشتری",
    effect: "کاهش طلب من یا افزایش بدهی من؛ بدون جابه‌جایی وجه",
    text: "text-amber-300",
    badge: "bg-amber-950/50 border-amber-800",
    border: "border-r-amber-400",
    Icon: HandCoins,
  },
  opening: {
    label: "ماندهٔ اول دوره",
    effect: "",
    text: "text-violet-300",
    badge: "bg-violet-950/50 border-violet-800",
    border: "border-r-violet-400",
    Icon: Scale,
  },
  voided: {
    label: "باطل‌شده",
    effect: "در محاسبهٔ مانده اثر ندارد",
    text: "text-slate-400",
    badge: "bg-slate-800/50 border-slate-600",
    border: "border-r-slate-500",
    Icon: Ban,
  },
};

export function ledgerStyle(entry: LedgerEntry) {
  if (entry.voided) return styles.voided;
  if (entry.type === "opening") {
    const payable = entry.openingDirection === "payable";
    return {
      ...styles.opening,
      label: `ماندهٔ اول دوره · ${payable ? "بدهی من" : "طلب من"}`,
      effect: "ماندهٔ اولیه؛ بدون جابه‌جایی وجه",
    };
  }
  return styles[entry.type];
}

export function balanceColor(value: bigint): string {
  return value > 0n
    ? "text-blue-300"
    : value < 0n
      ? "text-amber-300"
      : "text-slate-300";
}

export function LedgerStatus({ entry }: { entry: LedgerEntry }) {
  const { label, effect, text, badge, Icon } = ledgerStyle(entry);
  return (
    <div className="space-y-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${text} ${badge}`}
      >
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <p className="text-xs text-slate-300">{effect}</p>
    </div>
  );
}

export function LedgerAmount({ entry }: { entry: LedgerEntry }) {
  return (
    <span
      className={`shrink-0 font-semibold ${ledgerStyle(entry).text} ${entry.voided ? "line-through" : ""}`}
    >
      {toman(amount(entry.amount))}
    </span>
  );
}

export function FinanceLegend() {
  return (
    <div
      aria-label="راهنمای رنگ‌های مالی"
      className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-slate-700 p-3 text-xs"
    >
      <span className="text-green-300">سبز: دریافت وجه</span>
      <span className="text-red-300">قرمز: پرداخت وجه</span>
      <span className="text-blue-300">آبی: طلب من</span>
      <span className="text-amber-300">کهربایی: بدهی من</span>
      <span className="text-violet-300">بنفش: ماندهٔ اولیه</span>
      <span className="text-slate-400">خاکستری: باطل‌شده</span>
    </div>
  );
}
