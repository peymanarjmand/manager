import { ReactNode } from 'react';

export interface DashboardItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
}

// New Types for Settings
export interface PomodoroSettings {
    focusDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    sessionsPerRound: number;
}

export interface AlertSettings {
    eyeStrainAlertEnabled: boolean;
    eyeStrainInterval: number; // in minutes
    eyeStrainMessage: string;
    soundEnabled: boolean;
}

export interface Settings extends PomodoroSettings, AlertSettings {}


// New Types for Password Manager
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

// Types for Smart Accountant

// A single financial transaction (expense or income)
export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string; // e.g., 'Food', 'Salary'
    date: string; // ISO string, to be parsed by moment
    receiptImage?: string; // base64
}

// A personal asset
export interface Asset {
    id: string;
    name: string;
    currentValue: number;
    quantity: number;
    purchaseDate: string; // ISO string
    notes?: string;
}

// A person for tracking debts and credits
export interface Person {
    id: string;
    name: string;
    avatar?: string; // base64
}

// A single entry in a ledger with a person
export interface LedgerEntry {
    id:string;
    personId: string;
    type: 'debt' | 'credit'; // debt: they owe me, credit: I owe them
    amount: number;
    description: string;
    date: string; // ISO string
    isSettled: boolean;
    receiptImage?: string; // base64
}

// New Types for Installments
export interface InstallmentPayment {
    id: string; // e.g., planId-0, planId-1
    dueDate: string; // ISO string
    amount: number;
    isPaid: boolean;
    paidDate?: string; // ISO string, set when marked as paid
}

export interface InstallmentPlan {
    id: string;
    title: string;
    loanAmount?: number; // The initial amount of the loan/purchase
    payments: InstallmentPayment[];
}


// The whole state for the accountant module
export interface AccountantData {
    transactions: Transaction[];
    assets: Asset[];
    people: Person[];
    ledger: Record<string, LedgerEntry[]>; // key is personId
    installments: InstallmentPlan[];
}

// New Types for Phone Book
export interface TypedEntry {
    type: string;
    value: string;
}

export interface Contact {
    id: string;
    fn: string; // Formatted Name
    tels: TypedEntry[];
    emails: TypedEntry[];
    photo?: string; // base64 data URI
    note?: string;
    org?: string;
    title?: string;
}