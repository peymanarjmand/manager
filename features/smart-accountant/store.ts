import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, Check, CheckStatus } from './types';
import { createSupabaseTableStateStorage } from '../../lib/supabaseStorage';
import moment from 'jalali-moment';

const STORAGE_KEY = 'lifeManagerAccountant';

interface AccountantState extends AccountantData {
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
            saveInstallmentPlan: (plan) => set(state => ({ installments: [...state.installments, plan] })),
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
                return { installments: newInstallments };
            }),
            deleteInstallmentPlan: (id) => set(state => ({ installments: state.installments.filter(p => p.id !== id) })),
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
                        newPayments[paymentIndex].paidDate = isNowPaid ? new Date().toISOString() : undefined;
                        newInstallments[planIndex] = { ...newInstallments[planIndex], payments: newPayments };
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