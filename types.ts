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

// NOTE: Smart Accountant domain types (Transaction, Asset, Person, LedgerEntry,
// InstallmentPayment, InstallmentPlan, AccountantData) are defined canonically in
// features/smart-accountant/types.ts. Stale duplicate copies that used to live here
// were removed to keep a single source of truth and avoid divergence.

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
  | 'my-car'
  | 'daily-tasks'
  | 'assets'
  | 'darfak';
