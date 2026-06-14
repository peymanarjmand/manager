// Data-access mapping for monthly funds (opening cash per Jalali month). Pure
// functions; row shape mirrors `monthly_funds`.
import { MonthlyFund } from '../types';

export const FUND_COLUMNS = 'id,year,month,opening_amount,note';

export const mapFundRow = (r: any): MonthlyFund => ({
    id: r.id,
    year: Number(r.year) || 0,
    month: Number(r.month) || 0,
    openingAmount: Number(r.opening_amount) || 0,
    note: r.note || undefined,
});

export const fundToRow = (fund: MonthlyFund) => ({
    id: fund.id,
    year: fund.year,
    month: fund.month,
    opening_amount: Number(fund.openingAmount) || 0,
    note: fund.note || null,
});
