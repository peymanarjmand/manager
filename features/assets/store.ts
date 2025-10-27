import { create } from 'zustand';
import { supabase } from '../../lib/supabase';
import { GoldAsset } from './types';

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
    gold: GoldAsset[];
    loadGoldByOwner: (ownerId: string) => Promise<void>;
    saveGold: (asset: GoldAsset) => Promise<void>;
}

export const useAssetsStore = create<AssetsModuleState>()((set, get) => ({
    owners: [],
    gold: [],
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
    loadGoldByOwner: async (ownerId: string) => {
        const { data, error } = await supabase
            .from('asset_gold')
            .select('*')
            .eq('owner_id', ownerId)
            .order('purchase_date', { ascending: false });
        if (error) {
            // eslint-disable-next-line no-console
            console.warn('Gold load error', error);
            return;
        }
        const mapped: GoldAsset[] = (data || []).map((r: any) => ({
            id: r.id,
            ownerId: r.owner_id,
            subtype: r.subtype,
            grams: r.grams != null ? Number(r.grams) : undefined,
            soot: r.soot != null ? Number(r.soot) : undefined,
            pricePerGram: r.price_per_gram != null ? Number(r.price_per_gram) : undefined,
            totalPaidToman: Number(r.total_paid_toman) || 0,
            wageToman: r.wage_toman != null ? Number(r.wage_toman) : undefined,
            invoiceRef1: r.invoice_ref1 || undefined,
            invoiceRef2: r.invoice_ref2 || undefined,
            tokenSymbol: r.token_symbol || undefined,
            tokenAmount: r.token_amount != null ? Number(r.token_amount) : undefined,
            priceUsd: r.price_usd != null ? Number(r.price_usd) : undefined,
            pricePerGramToday: r.price_per_gram_today != null ? Number(r.price_per_gram_today) : undefined,
            feeToman: r.fee_toman != null ? Number(r.fee_toman) : undefined,
            custodyLocation: r.custody_location || undefined,
            gramsDerived: r.grams_derived != null ? Number(r.grams_derived) : undefined,
            usdRateToman: r.usd_rate_toman != null ? Number(r.usd_rate_toman) : undefined,
            amountMg: r.amount_mg != null ? Number(r.amount_mg) : undefined,
            pricePerMg: r.price_per_mg != null ? Number(r.price_per_mg) : undefined,
            feeManualToman: r.fee_manual_toman != null ? Number(r.fee_manual_toman) : undefined,
            feePercent: r.fee_percent != null ? Number(r.fee_percent) : undefined,
            purchaseDate: r.purchase_date,
            createdAt: r.created_at,
        }));
        set({ gold: mapped });
    },
    saveGold: async (asset: GoldAsset) => {
        const a: any = asset;
        const row: any = {
            id: a.id,
            owner_id: a.ownerId,
            subtype: a.subtype,
            purchase_date: a.purchaseDate,
        };
        if (a.subtype === 'physical') {
            row.grams = a.grams ?? null;
            row.soot = a.soot ?? null;
            row.price_per_gram = a.pricePerGram ?? null;
            row.total_paid_toman = a.totalPaidToman ?? 0;
            row.wage_toman = a.wageToman ?? null;
            row.invoice_ref1 = a.invoiceRef1 ?? null;
            row.invoice_ref2 = a.invoiceRef2 ?? null;
        } else if (a.subtype === 'token') {
            row.token_symbol = a.tokenSymbol;
            row.token_amount = a.tokenAmount;
            row.price_usd = a.priceUsd;
            row.price_per_gram_today = a.pricePerGramToday ?? null;
            row.total_paid_toman = a.totalPaidToman ?? 0;
            row.fee_toman = a.feeToman ?? null;
            row.custody_location = a.custodyLocation ?? null;
            row.invoice_ref = a.invoiceRef ?? null;
            row.grams_derived = a.gramsDerived ?? null;
            row.usd_rate_toman = a.usdRateToman ?? null;
        } else if (a.subtype === 'digikala') {
            row.amount_mg = a.amountMg;
            row.price_per_mg = a.pricePerMg;
            row.total_paid_toman = a.totalPaidToman ?? 0;
            row.fee_manual_toman = a.feeManualToman ?? null;
            row.fee_percent = a.feePercent ?? null;
            row.invoice_ref = a.invoiceRef ?? null;
        }
        const { error } = await supabase.from('asset_gold').upsert(row);
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Gold asset upsert error', error);
            throw error;
        }
        await get().loadGoldByOwner(asset.ownerId);
    },
}));


