// Data-access mapping for social-insurance payments. Pure functions; row shape
// mirrors `social_insurance`.
import { SocialInsurancePayment } from '../types';

export const SOCIAL_INSURANCE_COLUMNS = 'id,year,month,days_covered,amount,registered_salary,pay_date,receipt_ref,note,is_settled';

export const mapSocialInsuranceRow = (r: any): SocialInsurancePayment => ({
    id: r.id,
    year: Number(r.year) || 0,
    month: Number(r.month) || 0,
    daysCovered: Number(r.days_covered) || 0,
    amount: Number(r.amount) || 0,
    registeredSalary: r.registered_salary != null ? Number(r.registered_salary) : undefined,
    payDate: r.pay_date,
    receiptRef: r.receipt_ref || undefined,
    note: r.note || undefined,
    isSettled: !!r.is_settled,
});

export const socialInsuranceToRow = (p: SocialInsurancePayment) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    days_covered: p.daysCovered,
    amount: p.amount,
    registered_salary: p.registeredSalary ?? null,
    pay_date: p.payDate,
    receipt_ref: p.receiptRef || null,
    note: p.note || null,
    is_settled: !!p.isSettled,
});
