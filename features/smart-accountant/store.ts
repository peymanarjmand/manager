import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, Check, CheckStatus, DarfakExpense } from './types';
import { createSupabaseTableStateStorage } from '../../lib/supabaseStorage';
import { encryptedStateStorage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import moment from 'jalali-moment';

const STORAGE_KEY = 'lifeManagerAccountant';

interface AccountantState extends AccountantData {
    darfak: DarfakExpense[];
    loadDarfak: () => Promise<void>;
    loadInstallments: () => Promise<void>;
    saveDarfak: (exp: DarfakExpense) => void;
    deleteDarfak: (id: string) => void;
    saveTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    saveAsset: (asset: Asset) => void;
    deleteAsset: (id: string) => void;
    savePerson: (person: Person) => void;
    deletePerson: (id: string) => void;
    saveLedgerEntry: (entry: LedgerEntry) => void;
    deleteLedgerEntry: (personId: string, entryId: string) => void;
    toggleSettle: (personId: string, entryId: string) => void;
    saveInstallmentPlan: (plan: InstallmentPlan) => void;
    updateInstallmentPlan: (plan: Pick<InstallmentPlan, 'id' | 'title' | 'loanAmount'>) => void;
    deleteInstallmentPlan: (id: string) => void;
    updateInstallmentPayment: (planId: string, payment: Pick<InstallmentPayment, 'id' | 'amount' | 'dueDate' | 'penalty'>) => void;
    togglePaidStatus: (planId: string, paymentId: string) => void;
    saveCheck: (check: Check) => void;
    deleteCheck: (id: string) => void;
    updateCheckStatus: (id: string, status: CheckStatus) => void;
}

export const useAccountantStore = create<AccountantState>()(
    persist(
        (set) => ({
            transactions: [],
            assets: [],
            people: [],
            ledger: {},
            installments: [],
            checks: [],
            darfak: [],
            loadDarfak: async () => {
                const { data, error } = await supabase
                    .from('darfak_expenses')
                    .select('id,title,amount,date,tags,note,attachment_ref')
                    .order('date', { ascending: false });
                if (error) {
                    console.warn('Darfak load error', error);
                    return;
                }
                const mapped: DarfakExpense[] = (data || []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    amount: Number(r.amount) || 0,
                    date: r.date,
                    tags: (r.tags as string[]) || [],
                    note: r.note || undefined,
                    attachment: (r.attachment_ref as string | null) || undefined,
                }));
                set({ darfak: mapped });
            },
            loadInstallments: async () => {
                // Fetch existing plans from Supabase
                const { data: plansData, error: plansError } = await supabase
                    .from('installment_plans')
                    .select('id,title,loan_amount');
                if (plansError) {
                    console.warn('Installments load (plans) error', plansError);
                    return;
                }

                const existingPlanIds = (plansData || []).map((p: any) => p.id);

                // One-time (or incremental) migration: push any local-only plans to Supabase
                try {
                    // Prefer runtime state; fall back to old encrypted storage if present
                    const runtimeInstallments = (useAccountantStore.getState().installments || []);
                    let encryptedInstallments: InstallmentPlan[] = [];
                    try {
                        const raw = await encryptedStateStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && Array.isArray(parsed.installments)) {
                                encryptedInstallments = parsed.installments as InstallmentPlan[];
                            }
                        }
                    } catch (e) {
                        // ignore decrypt/parse errors
                    }

                    const mergedLocal = [...runtimeInstallments];
                    for (const p of encryptedInstallments) {
                        if (!mergedLocal.some(mp => mp.id === p.id)) mergedLocal.push(p);
                    }

                    const missingLocalPlans = mergedLocal.filter(p => !existingPlanIds.includes(p.id));
                    if (missingLocalPlans.length > 0) {
                        const planRows = missingLocalPlans.map(p => ({ id: p.id, title: p.title, loan_amount: p.loanAmount || 0 }));
                        const { error: upsertPlansError } = await supabase.from('installment_plans').upsert(planRows);
                        if (upsertPlansError) console.error('Installments migrate upsert plans error', upsertPlansError);

                        const paymentRows = missingLocalPlans.flatMap(p => (p.payments || []).map((pay: InstallmentPayment) => ({
                            id: pay.id,
                            plan_id: p.id,
                            amount: Number(pay.amount) || 0,
                            due_date: pay.dueDate,
                            is_paid: !!pay.isPaid,
                            paid_date: pay.paidDate || null,
                            penalty: Number(pay.penalty || 0) || 0,
                        })));
                        if (paymentRows.length > 0) {
                            const { error: upsertPaymentsError } = await supabase.from('installment_payments').upsert(paymentRows);
                            if (upsertPaymentsError) console.error('Installments migrate upsert payments error', upsertPaymentsError);
                        }
                    }
                } catch (e) {
                    console.warn('Installments migration exception', e);
                }

                // Reload plans after potential migration
                const { data: finalPlans, error: finalPlansError } = await supabase
                    .from('installment_plans')
                    .select('id,title,loan_amount');
                if (finalPlansError) {
                    console.warn('Installments reload (plans) error', finalPlansError);
                    return;
                }
                const finalPlanIds = (finalPlans || []).map((p: any) => p.id);

                let paymentsMap: Record<string, InstallmentPayment[]> = {};
                if (finalPlanIds.length > 0) {
                    const { data: paymentsData, error: paymentsError } = await supabase
                        .from('installment_payments')
                        .select('id,plan_id,amount,due_date,is_paid,paid_date,penalty')
                        .in('plan_id', finalPlanIds);
                    if (paymentsError) {
                        console.warn('Installments load (payments) error', paymentsError);
                        return;
                    }
                    paymentsMap = (paymentsData || []).reduce((acc: Record<string, InstallmentPayment[]>, row: any) => {
                        const p: InstallmentPayment = {
                            id: row.id,
                            dueDate: row.due_date,
                            amount: Number(row.amount) || 0,
                            isPaid: !!row.is_paid,
                            paidDate: row.paid_date || undefined,
                            penalty: Number(row.penalty || 0) || 0,
                        };
                        const list = acc[row.plan_id] || [];
                        list.push(p);
                        acc[row.plan_id] = list;
                        return acc;
                    }, {});
                }

                const assembled: InstallmentPlan[] = (finalPlans || []).map((pl: any) => ({
                    id: pl.id,
                    title: pl.title,
                    loanAmount: Number(pl.loan_amount) || 0,
                    payments: (paymentsMap[pl.id] || []).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
                }));

                set({ installments: assembled });
            },
            saveDarfak: (exp) => {
                set(state => {
                    const rest = state.darfak.filter(e => e.id !== exp.id);
                    return { darfak: [...rest, exp].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
                });
                (async () => {
                    const { error } = await supabase
                        .from('darfak_expenses')
                        .upsert({
                            id: exp.id,
                            title: exp.title,
                            amount: exp.amount,
                            date: exp.date,
                            tags: exp.tags,
                            note: exp.note || null,
                            attachment_ref: exp.attachment || null,
                        });
                    if (error) console.error('Darfak upsert error', error);
                })();
            },
            deleteDarfak: (id) => {
                set(state => ({ darfak: state.darfak.filter(e => e.id !== id) }));
                (async () => {
                    const { error } = await supabase
                        .from('darfak_expenses')
                        .delete()
                        .eq('id', id);
                    if (error) console.error('Darfak delete error', error);
                })();
            },
            saveTransaction: (transaction) => set((state) => {
                const items = state.transactions.filter(t => t.id !== transaction.id);
                return { transactions: [...items, transaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
            }),
            deleteTransaction: (id) => set(state => ({ transactions: state.transactions.filter(t => t.id !== id) })),
            saveAsset: (asset) => set(state => {
                const items = state.assets.filter(a => a.id !== asset.id);
                return { assets: [...items, asset] };
            }),
            deleteAsset: (id) => set(state => ({ assets: state.assets.filter(a => a.id !== id) })),
            savePerson: (person) => set(state => {
                 const items = state.people.filter(p => p.id !== person.id);
                 const newLedger = state.ledger[person.id] ? {} : {[person.id]: []};
                 return { people: [...items, person], ledger: {...state.ledger, ...newLedger} };
            }),
            deletePerson: (id) => set(state => {
                const newLedger = {...state.ledger};
                delete newLedger[id];
                return { people: state.people.filter(p => p.id !== id), ledger: newLedger };
            }),
            saveLedgerEntry: (entry) => set(state => {
                const { personId } = entry;
                const personLedger = (state.ledger[personId] || []).filter(l => l.id !== entry.id);
                const newLedgerForPerson = [...personLedger, entry].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return { ledger: {...state.ledger, [personId]: newLedgerForPerson } };
            }),
            deleteLedgerEntry: (personId, entryId) => set(state => {
                if (!state.ledger[personId]) return state;
                const personLedger = state.ledger[personId].filter(l => l.id !== entryId);
                return { ledger: {...state.ledger, [personId]: personLedger } };
            }),
            toggleSettle: (personId, entryId) => set(state => {
                const personLedger = [...state.ledger[personId]];
                const entryIndex = personLedger.findIndex(e => e.id === entryId);
                if(entryIndex > -1) {
                    personLedger[entryIndex] = { ...personLedger[entryIndex], isSettled: !personLedger[entryIndex].isSettled };
                }
                return { ledger: {...state.ledger, [personId]: personLedger } };
            }),
            saveInstallmentPlan: (plan) => {
                set(state => ({ installments: [...state.installments, plan] }));
                (async () => {
                    const { error: planErr } = await supabase
                        .from('installment_plans')
                        .upsert({ id: plan.id, title: plan.title, loan_amount: plan.loanAmount || 0 });
                    if (planErr) console.error('Installment plan upsert error', planErr);
                    const paymentRows = (plan.payments || []).map(pay => ({
                        id: pay.id,
                        plan_id: plan.id,
                        amount: Number(pay.amount) || 0,
                        due_date: pay.dueDate,
                        is_paid: !!pay.isPaid,
                        paid_date: pay.paidDate || null,
                        penalty: Number(pay.penalty || 0) || 0,
                    }));
                    if (paymentRows.length > 0) {
                        const { error: paysErr } = await supabase.from('installment_payments').upsert(paymentRows);
                        if (paysErr) console.error('Installment payments upsert error', paysErr);
                    }
                })();
            },
            updateInstallmentPlan: (planData) => set(state => {
                const newInstallments = [...state.installments];
                const planIndex = newInstallments.findIndex(p => p.id === planData.id);
                if (planIndex > -1) {
                    newInstallments[planIndex] = {
                        ...newInstallments[planIndex],
                        title: planData.title,
                        loanAmount: planData.loanAmount || newInstallments[planIndex].loanAmount || 0,
                    };
                }
                (async () => {
                    const { error } = await supabase
                        .from('installment_plans')
                        .update({ title: planData.title, loan_amount: planData.loanAmount || 0 })
                        .eq('id', planData.id);
                    if (error) console.error('Installment plan update error', error);
                })();
                return { installments: newInstallments };
            }),
            deleteInstallmentPlan: (id) => {
                set(state => ({ installments: state.installments.filter(p => p.id !== id) }));
                (async () => {
                    const { error: delPaysErr } = await supabase
                        .from('installment_payments')
                        .delete()
                        .eq('plan_id', id);
                    if (delPaysErr) console.error('Installment payments delete error', delPaysErr);
                    const { error: delPlanErr } = await supabase
                        .from('installment_plans')
                        .delete()
                        .eq('id', id);
                    if (delPlanErr) console.error('Installment plan delete error', delPlanErr);
                })();
            },
            updateInstallmentPayment: (planId, paymentData) => set(state => {
                 const newInstallments = [...state.installments];
                 const planIndex = newInstallments.findIndex(p => p.id === planId);
                 if (planIndex > -1) {
                     const paymentIndex = newInstallments[planIndex].payments.findIndex(p => p.id === paymentData.id);
                     if (paymentIndex > -1) {
                         const newPayments = [...newInstallments[planIndex].payments];
                         newPayments[paymentIndex] = { 
                             ...newPayments[paymentIndex],
                             amount: parseFloat(String(paymentData.amount)),
                             dueDate: paymentData.dueDate,
                             penalty: parseFloat(String(paymentData.penalty || 0)) || 0
                         };
                         newInstallments[planIndex] = {...newInstallments[planIndex], payments: newPayments };
                     }
                 }
                (async () => {
                    const { error } = await supabase
                        .from('installment_payments')
                        .update({
                            amount: Number(paymentData.amount) || 0,
                            due_date: paymentData.dueDate,
                            penalty: Number(paymentData.penalty || 0) || 0,
                        })
                        .eq('id', paymentData.id);
                    if (error) console.error('Installment payment update error', error);
                })();
                return { installments: newInstallments };
            }),
            togglePaidStatus: (planId, paymentId) => set(state => {
                const newInstallments = [...state.installments]; // keep order while toggling
                const planIndex = newInstallments.findIndex(p => p.id === planId);
                if (planIndex > -1) {
                    const newPayments = [...newInstallments[planIndex].payments];
                    const paymentIndex = newPayments.findIndex(p => p.id === paymentId);
                    if (paymentIndex > -1) {
                        const isNowPaid = !newPayments[paymentIndex].isPaid;
                        newPayments[paymentIndex].isPaid = isNowPaid;
                        // Use the scheduled due date as the payment date (not the current click time)
                        newPayments[paymentIndex].paidDate = isNowPaid ? newPayments[paymentIndex].dueDate : undefined;
                        newInstallments[planIndex] = { ...newInstallments[planIndex], payments: newPayments };
                        (async () => {
                            const { error } = await supabase
                                .from('installment_payments')
                                .update({
                                    is_paid: isNowPaid,
                                    paid_date: isNowPaid ? newPayments[paymentIndex].dueDate : null,
                                })
                                .eq('id', paymentId);
                            if (error) console.error('Installment payment toggle error', error);
                        })();
                    }
                }
                return { installments: newInstallments };
            }),
            saveCheck: (check) => set(state => {
                const items = state.checks.filter(c => c.id !== check.id);
                return { checks: [...items, check] };
            }),
            deleteCheck: (id) => set(state => ({ checks: state.checks.filter(c => c.id !== id) })),
            updateCheckStatus: (id, status) => set(state => {
                const newChecks = state.checks.map(c => {
                    if (c.id === id) {
                        return { ...c, status, cashedDate: (status === 'cashed' || status === 'bounced') ? new Date().toISOString() : c.cashedDate };
                    }
                    return c;
                });
                return { checks: newChecks };
            }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => createSupabaseTableStateStorage('state_accountant') as unknown as Storage)
        }
    )
);