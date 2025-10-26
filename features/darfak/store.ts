import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSupabaseTableStateStorage } from '../../lib/supabaseStorage';

export type DarfakTag = string; // e.g., '#مصالح', '#دستمزد'

export interface DarfakExpense {
    id: string;
    title: string;
    amount: number;
    date: string; // ISO
    tags: DarfakTag[];
    note?: string;
    attachment?: string; // ref to storage (optional)
}

interface DarfakState {
    expenses: DarfakExpense[];
    saveExpense: (expense: DarfakExpense) => void;
    deleteExpense: (id: string) => void;
}

const STORAGE_KEY = 'lifeManagerDarfak';

export const useDarfakStore = create<DarfakState>()(
    persist(
        (set) => ({
            expenses: [],
            saveExpense: (expense) => set(state => {
                const others = state.expenses.filter(e => e.id !== expense.id);
                return { expenses: [...others, expense].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
            }),
            deleteExpense: (id) => set(state => ({ expenses: state.expenses.filter(e => e.id !== id) })),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => createSupabaseTableStateStorage('state_darfak') as unknown as Storage)
        }
    )
);


