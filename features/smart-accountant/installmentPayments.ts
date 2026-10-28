import type { InstallmentPayment, InstallmentReceipt } from "./types";

export function paymentTotals(payment: InstallmentPayment) {
  const total = payment.amount + (payment.penalty || 0);
  const paid = payment.receipts?.length
    ? payment.receipts
        .filter((r) => !r.voidedAt)
        .reduce((sum, r) => sum + r.amount, 0)
    : payment.isPaid
      ? total
      : 0;
  return {
    total,
    paid,
    remaining: Math.max(0, total - paid),
    settled: paid >= total,
  };
}
export function paymentCashFlow(
  payment: InstallmentPayment,
): InstallmentReceipt[] {
  if (payment.receipts?.length)
    return payment.receipts.filter((r) => !r.voidedAt);
  return payment.isPaid && payment.paidDate
    ? [
        {
          id: `legacy-${payment.id}`,
          amount: paymentTotals(payment).total,
          paidAt: payment.paidDate,
        },
      ]
    : [];
}
export function validateReceipt(
  receipt: InstallmentReceipt,
  remaining: number,
): string | null {
  if (!Number.isSafeInteger(receipt.amount) || receipt.amount <= 0)
    return "مبلغ صحیح و بیشتر از صفر وارد کنید.";
  if (receipt.amount > remaining)
    return "مبلغ این پرداخت از ماندهٔ قسط بیشتر است.";
  if (!Number.isFinite(Date.parse(receipt.paidAt)))
    return "تاریخ و ساعت معتبر پرداخت را وارد کنید.";
  return null;
}
