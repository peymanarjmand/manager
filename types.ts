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

export interface SecuritySettings {
    autoLockEnabled: boolean; // enable inactivity auto-lock
    autoLockMinutes: number; // minutes of inactivity before lock
    clipboardAutoClearEnabled: boolean; // enable auto clearing clipboard after copy
    clipboardClearSeconds: number; // seconds to clear clipboard
}

export interface Settings extends PomodoroSettings, AlertSettings, SecuritySettings {}


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

// New Types for Health Dashboard
export interface Meal {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: Date;
    time: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    notes?: string;
}

export interface Medicine {
    id: string;
    name: string;
    dosage: string;
    frequency: 'daily' | 'twice' | 'three-times' | 'as-needed';
    times: string[];
    startDate: Date;
    endDate?: Date;
    instructions?: string;
    isActive: boolean;
}

export interface MedicineIntake {
    id: string;
    medicineId: string;
    timestamp: Date;
    wasTaken: boolean;
    notes?: string;
}

export interface BloodPressureReading {
    id: string;
    systolic: number;
    diastolic: number;
    pulse: number;
    timestamp: Date;
    notes?: string;
}

export interface WeightRecord {
    id: string;
    weight: number;
    timestamp: Date;
    notes?: string;
}

export interface HealthProfile {
    height: number;
    age: number;
    gender: 'male' | 'female';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
    targetWeight?: number;
    targetBloodPressure?: {
        systolic: number;
        diastolic: number;
    };
}

export interface HealthEvent {
    id: string;
    title: string;
    type: 'medicine' | 'meal' | 'exercise' | 'appointment' | 'measurement';
    startTime: Date;
    endTime?: Date;
    recurrence?: 'daily' | 'weekly' | 'monthly';
    metadata?: Record<string, any>;
}

// Vehicle / Car Management
export type VehicleInsuranceType = 'third_party' | 'body';

export interface Vehicle {
    id: string;
    name: string; // e.g. "پراید سفید بابک"
    brand?: string;
    model?: string;
    year?: number;
    plateNumber?: string;
    color?: string;
    engineNumber?: string;
    chassisNumber?: string;
    vin?: string;
    imageRef?: string; // Supabase storage ref or data URL
    createdAt: string; // ISO
}

export interface VehicleInsurance {
    id: string;
    vehicleId: string;
    type: VehicleInsuranceType;
    company?: string;
    policyNumber?: string;
    startDate: string; // ISO date (yyyy-mm-dd)
    endDate: string;   // ISO date (yyyy-mm-dd)
    discountPercent?: number;
    premiumAmount?: number;
    coverageDescription?: string;
    documentRef?: string; // Ref for PDF/image of policy
    createdAt: string; // ISO
}

export interface VehicleMaintenanceRecord {
    id: string;
    vehicleId: string;
    serviceDate: string; // ISO date
    odometerKm?: number;
    nextOdometerKm?: number;
    itemsDescription: string; // Human readable summary
    items?: string[]; // structured list of performed service items
    nextServiceDate?: string; // ISO date
    cost?: number;
    notes?: string;
    invoiceRef?: string; // Ref for uploaded invoice (image/PDF)
    createdAt: string; // ISO
}

export interface VehicleExpense {
    id: string;
    vehicleId: string;
    date: string; // ISO date
    amount: number;
    category: string; // e.g. لوازم یدکی، سرویس، هزینه بنزین، ...
    description?: string;
    attachmentRef?: string; // receipt image/PDF ref
    maintenanceId?: string; // link back to maintenance record when auto-created
    createdAt: string; // ISO
}

export type View =
  | 'dashboard'
  | 'password-manager'
  | 'smart-accountant'
  | 'phone-book'
  | 'health-dashboard'
  | 'medical-records'
  | 'my-car';
