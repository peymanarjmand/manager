# بکاپ و وضعیت امنیتی — 2026-06-14

## بکاپ کامل (داخل دیتابیس)
یک اسنپ‌شات کامل از همه‌ی جدول‌های `public` در اسکیمای **`backup_20260614`** ساخته شد.
تعداد ردیف‌ها در زمان بکاپ (تأییدشده برابر با اصل):

| جدول | ردیف |
|---|---|
| transactions | 158 |
| ledger_entries | 170 |
| installment_payments | 508 |
| installment_plans | 26 |
| darfak_expenses | 88 |
| social_insurance | 14 |
| people | 8 |
| checks | 1 |
| monthly_funds | 1 |
| assets | 0 |

### بازگردانی یک جدول از بکاپ (در صورت نیاز)
```sql
-- مثال: بازگرداندن کامل transactions از اسنپ‌شات
begin;
delete from public.transactions;
insert into public.transactions select * from backup_20260614.transactions;
commit;
```
> اسنپ‌شات داخل همان دیتابیس است (محافظت در برابر اشتباهات ما در ریفکتور). برای نسخه‌ی خارج از پلتفرم، از Supabase Dashboard → Database → Backups هم می‌توان خروجی گرفت.

## تغییر امنیتی فاز ۱ (RLS)
سیاست‌های «باز برای همه» (`USING (true)`) از همه‌ی جدول‌ها حذف شدند؛ سیاست‌های درستِ `auth.uid() = user_id` دست‌نخورده ماندند.
- نتیجه: کاربر لاگین‌شده دسترسی کامل دارد، کاربر ناشناس هیچ دسترسی‌ای ندارد.
- **اسکریپت بازگردانی این تغییر:** [`rollback_rls_open_policies.sql`](./rollback_rls_open_policies.sql) (فقط در حالت اضطراری).

## باقی‌مانده برای فاز ۱b (مؤخر، همراه با تغییر کد)
- خصوصی‌کردن باکت `lm-images` + Signed URL در `lib/idb-images.ts` + سیاست‌های مالک‌محور.
- تنظیمات Auth در داشبورد: فعال‌کردن Leaked Password Protection و گزینه‌های MFA.
