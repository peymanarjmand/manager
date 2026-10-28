import moment from "jalali-moment";
import type { Customer, Entity, LedgerEntry, ServiceRecord } from "./types";
export function digits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
}
export function validateCustomer(value: Customer): string | null {
  if (!value.firstName.trim() || !value.lastName.trim())
    return "نام و نام خانوادگی الزامی است.";
  const mobiles = value.mobiles
    .map((x) => digits(x.value).replace(/[\s()-]/g, ""))
    .filter(Boolean);
  const emails = value.emails.map((x) => x.value.trim()).filter(Boolean);
  if (!mobiles.length && !emails.length)
    return "حداقل یک موبایل یا یک ایمیل وارد کنید.";
  if (mobiles.some((x) => !/^(?:09\d{9}|\+\d{8,15}|0098\d{10})$/.test(x)))
    return "شماره موبایل معتبر وارد کنید.";
  if (emails.some((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))
    return "ایمیل معتبر وارد کنید.";
  if (value.nationalId && !/^\d{10}$/.test(digits(value.nationalId)))
    return "کد ملی باید ۱۰ رقم باشد.";
  return null;
}
export function amount(value: string): bigint {
  const normalized = digits(value).replace(/[,٬\s]/g, "");
  if (!/^\d+$/.test(normalized) || normalized.length > 20)
    throw new Error("مبلغ صحیح تومانی وارد کنید.");
  return BigInt(normalized);
}
export function ledgerDelta(entry: LedgerEntry): bigint {
  if (entry.voided) return 0n;
  const n = amount(entry.amount);
  if (
    entry.type === "receipt" ||
    entry.type === "owe" ||
    (entry.type === "opening" && entry.openingDirection === "payable")
  )
    return -n;
  return n;
}
export function balance(entries: Entity<LedgerEntry>[]): bigint {
  return entries
    .filter((e) => !e.archived_at)
    .reduce((sum, e) => sum + ledgerDelta(e.data), 0n);
}
export function toman(value: bigint | string): string {
  return `${BigInt(value).toLocaleString("fa-IR")} تومان`;
}
export function balanceLabel(value: bigint): string {
  return value > 0n
    ? "مشتری بدهکار است"
    : value < 0n
      ? "مشتری بستانکار است"
      : "تسویه";
}
export function validateLedger(entry: LedgerEntry): string | null {
  if (!entry.title.trim()) return "عنوان ثبت الزامی است.";
  try {
    if (amount(entry.amount) <= 0n) return "مبلغ باید بیشتر از صفر باشد.";
  } catch (e) {
    return (e as Error).message;
  }
  if (!Number.isFinite(Date.parse(entry.occurredAt)))
    return "تاریخ و ساعت معتبر وارد کنید.";
  if (["receipt", "payment"].includes(entry.type) && !entry.method)
    return "روش دریافت یا پرداخت را مشخص کنید.";
  return null;
}
export function jalaliDate(date?: string): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date.length === 10 ? `${date}T12:00:00+03:30` : date));
}
export function tehranDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
export function localTehranInput(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (key: string) => parts.find((x) => x.type === key)?.value || "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}
export function tehranLocalToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const target = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(target)) return null;
  let guess = target;
  for (let n = 0; n < 4; n++) {
    const local = localTehranInput(new Date(guess).toISOString());
    const displayed = Date.parse(`${local.date}T${local.time}:00Z`);
    const difference = target - displayed;
    if (!difference) return new Date(guess).toISOString();
    guess += difference;
  }
  return null; // Reject nonexistent clock times during historic DST changes.
}
export function renewalGroup(
  date: string,
  now = new Date(),
): "overdue" | "week" | "month" | null {
  const today = localTehranInput(now.toISOString()).date;
  const days = Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
      86400000,
  );
  return days < 0
    ? "overdue"
    : days <= 7
      ? "week"
      : days <= 30
        ? "month"
        : null;
}
export function safeSearch(record: ServiceRecord): string {
  return [
    record.title,
    record.type,
    record.fields.username,
    record.fields.email,
    record.fields.domain,
    record.fields.provider,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fa");
}
export function jalaliToDate(value: string): string | null {
  const normalized = digits(value).trim();
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) return null;
  try {
    const date = moment(normalized, "jYYYY/jM/jD", true);
    return date.isValid() &&
      date.format("jYYYY/jM/jD") === normalized.split("/").map(Number).join("/")
      ? date.format("YYYY-MM-DD")
      : null;
  } catch {
    // The calendar library throws for years outside its supported range.
    return null;
  }
}
