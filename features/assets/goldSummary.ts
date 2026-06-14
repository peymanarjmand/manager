// Pure aggregation helpers for the gold dashboard. Extracted from
// OwnerGoldDashboard so the calculations are reusable and unit-testable,
// separate from the view. Behavior is verbatim from the original component.

// Approximate grams of 18k gold per 1 token (XAUT/PAXG).
export const TOKEN_TO_GRAMS_18K = 41.4713;

export interface GoldSummary {
    count: number;
    totalPaid: number;
    last: string | undefined;
    invoices: number;
}

export const summarize = (arr: any[]): GoldSummary => {
    const count = arr.length;
    const totalPaid = arr.reduce((s, a) => s + (a.totalPaidToman || 0), 0);
    const last = arr.length ? arr.map(a => a.purchaseDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined;
    const invoices = arr.reduce((s, a) => s + (a.subtype === 'physical' ? ((a.invoiceRef1 ? 1 : 0) + (a.invoiceRef2 ? 1 : 0)) : (a.invoiceRef ? 1 : 0)), 0);
    return { count, totalPaid, last, invoices };
};

export const summarizePhysical = (arr: any[]) => {
    const s = summarize(arr);
    const totalGrams = arr.reduce((g, a) => g + ((Number(a.grams) || 0) + (Number(a.soot) || 0) / 1000), 0);
    const avgPrice = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.pricePerGram) || 0), 0) / arr.length) : 0;
    return { ...s, totalGrams, avgPrice };
};

export const summarizeToken = (arr: any[]) => {
    const s = summarize(arr);
    const totalAmount = arr.reduce((t, a) => t + (Number(a.tokenAmount) || 0), 0);
    const avgPriceToman = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.priceToman) || 0), 0) / arr.length) : 0;
    return { ...s, totalAmount, avgPriceToman };
};

export const summarizeDigi = (arr: any[]) => {
    const s = summarize(arr);
    const totalMg = arr.reduce((m, a) => m + (Number(a.amountMg) || 0), 0);
    const avgPricePerMg = arr.length ? Math.round(arr.reduce((sum, a) => sum + (Number(a.pricePerMg) || 0), 0) / arr.length) : 0;
    return { ...s, totalMg, avgPricePerMg };
};
