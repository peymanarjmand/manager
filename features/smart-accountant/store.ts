import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, Check, CheckStatus, DarfakExpense, SocialInsurancePayment, MonthlyFund } from './types';
import { createSupabaseTableStateStorage } from '../../lib/supabaseStorage';
import { encryptedStateStorage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { enqueue } from '../../lib/outbox';
import moment from 'jalali-moment';

// Keep in sync with AccountantTab in SmartAccountant.tsx (assets moved to its own module)
type AccountantTab = 'summary' | 'transactions' | 'people' | 'installments' | 'checks' | 'darfak' | 'social_insurance';

const STORAGE_KEY = 'lifeManagerAccountant';

interface AccountantState extends AccountantData {
    darfak: DarfakExpense[];
    socialInsurance: SocialInsurancePayment[];
    funds: MonthlyFund[];
    // UI preferences
    tabsOrder: AccountantTab[]; // persisted order of tabs in Smart Accountant
    peopleOrder: string[]; // custom order of people cards (by person id)
    loadDarfak: () => Promise<void>;
    loadInstallments: () => Promise<void>;
    loadTransactions: () => Promise<void>;
    loadAssets: () => Promise<void>;
    loadPeopleAndLedger: () => Promise<void>;
    loadChecks: () => Promise<void>;
    loadSocialInsurance: () => Promise<void>;
    // Installments sorting preferences (persisted online via state_accountant)
    installmentsSortMode: 'nearest' | 'highest_month' | 'earliest_loan' | 'custom';
    installmentsCustomOrder: string[]; // array of plan ids
    setInstallmentsSortMode: (mode: 'nearest' | 'highest_month' | 'earliest_loan' | 'custom') => void;
    setInstallmentsCustomOrder: (order: string[]) => void;
    setTabsOrder: (order: AccountantTab[]) => void;
    setPeopleOrder: (order: string[]) => void;
    loadFunds: () => Promise<void>;
    saveMonthlyFund: (fund: MonthlyFund) => void;
    deleteMonthlyFund: (id: string) => void;
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
    saveSocialInsurance: (p: SocialInsurancePayment) => void;
    deleteSocialInsurance: (id: string) => void;
    settleSocialInsurance: (id: string) => Promise<void>;
    settleSocialInsuranceMonth: (year: number, month: number) => Promise<void>;
    // Custom Categories
    customCategories: { income: string[]; expense: string[] };
    addCustomCategory: (type: 'income' | 'expense', category: string) => void;
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
            socialInsurance: [],
            funds: [],
            tabsOrder: ['summary','transactions','checks','installments','people','social_insurance','darfak'],
            peopleOrder: [],
            installmentsSortMode: 'nearest',
            installmentsCustomOrder: [],
            customCategories: { income: [], expense: [] },
            addCustomCategory: (type, category) => set(state => {
                const current = state.customCategories[type] || [];
                if (current.includes(category)) return state as any;
                return {
                    customCategories: {
                        ...state.customCategories,
                        [type]: [...current, category]
                    }
                };
            }),
            setInstallmentsSortMode: (mode) => set({ installmentsSortMode: mode }),
            setInstallmentsCustomOrder: (order) => set({ installmentsCustomOrder: order }),
            setTabsOrder: (order) => set({ tabsOrder: order }),
            setPeopleOrder: (order) => set({ peopleOrder: order }),
            loadFunds: async () => {
                try {
                    const { data, error } = await supabase
                        .from('monthly_funds')
                        .select('id,year,month,opening_amount,note')
                        .order('year', { ascending: true })
                        .order('month', { ascending: true });
                    if (error) {
                        console.warn('Funds load error', error);
                        return;
                    }
                    const rows: MonthlyFund[] = (data || []).map((r: any) => ({
                        id: r.id,
                        year: Number(r.year) || 0,
                        month: Number(r.month) || 0,
                        openingAmount: Number(r.opening_amount) || 0,
                        note: r.note || undefined,
                    }));
                    set({ funds: rows });
                } catch (e) {
                    console.warn('Funds load exception', e);
                }
            },
            saveMonthlyFund: (fund) => {
                set((state) => {
                    const rest = (state.funds || []).filter(f => !(f.year === fund.year && f.month === fund.month));
                    const next = [...rest, fund].sort((a,b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
                    return { funds: next } as any;
                });
                void enqueue({ kind: 'upsert', table: 'monthly_funds', values: {
                    id: fund.id,
                    year: fund.year,
                    month: fund.month,
                    opening_amount: Number(fund.openingAmount) || 0,
                    note: fund.note || null,
                } });
            },
            deleteMonthlyFund: (id) => {
                set((state) => ({ funds: (state.funds || []).filter(f => f.id !== id) }));
                void enqueue({ kind: 'delete', table: 'monthly_funds', match: { id } });
            },
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

                // Ensure custom order contains all current plan ids and no stale ones
                set((state) => {
                    const existing = state.installmentsCustomOrder || [];
                    const ids = assembled.map(p => p.id);
                    const merged = [...existing.filter(id => ids.includes(id))];
                    ids.forEach(id => { if (!merged.includes(id)) merged.push(id); });
                    return { installments: assembled, installmentsCustomOrder: merged };
                });
            },
            loadTransactions: async () => {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('id,type,amount,description,category,date,receipt_ref')
                    .order('date', { ascending: false });
                if (error) {
                    console.warn('Transactions load error', error);
                } else {
                    const mapped: Transaction[] = (data || []).map((r: any) => ({
                        id: r.id,
                        type: r.type,
                        amount: Number(r.amount) || 0,
                        description: r.description,
                        category: r.category,
                        date: r.date,
                        receiptImage: r.receipt_ref || undefined,
                    }));
                    set({ transactions: mapped });
                }

                // One-time migration from local/encrypted
                try {
                    const runtime = (useAccountantStore.getState().transactions || []);
                    let enc: Transaction[] = [];
                    try {
                        const raw = await encryptedStateStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && Array.isArray(parsed.transactions)) enc = parsed.transactions as Transaction[];
                        }
                    } catch {}
                    const merged = [...runtime];
                    for (const t of enc) if (!merged.some(x => x.id === t.id)) merged.push(t);

                    const supabaseIds = (data || []).map((r: any) => r.id);
                    const missing = merged.filter(t => !supabaseIds.includes(t.id));
                    if (missing.length > 0) {
                        const rows = missing.map(t => ({
                            id: t.id,
                            type: t.type,
                            amount: Number(t.amount) || 0,
                            description: t.description,
                            category: t.category,
                            date: t.date,
                            receipt_ref: t.receiptImage || null,
                        }));
                        const { error: upErr } = await supabase.from('transactions').upsert(rows);
                        if (upErr) console.error('Transactions migrate upsert error', upErr);
                        else {
                            const { data: again } = await supabase
                                .from('transactions')
                                .select('id,type,amount,description,category,date,receipt_ref')
                                .order('date', { ascending: false });
                            const mappedAgain: Transaction[] = (again || []).map((r: any) => ({
                                id: r.id,
                                type: r.type,
                                amount: Number(r.amount) || 0,
                                description: r.description,
                                category: r.category,
                                date: r.date,
                                receiptImage: r.receipt_ref || undefined,
                            }));
                            set({ transactions: mappedAgain });
                        }
                    }
                } catch (e) {
                    console.warn('Transactions migration exception', e);
                }
            },
            loadAssets: async () => {
                const { data, error } = await supabase
                    .from('assets')
                    .select('id,name,current_value,quantity,purchase_date,notes,owner_id')
                    .order('purchase_date', { ascending: false });
                if (error) {
                    console.warn('Assets load error', error);
                } else {
                    const mapped: Asset[] = (data || []).map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        currentValue: Number(r.current_value) || 0,
                        quantity: Number(r.quantity) || 0,
                        purchaseDate: r.purchase_date,
                        notes: r.notes || undefined,
                        ownerId: r.owner_id || undefined,
                    }));
                    set({ assets: mapped });
                }

                try {
                    const runtime = (useAccountantStore.getState().assets || []);
                    let enc: Asset[] = [];
                    try {
                        const raw = await encryptedStateStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && Array.isArray(parsed.assets)) enc = parsed.assets as Asset[];
                        }
                    } catch {}
                    const merged = [...runtime];
                    for (const a of enc) if (!merged.some(x => x.id === a.id)) merged.push(a);

                    const supabaseIds = (data || []).map((r: any) => r.id);
                    const missing = merged.filter(a => !supabaseIds.includes(a.id));
                    if (missing.length > 0) {
                        const rows = missing.map(a => ({
                            id: a.id,
                            name: a.name,
                            current_value: Number(a.currentValue) || 0,
                            quantity: Number(a.quantity) || 0,
                            purchase_date: a.purchaseDate,
                            notes: a.notes || null,
                            owner_id: a.ownerId || null,
                        }));
                        const { error: upErr } = await supabase.from('assets').upsert(rows);
                        if (upErr) console.error('Assets migrate upsert error', upErr);
                        else {
                            const { data: again } = await supabase
                                .from('assets')
                                .select('id,name,current_value,quantity,purchase_date,notes,owner_id')
                                .order('purchase_date', { ascending: false });
                            const mappedAgain: Asset[] = (again || []).map((r: any) => ({
                                id: r.id,
                                name: r.name,
                                currentValue: Number(r.current_value) || 0,
                                quantity: Number(r.quantity) || 0,
                                purchaseDate: r.purchase_date,
                                notes: r.notes || undefined,
                                ownerId: r.owner_id || undefined,
                            }));
                            set({ assets: mappedAgain });
                        }
                    }
                } catch (e) {
                    console.warn('Assets migration exception', e);
                }
            },
            loadPeopleAndLedger: async () => {
                const { data: peopleData, error: peopleError } = await supabase
                    .from('people')
                    .select('id,name,avatar_ref');
                if (peopleError) {
                    console.warn('People load error', peopleError);
                    return;
                }
                const people: Person[] = (peopleData || []).map((r: any) => ({ id: r.id, name: r.name, avatar: r.avatar_ref || undefined }));

                const personIds = people.map(p => p.id);
                let ledger: Record<string, LedgerEntry[]> = {};
                if (personIds.length > 0) {
                    const { data: ledgerData, error: ledgerError } = await supabase
                        .from('ledger_entries')
                        .select('id,person_id,type,amount,description,date,is_settled,receipt_ref,unit')
                        .in('person_id', personIds);
                    if (ledgerError) {
                        console.warn('Ledger load error', ledgerError);
                        return;
                    }
                    ledger = (ledgerData || []).reduce((acc: Record<string, LedgerEntry[]>, row: any) => {
                        const entry: LedgerEntry = {
                            id: row.id,
                            personId: row.person_id,
                            type: row.type,
                            amount: Number(row.amount) || 0,
                            // default to 'toman' for older rows without unit
                            unit: (row.unit || 'toman') as any,
                            description: row.description,
                            date: row.date,
                            isSettled: !!row.is_settled,
                            receiptImage: row.receipt_ref || undefined,
                        };
                        const list = acc[row.person_id] || [];
                        list.push(entry);
                        acc[row.person_id] = list;
                        return acc;
                    }, {});
                    Object.keys(ledger).forEach(pid => {
                        ledger[pid] = ledger[pid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    });
                }
                set({ people, ledger });

                // Migration from local/encrypted
                try {
                    const runtimePeople = (useAccountantStore.getState().people || []);
                    const runtimeLedger = (useAccountantStore.getState().ledger || {});
                    let encPeople: Person[] = [];
                    let encLedger: Record<string, LedgerEntry[]> = {} as any;
                    try {
                        const raw = await encryptedStateStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && Array.isArray(parsed.people)) encPeople = parsed.people as Person[];
                            if (parsed && parsed.ledger && typeof parsed.ledger === 'object') encLedger = parsed.ledger as Record<string, LedgerEntry[]>;
                        }
                    } catch {}
                    const mergedPeople = [...runtimePeople];
                    for (const p of encPeople) if (!mergedPeople.some(x => x.id === p.id)) mergedPeople.push(p);

                    const supPeopleIds = (peopleData || []).map((r: any) => r.id);
                    const missingPeople = mergedPeople.filter(p => !supPeopleIds.includes(p.id));
                    if (missingPeople.length > 0) {
                        const rows = missingPeople.map(p => ({ id: p.id, name: p.name, avatar_ref: p.avatar || null }));
                        const { error: upErr } = await supabase.from('people').upsert(rows);
                        if (upErr) console.error('People migrate upsert error', upErr);
                    }

                    // Merge runtime + encrypted ledger
                    const mergedLedger: Record<string, LedgerEntry[]> = JSON.parse(JSON.stringify(runtimeLedger || {}));
                    Object.keys(encLedger || {}).forEach(pid => {
                        const arr = encLedger[pid] || [];
                        const existing = mergedLedger[pid] || [];
                        for (const e of arr) if (!existing.some(x => x.id === e.id)) existing.push(e);
                        mergedLedger[pid] = existing;
                    });

                    // Determine present ledger IDs in supabase
                    const supLedgerIds: string[] = [];
                    const { data: allLedgerIds } = await supabase
                        .from('ledger_entries')
                        .select('id');
                    (allLedgerIds || []).forEach((r: any) => supLedgerIds.push(r.id));

                    const missingLedgerRows = Object.values(mergedLedger)
                        .flat()
                        .filter(e => !supLedgerIds.includes(e.id))
                        .map(e => ({
                            id: e.id,
                            person_id: e.personId,
                            type: e.type,
                            amount: Number(e.amount) || 0,
                            description: e.description,
                            date: e.date,
                            is_settled: !!e.isSettled,
                            unit: (e as any).unit || 'toman',
                        }));
                    if (missingLedgerRows.length > 0) {
                        const { error: upErr } = await supabase.from('ledger_entries').upsert(missingLedgerRows);
                        if (upErr) console.error('Ledger migrate upsert error', upErr);
                    }

                    // Reload
                    await useAccountantStore.getState().loadPeopleAndLedger();
                } catch (e) {
                    console.warn('People/Ledger migration exception', e);
                }
            },
            loadChecks: async () => {
                const { data, error } = await supabase
                    .from('checks')
                    .select('id,type,amount,due_date,status,subject,sayyad_id,payee_name,payee_national_id,drawer_name,drawer_national_id,description,cashed_date')
                    .order('due_date', { ascending: true });
                if (error) {
                    console.warn('Checks load error', error);
                } else {
                    const mapped: Check[] = (data || []).map((r: any) => ({
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
                    }));
                    set({ checks: mapped });
                }

                try {
                    const runtime = (useAccountantStore.getState().checks || []);
                    let enc: Check[] = [];
                    try {
                        const raw = await encryptedStateStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && Array.isArray(parsed.checks)) enc = parsed.checks as Check[];
                        }
                    } catch {}
                    const merged = [...runtime];
                    for (const c of enc) if (!merged.some(x => x.id === c.id)) merged.push(c);

                    const supabaseIds = (data || []).map((r: any) => r.id);
                    const missing = merged.filter(c => !supabaseIds.includes(c.id));
                    if (missing.length > 0) {
                        const rows = missing.map(c => ({
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
                        }));
                        const { error: upErr } = await supabase.from('checks').upsert(rows);
                        if (upErr) console.error('Checks migrate upsert error', upErr);
                        else await useAccountantStore.getState().loadChecks();
                    }
                } catch (e) {
                    console.warn('Checks migration exception', e);
                }
            },
            loadSocialInsurance: async () => {
                const { data, error } = await supabase
                    .from('social_insurance')
                    .select('id,year,month,days_covered,amount,registered_salary,pay_date,receipt_ref,note,is_settled')
                    .order('pay_date', { ascending: false });
                if (error) {
                    console.warn('Social insurance load error', error);
                    return;
                }
                const mapped: SocialInsurancePayment[] = (data || []).map((r: any) => ({
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
                }));
                set({ socialInsurance: mapped });
            },
            saveDarfak: (exp) => {
                set(state => {
                    const rest = state.darfak.filter(e => e.id !== exp.id);
                    return { darfak: [...rest, exp].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
                });
                void enqueue({ kind: 'upsert', table: 'darfak_expenses', values: {
                    id: exp.id,
                    title: exp.title,
                    amount: exp.amount,
                    date: exp.date,
                    tags: exp.tags,
                    note: exp.note || null,
                    attachment_ref: exp.attachment || null,
                } });
            },
            deleteDarfak: (id) => {
                set(state => ({ darfak: state.darfak.filter(e => e.id !== id) }));
                void enqueue({ kind: 'delete', table: 'darfak_expenses', match: { id } });
            },
            saveTransaction: (transaction) => {
                set((state) => {
                    const items = state.transactions.filter(t => t.id !== transaction.id);
                    return { transactions: [...items, transaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
                });
                void enqueue({ kind: 'upsert', table: 'transactions', values: {
                    id: transaction.id,
                    type: transaction.type,
                    amount: Number(transaction.amount) || 0,
                    description: transaction.description,
                    category: transaction.category,
                    date: transaction.date,
                    receipt_ref: transaction.receiptImage || null,
                } });
            },
            deleteTransaction: (id) => {
                set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }));
                void enqueue({ kind: 'delete', table: 'transactions', match: { id } });
            },
            saveAsset: (asset) => {
                set(state => {
                    const items = state.assets.filter(a => a.id !== asset.id);
                    return { assets: [...items, asset] };
                });
                void enqueue({ kind: 'upsert', table: 'assets', values: {
                    id: asset.id,
                    name: asset.name,
                    current_value: Number(asset.currentValue) || 0,
                    quantity: Number(asset.quantity) || 0,
                    purchase_date: asset.purchaseDate,
                    notes: asset.notes || null,
                    owner_id: asset.ownerId || null,
                } });
            },
            deleteAsset: (id) => {
                set(state => ({ assets: state.assets.filter(a => a.id !== id) }));
                void enqueue({ kind: 'delete', table: 'assets', match: { id } });
            },
            savePerson: (person) => {
                set(state => {
                    const items = state.people.filter(p => p.id !== person.id);
                    const isNew = !state.people.some(p => p.id === person.id);
                    const newPeople = [...items, person];
                    const currentOrder = (state as any).peopleOrder || [];
                    const newOrder = isNew && !currentOrder.includes(person.id)
                        ? [...currentOrder, person.id]
                        : currentOrder;
                    const newLedger = state.ledger[person.id] ? {} : { [person.id]: [] };
                    return { people: newPeople, ledger: { ...state.ledger, ...newLedger }, peopleOrder: newOrder } as any;
                });
                void enqueue({ kind: 'upsert', table: 'people', values: { id: person.id, name: person.name, avatar_ref: person.avatar || null } });
            },
            deletePerson: (id) => {
                set(state => {
                    const newLedger = {...state.ledger};
                    delete newLedger[id];
                    const currentOrder = (state as any).peopleOrder || [];
                    const newOrder = currentOrder.filter(pid => pid !== id);
                    return { people: state.people.filter(p => p.id !== id), ledger: newLedger, peopleOrder: newOrder } as any;
                });
                (async () => {
                    const { error: delLedger } = await supabase.from('ledger_entries').delete().eq('person_id', id);
                    if (delLedger) console.error('Ledger delete by person error', delLedger);
                    const { error } = await supabase.from('people').delete().eq('id', id);
                    if (error) console.error('Person delete error', error);
                })();
            },
            saveLedgerEntry: (entry) => {
                set(state => {
                    const { personId } = entry;
                    const personLedger = (state.ledger[personId] || []).filter(l => l.id !== entry.id);
                    const newLedgerForPerson = [...personLedger, entry].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    return { ledger: {...state.ledger, [personId]: newLedgerForPerson } };
                });
                void enqueue({ kind: 'upsert', table: 'ledger_entries', values: {
                    id: entry.id,
                    person_id: entry.personId,
                    type: entry.type,
                    amount: Number(entry.amount) || 0,
                    description: entry.description,
                    date: entry.date,
                    is_settled: !!entry.isSettled,
                    receipt_ref: entry.receiptImage || null,
                    unit: (entry as any).unit || 'toman',
                } });
            },
            deleteLedgerEntry: (personId, entryId) => {
                set(state => {
                    if (!state.ledger[personId]) return state as any;
                    const personLedger = state.ledger[personId].filter(l => l.id !== entryId);
                    return { ledger: {...state.ledger, [personId]: personLedger } };
                });
                void enqueue({ kind: 'delete', table: 'ledger_entries', match: { id: entryId } });
            },
            toggleSettle: (personId, entryId) => set(state => {
                const personLedger = [...state.ledger[personId]];
                const entryIndex = personLedger.findIndex(e => e.id === entryId);
                if(entryIndex > -1) {
                    const isNowSettled = !personLedger[entryIndex].isSettled;
                    personLedger[entryIndex] = { ...personLedger[entryIndex], isSettled: isNowSettled };
                    void enqueue({ kind: 'update', table: 'ledger_entries', values: { is_settled: isNowSettled }, match: { id: entryId } });
                }
                return { ledger: {...state.ledger, [personId]: personLedger } };
            }),
            saveInstallmentPlan: (plan) => {
                set(state => {
                    const nextList = [...state.installments, plan];
                    const nextOrder = state.installmentsCustomOrder.includes(plan.id)
                        ? state.installmentsCustomOrder
                        : [...state.installmentsCustomOrder, plan.id];
                    return { installments: nextList, installmentsCustomOrder: nextOrder };
                });
                void enqueue({ kind: 'upsert', table: 'installment_plans', values: { id: plan.id, title: plan.title, loan_amount: plan.loanAmount || 0 } });
                const planPaymentRows = (plan.payments || []).map(pay => ({
                    id: pay.id,
                    plan_id: plan.id,
                    amount: Number(pay.amount) || 0,
                    due_date: pay.dueDate,
                    is_paid: !!pay.isPaid,
                    paid_date: pay.paidDate || null,
                    penalty: Number(pay.penalty || 0) || 0,
                }));
                if (planPaymentRows.length > 0) {
                    void enqueue({ kind: 'upsert', table: 'installment_payments', values: planPaymentRows });
                }
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
                void enqueue({ kind: 'update', table: 'installment_plans', values: { title: planData.title, loan_amount: planData.loanAmount || 0 }, match: { id: planData.id } });
                return { installments: newInstallments };
            }),
            deleteInstallmentPlan: (id) => {
                set(state => ({ 
                    installments: state.installments.filter(p => p.id !== id),
                    installmentsCustomOrder: state.installmentsCustomOrder.filter(pid => pid !== id)
                }));
                void enqueue({ kind: 'delete', table: 'installment_payments', match: { plan_id: id } });
                void enqueue({ kind: 'delete', table: 'installment_plans', match: { id } });
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
                void enqueue({ kind: 'update', table: 'installment_payments', values: {
                    amount: Number(paymentData.amount) || 0,
                    due_date: paymentData.dueDate,
                    penalty: Number(paymentData.penalty || 0) || 0,
                }, match: { id: paymentData.id } });
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
                        void enqueue({ kind: 'update', table: 'installment_payments', values: {
                            is_paid: isNowPaid,
                            paid_date: isNowPaid ? newPayments[paymentIndex].dueDate : null,
                        }, match: { id: paymentId } });
                    }
                }
                return { installments: newInstallments };
            }),
            saveCheck: (check) => {
                set(state => {
                    const items = state.checks.filter(c => c.id !== check.id);
                    return { checks: [...items, check] };
                });
                void enqueue({ kind: 'upsert', table: 'checks', values: {
                    id: check.id,
                    type: check.type,
                    amount: Number(check.amount) || 0,
                    due_date: check.dueDate,
                    status: check.status || 'pending',
                    subject: check.subject,
                    sayyad_id: check.sayyadId,
                    payee_name: check.payeeName || null,
                    payee_national_id: check.payeeNationalId || null,
                    drawer_name: check.drawerName || null,
                    drawer_national_id: check.drawerNationalId || null,
                    description: check.description || null,
                    cashed_date: check.cashedDate || null,
                } });
            },
            deleteCheck: (id) => {
                set(state => ({ checks: state.checks.filter(c => c.id !== id) }));
                void enqueue({ kind: 'delete', table: 'checks', match: { id } });
            },
            updateCheckStatus: (id, status) => {
                set(state => {
                    const newChecks = state.checks.map(c => {
                        if (c.id === id) {
                            return { ...c, status, cashedDate: (status === 'cashed' || status === 'bounced') ? new Date().toISOString() : c.cashedDate };
                        }
                        return c;
                    });
                    return { checks: newChecks };
                });
                {
                    const cashedDate = (status === 'cashed' || status === 'bounced') ? new Date().toISOString() : null;
                    void enqueue({ kind: 'update', table: 'checks', values: { status, cashed_date: cashedDate }, match: { id } });
                }
            },
            saveSocialInsurance: (p) => {
                set(state => {
                    const rest = state.socialInsurance.filter(x => x.id !== p.id);
                    return { socialInsurance: [p, ...rest].sort((a,b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime()) };
                });
                void enqueue({ kind: 'upsert', table: 'social_insurance', values: {
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
                } });
            },
            settleSocialInsurance: async (id: string) => {
                // Irreversible: mark as settled in DB and local state
                set(state => ({ socialInsurance: state.socialInsurance.map(x => x.id === id ? { ...x, isSettled: true } : x) }));
                await enqueue({ kind: 'update', table: 'social_insurance', values: { is_settled: true }, match: { id } });
            },
            settleSocialInsuranceMonth: async (year: number, month: number) => {
                // For months without a record, insert a locked/settled stub to prevent future edits
                const id = `${year}-${month}`;
                const stub: SocialInsurancePayment = {
                    id,
                    year,
                    month,
                    daysCovered: 0,
                    amount: 0,
                    payDate: new Date().toISOString(),
                    isSettled: true,
                };
                set(state => {
                    const exists = state.socialInsurance.some(x => x.year === year && x.month === month);
                    if (exists) {
                        return { socialInsurance: state.socialInsurance.map(x => (x.year === year && x.month === month) ? { ...x, isSettled: true } : x) };
                    }
                    return { socialInsurance: [stub, ...state.socialInsurance] };
                });
                await enqueue({ kind: 'upsert', table: 'social_insurance', values: {
                    id,
                    year,
                    month,
                    days_covered: 0,
                    amount: 0,
                    registered_salary: null,
                    pay_date: new Date().toISOString(),
                    receipt_ref: null,
                    note: 'settled_stub',
                    is_settled: true,
                } });
            },
            deleteSocialInsurance: (id) => {
                set(state => ({ socialInsurance: state.socialInsurance.filter(x => x.id !== id) }));
                void enqueue({ kind: 'delete', table: 'social_insurance', match: { id } });
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => createSupabaseTableStateStorage('state_accountant') as unknown as Storage),
            // Persist ONLY UI preferences. All financial data lives in relational
            // Supabase tables (hydrated via the load*() actions on mount), so it is
            // never duplicated into this blob — removing the dual-source-of-truth
            // divergence and the large per-write upload. Verified safe before enabling:
            // every record in the previous blob already existed in its table.
            partialize: (state) => ({
                tabsOrder: state.tabsOrder,
                peopleOrder: state.peopleOrder,
                installmentsSortMode: state.installmentsSortMode,
                installmentsCustomOrder: state.installmentsCustomOrder,
                customCategories: state.customCategories,
            }) as AccountantState,
            // Take ONLY UI prefs from the persisted blob; ignore any financial arrays
            // that might still exist in an older (pre-partialize) blob, so stale data
            // can never be re-injected. Relational load*() remains the single source.
            merge: (persisted, current) => {
                const p = (persisted || {}) as Partial<AccountantState>;
                return {
                    ...current,
                    tabsOrder: p.tabsOrder ?? current.tabsOrder,
                    peopleOrder: p.peopleOrder ?? current.peopleOrder,
                    installmentsSortMode: p.installmentsSortMode ?? current.installmentsSortMode,
                    installmentsCustomOrder: p.installmentsCustomOrder ?? current.installmentsCustomOrder,
                    customCategories: p.customCategories ?? current.customCategories,
                };
            },
        }
    )
);