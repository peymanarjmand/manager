// Data-access mapping for transactions. Pure functions (no Supabase import) so
// they are trivially unit-testable and safe to reuse from the store and the
// legacy-migration path. Row shape mirrors the `transactions` table columns.
import { Transaction } from '../types';

export const TRANSACTION_COLUMNS = 'id,type,amount,description,category,date,receipt_ref';

export const mapTransactionRow = (r: any): Transaction => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount) || 0,
    description: r.description,
    category: r.category,
    date: r.date,
    receiptImage: r.receipt_ref || undefined,
});

export const transactionToRow = (t: Transaction) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount) || 0,
    description: t.description,
    category: t.category,
    date: t.date,
    receipt_ref: t.receiptImage || null,
});
