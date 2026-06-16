import type { VehicleInsurance, VehicleMaintenanceRecord, VehicleExpense } from './types';

/**
 * Pure derivations for the My-Car dashboard: Persian formatters + the "smart"
 * status calculations (insurance expiry, next-service reminders, last expense).
 * All values are computed from existing data — nothing here persists anything.
 */

// ── Formatters ──────────────────────────────────────────────────────────────

/** Group + Persian digits, e.g. 2350000 → "۲٬۳۵۰٬۰۰۰". */
export function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '۰';
  return Math.round(n).toLocaleString('fa-IR');
}

/** Toman amount with the unit suffix, e.g. "۲٬۳۵۰٬۰۰۰ تومان". */
export function formatToman(n: number | null | undefined): string {
  return `${formatNum(n)} تومان`;
}

/** Jalali date label, e.g. "۱۴۰۴/۱۰/۲۳". Returns "—" for missing input. */
export function formatJalali(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fa-IR');
  } catch {
    return String(iso);
  }
}

/** Kilometre reading, e.g. 123000 → "۱۲۳٬۰۰۰ کیلومتر". */
export function formatKm(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${formatNum(n)} کیلومتر`;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Parse a `YYYY-MM-DD` (or longer ISO) string to a local midnight Date. */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function todayMidnight(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Whole days from today until `iso` (negative = in the past). */
export function daysUntil(iso: string): number {
  const ms = parseLocalDate(iso).getTime() - todayMidnight().getTime();
  return Math.round(ms / 86_400_000);
}

// ── Insurance status ─────────────────────────────────────────────────────────

export type StatusTone = 'emerald' | 'amber' | 'rose' | 'slate' | 'brand';
export type InsuranceState = 'active' | 'expiring' | 'expired' | 'none';

export interface InsuranceStatus {
  state: InsuranceState;
  label: string;
  tone: StatusTone;
  endDate?: string;
  daysLeft?: number;
}

/** Coverage is "expiring" when it ends within this many days. */
export const INSURANCE_SOON_DAYS = 30;

/**
 * Picks the insurance with the furthest end date (your longest coverage) and
 * classifies it as active / expiring-soon / expired. No insurance → "none".
 */
export function computeInsuranceStatus(insurances: VehicleInsurance[]): InsuranceStatus {
  const dated = insurances.filter((i) => !!i.endDate);
  if (dated.length === 0) {
    return { state: 'none', label: 'بدون بیمه', tone: 'slate' };
  }
  const latest = dated.reduce((a, b) => (a.endDate >= b.endDate ? a : b));
  const daysLeft = daysUntil(latest.endDate);

  if (daysLeft < 0) {
    return { state: 'expired', label: 'بیمه منقضی', tone: 'rose', endDate: latest.endDate, daysLeft };
  }
  if (daysLeft <= INSURANCE_SOON_DAYS) {
    return { state: 'expiring', label: 'نزدیک انقضا', tone: 'amber', endDate: latest.endDate, daysLeft };
  }
  return { state: 'active', label: 'بیمه فعال', tone: 'emerald', endDate: latest.endDate, daysLeft };
}

// ── Service status ───────────────────────────────────────────────────────────

export interface ServiceStatus {
  count: number;
  /** The "current" next-service target (from the most recent service that set one). */
  nextDate?: string;
  daysLeft?: number;
  overdue: boolean;
  dueSoon: boolean;
}

/** A scheduled next-service is "due soon" within this many days. */
export const SERVICE_SOON_DAYS = 14;

export function computeServiceStatus(records: VehicleMaintenanceRecord[]): ServiceStatus {
  const count = records.length;
  // The most recent service (by date) that scheduled a follow-up defines the target.
  const withNext = records
    .filter((r) => !!r.nextServiceDate)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  if (withNext.length === 0) {
    return { count, overdue: false, dueSoon: false };
  }
  const nextDate = withNext[0].nextServiceDate!;
  const daysLeft = daysUntil(nextDate);
  return {
    count,
    nextDate,
    daysLeft,
    overdue: daysLeft < 0,
    dueSoon: daysLeft >= 0 && daysLeft <= SERVICE_SOON_DAYS,
  };
}

// ── Last expense ─────────────────────────────────────────────────────────────

export interface LastExpense {
  amount: number;
  date: string;
  category: string;
}

export function lastExpenseOf(expenses: VehicleExpense[]): LastExpense | null {
  if (expenses.length === 0) return null;
  const latest = expenses.reduce((a, b) => (a.date >= b.date ? a : b));
  return { amount: latest.amount, date: latest.date, category: latest.category };
}

export function totalExpenses(expenses: VehicleExpense[]): number {
  return expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}
