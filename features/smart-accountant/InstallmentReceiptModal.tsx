import React, { useState } from "react";
import {
  Modal,
  Field,
  DateField,
  Select,
  ErrorText,
  primaryClass,
  buttonClass,
} from "../vault/ui";
import {
  localTehranInput,
  tehranLocalToIso,
  tehranDateTime,
} from "../customers/domain";
import { formatCurrency } from "./SmartAccountantShared";
import { paymentTotals } from "./installmentPayments";
import { useAccountantStore } from "./store";
import type { InstallmentPayment, InstallmentReceipt } from "./types";

export function InstallmentReceiptModal({
  planId,
  payment,
  onClose,
}: {
  planId: string;
  payment: InstallmentPayment;
  onClose: () => void;
}) {
  const totals = paymentTotals(payment);
  const [draft, setDraft] = useState(() => ({
    id: crypto.randomUUID(),
    amount: "",
    method: "انتقال بانکی",
    reference: "",
    note: "",
    ...localTehranInput(new Date().toISOString()),
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: keyof typeof draft, value: string) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const paidAt = tehranLocalToIso(draft.date, draft.time);
    if (!paidAt) {
      setError("تاریخ و ساعت معتبر پرداخت وارد کنید.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const receipt: InstallmentReceipt = {
        id: draft.id,
        amount: Number(draft.amount),
        paidAt,
        method: draft.method,
        reference: draft.reference,
        note: draft.note,
      };
      await useAccountantStore
        .getState()
        .recordReceipt(planId, payment.id, receipt);
      setDraft((s) => ({
        ...s,
        id: crypto.randomUUID(),
        amount: "",
        reference: "",
        note: "",
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const voidReceipt = async (receipt: InstallmentReceipt) => {
    if (
      !window.confirm(
        "این پرداخت با حفظ سابقه باطل شود؟ ماندهٔ قسط دوباره محاسبه می‌شود.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await useAccountantStore
        .getState()
        .voidReceipt(planId, payment.id, receipt.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="پرداخت مرحله‌ای قسط"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 p-4 text-sm">
          <p className="text-slate-300">
            پرداخت‌شده{" "}
            <strong className="block mt-1 text-emerald-300">
              {formatCurrency(totals.paid)}
            </strong>
          </p>
          <p className="text-slate-300">
            ماندهٔ قسط{" "}
            <strong className="block mt-1 text-rose-300">
              {formatCurrency(totals.remaining)}
            </strong>
          </p>
        </div>
        <ErrorText>{error}</ErrorText>
        {!totals.settled ? (
          <form onSubmit={save} className="space-y-4">
            <Field
              label="مبلغ این مرحله (تومان)"
              money
              required
              value={draft.amount}
              onChange={(v) => set("amount", v)}
            />
            <button
              type="button"
              disabled={busy}
              className={buttonClass}
              onClick={() => set("amount", String(totals.remaining))}
            >
              کل مانده: {formatCurrency(totals.remaining)}
            </button>
            <div className="grid sm:grid-cols-2 gap-3">
              <DateField
                label="تاریخ پرداخت"
                value={draft.date}
                onChange={(v) => set("date", v)}
              />
              <Field
                label="ساعت پرداخت (۲۴ساعته)"
                type="time"
                required
                value={draft.time}
                onChange={(v) => set("time", v)}
              />
            </div>
            <Select
              label="روش پرداخت"
              value={draft.method}
              onChange={(v) => set("method", v)}
              options={[
                "انتقال بانکی",
                "کارت‌به‌کارت",
                "نقد",
                "چک",
                "درگاه",
                "سایر",
              ].map((v) => ({ value: v, label: v }))}
            />
            <Field
              label="شماره پیگیری پرداخت"
              value={draft.reference}
              onChange={(v) => set("reference", v)}
            />
            <Field
              label="یادداشت پرداخت"
              multiline
              value={draft.note}
              onChange={(v) => set("note", v)}
            />
            <button disabled={busy} className={primaryClass}>
              {busy ? "در حال تأیید…" : "ثبت پرداخت مرحله"}
            </button>
          </form>
        ) : (
          <p
            role="status"
            className="rounded-xl bg-emerald-950/50 p-4 text-emerald-300"
          >
            این قسط کامل تسویه شده است.
          </p>
        )}
        <div className="space-y-3 border-t border-slate-700 pt-4">
          <h3 className="font-bold">تاریخچهٔ پرداخت‌ها</h3>
          {!payment.receipts?.length && (
            <p className="text-sm text-slate-400">
              {payment.isPaid
                ? `پرداخت کامل قبلی${payment.paidDate ? ` · ${tehranDateTime(payment.paidDate)}` : ""}`
                : "هنوز پرداختی ثبت نشده است."}
            </p>
          )}
          {payment.receipts?.map((receipt, index) => (
            <div
              key={receipt.id}
              className="rounded-xl border border-slate-700 p-3 space-y-2"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span>مرحلهٔ {(index + 1).toLocaleString("fa-IR")}</span>
                <strong
                  className={
                    receipt.voidedAt
                      ? "text-slate-500 line-through"
                      : "text-emerald-300"
                  }
                >
                  {formatCurrency(receipt.amount)}
                </strong>
              </div>
              <p className="text-xs text-slate-300">
                {tehranDateTime(receipt.paidAt)} · {receipt.method}
              </p>
              {receipt.reference && (
                <Field label="شماره پیگیری" value={receipt.reference} />
              )}
              {receipt.note && (
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {receipt.note}
                </p>
              )}
              {receipt.voidedAt ? (
                <p className="text-xs text-slate-400">
                  باطل‌شده · {tehranDateTime(receipt.voidedAt)}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className={`${buttonClass} text-rose-300`}
                  onClick={() => void voidReceipt(receipt)}
                >
                  ابطال مرحلهٔ {(index + 1).toLocaleString("fa-IR")}
                </button>
              )}
            </div>
          ))}
        </div>
        {!payment.receipts?.length && payment.isPaid && (
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              useAccountantStore.getState().togglePaidStatus(planId, payment.id)
            }
          >
            بازگرداندن پرداخت قبلی به پرداخت‌نشده
          </button>
        )}
      </div>
    </Modal>
  );
}
