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
    ownerId?: string; // owner (asset_people.id) optional
}

// A person for tracking debts and credits
export interface Person {
    id: string;
    name: string;
    avatar?: string; // base64
}

export type LedgerUnit = 'toman' | 'gold_mg' | 'btc' | 'usdt';

// A single entry in a ledger with a person
export interface LedgerEntry {
    id:string;
    personId: string;
    type: 'debt' | 'credit'; // debt: they owe me, credit: I owe them
    amount: number;
    unit?: LedgerUnit; // default: 'toman' for backward compatibility
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
    penalty?: number;
}

export interface InstallmentPlan {
    id: string;
    title: string;
    loanAmount?: number; // The initial amount of the loan/purchase
    payments: InstallmentPayment[];
}

// New Types for Checks
export type CheckStatus = 'pending' | 'cashed' | 'bounced';

export interface Check {
    id: string;
    type: 'issued' | 'received'; // صادره یا دریافتی
    amount: number;
    dueDate: string; // ISO string
    subject: string;
    sayyadId: string;
    status: CheckStatus;
    description?: string;
    cashedDate?: string; // ISO string

    // if type === 'issued'
    payeeName?: string; // در وجه
    payeeNationalId?: string;

    // if type === 'received'
    drawerName?: string; // صادر کننده
    drawerNationalId?: string;
}


// Monthly fund (opening cash per Jalali month)
export interface MonthlyFund {
    id: string; // e.g., "1404-08"
    year: number; // Jalali year
    month: number; // 1-12 (Jalali month index)
    openingAmount: number; // Opening cash at start of month
    note?: string;
}

// The whole state for the accountant module
export interface AccountantData {
    transactions: Transaction[];
    assets: Asset[];
    people: Person[];
    ledger: Record<string, LedgerEntry[]>; // key is personId
    installments: InstallmentPlan[];
    checks: Check[];
    funds?: MonthlyFund[]; // optional for backward compatibility
}

// Darfak (house build) expense
export interface DarfakExpense {
    id: string;
    title: string;
    amount: number;
    date: string; // ISO
    tags: string[]; // e.g., ['#مصالح', '#دستمزد']
    note?: string;
    attachment?: string; // ref to image in storage
}

// Social Insurance (Tamin Ejtemaei) monthly payment record
export interface SocialInsurancePayment {
    id: string;
    year: number; // e.g., 1404
    month: number; // 1-12 (jalali)
    daysCovered: number; // number of insured days this month (0-31)
    amount: number; // Rial or Toman depending on app (we use Toman as elsewhere)
    registeredSalary?: number; // حقوق ثبت‌شده مبنا
    payDate: string; // ISO
    receiptRef?: string; // Supabase storage ref or URL
    note?: string;
    isSettled?: boolean; // if true, lock editing/deleting
}