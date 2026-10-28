import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localConfig as cfg } from "./local-config";
if (cfg.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Local database only");
const client = (key: string) =>
  createClient(cfg.API_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: crypto.randomUUID(),
    },
  });
const admin = client(cfg.SERVICE_ROLE_KEY),
  owner = client(cfg.ANON_KEY),
  other = client(cfg.ANON_KEY),
  anon = client(cfg.ANON_KEY);
const planId = crypto.randomUUID();
const makeReceipt = (amount: number) => ({
  id: crypto.randomUUID(),
  amount,
  paidAt: "2026-10-28T12:00:00Z",
  method: "انتقال بانکی",
});
async function payment(amount = 20000000, extra = {}) {
  const id = crypto.randomUUID();
  const { error } = await owner
    .from("installment_payments")
    .insert({
      id,
      plan_id: planId,
      amount,
      due_date: "2026-10-28T12:00:00Z",
      ...extra,
    });
  expect(error).toBeNull();
  return id;
}
const record = (id: string, r: ReturnType<typeof makeReceipt>, c = owner) =>
  c.rpc("record_installment_receipt", { p_payment_id: id, p_receipt: r });
beforeAll(async () => {
  for (const c of [owner, other]) {
    const email = `installments-${crypto.randomUUID()}@example.test`,
      password = "isolated-test-password-123";
    expect(
      (
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
      ).error,
    ).toBeNull();
    expect(
      (await c.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
  }
  expect(
    (
      await owner
        .from("installment_plans")
        .insert({ id: planId, title: "وام آزمایشی" })
    ).error,
  ).toBeNull();
});
describe("installment receipt database invariants", () => {
  it("settles five transfers, retries idempotently and voids without losing history", async () => {
    const id = await payment();
    const parts = [5000000, 2000000, 4000000, 3000000, 6000000].map(
      makeReceipt,
    );
    for (const r of parts) expect((await record(id, r)).error).toBeNull();
    const retry = await record(id, parts[4]);
    expect(retry.error).toBeNull();
    expect(retry.data.receipt_history).toHaveLength(5);
    expect(retry.data.is_paid).toBe(true);
    expect((await record(id, makeReceipt(1))).error).toBeTruthy();
    const voided = await owner.rpc("void_installment_receipt", {
      p_payment_id: id,
      p_receipt_id: parts[0].id,
    });
    expect(voided.error).toBeNull();
    expect(voided.data.is_paid).toBe(false);
    expect(voided.data.receipt_history).toHaveLength(5);
    expect(voided.data.receipt_history[0].voidedAt).toBeTruthy();
    expect(
      (
        await owner
          .from("installment_payments")
          .update({ receipt_history: [] })
          .eq("id", id)
      ).error,
    ).toBeTruthy();
    expect(
      (
        await owner
          .from("installment_payments")
          .update({ amount: 14000000 })
          .eq("id", id)
      ).error,
    ).toBeTruthy();
    expect(
      (
        await owner
          .from("installment_payments")
          .update({ is_paid: true })
          .eq("id", id)
      ).error,
    ).toBeNull();
    expect(
      (
        await owner
          .from("installment_payments")
          .select("is_paid")
          .eq("id", id)
          .single()
      ).data?.is_paid,
    ).toBe(false);
  });
  it("serializes simultaneous transfers and denies other users and anonymous callers", async () => {
    const id = await payment(100);
    const results = await Promise.all([
      record(id, makeReceipt(80)),
      record(id, makeReceipt(80)),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect((await record(id, makeReceipt(1), other)).error).toBeTruthy();
    expect((await record(id, makeReceipt(1), anon)).error).toBeTruthy();
    expect(
      (await other.from("installment_payments").select("*").eq("id", id)).data,
    ).toEqual([]);
  });
  it("preserves legacy settlements and supports more than 1500 receipt records", async () => {
    const legacy = await payment(100, {
      is_paid: true,
      paid_date: "2026-01-01T00:00:00Z",
    });
    expect((await record(legacy, makeReceipt(1))).error).toBeTruthy();
    expect(
      (
        await owner
          .from("installment_payments")
          .select("is_paid,paid_date,receipt_history")
          .eq("id", legacy)
          .single()
      ).data,
    ).toMatchObject({ is_paid: true, receipt_history: [] });
    const id = await payment(2000000, {
      receipt_history: Array.from({ length: 1500 }, () => makeReceipt(1000)),
    });
    const r = await record(id, makeReceipt(1000));
    expect(r.error).toBeNull();
    expect(r.data.receipt_history).toHaveLength(1501);
  });
});
