import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig as cfg } from "../local-config";
const admin = createClient(cfg.API_URL, cfg.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("installment partial payments, grouped amounts, 24-hour time and completed plans", async ({
  page,
  context,
}) => {
  const email = `installment-ui-${crypto.randomUUID()}@example.test`,
    password = "test-ui-password-123";
  const user = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(user.error).toBeNull();
  const userId = user.data.user!.id,
    planId = crypto.randomUUID(),
    legacyId = crypto.randomUUID(),
    paymentId = crypto.randomUUID();
  const now = new Date().toISOString();
  expect(
    (
      await admin.from("installment_plans").insert([
        {
          id: planId,
          user_id: userId,
          title: "وام پرداخت مرحله‌ای",
          loan_amount: 20000000,
        },
        {
          id: legacyId,
          user_id: userId,
          title: "وام تمام‌شدهٔ قدیمی",
          loan_amount: 1000000,
        },
      ])
    ).error,
  ).toBeNull();
  expect(
    (
      await admin.from("installment_payments").insert([
        {
          id: paymentId,
          user_id: userId,
          plan_id: planId,
          amount: 20000000,
          due_date: now,
        },
        {
          id: crypto.randomUUID(),
          user_id: userId,
          plan_id: legacyId,
          amount: 1000000,
          due_date: now,
          is_paid: true,
          paid_date: now,
        },
      ])
    ).error,
  ).toBeNull();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**hzloraflhftrxcokbvkv**", (r) => r.abort());
  await page.goto("/");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page
    .getByRole("button", { name: "حسابدار هوشمند", exact: true })
    .click();
  await page.getByRole("button", { name: "اقساط", exact: true }).click();
  await expect(
    page.getByText("وام تمام‌شدهٔ قدیمی", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("heading", { name: "وام پرداخت مرحله‌ای", exact: true })
    .click();
  await page
    .getByRole("button", { name: "پرداخت مرحله‌ای", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const amount = dialog.getByLabel("مبلغ این مرحله (تومان) *");
  await amount.pressSequentially("۵۰۰۰۰۰۰");
  await expect(amount).toHaveValue("5,000,000");
  // Editing in the middle must preserve the caret and the actual stored amount.
  await amount.evaluate((el: HTMLInputElement) => el.setSelectionRange(1, 1));
  await amount.pressSequentially("2");
  await expect(amount).toHaveValue("52,000,000");
  await amount.press("Backspace");
  await expect(amount).toHaveValue("5,000,000");
  await dialog.getByLabel("ساعت پرداخت (۲۴ساعته) *").fill("۱۵:۳۰");
  await expect(dialog.getByLabel("ساعت پرداخت (۲۴ساعته) *")).toHaveValue(
    "15:30",
  );
  await context.setOffline(true);
  await dialog
    .getByRole("button", { name: "ثبت پرداخت مرحله", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("اینترنت");
  await expect(amount).toHaveValue("5,000,000");
  await context.setOffline(false);
  for (const [index, value] of [
    5000000, 2000000, 4000000, 3000000, 6000000,
  ].entries()) {
    await amount.fill(String(value));
    await dialog
      .getByRole("button", { name: "ثبت پرداخت مرحله", exact: true })
      .click();
    await expect(
      dialog.getByText(`مرحلهٔ ${(index + 1).toLocaleString("fa-IR")}`, {
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(dialog.getByRole("status")).toContainText("کامل تسویه");
  await page.screenshot({
    path: "test-results/installment-receipts-mobile.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "بستن", exact: true }).click();
  await page
    .getByRole("button", { name: "بازگشت به لیست اقساط", exact: true })
    .click();
  await expect(
    page.getByText("وام پرداخت مرحله‌ای", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /مشاهدهٔ طرح‌های تسویه‌شده/ }).click();
  await expect(
    page.getByText("وام تمام‌شدهٔ قدیمی", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "وام پرداخت مرحله‌ای", exact: true })
    .click();
  await page.getByRole("button", { name: "سوابق پرداخت", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByRole("button", { name: "ابطال مرحلهٔ ۱", exact: true })
    .click();
  await expect(dialog.getByText(/باطل‌شده/)).toBeVisible();
  await expect(amount).toBeVisible();
  const saved = await admin
    .from("installment_payments")
    .select("receipt_history,is_paid")
    .eq("id", paymentId)
    .single();
  expect(saved.error).toBeNull();
  expect(saved.data!.receipt_history).toHaveLength(5);
  expect(saved.data!.is_paid).toBe(false);
  expect(saved.data!.receipt_history[0].amount).toBe(5000000);
  expect(
    new Date(saved.data!.receipt_history[0].paidAt).toISOString().slice(11, 16),
  ).toBe("12:00");
  expect(errors).toEqual([]);
});
