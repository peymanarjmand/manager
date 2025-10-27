import { create } from 'zustand';
import { supabase } from '../../lib/supabase';

export interface AssetOwner {
    id: string;
    name: string;
    avatar?: string;
}

interface AssetsModuleState {
    owners: AssetOwner[];
    loadOwners: () => Promise<void>;
    saveOwner: (owner: AssetOwner) => Promise<void>;
    deleteOwner: (id: string) => Promise<void>;
}

export const useAssetsStore = create<AssetsModuleState>()((set, get) => ({
    owners: [],
    loadOwners: async () => {
        const { data, error } = await supabase
            .from('asset_people')
            .select('id,name,avatar_ref');
        if (error) {
            // eslint-disable-next-line no-console
            console.warn('Asset owners load error', error);
            return;
        }
        const owners: AssetOwner[] = (data || []).map((r: any) => ({ id: r.id, name: r.name, avatar: r.avatar_ref || undefined }));
        set({ owners });
    },
    saveOwner: async (owner: AssetOwner) => {
        const name = (owner.name || '').trim();
        if (!name) throw new Error('نام مالک الزامی است');
        // Client-side duplicate guard
        const exists = (get().owners || []).some(o => o.name.trim().toLowerCase() === name.toLowerCase() && o.id !== owner.id);
        if (exists) throw new Error('مالک تکراری است');

        const row = { id: owner.id, name, avatar_ref: owner.avatar || null };
        const { error } = await supabase.from('asset_people').upsert(row);
        if (error) {
            // Unique violation from DB
            if ((error as any).code === '23505') {
                throw new Error('مالک با این نام از قبل وجود دارد');
            }
            // eslint-disable-next-line no-console
            console.error('Asset owner upsert error', error);
            throw error;
        }
        await get().loadOwners();
    },
    deleteOwner: async (id: string) => {
        const { error } = await supabase.from('asset_people').delete().eq('id', id);
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Asset owner delete error', error);
            return;
        }
        await get().loadOwners();
    },
}));


