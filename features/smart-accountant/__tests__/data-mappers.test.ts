import { describe, it, expect } from 'vitest';
import {
    mapTransactionRow, transactionToRow,
    mapAssetRow, assetToRow,
    mapPersonRow, personToRow, mapLedgerRow, ledgerToRow,
    mapPaymentRow, planToRow, paymentToRow,
    mapCheckRow, checkToRow,
    mapDarfakRow, darfakToRow,
    mapSocialInsuranceRow, socialInsuranceToRow,
    mapFundRow, fundToRow,
} from '../data';
import { Transaction, Asset, Person, LedgerEntry, InstallmentPayment, Check, DarfakExpense, SocialInsurancePayment, MonthlyFund } from '../types';

// These guard the single source of truth for table<->domain mapping. A
// domain -> row -> domain round trip must preserve every field, so a future
// refactor that drifts a column name or a coercion is caught immediately.

describe('transactions mapper round-trip', () => {
    it('preserves all fields', () => {
        const t: Transaction = { id: 'a', type: 'expense', amount: 1500, description: 'خرید', category: 'Food', date: '2026-01-01', receiptImage: 'img:1' };
        expect(mapTransactionRow(transactionToRow(t))).toEqual(t);
    });
    it('maps an absent receipt to undefined', () => {
        const t: Transaction = { id: 'b', type: 'income', amount: 0, description: '', category: 'Salary', date: '2026-01-02' };
        expect(mapTransactionRow(transactionToRow(t)).receiptImage).toBeUndefined();
    });
});

describe('assets mapper round-trip', () => {
    it('preserves all fields', () => {
        const a: Asset = { id: 'a1', name: 'طلا', currentValue: 99, quantity: 2, purchaseDate: '2026-01-01', notes: 'n', ownerId: 'o1' };
        expect(mapAssetRow(assetToRow(a))).toEqual(a);
    });
});

describe('people & ledger mapper round-trip', () => {
    it('preserves a person', () => {
        const p: Person = { id: 'p1', name: 'علی', avatar: 'av:1' };
        expect(mapPersonRow(personToRow(p))).toEqual(p);
    });
    it('preserves a ledger entry and defaults unit to toman', () => {
        const e: LedgerEntry = { id: 'l1', personId: 'p1', type: 'debt', amount: 500, unit: 'toman', description: 'd', date: '2026-01-01', isSettled: false, receiptImage: 'r:1' };
        expect(mapLedgerRow(ledgerToRow(e))).toEqual(e);
        const noUnit = ledgerToRow({ ...e, unit: undefined as never });
        expect(mapLedgerRow(noUnit).unit).toBe('toman');
    });
});

describe('installments mapper round-trip', () => {
    it('preserves a payment', () => {
        const pay: InstallmentPayment = { id: 'pay1', dueDate: '2026-01-01', amount: 1000, isPaid: true, paidDate: '2026-01-01', penalty: 0 };
        expect(mapPaymentRow(paymentToRow(pay, 'plan1'))).toEqual(pay);
    });
    it('builds plan and payment rows with the plan id', () => {
        expect(planToRow({ id: 'plan1', title: 't', loanAmount: 5000 })).toMatchObject({ id: 'plan1', loan_amount: 5000 });
        expect(paymentToRow({ id: 'x', dueDate: '2026-01-01', amount: 1, isPaid: false }, 'plan1').plan_id).toBe('plan1');
    });
});

describe('checks mapper round-trip', () => {
    it('preserves all fields', () => {
        const c: Check = { id: 'c1', type: 'received', amount: 200, dueDate: '2026-02-01', subject: 's', sayyadId: '123', status: 'pending', description: 'd', drawerName: 'dn', drawerNationalId: 'dni' };
        expect(mapCheckRow(checkToRow(c))).toEqual(c);
    });
});

describe('darfak mapper round-trip', () => {
    it('preserves category and tags', () => {
        const e: DarfakExpense = { id: 'd1', title: 'سیمان', amount: 750, date: '2026-01-01', tags: ['#مصالح'], category: 'مصالح', note: 'n', attachment: 'a:1' };
        expect(mapDarfakRow(darfakToRow(e))).toEqual(e);
    });
    it('derives category from the first tag when category is missing', () => {
        const e: DarfakExpense = { id: 'd2', title: 'x', amount: 1, date: '2026-01-01', tags: ['#دستمزد'] };
        expect(darfakToRow(e).category).toBe('دستمزد');
    });
});

describe('social insurance mapper round-trip', () => {
    it('preserves all fields', () => {
        const p: SocialInsurancePayment = { id: 's1', year: 1404, month: 8, daysCovered: 30, amount: 1721599, registeredSalary: 10416666, payDate: '2025-10-14', receiptRef: 'r:1', note: 'کامل', isSettled: true };
        expect(mapSocialInsuranceRow(socialInsuranceToRow(p))).toEqual(p);
    });
});

describe('funds mapper round-trip', () => {
    it('preserves all fields', () => {
        const f: MonthlyFund = { id: '1404-08', year: 1404, month: 8, openingAmount: 1000, note: 'n' };
        expect(mapFundRow(fundToRow(f))).toEqual(f);
    });
});
