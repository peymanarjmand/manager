// Data-access mapping for Darfak (house-construction) expenses. Pure functions;
// row shape mirrors `darfak_expenses`. Writing both `category` and a `#category`
// tag keeps backward compatibility with the legacy free-tag model.
import { DarfakExpense } from '../types';

export const DARFAK_COLUMNS = 'id,title,amount,date,tags,category,note,attachment_ref';

export const mapDarfakRow = (r: any): DarfakExpense => ({
    id: r.id,
    title: r.title,
    amount: Number(r.amount) || 0,
    date: r.date,
    tags: (r.tags as string[]) || [],
    category: r.category || undefined,
    note: r.note || undefined,
    attachment: (r.attachment_ref as string | null) || undefined,
});

export const darfakToRow = (e: DarfakExpense) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    date: e.date,
    tags: e.tags,
    category: e.category || (e.tags && e.tags[0] ? e.tags[0].replace(/^#/, '') : null),
    note: e.note || null,
    attachment_ref: e.attachment || null,
});
