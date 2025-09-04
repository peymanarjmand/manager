import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AnyPasswordEntry, PasswordCategory } from './types';
import { encryptedStateStorage } from '../../lib/storage';

const STORAGE_KEY = 'lifeManagerPasswords';

interface PasswordState {
    entries: Record<PasswordCategory, AnyPasswordEntry[]>;
    saveEntry: (category: PasswordCategory, entryData: AnyPasswordEntry) => void;
    deleteEntry: (category: PasswordCategory, entryId: string) => void;
}

export const usePasswordStore = create<PasswordState>()(
    persist(
        (set) => ({
            entries: { emails: [], banks: [], accounts: [], wallets: [], exchanges: [] },
            saveEntry: (category, entryData) =>
                set((state) => {
                    const categoryEntries = [...state.entries[category]];
                    const index = categoryEntries.findIndex((e) => e.id === entryData.id);

                    if (index > -1) { // Edit
                        categoryEntries[index] = entryData;
                    } else { // Add
                        categoryEntries.push(entryData);
                    }

                    return {
                        entries: {
                            ...state.entries,
                            [category]: categoryEntries,
                        },
                    };
                }),
            deleteEntry: (category, entryId) =>
                set((state) => ({
                    entries: {
                        ...state.entries,
                        [category]: state.entries[category].filter((entry) => entry.id !== entryId),
                    },
                })),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => encryptedStateStorage as unknown as Storage),
        }
    )
);
