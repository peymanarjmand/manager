import { describe, expect, it } from "vitest";
import {
  paymentTotals,
  paymentCashFlow,
  validateReceipt,
} from "../installmentPayments";
import { computeMonthInstallmentTotals } from "../calculations";
import { mapPaymentRow, paymentToRow } from "../data";
import type { InstallmentPayment, InstallmentReceipt } from "../types";
const payment: InstallmentPayment = {
  id: "payment",
  amount: 20000000,
  dueDate: "2026-10-28T10:00:00Z",
  isPaid: false,
};
const receipt = (
  amount: number,
  paidAt = "2026-10-28T10:00:00Z",
): InstallmentReceipt => ({ id: crypto.randomUUID(), amount, paidAt });
describe("partial installment payments", () => {
  it("settles a 20 million installment over five independently dated transfers", () => {
    const p = { ...payment, receipts: [] as InstallmentReceipt[] };
    for (const n of [5000000, 2000000, 4000000, 3000000])
      p.receipts.push(receipt(n));
    expect(paymentTotals(p)).toEqual({
      total: 20000000,
      paid: 14000000,
      remaining: 6000000,
      settled: false,
    });
    p.receipts.push(receipt(6000000));
    expect(paymentTotals(p).settled).toBe(true);
    expect(
      computeMonthInstallmentTotals(
        [{ id: "plan", title: "وام", payments: [p] }],
        1405,
        8,
      ).unpaidAmount,
    ).toBe(0);
    expect(mapPaymentRow(paymentToRow(p, "plan"))).toMatchObject({
      receipts: p.receipts,
    });
  });
  it("has no application limit on payment count and includes penalties", () => {
    const p = {
      ...payment,
      penalty: 1000,
      receipts: Array.from({ length: 1500 }, () => receipt(1000)),
    };
    expect(paymentTotals(p)).toMatchObject({
      total: 20001000,
      paid: 1500000,
      remaining: 18501000,
    });
  });
  it("preserves legacy paid amounts and excludes voided records from balances and cash flow", () => {
    expect(paymentTotals({ ...payment, isPaid: true, penalty: 500 }).paid).toBe(
      20000500,
    );
    const p = {
      ...payment,
      receipts: [
        { ...receipt(5000000), voidedAt: "2026-10-29T10:00:00Z" },
        receipt(2000000),
      ],
    };
    expect(paymentTotals(p).remaining).toBe(18000000);
    expect(paymentCashFlow(p)).toHaveLength(1);
    expect(
      paymentCashFlow({
        ...payment,
        isPaid: true,
        paidDate: payment.dueDate,
      })[0].amount,
    ).toBe(20000000);
  });
  it("rejects overpayments, unsafe or fractional amounts, and invalid timestamps", () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 21000000])
      expect(validateReceipt(receipt(value), 20000000)).toBeTruthy();
    expect(validateReceipt(receipt(5000000), 20000000)).toBeNull();
    expect(validateReceipt(receipt(1, "invalid"), 20000000)).toBeTruthy();
  });
});
