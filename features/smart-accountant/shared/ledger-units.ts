export const LEDGER_UNITS: { id: 'toman' | 'gold_mg' | 'btc' | 'usdt'; label: string; suffix: string; step: string; maxDecimals: number }[] = [
    { id: 'toman', label: 'تومان', suffix: 'تومان', step: '1', maxDecimals: 0 },
    { id: 'gold_mg', label: 'طلا (میلی‌گرم)', suffix: 'mg طلا', step: '1', maxDecimals: 0 },
    { id: 'btc', label: 'بیت‌کوین', suffix: 'BTC', step: '0.0000000001', maxDecimals: 10 },
    { id: 'usdt', label: 'تتر', suffix: 'USDT', step: '0.001', maxDecimals: 3 },
];

export const getLedgerUnitConfig = (unit: string | undefined) => {
    return LEDGER_UNITS.find(u => u.id === unit) || LEDGER_UNITS[0];
};
