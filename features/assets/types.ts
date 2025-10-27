export type GoldSubtype = 'physical' | 'token' | 'digikala';
export type TransferReason = 'gift' | 'debt';

export interface GoldTransfer {
    id: string;
    goldId: string;
    fromOwnerId: string;
    toOwnerId: string;
    reason: TransferReason;
    date: string; // ISO
    fromOwnerName?: string;
    toOwnerName?: string;
}

export interface AssetGoldBase {
    id: string;
    ownerId: string; // asset_people.id
    subtype: GoldSubtype;
    purchaseDate: string; // ISO
    createdAt?: string; // ISO
}

export interface GoldPhysical extends AssetGoldBase {
    subtype: 'physical';
    title?: string; // user-provided label like ring/necklace
    grams?: number; // total grams
    soot?: number; // sookht
    pricePerGram?: number; // toman
    totalPaidToman: number; // toman
    wageToman?: number; // auto-calculated, stored for history
    invoiceRef1?: string; // lm-images ref
    invoiceRef2?: string; // lm-images ref
    soldAt?: string; // ISO date when sold
    saleTotalToman?: number; // total received in Toman when sold
    lastTransfer?: GoldTransfer; // latest transfer info (if any)
}

export interface GoldToken extends AssetGoldBase {
    subtype: 'token';
    tokenSymbol: 'xaut' | 'paxg';
    tokenAmount: number; // amount of token
    priceUsd: number; // USD price at buy
    pricePerGramToday: number; // Toman price per gram today
    totalPaidToman: number; // total paid in Toman
    feeToman?: number; // auto-calculated fee in Toman
    custodyLocation?: string; // e.g., Nobitex, Trust Wallet
    invoiceRef?: string; // optional
    gramsDerived?: number; // derived grams from totalPaid/pricePerGramToday
    usdRateToman?: number; // exchange rate used for precise fee calc
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
