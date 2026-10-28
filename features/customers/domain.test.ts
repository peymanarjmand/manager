import { describe, expect, it } from "vitest";
import {
  balance,
  digits,
  jalaliToDate,
  ledgerDelta,
  localTehranInput,
  renewalGroup,
  safeSearch,
  tehranLocalToIso,
  validateCustomer,
  validateLedger,
} from "./domain";
import type { Customer, Entity, LedgerEntry, ServiceRecord } from "./types";
const entry = (
  type: LedgerEntry["type"],
  amount: string,
  extras: Partial<LedgerEntry> = {},
): LedgerEntry => ({
  type,
  amount,
  title: "آزمون",
  occurredAt: "2026-10-27T10:30:00Z",
  ...extras,
});
const row = (data: LedgerEntry, extra = {}) =>
  ({ id: crypto.randomUUID(), data, ...extra }) as Entity<LedgerEntry>;
describe("customer ledger exact arithmetic", () => {
  it("handles server expense, receipt and overpayment without project balances", () => {
    const rows = [
      row(entry("expense", "5000000")),
      row(entry("receipt", "2000000")),
    ];
    expect(balance(rows)).toBe(3000000n);
    rows.push(row(entry("receipt", "4000000")));
    expect(balance(rows)).toBe(-1000000n);
  });
  it("does not add previous versions, voided entries or archived entries", () => {
    expect(
      balance([
        row(entry("charge", "9007199254740993")),
        row(entry("expense", "40", { voided: true })),
        row(entry("receipt", "10"), { archived_at: "2026-01-01" }),
      ]),
    ).toBe(9007199254740993n);
  });
  it("supports debt, refunds and both directions of opening balance", () => {
    expect(ledgerDelta(entry("owe", "200"))).toBe(-200n);
    expect(ledgerDelta(entry("payment", "200"))).toBe(200n);
    expect(
      ledgerDelta(entry("opening", "200", { openingDirection: "payable" })),
    ).toBe(-200n);
  });
  it("rejects invalid amounts, timestamps and missing payment methods", () => {
    expect(validateLedger(entry("charge", "1.5"))).toBeTruthy();
    expect(validateLedger(entry("expense", "0"))).toBeTruthy();
    expect(validateLedger(entry("receipt", "5"))).toBeTruthy();
    expect(
      validateLedger(entry("charge", "5", { occurredAt: "" })),
    ).toBeTruthy();
  });
});
describe("customer identity, dates and search", () => {
  const c: Customer = {
    firstName: "علی",
    lastName: "آزمایشی",
    mobiles: [],
    emails: [],
    phones: [],
  };
  it("requires both names and at least one valid mobile or email", () => {
    expect(validateCustomer(c)).toBeTruthy();
    expect(
      validateCustomer({
        ...c,
        emails: [{ label: "", value: "test@example.com" }],
      }),
    ).toBeNull();
    expect(
      validateCustomer({
        ...c,
        mobiles: [{ label: "", value: "۰۹۱۲۳۴۵۶۷۸۹" }],
      }),
    ).toBeNull();
    expect(
      validateCustomer({
        ...c,
        firstName: " ",
        emails: [{ label: "", value: "a@b.com" }],
      }),
    ).toBeTruthy();
  });
  it("does not turn an empty birthday into today and accepts older years", () => {
    expect(jalaliToDate("")).toBeNull();
    expect(jalaliToDate("۱۳۳۰/۰۱/۰۱")).toBe("1951-03-22");
    expect(jalaliToDate("۱۴۰۲/۱۲/۳۰")).toBeNull();
  });
  it.each([
    "۱",
    "۱۳۳۰/",
    "۱۳۳۰/۰۱/",
    "invalid",
    "۹۹۹۹/۰۱/۰۱",
    "۱۴۰۲/۱۳/۰۱",
    "۱۴۰۲/۰۲/۳۲",
  ])("rejects incomplete or unsupported dates without throwing: %s", (value) => {
    expect(jalaliToDate(value)).toBeNull();
  });
  it("round trips Tehran time independent of the host time zone, including historic DST", () => {
    for (const iso of [
      "2026-10-27T10:30:00.000Z",
      "2020-07-01T10:30:00.000Z",
    ]) {
      const local = localTehranInput(iso);
      expect(tehranLocalToIso(local.date, local.time)).toBe(iso);
    }
    expect(tehranLocalToIso("invalid", "10:30")).toBeNull();
  });
  it("groups exact local calendar dates and excludes secrets from search", () => {
    const now = new Date("2026-10-27T10:00:00Z");
    expect(renewalGroup("2026-10-26", now)).toBe("overdue");
    expect(renewalGroup("2026-11-03", now)).toBe("week");
    expect(renewalGroup("2026-11-04", now)).toBe("month");
    const r: ServiceRecord = {
      title: "GitHub",
      type: "github",
      fields: {
        username: "alice",
        password: "very-secret",
        token: "secret-token",
      },
      notes: "private",
      customFields: [],
      recoveryCodes: [],
      projectIds: [],
    };
    expect(safeSearch(r)).toContain("alice");
    expect(safeSearch(r)).not.toContain("secret");
    expect(digits("۰۱۲٣٤")).toBe("01234");
  });
});
