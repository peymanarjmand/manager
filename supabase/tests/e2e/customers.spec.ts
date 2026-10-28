import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { localConfig as cfg } from "../local-config";
if (cfg.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Only localhost tests are authorized.");
const admin = createClient(cfg.API_URL, cfg.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
test("mobile customer dossier, financial acceptance, encryption, offline retry and auto-lock", async ({
  page,
  context,
}) => {
  const email = `browser-${crypto.randomUUID()}@example.test`,
    password = "local-browser-password-123";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/rest/v1/") || r.url().includes("/storage/v1/"))
      requests.push(r.postData() || "");
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**hzloraflhftrxcokbvkv**", (route) => route.abort());
  await page.goto("/");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ابزارها" })).toBeVisible();
  const tools = page.locator("main .grid.grid-cols-4 button");
  const expected = [
    "خودروی من",
    "حسابدار هوشمند",
    "مشتریان",
    "کارهای روزانه",
    "داشبورد سلامتی",
    "مدیر رمز عبور",
    "دارایی‌ها",
    "تنظیمات",
    "دفترتلفن",
  ];
  expect(await tools.allTextContents()).toEqual(expected);
  await context.setOffline(true);
  expect(await tools.allTextContents()).toEqual(expected);
  await context.setOffline(false);
  await page.getByRole("button", { name: "مشتریان", exact: true }).click();
  await page.getByLabel("رمز جدید خزانه، حداقل ۱۲ نویسه").fill(password);
  await page.getByLabel("تکرار رمز خزانه").fill(password);
  await page.getByRole("button", { name: "ساخت خزانه", exact: true }).click();
  await expect(page.getByLabel("کلید بازیابی", { exact: true })).toBeVisible();
  await page.getByLabel("کلید را در محل امن ذخیره کردم.").check();
  await page.getByRole("button", { name: "تأیید و ورود" }).click();
  await page.getByRole("button", { name: "آماده‌سازی و بررسی بکاپ" }).click();
  await expect(
    page.getByRole("button", { name: "دریافت بکاپ رمز‌شده" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "دریافت بکاپ رمز‌شده" }).click();
  await download;
  await page
    .getByLabel("بکاپ را ذخیره کردم و رمز یا کلید بازیابی را دارم.")
    .check();
  await page.getByRole("button", { name: "نهایی‌کردن انتقال" }).click();
  await page.getByRole("button", { name: "مشتری جدید" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("نام *", { exact: true }).fill("مشتری امن");
  await dialog
    .getByLabel("نام خانوادگی *", { exact: true })
    .fill("آزمایش موبایل");
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("حداقل یک موبایل");
  await dialog.getByLabel("موبایل 1", { exact: true }).fill("۰۹۱۲۳۴۵۶۷۸۹");
  await dialog.getByLabel(/تاریخ تولد/).fill("۱۳۳۰/۰۱/۰۱");
  await context.setOffline(true);
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("اینترنت");
  await expect(dialog.getByLabel("نام *", { exact: true })).toHaveValue(
    "مشتری امن",
  );
  await context.setOffline(false);
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "مشتری امن آزمایش موبایل" }),
  ).toBeVisible();
  await expect(page.getByLabel("تاریخ تولد", { exact: true })).toHaveValue(
    "۱۳۳۰/۰۱/۰۱",
  );
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#20a090";
    ctx.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("افزودن روی کارت ملی", { exact: true }).setInputFiles({
    name: "identity-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await page
    .getByRole("heading", { name: "روی کارت ملی", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "روی کارت ملی", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "دانلود اصل", exact: true }).click();
  const imageFile = await imageDownload;
  expect(imageFile.suggestedFilename()).toBe("identity-test.png");
  expect(readFileSync((await imageFile.path())!)).toEqual(
    Buffer.from(image, "base64"),
  );
  await page.getByRole("button", { name: "پروژه‌ها", exact: true }).click();
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان پروژه *").fill("وب‌سایت اول");
  await dialog.getByLabel(/مبلغ توافق‌شده/).fill("9000000");
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.getByRole("button", { name: "مالی", exact: true }).click();
  await expect(
    page.getByText("تسویه · ۰ تومان", { exact: true }),
  ).toBeVisible();
  const addLedger = async (type: string, title: string, value: string) => {
    await page.getByRole("button", { name: "افزودن", exact: true }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("نوع عملیات").selectOption(type);
    await d.getByLabel("عنوان *", { exact: true }).fill(title);
    await d.getByLabel("مبلغ (تومان) *").fill(value);
    if (type === "receipt")
      await d.getByLabel("روش دریافت یا پرداخت").selectOption("انتقال بانکی");
    if (type === "expense")
      await d
        .getByLabel("پروژهٔ مرتبط (اختیاری)")
        .selectOption({ label: "وب‌سایت اول" });
    await d.getByRole("button", { name: "ذخیره", exact: true }).click();
    await expect(d).not.toBeVisible();
  };
  await addLedger("expense", "خرید سرور", "5000000");
  await addLedger("receipt", "دریافت اول", "2000000");
  await expect(
    page.getByText("مشتری بدهکار است · ۳٬۰۰۰٬۰۰۰ تومان", { exact: true }),
  ).toBeVisible();
  await addLedger("receipt", "دریافت اضافه", "4000000");
  await expect(
    page.getByText("مشتری بستانکار است · ۱٬۰۰۰٬۰۰۰ تومان", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/customers-mobile-ledger.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "حساب‌ها و سرویس‌ها", exact: true })
    .click();
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  dialog = page.getByRole("dialog");
  const ssh = dialog.getByLabel("اطلاعات SSH", { exact: true });
  await expect(ssh).toHaveJSProperty("readOnly", true);
  await ssh
    .locator("..")
    .locator("..")
    .getByRole("button", { name: "نمایش مقدار" })
    .click();
  const multiline =
    "-----BEGIN TEST KEY-----\nmultiline-fixture-key\n-----END TEST KEY-----";
  await ssh.fill(multiline);
  await ssh
    .locator("..")
    .locator("..")
    .getByRole("button", { name: "پنهان کردن" })
    .click();
  await ssh
    .locator("..")
    .locator("..")
    .getByRole("button", { name: "نمایش مقدار" })
    .click();
  await expect(ssh).toHaveValue(multiline);
  await dialog.getByLabel("عنوان رکورد *").fill("درگاه دیجی‌پی");
  await dialog.getByLabel("نوع حساب یا سرویس").selectOption("digipay");
  await dialog.getByLabel("شناسه محرمانه client_id").fill("a-secret-client");
  await dialog
    .getByLabel("رمز عبور محرمانه client_secret")
    .fill("۱۲۳ secret:test");
  await dialog.getByRole("button", { name: "ساخت Header نوع Basic" }).click();
  await expect(
    dialog.getByLabel("Authorization Header", { exact: true }),
  ).toHaveValue(/^Basic /);
  await dialog.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(requests.join("")).not.toContain("a-secret-client");
  expect(requests.join("")).not.toContain("multiline-fixture-key");
  expect(requests.join("")).not.toContain("مشتری امن");
  expect(requests.join("")).not.toContain("5000000");
  const stores = await page.evaluate(async () => {
    const entries: unknown[] = [];
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const name of Array.from(db.objectStoreNames)) {
        const values = await new Promise<unknown[]>((resolve, reject) => {
          const request = db
            .transaction(name, "readonly")
            .objectStore(name)
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        entries.push(...values);
      }
      db.close();
    }
    return {
      local: Object.values(localStorage),
      entries,
      caches: await caches.keys(),
    };
  });
  expect(stores.entries).toEqual([]);
  expect(stores.caches).toEqual([]);
  expect(JSON.stringify(stores)).not.toContain("a-secret-client");
  expect(JSON.stringify(stores)).not.toContain("مشتری امن");
  await page.clock.setFixedTime(new Date(Date.now() + 601000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "باز کردن خزانه" }),
  ).toBeVisible();
  await expect(
    page.getByText("درگاه دیجی‌پی", { exact: true }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});
