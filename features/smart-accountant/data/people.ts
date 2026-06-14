// Data-access mapping for people and their ledger entries. Pure functions; row
// shapes mirror the `people` and `ledger_entries` tables.
import { Person, LedgerEntry } from '../types';

export const PERSON_COLUMNS = 'id,name,avatar_ref';
export const LEDGER_COLUMNS = 'id,person_id,type,amount,description,date,is_settled,receipt_ref,unit';

export const mapPersonRow = (r: any): Person => ({
    id: r.id,
    name: r.name,
    avatar: r.avatar_ref || undefined,
});

export const personToRow = (p: Person) => ({
    id: p.id,
    name: p.name,
    avatar_ref: p.avatar || null,
});

export const mapLedgerRow = (r: any): LedgerEntry => ({
    id: r.id,
    personId: r.person_id,
    type: r.type,
    amount: Number(r.amount) || 0,
    // default to 'toman' for older rows without a unit
    unit: (r.unit || 'toman') as LedgerEntry['unit'],
    description: r.description,
    date: r.date,
    isSettled: !!r.is_settled,
    receiptImage: r.receipt_ref || undefined,
});

export const ledgerToRow = (entry: LedgerEntry) => ({
    id: entry.id,
    person_id: entry.personId,
    type: entry.type,
    amount: Number(entry.amount) || 0,
    description: entry.description,
    date: entry.date,
    is_settled: !!entry.isSettled,
    receipt_ref: entry.receiptImage || null,
    unit: (entry as any).unit || 'toman',
});
