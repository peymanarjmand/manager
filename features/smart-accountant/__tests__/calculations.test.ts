import { describe, it, expect } from 'vitest';
import moment from 'jalali-moment';
import {
  computeTomanReceivablesPayables,
  computeAssetsValue,
  computeNetWorth,
  computeMonthInstallmentTotals,
  computeSimpleAPR,
} from '../calculations';

const jISO = (jy: number, jm: number, jd: number): string =>
  moment(`${jy}/${jm}/${jd}`, 'jYYYY/jM/jD').toISOString();

describe('computeTomanReceivablesPayables', () => {
  it('nets debt minus credit per person, toman only, ignoring settled & non-toman', () => {
    const ledger = {
      p1: [
        { id: 'a', personId: 'p1', type: 'debt', amount: 1000, unit: 'toman', isSettled: false, description: '', date: '' },
        { id: 'b', personId: 'p1', type: 'credit', amount: 300, unit: 'toman', isSettled: false, description: '', date: '' },
      ],
      p2: [
        { id: 'c', personId: 'p2', type: 'credit', amount: 500, unit: 'toman', isSettled: false, description: '', date: '' },
      ],
      p3: [
        { id: 'd', personId: 'p3', type: 'debt', amount: 999, unit: 'toman', isSettled: true, description: '', date: '' },
        { id: 'e', personId: 'p3', type: 'debt', amount: 200, unit: 'gold_mg', isSettled: false, description: '', date: '' },
      ],
    } as never;
    const r = computeTomanReceivablesPayables(ledger);
    expect(r.totalDebt).toBe(700);
    expect(r.totalCredit).toBe(500);
  });

  it('returns zeros for empty/undefined input', () => {
    expect(computeTomanReceivablesPayables(undefined)).toEqual({ totalDebt: 0, totalCredit: 0 });
    expect(computeTomanReceivablesPayables({})).toEqual({ totalDebt: 0, totalCredit: 0 });
  });
});

describe('computeAssetsValue & computeNetWorth', () => {
  it('multiplies value by quantity (default 1)', () => {
    expect(computeAssetsValue([{ currentValue: 100, quantity: 3 }, { currentValue: 50 }] as never)).toBe(350);
  });
  it('net worth = assets + receivables - payables', () => {
    expect(computeNetWorth(1000, { totalDebt: 200, totalCredit: 50 })).toBe(1150);
  });
});

describe('computeSimpleAPR', () => {
  it('returns null when loan is invalid or there are no payments', () => {
    expect(computeSimpleAPR(0, [{ amount: 1 }])).toBeNull();
    expect(computeSimpleAPR(1000, [])).toBeNull();
  });
  it('returns 0 when total payments do not exceed the loan', () => {
    const pays = Array.from({ length: 12 }, () => ({ amount: 100 }));
    expect(computeSimpleAPR(1200, pays)).toBe(0);
  });
  it('computes simple annual rate on the original principal', () => {
    const pays = Array.from({ length: 12 }, () => ({ amount: 100 }));
    // total 1200, interest 200, term 1y => 200 / (1000 * 1) = 20%
    expect(computeSimpleAPR(1000, pays)).toBeCloseTo(20, 6);
  });
});

describe('computeMonthInstallmentTotals', () => {
  it('sums amount+penalty for payments due in the given Jalali month', () => {
    const plans = [
      {
        id: 'pl',
        title: 't',
        loanAmount: 0,
        payments: [
          { id: '1', dueDate: jISO(1405, 3, 10), amount: 1000, penalty: 50, isPaid: true },
          { id: '2', dueDate: jISO(1405, 3, 20), amount: 2000, penalty: 0, isPaid: false },
          { id: '3', dueDate: jISO(1405, 4, 5), amount: 9999, penalty: 0, isPaid: false },
        ],
      },
    ] as never;
    const r = computeMonthInstallmentTotals(plans, 1405, 3);
    expect(r.totalAmount).toBe(3050);
    expect(r.paidAmount).toBe(1050);
    expect(r.unpaidAmount).toBe(2000);
    expect(r.hasInstallments).toBe(true);
    expect(r.progress).toBeCloseTo((1050 / 3050) * 100, 6);
  });

  it('reports no installments for a month with none', () => {
    const r = computeMonthInstallmentTotals([], 1405, 1);
    expect(r).toEqual({ totalAmount: 0, paidAmount: 0, unpaidAmount: 0, progress: 0, hasInstallments: false });
  });
});
