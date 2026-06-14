import { describe, it, expect } from 'vitest';
import { formatCurrency, formatLedgerAmount } from '../shared/formatters';

describe('formatCurrency', () => {
  it('appends the toman suffix and uses Persian digits', () => {
    const s = formatCurrency(1234567);
    expect(s).toContain('تومان');
    expect(s).toMatch(/[۰-۹]/);
  });

  it('does not throw on 0 / falsy amounts', () => {
    expect(formatCurrency(0)).toContain('تومان');
    expect(formatCurrency(undefined as never)).toContain('تومان');
  });
});

describe('formatLedgerAmount', () => {
  it('uses the gold suffix for gold_mg', () => {
    expect(formatLedgerAmount({ amount: 5, unit: 'gold_mg' } as never)).toContain('mg طلا');
  });

  it('uses the BTC suffix and supports decimals', () => {
    expect(formatLedgerAmount({ amount: 0.12345, unit: 'btc' } as never)).toContain('BTC');
  });

  it('defaults to toman when the unit is missing', () => {
    expect(formatLedgerAmount({ amount: 100 } as never)).toContain('تومان');
  });
});
