// Data-access mapping for installment plans and their payments. Pure functions;
// row shapes mirror `installment_plans` and `installment_payments`.
import { InstallmentPlan, InstallmentPayment } from '../types';

export const PLAN_COLUMNS = 'id,title,loan_amount';
export const PAYMENT_COLUMNS = 'id,plan_id,amount,due_date,is_paid,paid_date,penalty';

export const mapPaymentRow = (r: any): InstallmentPayment => ({
    id: r.id,
    dueDate: r.due_date,
    amount: Number(r.amount) || 0,
    isPaid: !!r.is_paid,
    paidDate: r.paid_date || undefined,
    penalty: Number(r.penalty || 0) || 0,
});

export const planToRow = (plan: Pick<InstallmentPlan, 'id' | 'title' | 'loanAmount'>) => ({
    id: plan.id,
    title: plan.title,
    loan_amount: plan.loanAmount || 0,
});

export const paymentToRow = (pay: InstallmentPayment, planId: string) => ({
    id: pay.id,
    plan_id: planId,
    amount: Number(pay.amount) || 0,
    due_date: pay.dueDate,
    is_paid: !!pay.isPaid,
    paid_date: pay.paidDate || null,
    penalty: Number(pay.penalty || 0) || 0,
});
