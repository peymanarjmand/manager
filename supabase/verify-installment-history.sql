-- Read-only checks; never inserts, updates or deletes payment data.
select 'history column' as check_name, exists(
  select 1 from information_schema.columns where table_schema='public'
  and table_name='installment_payments' and column_name='receipt_history'
  and data_type='jsonb' and is_nullable='NO'
) as passed
union all
select 'ownership RLS retained', (
  select relrowsecurity from pg_class where oid='public.installment_payments'::regclass
) and exists(select 1 from pg_policies where schemaname='public' and tablename='installment_payments' and qual like '%auth.uid()%user_id%')
union all
select 'two invoker RPCs', count(*)=2 and bool_and(not p.prosecdef)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('record_installment_receipt','void_installment_receipt')
union all
select 'authenticated-only RPC access', count(*)=2 and bool_and(
  has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute')
) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('record_installment_receipt','void_installment_receipt')
union all
select 'immutable history guard', exists(
  select 1 from pg_trigger where tgrelid='public.installment_payments'::regclass
  and tgname='protect_installment_receipts' and not tgisinternal and tgenabled='O'
);
