import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabaseStateStorage } from '../../lib/supabaseStorage';

const STORAGE_KEY = 'lifeManagerDashboard';

interface DashboardState {
    itemsOrder: string[]; // ordered list of dashboard item ids
    setItemsOrder: (order: string[]) => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            itemsOrder: [],
            setItemsOrder: (order) => set({ itemsOrder: order }),
        }),
        {
            name: STORAGE_KEY,
            // Persist in Supabase `kv_store` so it syncs across devices per user
            storage: createJSONStorage(() => supabaseStateStorage as unknown as Storage),
        }
    )
);


