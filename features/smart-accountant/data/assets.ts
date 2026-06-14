// Data-access mapping for assets. Pure functions; row shape mirrors `assets`.
import { Asset } from '../types';

export const ASSET_COLUMNS = 'id,name,current_value,quantity,purchase_date,notes,owner_id';

export const mapAssetRow = (r: any): Asset => ({
    id: r.id,
    name: r.name,
    currentValue: Number(r.current_value) || 0,
    quantity: Number(r.quantity) || 0,
    purchaseDate: r.purchase_date,
    notes: r.notes || undefined,
    ownerId: r.owner_id || undefined,
});

export const assetToRow = (a: Asset) => ({
    id: a.id,
    name: a.name,
    current_value: Number(a.currentValue) || 0,
    quantity: Number(a.quantity) || 0,
    purchase_date: a.purchaseDate,
    notes: a.notes || null,
    owner_id: a.ownerId || null,
});
