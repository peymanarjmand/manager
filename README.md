## مدیر زندگی (Life Manager)

یک اپلیکیشن چندمنظوره برای مدیریت زندگی شخصی شما: مدیریت رمزها، دفتر تلفن، حسابداری هوشمند، کارهای روزانه و یک داشبورد جمع‌وجور. داده‌ها در حالت امن روی دستگاه شما نگهداری می‌شوند و در صورت تنظیم Supabase، روی ابر نیز همگام‌سازی می‌شوند.

ساخته‌شده توسط: پیمان ارجمند

- ایمیل: peymanarjmand308@gmail.com
- گیت‌هاب: peymanarjmand308@gmail.com (اکانت گیت‌هاب با همین ایمیل)
- شماره تماس: 09197881061

---

## ویژگی‌ها

- مدیریت رمزها (Password Manager)
  - دسته‌بندی‌ها: ایمیل‌ها، اطلاعات بانکی، حساب‌های وب، کیف‌پول‌ها، صرافی‌ها
  - رمزنگاری سمت کاربر با «رمز عبور اصلی» (Master Password)؛ غیرقابل بازیابی
  - افزودن/ویرایش/حذف ورودی‌ها، نگهداری امن مقادیر حساس

- دفتر تلفن (Phone Book)
  - افزودن، جستجو، گروه‌بندی الفبایی
  - وارد کردن/خروجی گرفتن vCard (فایل VCF)
  - تصویر مخاطب با ذخیره‌سازی در Supabase Storage

- حسابدار هوشمند (Smart Accountant)
  - تراکنش‌ها (درآمد/هزینه)، دارایی‌ها، اشخاص و دفتر بدهکار/بستانکار
  - اقساط: برنامه‌ها و پرداخت‌ها، مرتب‌سازی و پیگیری وضعیت پرداخت
  - چک‌ها: صادره/دریافتی، وضعیت‌ها (pending/cashed/bounced)
  - هزینه‌های «درفک» و سابقه بیمه تامین اجتماعی
  - تاریخ جلالی با jalali-moment

- کارهای روزانه (Daily Tasks)
  - پروژه‌ها، تسک‌ها، زیرتسک‌ها، وضعیت انجام و زمان تکمیل

- داشبورد و تایمر تمرکز
  - تایمر تمرکز، نمایش تاریخ/ساعت، دسترسی سریع به ماژول‌ها

- ورود با «رمز عبور اصلی»
  - اولین اجرا: تعیین رمز اصلی و ذخیره پارامترها
  - اجراهای بعدی: ورود با همان رمز؛ در صورت فراموشی، قابل بازیابی نیست

---

## شروع سریع

### پیش‌نیازها
- Node.js 18 یا جدیدتر (ترجیحاً 20+)
- npm

### نصب و اجرا (حالت توسعه)
1. نصب وابستگی‌ها:
   ```bash
   npm install
   ```
2. تنظیم متغیرهای محیطی در فایل `.env` یا `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   # اختیاری (در صورت استفاده از قابلیت‌های آتی مبتنی بر Gemini)
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
3. اجرای برنامه:
   ```bash
   npm run dev
   ```

اگر Supabase را تنظیم نکنید، برنامه پیامی با مضمون «Supabase is not configured» نمایش می‌دهد تا ابتدا مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را ست کنید.

### ساخت و پیش‌نمایش
- ساخت نهایی (Production build):
  ```bash
  npm run build
  ```
- پیش‌نمایش خروجی ساخت:
  ```bash
  npm run preview
  ```

خروجی وب در پوشه `dist` قرار می‌گیرد. یک نسخه ویندوز قابل اجرا نیز ممکن است در `release/win-unpacked` موجود باشد (`Life Manager.exe`).

---

## دیپلوی روی Netlify

برای استقرار نسخه وب:

1) پیش‌نیازها
- حساب Netlify و دسترسی به مخزن Git (GitHub/GitLab/Bitbucket)
- مقداردهی متغیرهای محیطی پروژه (در Netlify → Site settings → Environment variables):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `GEMINI_API_KEY` (اختیاری)

2) تنظیمات ساخت
- این مخزن فایل `netlify.toml` دارد؛ نیازی به تنظیم دستی نیست. اما اگر خواستید دستی تنظیم کنید:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node Version: 20 (در `netlify.toml` و `package.json` تعیین شده است)
- این پروژه یک SPA است و ریدایرکت 200 به `index.html` در `netlify.toml` تنظیم شده است.

3) مراحل دیپلوی
- در Netlify روی «Add new site → Import an existing project» کلیک کنید.
- مخزن Git را انتخاب کنید.
- متغیرهای محیطی را اضافه کنید و Deploy را بزنید.

4) روش Drag & Drop (بدون اتصال Git)
- به‌صورت محلی `npm run build` اجرا کنید و پوشه `dist` را در Netlify Deploys بکشید و رها کنید.

نکته‌ها:
- برای بارگذاری/دانلود تصاویر از باکت `lm-images` باید در Supabase ایجاد شده باشد (بخش «پیکربندی Supabase»).
- اگر پس از دیپلوی پیام «Supabase is not configured» دیدید، متغیرهای محیطی سایت را در Netlify تنظیم و دیپلوی را مجدداً اجرا کنید.

---

## پیکربندی Supabase

این اپلیکیشن بدون احراز هویت کاربر، از کلید عمومی (Anon) برای خواندن/نوشتن استفاده می‌کند. برای راه‌اندازی سریع می‌توانید سیاست‌های RLS باز (صرفاً جهت توسعه) اعمال کنید؛ اما برای محیط واقعی حتماً سیاست‌های امن و احراز هویت کاربر را پیاده‌سازی کنید.

### ایجاد باکت ذخیره‌سازی تصاویر
1. در Supabase → Storage یک باکت به نام `lm-images` بسازید.
2. دسترسی باکت را «Public» بگذارید (برای توسعه). در حالت عملیاتی پیشنهاد می‌شود دسترسی کنترل‌شده تعریف کنید.

### جداول موردنیاز (SQL)
اسکیماهای زیر مطابق استفاده داخلی اپلیکیشن هستند. این دستورات را در SQL Editor پروژه Supabase اجرا کنید.

```sql
-- جداول وضعیت/تنظیمات عمومی (JSON key-value)
create table if not exists kv_store (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists state_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists state_phone_book (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists state_accountant (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists state_password_manager (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists state_daily_tasks (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- تراکنش‌ها
create table if not exists transactions (
  id text primary key,
  type text not null check (type in ('income','expense')),
  amount numeric not null,
  description text,
  category text,
  date timestamptz not null,
  receipt_ref text
);

-- دارایی‌ها
create table if not exists assets (
  id text primary key,
  name text not null,
  current_value numeric not null default 0,
  quantity numeric not null default 0,
  purchase_date timestamptz,
  notes text
);

-- اشخاص
create table if not exists people (
  id text primary key,
  name text not null,
  avatar_ref text
);

-- دفتر بدهکار/بستانکار
create table if not exists ledger_entries (
  id text primary key,
  person_id text not null references people(id) on delete cascade,
  type text not null check (type in ('debt','credit')),
  amount numeric not null,
  description text,
  date timestamptz not null,
  is_settled boolean not null default false
);

-- برنامه‌های اقساط
create table if not exists installment_plans (
  id text primary key,
  title text not null,
  loan_amount numeric not null default 0
);

-- پرداخت‌های اقساط
create table if not exists installment_payments (
  id text primary key,
  plan_id text not null references installment_plans(id) on delete cascade,
  amount numeric not null default 0,
  due_date timestamptz not null,
  is_paid boolean not null default false,
  paid_date timestamptz,
  penalty numeric not null default 0
);

-- چک‌ها
create table if not exists checks (
  id text primary key,
  type text not null check (type in ('issued','received')),
  amount numeric not null,
  due_date timestamptz not null,
  status text not null default 'pending',
  subject text not null,
  sayyad_id text,
  payee_name text,
  payee_national_id text,
  drawer_name text,
  drawer_national_id text,
  description text,
  cashed_date timestamptz
);

-- هزینه‌های «درفک»
create table if not exists darfak_expenses (
  id text primary key,
  title text not null,
  amount numeric not null,
  date timestamptz not null,
  tags text[] default '{}',
  note text,
  attachment_ref text
);

-- پرداخت‌های بیمه تامین اجتماعی
create table if not exists social_insurance (
  id text primary key,
  year int not null,
  month int not null,
  days_covered int not null default 0,
  amount numeric not null default 0,
  pay_date timestamptz not null,
  receipt_ref text,
  note text
);
```

### RLS (فقط جهت توسعه)
برای هر جدول بالا، در صورت فعال‌سازی RLS:

```sql
alter table transactions enable row level security;
create policy "transactions_open_select" on transactions for select using (true);
create policy "transactions_open_insert" on transactions for insert with check (true);
create policy "transactions_open_update" on transactions for update using (true);
create policy "transactions_open_delete" on transactions for delete using (true);

-- همین الگو را برای سایر جداول تکرار کنید یا از UI سیاست‌های مشابه بسازید.
```

توجه: سیاست‌های فوق «باز» و ناامن هستند و فقط برای تست/توسعه توصیه می‌شوند. برای محیط عملیاتی حتماً کاربران را احراز هویت کنید و سیاست‌های دقیق‌تری بنویسید.

---

## نحوه استفاده

1) اولین اجرا → تعیین «رمز عبور اصلی» و ورود. این رمز فقط برای رمزگشایی داده‌های حساس در دستگاه شما استفاده می‌شود و قابل بازیابی نیست.

2) داشبورد → انتخاب ماژول:
- Password Manager: ورودی اضافه کنید؛ داده‌های حساس به‌صورت رمزنگاری‌شده در مرورگر ذخیره و در صورت تنظیم Supabase همگام می‌شود.
- Phone Book: مخاطب اضافه کنید، تصویر بارگذاری کنید، از vCard وارد/خروجی بگیرید.
- Smart Accountant: تراکنش، دارایی، شخص، دفتر، اقساط و چک‌ها را مدیریت کنید. تصاویر رسید/ضمائم در باکت `lm-images` ذخیره می‌شوند.
- Daily Tasks: تسک‌ها و پروژه‌ها را مدیریت کنید.

3) همگام‌سازی ابری → با تنظیم `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` فعال می‌شود. برخی داده‌ها در جداول JSON «state_*» ذخیره می‌شوند و برخی در جداول دامنه (transactions، assets و ...).

---

## ساختار پروژه (خلاصه)

- `features/` ماژول‌های اصلی (auth، dashboard، password-manager، phone-book، daily-tasks، smart-accountant، ...)
- `lib/` ابزارها: `supabase.ts`، `storage.ts` (رمزنگاری سمت کاربر)، `idb-images.ts` (Storage Supabase)
- `components/` اجزای UI مشترک
- `docs/` مستندات تکمیلی و نقشه‌راه
- `dist/` خروجی وب پس از ساخت

نکته: در Vite یک alias با نام `@` به ریشه پروژه اشاره می‌کند.

---

## نکات امنیتی مهم

- رمز عبور اصلی (Master Password) قابل بازیابی نیست. فراموشی آن به معنی عدم دسترسی به داده‌های رمزنگاری‌شده است.
- باکت `lm-images` اگر Public باشد، لینک فایل‌ها عمومی خواهد بود. در تولید، دسترسی‌ها را محدود کنید.
- بدون احراز هویت کاربری، جداول با سیاست‌های RLS باز، عمومی هستند. این وضعیت فقط برای توسعه مناسب است.
- هرگز Seed Phrase کیف پول‌ها را با افراد دیگر به اشتراک نگذارید.

---

## خطاهای رایج و رفع آن

- پیام «Supabase is not configured»: مقادیر `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` را در `.env` تنظیم و برنامه را ری‌استارت کنید.
- خطای آپلود تصویر: باکت `lm-images` را بسازید و عمومی کنید (برای توسعه).
- خطای upsert/JSON: جداول بخش «SQL» را ایجاد کنید.
- تاریخ/زمان: از فرمت ISO استفاده می‌شود؛ نمایش تاریخ جلالی با `jalali-moment` انجام می‌شود.

---

## اسکریپت‌ها

- `npm run dev` اجرای محلی توسعه
- `npm run build` ساخت نهایی
- `npm run preview` پیش‌نمایش خروجی ساخت
- `npm run mcp:supabase` ابزار جستجوی مستندات Supabase (برای توسعه‌دهندگان)

---

## لایسنس و حقوق

تمامی حقوق محفوظ است. © 2025 Peyman Arjmand

برای همکاری یا پیشنهادات: ایمیل/گیت‌هاب/شماره تماس در ابتدای فایل ذکر شده است.
