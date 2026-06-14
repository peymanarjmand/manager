import { describe, it, expect } from 'vitest';
import { summarize, summarizePhysical, summarizeToken, summarizeDigi, TOKEN_TO_GRAMS_18K } from '../goldSummary';

describe('gold summarize', () => {
    it('counts, sums totalPaid, and picks the latest purchase date', () => {
        const s = summarize([
            { totalPaidToman: 100, purchaseDate: '2026-01-01', subtype: 'physical', invoiceRef1: 'a' },
            { totalPaidToman: 250, purchaseDate: '2026-03-01', subtype: 'physical' },
        ]);
        expect(s.count).toBe(2);
        expect(s.totalPaid).toBe(350);
        expect(s.last).toBe('2026-03-01');
        expect(s.invoices).toBe(1);
    });
    it('handles an empty list', () => {
        expect(summarize([])).toEqual({ count: 0, totalPaid: 0, last: undefined, invoices: 0 });
    });
});

describe('summarizePhysical', () => {
    it('adds grams (incl. soot/1000) and average price-per-gram', () => {
        const s = summarizePhysical([
            { grams: 2, soot: 500, pricePerGram: 1000, totalPaidToman: 0, subtype: 'physical' },
            { grams: 1, soot: 0, pricePerGram: 3000, totalPaidToman: 0, subtype: 'physical' },
        ]);
        expect(s.totalGrams).toBeCloseTo(3.5, 5);
        expect(s.avgPrice).toBe(2000);
    });
});

describe('summarizeToken & summarizeDigi', () => {
    it('totals token amount', () => {
        expect(summarizeToken([{ tokenAmount: 1.5 }, { tokenAmount: 2 }]).totalAmount).toBeCloseTo(3.5, 5);
    });
    it('totals digikala milligrams', () => {
        expect(summarizeDigi([{ amountMg: 500 }, { amountMg: 250 }]).totalMg).toBe(750);
    });
});

describe('TOKEN_TO_GRAMS_18K', () => {
    it('is the fixed conversion constant', () => {
        expect(TOKEN_TO_GRAMS_18K).toBeCloseTo(41.4713, 4);
    });
});
