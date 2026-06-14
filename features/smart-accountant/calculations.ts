import moment from 'jalali-moment';
import { Asset, InstallmentPayment, InstallmentPlan, LedgerEntry } from './types';

/**
 * Pure money-math helpers for the Smart Accountant.
 *
 * These mirror the CURRENT in-component formulas EXACTLY (characterization), so
 * that when the views are refactored to consume this module (a later phase),
 * the accompanying tests guarantee the displayed numbers do not change.
 *
 * NOTE: where the current behavior is a known simplification (e.g. APR is a
 * simple annual rate, and non-toman ledger units are excluded from toman totals)
 * that behavior is preserved here intentionally; any change is a deliberate,
 * separately-reviewed decision.
 */

export interface TomanBalances {
  /** Net amount others owe you (receivables), toman only. */
  totalDebt: number;
  /** Net amount you owe others (payables), toman only. */
  totalCredit: number;
}

/**
 * Net receivables/payables in TOMAN, per person, ignoring settled rows and any
 * non-toman unit. Mirrors SummaryView's totalDebt/totalCredit computation.
 */
export function computeTomanReceivablesPayables(
  ledger: Record<string, LedgerEntry[]> | undefined,
): TomanBalances {
  let receivables = 0;
  let payables = 0;
  Object.values(ledger || {}).forEach((entries) => {
    const net = (entries || []).reduce((acc, entry) => {
      if (entry.isSettled) return acc;
      const unit = (entry as { unit?: string }).unit || 'toman';
      if (unit !== 'toman') return acc;
      return entry.type === 'debt' ? acc + entry.amount : acc - entry.amount;
    }, 0);
    if (net > 0) receivables += net;
    else if (net < 0) payables += Math.abs(net);
  });
  return { totalDebt: receivables, totalCredit: payables };
}

/** Sum of asset value * quantity (quantity defaults to 1). Mirrors SummaryView.totalAssets. */
export function computeAssetsValue(
  assets: Pick<Asset, 'currentValue' | 'quantity'>[] | undefined,
): number {
  return (assets || []).reduce((sum, a) => sum + a.currentValue * (a.quantity || 1), 0);
}

/** Net worth = assets + receivables - payables. Mirrors SummaryView.netWorth. */
export function computeNetWorth(totalAssets: number, balances: TomanBalances): number {
  return totalAssets + balances.totalDebt - balances.totalCredit;
}

export interface MonthInstallmentTotals {
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  progress: number;
  hasInstallments: boolean;
}

/**
 * Totals (amount + penalty) for installment payments whose due date falls in a
 * given Jalali year/month (jMonth is 1-12). Mirrors SummaryView.monthlyInstallments.
 */
export function computeMonthInstallmentTotals(
  plans: InstallmentPlan[] | undefined,
  jYear: number,
  jMonth: number,
): MonthInstallmentTotals {
  const all = (plans || [])
    .flatMap((p) => p.payments || [])
    .filter((p) => {
      const d = moment(p.dueDate);
      return d.jYear() === jYear && d.jMonth() + 1 === jMonth;
    });
  const totalAmount = all.reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
  const paidAmount = all
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  return { totalAmount, paidAmount, unpaidAmount, progress, hasInstallments: all.length > 0 };
}

/**
 * Simple annual interest rate on the original principal, as a percent.
 * Mirrors InstallmentsView.calculateAPR exactly (returns null when not computable,
 * 0 when there is no positive interest).
 */
export function computeSimpleAPR(
  loanAmount: number,
  payments: Pick<InstallmentPayment, 'amount'>[],
): number | null {
  if (!loanAmount || loanAmount <= 0 || payments.length === 0) return null;
  const totalPaymentsValue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInterest = totalPaymentsValue - loanAmount;
  if (totalInterest <= 0) return 0;
  const numberOfPayments = payments.length;
  const loanTermInYears = numberOfPayments / 12;
  if (loanTermInYears <= 0) return null;
  return (totalInterest / (loanAmount * loanTermInYears)) * 100;
}

export interface NextInstallment {
  planId: string;
  planTitle: string;
  amount: number;
  penalty: number;
  dueDate: string;
}

/** The earliest unpaid installment payment across all plans (by due date), or null. */
export function getNextUnpaidInstallment(plans: InstallmentPlan[] | undefined): NextInstallment | null {
  const all = (plans || []).flatMap((p) =>
    (p.payments || [])
      .filter((pay) => !pay.isPaid)
      .map((pay) => ({
        planId: p.id,
        planTitle: p.title,
        amount: pay.amount,
        penalty: pay.penalty || 0,
        dueDate: pay.dueDate,
      })),
  );
  all.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return all[0] || null;
}
