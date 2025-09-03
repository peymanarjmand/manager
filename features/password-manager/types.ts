import { ReactNode } from 'react';

export type PasswordCategory = 'emails' | 'banks' | 'accounts' | 'wallets' | 'exchanges';

export interface BasePasswordEntry {
    id: string;
    category: PasswordCategory;
    image?: string; // base64
    description?: string;
}

export interface EmailEntry extends BasePasswordEntry {
    category: 'emails';
    email: string;
    password?: string;
    phone?: string;
    backupEmail?: string;
}

export interface BankEntry extends BasePasswordEntry {
    category: 'banks';
    bankName: string;
    cardNumber?: string;
    cardPin?: string;
    mobileBankUser?: string;
    mobileBankPass?: string;
}

export interface AccountEntry extends BasePasswordEntry {
    category: 'accounts';
    website: string;
    username?: string;
    password?: string;
}

export interface WalletEntry extends BasePasswordEntry {
    category: 'wallets';
    walletName: string;
    address?: string;
    seedPhrase?: string; // With a strong warning
}

export interface ExchangeEntry extends BasePasswordEntry {
    category: 'exchanges';
    exchangeName: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    twoFA?: boolean;
}

export type AnyPasswordEntry = EmailEntry | BankEntry | AccountEntry | WalletEntry | ExchangeEntry;

export interface PasswordCategoryInfo {
    id: PasswordCategory;
    title: string;
    icon: ReactNode;
}
