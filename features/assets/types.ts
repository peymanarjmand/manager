export type GoldSubtype = 'physical' | 'token' | 'digikala';

export interface AssetGoldBase {
    id: string;
    ownerId: string; // asset_people.id
    subtype: GoldSubtype;
    purchaseDate: string; // ISO
    createdAt?: string; // ISO
}

export interface GoldPhysical extends AssetGoldBase {
    subtype: 'physical';
    grams?: number; // total grams
    soot?: number; // sookht
    pricePerGram?: number; // toman
    totalPaidToman: number; // toman
    wageToman?: number; // auto-calculated, stored for history
    invoiceRef1?: string; // lm-images ref
    invoiceRef2?: string; // lm-images ref
}

export interface GoldToken extends AssetGoldBase {
    subtype: 'token';
    tokenSymbol: 'xaut' | 'paxg';
    tokenAmount: number; // amount of token
    priceUsd: number; // USD price at buy
    priceToman: number; // Toman price at buy
    totalPaidToman: number; // total paid in Toman
    feeToman?: number; // auto-calculated fee in Toman
    custodyLocation?: string; // e.g., Nobitex, Trust Wallet
    invoiceRef?: string; // optional
}

export interface GoldDigikala extends AssetGoldBase {
    subtype: 'digikala';
    amountMg: number; // mg purchased
    pricePerMg: number; // toman per mg at purchase
    totalPaidToman: number; // total order amount
    orderDate?: string; // alias of purchaseDate
    feeManualToman?: number; // manually entered fee
    feePercent?: number; // derived percent
    invoiceRef?: string; // optional invoice
}

export type GoldAsset = GoldPhysical | GoldToken | GoldDigikala;
