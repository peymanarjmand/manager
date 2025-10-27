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
        const row = { id: owner.id, name: owner.name, avatar_ref: owner.avatar || null };
        const { error } = await supabase.from('asset_people').upsert(row);
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Asset owner upsert error', error);
            return;
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


