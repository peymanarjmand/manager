// Data-access mapping for checks. Pure functions; row shape mirrors `checks`.
import { Check } from '../types';

export const CHECK_COLUMNS =
    'id,type,amount,due_date,status,subject,sayyad_id,payee_name,payee_national_id,drawer_name,drawer_national_id,description,cashed_date';

export const mapCheckRow = (r: any): Check => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount) || 0,
    dueDate: r.due_date,
    subject: r.subject,
    sayyadId: r.sayyad_id,
    status: r.status,
    description: r.description || undefined,
    payeeName: r.payee_name || undefined,
    payeeNationalId: r.payee_national_id || undefined,
    drawerName: r.drawer_name || undefined,
    drawerNationalId: r.drawer_national_id || undefined,
    cashedDate: r.cashed_date || undefined,
});

export const checkToRow = (c: Check) => ({
    id: c.id,
    type: c.type,
    amount: Number(c.amount) || 0,
    due_date: c.dueDate,
    status: c.status || 'pending',
    subject: c.subject,
    sayyad_id: c.sayyadId,
    payee_name: c.payeeName || null,
    payee_national_id: c.payeeNationalId || null,
    drawer_name: c.drawerName || null,
    drawer_national_id: c.drawerNationalId || null,
    description: c.description || null,
    cashed_date: c.cashedDate || null,
});
